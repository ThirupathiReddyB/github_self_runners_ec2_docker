import { Familylinks, VitalModule, VitalsUserData } from "../../../prisma/generated/prisma/client";
import HTTPError from "../HttpError";
import { getValidModules } from "../ValidVitalModules";
import { getLatestData } from "../vitalsDataTransform";
import prisma from "../../prisma";
import {
  checkIfUserOrDependant,
  determineUserForSyncChanges,
} from "../familyLinkData";
import { trackChanges } from "../changeHistoryTrackFunction";
import {
  IAddVitalRecord,
  IBloodOxygenData,
  IBpData,
  IHeartRateData,
} from "../DataTypes/types.vitals";
import {
  createNewVitalRecords,
  fetchDependant,
  fetchUserFirst,
} from "../prismaQueries";
import { validateGenderSpecificRecords } from "../genderSpecificTest";
import { normalizeId } from "../UserId";
import { handleError } from "../Error";
import { drawTable } from "../drawTable";
import { PDFDocument, PDFFont, PDFPage } from "pdf-lib";
import { formatDateTime } from "../DateTimeFormatters";

export const fetchAndValidateModules = async (
  user: any,
  searchFilter: Array<{}>
) => {
  const validModules = await getValidModules(user, searchFilter);
  if (!validModules)
    throw new HTTPError(
      "Could not find any self-awareness modules for this user",
      404
    );
  return validModules;
};

export const fetchLatestVitalData = async (
  validModules: VitalModule[],
  userId: string,
  type: string
) => {
  const results = [];
  for (const module of validModules) {
    const record = await getLatestData(module.vitalCode, userId, type);
    if (!record) throw new HTTPError("No data", 404);
    results.push(record);
  }
  return results;
};

export const deleteVitalRecords = async (
  userId: string,
  deleteRecord: string[],
  linkData: Familylinks | null,
  isMinorChangedBySecondaryParent: boolean,
  famCareMemberId?: string
) => {
  let deletedRecords: Array<number> = [];
  const convertedIds = deleteRecord?.map((id) => {
    return parseInt(id);
  });
  const checkModuleIsPeriod = await prisma.vitalsUserData.findMany({
    where: {
      AND: [
        {
          id: {
            in: deleteRecord.map((id) => parseInt(id)),
          },
        },
        {
          NOT: { vitalCodeId: "period01" },
        },
      ],
    },
  });
  if (checkModuleIsPeriod.length > 0) {
    throw new HTTPError(
      `the module u are trying to delete is not a period record ${checkModuleIsPeriod.map(
        (item) => {
          return item.id;
        }
      )}`,
      404
    );
  }

  let vitalWhereCondition;

  vitalWhereCondition = checkIfUserOrDependant(
    linkData,
    userId,
    famCareMemberId?.toString()
  );
  const checkModuleExist = await prisma.vitalsUserData.findMany({
    where: {
      id: {
        in: convertedIds,
      },
      vitalCodeId: "period01",
      ...vitalWhereCondition,
    },
  });
  // Filter the records that exist in `checkModuleExist` and match the IDs to delete
  checkModuleExist.forEach((record) => {
    if (deleteRecord.includes(record.id.toString())) {
      deletedRecords.push(record.id); // Push the matching record into `deletedRecord`
    }
  });

  vitalWhereCondition = checkIfUserOrDependant(
    linkData,
    userId,
    famCareMemberId?.toString()
  );
  const deleteVitalRecord = await prisma.vitalsUserData.deleteMany({
    where: {
      id: {
        in: convertedIds,
      },
      vitalCodeId: "period01",
      ...vitalWhereCondition,
    },
  });
  if (!deleteVitalRecord) {
    throw new HTTPError("Could not delete vital record", 500);
  }
  if (famCareMemberId) {
    for (const item of deletedRecords) {
      await determineUserForSyncChanges(
        linkData,
        userId,
        item,
        isMinorChangedBySecondaryParent,
        famCareMemberId,
        "delete",
        "V5"
      );
    }
  }

  if (!famCareMemberId) {
    for (const item of deletedRecords) {
      await trackChanges(userId, "delete", item, "V5", userId, false);
    }
  }
  return deletedRecords;
};

export const createVitalRecords = async (
  input: IAddVitalRecord,
  linkData: Familylinks | null,
  isMinorChangedBySecondaryParent: boolean
) => {
  const { userId, vitalCode, famCareMemberId } = input;

  let newVitalRecords: VitalsUserData[] | null = null;

  //find vital module
  const foundModule = await prisma.vitalModule.findMany({
    where: {
      vitalCode,
    },
  });

  if (!foundModule) {
    throw new HTTPError(`vital code not found`, 404);
  }

  //if familyMember is male, should not allow period record

  let findFam = null;
  const famCareId = normalizeId(famCareMemberId);

  if (famCareId) {
    const isMinor =
      linkData?.linkType === "minor" || linkData?.linkType === "sharedMinor";
    findFam = isMinor
      ? await fetchDependant(famCareId.toString().toLowerCase())
      : await fetchUserFirst(famCareId.toString().toLowerCase());
  } else {
    findFam = await fetchUserFirst(userId);
  }

  if (!findFam) {
    throw new HTTPError(`family member / user not found`, 404);
  }

  //period vital should not be added for male users
  validateGenderSpecificRecords(findFam.gender, vitalCode);

  //insert record in db
  newVitalRecords = await createNewVitalRecords(input, linkData);

  //sync changes for connected members
  for (const record of newVitalRecords) {
    const changeHistory = await trackChanges(
      userId,
      "create",
      record.id,
      "V5",
      userId,
      isMinorChangedBySecondaryParent
    );
    if (!changeHistory.success)
      throw new HTTPError("Could not track change", 204);
  }
  return newVitalRecords;
};

export const templateFormattedRows = async (
  choice: string,
  data: any,
  pdfDoc: PDFDocument,
  height: number,
  font: PDFFont,
  page: PDFPage
) => {
  try {
    let rows = [];

    switch (choice) {
      case "bp03":
        rows = data.map((row: IBpData, i: number) => {
          const recordedOn = formatDateTime(row.recordedOn)
          const [date, time] = recordedOn.split(", ");
          return [
            (i + 1).toString(),
            date,
            time,
            row.vitalRecordData.systolic.toString(),
            row.vitalRecordData.diastolic.toString(),
            "mmHg",
          ];
        });

        drawTable(
          pdfDoc,
          font,
          25,
          height - 230,
          30,
          [50, 100, 100, 100, 100, 100],
          ["Sr.No.", "Date", "Time", "Systolic", "Diastolic", "Unit"],
          [],
          rows,
          page
        );
        break;

      case "glucoseInsuline":
        rows = await getInsulineGlucoseData(data);

        drawTable(
          pdfDoc,
          font,
          25, // startX
          height - 230, // startY
          24, // rowHeight
          [120, 60, 60, 50, 120, 70, 80], // colWidths
          [
            "Date & Time",
            "Category",
            "Unit",
            "Type",
            "Date & Time",
            "Category",
            "Unit",
          ],
          [
            { header: "Insulin", span: 4, startColumn: 0 },
            { header: "Blood Glucose", span: 3, startColumn: 4 },
          ],
          rows,
          page
        );
        break;
      case "hr07":
        rows = data.map((row: IHeartRateData, i: number) => {
          const recordedOn = formatDateTime(row.recordedOn)
          const [date, time] = recordedOn.split(", ");
          return [
            (i + 1).toString(),
            date,
            time,
            row.vitalRecordData.bpm.toString(),
            "bpm",
          ];
        });

        drawTable(
          pdfDoc,
          font,
          25,
          height - 230,
          30,
          [50, 130, 130, 120, 120],
          ["Sr.No.", "Date", "Time", "Reported Value", "Unit"],
          [],
          rows,
          page
        );
        break;

      case "bo08":
        rows = data.map((row: IBloodOxygenData, i: number) => {
          const recordedOn = formatDateTime(row.recordedOn)
          const [date, time] = recordedOn.split(", ");
          return [
            (i + 1).toString(),
            date,
            time,
            row.vitalRecordData.percent.toString(),
            "percent",
          ];
        });

        drawTable(
          pdfDoc,
          font,
          25,
          height - 230,
          30,
          [50, 130, 130, 120, 120],
          ["Sr.No.", "Date", "Time", "Reported Value", "Unit"],
          [],
          rows,
          page
        );
        break;

      default:
        console.warn("Invalid Vital Type");
    }
  } catch (err) {
    throw new Error(`PDF Generation Error: ${err}`);
  }
};

const getInsulineGlucoseData = async (data: any) => {
  try {
    const insulineData = data.filter(
      (item: any) => item.vitalCodeId === "insuline06"
    );
    const glucoseData = data.filter((item: any) => item.vitalCodeId === "bg04");

    const getDate = async (item: any) => {
      return new Date(item.recordedOn).toISOString().split("T")[0];
    };
    const insulineDataByDate: Record<
      string,
      Array<{ [key: string]: any }>
    > = {};
    for (const item of insulineData) {
      const date = await getDate(item);
      if (!insulineDataByDate[date]) {
        insulineDataByDate[date] = [];
      }
      insulineDataByDate[date].push(item);
    }
    const glucoseDataByDate: Record<string, Array<{ [key: string]: any }>> = {};
    for (const item of glucoseData) {
      const date = await getDate(item);
      if (!glucoseDataByDate[date]) {
        glucoseDataByDate[date] = [];
      }
      glucoseDataByDate[date].push(item);
    }

    const getUniqueDates = Array.from(
      new Set([
        ...Object.keys(insulineDataByDate),
        ...Object.keys(glucoseDataByDate),
      ])
    ).sort((a, b) => a.localeCompare(b));
    const finalResult = buildFinalResult(
      getUniqueDates,
      insulineDataByDate,
      glucoseDataByDate
    );

    return finalResult;
  } catch (err) {
    throw handleError(err);
  }
};

const buildFinalResult = (
  dates: string[],
  insulineDataByDate: Record<string, any[]>,
  glucoseDataByDate: Record<string, any[]>
) => {
  const result: any[] = [];

  for (const date of dates) {
    const insulines = insulineDataByDate[date] || [];
    const glucoses = glucoseDataByDate[date] || [];

    const maxLength = Math.max(insulines.length, glucoses.length);
    for (let i = 0; i < maxLength; i++) {
      const insuline = insulines[i] ?? {};
      const glucose = glucoses[i] ?? {};
      const insulineData = insuline.vitalRecordData ?? {};
      const glucoseData = glucose.vitalRecordData ?? {};

      result.push([
        formatDateTime(insuline.recordedOn),
        insulineData.insulineType ?? "-",
        insulineData.insulineReading
          ? `${insulineData.insulineReading}`
          : "-",
        insulineData.insulineUnit?.toString() ?? "-",
        formatDateTime(glucose.recordedOn),
        glucoseData.category ?? "-",
        glucoseData.glucoseReading?.toString()
          ? `${glucoseData.glucoseReading} mg/dl`
          : "-",
      ]);
    }
  }

  return result;
};
