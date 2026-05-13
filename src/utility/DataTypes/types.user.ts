import {
  Changes,
  Gender,
  VerifiedContactId,
  Language,
  UsersSetting,
  Users,
} from "../../../prisma/generated/prisma/client";
import { JsonValue } from "@prisma/client/runtime/client";

//healthRecords
export interface IHealthRecordUser {
  bloodGroup: string;
  presentDiseases: string[];
  allergies: string[];
  doctorFullName: string | null;
  docAddress: string | null;
  docPhoneNumber: string | null;
  additionalInformation: string | null;
}

export interface IHealthRecordDatabase {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  bloodGroup: string;
  presentDiseases: string[];
  allergies: string[];
  doctorFullName: string | null;
  docAddress: string | null;
  docPhoneNumber: string | null;
  additionalInformation: string | null;
  forDependantId: string | null;
  forUserId: string | null;
}

export interface IMedicineDatabase {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  medName: string;
  medUnit: string;
  medInventory: number | null;
  medDoctor: string | null;
  medIntakeTime: string;
  medIntakePerDose: number;
  medIntakeFrequency: string;
  medDosage: number | null;
  MedDosageSchedule: Date[];
  startAt: Date;
  isActive: boolean;
  isRefill: boolean;
  createdBy: string;
  forDependantId: string | null;
  forUserId: string | null;
  medImage: string | null;
  endAt: Date | null;
  medReminderFrequency: string[];
}

export interface IAppointments {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  doctorName: string;
  description: string;
  apptDate: Date;
  apptTime: Date;
  createdBy: string;
  forDependantId: string | null;
  forUserId: string | null;
}

export interface IVitalDataDatabase {
  id: number;
  createdAt: Date;
  vitalRecordData: JsonValue;
  createdBy: string;
  recordedOn: Date;
  vitalCodeId: string;
  forDependantId: string | null;
  forUserId: string | null;
}

export interface IUser {
  id: string;
  fullName: string | null;
  phoneNumber: string | null;
  emailId: string | null;
  password: string | null;
  consent: boolean;
  gender: Gender;
  dob: Date;
  address: string | null;
  pincode: string;
  emergencyContact: string | null;
  country: string;

  additionalInformation?: string | null;
  createdBy: string;
  profileImage: string | null;
  deviceToken: string | null;
  createdAt: Date;
  updatedAt: Date;
  QRCodeURL: string | null;
  isSync: boolean;
  refreshToken: string | null;
  subscription: boolean;
  currentSessionId: string | null;
  isMigrated: boolean;
  wrongLoginAttempts: number;
  inAppNotificationSync: boolean;
  blockedAt: Date | null;
  healthRecord: IHealthRecordDatabase | null;
  medicine: IMedicineDatabase[];
  appointment: IAppointments[];
  vitalsUserData: IVitalDataDatabase[];
}

export interface IDependant {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  phoneNumber: string | null;
  dob: Date;
  address: string | null;
  pincode: string;
  emergencyContact: string | null;
  profileImage: string | null;
  QRCodeURL: string | null;
  isLoggedIn: boolean;
  userId: string;
  emailId: string | null;
  gender: Gender;
  isBlocked: boolean;
  healthRecord: IHealthRecordDatabase | null;
  medicine: IMedicineDatabase[];
  appointment: IAppointments[];
  vitalsUserData: IVitalDataDatabase[];
}

export interface IDefaultOutput {
  success: boolean;
  message: string;
  toLogin: boolean;
}

//Register User Input Data
export interface IRegisterUserdata {
  id: string;
  fullName: string;
  phoneNumber?: string;
  emailId?: string;
  password: string;
  consent: boolean;
  gender: Gender;
  dob: Date;
  address?: string;
  pincode: string;
  emergencyContact?: string;
  bloodGroup: string;
  country: string;
  presentDiseases: string[];
  allergies: string[];
  doctorFullName?: string | null;
  docAddress?: string | null;
  docPhoneNumber?: string | null;
  additionalInformation?: string | null;
  createdBy: string;
  profileImage?: string;
  language: Language;
  appLock: boolean;
  deviceToken: string;
  user?: ITokenData;
  referalCode?: string;
}

export interface IRegisterUserDataFamilyCare {
  id: string;
  fullName?: string;
  phoneNumber?: string;
  emailId?: string;
  password?: string;
  consent: boolean;
  gender: Gender;
  dob: Date;
  address?: string;
  pincode: string;
  emergencyContact?: string;
  bloodGroup: string;
  createdBy: string; //?
  presentDiseases: string[];
  allergies: string[];
  doctorFullName?: string | null;
  docAddress?: string | null;
  docPhoneNumber?: string | null;
  additionalInformation?: string | null;
  relation: string;
  profileImage?: string;
  linkFromUserid: string;
  language: Language;
  appLock: boolean;
  deviceToken?: string;
  referalCode?: string;
  partnerVoucher?: string;
}

export type IRegisterUserDataUnion =
  | IRegisterUserDataFamilyCare
  | IRegisterUserdata;

export interface IExistingUserInput {
  relation: string;
  uuid: string;
  linkFromUserName: string;
  userData: ITokenData;
  connectMinor: boolean;
  linkToParent: string;
  otpHash: string;
}

export interface IVerifyOTPForExistingUserInput {
  relation: string;
  uuid: string;
  otp: number;
  linkFromUserId: string;
  user: ITokenData;
  connectMinor: boolean;
  linkToParent: string;
}
//register success output data
export interface IRegisterSuccessData {
  message: string;
  success: boolean;
}
export enum IVerifiedIds {
  phoneNumber = "phoneNumber",
  enailId = "emailId",
}

//password login input data
export type IPasswordLoginData = {
  userId: string;
  pass: string;
  language: Language;
  deviceToken: string;
};

export type IVerifyPasswordData = {
  userId: string;
  password: string;
};
//otp login input data
export interface IOtpLoginData {
  userId: string;
  otpHash: string;
}
export interface ISessionData {
  userId: string;
  password?: string;
}
//otp generate output data
export interface IOtpLoginGenerateResponse {
  success: boolean;
  userId: string;
  phoneNumber: string;
  message: string;
}

export interface IOtpLoginVerifyInput {
  userId: string;
  verifiedContact: string;
  otp: number;
  language: Language;
  deviceToken: string;
}

export interface IMigrateMinorVerifyOtp {
  userId: string;
  verifiedContact: string;
  otp: number;
}

//login output
export interface ILoginOutput {
  message: string;
  success: boolean;
  accessToken?: string | null;
}

//forgot password input
export interface IForgotPasswordInput {
  userId: string;
  verifiedContact: string;
  hashedotp?: string;
  otp: number;
}

//reset password input
export interface IResetPasswordInput {
  userId: string;
  newpassword: string;
  deviceToken?: string;
  language?: Language;
}

//UserData
export interface IUserData {
  id: string;
  fullName: string;
  phoneNumber?: string;
  emailId: string;
  password: string;
  consent: boolean;
  gender: string;
  dob: Date;
  address?: string | null;
  pincode: string;
  emergencyContact?: string | null;
  profileImage?: string | null;
  QRCodeURL?: string | null;
  isSync: boolean;
  isBlocked: boolean;
  // isLoggedIn: boolean;
}

export type IUserWithSettings = Users & {
  setting?: UsersSetting | null;
};

//Token User Data
export type ITokenData = {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  emailId?: string | null;
  isSync: boolean;
  subscription: boolean;
  accessToken?: string;
};
export interface ICheckExistingUser {
  phoneNumber?: string | null;
  emailId?: string | null;
  emergencyContact?: string | null;
  docPhoneNumber?: string | null;
  userId: string;
  referalCode?: string;
}
export interface ICheckUserDetails extends ICheckExistingUser {
  deviceToken: string;
  gender: string;
  dob: Date;
  address?: string;
  pincode: string;
}

export interface IUserDocumentQueryParams {
  limit: number;
  id?: number;
  documentName?: string;
  category?: string;
  consultant?: string;
  notes?: string;
  famCareMemberId?: string;
  getOnlySensitiveData: boolean;
  page?: number;
}
export type IUpdateData = {
  // id?: string;
  // fullName?: string;
  profileImage?: string;
  phoneNumber?: string;
  emailId?: string;
  gender?: Gender;
  dob?: Date;
  address?: string;
  pincode?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  presentDiseases?: string[];
  allergies?: string[];
  doctorFullName?: string | null;
  docAddress?: string | null;
  docPhoneNumber?: string | null;
  additionalInformation?: string | null;
  referalCode?: string | null;
  famCareMemberId?: string;
  // otp?: number;
};

export type IUpdateUserSetting = {
  language?: Language;
  notification?: boolean;
  appLock?: boolean;
};

//profile image upload
// export interface UploadProfileInput {
//   userId: string;
//   renamedFiledata: Express.Multer.File;
// }
export interface IUploadProfileInput {
  userId: string;
  profileImage: string;
}

//new contact details
export interface INewContactDetailsInput {
  id: string;
  otpHash: string;
  emailId?: string;
  phoneNumber?: string;
}

export interface ISyncChangesDataType {
  id: number;
  createdAt: Date;
  changedBy: string;
  userChanged: string;
  changeType: Changes;
  recordId: string;
  table: string;
  familyMember: string;
  synced: boolean;
}
export type IRecordData = {
  change: Changes;
  id: string | number;
  table: string;
  data: any;
};

export interface IUserDataSync {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  phoneNumber?: string | null;
  emailId?: string | null;
  consent: boolean;
  gender: string;
  dob: Date;
  address?: string | null;
  pincode: string;
  emergencyContact?: string | null;
  profileImage?: string | null;
  QRCodeURL?: string | null;
  isSync: boolean;
  isBlocked: boolean;
  subscription: boolean;
  country: string;
  createdBy: string;
  isMigrated: boolean;
  verifiedContactId: string;
  wrongLoginAttempts: number;
  blockedAt?: Date | null;
  setting: any;
}
export interface IChangeContactDetailsInput {
  userId: string;
  verifiedContact: string;
  verifiedContactId: VerifiedContactId;
  otp: number;
}

//QR
export interface IGetQR {
  id: string;
  isMinor: boolean;
}

export interface IGetUserData extends IGetCommon {
  searchBy?: string;
  filterBy?: string;
  sort?: string;
}

export interface IGetUserById {
  userId: string;
  type: "minor" | "user";
}

//get params
export interface IGetCommon {
  limit?: number;
  page?: number;
  id?: number;
  search?: string;
  famCareMemberId?: string;
}

export interface IGetVitalData {
  famCareMemberId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  codeId?: string;
}

export interface INotification {
  secondaryContent?: string;
  primaryContent?: string;
  secondaryAccessText?: string;
  primaryAccessText?: string;
  showChangeAccessLink?: boolean;
}
