import { Request, Response, NextFunction } from "express";
import HTTPError from "../utility/HttpError";
import jwt, { JwtPayload } from "jsonwebtoken";
import * as dotenv from "dotenv";
import prisma from "../prisma";
import { enums } from "../constants/data";
import { unblockAdminPanelUsers } from "../utility/helperFunction/user.services.helper";
import { updateExpiredVouchers } from "../utility/helperFunction/voucher.services.helper";

dotenv.config();

export const verifyAdminToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer")) {
      throw new HTTPError("Missing token or invalid format of token ", 401);
    }
    
    const token = authHeader.split(" ")[1];
    const decodedToken = jwt.decode(token) as JwtPayload;
    if (!decodedToken) {
      throw new HTTPError(
        "invalid decoded token or could not decode the token",
        401
      );
    }
    const dashboardUser = await prisma.dashboardUser.findUnique({
      where: {
        emailId: decodedToken.emailId,
      },
    });

    if (!dashboardUser) {
      throw new HTTPError(`Unauthorized`, 401);
    }

    if (!enums.includes(decodedToken.role)) {
      throw new HTTPError(
        "Unauthorized. This endpoint requires an administrator,auditor or superadmin sigin.",
        401
      );
    }

    if (
      dashboardUser.currentSessionId !== decodedToken.currentSessionId &&
      dashboardUser.currentSessionId === null
    ) {
      throw new HTTPError("User logged out. Please log in again.", 403);
    }

    if (
      dashboardUser.currentSessionId !== decodedToken.currentSessionId ||
      dashboardUser.currentSessionId === null ||
      decodedToken.currentSessionId === null
    ) {
      throw new HTTPError("Session invalidated. Please log in again.", 403);
    }

    if (decodedToken["exp"] && Date.now() / 1000 >= decodedToken["exp"]) {
      throw new HTTPError(
        "Access Token is expired. Generate a new one using /api/admin/refreshToken",
        401
      );
    } else {
      req.admin = {
        id: decodedToken.id,
        emailId: decodedToken.emailId,
        role: decodedToken.role,
        accessToken: token,
      };
    }
    //deactivate expired and limit reached vouchers
    await updateExpiredVouchers()
    //unblock users
    await unblockAdminPanelUsers();
    next();
  } catch (err: unknown) {
    console.error("Error caught in errorHandler:", err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
