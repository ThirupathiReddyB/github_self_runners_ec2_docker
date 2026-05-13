import { Request, Response } from "express";
import { Helpers } from "../utility/Helpers";
import HTTPError from "../utility/HttpError";
import { IGetCommon } from "../utility/DataTypes/types.common";
import { ICreatePlan } from "../utility/DataTypes/types.plan";
import {
  VCreatePlan,
  VUpdatePlan,
} from "../utility/Validation/plan.validation";
import {
  createUpdatePlan,
  getPlan,
  removePlan,
} from "../services/plan.services";

export const createPlan = async (req: Request, res: Response) => {
  try {
    if (!Object.keys(req.body).length) {
      throw new HTTPError("API Missing body", 422);
    }

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const {
      planName,
      planAmount,

      planPeriod,
      planInterval,
      planNotes,
      planIsActive,
      isDefault,
      defaultExpiry,
      features,
      planVariantId,
      planVariantName,
    } = req.body;

    const params: ICreatePlan = {
      planName,
      planAmount: parseFloat(planAmount),
      planVariantName: planVariantName,
      planPeriod,
      planInterval: parseInt(planInterval),
      planNotes,
      planIsActive,
      isDefault,
      defaultExpiry: defaultExpiry ? new Date(defaultExpiry) : undefined,
      features: JSON.parse(JSON.stringify(features)),
      planVariantId,
    };

    Helpers.validateWithZod(VCreatePlan, params);

    const newPlan = await createUpdatePlan(admin, params);
    if (!newPlan) throw new HTTPError(`Could Not Create New Plan`, 204);
    const code = newPlan.success ? 200 : 400;
    res.status(code).json({ data: newPlan });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getPlans = async (req: Request, res: Response) => {
  try {
    const { id, search, page, limit, filter } = req.query;
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const queryFields: IGetCommon = {
      id: id ? parseInt(id as string) : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
      filter: filter ? filter as string : undefined
    };

    const planData = await getPlan(queryFields, admin);
    if (!planData) throw new HTTPError(`Could Not get plan data`, 204);
    const code = planData.success ? 200 : 400;
    res.status(code).json({ data: planData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updatePlanById = async (req: Request, res: Response) => {
  try {
    if (!Object.keys(req.body).length) {
      throw new HTTPError("API Missing body", 422);
    }

    const id = req.params.id;
    const planVariantId = req.params.planVariantId;
    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    if (!id) throw new HTTPError("provide id of plan to update", 422);

    const {
      planName,
      planAmount,
      planVariantName,
      planPeriod,
      planInterval,
      planNotes,
      planIsActive,
      features,
      defaultExpiry,
      isDefault,
    } = req.body;

    const params: ICreatePlan = {
      id: parseInt(id),
      planName,
      planAmount: parseFloat(planAmount),
      planVariantName,
      planPeriod,
      planInterval: parseInt(planInterval),
      planNotes,
      planIsActive,
      isDefault,
      defaultExpiry: defaultExpiry ? new Date(defaultExpiry) : undefined,
      features: features ? JSON.parse(JSON.stringify(features)) : undefined,
      planVariantId: parseInt(planVariantId),
    };
    if ((id && !planVariantId) || (planVariantId && !id)) {
      throw new Error(
        "while updating both id and planVariantId must be provided"
      );
    }
    Helpers.validateWithZod(VUpdatePlan, params);

    const updatePlan = await createUpdatePlan(admin, params);
    if (!updatePlan) throw new HTTPError(`Could Not Update Plan`, 204);
    const code = updatePlan.success ? 200 : 400;
    res.status(code).json({ data: updatePlan });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deletePlanById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    if (!id) throw new HTTPError("provide id of plan to update", 422);

    const deletePlanData = await removePlan(parseInt(id));
    if (!deletePlanData) throw new HTTPError(`Could Not remove Plan`, 204);
    const code = deletePlanData.success ? 200 : 400;
    res.status(code).json({ data: deletePlanData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
