import express from "express";
import { verifyUserToken } from "../middleware/user.middleware";
import {
  checkSubscriptionExpiry,
  getActiveSubscriptionAddon,
  getAllVouchers,
  getPlansAddons,
  getSplashLogo,
  paymentFailed,
  paymentSuccess,
  proceedToPay,
  useVoucher,
} from "../controllers/subscription.controller";
import {
  downloadInvoiceByTxnid,
  getUserTxnHistory,
} from "../controllers/transaction.controller";

const router = express.Router();

//User side
router.get("/active", verifyUserToken, getActiveSubscriptionAddon); //get active plan and add-on
router.get("/voucher", verifyUserToken, getAllVouchers); //get valid vouchers
router.get("/plan-addon", verifyUserToken, getPlansAddons); //get all plans + add-ons
router.get("/transaction", verifyUserToken, getUserTxnHistory); //get all transactions of user
router.get("/invoice/:txnid", verifyUserToken, downloadInvoiceByTxnid); //download invoice

router.post("/createPayment", verifyUserToken, proceedToPay);
router.post("/paymentSuccess", paymentSuccess);
router.post("/paymentFailed", paymentFailed);

router.get("/checkSubscriptionExpiry", verifyUserToken, checkSubscriptionExpiry)

router.get("/splash-screen-logo", verifyUserToken, getSplashLogo)

router.post("/partner-use-voucher", verifyUserToken, useVoucher)
export default router;
