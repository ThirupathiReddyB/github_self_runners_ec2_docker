import { MessageType } from "../../../prisma/generated/prisma/client";
import prisma from "../../prisma";

import HTTPError from "../HttpError";

export const getUserMessageQuery = async (
  id: number,
  messageType: MessageType
) => {
  const getUserMessage = await prisma.userMessage.findFirst({
    where: {
      id,
      messageType,
    },
    select: {
      isResolved: true,
      resolvedBy: true,
      resolvedAt: true,
      isReopened: true,
    },
  });
  if (!getUserMessage) {
    throw new HTTPError("Could not find complaint", 404);
  }

  //Removed because of client request : SH-251 If complaint is already resolved and after that if super admin tries to reopen it, user is getting an error
  // if (getUserMessage.isResolved) {
  //   throw new HTTPError(
  //     `Complaint already resolved by ${getUserMessage.resolvedBy} at ${getUserMessage.resolvedAt}`,
  //     422
  //   );
  // }

  return getUserMessage;
};

export const updateUserMessageSuperAdmin = async (
  id: number,
  messageType: MessageType,
  data: any
) => {
  const updateUserMessage = await prisma.userMessage.update({
    where: {
      id,
      messageType,
    },
    data,
    select: {
      isResolved: true,
      resolvedAt: true,
      resolvedBy: true,
    },
  });
  if (!updateUserMessage) {
    throw new HTTPError(
      "Failed to update:unresolve UserMessage by SuperAdmin.",
      500
    );
  }
};
