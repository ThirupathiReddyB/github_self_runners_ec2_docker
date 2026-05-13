import prisma from "../prisma";
import { IRegisterUserDataUnion, IVerifiedIds } from "./DataTypes/types.user";
import { formatDateForDB } from "./DateTimeFormatters";
import { handleError } from "./Error";
import {
  isAlternateEmailContact,
  isAlternatePhoneNumberContact,
  isUserExists,
} from "./prismaQueries";
import { uploadProfileImageToS3 } from "./FileOperations";

import HTTPError from "./HttpError";
import { freePlanCode, qrBaseUrl } from "../constants/data";
import { checkIfReferalCodeExist, findFreePlan, generateReferralCodeOfSelf } from "./helperFunction/subscription.services.helper";
import { calculateStatistics } from "./calculations";
import { encryptPassword } from "./decryptingPassword";
import { subscriptionBannerFeatures } from "../constants/subscriptionData";

export const createUserFunctionality = async (data: IRegisterUserDataUnion) => {
  try {
    const {
      id,
      dob,
      consent,
      gender,
      address,
      pincode,
      emergencyContact,
      bloodGroup,
      presentDiseases,
      allergies,
      doctorFullName,
      docAddress,
      docPhoneNumber,
      additionalInformation,
      createdBy,
      profileImage,
      language,
      appLock,
      deviceToken,
      referalCode,
    } = data;

    const userId = id.toLowerCase();

    // Check if user already exists
    await isUserExists(id);

    // Check if user is verified
    const verifiedUser = await prisma.verifiedUsers.findFirst({
      where: { userId, isVerified: true },
    });

    if (!verifiedUser) {
      throw new HTTPError("User not verified, please generate the OTP", 404);
    }

    // Determine contact ID
    const phoneNumber = verifiedUser.phoneNumber ?? data.phoneNumber ?? null;
    const emailId = verifiedUser.emailId ?? data.emailId ?? null;

    const verifiedContactId = (
      verifiedUser.phoneNumber ? "phoneNumber" : "emailId"
    ) as IVerifiedIds;

    // Check for duplicate contact details
    if (verifiedContactId === "phoneNumber" && data.emailId) {
      await isAlternateEmailContact(data.emailId);
    } else if (verifiedContactId === "emailId" && data.phoneNumber) {
      await isAlternatePhoneNumberContact(data.phoneNumber);
    }

    // Validate verified contact matches provided contact
    if (
      verifiedContactId === "emailId" &&
      data.emailId?.toLowerCase() !== verifiedUser.emailId
    ) {
      throw new HTTPError("Verified email does not match entered email", 401);
    }

    if (
      verifiedContactId === "phoneNumber" &&
      data.phoneNumber !== verifiedUser.phoneNumber
    ) {
      throw new HTTPError(
        "Verified phone number does not match entered phone number",
        401
      );
    }

    // Format date of birth
    const formattedDob = formatDateForDB(dob);

    //// const isNewUser = true;
    // Upload profile image
    let profileURL = await uploadProfileImageToS3(
      profileImage,
      userId,
      ////  isNewUser
    );

    //creating referral code of primary user
    const generatedReferalCode = generateReferralCodeOfSelf();

    //check if user has other user referral code and is valid
    const { referringUser } = await checkIfReferalCodeExist(referalCode);

    //create user QR URL
    const userQRUrl = await encryptPassword(userId);

    // Create user
    const newUser = await prisma.users.create({
      data: {
        id: userId,
        fullName: verifiedUser.fullName,
        phoneNumber,
        emailId: emailId?.toLowerCase(),
        password: verifiedUser.hashedPassword,
        consent,
        gender,
        dob: formattedDob,
        address,
        pincode,
        emergencyContact,
        country: verifiedUser.country,
        createdBy,
        subscription: true,
        verifiedContactId,
        profileImage: profileURL,
        deviceToken,
        referalCode: generatedReferalCode,
        referedBy: referringUser?.id,
        QRCodeURL: `${qrBaseUrl}/${userQRUrl}`
      },
    });

    if (!newUser) {
      throw new HTTPError("Could not create new user", 500);
    }

    // Create user settings
    await prisma.usersSetting.create({
      data: {
        user: { connect: { id: newUser.id } },
        language,
        appLock,
      },
    });

    // Create health record
    const healthRecord = await prisma.healthRecord.create({
      data: {
        bloodGroup,
        presentDiseases,
        allergies,
        doctorFullName,
        docAddress,
        docPhoneNumber,
        additionalInformation,
        user: { connect: { id: newUser.id } },
      },
    });

    if (!healthRecord) {
      throw new HTTPError("Could not store health records", 500);
    }

    //handle subscriptions

    //find free plan
    const fetchedFreePlan = await findFreePlan();

    //linking free plan to user

    await prisma.subscription.create({
      data: {
        userId: newUser.id,
        expiresAt: null,
        planVariantId: fetchedFreePlan.planVariants[0].id,
      },
    });

    //Check if user has partnervoucher and if that voucher is valid and not linked to the user
    //if valid, link the plan under that voucher to the user. 
    // if(partnerVoucher){
    //   //find the voucher details and the plan attached to it
    //   const findVoucher = await prisma.voucher.findFirst({
    //     where:{
    //       code: partnerVoucher,
    //       type:"partner",
    //       isActive:true
    //     }
    //   })
    //   if(findVoucher){
    //     console.log("hello")
    //   }
    // }
    //linking default plan if default is not free
    const findDefaultPlan = await prisma.planVariants.findFirst({
      where: {
        isDefault: true,
      },
      include: {
        plan: true,
      },
    });

    //linking default plan
    if (findDefaultPlan && findDefaultPlan.plan.planCode != freePlanCode) {
      //link to default plan
      const defaultPlansubscriptionExpiry = calculateStatistics(
        findDefaultPlan.period,
        findDefaultPlan.interval
      );
      const linkDefaultPlan = await prisma.subscription.create({
        data: {
          userId: newUser.id,
          expiresAt: defaultPlansubscriptionExpiry,
          planVariantId: findDefaultPlan.id,
        },
      });

      await prisma.subscription.updateMany({
        where: {
          userId: newUser.id,
          NOT: {
            id: linkDefaultPlan.id,
          },
        },
        data: {
          status: "inactive",
        },
      });
    }
    const findPlanVariant = await prisma.planVariants.findFirst({
      where: {
        id: findDefaultPlan?.id ?? fetchedFreePlan.planVariants[0].id, isActive: true, Subscription: {
          some: {
            userId: newUser.id,
            status: "active"
          }
        }
      },
      include: { plan: true, PlanToFeature: { include: { feature: true, metadata: true } } }
    })
    if (!findPlanVariant) throw new HTTPError("No active plan attached to user", 404);

    const planPeriod = `${findPlanVariant.interval} ${findPlanVariant.period == "monthly" ? "months" : findPlanVariant.period == "yearly" ? "years" : findPlanVariant.period == "weekly" ? "weeks" : "unlimited"}`
    const userMsg = findPlanVariant.plan.planCode == freePlanCode ? `You Got ${planPeriod} Free Access!` : `You Got ${planPeriod} of Free Premium Access!`

    const planDetails = {
      message: userMsg,
      planName: `${findPlanVariant.plan.name} - ${findPlanVariant.name}`,
      description: findPlanVariant.variantDescription,
      period: planPeriod,
      // features: findPlanVariant.PlanToFeature.map(
      //   (feature) => `${feature.feature.name} - ${feature.metadata.remark}`
      // )
      features: subscriptionBannerFeatures
    }

    return {
      success: true,
      ...newUser,
      healthRecord,
      planDetails
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
