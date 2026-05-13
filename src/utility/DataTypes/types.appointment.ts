export interface ICreateAppointment {
  doctorName: string;
  description: string;
  apptDate: Date;
  apptTime: Date;
  famCareMemberId?: string;
}

export interface IGetAppointment {
  id?: number;
  startDate?: string;
  endDate?: string;
  doctorName?: string;
  description?: string;
  famCareMemberId?: string;
  page?: number;
  limit?: number;
}
export interface IAppointmentInput {
  apptId: string;
  userId: string;
}
export interface IUpdateAppointment extends IAppointmentInput {
  doctorName?: string;
  description?: string;
  apptDate?: Date;
  apptTime?: Date;
  famCareMemberId?: string;
}
export interface ICreatedAppointment {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  doctorName: string;
  description: string;
  forUserId: string | null;
  apptDate: Date;
  apptTime: Date;
  forDependantId: string | null;
}
