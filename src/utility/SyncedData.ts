import prisma from "../prisma";
import { IRecordData, ISyncChangesDataType } from "./DataTypes/types.user";
import dotenv from "dotenv";
import HTTPError from "./HttpError";

dotenv.config();

async function getRecordData(
  record: ISyncChangesDataType
): Promise<IRecordData | null> {
  const modelKey: keyof typeof prisma = process.env[
    record.table
  ] as keyof typeof prisma;
  const id =
    record.table !== "U6" && record.table !== "D7"
      ? parseInt(record.recordId)
      : record.recordId;

  const findRecordData = await (prisma[modelKey] as any).findFirst({
    where: { id },
  });
  if (!findRecordData) return null;

  if (record.table === "U6") {
    const { password, refreshToken, currentSessionId, ...filteredData } =
      findRecordData;
    return {
      change: record.changeType,
      id: record.recordId,
      table: record.table,
      data: filteredData,
    };
  }

  if (record.table === "V5") {
    const [syncData, vitalRecordData] = await Promise.all([
      prisma.vitalSync.findMany({ where: { userId: record.userChanged } }),
      prisma.vitalsUserData.findMany({
        where: { id: parseInt(record.recordId) },
      }),
    ]);

    const result = vitalRecordData.map((vital) => {
      const sync = syncData.find(
        (s) =>
          (s.userId === vital.forUserId || s.userId === vital.forDependantId) &&
          s.vitalCodeId === vital.vitalCodeId
      );

      return { ...vital, lastSync: sync?.lastSync ?? null };
    });

    return {
      change: record.changeType,
      id: record.recordId,
      table: record.table,
      data: result,
    };
  }

  return {
    change: record.changeType,
    id: record.recordId,
    table: record.table,
    data: findRecordData,
  };
}

export const getUpdatedData = async (records: ISyncChangesDataType[]) => {
  try {
    const data: IRecordData[] = [];

    for (const record of records) {
      if (record.changeType === "delete") {
        data.push({
          change: record.changeType,
          id: record.recordId,
          table: record.table,
          data: null,
        });
        continue;
      }

      const recordData = await getRecordData(record);
      if (recordData) data.push(recordData);
    }

    return {
      success: true,
      Data: data,
    };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

export const updateSyncChanges = async (
  linkToParent: string | null,
  userId: string
) => {
  const user = await prisma.users.update({
    where: {
      id: linkToParent?.toLowerCase() ?? userId.toLowerCase(),
    },
    data: {
      isSync: false,
    },
  });
  if (!user) throw new HTTPError("Could not update sync changes", 500);

  return user;
};
