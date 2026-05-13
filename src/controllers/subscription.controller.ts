import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import { IGetCommon } from "../utility/DataTypes/types.common";
import {
  getAggregateData,
  getAllPlanAddons,
  getAllRefundsByTransactionId,
  getExpiryDetails,
  getSubscription,
  getUserSplashLogo,
  paymentIsFailed,
  paymentIsSuccedded,
  proceedingToPay,
  refundInitiator,
  useB2BVoucher,
  userActiveData,
} from "../services/subscription.services";
import { getVoucher } from "../services/voucher.services";
import { Helpers } from "../utility/Helpers";
import {
  createPayment,
  createRefund,
} from "../utility/Validation/subscriptionValidation";
import { IGetUserVoucher } from "../utility/DataTypes/types.voucher";
import {
  getFailurePageurl,
  getSuccessPageUrl,
  somethingWentWrongPage,
} from "../constants/subscriptionData";

//user side
export const getPlansAddons = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }

    const activeSubData = await getAllPlanAddons(user);
    if (!activeSubData)
      throw new HTTPError(
        `Could Not get active subscription and add-ons data`,
        204
      );
    const code = activeSubData.success ? 200 : 400;
    res.status(code).json({ data: activeSubData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//admin side
export const getSubscriptions = async (req: Request, res: Response) => {
  try {
    const { id, search, page, limit, userId } = req.query;
    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const queryFields: IGetCommon = {
      id: id ? parseInt(id as string) : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
      userId: userId as string,
    };

    const subscriptionData = await getSubscription(queryFields);
    if (!subscriptionData)
      throw new HTTPError(`Could Not get subscriptions data`, 204);
    const code = subscriptionData.success ? 200 : 400;
    res.status(code).json({ data: subscriptionData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//user side
export const getActiveSubscriptionAddon = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }

    const queryFields: IGetCommon = {
      userId: user.id,
    };

    const activeSubAddonData = await userActiveData(queryFields);
    if (!activeSubAddonData)
      throw new HTTPError(`Could Not get subscriptions data`, 204);
    const code = activeSubAddonData.success ? 200 : 400;
    res.status(code).json({ data: activeSubAddonData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//user side
export const getAllVouchers = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const { voucherCode } = req.query;
    const queryFields: IGetUserVoucher = {
      userId: user.id,
      voucherCode: voucherCode ? (voucherCode as string) : undefined,
    };

    const voucherData = await getVoucher(queryFields);
    if (!voucherData) throw new HTTPError(`Could Not get voucher data`, 204);
    const code = voucherData.success ? 200 : 400;
    res.status(code).json({ data: voucherData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//aggregate data
export const getAllSubscriptionData = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }
    const getSubscriptionData = await getAggregateData(admin);
    if (!getSubscriptionData)
      throw new HTTPError(`Could Not get subscriptions data`, 204);
    const code = getSubscriptionData.success ? 200 : 400;
    res.status(code).json({ data: getSubscriptionData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const proceedToPay = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    Helpers.validateWithZod(createPayment, data);

    //create payment
    const paymentCreated = await proceedingToPay(user, data);

    const code = paymentCreated.success ? 200 : 400;
    res.status(code).json({ url: paymentCreated.url });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({
        error: { message: "Internal server error" },
      });
    }
  }
};

export const checkSubscriptionExpiry = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    const getExpiry = await getExpiryDetails(user);
    if (!getExpiry) throw new HTTPError(`Could Not get Medicines data `, 204);
    res.status(200).json({ data: getExpiry });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const paymentSuccess = async (req: Request, res: Response) => {
  let userId: string = req.body.udf1;
  try {
    const responseData = req.body;
    if (!responseData?.hash) {
      throw new HTTPError("Missing required fields", 658);
    }

    //success payment
    const successPayment = await paymentIsSuccedded(responseData);
    userId = successPayment.userId;
    if (successPayment.success) {
      res.redirect(getSuccessPageUrl(userId));
    } else {
      res.redirect(somethingWentWrongPage(userId));
    }
  } catch (err: unknown) {
    console.log("error", err);

    res.redirect(
      somethingWentWrongPage(userId) 
    );
  }
};

export const paymentFailed = async (req: Request, res: Response) => {
  let userId: string = req.body.udf1;
  try {
    const responseData = req.body;
    if (!responseData.hash) {
      throw new HTTPError("Missing required fields", 658);
    }

    //success payment
    const failedPayment = await paymentIsFailed(responseData);
    userId = failedPayment.userId;
    if (failedPayment.url) {
      res.redirect(failedPayment.url);
    }
  } catch (err: unknown) {
    console.log("error", err);

    res.redirect(
      getFailurePageurl(userId) 
    );
  }
};

export const refundInitiating = async (req: Request, res: Response) => {
  try {
    const { amount, txnId } = req.body;
    if (!txnId) {
      throw new HTTPError("Missing required fields", 422);
    }

    Helpers.validateWithZod(createRefund, req.body);

    const refundInitiated = await refundInitiator(amount, txnId);
    if (refundInitiated.success) {
      res.status(200).json({ success: true, data: refundInitiated.data });
    } else {
      res.status(400).json({ success: true, data: refundInitiated.data });
    }
  } catch (err) {
    console.log("error:", err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getAllRefunds = async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    if (!txnId) {
      throw new HTTPError("Missing required fields", 422);
    }

    const refundFetched = await getAllRefundsByTransactionId(txnId);
    const code = refundFetched.success ? 200 : 400;
    res.status(code).json({ data: refundFetched.data });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getSplashLogo = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const splashData = await getUserSplashLogo(user);
    const code = splashData.success ? 200 : 400;
    res.status(code).json({ data: splashData.data });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const useVoucher = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const {voucherCode}= req.body;

    if(!voucherCode) throw new HTTPError("Missing required fields", 422);

    const b2bVoucherResp = await useB2BVoucher(user,voucherCode);
    const code = b2bVoucherResp.success ? 200 : 400;
    res.status(code).json(b2bVoucherResp);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};


