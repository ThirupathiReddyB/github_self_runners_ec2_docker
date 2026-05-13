import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  MedicineValidation,
  UpdateMedicineValidation,
} from "../utility/Validation/MedicineValidation";
import {
  createNewMedicineReminder,
  deleteMedicine,
  getUserReminders,
  getMedicineReminders,
  UpdateMedicineReminders,
} from "../services/medicine.services";
import {
  IGetMedicine,
  IMedicine,
  IUpdateMedicine,
} from "../utility/DataTypes/types.medicine";
import { Helpers } from "../utility/Helpers";

export const createMedicineReminder = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const { famCareMemberId } = req.query;

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const {
      medImage,
      medName,
      medUnit,
      medInventory,
      medDoctor,
      medIntakeTime,
      medIntakePerDose,
      medIntakeFrequency,
      medReminderFrequency,
      medDosage,
      MedDosageSchedule,
      startAt,
      endAt,
      isRefill,
    } = req.body;

    if (
      !medName ||
      !medUnit ||
      !medIntakeTime ||
      !medIntakeFrequency ||
      !medIntakePerDose
    ) {
      throw new HTTPError("Missing required fields", 422);
    }

    const data: IMedicine = {
      medImage,
      medName,
      medUnit,
      medInventory,
      medDoctor,
      medIntakeTime,
      medIntakePerDose,
      medIntakeFrequency,
      medReminderFrequency,
      medDosage,
      MedDosageSchedule,
      startAt,
      endAt,
      isRefill: isRefill ?? false,
      famCareMemberId: famCareMemberId
        ? (famCareMemberId as string).toString().toLowerCase()
        : undefined,
    };

    Helpers.validateWithZod(MedicineValidation, data);

    const new_medicine = await createNewMedicineReminder(data, user);
    if (!new_medicine)
      throw new HTTPError(`Could Not Create New Medicine Reminder`, 204);

    const code = new_medicine.success ? 200 : 400;
    res.status(code).json({
      data: new_medicine,
    });
  } catch (err) {
    console.log("Error->Log:", err);

    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getMedicines = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const {
      id,
      medName,
      medUnit,
      medDoctor,
      medIntakeFrequency,
      medIntakeTime,
      limit,
      famCareMemberId,
    } = req.query;

    const queryParams: IGetMedicine = {
      id: id ? parseInt(id as string) : undefined,
      medName: medName as string,
      medUnit: medUnit as string,
      medDoctor: medDoctor as string,
      medIntakeFrequency: medIntakeFrequency
        ? (medIntakeFrequency as IGetMedicine["medIntakeFrequency"])
        : undefined,
      medIntakeTime: medIntakeTime
        ? (medIntakeTime as IGetMedicine["medIntakeTime"])
        : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      famCareMemberId: famCareMemberId as string,
    };

    const all_medicines = await getMedicineReminders(user, queryParams);
    if (!all_medicines)
      throw new HTTPError(`Could Not get Medicines data `, 204);
    const code = all_medicines.success ? 200 : 400;
    res.status(code).json({
      data: all_medicines,
    });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updateMedicineById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorized", 401);

    const { famCareMemberId } = req.query;
    const medId: string = req.params.id;
    if (!medId) throw new HTTPError("Medicine Reminder Id is missing", 422);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const {
      medName,
      medUnit,
      medInventory,
      medDoctor,
      medIntakeTime,
      medIntakePerDose,
      medIntakeFrequency,
      medReminderFrequency,
      medDosage,
      MedDosageSchedule,
      startAt,
      endAt,
      isRefill,
      isActive,
      medImage,
    } = req.body;

    const data: IUpdateMedicine = {
      medName,
      medUnit,
      medInventory,
      medDoctor,
      medIntakeTime,
      medIntakePerDose,
      medIntakeFrequency,
      medReminderFrequency,
      medDosage,
      MedDosageSchedule,
      startAt,
      endAt,
      isRefill,
      isActive,
      medImage,
      medId,
      userId: user.id,
      famCareMemberId: famCareMemberId
        ? (famCareMemberId as string).toString().toLowerCase()
        : undefined,
    };

    Helpers.validateWithZod(UpdateMedicineValidation, data);

    const updatedMedicineReminderData = await UpdateMedicineReminders(data);

    if (!updatedMedicineReminderData)
      throw new HTTPError(`Could Not update medicine reminder data`, 204);
    const code = updatedMedicineReminderData.success ? 200 : 400;
    res.status(code).json({ data: updatedMedicineReminderData });
  } catch (err) {
    console.log("error", err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteMedicineById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorized", 401);

    const { famCareMemberId, id } = req.query;

    if (!id) throw new HTTPError("Enter id of records to delete", 422);

    if (!id || !user.id)
      throw new HTTPError("Required fields are missing", 422);

    const data = {
      medId: id as string,
      userId: user.id,
      famCareMemberId: famCareMemberId
        ? famCareMemberId.toString().toLowerCase()
        : undefined,
    };

    const deleteMedicineData = await deleteMedicine(data);

    if (!deleteMedicineData)
      throw new HTTPError(`Could Not delete medicine reminder data`, 204);
    const code = deleteMedicineData.success ? 200 : 400;
    res.status(code).json({ data: deleteMedicineData });
  } catch (err) {
    console.log(err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getAllReminders = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    const queryParams = req.query;

    if (!user) throw new HTTPError("Unauthorised", 401);

    const all_reminders = await getUserReminders(user, queryParams);
    if (!all_reminders)
      throw new HTTPError(`Could Not get Medicines data `, 204);
    const code = all_reminders.success ? 200 : 400;
    res.status(code).json({
      data: all_reminders,
    });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
