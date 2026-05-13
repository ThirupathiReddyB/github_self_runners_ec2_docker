import { ITokenData } from "./types.user";

export enum OtpExpiryEnum {
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
}

export type generateOtpReturnData = {
  success: boolean;
  id: string;
  verified: boolean;
  message: string;
  verifiedContact: string;
  verifiedContactId: string;
};

export type resendOtpReturnData = {
  success: boolean;
  id: string;
  verified: boolean;
  message: string;
};

export type IGenerateOtpData = {
  fullName: string;
  password: string;
  country: string;
  phoneNumber?: string;
  emailId?: string;
  otpHash: string;
  user?: ITokenData;
};
export type verifyOtpData = {
  id: string;
  otp: number;
  consent: boolean;
};

export type verifiedOtpReturnData = {
  user_data?: {
    id: string;
    fullName: string;
    phoneNumber?: string;
    emailId?: string;
  };
  success: boolean;
  verified: boolean;
  consent?: true;
  message: string;
  unsuccessfullAttempts?: number;
};
