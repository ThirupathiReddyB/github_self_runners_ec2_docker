import { cName } from "../../../prisma/generated/prisma/client";
import { JsonObject } from "@prisma/client/runtime/client";
export interface ICreateFeature {
  id?: number;
  featureName: string;
  featureDescription: string;
  canonicalName: cName;
  featureIsActive: boolean;
}

export interface ICreateFeatureMetadata {
  featureId: number;
  value: JsonObject;
  remark: string;
}

export type TFamilyCare = {
  minor: number;
  adult: number;
  slot: number;
};

export type TStorage = {
  storage: number;
  unit: "KB" | "MB" | "GB";
};

export type TMetadataValue = Record<string, any>; //[x: string]: any;

export interface IRecordData {
  id: number;
  name: string;
  canonicalName: string;
  metadata: { id: number; value: TMetadataValue; remark: string }[];
}
