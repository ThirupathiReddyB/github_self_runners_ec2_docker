import crypto from "crypto";
import * as dotenv from "dotenv";
import HTTPError from "./HttpError";
import { otpExpiry } from "../constants/data";
dotenv.config();
const key = process.env.KEY as string;

export interface RetData {
  hashedotp: string;
  otp: number;
}

export const createOTP = async (
  userId: string,
  expiryTime: string
): Promise<RetData> => {
  try {
    //generating 4 digit otp
    const otp = 1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000);
    //expiry in milliseconds
    const keys = Object.keys(otpExpiry);
    const expiry = keys.find((key) => key == expiryTime) ?? "5m";
    const otpExpiryTime = new Date(
      Date.now() + otpExpiry[expiry as keyof typeof otpExpiry]
    );
    const otp_data = `${userId}.${otp}.${otpExpiryTime}`; //email.otp.expiry_timestamp
    const hashotp = crypto
      .createHmac("sha256", key)
      .update(otp_data)
      .digest("hex");
    const hashedotp = `${hashotp}.${otpExpiryTime}`;

    const retData: RetData = {
      hashedotp,
      otp,
    };

    return retData;
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new HTTPError(error.message, error.code);
    } else {
      console.log(error);
      throw new HTTPError("Internal Server Error", 500);
    }
  }
};


