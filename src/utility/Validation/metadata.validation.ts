import { z } from "zod";
import { valueSchema } from "./common.validation";

export const VCreateFeatureMetadata = z.object({
  featureId: z.number().positive(),
  value: valueSchema, // Validates different structures
  remark: z
    .string()
    .trim()
    .min(3, "Remark should be atleast 3 characters")
    .max(100, "Remark should be atmost 100 characters"),
});
