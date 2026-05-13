import z from "zod";

export const createNotesValidation = z.object({
  title: z
    .string()
    .trim()

    .min(1, "title is required")
    .max(50, "title must me 50 character max"),
  description: z.string().min(1, "description is required"),
  color: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9#]+$/, "Only letters are allowed"),
  famCareMemberId: z
    .string()
    .length(8, "fam care id must be 8 characters long")
    .optional(),
});

export const updateNotesValidation = z.object({
  notesId: z.number().int().positive("notesId must be a positive integer"),
  title: z
    .string()
    .trim()
    .max(50, "title must be less than 50 characters")
    .optional(),
  description: z.string().optional().nullable(),
  color: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9#]+$/, "Only letters are allowed")
    .optional(),
  famCareMemberId: z.string().trim().optional(),
});
