import prisma from "../prisma";
import {
  ICreateAppointment,
  IAppointmentInput,
  ICreatedAppointment,
  IGetAppointment,
  IUpdateAppointment,
} from "../utility/DataTypes/types.appointment";
import { ITokenData } from "../utility/DataTypes/types.user";
import {
  formatDateForDB,
  formatTimeForDB,
} from "../utility/DateTimeFormatters";
import HTTPError from "../utility/HttpError";
import {
  checkUserLinkAndManageAccess,
  determineUserForSyncChanges,
} from "../utility/familyLinkData";
import {
  trackActiveSession,
  trackChanges,
} from "../utility/changeHistoryTrackFunction";

import {
  buildAppointmentFilters,
  checkAppointmentConflicts,
  findAppointments,
} from "../utility/helperFunction/appointments.services.helper";

import { handleError } from "../utility/Error";

export const createNewAppointment = async (
  data: ICreateAppointment,
  user: ITokenData
) => {
  try {
    const { doctorName, description, apptDate, apptTime, famCareMemberId } =
      data;

    const formattedDate = formatDateForDB(apptDate);
    const formattedTime = `${apptDate}T${apptTime}.000Z`;

    let new_appointment: ICreatedAppointment;

    if (famCareMemberId) {
      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(
          user.id,
          famCareMemberId.toLowerCase()
        );

      const id =
        linkData.linkType === "minor" || linkData.linkType === "sharedMinor"
          ? "forDependantId"
          : "forUserId";

      //find conflicting appointments
      await checkAppointmentConflicts(
        formattedDate,
        formattedTime,
        (famCareMemberId as string).toLowerCase(),
        id
      );

      new_appointment = await prisma.appointment.create({
        data: {
          createdBy: user.id,
          doctorName,
          description,
          apptDate: formattedDate,
          apptTime: formattedTime,
          ...(linkData.linkType === "minor" ||
          linkData.linkType === "sharedMinor"
            ? {
                dependant: {
                  connect: {
                    id: famCareMemberId.toLowerCase(),
                  },
                },
              }
            : {
                user: {
                  connect: {
                    id: famCareMemberId.toLowerCase(),
                  },
                },
              }),
        },
      });

      if (!new_appointment)
        throw new HTTPError("Could Not Add new appointment", 500);

      await determineUserForSyncChanges(
        linkData,
        user.id,
        new_appointment.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId,
        "create",
        "A1"
      );
    } else {
      await checkAppointmentConflicts(
        formattedDate,
        formattedTime,
        user.id,
        "forUserId"
      );

      new_appointment = await prisma.appointment.create({
        data: {
          doctorName,
          description,
          apptDate: formattedDate,
          apptTime: formattedTime,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });
      if (!new_appointment)
        throw new HTTPError("Could Not Add new appointment", 500);

      const changeHistory = await trackChanges(
        user.id,
        "create",
        new_appointment.id,
        "A1",
        user.id,
        false
      );
      if (!changeHistory.success)
        throw new HTTPError("Could not track change", 204);
    }
    await trackActiveSession(user.id);

    return {
      success: true,
      A1: new_appointment,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getUserAppointments = async (
  user: ITokenData,
  queryParams: IGetAppointment
) => {
  try {
    const { limit } = queryParams;
    const take = limit ?? undefined;

    const filters: any = {};

    // Build filters for fetching appointments
    await buildAppointmentFilters(user, queryParams, filters);

    // Fetching appointments from database
    const appointments = await prisma.appointment.findMany({
      where: {
        AND: [filters],
      },
      take,
      orderBy: {
        apptDate: "asc",
      },
    });

    if (!appointments) {
      throw new HTTPError("Could not fetch appointments data for user", 500);
    }

    // Track active session
    await trackActiveSession(user.id);

    return {
      success: true,
      A1: appointments,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const updateAppointment = async (data: IUpdateAppointment) => {
  try {
    let updatedApptData;
    const {
      doctorName,
      description,
      apptDate,
      apptTime,
      userId,
      famCareMemberId,
      apptId,
    } = data;

    const formattedDate = apptDate ? formatDateForDB(apptDate) : undefined;
    const formattedTime = apptTime ? formatTimeForDB(apptTime) : undefined;

    // Find appointment
    await findAppointments(parseInt(apptId), userId, famCareMemberId as string);

    if (famCareMemberId) {
      //check if link exist and if user is authorized to change the data

      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(userId, famCareMemberId);

      updatedApptData = await prisma.appointment.update({
        where: {
          id: parseInt(apptId),
          // userId: (famCareMemberId as string)?.toLowerCase(),
          ...(linkData.linkType === "minor" ||
          linkData.linkType === "sharedMinor"
            ? {
                forDependantId: famCareMemberId.toLowerCase(),
              }
            : {
                forUserId: famCareMemberId.toLowerCase(),
              }),
        },
        data: {
          doctorName,
          description,
          apptDate: formattedDate,
          apptTime: formattedTime,
        },
      });
      if (!updatedApptData) {
        throw new HTTPError("Could Not update appointment data", 500);
      }

      //track changes (only for linked user / subaccount user / secondary parent of minor )
      await determineUserForSyncChanges(
        linkData,
        userId,
        updatedApptData.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId ,
        "update",
        "A1"
      );
    } else {
      updatedApptData = await prisma.appointment.update({
        where: {
          id: parseInt(apptId),
          forUserId: userId,
        },
        data: {
          doctorName,
          description,
          apptDate: formattedDate,
          apptTime: formattedTime,
        },
      });
      if (!updatedApptData) {
        throw new HTTPError("Could Not update appointment data", 500);
      }
      const changeHistory = await trackChanges(
        userId,
        "update",
        updatedApptData.id,
        "A1",
        userId,
        false
      );
      if (!changeHistory.success)
        throw new HTTPError("Could not track change", 204);
    }

    await trackActiveSession(userId);
    return {
      success: true,
      message: "Appointment updated successfully",
      A1: updatedApptData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const deleteAppointment = async (
  data: IAppointmentInput,
  famCareMemberId?: string
) => {
  try {
    const { apptId, userId } = data;
    const appts = apptId.split(",");

    //find appointment
    const findAppointment = await prisma.appointment.findMany({
      where: {
        id: {
          in: appts.map((appt) => parseInt(appt)),
        },
        OR: [
          {
            forUserId: famCareMemberId ?? userId,
          },
          { forDependantId: famCareMemberId },
        ],
      },
    });
    if (!findAppointment || findAppointment.length != appts.length)
      throw new HTTPError("Could not find appointment for user", 404);

    let deletedAppointment;

    if (famCareMemberId) {
      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(
          userId,
          famCareMemberId.toLowerCase()
        );

      deletedAppointment = await prisma.appointment.deleteMany({
        where: {
          id: {
            in: appts.map((appt) => parseInt(appt)),
          },
          ...(linkData.linkType === "minor" ||
          linkData.linkType === "sharedMinor"
            ? {
                forDependantId: famCareMemberId,
              }
            : {
                forUserId: famCareMemberId,
              }),
        },
      });
      if (!deletedAppointment)
        throw new HTTPError("Could Not delete appointment", 500);

      const changes = appts.map(async (appt) => {
        await determineUserForSyncChanges(
          linkData,
          userId,
          parseInt(appt),
          isMinorChangedBySecondaryParent,
          famCareMemberId,
          "delete",
          "A1"
        );
      });
      if (!changes) throw new HTTPError("Could not record changes made", 500);
    } else {
      deletedAppointment = await prisma.appointment.deleteMany({
        where: {
          id: {
            in: appts.map((appt) => parseInt(appt)),
          },
          forUserId: userId,
        },
      });

      if (!deletedAppointment)
        throw new HTTPError("Could Not delete appointment", 500);

      const changes = appts.map(async (appt) => {
        const changeHistory = await trackChanges(
          userId,
          "delete",
          parseInt(appt),
          "A1",
          userId,
          false
        );
        if (!changeHistory.success)
          throw new HTTPError("Could not track change", 204);
      });

      if (!changes) throw new HTTPError("Could not record changes made", 500);
    }
    await trackActiveSession(userId);

    return {
      success: true,
      message: "Appointment was deleted successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
