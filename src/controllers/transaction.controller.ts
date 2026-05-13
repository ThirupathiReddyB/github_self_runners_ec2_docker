import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  emailUserInvoice,
  getInvoice,
  getTransactions,
} from "../services/transaction.services";
import { IGetCommon } from "../utility/DataTypes/types.common";
import {
  IGetInvoice,
  IGetTransaction,
} from "../utility/DataTypes/types.transaction";
import { Helpers, unlinkFile } from "../utility/Helpers";
import { vGetTransactionAdmin } from "../utility/Validation/story.validation";

export const getUserTxnHistory = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }

    const params: IGetCommon = {
      userId: user.id,
      paymentStatus: ["success", "failed"],
    };

    const usertxnData = await getTransactions(params, user);
    if (!usertxnData)
      throw new HTTPError(
        `Could Not get active subscription and add-ons data`,
        204
      );
    const code = usertxnData.success ? 200 : 400;
    res.status(code).json({ data: usertxnData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const downloadInvoiceByTxnid = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }

    const { txnid } = req.params;

    const params: IGetInvoice = {
      userId: user.id,
      txnid: txnid as string,
    };

    const userInvoice = await getInvoice(params);
    if (!userInvoice) throw new HTTPError(`Could Not get invoice data`, 204);
    return res.download(userInvoice.filePath, (err) => {
      if (err) {
        console.error("Download error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to download the pdf.",
        });
      }

      unlinkFile(userInvoice.filePath);
    });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//Admin Panel
export const readTransactions = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin || admin.role == "auditor") {
      throw new HTTPError("Unauthorized", 401);
    }
    const params = req.query;
    const { id, search, page, limit, paymentStatus, transactionDate } = params;

    Helpers.validateWithZod(vGetTransactionAdmin, params);

    const queryFields: IGetTransaction = {
      id: id ? parseInt(id as string) : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
      paymentStatus: paymentStatus ? (paymentStatus as []) : undefined,
      transactionDate: transactionDate
        ? (transactionDate as unknown as Date)
        : undefined,
    };

    const usertxnData = await getTransactions(queryFields);
    if (!usertxnData)
      throw new HTTPError(`Could Not get transactions data`, 204);
    const code = usertxnData.success ? 200 : 400;
    res.status(code).json({ data: usertxnData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//Admin Panel
export const emailInvoice = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const { txnid, emailId, userId } = req.body;

    if (!txnid || !emailId || !userId)
      throw new HTTPError("Provide txnid,userId and emailId", 422);

    const params: IGetInvoice = {
      userId: userId as string,
      txnid: txnid as string,
      emailId: emailId as string,
    };

    const reponse = await emailUserInvoice(params);
    if (!reponse) throw new HTTPError(`Could Not get invoice data`, 204);
    const code = reponse.success ? 200 : 400;
    res.status(code).json({ data: reponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
