import { z } from "zod";
import { excludeSpecialCharacter, languageInclusiveDrName } from "./regex";
import {
  base64String,
  checkDuplicateContacts,
  emailString,
  numericString,
} from "./common.validation";

const dobString = z
  .string()
  .trim()
  .trim()
  .date("Date must be of the format YYYY-MM-DD")
  .refine((dob) => {
    const dobDate = new Date(dob);
    const now = new Date();
    const hundredYearsAgo = new Date(
      now.getFullYear() - 130,
      now.getMonth(),
      now.getDate()
    );

    // Check if the date is valid
    if (isNaN(dobDate.getTime())) {
      return false;
    }

    // Check if the date is less than 100 years old
    return dobDate > hundredYearsAgo && dobDate < now;
  }, "Date of birth must be a valid date less than 130 years old and in the past.");

export const uploadProfileValidation = z.object({
  profileImage: z.any(),
});

export const updateUserValidation = z
  .object({
    profileImage: base64String.optional().nullable(),
    emailId: emailString.optional().nullable(),
    phoneNumber: numericString.optional().nullable(),
    gender: z.enum(["male", "female", "other"]).optional().nullable(),
    dob: dobString.optional().nullable(),
    address: excludeSpecialCharacter
      .max(200, "Address should be less than 200 characters")
      .optional()
      .nullable(),
    pincode: z
      .string()
      .regex(/^(\d{6}|\d{10})$/, {
        message: "Pincode must be either 6 or 10 digits long",
      })
      .optional()
      .nullable(),
    emergencyContact: numericString.optional().nullable(),
    bloodGroup: z
      .string()
      .regex(/^[a-zA-Z-+]+$/, "Only letters and sign + - are allowed ")
      .trim()
      .min(1, "Blood group is required")
      .optional()
      .nullable(),
    presentDiseases: z
      .array(
        excludeSpecialCharacter
          .min(1, "Enter Valid disease name")
          .max(150, "Disease name should be less than 150 characters")
      )
      .optional()
      .nullable(),
    allergies: z
      .array(
        excludeSpecialCharacter
          .min(1, "Enter Valid allergy name")
          .max(150, "Allergy name should be less than 150 characters")
      )
      .optional()
      .nullable(),
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

export const checkExistingUserValidation = z
  .object({
    profileImage: base64String.optional(),
    userId: excludeSpecialCharacter.min(6, "id must be 6 character long"),
    emailId: emailString
      .min(1, "must contain atleat 1 character")
      .optional()
      .nullable(),
    phoneNumber: numericString.optional().nullable(),
    gender: z.enum(["male", "female", "other"]).optional(),
    dob: dobString.optional(),
    address: excludeSpecialCharacter
      .max(200, "Address should be less than 200 characters")
      .optional()
      .nullable(),
    pincode: z
      .string()
      .regex(/^(\d{6}|\d{10})$/, {
        message: "Pincode must be either 6 or 10 digits long",
      })
      .optional(),
    emergencyContact: numericString.optional().nullable(),
    docPhoneNumber: numericString.optional().nullable(),
  })
  .refine(
    (data) => {
      const { phoneNumber, docPhoneNumber } = data;

      return checkDuplicateContacts(phoneNumber, docPhoneNumber);
    },
    {
      message: "phone Number and doctor's contact cannot be same",
      path: ["docPhoneNumber"],
    }
  ).refine(
    (data) => {
      const { phoneNumber, emergencyContact } = data;

      return checkDuplicateContacts(phoneNumber, emergencyContact);
    },
    {
      message: "phone Number and emergency contact cannot be same",
      path: ["emergencyContact"],
    }
  );

export const deleteUserValidation = z.object({
  reason: z.string().min(1),
});

export const blockUserValidation = z.object({
  userId: excludeSpecialCharacter.length(8, "id must be 8 character long"),
  reason: excludeSpecialCharacter.max(
    1000,
    "reason can be of atmost 1000 character long"
  ),
});

export const updateUserSettingValidation = z.object({
  language: z.enum(["en", "hn", "mr"]).optional(),
  appLock: z.boolean().optional(),
  notification: z.boolean().optional(),
});
export const NewContactDetailsValidations = z.object({
  id: excludeSpecialCharacter.length(8, "id must be 8 character long"),
  emailId: emailString.optional(),
  phoneNumber: numericString.optional(),
  otpHash: z.string().min(1, "otp hash is required"),
});

export const userComplaintValidation = z.object({
  emailId: emailString,
  message: excludeSpecialCharacter
    .max(2000, "Complaint can be of max 2000 character")
    .min(1, "Complaint must have atleast one character"),
  type: z.enum(["complaint", "feedback"]),
});

export const userFeedbackValidation = z.object({
  emailId: emailString.optional(),
  message: excludeSpecialCharacter
    .max(2000, "Complaint can be of atmost  2000 characters")
    .min(1, "Complaint must have atleast one character")
    .or(z.union([z.literal("?"), z.literal("!")])),
  type: z.enum(["complaint", "feedback"]),
});

export const notificationCategoryValidation = z.object({
  category: z.enum(["family_care", "local"]),
});
