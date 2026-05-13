import { Users } from "../../../prisma/generated/prisma/client";
import getFileSize from "../aws/getFileSize";
import { calculateBase64ImageSize } from "../calculations";
import { checkUserFolderStorage } from "../aws/checkFolderSize";
import HTTPError from "../HttpError";
import { ParsedQs } from "qs";
import prisma from "../../prisma";

export const checkBucketSize = async (
  findUser: Users,
  profileImage: string | undefined
) => {
  let existingFileSize = 0;
  if (profileImage) {
    if (findUser?.profileImage) {
      existingFileSize = await getFileSize(
        findUser?.profileImage?.split("/")[4],
        findUser.id.toLowerCase()
      );
    }
    //check the folder storage
    const base64Size = calculateBase64ImageSize(profileImage);

    const isStorageFree = await checkUserFolderStorage(
      `${process.env.AWS_BUCKET_DEV}`,
      findUser.id.toLowerCase(),
      base64Size,
      existingFileSize
    );
    if (!isStorageFree.success) {
      throw new HTTPError(
        `Storage is full. Remaining storage ${isStorageFree.remainingStorage} `,
        606
      );
    }
  }
};

export const doesExistingUserMatchDetails = (
  { famCareMemberId }: ParsedQs,
  linkData: any,
  findUser: any,
  emailId: string | undefined,
  phoneNumber: string | undefined
) => {
  if (
    (famCareMemberId &&
      linkData.linkType != "minor" &&
      linkData.linkType != "sharedMinor" &&
      ((findUser.verifiedContactId === "emailId" &&
        emailId &&
        emailId != findUser.emailId) ||
        (findUser.verifiedContactId === "emailId" && emailId == "") ||
        (findUser.verifiedContactId === "phoneNumber" &&
          phoneNumber &&
          phoneNumber != findUser.phoneNumber) ||
        (findUser.verifiedContactId === "phoneNumber" && phoneNumber == ""))) ||
    (famCareMemberId &&
      (linkData.linkType === "minor" || linkData.linkType === "sharedMinor") &&
      ((findUser.user.verifiedContactId === "emailId" &&
        emailId &&
        emailId != findUser.emailId) ||
        (findUser.user.verifiedContactId === "emailId" && emailId == "") ||
        (findUser.user.verifiedContactId === "phoneNumber" &&
          phoneNumber &&
          phoneNumber != findUser.phoneNumber) ||
        (findUser.user.verifiedContactId === "phoneNumber" &&
          phoneNumber == "")))
  ) {
    throw new HTTPError("Verified Contact is not subject to change", 400);
  }
};

export const calculateTotalRecordsGetAllAppUsers = async (
  userFilter: Array<{}>,
  depFilter: Array<{}>
) => {
  const totalRecords =
    (await prisma.users.count({
      where: userFilter.length > 0 ? { OR: userFilter } : {},
    })) +
    (await prisma.dependant.count({
      where: depFilter.length > 0 ? { OR: depFilter } : {},
    }));

  return totalRecords;
};

export const isEmergencyContactAndPhoneNumberSameEditUserById = (
  findUser: Users,
  emergencyContact?: string,
  phoneNumber?: string
) => {
  const condition = checkPhoneEmergencyContact(
    phoneNumber,
    emergencyContact,
    findUser.phoneNumber
  );

  if (condition) {
    throw new HTTPError(
      "Emergency contact and phone number cannot be same",
      612
    );
  }
};
export const checkVerfiedContactEditUserById = (
  findUser: Users,
  emailId: string | undefined | null,
  phoneNumber: string | undefined | null
) => {
  if (
    (findUser.verifiedContactId === "emailId" &&
      emailId != findUser.emailId &&
      emailId != undefined) ||
    (findUser.verifiedContactId === "emailId" && emailId == "") ||
    (findUser.verifiedContactId === "phoneNumber" &&
      phoneNumber != findUser.phoneNumber &&
      phoneNumber != undefined) ||
    (findUser.verifiedContactId === "phoneNumber" && phoneNumber == "")
  ) {
    throw new HTTPError("Verified Contact is not subject to change", 400);
  }
};

export const checkPhoneEmergencyContact = (
  phoneNumber?: string | null,
  emergencyContact?: string | null,
  verifiedUserPhoneNumber?: string | null
) => {
  const isValidPhone = phoneNumber && phoneNumber !== "" && phoneNumber != null;
  const isValidEmergency =
    emergencyContact && emergencyContact !== "" && emergencyContact != null;

  const condition =
    (verifiedUserPhoneNumber === emergencyContact ||
      (phoneNumber === emergencyContact && isValidPhone && isValidEmergency)) &&
    isValidPhone &&
    isValidEmergency;

  return condition;
};

export const unblockAdminPanelUsers = async () => {
  // Block-to-unblock logic
  const usersToUpdate = await prisma.users.findMany({
    where: {
      isBlocked: true,
      blockedAt: { lte: new Date(Date.now() - 30 * 60 * 1000) },
      blockReasons: { some: { blockedBy: "app" } },
    },
    select: {
      id: true,
      blockReasons: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const idsToUpdate = usersToUpdate
    .filter((user) => user.blockReasons[0]?.blockedBy === "app")
    .map((user) => user.id);

  if (idsToUpdate.length > 0) {
    await prisma.users.updateMany({
      where: { id: { in: idsToUpdate } },
      data: { isBlocked: false, wrongLoginAttempts: 0 },
    });
  }
};
