import { Role } from "../../prisma/generated/prisma/enums";
import prisma from "../prisma";

import HTTPError from "./HttpError";
import { emailingService } from "./emailService";
import { createOTP } from "./generateOTP";
import { verifyOTP } from "./verifyOTP";

export const verifyOTPFromDb = async (emailId: string, otp: number) => {
  const verifyUser = await prisma.dashboardUserOtpStore.findFirst({
    where: {
      emailId,
    },
  });
  if (!verifyUser) {
    throw new HTTPError(`Please generate the otp `, 401); // user already exist throw error
  }
  const { hashedOTP } = verifyUser;

  const verifyOtp = await verifyOTP(hashedOTP, otp, emailId);
  if (!verifyOtp) {
    throw new HTTPError("Invalid otp", 401);
  }

  return {
    success: true,
    fullName: verifyUser.fullName,
    position: verifyUser.position,
    role: verifyUser.role,
  };
};

export const StoreOtpInDb = async (
  emailId: string,
  position: string,
  role: Role,
  fullName: string,
  template: string,
  subject: string,
  choice: string
) => {
  const { otp, hashedotp } = await createOTP(emailId, "15m");
  const response = await emailingService({
    email_id: emailId,
    data: {
      otp,
      fullName,
    },
    template: template,
    subject: subject,
    choice: choice,
  });
  if (!response) throw new HTTPError("Invalid Email Address", 612);
  const storeOtp = await prisma.dashboardUserOtpStore.upsert({
    where: {
      emailId: emailId,
    },
    update: {
      hashedOTP: hashedotp,
    },
    create: {
      emailId,
      hashedOTP: hashedotp,
      position,
      role,
      fullName,
    },
  });
  if (!storeOtp) {
    throw new HTTPError("cannot store otp", 500);
  }
  return {
    success: true,
  };
};
