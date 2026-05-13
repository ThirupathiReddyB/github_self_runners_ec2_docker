import { IGetCommon } from "./types.common";

export interface IGetInvoice {
  userId: string;
  txnid: string;
  emailId?: string;
}

export interface IInvoiceData {
  companyDetails: {
    name: string;
    id: number;
    createdAt: Date;
    updatedAt: Date;
    phoneNumber: string;
    address: string;
    gst: number;
    cin: string;
    gstin: string;
    msmeNo: string;
    companyLogo: string;
    signatory: string;
    website: string;
    email: string;
  };
  invoiceNo: string;
  invoiceDate: string;
  userName: string;
  userAddress: string;
  customerGst?: string;
  items: {
    particulars: string;
    unitCost: number;
    quantity: number;
    netCost: number;
    tax: string;
    type: string;
    taxAmount: number;
    totalAmount: number;
  }[];
  total: number;
  amountInWords: string;
}

export interface IGetTransaction extends IGetCommon {
  paymentStatus?: Array<string>;
  transactionDate?: Date;
}
