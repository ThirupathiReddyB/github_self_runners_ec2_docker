import { z } from "zod";

const DataStructure = z.object({
  metric: z.string().min(1),
  dataType: z.string().min(1),
  units: z.array(z.string()).default([]),
});

const FilterType = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export const createVitalModuleValidation = z.object({
  vitalName: z
    .string()
    .trim()
    .min(1, "Please enter a valid string")
    .max(50, "vital name can be atmost 50 characters long"),
  vitalDataStructure: z.array(DataStructure),
  vitalCode: z
    .string()
    .min(1, "Please enter a valid string")
    .max(10, "code can be atmost 10 characters long"),
  filters: z.array(FilterType).optional(),
});

export const updateVitalModuleValidation = z.object({
  vitalName: z
    .string()
    .trim()
    .min(1, "Please enter a valid string")
    .max(50, "vital name can be atmost 50 characters long")
    .optional(),
  vitalDataStructure: z.array(DataStructure).optional(),
  vitalCode: z
    .string()
    .min(1, "Please enter a valid string")
    .max(10, "code can be atmost 10 characters long")
    .optional(),
  filters: z.array(FilterType).optional(),
});

export const BulkVitalModule = z.array(createVitalModuleValidation);

//Vital Data
//data types for vital data:
const period01Schema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  cycle: z.number().min(1).max(98),
  smartCalculatorPeriodLength: z.boolean().default(false),
  smartCalculatorPeriodCycle: z.boolean().default(false),
  periodLength: z.number().min(1).max(98),
});

const bmi02Schema = z.object({
  bmi: z.number().min(0, "BMI Value cannot be less than 0"),
});

const bp03Schema = z.object({
  systolic: z
    .number()
    .min(0, "Systolic pressure cannot be less than 0")
    .max(999.99, "Systolic pressure cannot be more than 999.99"),
  diastolic: z
    .number()
    .min(0, "Diastolic pressure cannot be less than 0")
    .max(999.99, "Diastolic pressure cannot be more than 999.99"),
});

const bg04 = z.object({
  category: z.string().trim().min(1, "Category is needed"),
  glucoseReading: z
    .number()
    .min(0, "Blood glucose cannot be less than 0")
    .max(999.99, "Blood glucose cannot be more than 999.99"),
});

const whr05Schema = z.object({
  whr: z
    .number()
    .min(0, "BMI Value cannot be less than 0")
    .max(999.99, "Waist-Hip-ratio cannot be more than 999.99"),
});
const insuline06 = z.object({
  insulineType: z.string().trim().min(1, "Type is needed"),
  insulineUnit: z.enum(["U-40", "U-100", "U-200", "U-300", "U-500"]),
  insulineReading: z
    .number()
    .min(0, "Insulin Reading cannot be less than 0")
    .max(99.99, "Insulin Reading cannot be more than 99.99"),
});
//Heart rate
const hr07Schema = z.object({
  bpm: z.number().min(0, "Heart beats per minute should be a positive number"),
});
//Blood Oxygen
const bo08Schema = z.object({
  percent: z
    .number()
    .min(0, "Blood Oxygen cannot be less than 0")
    .max(100, "Blood Oxygen cannot be more than 100%"),
});


//Sleep Monitoring
const sm10Schema = z.object({
  sleepHours: z.number().min(0, "Sleep hours cannot be less than 0"),
});
//Steps tracking
const st11Schema = z.object({
  steps: z.number().min(0, "Steps walked cannot be less than 0"),
});

// General `value` schema using `union`
const generalVitalDataSchema = z.union([
  period01Schema,
  bmi02Schema,
  bp03Schema,
  bg04,
  whr05Schema,
  insuline06,
  hr07Schema,
  bo08Schema,
  sm10Schema,
  st11Schema,
]);

const isoDateTimeRegex =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

function isISODateTime(dateString: string): boolean {
  return isoDateTimeRegex.test(dateString);
}

const CreateVitalRecord = z
  .object({
    vitalData: generalVitalDataSchema,
    recordedOn: z.string(),
  })
  .refine(
    (data) => {
      const { recordedOn } = data;
      const futureLimit = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // 5.5-hour buffer for timezone mismatch
      if (recordedOn && new Date(recordedOn) > futureLimit) {
        return false;
      }
      return true;
    },
    {
      message: "Recorded date cannot be in the future",
    }
  )
  .refine(
    (data) => {
      const { recordedOn } = data;
      if (isISODateTime(recordedOn)) {
        return true;
      }
      return false;
    },
    {
      message: "Recorded On date string should be in ISO-8601 DateTime format",
    }
  );

export const BulkVitalRecord = z
  .object({
    userId: z.string().max(8, "User ID should be at max 8 characters long"),
    vitalCode: z.string().min(1, "Please enter a valid string"),
    lastSyncDate: z.coerce.date().optional(),
    recordData: z.array(CreateVitalRecord),
    famCareMemberId: z
      .string()
      .max(8, "User ID should be at max 8 characters long")
      .optional(),
    deletePeriodRecord: z.string().optional(),
  })
  .refine(
    (data) => {
      const { lastSyncDate } = data;
      if (lastSyncDate && lastSyncDate > new Date()) {
        // const futureLimit = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // 5.5-hour buffer for timezone mismatch
        // if (lastSyncDate && lastSyncDate > futureLimit) {
        return false;
      }
      return true;
    },
    {
      message: "Last-Sync date cannot be in the future",
    }
  );



export const VDownloadVitalCode = z.object({
  vitalModuleCode: z
    .array(
      z
        .string()
        .trim()
        .min(1, "please enter atleast a single character for vital code")
    )
    .min(1, "Please enter a vital code"),
  famCareMemberId: z
    .string()
    .trim()
    .length(8, " fam care member id must be 8 characters long")
    .optional(),
});
