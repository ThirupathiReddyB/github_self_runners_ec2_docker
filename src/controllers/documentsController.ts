import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  delDocs,
  editDocs,
  getUserDocuments,
  uploadDocs,
} from "../services/documents.services";
import {
  editFileValidation,
  uploadFileValidation,
} from "../utility/Validation/DocumentValidation";

import { Helpers } from "../utility/Helpers";
import {
  IDelDocsInput,
  IEditDocsInput,
  IGetDocuments,
  IUploadDocsInput,
} from "../utility/DataTypes/types.document";

//validations for userUploadFile
// 1. file must be in .jpeg,jpg,pdf,png,heic,docx
// 2. form data must contain category: string;name: string;dr_name: string;note?: string;isSensitive: string;

export const userUploadFile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const file = req.file;
    if (!file) {
      throw new HTTPError("Missing required fields here", 422);
    }

    const { famCareMemberId } = req.query;
    const {
      documentCategory,
      documentName,
      documentConsultant,
      notes,
      isSensitive,
    } = req.body;

    const data: IUploadDocsInput = {
      file,
      documentCategory,
      documentName,
      documentConsultant,
      notes,
      isSensitive,
      userId: user.id,
      famCareMemberId: famCareMemberId
        ? famCareMemberId.toString().toLowerCase()
        : undefined,
    };
    Helpers.validateWithZod(uploadFileValidation, data);

    const uploadImageResponse = await uploadDocs(data);
    if (!uploadImageResponse) {
      throw new HTTPError("Failed to upload file", 204);
    }
    const code = uploadImageResponse.success ? 200 : 400;
    res.status(code).json({ data: uploadImageResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const {
      limit,
      id,
      documentName,
      category,
      consultant,
      notes,
      famCareMemberId,
      getOnlySensitiveData,
    } = req.query;

    const queryParams: IGetDocuments = {
      limit: limit ? parseInt(limit as string) : undefined,
      id: id ? parseInt(id as string) : undefined,
      documentName: documentName
        ? documentName.toString().toLowerCase()
        : undefined,
      category: category ? category.toString().toLowerCase() : undefined,
      consultant: consultant ? consultant.toString().toLowerCase() : undefined,
      notes: notes ? notes.toString().toLowerCase() : undefined,
      famCareMemberId: famCareMemberId
        ? famCareMemberId.toString().toLowerCase()
        : undefined,
      getOnlySensitiveData: getOnlySensitiveData === "true" ? true : false,
    };

    const all_documents = await getUserDocuments(user, queryParams);
    if (!all_documents)
      throw new HTTPError(`Could Not get documents for user`, 204);
    const code = all_documents.success ? 200 : 400;
    res.status(code).json({ data: all_documents });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const editUploadFile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorised", 401);
    }
    const doc_file = req.file;

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { famCareMemberId } = req.query;

    const {
      documentCategory,
      documentName,
      documentConsultant,
      notes,
      isSensitive,
    } = req.body;

    const data: IEditDocsInput = {
      id: parseInt(req.params.doc_id),
      file: doc_file,
      documentCategory,
      documentName,
      documentConsultant,
      notes,
      isSensitive,
      userId: user.id,
      famCareMemberId:
        typeof famCareMemberId === "string"
          ? famCareMemberId.toLowerCase()
          : undefined,
    };

    Helpers.validateWithZod(editFileValidation, data);

    const uploadImageResponse = await editDocs(data);
    if (!uploadImageResponse) {
      throw new HTTPError("could not upload image", 204);
    }
    const code = uploadImageResponse.success ? 200 : 400;
    res.status(code).json({ data: uploadImageResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteUploadFile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unuathorised", 401);
    }
    const { famCareMemberId, id } = req.query;

    if (!id) throw new HTTPError("Enter id of records to delete", 422);
    if (!user.id || !id) throw new HTTPError("Required fields missing", 422);

    const data: IDelDocsInput = {
      userId: user.id,
      id: id as string,
      famCareMemberId: famCareMemberId?.toString().toLowerCase(),
    };

    const deleteDocResponse = await delDocs(data);
    if (!deleteDocResponse) {
      throw new HTTPError("could not delete document", 204);
    }
    const code = deleteDocResponse.success ? 200 : 400;
    res.status(code).json({ data: deleteDocResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
