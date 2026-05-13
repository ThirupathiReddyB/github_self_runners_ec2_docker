import {
  bloodGlucoseInsuline,
  vitalReportTemplateBloodPressure,
} from "../templateDesign/vitalTemplates";

export const vitalsTemplate: Record<string, { template: string }> = {
  bp03: { template: vitalReportTemplateBloodPressure },
  glucoseInsuline: { template: bloodGlucoseInsuline },
};
