import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  ChangeInsuranceValidation,
  uploadInsuranceValidation,
} from "../utility/Validation/insuranceValidations";
import {
  delPolicies,
  editPolicy,
  getUserPolicies,
  uploadInsurance,
} from "../services/insurance.services";
import { Helpers } from "../utility/Helpers";
import { IGetCommon } from "../utility/DataTypes/types.user";

export const createPolicy = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorised", 401);
    const file = req.file;
    const form_data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });
    const userId = user.id;
    const { famCareMemberId } = req.query;

    if (!form_data || !user.id) {
      throw new HTTPError("Missing required fields", 422);
    }

    Helpers.validateWithZod(uploadInsuranceValidation, { file, form_data });
    const uploadInsuranceResponse = await uploadInsurance(
      {
        file,
        userId,
        form_data,
      },
      typeof famCareMemberId === "string" ? famCareMemberId : undefined
    );
    if (!uploadInsuranceResponse) {
      throw new HTTPError("could not upload insurance", 204);
    }
    const code = uploadInsuranceResponse.success ? 200 : 400;
    res.status(code).json({ data: uploadInsuranceResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getAllPolicies = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const { id, search, famCareMemberId, page, limit } = req.query;

    const data: IGetCommon = {
      id: typeof id === "string" ? parseInt(id) : undefined,
      search: typeof search === "string" ? search : undefined,
      famCareMemberId:
        typeof famCareMemberId === "string" ? famCareMemberId : undefined,
      page: typeof page === "string" ? parseInt(page) : 1,
      limit: typeof limit === "string" ? parseInt(limit) : 500,
    };

    const all_policies = await getUserPolicies(user, data);
    if (!all_policies)
      throw new HTTPError(`Could Not get documents for user`, 204);
    const code = all_policies.success ? 200 : 400;
    res.status(code).json({ data: all_policies });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updatePolicyById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorised", 401);
    const file = req.file;
    const form_data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });
    const queryParams = req.query;
    const userId = user.id;
    const id = req.params.id;

    Helpers.validateWithZod(ChangeInsuranceValidation, { file, form_data });

    const editInsuranceResponse = await editPolicy(
      {
        file,
        userId,
        form_data,
        id,
      },
      queryParams
    );
    if (!editInsuranceResponse) {
      throw new HTTPError("Could not edit policy", 204);
    }
    const code = editInsuranceResponse.success ? 200 : 400;
    res.status(code).json({ data: editInsuranceResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deletePolicies = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const userId = user.id;
    const queryParams = req.query;
    const { famCareMemberId, id } = queryParams;
    if (!id) throw new HTTPError("Enter id of records to delete", 422);
    if (user) {
      if (!userId || !id) throw new HTTPError("Required fields missing", 422);
      const delInsuranceResponse = await delPolicies(
        { userId, id: id as string },
        famCareMemberId?.toString().toLowerCase()
      );
      if (!delInsuranceResponse) {
        throw new HTTPError("Could not delete policy", 204);
      }
      const code = delInsuranceResponse.success ? 200 : 400;
      res.status(code).json({ data: delInsuranceResponse });
    } else {
      throw new HTTPError("validation error", 400);
    }
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
