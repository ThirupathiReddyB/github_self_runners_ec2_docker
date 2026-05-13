import HTTPError from "./HttpError";
import crypto from "crypto";

const key = process.env.KEY as string;

export const verifyOTP = async (
  hashedotp: string,
  otp: number,
  userId: string
) => {
  const [hashValue, otpExpiry] = hashedotp.split(".");

  const otpExpiryDate = new Date(otpExpiry);
  const now = Date.now();

  if (now > otpExpiryDate.getTime()) {
    throw new HTTPError("OTP expired", 401);
  }
  const otpdata = `${userId}.${otp}.${otpExpiry}`;
  const newCalculatedHash = crypto
    .createHmac("sha256", key)
    .update(otpdata)
    .digest("hex");

  return hashValue === newCalculatedHash;
};
