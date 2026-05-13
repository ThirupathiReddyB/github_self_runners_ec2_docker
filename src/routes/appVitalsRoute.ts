import express from "express";

import { verifyUserToken } from "../middleware/user.middleware";
import {
  // addPeriodRecord,
  createVitalRecord,
  downloadVitalReport,
  getValidVitalModules,
  getVitalDataByModule,
} from "../controllers/vitalsController";

const router = express.Router();

//VITALS - user records
//Add new vital record for user
router.post("/vitalRecord", verifyUserToken, createVitalRecord);

//Add new record for period diary (custom function for period diary only)
// router.post("/vitalRecord/periodDiary", verifyUserToken, addPeriodRecord);

//Get vital data of user by vital module code and user/dependantId
router.get("/vitalData", verifyUserToken, getVitalDataByModule);

//get all "VALID" vital modules of a user
router.get("/vitalModule", verifyUserToken, getValidVitalModules);

router.get(
  "/downloadVitalReport",
  verifyUserToken,
  downloadVitalReport
);

//testing purpose route not in use
// //router.get("/downloadpdf",downloadTestVitalReport)

//delete vital record of user by recordId
//// router.delete("/vitalRecord", verifyUserToken, deleteVitalRecordById);

export default router;
