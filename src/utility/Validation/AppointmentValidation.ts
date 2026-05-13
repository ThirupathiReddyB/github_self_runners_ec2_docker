import { z } from "zod";
import { excludeSpecialCharacter, languageInclusiveDrName } from "./regex";

export const AppointmentValidation = z
  .object({
    doctorName: languageInclusiveDrName,
    description: excludeSpecialCharacter
      .min(1, "description is required")
      .max(300, "Description should be less than 300 characters"),
    apptDate: z.string().trim().date("Invalid date format. Use YYYY-MM-DD."),
    apptTime: z
      .string()
      .trim()
      .refine((time) => {
        // Check if the time is in the correct format HH:MM:SS
        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
        return timeRegex.test(time);
      }, "Invalid time format. Use HH:MM:SS."),
    famCareMemberId: excludeSpecialCharacter
      .length(8, "Family member id should be 8 characters long")
      .optional(),
  })
  .refine(
    (data) => {
      const { apptDate, apptTime } = data;

      // Combine date and time into a single ISO 8601 string
      const appointmentDateTimeStr = `${apptDate}T${apptTime}+05:30`; // IST offset
      const appointmentDateTime = new Date(appointmentDateTimeStr);
      const now = new Date();

      return appointmentDateTime > now;
    },
    {
      message: "Appointment date and time must be in the future",
      path: ["apptDate", "apptTime"],
    }
  );

export const UpdateAppointmentValidation = z
  .object({
    apptId: z.string(),
    doctorName: languageInclusiveDrName.optional(),
    description: excludeSpecialCharacter
      .max(300, "Description should be less than 300 characters")
      .optional(),
    apptDate: z
      .string()
      .trim()
      .date("Invalid date format. Use YYYY-MM-DD.")
      .optional(),
    apptTime: z
      .string()
      .trim()
      .refine((time) => {
        // Check if the time is in the correct format HH:MM:SS
        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
        return timeRegex.test(time);
      }, "Invalid time format. Use HH:MM:SS.")
      .optional(),
    famCareMemberId: excludeSpecialCharacter
      .length(8, "Family member id should be 8 characters long")
      .optional(),
  })
  .refine(
    (data) => {
      const { apptDate, apptTime } = data;
      if (apptTime || apptDate) {
        // Combine date and time into a single ISO 8601 string
        const appointmentDateTimeStr = `${apptDate}T${apptTime}+05:30`; // IST offset
        const appointmentDateTime = new Date(appointmentDateTimeStr);
        const now = new Date();

        return appointmentDateTime > now;
      }
      return true;
    },
    {
      message: "Appointment date and time must be in the future",
      path: ["apptDate", "apptTime"],
    }
  );
