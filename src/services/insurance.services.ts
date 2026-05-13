import { ParsedQs } from "qs";
import prisma from "../prisma";
import { IGetCommon, ITokenData } from "../utility/DataTypes/types.user";
import HTTPError from "../utility/HttpError";
import { deleteFile } from "../utility/aws/deleteFile";
import {
  determineUserForSyncChanges,
  getLinkData,
} from "../utility/familyLinkData";
import { trackActiveSession } from "../utility/changeHistoryTrackFunction";
import {
  IDelInsuranceInput,
  IEditInsuranceInput,
  IUploadInsuranceInput,
  IUploadInsuranceToDbInput,
} from "../utility/DataTypes/types.insurance";
import { formatDateForDB } from "../utility/DateTimeFormatters";
import { filterRecords } from "../utility/RecordList";
import { uploadFileToS3 } from "../utility/FileOperations";
import { handleError } from "../utility/Error";
import { Familylinks } from "../../prisma/generated/prisma/client";
import { getPolicyURL } from "../utility/helperFunction/insurance.services";

//upload
export const uploadInsurance = async (
  data: IUploadInsuranceInput,
  famCareMemberId?: string
) => {
  try {
    const { file, userId, form_data } = data;
    //rename file
    let insuranceURL, uploadInsuranceResponse;

    //if in family care
    if (famCareMemberId) {
      const linkData = await getLinkData(userId, famCareMemberId);

      //upload file to s3
      if (file) {
        insuranceURL = await uploadFileToS3(file, "Insurance", famCareMemberId);
      }

      //call the function to upload data and url in db
      uploadInsuranceResponse = await uploadInsuranceToDb({
        userId: famCareMemberId?.toLowerCase(),
        linkType: linkData.linkType,
        form_data,
        insuranceURL,
        uploadedBy: userId,
      });
      if (!uploadInsuranceResponse) {
        throw new HTTPError("Could not upload insurance.", 500);
      }
      const isMinorChangedBySecondaryParent =
        linkData.linkType === "sharedMinor" && linkData.linkFrom != userId;

      //sync changes done by secondary user or by parent of minor
      await determineUserForSyncChanges(
        linkData,
        userId,
        uploadInsuranceResponse.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId,
        "create",
        "I10"
      );
    } else {
      //upload file to s3
      if (file) {
        insuranceURL = await uploadFileToS3(file, "Insurance", userId);
      }

      //call the function to upload data and url in db
      uploadInsuranceResponse = await uploadInsuranceToDb({
        userId,
        form_data,
        insuranceURL,
        uploadedBy: userId,
      });
    }
    if (!uploadInsuranceResponse)
      throw new HTTPError(`Could Not add insurance for user ${userId}`, 204);
    await trackActiveSession(userId);

    return uploadInsuranceResponse;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//upload policy to Database
export const uploadInsuranceToDb = async (data: IUploadInsuranceToDbInput) => {
  try {
    const { userId, insuranceURL, form_data, uploadedBy, linkType } = data;

    const {
      policyNum,
      policyName,
      policyType,
      insuranceProv,
      renewalAt,
      ifCoPay,
    } = form_data;

    const addInsurance = await prisma.insurance.create({
      data: {
        policyNum,
        policyName,
        policyType,
        insuranceProv,
        renewalAt: formatDateForDB(renewalAt),
        policyImg: insuranceURL,
        ifCoPay: ifCoPay ? parseInt(ifCoPay) : 100,
        createdBy: uploadedBy,
        ...((linkType && linkType === "minor") || linkType === "sharedMinor"
          ? {
              dependant: {
                connect: {
                  id: userId,
                },
              },
            }
          : {
              users: {
                connect: {
                  id: userId,
                },
              },
            }),
      },
    });
    if (!addInsurance)
      throw new HTTPError("Could not store insurance image link", 500);

    return {
      success: true,
      id: addInsurance.id,
      I10: addInsurance,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//get all policies
export const getUserPolicies = async (
  user: ITokenData,
  queryParams: IGetCommon
) => {
  try {
    const { id, famCareMemberId, limit } = queryParams;

    const filters: any = {};

    if (famCareMemberId) {
      const linkData = await getLinkData(user.id, famCareMemberId);

      const isDependant =
        linkData.linkType === "minor" || linkData.linkType === "sharedMinor";

      if (isDependant) {
        filters.forDependantId = famCareMemberId;
      } else {
        filters.forUserId = famCareMemberId;
      }
    } else {
      filters.forUserId = user.id;
    }
    if (id) {
      filters.id = id;
    }

    const all_policies = await prisma.insurance.findMany({
      where: filters,
      // skip: ((page as number) - 1) * 10,
      take: limit,
      // select: {
      //   id: true,
      //   policyNum: true,
      //   policyName: true,
      //   policyImg: true,
      //   policyType: true,
      //   renewalAt: true,
      //   insuranceProv: true,
      //   ifCoPay: true,
      // },
      orderBy: {
        updatedAt: "desc",
      },
    });
    if (!all_policies)
      throw new HTTPError("Could Not fetch insurance data for user", 500);

    await trackActiveSession(user.id);

    return {
      success: true,
      user_id: user.id,
      I10: all_policies,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//edit
export const editPolicy = async (
  data: IEditInsuranceInput,
  { famCareMemberId }: ParsedQs
) => {
  try {
    const { file, userId, form_data, id } = data;

    const {
      policyNum,
      policyName,
      policyType,
      insuranceProv,
      renewalAt,
      ifCoPay,
    } = form_data;
    let policyURL = null;

    //check link
    let link: Familylinks | null = null;
    if (famCareMemberId) {
      link = await getLinkData(userId, famCareMemberId as string);
    }

    //find existing policy
    const policy_to_update = await prisma.insurance.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          {
            forUserId: famCareMemberId
              ? (famCareMemberId as string)?.toLowerCase()
              : userId,
          },
          { forDependantId: (famCareMemberId as string)?.toLowerCase() },
        ],
      },
    });

    if (!policy_to_update) {
      throw new HTTPError(`Policy not found`, 404);
    }

    policyURL =
      file &&
      (await getPolicyURL(file, policy_to_update, { famCareMemberId }, userId));

    const updatePolicy = await prisma.insurance.update({
      where: {
        id: parseInt(id),
        ...(link?.linkType === "minor" || link?.linkType === "sharedMinor"
          ? {
              forDependantId: (famCareMemberId as string)?.toLowerCase(),
            }
          : {
              forUserId: (famCareMemberId as string)?.toLowerCase(),
            }),
      },
      data: {
        policyName,
        policyNum,
        policyType,
        insuranceProv,
        renewalAt: renewalAt
          ? formatDateForDB(renewalAt)
          : policy_to_update.renewalAt,
        ifCoPay: ifCoPay ? parseFloat(ifCoPay) : policy_to_update.ifCoPay,
        policyImg: policyURL,
      },
    });

    if (!updatePolicy)
      throw new HTTPError(`Could not store doc image link`, 500);

    if (famCareMemberId) {
      const isMinorChangedBySecondaryParent =
        link?.linkType === "sharedMinor" && link.linkFrom != userId;

      //sync changes done by secondary user or by parent of minor
      await determineUserForSyncChanges(
        link,
        userId,
        updatePolicy.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId as string,
        "update",
        "I10"
      );
    }
    await trackActiveSession(userId);

    return {
      success: true,
      message: "policy editted successfully",
      I10: updatePolicy,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//delete insurance policies
export const delPolicies = async (
  data: IDelInsuranceInput,
  famCareMemberId: string | undefined
) => {
  try {
    const { userId, id } = data;
    const policies = id.split(",").map(Number);
    let deletedRecords: number[] = [];

    const policyData = await prisma.insurance.findMany({
      where: {
        id: {
          in: policies.map((policy) => policy),
        },
        OR: [
          {
            forUserId: famCareMemberId
              ? famCareMemberId?.toLowerCase()
              : userId,
          },
          { forDependantId: (famCareMemberId as string)?.toLowerCase() },
        ],
      },
    });
    if (!policyData || policyData.length != policies.length)
      throw new HTTPError(`Could not find policy`, 404);
    if (famCareMemberId) {
      const linkData = await getLinkData(userId, famCareMemberId.toString());
      const isMinorChangedBySecondaryParent =
        linkData.linkType === "sharedMinor" && linkData.linkFrom != userId;
      const deleteMultple = policyData.map(async (policy) => {
        deletedRecords.push(policy.id);

        // decode filename into actual filename by removing the url encoded values
        if (policy.policyImg) {
          const fileName = decodeURIComponent(policy.policyImg.split("/")[4]);
          const result = await deleteFile(
            fileName,
            famCareMemberId?.toLowerCase()
          );
          if (!result)
            throw new HTTPError("Could not delete file from s3", 502);
        }

        const deletePloicies = await prisma.insurance.delete({
          where: {
            id: policy.id,
            ...(linkData.linkType === "minor" ||
            linkData.linkType === "sharedMinor"
              ? {
                  forDependantId: famCareMemberId?.toLowerCase(),
                }
              : {
                  forUserId: famCareMemberId?.toLowerCase(),
                }),
          },
        });
        if (!deletePloicies)
          throw new HTTPError(`Could not delete data from database`, 500);

        await determineUserForSyncChanges(
          linkData,
          userId,
          deletePloicies.id,
          isMinorChangedBySecondaryParent,
          famCareMemberId?.toString(),
          "delete",
          "I10"
        );
      });
      if (!deleteMultple)
        throw new HTTPError("Could not delete all policies", 500);
    } else {
      const deleteMultple = policyData.map(async (policy) => {
        deletedRecords.push(policy.id);
        // decode filename into actual filename by removing the url encoded values
        if (policy.policyImg) {
          const fileName = decodeURIComponent(policy.policyImg.split("/")[4]);
          const result = await deleteFile(fileName, userId.toLowerCase());
          if (!result)
            throw new HTTPError("Could not delete file from s3", 502);
        }

        const deletePloicies = await prisma.insurance.delete({
          where: {
            id: policy.id,
            forUserId: userId,
          },
        });
        if (!deletePloicies)
          throw new HTTPError(`Could not delete data from database`, 500);
      });
      if (!deleteMultple)
        throw new HTTPError("Could not delete all policies", 500);
    }
    await trackActiveSession(userId);

    //find successfull and failed records:
    const failedRecords = await filterRecords(deletedRecords, policies);
    return {
      success: true,
      message: "policy(ies) deleted successfully",
      successfullyDeleted: deletedRecords,
      failed: failedRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const findNotification = async (userId: string, { id }: ParsedQs) => {
  try {
    const filter: any = {};
    if (id) {
      filter.id = parseInt(id as string);
    }
    const findNotification = await prisma.notifications.findMany({
      where: {
        userId,
        AND: [filter],
      },
      select: {
        id: true,
        content: true,
        changeAccessOf: true,
        createdAt: true,
        AccessText: true,
      },
      orderBy: {
        createdAt: "desc", // sort by date in descending order
      },
    });
    if (!findNotification) {
      throw new HTTPError("notification not found", 404);
    }
    const updateNotificationStatus = await prisma.notifications.updateMany({
      where: {
        userId,
        AND: [filter],
      },
      data: {
        readStatus: true,
      },
    });
    if (!updateNotificationStatus) {
      throw new HTTPError("db error: could not update notifications", 500);
    }

    return {
      success: true,
      data: findNotification,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
