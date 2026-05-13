import HTTPError from "./HttpError";
import prisma from "../prisma";
import { emailingService } from "./emailService";
import { termsAndConditionUrl } from "../constants/data";
import { createOTP } from "./generateOTP";
import { ITokenData } from "./DataTypes/types.user";
import { sendMessageToMobile } from "./sendOtp";

export const generateAndSendOTP = async ({
  contact,
  contactType,
  uuid = null,
  checkMinorCount,
  otpSubjectOrOtpMessage,
  relation,
  otpTemplate,
  choice,
  otpHash,
}: {
  contact: string;
  contactType: string;
  uuid: string | null;
  checkMinorCount: boolean;
  otpSubjectOrOtpMessage: string;
  relation?: string;
  otpTemplate?: string;
  choice?: string;
  otpHash?: string;
}) => {
  const otpExpiry = contactType === "emailId" ? "15m" : "5m";
  const { otp, hashedotp } = await createOTP(
    relation !== undefined ? contact + relation : contact,
    otpExpiry
  );
  // console.log("OTPPPPPP:::::",otp)
  let responseOtp;
  if (contactType === "emailId" && otpTemplate) {
    responseOtp = await emailingService({
      email_id: contact.toLowerCase(),
      data: {
        uid: uuid?.toUpperCase() ?? null,
        otp: otp,
        connectMinor: checkMinorCount,
      },
      subject: otpSubjectOrOtpMessage,
      template: otpTemplate,
      choice: choice ?? "otp",
    });
  } else {
    const { message } = await generateMobileOtpMessages(
      otp,
      otpSubjectOrOtpMessage,
      checkMinorCount,
      otpHash,
      uuid?.toUpperCase() ?? undefined
    );
    responseOtp = await sendMessageToMobile(contact, message);
  }

  if (!responseOtp) throw new HTTPError("Could not send OTP", 612);
  return { hashedotp };
};

export const upsertOTPStore = async (
  userId: string,
  createdBy: string,
  hashedOTP: string,
  phoneNumber: string | null,
  emailId: string | null
) => {

  const otpStore = await prisma.otpStore.upsert({
    where: {
      userId_createdBy: {
        userId: userId.toLowerCase(),
        createdBy: createdBy.toLowerCase(),
      },
    },
    update: {
      hashedOTP,
      phoneNumber,
      emailId: emailId ? emailId.toLowerCase() : null,
    },
    create: {
      userId: userId.toLowerCase(),
      hashedOTP,
      phoneNumber,
      emailId: emailId ? emailId.toLowerCase() : null,
      createdBy,
    },
  });
  if (!otpStore) {
    throw new HTTPError("DB error: Could not store OTP for the user", 500);
  }
};

export const handleOTPProcess = async ({
  contact,
  contactType,
  userData,
  uuid,
  checkMinorCount,
  otpSubjectOrOtpMessage,
  selfcreated,
  relation,
  linkToParent,
  otpTemplate,
  otpHash,
}: {
  contact: string;
  contactType: string;
  userData: ITokenData;
  uuid: string;
  checkMinorCount: boolean;
  otpSubjectOrOtpMessage: string;
  selfcreated: boolean;

  relation?: string;
  linkToParent?: string;
  otpTemplate?: string;
  otpHash?: string;
}) => {

  const { hashedotp } = await generateAndSendOTP({
    contact,
    contactType,
    uuid: userData.id.toUpperCase(),
    checkMinorCount,
    otpSubjectOrOtpMessage,
    relation,
    otpTemplate,
    otpHash,
  });
  await upsertOTPStore(
    linkToParent ?? uuid,
    selfcreated ? "self" : userData.id,
    hashedotp,
    contactType === "phoneNumber" ? contact : null,
    contactType === "emailId" ? contact.toLowerCase() : null
  );
};

export const generateMobileOtpMessages = async (
  otp: number,
  messageTemplate: string,
  checkMinorCount: boolean,
  otpHash?: string,
  uuid?: string
) => {
  let message: string | null = null;
  switch (messageTemplate) {
    case "ConnectExistingUser":
      message = `<#> Dear User, ${uuid} has requested to attach your profile with his/her ${checkMinorCount ? "Minor's " : ""}profile, OTP for the same is ${otp}. Sharing the OTP to proceed is considered as consent to attach your profile. ${otpHash} -STEIGEN HEALTHCARE`;
      break;

    case "releaseMinor":
      message = `<#> Dear User, Your profile is getting detached from the ${uuid} account, and to create new profile please share the OTP ${otp}. Sharing the OTP to proceed is considered as consent to detach your profile. ${otpHash} -STEIGEN HEALTHCARE`;
      break;

    case "newUserContactDetails":
      message = `<#> Dear User (${uuid}), to change your contact number, please enter OTP ${otp}. Do not share the OTP. ${otpHash} -STEIGEN HEALTHCARE`;
      break;

    case "newUserRegistration":
      message = `<#> To create new profile on THITO, OTP is ${otp}, it is valid for 2 hours. Please click ${termsAndConditionUrl} to read and accept the terms.${otpHash}. -STEIGEN HEALTHCARE`;
      break;

    case "userLogin":
      message = `<#> Dear User (${uuid}), to login into the THITO App, please enter OTP ${otp}. DO NOT SHARE THE OTP. ${otpHash} -STEIGEN HEALTHCARE`;
      break;

    case "forgotPassword":
      message = `<#> To reset your old password, please enter OTP ${otp}, Do not share the OTP. ${otpHash} -STEIGEN HEALTHCARE`;
      break;

    case "resendRegistationOtp":
      message = `<#> To create new profile on THITO, OTP is ${otp}, it is valid for 2 hours. Please click ${termsAndConditionUrl} to read and accept the terms. ${otpHash}. -STEIGEN HEALTHCARE`;
      break;

    case "successfullRegistartion":
      message = `Dear User, ${uuid}, welcome to THITO. Your User ID is ${uuid?.toUpperCase()}. You can use it for login. Stay updated with your health data. -STEIGEN HEALTHCARE`;
      break;

    default:
      throw new Error("Invalid contact type");
  }
  return { message };
};
