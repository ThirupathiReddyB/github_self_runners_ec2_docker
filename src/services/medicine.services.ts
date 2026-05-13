import prisma from "../prisma";
import { ParsedQs } from "qs";
import {
  IGetMedicine,
  IMedicine,
  IUpdateMedicine,
} from "../utility/DataTypes/types.medicine";
import { ITokenData } from "../utility/DataTypes/types.user";
import HTTPError from "../utility/HttpError";
import {
  checkUserLinkAndManageAccess,
  determineUserForSyncChanges,
  familyLink,
} from "../utility/familyLinkData";
import { trackActiveSession } from "../utility/changeHistoryTrackFunction";
import { deleteFile } from "../utility/aws/deleteFile";
import { filterRecords } from "../utility/RecordList";
import { awsBucketLink, dayOrder } from "../constants/data";
import { handleError } from "../utility/Error";
import { uploadMedImageToS3 } from "../utility/FileOperations";
import {
  changeHistoryCreateNewMedicineReminder,
  renameMedFile,
  updateMedicineDataIfFamCareId,
  updateMedicineDataSelf,
} from "../utility/helperFunction/medicine.services.helper";

export const createNewMedicineReminder = async (
  data: IMedicine,
  user: ITokenData
) => {
  try {
    const {
      medName,
      medUnit,
      medInventory,
      medDoctor,
      medIntakeTime,
      medIntakePerDose,
      medIntakeFrequency,
      medReminderFrequency,
      medDosage,
      MedDosageSchedule,
      startAt,
      endAt,
      isRefill,
      medImage,
      famCareMemberId,
    } = data;

    let medURL;
    let formattedScheduleTime: string[] = [];
    if (MedDosageSchedule) {
      MedDosageSchedule.forEach((scheduleTime) => {
        formattedScheduleTime.push(scheduleTime);
      });
    }
    let new_medicine_reminder;
    if (medIntakeFrequency === "specific_day" && medReminderFrequency) {
      medReminderFrequency.sort(
        (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
      );
    }
    if (famCareMemberId) {
      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(
          user.id,
          famCareMemberId?.toLowerCase()
        );

      medURL = await uploadMedImageToS3(
        medImage,
        famCareMemberId?.toLowerCase(),
        medName
      );

      new_medicine_reminder = await prisma.medicine.create({
        data: {
          createdBy: user.id,
          medName,
          medUnit: medUnit.toLocaleLowerCase(),
          medInventory,
          medDoctor,
          medIntakeTime: medIntakeTime.toLocaleLowerCase(),
          medIntakePerDose,
          medIntakeFrequency: medIntakeFrequency.toLocaleLowerCase(),
          medReminderFrequency: medReminderFrequency,
          medDosage,
          MedDosageSchedule: formattedScheduleTime,
          startAt,
          endAt,
          isRefill,
          medImage: medImage ? `${awsBucketLink}/${medURL?.Key}` : null,
          ...(linkData.linkType === "minor" ||
          linkData.linkType === "sharedMinor"
            ? {
                dependant: {
                  connect: {
                    id: famCareMemberId?.toLowerCase(),
                  },
                },
              }
            : {
                user: {
                  connect: {
                    id: famCareMemberId?.toLowerCase(),
                  },
                },
              }),
        },
      });

      await determineUserForSyncChanges(
        linkData,
        user.id,
        new_medicine_reminder.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId,
        "create",
        "M3"
      );
    } else {
      medURL = await uploadMedImageToS3(
        medImage,
        user.id.toLowerCase(),
        medName
      );

      new_medicine_reminder = await prisma.medicine.create({
        data: {
          createdBy: "self",
          medName,
          medUnit: medUnit.toLocaleLowerCase(),
          medInventory,
          medDoctor,
          medIntakeTime: medIntakeTime.toLocaleLowerCase(),
          medIntakePerDose,
          medIntakeFrequency: medIntakeFrequency.toLocaleLowerCase(),
          medReminderFrequency: medReminderFrequency,
          medDosage,
          MedDosageSchedule: formattedScheduleTime,
          startAt,
          endAt,
          isRefill,
          medImage: medImage ? `${awsBucketLink}/${medURL?.Key}` : null,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });
      if (!new_medicine_reminder)
        throw new HTTPError("Could Not Add new medicine reminder", 500);

      await changeHistoryCreateNewMedicineReminder(
        user.id,
        "create",
        new_medicine_reminder.id,
        "M3",
        user.id,
        false
      );
    }
    await trackActiveSession(user.id);

    return {
      success: true,
      M3: new_medicine_reminder,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getMedicineReminders = async (
  user: ITokenData,
  queryParams: IGetMedicine
) => {
  try {
    const {
      id,
      medName,
      medUnit,
      medDoctor,
      medIntakeFrequency,
      medIntakeTime,
      limit,
      famCareMemberId,
    } = queryParams;

    const filters: any = {};

    if (famCareMemberId) {
      const { linkData } = await familyLink(
        user.id,
        famCareMemberId?.toLowerCase()
      );

      const isDependant =
        linkData.linkType === "minor" || linkData.linkType === "sharedMinor";

      if (isDependant) {
        filters.forDependantId = famCareMemberId;
      } else {
        filters.forUserId = famCareMemberId;
      }
    } else {
      filters.forUserId = user.id;
    }
    if (id) {
      filters.id = id;
    }

    if (medName) {
      filters.medName = {
        contains: medName,
        mode: "insensitive",
      };
    }
    if (medUnit) {
      filters.medUnit = {
        contains: medUnit,
        mode: "insensitive",
      };
    }
    if (medDoctor) {
      filters.medDoctor = {
        contains: medDoctor,
        mode: "insensitive",
      };
    }
    if (medIntakeFrequency) {
      filters.medIntakeFrequency = {
        contains: medIntakeFrequency,
        mode: "insensitive",
      };
    }
    if (medIntakeTime) {
      filters.medIntakeTime = {
        contains: medIntakeTime,
        mode: "insensitive",
      };
    }

    const all_med_reminders = await prisma.medicine.findMany({
      where: filters,
      take: limit ?? undefined,
      orderBy: {
        updatedAt: "asc",
      },
    });
    if (!all_med_reminders)
      throw new HTTPError(
        "Could Not fetch medicine reminder data for user",
        404
      );
    await trackActiveSession(user.id);

    return {
      success: true,
      user_id: user.id,
      M3: all_med_reminders,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const UpdateMedicineReminders = async (
  updateMedicineData: IUpdateMedicine
) => {
  try {
    const {
      medName,
      medUnit,
      medInventory,
      medDoctor,
      medIntakeTime,
      medIntakePerDose,
      medIntakeFrequency,
      medReminderFrequency,
      medDosage,
      MedDosageSchedule,
      startAt,
      endAt,
      isActive,
      isRefill,
      medImage,
      famCareMemberId,
    } = updateMedicineData;
    let imageLink = null;
    //find existing record
    if (medIntakeFrequency === "specific_day" && medReminderFrequency) {
      medReminderFrequency.sort(
        (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
      );
    }

    const existingMedicineData = await prisma.medicine.findFirst({
      where: {
        id: parseInt(updateMedicineData.medId),
        OR: [
          {
            forUserId: famCareMemberId
              ? famCareMemberId.toLowerCase()
              : updateMedicineData.userId,
          },
          {
            forDependantId: famCareMemberId?.toString().toLowerCase(),
          },
        ],
      },
    });
    if (!existingMedicineData)
      throw new HTTPError("Could not find medicine reminder to update", 404);
    const newMedDosage = medDosage ?? existingMedicineData.medDosage;
    const newMedDosageSchedule =
      MedDosageSchedule ?? existingMedicineData.MedDosageSchedule;

    if (newMedDosageSchedule?.length != newMedDosage) {
      throw new HTTPError(
        "Dosage per day doesnt match schedule reminders to give user",
        400
      );
    }
    let formattedScheduleTime: string[] = [];
    if (MedDosageSchedule) {
      MedDosageSchedule.forEach((scheduleTime) => {
        formattedScheduleTime.push(scheduleTime);
      });
    }
    let updatedMedData;
    let medURL;
    let url;
    if (famCareMemberId) {
      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(
          updateMedicineData.userId,
          famCareMemberId?.toLowerCase()
        );

      if (medImage) {
        //1.find the image link from db -> fetch the image name
        const fileName = decodeURIComponent(
          existingMedicineData.medImage?.split("/")[4] ?? ""
        );
        //2.delete the existing file from aws
        await deleteFile(fileName, famCareMemberId?.toLowerCase());

        //3.upload new file
        medURL = await uploadMedImageToS3(
          medImage,
          famCareMemberId?.toLowerCase(),
          medName ?? existingMedicineData.medName
        );
      }

      await renameMedFile(
        medName,
        medImage,
        existingMedicineData.medImage,
        famCareMemberId?.toLowerCase()
      );

      updatedMedData = await updateMedicineDataIfFamCareId(
        updateMedicineData,
        linkData,
        formattedScheduleTime,
        famCareMemberId?.toLowerCase(),
        medURL
      );

      await determineUserForSyncChanges(
        linkData,
        updateMedicineData.userId,
        updatedMedData.id,
        isMinorChangedBySecondaryParent,
        famCareMemberId,
        "update",
        "M3"
      );
    } else {
      if (medImage) {
        //1.find the image link from db -> fetch the image name
        const fileName = decodeURIComponent(
          existingMedicineData.medImage?.split("/")[4] ?? ""
        );
        //2.delete the existing file from aws
        await deleteFile(fileName, updateMedicineData.userId.toLowerCase());
        //3.upload new file
        medURL = await uploadMedImageToS3(
          medImage,
          updateMedicineData.userId.toLowerCase(),
          medName ?? existingMedicineData.medName
        );

        imageLink = `${awsBucketLink}/${medURL?.Key}`;
      }

      url = await renameMedFile(
        medName,
        medImage,
        existingMedicineData.medImage,
        updateMedicineData.userId
      );

      updatedMedData = await prisma.medicine.update({
        where: {
          id: parseInt(updateMedicineData.medId),
          forUserId: updateMedicineData.userId,
        },
        data: {
          medName,
          medUnit,
          medInventory,
          medDoctor,
          medIntakeTime,
          medIntakePerDose,
          medIntakeFrequency,
          medReminderFrequency,
          medDosage,
          MedDosageSchedule: formattedScheduleTime,
          startAt,
          isRefill,
          isActive,
          medImage: imageLink ?? url,
          endAt,
        },
      });
      if (!updatedMedData) {
        throw new HTTPError("Could Not update medicine reminder data", 500);
      }

      updatedMedData = await updateMedicineDataSelf(
        updateMedicineData,
        formattedScheduleTime,
        imageLink,
        url
      );

      //track changes
      await changeHistoryCreateNewMedicineReminder(
        updateMedicineData.userId,
        "update",
        updatedMedData.id,
        "M3",
        updateMedicineData.userId,
        false
      );
    }
    await trackActiveSession(updateMedicineData.userId);

    return {
      success: true,
      message: "Medicine Appointment updated successfully",
      M3: updatedMedData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const deleteMedicine = async (data: {
  medId: string;
  userId: string;
  famCareMemberId?: string;
}) => {
  try {
    const { medId, userId, famCareMemberId } = data;

    const meds = medId.split(",").map(Number);
    let deletedRecords: number[] = [];

    //find existing record
    const existingMedicineData = await prisma.medicine.findMany({
      where: {
        id: {
          in: meds.map((med) => med),
        },
        OR: [
          {
            forUserId: famCareMemberId ?? userId,
          },
          { forDependantId: famCareMemberId },
        ],
      },
    });

    if (
      !existingMedicineData.length ||
      existingMedicineData.length != meds.length
    )
      throw new HTTPError("Could not find medicine reminder to delete", 404);

    if (famCareMemberId) {
      const { linkData, isMinorChangedBySecondaryParent } =
        await checkUserLinkAndManageAccess(
          userId,
          famCareMemberId.toLowerCase()
        );

      const deleteMultiple = existingMedicineData.map(async (med) => {
        deletedRecords.push(med.id);
        // decode filename into actual filename by removing the url encoded values
        if (med.medImage) {
          const fileName = decodeURIComponent(med.medImage.split("/")[4]);
          const result = await deleteFile(fileName, famCareMemberId);
          if (!result)
            throw new HTTPError("Could not delete file from s3", 502);
        }

        const deleteAdv = await prisma.medicine.delete({
          where: {
            id: med.id,
          },
        });
        if (!deleteAdv)
          throw new HTTPError(`Could not delete data from database`, 500);
      });
      if (!deleteMultiple) {
        throw new HTTPError("Could not delete all reminder(s)", 500);
      }
      //track changes (only for linked user / subaccount user)
      const changes = deletedRecords.map(async (medId) => {
        await determineUserForSyncChanges(
          linkData,
          userId,
          medId,
          isMinorChangedBySecondaryParent,
          famCareMemberId?.toString(),
          "delete",
          "M3"
        );
      });
      if (!changes) throw new HTTPError("Could not record changes made", 500);
    } else {
      const deleteMultiple = existingMedicineData.map(async (med) => {
        deletedRecords.push(med.id);
        // decode filename into actual filename by removing the url encoded values
        if (med.medImage) {
          const fileName = decodeURIComponent(med.medImage.split("/")[4]);
          const result = await deleteFile(fileName, userId);
          if (!result)
            throw new HTTPError("Could not delete file from s3", 502);
        }

        const deleteAdv = await prisma.medicine.delete({
          where: {
            id: med.id,
          },
        });
        if (!deleteAdv)
          throw new HTTPError(`Could not delete data from database`, 500);
      });
      if (!deleteMultiple) {
        throw new HTTPError("Could not delete all reminder(s)", 500);
      }
      const changes = deletedRecords.map(async (med) => {
        await changeHistoryCreateNewMedicineReminder(
          userId,
          "delete",
          med,
          "M3",
          userId,
          false
        );
      });
      if (!changes) throw new HTTPError("Could not record changes made", 500);
    }

    await trackActiveSession(userId);

    //find successfull and failed records:
    const failedRecords = await filterRecords(deletedRecords, meds);
    return {
      success: true,
      message: "Medicine Reminder was deleted successfully",
      successfullyDeleted: deletedRecords,
      failed: failedRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getUserReminders = async (
  user: ITokenData,
  { famCareMemberId }: ParsedQs
) => {
  try {
    if (!user) throw new HTTPError("User Unique Id required", 422);

    const { linkData } = await familyLink(
      user.id,
      (famCareMemberId as string)?.toLowerCase()
    );
    if (!linkData) throw new HTTPError("Link Does Not exist", 404);

    const all_med_reminders = await prisma.medicine.findMany({
      where: {
        ...(linkData.linkType === "minor" || linkData.linkType == "sharedMinor"
          ? {
              forDependantId: (famCareMemberId as string)?.toLowerCase(),
            }
          : {
              forUserId: famCareMemberId
                ? (famCareMemberId as string)?.toLowerCase()
                : user.id,
            }),
      },

      orderBy: {
        updatedAt: "asc",
      },
    });
    if (!all_med_reminders)
      throw new HTTPError("Could Not fetch appointments data for user", 404);

    const all_appointments = await prisma.appointment.findMany({
      where: {
        ...(linkData.linkType === "minor" || linkData.linkType === "sharedMinor"
          ? {
              forDependantId: (famCareMemberId as string)?.toLowerCase(),
            }
          : {
              forUserId: famCareMemberId
                ? (famCareMemberId as string)?.toLowerCase()
                : user.id,
            }),
      },

      orderBy: {
        apptDate: "asc",
      },
    });
    if (!all_appointments)
      throw new HTTPError("Could Not fetch appointments data for user", 404);
    await trackActiveSession(user.id);

    return {
      success: true,
      user_id: user.id,
      M3: all_med_reminders,
      A1: all_appointments,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
