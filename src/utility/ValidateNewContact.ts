import { VerifiedContactId } from "../../prisma/generated/prisma/enums";
import prisma from "../prisma";
import HTTPError from "./HttpError";

export const validateContact = async (
  uuid: string,
  verifiedContact: VerifiedContactId,
  contact: string
) => {
  try {
    const allUsers = await prisma.users.findMany();

    for (const user of allUsers) {
      if (user[verifiedContact] === contact && user.id !== uuid) {
        throw new HTTPError(
          "This Contact detail already exists for a different user",
          609
        );
      }
      if (user[verifiedContact] === contact && user.id == uuid) {
        throw new HTTPError("Contact cannot be the same as previous one", 602);
      }
    }

    return {
      success: true,
      message: "Contact is valid",
    };
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new HTTPError(error.message, error.code);
    } else {
      console.log(error);
      throw new HTTPError("Internal Server Error", 500);
    }
  }
};
