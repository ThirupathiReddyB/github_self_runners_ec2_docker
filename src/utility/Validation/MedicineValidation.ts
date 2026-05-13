import { z } from "zod";
import { excludeSpecialCharacter, languageInclusiveDrName } from "./regex";
import { base64String } from "./common.validation";

const caseInsensitiveEnum = (values: string[]) =>
  z
    .string()
    .transform((val) => val.toLowerCase())
    .refine((val) => values.includes(val), {
      message: `Value must be one of: ${values.join(", ")}`,
    });

const isDayOfWeek = (days: string[]) => {
  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  return days.every((day: string) => {
    return daysOfWeek.includes(day.toLowerCase());
  });
};

const isHours = (hour: string[]) => {
  const regex = /^([01]\d|2[0-3]):([0-5]\d) hours$/; //11:22 hours
  return regex.test(hour[0]);
};

const isDays = (day: string[]) => {
  const dayRegex = /^([1-9]\d?|99) days$/;

  return dayRegex.test(day[0].toLowerCase());
};

export const MedicineValidation = z
  .object({
    medName: excludeSpecialCharacter
      .min(1, "Name is required")
      .max(100, "Medicine name should be less than 100 characters"),

    // medunit: z.enum(["tablet", "syrup", "injection"]),
    medUnit: excludeSpecialCharacter.min(1),
    medInventory: z
      .number()
      .min(1, "Enter a valid input for total contents")
      .max(999)
      .optional(),
    medDoctor: languageInclusiveDrName.optional(),
    medIntakeTime: caseInsensitiveEnum([
      "before_meal",
      "after_meal",
      "with_meal",
      "never_mind",
    ]),
    medIntakePerDose: z
      .number()
      .min(1, "Enter a valid input for amount of dose atonce")
      .max(99),
    medIntakeFrequency: caseInsensitiveEnum([
      "daily",
      "interval",
      "specific_day",
    ]),
    medReminderFrequency: z
      .array(excludeSpecialCharacter)
      .refine((items) => new Set(items).size === items.length, {
        message: "Must be an array of unique values",
      })
      .optional(), //to check array contains unique values
    medDosage: z.number(),
    // .min(1, "Enter a valid input for doses per day")
    // .default(5),
    MedDosageSchedule: z.array(z.string().datetime()).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    isRefill: z.boolean().default(false),
    isSensitive: z.boolean().optional(),
    medImage: base64String.optional(),
  })
  .superRefine((data, ctx) => {
    validateInventory(data, ctx);
    validateDates(data, ctx);
    validateReminderFrequency(data, ctx);
    validateIntakeVsSchedule(data, ctx);
    validateDosageSchedule(data, ctx);
  });

export const UpdateMedicineValidation = z
  .object({
    medId: z.string(),
    medName: excludeSpecialCharacter
      .min(1, "Name is required")
      .max(100, "Medicine name should be less than 100 characters")
      .optional(),
    // medunit: z.enum(["tablet", "syrup", "injection"]),
    medUnit: excludeSpecialCharacter.min(1).optional(),
    medInventory: z
      .number()
      .min(1, "Enter a valid input for total contents")
      .max(999)
      .optional(),
    medDoctor: languageInclusiveDrName.optional(),
    medIntakeTime: caseInsensitiveEnum([
      "before_meal",
      "after_meal",
      "with_meal",
      "never_mind",
    ]).optional(),
    medIntakePerDose: z
      .number()
      .min(1, "Enter a valid input for amount of dose at-once")
      .optional(),
    medIntakeFrequency: caseInsensitiveEnum([
      "daily",
      "interval",
      "specific_day",
    ]).optional(),
    medReminderFrequency: z
      .array(excludeSpecialCharacter)
      .refine((items) => new Set(items).size === items.length, {
        message: "Must be an array of unique values",
      })
      .optional(),
    medDosage: z
      .number()
      .default(0)
      // .min(1, "Enter a valid input for doses per day")
      .optional(),
    MedDosageSchedule: z.array(z.string().datetime()).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
    isRefill: z.boolean().default(false).optional(),
    isSensitive: z.boolean().optional(),
    medImage: base64String.optional(),
  })
  .superRefine((data, ctx) => {
    validateInventory(data, ctx);
    validateDates(data, ctx);
    validateReminderFrequency(data, ctx);
    validateIntakeVsSchedule(data, ctx);
    validateDosageSchedule(data, ctx);
  });

function validateInventory(data: any, ctx: any) {
  const { isRefill, medInventory } = data;

  // Inventory & refill
  if (isRefill && !medInventory) {
    ctx.addIssue({
      path: ["medInventory"],
      code: z.ZodIssueCode.custom,
      message: "Medicine inventory is compulsory only if refill is set to true",
    });
  }

  if (!isRefill && medInventory) {
    ctx.addIssue({
      path: ["medInventory"],
      code: z.ZodIssueCode.custom,
      message: "Inventory should only be set if refill is enabled",
    });
  }
}

function validateDates(data: any, ctx: any) {
  const { startAt, endAt } = data;
  // StartAt & EndAt logic
  if (startAt && endAt && endAt <= startAt) {
    ctx.addIssue({
      path: ["endAt"],
      code: z.ZodIssueCode.custom,
      message: "End of reminder must be greater than start time",
    });
  }
  if (startAt && endAt && startAt > endAt) {
    ctx.addIssue({
      path: ["startAt"],
      code: z.ZodIssueCode.custom,
      message: "Start date should be a earlier than end date",
    });
  }
}

function validateReminderFrequency(data: any, ctx: any) {
  const { medIntakeFrequency } = data;

  if (medIntakeFrequency === "interval") {
    validateIntervalFrequency(data, ctx);
  }

  if (medIntakeFrequency === "specific_day") {
    validateSpecificDayFrequency(data, ctx);
  }

  if (medIntakeFrequency === "daily") {
    validateDailyFrequency(data, ctx);
  }
}

function validateIntervalFrequency(data: any, ctx: any) {
  const { medReminderFrequency, startAt, endAt } = data;

  if (!medReminderFrequency || medReminderFrequency.length !== 1) {
    ctx.addIssue({
      path: ["medReminderFrequency"],
      code: z.ZodIssueCode.custom,
      message:
        "Reminder frequency must have exactly one value for interval type",
    });
    return;
  }

  const isHourly = isHours(medReminderFrequency);
  const isDaily = isDays(medReminderFrequency);

  if (!isHourly && !isDaily) {
    ctx.addIssue({
      path: ["medReminderFrequency"],
      code: z.ZodIssueCode.custom,
      message: "Invalid input for reminder frequency",
    });
    return;
  }

  if (isHourly && (!startAt || !endAt)) {
    ctx.addIssue({
      path: ["startAt"],
      code: z.ZodIssueCode.custom,
      message: "Start and end date are required for hourly interval reminders",
    });
  }

  if (isDaily && !startAt) {
    ctx.addIssue({
      path: ["startAt"],
      code: z.ZodIssueCode.custom,
      message: "Start date is required for daily interval reminders",
    });
  }
}

function validateSpecificDayFrequency(data: any, ctx: any) {
  const { medReminderFrequency } = data;

  if (
    !medReminderFrequency ||
    !isDayOfWeek(medReminderFrequency) ||
    medReminderFrequency.length > 7
  ) {
    ctx.addIssue({
      path: ["medReminderFrequency"],
      code: z.ZodIssueCode.custom,
      message:
        "Reminder frequency must contain valid days of the week, maximum 7",
    });
  }
}

function validateDailyFrequency(data: any, ctx: any) {
  const { medReminderFrequency } = data;

  if (medReminderFrequency?.length) {
    ctx.addIssue({
      path: ["medReminderFrequency"],
      code: z.ZodIssueCode.custom,
      message: "No reminder frequency is needed for daily intake",
    });
  }
}

function validateIntakeVsSchedule(data: any, ctx: any) {
  const { startAt, endAt, medIntakeFrequency } = data;
  // Intake frequency vs schedule
  if ((startAt || endAt) && medIntakeFrequency !== "interval") {
    ctx.addIssue({
      path: ["startAt"],
      code: z.ZodIssueCode.custom,
      message:
        "Start and end date should only be set for interval intake frequency",
    });
  }
}

function validateDosageSchedule(data: any, ctx: any) {
  const { MedDosageSchedule, medDosage } = data;

  // Dosage schedule match
  if (MedDosageSchedule && MedDosageSchedule.length !== medDosage) {
    ctx.addIssue({
      path: ["medDosageSchedule"],
      code: z.ZodIssueCode.custom,
      message: "Medicine dosage does not match the dosage schedule",
    });
  }
}
