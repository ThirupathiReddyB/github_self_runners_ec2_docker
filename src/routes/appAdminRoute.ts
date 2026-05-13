import express from "express";
import {
  refreshAdminToken,
  adminLogout,
  getSuperAdmins,
  updateSuperAdmins,
  deleteSuperAdmins,
  updateAdmin,
  sendOtp,
  registerSuperAdmin,
  sendOtpAdminAuditor,
  registerAdminAuditor,
  createOtpLogin,
  verifyOtpLogin,
  getAdminAuditor,
  deleteAdminAuditor,
  adminDashboard,
  checkSession,
  resendOtpAdminAuditor,
} from "../controllers/adminAuthController";
import { verifyAdminToken } from "../middleware/admin.middleware";
import {
  createAdvertisement,
  createBlog,
  createFacilities,
  createVideo,
  deleteAdvertisement,
  deleteBlog,
  deleteFacility,
  deleteVideos,
  editAdvertisementById,
  editFacilitiesById,
  editVideoById,
  getAdvertisementsAdmin,
  getAllContent,
  getBlog,
  getComplaintAndFeedback,
  getFacilitiesAdmin,
  getUserMessages,
  getVideosAdmin,
  markResolveAndUnresolve,
  readTags,
  replyCompliantById,
  syncThumbnail,
  updateBlog,
} from "../controllers/contentManagementController";
import {
  exportUsers,
  getAllUsers,
  getUserById,
} from "../controllers/userController";
import {
  createVitalModules,
  deleteVitalModules,
  getAllVitalModules,
  updateVitalModuleById,
} from "../controllers/vitalsController";
import {
  adminBlockUser,
  adminDeleteUserById,
  adminUnblockUser,
} from "../controllers/adminUserController";
import { resendOtp } from "../services/auth.services";
import { uploadMiddleware } from "../../config/multerConfig";
import {
  createOtpAdminAuditor,
  globalRateLimiter,
  loginOtpAdminPanel,
} from "../constants/data";
import {
  createFeature,
  createFeatureMetadata,
  deleteFeatureById,
  getFeatureMetadata,
  getFeatures,
  updateFeatureById,
} from "../controllers/feature.controller";
import {
  createPlan,
  deletePlanById,
  getPlans,
  updatePlanById,
} from "../controllers/plan.controller";
import {
  createVoucher,
  deleteVoucherById,
  getVouchers,
  updateVoucherById,
} from "../controllers/voucher.controller";
import {
  createAddOn,
  deleteAddOnById,
  readAddOns,
  updateAddOnById,
} from "../controllers/addon.controller";
import {
  getAllRefunds,
  getAllSubscriptionData,
  getSubscriptions,
  refundInitiating,
} from "../controllers/subscription.controller";
import { storyUpload, voucherUpload } from "../utility/uploadConstants";
import {
  emailInvoice,
  readTransactions,
} from "../controllers/transaction.controller";
import {
  createReel,
  deleteReel,
  editReelById,
  getReelAdmin,
} from "../controllers/reel.controller";
import {
  createStory,
  deleteStories,
  editStoryById,
  getStoryAdmin,
} from "../controllers/story.controller";
import { addAppUpdateVersion, editAppUpdateVersionById } from "../controllers/versionController";

const router = express.Router();

//Authentication
//check session
router.post("/check-session", checkSession);
//login superadmin,admin,auditor
router.post(
  "/create-otp",
  globalRateLimiter,
  loginOtpAdminPanel,
  createOtpLogin
);

//verify login otp
router.post("/verify-otp", verifyOtpLogin);
//refresh token
router.post("/refreshToken", refreshAdminToken);
//logout
router.post("/logout-admin", verifyAdminToken, adminLogout);

//CRUD Superadmin
//create superadmin
router.post("/send-otp/superAdmin", sendOtp);

router.post("/resend-otp/superAdmin", resendOtp);

router.post("/verify-otp-superAdmin", registerSuperAdmin);
//get all superadmin
router.get("/super-superAdmin", verifyAdminToken, getSuperAdmins);
//update
router.patch("/update-superAdmin", verifyAdminToken, updateSuperAdmins);
//delete admin
router.delete("/delete-superAdmin", verifyAdminToken, deleteSuperAdmins);

//CRUD admin/auditor
//create admin & auditor
//create otp for admin auditor
router.post(
  "/sign-up/admin_auditor",
  verifyAdminToken,
  globalRateLimiter,
  createOtpAdminAuditor,
  sendOtpAdminAuditor
); //created other for security purpose

//resend otp for admin auditor
router.post(
  "/resend-otp/admin_auditor",
  verifyAdminToken,
  resendOtpAdminAuditor
); //created other for security purpose

//verify otp for admin auditor
router.post("/verify-otp/admin", verifyAdminToken, registerAdminAuditor);
//update admin and auditor
router.patch("/update/admin_auditor/:id", verifyAdminToken, updateAdmin);
//read admin and auditor
router.get("/getAdminAuditor", verifyAdminToken, getAdminAuditor);
//delete admin and auditor
router.delete("/delete/adminAuditor", verifyAdminToken, deleteAdminAuditor);

//dashboard user
router.get("/dashboard", verifyAdminToken, adminDashboard);

//CONTENT MANAGEMENT
//get all content
router.get("/all-content", verifyAdminToken, getAllContent);

//get tags
router.get("/tags", readTags);

//VIDEOS
//Create Videos
router.post("/videos", verifyAdminToken, createVideo);
//read videos
router.get("/videos", verifyAdminToken, getVideosAdmin);
//update video by id
router.patch("/videos/:id", verifyAdminToken, editVideoById);
//delete vidoes
router.delete("/videos", verifyAdminToken, deleteVideos);

//update thumbnail
router.put("/videos/syncThumbnail", verifyAdminToken, syncThumbnail);

//ADVERTISEMENTS
//Create advertisement
router.post(
  "/advertisement",
  verifyAdminToken,
  uploadMiddleware("imageFile"),
  createAdvertisement
);
//read advertisement
router.get("/advertisement", verifyAdminToken, getAdvertisementsAdmin);
//update advertisement by id
router.put(
  "/advertisement/:id",
  verifyAdminToken,
  uploadMiddleware("imageFile"),
  editAdvertisementById
);
//delete advertisements
router.delete("/advertisement", verifyAdminToken, deleteAdvertisement);

//FACILITIES
//Create facilities
router.post(
  "/facilities",
  verifyAdminToken,
  uploadMiddleware("imageFile"),
  createFacilities
);
//read facilities
router.get("/facilities", verifyAdminToken, getFacilitiesAdmin);
//update facilities by id
router.patch(
  "/facilities/:id",
  verifyAdminToken,
  uploadMiddleware("imageFile"),
  editFacilitiesById
);
//delete facilitiess
router.delete("/facilities", verifyAdminToken, deleteFacility);

//REELS
//Create reel
router.post("/reel", verifyAdminToken, createReel);

//read reel
router.get("/reel", verifyAdminToken, getReelAdmin);

//update reel by id
router.patch("/reel/:id", verifyAdminToken, editReelById);

//delete vidoes
router.delete("/reel", verifyAdminToken, deleteReel);

//STORIES
router.post(
  "/story",
  verifyAdminToken,
  uploadMiddleware(storyUpload),
  createStory
);

router.get("/story", verifyAdminToken, getStoryAdmin);

router.patch(
  "/story/:id",
  verifyAdminToken,
  uploadMiddleware(storyUpload),
  editStoryById
);

router.delete("/story", verifyAdminToken, deleteStories); 

//BLOGS

//BLOG

router.post(
  "/blog",
  verifyAdminToken,
  uploadMiddleware("imageFile"),
  createBlog
);
router.get("/blog", verifyAdminToken, getBlog);
router.patch(
  "/blog/:id",
  verifyAdminToken,
  uploadMiddleware("imageFile"),
  updateBlog
);
router.delete("/blog/:id", verifyAdminToken, deleteBlog);

//FEEDBACK AND COMPLAINT
//block user
router.post("/admin-block-user", verifyAdminToken, adminBlockUser);
//un-block user
router.post("/unblock-user/:id", verifyAdminToken, adminUnblockUser);

//get all feedbacks and complaints
router.get("/feedback-complaint", verifyAdminToken, getUserMessages);
//reply to complaint by id
router.post("/reply-complaint/:id", verifyAdminToken, replyCompliantById);
//get complaint/feedback by id and mark it as read
router.patch("/get-userMessage/:id", verifyAdminToken, getComplaintAndFeedback);
//patch- mark as resolve or unresolve.
router.patch(
  "/mark-resolve-unresolve/:id",
  verifyAdminToken,
  markResolveAndUnresolve
);

//SELF-AWARENESS
//VITALS - Modules
//Add a new vital module
router.post("/vitalModule", verifyAdminToken, createVitalModules);
//Get all Vital modules
router.get("/vitalModule", verifyAdminToken, getAllVitalModules);
//update vital module by id
router.put("/vitalModule/:id", verifyAdminToken, updateVitalModuleById);
//delete vital module by id
router.delete("/vitalModule", verifyAdminToken, deleteVitalModules);

//USER
//View All Users
router.get("/users", verifyAdminToken, getAllUsers);

//export Users CSV
router.get("/user-export", verifyAdminToken, exportUsers);

//View User by Id
router.get("/getUserById/:id", verifyAdminToken, getUserById);
//delete user by ID
router.delete("/users/:id", verifyAdminToken, adminDeleteUserById);

//SUBSCRIPTION
// FEATURES
router.post("/feature", verifyAdminToken, createFeature); //!Developer API

router.get("/feature", verifyAdminToken, getFeatures);

router.put("/feature/:id", verifyAdminToken, updateFeatureById); //!Developer API

router.delete("/feature/:id", verifyAdminToken, deleteFeatureById); //!Developer API

//FEATURE META-DATA
router.get("/featureMetadata", verifyAdminToken, getFeatureMetadata);

router.post("/featureMetadata", verifyAdminToken, createFeatureMetadata); //!Developer API

//PLANS
router.post("/plan", verifyAdminToken, createPlan);

router.get("/plan", verifyAdminToken, getPlans);

router.put("/plan/:id/:planVariantId", verifyAdminToken, updatePlanById);

router.delete("/plan/:id", verifyAdminToken, deletePlanById);

//VOUCHERS
router.post(
  "/voucher",
  verifyAdminToken,
  uploadMiddleware(voucherUpload), //multiple images 
  createVoucher
);

router.get("/voucher", verifyAdminToken, getVouchers);

router.put(
  "/voucher/:id",
  verifyAdminToken,
  uploadMiddleware(voucherUpload), //multiple images
  updateVoucherById
);

router.delete("/voucher/:id", verifyAdminToken, deleteVoucherById);

//VERSION 2 - multiple new advertisements
// router.post(
//   "/voucher-v2",
//   verifyAdminToken,
//   uploadMiddleware(voucherUploadV2), //multiple images 
//   createVoucherV2
// );

//ADD-ONs
router.post("/add-on", verifyAdminToken, createAddOn);

router.get("/add-on", verifyAdminToken, readAddOns);

router.put("/add-on/:id", verifyAdminToken, updateAddOnById);

router.delete("/add-on/:id", verifyAdminToken, deleteAddOnById);

//AGGREGATE DATA API
router.get(
  "/subscription-management",
  verifyAdminToken,
  getAllSubscriptionData
);

//get all user subscriptions
router.get("/subscription", verifyAdminToken, getSubscriptions);

//TRANSACTIONS
//get all transactions
router.get("/transactions", verifyAdminToken, readTransactions);

//send invoice to user via email from admin-panel
router.post("/transactions/invoice", verifyAdminToken, emailInvoice);

router.post("/initiateRefund", refundInitiating);
router.get("/getAllRefundByTransactionId/:txnId", getAllRefunds);

//FAQS

//APP VERSION UPDATES
router.post("/app-version",verifyAdminToken,addAppUpdateVersion)

router.put("/app-version/:id",verifyAdminToken,editAppUpdateVersionById)

export default router;
