import prisma from "../../prisma";
import HTTPError from "../HttpError";
import { familyLink } from "../familyLinkData";
import { ITokenData } from "../DataTypes/types.user";
import { IGetAppointment } from "../DataTypes/types.appointment";

// Helper func to build filters for fetching appointments
export const buildAppointmentFilters = async (
  user: ITokenData,
  queryParams: IGetAppointment,
  filters: any
) => {
  const { id, startDate, endDate, doctorName, description, famCareMemberId } =
    queryParams;

  if (famCareMemberId) {
    const { linkData } = await familyLink(
      user.id,
      famCareMemberId.toLowerCase()
    );
    if (!linkData) {
      throw new HTTPError("Could not find relation between the users", 404);
    }

    filters[linkData.linkType === "minor" ? "forDependantId" : "forUserId"] =
      famCareMemberId;
  } else {
    filters.forUserId = user.id;
  }

  if (id) filters.id = id;
  if (startDate) filters.apptDate = { gte: startDate };
  if (endDate)
    filters.apptDate = {
      ...filters.apptDate,
      lte: endDate,
    };
  if (doctorName)
    filters.doctorName = { contains: doctorName, mode: "insensitive" };
  if (description)
    filters.description = { contains: description, mode: "insensitive" };

  return filters;
};

// Helper func to check appointment conflicts
export const checkAppointmentConflicts = async (
  apptDate: string,
  apptTime: string,
  userId: string,
  idKey: string
) => {
  const conflicts = await prisma.appointment.findMany({
    where: {
      apptDate,
      apptTime,
      [idKey]: userId.toLowerCase(),
    },
  });

  if (conflicts.length > 0) {
    throw new HTTPError(
      "Appointment for entered date and time already exists for user",
      609
    );
  }
};

//helper func to locate appointement
export const findAppointments = async (
  apptId: number,
  userId: string,
  famCareMemberId?: string
) => {
  const getAppointment = await prisma.appointment.findFirst({
    where: {
      id: apptId,
      OR: [
        {
          forUserId: famCareMemberId ? famCareMemberId.toLowerCase() : userId,
        },
        { forDependantId: famCareMemberId?.toLowerCase() },
      ],
    },
  });
  if (!getAppointment)
    throw new HTTPError("Could not find appointment for user", 404);
};
