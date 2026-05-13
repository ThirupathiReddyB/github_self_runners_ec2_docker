import z from "zod";
import HTTPError from "./HttpError";
import fs from "fs";
import utils from "util";

export class Helpers {
  static validateWithZod<T>(schema: z.ZodSchema<T>, inputData: unknown): T {
    const validationResponse = schema.safeParse(inputData);

    if (!validationResponse.success) {
      const errorObj = validationResponse.error.issues
        .map((issue) => `${issue.path[0]}: ${issue.message}`)
        .join(" // ");
      throw new HTTPError(`Validation Errors:-> ${errorObj}`, 400);
    }
   

    return validationResponse.data;
  }
}

export const canonicalNameMapping = Object.freeze({
  family_care: "family_care",
  health_analysis: "health_analysis",
  video: "video",
  blog: "blog",
  story: "story",
  reel: "reel",
  sos: "sos",
  appointment_booking: "appointment_booking",
  discount_on_medicine: "discount_on_medicine",
  medicine_delivery: "medicine_delivery",
  insurance: "insurance",
  storage: "storage",
});

export const storageUnitMapping = Object.freeze({
  KB: "KB",
  MB: "MB",
  GB: "GB",
});

export const fieldErrors = (data: { fieldName: string; message: string }[]) => {
  const fieldErrors: { fieldName: string; message: string }[] = [];

  data.forEach((err) =>
    fieldErrors.push({
      fieldName: err.fieldName,
      message: err.message,
    })
  );

  return JSON.parse(JSON.stringify(fieldErrors));
};

export const unlinkFile = utils.promisify(fs.unlink);
