import { PlanPeriod } from "../../../prisma/generated/prisma/client";
import { JsonObject } from "@prisma/client/runtime/client";

export interface ICreateAddon {
  id?: number;
  addonName: string;
  addonDescription: string;
  addonAmount: number;
  addonCurrency: string;
  addonIsActive: boolean;
  addonPeriod: PlanPeriod;
  addonInterval: number;
  addonMeta: JsonObject;
  featureId: number;
}
