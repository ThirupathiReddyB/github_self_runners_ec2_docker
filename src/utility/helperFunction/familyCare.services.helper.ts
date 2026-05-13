import { Familylinks, Users } from "../../../prisma/generated/prisma/client";
import prisma from "../../prisma";
import HTTPError from "../HttpError";
import { familyLink } from "../familyLinkData";
import { ITokenData } from "../DataTypes/types.user";
import { TFamilyCare } from "../DataTypes/types.feature";

export const unlinkMinorFromGuardian = async (
  userId: string,
  dependantId: string
) => {
  const delLink = await prisma.familylinks.deleteMany({
    where: {
      OR: [
        { linkFrom: userId, linkTo: dependantId },
        {
          linkFrom: dependantId,
          linkType: "sharedMinor",
        },
      ],
    },
  });
  if (!delLink)
    throw new HTTPError("could not remove minor from user's family care", 500);
  return delLink;
};

export const findContactChangesUserGetHashedOtp = async (
  userId: string,
  createdBy: string
) => {
  const findContactChangesUser = await prisma.otpStore.findUnique({
    where: {
      userId_createdBy: {
        userId: userId.toLowerCase(),
        createdBy: createdBy,
      },
    },
    select: {
      hashedOTP: true,
      emailId: true,
      phoneNumber: true,
    },
  });

  if (!findContactChangesUser)
    throw new HTTPError("Cannot find User details", 401);
  return findContactChangesUser;
};

export const addSyncedDataUnlinkFamilyMember = async (
  famCareMemberId: string,
  familyLinks: Familylinks[],
  id: string,
  minorsParent: Users | null,
  linkFromMinor: string | undefined,
  isSecondaryParentDetaching: string | false | undefined
) => {
  const addSyncedData = await prisma.syncChanges.createMany({
    data: !linkFromMinor
      ? [
          {
            userChanged: famCareMemberId.toLowerCase(),
            changedBy: id,
            changeType: "delete",
            familyMember: famCareMemberId.toLowerCase(),
            recordId: familyLinks[0].id.toString(),
            table: "F9",
          },
          {
            userChanged: famCareMemberId.toLowerCase(),
            changedBy: id,
            changeType: "delete",
            familyMember: famCareMemberId.toLowerCase(),
            recordId: familyLinks[1].id.toString(),
            table: "F9",
          },
        ]
      : [
          {
            userChanged: isSecondaryParentDetaching
              ? linkFromMinor.toLowerCase()
              : famCareMemberId.toLowerCase(),
            changedBy: id,
            changeType: "delete",
            familyMember: isSecondaryParentDetaching
              ? (minorsParent?.id as string) // linkFromMinor.toLowerCase()
              : famCareMemberId.toLowerCase(),
            recordId: familyLinks[0].id.toString(),
            table: "F9",
          },
        ],
  });
  if (!addSyncedData) throw new HTTPError("Could not update sync changes", 500);

  return addSyncedData;
};

export const syncChangesUnlinkFamilyMember = async (userId: string) => {
  const user = await prisma.users.update({
    where: {
      id: userId.toLowerCase(),
    },
    data: {
      isSync: false,
    },
  });
  if (!user) throw new HTTPError("Could not update sync changes", 500);

  return user;
};

export const removeChangeRecordsUnlinkFamilyMember = async (
  linkFromMinor: string | undefined,
  famCareMemberId: string,
  id: string
) => {
  const removeChangeRecords = await prisma.syncChanges.updateMany({
    where: {
      userChanged: linkFromMinor?.toLowerCase() ?? id.toLowerCase(),
      familyMember: famCareMemberId.toLowerCase(),
      synced: false,
    },
    data: {
      synced: true,
    },
  });
  if (!removeChangeRecords)
    throw new HTTPError("Could not update sync changes records", 500);
  return removeChangeRecords;
};

export const findFamilyLinksUnlinkFamilyMember = async (
  linkFromMinor: string | undefined,
  linkData: Familylinks,
  id: string,
  famCareMemberId: string
) => {
  const familyLinks = await prisma.familylinks.findMany({
    where: !linkFromMinor
      ? {
          OR: [
            { id: linkData.id },
            {
              linkFrom: id.toLowerCase(),
              linkTo: famCareMemberId.toLowerCase(),
            },
            {
              linkFrom: famCareMemberId.toLowerCase(),
              linkTo: id.toLowerCase(),
            },
          ],
        }
      : { OR: [{ id: linkData.id }] },
  });
  if (!familyLinks) {
    throw new HTTPError("Could not find family link", 404);
  }
  return familyLinks;
};
export const detachLinkUnlinkFamilyMember = async (
  linkFromMinor: string | undefined,
  linkData: Familylinks,
  id: string,
  famCareMemberId: string
) => {
  const detachLink = await prisma.familylinks.deleteMany({
    where: !linkFromMinor
      ? {
          OR: [
            { id: linkData.id },
            {
              linkFrom: id.toLowerCase(),
              linkTo: famCareMemberId.toLowerCase(),
            },
            {
              linkFrom: famCareMemberId.toLowerCase(),
              linkTo: id.toLowerCase(),
            },
          ],
        }
      : { OR: [{ id: linkData.id }] },
  });
  if (!detachLink) throw new HTTPError("Could not detach account", 500);
  return detachLink;
};

export const getLinkDataFamilyCare = async (
  minor: string | undefined,
  userId: string,
  memberId: string
) => {
  const { linkData } = await familyLink(
    minor?.toLowerCase() ?? userId.toLowerCase(),
    memberId.toLowerCase()
  );

  if (!linkData)
    throw new HTTPError("Could not fetch family member linking data", 500);

  return linkData;
};

export const findUserVerifyCreateExistingUser = async (
  linkToParent: string | null,
  userId: string
) => {
  const findUser = await prisma.users.findFirst({
    where: {
      id: linkToParent?.toLowerCase() ?? userId.toLowerCase(),
    },
    include: {
      healthRecord: true,
      setting: true,
      medicine: true,
      appointment: true,
      vitalsUserData: true,
      insurance: true,
    },
  });
  if (!findUser) {
    throw new HTTPError("user you are trying to link to does not exist", 404);
  }
  return findUser;
};

export const findExistingLink = async (
  connectMinor: boolean,
  uuid: string,
  userData: ITokenData,
  linkToParent?: string
) => {
  const find_existing_link = await prisma.familylinks.findFirst({
    where: {
      linkFrom: connectMinor ? uuid.toLowerCase() : userData.id.toLowerCase(),
      linkTo: linkToParent?.toLowerCase() ?? uuid.toLowerCase(),
    },
  });
  if (find_existing_link) {
    throw new HTTPError(
      "You already have access to the user account you are trying to link with.",
      422
    );
  }

  return find_existing_link;
};

export const checkPrimaryParentUserOfMinor = async (
  id: string,
  userId: string
) => {
  const checkParentUserOfMinor = await prisma.dependant.findFirst({
    where: {
      id: id,
      userId: userId.toLowerCase(),
    },
  });
  if (!checkParentUserOfMinor) {
    throw new HTTPError(
      "Only the primary parent can link the account of minor",
      404
    );
  }
  return checkParentUserOfMinor;
};

export const countFamilyLinks = async (userId: string) => {
  const minorCount = await prisma.familylinks.count({
    where: {
      OR: [
        {
          linkFrom: userId,
          linkType: "minor",
          isActive:true
        },
        {
          linkTo: userId,
          linkType: "sharedMinor",
        },
      ],
    },
  });
  const adultCount = await prisma.familylinks.count({
    where: {
      linkFrom: userId,
      OR: [{ linkType: "existing" }, { linkType: "subaccount" }],
    },
  });

  return {
    adultCount,
    minorCount,
  };
};

export function checkAvailableSpace(
  spaces: TFamilyCare,
  currentMembers: { minor: number; adult: number },
  checkMinorCount?: boolean
) {
  if (checkMinorCount === undefined) {
    return {
      adult_available: currentMembers.adult < spaces.adult + spaces.slot,
      minor_available: currentMembers.minor < spaces.minor + spaces.slot,
    };
  }
  const totalCapacity = spaces.adult + spaces.minor + spaces.slot;
  const totalMembers = currentMembers.adult + currentMembers.minor;

  if (totalMembers >= totalCapacity)
    return new HTTPError(
      `You cannot add new members to your family care with current plan `,
      601
    );
}

export const fetchFamilyLink = async (
  linkFrom: string,
  linkTo: string,
  linkType: "sharedMinor" | "minor" | "existing" | "subaccount"
) => {
  const memberData = await prisma.familylinks.findFirst({
    where: {
      OR: [
        {
          linkFrom,
          linkTo,
          linkType,
        },
      ],
    },
  });

  if (!memberData)
    throw new HTTPError("User is not a member of this family", 404);
  return memberData;
};

export const getAllFamilySharedMinor = async (userId: string) => {
  const getAllFamilyMembers = await prisma.familylinks.findMany({
    where: {
      OR: [{ linkFrom: userId }, { linkTo: userId, linkType: "sharedMinor" }],
    },
  });

  if (!getAllFamilyMembers)
    throw new HTTPError("Could not fetch family data", 404);
  return getAllFamilyMembers;
};
