import { s3 } from "../../../config/s3Config";
import dotenv from "dotenv";
dotenv.config();

export const deleteFile = async (file: any, folder: string) => {
  const uploadParams = {
    Bucket: `${process.env.AWS_BUCKET_DEV}`,
    Key: `${folder}/${file}`,
  };

  return s3.deleteObject(uploadParams).promise();
};
