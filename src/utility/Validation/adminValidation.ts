import { z } from "zod";
import { userNameValidation } from "./regex";
import { emailString } from "./common.validation";

export const emailStringValidation = z.object({
  emailId: emailString,
});

export const createSuperAdminValidation = z.object({
  emailId: emailString,
  // password: z.string().min(1, "Password is required"),
  fullName: userNameValidation.min(1, "Fullname is required"),
  position: z.string().min(1, "position is required"),
});

export const verifyOtp = z.object({
  emailId: emailString,
  otp: z.number().min(4, "OTP shoould be 4 digits long"),
});

export const VfeedbackValidation = z.object({
  reply: z
    .string()
    .min(1, "Feedback is required")
    .max(500, "Reply to 500 characters long"),
});

export const updateSuperAdminValidation = z.object({
  emailId: emailString.optional(),
  fullName: userNameValidation
    .min(1, "fullname is required")
    .max(50, "auditor name can be atmost 50 characters long")
    .optional(),
  position: z
    .string()
    .trim()
    .min(1, "Position is required")
    .max(30, "auditor position can be atmost 30 characters long")
    .optional(),
});

export const createAdminAndAuditor = z.object({
  emailId: emailString,
  fullName: userNameValidation
    .min(1, "Fullname is required")
    .max(50, "auditor name can be atmost 50 characters long"),
  position: z
    .string()
    .trim()
    .min(1, "position is required")
    .max(30, "auditor position can be atmost 30 characters long"),
  role: z.enum(["admin", "auditor"]),
});

//complaint

export const VComplaintReply = z.object({
  reply: z
    .string()
    .trim()
    .min(1, "reply should have atleast one character")
    .max(2000, "reply can be atmost 2000 characters long"),
});
