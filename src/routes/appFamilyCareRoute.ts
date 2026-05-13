import express from "express";

import { verifyUserToken } from "../middleware/user.middleware";
import {
  changeFamilyAccess,
  checkSubscription,
  createDependant,
  createExistingUser,
  deleteDependant,
  deleteFamilyLinks,
  detachFamilyMember,
  existingUserSendOtp,
  fcAddNewUser,
  // generateOtpForDependant,
  getAllFamily,
  reactivateMinorLinks,
  // get_family_member_by_id,
  releaseMinorGenerateOtp,
  releaseMinorVerifyOtp,
} from "../controllers/familyCareController";
import { userPasswordVerify } from "../controllers/userController";
import {
  generateOtpForRegistrationSubaccount,
  resendOtpRegistration,
  verifyOtpForRegistration,
} from "../controllers/authController";
import { handleSubscriptionExpiry } from "../middleware/subscription.middleware";

import {
  familyCareExistingUserRateLimiter,
  globalRateLimiter,
  registerOtpSubaccountRateLimiter,
  releaseMinorRateLimiter,
  resendOtpSubaccountRateLimiter,
} from "../constants/data";
const router = express.Router();

//FAMILY CARE
//Check if user can add a new family member(5 for paid, 2 for free)
router.get(
  
  "/subscription-check",
 
  verifyUserToken,
  handleSubscriptionExpiry,
 
  globalRateLimiter,
  registerOtpSubaccountRateLimiter,
  checkSubscription

);

//Add new dependant
router.post(
  "/dependant",
  verifyUserToken,
  handleSubscriptionExpiry,
  createDependant
);
//delete dependant
router.delete(
  "/dependant/:id",
  verifyUserToken,
  handleSubscriptionExpiry,
  deleteDependant
);

//add new user
router.post(
  "/generate-otp/sub-account",
  verifyUserToken,
  globalRateLimiter,
  registerOtpSubaccountRateLimiter,
  handleSubscriptionExpiry,
  generateOtpForRegistrationSubaccount
);

router.post(
  "/otp-verify/sub-account",
  verifyUserToken,
  handleSubscriptionExpiry,
  verifyOtpForRegistration
);

router.post(
  "/otp-resend/sub-account",
  verifyUserToken,
  globalRateLimiter,
  resendOtpSubaccountRateLimiter,
  handleSubscriptionExpiry,
  resendOtpRegistration
);
router.post(
  "/add_new_user",
  verifyUserToken,
  handleSubscriptionExpiry,
  fcAddNewUser
);

//Linking to existing user
router.post(
  "/existingUserSendOTP",
  verifyUserToken,
  globalRateLimiter,
  familyCareExistingUserRateLimiter,
  handleSubscriptionExpiry,
  existingUserSendOtp
);

router.post(
  "/existing_user",
  verifyUserToken,
  handleSubscriptionExpiry,
  createExistingUser
);

//Delete dependent
//GENERAL FAMILY CARE FUNCTIONS
//Get data of all family care members
router.get("/family-members/all", verifyUserToken, getAllFamily);

//Change access
router.put(
  "/change-access",
  verifyUserToken,
  handleSubscriptionExpiry,
  changeFamilyAccess
);

//detach from family member
//1. verify password
router.post(
  "/password-verify",
  verifyUserToken,
  handleSubscriptionExpiry,
  userPasswordVerify
);
//2. detach user
router.delete(
  "/detach-member",
  verifyUserToken,
  handleSubscriptionExpiry,
  detachFamilyMember
);

//Release Minor Account
//1. Add new phone number + generate OTP
router.post(
  "/release-minor/generate-otp",
  verifyUserToken,
  globalRateLimiter,
  releaseMinorRateLimiter,
  handleSubscriptionExpiry,
  releaseMinorGenerateOtp
);

//2. Verify OTP and release account
router.delete(
  "/release-minor/verify-otp",
  verifyUserToken,
  handleSubscriptionExpiry,
  globalRateLimiter,
  releaseMinorRateLimiter,
  releaseMinorVerifyOtp
);

//Delete family lnks when subscription expires
router.delete("/deleteFamilyLinks", verifyUserToken, deleteFamilyLinks);

//Reactivate minor links when subscription is renewed
router.post("/reactivateMinor",verifyUserToken, handleSubscriptionExpiry, reactivateMinorLinks)

export default router;
