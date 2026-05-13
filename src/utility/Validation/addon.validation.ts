import z from "zod";
import { valueSchema } from "./common.validation";

export const VCreateAddon = z
  .object({
    addonName: z
      .string()
      ?.trim()
      .min(3, "add-on Name should be at least 3 characters long")
      .max(30, "add-on Name should be less than 30 characters long"),
    addonDescription: z
      .string()
      ?.trim()
      .min(3, "add-on Description should be at least 3 characters long")
      .max(300, "add-on Description should be less than 300 characters long"),
    addonAmount: z.number().min(0.0),
    addonCurrency: z.string(),
    addonIsActive: z.boolean().default(true),
    featureId: z.number().positive(),
    addonPeriod: z.enum(["weekly", "monthly", "yearly", "unlimited"]),
    addonInterval: z.number().positive().optional(),
    addonMeta: valueSchema,
  })
  .refine(
    (data) => {
      const { addonPeriod, addonInterval } = data;
      if (addonPeriod && addonPeriod !== "unlimited" && !addonInterval)
        return false;
      return true;
    },
    {
      message: "Enter billing cycle duration for selected period",
      path: ["addonInterval"],
    }
  );

export const VUpdateAddon = z
  .object({
    id: z.number().positive(),
    addonName: z
      .string()
      ?.trim()
      .min(3, "add-on Name should be at least 3 characters long")
      .max(30, "add-on Name should be less than 30 characters long")
      .optional(),
    addonDescription: z
      .string()
      ?.trim()
      .min(3, "add-on Description should be at least 3 characters long")
      .max(300, "add-on Description should be less than 300 characters long")
      .optional(),
    addonAmount: z.number().min(0.0).optional(),
    addonCurrency: z.string().optional(),
    addonIsActive: z.boolean().default(true).optional(),
    featureId: z.number().positive().optional(),
    addonPeriod: z
      .enum(["weekly", "monthly", "yearly", "unlimited"])
      .optional(),
    addonInterval: z.number().positive().optional(),
    addonMeta: valueSchema.optional(),
  })
  .refine(
    (data) => {
      const { addonPeriod, addonInterval } = data;
      if (addonPeriod && addonPeriod !== "unlimited" && !addonInterval)
        return false;
      return true;
    },
    {
      message: "Enter billing cycle duration for selected period",
      path: ["addonInterval"],
    }
  );
