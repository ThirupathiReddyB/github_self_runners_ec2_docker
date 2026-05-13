import { z } from "zod";
import { drNameValidation, excludeSpecialCharacter } from "./regex";
import { editFileSchemaValidation, facTimeRegex, facTimeToMinutes, uploadFileSchema } from "./common.validation";

export const isBooleanEnum = z.enum(["true", "false"]);
const videoType = z.enum(["video", "reel", "default_video"]);

export const VGetCommon = z.object({
  id: z.number().optional(),
  page: z.number().positive(),
  limit: z.number().positive(),
});

//VIDEOS
//create videos
export const CreateVideoValidation = z.object({
  vidName: excludeSpecialCharacter
    .min(2, "Enter a string longer than 2 characters.")
    .max(50, "Video name can be upto 50 characters long."),
  vidSourceUrl: z
    .string()
    .min(2, "Enter a string longer than 2 characters.")
    .regex(
      /^https:\/\/vimeo\.com\/\d+$/,
      "Invalid URL format, must be a valid Vimeo URL"
    ),
  vidTags: z
    .array(
      excludeSpecialCharacter
        .min(2, "string must be atleast 2 character.")
        .max(45, "Tags can be upto 45 characters long.")
    )
    .min(1, "Atleast 1 tag is required.")
    .max(15, "You can add only 15 tags."),
  isActive: z.boolean().default(true),
  isSubscribed: z.boolean().default(true),
  priority: z.number().positive().gt(0),
});

export const uploadVideoValidation = z.object({
  form_data: CreateVideoValidation,
});

//update videos
export const UpdateVideoValidation = z.object({
  vidName: excludeSpecialCharacter
    .min(2, "Enter a string longer than 2 characters.")
    .max(50, "Video name can be upto 50 characters long.")
    .optional(),
  vidSourceUrl: z
    .string()
    .min(2, "Enter a string longer than 2 characters")
    .regex(
      /^https:\/\/vimeo\.com\/\d+$/,
      "Invalid URL format, must be a valid Vimeo URL"
    )
    .optional(),
  vidTags: z
    .array(
      excludeSpecialCharacter
        .min(2, "string must be atleast 2 character.")
        .max(45, "Tags can be upto 45 characters long.")
    )
    .optional(),
  isActive: z.boolean().optional(),
  isSubscribed: z.boolean().optional(),
  priority: z.number().optional(),
  vidType: videoType.default("video").optional(),
  isOverride: z.boolean().default(false).optional(),
});

//ADVERTISEMENTS
export const CreateAdvertisementValidation = z.object({
  advName: excludeSpecialCharacter
    .min(2, "Enter a string longer than 2 characters")
    .max(50, "Advertisement name can be upto 50 characters long."),
  advRedirectLink: z
    .string()
    .min(2, "Enter a string longer than 2 characters")
    .regex(
      /^(https?:\/\/)(www\.)?([\w.-]+\.[a-zA-Z]{2,})(:\d+)?(\/[^\s]*)?$/,
      "Invalid URL format"
    ),
  advType: z.enum(["promotion", "feature"]),
  advPosition: z.enum(["top", "bottom"]),
  isActive: isBooleanEnum.refine((val) => isBooleanEnum.options.includes(val)),
  isSubscribed: isBooleanEnum.refine((val) =>
    isBooleanEnum.options.includes(val)
  ),
  priority: z.coerce.number().gt(0),
});

export const UploadAdvertisementValidation = z.object({
  form_data: CreateAdvertisementValidation,
  file: uploadFileSchema,
});

export const UpdateAdvertisementFormData = z.object({
  advName: excludeSpecialCharacter
    .min(2, "Enter a string longer than 2 characters")
    .max(50, "Advertisement name can be upto 50 characters long.")
    .optional(),
  advRedirectLink: z
    .string()
    .min(2, "Enter a string longer than 2 characters")
    .regex(
      /^(https?:\/\/)(www\.)?([\w.-]+\.[a-zA-Z]{2,})(:\d+)?(\/[^\s]*)?$/,
      "Invalid URL format"
    )
    .optional(),
  advType: z.enum(["promotion", "feature"]).optional(),
  advPosition: z.enum(["top", "bottom"]).optional(),
  isActive: isBooleanEnum
    .refine((val) => isBooleanEnum.options.includes(val))
    .optional(),
  isSubscribed: isBooleanEnum
    .refine((val) => isBooleanEnum.options.includes(val))
    .optional(),
  priority: z.coerce.number().gt(0),
});

export const UpdateAdvertisementValidation = z.object({
  form_data: UpdateAdvertisementFormData.optional(),
  file: editFileSchemaValidation.optional(),
});

//FACILITIES
export const CreateFacilitiesValidation = z.object({
  file: uploadFileSchema,
  facPrimaryName: drNameValidation,
  facSecondaryName: drNameValidation.optional(),
  facPhoneNumber: z.coerce
    .string()
    .min(10, "Must be minimum 10 digit number")
    .max(11, "must be maximum 11 digit number"),
  facAddress: z
    .string()
    .trim()
    .min(2, "Enter a string longer than 2 characters")
    .max(200, "Address can be 200 characters long"),
  facPincode: z.string().regex(/^(\d{6}|\d{10})$/, {
    message: "Pincode must be either 6 or 10 digits long",
  }),
  facSpeciality: z
    .array(
      excludeSpecialCharacter
        .min(2, "Enter a string longer than 2 characters")
        .max(45, "speciality can be 45 characters long")
    )
    .max(10, "facility can have atmost 10 speciality")

    .default(["General"]),
  facType: z
    .string()
    .trim()
    .min(2, "Enter a string longer than 2 characters")
    .max(20, "Facility type can be 20 characters long"),
  isActive: z.enum(["true", "false"]).default("true"),
  additionalAddress: z.string()
    .trim()
    .min(2, "Enter a string longer than 2 characters")
    .max(200, "Address can be 200 characters long").optional(),
  openTime: z.string().regex(facTimeRegex, "Use format HH:MM AM/PM (e.g., 09:00 AM)").optional(),
  closeTime: z.string().regex(facTimeRegex, "Use format HH:MM AM/PM (e.g., 09:00 AM)").optional(),
}).refine(
  (data) => {
    const { openTime, closeTime, facType } = data;
    if ((facType == "doctor" || facType == "laboratory") && (!openTime || !closeTime)) return false
    return true
  },
  {
    message: "Opening and Closing time is required in case of doctor or laboratory",
    path: ["openTime"],
  }
).refine(
  (data) => {
    const { openTime, closeTime } = data;
    return facTimeToMinutes(openTime ?? "09:00 AM") < facTimeToMinutes(closeTime ?? "06:00 PM");
  },
  {
    message: "Closing time must be after opening time",
    path: ["closeTime"], // This puts the error on the closingTime field specifically
  }
);

export const UpdateFacilitiesValidation = z.object({
  id: z.number().positive(),
  file: editFileSchemaValidation.optional(),
  facPrimaryName: drNameValidation.optional(),
  facSecondaryName: drNameValidation.optional(),
  facPhoneNumber: z.coerce
    .string()
    .min(10, "Must be minimum 10 digit number")
    .max(11, "must be maximum 11 digit number")
    .optional(),
  facAddress: z
    .string()
    .trim()
    .min(2, "Enter a string longer than 2 characters")
    .max(200, "Address can be 200 characters long")
    .optional(),
  facPincode: z
    .string()
    .regex(/^(\d{6}|\d{10})$/, {
      message: "Pincode must be either 6 or 10 digits long",
    })
    .optional()
    .nullable(),
  facSpeciality: z
    .array(
      excludeSpecialCharacter
        .min(2, "Enter a string longer than 2 characters")
        .max(45, "speciality can be 45 characters long")
    )
    .max(10, "facility can have atmost 10 speciality")

    .optional(),
  facType: z
    .string()
    .trim()
    .min(2, "Enter a string longer than 2 characters")
    .max(20, "Facility type can be 20 characters long")
    .optional(),
  isActive: z.enum(["true", "false"]).default("true").optional(),
  additionalAddress: z.string()
    .trim()
    .min(2, "Enter a string longer than 2 characters")
    .max(200, "Address can be 200 characters long").optional(),
  openTime: z.string().regex(facTimeRegex, "Use format HH:MM AM/PM (e.g., 09:00 AM)").optional(),
  closeTime: z.string().regex(facTimeRegex, "Use format HH:MM AM/PM (e.g., 09:00 AM)").optional(),
}).refine(
  (data) => {
    const { openTime, closeTime, facType } = data;
    if ((facType == "doctor" || facType == "laboratory") && (!openTime || !closeTime)) return false
    return true
  },
  {
    message: "Opening and Closing time is required in case of doctor or laboratory",
    path: ["openTime"],
  }
).refine(
  (data) => {
    const { openTime, closeTime } = data;
    return facTimeToMinutes(openTime ?? "09:00 AM") < facTimeToMinutes(closeTime ?? "06:00 PM");
  },
  {
    message: "Closing time must be after opening time",
    path: ["closeTime"], // This puts the error on the closingTime field specifically
  }
);

export const DeleteBlogValidation = z.object({
  id: z
    .string()
    // .refine((val) => !isNaN(parseInt(val)), {
    //   message: 'Invalid blog id. It must be a numeric string.',
    // }),
    .refine((val) => /^\d+$/.test(val), {
      message: "Invalid blog id, Must be a numeric string",
    }),
});
export const CreateBlogValidation = z.object({
  file: uploadFileSchema,
  form_data: z.object({
    title: z.string().trim().min(1, "Title is required"),
    author: z.string().trim().min(1, "Author is required"),
    content: z.string().trim().min(1, "Content is required"),
    readTime: z
      .string()
      .trim()
      .refine((val) => /^\d+$/.test(val), {
        message: "readTime must be a numeric string",
      }),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(2, "Tag name should be atleast 2 characters long")
          .max(45, "Tag name should be less than 45 characters long")
      )
      .nonempty("At least one tag is required"),
  }),
});
export const UpdateBlogValidation = z.object({
  blogId: z.string().refine((val) => /^\d+$/.test(val), {
    message: "Invalid blog id, Must be a numeric string",
  }),
  form_data: z.object({
    title: z.string().trim().min(1, "Title is required").optional(),
    status: z.boolean().optional(),
    content: z.string().trim().min(1, "Content is required").optional(),
    readTime: z
      .string()
      .trim()
      .refine((val) => /^\d+$/.test(val), {
        message: "readTime must be a numeric string",
      })
      .optional(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(2, "Tag name should be atleast 2 characters long")
          .max(45, "Tag name should be less than 45 characters long")
      )
      .nonempty("At least one tag is required")
      .optional(),
  }),
  file: editFileSchemaValidation.optional(),
});
