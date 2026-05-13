import { Request, Response, NextFunction } from "express";
import HTTPError from "../utility/HttpError";
import * as dotenv from "dotenv";
import prisma from "../prisma";
import { fetchUserByUniqueDataUser } from "../utility/prismaQueries";
import { AppEnv } from "../../prisma/generated/prisma/enums";
import { pushNotifyAppUpdate } from "../utility/pushNotificationAndStoreNotification";
dotenv.config();

/**
 * Middleware to verify the application version from the client.
 * 
 * This middleware extracts the app version and environment from the `x-correlation-id` header.
 * It checks the database for the currently active required version for the given environment.
 * 
 * - If the `x-correlation-id` header is missing entirely, it sends a push notification to the user 
 *   to update their app and throws an error.
 * - If the user's current version does not match the active required version and they haven't been
 *   marked as having the new version, it triggers a push notification prompting an update. It also
 *   attaches the active version details to `req.version` for downstream handlers to use (e.g., to 
 *   enforce a force-update).
 * - If the user's version matches the required version but their database record indicates they don't
 *   have it yet (`isAppNewVersion == false`), it updates their record to reflect that they have
 *   the required version.
 * 
 * @param req - Express Request object. Expects `req.user` to be populated by authentication middleware
 *              and the `x-correlation-id` header to be present in format `"version|environment"`.
 * @param res - Express Response object.
 * @param next - Express NextFunction to pass control to the next middleware.
 */
export const verifyVersion = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const correlationId = req.headers["x-correlation-id"] as string;
        const user = req.user

        // Ensure user is authenticated
        if (!user) throw new HTTPError("Unauthorised", 401);

        const findUser = await fetchUserByUniqueDataUser(user.id)

        if (!correlationId) {
            await pushNotifyAppUpdate(findUser.id)
            return next(); // Proceed to the next middleware instead of throwing, so the app doesn't break
        }

        // Extract version and environment from the correlation ID header
        const [appVersion, appEnvironment] = correlationId.split("|");
        if (!appVersion || !appEnvironment) {
            throw new HTTPError("Missing app version or app environment", 422);
        }

        // Fetch the currently active version configuration for the specified environment
        const findRequiredVersion = await prisma.appVersion.findFirst({
            where: {
                appEnv: appEnvironment as AppEnv,
                isActive: true,
            },
            include: {
                versionFeatures: true
            }
        })

        // Condition 1: User's version does not match required active version
        if (findRequiredVersion && findUser && findUser.isAppNewVersion == false && findRequiredVersion.appVersion != appVersion) {
            // Trigger a push notification for the user to update their app
            await pushNotifyAppUpdate(findUser.id)

            // Attach the latest version data to the request for subsequent logic (e.g. throwing force update errors)
            req.version = {
                appVersion: findRequiredVersion.appVersion,
                appEnvironment: findRequiredVersion.appEnv,
                isForceUpdate: findRequiredVersion.isForce,
                isActive: findRequiredVersion.isActive,
                features: findRequiredVersion.versionFeatures.map((feature) => feature.featureDescription)
            }
        }

        // Condition 2: User's version matches required active version, but their database flag is still false
        if (findRequiredVersion && findUser && findUser.isAppNewVersion == false && findRequiredVersion.appVersion == appVersion) {
            // Update the user's record to indicate they are now on the new version
            await prisma.users.update({
                where: {
                    id: findUser.id
                },
                data: {
                    isAppNewVersion: true
                }
            })
        }
        // Proceed to the next middleware or route handler
        next();
    } catch (err: unknown) {
        console.error("Error caught in errorHandler:", err);
        if (err instanceof HTTPError) {
            res.status(err.code).json({ error: { message: err.message } });
        } else {
            res.status(500).json({ error: { message: "Internal server error" } });
        }
    }
};