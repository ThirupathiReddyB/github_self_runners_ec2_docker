import crypto from "crypto";
import rateLimit from "express-rate-limit";

export const currentTime = new Date(Date.now());

export const globalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 10 minutes
  max: 5, // Max 2000 requests per IP per 10 minutes
  message: "Too many requests, please try again later.",
});

export const loginOtpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: "Too many requests for this API, please try again later.",
});

export const changeContactRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: "Too many requests for this API, please try again later.",
});
export const resendOtpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: "Too many requests for this API, please try again later.",
});

export const resendOtpSubaccountRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: "Too many requests for this API, please try again later.",
});
export const familyCareExistingUserRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: "Too many requests for this API, please try again later.",
});

export const releaseMinorRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: "Too many requests for this API, please try again later.",
});

export const registerOtpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: "Too many requests for this API, please try again later.",
});

export const resetPassword = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max:3, 
  message: "Too many requests for this API, please try again later.",
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max:3, 
  message: "Too many requests for this API, please try again later.",
});
export const registerOtpSubaccountRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: "Too many requests for this API, please try again later.",
});
export const loginOtpAdminPanel = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Max 1 OTP request per IP per minute for this specific API
  message: "Too many requests for this API, please try again later.",
});
export const createOtpAdminAuditor = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Max 1 OTP request per IP per minute for this specific API
  message: "Too many requests for this API, please try again later.",
});
let distributionId: string;
if (process.env.NODE_ENV === "prod") {
  distributionId = process.env.DistributionIdProd as string;
} else if (process.env.NODE_ENV === "uat") {
  distributionId = process.env.DistributionIdUat as string;
} else {
  distributionId = process.env.DistributionIdDev as string;
}

let bucketLink: string;
if (process.env.NODE_ENV === "prod") {
  bucketLink = "https://d30d0k9iu5qr4v.cloudfront.net";
} else if (process.env.NODE_ENV === "uat") {
  bucketLink = "https://d2r0cg9fb51576.cloudfront.net";
} else {
  bucketLink = "https://d37avlki7tytoi.cloudfront.net";
}

const alphabet = "abcdefghijklmnopqrstuvwxyz";

export const getRandomCharacter = (totalChar: number) =>
  Array.from({ length: totalChar }, () =>
    alphabet.charAt(
      crypto.getRandomValues(new Uint8Array(1))[0] % alphabet.length
    )
  ).join("");

export const getRandomDigit = (totalNumber: number) =>
  Array.from({ length: totalNumber }, () =>
    (crypto.getRandomValues(new Uint8Array(1))[0] % 10).toString()
  ).join("");

export const refreshTokenExpiry = "30d";

export const accessTokenExpiry = "1h";

export const enums = ["superAdmin", "admin", "auditor"];

export const termsAndConditionUrl =
  "https://steigenhealthcare.com/terms-of-use/";
export const autoFetchHash: string =
  process.env.NODE_ENV === "prod" ? "1rxewk4ss9g" : "rvObNlT4E2P"; //release
  process.env.NODE_ENV === "prod" ? "1rxewk4ss9g" : "rvObNlT4E2P"; //release

export const awsBucketLink: string = bucketLink;

export const DistributionIdCdn: string = distributionId;

export const BATCH_SIZE = 1000;

export const invalidAttempts = 0;

export const dayOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const otpExpiry = {
  "3m": 2 * 60 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 1 * 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
};

export const redirectLink = "ManageProfiles";

// export const dashboardURL = "https://devsteigen.pixlit.ai/";
export const dashboardURL = 
  process.env.NODE_ENV === "prod" ? "https://admin.steigenhealthcareindia.com" : 
  process.env.NODE_ENV === "uat" ? "https://uatadmin.steigenhealthcareindia.com" : 
  "https://devadmin.steigenhealthcareindia.com";

export const advertiseRedirectLink = "https://www.cdi.org.in/";

export const vimeoPlaceHolder = "https://vimeo.com/993703778";

export const freePlanCode = "free_000";

export const generateSkip = (limit: number, page?: number) => {
  return !page ? 0 : (page - 1) * limit;
};

export const qrBaseUrl = 
  process.env.NODE_ENV === "prod" ? "https://thito.co.in" :
  process.env.NODE_ENV === "uat" ? "https://uat.thito.co.in" :
  "https://dev.thito.co.in";