import { ParsedQs } from "qs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  IAddVitalRecord,
  IGetVitalRecords,
  IUpdateVitalModule,
  IVitalModule,
  IVitalsRecordsData,
} from "../utility/DataTypes/types.vitals";
import HTTPError from "../utility/HttpError";
import {
  checkUserLinkAndManageAccess,
  familyLink,
} from "../utility/familyLinkData";
import prisma from "../prisma";
import {
  trackActiveSession,
  trackChanges,
} from "../utility/changeHistoryTrackFunction";
import { ITokenData } from "../utility/DataTypes/types.user";
import { Familylinks, VitalsUserData, vitalSync } from "../../prisma/generated/prisma/client";
import {
  formatDateForDB,
  getFirstDayOfCurrentYear,
} from "../utility/DateTimeFormatters";
import { adminTokenData } from "../utility/DataTypes/types.admin";
import { filterRecords } from "../utility/RecordList";
import { handleError } from "../utility/Error";
import {
  createVitalRecords,
  deleteVitalRecords,
  fetchAndValidateModules,
  fetchLatestVitalData,
  templateFormattedRows,
} from "../utility/helperFunction/vitals.services.helper";
import { fetchUserUnique } from "../utility/prismaQueries";
import path from "path";

import { IGetCommon } from "../utility/DataTypes/types.common";

import fs from "fs";
import { drawTable } from "../utility/drawTable";
//VITALS - MODULES //!ADMIN FUNCTIONS
export const addNewVitalModule = async (
  data: IVitalModule[],
  user: adminTokenData
) => {
  try {
    const newData = data.map((item: any) => ({
      ...item,
      updatedBy: user.emailId,
    }));

    const vitalCode = newData.map((item: any) => {
      return item.vitalCode;
    });

    const findVitalCode = await prisma.vitalModule.findMany({
      where: {
        vitalCode: {
          in: vitalCode,
        },
      },
    });
    const alreadyExistVitalCode = findVitalCode.map((item) => {
      return item.vitalCode;
    });
    if (findVitalCode.length > 0) {
      throw new HTTPError(
        `Vital Code ${alreadyExistVitalCode} already exists,please add all the vital(s) records again`,
        422
      );
    }

    const newVitalModule = await prisma.vitalModule.createMany({
      data: newData,
    });
    if (!newVitalModule)
      throw new HTTPError("Could Not Add new self-awareness module", 500);

    return {
      success: true,
      message: "New self-awareness module added successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getVitalModules = async (queryParams: IGetCommon) => {
  try {
    const { id, search, page, limit } = queryParams;

    const filters: any = {};
    const searchFilter: Array<{}> = [];

    if (id) {
      filters.id = id;
    }
    if (search) {
      searchFilter.push(
        { vitalName: { contains: search, mode: "insensitive" } },
        { vitalCode: { contains: search, mode: "insensitive" } }
      );
    }
    const modules = await prisma.vitalModule.findMany({
      where: {
        AND: [filters],
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
      skip: page && limit ? (page - 1) * limit : 0,
      take: limit,
    });
    if (!modules) throw new HTTPError("Could not fetch modules", 404);

    return {
      success: true,
      data: modules,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const editVitalModuleById = async (
  data: IUpdateVitalModule,
  moduleId: string
) => {
  try {
    const { vitalName, vitalDataStructure, filters, vitalCode } = data;
    const findvitalModule = await prisma.vitalModule.findFirst({
      where: {
        vitalCode,
        NOT: {
          id: parseInt(moduleId),
        },
      },
    });
    if (findvitalModule) {
      throw new HTTPError("Vital Module already exists", 500);
    }
    const newVitalModule = await prisma.vitalModule.update({
      where: {
        id: parseInt(moduleId),
      },
      data: {
        vitalName,
        vitalCode,
        vitalDataStructure,
        filters,
      },
    });
    if (!newVitalModule)
      throw new HTTPError("Could Not Add new self-awareness module", 500);

    return {
      success: true,
      message: "New self-awareness module added successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const deleteVitalModule = async (queryParams: any) => {
  try {
    let vitalsId: Array<number> = [];
    const { id } = queryParams;
    if (!id) {
      throw new HTTPError("provide the id of the note to be deleted", 422);
    }

    if (!Array.isArray(id)) {
      vitalsId = id.split(",").map((item: string) => {
        return parseInt(item);
      });
    }

    // Fetch the vital modules to delete
    const find_modules = await prisma.vitalModule.findMany({
      where: {
        id: {
          in: vitalsId,
        },
      },
    });

    if (!find_modules || find_modules.length != vitalsId.length) {
      throw new HTTPError("Module to be deleted not found", 404);
    }

    const deletedRecords = find_modules.map((module) => module.id);

    const delete_modules = await prisma.vitalModule.deleteMany({
      where: {
        id: {
          in: vitalsId,
        },
      },
    });
    if (!delete_modules?.count) {
      throw new HTTPError("Module could not be deleted", 500);
    }

    //find successfull and failed records:
    const failedRecords = await filterRecords(deletedRecords, vitalsId);
    return {
      success: true,
      message: "self-awareness module deleted successfully",
      successfullyDeleted: deletedRecords,
      failed: failedRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

// // export const notePeriodRecord = async (
// //   input: AddVitalRecord,
// //   { famCareMemberId }: ParsedQs
// // ) => {
// //   try {
// //     const { userId, vitalCode, vitalData, recordedOn } = input;

// //       newVitalRecord = await prisma.vitalsUserData.create({
// //         data: {
// //           vitalRecordData: newVitalData,
// //           recordedOn: recordedOn,
// //           createdBy: userId,
// //           VitalModule: {
// //             connect: {
// //               vitalCode: vitalCode,
// //             },
// //           },
// //           ...(linkData.linkType === "minor"
// //             ? {
// //                 dependant: {
// //                   connect: {
// //                     id: (famCareMemberId as string)?.toLowerCase(),
// //                   },
// //                 },
// //               }
// //             : {
// //                 user: {
// //                   connect: {
// //                     id: (famCareMemberId as string)?.toLowerCase(),
// //                   },
// //                 },
// //               }),
// //         },
// //       });
// //       //track changes (only for linked user / subaccount user)
// //       if (linkData.linkType != "minor") {
// //         const changeHistory = await trackChanges(
// //           (famCareMemberId as string)?.toLowerCase(),
// //           "CREATE",
// //           newVitalRecord.id,
// //           "V5",
// //           userId
// //         );
// //         if (!changeHistory.success)
// //           throw new HTTPError("Could not track change", 204);
// //       }
// //     } else {
// //       //find last period record stored in Database
// //       const lastPeriodRecord = await prisma.vitalsUserData.findFirst({
// //         where: {
// //           forUserId: userId,
// //           vitalCodeId: vitalCode,
// //         },
// //         orderBy: {
// //           createdAt: "desc",
// //         },
// //       });

// //       newVitalRecord = await prisma.vitalsUserData.create({
// //         data: {
// //           vitalRecordData: newVitalData,
// //           recordedOn: recordedOn,
// //           VitalModule: {
// //             connect: {
// //               vitalCode: vitalCode,
// //             },
// //           },
// //           user: {
// //             connect: {
// //               id: userId,
// //             },
// //           },
// //         },
// //       });
// //       if (!newVitalRecord)
// //         throw new HTTPError("Could Not Add period data", 403);
// //       const changeHistory = await trackChanges(
// //         userId,
// //         "CREATE",
// //         newVitalRecord.id,
// //         "V5",
// //         userId
// //       );
// //       if (!changeHistory.success)
// //         throw new HTTPError("Could not track change", 204);
// //     }
// //     const updateActiveSession = trackActiveSession(userId);
// //     if (!updateActiveSession) {
// //       throw new HTTPError("Could not update active session", 204);
// //     }
// //     return {
// //       success: true,
// //       vitalData: newVitalRecord,
// //     };
// //   } catch (error: HTTPError | Error | any) {
// //     console.log("Error->Log:", error);
// //     if (error instanceof HTTPError) {
// //       throw new HTTPError(error.message, error.code);
// //     } else {
// //       if (error.name == "PrismaClientKnownRequestError")
// //         throw new HTTPError("Prisma Client error", 500);
// //       throw new HTTPError(error.name, 500);
// //     }
// //   }
// // };

// export const getVitalRecordsOfUser = async (
//   input: IVitalRecordInput,
//   { famCareMemberId, startDate, endDate, codeId }: ParsedQs
// ) => {
//   try {
//     const { userId } = input;
//     //get vitalModule datastructure
//     // const moduleDS = await prisma.vitalModule.findMany({
//     //   where: {
//     //     AND:[filters],
//     //   },
//     //   select: {
//     //     id: true,
//     //     vitalName: true,
//     //     vitalCode: true,
//     //     vitalDataStructure: true,
//     //   },
//     // });

//! not in use
export const deleteVitalsRecords = async (
  data: IVitalsRecordsData,
  famCareMemberId: string | undefined
) => {
  try {
    const { vitalId, userId } = data;
    const vitals = vitalId.split(",").map(Number);

    //find records(s)
    const findVitalRecords = await prisma.vitalsUserData.findMany({
      where: {
        id: {
          in: vitals.map((vital) => vital),
        },
        AND: [
          {
            forUserId: famCareMemberId ? famCareMemberId.toLowerCase() : userId,
          },
          { forDependantId: (famCareMemberId as string)?.toLowerCase() },
        ],
      },
    });
    if (!findVitalRecords || findVitalRecords.length != vitals.length)
      throw new HTTPError("Could not find record(s) for user", 404);
    const deletedRecords = findVitalRecords.map((record) => record.id);

    let deletedVitalRecords;

    if (famCareMemberId) {
      let familyLinkData = await familyLink(
        userId,
        famCareMemberId.toLowerCase()
      );
      let linkData = familyLinkData.linkData;

      //check access types for family care except minor
      if (linkData.linkType != "minor" && linkData.linkType != "sharedMinor") {
        familyLinkData = await familyLink(
          famCareMemberId.toLowerCase(),
          userId
        );
        linkData = familyLinkData.linkData;
      }
      if (linkData.accessType == "view")
        throw new HTTPError("You are not authorised to make this change", 401);

      deletedVitalRecords = await prisma.vitalsUserData.deleteMany({
        where: {
          id: {
            in: findVitalRecords.map((vital) => vital.id),
          },
          ...(linkData.linkType === "minor" ||
            linkData.linkType === "sharedMinor"
            ? {
              forDependantId: famCareMemberId.toLowerCase(),
            }
            : {
              forUserId: famCareMemberId.toLowerCase(),
            }),
        },
      });

      const changes = findVitalRecords.map(async (vital) => {
        if (linkData.linkType != "minor") {
          const changeHistory = await trackChanges(
            famCareMemberId.toLowerCase(),
            "delete",
            vital.id,
            "A1",
            userId,
            false
          );
          if (!changeHistory.success)
            throw new HTTPError("Could not track change", 612);
        }
      });
      if (!changes) throw new HTTPError("Could not record changes made", 500);
    } else {
      deletedVitalRecords = await prisma.vitalsUserData.deleteMany({
        where: {
          id: {
            in: findVitalRecords.map((vital) => vital.id),
          },
          forUserId: userId,
        },
      });
    }
    if (!deletedVitalRecords)
      throw new HTTPError("Could Not delete Vital Record(s)", 500);
    await trackActiveSession(userId);

    //find successfull and failed records:
    const failedRecords = await filterRecords(deletedRecords, vitals);
    return {
      success: true,
      message: "Vital Record(s) were deleted successfully",
      successfullyDeleted: deletedRecords,
      failed: failedRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const downloadReportById = async (
  userId: string,
  data: { vitalModuleCode: Array<string>; famCareMemberId?: string }
) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const { vitalModuleCode, famCareMemberId } = data;

    const vitalModuleDetails = await prisma.vitalModule.findMany({
      where: {
        vitalCode: { in: vitalModuleCode },
      },
    });
    if (vitalModuleDetails.length != vitalModuleCode.length) {
      throw new HTTPError("Vital Module not found", 404);
    }

    const [profile, user] = await Promise.all([
      await prisma.profile.findMany({
        select: {
          companyLogo: true,
        },
      }),
      await prisma.users.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          fullName: true,
          dob: true,
          gender: true,
          healthRecord: true,
        },
      }),
    ]);

    if (!profile.length || !user?.healthRecord) {
      throw new HTTPError("Company logo or user health record not found", 404);
    }

    let fetchedVitalData;
    let familyMemberData;
    if (famCareMemberId) {
      let familyLinkData = await familyLink(
        userId,
        famCareMemberId.toLowerCase()
      );
      let linkData = familyLinkData.linkData;

      //check access types for family care except minor
      if (linkData.linkType != "minor" && linkData.linkType != "sharedMinor") {
        familyLinkData = await familyLink(
          famCareMemberId.toLowerCase(),
          userId
        );
        linkData = familyLinkData.linkData;
      }

      familyMemberData = linkData.linkType === "minor" ||
        linkData.linkType === "sharedMinor"
        ? await prisma.dependant.findUnique({
          where: { id: famCareMemberId?.toLowerCase() }, include: { healthRecord: true }
        })
        : await prisma.users.findUnique({
          where: { id: famCareMemberId?.toLowerCase() }, include: { healthRecord: true }
        });

      fetchedVitalData = await prisma.vitalsUserData.findMany({
        where: {
          vitalCodeId: { in: vitalModuleCode },
          recordedOn: {
            gte: threeMonthsAgo,
          },
          ...(linkData.linkType === "minor" ||
            linkData.linkType === "sharedMinor"
            ? {
              forDependantId: famCareMemberId.toLowerCase(),
            }
            : {
              forUserId: famCareMemberId.toLowerCase(),
            }),
        },
        orderBy: {
          recordedOn: "desc",
        },
      });
    } else {
      fetchedVitalData = await prisma.vitalsUserData.findMany({
        where: {
          forUserId: userId,
          vitalCodeId: { in: vitalModuleCode },
          recordedOn: {
            gte: threeMonthsAgo,
          },
        },
        orderBy: {
          recordedOn: "desc",
        },
      });
    }
    if (famCareMemberId && !familyMemberData) throw new HTTPError("Couldn't fetch family member data", 400)
    if (!fetchedVitalData.length) {
      throw new HTTPError(
        "No record found for vitals . please try downloading after adding the record",
        404
      );
    }
    const code = vitalModuleCode.every((code) =>
      ["bg04", "insuline06"].includes(code)
    )
      ? "glucoseInsuline"
      : vitalModuleCode[0];
    const vitalName = vitalModuleCode.every((code) =>
      ["bg04", "insuline06"].includes(code)
    )
      ? "Blood Glucose and Insuline"
      : vitalModuleDetails[0].vitalName;
    const pdfDoc = await PDFDocument.create(); //create pdf
    let page = pdfDoc.addPage([600, 800]); //add page in pdf and set size
    const { width, height } = page.getSize(); //get size of page

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica); //set font

    //fetch logo in buffer format
    const res = await fetch(profile[0].companyLogo);
    const buffer = await res.arrayBuffer();
    const logoImage = await pdfDoc.embedPng(new Uint8Array(buffer));

    page.drawImage(logoImage, {
      x: 15,
      y: height - 100,
      width: 170,
      height: 90,
    });

    page.drawText(`UID:`, {
      x: width - 125,
      y: height - 70,
      font,
      size: 14,
      color: rgb(116 / 255, 116 / 255, 116 / 255),
    });

    page.drawText(`${famCareMemberId ? famCareMemberId.toUpperCase() : user.id.toUpperCase()}`, {
      x: width - 95,
      y: height - 70,
      font,
      size: 14,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: 20, y: height - 100 },
      end: { x: width - 20, y: height - 100 },
      thickness: 1,
      color: rgb(116 / 255, 116 / 255, 116 / 255),
      opacity: 1,
    });

    page.drawText(`${famCareMemberId ? familyMemberData?.fullName : user.fullName}`, {
      x: 25,
      y: height - 135,
      font,
      size: 16,
    });
    page.drawText(`Download Date:`, {
      x: width - 200,
      y: height - 135,
      font,
      size: 14,
      color: rgb(116 / 255, 116 / 255, 116 / 255),
    });
    const date = new Date();
    page.drawText(
      `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`,
      {
        x: width - 95,
        y: height - 135,
        font,
        size: 14,
        color: rgb(0, 0, 0),
      }
    );

    const userDOB = famCareMemberId && familyMemberData ? familyMemberData.dob : user.dob;
    const userGender = famCareMemberId && familyMemberData ? familyMemberData.gender : user.gender;
    const userBloodGroup = famCareMemberId && familyMemberData ? familyMemberData.healthRecord?.bloodGroup : user.healthRecord.bloodGroup;

    const today = new Date();
    let userAge = today.getFullYear() - userDOB.getFullYear();
    const m = today.getMonth() - userDOB.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < userDOB.getDate())) {
      userAge--;
    }

    page.drawText(
      `${userAge} years / ${userGender} / ${userBloodGroup?.toUpperCase()}`,
      {
        x: 25,
        y: height - 160,
        font,
        size: 14,
        color: rgb(116 / 255, 116 / 255, 116 / 255),
      }
    );

    page.drawText(`Vital:`, {
      x: 25,
      y: height - 200,
      font,
      size: 14,
      color: rgb(116 / 255, 116 / 255, 116 / 255),
    });
    page.drawText(`${vitalName}`, {
      x: 60,
      y: height - 200,
      font,
      size: 14,
      color: rgb(0, 0, 0),
    });
    page.drawText(`Duration:`, {
      x: width - 140,
      y: height - 200,
      font,
      size: 14,
      color: rgb(116 / 255, 116 / 255, 116 / 255),
    });

    page.drawText(`3 Months`, {
      x: width - 80,
      y: height - 200,
      font,
      size: 14,
      color: rgb(0, 0, 0),
    });

    await templateFormattedRows(
      code,
      fetchedVitalData,
      pdfDoc,
      height,
      font,
      page
    );

    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join(
      //  path.resolve(__dirname, "../../../"),
      //  `src/uploads/vitalReport_${Date.now()}.pdf`
      __dirname,
      `../uploads/vitalReport_${Date.now()}.pdf`
    );
    await fs.promises.writeFile(outputPath, pdfBytes);

    return { filepath: outputPath };
  } catch (err) {
    throw handleError(err);
  }
};

export const downloadReportByIdTest = async () => {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const res = await fetch("demo");
    const buffer = await res.arrayBuffer();
    const logoImage = await pdfDoc.embedPng(new Uint8Array(buffer));

    // Logo
    page.drawImage(logoImage, {
      x: 15,
      y: height - 100,
      width: 100,
      height: 90,
    });

    // UID (aligned with logo)
    page.drawText(`UID: 122445`, {
      x: width - 115,
      y: height - 60,
      font,
      size: 12,
    });

    // Name and other info
    page.drawText(`Marufa Mukadam`, {
      x: 50,
      y: height - 180,
      font,
      size: 16,
    });
    page.drawText(`Download date: 12-1-25`, {
      x: 50,
      y: height - 200,
      font,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(`25 years / Female / B+`, {
      x: 50,
      y: height - 220,
      font,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(`Vital: Blood pressure`, {
      x: 50,
      y: height - 240,
      font,
      size: 12,
    });
    page.drawText(`Duration: 3 Months`, {
      x: 50,
      y: height - 260,
      font,
      size: 12,
    });

    const tableRows = [...Array(50)].map(() => ({
      date: "11-1-25",
      time: "10:00 AM",
      systolic: "120",
      diastolic: "80",
    }));

    drawTable(
      pdfDoc,
      font,
      50,
      height - 300,
      24,
      [50, 100, 100, 100, 100, 50],
      ["Sr.No.", "Date", "Time", "Systolic", "Diastolic", "Unit"],
      [],
      tableRows.map((row, i) => [
        (i + 1).toString(),
        row.date,
        row.time,
        row.systolic,
        row.diastolic,
        "mmHg",
      ]),
      page
    );

    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join(__dirname, "../uploads/vitalReport.pdf");
    await fs.promises.writeFile(outputPath, pdfBytes);

    return { filepath: outputPath };
  } catch (err) {
    throw handleError(err);
  }
};

/////////////////////////////////////////////////////////////////////////////////////////
//VITALS - USER DATA
export const addNewVitalRecord = async (input: IAddVitalRecord) => {
  try {
    const { userId, recordData, famCareMemberId, deletePeriodRecord } = input;
    let newVitalRecords: Array<object> = [];
    let linkData: Familylinks | null = null;
    const deleteRecord = deletePeriodRecord?.toString().split(",");
    let deletedRecords: Array<number> = [];
    let isMinorChangedBySecondaryParent: boolean = false;
    const getVitalModule = await prisma.vitalModule.findUnique({
      where: {
        vitalCode: input.vitalCode,
      },
    });
    if (!getVitalModule) {
      throw new HTTPError("Vital Module Not Found", 404);
    }
    if (famCareMemberId) {
      const response = await checkUserLinkAndManageAccess(
        userId,
        famCareMemberId?.toLowerCase()
      );
      linkData = response.linkData;
      isMinorChangedBySecondaryParent =
        response.isMinorChangedBySecondaryParent;
    }

    if (deleteRecord) {
      deletedRecords = await deleteVitalRecords(
        userId,
        deleteRecord,
        linkData,
        isMinorChangedBySecondaryParent,
        famCareMemberId
      );
    }

    if (recordData.length) {
      newVitalRecords = await createVitalRecords(
        input,
        linkData,
        isMinorChangedBySecondaryParent
      );
    }
    await trackActiveSession(userId);

    return {
      success: true,

      deletedRecords,
      V5: newVitalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getVitalRecordsOfUser = async (
  userId: string,
  queryParams: IGetVitalRecords
) => {
  try {
    //get vitalModule datastructure
    // const moduleDS = await prisma.vitalModule.findMany({
    //   where: {
    //     AND:[filters],
    //   },
    //   select: {
    //     id: true,
    //     vitalName: true,
    //     vitalCode: true,
    //     vitalDataStructure: true,
    //   },
    // });
    const { famCareMemberId, startDate, endDate, codeId } = queryParams;

    //filters:
    const filters: any = {};
    const vitalModuleFilters: any = {};
    if (codeId) {
      filters.vitalCodeId = codeId;
      vitalModuleFilters.vitalCode = codeId;
    }
    if (startDate && endDate) {
      filters.recordedOn = {
        gte: formatDateForDB(startDate),
        lte: formatDateForDB(endDate),
      };
    } else if (startDate && !endDate) {
      filters.recordedOn = {
        gte: formatDateForDB(startDate),
        lte: new Date(),
      };
    } else if (!startDate && endDate) {
      filters.recordedOn = {
        gte: getFirstDayOfCurrentYear(),
        lte: formatDateForDB(endDate),
      };
    } else {
      filters.recordedOn = {
        gte: getFirstDayOfCurrentYear(),
        lte: new Date(),
      };
    }

    let vitalRecordData: VitalsUserData[] = [];

    let syncData: vitalSync[] = [];

    //search for module
    const moduleDS = await prisma.vitalModule.findMany({
      where: {
        AND: [vitalModuleFilters],
      },
    });
    if (!moduleDS || moduleDS.length === 0)
      throw new HTTPError("Could not find Self-Awareness module details", 404);

    if (famCareMemberId) {
      const { linkData } = await familyLink(
        userId,
        famCareMemberId?.toLowerCase()
      );

      vitalRecordData = await prisma.vitalsUserData.findMany({
        where: {
          AND: [filters],
          ...(linkData.linkType === "minor" ||
            linkData.linkType === "sharedMinor"
            ? {
              forDependantId: famCareMemberId?.toLowerCase(),
            }
            : {
              forUserId: famCareMemberId?.toLowerCase(),
            }),
        },
        orderBy: {
          recordedOn: "desc",
        },
      });
      syncData = await prisma.vitalSync.findMany({
        where: {
          userId: famCareMemberId?.toLowerCase(),
        },
      });
      syncData = await prisma.vitalSync.findMany({
        where: {
          userId: famCareMemberId?.toLowerCase(),
        },
      });
    } else {
      vitalRecordData = await prisma.vitalsUserData.findMany({
        where: {
          AND: [filters],
          forUserId: userId,
        },
        orderBy: {
          recordedOn: "desc",
        },
      });
      syncData = await prisma.vitalSync.findMany({
        where: {
          userId: userId,
        },
      });
      syncData = await prisma.vitalSync.findMany({
        where: {
          userId: userId,
        },
      });
    }
    if (!vitalRecordData) vitalRecordData = [];
    await trackActiveSession(userId);

    const result = vitalRecordData.map((vital) => {
      const sync = syncData.find(
        (s) =>
          s.userId === vital.forUserId && s.vitalCodeId === vital.vitalCodeId
      );
      return {
        ...vital,
        lastSync: sync?.lastSync ?? null,
      };
    });

    return {
      success: true,
      V5: result,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getUserVitalModules = async (
  user: ITokenData,
  { famCareMemberId, search }: ParsedQs
) => {
  try {
    let validModules;
    let V5: any = [];
    const searchFilter: Array<{}> = [];
    if (search) {
      searchFilter.push({
        vitalName: { contains: search, mode: "insensitive" },
      });
    }
    if (famCareMemberId) {
      const { linkData } = await familyLink(
        user.id,
        (famCareMemberId as string)?.toLowerCase()
      );

      const findUser =
        linkData.linkType == "minor" || linkData.linkType === "sharedMinor"
          ? await prisma.dependant.findUnique({
            where: { id: (famCareMemberId as string)?.toLowerCase() },
          })
          : await prisma.users.findUnique({
            where: { id: (famCareMemberId as string)?.toLowerCase() },
          });
      if (!findUser) throw new HTTPError("could not fetch user details", 404);

      //what if the vital module is for veeryone and filter field is null? -> added the condition
      validModules = await fetchAndValidateModules(findUser, searchFilter);

      V5 = await fetchLatestVitalData(
        validModules,
        findUser.id,
        linkData.linkType === "minor" || linkData.linkType === "sharedMinor"
          ? "minor"
          : "other"
      );
    } else {
      const findUser = await fetchUserUnique(user.id);

      validModules = await fetchAndValidateModules(findUser, searchFilter);

      V5 = await fetchLatestVitalData(validModules, findUser.id, "other");
    }
    await trackActiveSession(user.id);

    return {
      success: true,
      VM11: validModules,
      V5,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
