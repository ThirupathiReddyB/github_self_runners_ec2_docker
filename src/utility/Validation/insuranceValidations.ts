import { z } from "zod";
import { excludeSpecialCharacter } from "./regex";
import { editFileSchemaValidation } from "./common.validation";

export const CreateInsuranceValidation = z
  .object({
    policyNum: excludeSpecialCharacter
      .min(1)
      .max(20, "Policy Number is too long"),
    policyName: excludeSpecialCharacter
      .min(1)
      .max(50, "policy name can be of atmost 50 characters"),
    policyType: excludeSpecialCharacter
      .max(100, "policy provider can be of max 100 char")
      .or(z.literal(""))
      .optional(),
    insuranceProv: excludeSpecialCharacter
      .max(100, "policy provider can be of max 100 char")
      .or(z.literal(""))
      .optional(), //insurance provider
    renewalAt: z.string().date("Invalid date format. Use YYYY-MM-DD."),
    ifCoPay: z.coerce
      .number()
      .max(100, "co pay value can be upto 100 %")
      .positive()
      .default(100)
      .optional(),
  })
  .refine(
    (data) => {
      const { renewalAt } = data;
      if (!renewalAt) return true;
      const dateTime = new Date(renewalAt);
      const now = new Date();

      return dateTime > now;
    },
    {
      message: "Expiry of insurance date must be in the future",
      path: ["renewalAt"],
    }
  );

export const uploadInsuranceValidation = z.object({
  file: editFileSchemaValidation.optional(),
  form_data: CreateInsuranceValidation,
});

export const EditInsuranceValidation = z
  .object({
    policyNum: excludeSpecialCharacter
      .min(1)
      .max(20, "Policy Number is too long"),
    policyName: excludeSpecialCharacter
      .min(1)
      .max(50, "policy name can be of atmost 50 characters")
      .optional(),
    policyType: excludeSpecialCharacter
      .max(100, "policy provider can be of max 100 char")
      .or(z.literal(""))
      .optional()
      .nullable(),
    insuranceProv: excludeSpecialCharacter
      .max(100, "policy provider can be of max 100 char")
      .or(z.literal(""))
      .optional()
      .nullable(), //insurance provider
    renewalAt: z
      .string()
      .date("Invalid date format. Use YYYY-MM-DD.")
      .optional(),
    ifCoPay: z.coerce
      .number()
      .max(100, "co pay value can be upto 100 %")
      .positive()
      .optional(),
  })
  .refine(
    (data) => {
      const { renewalAt } = data;
      if (!renewalAt) return true;
      const dateTime = new Date(renewalAt);
      const now = new Date();

      return dateTime > now;
    },
    {
      message: "Expiry of insurance date must be in the future",
      path: ["renewalAt"],
    }
  );

export const ChangeInsuranceValidation = z.object({
  file: editFileSchemaValidation.optional(),
  form_data: EditInsuranceValidation.optional(),
});
