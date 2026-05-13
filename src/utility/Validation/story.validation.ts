import z from "zod";
import { editFileSchemaValidation } from "./common.validation";

export const createStoryValidation = z
  .object({
    title: z.string().trim().min(1, "title is required"),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(2, "Tag name should be atleast 2 characters long")
          .max(45, "Tag name should be less than 45 characters long")
          .optional()
      )
      .optional(),
    images: z.array(editFileSchemaValidation).max(10).min(1),
    imageTitles: z.array(z.string().trim().min(1, "image title is required")),
    imageDescriptions: z.array(z.string().trim()),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const { images } = data;
      if (images.length > 10) return false;
      return true;
    },
    {
      message: "Maximum 10 images are allowed",
      path: ["images"],
    }
  );

export const editStoryValidation = z
  .object({
    title: z.string().trim().min(1, "title is required").optional(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(2, "Tag name should be atleast 2 characters long")
          .max(45, "Tag name should be less than 45 characters long")
          .optional()
      )
      .optional(),
    images: z.array(editFileSchemaValidation).max(10).optional(),
    imageTitles: z
      .array(z.string().trim().min(1, "image title is required"))
      .optional(),
    imageDescriptions: z.array(z.string().trim()).optional(),
    existingImages: z.array(z.string()).optional(),
    existingImageTitles: z.array(z.string()).optional(),
    existingImageDescriptions: z.array(z.string()).optional(),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      const { images, existingImages } = data;
      if (
        images &&
        existingImages &&
        images.length + existingImages.length > 10
      )
        return false;
      return true;
    },
    {
      message: "Maximum 10 images are allowed",
      path: ["images"],
    }
  )
  .refine(
    (data) => {
      const { images, existingImages } = data;
      if (images && existingImages && images.length + existingImages.length < 1)
        return false;
      return true;
    },
    {
      message: "Atleast 1 image is required",
      path: ["images"],
    }
  );

export const vGetTransactionAdmin = z.object({
  id: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  paymentStatus: z.array(z.string()).optional(),
  transactionDate: z.string().optional(),
});
