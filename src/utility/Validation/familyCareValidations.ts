import { z } from "zod";
import { AccessType } from "../../../prisma/generated/prisma/client";
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

const AccessTypeEnum = z.enum([AccessType.view, AccessType.manage]);
const numericString = z
  .string()
  .refine((value) => value === "" || /^\d{10}$/.test(value), {
    message: "Must be a valid 10-digit phone number or an empty string",
  });

const MinorDobString = z
  .string()
  .date("Date must be of the format YYYY-MM-DD")
  .refine((dob) => {
    const dobDate = new Date(dob);
    const now = new Date();
    const eighteenYears = new Date(
      now.getFullYear() - 18,
      now.getMonth(),
      now.getDate()
    );

    // Check if the date is valid
    if (isNaN(dobDate.getTime())) {
      return false;
    }

    // Check if the date is less than 100 years old
    return dobDate > eighteenYears && dobDate < now;
  }, "Date of birth must be a valid date less than 18 years old and in the past.");

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

    // Check if the date is valid
    if (isNaN(dobDate.getTime())) {
      return false;
    }

    // Check if the date is less than 130 years old
    return dobDate > hundredYearsAgo && dobDate < now;
  }, "Date of birth must be a valid date less than 130 years old and in the past.");

export const dependantRegisterValidation = z.object({
  //   id: z.string().min(8, "ID must be at least 6 characters long"),
  fullName: userNameValidation
    .min(2, "Full Name should be longer than 2 characters")
    .max(50),
  //   phoneNumber: numericString.optional(),
  // declaration: z.boolean(),
  gender: z.enum(["male", "female", "other"]),
  dob: MinorDobString,
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
    .regex(/^[a-zA-Z-+]+$/, "Only letters and sign + - are allowed ")
    .min(1, "Blood group is required"),
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
  doctorFullName: z
    .string()
    .trim()
    .max(50, "Name should be at most 50 characters long")
    .optional()
    .nullable(),
  docAddress: excludeSpecialCharacter
    .max(200, "Address should be less than 200 characters")
    .optional()
    .nullable(),
  docPhoneNumber: numericString.optional().nullable(),
  additionalInformation: excludeSpecialCharacter
    .max(300, "additional Information should be less than 300 characters")
    .optional()
    .nullable(),
  relation: excludeSpecialCharacter.min(1, "enter valid relation"),
  profileImage: base64String.optional().nullable(),

  //   linkingUserId: z.string().min(6, "ID must be at least 6 characters long"),
});

export const addNewUserFamilyCareValidation = z
  .object({
    id: excludeSpecialCharacter.min(8, "ID must be at least 8 characters long"),
    emailId: emailString.optional().nullable(),
    phoneNumber: numericString.optional().nullable(),
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
      .regex(/^[a-zA-Z-+]+$/, "Only letters and sign + - are allowed ")
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
    relation: excludeSpecialCharacter.min(1, "Relation is required"),
    profileImage: base64String.optional(),
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
      message: "phone Number and emergency contact cannot be same",
      path: ["docPhoneNumber"],
    }
  )
  .refine(
    (data) => {
      const { emergencyContact, docPhoneNumber } = data;
      return checkDuplicateContacts(emergencyContact, docPhoneNumber);
    },
    {
      message: "emergency contact and doctor's contact cannot be same",
      path: ["docPhoneNumber"],
    }
  );

export const existingUserValidation = z
  .object({
    uuid: excludeSpecialCharacter.min(1, "user id is required"),
    relation: excludeSpecialCharacter.min(
      2,
      "minimum 2 letters required for relation"
    ),
    connectMinor: z.boolean().default(false).optional(),
    linkToParent: excludeSpecialCharacter.max(8).optional(),
    otpHash: z.string().min(1, "otp hash is required"),
  })
  .refine(
    (data) => {
      if (
        (data.connectMinor &&
          (!data.linkToParent || data.linkToParent == "")) ||
        (!data.connectMinor && data.linkToParent)
      ) {
        return false;
      } else {
        return true;
      }
    },
    {
      message:
        "When connecting minor please provide secondary parent id as well as set flag of connect minor to true",
      path: ["connectMinor", "linkToParent"],
    }
  );

export const existingUserOtpValidation = z.object({
  uuid: excludeSpecialCharacter.min(1, "user id is required"),
  otp: z.number().min(4, "otp should be 4 digits long"),
  relation: excludeSpecialCharacter.min(
    2,
    "minimum 2 letters required for relation"
  ),
  connectMinor: z.boolean().default(false).optional(),
  linkToParent: excludeSpecialCharacter.max(8).optional(),
});

export const changeAccessValidation = z.object({
  memberId: excludeSpecialCharacter.min(1, "user id is required"),
  access: AccessTypeEnum,
  sensitiveAccess: z.boolean().default(false),
  linkFromMinor: excludeSpecialCharacter
    .length(8, "uuid field is required and should be 8 characters long")
    .optional(),
  getMedicineReminderOfSecondayUser: z.boolean().default(false),
});

export const releaseMinorInputValidation = z.object({
  id: excludeSpecialCharacter.length(8, "minor UUID should be 8 digits long"),
  phoneNumber: numericString.optional(),
  emailId: emailString.optional(),
  otpHash: z.string().min(1, "otp hash is required"),
});
