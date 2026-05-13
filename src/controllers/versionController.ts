import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import { Helpers } from "../utility/Helpers";
import { CreateAppVersion, UpdateAppVersion } from "../utility/Validation/common.validation";
import { ICreateVersion, IUpdateVersion } from "../utility/DataTypes/types.common";
import { AppEnv } from "../../prisma/generated/prisma/enums";
import { createVersionUpdate, updateVersion } from "../services/versionService";

export const addAppUpdateVersion = async (req: Request, res: Response) => {
    try {
        const admin = req.admin;
        if (!admin || admin.role !== "superAdmin") {
            throw new HTTPError("Unauthorized", 401);
        }

        req.body ??
            (() => {
                throw new HTTPError("API Missing body", 422);
            })();

        const { appVersion, appEnvironment, isForceUpdate, features } = req.body;
        const inputData: ICreateVersion = {
            appVersion,
            appEnvironment: appEnvironment as AppEnv,
            isForceUpdate,
            isActive: true,
            features
        };

        Helpers.validateWithZod(CreateAppVersion, inputData);

        const createdVersionDeets = await createVersionUpdate(inputData);

        if (!createdVersionDeets)
            throw new HTTPError(
                `Could Not Create App update Version ${req.params.id}`,
                204
            );
        const code = createdVersionDeets.success ? 200 : 400;
        res.status(code).json({ data: createdVersionDeets });
    } catch (err) {
        if (err instanceof HTTPError) {
            res.status(err.code).json({ error: { message: err.message } });
        } else {
            res.status(500).json({ error: { message: "Internal server error" } });
        }
    }
};

export const editAppUpdateVersionById = async (req: Request, res: Response) => {
    try {
        const admin = req.admin;
        if (!admin || admin.role !== "superAdmin") {
            throw new HTTPError("Unauthorized", 401);
        }

        req.body ??
            (() => {
                throw new HTTPError("API Missing body", 422);
            })();

        const id = req.params.id
        if (!id) throw new HTTPError("Id is required", 422)

        const { appVersion, appEnvironment, isForceUpdate, features } = req.body;
        const inputData: IUpdateVersion = {
            id: parseInt(id),
            appVersion,
            appEnvironment: appEnvironment as AppEnv,
            isForceUpdate,
            features
        };

        Helpers.validateWithZod(UpdateAppVersion, inputData);

        const createdVersionDeets = await updateVersion(inputData);

        if (!createdVersionDeets)
            throw new HTTPError(
                `Could Not Create App update Version ${req.params.id}`,
                204
            );
        const code = createdVersionDeets.success ? 200 : 400;
        res.status(code).json({ data: createdVersionDeets });
    } catch (err) {
        if (err instanceof HTTPError) {
            res.status(err.code).json({ error: { message: err.message } });
        } else {
            res.status(500).json({ error: { message: "Internal server error" } });
        }
    }
};

export const getAppUpdatedVersionDetails = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            throw new HTTPError("Unauthorized", 401);
        }

        const version = req.version

        res.status(200).json({ data: version ?? "User has latest app version" });
    } catch (err) {
        if (err instanceof HTTPError) {
            res.status(err.code).json({ error: { message: err.message } });
        } else {
            res.status(500).json({ error: { message: "Internal server error" } });
        }
    }
};