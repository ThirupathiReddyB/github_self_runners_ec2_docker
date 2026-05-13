import { AppEnv } from "../../../prisma/generated/prisma/enums";


export interface IGetCommon {
  id?: number | string;
  search?: string;
  page?: number;
  limit?: number;
  isFiltered?: boolean;
  userId?: string;
  sortByOrder?: "asc" | "desc";
  sortByField?: string;
  paymentStatus?: Array<string>;
  filter?: string;
}

export interface GroupedFiles {
  [fieldname: string]: Express.Multer.File[];
}

export interface ISearchAppUsers extends IGetCommon {
  searchBy?: string;
}

export interface ICreateVersion {
  appVersion: string;
  appEnvironment: AppEnv
  isForceUpdate: boolean;
  isActive: boolean;
  features: String[];
}

export interface IUpdateVersion {
  id: number
  appVersion?: string;
  appEnvironment?: AppEnv
  isForceUpdate?: boolean;
  features?: String[];
}

export interface IVersionData {
  appVersion: string;
  appEnvironment: AppEnv
  isForceUpdate: boolean;
  isActive: boolean;
  features: String[];
}