import prisma from "../../prisma";
import { ICreatePlan } from "../DataTypes/types.plan";
import HTTPError from "../HttpError";

export const findPlanData = async (planVariantId: number, id?: number) => {
  const planData = id
    ? await prisma.plan.findUnique({
        where: {
          id,
        },
        include: {
          planVariants: {
            where: {
              id: planVariantId,
            },
          },
        },
      })
    : null;
  if (id && planVariantId && !planData)
    throw new HTTPError("Plan Not Found", 404);
  return planData;
};

export const duplicatePlan = async (params: ICreatePlan) => {
  const { id, planName, planPeriod, planInterval } = params;
  const existingPlan = await prisma.plan.findFirst({
    where: {
      name: {
        equals: planName,
        mode: "insensitive",
      },
      planVariants: {
        some: {
          period: planPeriod,
          interval: planInterval, // check if period is valid
        },
      },
      NOT: id
        ? {
            id,
          }
        : undefined,
    },
  });
  if (existingPlan) throw new HTTPError("Same Plan Name already exists", 422);
};

export const existingDefaultPlan = async (params: ICreatePlan) => {
  const { planVariantId, isDefault } = params;
  const existingDefaultPlan = await prisma.planVariants.findFirst({
    where: {
      isDefault: true,
      isActive: true,

      NOT: planVariantId
        ? {
            id: planVariantId,
          }
        : undefined,
    },
    include: {
      plan: true,
    },
  });
  if (existingDefaultPlan && isDefault)
    throw new HTTPError(
      "Another plan is already set as default for new users",
      422
    );

  return existingDefaultPlan;
};

export const findExistingFeatures = async (params: ICreatePlan) => {
  const { features } = params;
  const existingFeatures = await prisma.feature.findMany({
    where: {
      id: {
        in: features.map((feature) => feature.featureId),
      },
    },
  });
  return existingFeatures;
};

export const validMetadata = async (params: ICreatePlan) => {
  const { features } = params;
  const validMetadata = await prisma.metadata.findMany({
    where: {
      OR: features.map((feature) => ({
        featureId: feature.featureId,
        id: feature.metaId,
      })),
    },
  });
  if (validMetadata && features.length != validMetadata.length)
    throw new HTTPError("Invalid metaId for feature or vice versa", 422);
  return validMetadata;
};

export const existingPeriod = async (params: ICreatePlan) => {
  const { id, planPeriod, planVariantId } = params;
  const existingPeriod = id
    ? prisma.planVariants.findFirst({
        where: {
          period: planPeriod,
          planId: id,
          NOT: {
            id: planVariantId,
          },
        },
      })
    : null;
  if (existingPeriod) {
    throw new HTTPError(
      "Same Plan period already exists for this plan please either remove the plan variant or provide the correct variant id name ",
      422
    );
  }
  return existingPeriod;
};
