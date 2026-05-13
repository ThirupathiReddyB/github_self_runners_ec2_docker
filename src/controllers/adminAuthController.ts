import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  checkAdminSession,
  createOtpforAdminAuditor,
  createOtpforLogin,
  createOtpforSuperAdminRegistration,
  deleteAdminAuditors,
  deleteSuperAdmin,
  fetchAdminAuditor,
  generateNewAccessToken,
  getSuperAdmin,
  getSuperAdminDashboardData,
  loginDashboardUser,
  logoutAdmin,
  resendOtpForAdminAuditor,
  updateAdminData,
  updateSuperAdmin,
  verifyOtpAdminAuditor,
  verifyOtpSuperAdmin,
} from "../services/admin.auth.service";
import {
  createAdminAndAuditor,
  createSuperAdminValidation,
  emailStringValidation,
  updateSuperAdminValidation,
  verifyOtp,
} from "../utility/Validation/adminValidation";
import { adminSessionValidation } from "../utility/Validation/AuthValidation";
import { Helpers } from "../utility/Helpers";
import { VGetCommon } from "../utility/Validation/contentManagementValidations";
import { IGetCommon } from "../utility/DataTypes/types.common";
import { createAdminInput } from "../utility/DataTypes/types.admin";

//check session
export const checkSession = async (req: Request, res: Response) => {
  try {
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data) throw new HTTPError("API Missing body", 422);

    Helpers.validateWithZod(adminSessionValidation, data);

    const { emailId } = data;
    if (!emailId) {
      throw new HTTPError("missing required field", 400);
    }
    const sessionData = await checkAdminSession(data);
    if (!sessionData) throw new HTTPError("Could Not Log in user", 204);
    const code = sessionData.success ? 200 : 400;
    res.status(code).json(sessionData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });
    const { emailId, fullName, position } = req.body;
    if (!emailId || !fullName || !position) {
      throw new HTTPError("missing required fields", 400);
    }

    const data: createAdminInput = {
      fullName,
      emailId,
      position,
    };

    Helpers.validateWithZod(createSuperAdminValidation, data);

    const createdAdmin = await createOtpforSuperAdminRegistration(data);
    if (!createdAdmin) {
      throw new HTTPError("could not send otp ", 204);
    }
    const code = createdAdmin.success ? 200 : 400;
    res.status(code).json({ data: createdAdmin });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//admin and auditor send otp
export const sendOtpAdminAuditor = async (req: Request, res: Response) => {
  try {
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("unauthorized user", 401);
    }
    if (admin.role !== "superAdmin") {
      throw new HTTPError(
        "Only super admins can create auditors and admin",
        401
      );
    }
    const { emailId, fullName, position, role } = data;
    if (!emailId || !fullName || !position || !role) {
      throw new HTTPError("missing required fields", 400);
    }

    Helpers.validateWithZod(createAdminAndAuditor, data);
    const createdAdmin = await createOtpforAdminAuditor(data);
    if (!createdAdmin) {
      throw new HTTPError("could not send otp ", 204);
    }
    const code = createdAdmin.success ? 200 : 400;
    res.status(code).json({ data: createdAdmin });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//admin and auditor re-send otp
export const resendOtpAdminAuditor = async (req: Request, res: Response) => {
  try {
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("unauthorized user", 401);
    }
    if (admin.role !== "superAdmin") {
      throw new HTTPError(
        "Only super admins can create auditors and admin",
        401
      );
    }

    Helpers.validateWithZod(emailStringValidation, data);

    const { emailId } = data;
    if (!emailId) {
      throw new HTTPError("missing required fields", 400);
    }

    Helpers.validateWithZod(emailStringValidation, data);

    const createdAdmin = await resendOtpForAdminAuditor(emailId);
    if (!createdAdmin) {
      throw new HTTPError("could not send otp ", 204);
    }
    const code = createdAdmin.success ? 200 : 400;
    res.status(code).json({ data: createdAdmin });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//verify otp and create superadmin
export const registerSuperAdmin = async (req: Request, res: Response) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { emailId, otp } = req.body;

    if (!emailId || !otp) {
      throw new HTTPError("missing required fields", 400);
    }

    const data = {
      emailId,
      otp,
    };

    Helpers.validateWithZod(verifyOtp, data);

    const createdAdmin = await verifyOtpSuperAdmin(data);
    if (!createdAdmin) {
      throw new HTTPError("could not send otp ", 204);
    }
    const code = createdAdmin.success ? 200 : 400;
    res.status(code).json({ data: createdAdmin });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//verifyotp and create admin auditor
export const registerAdminAuditor = async (req: Request, res: Response) => {
  try {
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("unauthorized user", 401);
    }
    if (admin.role !== "superAdmin") {
      throw new HTTPError(
        "Only super admins can create auditors and admin",
        401
      );
    }
    const { emailId, otp } = data;
    if (!emailId || !otp) {
      throw new HTTPError("missing required fields", 400);
    }

    Helpers.validateWithZod(verifyOtp, data);

    const createdAdmin = await verifyOtpAdminAuditor(data);
    if (!createdAdmin) {
      throw new HTTPError("could not send otp ", 204);
    }
    const code = createdAdmin.success ? 200 : 400;
    res.status(code).json({ data: createdAdmin });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//create otp login
export const createOtpLogin = async (req: Request, res: Response) => {
  try {
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { emailId } = data;
    if (!emailId) {
      throw new HTTPError("emailId is required, missing required field", 400);
    }
    Helpers.validateWithZod(emailStringValidation, data);

    const loggedInDashboardUser = await createOtpforLogin(data);
    if (!loggedInDashboardUser) {
      throw new HTTPError("could not create admin", 204);
    }
    const code = loggedInDashboardUser.success ? 200 : 400;
    res.status(code).json({ data: loggedInDashboardUser });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//verify otp login
export const verifyOtpLogin = async (req: Request, res: Response) => {
  try {
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { emailId, otp } = data;
    if (!emailId || !otp) {
      throw new HTTPError("missing required fields", 400);
    }

    Helpers.validateWithZod(verifyOtp, data);

    const createdAdmin = await loginDashboardUser(data);
    if (!createdAdmin) {
      throw new HTTPError("could not send otp ", 204);
    }
    const code = createdAdmin.success ? 200 : 400;
    res.status(code).json({ data: createdAdmin });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const refreshAdminToken = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;

    if (!token?.startsWith("Bearer")) {
      throw new HTTPError("Unauthorized user or invalid format", 401);
    }
    const refreshedToken = await generateNewAccessToken(token);
    if (!refreshedToken) {
      throw new HTTPError("error while refreshing the token", 204);
    }
    const code = refreshedToken.success ? 200 : 500;
    res.status(code).json({ data: refreshedToken });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getSuperAdmins = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized user", 401);
    }
    if (admin.role !== "superAdmin") {
      throw new HTTPError("Only superadmin can access the data ", 401);
    }
    const superAdmins = await getSuperAdmin();
    if (!superAdmins) {
      throw new HTTPError("could not create admin", 204);
    }
    const code = superAdmins.success ? 200 : 400;
    res.status(code).json({ data: superAdmins });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updateSuperAdmins = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("unauthorized user", 401);
    }
    if (admin.role !== "superAdmin") {
      throw new HTTPError("Only superadmin can access the data ", 401);
    }
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const validationResponse = updateSuperAdminValidation.safeParse(data);
    if (!validationResponse.success) {
      const errorObj = validationResponse.error.issues
        .map((issue) => `${issue.path[0]}: ${issue.message}`)
        .join(" // ");
      throw new HTTPError(`Validation Errors:-> ${errorObj}`, 400);
    }

    const updatedsuperAdmins = await updateSuperAdmin(data, admin);
    if (!updatedsuperAdmins) {
      throw new HTTPError("could not update admin", 204);
    }
    const code = updatedsuperAdmins.success ? 200 : 400;
    res.status(code).json({ data: updatedsuperAdmins });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteSuperAdmins = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized user", 401);
    }
    if (admin.role !== "superAdmin") {
      throw new HTTPError("Only superadmin can access the data ", 401);
    }

    const deletedsuperAdmins = await deleteSuperAdmin(admin);
    if (!deletedsuperAdmins) {
      throw new HTTPError("could not delete admin", 204);
    }
    const code = deletedsuperAdmins.success ? 200 : 400;
    res.status(code).json({ data: deletedsuperAdmins });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updateAdmin = async (req: Request, res: Response) => {
  try {
    //logged in panel role based authentication
    const admin = req.admin;
    if (!admin) throw new HTTPError("Unauthorised", 401);
    if (admin.role == "auditor") {
      throw new HTTPError("Not authorised to make this change ", 401);
    }
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    //params
    const { id } = req.params;
    if (!id) {
      throw new HTTPError("please provide id of record to update", 400);
    }

    Helpers.validateWithZod(updateSuperAdminValidation, data);

    const updatedsuperAdmins = await updateAdminData(
      admin,
      data,
      parseInt(id.toString())
    );
    if (!updatedsuperAdmins) {
      throw new HTTPError("could not update admin", 204);
    }
    const code = updatedsuperAdmins.success ? 200 : 400;
    res.status(code).json({ data: updatedsuperAdmins });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getAdminAuditor = async (req: Request, res: Response) => {
  try {
    //logged in panel role based authentication
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("unauthorized user", 401);
    }
    if (admin.role !== "superAdmin") {
      throw new HTTPError("Only superadmin can access the data ", 401);
    }

    //params
    const params =
      req.query ??
      (() => {
        throw new HTTPError("API Missing query parameter", 400);
      });
    const { id, page, search, limit, sortByField, sortByOrder } = params;
    const data: IGetCommon = {
      id: typeof id === "string" ? parseInt(id) : undefined,
      page: typeof page === "string" ? parseInt(page) : 1,
      search: typeof search === "string" ? search : undefined,
      limit: typeof limit === "string" ? parseInt(limit) : 500,
      sortByField: typeof sortByField === "string" ? sortByField : undefined,
      sortByOrder:
        typeof sortByOrder === "string"
          ? (sortByOrder as IGetCommon["sortByOrder"])
          : undefined,
    };
    Helpers.validateWithZod(VGetCommon, data);

    //response
    const fetchedAdminAuditor = await fetchAdminAuditor(data);
    if (!fetchedAdminAuditor) {
      throw new HTTPError("could not fetch admin", 204);
    }
    const code = fetchedAdminAuditor.success ? 200 : 400;
    res.status(code).json(fetchedAdminAuditor);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteAdminAuditor = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("unauthorized user", 401);
    }
    if (admin.role !== "superAdmin") {
      throw new HTTPError("Only superadmin can access the data ", 401);
    }
    //kept id as query params as mutiple records are to be deleted together
    const { id } = req.query;
    if (!id) {
      throw new HTTPError("missing required field ", 400);
    }
    const deletedAdminAuditor = await deleteAdminAuditors(id.toString());
    if (!deletedAdminAuditor) {
      throw new HTTPError("could not update admin", 204);
    }
    const code = deletedAdminAuditor.success ? 200 : 400;
    res.status(code).json({ data: deletedAdminAuditor });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const adminLogout = async (req: Request, res: Response) => {
  try {
    const admin = req.admin; // access user object attached in the middleware
    if (!admin) throw new HTTPError("Unauthorised", 401);

    const logoutData = await logoutAdmin(admin);

    if (!logoutData?.success)
      throw new HTTPError("Could Not Log Out User", 204);
    const code = logoutData.success ? 200 : 400;
    res.status(code).json(logoutData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const adminDashboard = async (req: Request, res: Response) => {
  try {
    const admin = req.admin; // access user object attached in the middleware

    if (!admin) throw new HTTPError("Unauthorised", 401);
    if (
      admin.role !== "auditor" &&
      admin.role !== "superAdmin" &&
      admin.role !== "admin"
    ) {
      throw new HTTPError("You dont have access to view this data ", 401);
    }
    const fetchedData = await getSuperAdminDashboardData();

    if (!fetchedData?.success) {
      throw new HTTPError("Could Not Log Out User", 204);
    }
    const code = fetchedData.success ? 200 : 400;
    res.status(code).json(fetchedData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
