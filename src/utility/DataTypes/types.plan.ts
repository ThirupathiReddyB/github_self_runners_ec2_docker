import { Feature, Metadata, Plan, PlanPeriod, PlanToFeature } from "../../../prisma/generated/prisma/client";

export interface ICreatePlan {
  id?: number;
  planName: string;
  planAmount: number;
 
  planPeriod: PlanPeriod;
  planInterval: number;
  planNotes: string;
  planIsActive: boolean;
  features: {
    featureId: number;
    metaId: number;
  }[];
  isDefault?: boolean;
  defaultExpiry?: Date;
  planVariantId:number;
  planVariantName:string
}

export type IPlanWithFeatures = Plan & {
  PlanToFeature: (PlanToFeature & {
    feature: Feature;
    metadata: Metadata;
  })[];
};
