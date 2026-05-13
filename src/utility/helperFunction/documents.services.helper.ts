import { Documents, Familylinks } from "../../../prisma/generated/prisma/client";
import {
  deleteFileFromS3,
  editFileName,
  uploadFileToS3,
} from "../FileOperations";
import { IGetDocuments } from "../DataTypes/types.document";

export const processFamilyCareFilters = async (
  linkData: Familylinks,
  userId: string,
  famCareMemberId: string,
  getOnlySensitiveData: any,
  filters: any
) => {
  //check if link exist

  if (linkData.linkType === "minor" || linkData.linkType === "sharedMinor") {
    filters.forDependantId = famCareMemberId;
  } else {
    filters.forUserId = famCareMemberId;
  }
  if (
    !linkData.sensitiveDataAccess &&
    (linkData.accessType == "view" || linkData.accessType == "manage")
  ) {
    filters.isSensitive = false;
  }
  if (getOnlySensitiveData) {
    if (linkData.sensitiveDataAccess && getOnlySensitiveData === "true") {
      filters.isSensitive = true;
    } else if (
      !linkData.sensitiveDataAccess &&
      getOnlySensitiveData === "true"
    ) {
      return {
        success: true,
        user_id: userId,
        D2: [],
      };
    }
  }
};

export const applySearchFilters = (
  queryParams: IGetDocuments,
  filters: any
) => {
  const { id, documentName, consultant, category, notes } = queryParams;

  if (id) {
    filters.id = id;
  }
  if (documentName) {
    filters.documentName = {
      contains: documentName,
      mode: "insensitive",
    };
  }
  if (consultant) {
    filters.documentConsultant = {
      contains: consultant,
      mode: "insensitive",
    };
  }
  if (category) {
    filters.documentCategory = {
      contains: category,
      mode: "insensitive",
    };
  }
  if (notes) {
    filters.notes = {
      contains: notes,
      mode: "insensitive",
    };
  }
};

export const handleFileUpdate = async (
  file: Express.Multer.File | undefined,
  famCareMemberId: string | undefined,
  userId: string,
  documentCategory: string | undefined,
  file_to_update: Documents
) => {
  let docURL;

  if (file) {
    //delete and reupload the file from db and aws

    await deleteFileFromS3(
      file_to_update.documentImage,
      { famCareMemberId },
      userId
    );

    docURL = famCareMemberId
      ? await uploadFileToS3(
          file,
          documentCategory ?? file_to_update.documentCategory,
          famCareMemberId
        )
      : await uploadFileToS3(
          file,
          documentCategory ?? file_to_update.documentCategory,
          userId
        );
  } else {
    docURL = file_to_update.documentImage;
  }

  //rename the file in db
  if (documentCategory) {
    //rename the prefix in aws
    docURL = await editFileName(
      { famCareMemberId },
      docURL,
      documentCategory,
      userId
    );
  }
  return docURL;
};
