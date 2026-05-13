import { Familylinks } from "../../prisma/generated/prisma/client";
import { checkUserLinkAndManageAccess } from "./familyLinkData";

export const getLinkDataAndFilters = async (
  userId: string,
  famCareMemberId?: string
) => {
  const filters: any = {};
  let linkData: Familylinks | null = null;
  let isMinorChangedBySecondaryParent = false;
  if (famCareMemberId) {
    const response = await checkUserLinkAndManageAccess(
      userId,
      famCareMemberId.toLowerCase()
    );

    linkData = response.linkData;
    isMinorChangedBySecondaryParent = response.isMinorChangedBySecondaryParent;

    if (linkData.linkType === "minor" || linkData.linkType === "sharedMinor") {
      filters.forDependantId = famCareMemberId;
    } else {
      filters.forUserId = famCareMemberId;
    }
  } else {
    filters.forUserId = userId;
  }

  return { linkData, isMinorChangedBySecondaryParent, filters };
};
