import { Changes, Familylinks } from "../../../prisma/generated/prisma/client";
import { trackChanges } from "../changeHistoryTrackFunction";
import HTTPError from "../HttpError";
import { editAwsFileName } from "../aws/editFileName";
import { IUpdateMedicine } from "../DataTypes/types.medicine";
import prisma from "../../prisma";
import { awsBucketLink } from "../../constants/data";

export const changeHistoryCreateNewMedicineReminder = async (
  userChanged: string,
  changeType: Changes,
  recordId: number | string,
  tableId: string,
  changedBy: string,
  minorDataIsChangedBySecondaryParent: boolean
) => {
  const changeHistory = await trackChanges(
    userChanged,
    changeType,
    recordId,
    tableId,
    changedBy,
    minorDataIsChangedBySecondaryParent
  );
  if (!changeHistory.success)
    throw new HTTPError("Could not track change", 204);

  return changeHistory;
};

export const renameMedFile = async (
  medName: string | undefined,
  newMedImage: string | undefined,
  oldMedImage: string | null,
  userId: string
) => {
  let url;
  if (medName && !newMedImage && oldMedImage) {
    const oldKey = decodeURIComponent(oldMedImage?.split("/")[4]);
    const newKey = `medReminderImg_${Date.now()}_${medName.replace(/[^a-zA-Z0-9.]/g, "")}`;
    url = await editAwsFileName(oldKey, newKey, userId.toLowerCase());
    if (!url) {
      throw new HTTPError("Could not rename file", 502);
    }
  }

  return url;
};

export const updateMedicineDataIfFamCareId = async (
  updateMedicineData: IUpdateMedicine,
  linkData: Familylinks,
  formattedScheduleTime: string[],
  famCareMemberId: string,
  medURL:
    | {
        success: boolean;
        Location: string;
        Key: string;
      }
    | undefined
) => {
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
    startAt,
    endAt,
    isActive,
    isRefill,
    medImage,
  } = updateMedicineData;
  const updatedMedData = await prisma.medicine.update({
    where: {
      id: parseInt(updateMedicineData.medId),
      ...(linkData.linkType === "minor" || linkData.linkType === "sharedMinor"
        ? {
            forDependantId: famCareMemberId,
          }
        : {
            forUserId: famCareMemberId,
          }),
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
      endAt,
      isRefill,
      isActive,
      medImage: medImage ? `${awsBucketLink}/${medURL?.Key}` : null,
    },
  });
  if (!updatedMedData) {
    throw new HTTPError("Could Not update medicine reminder data", 500);
  }

  return updatedMedData;
};

export const updateMedicineDataSelf = async (
  updateMedicineData: IUpdateMedicine,
  formattedScheduleTime: string[],
  imageLink: string | null,
  url: string | undefined
) => {
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
    startAt,
    endAt,
    isActive,
    isRefill,
  } = updateMedicineData;
  const updatedMedData = await prisma.medicine.update({
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
  return updatedMedData;
};
