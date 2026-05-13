import z from "zod";

export const VCreatePlan = z
  .object({
    planName: z
      .string()
      ?.trim()
      .min(3, "plan Name should be at least 3 characters long")
      .max(30, "plan Name should be less than 30 characters long"),
    planAmount: z.number().min(0.0),
    planVariantName: z.string(),
    planPeriod: z.enum(["weekly", "monthly", "yearly", "unlimited"]),
    planInterval: z.number().positive(),
    planNotes: z
      .string()
      ?.trim()
      .min(3, "plan Notes should be at least 3 characters long")
      .max(500, "plan Notes should be less than 500 characters long"),
    planIsActive: z.boolean().default(true),
    features: z.array(
      z.object({
        featureId: z.number().positive(),
        metaId: z.number().positive(),
      })
    ),
    isDefault: z.boolean().default(false).optional(),
    defaultExpiry: z.date().optional(),
  })
  .refine(
    (data) => {
      const { planPeriod, planInterval } = data;
      if (planPeriod !== "unlimited" && !planInterval) return false;
      return true;
    },
    {
      message: "Enter billing cycle duration for selected period",
      path: ["planInterval"],
    }
  );

export const VUpdatePlan = z
  .object({
    id: z.number().positive(),
    planName: z
      .string()
      ?.trim()
      .min(3, "plan Name should be at least 3 characters long")
      .max(30, "plan Name should be less than 30 characters long")
      .optional(),
    planAmount: z.number().min(0.0).optional(),
    planCurrency: z.string().optional(),
    planPeriod: z.enum(["weekly", "monthly", "yearly", "unlimited"]).optional(),
    planInterval: z.number().positive().optional(),
    planNotes: z
      .string()
      ?.trim()
      .min(3, "plan Notes should be at least 3 characters long")
      .max(500, "plan Notes should be less than 500 characters long")
      .optional(),
    planIsActive: z.boolean().default(true).optional(),
    features: z
      .array(
        z.object({
          featureId: z.number().positive().optional(),
          metaId: z.number().positive().optional(),
        })
      )
      .optional(),
    isDefault: z.boolean().default(false).optional(),
    defaultExpiry: z.date().optional(),
  })
  .refine(
    (data) => {
      const { planPeriod, planInterval } = data;
      if (planPeriod && planPeriod !== "unlimited" && !planInterval)
        return false;
      return true;
    },
    {
      message: "Enter billing cycle duration for selected period",
      path: ["planInterval"],
    }
  );

export const VGetFaqs = z.object(
 { type: z.enum(["payment", "general", "selfawareness"])},
);
