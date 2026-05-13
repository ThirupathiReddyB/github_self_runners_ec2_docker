import {
  AccessType,
  Dependant,
  Gender,
  HealthRecord,
  LinkType,
  Users,
} from "../../../prisma/generated/prisma/client";

export interface IUserData {
  id: string;
}
export interface ILinkData {
  linkType: string;
  accessType: string;
}

export interface ICreateDependantType {
  fullName: string;
  // declaration: boolean;
  gender: Gender;
  dob: string;
  address?: string;
  pincode: string;
  emergencyContact?: string;
  bloodGroup: string;
  presentDiseases?: string[];
  allergies?: string[];
  doctorFullName?: string;
  docAddress?: string;
  docPhoneNumber?: string;
  additionalInformation?: string;
  relation: string;
  profileImage?: string;
}

export interface IFamilyCareNewUser {
  id: string;
  fullName?: string;
  phoneNumber?: string;
  emailId: string;
  password?: string;
  consent: boolean;
  gender: Gender;
  dob: Date;
  address?: string;
  pincode: string;
  emergencyContact?: string;
  bloodGroup: string;
  presentDiseases: string[];
  allergies: string[];
  doctorFullName?: string | null;
  docAddress?: string | null;
  docPhoneNumber?: string | null;
  additionalInformation?: string | null;
  relation: string;
}

export interface IGetFamilyMembersData {
  accessType?: string;
  linkType?: string;
  relation?: string;
}

export interface IChangeAccessType {
  memberId: string;
  access: AccessType;
  sensitiveAccess: boolean;
  linkFromMinor?: string;
  getMedicineReminderOfSecondayUser: boolean;
}

export interface IFamilyLinkType {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  linkFrom: string;
  linkTo: string;
  relation: string;
  linkType: LinkType;
  accessType: AccessType;
  sensitiveDataAccess: boolean;
  synced: boolean;
  getMedicineReminderOfSecondayUser: boolean;
}

export interface IFamilyMemberData {
  D7?: Dependant[];
  U6?: Users[];
  H8?: HealthRecord[];
  F9?: IFamilyLinkType[];
}
