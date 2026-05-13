import { userActiveData } from "../../services/subscription.services";
import HTTPError from "../HttpError";
import {
  Addon,
  Status,
  Subscription,
  Users,
  PlanVariants,
  Voucher,
} from "../../../prisma/generated/prisma/client";
import prisma from "../../prisma";
import {
  activeSubscription,
  FetchUserType,
  IAddOns,
  IExistingSubscription,
  IPlanVariants,
  IVoucherDetails,
  storageUnit,
} from "../DataTypes/types.subscription";
import { TStorage } from "../DataTypes/types.feature";

import { countFamilyLinks } from "./familyCare.services.helper";
import { ITokenData } from "../DataTypes/types.user";
import { handleError } from "../Error";
import {
  currentTime,
  freePlanCode,
  getRandomCharacter,
  getRandomDigit,
} from "../../constants/data";
import { checkSubscriptionVoucherAndAddons } from "../prismaQueries";
import { calculateStatistics } from "../calculations";

const storageConversion = (storage: number, unit: storageUnit) => {
  let finalStorage = 0;
  switch (unit) {
    case "KB":
      finalStorage += storage || 0;
      break;
    case "MB":
      finalStorage += storage * 1024 || 0;
      break;
    case "GB":
      finalStorage += storage * 1024 * 1024 || 0;
      break;
  }
  return {
    storage: finalStorage,
    unit: "KB",
  };
};

export const getUserStorage = async (userId: string) => {
  const getSubscriptionData = await fetchData(userId);

  //fetch storage data from user's active subscription
  const storageData = getSubscriptionData.subscription.find(
    (feat) => feat.canonicalName === "storage"
  );
  if (!storageData?.metaValue)
    throw new HTTPError(
      "Could not fetch storage data from user's subscription",
      404
    );

  //send back storage data in bytes
  return (storageData.metaValue as TStorage).storage;
};

export const fetchData = async (userId: string) => {
  const findActive = await userActiveData({ userId });

  if (!findActive?.success) {
    throw new HTTPError(
      "Could not fetch user active subscription and add-ons",
      404
    );
  }

  const { activeSubscription, addon } = findActive.data;

  if (!activeSubscription?.plan.planVariants)
    throw new HTTPError(
      "Cannot find active subscription plan under user ",
      400
    );

  // Format subscriptions
  const subscriptionConfig =
    activeSubscription.plan.planVariants.PlanToFeature.map(
      ({ feature, metadata }) => {
        if (feature.canonicalName === "family_care") {
          const findAddon = addon.filter(
            (item) => item.feature.canonicalName === "family_care"
          );

          let addonMetaCounts = { minor: 0, adult: 0, slot: 0 };

          findAddon.forEach((addon) => {
            const value =
              (addon.value as {
                minor?: number;
                adult?: number;
                slot?: number;
              }) || {};
            addonMetaCounts.minor += value.minor ?? 0;
            addonMetaCounts.adult += value.adult ?? 0;
            addonMetaCounts.slot += value.slot ?? 0;
          });

          const metadataValue =
            (metadata.value as {
              minor?: number;
              adult?: number;
              slot?: number;
            }) || {};

          return {
            featureId: feature.id,
            canonicalName: feature.canonicalName,
            metaId: metadata.id,
            metaValue: {
              minor: (metadataValue.minor ?? 0) + addonMetaCounts.minor,
              adult: (metadataValue.adult ?? 0) + addonMetaCounts.adult,
              slot: (metadataValue.slot ?? 0) + addonMetaCounts.slot,
            },
          };
        }
        if (feature.canonicalName === "storage") {
          const findAddon = addon.filter(
            (item) => item.feature.canonicalName === "storage"
          );
          if (findAddon.length === 0) {
            const { storage } = metadata.value as TStorage;
            return {
              featureId: feature.id,
              canonicalName: feature.canonicalName,
              metaId: metadata.id,
              metaValue: storageConversion(storage, "MB"),
            };
          }

          let addonMetaCounts = { storage: 0, unit: "KB" };

          findAddon.forEach((addon) => {
            const value = addon.value as {
              storage?: number;
              unit: storageUnit;
            };
            switch (value.unit) {
              case "KB":
                addonMetaCounts.storage += value.storage ?? 0;
                break;
              case "MB":
                addonMetaCounts.storage += (value.storage ?? 0) * 1024 || 0;
                break;
              case "GB":
                addonMetaCounts.storage +=
                  (value.storage ?? 0) * 1024 * 1024 || 0;
                break;
            }
          });

          const metadataValue = metadata.value as {
            storage?: number;
            unit: storageUnit;
          };

          return {
            featureId: feature.id,
            canonicalName: feature.canonicalName,
            metaId: metadata.id,
            metaValue: {
              storage: metadataValue.storage ?? 0 + addonMetaCounts.storage,
              unit: "KB",
            },
          };
        }

        return {
          featureId: feature.id,
          canonicalName: feature.canonicalName,
          metaId: metadata.id,
          metaValue: metadata.value,
        };
      }
    );

  return {
    subscription: subscriptionConfig,
  };
};

export const updateSubscriptionStatus = async (
  id: number,
  userId: string,
  planVariantId: number,
  status: Status
) => {
  const updateSubscription = await prisma.subscription.update({
    where: {
      id,
      userId,
      planVariantId,
    },
    data: {
      status,
    },
  });
  if (!updateSubscription) {
    throw new HTTPError("Subscription not found", 500);
  }
};

export const markFreePlanActiveForUser = async (userId: string) => {
  try {
    const fetchedFreePlan = await findFreePlan();

    const [findUserFreeSubscription, currentActive] = await Promise.all([
      prisma.subscription.findFirst({
        where: {
          userId,
          planVariantId: fetchedFreePlan.planVariants[0].id,
        },
      }),
      prisma.subscription.findFirst({
        where: {
          userId,
          status: "active",
          expiresAt: {
            gt: new Date(Date.now())
          }
        },
      })
    ])
      ;
    if (!findUserFreeSubscription) {
      await prisma.subscription.create({
        data: {
          userId,
          planVariantId: fetchedFreePlan.planVariants[0].id,
          status: "active"
        },
      })
      // throw new HTTPError(
      //   "Looks like the user is not linked to free plan. Something went wrong",
      //   500
      // );
    }

    if (findUserFreeSubscription && !currentActive) {
      const updateSubscription = await prisma.subscription.update({
        where: {
          id: findUserFreeSubscription.id,
          userId,
          planVariantId: fetchedFreePlan?.planVariants[0].id,
        },
        data: {
          status: "active",
        },
      });

      if (!updateSubscription) {
        throw new HTTPError("Subscription not found", 500);
      }
    }
  } catch (err) {
    throw handleError(err);
  }
};

export const markUpcomingPlanAsActiveForUser = async (
  userId: string,
  upcomimgPlanId: number
) => {
  const updateSubscription = await prisma.subscription.update({
    where: {
      userId,
      id: upcomimgPlanId,
      status: "upcoming"
    },
    data: {
      status: "active",
    },
  });

  if (!updateSubscription) {
    throw new HTTPError("Subscription not found", 500);
  }

  //ensure free plan is made inactive
  const fetchedFreePlan = await findFreePlan();
  await prisma.subscription.updateMany({
    where: {
      userId,
      planVariantId: fetchedFreePlan.planVariants[0].id,
    },
    data: {
      status: "inactive"
    }
  })

};

export const calculateTotalConnectionUserCanMake = async (
  activeSubscription: activeSubscription,
  userAddons: any[],
  user: ITokenData
) => {
  let totalAdult = 0;
  let totalMinor = 0;
  let totalSlots = 0;

  // Calculate from subscription
  const getFamilyCareMetadata =
    activeSubscription.plan.planVariants.PlanToFeature.find(
      (item) => item.feature.canonicalName === "family_care"
    );

  if (getFamilyCareMetadata) {
    const metadataValue = getFamilyCareMetadata.metadata.value as {
      adult: number;
      minor: number;
      slot: number;
    };
    totalAdult += metadataValue.adult;
    totalMinor += metadataValue.minor;
    totalSlots += metadataValue.slot;
  }

  for (const addon of userAddons) {
    if (addon.addon.feature?.canonicalName === "family_care") {
      const addonMetadata = addon.addon.value as {
        adult: number;
        minor: number;
        slot: number;
      };
      totalAdult += addonMetadata.adult;
      totalMinor += addonMetadata.minor;
      totalSlots += addonMetadata.slot;
    }
  }

  const totalLinks = totalAdult + totalMinor + totalSlots;

  const { minorCount, adultCount } = await countFamilyLinks(user.id);
  const totalConnectedMember = adultCount + minorCount;

  return {
    totalAdult,
    totalMinor,
    totalSlots,
    totalLinks,
    totalConnectedMember,
    connectedMinorCount: minorCount,
    connectedAdultCount: adultCount,
  };
};

//INVOICE
export const numberToWords = (num: number, currency: string) => {
  if (num === null || num === undefined) return "";
  const number = parseFloat(num.toFixed(2)); // Ensure it's a number with 2 decimal places
  const integerPart = Math.floor(number);
  const decimalPart = Math.round((number - integerPart) * 100);

  // Basic integer to words (add more cases as needed)

  let words = convertInteger(integerPart);
  if (words === "") words = "Zero"; // Handle case where integer part is 0

  switch (currency) {
    case "INR": words += " Rupees"
      break;
    case "USD": words += "Dollars"
      break;
    default: words += " Rupees"
  }

  if (decimalPart > 0) {
    words += " and " + convertInteger(decimalPart);
    // Or handle as 'and X/100 Rupees' or similar based on currency needs
    switch (currency) {
      case "INR": words += " Paise Only"
        break;
      case "USD": words += " Cents Only"
        break;
      default: words += " Paise Only"
    }
  } else {
    words += " Only";
  }

  return words;
};

export const convertInteger = (n: number): string => {
  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  if (n === 0) return "";
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  if (n < 100)
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
  if (n < 1000)
    return (
      units[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 !== 0 ? " and " + convertInteger(n % 100) : "")
    );
  if (n < 100000)
    return (
      convertInteger(Math.floor(n / 1000)) +
      " Thousand" +
      (n % 1000 !== 0 ? " " + convertInteger(n % 1000) : "")
    );
  // Add Lakhs, Crores etc. for Indian numbering system if needed
  return "Number too large for basic conversion"; // Placeholder for larger numbers
};

export const hasValidOrUpcomingSubscription = (
  freePlanCode: string,
  existingSubscription: IExistingSubscription | null,
  findUserUpcomingPlan: Subscription | null,
  planVariantId?: number
) => {
  const subscription = existingSubscription;
  const now = Date.now();

  const isActiveNonFreePlan =
    subscription != null &&
    (subscription.planVariants.plan.planCode !== freePlanCode && subscription.planVariants.isDefault != true) &&
    subscription.expiresAt != null;

  const expiryTime = subscription?.expiresAt?.getTime() ?? 0;
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const timeUntilExpiry = expiryTime - now;

  const expiresInMoreThan3Days = timeUntilExpiry > threeDaysMs;
  const expiresInLessThan3DaysButHasUpcoming =
    timeUntilExpiry <= threeDaysMs && findUserUpcomingPlan;

  //check if user is already subscribed to the plan and his expiry is more than 3 days
  //dont allow user to buy when 
  // 1.active plans isnt free plan 
  // 2.expiry is more than 3 days 
  // 3. if expiry is less than 3 days but has upcoming plan

  if (
    planVariantId &&
    isActiveNonFreePlan &&
    (expiresInMoreThan3Days || expiresInLessThan3DaysButHasUpcoming)
  ) {
    throw new HTTPError(`You are already subscribed to a plan.`, 653);
  }
};

export const performVoucherValidation = (
  fetchUser: FetchUserType,
  findVoucher?: IVoucherDetails | null,
  voucherId?: number,
  findAddons?: IAddOns[] | null,
  findPlanVariant?: IPlanVariants | null
) => {
  if (voucherId && !findVoucher)
    throw new HTTPError("Entered voucher does not exist", 404);

  // check if user has already used the voucher
  if (voucherId && findVoucher?.user.find((user) => user.id === fetchUser.id)) {
    throw new HTTPError(
      "User has already availed this voucher. Apply another voucher",
      651
    );
  }

  //check voucher expiry
  if (
    voucherId &&
    findVoucher?.expiresAt != null &&
    findVoucher.expiresAt <= currentTime
  ) {
    throw new HTTPError("Voucher has expired", 651);
  }

  //check if availed count  is reached
  if (
    voucherId &&
    findVoucher?.redeemLimit &&
    findVoucher.redeemLimit <= findVoucher.availedCount
  ) {
    throw new HTTPError(
      "OOPS you can't avail this voucher .As the voucher was for limited number of user please refresh your voucher's page to check the available vouchers",
      651
    );
  }
  const calculateAddonAmount = findAddons?.reduce((acc, curr) => {
    return acc + curr.amount;
  }, 0);
  const originalAmount =
    (findPlanVariant?.amount ?? 0) + (calculateAddonAmount ?? 0);
  //check min spend
  if (findVoucher?.minSpend && findVoucher.minSpend >= originalAmount) {
    // check if user has spent enough to use the voucher
    throw new HTTPError("You have not spent enough to use this voucher", 656);
  }

  //concurrent user trying to avail the voucher
  if (
    findVoucher &&
    findVoucher.availedCount + 1 === findVoucher.redeemLimit &&
    findVoucher.lockedAt != null
  ) {
    throw new HTTPError("Something went wrong please try after some time", 655);
  }
};

export const evaluateNewPlanActivationStatus = async (
  findPlanVariant: IPlanVariants | null,
  findUser: Users,
  findAddons: Addon[],
  findVoucher?: IVoucherDetails | null,
  record?: any | null
) => {
  const subscriptionExpiry =
    findPlanVariant && findPlanVariant.plan.planCode !== freePlanCode
      ? calculateStatistics(findPlanVariant.period, findPlanVariant.interval)
      : undefined;
  const {
    checkSubscriptionExpiry,
    linkAddonsVoucher,
    updateVoucherAvailedCount,
  } = await checkSubscriptionVoucherAndAddons(
    findUser,
    findAddons,
    findPlanVariant,
    findVoucher
  );

  const threeDaysBack =
    checkSubscriptionExpiry?.expiresAt &&
    checkSubscriptionExpiry?.expiresAt.getTime() - 3 * 24 * 60 * 60 * 1000;
  let createSubscription;
  if (findPlanVariant) {
    if (
      threeDaysBack &&
      checkSubscriptionExpiry?.expiresAt &&
      (Date.now() > threeDaysBack &&
        Date.now() < checkSubscriptionExpiry?.expiresAt.getTime())
    ) {
      let upcomingSubscriptionExpiry: Date | undefined;
      if (findPlanVariant.plan.planCode !== freePlanCode && subscriptionExpiry) {
        const timeDiff = checkSubscriptionExpiry.expiresAt.getTime() - Date.now();
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        upcomingSubscriptionExpiry = new Date(subscriptionExpiry);
        upcomingSubscriptionExpiry.setDate(upcomingSubscriptionExpiry.getDate() + daysLeft);
      }
      createSubscription = await prisma.subscription.create({
        data: {
          userId: findUser.id,
          createdAt: new Date(checkSubscriptionExpiry.expiresAt.getTime() + 60 * 1000),
          expiresAt: upcomingSubscriptionExpiry,
          status: "upcoming",
          planVariantId: findPlanVariant.id,
        },
      });
    } else {
      createSubscription = await prisma.subscription.create({
        data: {
          userId: findUser.id,
          expiresAt: subscriptionExpiry,
          status: "active",
          planVariantId: findPlanVariant.id,
        },
      });

      await prisma.subscription.updateMany({
        where: {
          userId: findUser.id,
          NOT: {
            id: createSubscription.id,
          },
        },
        data: {
          status: "inactive",
        },
      });
    }
  }

  if (
    ((findVoucher || findAddons.length) &&
      (!linkAddonsVoucher || !updateVoucherAvailedCount)) ||
    (findPlanVariant && !createSubscription)
  ) {
    throw new HTTPError(
      "Failed to create subscription or link voucher/add-on.",
      658
    );
  }
  if (record != null) {
    await prisma.usersToVoucher.update({
      where: {
        id: record.id
      },
      data: {
        status: "success",
        subscriptionId: createSubscription && (createSubscription.status == "active" || createSubscription.status == "upcoming") ? createSubscription.id : null
      }
    })
  }
};

export const findFreePlan = async () => {
  try {
    const findFreePlan = await prisma.plan.findUnique({
      where: {
        planCode: freePlanCode,
      },
      include: {
        planVariants: {
          where: {
            period: "unlimited",
          },
        },
      },
    });
    if (!findFreePlan) {
      throw new HTTPError("Free plan not found", 404);
    }
    return findFreePlan;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const generateReferralCodeOfSelf = () => {
  try {
    return `${getRandomCharacter(4).toUpperCase()}${getRandomDigit(4)}`;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const checkIfReferalCodeExist = async (referalCode?: string | null) => {
  try {
    if (!referalCode) {
      return { referringUser: null, voucher: null };
    }

    const [referringUser, voucher] = await Promise.all([
      prisma.users.findUnique({
        where: {
          referalCode,
        },
      }),

      prisma.voucher.findFirst({ where: { type: "referal" } }),
    ]);

    if (!referringUser) {
      throw new HTTPError("Invalid referral code ", 404);
    }

    if (!voucher) {
      throw new HTTPError(
        "Looks like the admin haven't created the referral voucher yet",
        404
      );
    }
    return { referringUser, voucher };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const paymentPreProcessing = async (
  fetchUser: FetchUserType,
  amount: number,
  planId?: number,
  planVariantId?: number,
  addOns?: Array<number>,
  voucherId?: number
) => {
  //fetch existing subscription,plan ,addons,voucher
  const [
    existingSubscription,
    findPlanVariant,
    findAddons,
    findVoucher,
    findUserUpcomingPlan,
  ] = await Promise.all([
    planVariantId
      ? prisma.subscription.findFirst({
        where: {
          userId: fetchUser.id,
          status: "active",
        },
        include: {
          planVariants: {
            select: {
              isDefault: true,
              plan: true,
            },
          },
        },
      })
      : null,

    planVariantId
      ? prisma.planVariants.findFirst({
        where: {
          id: planVariantId,
          isActive: true,
          planId,
        },
        include: {
          plan: true,
        },
      })
      : null,
    addOns && addOns.length > 0
      ? prisma.addon.findMany({
        where: {
          id: { in: addOns },
          isActive: true,
        },
        include: {
          userToAddOn: true,
        },
      })
      : null,

    voucherId
      ? prisma.voucher.findFirst({
        where: {
          AND: { id: voucherId, isActive: true },
        },
        include: {
          user: {
            where: {
              id: fetchUser.id,
            },
          },
        },
      })
      : null,

    prisma.subscription.findFirst({
      where: {
        userId: fetchUser.id,
        status: "upcoming",
      },
    }),
  ]);
  //check if entered plan exists
  if (planVariantId && !findPlanVariant) {
    throw new HTTPError(
      "The plan you are trying to use either is removed by admin or does not exist",
      404
    );
  }
  //calculate the total amount
  const totalCost = await calculateTotalSubscriptionAmount({
    findPlanVariant,
    findAddons,
    findVoucher,
  });

  hasValidOrUpcomingSubscription(
    freePlanCode,
    existingSubscription,
    findUserUpcomingPlan,
    planVariantId
  );
  const subscription = existingSubscription;

  //user trying to subscribe to free plan
  if (planVariantId && (findPlanVariant?.plan.planCode === freePlanCode || findPlanVariant?.isDefault == true)) {
    throw new HTTPError("You cannot subscribe to free / default plan", 653);
  }

  //user trying to buy addons only
  if (
    !planVariantId &&
    (subscription?.planVariants.plan.planCode === freePlanCode || subscription?.planVariants.isDefault == true)
  ) {
    throw new HTTPError("You cannot buy addons on free / default plan", 652);
  }

  //check if addons exists
  // Validate claimed addons
  if (
    findAddons?.some((item) =>
      item.userToAddOn.some((item) => item.userId === fetchUser.id)
    )
  ) {
    throw new HTTPError("One or more addons are already claimed", 655);
  }

  // check if voucher exist

  performVoucherValidation(
    fetchUser,

    findVoucher,
    voucherId,
    findAddons,
    findPlanVariant
  );

  //cross check the total amount
  if (
    parseFloat(totalCost.toString()).toFixed(2) !==
    parseFloat(amount.toString()).toFixed(2)
  ) {
    throw new HTTPError(
      "Provided amount is tampered, please re-initiate your payment.",
      657
    );
  }

  //lock the voucher till user completes the transaction
  if (
    findVoucher &&
    findVoucher.availedCount + 1 === findVoucher.redeemLimit &&
    findVoucher.lockedAt == null
  ) {
    await prisma.voucher.update({
      where: { id: voucherId },
      data: {
        lockedAt: currentTime,
        lockedBy: fetchUser.id,
      },
    });
  }

  return { findPlanVariant, findVoucher, findAddons, totalCost };
};

export const calculateTotalSubscriptionAmount = async (data: {
  findPlanVariant: PlanVariants | null;
  findAddons: Addon[] | null;
  findVoucher: (Voucher & { user: Users[] }) | null;
}) => {
  const addOnsTotalAmount = data.findAddons?.reduce((total, item) => {
    return total + item.amount;
  }, 0);

  const totalCost =
    (data.findPlanVariant?.amount ?? 0) +
    (addOnsTotalAmount ?? 0) -
    ((data.findPlanVariant?.amount ?? 0) + (addOnsTotalAmount ?? 0)) *
    ((data.findVoucher?.amount ?? 0) / 100);

  return parseFloat(totalCost.toString()).toFixed(2);
};
