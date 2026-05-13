import { Addon, PlanVariants, Users, Voucher } from "../../prisma/generated/prisma/client";
import { handleError } from "./Error";
import prisma from "../prisma";
import HTTPError from "./HttpError";
import {
  currentTime,
  freePlanCode,
  getRandomCharacter,
  getRandomDigit,
} from "../constants/data";
import {
  activeSubscription,
  FetchUserType,
} from "./DataTypes/types.subscription";
import {
  hasValidOrUpcomingSubscription,
  markFreePlanActiveForUser,
  markUpcomingPlanAsActiveForUser,
  performVoucherValidation,
  updateSubscriptionStatus,
} from "./helperFunction/subscription.services.helper";
import { getSubscription } from "../services/subscription.services";

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
              id: true,
              isActive: true,
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
  if (planVariantId && findPlanVariant?.plan.planCode === freePlanCode) {
    throw new HTTPError("You cannot subscribe to free plan", 653);
  }

  //user trying to buy addons only
  if (
    !planVariantId &&
    subscription?.planVariants.plan.planCode === freePlanCode
  ) {
    throw new HTTPError("You cannot buy addons on free plan", 652);
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

export const updateSubscriptionIfExpired = async (
  userId: string,
  messages: Array<string>
) => {
  let currentSubscription: activeSubscription | null = null;

  let { data } = await getSubscription({ userId });
  if (data.activeSubscriptionDataFormatted.length === 0) {
    //link user to free plan
    await markFreePlanActiveForUser(userId);
    throw new HTTPError(
      "Subscription not found, user must be linked to at least a free plan",
      404
    );
  }
  currentSubscription = data.activeSubscriptionDataFormatted[0];
  const activeSubscriptionExpiry =
    data.activeSubscriptionDataFormatted[0].expiresAt;

  const findUpcomingPlan = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "upcoming",
    },
  });

  // Handle subscription expiry
  if (
    currentSubscription.expiresAt != null &&
    currentSubscription.expiresAt < currentTime
  ) {
    await updateSubscriptionStatus(
      currentSubscription.id,
      userId,
      currentSubscription.plan.planVariants.id,
      "inactive"
    );

    if (findUpcomingPlan != null) {
      await markUpcomingPlanAsActiveForUser(userId, findUpcomingPlan.id);
    } else {
      await markFreePlanActiveForUser(userId);
    }

    let { data } = await getSubscription({ userId });
    if (data.activeSubscriptionDataFormatted.length === 0) {
      //link user to free plan
      await markFreePlanActiveForUser(userId);
      // throw new HTTPError(
      //   "Subscription not found, user must be linked to at least a free plan",
      //   404
      // );
    }
    currentSubscription = data.activeSubscriptionDataFormatted[0];
    messages.push(
      "Your subscription has expired. Please upgrade your plan to continue using the service."
    );
  }
  const latestExpiryDate = currentSubscription.expiresAt;
  return { currentSubscription, latestExpiryDate, activeSubscriptionExpiry };
};
