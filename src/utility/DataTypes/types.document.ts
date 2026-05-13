import { LinkType } from "../../../prisma/generated/prisma/client";
import { IGetCommon } from "./types.user";

export interface IUploadDocData {
  documentCategory: string;
  documentName: string;
  documentConsultant?: string;
  // documentLabName?: string;
  notes?: string;
  isSensitive: string;
}

export interface IUploadDocsToDbInput extends IUploadDocData {
  userId: string;
  documentURL: string;
  doc_id?: string;
  uploadedBy: string;
  linkType?: LinkType;
}

export interface IUploadDocsInput extends IUploadDocData {
  file: Express.Multer.File;
  userId: string;
  famCareMemberId?: string;
}

export interface IDelDocsInput {
  userId: string;
  id: string;
  famCareMemberId?: string;
}

export interface IEditDocsInput {
  id: number;
  userId: string;
  file?: Express.Multer.File;
  documentCategory?: string;
  documentName?: string;
  documentConsultant?: string;
  // documentLabName?: string;
  notes?: string;
  isSensitive?: string;
  famCareMemberId?: string;
}

export interface IGetDocuments extends IGetCommon {
  documentName?: string;
  category?: string;
  consultant?: string;
  notes?: string;
  getOnlySensitiveData?: boolean;
}