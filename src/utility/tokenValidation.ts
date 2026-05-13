import HTTPError from "./HttpError";
import jwt, { JwtPayload } from "jsonwebtoken";

// Helper function to extract and validate token
export const extractToken = (authHeader: string | undefined) => {
  if (!authHeader) {
    throw new HTTPError("Invalid authorization header format.", 401);
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw new HTTPError("No token provided.", 401);
  }

  return token;
};

export const checkRefreshToken = async (refreshToken: string) => {
  const refreshDecodedToken = jwt.decode(refreshToken) as JwtPayload;

  if (!refreshDecodedToken) throw new HTTPError("User is logged Out", 403);
  return refreshDecodedToken;
};
