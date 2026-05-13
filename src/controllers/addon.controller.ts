import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import { ICreateAddon } from "../utility/DataTypes/types.addon";
import { Helpers } from "../utility/Helpers";
import {
  VCreateAddon,
  VUpdateAddon,
} from "../utility/Validation/addon.validation";
import { IGetCommon } from "../utility/DataTypes/types.common";
import {
  createUpdateAddon,
  getAddon,
  removeAddon,
} from "../services/addon.services";

export const createAddOn = async (req: Request, res: Response) => {
  try {
    if (!Object.keys(req.body).length) {
      throw new HTTPError("API Missing body", 422);
    }

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const {
      addonName,
      addonDescription,
      addonAmount,
      addonCurrency,
      addonPeriod,
      addonInterval,
      addonIsActive,
      addonMeta,
      featureId,
    } = req.body;

    const params: ICreateAddon = {
      addonName,
      addonDescription,
      addonAmount,
      addonCurrency,
      addonPeriod,
      addonInterval: parseInt(addonInterval),
      addonIsActive,
      addonMeta,
      featureId,
    };

    Helpers.validateWithZod(VCreateAddon, params);

    const newAddon = await createUpdateAddon(admin, params);
    if (!newAddon) throw new HTTPError(`Could Not Create New Add-On`, 204);
    const code = newAddon.success ? 200 : 400;
    res.status(code).json({ data: newAddon });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const readAddOns = async (req: Request, res: Response) => {
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

    const addonData = await getAddon(queryFields);
    if (!addonData) throw new HTTPError(`Could Not get add-on data`, 204);
    const code = addonData.success ? 200 : 400;
    res.status(code).json({ data: addonData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updateAddOnById = async (req: Request, res: Response) => {
  try {
    if (!Object.keys(req.body).length) {
      throw new HTTPError("API Missing body", 422);
    }

    const id = req.params.id;

    if (!id) throw new HTTPError("provide id of add-on to update", 422);

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const {
      addonName,
      addonDescription,
      addonAmount,
      addonCurrency,
      addonIsActive,
      featureId,
      addonPeriod,
      addonInterval,
      addonMeta,
    } = req.body;

    const params: ICreateAddon = {
      id: parseInt(id),
      addonName,
      addonDescription,
      addonAmount,
      addonCurrency,
      addonIsActive,
      featureId,
      addonPeriod,
      addonInterval: addonInterval ? parseInt(addonInterval) : 1,
      addonMeta,
    };

    Helpers.validateWithZod(VUpdateAddon, params);

    const updateAddonData = await createUpdateAddon(admin, params);
    if (!updateAddonData) throw new HTTPError(`Could Not Update add-on`, 204);
    const code = updateAddonData.success ? 200 : 400;
    res.status(code).json({ data: updateAddonData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteAddOnById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    if (!id) throw new HTTPError("provide id of add-on to update", 422);

    const delAddonData = await removeAddon(parseInt(id));
    if (!delAddonData) throw new HTTPError(`Could Not delete add-on`, 204);
    const code = delAddonData.success ? 200 : 400;
    res.status(code).json({ data: delAddonData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
