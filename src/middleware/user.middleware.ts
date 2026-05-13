import * as dotenv from "dotenv";
import { Users } from "../../prisma/generated/prisma/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import HTTPError from "../utility/HttpError";
import { extractToken } from "../utility/tokenValidation";
import { BlockUserError } from "../utility/BlockUserRemainingTime";
import { updateSubscriptionIfExpired } from "../utility/subscription";
import { updateExpiredVouchers } from "../utility/helperFunction/voucher.services.helper";

dotenv.config();

// Helper function to validate user
const validateUser = async (userId: string) => {
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HTTPError("User not found.", 404);
  }

  if (user.isBlocked && user.blockedAt) {
    await BlockUserError(user.id, user.blockedAt);
  }

  return user;
};

// Helper function to validate session
const validateSession = (user: Users, tokenSessionId: string) => {
  if (
    user.currentSessionId !== tokenSessionId &&
    user.currentSessionId === null
  ) {
    throw new HTTPError("Session invalidated. Please log in again.", 403);
  }

  if (
    user.currentSessionId !== tokenSessionId ||
    user.currentSessionId === null ||
    tokenSessionId === null
  ) {
    throw new HTTPError("Session invalidated. Please log in again.", 403);
  }
};

// Helper function to check token expiration
const checkTokenExpiration = (
  decodedToken: JwtPayload
  // token: string,
  // req: Request
) => {
  if (decodedToken.exp && Date.now() / 1000 >= decodedToken.exp) {
    throw new HTTPError(
      "Access Token is expired. Generate a new one using /api/user/refresh-token",
      419
    );
  }
};

export const verifyUserToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract and validate token
    const token = extractToken(req.headers.authorization);

    //verify the token and decode it
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
  
    if (!decodedToken) throw new HTTPError("Invalid Token middleware.", 401);

    // Validate user
    const user = await validateUser(decodedToken.id);

    // Validate session
    validateSession(user, decodedToken.currentSessionId);

    // Check token expiration
    checkTokenExpiration(decodedToken);

    // Assign user data to request
    req.user = {
      id: user.id,
      fullName: user.fullName,
      emailId: user?.emailId,
      phoneNumber: user?.phoneNumber,
      isSync: user.isSync,
      subscription: user.subscription,
      accessToken: token,
    };

    // Unlock locked vouchers (older than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.voucher.updateMany({
      where: {
        lockedAt: {
          not: null,
          lt: tenMinutesAgo,
        },
      },
      data: {
        lockedAt: null,
        lockedBy: null,
      },
    });

    //deactivate expired and limit reached vouchers
    await updateExpiredVouchers()

    //check users subscription
    let messages: Array<string> = [];
    await updateSubscriptionIfExpired(user.id, messages);
    next();
  } catch (err) {
    console.error("Error caught in errorHandler:", err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//
