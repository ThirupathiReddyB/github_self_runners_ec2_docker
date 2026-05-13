import { Dependant, Users } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";
import { getUserVitalModules } from "../services/vitals.services";
import { trackActiveSession } from "./changeHistoryTrackFunction";
import { IFamilyLinkType } from "./DataTypes/types.familyCare";
import { ITokenData } from "./DataTypes/types.user";
import HTTPError from "./HttpError";
import { handleError } from "./Error";

const addSharedMinorParent = async (
  dependantData: Dependant & { user: Users },
  U6: Map<any, any>
) => {
  const minorsParent = await prisma.users.findFirst({
    where: { id: dependantData.userId },
  });

  if (minorsParent) {
    const { refreshToken, password, ...filteredUserData } = minorsParent;
    U6.set(filteredUserData.id, filteredUserData);
  }
};

const addSecondaryUserRecord = async (
  member: IFamilyLinkType,
  U6: Map<any, any>,
  getAllFamilyMembers: IFamilyLinkType[]
) => {
  const sharedMinor = await prisma.familylinks.findFirst({
    where: { linkFrom: member.linkTo, linkType: "sharedMinor" },
  });

  if (sharedMinor) {
    getAllFamilyMembers.push(sharedMinor);
  }

  const secondaryUserRecord =
    sharedMinor &&
    (await prisma.users.findFirst({
      where: {
        id: sharedMinor.linkTo,
      },
    }));

  if (secondaryUserRecord) {
    const { refreshToken, password, ...filteredUserData } = secondaryUserRecord;
    U6.set(filteredUserData.id, filteredUserData);
  }
};

export const getHealthData = async (
  identifier: string,
  type: "forDependantId" | "forUserId",
  H8: Map<any, any>
) => {
  const healthData = await prisma.healthRecord.findFirst({
    where: { [type]: identifier },
  });
  if (healthData) {
    H8.set(healthData.id, healthData);
  }
};

export const FamilyMembersData = async (
  getAllFamilyMembers: IFamilyLinkType[]
) => {
  const D7 = new Map(),
    U6 = new Map(),
    H8 = new Map();
  for (const member of getAllFamilyMembers) {
    if (member.linkType == "minor" || member.linkType == "sharedMinor") {
      const dependantData = await prisma.dependant.findFirst({
        where: {
          OR: [{ id: member.linkTo }, { id: member.linkFrom }],
        },
        include: {
          user: true,
        },
      });

      //check if  link is shared minor than add minors parent in u6 else if minor then find if its shared than add secondary parent record in u6 along with shared minor link
      if (member.linkType == "sharedMinor") {
        dependantData && (await addSharedMinorParent(dependantData, U6));
      } else {
        await addSecondaryUserRecord(member, U6, getAllFamilyMembers);
      }

      if (dependantData) {
        D7.set(dependantData.id, dependantData);
        await getHealthData(dependantData.id, "forDependantId", H8);
       
      }
    } else {
      const userData = await prisma.users.findUnique({
        where: {
          id: member.linkTo,
        },
      });
      if (userData) {
        const { refreshToken, password, ...filteredUserData } = userData;
        U6.set(filteredUserData.id, filteredUserData);
        await getHealthData(member.linkTo, "forUserId", H8);

      
      }
    }
  }
  return {
    D7: Array.from(D7.values()), // Extract unique values as an array
    U6: Array.from(U6.values()),
    H8: Array.from(H8.values()),
    F9: getAllFamilyMembers,
  };
};

export const getMemberDataById = async (user: ITokenData, memberId: string) => {
  try {
    if (!user) {
      throw new HTTPError("Unauthorised", 401);
    }
    const getMemberLink = await prisma.familylinks.findFirst({
      where: {
        OR: [
          { linkFrom: user.id, linkTo: memberId.toLowerCase() },
          { linkTo: user.id, linkType: "sharedMinor" },
        ],
      },
    });

    if (!getMemberLink)
      throw new HTTPError("Could not fetch family member linking data", 500);

    let memberData;
    if (
      getMemberLink.linkType == "minor" ||
      getMemberLink.linkType == "sharedMinor"
    ) {
      memberData = await prisma.dependant.findFirst({
        where: {
          id: memberId.toLowerCase(),
        },
        include: {
          healthRecord: true,
          appointment: {
            where: {
              apptDate: { gte: new Date() }, // Upcoming appointments
            },
            orderBy: { apptDate: "asc" },
            take: 4,
          },
          medicine: {
            where: {
              startAt: { gte: new Date() }, // Upcoming medicines
            },
            orderBy: { startAt: "asc" },
            take: 4,
          },
        },
      });
    } else {
      memberData = await prisma.users.findFirst({
        where: {
          id: memberId.toLowerCase(),
        },
        include: {
          healthRecord: true,
          appointment: {
            where: {
              apptDate: { gte: new Date() }, // Upcoming appointments
            },
            orderBy: { apptDate: "asc" },
            take: 4,
          },
          medicine: {
            where: {
              startAt: { gte: new Date() }, // Upcoming medicines
            },
            orderBy: { startAt: "asc" },
            take: 4,
          },
        },
      });
    }

    if (!memberData) throw new HTTPError("Could Not Find User", 404);
    // Combine and sort appointments and medicines
    const upcomingEvents: any = [];

    if (memberData?.appointment?.length) {
      memberData.appointment.forEach((appointment) =>
        upcomingEvents.push(appointment)
      );
    }

    if (memberData?.medicine?.length) {
      memberData.medicine.forEach((medicine) => upcomingEvents.push(medicine));
    }
    upcomingEvents.sort((event1: any, event2: any) => {
      // Sort by date (ascending)
      const dateComparison =
        event1.apptDate?.getDate() - event2.apptDate?.getDate() || 0;
      if (dateComparison !== 0) {
        return dateComparison;
      }

      // If dates are equal, sort by time (ascending)
      if (event1.startAt && event2.startAt) {
        return event1.startAt.getTime() - event2.startAt.getTime();
      } else if (event1.startAt) {
        return (
          event1.startAt.getTime() - (event2.apptDate?.getTime() ?? Infinity)
        );
      } else {
        return (
          (event2.startAt?.getTime() ?? Infinity) - event1.apptDate?.getTime()
        );
      }
    });

    //get all self-awareness-data
    const selfAwareness = await getUserVitalModules(user, {
      famCareMemberId: memberId.toLowerCase(),
    });
    if (!selfAwareness) {
      throw new HTTPError('could not get self-awareness-data', 500);
    }
    const HomePageData = {
      family_care_details: {
        relation: getMemberLink.relation,
        linktype: getMemberLink.linkType,
        access_type: getMemberLink.accessType,
        senstiveData: getMemberLink.sensitiveDataAccess,
        sync: getMemberLink.synced,
      },
      user: {
        id: memberData.id,
        fullName: memberData.fullName,
        gender: memberData.gender,
        dob: memberData.dob,
        address: memberData.address,
        pincode: memberData.pincode,
        emergencyContact: memberData.emergencyContact,
        profileImage: memberData.profileImage,
        QRCodeURL: memberData.QRCodeURL,
      },
      HealthRecords: memberData.healthRecord,
      upcomingEvents: upcomingEvents.slice(0, 4),
      selfAwareness: selfAwareness.V5,
    };
    const updateActiveSession = await trackActiveSession(user.id);
    if (!updateActiveSession) {
      throw new HTTPError("Could not update active session", 204);
    }
    return {
      success: true,
      HomePageData,
    };
  } catch (error: unknown) {
    throw handleError(error);
    }
};

