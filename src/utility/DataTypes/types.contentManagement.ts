import {
  $Enums,
  AdvertisePosition,
  AdvertiseType,
  Tags,
  Video,
  VideoType,
} from "../../../prisma/generated/prisma/client";
import { IGetCommon } from "./types.common";

export interface IVideoType {
  vidName: string;
  vidSourceUrl: string;
  vidTags?: string[];
  isActive: boolean;
  isSubscribed: boolean;
  description?: string;
  priority: number;
  vidType: VideoType;
  isOverride?: boolean;
}

export interface IEditVideoType {
  id: number;
  vidName?: string;
  vidSourceUrl?: string;
  vidTags?: string[];
  isActive?: boolean;
  isSubscribed?: boolean;
  priority?: number;
  description?: string;
  vidType?: VideoType;
  isOverride?: boolean;
}

export interface IUploadAdvertisementData {
  file: Express.Multer.File;
  advName: string;
  advType: AdvertiseType;
  advPosition: AdvertisePosition;
  isActive: string;
  isSubscribed: string;
  advRedirectLink?: string;
  priority: string;
  advStart: string;
  advEnd: string;
  advTimeLimit: string;
}

export interface IEditAdvertisementData {
  file?: Express.Multer.File;
  advId: number;
  advName?: string;
  advType?: AdvertiseType;
  advPosition?: AdvertisePosition;
  isActive?: string;
  isSubscribed?: string;
  advRedirectLink?: string;
  priority?: string;
  advStart?: string;
  advEnd?: string;
  advTimeLimit?: string;
}

export interface IFacilityType {
  file: Express.Multer.File;
  facPrimaryName: string;
  facSecondaryName?: string;
  facPhoneNumber: string;
  facAddress: string;
  facPincode: string;
  facSpeciality: string[];
  facType: string;
  isActive: string;
  lat?: number;
  lng?: number;
  additionalAddress?: string;
  openTime?: string;
  closeTime?: string;
}

export interface IEditFacilityType {
  id: number;
  facPrimaryName?: string;
  facSecondaryName?: string;
  facPhoneNumber?: string;
  facAddress?: string;
  facPincode?: string;
  facSpeciality?: string[];
  facType?: string;
  isActive?: string;
  file?: Express.Multer.File;
  lat?: number;
  lng?: number;
  additionalAddress?: string;
  openTime?: string;
  closeTime?: string;
}

export interface ILinkData {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  linkFrom: string;
  linkTo: string;
  relation: string;
  linkType: $Enums.LinkType;
  sensitiveDataAccess: boolean;
  synced: boolean;
  accessType: $Enums.AccessType;
}
// Define linkData as the union of LinkData or null
export type NullableLinkData = ILinkData | null;

export interface TVideoWithRelations extends Video {
  tags: Tags[] | null;
}

export interface IGetVideo extends IGetContent {
  vidType: VideoType;
}

export interface IGetFacility extends IGetCommon {
  type?: "doctor" | "hospital/clinic" | "laboratory"
}

export interface IGetContent extends IGetCommon {
  type?: "video" | "blog" | "reel" | "story" | "all";
  isFiltered?: boolean;
}

export interface IEditBlogInput {
  id: number;
  title?: string;
  status?: boolean;
  author?: string;
  updatedBy?: string;
  thumbnail?: string;
  content?: string;
  readTime?: number;
  tags?: string[];
  file?: Express.Multer.File;
}
export interface ICreateBlogInput {
  title: string;
  status: boolean;
  author: string;
  updatedBy: string;
  content: string;
  readTime: number;
  tags: string[];
  file: Express.Multer.File;
}
