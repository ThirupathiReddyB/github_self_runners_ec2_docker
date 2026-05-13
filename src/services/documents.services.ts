import prisma from "../prisma";
import { ITokenData } from "../utility/DataTypes/types.user";
import HTTPError from "../utility/HttpError";
import {
  checkUserLinkAndManageAccess,
  determineUserForSyncChanges,
  familyLink,
} from "../utility/familyLinkData";
import { trackActiveSession } from "../utility/changeHistoryTrackFunction";
import { filterRecords } from "../utility/RecordList";
import { handleError } from "../utility/Error";
import { deleteFileFromS3, uploadFileToS3 } from "../utility/FileOperations";
import {
  applySearchFilters,
  handleFileUpdate,
  processFamilyCareFilters,
} from "../utility/helperFunction/documents.services.helper";
import {
  IDelDocsInput,
  IEditDocsInput,
  IGetDocuments,
  IUploadDocsInput,
  IUploadDocsToDbInput,
} from "../utility/DataTypes/types.document";
import { Documents, Familylinks } from "../../prisma/generated/prisma/client";

//upload
export const uploadDocs = async (data: IUploadDocsInput) => {
  try {
    const {
      file,
      userId,
      famCareMemberId,
      documentCategory,
      documentName,
      documentConsultant,
      notes,
      isSensitive,
    } = data;

    //if in family care
    if (famCareMemberId) {
      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(
          userId,
          famCareMemberId?.toLowerCase()
        );

      //upload file to s3
      const documentURL = await uploadFileToS3(
        file,
        documentCategory,
        famCareMemberId
      );
      if (!documentURL) {
        throw new HTTPError("Could not upload document to s3", 500);
      }

      const uploadDataToDB: IUploadDocsToDbInput = {
        documentCategory,
        documentName,
        documentConsultant,
        notes,
        isSensitive,
        userId: famCareMemberId.toLowerCase(),
        linkType: linkData.linkType,
        documentURL,
        uploadedBy: userId,
      };
      //call the function to upload data and url in db
      const uploadDocumentResponse: {
        success: boolean;
        id: number;
        D2: Documents;
      } = await uploadDocsToDb(uploadDataToDB);

      //track changes (only for minor)
      if (linkData.linkType == "minor" || linkData.linkType === "sharedMinor") {
        await determineUserForSyncChanges(
          linkData,
          userId,
          uploadDocumentResponse.id,
          isMinorChangedBySecondaryParent,
          famCareMemberId,
          "create",
          "D2"
        );
      } else {
        const syncDocForUserChanged = await prisma.syncChanges.create({
          data: {
            userChanged: famCareMemberId,
            changeType: "create",
            familyMember: famCareMemberId,
            recordId: uploadDocumentResponse.id.toString(),
            table: "D2",
            changedBy: userId,
          },
        });
        if (!syncDocForUserChanged) {
          throw new HTTPError("Could not track changes", 500);
        }
      }
      await trackActiveSession(userId);
      return uploadDocumentResponse;
    } else {
      //upload file to s3

      const documentURL = await uploadFileToS3(file, documentCategory, userId);
      if (!documentURL) {
        throw new HTTPError("Could not upload document to s3", 500);
      }

      const uploadDataToDB: IUploadDocsToDbInput = {
        documentCategory,
        documentName,
        documentConsultant,
        notes,
        isSensitive,
        userId,
        documentURL,
        uploadedBy: userId,
      };

      //call the function to upload data and url in db
      const uploadDocumentResponse: {
        success: boolean;
        id: number;
        D2: Documents;
      } = await uploadDocsToDb(uploadDataToDB);
      if (!uploadDocumentResponse)
        throw new HTTPError(`Could Not add document for user ${userId}`, 502);
      await trackActiveSession(userId);
      return uploadDocumentResponse;
    }
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//upload document to Database
export const uploadDocsToDb = async (data: IUploadDocsToDbInput) => {
  const {
    userId,
    documentURL,
    documentCategory,
    documentName,
    documentConsultant,
    notes,
    isSensitive,
    uploadedBy,
  } = data;

  const sensitive = isSensitive === "true";

  const addDocument = await prisma.documents.create({
    data: {
      documentImage: documentURL,
      documentName,
      documentCategory,
      documentConsultant,
      // documentLabName,
      notes,
      isSensitive: sensitive,
      createdAt: new Date(),
      updatedAt: new Date(),
      uploadedBy,
      ...(data.linkType === "minor" || data.linkType == "sharedMinor"
        ? {
            dependant: {
              connect: {
                id: userId,
              },
            },
          }
        : {
            Users: {
              connect: {
                id: userId,
              },
            },
          }),
    },
  });
  if (!addDocument) throw new HTTPError("Could not store doc in database", 500);

  return {
    success: true,
    id: addDocument.id,
    D2: addDocument,
  };
};

//get all docs
export const getUserDocuments = async (
  user: ITokenData,
  queryParams: IGetDocuments
) => {
  try {
    if (!user) throw new HTTPError("User Unique Id required", 422);

    const {
      limit = 10,
      id,
      documentName,
      category,
      consultant,
      notes,
      famCareMemberId,
      getOnlySensitiveData,
    } = queryParams;
    const filters: any = {};
    if (famCareMemberId) {
      let familyLinkData = await familyLink(
        user.id,
        famCareMemberId?.toLowerCase()
      );
      let linkData = familyLinkData.linkData;

      //check access types for family care except minor
      if (linkData.linkType != "minor" && linkData.linkType != "sharedMinor") {
        familyLinkData = await familyLink(
          famCareMemberId?.toLowerCase(),
          user.id
        );
        linkData = familyLinkData.linkData;
      }

      const familyCareResult = await processFamilyCareFilters(
        linkData,
        user.id,
        famCareMemberId,
        getOnlySensitiveData,
        filters
      );
      if (familyCareResult) {
        return familyCareResult;
      }
    } else {
      filters.forUserId = user.id;
    }

    applySearchFilters(
      {
        id,
        documentName,
        consultant,
        category,
        notes,
      },
      filters
    );
    const all_documents = await prisma.documents.findMany({
      where: filters,
      take: limit ?? undefined,
      orderBy: { updatedAt: "desc" },
    });

    if (!all_documents)
      throw new HTTPError("Could Not fetch documents data for user", 500);

    await trackActiveSession(user.id);

    return { success: true, user_id: user.id, D2: all_documents };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//edit
export const editDocs = async (data: IEditDocsInput) => {
  try {
    const {
      file,
      userId,
      documentCategory,
      documentName,
      documentConsultant,
      notes,
      isSensitive,
      famCareMemberId,
      id,
    } = data;

    //check link
    let result: Familylinks | null = null;
    let isMinorChangedBySecondaryParent: boolean = false;
    if (famCareMemberId) {
      const response = await checkUserLinkAndManageAccess(
        userId,
        famCareMemberId.toLowerCase()
      );
      result = response.linkData;
      isMinorChangedBySecondaryParent =
        response.isMinorChangedBySecondaryParent;
    }

    //find existing document
    const file_to_update = await prisma.documents.findFirst({
      where: {
        id,
        OR: [
          {
            forUserId: famCareMemberId?.toString().toLowerCase() ?? userId,
          },
          { forDependantId: famCareMemberId?.toString().toLowerCase() },
        ],
      },
    });

    if (!file_to_update) {
      throw new HTTPError(`Error while fetching the document`, 500);
    }

    if (file_to_update.isSensitive && result?.sensitiveDataAccess === false) {
      throw new HTTPError("No access to edit sensitive data", 401);
    }

    //handle file upload
    const docUrl = await handleFileUpdate(
      file,
      famCareMemberId?.toString(),
      userId,
      documentCategory,
      file_to_update
    );

    const updateDocs = await prisma.documents.update({
      where: {
        id,
        OR: [
          {
            forUserId: famCareMemberId?.toString().toLowerCase() ?? userId,
          },
          { forDependantId: famCareMemberId?.toString().toLowerCase() },
        ],
      },
      data: {
        documentImage: docUrl,
        documentName,
        documentCategory,
        documentConsultant,
        // documentLabName,
        notes,
        isSensitive:
          isSensitive !== undefined ? isSensitive === "true" : undefined,
        updatedAt: new Date(),
      },
    });

    if (!updateDocs) throw new HTTPError(`Could not update document`, 500);

    //track changes (only for mior or shared minot)
    if (
      result &&
      famCareMemberId &&
      ["minor", "sharedMinor"].includes(result.linkType)
    ) {
      await determineUserForSyncChanges(
        result,
        userId,
        updateDocs.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId.toLowerCase(),
        "update",
        "D2"
      );
    }
    if (
      result &&
      famCareMemberId &&
      ["existing", "subaccount"].includes(result.linkType)
    ) {
      const syncDocForUserChanged = await prisma.syncChanges.create({
        data: {
          userChanged: famCareMemberId,
          changeType: "update",
          familyMember: famCareMemberId,
          recordId: updateDocs.id.toString(),
          table: "D2",
          changedBy: userId,
        },
      });
      if (!syncDocForUserChanged) {
        throw new HTTPError("Could not track changes", 500);
      }
    }

    await trackActiveSession(userId);

    return {
      success: true,
      message: "document editted successfully",
      D2: updateDocs,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//delete doc
export const delDocs = async (data: IDelDocsInput) => {
  try {
    const { userId, id, famCareMemberId } = data;
    const docs = id.split(",").map(Number);
    let deletedRecords: number[] = [];

    const document_data = await prisma.documents.findMany({
      where: {
        id: {
          in: docs.map((doc) => doc),
        },
        OR: [
          {
            forUserId: famCareMemberId?.toLowerCase() ?? userId,
          },
          { forDependantId: famCareMemberId?.toLowerCase() },
        ],
      },
    });
    if (!document_data || document_data.length != docs.length)
      throw new HTTPError(`Could not find document(s)`, 404);

    if (famCareMemberId) {
      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(
          userId,
          famCareMemberId.toString().toLowerCase()
        );

      const deleteMultple = document_data.map(async (document) => {
        deletedRecords.push(document.id);
        // decode filename into actual filename by removing the url encoded values

        await deleteFileFromS3(
          document.documentImage,
          { famCareMemberId },
          userId
        );

        const deleteDocs = await prisma.documents.delete({
          where: {
            id: document.id,
            ...(linkData.linkType === "minor" ||
            linkData.linkType === "sharedMinor"
              ? {
                  forDependantId: famCareMemberId.toLowerCase(),
                }
              : {
                  forUserId: famCareMemberId.toLowerCase(),
                }),
          },
        });
        if (!deleteDocs)
          throw new HTTPError(`Could not delete data from database`, 500);

        //track changes (only for minor / shared minor)
        if (
          linkData.linkType == "minor" ||
          linkData.linkType === "sharedMinor"
        ) {
          await determineUserForSyncChanges(
            linkData,
            userId,
            deleteDocs.id,
            isMinorChangedBySecondaryParent,
            famCareMemberId.toLowerCase(),
            "delete",
            "D2"
          );
        } else {
          const syncDocForUserChanged = await prisma.syncChanges.create({
            data: {
              userChanged: famCareMemberId?.toString(),
              changeType: "delete",
              familyMember: famCareMemberId?.toString(),
              recordId: deleteDocs.id.toString(),
              table: "D2",
              changedBy: userId,
            },
          });
          if (!syncDocForUserChanged) {
            throw new HTTPError("Could not track changes", 500);
          }
        }
      });
      if (!deleteMultple)
        throw new HTTPError("Could not delete all documents", 500);
    } else {
      const deleteMultple = document_data.map(async (document) => {
        deletedRecords.push(document.id);
        // decode filename into actual filename by removing the url encoded values

        await deleteFileFromS3(document.documentImage, {}, userId);

        const deleteDocs = await prisma.documents.delete({
          where: {
            id: document.id,
            forUserId: userId,
          },
        });
        if (!deleteDocs)
          throw new HTTPError(`Could not delete data from database`, 500);
      });
      if (!deleteMultple)
        throw new HTTPError("Could not delete all documents", 500);
    }
    await trackActiveSession(userId);

    //find successfull and failed records:
    const failedRecords = await filterRecords(deletedRecords, docs);

    return {
      success: true,
      message: "document deleted successfully",
      successfullyDeleted: deletedRecords,
      failed: failedRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
