import { PlanPeriod } from "../../prisma/generated/prisma/client";
import { handleError } from "./Error";

export const calculateBase64ImageSize = (base64String: string) => {
  // Remove the data URL prefix if present
  const base64Data = base64String.split(",")[1] || base64String;

  // Get the length of the Base64 string
  const length = base64Data.length;

  // Calculate padding (number of '=' at the end of the string)
  const padding = (base64Data.match(/=/g) || []).length;

  // Calculate the size in bytes
  const sizeInBytes = (length * 3) / 4 - padding;

  return sizeInBytes;
};

export const calculateStatistics = (
  period: PlanPeriod,
  interval: number,
  startDate?: Date
): Date => {
  try {
    const now = startDate ? new Date(startDate) : new Date(); // Current date or provided date
    const expiryDate = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    );
    switch (period) {
      case "weekly": {
        expiryDate.setDate(expiryDate.getDate() + interval * 7);
        expiryDate.setSeconds(-1);
        break;
      }
      case "monthly": {
        expiryDate.setMonth(expiryDate.getMonth() + interval);
        expiryDate.setSeconds(-1);
        break;
      }
      case "yearly": {
        expiryDate.setFullYear(expiryDate.getFullYear() + interval);
        expiryDate.setSeconds(-1);
        break;
      }
    }

    expiryDate.setUTCSeconds(expiryDate.getUTCSeconds() - 1 - 60 * 60 * 5.5);

    return expiryDate; // Return the calculated expiry date
  } catch (error: unknown) {
    throw handleError(error);
  }
};
