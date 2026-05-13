import { OtpStore } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";
import HTTPError from "./HttpError";
import { verifyOTP } from "./verifyOTP";

export const deleteOTPData = async (connectMinor: boolean,linkToParent: string,userId: string,createdBy: string) => {
    //delete otp data
      const deleteOTPStoreRecord = await prisma.otpStore.delete({
        where: {
          userId_createdBy: {
            userId: connectMinor
              ? linkToParent.toLowerCase()
              : userId.toLowerCase(),
            createdBy: createdBy.toLowerCase(),
          },
        },
      });
    if (!deleteOTPStoreRecord)
      throw new HTTPError("could not remove record from OTP Store", 500);
}

export const OTPVerification = async (user_otp:OtpStore,otp:number,userId:string,relation:string) => {
    const otp_verification = await verifyOTP(
        user_otp.hashedOTP,
        otp,
        userId + relation
      );
      if (!otp_verification) {
        throw new HTTPError("Invalid OTP", 401);
    }
    return otp_verification;
}

export const findOtp = async (connectMinor:boolean,linkToParent:string,userId:string,createdBy:string) => {
    const user_otp = await prisma.otpStore.findFirst({
        where: {
          userId: connectMinor
            ? linkToParent.toLowerCase()
            : userId.toLowerCase(),
          createdBy: createdBy.toLowerCase(),
        },
      });
      if (!user_otp) {
        throw new HTTPError("Invalid otp", 401);
    }
    
    return user_otp;
}