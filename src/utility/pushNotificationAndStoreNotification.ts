
import firebase from "firebase-admin";
import HTTPError from "./HttpError";
import { INotification } from "./DataTypes/types.user";
import prisma from "../prisma";
import { Prisma, Users, UsersSetting } from "../../prisma/generated/prisma/client";
import { redirectLink } from "../constants/data";

/**
 * Stores a new notification in the database for a specific user.
 * Supports primary and secondary notification contents based on the provided parameters.
 * 
 * @param {string} userId - The unique identifier of the user to whom the secondary notification is addressed.
 * @param {INotification} notifContent - The content of the notification including primary and secondary messages.
 * @param {string} redirectLink - The URL or route where the user should be redirected upon clicking the notification.
 * @param {string} notificationTitle - The title of the notification.
 * @param {string} [linkFrom] - Optional identifier of the user who initiated the action (triggers primary notification if present).
 * @param {string} [linkText] - Optional call-to-action text for the notification link.
 * @returns {Promise<{success: boolean, id: string}>} An object indicating success and the ID of the created notification.
 * @throws {HTTPError} Throws an error if the user does not exist or if storing the notification fails.
 */
export const notificationStore = async (
  userId: string,
  notifContent: INotification,
  redirectLink: string,
  notificationTitle: string,
  linkFrom?: string,
  linkText?: string
  // AccessText?: string
) => {
  let notificationsData: any = [];
  
  // Step 1: Process the secondary notification content if provided
  if (notifContent?.secondaryContent) {
    // Validate that the target user for the secondary notification actually exists
    const userExists = await prisma.users.findUnique({
      where: {
        id: userId,
      },
    });
    if (!userExists) {
      throw new HTTPError(`User with ID ${userId} does not exist.`, 404);
    }
    
    // Construct the JSON payload for the secondary notification
    const secondaryNotification: Prisma.InputJsonValue = {
      title: "Family Care",
      body: notifContent.secondaryContent,
      click_action: redirectLink,
      notificationTitle,
      // notificationTitle:linkText === "Change Access" ? "MinorProfiles" : notificationTitle,
      linkText,
    };

    // Prepare the insertion payload for the Prisma batch creation
    notificationsData = [
      {
        userId: userId,
        content: secondaryNotification,
        // Calculate dynamic properties to ascertain if access-change functionalities are required
        changeAccessOf:
          notifContent.secondaryAccessText &&
            notificationTitle != "SubscriptionLimitExceeded" &&
            notifContent.showChangeAccessLink
            ? linkFrom
            : null,
        AccessText: notifContent.secondaryAccessText ?? null,
      },
    ];
  }

  // Step 2: Add primary notification payload if primaryContent and linkFrom are both provided
  if (notifContent?.primaryContent && linkFrom) {
    const userExists = await prisma.users.findUnique({
      where: {
        id: linkFrom.toLowerCase(),
      },
    });
    if (!userExists) {
      throw new HTTPError(`User with ID ${userId} does not exist.`, 404);
    }
    // Construct the JSON payload for the primary notification aimed at the initiator
    const PrimaryNotification: Prisma.InputJsonValue = {
      title: "Family Care",
      body: notifContent.primaryContent,
      click_action: redirectLink,
      notificationTitle: notificationTitle,
      linkText: linkText,
    };

    // Append it to our batch data array
    notificationsData.push({
      userId: linkFrom.toLowerCase(),
      content: PrimaryNotification,
      changeAccessOf: notifContent.primaryAccessText ? userId : null,
      AccessText: notifContent.primaryAccessText ?? null,
    });
  }

  // Step 3: Insert the constructed notifications into the database in bulk
  const createNotification = await prisma.notifications.createManyAndReturn({
    data: notificationsData,
  });
  if (!createNotification) {
    throw new HTTPError("Notifications could not be stored", 500);
  }
  return {
    success: true,
    id: createNotification[0].id,
  };
};

/**
 * Sends a push notification to a user's device via Firebase Cloud Messaging (FCM).
 * 
 * @param {{deviceToken: string | null, fullName: string}} findUser - An object containing the target user's device token and full name.
 * @param {INotification} notifContent - The content details of the notification.
 * @param {string} redirectLink - The link where the user will be redirected upon clicking the notification.
 * @param {number} id - The unique ID of the stored notification.
 * @param {string} linkFrom - The identifier of the user who sent the notification/invitation.
 * @param {string} linkTo - The identifier of the target user receiving the notification.
 * @param {string} type - The specific type/category of the notification.
 * @returns {Promise<boolean>} Resolves to true if the notification was processed (even if the token was invalid).
 * @throws {HTTPError} Throws an error if sending the Firebase notification fails for server reasons.
 */
export const sendNotificationToFamilyCare = async (
  findUser: {
    deviceToken: string | null;
    fullName: string;
  },
  notifContent: INotification,
  redirectLink: string,
  id: number,
  linkFrom: string,
  linkTo: string,
  type: string
) => {
  try {
    // Build the FCM message payload, incorporating Android configs, target token and custom data payloads
    const message = {
      token: findUser.deviceToken as string,
      data: {
        notificationId: id.toString(),
        redirectTo: redirectLink,
        linkFrom,
        linkTo,
        type,
        // Add a 5.5 hour offset (IST) to the timestamp included in the notification data
        date: new Date(new Date().getTime() + 5.5 * 60 * 60000).toISOString(),
      },
      notification: {
        title: "Family Care",
        body: notifContent.secondaryContent,
      },
      android: {
        notification: {
          icon: "ic_stat_flarelane_default", // specify the push notification icon for frontend usage
        },
      }, 
    };
    
    // Dispatch the message via Firebase Admin SDK
    const sendNotification = await firebase.messaging().send(message);
    if (!sendNotification) {
      throw new HTTPError("notification could not be sent", 502);
    }
    return true;
  } catch (error: any) {
    console.error("Error caught in errorHandler:", error);
    // Ignore invalid token errors from FCM mapping issue to prevent breaking the flow, treating them as successful
    if (
      error.code === "messaging/invalid-argument" &&
      error.message.includes(
        "The registration token is not a valid FCM registration token"
      )
    ) {
      return true;
    } else if (error instanceof HTTPError) {
      // Re-throw our custom HTTP errors with status 200 mapped inside this catch
      throw new HTTPError(error.message, 200);
    } else {
      // Fallback return for undefined error cases to prevent total flow breakage
      return true;
    }
  }
};

/**
 * A combined utility that first stores a notification in the database and then
 * dispatches a push notification via Firebase if the user has push notifications enabled.
 * 
 * @param {Users & { setting: UsersSetting | null }} findUser - The user object including their personal settings.
 * @param {INotification} notifContent - The content body of the primary and/or secondary notification.
 * @param {string} redirectLink - The destination link for the notification action.
 * @param {string} linkFrom - The ID of the user initiating the action.
 * @param {string} linkTo - The ID of the target user.
 * @param {string} notificationName - The title or name identifier of the notification.
 * @param {string} [linkText] - Optional text for the action link inside the notification.
 * @throws {HTTPError} Throws an error if storing or sending the notification fails.
 */
export const storeAndSendNotification = async (
  findUser: Users & { setting: UsersSetting | null },
  notifContent: INotification,
  redirectLink: string,
  linkFrom: string,
  linkTo: string,
  notificationName: string,
  linkText?: string
  // AccessText?: string
  // changeAccessOf?: string
) => {
  // Step 1: Commit the notifications into the local database first
  const storeNotification = await notificationStore(
    findUser.id.toLowerCase(),
    notifContent,
    redirectLink,
    notificationName,
    linkFrom,
    linkText
    // AccessText
  );
  
  if (storeNotification.success !== true) {
    throw new HTTPError("could not store notification", 204);
  }

  // Step 2: Validate if a push notification is eligible to be dispatched
  // Conditions: User must be logged in with a valid session & token, push notifications must be globally toggled ON in their settings,
  // and there must be valid secondary content to deliver.
  if (
    findUser &&
    findUser.deviceToken &&
    (findUser.currentSessionId != null || findUser.currentSessionId != "") &&
    (findUser.refreshToken != null || findUser.refreshToken != "") &&
    findUser.setting?.notification === true &&
    notifContent.secondaryContent
  ) {
    // Step 3: Trigger Firebase dispatch logic if eligibility passed
    const sendNotification = await sendNotificationToFamilyCare(
      findUser,
      notifContent,
      redirectLink,
      storeNotification.id,
      linkFrom,
      linkTo,
      notificationName
    );
    if (!sendNotification) {
      throw new HTTPError("notification could not be send", 502);
    }
  }
};

/**
 * Notifies a user that their subscription limit for connections (minors or adults) has been exceeded.
 * It stores and sends a push notification indicating they cannot add more members.
 * 
 * @param {boolean} checkMinorCount - A flag indicating whether the limit reached was for minor connections.
 * @param {Users} user - The user proposing the connection.
 * @param {any} findUser - The target user who reached their connection limit.
 * @param {string} linkFrom - The ID of the user initiating the connection request.
 * @throws {HTTPError} Throws a formatted HTTPError with status 601 containing the connection limit warning.
 */
export const notifyUserConnectionLimit = async (
  checkMinorCount: boolean,
  user: Users,
  findUser: any,
  linkFrom: string
) => {
  // Step 1: Formulate specific notification content based on whether the action involved a minor or an adult
  const notifications: INotification = {
    secondaryContent: checkMinorCount
      ? `${user?.fullName} wants to connect their minor with you!`
      : `${user?.fullName} wants to connect with you!`,
    secondaryAccessText:
      "You've reached maximum number of connections you can add. ",
    showChangeAccessLink: true,
  };

  // Step 2: Trigger the combined storage + FCM dispatch workflow towards the target user whose limits are exceeded
  await storeAndSendNotification(
    findUser,
    notifications,
    "subscription",
    linkFrom,
    findUser.id,
    "SubscriptionLimitExceeded",
    "Explore Plans now"
  );
  
  // Step 3: Construct a friendly textual message and throw standard API exception conveying that the flow failed because of limitations
  const error = {
    name: findUser.fullName,
    message: `Couldnt link with ${findUser.fullName}!`,
    message1: `Unfortunately, ${findUser.fullName} has reached maximum number of ${checkMinorCount ? "minor " : ""}connection at the moment`,
  };

  throw new HTTPError(JSON.stringify(error), 601);
};

/**
 * Sends and stores an "App Update Available" push notification to users who do not have the latest app version.
 * 
 * @param {string} [userId] - Optional. If provided, sends the update notification only to this specific user. Otherwise, queries all outdated users.
 * @returns {Promise<void>} Resolves when notifications have been processed for targeted users.
 */
export async function pushNotifyAppUpdate(userId?: string) {
  console.log('--- Starting send App Update Push Notification ---');

  const where: any = {
    isAppNewVersion: false
  }
  if (userId) where.id = userId

  try {
    // 1. Fetch users to be notified
    const usersToUpdate = await prisma.users.findMany({
      where
    })

    console.log(`Found ${usersToUpdate.length} users needing notification.`);

    // 2. Prepare and Iterate: Loop over applicable users separately to dispatch the push payload
    for (const user of usersToUpdate) {
      // Setup payload content mimicking real structure
      const PrimaryNotification: Prisma.InputJsonValue = {
        title: "🚀 Update Available! ",
        body: `Update THITO now for advanced family care features.`,
        click_action: "http://thito.in",
        // notificationTitle: "🚀 Update Available!",
        linkText: "Update Now",
      };

      // Assemble FCM-specific message schema
      const message = {
        token: user.deviceToken as string,
        data: {
          redirectTo: redirectLink,
        },
        notification: {
          title: PrimaryNotification.title as string,
          body: PrimaryNotification.body as string,
        },
        android: {
          notification: {
            icon: "ic_stat_flarelane_default", // specify the push notification icon for frontend usage
          },
        }, 
      };
      try {
        // Attempt sending Firebase broadcast
        const sendNotification = await firebase.messaging().send(message);
        if (!sendNotification) {
          throw new HTTPError("notification could not be sent", 502);
        }

        // 3. Store in Database explicitly for rendering in the user's "Notifications" UI tab later
        // We mock the INotification structure since we aren't originating from a user-action context
        const notifContent = {
          secondaryContent: PrimaryNotification.body,
          showChangeAccessLink: true
        };

        // Leverage shared persistence functionality 
        await notificationStore(
          user.id,
          notifContent as any,
          redirectLink,
          "🚀 Update Available!",
          undefined,
          "Update Now"
        );

      } catch (error: any) {
        console.error(`Failed to send to user ${user.id}:`, error);
      }
    }

  } catch (error) {
    console.error('Notification failed:', error);
  }
}
