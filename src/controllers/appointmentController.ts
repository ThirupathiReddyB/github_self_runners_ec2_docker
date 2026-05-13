import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  AppointmentValidation,
  UpdateAppointmentValidation,
} from "../utility/Validation/AppointmentValidation";
import {
  createNewAppointment,
  deleteAppointment,
  getUserAppointments,
  // getAppointmentDataById,
  updateAppointment,
} from "../services/appointments.services";
import {
  IAppointmentInput,
  ICreateAppointment,
  IGetAppointment,
  IUpdateAppointment,
} from "../utility/DataTypes/types.appointment";
import { Helpers } from "../utility/Helpers";
import { formatDateForDB } from "../utility/DateTimeFormatters";

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { famCareMemberId } = req.query;
    const { doctorName, description, apptDate, apptTime } = req.body;
    if (!doctorName || !description || !apptDate || !apptTime) {
      throw new HTTPError("Please provide all required fields", 422);
    }

    const data: ICreateAppointment = {
      doctorName,
      description,
      apptDate: apptDate,
      apptTime: apptTime,
      famCareMemberId:
        typeof famCareMemberId === "string"
          ? famCareMemberId.toLowerCase()
          : undefined,
    };

    Helpers.validateWithZod(AppointmentValidation, data);

    const new_appointment = await createNewAppointment(data, user);
    if (!new_appointment)
      throw new HTTPError(`Could Not Create New appointment`, 204);
    const code = new_appointment.success ? 200 : 400;
    res.status(code).json({ data: new_appointment });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getAppointments = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const {
      id,
      startDate,
      endDate,
      doctorName,
      description,
      famCareMemberId,
      page,
      limit,
    } = req.query;

    const queryParams: IGetAppointment = {
      id: id ? parseInt(id as string) : undefined,
      startDate: startDate ? formatDateForDB(startDate as string) : undefined,
      endDate: endDate ? formatDateForDB(endDate as string) : undefined,
      doctorName: typeof doctorName === "string" ? doctorName : undefined,
      description: typeof description === "string" ? description : undefined,
      famCareMemberId:
        typeof famCareMemberId === "string"
          ? famCareMemberId.toLowerCase()
          : undefined,
      page: page ? parseInt(page as string) : 0,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const all_apointments = await getUserAppointments(user, queryParams);
    if (!all_apointments)
      throw new HTTPError(`Could Not get all appointments of user`, 204);
    const code = all_apointments.success ? 200 : 400;
    res.status(code).json({ data: all_apointments });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updateAppointmentById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorized", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { famCareMemberId } = req.query;
    const apptId: string = req.params.id;
    if (!apptId) throw new HTTPError("Appointment Id is missing", 422);

    const { doctorName, description, apptDate, apptTime } = req.body;
    const data: IUpdateAppointment = {
      apptId,
      doctorName,
      description,
      apptDate,
      apptTime,
      famCareMemberId:
        typeof famCareMemberId === "string"
          ? famCareMemberId.toLowerCase()
          : undefined,
      userId: user.id,
    };

    Helpers.validateWithZod(UpdateAppointmentValidation, data);

    const updatedAppointment = await updateAppointment(data);

    if (!updatedAppointment)
      throw new HTTPError(`Could Not update appointment data`, 204);
    const code = updatedAppointment.success ? 200 : 400;
    res.status(code).json({ data: updatedAppointment });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteAppointmentById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorized", 401);

    const { famCareMemberId, id } = req.query;

    if (!id || !user.id)
      throw new HTTPError("Required fields are missing", 422);

    const delInput: IAppointmentInput = {
      apptId: id as string,
      userId: user.id,
    };

    const deleteAppointmentData = await deleteAppointment(
      delInput,
      famCareMemberId?.toString().toLowerCase()
    );

    if (!deleteAppointmentData)
      throw new HTTPError(`Could Not update appointment data`, 204);
    const code = deleteAppointmentData.success ? 200 : 400;
    res.status(code).json({ data: deleteAppointmentData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
