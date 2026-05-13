import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  addNewVitalModule,
  addNewVitalRecord,
  // notePeriodRecord,
  deleteVitalModule,
  deleteVitalsRecords,
  getUserVitalModules,
  getVitalModules,
  getVitalRecordsOfUser,
  editVitalModuleById,
  downloadReportById,
  downloadReportByIdTest,
} from "../services/vitals.services";
import {
  BulkVitalModule,
  BulkVitalRecord,
  updateVitalModuleValidation,
  VDownloadVitalCode,
} from "../utility/Validation/VitalsValidation";
import { Helpers, unlinkFile } from "../utility/Helpers";
import {
  IAddVitalRecord,
  IGetVitalRecords,
} from "../utility/DataTypes/types.vitals";
import { IGetCommon } from "../utility/DataTypes/types.common";
//USER DATA
export const createVitalRecord = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    const { famCareMemberId, deletePeriodRecord } = req.query;

    if (!user) throw new HTTPError("Unauthorised", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { vitalCode, recordData, lastSyncDate } = req.body;
    const data: IAddVitalRecord = {
      userId: user.id,
      vitalCode,
      recordData,
      lastSyncDate: lastSyncDate ? new Date(lastSyncDate) : undefined,
      famCareMemberId: famCareMemberId
        ? (famCareMemberId as string)
        : undefined,
      deletePeriodRecord: deletePeriodRecord
        ? (deletePeriodRecord as string)
        : undefined,
    };

    if (!deletePeriodRecord && Object.keys(req.body).length === 0) {
      throw new HTTPError("Missing required fields", 422);
    }

    Helpers.validateWithZod(BulkVitalRecord, data);

    const newVitalRecord = await addNewVitalRecord(data);
    if (!newVitalRecord)
      throw new HTTPError(`Could Not Create New vitals record`, 204);

    const code = newVitalRecord.success ? 200 : 400;
    res.status(code).json({ data: newVitalRecord });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getVitalDataByModule = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const { famCareMemberId, startDate, endDate, codeId } = req.query;

    const queryParams: IGetVitalRecords = {
      famCareMemberId: famCareMemberId
        ? (famCareMemberId as string)
        : undefined,
      startDate: startDate ? (startDate as string) : undefined,
      endDate: endDate ? (endDate as string) : undefined,
      codeId: codeId ? (codeId as string) : undefined,
    };

    if (!user.id) {
      throw new HTTPError("Missing required fields", 422);
    }
    const newVitalRecord = await getVitalRecordsOfUser(user.id, queryParams);
    if (!newVitalRecord) throw new HTTPError(`Could Not Get User Details`, 204);
    const code = newVitalRecord.success ? 200 : 400;
    res.status(code).json({ data: newVitalRecord });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getValidVitalModules = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const queryParams = req.query;

    const vitalModules = await getUserVitalModules(user, queryParams);
    if (!vitalModules)
      throw new HTTPError(
        `Could Not Fetch Self awareness modules for user`,
        204
      );
    const code = vitalModules.success ? 200 : 400;
    res.status(code).json({ data: vitalModules });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteVitalRecordById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorized", 401);

    const queryParams = req.query;
    const { famCareMemberId, id } = queryParams;

    if (!id) throw new HTTPError("Enter id of records to delete", 422);

    if (!id || !user.id)
      throw new HTTPError("Required fields are missing", 422);

    const deleteVitalData = await deleteVitalsRecords(
      {
        vitalId: id as string,
        userId: user.id,
      },
      famCareMemberId?.toString().toLowerCase()
    );

    if (!deleteVitalData)
      throw new HTTPError(`Could Not delete vital(s) data`, 204);
    const code = deleteVitalData.success ? 200 : 400;
    res.status(code).json({ data: deleteVitalData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//ADMIN FUNCTIONS
export const createVitalModules = async (req: Request, res: Response) => {
  try {
    const admin = req.admin; // access admin object attached in the middleware
    if (!admin) throw new HTTPError("Unauthorised", 401);

    if (admin.role === "auditor")
      throw new HTTPError("Not authorised to make this change", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });
    if (!data) throw new HTTPError("Required fields misisng", 422);

    Helpers.validateWithZod(BulkVitalModule, data);

    const newVitalRecord = await addNewVitalModule(data, admin);
    if (!newVitalRecord)
      throw new HTTPError(`Could Not Add New Self-awareness module`, 204);
    const code = newVitalRecord.success ? 200 : 400;
    res.status(code).json({ data: newVitalRecord });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getAllVitalModules = async (req: Request, res: Response) => {
  try {
    const admin = req.admin; // access admin object attached in the middleware
    if (!admin) throw new HTTPError("Unauthorised", 401);

    const { id, search, page, limit } = req.query;

    const data: IGetCommon = {
      id: typeof id === "string" ? parseInt(id) : undefined,
      page: typeof page === "string" ? parseInt(page) : 1,
      search: typeof search === "string" ? search : undefined,
      limit: typeof limit === "string" ? parseInt(limit) : 500,
    };
    const vitalModules = await getVitalModules(data);
    if (!vitalModules)
      throw new HTTPError(
        `Could Not Fetch Self awareness modules for admin`,
        204
      );
    const code = vitalModules.success ? 200 : 400;
    res.status(code).json({ data: vitalModules });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
export const deleteVitalModules = async (req: Request, res: Response) => {
  try {
    const admin = req.admin; // access admin object attached in the middleware
    if (!admin) throw new HTTPError("Unauthorised", 401);

    let queryParams = req.query;

    const deletedVitalModule = await deleteVitalModule(queryParams);
    if (!deletedVitalModule) {
      throw new HTTPError(" could not delete record", 204);
    }
    const code = deletedVitalModule.success ? 200 : 400;
    res.status(code).json({ error: { data: deletedVitalModule } });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
export const updateVitalModuleById = async (req: Request, res: Response) => {
  try {
    const admin = req.admin; // access admin object attached in the middleware
    if (!admin) throw new HTTPError("Unauthorised", 401);

    if (admin.role === "auditor")
      throw new HTTPError("Not authorised to make this change", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });
    const moduleId = req.params.id;
    if (!data || !moduleId) throw new HTTPError("Required fields misisng", 422);

    Helpers.validateWithZod(updateVitalModuleValidation, data);

    const updateVitalModule = await editVitalModuleById(data, moduleId);
    if (!updateVitalModule)
      throw new HTTPError(`Could Not Update Self-awareness module`, 204);
    const code = updateVitalModule.success ? 200 : 400;
    res.status(code).json({ data: updateVitalModule });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//download report
export const downloadVitalReport = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorised", 401);
    }

    let { famCareMemberId, vitalModuleCode } = req.query;

    const clubbedData = {
      vitalModuleCode: vitalModuleCode as [],
      famCareMemberId: famCareMemberId?.toString().toLowerCase(),
    };

    Helpers.validateWithZod(VDownloadVitalCode, clubbedData);
    //for testing mg80mh98
    const report = await downloadReportById(user.id, clubbedData);
    if (!report) throw new HTTPError("Could Not Download Report", 204);

    return res.download(report.filepath, (err) => {
      if (err) {
        console.error("Download error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to download the report.",
        });
      }

      unlinkFile(report.filepath);
    });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const downloadTestVitalReport = async (_req: Request, res: Response) => {
  try {
    //for testing mg80mh98
    const report = await downloadReportByIdTest();

    return res.download(report.filepath, (err) => {
      if (err) {
        console.error("Download error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to download the report.",
        });
      }

      unlinkFile(report.filepath);
    });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
