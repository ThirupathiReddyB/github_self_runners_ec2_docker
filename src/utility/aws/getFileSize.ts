import { s3 } from "../../../config/s3Config";
import HTTPError from "../HttpError";

const getFileSize = async (file: string, userId: string) => {
  try {
    const params = {
      Bucket: `${process.env.AWS_BUCKET_DEV}`,
      Key: `${userId}/${file}`,
    };

    const headData = await s3.headObject(params).promise();
    // Size is returned in bytes
    if (headData.ContentLength) {
      const fileSizeInBytes = headData.ContentLength ;
      return fileSizeInBytes;
    }
    return 0;
  } catch (error: any) {
    console.log("error",error)
    throw new HTTPError(
      `Failed to get file size for key: ${file}. Error: ${error.message}`,
      502
    );
  }
};

export default getFileSize;
