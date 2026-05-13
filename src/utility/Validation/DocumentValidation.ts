import { z } from "zod";
import { excludeSpecialCharacter, languageInclusiveDrName } from "./regex";
import {
  base64String,
  editFileSchemaValidation,
  uploadFileSchema,
} from "./common.validation";

const CategoryEnum = z.enum(["report", "bill", "prescription", "other"]);
const isSensitiveEnum = z.enum(["true", "false"]);

export const uploadFileValidation = z.object({
  file: uploadFileSchema,
  documentCategory: CategoryEnum.refine((val) =>
    CategoryEnum.options.includes(val)
  ),
  documentName: excludeSpecialCharacter
    .min(1, "name is required")
    .max(50, "Document name should be less than 50 characters"),
  documentConsultant: languageInclusiveDrName.optional().nullable(),
  // ** not kept nullable due to frontend issue
  notes: excludeSpecialCharacter
    .max(100, "Notes should be less than 100 characters")
    .optional()
    .or(z.literal("")),
  isSensitive: isSensitiveEnum.refine((val) =>
    isSensitiveEnum.options.includes(val)
  ),
  famCareMemberId: z.string().optional(),
});

export const editFileValidation = z.object({
  id: z.number().positive(),
  file: editFileSchemaValidation.optional(),
  documentCategory: CategoryEnum.refine((val) =>
    CategoryEnum.options.includes(val)
  ).optional(),
  documentName: excludeSpecialCharacter
    .min(1, "name is required")
    .max(50, "Document name should be less than 50 characters")
    .optional(),
  documentConsultant: languageInclusiveDrName.optional().nullable(),
  // ** not kept nullable due to frontend issue
  note: excludeSpecialCharacter
    .max(100, "Notes should be less than 100 characters")
    .optional()
    .or(z.literal("")),
  isSensitive: isSensitiveEnum
    .refine((val) => isSensitiveEnum.options.includes(val))
    .optional()
    .nullable(),
  famCareMemberId: z.string().optional(),
});

export const base64ImageValidation = z.object({
  profileImage: base64String,
});
