import nodemailer from "nodemailer";
import handlebars from "handlebars";
import { dashboardURL, termsAndConditionUrl } from "../constants/data";
import { emailHost, emailPort, emailSecure, emailService } from "../../config/emailConfig";
import fs from "fs";
import HTTPError from "./HttpError";

export const emailingService = async (params: {
  email_id: string;
  data: any;
  template: string;
  subject: string;
  choice: string;
}): Promise<boolean> => {
  const { email_id, data, template, subject, choice } = params;
  return new Promise((resolve, reject) => {
    const email_transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      service: emailService,
      secure: emailSecure,
      auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    const compileTemplate = (template: string) => handlebars.compile(template);
    const email_template = compileTemplate(template);
    let email_details;

    switch (choice) {
      case `otp_verification_dashboardUsers_login`:
      case `otp_verification_dashboardUsers`: {
        email_details = {
          from: process.env.EMAIL_ID,
          to: [email_id],
          subject: subject,
          context: {
            data: `${data.otp}`,
            firstName: `${data.fullName}`,
          },
        };
        break;
      }
      case `otp_verification_existingUsers_login`:
      case `createUserOtpVerification`:
      case `userId_information`:
      case "otp": {
        //existing user otp
        email_details = {
          from: process.env.EMAIL_ID,
          to: [email_id],
          subject: subject,
          context: {
            otp: `${data.otp}`,
            uid: `${data.uid?.toUpperCase()}`,
            connectMinor: data.connectMinor,
            TNC_url: `${termsAndConditionUrl}`,
          },
        };
        break;
      }
      case `successAdminAuditorRegistration`: {
        //mail service to reset password
        email_details = {
          from: process.env.EMAIL_ID,
          to: [email_id],
          subject: subject,
          context: {
            role: `${data.role?.toLowerCase()}`,
            userName: `${data.fullName}`,
            dashboardURL: `${dashboardURL}`,
          },
        };
        break;
      }
      case `complaint_reply`: {
        //sending complaint reply to user
        email_details = {
          from: process.env.EMAIL_ID,
          to: [email_id],
          subject: `Your complaint No. ${data.user_complaintId}`,
          context: {
            admin_reply: `${data.admin_reply}`,
            name: `${data.name}`,
            complaintId: `${data.user_complaintId}`,
          },
        };
        break;
      }
      case "partner_voucher": {
        email_details = {
          from: process.env.EMAIL_ID,
          to: [email_id],
          subject: subject,
          context: {
            voucherCode: `${data.voucherCode}`,
            voucherAmount: `${data.voucherAmount}`,
            description: `${data.description}`,
            expiry: `${data.expiry}`,
            redeemLimit: `${data.redeemLimit}`,
          },
          ...(data.originalFilename && data.imagePath
            ? {
              attachments: [
                {
                  // stream as an attachment
                  filename: `${data.originalFilename}`,
                  content: fs.createReadStream(data.imagePath),
                },
              ],
            }
            : {}),
        };
        break;
      }
      case "user_invoice": {
        email_details = {
          from: process.env.EMAIL_ID,
          to: [email_id],
          subject: `Your THITO Invoice ${data.txnId}`,
          context: {
            userName: `${data.userName}`,
            txnId: `${data.txnId}`,
            tnxDate: `${data.txnDate}`,
            paymentMode: `${data.paymentMode}`,
          },
          attachments: [
            {
              // stream as an attachment
              filename: `invoice.pdf`,
              content: fs.createReadStream(data.filePath),
            },
          ],
        };
        break;
      }
      case "app_update_notification": {
        email_details = {
          from: process.env.EMAIL_ID,
          to: [email_id],
          subject: subject,
        };
        break;
      }
      case "user_list": {
        email_details = {
          from: process.env.EMAIL_ID,
          to: [email_id],
          subject: subject,
          attachments: [{ filename: "users.xlsx", path: data.filePath }],
        };
      }
    }
    if (email_details === undefined) {
      reject(new HTTPError("Template not found", 404));
    }
    email_details &&
      email_transporter.sendMail(
        {
          ...email_details,
          html: email_template(email_details.context),
        },
        async (err) => {
          if (err) {
            console.log("Error Occurs", err);
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
  });
};
