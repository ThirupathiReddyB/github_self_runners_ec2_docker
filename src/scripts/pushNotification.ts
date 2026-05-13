import firebase from "firebase-admin";
import { ServiceAccount } from "../../config/pushNotificationServiceAccountCreds";
import { pushNotifyAppUpdate } from "../utility/pushNotificationAndStoreNotification";
import prisma from "../prisma";
import { emailingService } from "../utility/emailService";
import { appUpdateNotification } from "../templateDesign/informationTemplate";
import { sendMessageToMobile } from "../utility/sendOtp";

firebase.initializeApp({
    credential: firebase.credential.cert(
        ServiceAccount as firebase.ServiceAccount
    ),
})
const informUsers = async () => {
    const usersToUpdate = await
        prisma.users.findMany({
            where: {
                isAppNewVersion: false
            },
        })
    usersToUpdate.forEach(async (user) => {
        //send email and sms
        if (user.emailId && user.emailId.trim() !== "") {
            try {
                await emailingService({
                    email_id: user.emailId.toLowerCase(),
                    data: null,
                    subject: "App Update Notification",
                    template: appUpdateNotification,
                    choice: "app_update_notification",
                });
                console.log("Email sent to", user.emailId)
            } catch (err: any) {
                console.error(`Failed to send email to ${user.emailId}:`, err.message);
            }
        }
        if (user.phoneNumber && user.phoneNumber.trim() !== "") {
            //send sms
            const msg = `Dear THITO User, Great News! Your FREE Premium access has been extended for 3 months, valid till June 14, 2026. Update your THITO app now for advanced features.`
            await sendMessageToMobile(user.phoneNumber, msg);
            console.log("SMS sent to", user.phoneNumber)
        }
    });
}
informUsers();
pushNotifyAppUpdate()