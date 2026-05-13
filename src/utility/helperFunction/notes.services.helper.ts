import { Familylinks } from "../../../prisma/generated/prisma/client";
import { trackChanges } from "../changeHistoryTrackFunction";
import { determineUserForSyncChanges } from "../familyLinkData";
import HTTPError from "../HttpError";

export const trackDeletionHistory = async (
  userId: string,
  famCareMemberId: string,
  linkData: Familylinks | null,
  isMinorChangedBySecondaryParent: boolean = false,
  notesToDelete: Array<{ id: number }> = [] 
) => {
  if (famCareMemberId) {
    for (const item of notesToDelete) {
      await determineUserForSyncChanges(
        linkData,
        userId,
        item.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId.toString(),
        "delete",
        "N4"
      );
    }
  } else {
    for (const item of notesToDelete) {
      if (
        !(await trackChanges(userId, "delete", item.id, "N4", userId, false))
      ) {
        throw new HTTPError("Could not track change", 204);
      }
    }
  }
};
