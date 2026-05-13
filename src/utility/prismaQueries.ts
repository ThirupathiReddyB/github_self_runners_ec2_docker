import { Addon, Familylinks, SyncChanges, Users } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";
import { BlockUserError } from "./BlockUserRemainingTime";
import HTTPError from "./HttpError";
import { getUpdatedData } from "./SyncedData";
import { IAddVitalRecord } from "./DataTypes/types.vitals";
import { IPlanVariants, IVoucherDetails } from "./DataTypes/types.subscription";
import { freePlanCode } from "../constants/data";
import { calculateStatistics } from "./calculations";

export const fetchUserFirst = async (userId: string) => {
  const user = await prisma.users.findFirst({
    where: { id: userId.toLowerCase() },
  });
  if (!user) throw new HTTPError("Could not find user", 404);
  return user;
};

export const fetchUserUnique = async (userId: string) => {
  const user = await prisma.users.findUnique({
    where: { id: userId.toLowerCase() },
  });
  if (!user) throw new HTTPError("Could not find user", 404);
  return user;
};

export const fetchUserByUniqueDataAuth = async (userId: string) => {
  const user = await getUserByUniqueData(userId.toLowerCase());
  if (!user) throw new HTTPError("Could not find user", 404);
  return user;
};

export const fetchDependant = async (userId: string) => {
  const user = await prisma.dependant.findFirst({
    where: {
      id: userId.toLowerCase(),
    },
    include: {
      user: true,
    },
  });
  if (!user) {
    throw new HTTPError(
      `Dependant with ID ${userId.toLowerCase()} not found`,
      404
    );
  }
  return user;
};

export const fetchMinor = async (userId: string) => {
  const user = await prisma.dependant.findFirst({
    where: {
      id: userId.toLowerCase(),
    },
  });

  if (!user) {
    throw new HTTPError("Minor not found", 404);
  }
  return user;
};

export const fetchUserWithSettingAndHealthRecord = async (userId: string) => {
  const userData = await prisma.users.findFirst({
    where: {
      id: userId.toLowerCase(),
    },
    include: {
      healthRecord: true,
      setting: true,
      Subscription: {
        where: {
          status: "active",
        },
        select: {
          planVariants: {
            select: {
              plan: {
                select: {
                  planCode: true
                }
              }
            }
          }
        }
      }
    },
  });

  if (!userData) throw new HTTPError("Could Not Find User", 404);

  return userData;
};

export const fetchUserWithSetting = async (
  userId: string,
  errorMessage: string
) => {
  const userData = await prisma.users.findFirst({
    where: {
      id: userId.toLowerCase(),
    },
    include: {
      setting: true,
    },
  });
  if (!userData) throw new HTTPError(errorMessage, 404);
  return userData;
};

export const fetchUserByVerifiedContactAndCheckBlock = async (
  userId: string
) => {
  let findUser = await getUserByVerifiedContact(userId);
  if (!findUser) {
    throw new HTTPError("Invalid credentials.", 401);
  }
  if (findUser.isBlocked && findUser.blockedAt) {
    findUser = await BlockUserError(findUser.id, findUser.blockedAt);
  }
  return findUser;
};

export const isUserExists = async (userId: string) => {
  if (await prisma.users.findFirst({ where: { id: userId.toLowerCase() } })) {
    throw new HTTPError(`User ${userId} already exists`, 422);
  }
};

export const isAlternateEmailContact = async (emailId: string) => {
  if (await prisma.users.findFirst({ where: { emailId: emailId } })) {
    throw new HTTPError("Alternate contact already exists.", 400);
  }
};

export const isAlternatePhoneNumberContact = async (phoneNumber: string) => {
  if (await prisma.users.findFirst({ where: { phoneNumber: phoneNumber } })) {
    throw new HTTPError("Alternate contact already exists.", 400);
  }
};

export const fetchUserByUniqueDataUser = async (id: string) => {
  const findUser = await getUserByUniqueData(id);
  if (!findUser) throw new HTTPError("User not found!", 404);
  return findUser;
};

export const fetchUserByUniqueDataAndCheckBlock = async (userId: string) => {
  let findUser = await getUserByUniqueData(userId);
  if (!findUser) throw new HTTPError("Invalid credentials", 401);
  if (findUser.isBlocked && findUser.blockedAt) {
    findUser = await BlockUserError(findUser.id, findUser.blockedAt);
  }
  return findUser;
};

export const fetchUpdatedData = async (
  distinctRecords: SyncChanges[],
  code: number
) => {
  const updatedData = await getUpdatedData(distinctRecords);
  if (!updatedData) throw new HTTPError("Could not fetch updated data", code);
  return updatedData;
};

export const fetchUserModeInsensitive = async (userId: string) => {
  const createdBy = await prisma.users.findFirst({
    where: {
      id: { equals: userId, mode: "insensitive" },
    },
    include: {
      setting: true,
    },
  });
  if (!createdBy) throw new HTTPError("created by user does not exist", 404);

  return createdBy;
};

export const fetchDependantModeInsensitive = async (userId: string) => {
  const userData = await prisma.dependant.findFirst({
    where: {
      id: { equals: userId, mode: "insensitive" },
    },
    include: {
      healthRecord: true,
      Subscription: {
        where: {
          status: "active",
        },
        select: {
          planVariants: {
            select: {
              plan: {
                select: {
                  planCode: true
                }
              }
            }
          }
        }
      }
    },
  });

  if (!userData) throw new HTTPError("Could Not fetch Users List", 404);

  return userData;
};

export const fetchExistingContact = async (
  emailId: string | undefined,
  phoneNumber: string | undefined,
  userId: string,
  famCareMemberId?: string | undefined
) => {
  const findExistingContact = await prisma.users.findFirst({
    where: {
      OR: [
        {
          AND: [
            { emailId: { equals: emailId, mode: "insensitive" } },
            { emailId: { not: null } },
          ],
        },
        {
          AND: [
            { phoneNumber: { equals: phoneNumber, mode: "insensitive" } },
            { phoneNumber: { not: null } }, // Ensure phoneNumber is not null
          ],
        },
      ],
      NOT: {
        OR: [
          {
            emailId,
            id: famCareMemberId?.toString() ?? userId,
          },
          {
            phoneNumber,
            id: famCareMemberId?.toString() ?? userId,
          },
        ],
      },
    },
  });
  if (findExistingContact) {
    throw new HTTPError("Alernate contact already exist", 612);
  }
};

export const getUserByUniqueData = async (userId: string) => {
  return await prisma.users.findFirst({
    where: {
      OR: [
        {
          emailId: {
            equals: userId,
            mode: "insensitive",
          },
        },
        { id: { equals: userId, mode: "insensitive" } },
        { phoneNumber: userId },
      ],
    },
    include: {
      setting: true,
    },
  });
};

export const getUserByVerifiedContact = async (userId: string) => {
  const user = await getUserByUniqueData(userId);
  return await prisma.users.findFirst({
    where: {
      OR: [
        { id: { equals: userId, mode: "insensitive" } },
        user?.verifiedContactId === "emailId"
          ? { emailId: { equals: userId, mode: "insensitive" } }
          : { phoneNumber: { equals: userId, mode: "insensitive" } },
      ],
    },
  });
};

export const createNewVitalRecords = async (
  input: IAddVitalRecord,
  linkData: Familylinks | null
) => {
  let connectionData:
    | { dependant: { connect: { id: string } } }
    | { user: { connect: { id: string } } }
    | null = null;
  if (input.famCareMemberId) {
    const isMinor =
      linkData?.linkType === "minor" || linkData?.linkType === "sharedMinor";
    connectionData = isMinor
      ? {
        dependant: {
          connect: {
            id: input.famCareMemberId.toString().toLowerCase(),
          },
        },
      }
      : {
        user: {
          connect: {
            id: input.famCareMemberId.toString().toLowerCase(),
          },
        },
      };
  } else {
    connectionData = {
      user: {
        connect: {
          id: input.userId,
        },
      },
    };
  }

  //storing lastSyncDate
  if (input.lastSyncDate && !input.famCareMemberId) {
    const addVitalLastSync = await prisma.vitalSync.upsert({
      where: {
        userId_vitalCodeId: {
          userId: input.userId,
          vitalCodeId: input.vitalCode,
        },
      },
      update: {
        lastSync: input.lastSyncDate,
      },
      create: {
        lastSync: input.lastSyncDate,
        vitalModule: {
          connect: {
            vitalCode: input.vitalCode.toLowerCase(),
          },
        },
        user: {
          connect: {
            id: input.userId,
          },
        },
      },
    });
    if (!addVitalLastSync)
      throw new HTTPError("Could not update last sync with wearable", 500);
  }

  const newVitalRecords = await Promise.all(
    input.recordData.map(async (record) => {
      return prisma.vitalsUserData.create({
        data: {
          createdBy: input.userId,
          recordedOn: new Date(new Date(record.recordedOn).getTime() + 5.5 * 60 * 60 * 1000).toISOString(),
          vitalRecordData: record.vitalData,
          vitalModule: {
            connect: {
              vitalCode: input.vitalCode.toLowerCase(),
            },
          },
          ...connectionData,
        },
      });
    })
  );
  if (!newVitalRecords) throw new HTTPError("Could not add record", 500);

  const finalData = newVitalRecords.map((rec) => {
    return {
      ...rec,
      lastSyncDate: input.lastSyncDate ?? null,
    };
  });

  return finalData;
};

//test
export const updateTransactionStatus = async (
  transactionId: string,
  statusCode: number,
  errorMessage: string
) => {
  const updateTransaction = await prisma.transaction.update({
    where: { txnid: transactionId },
    data: {
      paymentStatus: "Failed",
      error: statusCode.toString(),
      errorMessage,
    },
  });
  if (!updateTransaction) {
    throw new HTTPError("Could not update transaction status", 500);
  }
};

export const findExistingContactQuery = async (
  phoneNumber?: string | null,
  emailId?: string | null
) => {
  const findExistingContact = await prisma.users.findFirst({
    where: {
      OR: [
        {
          phoneNumber: phoneNumber,
          NOT: { phoneNumber: null },
        },
        {
          emailId: emailId,
          NOT: { emailId: null },
        },
      ],
    },
  });

  if (findExistingContact) {
    throw new HTTPError("Alernate contact already exist", 400);
  }
};

export const checkSubscriptionVoucherAndAddons = async (
  findUser: Users,
  findAddons: Addon[],
  findPlanVariant: IPlanVariants | null,
  findVoucher?: IVoucherDetails | null
) => {
  const [
    checkSubscriptionExpiry,
    linkAddonsVoucher,
    updateVoucherAvailedCount,
  ] = await Promise.all([
    findPlanVariant
      ? prisma.subscription.findFirst({
        where: {
          userId: findUser.id,

          status: "active",
          NOT: {
            planVariants: {
              plan: {
                planCode: freePlanCode,
              },
            },
          },
        },
      })
      : Promise.resolve(null),

    findVoucher || findAddons?.length
      ? prisma.users.update({
        where: {
          id: findUser.id,
        },
        data: {
          ...(findVoucher
            ? {
              Voucher: {
                connect: {
                  code: findVoucher?.code,
                },
              },
            }
            : {}),

          ...(findAddons.length
            ? {
              userToAddOn: {
                createMany: {
                  data: findAddons.map((addOn: any) => ({
                    addonId: addOn.id,
                    expiresAt: calculateStatistics(
                      addOn.period,
                      addOn.interval as number
                    ),
                  })),
                },
              },
            }
            : {}),
        },
      })
      : Promise.resolve(null),

    findVoucher
      ? await prisma.voucher.update({
        where: {
          id: findVoucher.id,
        },
        data: {
          availedCount: { increment: 1 },
        },
      })
      : Promise.resolve(null),
  ]);

  return {
    checkSubscriptionExpiry,
    linkAddonsVoucher,
    updateVoucherAvailedCount,
  };
};
