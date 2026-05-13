import { Changes, Familylinks } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";
import { trackChanges } from "./changeHistoryTrackFunction";
import HTTPError from "./HttpError";

const determineRelation = (relation: string, gender: string) => {
  const genderBasedRelations: Record<string, string> = {
    brother: gender === "female" ? "sister" : "brother",
    sister: gender === "male" ? "brother" : "sister",
    friend: "friend",
    wife: gender === "male" ? "husband" : "wife",
    husband: gender === "female" ? "wife" : "husband",
    spouse: gender === "male" ? "husband" : "wife",
    father: "child",
    mother: "child",
    parent: "child",
    daughter: "parent",
    son: "parent",
    child: "parent",
    other: "other",
    family: "family",
  };

  return genderBasedRelations[relation] || "other";
};
export const familyLink = async (from: string, to: string) => {
  if (!from || !to) throw new HTTPError("Missing required fields", 422);
  const linkData = await prisma.familylinks.findFirst({
    where: {
      OR: [
        { linkFrom: from, linkTo: to },
        { linkFrom: to, linkTo: from, linkType: "sharedMinor" },
      ],
    },
  });
  if (!linkData)
    throw new HTTPError("Could not find link between specified users", 404);
  return {
    linkData,
  };
};

export const deduceRelation = async (relation: string, userId: string) => {
  const findUser = await prisma.users.findFirst({
    where: {
      id: userId,
    },
    select: {
      gender: true,
    },
  });
  if (!findUser) throw new HTTPError("Could not find user", 404);
  return determineRelation(relation, findUser.gender);
};
//parent
//spouse

export const checkUserLinkAndManageAccess = async (
  userId: any,
  famCareMemberId: any
) => {
  let familyLinkData = await familyLink(
    userId,
    (famCareMemberId as string)?.toLowerCase()
  );
  let linkData = familyLinkData.linkData;
  const isMinorChangedBySecondaryParent =
    linkData.linkType === "sharedMinor" && linkData.linkFrom != userId;

  //check access types for family care except  minor
  if (linkData.linkType != "minor" && linkData.linkType != "sharedMinor") {
    familyLinkData = await familyLink(
      (famCareMemberId as string)?.toLowerCase(),
      userId
    );
    linkData = familyLinkData.linkData;
  }
  if (!linkData) throw new HTTPError("Link Does Not exist", 404);
  //Do not let  1. View access to make changes
  //            2. Grayed out minor to be made changes to
  if(linkData.accessType == "view")
    throw new HTTPError("You are not authorised to make this change", 401);
  if(linkData.linkType=="minor" && linkData.isActive == false)
    throw new HTTPError("You do not have the required subscription to make this change. Upgrade your plan", 401);

  return { linkData, isMinorChangedBySecondaryParent };
};

export const determineUserForSyncChanges = async (
  linkData: Familylinks | null,
  loggedInUserId: string,
  recordId: number | string,
  isMinorChangedBySecondaryParent: boolean,
  famCareMemberId: string,
  changeType: Changes,
  table: string
) => {
  if (
    //check if secondary user is changing the data
    (linkData?.linkType === "sharedMinor" &&
      linkData.linkFrom != loggedInUserId) ||
    //data is changed of existing or subaccount
    (linkData?.linkType != "minor" && linkData?.linkTo == loggedInUserId)
  ) {
    const changeHistory = await trackChanges(
      famCareMemberId.toString().toLowerCase(),
      changeType,
      recordId,
      table,
      loggedInUserId,
      isMinorChangedBySecondaryParent
    );
    if (!changeHistory.success)
      throw new HTTPError("Could not track change", 204);
  } else {
    //parent is changing the minor account track changes for secondary account
    const secondaryParentLink = await prisma.familylinks.findFirst({
      where: {
        linkFrom: famCareMemberId.toLocaleString(),
      },
    });
    if (secondaryParentLink) {
      await prisma.syncChanges.create({
        data: {
          userChanged: famCareMemberId.toString().toLowerCase(),
          changeType,
          familyMember: secondaryParentLink?.linkTo,
          recordId: recordId.toString(),
          table,
          changedBy: loggedInUserId, //logged In user
        },
      });

      await prisma.users.update({
        where: { id: secondaryParentLink.linkTo },
        data: {
          isSync: false,
          inAppNotificationSync: false,
        },
      });
    }
  }
};

export const getLinkData = async (userId: string, famCareMemberId: string) => {
  const { linkData } = await familyLink(userId, famCareMemberId.toLowerCase());
  if (linkData.linkType === "existing" || linkData.linkType == "subaccount") {
    throw new HTTPError("you cannot view/manage insurance of familycare", 613);
  }
  return linkData;
};

export const checkIfUserOrDependant = (
  linkData: Familylinks | null,
  userId: string,
  famCareMemberId?: string
) => {
  let vitalWhereCondition;
  console.log(userId, famCareMemberId, "testing ****");
  if (famCareMemberId) {
    const isDependent =
      linkData?.linkType === "minor" || linkData?.linkType === "sharedMinor";
    vitalWhereCondition = isDependent
      ? { forDependantId: famCareMemberId.toString() }
      : { forUserId: famCareMemberId.toString() };
  } else {
    vitalWhereCondition = { forUserId: userId };
  }

  return vitalWhereCondition;
};
