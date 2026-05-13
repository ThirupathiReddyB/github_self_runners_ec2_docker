import z from "zod";
import HTTPError from "../HttpError";
import { editFileSchemaValidation, editLogoSchemaValidation } from "./common.validation";

export const VCreateVoucher = z
  .object({
    voucherName: z
      .string()
      ?.trim()
      .min(3, "voucher Name should be at least 3 characters long")
      .max(50, "voucher Name should be less than 50 characters long"),
    voucherCode: z
      .string()
      ?.trim()
      .min(3, "voucher Code should be at least 3 characters long")
      .max(30, "voucher Code should be less than 30 characters long"),
    voucherType: z.enum(["generic", "referal", "partner"]),
    voucherDescription: z
      .string()
      ?.trim()
      .min(3, "voucher Description should be at least 3 characters long")
      .max(500, "voucher Description should be less than 500 characters long"),
    voucherAmount: z
      .number()
      .positive()
      .max(100, "Percentage off should not be more than 100")
      .default(0),
    expiry: z.date().optional(),
    redeemLimit: z
      .number()
      .positive()
      .max(5000, "Maximum redeem limit should be less than 5000")
      .optional(),
    voucherIsActive: z.boolean().default(true),
    minSpend: z.number().default(0),
    partnerEmail: z.string().email().optional(),
    //Advertisement details
    file: editFileSchemaValidation.optional(),
    voucherBanner: editFileSchemaValidation.optional(),
    clientLogo: editLogoSchemaValidation.optional(),
    advName: z
      .string()
      .min(2, "Enter a string longer than 2 characters")
      .optional(),
    advRedirectLink: z
      .string()
      .min(2, "Enter a string longer than 2 characters")
      .optional(),
    advPosition: z.enum(["top", "bottom"]).optional(),
    priority: z.string().optional(),
    advStart: z.date().optional(),
    advEnd: z.date().optional(),
    advTime: z.string().optional(),
    linkAdvertisement: z.array(z.string()).optional(),
    linkedPlanId: z.number().positive().optional()
  })
  .refine((data) => {
    const { expiry } = data;

    if (expiry && new Date(expiry) < new Date()) {
      const fieldError = {
        fieldName: "expiry",
        message: "Expiry should be set for a date in the future",
      };
      throw new HTTPError(fieldError, 400);
    }

    return true;
  })
  .refine(
    (data) => {
      const { voucherType, partnerEmail } = data;
      if (voucherType === "partner" && !partnerEmail) return false;
      return true;
    },
    {
      message: "For partner type of voucher, partner email is required",
      path: ["partnerEmail"],
    }
  )
   .refine(
    (data) => {
      const { voucherType, linkedPlanId } = data;
      if (voucherType === "partner" && !linkedPlanId) return false;
      return true;
    },
    {
      message: "For partner type of voucher, Linking a plan is required",
      path: ["linkedPlanId"],
    }
  )
  .refine(
    (data) => {
      const { advStart, advEnd } = data;
      if (advStart && advEnd && advStart > advEnd) return false;
      return true;
    },
    {
      message: "Advertisement start date should be before end date",
      path: ["advStart"],
    }
  ).refine(
    (data) => {
      const { voucherType, linkAdvertisement, advName } = data;
      if ((voucherType === "partner" && (!linkAdvertisement || !linkAdvertisement?.length)) && !advName) return false;
      return true;
    },
    {
      message: "For partner type of voucher, Linking atleast 1 advertisement is compulsory",
      path: ["linkAdvertisement"],
    }
  );

export const VUpdateVoucher = z
  .object({
    id: z.number().positive(),
    voucherName: z
      .string()
      ?.trim()
      .min(3, "voucher Name should be at least 3 characters long")
      .max(50, "voucher Name should be less than 50 characters long")
      .optional(),
    voucherCode: z
      .string()
      ?.trim()
      .min(3, "voucher Code should be at least 3 characters long")
      .max(30, "voucher Code should be less than 30 characters long")
      .optional(),
    voucherType: z.enum(["generic", "referal", "partner"]).optional(),
    voucherDescription: z
      .string()
      ?.trim()
      .min(3, "voucher Description should be at least 3 characters long")
      .max(500, "voucher Description should be less than 500 characters long")
      .optional(),
    voucherAmount: z
      .number()
      .positive()
      .max(100, "Percentage off should not be more than 100")
      .optional(),
    expiry: z.date().optional(),
    redeemLimit: z
      .number()
      .positive()
      .max(5000, "Maximum redeem limit should be less than 5000")
      .optional(),
    voucherIsActive: z.boolean().default(true).optional(),
    minSpend: z.number().default(0).optional(),
    partnerEmail: z.string().email().optional(),
    //Advertisement details
    file: editFileSchemaValidation.optional(),
    voucherBanner: editFileSchemaValidation.optional(),
    clientLogo: editLogoSchemaValidation.optional(),
    advName: z
      .string()
      .min(2, "Enter a string longer than 2 characters")
      .optional(),
    advRedirectLink: z
      .string()
      .min(2, "Enter a string longer than 2 characters")
      .optional(),
    advPosition: z.enum(["top", "bottom"]).optional(),
    priority: z.string().optional(),
    advStart: z.date().optional(),
    advEnd: z.date().optional(),
    advTime: z.string().optional(),
    linkAdvertisement: z.array(z.string()).optional(),
    linkedPlanId: z.number().positive().optional()
  })
  .refine((data) => {
    const {
      expiry,
      // redeemLimit, voucherType
    } = data;

    if (expiry && new Date(expiry) < new Date()) {
      const fieldError = {
        fieldName: "expiry",
        message: "Expiry should be set for a date in the future",
      };
      throw new HTTPError(fieldError, 400);
    }

    return true;
  })
  .refine(
    (data) => {
      const { voucherType, partnerEmail } = data;
      if (voucherType === "partner" && !partnerEmail) return false;
      return true;
    },
    {
      message: "For partner type of voucher partner email is required",
      path: ["voucherType"],
    }
  )
  .refine(
    (data) => {
      const { voucherType, linkedPlanId } = data;
      if (voucherType === "partner" && !linkedPlanId) return false;
      return true;
    },
    {
      message: "For partner type of voucher, Linking a plan is required",
      path: ["linkedPlanId"],
    }
  )
  .refine(
    (data) => {
      const { advStart, advEnd } = data;
      if (advStart && advEnd && advStart > advEnd) return false;
      return true;
    },
    {
      message: "Advertisement start date should be before end date",
      path: ["advStart"],
    }
  );
