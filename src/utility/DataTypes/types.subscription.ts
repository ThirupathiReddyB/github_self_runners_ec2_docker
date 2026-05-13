import { JsonValue } from "@prisma/client/runtime/client";
import {
  Addon,
  cName,
  Plan,
  PlanPeriod,
  PlanVariants,
  Subscription,
  Users,
  UserToAddOn,
  Voucher,
} from "../../../prisma/generated/prisma/client";

export type paymentInputData = {
  amount: number;
  productinfo: string;
  addOn?: Array<number>;
  planId: number;
  planVariantId?: number;
  voucherId?: number;
  customerGst?: string;
};

export type PaymentResponse = { success: boolean; url?: string; html?: any };

export type RefundResponse = { success: boolean; data: {} };

export type storageUnit = "KB" | "MB" | "GB";

export type FetchUserType = Users & {
  Voucher: Voucher[];
  userToAddOn: UserToAddOn[];
  Subscription: (Subscription & {
    planVariants: PlanVariants & { plan: Plan };
  })[];
};

export type activeSubscription = Subscription & {
  plan: {
    name: string;
    id: number;
    planCode: string;
    notes: string;
    planVariants: {
      id: number;
      amount: number;
      period: PlanPeriod;
      interval: number | null;

      PlanToFeature: {
        feature: {
          id: number;
          name: string;
          description: string;
          canonicalName: cName;
        };
        metadata: { id: number; value: JsonValue; remark: string };
      }[];
    };
  };
};

//pdf invoice
export interface IPDFInvoice {
  companyDetails: {
    id: number;
    updatedAt: Date;
    name: string;
    address: string;
    cin: string;
    gstin: string;
    msmeNo: string;
    gst: number;
    companyLogo: string;
    signatory: string;
    website: string;
    email: string;
    phoneNumber: string;
  };
  invoiceNo: string;
  invoiceDate: string; // Format: 'DD/MM/YYYY'
  userName: string;
  userAddress: string;
  customerGst?: string | null;
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

export interface IVoucherDetails extends Voucher {
  user: Users[];
}

export interface IAddOns extends Addon {
  userToAddOn: UserToAddOn[];
}

export interface IPlanVariants extends PlanVariants {
  plan: Plan;
}


export interface IExistingSubscription extends Subscription {
  planVariants: {
    isDefault: Boolean,
    plan: Plan
  }
}