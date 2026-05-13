import z from "zod";

// Define different schemas for "value" based on feature type
const familyCareSchema = z.object({
  minor: z.number().int().min(0),
  adult: z.number().int().min(0),
  slot: z.number().int().min(0),
});

const availabilitySchema = z.object({
  available: z.boolean(),
});

const storageSchema = z.object({
  storage: z.number().positive(),
  unit: z.enum(["KB", "MB", "GB", "TB"]),
});

// General `value` schema using `union`
export const valueSchema = z.union([
  familyCareSchema,
  availabilitySchema,
  storageSchema,
]);

export const numericString = z
  .string()
  .trim()
  .min(1, "phone number must cotaint atleast 1 digit")
  .refine((value) => /^\d{10}$/.test(value), {
    message: "Must be a valid 10-digit phone number ",
  });

export const emailString = z
  .string()
  .trim()
  .min(1, "email id must contain atleast 1 character")
  .email("Invalid email format. please enter in format -> abc@xyz.com")
  .max(280, "Email must be at most 280 characters long");

const base64ImageRegex = /^data:image\/(png|jpeg|jpg|heif|heic);base64,/;

export const base64String = z.string().refine(
  (data) => {
    // Allow empty string
    if (data === "") {
      return true;
    }

    // Ensure the string matches the base64 image pattern
    if (!base64ImageRegex.test(data)) {
      return false;
    }

    // Extract the base64 encoded part
    const base64String = data.replace(base64ImageRegex, "");

    // Calculate the size in bytes (1 character = 1 byte)
    const sizeInBytes =
      base64String.length * (3 / 4) -
      (data.indexOf("=") > 0 ? data.length - data.indexOf("=") : 0);

    // 7MB = 7 * 1024 * 1024 bytes
    return sizeInBytes <= 7 * 1024 * 1024;
  },
  {
    message:
      "Image must be a valid base64 encoded string and not exceed 7MB in size.",
  }
);

export const checkDuplicateContacts = (
  contact1?: string | null,
  contact2?: string | null
) => {
  const shouldReturnTrue =
    (contact1 == null && contact2 == null) || // both null or undefined
    (contact1 && contact2 == null) || // phone exists, contact2 is null/undefined
    (contact2 && contact1 == null) ||
    (contact1 && contact2 && contact1 != contact2); // contact2 exists, phone is null/undefined

  if (contact1 && contact2 && contact1 == contact2) return false;

  return shouldReturnTrue;
};

//validations for userUploadFile
// 1. file must be in .jpeg,jpg,pdf,png,heic,docx and less than 5mb
// 2. form data must contain category: string;name: string;dr_name: string;note?: string;isSensitive: string;
const max_file_size: number = 7 * 1024 * 1024; // 7mb
const validFileFormat: Array<string> = [
  "png",
  "jpeg",
  "jpg",
  "heif",
  "heic",
  "svg",
  "jfif",
  "pdf",
  "docx"
];

export const uploadFileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string().refine(
    (originalname: string) => {
      const org: string = originalname.split(".").pop() as string;
      return validFileFormat.includes(org.toLowerCase());
    },
    {
      message: "file type is not supported",
    }
  ),
  size: z.number().refine((size: number) => size <= max_file_size, {
    message: "file must be of maximum 7mb",
  }),
});

export const editFileSchemaValidation = z.object({
  fieldname: z.string().optional(),
  originalname: z
    .string()
    .refine(
      (originalname: string) => {
        const org: string = originalname.split(".").pop() as string;
        return validFileFormat.includes(org.toLowerCase());
      },
      {
        message: "file type is not supported",
      }
    )
    .optional(),
  size: z
    .number()
    .refine((size: number) => size <= max_file_size, {
      message: "file must be of maximum 7mb",
    })
    .optional(),
});

export const editLogoSchemaValidation = z.object({
  fieldname: z.string().optional(),
  originalname: z
    .string()
    .refine(
      (originalname: string) => {
        const org: string = originalname.split(".").pop() as string;
        return ["svg"].includes(org.toLowerCase());
      },
      {
        message: "File type is not supported",
      }
    )
    .optional(),
  size: z
    .number()
    .refine((size: number) => size <= max_file_size, {
      message: "file must be of maximum 7mb",
    })
    .optional(),
});

export const CreateAppVersion = z.object({
  appVersion: z.string().min(1, "app version is required"),
  appEnvironment: z.enum(["android", "ios"]),
  isForceUpdate: z.boolean(),
  isActive: z.boolean(),
  features: z.array(z.string()).min(1, "Atleast 1 update feature is needed")
})

export const UpdateAppVersion = z.object({
  id: z.number().positive(),
  appVersion: z.string().min(1, "app version is required").optional(),
  appEnvironment: z.enum(["android", "ios"]).optional(),
  isForceUpdate: z.boolean().optional(),
  features: z.array(z.string()).min(1, "Atleast 1 update feature is needed").optional()
})

export const facTimeRegex = /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;

// Helper to convert "09:30 AM" to minutes (e.g., 570) for easy comparison
export const facTimeToMinutes = (timeStr: string) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};
