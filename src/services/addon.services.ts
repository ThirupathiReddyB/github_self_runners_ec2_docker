import { generateSkip } from "../constants/data";
import prisma from "../prisma";
import { ICreateAddon } from "../utility/DataTypes/types.addon";
import { adminTokenData } from "../utility/DataTypes/types.admin";
import { IGetCommon } from "../utility/DataTypes/types.common";
import { handleError } from "../utility/Error";
import HTTPError from "../utility/HttpError";

export const addonCommonSelect = {
  id: true,
  name: true,
  description: true,
  amount: true,
  currency: true,
  isActive: true,
  period: true,
  interval: true,
  value: true,
  feature: {
    select: {
      id: true,
      name: true,
      canonicalName: true,
    },
  },
};

export type TAddon = typeof addonCommonSelect;

export const createUpdateAddon = async (
  admin: adminTokenData,
  params: ICreateAddon
) => {
  try {
    const {
      id,
      addonName,
      addonDescription,
      addonAmount,
      addonCurrency,
      addonIsActive,
      featureId,
      addonPeriod,
      addonInterval,
      addonMeta,
    } = params;

    // fetch existing add-on
    const addonData = id
      ? await prisma.addon.findUnique({
          select: {
            id: true,
            name: true,
            amount: true,
            currency: true,
            isActive: true,
          },
          where: {
            id,
          },
        })
      : null;

    if (id && !addonData) throw new HTTPError("Add-On Not Found", 404);

    //pre-processing
    const [existingAddOn, existingFeatures] = await Promise.all([
      prisma.addon.findFirst({
        where: {
          name: {
            equals: addonName,
            mode: "insensitive",
          },
          NOT: id
            ? {
                id,
              }
            : undefined,
        },
      }),
      prisma.feature.findFirst({
        where: {
          id: featureId,
        },
      }),
    ]);

    if (existingAddOn) {
      const fieldError = {
        fieldName: "addonName",
        message: "Same Add-on already exists.",
      };
      throw new HTTPError(fieldError, 400);
    }

    if (!existingFeatures) throw new HTTPError(" feature does not exist", 400);

    const updateAddonData = await prisma.addon.upsert({
      where: id ? { id } : { name: addonName },
      update: {
        name: addonName,
        description: addonDescription,
        amount: addonAmount,
        currency: addonCurrency,
        isActive: addonIsActive,
        period: addonPeriod,
        interval: addonInterval,
        value: addonMeta,
        updatedBy: admin.emailId,
        feature: {
          connect: {
            id: featureId,
          },
        },
      },
      create: {
        name: addonName,
        description: addonDescription,
        amount: addonAmount,
        currency: addonCurrency,
        isActive: addonIsActive,
        period: addonPeriod,
        interval: addonInterval,
        value: addonMeta,
        updatedBy: admin.emailId,
        feature: {
          connect: {
            id: featureId,
          },
        },
      },
      select: addonCommonSelect,
    });

    if (!updateAddonData)
      throw new HTTPError("Could not add/update add-on", 500);

    return {
      success: true,
      addOn: updateAddonData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const removeAddon = async (id: number) => {
  try {
    const existingAddon = await prisma.addon.findUnique({
      select: addonCommonSelect,
      where: {
        id,
      },
    });

    if (!existingAddon)
      return {
        data: null,
        error: new HTTPError("Add-On Not found", 404),
      };

    // remove entry from db
    const deleteAddonData = await prisma.addon.delete({
      where: {
        id,
      },
    });
    if (!deleteAddonData) throw new HTTPError("Could not delete add-on", 500);

    return {
      success: true,
      message: "add-on deleted successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getAddon = async (params: IGetCommon) => {
  try {
    const { search, page, limit = 10, id, userId } = params;

    const skip = generateSkip(limit, page);
    const take = limit ?? undefined;

    const where: any = {};

    if (id) where.id = id;
    if (search)
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];

    if (userId) {
      where.userToAddOn = {
        some: {
          userId: userId,
          expiresAt: {
            gt: new Date(), // Only include non-expired addons
          },
        },
      };
    }
    let [addonData, totalRecords] = await Promise.all([
      prisma.addon.findMany({
        where,
        select: addonCommonSelect,
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
      prisma.addon.count({
        where,
      }),
    ]);

    if (!addonData || (id && !addonData.length))
      throw new HTTPError("Could not fetch add-on data", 404);

    return {
      success: true,
      data: addonData,
      totalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
