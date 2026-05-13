import prisma from "../prisma";
import { handleError } from "../utility/Error";
import { ICreateVersion, IUpdateVersion } from "../utility/DataTypes/types.common";
import HTTPError from "../utility/HttpError";

export const createVersionUpdate = async (
    inputData: ICreateVersion,
) => {
    try {
        const {
            appVersion,
            appEnvironment,
            isForceUpdate,
            isActive,
            features
        } = inputData;

        await prisma.appVersion.updateMany({
            where: {
                appEnv: appEnvironment
            },
            data: {
                isActive: false
            }
        })

        const updateVersion = await prisma.appVersion.create({
            data: {
                appVersion,
                appEnv: appEnvironment,
                isForce: isForceUpdate,
                isActive,
                versionFeatures: {
                    create: features.map((feature) => ({
                        featureDescription: String(feature)
                    }))
                }
            }
        })
        if (!updateVersion) {
            throw new HTTPError("Failed to create app and version update", 400);
        }

        return {
            success: true,
            message: "App and Version update Recorded successfully"
        };
    } catch (error: unknown) {
        throw handleError(error);
    }
};

export const updateVersion = async (
    inputData: IUpdateVersion,
) => {
    try {
        const {
            id,
            appVersion,
            appEnvironment,
            isForceUpdate,
            features
        } = inputData;

        const findVersion = await prisma.appVersion.findUnique({
            where: {
                id,
                isActive: true
            }
        })
        if (!findVersion) throw new HTTPError("Cannoty edit already deactivated version", 400)

        const updateVersion = await prisma.appVersion.update({
            where: {
                id
            },
            data: {
                appVersion,
                appEnv: appEnvironment,
                isForce: isForceUpdate,
                ...(features ? {
                    versionFeatures: {
                        create: features.map((feature) => ({
                            featureDescription: String(feature)
                        }))
                    }
                } : {})
            }
        })
        if (!updateVersion) {
            throw new HTTPError("Failed to update app version details", 400);
        }

        return {
            success: true,
            message: "App version details updated successfully"
        };
    } catch (error: unknown) {
        throw handleError(error);
    }
};
