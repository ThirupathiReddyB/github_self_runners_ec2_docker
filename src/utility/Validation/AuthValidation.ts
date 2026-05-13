import { z } from "zod";
import {
  excludeSpecialCharacter,
  languageInclusiveDrName,
  userNameValidation,
} from "./regex";
import {
  base64String,
  checkDuplicateContacts,
  emailString,
} from "./common.validation";
const numericString = z
  .string()
  .refine((value) => value == "" || /^\d{10}$/.test(value), {
    message: "Must be a valid 10-digit phone number or an empty string",
  });
const passwordValidation = z
  .string()
  .regex(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])(?!.*\s)[A-Za-z\d\W_]{8,}$/,
    "password criteria failed"
  );

const otpValidation = z.number().int().gte(1000).lte(9999);

const dobString = z
  .string()
  .date("Date must be of the format YYYY-MM-DD")
  .refine((dob) => {
    const dobDate = new Date(dob);
    const now = new Date();
    const hundredYearsAgo = new Date(
      now.getFullYear() - 130,
      now.getMonth(),
      now.getDate()
    );

    const eighteenYearsAgo = new Date(
      now.getFullYear() - 18,
      now.getMonth(),
      now.getDate()
    );

    // Check if the date is valid
    if (isNaN(dobDate.getTime())) {
      return false;
    }

    // Check if the date is less than 130 years old
    return (
      (dobDate > hundredYearsAgo && dobDate < now) ||
      (dobDate > eighteenYearsAgo && dobDate < now)
    );
  }, "Date of birth must be a valid date : older than 18 years and younger than 130 years of age.");

const registrationValidationPhoneNumberOrEmailId = (
  data: {
    fullName: string;
    country: string;
    password?: string;
    phoneNumber?: string | null;
    emailId?: string | null;
  },
  ctx: z.RefinementCtx
) => {
  if (data.country.toLowerCase() === "india") {
    if (!data.phoneNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "phone number is required for Indian users",
        path: ["phoneNumber"],
      });
      return false;
    } else if (data.emailId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email id  is not allowed for Indian users",
        path: ["emailId"],
      });
      return false;
    }
  } else {
    if (!data.emailId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "emailId is required for non-India users",
        path: ["emailId"],
      });
      return false;
    }
    if (data.phoneNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "phoneNumber is not allowed for non-Indian users",
        path: ["phoneNumber"],
      });
      return false;
    }
  }
  return true;
};

export const registrationValidation = z
  .object({
    fullName: userNameValidation
      .min(2, "Name should be atleast 2 characters long")
      .max(50, "Name should be at most 50 characters long"),
    password: passwordValidation,
    phoneNumber: numericString.optional().nullable(),
    emailId: emailString.optional().nullable(),
    otpHash: z.string().min(1, "otp hash is required"),
    country: z
      .string()
      .regex(/^[a-zA-Z\s]+$/, "Only letters and space is allowed ")
      .min(1, "please provide country of the user"),
  })
  .superRefine((data, ctx) => {
    const { phoneNumber, emailId } = data;
    if (phoneNumber || emailId) {
      return registrationValidationPhoneNumberOrEmailId(data, ctx);
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "either emailId or phoneNumber is required",
        path: ["emailId", "phoneNumber"],
      });
    }
  });

export const ResendOtpValidation = z.object({
  id: excludeSpecialCharacter.min(8).max(8),
  otpHash: z.string().min(1, "otp hash is required"),
});

export const verifyOtpForRegistrationValidation = z.object({
  id: excludeSpecialCharacter.min(1, "user id is required"),
  otp: otpValidation,
  consent: z.boolean(),
});

export const createUserRegistration = z
  .object({
    id: excludeSpecialCharacter.length(8, "ID must be 8 characters long"),
    emailId: emailString.optional().nullable(),
    phoneNumber: numericString.optional().nullable(),
    consent: z.boolean().optional(),
    gender: z.enum(["male", "female", "other"]),
    dob: dobString,
    address: excludeSpecialCharacter
      .max(200, "Address should be less than 200 characters")
      .optional()
      .nullable(),
    pincode: z.string().regex(/^(\d{6}|\d{10})$/, {
      message: "Pincode must be either 6 or 10 digits long",
    }),
    emergencyContact: numericString.optional().nullable(),
    bloodGroup: z
      .string()
      .regex(/^[a-zA-Z-+]+$/, "Only letters and sign + - are allowed")
      .trim()
      .min(1, "Blood group is required"),
    presentDiseases: z
      .array(
        excludeSpecialCharacter
          .min(1, "Enter Valid disease name")
          .max(150, "Disease name should be less than 150 characters")
      )
      .optional(),
    allergies: z
      .array(
        excludeSpecialCharacter
          .min(1, "Enter Valid allergy name")
          .max(150, "Allergy name should be less than 150 characters")
      )
      .optional(),
    doctorFullName: languageInclusiveDrName.optional().nullable(),
    docAddress: excludeSpecialCharacter
      .max(200, "Address should be less than 200 characters")
      .optional()
      .nullable(),
    docPhoneNumber: numericString.optional().nullable(),
    additionalInformation: excludeSpecialCharacter
      .max(300, "additional Information should be less than 300 characters")
      .optional()
      .nullable(),
    language: z.enum(["en", "hn", "mr"]),
    profileImage: base64String.optional(),
    deviceToken: z.string().trim().min(1),
  })
  .refine(
    (data) => {
      const { phoneNumber, emergencyContact } = data;
      return checkDuplicateContacts(phoneNumber, emergencyContact);
    },
    {
      message: "phone Number and emergency contact cannot be same",
      path: ["emergencyContact"],
    }
  )
  .refine(
    (data) => {
      const { phoneNumber, docPhoneNumber } = data;
      return checkDuplicateContacts(phoneNumber, docPhoneNumber);
    },
    {
      message: "phone Number and doctor's contact cannot be same",
      path: ["docPhoneNumber"],
    }
  );

export const sessionInputValidation = z.object({
  userId: z.string().min(1, "ID must be 8 characters long"),
  password: z.string().trim().min(1, "user id is required").optional(),
});

export const adminSessionValidation = z.object({
  emailId: emailString,
});

export const verifiedContactSchema = z
  .string()
  .trim()
  .min(1, "Contact must contain at least 1 character")
  .superRefine((val, ctx) => {
    const isNumeric = /^\d+$/.test(val);
    const phoneResult = numericString.safeParse(val);
    const emailResult = emailString.safeParse(val);

    if (!isNumeric && !emailResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: emailResult.error.errors[0].message,
      });
    } else if (isNumeric && !phoneResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: phoneResult.error.errors[0].message,
      });
    }
  });

export const loginWithPasswordValidation = z.object({
  userId: z.string().min(1, "ID must be atleast 1 character"),
  pass: z
    .string()
    .trim()
    .min(8, "Password length should be at least 8 characters"),
  language: z.enum(["en", "hn", "mr"]),
  deviceToken: z.string().trim().min(1),
});

export const detachloginWithPasswordValidation = z.object({
  userId: excludeSpecialCharacter.length(8, "id must be 8 character long"),

  password: passwordValidation,
});

export const otpLoginGenerateValidation = z.object({
  userId: z.string().trim().min(1, "id must be atleast 1 character"),
  otpHash: z.string().min(1, "otp hash is required"),
});

export const otpLoginVerificationValidation = z.object({
  userId: z.string().min(1, "id must be atleast 1 character"),

  verifiedContact: verifiedContactSchema,
  otp: z.number().min(4, "OTP should be 4 digits long"),
  language: z.enum(["en", "hn", "mr"]),
  deviceToken: z.string().trim().min(1),
});

export const minorOtpLoginVerificationValidation = z.object({
  userId: excludeSpecialCharacter.min(8, "id must be 8 character long"),
  verifiedContact: verifiedContactSchema,
  otp: z.number().min(4, "OTP should be 4 digits long"),
});
export const generateOtpForResetPasswordValidation = z.object({
  userId: z.string().min(8, "id must be 8 character long"),
  otpHash: z.string().min(1, "otp hash is required"),
});

export const verifyOtpForResetPasswordValidation = z.object({
  userId: z.string().length(8, "id must be 8 character long"),
  verifiedContact: verifiedContactSchema,
  otp: otpValidation,
});

export const verifyOtpForDetailsChangeValidation = z.object({
  userId: excludeSpecialCharacter.length(8, "id must be 8 character long"),
  verifiedContactId: z.enum(["emailId", "phoneNumber"]),
  verifiedContact: verifiedContactSchema,
  otp: otpValidation,
});

export const ResetPasswordValidation = z.object({
  userId: excludeSpecialCharacter.min(8, "id must be 8 character long"),
  newpassword: passwordValidation,
});
