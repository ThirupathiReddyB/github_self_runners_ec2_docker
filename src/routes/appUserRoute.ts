import express from "express";
import {
  checkSession,
  createUser,
  generateOtpForRegistration,
  generateOtpForResetPassword,
  loginWithOtpGenerate,
  loginWithOtpVerify,
  loginWithPassword,
  logout,
  refreshToken,
  resendOtpRegistration,
  userResetPassword,
  verifiedOtpForResetPassword,
  verifyOtpForRegistration,
} from "../controllers/authController";
import { verifyUserToken } from "../middleware/user.middleware";
import {
  createAppointment,
  deleteAppointmentById,
  getAppointments,
  updateAppointmentById,
} from "../controllers/appointmentController";
import {
  checkExistingUserRegistration,
  checkExistingUserRegistrationFamilyCare,
  checkExistingUserUpdateProfile,
  deleteUserById,
  getAllUserContent,
  getAdvertisementsUser,
  getFacilitiesUser,
  // getReelsUser,
  getUserById,
  getUserSettings,
  // getVideosUser,
  protectedGenerateOtpForResetPassword,
  protectedUserResetPassword,
  protectedVerifiedOtpForResetPassword,
  splashUserData,
  syncCompleted,
  syncUserChanges,
  testRoute1,
  updateUserById,
  updateUserSettings,
  userFeedbackComplaint,
  userNewContact,
  userOtpVerify,
  userPasswordVerify,
  userQrData,
  userStorage,
  readTags,
  getFaqs,
} from "../controllers/userController";
import {
  deleteUploadFile,
  editUploadFile,
  getDocuments,
  userUploadFile,
} from "../controllers/documentsController";
import {
  createMedicineReminder,
  deleteMedicineById,
  getAllReminders,
  getMedicines,
  updateMedicineById,
} from "../controllers/medicineController";
import {
  createNotes,
  deleteNotes,
  getAllNotes,
  updateNotes,
} from "../controllers/notes.controller";
import {
  createPolicy,
  deletePolicies,
  getAllPolicies,
  updatePolicyById,
} from "../controllers/insuranceController";

import {
  clearNotifications,
  deletedNotificationDate,
  getNotification,
} from "../controllers/notification.controller";
import { uploadMiddleware } from "../../config/multerConfig";
import { complaintUpload } from "../utility/uploadConstants";

import {
  changeContactRateLimiter,
  forgotPasswordRateLimiter,
  globalRateLimiter,
  loginOtpRateLimiter,
  registerOtpRateLimiter,
  resendOtpRateLimiter,
  resetPassword,
} from "../constants/data";
import { getAppUpdatedVersionDetails } from "../controllers/versionController";
import { verifyVersion } from "../middleware/version.middleware";
const router = express.Router();

//REGISTER
//generating otp
router.post(
  "/user/generate-otp",
  globalRateLimiter,
  registerOtpRateLimiter,
  generateOtpForRegistration
); //done

//OTP verification
router.post("/user/otp-verify", verifyOtpForRegistration); //done

//resend OTP
router.post(
  "/user/otp-resend",
  globalRateLimiter,
  resendOtpRateLimiter,
  resendOtpRegistration
); //done

// Registering user
router.post("/user", createUser); //done
//update details: others
router.put("/user", verifyUserToken, updateUserById); //done

//LOGIN
//1.check if the user is already logged in
router.post("/check-session", checkSession);
//with userId and password
router.post("/user/login-password", loginWithPassword); //done

//with otp
router.post(
  "/user/login-otp/generate",
  globalRateLimiter,
  loginOtpRateLimiter,
  loginWithOtpGenerate
); //done

router.post("/user/login-otp/verify", loginWithOtpVerify); //done

//LOGOUT
router.post("/user/logout", verifyUserToken, logout); //done

//FORGOT PASSWORD - Auth module
router.post(
  "/user/forgot-password-otp/generate",
  globalRateLimiter,
  forgotPasswordRateLimiter,
  generateOtpForResetPassword
); //done

router.post("/user/forgot-password-otp/verify", verifiedOtpForResetPassword); //done

router.patch("/user/forgot-password", userResetPassword); //done

//SESSION MANAGEMENT
//Splash screen
router.get(
  "/user/session",
  verifyUserToken,

  splashUserData
); //done

//QR
router.get("/user/qr/:id(*)", userQrData);

//Refresh token
router.post("/user/refresh-token", refreshToken); //done

//USER-DATA ROUTES
//settings - change settings
router.patch(
  "/user/settings",
  verifyUserToken,
  updateUserSettings
); //done

//get settings data
router.get(
  "/user/settings",
  verifyUserToken,
  getUserSettings
); //done

//user by id (profile data)
router.get("/user/:id", verifyUserToken, getUserById); // not in use

//Sync Changes
router.get(
  "/user/sync/changes",
  verifyUserToken,
  syncUserChanges
); //done

//inApp notification sync
router.patch(
  "/user/sync/completed",
  verifyUserToken,

  syncCompleted
); //done

// //Family all alerts
//// router.get("/user/family-alerts", verifyUserToken, syncUserChanges); //done

//APPOINTMENTS
//Create an appointment
router.post(
  "/appointment",
  verifyUserToken,

  createAppointment
); //done

//Read Appointments
router.get(
  "/appointment",
  verifyUserToken,

  getAppointments
); //done

//Update an Appointment
router.patch(
  "/appointment/:id",
  verifyUserToken,

  updateAppointmentById
); //done

//Delete an Appointment
router.delete(
  "/appointment",
  verifyUserToken,

  deleteAppointmentById
); //done

//PROFILE
//password verify -> new details -> OTP verify
//1. Verify User Password
router.post(
  "/user/contact-change/password-verify",
  verifyUserToken,

  userPasswordVerify
); //done

//2. Take new details and generate otp
router.post(
  "/user/contact-change/new-contact",
  globalRateLimiter,
  changeContactRateLimiter,
  verifyUserToken,
  userNewContact
); //done

//3. Verify OTP and change details
router.put(
  "/user/contact-change/otp-verify",
  verifyUserToken,

  userOtpVerify
); //done

router.post(
  "/user/editProfile/checkExistingContactUpdateProfile",
  verifyUserToken,

  checkExistingUserUpdateProfile
); //done
router.post(
  "/user/editProfile/checkExistingContactRegistration",
  checkExistingUserRegistration
); //done

router.post(
  "/user/editProfile/checkExistingFamilyCareVerified",
  verifyUserToken,

  checkExistingUserRegistrationFamilyCare
); //done

//DELETE USER FLOW
//1. Verify password
router.post(
  "/user/delete-account/password-verify",
  verifyUserToken,

  userPasswordVerify
); //done

//2. Delete user
router.delete(
  "/user",
  verifyUserToken,

  deleteUserById
); //done

//RESET-PASSWORD (Protected Route)
router.post(
  "/user/reset-password-otp/generate",
  verifyUserToken,
  globalRateLimiter,
  resetPassword,
  protectedGenerateOtpForResetPassword
);

router.post(
  "/user/reset-password-otp/verify",
  verifyUserToken,

  protectedVerifiedOtpForResetPassword
);

router.patch(
  "/user/reset-password",
  verifyUserToken,

  protectedUserResetPassword
);

//documents
//upload
router.post(
  "/documents",
  verifyUserToken,

  uploadMiddleware("documentImage"),
  userUploadFile
); //done

//Get documents
router.get(
  "/documents",
  verifyUserToken,
  // verifyVersion,
  getDocuments
); //done

//edit
router.patch(
  "/documents/:doc_id",
  verifyUserToken,

  uploadMiddleware("documentImage"),
  editUploadFile
); //done

//delete
router.delete(
  "/documents",
  verifyUserToken,

  deleteUploadFile
); //done

//MEDICINES
// Add new medicine reminder
router.post(
  "/medicine",
  verifyUserToken,

  createMedicineReminder
); //done

// Get all medicine reminders
router.get(
  "/medicine",
  verifyUserToken,

  getMedicines
); //done

// Edit medicine reminder
// Deactivate medicine reminder
router.patch(
  "/medicine/:id",
  verifyUserToken,

  updateMedicineById
); //done

// Delete medicine reminder
router.delete(
  "/medicine",
  verifyUserToken,

  deleteMedicineById
); //done

router.get(
  "/reminders",
  verifyUserToken,

  getAllReminders
);

//Notes

//create notes
router.post(
  "/createNotes",
  verifyUserToken,

  createNotes
); //done

//read notes
router.get(
  "/readNotes",
  verifyUserToken,

  getAllNotes
); //done

//update Notes
router.patch(
  "/updateNotes/:id",
  verifyUserToken,

  updateNotes
); //done

//delete Notes
router.delete(
  "/deleteNotes",
  verifyUserToken,

  deleteNotes
); //done

//FEEDBACK AND COMPLAINTS
//feedback-complaint
router.post(
  "/user-message",
  verifyUserToken,

  uploadMiddleware(complaintUpload),
  userFeedbackComplaint
); //done

//CONTENT-MANAGEMENT
//tags
//get tags
router.get("/tags", readTags);

//get facilities
router.get(
  "/facilities",
  verifyUserToken,

  getFacilitiesUser
); //done

//single API for all content
router.get("/content", verifyUserToken, getAllUserContent);

//get advertisements
router.get(
  "/advertisement",
  verifyUserToken,
  // verifyVersion,
  getAdvertisementsUser
); //done

//tags
router.get("/tags", readTags);

// //get videos
// //router.get("/videos", verifyUserToken,  getVideosUser); //done

// //get reels
// //router.get("/reel",verifyUserToken,  getReelsUser)

//INSURANCE
//Add a policy
router.post(
  "/policy",
  verifyUserToken,

  uploadMiddleware("policyImg"),
  createPolicy
); //done

//Read all policies
router.get(
  "/policy",
  verifyUserToken,

  getAllPolicies
); //done

//Edit Policy by id
router.patch(
  "/policy/:id",
  verifyUserToken,

  uploadMiddleware("policyImg"),
  updatePolicyById
); //done

//Delete Policies
router.delete("/policy", verifyUserToken, deletePolicies); //done

//get notification
router.get(
  "/notifications",
  verifyUserToken,

  getNotification
);

//delete notification
router.delete(
  "/clear-notifications",
  verifyUserToken,

  clearNotifications
);

//get localnotification latest clear date
router.get(
  "/deleted-notification-latest-date",
  verifyUserToken,

  deletedNotificationDate
);
//storage details
router.get(
  "/storage-check/:id",
  verifyUserToken,

  userStorage
);

//FAQ'S
router.get("/faqs", verifyUserToken, getFaqs);
//test route

router.post("/test1", testRoute1);

router.get("/app-update-version-details", verifyUserToken, verifyVersion, getAppUpdatedVersionDetails)

export default router;
