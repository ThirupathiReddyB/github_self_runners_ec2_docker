import HTTPError from "../HttpError";
import { s3 } from "../../../config/s3Config";
import dotenv from "dotenv";
dotenv.config();

export const createS3Folder = async (userId: string) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_DEV as string,
      Key: `${userId}/`,
    };

    const data = await s3.putObject(params).promise();

    if (!data) return false;
    return true;
  } catch (err) {
    if (err instanceof HTTPError) {
      throw new HTTPError(err.message, 500);
    } else {
      throw new HTTPError("Internal server error", 500);
    }
  }
};
