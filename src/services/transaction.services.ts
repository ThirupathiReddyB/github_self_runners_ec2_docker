import prisma from "../prisma";
import fs from "fs";
import {
  IGetInvoice,
  IGetTransaction,
} from "../utility/DataTypes/types.transaction";
import { handleError } from "../utility/Error";
import HTTPError from "../utility/HttpError";

import { emailingService } from "../utility/emailService";
import { emailInvoice } from "../templateDesign/DashboardTemplates";

import { fetchTransactionsLatestStatus } from "../utility/payuProcess";
import { unlinkFile } from "../utility/Helpers";
import {
  CostDetails,
  fetchInvoiceData,
  getCompanyProfile,
} from "../utility/helperFunction/transactions.services.helper";
import { ITokenData } from "../utility/DataTypes/types.user";
import { invoiceTemplates } from "../templateDesign/invoiceTemplate";
import path from "path";
import { generateSkip } from "../constants/data";

export const getTransactions = async (
  params: IGetTransaction,
  user?: ITokenData
) => {
  try {
    const {
      search,
      page,
      limit = 10,
      id,
      userId,
      paymentStatus,
      transactionDate,
    } = params;

    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 90);

    const skip = generateSkip(limit, page);
    const take = limit ?? undefined;

    const where: any = {};

    if (id) where.txnid = id;
    if (userId) where.userId = userId;

    if (search)
      where.OR = [
        {
          txnid: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          paymentMode: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          bankRefNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          userId: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];

    if (paymentStatus) where.paymentStatus = { in: paymentStatus };
    if (transactionDate) {
      startDate = new Date(transactionDate);
      console.log(startDate);
      const endDate = new Date(transactionDate);
      endDate.setDate(endDate.getDate() + 1);

      where.createdAt = {
        gte: startDate,
        lt: endDate,
      };
    }
    let formattedTransaction;
    await fetchTransactionsLatestStatus(startDate);
    let [txnData, totalRecords, companyDetails] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          items: {
            select: {
              name: true,
              type: true,
              amount: true,
            },
          },
        },
        skip,
        take,
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
      }),
      prisma.transaction.count({
        where,
      }),
      getCompanyProfile(),
    ]);

    if (!txnData || (id && !txnData.length))
      throw new HTTPError("Could not find transaction data", 404);
    if (user) {
      formattedTransaction = txnData.map((transaction) => {
        const receiptDetail = [];

        const items = transaction.items
          .filter((i) => i.type != "voucher")
          .map((i) => i.name)
          .join(",");

        receiptDetail.push({ name: "Transaction Id", value: transaction.txnid });
        receiptDetail.push({
          name: "Date issued",
          value: transaction.createdAt.toISOString().split("T")[0],
        });
        receiptDetail.push({
          name: "Mode of payment",
          value: transaction.paymentMode,
        });
        receiptDetail.push({ name: "Product", value: items });
        receiptDetail.push({
          name: "Address",
          value: companyDetails[0].address,
        });

        receiptDetail.push({ name: "Retailer", value: companyDetails[0].name });
        receiptDetail.push({
          name: "GSTI Number",
          value: companyDetails[0].gstin,
        });

        const cost = transaction.items.reduce((acc, cur) => {
          if (cur.type !== "voucher") {
            return acc + (cur.amount ?? 0);
          }
          return acc;
        }, 0);
        const voucherAmount = transaction.items.find((obj: { type: string }) => obj.type === "voucher")?.amount ?? 0;
        const discount = cost - transaction.totalAmount;
        const costingDetails = [];
        const { totalAmount, netCost, taxAmount } = CostDetails(cost, voucherAmount, transaction.gst)
        costingDetails.push({ name: "Gross Cost", value: `₹ ${voucherAmount > 0 ? cost : netCost}` });
        costingDetails.push({
          name: "Discount",
          value: `- ${discount.toFixed(2)}`,
          // value: discount ? `- ${discount}`: 0,
        });
        costingDetails.push({
          name: `Net Taxable Amount`,
          value: `₹ ${(totalAmount - taxAmount).toFixed(2)}`,
        });
        costingDetails.push({
          name: `GST (${transaction.gst}%)`,
          value: `₹ ${taxAmount}`,
        });

        costingDetails.push({
          name: "Total",
          value: `₹ ${transaction.totalAmount.toFixed(2)}`,
        });

        return {
          ...transaction,
          receiptDetail,
          costingDetails,
        };
      });
    }
    const formattedTxnData = await Promise.all(
      txnData.flatMap(async (txn) => {
        const invoiceData = fetchInvoiceData(txn, companyDetails);
        return {
          ...txn,
          invoiceData: invoiceData,
        };
      })
    );

    return {
      success: true,
      data: user ? formattedTransaction : formattedTxnData,
      totalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//node-html-to-image

export const getInvoice = async (params: IGetInvoice) => {
  try {
    const { txnid, userId } = params;

    //find transaction of user and user
    const findTransaction = await getTransactions({ userId, id: txnid });

    if (!findTransaction?.data?.length) {
      throw new HTTPError("Could not find transaction", 404);
    }

    const txnDetails = findTransaction.data[0];

    if (txnDetails.paymentStatus != "success")
      throw new HTTPError(
        "Invoice of only successful transactions can be downloaded",
        400
      );

    // Compile the Handlebars template
    if (!("invoiceData" in txnDetails)) {
      throw new HTTPError(
        "Invoice data not available for this transaction",
        400
      );
    }
    const pdf = await invoiceTemplates(txnDetails.invoiceData);
    // Save PDF (Optional)
    const safeTxnId = txnid.replace(/[^a-zA-Z0-9_-]/g, "");

    // const outputPath = path.join(
    //   path.resolve(__dirname, "../../../"),
    //   `src/uploads/Invoice_${safeTxnId}.pdf`
    // );

    const outputPath = path.join(
      __dirname,
      `../uploads/Invoice_${safeTxnId}.pdf`
    );
    await fs.promises.writeFile(outputPath, pdf);

    return {
      success: true,
      filePath: outputPath,
      details: {
        txnDate: txnDetails.createdAt.toLocaleDateString("en-GB"),
        paymentMode: txnDetails.paymentMode,
        userFullName: txnDetails.userFullName,
      },
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const emailUserInvoice = async (params: IGetInvoice) => {
  try {
    const { userId, txnid, emailId } = params;
    const { success, filePath, details } = await getInvoice({ userId, txnid });
    if (!success) throw new HTTPError("Could not generate invoice", 500);
    //send email to user
    emailingService({
      email_id: emailId ?? "",
      template: emailInvoice,
      data: {
        userName: details.userFullName,
        txnId: txnid,
        tnxDate: details.txnDate,
        paymentMode: details.paymentMode,
        filePath: filePath,
      },
      subject: `Your THITO Invoice #${txnid}`,
      choice: "user_invoice",
    })
      .then(() => unlinkFile(filePath)) // only delete after email is sent
      .catch((err) => {
        console.error("Emailing invoice failed:", err);
        unlinkFile(filePath); // optional fallback cleanup
      });

    return {
      success: true,
      message: "Invoice emailed successfully to user",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
