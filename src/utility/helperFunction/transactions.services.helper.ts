import { $Enums } from "../../../prisma/generated/prisma/client";
import { IInvoiceData } from "../DataTypes/types.transaction";
import { numberToWords } from "./subscription.services.helper";
import prisma from "../../prisma";
import HTTPError from "../HttpError";
import { promises as fs } from "fs";

export const fetchInvoiceData = (
  txnDetails: {
    items: { name: string; type: $Enums.ItemType; amount: number }[];
  } & {
    userId: string;
    userFullName: string;
    userAddress?: string | null;
    txnid: string;
    error: string;
    id: number;
    createdAt: Date;
    paymentMode: string;
    paymentSource: string;
    bankRefNumber: string;
    totalAmount: number;
    currency: string;
    gst: number;
    mihpayid: string;
    errorMessage: string;
    paymentStatus: string;
    customerGst: string | null;
  },
  companyDetails: any[]
) => {
  const findVoucher =
    txnDetails.items.find((obj: { type: string }) => obj.type === "voucher")
      ?.amount ?? 0;

  const items = txnDetails.items
    .map((item: { type: string; amount: number; name: any }) => {
      if (item.type !== "voucher") {
        // const totalAmount = parseFloat(
        //   (item.amount - (findVoucher / 100) * item.amount).toFixed(2)
        // );
        // const netCost = parseFloat(
        //   (totalAmount / (1 + txnDetails.gst / 100)).toFixed(2)
        // );
        // const unitCost = parseFloat((netCost / 1).toFixed(2));
        // const taxAmount = parseFloat(
        //   (netCost * (txnDetails.gst / 100)).toFixed(2)
        // );
        const { unitCost, netCost, taxAmount, totalAmount } = CostDetails(item.amount, findVoucher, txnDetails.gst)

        return {
          particulars: `${item.type} - ${item.name} `,
          unitCost,
          quantity: 1,
          netCost,
          tax: `${txnDetails.gst}%`,
          type: "IGST",
          taxAmount,
          totalAmount,
        };
      }
    })
    .filter(Boolean) as {
      particulars: string;
      unitCost: number;
      quantity: number;
      netCost: number;
      tax: string;
      type: string;
      taxAmount: number;
      totalAmount: number;
    }[];

  //format data to generate invoice
  const invoiceData: IInvoiceData = {
    companyDetails: companyDetails[0],
    invoiceNo: txnDetails.txnid,
    invoiceDate: new Date(txnDetails.createdAt).toLocaleDateString("en-GB"),
    userName: txnDetails.userFullName ?? "-",
    userAddress: txnDetails.userAddress ?? "-",
    customerGst: txnDetails.customerGst ?? "-",
    items: items ?? [
      {
        particulars: "-",
        unitCost: 0,
        quantity: 0,
        netCost: 0,
        tax: "0%",
        type: "null",
        taxAmount: 0,
        totalAmount: 0,
      },
    ],
    total: txnDetails.totalAmount,
    amountInWords: numberToWords(txnDetails.totalAmount,txnDetails.currency),
  };

  return invoiceData;
};

export const getCompanyProfile = async () => {
  const companyDetails = await prisma.profile.findMany();
  if (!companyDetails[0]) throw new HTTPError("Could not company details", 404);
  return companyDetails;
};



export const pngToBase64 = async (filePath: string): Promise<string> => {
  // Read file into a Buffer
  const buffer = await fs.readFile(filePath);
  // Convert Buffer to Base64 string
  const base64 = buffer.toString("base64");
  // Optionally add the Data URI scheme prefix
  return `data:image/png;base64,${base64}`;
};

export const CostDetails = (itemAmount: number, voucherAmount: number, gst: number) => {
  const totalAmount = parseFloat(
    (itemAmount - (voucherAmount / 100) * itemAmount).toFixed(2)
  );
  const netCost = parseFloat(
    (totalAmount / (1 + gst / 100)).toFixed(2)
  );
  const unitCost = parseFloat((netCost / 1).toFixed(2));
  const taxAmount = parseFloat(
    (netCost * (gst / 100)).toFixed(2)
  );
  // const taxAmount = totalAmount - netCost
  return { unitCost, netCost, taxAmount, totalAmount }
}