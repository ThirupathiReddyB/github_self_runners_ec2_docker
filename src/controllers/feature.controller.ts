import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import { Helpers } from "../utility/Helpers";
import {
  ICreateFeature,
  ICreateFeatureMetadata,
} from "../utility/DataTypes/types.feature";
import {
  VCreateFeature,
  VUpdateFeature,
} from "../utility/Validation/feature.validation";
import { IGetCommon } from "../utility/DataTypes/types.common";
import { VCreateFeatureMetadata } from "../utility/Validation/metadata.validation";
import {
  addFeatureMetadata,
  createUpdateFeature,
  getFeature,
  getMetadata,
  removeFeature,
} from "../services/feature.services";

export const createFeature = async (req: Request, res: Response) => {
  try {
    if (!Object.keys(req.body).length) {
      throw new HTTPError("API Missing body", 422);
    }

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const { featureName, canonicalName, featureDescription, featureIsActive } =
      req.body;

    const params: ICreateFeature = {
      featureName,
      featureDescription,
      canonicalName,
      featureIsActive,
    };

    Helpers.validateWithZod(VCreateFeature, params);

    const newFeature = await createUpdateFeature(params);
    if (!newFeature) throw new HTTPError(`Could Not Create New Feature`, 204);
    const code = newFeature.success ? 200 : 400;
    res.status(code).json({ data: newFeature });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getFeatures = async (req: Request, res: Response) => {
  try {
    const { id, search, page, limit } = req.query;

    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const queryFields: IGetCommon = {
      id: id ? parseInt(id as string) : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };

    const featureData = await getFeature(queryFields);
    if (!featureData) throw new HTTPError(`Could Not get feature data`, 204);
    const code = featureData.success ? 200 : 400;
    res.status(code).json({ data: featureData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updateFeatureById = async (req: Request, res: Response) => {
  try {
    if (!Object.keys(req.body).length) {
      throw new HTTPError("API Missing body", 422);
    }

    const id = req.params.id;

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    if (!id) throw new HTTPError("provide id of feature to update", 422);

    const { featureName, canonicalName, featureDescription, featureIsActive } =
      req.body;

    const params: ICreateFeature = {
      id: parseInt(id),
      featureName,
      canonicalName,
      featureDescription,
      featureIsActive,
      // planId: planId ? JSON.parse(JSON.stringify(planId)) : undefined,
    };

    Helpers.validateWithZod(VUpdateFeature, params);

    const updateFeature = await createUpdateFeature(params);
    if (!updateFeature) throw new HTTPError(`Could Not update feature`, 204);
    const code = updateFeature.success ? 200 : 400;
    res.status(code).json({ data: updateFeature });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteFeatureById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) throw new HTTPError("provide id of feature to update", 422);

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const delFeature = await removeFeature(parseInt(id));
    if (!delFeature) throw new HTTPError(`Could Not remove feature`, 204);
    const code = delFeature.success ? 200 : 400;
    res.status(code).json({ data: delFeature });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const createFeatureMetadata = async (req: Request, res: Response) => {
  try {
    if (!Object.keys(req.body).length) {
      throw new HTTPError("API Missing body", 422);
    }

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const { featureId, value, remark } = req.body;

    const params: ICreateFeatureMetadata = {
      featureId: parseInt(featureId),
      value,
      remark,
    };

    Helpers.validateWithZod(VCreateFeatureMetadata, params);

    const newFeatureLimit = await addFeatureMetadata(params);
    if (!newFeatureLimit)
      throw new HTTPError(`Could Not Create New Feature metadata`, 204);
    const code = newFeatureLimit.success ? 200 : 400;
    res.status(code).json({ data: newFeatureLimit });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getFeatureMetadata = async (req: Request, res: Response) => {
  try {
    const { id, isFiltered } = req.query;

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const queryFields: IGetCommon = {
      id: id ? parseInt(id as string) : undefined,
      isFiltered: isFiltered ? JSON.parse(JSON.stringify(isFiltered)) : false,
    };

    const featureLimits = await getMetadata(queryFields);
    if (!featureLimits) throw new HTTPError(`Could Not update feature`, 204);
    const code = featureLimits.success ? 200 : 400;
    res.status(code).json({ data: featureLimits });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
