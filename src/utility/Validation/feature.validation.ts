import z from "zod";
import { canonicalNameMapping } from "../Helpers";

export const VCreateFeature = z.object({
  featureName: z
    .string()
    ?.trim()
    .min(3, "Feature Name should be at least 3 characters long")
    .max(30, "Feature Name should be less than 30 characters long"),
  canonicalName: z.nativeEnum(canonicalNameMapping),
  featureDescription: z
    .string()
    ?.trim()
    .min(3, "Feature Description should be at least 3 characters long")
    .max(100, "Feature Description should be less than 100 characters long"),
  featureIsActive: z.boolean().default(true),
});

export const VUpdateFeature = z.object({
  id: z.number().positive(),
  featureName: z
    .string()
    ?.trim()
    .min(3, "Feature Name should be at least 3 characters long")
    .max(30, "Feature Name should be less than 30 characters long")
    .optional(),
  canonicalName: z.nativeEnum(canonicalNameMapping).optional(),
  featureDescription: z
    .string()
    ?.trim()
    .min(3, "Feature Description should be at least 3 characters long")
    .max(100, "Feature Description should be less than 100 characters long")
    .optional(),
  featureIsActive: z.boolean().default(true).optional(),
});
