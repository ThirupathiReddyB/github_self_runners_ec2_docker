import { s3 } from "../../../config/s3Config";
import { awsBucketLink } from "../../constants/data";

export const editAwsFileName = async (
  oldKey: string,
  newKey: string,
  folder: string
) => {
  try {
    const bucketName = process.env.AWS_BUCKET_DEV;

    if (!bucketName) {
      throw new Error("AWS_BUCKET_DEV is not defined");
    }

    const fullOldKey = `${folder}/${oldKey}`;
    const encodedOldKey = encodeURIComponent(`${folder}/${oldKey}`);

    await s3
      .copyObject({
        Bucket: bucketName, // Bucket name
        CopySource: `${bucketName}/${encodedOldKey}`,
        Key: `${folder}/${newKey}`, // New key
      })
      .promise();

    // Delete the old file after successful copy
    await s3
      .deleteObject({
        Bucket: bucketName, // Bucket name
        Key: fullOldKey, // Old key without encoding
      })
      .promise();

    const copiedObjectUrl = `${awsBucketLink}/${folder}/${newKey}`;

    return copiedObjectUrl;
  } catch (error) {
    console.error("Error caught in errorHandler:", error);
    throw error;
  }
};
