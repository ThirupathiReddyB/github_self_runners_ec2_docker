import prisma from "../prisma";
import { ParsedQs } from "qs";
import {
  IChangeContactDetailsInput,
  ICheckExistingUser,
  IGetUserById,
  INewContactDetailsInput,
  ITokenData,
  IUpdateData,
  IUpdateUserSetting,
  IVerifyPasswordData,
} from "../utility/DataTypes/types.user";
import HTTPError from "../utility/HttpError";
import { emailingService } from "../utility/emailService";
import { verifyOTP } from "../utility/verifyOTP";
import dotenv from "dotenv";
dotenv.config();
import { deleteFolderFromS3 } from "../utility/aws/deleteFolder";
import { Faqtype, MessageType, Users } from "../../prisma/generated/prisma/client";
import bcrypt from "bcrypt";
import { validateContact } from "../utility/ValidateNewContact";
import {
  FamilyMembersData,
  getMemberDataById,
} from "../utility/familyMemberData";
import { formatDateForDB } from "../utility/DateTimeFormatters";
import { getUserVitalModules } from "./vitals.services";
import {
  checkUserLinkAndManageAccess,
  determineUserForSyncChanges,
  familyLink,
} from "../utility/familyLinkData";
import {
  trackActiveSession,
  trackChanges,
} from "../utility/changeHistoryTrackFunction";
import {
  getAllAdvertisements,
} from "./contentManagement.services";

import { changeVerifiedContactDetailsOTP } from "../templateDesign/userTemplates";
import { adminTokenData } from "../utility/DataTypes/types.admin";
import {
  AutocomplaintReply,
  userListCSV,
} from "../templateDesign/DashboardTemplates";

import { decryptPassword } from "../utility/decryptingPassword";
import {
  notificationStore,
  sendNotificationToFamilyCare,
} from "../utility/pushNotificationAndStoreNotification";
import { BATCH_SIZE, freePlanCode, invalidAttempts, redirectLink } from "../constants/data";
import { getFolderSize } from "../utility/aws/checkFolderSize";
import { handleError } from "../utility/Error";
import { handleOTPProcess } from "../utility/handleOTPOperation";
import {
  renameAndUploadComplaintImage,
  uploadProfileImageToS3,
} from "../utility/FileOperations";
import {
  fetchDependantModeInsensitive,
  fetchExistingContact,
  fetchUpdatedData,
  fetchUserByUniqueDataAndCheckBlock,
  fetchUserByUniqueDataUser,
  fetchUserFirst,
  fetchUserModeInsensitive,
  fetchUserWithSetting,
  fetchUserWithSettingAndHealthRecord,
  findExistingContactQuery,
} from "../utility/prismaQueries";
import { handleLoginAttempts } from "../utility/checkPassword";
import {
  // calculateTotalRecordsGetAllAppUsers,
  checkBucketSize,
  checkPhoneEmergencyContact,
  checkVerfiedContactEditUserById,
  isEmergencyContactAndPhoneNumberSameEditUserById,
} from "../utility/helperFunction/user.services.helper";
import {
  fetchHealthRecord,
  fetchHealthRecordForUserId,
} from "../utility/healthRecord";
import { updateDependant } from "../utility/dependant";
import { updateUserData } from "../utility/upsertUser";
import path from "path";
import crypto from "crypto";
import {
  checkIfReferalCodeExist,
  getUserStorage,
} from "../utility/helperFunction/subscription.services.helper";
import ExcelJS from "exceljs";
import { unlinkFile } from "../utility/Helpers";
import { ISearchAppUsers } from "../utility/DataTypes/types.common";
import { pg_arrs } from "../utility/pagination";
import { isAdminTokenData } from "../utility/helperFunction/admin.auth.services.helper";
import {
  fetchFamilyLink,
  getAllFamilySharedMinor,
} from "../utility/helperFunction/familyCare.services.helper";

//!admin operation only

export const getAllAppUsers = async (queryParams: ISearchAppUsers) => {
  try {
    //page =1 , limit=50 default values
    const { page = 1, search, searchBy, sortByField, limit = 50 } = queryParams;

    const primaryFilter: Array<{}> = [];
    const minorFilter: Array<{}> = [];
    const sortByFilters: { [key: string]: any } = {};
    const recordSkip = {
      minor: false,
      primary: false,
    };

    //if searchBy and search comes => primaryFilter by searchBy
    if (searchBy && search) {
      const searchConditions = { contains: search, mode: "insensitive" };
      switch (searchBy) {
        case "name": {
          primaryFilter.push({ fullName: searchConditions });
          minorFilter.push({ fullName: searchConditions });
          break;
        }
        case "UID": {
          primaryFilter.push({ id: searchConditions });
          minorFilter.push({ id: searchConditions });
          break;
        }
        case "gender": {
          primaryFilter.push({ gender: search.toLowerCase() });
          minorFilter.push({ gender: search.toLowerCase() });
          break;
        }
        case "contact": {
          primaryFilter.push({ phoneNumber: searchConditions });
          primaryFilter.push({ emailId: searchConditions });
          minorFilter.push({ phoneNumber: searchConditions });
          minorFilter.push({ emailId: searchConditions });
          break;
        }
        case "country": {
          primaryFilter.push({ country: searchConditions });
          minorFilter.push({
            user: {
              country: searchConditions,
            },
          });
          break;
        }
        case "pinCode": {
          primaryFilter.push({ pincode: searchConditions });
          minorFilter.push({ pincode: searchConditions });
          break;
        }
      }
    }

    //if sortByField comes
    if (sortByField) {
      switch (sortByField) {
        case "nameAsc": {
          sortByFilters["fullName"] = "asc";
          break;
        }
        case "nameDesc": {
          sortByFilters["fullName"] = "desc";
          break;
        }
        case "primary": {
          recordSkip.minor = true;
          break;
        }
        case "minor": {
          recordSkip.primary = true;
          break;
        }
        case "joiningAsc": {
          sortByFilters["createdAt"] = "asc";
          break;
        }
        case "joiningDesc": {
          sortByFilters["createdAt"] = "desc";
          break;
        }
      }
    }

    const where = {
      primaryWhere: primaryFilter.length > 0 ? { OR: primaryFilter } : {},
      minorWhere: minorFilter.length > 0 ? { OR: minorFilter } : {},
    };

    //set pagination
    const [totalUsers, totalDependants] = await Promise.all([
      recordSkip.primary
        ? 0
        : prisma.users.count({
          where: where.primaryWhere,
        }),
      recordSkip.minor
        ? 0
        : prisma.dependant.count({
          where: where.minorWhere,
        }),
    ]);

    const { skipMinor, skipPrimary, currentPageRecords } = pg_arrs(
      totalUsers,
      totalDependants,
      page,
      limit,
      limit / 2
    );

    //fetch data
    const [getUsers, getDependants] = await Promise.all([
      await prisma.users.findMany({
        where: where.primaryWhere,
        orderBy: [{ ...sortByFilters }, { updatedAt: "desc" }],
        skip: skipPrimary,
        take: currentPageRecords[0],
        include: {
          healthRecord: true,
          Subscription: {
            where: {
              status: "active",
            },
            select: {
              planVariants: {
                select: {
                  plan: {
                    select: {
                      planCode: true
                    }
                  }
                }
              }
            }
          }
        },
      }),
      await prisma.dependant.findMany({
        where: where.minorWhere,
        orderBy: [{ ...sortByFilters }, { updatedAt: "desc" }],
        skip: skipMinor,
        take: currentPageRecords[1],
        include: {
          healthRecord: true,
          Subscription: {
            where: {
              status: "active",
            },
            select: {
              planVariants: {
                select: {
                  plan: {
                    select: {
                      planCode: true
                    }
                  }
                }
              }
            }
          },
          user: {
            select: {
              country: true,
              verifiedContactId: true,
            },
          },
        },
      }),
    ]);
    const userData = getUsers.map((user) => {
      const { password, refreshToken, currentSessionId, subscription, Subscription, ...filteredData } =
        user;
      const isSubscribed = Subscription[0]?.planVariants.plan.planCode == freePlanCode ? "free" : "premium"
      return { ...filteredData, Subscription: isSubscribed, type: "user" };
    });
    const dependantData = getDependants.map((dependant) => {
      const { user, Subscription, ...filteredData } = dependant;

      const isSubscribed = Subscription[0]?.planVariants.plan.planCode == freePlanCode ? "free" : "premium"
      return {
        ...filteredData,
        Subscription: isSubscribed,
        verifiedContactId: dependant.user.verifiedContactId,
        country: dependant.user.country,
        type: "minor",
      };
    });

    return {
      success: true,
      data: [...userData, ...dependantData],
      totalRecords: totalUsers + totalDependants,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//!admin operation
export const generateExcelAndExport = async (
  filters: ISearchAppUsers,
  admin: adminTokenData
) => {
  try {
    console.log(admin.emailId);
    //fetch data
    const { totalRecords } = await getAllAppUsers(filters);
    let hasMoreData = totalRecords;
    let pageNo = 1;

    //Creates Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    //Header
    worksheet.mergeCells("A1:H1");
    worksheet.getCell("A1").value = "Steigen";
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell("A1").font = { bold: true, size: 14 };
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Column Headers
    const columnHeaders = [
      "Name",
      "UID",
      "Gender",
      "Contact",
      "Country",
      "Pin Code",
      "User",
      "Account",
    ];
    worksheet.addRow(columnHeaders).font = { bold: true };

    worksheet.columns = [
      { key: "fullName", width: 25 },
      { key: "id", width: 15 },
      { key: "gender", width: 10 },
      { key: "phoneNumber", width: 20 },
      { key: "country", width: 15 },
      { key: "pincode", width: 10 },
      { key: "userType", width: 15 },
      { key: "isBlocked", width: 15 },
    ];

    //create batches of 1000 and add rows

    while (hasMoreData > 0) {
      const { data } = await getAllAppUsers({
        ...filters,
        page: pageNo,
        limit: BATCH_SIZE,
      });
      data.forEach((user) => {
        worksheet.addRow({
          fullName: user.fullName,
          id: user.id,
          gender: user.gender,
          phoneNumber: user.phoneNumber,
          country: user.country,
          pincode: user.pincode,
          userType: user.type,
          isBlocked: user.isBlocked ? "Blocked" : "In Use",
        });
      });

      hasMoreData = hasMoreData - BATCH_SIZE;
      pageNo++;
    }

    const filePath = path.join(
      __dirname,
      `users_${new Date().toDateString}.xlsx`
    );
    await workbook.xlsx.writeFile(filePath);
    // return filePath;
    //send email to admin asking for user's list
    const emailResponse = await emailingService({
      email_id: admin.emailId,
      data: {
        filePath: filePath,
      },
      subject: "THITO: Application Users Data",
      template: userListCSV,
      choice: "user_list",
    });
    if (!emailResponse) throw new HTTPError("Could not send email", 500);
    unlinkFile(filePath);

    return {
      success: true,
      message: "User List exported successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//get user by id
export const getUserDataById = async (
  userData: IGetUserById,
  user?: ITokenData | adminTokenData
) => {
  try {
    const { userId, type } = userData;
    let data = {};

    if (type === "minor") {
      const userData = await fetchDependantModeInsensitive(userId);

      const createdBy = await fetchUserModeInsensitive(userData.userId);

      const memberData = await fetchFamilyLink(
        userData.userId.toLowerCase(),
        userId.toLowerCase(),
        "minor"
      );

      const findSecondaryParent = await prisma.familylinks.findFirst({
        where: { linkFrom: userId.toLowerCase(), linkType: "sharedMinor" },
      });
      let secondaryParent: Users | null = null;
      let familyData: {
        name?: string;
        id?: string;
        relation: string;
        profileImage?: string | null;
        LinkType?: string | null;
      }[] = [
          {
            name: createdBy.fullName,
            id: memberData.linkFrom.toLowerCase(),
            relation: "guardian",
            profileImage: createdBy.profileImage,
            LinkType: null,
          },
        ];
      if (findSecondaryParent) {
        secondaryParent = await prisma.users.findFirst({
          where: {
            id: { equals: findSecondaryParent.linkTo, mode: "insensitive" },
          },
        });
        familyData.push({
          name: secondaryParent?.fullName,
          id: secondaryParent?.id,
          relation: "guardian",
          profileImage: secondaryParent?.profileImage,
          LinkType: null,
        });
      }
      data = {
        id: userData.id.toLowerCase(),
        name: userData.fullName,
        profileImage: userData.profileImage,
        verifiedContact: createdBy.verifiedContactId,
        emailId: userData.emailId ? userData.emailId.toLowerCase() : null,
        phoneNumber: userData.phoneNumber,
        gender: userData.gender,
        bloodType: userData.healthRecord?.bloodGroup,
        account: {
          createdAt: userData.createdAt,
          language: createdBy.setting?.language,
          createdBy: userData.userId,
          isBlocked: false,
          subscription: userData.Subscription[0].planVariants.plan.planCode == freePlanCode ? false : true
        },
        healthRecords: {
          familyDoctorName: userData.healthRecord?.doctorFullName,
          doctorAddress: userData.healthRecord?.docAddress,
          disease: userData.healthRecord?.presentDiseases,
          allergies: userData.healthRecord?.allergies,
        },
        personal: {
          country: createdBy.country,
          dob: userData.dob,
          pincode: userData.pincode,
          emergencyContact: userData.emergencyContact,
          address: userData.address,
        },
        family: familyData,
        additionalInfo: userData.healthRecord?.additionalInformation,
      };
    } else if (type === "user") {
      const userData = await fetchUserWithSettingAndHealthRecord(userId);

      //get family members
      const getAllFamilyMembers = await getAllFamilySharedMinor(
        userId.toLowerCase()
      );

      const memberData = await FamilyMembersData(getAllFamilyMembers);
      const findMembers = (id: string) => {
        return (
          memberData.D7.find((member) => member.id === id) ??
          memberData.U6.find((member) => member.id === id)
        );
      };

      // Map over the F9 array to get the required family structure
      const family = memberData.F9.map((link) => {
        const member = findMembers(
          link.linkType != "sharedMinor" ? link.linkTo : link.linkFrom
        );

        if (!member) return null;
        return {
          name: member.fullName, // assuming all members have fullName
          id: member.id,
          relation: link.relation,
          profileImage: member.profileImage ?? null, // assuming profileImage is in all member types
          linkType: link.linkType,
        };
      }).filter(Boolean);
      data = {
        id: userData.id.toLowerCase(),
        name: userData.fullName,
        profileImage: userData.profileImage,
        verifiedContact: userData.verifiedContactId,
        emailId: userData.emailId ? userData.emailId.toLowerCase() : null,
        phoneNumber: userData.phoneNumber,
        gender: userData.gender,
        bloodType: userData.healthRecord?.bloodGroup,
        account: {
          createdAt: userData.createdAt,
          language: userData.setting?.language,
          createdBy: userData.createdBy,
          isBlocked: userData.isBlocked,
          subscription: userData.Subscription[0].planVariants.plan.planCode == freePlanCode ? false : true,
        },
        healthRecords: {
          familyDoctorName: userData.healthRecord?.doctorFullName,
          doctorAddress: userData.healthRecord?.docAddress,
          disease: userData.healthRecord?.presentDiseases,
          allergies: userData.healthRecord?.allergies,
        },
        personal: {
          country: userData.country,
          dob: userData.dob,
          pincode: userData.pincode,
          emergencyContact: userData.emergencyContact,
          address: userData.address,
        },
        family,
        additionalInfo: userData.healthRecord?.additionalInformation,
      };

      if (user && !isAdminTokenData(user))
        await trackActiveSession(userId.toLowerCase());
    }
    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//update user by id - other
export const editUserById = async (
  data: IUpdateData,
  userId: string,
  queryParams: ParsedQs
) => {
  try {
    if (!data || !userId) throw new HTTPError("Required Data missing", 422);

    const { profileImage, phoneNumber, emailId, emergencyContact } = data;
    const { famCareMemberId } = queryParams;
    let result1: any = {};
    let updateUser;
    let imageLink = null;

    if (famCareMemberId) {
      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(
          userId.toLowerCase(),
          (famCareMemberId as string)?.toLowerCase()
        );
      if (linkData.accessType === "view" || linkData.linkType !== "minor") {
        throw new HTTPError("You are not authorised to make this change", 401);
      }

      if (
        result1.linkType != "minor" &&
        result1.linkType != "sharedMinor" &&
        (phoneNumber?.trim() || emailId?.trim())
      ) {
        await fetchExistingContact(emailId, phoneNumber, userId);
      }
      const findMinor = await prisma.dependant.findFirst({
        where: {
          id: (famCareMemberId as string)?.toLowerCase(),
        },
      });

      imageLink = await uploadProfileImageToS3(
        profileImage,
        (famCareMemberId as string).toLowerCase()
      );

      updateUser = await updateDependant(
        data,
        { famCareMemberId },
        findMinor,
        imageLink
      );

      const healthData = await fetchHealthRecord(updateUser.id);

      await determineUserForSyncChanges(
        linkData,
        userId,
        updateUser.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId as string,
        "update",
        "D7"
      );
      await determineUserForSyncChanges(
        linkData,
        userId,
        healthData.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId as string,
        "update",
        "H8"
      );
      return {
        success: true,
        id: updateUser.id.toLowerCase(),
        message: "User Data was updated successfully",
        D7: updateUser,
        H8: healthData,
      };
    } else {
      const findUser = await fetchUserByUniqueDataUser(userId);

      checkVerfiedContactEditUserById(findUser, emailId, phoneNumber);

      if (phoneNumber?.trim() || emailId?.trim()) {
        await fetchExistingContact(emailId, phoneNumber, userId);
      }
      isEmergencyContactAndPhoneNumberSameEditUserById(
        findUser,
        emergencyContact,
        phoneNumber
      );

      imageLink = await uploadProfileImageToS3(profileImage, userId);

      updateUser = await updateUserData(data, userId, findUser, imageLink);
    }
    if (!updateUser) throw new HTTPError("Could Not update User Data", 500);

    const changeUserDetailsTrack = await trackChanges(
      userId,
      "update",
      userId,
      "U6",
      userId,
      false
    );
    if (!changeUserDetailsTrack.success)
      throw new HTTPError("Could not track change", 204);

    const healthData = await fetchHealthRecordForUserId(updateUser.id);

    const changeHistory = await trackChanges(
      userId,
      "update",
      healthData.id,
      "H8",
      userId,
      false
    );
    if (!changeHistory.success)
      throw new HTTPError("Could not track change", 204);

    await trackActiveSession(userId.toLowerCase());

    const { password, refreshToken, ...filteredData } = updateUser;

    return {
      success: true,
      id: updateUser.id.toLowerCase(),
      message: "User Data was updated successfully",
      U6: filteredData,
      H8: healthData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//check existing user update profile
export const checkExistingUserById = async (
  data: IUpdateData,
  userId: string
) => {
  try {
    const { phoneNumber, emailId, famCareMemberId } = data;
    let linkData: any; // Declare linkData in a broader scope
    let findUser: any = {};

    //1. check type and link

    if (famCareMemberId) {
      const result = await familyLink(
        userId.toLowerCase(),
        famCareMemberId?.toLowerCase()
      );
      linkData = result.linkData; // Assign linkData from the function result

      if (linkData.accessType === "view" || linkData.linkType !== "minor") {
        throw new HTTPError("You are not authorised to make this change", 401);
      }
    }
    //2.find user
    if (
      famCareMemberId &&
      (linkData.linkType === "minor" || linkData.linkType === "sharedMinor")
    ) {
      findUser = await prisma.dependant.findFirst({
        where: {
          id: famCareMemberId,
        },
        include: {
          user: true,
        },
      });
    } else {
      findUser = await fetchUserByUniqueDataUser(
        famCareMemberId?.toString().toLowerCase() ?? userId
      );
    }

    //3. check bucket size

    await checkBucketSize(findUser, data.profileImage);

    //4.if minor dont apply the check of alternate contact and same number return directly
    if (!famCareMemberId) {
      checkVerfiedContactEditUserById(findUser, emailId, phoneNumber);
      //5.check existing contact only if type is not minor as minor can have same contact as that of user ir any other minor
      if (phoneNumber?.trim() || emailId?.trim()) {
        await fetchExistingContact(
          emailId,
          phoneNumber,
          userId,
          famCareMemberId
        );
      }
    }

    await trackActiveSession(userId.toLowerCase());

    return {
      success: true,
      message: "you can update the further data",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//check existinf data registration
export const checkExistingUserByIdRegistration = async (
  data: ICheckExistingUser
) => {
  try {
    const { phoneNumber, emailId, emergencyContact, referalCode, userId } =
      data;

    if (phoneNumber || emailId) {
      await findExistingContactQuery(phoneNumber, emailId);
    }

    const verifiedUsers = await prisma.verifiedUsers.findFirst({
      where: {
        userId,
        isVerified: true,
      },
    });
    if (!verifiedUsers) {
      throw new HTTPError("User is not verified", 400);
    }

    if (
      (verifiedUsers.emailId && emailId && emailId != verifiedUsers.emailId) ||
      (verifiedUsers.emailId && emailId == "") ||
      (verifiedUsers.phoneNumber &&
        phoneNumber &&
        phoneNumber != verifiedUsers.phoneNumber) ||
      (verifiedUsers.phoneNumber && phoneNumber == "")
    ) {
      throw new HTTPError("Verified Contact is not subject to change", 400);
    }
    const condition = checkPhoneEmergencyContact(
      phoneNumber,
      emergencyContact,
      verifiedUsers.phoneNumber
    );

    if (condition) {
      throw new HTTPError(
        "Emergency contact and phone number cannot be same",
        400
      );
    }

    if (
      (verifiedUsers.emailId && emailId && emailId != verifiedUsers.emailId) ||
      (verifiedUsers.emailId && emailId == "") ||
      (verifiedUsers.phoneNumber &&
        phoneNumber &&
        phoneNumber != verifiedUsers.phoneNumber) ||
      (verifiedUsers.phoneNumber && phoneNumber == "")
    )
      throw new HTTPError("Verified Contact is not subject to change", 400);

    await checkIfReferalCodeExist(referalCode);

    return {
      success: true,
      message: "you can update the further data",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
//get user settings
export const getUserSetting = async (userId: string) => {
  try {
    await fetchUserByUniqueDataUser(userId);

    //2.update user setting data
    const getSettings = await prisma.usersSetting.findFirst({
      where: {
        forUserid: userId,
      },
      // select: {
      //   notification: true,
      //   appLock: true,
      //   language: true,
      // },
    });
    if (!getSettings) throw new HTTPError("Could not fetch user setting", 404);

    await trackActiveSession(userId);

    return {
      success: true,
      settings: getSettings,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//update user setting
export const updateUserSetting = async (
  data: IUpdateUserSetting,
  userId: string
) => {
  try {
    const { notification, language, appLock } = data;
    //1.check if user exist
    await fetchUserByUniqueDataUser(userId);

    //2.update user setting data
    const updateUserSetting = await prisma.usersSetting.update({
      where: {
        forUserid: userId,
      },
      data: {
        notification,
        language,
        appLock,
      },
    });
    if (!updateUserSetting)
      throw new HTTPError("Could not update user setting", 500);

    await trackActiveSession(userId);

    return {
      success: true,
      updatedSettings: updateUserSetting,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//Change Verified Contacts
//1. password verify
export const verifyUserPassword = async (data: IVerifyPasswordData) => {
  try {
    const { userId } = data;
    let { password } = data;
    let findUser = await fetchUserByUniqueDataAndCheckBlock(userId);

    password = await decryptPassword(password);

    if (!bcrypt.compareSync(password, findUser.password)) {
      await handleLoginAttempts(findUser);
    }
    await prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        wrongLoginAttempts: invalidAttempts,
      },
    });
    await trackActiveSession(userId);

    return {
      success: true,
      message: "password verified successfully",
      user: {
        id: userId,
        verifiedContactId: findUser.verifiedContactId,
      },
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//2. take new details and generate OTP
export const newUserContactDetails = async (data: INewContactDetailsInput) => {
  try {
    const { id, emailId, phoneNumber, otpHash } = data;

    const findUser = await fetchUserByUniqueDataUser(id);

    if (findUser.verifiedContactId === "emailId" && phoneNumber) {
      throw new HTTPError(
        "As your old verified contact is emailId,you can only set new emailId and not phoneNumber",
        400
      );
    }
    if (findUser.verifiedContactId === "phoneNumber" && emailId) {
      throw new HTTPError(
        "As your old verified contact is phoneNumber,you can only set new phoneNumber and not emailId",
        400
      );
    }
    if (emailId) {
      const validationResponse = await validateContact(
        id,
        "emailId",
        emailId.toLowerCase()
      );
      if (!validationResponse.success)
        throw new HTTPError(validationResponse.message, 400);

      // generate OTP
      await handleOTPProcess({
        contact: emailId,
        contactType: "emailId",
        userData: findUser,
        uuid: findUser.id,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "Change Contact detail in THITO App",
        otpTemplate: changeVerifiedContactDetailsOTP,
        selfcreated: true,
      });
      //add data to temporary storage

      await trackActiveSession(id);

      const returnData = {
        success: true,
        userId: id,
        verifiedContact: emailId,
        verifiedContactId: "emailId",
        message: "OTP sent successfully",
      };
      return returnData;
    } else if (phoneNumber) {
      const response = await validateContact(id, "phoneNumber", phoneNumber);
      if (!response.success) throw new HTTPError(response.message, 400);

      await handleOTPProcess({
        contact: phoneNumber,
        contactType: "phoneNumber",
        userData: findUser,
        uuid: findUser.id,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "newUserContactDetails",
        selfcreated: true,
        otpHash,
      });
      //add data to temporary storage

      const returnData = {
        success: true,
        userId: id,
        verifiedContact: phoneNumber,
        verifiedContactId: "phoneNumber",
        message: "OTP sent successfully",
      };
      return returnData;
    }
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//3. verify otp and change details
export const changeContactOtpVerify = async (
  data: IChangeContactDetailsInput
) => {
  try {
    const { userId, verifiedContact, verifiedContactId, otp } = data;

    let findUser = await fetchUserByUniqueDataAndCheckBlock(userId);
    // if (findUser.wrongLoginAttempts === 5) {
    //   throw new HTTPError(
    //     "Maximum login attempts exceeded.Please try again after 30 minutes",
    //     401

    //get hashed otp
    const findContactChangesUser = await prisma.otpStore.findUnique({
      where: {
        userId_createdBy: {
          userId,
          createdBy: "self",
        },
      },
      select: {
        hashedOTP: true,
        emailId: true,
        phoneNumber: true,
      },
    });

    if (!findContactChangesUser) throw new HTTPError("Invalid OTP", 401);

    const hashedotp = findContactChangesUser.hashedOTP;

    const verifyOTP_response = await verifyOTP(hashedotp, otp, verifiedContact);

    if (!verifyOTP_response) {
      await handleLoginAttempts(findUser);
    }

    //update user contact details
    const changeDetails = await prisma.users.update({
      data: {
        [verifiedContactId]: verifiedContact,
        verifiedContactId: verifiedContactId,
      },
      where: {
        id: findUser.id,
      },
    });
    if (!changeDetails) throw new HTTPError("Could not update user data", 500);

    //update the same for all minors
    await prisma.dependant.updateMany({
      where: {
        userId: findUser.id
      },
      data: {
        [verifiedContactId]: verifiedContact,
      }
    })



    //delete data from OTP store
    await prisma.otpStore.delete({
      where: {
        userId_createdBy: {
          userId,
          createdBy: "self",
        },
      },
    });
    await trackActiveSession(userId);

    await prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        wrongLoginAttempts: invalidAttempts,
      },
    });
    const { password, refreshToken, ...filteredData } = changeDetails;
    return {
      success: true,
      message: "contact details were changed successfully",
      U6: filteredData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//delete user -self
export const removeUserById = async (
  userId: string,
  deleteData: { reason: string; role: string; email: string }
) => {
  try {
    const result = await prisma.$transaction(async (prisma) => {
      const { reason, role } = deleteData;
      let { email } = deleteData;
      //find user
      const userData = await fetchUserFirst(userId);

      if (email === "") {
        email =
          userData.verifiedContactId === "emailId"
            ? (userData.emailId as string)
            : (userData.phoneNumber as string);
      }
      //1. reason to delete the user
      const createReason = await prisma.deleteAccountReasons.create({
        data: {
          reason,
          role,
          deletedby: email,
        },
      });
      if (!createReason) throw new HTTPError("Could not create reason", 500);

      //2. delete user S3 folder
      const result = await deleteFolderFromS3(userId.toLowerCase());
      if (!result) throw new HTTPError(" Could not delete s3 folder", 502);

      //3.1 Store all deleting family links in syncChanges table
      const findLinks = await prisma.familylinks.findMany({
        where: {
          linkFrom: userId.toLowerCase(),
        },
      });

      const findLinksTo = await prisma.familylinks.findMany({
        where: {
          linkTo: userId.toLowerCase(),
        },
      });

      // on link from=userid inform linkto as both will be same but record id will differ and so does the link to and link from we never want to inform the user that is deleted

      for (const link of findLinks) {
        const changeHistory = await prisma.syncChanges.create({
          data: {
            userChanged: userId,
            changedBy: userId,
            changeType: "delete",
            table: "F9",
            recordId: link.id.toString(),
            familyMember: link.linkTo,
          },
        });
        if (!changeHistory) throw new HTTPError("Could not track change", 204);
      }
      // on link to=userid inform linkFrom
      for (const link of findLinksTo) {
        const changeHistory = await prisma.syncChanges.create({
          data: {
            userChanged: userId,
            changedBy: userId,
            changeType: "delete",
            table: "F9",
            recordId: link.id.toString(),
            familyMember: link.linkFrom,
          },
        });
        if (!changeHistory) throw new HTTPError("Could not track change", 204);
      }

      const notifications = {
        primaryContent: `Your profile has successfully disconnected with ${userData.fullName}`,
        showChangeAccessLink: true,
      };
      //store  notification
      await Promise.all([
        findLinksTo.map(async (user) => {
          const storeNotification = await notificationStore(
            user.linkFrom.toLowerCase(),
            notifications,
            redirectLink,
            "userDetached"
          );
          if (!storeNotification.success) {
            throw new HTTPError("could not store notification", 204);
          }
          const findUser = await fetchUserWithSetting(
            user.linkFrom,
            "user not found"
          );

          if (
            findUser &&
            findUser.deviceToken &&
            (findUser.currentSessionId != null ||
              findUser.currentSessionId != "") &&
            (findUser.refreshToken != null || findUser.refreshToken != "") &&
            findUser.setting?.notification === true
          ) {
            await sendNotificationToFamilyCare(
              findUser,
              notifications,
              redirectLink,
              storeNotification.id,
              userId.toLowerCase(),
              user.linkFrom.toLowerCase(),
              "userDetached"
            );
          }
        }),
      ]);

      //3. Delete all family Links
      const deleteFamily = await prisma.familylinks.deleteMany({
        where: {
          OR: [
            {
              linkFrom: userId.toLowerCase(),
            },
            {
              linkTo: userId.toLowerCase(),
            },
            {
              createdBy: userId.toLowerCase(),
              linkType: "sharedMinor"
            }
          ],
        },
      });
      if (!deleteFamily)
        throw new HTTPError("Could not delete family links", 500);

      //4. delete the user permanently
      const deleteUser = await prisma.users.delete({
        where: {
          id: userId.toLowerCase(),
        },
      });

      if (!deleteUser) throw new HTTPError("Could Not delete User", 500);

      return {
        success: true,
        message: `User with id ${deleteUser.id} successfully deleted`,
        id: deleteUser.id,
      };
    });
    return result;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getHomePageData = async (
  user: ITokenData,
  { famCareMemberId }: ParsedQs
) => {
  try {
    let HomePageData;

    if (famCareMemberId) {
      const response = await getMemberDataById(
        user,
        (famCareMemberId as string)?.toLowerCase()
      );
      if (!response) {
        throw new HTTPError("could not get member data by id.", 500);
      }
      if (response.success) HomePageData = response.HomePageData;
    } else {
      const userData = await prisma.users.findFirst({
        where: {
          id: user.id,
        },
        include: {
          healthRecord: true,
          notes: true,
          appointment: {
            where: {
              apptDate: { gte: new Date() }, // Upcoming appointments
            },
            orderBy: { apptDate: "asc" },
            take: 4,
          },
          medicine: {
            where: {
              startAt: { gte: new Date() }, // Upcoming medicines
              isActive: true,
            },
            orderBy: { startAt: "asc" },
            take: 4,
          },
        },
      });
      if (!userData) throw new HTTPError("Could Not Find User", 404);

      const {
        refreshToken,
        password,
        healthRecord,
        notes,
        appointment,
        medicine,
        ...filteredData
      } = userData;

      //   // If dates are equal, sort by time (ascending)
      //   if (event1.startAt && event2.startAt) {
      //     return event1.startAt.getTime() - event2.startAt.getTime();
      //   } else if (event1.startAt) {
      //     return (
      //       event1.startAt.getTime() - (event2.apptDate?.getTime() || Infinity)
      //     );
      //   } else {
      //     return (
      //       (event2.startAt?.getTime() || Infinity) - event1.apptDate?.getTime()
      //     );
      //   }
      // });

      //get family members
      const getAllFamilyMembers = await prisma.familylinks.findMany({
        where: {
          linkFrom: user.id,
        },
      });

      const [memberData, selfAwareness, advertisements] = await Promise.all([
        FamilyMembersData(getAllFamilyMembers),
        getUserVitalModules(user, {}),
        getAllAdvertisements(user, { page: 1, limit: 500 }),
      ]);
      if (!selfAwareness) {
        throw new HTTPError("could not get self awareness data.", 500);
      }
      HomePageData = {
        U6: filteredData,
        H8: userData.healthRecord,
        A12: advertisements.advertisements,
        A1: appointment.slice(0, 5),
        M3: medicine.slice(0, 5),
        selfAwareness: selfAwareness.V5,
        family: memberData,
        N4: userData.notes,
      };
    }
    await trackActiveSession(user.id);

    return {
      success: true,
      HomePageData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getQrData = async (id: string) => {
  try {
    //decrypt the userId:
    const decryptedId: string = await decryptPassword(id)

    let HomePageData;
    //search both tables
    const [user, minor] = await Promise.all([
      prisma.users.findFirst({
        where: {
          id: decryptedId,
        },
        include: {
          healthRecord: true,
        },
      }),
      prisma.dependant.findFirst({
        where: {
          id: decryptedId,
        },
        include: {
          healthRecord: true,
        },
      }),
    ]);

    if (!user && !minor) throw new HTTPError("Could Not Find user data", 404);

    if (minor) {
      const { healthRecord, ...filteredData } = minor;
      HomePageData = {
        U6: filteredData,
        H8: minor.healthRecord,
      };
    } else if (user) {
      const { refreshToken, password, healthRecord, ...filteredData } = user;
      HomePageData = {
        U6: filteredData,
        H8: user.healthRecord,
      };
      await trackActiveSession(decryptedId);
    }

    return {
      success: true,
      HomePageData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//syncing changes
export const getUserSyncedData = async (
  user: ITokenData,
  {
    lastSyncDate,
    famCareMemberId,
  }: { lastSyncDate?: string; famCareMemberId?: string }
) => {
  try {
    let updatedData;
    let result;
    //find all attached family
    const getAllFamilyMembers = await prisma.familylinks.findMany({
      where: {
        OR: [
          { linkFrom: user.id },
          { linkTo: user.id, linkType: "sharedMinor" },
        ],
      },
    });

    const famCareMemberIds = getAllFamilyMembers.map((member) => {
      // If member.linkTo equals user.id, return member.linkFrom
      if (member.linkTo === user.id) {
        return member.linkFrom;
      }
      // Otherwise, return member.linkTo
      return member.linkTo;
    });

    if (famCareMemberId) {
      //1. get all distinct records
      const distinctRecords = await prisma.syncChanges.findMany({
        where: {
          OR: [
            {
              userChanged: famCareMemberId?.toLowerCase(),
              familyMember: user.id,
              synced: false,
            },
            {
              changeType: "delete",
              table: "F9",
              familyMember: user.id,
              userChanged: user.id,
              synced: false,
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        distinct: [
          "table",
          "changeType",
          "userChanged",
          "familyMember",
          "recordId",
        ],
      });
      //get reminder,app,insurance,perioddiary of all family care under primary user
      const getReminders = await prisma.syncChanges.findMany({
        where: {
          familyMember: user.id, // inform
          OR: [
            {
              userChanged: {
                in: famCareMemberIds,
                //get all family care data
              },
            },
            {
              userChanged: user.id, // get ur own data
            },
          ],
          synced: false,
          table: {
            in: ["M3", "A1", "V5", "I10"],
          },
          NOT: {
            AND: {
              //NOT of particular family member as we already fetched it above query
              familyMember: user.id,
              userChanged: famCareMemberId?.toLowerCase(),
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
        distinct: ["changeType", "userChanged", "familyMember", "recordId"],
      });

      distinctRecords.push(...getReminders);
      updatedData = await fetchUpdatedData(distinctRecords, 500);

      if (updatedData.success) {
        const allIds = distinctRecords.map((record) => record.id);

        const linkSync = await prisma.syncChanges.updateMany({
          where: {
            id: {
              in: allIds,
            },
          },
          data: {
            synced: true,
          },
        });

        const syncTrue = await prisma.users.update({
          where: {
            id: user.id,
          },
          data: {
            isSync: true,
          },
        });

        if (!syncTrue || !linkSync)
          throw new HTTPError(
            "Could not update sync flag for logged in user",
            500
          );
      }
    } else {
      const filters: any = {};

      if (lastSyncDate) {
        filters.createdAt = { gte: formatDateForDB(lastSyncDate) };
      }

      // get all distinct changes
      const distinctRecords = await prisma.syncChanges.findMany({
        where: {
          AND: [filters],
          OR: [
            {
              userChanged: user.id,
              changedBy: {
                not: user.id,
              },
              familyMember: user.id,
              synced: false,
            },
            {
              changeType: "delete",
              table: "F9",
              familyMember: user.id,
              synced: false,
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        // distinct: ["recordId"],

        distinct: ["table", "changeType", "recordId"],
      });

      //get reminder,app,insurance,perioddiary of all family care under primary user
      const getReminders = await prisma.syncChanges.findMany({
        where: {
          familyMember: user.id,
          userChanged: {
            in: famCareMemberIds, //get data of all family members
          },
          synced: false,
          table: {
            in: ["M3", "A1", "V5", "I10"],
          },
          NOT: {
            AND: [{ familyMember: user.id }, { userChanged: user.id }], // NOT OF OWN
          },
        },

        orderBy: {
          createdAt: "desc",
        },
        distinct: ["changeType", "userChanged", "familyMember", "recordId"],
      });

      distinctRecords.push(...getReminders);
      updatedData = await fetchUpdatedData(distinctRecords, 500);

      if (updatedData.success) {
        const linkSync = await prisma.syncChanges.updateMany({
          where: {
            OR: [
              {
                userChanged: user.id,
                familyMember: user.id,
                synced: false,
              },
              {
                changeType: "delete",
                table: "F9",
                familyMember: user.id,
                synced: false,
              },
              {
                table: { in: ["M3", "A1", "V5"] },
                userChanged: { in: famCareMemberIds },
                familyMember: user.id,
                synced: false,
              },
            ],
          },
          data: {
            synced: true,
          },
        });

        const syncTrue = await prisma.users.update({
          where: {
            id: user.id,
          },
          data: {
            isSync: true,
          },
        });
        if (!syncTrue || !linkSync)
          throw new HTTPError(
            "Could not update sync flag for logged in user",
            500
          );
      }
    }

    await prisma.users.updateMany({
      where: {
        OR: [
          {
            id: {
              in: famCareMemberIds,
            },
          },
          { id: user.id },
        ],
      },
      data: {
        inAppNotificationSync: true,
      },
    });

    await trackActiveSession(user.id);

    return {
      success: true,
      lastSyncDate: new Date(),
      Data: updatedData.Data,
      vitalsLastSync: result,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const markAsInAppNotifSynced = async (user: ITokenData) => {
  try {
    await fetchUserFirst(user.id);

    const syncDone = await prisma.users.update({
      where: {
        id: user.id,
      },
      data: {
        inAppNotificationSync: true,
      },
    });
    if (!syncDone) {
      throw new HTTPError("Could not update user", 500);
    }
    return {
      success: true,
      message: "marked inAppNotification as synced",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//user feedback & complaint

export const addUserMessage = async (
  userId: string,
  data: {
    emailId: string;
    message: string;
    type: MessageType;
    files?: Express.Multer.File[];
  }
) => {
  try {
    const { message, type, emailId, files } = data;
    const date = new Date(Date.now());
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Adding 1 since getMonth() returns 0-11
    const day = date.getDate().toString().padStart(2, "0");
    let complaintId = null;

    if (type === "complaint") {
      const randomNumber =
        1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000);
      complaintId = BigInt(year + month + day + randomNumber);
    }

    //1.add complaint/message
    const addMessage = await prisma.userMessage.create({
      data: {
        message,
        emailId: emailId ? emailId.toLowerCase() : null,
        messageType: type,
        complaintId,
        user: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        user: true,
      },
    });

    if (!addMessage)
      throw new HTTPError("Could not record message from user", 500);

    //2. upload images to s3.
    let uploadedImageUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const imageUrl = await renameAndUploadComplaintImage(file, userId);

        if (!imageUrl) {
          throw new HTTPError("failed to upload in s3", 500);
        }

        uploadedImageUrls.push(imageUrl);
      }
    }

    if (uploadedImageUrls.length > 0) {
      await prisma.messageImage.createMany({
        data: uploadedImageUrls.map((imageUrl) => ({
          messageId: addMessage.id,
          imageUrl,
        })),
      });
    }

    //3.send mail
    if (type === "complaint") {
      const sendReplyToUser = await emailingService({
        email_id: addMessage.emailId ?? "",
        data: {
          // emailId: addMessage.emailId ? addMessage.emailId : "",
          user_complaintId: complaintId,
          name: addMessage.user?.fullName,
        },
        subject: `Your complaint No. ${complaintId}`,
        template: AutocomplaintReply,
        choice: "complaint_reply",
      });
      if (!sendReplyToUser) {
        throw new HTTPError("Could not send reply to user", 612);
      }
    }

    await trackActiveSession(userId);

    const returnData = {
      success: true,
      message: `${addMessage.messageType} was recorded successfully.`,
    };
    return returnData;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//block user
export const blockUserWithReason = async (
  data: {
    userId: string;
    reason: string;
  },
  admin: adminTokenData
) => {
  try {
    if (!data) throw new HTTPError("Required Data missing", 422);

    const { userId, reason } = data;

    //1. find User
    const findUser = await prisma.users.findFirst({
      where: {
        id: userId.toLowerCase(),
      },
    });
    if (!findUser) throw new HTTPError("User to block not found", 404);

    //2. Record reason for block
    const recordBlock = await prisma.blockReasons.create({
      data: {
        blockReason: reason,
        blockedBy: admin.emailId,
        user: {
          connect: {
            id: userId.toLowerCase(),
          },
        },
      },
    });
    if (!recordBlock)
      throw new HTTPError("Reason for blocakge could not be recorded", 500);

    //3. Block User
    const blockUser = await prisma.users.update({
      where: {
        id: userId.toLowerCase(),
      },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
      },
    });
    if (!blockUser) throw new HTTPError("Could not block user", 500);
    const returnData = {
      success: true,
      message: `User ${userId} has been blocked due to ${reason}`,
    };

    return returnData;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//un-block user
export const unblockUser = async (userId: string) => {
  try {
    if (!userId) throw new HTTPError("Required Data missing", 422);

    //1. find User
    const findUser = await prisma.users.findFirst({
      where: {
        id: userId.toLowerCase(),
      },
    });
    if (!findUser) throw new HTTPError("User to un-block not found", 404);

    //check if user is blocked
    const findUnblock = await prisma.users.findFirst({
      where: {
        id: userId.toLowerCase(),
        isBlocked: true,
      },
      include: {
        blockReasons: true,
      },
    });
    if (!findUnblock)
      throw new HTTPError(`User with  ${userId} is not blocked`, 500);

    //2. Un-Block User
    const unblock = await prisma.users.update({
      where: {
        id: userId.toLowerCase(),
      },
      data: {
        isBlocked: false,
        wrongLoginAttempts: invalidAttempts,
      },
    });
    if (!unblock) throw new HTTPError("Could not un-block user", 500);
    const returnData = {
      success: true,
      message: `User ${userId} has been un-blocked by super-admin`,
    };

    return returnData;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getUserStorageDetails = async (userId: string) => {
  try {
    const usedDataBytes = await getFolderSize(
      `${process.env.AWS_BUCKET_DEV}`,
      `${userId}`
    );
    const maxFolderSize = (await getUserStorage(userId)) + 6 * 1024; //user max folder size in KB

    const usedDataMB =
      Math.round((usedDataBytes / (1024 * 1024)) * 1000) / 1000; //bytes -> MB

    // Convert maxFolderSize to MB
    const MAX_STORAGE_MB = maxFolderSize / 1024;

    const percentUsed =
      Math.round((usedDataMB / MAX_STORAGE_MB) * 100 * 1000) / 1000;

    const details = {
      usedSpace: usedDataMB,
      freeSpace: Math.max(0, MAX_STORAGE_MB - usedDataMB), // Prevent negative values
      percentUsed,
      percentFree: Math.max(0, 100 - percentUsed),
    };

    const returnData = {
      success: true,
      storageDetails: details,
    };
    return returnData;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//Faqs

export const getFaqsData = async (type: string) => {
  try {
    const faqs = await prisma.fAQS.findMany({
      where: {
        type: type as Faqtype,
      },
    });

    return {
      success: "true",
      data: faqs,
    };
  } catch (err) {
    throw handleError(err);
  }
};
