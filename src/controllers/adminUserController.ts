import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  blockUserWithReason,
  removeUserById,
  unblockUser,
} from "../services/user.services";
import {
  blockUserValidation,
  deleteUserValidation,
  updateUserValidation,
} from "../utility/Validation/userValidation";
import { adminUpdateUserById } from "../services/admin.auth.service";
import { Helpers } from "../utility/Helpers";

export const adminEditUserById = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });
    if (!data) throw new HTTPError("Missing required Data", 422);

    const validationResponse = updateUserValidation.safeParse(data);
    if (!validationResponse.success) {
      const errorObj = validationResponse.error.issues
        .map((issue) => `${issue.path[0]}: ${issue.message}`)
        .join(" // ");
      throw new HTTPError(`Validation Errors:-> ${errorObj}`, 400);
    }
    const userId: string = req.params.id;

    const updatedData = await adminUpdateUserById(data, userId);

    if (!updatedData)
      throw new HTTPError(
        `Could Not update details for user ${req.params.id}`,
        204
      );
    const code = updatedData.success ? 200 : 400;
    res.status(code).json({ data: updatedData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const adminDeleteUserById = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });

    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role !== "superAdmin")
      throw new HTTPError("Not authorised to do this action", 401);
    const validationResponse = deleteUserValidation.safeParse(data);
    if (!validationResponse.success) {
      const errorObj = validationResponse.error.issues
        .map((issue) => `${issue.path[0]}: ${issue.message}`)
        .join(" // ");
      throw new HTTPError(`Validation Errors:-> ${errorObj}`, 400);
    }
    const userId = req.params.id;
    const deleteData = {
      reason: data.reason,
      role: admin.role,
      email: admin.emailId,
    };
    const userData = await removeUserById(userId, deleteData);
    if (!userData)
      throw new HTTPError(`Could Not delete user ${req.params.id}`, 204);
    const code = userData.success ? 200 : 400;
    res.status(code).json({ data: userData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//block user
export const adminBlockUser = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor" || admin.role == "admin")
      throw new HTTPError("Not authorised to do this action", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });
    if (!data) throw new HTTPError("userId and block reason is needed", 422);

    Helpers.validateWithZod(blockUserValidation, data);
    const blockUserResponse = await blockUserWithReason(data, admin);
    if (!blockUserResponse) throw new HTTPError(`Could Not block User`, 204);
    const code = blockUserResponse.success ? 200 : 400;
    res.status(code).json({ data: blockUserResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//unblock user
export const adminUnblockUser = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor" || admin.role == "admin")
      throw new HTTPError("Not authorised to do this action", 401);

    const userId = req.params.id;
    if (!userId) throw new HTTPError("userId is needed", 422);

    const blockUserResponse = await unblockUser(userId);
    if (!blockUserResponse) throw new HTTPError(`Could Not un-block User`, 204);
    const code = blockUserResponse.success ? 200 : 400;
    res.status(code).json({ data: blockUserResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
