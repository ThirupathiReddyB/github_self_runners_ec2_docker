import { generateSkip } from "../constants/data";
import prisma from "../prisma";
import { IGetCommon } from "../utility/DataTypes/types.common";
import {
  ICreateFeature,
  ICreateFeatureMetadata,
  IRecordData,
  TMetadataValue,
} from "../utility/DataTypes/types.feature";
import { handleError } from "../utility/Error";
import HTTPError from "../utility/HttpError";

export const featureCommonSelect = {
  id: true,
  name: true,
  canonicalName: true,
  description: true,
  isActive: true,
  metadata: true,
};
export const createUpdateFeature = async (params: ICreateFeature) => {
  try {
    const {
      id,
      featureName,
      canonicalName,
      featureDescription,
      featureIsActive,
    } = params;

    // fetch existing feature
    const featureData = id
      ? await prisma.feature.findUnique({
          select: featureCommonSelect,
          where: {
            id,
          },
        })
      : null;

    if (id && !featureData) throw new HTTPError("Feature Not Found", 404);

    //pre-processing
    const [existingFeature, existingCanonicalName] = await Promise.all([
      prisma.feature.findFirst({
        where: {
          name: {
            equals: featureName,
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
          canonicalName,
        },
      }),
    ]);

    if (existingFeature)
      throw new HTTPError("Feature with same name already exists", 422);
    if (existingCanonicalName)
      throw new HTTPError(
        "Entered canonical Name already exists in system",
        422
      );

    const updateFeatureData = await prisma.feature.upsert({
      where: id ? { id } : { name: featureName },
      update: {
        name: featureName,
        canonicalName,
        description: featureDescription,
        isActive: featureIsActive,
      },
      create: {
        name: featureName,
        canonicalName,
        description: featureDescription,
        isActive: featureIsActive,
      },
    });

    if (!updateFeatureData)
      throw new HTTPError("Could not add/update feature", 500);

    return {
      success: true,
      feature: updateFeatureData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const removeFeature = async (id: number) => {
  try {
    const existingFeature = await prisma.feature.findUnique({
      select: featureCommonSelect,
      where: {
        id,
      },
    });

    if (!existingFeature)
      return {
        data: null,
        error: new HTTPError("Feature Not found", 404),
      };

    // remove entry from db
    const deletefeatureData = await prisma.feature.delete({
      where: {
        id,
      },
    });
    if (!deletefeatureData)
      throw new HTTPError("Could not delete feature", 500);

    return {
      success: true,
      message: "Feature deleted successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getFeature = async (params: IGetCommon) => {
  try {
    const { search, page, limit = 10, id } = params;

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

    let [featureData, totalRecords] = await Promise.all([
      prisma.feature.findMany({
        where,
        select: featureCommonSelect,
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
      prisma.feature.count({
        where,
      }),
    ]);

    if (!featureData || (id && !featureData.length))
      throw new HTTPError("Could not fetch feature data", 404);

    return {
      success: true,
      data: featureData,
      totalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getMetadata = async (params: IGetCommon) => {
  try {
    const { id, isFiltered } = params;
    const where: any = {};
    if (id) where.id = id;

    const getLimits = await prisma.feature.findMany({
      where,
      select: {
        id: true,
        name: true,
        canonicalName: true,
        metadata: {
          select: {
            id: true,
            value: true,
            remark: true,
          },
        },
      },
    });
    if (!getLimits) throw new HTTPError("Could not find metadata", 404);

    if (isFiltered) {
      const data = getLimits as IRecordData[];
      const uniqueSchemas = new Set<string>();

      return {
        success: true,
        data: data.flatMap(
          (record) =>
            record.metadata
              .map((meta) => {
                const schema: TMetadataValue = {};
                for (const key in meta.value) {
                  const valueType = typeof meta.value[key];

                  switch (valueType) {
                    case "number":
                      schema[key] = "number";
                      break;
                    case "boolean":
                      schema[key] = "boolean";
                      break;
                    default:
                      if (["KB", "MB", "GB"].includes(meta.value[key])) {
                        schema[key] = ["KB", "MB", "GB"];
                      } else schema[key] = meta.value[key];
                      break;
                  }
                }
                const schemaString = JSON.stringify(schema);
                if (!uniqueSchemas.has(record.id + schemaString)) {
                  uniqueSchemas.add(record.id + schemaString);
                  return {
                    featureId: record.id,
                    featureName: record.name,
                    featureCanonicalName: record.canonicalName,
                    meta: schema,
                  };
                }
                return null;
              })
              .filter(Boolean) // Remove null values
        ),
      };
    }

    return {
      success: true,
      data: getLimits,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const addFeatureMetadata = async (params: ICreateFeatureMetadata) => {
  try {
    const { featureId, value, remark } = params;

    // fetch existing feature
    const [existingFeature, featureData] = await Promise.all([
      prisma.feature.findFirst({
        where: {
          id: featureId,
        },
      }),
      prisma.metadata.findUnique({
        where: {
          featureId_value: {
            featureId,
            value,
          },
        },
      }),
    ]);

    if (featureData)
      throw new HTTPError("Feature metadata already exists", 422);

    if (!existingFeature)
      throw new HTTPError("feature-id entered does not exist.", 404);

    const addLimit = await prisma.metadata.create({
      data: {
        featureId,
        value,
        remark,
      },
    });
    if (!addLimit)
      throw new HTTPError("Could not add new feature metadata", 500);

    return {
      success: true,
      metadata: addLimit,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
