import { freePlanCode } from "../constants/data";
import prisma from "../prisma";
import { calculateStatistics } from "../utility/calculations";

/**
 * Migrates existing users and dependants to the new subscription model.
 * 
 * This script is intended to be run as a one-time migration or scheduled job to ensure all 
 * active users and dependants have proper subscription records initialized in the database.
 * 
 * The migration process involves:
 * 1. Identifying users and dependants who currently have NO subscription records.
 * 2. Fetching the "Default" and "Free" plan configurations from the database.
 * 3. Constructing an array of subscription objects to insert:
 *    - An inactive "Free Plan" fallback (if the free plan differs from the default).
 *    - An active "Default Plan" with an expiry date calculated based on the plan's period.
 * 4. Performing a bulk `createMany` operation to insert all missing subscriptions efficiently.
 * 5. Resetting the `isAppNewVersion` flag on all users, prompting them to fetch the latest app version.
 * 
 * @returns {Promise<void>} Resolves when the migration is complete.
 */
async function migrateExistingUsers() {
    console.log('--- Starting Subscription Migration ---');

    try {
        // 1. Fetch required data in parallel to optimize database querying time
        // - usersToUpdate: Users lacking any subscription records
        // - dependantToUpdate: Dependants lacking any subscription records
        // - findDefaultPlan: The active default plan variant that users should be assigned initially
        // - findFreePlan: The free plan variant to fallback to when active plans expire
        const [usersToUpdate, dependantToUpdate, findDefaultPlan, findFreePlan] = await Promise.all([
            prisma.users.findMany({
                where: {
                    Subscription: {
                        none: {} // Finds users with zero subscription records
                    }
                },
            }),
            prisma.dependant.findMany({
                where: {
                    Subscription: {
                        none: {} // Finds dependants with zero subscription records
                    }
                },
                select: { id: true, userId: true },
            }),
            prisma.planVariants.findFirst({
                where: { isDefault: true },
                include: { plan: true },
            }),
            prisma.planVariants.findFirst({
                where: { plan: { planCode: freePlanCode } }
            })
        ]);

        if (!findDefaultPlan || !findFreePlan) {
            console.error("Migration aborted: Could not find required plan variants.");
            return;
        }

        if (usersToUpdate.length + dependantToUpdate.length === 0) {
            console.log('No users or dependants to update.');
            return;
        }

        console.log(`Found ${usersToUpdate.length + dependantToUpdate.length} users needing initialization.`);

        // Calculate expiry once outside the loop based on the default plan's configured interval and period
        const defaultPlansubscriptionExpiry = calculateStatistics(
            findDefaultPlan.period,
            findDefaultPlan.interval
        );

        // 2. Prepare the bulk data array in memory
        const subscriptionsToCreate: any[] = [];

        // Map parent users to their initial subscriptions
        usersToUpdate.forEach(async (user) => {
            // Add the inactive Free Plan fallback (only if it's different from the Default Plan)
            if (findDefaultPlan.id !== findFreePlan.id) {
                subscriptionsToCreate.push({
                    userId: user.id,
                    planVariantId: findFreePlan.id,
                    expiresAt: null,
                    status: "inactive"
                });
            }

            // Add the Active Default Plan
            subscriptionsToCreate.push({
                userId: user.id,
                planVariantId: findDefaultPlan.id,
                expiresAt: defaultPlansubscriptionExpiry,
                status: "active"
            });
        });

        // Map dependant users to their initial subscriptions
        dependantToUpdate.forEach((user) => {
            // Add the inactive Free Plan fallback (only if it's different from the Default Plan)
            if (findDefaultPlan.id !== findFreePlan.id) {
                subscriptionsToCreate.push({
                    dependantId: user.id,
                    userId: user.userId,
                    planVariantId: findFreePlan.id,
                    expiresAt: null,
                    status: "inactive"
                });
            }

            // Add the Active Default Plan
            subscriptionsToCreate.push({
                dependantId: user.id,
                userId: user.userId, // Setting both dependantId and userId for dependants based on original logic
                planVariantId: findDefaultPlan.id,
                expiresAt: defaultPlansubscriptionExpiry,
                status: "active"
            });
        });

        // 3. Execute a single bulk insert
        // This is significantly faster than mapping prisma.subscription.create inside a transaction wrapper
        const result = await prisma.subscription.createMany({
            data: subscriptionsToCreate,
        });

        // Reset the new version flag for all existing users
        await prisma.users.updateMany({
            data: {
                isAppNewVersion: false
            }
        })

        console.log(`Successfully created ${result.count} subscription records for ${usersToUpdate.length + dependantToUpdate.length} entities.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateExistingUsers();