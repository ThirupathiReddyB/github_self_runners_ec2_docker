import { JsonObject } from "@prisma/client/runtime/client";
import { Prisma } from "../../../prisma/generated/prisma/client";


export interface IBpData {
  vitalRecordData: {
    systolic: number;
    diastolic: number;
  };

  recordedOn: Date;
}

export interface IHeartRateData {
  vitalRecordData: {
    bpm: number;
  };
  recordedOn: Date;
}

export interface IBloodOxygenData {
  vitalRecordData: {
    percent: number;
  };
  recordedOn: Date;
}

export interface IAddVitalRecord {
  userId: string;
  vitalCode: string;
  lastSyncDate?: Date;
  recordData: {
    vitalData: JsonObject;
    recordedOn: Date;
  }[];
  famCareMemberId?: string;
  deletePeriodRecord?: string;
}
export interface IVitalModule {
  vitalName: string;
  vitalCode: string;
  vitalDataStructure: JsonObject[];
  filters: JsonObject[];
}

export interface IUpdateVitalModule {
  vitalName?: string;
  vitalCode?: string;
  vitalDataStructure?: JsonObject[];
  filters?: JsonObject[];
}

export interface IGetVitalRecords {
  famCareMemberId?: string;
  startDate?: string;
  endDate?: string;
  codeId?: string;
}

//////////////
export interface IVitalRecordData {
  [key: string]: string; // Generic type to handle varying fields
}

export interface IUserVitalDataEntry {
  vitalRecordData: Prisma.JsonValue;
  vitalModuleId: number;
}

export interface ICycleData {
  cycle: string;
  isPCOD?: boolean;
  startDate?: string;
}

export interface IVitalsRecordsData {
  userId: string;
  vitalId: string;
}
