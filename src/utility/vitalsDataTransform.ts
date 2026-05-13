
import { Prisma } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";
import { IUserVitalDataEntry } from "./DataTypes/types.vitals";

type VitalData = {
  vitalRecordData: Prisma.JsonValue;
  recordedOn: Date;
};

export const groupVitalDataByField = (
  userVitalData: IUserVitalDataEntry[]
): { [key: string]: any[] } => {
  const groupedData: { [key: string]: any[] } = {};

  userVitalData.forEach((entry) => {
    const { vitalRecordData } = entry;

    // Ensure vitalRecordData is a JsonObject
    if (isJsonObject(vitalRecordData)) {
      Object.keys(vitalRecordData).forEach((field) => {
        const value = vitalRecordData[field];
        if (!groupedData[field]) {
          groupedData[field] = [];
        }
        groupedData[field].push(value);
        // }
      });
    }
  });

  return groupedData;
};

// Type guard to check if a value is a JsonObject
export const isJsonObject = (
  value: Prisma.JsonValue
): value is Prisma.JsonObject => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const cycleDays = (date1: string, date2: string) => {
  // Convert strings to Date objects
  const dateObj1 = new Date(date1);
  const dateObj2 = new Date(date2);
  const differenceInMillis = dateObj2.getTime() - dateObj1.getTime();

  // Convert milliseconds to days
  const difference = differenceInMillis / (1000 * 60 * 60 * 24);

  return difference;
};

export const getLatestData = async (
  vitalCode: string,
  userId: string,
  link?: string
) => {
  const data: VitalData | null = await prisma.vitalsUserData.findFirst({
    where: {
      ...(link === "minor" 
        ? {
            forDependantId: userId,
          }
        : { forUserId: userId }),
      vitalCodeId: vitalCode,
    },
    orderBy: {
      recordedOn: "desc",
    },
    // select: {
    //   vitalRecordData: true,
    //   recordedOn: true,
    // },
  });
  if (data === null)
    return {
      vitalCodeId: vitalCode,
      vitalRecordData: null,
      recordedOn: null,
    };
  else return data;
};
