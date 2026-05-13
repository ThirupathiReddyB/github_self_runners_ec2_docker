import { LinkType } from "../../../prisma/generated/prisma/client";
import { DateTime } from "aws-sdk/clients/devicefarm";

export interface IUploadInsuranceData {
  policyNum: string;
  policyName: string;
  policyType?: string;
  insuranceProv?: string;
  renewalAt: DateTime;
  ifCoPay?: string;
}

export interface IUploadInsuranceToDbInput {
  userId: string;
  linkType?: LinkType;
  form_data: IUploadInsuranceData;
  insuranceURL?: string;
  uploadedBy: string;
}

export interface IUploadInsuranceInput {
  file?: Express.Multer.File;
  userId: string;
  form_data: IUploadInsuranceData;
}

export interface IDelInsuranceInput {
  userId: string;
  id: string;
}

export interface IEditInsuranceData {
  policyNum?: string;
  policyName?: string;
  policyType?: string;
  insuranceProv?: string;
  renewalAt?: string;
  ifCoPay?: string;
}

export interface IEditInsuranceInput {
  file?: Express.Multer.File;
  userId: string;
  form_data: IEditInsuranceData;
  id: string;
}

export interface IDefaultOutput {
  success: boolean;
  message: string;
}
