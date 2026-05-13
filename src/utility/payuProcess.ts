import https from "https";
import crypto from "crypto";
import querystring from "querystring";
import HTTPError from "./HttpError";
import { handleError } from "./Error";
import { FetchUserType, PaymentResponse } from "./DataTypes/types.subscription";
import {
  FURL,
  SURL,
  getFailurePageurl,
  getSuccessPageUrl,
  payuHost,
} from "../constants/subscriptionData";
import { paymentIsSuccedded } from "../services/subscription.services";
import { fetchTransactions } from "./payuAPICalls";
import { Prisma } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";

type TransactionResponse = {
  status: string;
  Transaction_details: any[];
  msg: string;
};

function generateHash(data: any) {
  const hashString = `${process.env.PAYU_KEY}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|${data.udf1}|${data.udf2}|${data.udf3}|${data.udf4}|${data.udf5}||||||${process.env.PAYU_SALT}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}


export const payUPaymentProcess = async (
  fetchUser: FetchUserType,
  transactionId: string,
  amount: number,
  productinfo: string,
  planVariantId?: number,
  addOns?: Array<number>,
  voucherId?: number
) => {
  try {
    //finding verified contact
    const email =
      fetchUser.verifiedContactId === "emailId" ? fetchUser?.emailId : "";
    const phone =
      fetchUser.verifiedContactId === "phoneNumber"
        ? fetchUser?.phoneNumber
        : "";
    //generate hash for payment creation
    const hash = generateHash({
      txnid: transactionId,
      amount: parseFloat(amount.toString()).toFixed(2),
      productinfo: productinfo ?? "dummy",
      firstname: fetchUser.fullName,
      email,
      phone,
      udf1: fetchUser.id,
      udf2: planVariantId?.toString() ?? "",
      udf3: addOns?.toString() ?? "",
      udf4: voucherId?.toString() ?? "",
      udf5: "",
    });

    //consolidating payment details in a single object
    const paymentDetails = {
      key: process.env.PAYU_KEY,
      txnid: transactionId,
      amount: parseFloat(amount.toString()).toFixed(2),
      productinfo: productinfo ?? "dummy",
      firstname: fetchUser.fullName,
      email,
      phone: phone,
      surl: SURL,
      furl: FURL,
      hash,
      udf1: fetchUser.id,
      udf2: planVariantId?.toString() ?? "",
      udf3: addOns?.toString() ?? "",
      udf4: voucherId?.toString() ?? "",
      udf5: "",
    };
    //produces a URL query string from a given obj by iterating through the object's "own properties".
    const stringifiedPaymentDetails = querystring.stringify(paymentDetails);
    if (amount == 0) {
      try {
        const payment = await paymentIsSuccedded({
          ...paymentDetails,
          status: "success",
          error: "E000",
          error_Message: "No Error",
        });
        const success = payment.success;
        const url = success
          ? getSuccessPageUrl(fetchUser.id)
          : getFailurePageurl(fetchUser.id);
        return { success, url };
      } catch (err) {
        console.error("Zero amount payment failed:", err);
        return { success: false, url: getFailurePageurl(fetchUser.id) };
      }
    } else {
      return new Promise<PaymentResponse>((resolve, reject) => {
        const options = {
          method: "POST",
          hostname: payuHost,
          port: 443,
          path: "/_payment",
          headers: {
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(stringifiedPaymentDetails),
          },
        };

        const req = https.request(options, (payuRes: any) => {
          const chunks: any[] = [];

          payuRes.on("data", (chunk: any) => chunks.push(chunk));
          payuRes.on("end", async () => {
            if (payuRes.statusCode === 302 && payuRes.headers.location) {
              resolve({ success: true, url: payuRes.headers.location });
            } else if (
              payuRes.statusCode === 200 &&
              payuRes.headers["content-type"]?.includes("text/html")
            ) {
              resolve({
                success: false,
                html: Buffer.concat(chunks).toString(),
              });
            } else {
              reject(new HTTPError("Unexpected response from PayU", 400));
            }
          });
        });

        req.on("error", (error: any) => {
          console.log(error)
          reject(new HTTPError(error.message, 500));
        });

        req.write(stringifiedPaymentDetails);
        req.end();
      });
    }
  } catch (err) {
    throw handleError(err);
  }
};

export const fetchTransactionsLatestStatus = async (sentStartDate?: Date) => {
  const startDate = sentStartDate ?? new Date();
  if (!sentStartDate) {
    startDate.setDate(startDate.getDate() - 90); //90 days ago
  }
  const endDate = new Date(new Date().getTime() + (5 * 60 + 30) * 60 * 1000);
  endDate.setHours(0, 0, 0, 0); // Start of today
  endDate.setDate(endDate.getDate() + 1); // as api minus the cuurent date by 1 i.e if the transaction end date is 22-april it takes 21-april
  while (startDate < endDate) {
    const batchEndDate = new Date(startDate);
    batchEndDate.setDate(batchEndDate.getDate() + 6); // 7-day batch
    if (batchEndDate > endDate) {
      batchEndDate.setTime(endDate.getTime()); // Safely adjust to endDate
    }
    batchEndDate.setTime(batchEndDate.getTime() + (5 * 60 + 30) * 60 * 1000);
    let page = 1;
    let hasMoreData = true;

    while (hasMoreData) {
      try {
        const response = await fetchTransactions(
          startDate.toISOString().split("T")[0],
          batchEndDate.toISOString().split("T")[0],
          page
        );
        if (
          !response ||
          !(response as TransactionResponse).Transaction_details ||
          (response as TransactionResponse).Transaction_details.length === 0
        ) {
          hasMoreData = false;
        } else {
          await updateTransactionStatusFromPayuInDb(
            (response as TransactionResponse).Transaction_details
          );
          page++;
        }
      } catch (error) {
        console.error(error);
      }
    }

    // Move to the next 7day batch
    startDate.setDate(startDate.getDate() + 7);
  }
};

const updateTransactionStatusFromPayuInDb = async (
  transactions: Record<string, any>[]
) => {
  try {
    const updateQueries = transactions
      .map((transaction) => {
        let { field9 } = transaction;
        const { txnid, status, error_code, id } = transaction;
        if (field9 === null && status === "initiated") {
          field9 = "Transaction pending";
        }
        if (!txnid || !status) {
          return null; // Skip invalid data
        }
        let normalizedStatus = status.trim().toLowerCase();

        let paymentStatus = (() => {
          if (["captured", "auth"].includes(normalizedStatus)) return "success";
          if (
            ["pending", "initiated", "in progress"].includes(normalizedStatus)
          )
            return "in progress";
          return status;
        })();
        return prisma.transaction.updateMany({
          where: {
            txnid: txnid.toString(),
            NOT: {
              paymentStatus: {
                in: ["success", "failed"],
              },
            },
          },
          data: {
            ...(error_code !== null && { error: error_code }),
            paymentStatus,
            errorMessage: field9,
            mihpayid: id,
          },
        });
      })
      .filter((query): query is Prisma.PrismaPromise<any> => query !== null);

    // Execute all updates in a transaction
    await prisma.$transaction(updateQueries);
  } catch (error) {
    console.error("Error updating transactions:", error);
  }
};
