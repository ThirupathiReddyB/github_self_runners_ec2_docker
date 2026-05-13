
export const payuHost = process.env.PAYMENT_HOST; // prod payuhost
export const refundHost = process.env.REFUND_HOST;

export const SURL = process.env.NODE_ENV == "prod" ? "https://prodapi.steigenhealthcareindia.com/api/subscription/paymentSuccess" : `https://${process.env.NODE_ENV}server.steigenhealthcareindia.com/api/subscription/paymentSuccess`;
export const FURL = process.env.NODE_ENV == "prod" ? "https://prodapi.steigenhealthcareindia.com/api/subscription/paymentFailed" : `https://${process.env.NODE_ENV}server.steigenhealthcareindia.com/api/subscription/paymentFailed`;

export const getSuccessPageUrl = (userId: string) =>
  `https://thito.co.in/checkout/complete?isSuccess=true&statusCode=200&userId=${userId}`;
export const getFailurePageurl = (userId: string) =>
  `https://thito.co.in/checkout/complete?isSuccess=false&statusCode=400&userId=${userId}`;

export const somethingWentWrongPage = (userId: string) =>
  `https://thito.co.in/checkout/complete?isSuccess=false&statusCode=660&userId=${userId}`;


export const subscriptionBannerFeatures = [
  "Enjoy secured and expanded cloud storage for all your health records",
  "Get full access to the Health Zone",
  "Easily add and track the health profiles of your entire family"
]