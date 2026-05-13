export interface IMedicine {
  medImage?: string;
  medName: string;
  medUnit: string;
  medInventory?: number;
  medDoctor?: string;
  medIntakeTime: string;
  medIntakePerDose: number;
  medIntakeFrequency: string;
  medReminderFrequency?: string[];
  medDosage: number;
  MedDosageSchedule?: string[];
  startAt?: string;
  endAt?: string;
  isRefill: boolean;
  famCareMemberId?: string;
}

export interface IMedicineInput {
  medId: string;
  userId: string;
}

export interface IUpdateMedicine extends IMedicineInput {
  medName?: string;
  medUnit?: string;
  medInventory?: number;
  medDoctor?: string;
  medIntakeTime?: string;
  medIntakePerDose?: number;
  medIntakeFrequency?: string;
  medReminderFrequency?: string[];
  medDosage?: number;
  MedDosageSchedule?: string[];
  startAt?: string;
  endAt?: string;
  isRefill?: boolean;
  isActive?: boolean;
  medImage?: string;
  famCareMemberId?: string;
}

export interface IGetMedicine {
  id?: number;
  medName?: string;
  medUnit?: string;
  medDoctor?: string;
  medIntakeFrequency?: "daily" | "interval" | "specific_day";
  medIntakeTime?: "before_meal" | "after_meal" | "with_meal" | "never_mind";
  limit?: number;
  famCareMemberId?: string;
}
