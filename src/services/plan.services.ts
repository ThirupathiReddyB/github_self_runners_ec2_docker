import prisma from "../prisma";
import { IGetCommon } from "../utility/DataTypes/types.common";
import { handleError } from "../utility/Error";
import HTTPError from "../utility/HttpError";
import { ICreatePlan } from "../utility/DataTypes/types.plan";
import crypto from "crypto";
import { adminTokenData } from "../utility/DataTypes/types.admin";
import { freePlanCode, generateSkip } from "../constants/data";
import {
  duplicatePlan,
  existingDefaultPlan,
  existingPeriod,
  findExistingFeatures,
  findPlanData,
  validMetadata,
} from "../utility/helperFunction/plan.services.helpers";
import { ITokenData } from "../utility/DataTypes/types.user";
import { isAdminTokenData } from "../utility/helperFunction/admin.auth.services.helper";
import { subscriptionBannerFeatures } from "../constants/subscriptionData";

export const planCommonSelect = {
  id: true,
  name: true,
  planCode: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
  planVariants: {
    select: {
      id: true,
      name: true,
      period: true,
      interval: true,
      isActive: true,
      isDefault: true,
      amount: true,
      defaultExpiry: true,
      createdAt: true,
      updatedAt: true,
      updatedBy: true,
      PlanToFeature: {
        select: {
          id: true,
          planVariantId: true,
          feature: {
            select: {
              name: true,
              canonicalName: true,
              id: true,
            },
          },
          metadata: {
            select: {
              id: true,
              value: true,
              remark: true,
            },
          },
        },
      },
    },
  },
};
export const createUpdatePlan = async (
  admin: adminTokenData,
  params: ICreatePlan
) => {
  try {
    const {
      id,
      planName,
      planAmount,
      planPeriod,
      planInterval,
      planNotes,
      planIsActive,
      features,
      isDefault,
      defaultExpiry,
      planVariantId,
      planVariantName,
    } = params;

    const setdefaultExpiry = isDefault ? defaultExpiry : null;
    // fetch existing plan
    const planData = await findPlanData(planVariantId, id);

    //pre-processing
    await Promise.all([
      duplicatePlan(params),
      existingDefaultPlan(params),
      validMetadata(params),
      existingPeriod(params),
    ]);
    const existingFeatures = await findExistingFeatures(params);

    //ensure plan has family_care and storage
    const findFamilyCareFeature = existingFeatures.find(
      (obj) => obj.canonicalName == "family_care"
    );
    const findStorageFeature = existingFeatures.find(
      (obj) => obj.canonicalName == "storage"
    );

    if (!findFamilyCareFeature || !findStorageFeature)
      throw new HTTPError(
        "Feature list needs to mandatorily include family care and storage",
        422
      );

    const distinctFeatureIds = new Set<number>();
    features.forEach((feature) => {
      if (!distinctFeatureIds.has(feature.featureId)) {
        distinctFeatureIds.add(feature.featureId);
      }
    });

    if ([...distinctFeatureIds].length != features.length)
      throw new HTTPError("2 variations of same feature is not allowed", 422);

    if ([...distinctFeatureIds].length != existingFeatures.length)
      throw new HTTPError("One of more features added do not exist", 422);

    let planCode = createPlanCode(planName);

    if (id && planData && planData.name != planName) {
      planCode = createPlanCode(planName);
    } else if (id && planData && planData.name == planName) {
      planCode = planData.planCode;
    }
    const upsertedPlan = await prisma.plan.upsert({
      where: id ? { id } : { name: planName },
      update: {
        name: planName,
        planCode,
        notes: planNotes,
        updatedBy: admin.emailId,
      },
      create: {
        name: planName,
        planCode,
        notes: planNotes,
        updatedBy: admin.emailId,
      },
      select: {
        id: true,
      },
    });

    const updatePlanData = await prisma.planVariants.upsert({
      where: planVariantId
        ? { id: planVariantId }
        : {
          period_interval_planId: {
            period: planPeriod,
            planId: upsertedPlan.id,
            interval: planInterval,
          },
        },
      update: {
        amount: planAmount,
        name: planVariantName,
        period: planPeriod,
        interval: planInterval,
        isActive: planIsActive,
        isDefault,
        defaultExpiry: setdefaultExpiry,
        PlanToFeature: {
          deleteMany: {}, // Remove all existing features
          create: features.map((feature) => ({
            featureId: feature.featureId,
            MetadataId: feature.metaId,
          })),
        },
      },
      create: {
        name: planVariantName,
        amount: planAmount,
        period: planPeriod,
        interval: planInterval,
        isActive: planIsActive,
        isDefault,
        defaultExpiry: setdefaultExpiry,
        updatedBy: admin.emailId,

        planId: upsertedPlan.id,
        PlanToFeature: {
          create: features.map((feature) => ({
            featureId: feature.featureId,
            MetadataId: feature.metaId,
          })),
        },
      },
      select: {
        id: true,
        period: true,
        interval: true,
        isActive: true,
        isDefault: true,
        defaultExpiry: true,
        PlanToFeature: true,
        plan: true,
      },
    });

    if (!updatePlanData) throw new HTTPError("Could not add/update plan", 500);

    return {
      success: true,
      planVariant: updatePlanData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const removePlan = async (id: number) => {
  try {
    const existingPlan = await prisma.plan.findUnique({
      select: planCommonSelect,
      where: {
        id,
      },
    });

    if (!existingPlan) throw new HTTPError("Plan Not found", 404);

    //If plan is the default plan set in system, do not let superadmin delete
    if (existingPlan && existingPlan.planCode === freePlanCode)
      throw new HTTPError(
        "Unauthorised to delete this plan. Contact Developer if you still wish to delete this plan",
        401
      );

    //If plan to be deleted is set as default for all new users, alert user to make other plan as default

    if (existingPlan?.planVariants?.some((variant) => variant.isDefault)) {
      throw new HTTPError(
        "This plan is set as default for all new users. Please make an alternate plan as default before deleting this one",
        422
      );
    }
    // remove entry from db
    const deletePlanData = await prisma.plan.delete({
      where: {
        id,
      },
    });
    if (!deletePlanData) throw new HTTPError("Could not delete plan", 500);

    return {
      success: true,
      message: "Plan deleted successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getPlan = async (params: IGetCommon, user: adminTokenData | ITokenData) => {
  try {
    const { search, page, limit = 10, id, filter } = params;

    const skip = generateSkip(limit, page);
    const take = limit ?? undefined;

    const where: any = {};

    if (id) where.id = id;

    // if (!isAdminTokenData(user) || filter == "for_voucher") {
    //   where.planVariants = {
    //     none: {
    //       isDefault: true
    //     }
    //   }
    //   // where.planVariants = {
    //   //   some: {
    //   //     isDefault: false
    //   //   }
    //   // }
    // }

    if (search)
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          notes: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];

    let [planData, totalRecords] = await Promise.all([
      prisma.plan.findMany({
        where,
        select: planCommonSelect,
        skip,
        take,
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            id: "desc",
          },
        ],
      }),
      prisma.plan.count({
        where,
      }),
    ]);

    if (!planData || (id && !planData.length))
      throw new HTTPError("Could not fetch plan data", 500);

    //format data
    if (!isAdminTokenData(user) || filter == "for_voucher") {
      planData = planData.filter((plan) => {
        plan.planVariants = plan.planVariants.filter((variant) => {
          return variant.isDefault == false && plan.planCode !== freePlanCode
        })
        return plan.planVariants.length > 0
      });
    }
    const formattedFeatureData = planData.map((plan) => {
      const { planVariants, ...filteredData } = plan;
      const formattedPlanVariants = planVariants.map((variant) => {
        const { PlanToFeature, ...filteredVariant } = variant;
        const feature = !isAdminTokenData(user) ? subscriptionBannerFeatures : PlanToFeature.map((item) => {
          const { feature, ...filteredFeature } = item;
          return {
            featureName: feature.name,
            canonicalName: feature.canonicalName,
            featureId: feature.id,
            metaId: filteredFeature.metadata.id,
            metaValue: filteredFeature.metadata.value,
            remark: filteredFeature.metadata.remark,
          };
        });

        return {
          ...filteredVariant,
          feature,
        };
      });

      return {
        ...filteredData,
        planVariants: formattedPlanVariants,
      };
    });

    return {
      success: true,
      data: formattedFeatureData,
      totalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const createPlanCode = (planName: string): string => {
  try {
    const uid = 1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000); //4 random numbers
    const trimmedName = planName.split(" ")[0].toLocaleLowerCase();
    if (trimmedName === "")
      throw new HTTPError(
        "Name starts with a blank space. Please check name",
        422
      );
    return trimmedName + "_" + uid;
  } catch (error: unknown) {
    throw handleError(error);
  }
};
