import { payuHost, refundHost } from "../constants/subscriptionData";
import { RefundResponse } from "./DataTypes/types.subscription";
import { handleError, handleRefundResponse } from "./Error";
import HTTPError from "./HttpError";
import crypto from "crypto";
import https from "https";
export const refundApiCall = async (data: any) => {
  return new Promise<RefundResponse>((resolve, reject) => {
    const options = {
      hostname: refundHost,
      path: "/merchant/postservice.php?form=2",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (payuRes) => {
      const chunks: any[] = [];

      payuRes.on("data", (chunk) => chunks.push(chunk));

      payuRes.on("end", async () => {
        const responseBody = Buffer.concat(chunks).toString();
        const parsedBody = JSON.parse(responseBody);
        if (parsedBody.error_code === 100) {
          await handleRefundResponse(parsedBody);

          resolve({
            success: true,
            data: { status: parsedBody.status, msg: parsedBody.msg },
          });
        } else {
          await handleRefundResponse(parsedBody);

          resolve({
            success: false,
            data: { status: parsedBody.status, msg: parsedBody.msg },
          });
        }
      });
    });
    req.on("error", (error) => {
      console.error("Request Error:", error);
      reject(new HTTPError(`Failed to connect to PayU ${error}`, 500));
    });

    req.write(data);
    req.end();
  });
};

export function generateGetAllTransactionHash(command: string, var1: string) {
  const hashString = `${process.env.PAYU_KEY}|${command}|${var1}|${process.env.PAYU_SALT}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

//get all transactions from payu
export const fetchTransactions = async (
  startDate: string,
  endDate: string,
  page = 1
) => {
  const command = "get_Transaction_Details";

  const hash = generateGetAllTransactionHash(command, startDate);

  const data = new URLSearchParams({
    key: process.env.PAYU_KEY as string,
    command,
    var1: startDate,
    var2: endDate,
    var3: String(page),
    hash,
  }).toString();

  const options = {
    hostname: payuHost,
    path: "/merchant/postservice?form=2",
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(handleError(error));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
};
