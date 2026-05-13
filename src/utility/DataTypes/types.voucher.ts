import { Advertisement, AdvertisePosition, PlanVariants, VoucherType } from "../../../prisma/generated/prisma/client";
import { IGetCommon } from "./types.common";

export interface ICreateVoucher {
  id?: number;
  voucherName: string;
  voucherCode: string;
  voucherType: VoucherType;
  voucherDescription: string;
  voucherAmount: number;
  expiry?: Date;
  redeemLimit?: number;
  voucherIsActive: boolean;
  minSpend?: number;
  partnerEmail?: string;
  linkAdvertisement?: string[];
  file?: Express.Multer.File;
  voucherBanner?: Express.Multer.File;
  clientLogo?: Express.Multer.File;
  advName?: string;
  advPosition?: AdvertisePosition;
  priority?: string;
  advRedirectLink?: string;
  advStart?: Date;
  advEnd?: Date;
  advTime?: string;
  linkedPlanId?: number;
}

export interface IGetUserVoucher extends IGetCommon {
  currentTotal?: number;
  voucherCode?: string;
}

export interface IGetVoucherData {
  id: number;
  redeemLimit: number | null;
  minSpend: number | null;
  partnerEmail: string | null;
  voucherBanner: string | null;
  clientLogo: string | null;
  name: string;
  description: string;
  isActive: boolean;
  expiresAt: Date | null;
  code: string;
  type: VoucherType;
  amount: number;
  availedCount: number;
  advertisementType: string | null;
  advertisement: Advertisement[];
  planVariant: PlanVariants | null;
}
