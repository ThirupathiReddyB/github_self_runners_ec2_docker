import prisma from "../../prisma";
import firebase from "firebase-admin";
import { freePlanCode } from "../../constants/data";
import { Subscription, Users } from "../../../prisma/generated/prisma/client";
import { markFreePlanActiveForUser } from "../helperFunction/subscription.services.helper";

//Not-in-use
// export const deleteOldNonRegisteredUsers = async () => {
//   const thirtyDaysAgo = new Date();
//   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

//   try {
//     const result = await prisma.verifiedUsers.deleteMany({
//       where: {
//         updatedAt: {
//           lt: thirtyDaysAgo,
//         },
//         isVerified: false,
//       },
//     });

//   } catch (error) {
//     console.error("Error deleting old non-registered users:", error);
//   } finally {
//     await prisma.$disconnect();
//   }
// };

export const deleteOldOtpStoreData = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  try {
    await prisma.otpStore.deleteMany({
      where: {
        updatedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
  } catch (error) {
    console.error("Error deleting old OTP Store Data:", error);
  } 
};

export const sendNotificationToUnsyncedUsers = async () => {
  try {
    const unSyncedUsers = await prisma.users.findMany({
      where: {
        inAppNotificationSync: false,
      },
    });

    unSyncedUsers.forEach(async (user) => {
      sendNotification(
        user,
        "Discover the Latest Update!",
        "A family member recently updated your profile. Open the app to see what's new!"
      );
    });

    //send subscription notification
    const findActivePlan = await prisma.subscription.findMany({
      where: {
        status: "active",
        NOT: {
          planVariants: {
            plan: {
              planCode: freePlanCode,
            },
          },
        },
      },
    });
    findActivePlan.forEach(async (activePlan) => {
      if (activePlan.userId) {
        const user = await prisma.users.findFirst({
          where: {
            id: activePlan.userId,
          },
        });
        const findUpcomingPlan = await prisma.subscription.findFirst({
          where: {
            userId: activePlan.userId,
            status: "upcoming",
          },
        });
        await validateUserPlanExpiry(activePlan, user, findUpcomingPlan);
        
      }
    });
  } catch (error) {
    console.error("Error Sending unsynced notification:", error);
  } 
};

const sendNotification = async (user: Users, title: string, body: string) => {
  try{
  if (
    user.deviceToken &&
    user.currentSessionId != null &&
    user.currentSessionId !== "" &&
    user.refreshToken != null &&
    user.refreshToken !== ""
  ) {
    const message = {
      token: user.deviceToken,
      data: {
        redirectTo: "Subscription",
      },
      notification: {
        title,
        body,
      },
      android: {
        notification: {
          icon: "ic_stat_flarelane_default",
        },
      },
    };
    
    
   await firebase.messaging().send(message);
  
  }
}
catch(error) {
    console.error("Error sending notification:", error);
  } 
};

const validateUserPlanExpiry = async (
  activePlan: Subscription,
  user: Users | null,
  findUpcomingPlan: Subscription | null
) => {
  if (activePlan.expiresAt) {
    if (new Date(activePlan.expiresAt).getTime() < Date.now()) {
      await prisma.subscription.update({
        where: {
          id: activePlan.id,
        },
        data: {
          status: "inactive",
        },
      });
      if (user) {
        markFreePlanActiveForUser(user.id);
      }
    } else {
      const expiresAtIST = new Date(activePlan.expiresAt).toLocaleString(
        "en-IN",
        {
          timeZone: "Asia/Kolkata",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
      const threeDaysBackFromExpiry =
        activePlan?.expiresAt?.getTime() - 3 * 24 * 60 * 60 * 1000;

      if (
        Date.now() >= threeDaysBackFromExpiry &&
        activePlan.expiresAt.getTime() <=
          threeDaysBackFromExpiry + 3 * 24 * 60 * 60 * 1000 &&
        !findUpcomingPlan
      ) {
        if (user) {
          sendNotification(
            user,
            "Subscription Expiry!",
            `Your subscription is soon going to expire on ${expiresAtIST}.Buy a new plan to continue using our features.`
          );
        }
      }
    }
  }
};
