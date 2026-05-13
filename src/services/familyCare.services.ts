import prisma from "../prisma";
import {
  ICreateDependantType,
  IChangeAccessType,
  IGetFamilyMembersData,
} from "../utility/DataTypes/types.familyCare";
import {
  IDependant,
  IExistingUserInput,
  INewContactDetailsInput,
  IMigrateMinorVerifyOtp,
  ITokenData,
  IUser,
  IVerifyOTPForExistingUserInput,
  IRegisterUserDataFamilyCare,
  INotification,
} from "../utility/DataTypes/types.user";
import { formatDateForDB } from "../utility/DateTimeFormatters";
import { deduceRelation, familyLink } from "../utility/familyLinkData";
import HTTPError from "../utility/HttpError";
import { generateUserId } from "../utility/UserId";
import { createUserFunctionality } from "../utility/CreateUserFunction";
import { createS3Folder } from "../utility/aws/createFolder";
import { verifyOTP } from "../utility/verifyOTP";
import { FamilyMembersData } from "../utility/familyMemberData";
import { trackActiveSession } from "../utility/changeHistoryTrackFunction";
import {
  otp_verification_existing_user,
  releaseMinorAccount,
  userId_information,
} from "../templateDesign/userTemplates";
import {
  notificationStore,
  notifyUserConnectionLimit,
  storeAndSendNotification,
} from "../utility/pushNotificationAndStoreNotification";
import { awsBucketLink, qrBaseUrl, redirectLink } from "../constants/data";
import { uploadProfile } from "../utility/aws/uploadFile";
import {
  Changes,
  Dependant,
  Language,
  Users,
  UsersSetting,
} from "../../prisma/generated/prisma/client";
import { handleError } from "../utility/Error";
import {
  fetchDependant,
  fetchMinor,
  fetchUserByUniqueDataAuth,
  fetchUserFirst,
  fetchUserUnique,
  fetchUserWithSetting,
  getUserByUniqueData,
} from "../utility/prismaQueries";
import {
  generateAndSendOTP,
  handleOTPProcess,
} from "../utility/handleOTPOperation";
import { deleteDependantFromTable } from "../utility/delete";
import {
  addSyncedDataUnlinkFamilyMember,
  checkPrimaryParentUserOfMinor,
  countFamilyLinks,
  detachLinkUnlinkFamilyMember,
  findContactChangesUserGetHashedOtp,
  findExistingLink,
  findFamilyLinksUnlinkFamilyMember,
  findUserVerifyCreateExistingUser,
  getLinkDataFamilyCare,
  removeChangeRecordsUnlinkFamilyMember,
  unlinkMinorFromGuardian,
} from "../utility/helperFunction/familyCare.services.helper";
import { deleteOTPData, findOtp, OTPVerification } from "../utility/otpWrapper";
import { updateSyncChanges } from "../utility/SyncedData";
import { sendMessageToMobile } from "../utility/sendOtp";
import {
  fetchData,
  findFreePlan,
  generateReferralCodeOfSelf,
} from "../utility/helperFunction/subscription.services.helper";
import { TFamilyCare } from "../utility/DataTypes/types.feature";
import { encryptPassword } from "../utility/decryptingPassword";

//when adding a new family link under primary user
export const checkSubsriptionStatus = async (
  data: ITokenData,
  checkMinorCount?: string,
  reactivateMinorCount?: number
) => {
  try {
    if (!data) {
      throw new HTTPError("Unauthorised", 401);
    }
    //get user active subscription and add-ons
    const getSubscriptionData = await fetchData(data.id);

    //count links - active minors + adults
    const { minorCount, adultCount } = await countFamilyLinks(data.id);

    //fetch family_care data from user's active subscription
    const familyCareData = getSubscriptionData.subscription.find(
      (feat) => feat.canonicalName === "family_care"
    );
    if (!familyCareData)
      throw new HTTPError(
        "Could not fetch family_care data from user's subscription",
        404
      );
    const { minor, adult, slot } = familyCareData.metaValue as TFamilyCare;
    const totalCapacity = adult + minor + slot;
    const totalMembers = adultCount + minorCount;

    //when slots are not available
    if (reactivateMinorCount && reactivateMinorCount != 0 && minorCount + reactivateMinorCount > minor) {
      throw new HTTPError(
        `You cannot more minors than allowed to your family care with current plan `,
        601
      );
    }

    //when slots are available


    let availableSlots = slot;
    if (adult < adultCount || minor < minorCount) {
      const maxLinksAllowed = totalCapacity;
      const totalLinkedUsers = adultCount + minorCount;
      availableSlots = Math.max(0, maxLinksAllowed - totalLinkedUsers);
    }
    if (checkMinorCount === undefined) {
      return {
        success: true,
        adult_available:
          adultCount < adult + slot && totalMembers < totalCapacity,
        minor_available:
          minorCount < minor + slot && totalMembers < totalCapacity,
      };
    }

    if (
      ((checkMinorCount === "true" && minorCount >= minor + slot) ||
        (checkMinorCount === "false" && adultCount >= adult + slot)) &&
      availableSlots <= 0
    ) {
      throw new HTTPError(
        `You cannot add new members to your family care with current plan `,
        601
      );
    }
    await trackActiveSession(data.id);

    return {
      success: true,
      message: "User can add a new member to family care",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//when trying to link to existing user and want to check if user has quota to accomodate you in their family care as well
export const checkSubsriptionStatusOfExistingUser = async (
  findUser: any,
  linkFrom: string,
  checkMinorCount: boolean
) => {
  try {
    const user = await fetchUserFirst(linkFrom);

    if (!user) {
      throw new HTTPError("User not found", 404);
    }

    //get user active subscription and add-ons
    const getSubscriptionData = await fetchData(findUser.id);

    const { minorCount, adultCount } = await countFamilyLinks(findUser.id);

    //fetch family_care data from user's active subscription

    const familyCareData = getSubscriptionData.subscription.find(
      (feat) => feat.canonicalName === "family_care"
    );
    if (!familyCareData)
      throw new HTTPError(
        "Could not fetch fmaily_care data from user's subscription",
        404
      );
    const { minor, adult, slot } = familyCareData.metaValue as TFamilyCare;
    const totalCapacity = adult + minor + slot;
    const totalMembers = adultCount + minorCount;
    //0 1 0 0 1

    if (
      (adultCount > adult + slot && totalMembers > totalCapacity) ||
      (minorCount > minor + slot && totalMembers > totalCapacity) ||
      totalMembers >= totalCapacity
    ) {
      await notifyUserConnectionLimit(
        checkMinorCount,
        user,
        findUser,
        linkFrom
      );
    }

    await trackActiveSession(findUser.id);

    return true;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const createNewDependant = async (
  data: ICreateDependantType,
  user: ITokenData
) => {
  try {
    const {
      fullName,
      // declaration,
      gender,
      dob,
      address,
      pincode,
      emergencyContact,
      bloodGroup,
      relation,
      presentDiseases,
      allergies,
      doctorFullName,
      docAddress,
      docPhoneNumber,
      additionalInformation,
      profileImage,
    } = data;
    const checkMinorCount: string = "true";
    //check if adding is possible:
    await checkSubsriptionStatus(user, checkMinorCount);
    const id = generateUserId();
    let createdProfileURL = null;
    if (profileImage) {
      const profileURL = await uploadProfile(
        {
          profileImage: profileImage,
          userId: id.toLowerCase(),
        }
        //// true
      );
      createdProfileURL = `${awsBucketLink}/${profileURL?.Key}`;
      if (!profileURL?.success)
        throw new HTTPError("Could not upload profile Image to S3", 502);
    }
    //create user QR URL
    const userQRUrl = await encryptPassword(id);

    //add user to dependant table
    const formattedDob = formatDateForDB(dob);
    const newDependant = await prisma.dependant.create({
      data: {
        id: id.toLowerCase(),
        fullName,
        phoneNumber: user.phoneNumber,
        emailId: user.emailId,
        // declaration,
        gender,
        dob: formattedDob,
        address,
        pincode,
        emergencyContact,
        user: { connect: { id: user.id } },
        profileImage: createdProfileURL,
        QRCodeURL: `${qrBaseUrl}/${userQRUrl}`
      },
    });

    if (!newDependant)
      throw new HTTPError("Could Not create New Dependant", 500);
    const healthRecord = await prisma.healthRecord.create({
      data: {
        bloodGroup,
        presentDiseases,
        allergies,
        doctorFullName,
        docAddress,
        docPhoneNumber,
        additionalInformation,
        dependant: { connect: { id: newDependant.id } },
      },
    });
    if (!healthRecord)
      throw new HTTPError("Could Not store health records", 500);
    //add link to family links table
    const addLink = await prisma.familylinks.create({
      data: {
        linkFrom: user.id,
        linkTo: newDependant.id,
        accessType: "manage",
        relation,
        linkType: "minor",
        sensitiveDataAccess: true,
        createdBy: user.id,
      },
    });
    if (!addLink) throw new HTTPError("Could Not Add the family link", 500);

    //create s3 folder for user
    createS3Folder(newDependant.id.toLowerCase());
    //find free plan
    const fetchedFreePlan = await findFreePlan();

    //linking free plan to user
    await prisma.subscription.create({
      data: {
        dependantId: newDependant.id,
        expiresAt: null,
        planVariantId: fetchedFreePlan.planVariants[0].id,
      },
    });

    const notifications: INotification = {
      primaryContent: `Your minor's account has been successfully created.`,
      showChangeAccessLink: true,
    };
    await notificationStore(
      newDependant.id.toLowerCase(),
      notifications,
      redirectLink,
      "userAttached", //title
      user.id.toLowerCase() //primary if
      // accesstext
    );
    await trackActiveSession(user.id);

    return {
      success: true,
      message: `Successfully added new dependant under user ${user.id}`,
      D7: newDependant,
      H8: healthRecord,
      F9: addLink,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const deletingDependant = async (id: string, user: ITokenData) => {
  try {
    if (!id) {
      throw new HTTPError("Missing id", 400);
    }
    const findDependant = await fetchDependant(id);
    //primary user
    const findLink = await prisma.familylinks.findFirst({
      where: {
        linkFrom: user.id,
        linkTo: id,
      },
    });

    if (!findLink) {
      throw new HTTPError(
        "You dont have access to delete this dependant account",
        401
      );
    }

    //secondary parent

    const findSecondaryParentLink = await prisma.familylinks.findFirst({
      where: {
        linkFrom: findDependant.id,
        linkType: "sharedMinor",
      },
    });

    const deleteLinks = await prisma.familylinks.deleteMany({
      where: {
        OR: [{ id: findLink.id }, { id: findSecondaryParentLink?.id }],
      },
    });
    if (!deleteLinks) {
      throw new HTTPError("Error deleting link", 500);
    }

    await deleteDependantFromTable(id);

    //notify primary of user deletion
    const notifications: INotification = {
      primaryContent: `${findDependant.fullName}'s account has been successfully deleted.`,
      showChangeAccessLink: true,
    };

    await notificationStore(
      user.id.toLowerCase(),
      notifications,
      redirectLink,
      "minorDetached", //title
      user.id.toLowerCase() //primary if
      // accesstext
    );

    //if minor is connected to secondary parent inform secondary parent about detaching the user
    if (findSecondaryParentLink) {
      const notifications: INotification = {
        secondaryContent: `Your profile has been successfully disconnected with ${findDependant.fullName}.`,
        showChangeAccessLink: true,
      };

      const secondaryParent = await fetchUserWithSetting(
        findSecondaryParentLink.linkTo,
        "Secondary parent not found"
      );

      await storeAndSendNotification(
        secondaryParent,
        notifications,
        redirectLink,
        findSecondaryParentLink.linkFrom.toLowerCase(),
        findSecondaryParentLink.linkTo.toLowerCase(),
        "minorDetached"
      );

      await prisma.syncChanges.create({
        data: {
          userChanged: findSecondaryParentLink.linkTo,
          changedBy: user.id,
          changeType: "delete",
          familyMember: findSecondaryParentLink.linkTo,
          recordId: findSecondaryParentLink.id.toString(),
          table: "F9",
        },
      });
    }
    return {
      success: true,
      message: "Dependant deleted successfully",
      D7: findDependant,
      F9: findLink,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getFamilyMembers = async (
  userId: string,
  queryParams: IGetFamilyMembersData
) => {
  try {
    const { accessType, linkType, relation } = queryParams;
    const filters: any = {};

    if (accessType) {
      filters.accessType = accessType;
    }
    if (linkType) {
      filters.linkType = linkType;
    }
    if (relation) {
      filters.relation = {
        contains: relation,
        mode: "insensitive",
      };
    }

    const getAllFamilyMembers = await prisma.familylinks.findMany({
      where: {
        AND: [filters],
        OR: [
          { linkFrom: userId },
          { linkTo: userId },
          { AND: [{ linkTo: userId }, { linkType: "sharedMinor" }] },
        ],
      },
    });

    if (!getAllFamilyMembers)
      throw new HTTPError("Could not fetch family data", 500);

    const memberData = await FamilyMembersData(getAllFamilyMembers);
    await trackActiveSession(userId);

    return {
      success: true,
      family: memberData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const EditFamilyAccess = async (
  user: ITokenData,
  data: IChangeAccessType
) => {
  try {
    const {
      memberId,
      access,
      sensitiveAccess,
      linkFromMinor,
      getMedicineReminderOfSecondayUser,
    } = data;
    //link from
    let findMinor: Dependant | null = null;
    const linkFrom = await fetchUserFirst(user.id);
    //Tcheck if linkfromParent exist

    if (linkFromMinor) {
      findMinor = await fetchMinor(linkFromMinor);
    }
    const findMinorLinkWithParent = await prisma.familylinks.findFirst({
      where: {
        linkFrom: user.id,
        linkTo: linkFromMinor,
      },
    });

    if (!findMinorLinkWithParent) {
      throw new HTTPError(
        "You dont have access to minor account only parent can change the access type of minor.",
        404
      );
    }
    const findUser = await fetchUserWithSetting(memberId, "user not found");

    //change access of minor -> secondary

    const linkData = await getLinkDataFamilyCare(
      linkFromMinor,
      user.id,
      memberId
    );

    // the condition to check if the change access of minor is being changed with secondary user and is being changed by parent
    if (
      (!linkFromMinor || findMinor?.userId != user.id) &&
      linkData.linkType == "sharedMinor" &&
      (access == "view" || access == "manage")
    )
      throw new HTTPError(
        "Cannot change access type of a minor's account ",
        401
      );

    const oldAccessType = linkData.accessType;

    const changedAccess = await prisma.familylinks.updateManyAndReturn({
      where: {
        linkFrom: linkFromMinor?.toLowerCase() ?? user.id.toLowerCase(),
        linkTo: memberId.toLowerCase(),
      },
      data: {
        accessType: access,
        sensitiveDataAccess: sensitiveAccess,
        getMedicineReminderOfSecondayUser,
      },
    });
    if (!changedAccess)
      throw new HTTPError(
        "Could not update access/sensitive access of account",
        500
      );

    const syncChanges = await prisma.users.update({
      where: {
        id: memberId.toLowerCase(),
      },
      data: {
        isSync: false,
      },
    });

    if (!syncChanges) throw new HTTPError("Could not update sync changes", 500);

    const addSyncedData = await prisma.syncChanges.createMany({
      data:
      // . !linkFromMinor? [
      {
        userChanged: memberId,
        changedBy: user.id,
        changeType: "update",
        familyMember: memberId,
        recordId: linkData.id.toString(),
        table: "F9",
      },
    });

    if (!addSyncedData)
      throw new HTTPError("Could not update sync changes", 500);

    if (oldAccessType !== access) {
      const notifications: INotification =
        linkFromMinor && findMinor
          ? {
            secondaryContent: `The access of ${findMinor.fullName}'s account has been changed from ${oldAccessType} to ${access} by ${linkFrom.fullName}.`,
            primaryContent: `You have changed the access for the ${findMinor.fullName}'s account from ${oldAccessType} to ${access} for ${findUser.fullName}.`,
            showChangeAccessLink: true,
          }
          : {
            secondaryContent: `${linkFrom.fullName} changed the access from ${oldAccessType} to ${access}`,
            primaryContent: `You changed the access from ${oldAccessType} to ${access} for ${findUser.fullName}`,
            showChangeAccessLink: true,
          };
      await storeAndSendNotification(
        findUser,
        notifications,
        redirectLink,
        user.id.toLowerCase(),
        memberId.toLowerCase(),
        "changeAccess"
      );
    }
    await trackActiveSession(user.id);

    return {
      success: true,
      message: "Access of this account has been changed successfully",
      F9: changedAccess[0],
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const createNewUserFamilyCare = async (
  data: IRegisterUserDataFamilyCare,
  user: ITokenData
) => {
  try {
    const { id, relation, linkFromUserid } = data;
    const checkMinorCount: string = "false";

    //check if adding is possible:
    await checkSubsriptionStatus(user, checkMinorCount);
    data.createdBy = linkFromUserid.toLowerCase();
    const findUser = await prisma.users.findUnique({
      where: {
        id: linkFromUserid.toLowerCase(),
      },
      select: {
        setting: true,
        fullName: true,
      },
    });
    if (!findUser) {
      throw new HTTPError("User not found", 404);
    }
    data.language = findUser.setting?.language as Language;
    const result = await createUserFunctionality(data);
    if (!result?.success) {
      throw new HTTPError("error creation record of user", 204);
    }
    const { password, refreshToken, healthRecord, ...filteredData } = result;

    const familyData = await prisma.familylinks.createMany({
      data: [
        {
          linkFrom: linkFromUserid.toLowerCase(),
          linkTo: id.toLowerCase(),
          relation: relation,
          linkType: "subaccount",
          createdBy: user.id,
        },
        {
          linkFrom: id.toLowerCase(),
          linkTo: linkFromUserid.toLowerCase(),
          relation: await deduceRelation(
            relation,
            linkFromUserid.toLowerCase()
          ),
          linkType: "subaccount",
          accessType: "manage",
          createdBy: user.id,
        },
      ],
    });
    if (!familyData) {
      throw new HTTPError("db error: could not link the user", 500);
    }

    const family = await prisma.familylinks.findMany({
      where: {
        OR: [
          {
            linkFrom: linkFromUserid.toLowerCase(),
            linkTo: id.toLowerCase(),
          },
          {
            linkFrom: id.toLowerCase(),
            linkTo: linkFromUserid.toLowerCase(),
          },
        ],
      },
    });

    if (result.emailId && result.verifiedContactId == "emailId") {
      generateAndSendOTP({
        contact: result.emailId.toLowerCase(),
        contactType: "emailId",
        uuid: id.toLowerCase(),
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "Successful registration in THITO App",
        relation: undefined,
        otpTemplate: userId_information,
      });
    } else if (
      result.phoneNumber &&
      result.verifiedContactId == "phoneNumber"
    ) {
      const msg = `Dear User (${result.id.toUpperCase()}), welcome to THITO. Your User ID is ${id.toLowerCase()}. You can use it for login. Stay updated with your health data. -STEIGEN HEALTHCARE`;
      sendMessageToMobile(result.phoneNumber, msg);
    }
    //create s3 folder for user
    createS3Folder(result.id.toLowerCase());

    //remove data from temp storage
    const delTempData = await prisma.verifiedUsers.delete({
      where: {
        userId: result.id.toLowerCase(),
      },
    });
    if (!delTempData) {
      throw new HTTPError("db error: could not delete temp data", 500);
    }

    const notifications: INotification = {
      secondaryContent: `Congratulations on connecting your profile with ${findUser.fullName}.`,
      secondaryAccessText: `${findUser.fullName} can view your data`,
      primaryContent: `Congratulations on connecting your profile with ${result.fullName}`,
      primaryAccessText: `${result.fullName} can view your data`,
      showChangeAccessLink: true,
    };
    const storeNotification = await notificationStore(
      result.id.toLowerCase(),
      notifications,
      redirectLink,
      "userAttached", //title
      linkFromUserid.toLowerCase(), //id
      "Change Access"
      // accesstext
    );

    if (storeNotification.success !== true) {
      throw new HTTPError("could not store notification", 204);
    }
    await trackActiveSession(id.toLowerCase());

    return {
      success: true,
      message: "Successfully added new user",
      U6: filteredData,
      H8: result.healthRecord,
      F9: family,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const generateOtpExistingAccount = async (data: IExistingUserInput) => {
  try {
    const {
      uuid,
      relation,
      userData,
      connectMinor = false,
      linkToParent,
      otpHash,
    } = data;
    let user: any = null;
    if (connectMinor) {
      await fetchDependant(uuid);

      await checkPrimaryParentUserOfMinor(uuid, userData.id);

      await findExistingLink(connectMinor, uuid, userData, linkToParent);
      //check if minor is already connected to secondary parent
      const count = await prisma.familylinks.count({
        where: {
          AND: [
            {
              NOT: {
                linkFrom: userData.id,
                linkTo: uuid,
              },
            },
            {
              linkFrom: uuid,
            },
          ],
        },
      });
      if (count >= 1) {
        throw new HTTPError(
          "This minor is already linked to other secondary user",
          605
        );
      }

      user = await fetchUserWithSetting(
        linkToParent,
        "The user you are trying to link with does not exist"
      );
    }

    //check minor count of user  we are connecting minor with
    const checkMinorCount: boolean = connectMinor;

    //check if adding is allowed
    if (!connectMinor) {
      await findExistingLink(false, uuid, userData);
      await checkSubsriptionStatus(userData, checkMinorCount.toString());
      //get user

      user = await fetchUserByUniqueDataAuth(uuid);
    }

    //check user

    //check if uuid is not the logged in user itself
    if (userData.id === uuid) {
      throw new HTTPError("Cannot add yourself as family member", 607);
    }

    //check if the user u r trying to connect with has not exceeded the subscription quota
    await checkSubsriptionStatusOfExistingUser(
      user, //link to
      userData.id, //link from
      checkMinorCount
    );

    //check if user is already linked with the other user
    const { phoneNumber, emailId } = user;

    if (emailId && user.verifiedContactId === "emailId") {
      await handleOTPProcess({
        contact: emailId,
        contactType: "emailId",
        userData,
        uuid,
        checkMinorCount,
        otpSubjectOrOtpMessage:
          "Attaching your profile in family care of THITO App",
        selfcreated: false,

        relation,
        linkToParent,
        otpTemplate: otp_verification_existing_user,
      });
    } else if (phoneNumber && user.verifiedContactId == "phoneNumber") {
      await handleOTPProcess({
        contact: phoneNumber,
        contactType: "phoneNumber",
        userData,
        uuid,
        checkMinorCount,
        otpSubjectOrOtpMessage: "ConnectExistingUser",
        selfcreated: false,

        relation,
        linkToParent,
        otpHash,
      });
    }

    let response: {
      success: boolean;
      relation: string;
      message: string;
      [key: string]: any;
    } = {
      success: true,
      relation: relation,
      message: "otp send to user successfully",
      verifiedContactId: user.verifiedContactId,
      verifiedContact:
        user.verifiedContactId === "emailId" ? user.emailId : user.phoneNumber,
      uuid,
      linkToParent,
    };

    await trackActiveSession(userData.id.toLowerCase());

    return response;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const verifyCreateExistingUser = async (
  data: IVerifyOTPForExistingUserInput
) => {
  try {
    return await prisma.$transaction(async (prisma) => {
      const {
        uuid,
        otp,
        relation,
        linkFromUserId,
        user,
        connectMinor = false,
        linkToParent,
      } = data;
      const checkMinorCount: boolean = connectMinor;
      let linkFrom: IUser | IDependant | null = null;
      const primaryUser = await fetchUserUnique(linkFromUserId);
      if (!connectMinor) {
        //check if logged in user subscription is full
        await checkSubsriptionStatus(user, "false");
        linkFrom = await findUserVerifyCreateExistingUser(null, linkFromUserId);
      } else {
        linkFrom = await prisma.dependant.findFirst({
          where: {
            id: uuid.toLowerCase(),
          },
          include: {
            healthRecord: true,
            medicine: true,
            appointment: true,
            insurance: true,
            vitalsUserData: true,
          },
        });
        if (!linkFrom) {
          throw new HTTPError(
            "user you are trying to link from does not exist",
            404
          );
        }
      }

      const findUser = await findUserVerifyCreateExistingUser(
        linkToParent,
        uuid
      );

      await checkSubsriptionStatusOfExistingUser(
        findUser, //linkto
        linkFromUserId, //linkfrom
        checkMinorCount
      );

      const user_otp = await findOtp(
        connectMinor,
        linkToParent,
        uuid,
        linkFromUserId
      );

      const userId = (
        findUser.verifiedContactId === "emailId"
          ? findUser.emailId
          : findUser.phoneNumber
      ) as string;

      //verify otp
      await OTPVerification(user_otp, otp, userId, relation);
      //delete otp data

      await deleteOTPData(connectMinor, linkToParent, uuid, linkFromUserId);

      const {
        refreshToken,
        healthRecord,
        deviceToken,
        password,
        currentSessionId,
        medicine,
        vitalsUserData,
        appointment,
        isSync,
        ...filteredData
      } = findUser;

      //link family
      const family_linking = await prisma.familylinks.createMany({
        data: !connectMinor
          ? [
            {
              linkFrom: linkFromUserId.toLowerCase(),
              linkTo: uuid.toLowerCase(),
              relation,
              linkType: "existing",
              createdBy: linkFromUserId.toLowerCase(),
            },
            {
              linkFrom: uuid.toLowerCase(),
              linkTo: linkFromUserId.toLowerCase(),
              relation: await deduceRelation(relation, linkFromUserId),
              linkType: "existing",
              createdBy: linkFromUserId.toLowerCase(),
            },
          ]
          : [
            {
              linkFrom: uuid.toLowerCase(),
              linkTo: linkToParent.toLowerCase(),
              relation,
              linkType: "sharedMinor",
              createdBy: linkFromUserId.toLowerCase(),
            },
          ],
      });

      if (!family_linking) {
        throw new HTTPError("family linking failed", 500);
      }

      const family = await prisma.familylinks.findMany({
        where: !connectMinor
          ? {
            OR: [
              {
                linkFrom: linkFromUserId.toLowerCase(),
                linkTo: uuid.toLowerCase(),
              },
              {
                linkFrom: uuid.toLowerCase(),
                linkTo: linkFromUserId.toLowerCase(),
              },
            ],
          }
          : {
            linkFrom: uuid.toLowerCase(),
            linkTo: linkToParent.toLowerCase(),
          },
      });

      await updateSyncChanges(linkToParent, uuid);

      const changeType: Changes = "create";

      const addSyncedData = await prisma.syncChanges.createMany({
        data: !connectMinor
          ? [
            {
              userChanged: uuid.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: uuid.toLowerCase(),
              recordId: family[0].id.toString(),
              table: "F9",
            },
            {
              userChanged: uuid.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: uuid.toLowerCase(),
              recordId: family[1].id.toString(),
              table: "F9",
            },
            {
              userChanged: uuid.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: uuid.toLowerCase(),
              recordId: linkFromUserId.toLowerCase(),
              table: "U6",
            },
            {
              userChanged: uuid.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: uuid.toLowerCase(),
              recordId: linkFrom.healthRecord?.id?.toString(),
              table: "H8",
            },
            ...linkFrom.medicine.map((medicine: any) => ({
              userChanged: uuid.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: uuid.toLowerCase(),
              recordId: medicine.id.toString(),
              table: "M3",
            })),
            ...linkFrom.appointment.map((appointment: any) => ({
              userChanged: uuid.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: uuid.toLowerCase(),
              recordId: appointment.id.toString(),
              table: "A1",
            })),

            ...linkFrom.vitalsUserData.map((vitalsUserData: any) => ({
              userChanged: uuid.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: uuid.toLowerCase(),
              recordId: vitalsUserData.id.toString(),
              table: "V5",
            })),
          ]
          : [
            {
              userChanged: linkToParent.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: linkToParent.toLowerCase(),
              recordId: family[0].id.toString(),
              table: "F9",
            },
            {
              userChanged: linkToParent.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: linkToParent.toLowerCase(),
              recordId: uuid.toLowerCase(),
              table: "D7",
            },
            {
              userChanged: linkToParent.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: linkToParent.toLowerCase(),
              recordId: linkFrom.healthRecord?.id?.toString(),
              table: "H8",
            },
            ...linkFrom.medicine.map((medicine: any) => ({
              userChanged: linkToParent.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: linkToParent.toLowerCase(),
              recordId: medicine.id.toString(),
              table: "M3",
            })),
            ...linkFrom.appointment.map((appointment: any) => ({
              userChanged: linkToParent.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: linkToParent.toLowerCase(),
              recordId: appointment.id.toString(),
              table: "A1",
            })),
            ...linkFrom.vitalsUserData.map((vitalsUserData: any) => ({
              userChanged: linkToParent.toLowerCase(),
              changedBy: linkFromUserId,
              changeType,
              familyMember: linkToParent.toLowerCase(),
              recordId: vitalsUserData.id.toString(),
              table: "V5",
            })),
          ],
      });
      if (!addSyncedData)
        throw new HTTPError("Could not update sync changes", 500);
      const notifications: INotification = connectMinor
        ? {
          secondaryContent: `${linkFrom.fullName}'s account has been successfully connected to your profile.`,
          primaryContent: `You have successfully connected ${linkFrom.fullName}'s account to ${findUser.fullName}`,
          secondaryAccessText: `You can now view ${linkFrom.fullName}'s data`,
          primaryAccessText: `${findUser.fullName} can view ${linkFrom.fullName}'s data`,
          showChangeAccessLink: false,
        }
        : {
          secondaryContent: `Congratulations on connecting your profile with ${linkFrom.fullName}`,
          primaryContent: `Congratulations on connecting your profile with ${findUser.fullName}`,
          secondaryAccessText: `${linkFrom.fullName} can view your data`,
          primaryAccessText: `${findUser.fullName} can view your data`,
          showChangeAccessLink: true,
        };

      await storeAndSendNotification(
        findUser,
        notifications,
        connectMinor ? "MinorProfiles" : redirectLink,
        primaryUser.id,
        uuid,
        "userAttached",
        `Change Access`
      );
      await trackActiveSession(linkFromUserId.toLowerCase());

      const response: any = {
        success: true,
        message: "Congratulation! user linked successfully",
        U6: !connectMinor ? { ...filteredData, isSync: false } : { ...filteredData, isSync },
        F9: family,
      };
      if (!connectMinor) {
        response.H8 = healthRecord;
        response.M3 = medicine;
        response.V5 = vitalsUserData;
        response.A1 = appointment;
      }
      //return
      return response;
    });
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const UnlinkFamilyMember = async (
  id: string,
  famCareMemberId: string,
  linkFromMinor?: string
) => {
  try {
    let linkFrom: Users | (Dependant & { user: Users }) | null = null;
    let minorsParent: Users | null = null;
    let minorsParentName: string = "";
    let minorsParentDataUser:
      | (Users & { setting: UsersSetting | null })
      | null = null;
    //link to
    const findUser = await fetchUserWithSetting(
      famCareMemberId,
      "user not found"
    );
    //link from
    if (!linkFromMinor) {
      linkFrom = await fetchUserFirst(id);
    } else {
      linkFrom = await fetchDependant(linkFromMinor.toLowerCase());
      minorsParent = linkFrom.user;
      minorsParentName = linkFrom.user.fullName;
      if (linkFrom.userId != id && famCareMemberId != id) {
        throw new HTTPError(
          "Either secondary user or parent can detach the minor",
          401
        );
      }
    }

    const linkData = await getLinkDataFamilyCare(
      linkFromMinor,
      id,
      famCareMemberId
    );

    const familyLinks = await findFamilyLinksUnlinkFamilyMember(
      linkFromMinor,
      linkData,
      id,
      famCareMemberId
    );

    const detachLink = await detachLinkUnlinkFamilyMember(
      linkFromMinor,
      linkData,
      id,
      famCareMemberId
    );

    //edit all sync changes records that are no longer needed: user should not get details of detached user
    const isSecondaryParentDetaching =
      famCareMemberId === id && detachLink && linkFromMinor;

    await removeChangeRecordsUnlinkFamilyMember(
      linkFromMinor,
      famCareMemberId,
      id
    );

    if (famCareMemberId != id) {
      await updateSyncChanges(null, famCareMemberId);
    } else if (isSecondaryParentDetaching) {
      await updateSyncChanges(null, minorsParent?.id as string);

      minorsParentDataUser = await fetchUserWithSetting(
        minorsParent?.id as string,
        "Could not find user"
      );
    }

    await addSyncedDataUnlinkFamilyMember(
      famCareMemberId,
      familyLinks,
      id,
      minorsParent,
      linkFromMinor,
      isSecondaryParentDetaching
    );
    //store  notification

    const notifications: INotification = linkFromMinor
      ? {
        secondaryContent: isSecondaryParentDetaching
          ? `${linkFrom.fullName}'s account has been successfully detached from the ${findUser.fullName}'s profile`
          : `${linkFrom.fullName}'s account has been successfully detached from your profile by ${minorsParentName}`,
        primaryContent: isSecondaryParentDetaching
          ? `${linkFrom.fullName}'s account has been successfully detached from your profile.`
          : `${linkFrom.fullName}'s account has been successfully detached from ${findUser.fullName}'s profile.`,
        showChangeAccessLink: true,
      }
      : {
        secondaryContent: `Your profile is successfully disconnected with ${linkFrom.fullName}`,
        primaryContent: `Your profile is successfuly disconnected with ${findUser.fullName}.`,
        showChangeAccessLink: true,
      };

    await storeAndSendNotification(
      minorsParentDataUser ?? findUser,
      notifications,
      redirectLink,
      id.toLowerCase(),
      famCareMemberId.toLowerCase(),
      "userDetached"
    ); // send notification to secondary user if minor account is detached by primary user else send it to primary user

    await trackActiveSession(id.toLowerCase());

    return {
      success: true,
      message: `The user ${linkData.linkTo} has been successfully detached from family care of user ${linkFrom.id ?? id}`,
      F9: familyLinks,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const releaseMinorGenerateOTP = async (
  user: ITokenData,
  data: INewContactDetailsInput
) => {
  try {
    const { id, phoneNumber, emailId, otpHash } = data;
    const dependant = await fetchDependant(id);
    const { linkData } = await familyLink(user.id, id.toLowerCase());

    //If user is still not 18, throw error
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    if (dependant.dob > eighteenYearsAgo)
      throw new HTTPError("Minor is not 18 years old yet. Cannot release minor.", 400);

    if (linkData.linkType !== "minor")
      throw new HTTPError("Entered uuid is not a minor", 400);



    if (phoneNumber) {
      const findUser = await getUserByUniqueData(phoneNumber);
      if (findUser)
        throw new HTTPError("User with this phone number already exists", 422);

      await handleOTPProcess({
        contact: phoneNumber,
        contactType: "phoneNumber",
        userData: user,
        uuid: id,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "releaseMinor",
        selfcreated: false,
        otpHash,
      });
    } else if (emailId) {
      const findUser = await getUserByUniqueData(emailId.toLowerCase());
      if (findUser)
        throw new HTTPError("User with this email already exists", 422);

      await handleOTPProcess({
        contact: emailId,
        contactType: "emailId",
        userData: user,
        uuid: id,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "OTP for detaching your profile in THITO App",
        selfcreated: false,

        otpTemplate: releaseMinorAccount,
      });
    }

    await trackActiveSession(user.id);

    const returnData = {
      success: true,
      minor_account_id: id.toLowerCase(),
      verifiedContactId: emailId ? "emailId" : "phoneNumber",
      verifiedContact: emailId ? emailId.toLowerCase() : phoneNumber,
      message: "OTP sent successfully",
    };
    return returnData;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const migrateDependantToUser = async (
  user: ITokenData,
  data: IMigrateMinorVerifyOtp
) => {
  try {
    const { userId, verifiedContact, otp } = data;
    // Step 1: Fetch the dependant's data
    const dependant = await fetchDependant(userId);
    //fetch user data

    const userData = await fetchUserWithSetting(
      user.id,
      "Parent user does not exist for minor"
    );

    //get hashed otp
    const findContactChangesUser = await findContactChangesUserGetHashedOtp(
      userId,
      user.id
    );

    //check if user entered correct values

    if (
      (findContactChangesUser.emailId &&
        findContactChangesUser.emailId != verifiedContact) ||
      (findContactChangesUser.phoneNumber &&
        findContactChangesUser.phoneNumber != verifiedContact)
    )
      throw new HTTPError("Entered Verified contact is incorrect", 401);

    const hashedotp = findContactChangesUser.hashedOTP;

    const verifyOTP_response = await verifyOTP(
      hashedotp,
      otp,
      findContactChangesUser.emailId
        ? verifiedContact.toLowerCase()
        : verifiedContact
    );

    if (!verifyOTP_response) throw new HTTPError("Invalid OTP", 401);

    // Step 2: Create a new user with the dependant's data
    const verifiedContactType = findContactChangesUser.emailId
      ? "emailId"
      : "phoneNumber";

    //creating referral code of primary user
    const generatedReferalCode = generateReferralCodeOfSelf();
    const newUser = await prisma.users.create({
      data: {
        id: dependant.id,
        fullName: dependant.fullName,
        phoneNumber: findContactChangesUser.phoneNumber,
        verifiedContactId: verifiedContactType,
        password: process.env.DEPENDANTPASSWORD,
        isMigrated: true,
        gender: dependant.gender,
        dob: dependant.dob,
        address: dependant.address,
        pincode: dependant.pincode,
        emergencyContact: dependant.emergencyContact,
        profileImage: dependant.profileImage,
        QRCodeURL: dependant.QRCodeURL,
        isBlocked: false,
        subscription: true,
        emailId: findContactChangesUser.emailId,
        createdBy: user.id, // or any relevant identifier
        country: userData.country, // Use the country from the dependant's user
        referalCode: generatedReferalCode,
      },
    });

    const updateData = { forUserId: newUser.id, forDependantId: null };

    // Step 3: Update related records to reference the new user
    await Promise.all([
      prisma.appointment.updateMany({
        where: { forDependantId: userId.toLowerCase() },
        data: updateData,
      }),
      prisma.documents.updateMany({
        where: { forDependantId: userId.toLowerCase() },
        data: updateData,
      }),

      prisma.healthRecord.updateMany({
        where: { forDependantId: userId.toLowerCase() },
        data: updateData,
      }),

      prisma.medicine.updateMany({
        where: { forDependantId: userId.toLowerCase() },
        data: updateData,
      }),

      prisma.notes.updateMany({
        where: { forDependantId: userId.toLowerCase() },
        data: updateData,
      }),
      prisma.vitalsUserData.updateMany({
        where: { forDependantId: userId.toLowerCase() },
        data: updateData,
      }),
      prisma.usersSetting.create({
        data: {
          forUserid: userId.toLowerCase(),
          notification: false,
          appLock: false,
        },
      }),
      prisma.syncChanges.updateMany({
        where: {
          userChanged: dependant.id,
          synced: false,
        },
        data: {
          synced: true,
        },
      }),
      prisma.subscription.updateMany({
        where: {
          dependantId: userId.toLowerCase()
        },
        data: {
          userId: newUser.id,
          dependantId: null
        }
      })
    ]);

    if (newUser.emailId && newUser.verifiedContactId == "emailId") {
      generateAndSendOTP({
        contact: newUser.emailId.toLowerCase(),
        contactType: "emailId",
        uuid: newUser.id.toLowerCase(),
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "Successful registration in THITO App",
        relation: undefined,
        otpTemplate: userId_information,
      });
    } else if (
      newUser.phoneNumber &&
      newUser.verifiedContactId == "phoneNumber"
    ) {
      const msg = `Dear User, ${newUser.id.toUpperCase()}, welcome to THITO. Your User ID is ${newUser.id.toLowerCase()}. You can use it for login. Stay updated with your health data. -STEIGEN HEALTHCARE`;
      sendMessageToMobile(newUser.phoneNumber, msg);
    }
    // Step 4: Delete the original dependant record and record from OTP store

    await deleteOTPData(false, "", userId, user.id);

    const findSecondaryParentLink = await prisma.familylinks.findFirst({
      where: {
        linkFrom: dependant.id,
        linkType: "sharedMinor",
      },
    });

    await deleteDependantFromTable(userId);

    //step 5: Unlink minor from guardian's account
    await unlinkMinorFromGuardian(user.id, dependant.id);

    const notifications: INotification = {
      primaryContent: `You have successfully transitioned ${dependant.fullName} account to an individual account.`,
      showChangeAccessLink: true,
    };

    await storeAndSendNotification(
      userData,
      notifications,
      redirectLink,
      userData.id,
      dependant.id,
      "userDetached"
    );
    if (findSecondaryParentLink) {
      const notifications: INotification = {
        secondaryContent: `${dependant.fullName}'s account has been successfully transitioned to an individual account by ${userData.fullName}.`,
        showChangeAccessLink: true,
      };

      const secondaryUser = await fetchUserWithSetting(
        findSecondaryParentLink.linkTo,
        "Secondary user not found"
      );

      await storeAndSendNotification(
        secondaryUser,
        notifications,
        redirectLink,
        findSecondaryParentLink.linkFrom,
        findSecondaryParentLink.linkTo,
        "userDetached"
      );
      await prisma.syncChanges.create({
        data: {
          userChanged: findSecondaryParentLink.linkTo,
          changedBy: user.id,
          changeType: "delete",
          familyMember: findSecondaryParentLink.linkTo,
          recordId: findSecondaryParentLink.id.toString(),
          table: "F9",
        },
      });
    }
    await trackActiveSession(userId.toLowerCase());

    return {
      success: true,
      message: `Dependant with ID ${userId.toLowerCase()} has been migrated to user`,
      U6: newUser,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//soft delete
export const deletingFamilyLinks = async (
  linkTo: Array<string>,
  userId: string,
  subscriptionFlag?: Boolean
) => {
  try {
    const deleteLinks = await prisma.$transaction(async (prisma) => {
      //find family links to delete linkTo
      const findFamilyLinks = await prisma.familylinks.findMany({
        where: {
          OR: [
            { linkFrom: userId, linkTo: { in: linkTo } },
            {
              linkFrom: { in: linkTo },
              linkTo: userId,
            },
          ],
        },
      });
      if (!findFamilyLinks.length) {
        throw new HTTPError("No family links found", 404);
      }

      //filter minor links and shared minor links
      const [minorLinks, minorSharedWithMe] = [findFamilyLinks.filter(
        (link) => link.linkType === "minor"
      ),
      findFamilyLinks.filter(
        (link) => link.linkType === "sharedMinor"
      )];

      const minorIds = minorLinks.map((l) => l.linkTo);
      const sharedMinorIds = minorSharedWithMe.map((l) => l.linkFrom);

      const existingUserIds = findFamilyLinks
        .filter(
          ({ linkType, linkTo }) =>
            (linkType === "existing" || linkType === "subaccount") &&
            linkTo !== userId
        )
        .map((l) => l.linkTo);

      const [findDependant, findUser, findSharedMinor] = await Promise.all([
        prisma.dependant.findMany({
          where: {
            OR: [
              {
                id: {
                  in: minorLinks.map((minor) => {
                    return minor.linkTo;
                  }),
                },
              },
              {
                id: {
                  in: minorSharedWithMe.map((minorSharedWithMe) => {
                    return minorSharedWithMe.linkFrom;
                  }),
                },
              },
            ],
          },
        }),
        prisma.users.findMany({
          where: { id: { in: existingUserIds } },
        }),
        //find parent of minor shared with me
        prisma.dependant.findMany({
          where: {
            id: { in: sharedMinorIds },
          },
        })
      ]);

      //if minor link is getting deleted
      if (minorIds.length > 0) {
        //get to whom this minor is shared with
        const sharedMinorLink = await prisma.familylinks.findMany({
          where: {
            linkFrom: {
              in: minorIds
            },
            linkType: "sharedMinor",
          },
        });

        //delete minor account as well - if normal, gray out if subflag
        if (subscriptionFlag && subscriptionFlag == true) {
          console.log("minor - sub flag")
          await prisma.familylinks.updateMany({
            where: {
              linkTo: {
                in: minorIds
              },
            },
            data: {
              isActive: false
            }
          })
        } else {
          console.log("minor - normal")
          await prisma.dependant.deleteMany({
            where: {
              id: {
                in: minorIds
              },
            },
          });
        }

        // delete the link with whom minor is shared
        await prisma.familylinks.deleteMany({
          where: {
            linkFrom: {
              in: minorIds
            },
            linkType: "sharedMinor",
          },
        });

        //sync changes for secondary shared user of minor deletion
        await prisma.syncChanges.createMany({
          data: sharedMinorLink.map((link) => ({
            changedBy: userId,
            userChanged: link.linkTo,
            changeType: "delete" as Changes,
            recordId: link.id.toString(),
            table: "F9",
            familyMember: link.linkTo,
          })),
        });
      }

      //delete all links
      const deleteFamilyLinks = await prisma.familylinks.deleteMany({
        where: subscriptionFlag
          ? {
            OR: [
              {
                linkFrom: userId,
                linkTo: { in: linkTo },
                linkType: { not: "minor" },
              },
              {
                linkFrom: { in: linkTo },
                linkTo: userId,
                linkType: { not: "minor" },
              },
            ],
          }
          : {
            OR: [
              { linkFrom: userId, linkTo: { in: linkTo } },
              { linkFrom: { in: linkTo }, linkTo: userId },
            ],
          }
      });

      const expected = subscriptionFlag
        ? findFamilyLinks.length - minorLinks.length
        : findFamilyLinks.length;

      if (deleteFamilyLinks.count < expected) {
        throw new Error("Error deleting family links");
      }

      //sync changes for the user with whom primary user has detached himself exlcuding sharedminor and minor
      const syncData = findFamilyLinks
        .filter((l) => ["subaccount", "existing"].includes(l.linkType))
        .map((l) => ({
          changedBy: userId,
          userChanged: l.linkFrom === userId ? l.linkTo : l.linkFrom,
          changeType: "delete" as Changes,
          recordId: l.id.toString(),
          table: "F9",
          familyMember: l.linkFrom === userId ? l.linkTo : l.linkFrom,
        }));

      if (syncData.length) {
        await prisma.syncChanges.createMany({ data: syncData });
      }


      //sync changes for shared minor deletion
      if (findSharedMinor.length) {
        await Promise.all(
          findSharedMinor.map((minor) => {
            const findRecordId = minorSharedWithMe.find(
              (minorLink) => minorLink.linkFrom === minor.id
            );
            if (findRecordId) {
              return prisma.syncChanges.create({
                data: {
                  userChanged: minor.id,
                  familyMember: minor.userId,
                  changedBy: userId,
                  changeType: "delete" as Changes,
                  recordId: findRecordId.id.toString(),
                  table: "F9",
                },
              });
            }
            return Promise.resolve();
          })
        );
      }

      return {
        success: true,
        mssg: "Family links successfully deleted",
        data: {
          D7: findDependant,
          U6: findUser,
          F9: findFamilyLinks.map((link) => {
            const { isActive, ...remainder } = link
            return {
              ...remainder,
              isActive: false
            }
          }),
        },
      };
    });
    return deleteLinks;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const reactivateMinor = async (
  linkTo: Array<string>,
  user: ITokenData,
) => {
  try {
    const checkMinorCount: string = "true";

    //check if adding is possible:
    await checkSubsriptionStatus(user, checkMinorCount, linkTo.length);

    //check if user is trying to re-activate an already activatated minor
    const repeatedMinor = await prisma.familylinks.findMany({
      where: {
        linkFrom: user.id,
        linkTo: { in: linkTo },
        linkType: "minor",
        isActive: true
      },
      select: {
        linkTo: true
      }
    });
    if (repeatedMinor.length) {
      throw new HTTPError(`You cannot re-activate an already active minor: ${repeatedMinor.map((r) => r.linkTo + ";")} `, 404);
    }

    //Check if link between user and minor exists
    const findFamilyLinks = await prisma.familylinks.findMany({
      where: {
        linkFrom: user.id,
        linkTo: { in: linkTo },
        linkType: "minor",
        isActive: false
      },
    });
    if (!findFamilyLinks.length) {
      throw new HTTPError("No family links found", 404);
    }
    if (findFamilyLinks.length != linkTo.length) {
      throw new HTTPError("One(or more) family links were not found", 404);
    }

    //reactivate minor: make isActive = true
    const [reactivateMinors, findDependants] = await Promise.all([
      prisma.familylinks.updateManyAndReturn({
        where: {
          linkFrom: user.id,
          linkTo: { in: linkTo },
          linkType: "minor"
        },
        data: {
          isActive: true
        }
      }),
      prisma.dependant.findMany({
        where: {
          userId: {
            in: linkTo
          }
        }
      })
    ])

    return {
      success: true,
      mssg: "Family links successfully re-activated",
      data: {
        D7: findDependants,
        F9: reactivateMinors
      },
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};