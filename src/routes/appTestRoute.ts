import express from "express";
import { handleSubscriptionExpiry } from "../middleware/subscription.middleware";
import { verifyUserToken } from "../middleware/user.middleware";
import { fetchTransactionsLatestStatus } from "../utility/payuProcess";
import { uploadMiddleware } from "../../config/multerConfig";
import { uploadFilesDev } from "../controllers/test.controller";

const router = express.Router();

router.get(
  "/handleSubscriptionExpiry",
  verifyUserToken,
  handleSubscriptionExpiry
); //test subscription expiry
router.get("/getAllPayUTransaction", fetchTransactionsLatestStatus);

router.post("/upload", uploadMiddleware("imageFile"), uploadFilesDev);

export default router;
