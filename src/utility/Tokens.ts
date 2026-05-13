import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { accessTokenExpiry, refreshTokenExpiry } from "../constants/data";
import { generateAccessTokenAdminInput } from "./DataTypes/types.admin";
import { handleError } from "./Error";
dotenv.config();

export const generateAccessToken = (userData: {
  id: string;
  emailId: string | null;
  phoneNumber: string | null;
  currentSessionId: string;
}) => {
  try {
    const accessToken = jwt.sign(
      userData,
      process.env.ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: accessTokenExpiry,
        // expiresIn:"5m"
      }
    );
    return accessToken;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const generateRefreshToken = (userData: {
  id: string;
  emailId: string | null;
  phoneNumber: string | null;
  currentSessionId: string;
}) => {
  try {
    const refreshToken = jwt.sign(
      userData,
      process.env.REFRESH_TOKEN_SECRET as string,
      {
        expiresIn: refreshTokenExpiry,
        // expiresIn:"10m"
      }
    );
    return refreshToken;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//admin token

export const generateAccessTokenAdmin = (
  adminData: generateAccessTokenAdminInput
) => {
  const accessToken = jwt.sign(
    adminData,
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: accessTokenExpiry,
      // expiresIn: "10m",
    }
  );
  return accessToken;
};

export const generateRefreshTokenAdmin = (
  adminData: generateAccessTokenAdminInput
) => {
  const refreshToken = jwt.sign(
    adminData,
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: refreshTokenExpiry,
      // expiresIn: "15m",
    }
  );
  return refreshToken;
};
