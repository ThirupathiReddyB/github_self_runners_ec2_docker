import express, { Express } from "express";
import dotenv from "dotenv";
import helmet from "helmet";

import cors, { CorsOptions } from "cors";
import bodyParser from "body-parser";
import appRoute from "./routes/appUserRoute";
import adminRoute from "./routes/appAdminRoute";
import familyCareRoute from "./routes/appFamilyCareRoute";
import vitalsRoute from "./routes/appVitalsRoute";
import appSubscriptionRoute from "./routes/appSubscriptionRoute";
import appTestRoute from "./routes/appTestRoute";
import cron from "node-cron";
import "./utility/globalExpressDeclaration";
import { sendNotificationToUnsyncedUsers } from "./utility/cleanUp/deleteOldData";
import firebase from "firebase-admin";
import { ServiceAccount } from "../config/pushNotificationServiceAccountCreds";
import rateLimit from "express-rate-limit";
// import { pushNotifyAppUpdate } from "./utility/pushNotificationAndStoreNotification";
dotenv.config();

//// Schedule the task to run every 30 days at midnight: 0 0 */30 * *
//// Five minutes : */5 * * * *
//// cron.schedule("0 0 */30 * *", async () => {
////   console.log("Running cleanup job...");
//   // await deleteOldNonRegisteredUsers();
////   await deleteOldOtpStoreData();
//// });

firebase.initializeApp({
  credential: firebase.credential.cert(
    ServiceAccount as firebase.ServiceAccount
  ),
});

//send notification for user who has not synced the data
cron.schedule("30 6 * * *", async () => {
  console.log("sending notification ...");
  await sendNotificationToUnsyncedUsers();
});

// //!remove later
// cron.schedule("0 0 */2 * *", async () => {  //every 2 days
//   console.log("Reminding User to Update");
//   await pushNotifyAppUpdate();
// });

// //unblocking users: Call the unblockUsers function periodically (every minute)
// // setInterval(unblockUsers, 60 * 1000);

// //vimeo videos storing in backend
//// setInterval(vimeoVideos, 15 * 60 * 1000);

const app: Express = express();
const port = process.env.PORT ?? 3000;

const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 2000, // Max 2000 requests per IP per 10 minutes
  message: "Too many requests, please try again later.",
});

app.set('trust proxy', 1); // Trust the first hop (your proxy)

const allowedOrigins: string[] = [
  "http://localhost:3000",
  "https://devserver.steigenhealthcareindia.com",
  "https://uatserver.steigenhealthcareindia.com",
  "https://prodapi.steigenhealthcareindia.com",
  "https://devadmin.steigenhealthcareindia.com",
  "https://uatadmin.steigenhealthcareindia.com",
  "https://admin.steigenhealthcareindia.com",
  "https://serverprod.steigenhealthcareindia.com",
  "https://secure.payu.in",
  "https://test.payu.in",
  "https://thito.co.in",
  "https://dev.thito.co.in",
  "https://uat.thito.co.in",
  "http://localhost:5173",
];

const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin === null ||
      origin == "null"
    ) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error("Not allowed by CORS")); // Block the request
    }
  },
  credentials: true, // Allow cookies & authentication header
  optionsSuccessStatus: 200,
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    }, //csrf protection
    frameguard: { action: "deny" }, // Prevent clickjacking 
    xssFilter: true, // Cross-Site Scripting (XSS)
    noSniff: true, // Prevent MIME sniffing MIME
    hsts: {
      // Enforce HTTPS
      maxAge: 16070400,
      includeSubDomains: true,
    },
  })
);

app.use(bodyParser.urlencoded({ limit: "5mb", extended: false }));
app.use(bodyParser.json({ limit: "5mb" }));
app.use(cors(corsOptions));
app.use(apiLimiter);
app.disable("x-powered-by");

//routes
app.use("/api/", appRoute);
app.use("/api/admin", adminRoute);
app.use("/api/familyCare/", familyCareRoute);
app.use("/api/vitals/", vitalsRoute);
app.use("/api/subscription", appSubscriptionRoute);
app.use("/api/test", appTestRoute);
app.use(
  (
    err: { status: number; message: string; stack: any },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && "body" in err && err.status === 400) {
      // Malformed JSON
      return res.status(400).json({
        success: false,
        message: "Invalid JSON payload",
      });
    }

    // Handle CORS errors
    if (err.message === "Not allowed by CORS") {
      return res.status(403).json({
        success: false,
        message: "CORS policy does not allow access from this origin.",
      });
    }

    // For other errors, hide stack traces in production
    const isProd = process.env.NODE_ENV === "prod";

    return res.status(500).json({
      success: false,
      message: isProd ? "Internal Server Error" : err.message,
      ...(isProd ? {} : { stack: err.stack }), // Include stack trace only in dev
    });
  }
);
app.listen(port, () => {
  console.log("server started!!");
});

//
