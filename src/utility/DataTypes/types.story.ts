import { IGetCommon } from "./types.common";

export interface ICreateStory {
  id?: number;
  title: string;
  tags?: string[];
  images: Express.Multer.File[];
  imageTitles?: string[];
  imageDescriptions?: string[];
  existingImages?: string[];
  existingImageTitles?: string[];
  existingImageDescriptions?: string[];
  isActive: boolean;
}

export interface IGetStory extends IGetCommon {
  tags?: string[];
}
