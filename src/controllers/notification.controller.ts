import {
  clearAllNotifications,
  findNotification,
  getDeletedNotificationLatestDate,
} from "../services/notification.services";
import HTTPError from "../utility/HttpError";
import { Request, Response } from "express";
import { notificationCategoryValidation } from "../utility/Validation/userValidation";
import { Helpers } from "../utility/Helpers";

//notifications
export const getNotification = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const userId = user.id;
    let { id } = req.query;
    const parsedId = id ? parseInt(id as string) : undefined;
    if (!userId) throw new HTTPError("Required fields missing", 422);
    const findNotificationResponse = await findNotification(userId, parsedId);
    if (!findNotificationResponse) {
      throw new HTTPError("Could not find notification", 204);
    }
    const code = findNotificationResponse.success ? 200 : 400;
    res.status(code).json({ data: findNotificationResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deletedNotificationDate = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    if (!user.id) throw new HTTPError("Required Data missing", 422);

    //delete from noti and update clearnoti
    const deleteNotificationsDate = await getDeletedNotificationLatestDate(
      user.id
    );
    if (!deleteNotificationsDate) {
      throw new HTTPError(
        "could not able to Delete Notification Latest Date.",
        500
      );
    }
    const code = deleteNotificationsDate.success ? 200 : 400;
    res.status(code).json(deleteNotificationsDate);
  } catch (err) {
    console.log(err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json(err);
    }
  }
};

export const clearNotifications = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    if (!user.id) throw new HTTPError("Required Data missing", 422);

    //check once.
    const { category } = req.query;
    if (!category) {
      throw new HTTPError("query data is missing", 422);
    }

    //check category - validation.
    Helpers.validateWithZod(notificationCategoryValidation, { category });
    //delete from noti and update clearnoti
    const deleteNotifications = await clearAllNotifications(
      user.id,
      category as string
    );
    if (!deleteNotifications) {
      throw new HTTPError("could not able to clear All Notifications.", 500);
    }
    const code = deleteNotifications.success ? 200 : 400;
    res.status(code).json(deleteNotifications);
  } catch (err) {
    console.log(err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json(err);
    }
  }
};
