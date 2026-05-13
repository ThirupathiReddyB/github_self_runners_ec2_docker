import { invalidAttempts } from "../constants/data";
import prisma from "../prisma";
import HTTPError from "./HttpError";

export const remainingTime = async (blockedAt: Date) => {
  const unblockTime = new Date(blockedAt.getTime() + 30 * 60 * 1000);
  const timeRemaining = unblockTime.getTime() - new Date().getTime();
  const error = {
    message: "This user has been blocked",
    timeRemaining: Math.ceil(timeRemaining / (1000 * 60)),
    timeUnit: "minutes",
    isUserBlocked: true,
  };
  return error;
};

export const BlockUserError = async (userId: string, blockedAt: Date) => {
  const userBlockedBy = await prisma.blockReasons.findMany({
    where: {
      userId,
    },
    select: {
      blockedBy: true,
    },
    orderBy: {
      id: "desc",
    },
    take: 1,
  });

  if (userBlockedBy[0].blockedBy === "app") {
    const error = await remainingTime(blockedAt);
    if (new Date(blockedAt.getTime() + 30 * 60 * 1000) < new Date()) {
      const updateddata = await prisma.users.update({
        where: {
          id: userId,
        },
        data: {
          isBlocked: false,
          blockedAt: null, // Clear the blocked timestamp
          wrongLoginAttempts: invalidAttempts,
        },
        include: {
          setting: true,
        },
      });
      return updateddata;
    } else {
      throw new HTTPError(JSON.stringify(error), 603);
    }
  } else {
    throw new HTTPError(
      `User is blocked by ${userBlockedBy[0]?.blockedBy} `,
      603
    );
  }
};
