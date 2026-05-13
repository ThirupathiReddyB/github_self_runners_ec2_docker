import {
  checkUserLinkAndManageAccess,
  determineUserForSyncChanges,
  familyLink,
} from "../utility/familyLinkData";
import HTTPError from "../utility/HttpError";
import prisma from "../prisma";
import {
  trackActiveSession,
  trackChanges,
} from "../utility/changeHistoryTrackFunction";
import { filterRecords } from "../utility/RecordList";
import { Familylinks } from "../../prisma/generated/prisma/client";
import { handleError } from "../utility/Error";
import { trackDeletionHistory } from "../utility/helperFunction/notes.services.helper";
import { getLinkDataAndFilters } from "../utility/getFilteredData";
import {
  ICreateNotes,
  IDeleteNotes,
  IGetNotes,
  IUpdateNotes,
} from "../utility/DataTypes/types.notes";

export const createUserNotes = async (data: ICreateNotes) => {
  try {
    const { title, color, description, famCareMemberId, userId } = data;

    let createdNotes;

    if (famCareMemberId) {
      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(
          userId,
          famCareMemberId.toLowerCase()
        );

      createdNotes = await prisma.notes.create({
        data: {
          createdBy: userId,
          title: title,
          color: color,
          description: description,
          ...(linkData.linkType === "minor" ||
          linkData.linkType === "sharedMinor"
            ? {
                forDependantId: famCareMemberId.toLowerCase(),
              }
            : {
                forUserId: famCareMemberId.toLowerCase(),
              }),
        },
      });

      if (!createdNotes) {
        throw new HTTPError("db:error ,could not create Notes", 500);
      }

      await determineUserForSyncChanges(
        linkData,
        userId,
        createdNotes.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId,
        "create",
        "N4"
      );
    } else {
      createdNotes = await prisma.notes.create({
        data: {
          createdBy: "self",
          title: title,
          color: color,
          description: description,
          forUserId: userId,
        },
      });
      if (!createdNotes) {
        throw new HTTPError("db:error ,could not create Notes", 500);
      }
      const changeHistory = await trackChanges(
        userId,
        "create",
        createdNotes.id,
        "N4",
        userId,
        false
      );
      if (!changeHistory.success)
        throw new HTTPError("Could not track change", 204);
    }

    await trackActiveSession(userId);

    return {
      success: true,
      message: "note created successfully",
      N4: createdNotes,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getUserNotes = async (queryParams: IGetNotes) => {
  try {
    const { id, famCareMemberId, userId } = queryParams;
    const filters: any = {};

    if (famCareMemberId) {
      const { linkData } = await familyLink(
        userId,
        famCareMemberId?.toLowerCase()
      );

      const isDependant =
        linkData.linkType === "minor" || linkData.linkType === "sharedMinor";

      if (isDependant) {
        filters.forDependantId = famCareMemberId; //fetch minor notes
      } else {
        filters.forUserId = famCareMemberId; //fetch subaccount and existing AC
      }
    } else {
      filters.forUserId = userId; //fetch data of logged in userId
    }

    if (id) {
      filters.id = id; //fetch specific note
    }

    const allNotes = await prisma.notes.findMany({
      where: {
        AND: [filters],
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    await trackActiveSession(userId);

    return {
      success: true,
      N4: allNotes,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const editNotes = async (userId: string, data: IUpdateNotes) => {
  try {
    const { title, description, color, famCareMemberId, notesId } = data;
    const filters: any = { id: notesId };
    let linkData: Familylinks | null = null;
    let isMinorChangedBySecondaryParent: boolean = false;

    await getLinkDataAndFilters(userId, famCareMemberId);

    const findNotes = await prisma.notes.findFirst({
      where: filters,
    });
    if (!findNotes) {
      throw new HTTPError("The note  does not exist", 404);
    }

    const updatedNote = await prisma.notes.update({
      where: {
        id: findNotes.id,
      },
      data: {
        title: title,
        description: description,
        color: color,
      },
    });

    if (!updatedNote) {
      throw new HTTPError("could not update the notes", 500);
    }

    if (famCareMemberId) {
      await determineUserForSyncChanges(
        linkData,
        userId,
        updatedNote.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId,
        "update",
        "N4"
      );
    } else {
      const changeHistory = await trackChanges(
        userId,
        "update",
        updatedNote.id,
        "N4",
        userId,
        false
      );
      if (!changeHistory) {
        throw new HTTPError("Could not track change", 204);
      }
    }
    await trackActiveSession(userId);

    return {
      success: true,
      message: "note updated successfully!",
      N4: updatedNote,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const deleteNote = async (queryParams: IDeleteNotes, userId: string) => {
  try {
    let notesId: Array<number> = [];
    let linkData: Familylinks | null = null;
    let isMinorChangedBySecondaryParent: boolean = false;

    const { famCareMemberId, id } = queryParams;
    const filters: any = {};
    if (!id) {
      throw new HTTPError("id is required", 400);
    }
    if (!Array.isArray(id)) {
      notesId = id.split(",").map((item: string) => {
        return parseInt(item);
      });
    }

    await getLinkDataAndFilters(userId, famCareMemberId);

    // Fetch the notes to delete
    const notesToDelete = await prisma.notes.findMany({
      where: {
        id: {
          in: notesId,
        },
        ...filters,
      },
    });
    if (!notesToDelete || notesToDelete.length != notesId.length) {
      throw new HTTPError("Note(s) does not exist", 404);
    }
    const deletedRecords = notesToDelete.map((note) => note.id);

    const deleteNote = await prisma.notes.deleteMany({
      where: {
        id: {
          in: notesId,
        },
        ...filters,
      },
    });
    if (!deleteNote || deleteNote.count === 0) {
      throw new HTTPError("Note to be deleted not found ", 500);
    }

    await trackDeletionHistory(
      userId,
      famCareMemberId as string,
      linkData,
      isMinorChangedBySecondaryParent,
      notesToDelete
    );

    await trackActiveSession(userId);

    //find successfull and failed records:
    const failedRecords = await filterRecords(deletedRecords, notesId);
    return {
      success: true,
      message: "note(s) deleted successfully",
      successfullyDeleted: deletedRecords,
      failed: failedRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
