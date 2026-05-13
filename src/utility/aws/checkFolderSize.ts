import { s3 } from "../../../config/s3Config";
import { getUserStorage } from "../helperFunction/subscription.services.helper";
import HTTPError from "../HttpError";

// Function to get the size of a folder from S3
export async function getFolderSize(bucketName: string, folderPath: string) {
  let totalSize = 0;
  let continuationToken = null;

  do {
    const params: any = {
      Bucket: bucketName,
      Prefix: folderPath, //check
      ContinuationToken: continuationToken,
    };

    try {
      const data = await s3.listObjectsV2(params).promise();
      continuationToken = data.IsTruncated ? data.NextContinuationToken : null;

      // Sum the size of each object
      if (data.Contents && Array.isArray(data.Contents)) {
        data.Contents.forEach((item) => {
          const key = item.Key;
          const isProfileImage = key?.startsWith("profileImage/");
          if (!isProfileImage && typeof item.Size === "number") {
            totalSize += item.Size;
          }
        });
      }
    } catch (err) {
      console.error("Error getting folder size:", err);
      return 0;
    }
  } while (continuationToken);

  return totalSize;
}

// Middleware to check if the folder size allows the file to be uploaded
async function canUploadFile(
  bucketName: string,
  folderPath: string,
  fileSize: number,
  existingFileSize: number
) {
  const maxFolderSize = ((await getUserStorage(folderPath)) + 6 * 1024) * 1024; //user max folder size in Bytes

  const currentFolderSize = await getFolderSize(bucketName, folderPath);

  //after getting the folder size minus the existing file size in folder size and calculate the remaining storage
  const remainingStorage = Math.ceil(
    maxFolderSize - (currentFolderSize - existingFileSize)
  );
  if (
    fileSize > remainingStorage ||
    currentFolderSize - existingFileSize > maxFolderSize
  ) {
    return {
      success: false,
      remainingStorage:
        remainingStorage > 1024 * 1024
          ? `${Math.ceil(remainingStorage / (1024 * 1024))} MB`
          : `${Math.ceil(remainingStorage / 1024)} KB`,
    };
  }
  return {
    success: true,
    remainingStorage,
  };
}

export const checkUserFolderStorage = async (
  bucketName: string,
  folderPath: string,
  fileSize: number,
  getExistingFileSize: number
) => {
  const maxFolderSize = ((await getUserStorage(folderPath)) + 6 * 1024) * 1024; //user max folder size in Bytes
  try {
    //pass the file size in canupload file
    const canUpload = await canUploadFile(
      bucketName,
      folderPath,
      fileSize,
      getExistingFileSize
    );

    if (!canUpload.success) {
      return {
        success: false,
        remainingStorage: canUpload.remainingStorage,
      };
    }
    return {
      success: true,
      remainingStorage: canUpload.remainingStorage,
    };
  } catch (err) {
    console.log(err);
    throw new HTTPError(
      `Cannot upload. Folder size limit will be exceeded. Available space: ${maxFolderSize - (await getFolderSize(bucketName, folderPath))} bytes. `,
      500
    );
  }
};
