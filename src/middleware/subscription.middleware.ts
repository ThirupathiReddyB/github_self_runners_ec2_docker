import { Request, Response, NextFunction } from "express";
import { getExpiryDetails } from "../services/subscription.services";
import HTTPError from "../utility/HttpError";

export const handleSubscriptionExpiry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }

    const checkingExpiry = await getExpiryDetails(user);
    // Fetch the active subscription

    if (checkingExpiry.success === false) {
      return res.status(699).json({ data: checkingExpiry.data });
    }

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
