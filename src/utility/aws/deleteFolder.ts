import { s3 } from "../../../config/s3Config";
import dotenv from "dotenv";
dotenv.config();

interface S3DeleteObject {
  Key: string;
}

export const deleteFolderFromS3 = async (userId: string): Promise<boolean> => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_DEV as string,
      Prefix: `${userId}/`,
    };

    const listedObjects = await s3.listObjectsV2(params).promise();

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return true;
    }

    const deleteParams: AWS.S3.DeleteObjectsRequest = {
      Bucket: process.env.AWS_BUCKET_DEV as string,
      Delete: { Objects: [] as S3DeleteObject[] },
    };

    listedObjects.Contents.forEach(({ Key }) => {
      if (Key) {
        deleteParams.Delete.Objects.push({ Key });
      }
    });

    const data = await s3.deleteObjects(deleteParams).promise();

    if (listedObjects.IsTruncated) {
      await deleteFolderFromS3(userId);
    }

    return !!data;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(err.message);
    } else {
      throw new Error("Internal server error");
    }
  }
};
