import { awsBucketLink } from "../constants/data";
import {
  uploadGenImage,
  uploadFile,
  uploadMedicine,
  uploadProfile,
} from "./aws/uploadFile";
import HTTPError from "./HttpError";
import { renameFile } from "./renameFiles";
import { ParsedQs } from "qs";
import { deleteFile } from "./aws/deleteFile";
import { editAwsFileName } from "./aws/editFileName";
import { unlinkFile } from "./Helpers";

export const uploadFileToS3 = async (
  file: Express.Multer.File,
  preFileName: string,
  userId: string
) => {
  let URL;
  const currentTimestamp = Date.now();

  const renamedFiledata = renameFile(
    file,
    `${preFileName}_${currentTimestamp}_${file.originalname}`
  );
  const result = await uploadFile(renamedFiledata, userId?.toLowerCase());
  if (file && !result) throw new HTTPError("Could not upload file to s3", 502);
  await unlinkFile(renamedFiledata.path);
  URL = result ? `${awsBucketLink}/${result.Key}` : undefined;
  return URL;
};

export const deleteFileFromS3 = async (
  previousfileName: string,
  { famCareMemberId }: ParsedQs,
  userId: string
) => {
  const fileName = decodeURIComponent(previousfileName.split("/")[4]);
  const result = famCareMemberId
    ? await deleteFile(fileName, (famCareMemberId as string)?.toLowerCase())
    : await deleteFile(fileName, userId.toLowerCase());
  if (!result) throw new HTTPError("Could not delete file from s3", 502);
};

export const editFileName = async (
  { famCareMemberId }: ParsedQs,
  existing_URL: any,
  preName: string,
  userId: string
) => {
  const oldKey = decodeURIComponent(existing_URL.split("/")[4]);
  const fileName = oldKey.split("_");
  const currentTimestamp = Date.now();
  const newKey = `${preName}_${currentTimestamp}_${fileName.slice(2).join("_")}`;
  const url = famCareMemberId
    ? await editAwsFileName(
        oldKey,
        newKey,
        (famCareMemberId as string)?.toLowerCase()
      )
    : await editAwsFileName(oldKey, newKey, userId);
  if (!url) {
    throw new HTTPError("Could not rename file", 502);
  }
  return url;
};

export const renameAndUploadCMSImage = async (
  file: Express.Multer.File,
  type: string
) => {
  let URL, renamedFiledata;
  renamedFiledata = renameFile(
    file,
    `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 50)}`
  );
  const file_upload_result = await uploadGenImage(renamedFiledata, type);
  if (!file_upload_result) {
    throw new HTTPError("Could not upload to s3", 502);
  }
  await unlinkFile(renamedFiledata.path);
  URL = `${awsBucketLink}/${file_upload_result.Key}`;
  return URL;
};

export const renameAndUploadComplaintImage = async (
  file: Express.Multer.File,
  userId: string
) => {
  let URL, renamedFiledata;
  renamedFiledata = renameFile(
    file,
    `${Date.now()}_${userId}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 50)}`
  );
  const file_upload_result = await uploadGenImage(renamedFiledata, "messages");
  if (!file_upload_result) {
    throw new HTTPError("Could not upload to s3", 502);
  }
  await unlinkFile(renamedFiledata.path);
  URL = `${awsBucketLink}/${file_upload_result.Key}`;
  return URL;
};

export const deleteFromS3 = async (previousfileName: string, type: string) => {
  const fileName = decodeURIComponent(previousfileName.split("/")[4]);
  const result = await deleteFile(fileName, type);
  if (!result) throw new HTTPError("Could not delete file from s3", 502);
};

export const uploadProfileImageToS3 = async (
  profileImage: string | undefined,
  userId: string,
 //// isNewUser = false
) => {
  let profileURL = null;
  if (profileImage) {
    const uploadResult = await uploadProfile(
      { profileImage, userId },
    //  // isNewUser
    );
    if (!uploadResult?.success) {
      throw new HTTPError("Could not upload profile image to S3", 502);
    }
    profileURL = `${awsBucketLink}/${uploadResult.Key}`;
  }

  return profileURL;
};

export const uploadMedImageToS3 = async (
  medImage: string | undefined,
  userId: string,
  medName: string
) => {
  let medURL;
  if (medImage) {
    medURL = await uploadMedicine({
      medImage: medImage,
      userId: userId,
      reminderName: medName,
    });
    if (!medURL?.success)
      throw new HTTPError("Could not upload medicine Image to S3", 502);
  }

  return medURL;
};
