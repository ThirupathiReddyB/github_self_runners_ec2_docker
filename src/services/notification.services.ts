import prisma from "../prisma";
import HTTPError from "../utility/HttpError";
import { handleError } from "../utility/Error";

export const findNotification = async (userId: string, id?: number) => {
  try {
    const filter: any = {};
    if (id) {
      filter.id = id;
    }
    const findNotification = await prisma.notifications.findMany({
      where: {
        userId,
        AND: [filter],
      },
      select: {
        id: true,
        content: true,
        changeAccessOf: true,
        createdAt: true,
        AccessText: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    if (!findNotification) {
      throw new HTTPError("notification not found", 404);
    }
    const updateNotificationStatus = await prisma.notifications.updateMany({
      where: {
        userId,
        AND: [filter],
      },
      data: {
        readStatus: true,
      },
    });
    if (!updateNotificationStatus) {
      throw new HTTPError("db error: could not update notifications", 500);
    }
    return {
      success: true,
      data: findNotification,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const clearAllNotifications = async (
  userId: string,
  category: string
) => {
  try {
    //delete all notifications with userid and title, if category=family_care.

    if (category == "family_care") {
      const deleteNotifications = await prisma.notifications.deleteMany({
        where: {
          userId: userId,
        },
      });
      if (!deleteNotifications) {
        throw new HTTPError("could not delete notification", 500);
      }
    }

    if (category == "local") {
      const updateOrCreateClearNotifications =
        await prisma.clearNotifications.upsert({
          where: {
            userId: userId,
          },
          create: {
            userId: userId,
            localNotifications: new Date(Date.now()),
          },
          update: {
            localNotifications: new Date(Date.now()),
          },
        });
      if (!updateOrCreateClearNotifications) {
        throw new HTTPError("could not clear notification", 500);
      }
      return {
        success: true,
        message: "Deletion time of local notification updated successfully",
        data: updateOrCreateClearNotifications,
      };
    }
    return {
      success: true,
      message: "Notification deleted successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getDeletedNotificationLatestDate = async (userId: string) => {
  try {
    const getDateOfNotification = await prisma.clearNotifications.findFirst({
      where: {
        userId,
      },
      select: {
        localNotifications: true,
      },
    });
    if (!getDateOfNotification) {
      return {
        success: true,
        message: "No records found for user",
        data: {
          localNotifications: "",
        },
      };
    }

    return {
      success: true,
      message: "Latest deleted local notification date fetched successfully",
      data: getDateOfNotification,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
