import { cloudfront, s3 } from "../../../config/s3Config";
import fs from "fs";
import dotenv from "dotenv";

import { deleteFile } from "./deleteFile";
import { checkUserFolderStorage } from "./checkFolderSize";
import HTTPError from "../HttpError";

import { imageCompress } from "../imageCompression";
import { calculateBase64ImageSize } from "../calculations";
import { DistributionIdCdn } from "../../constants/data";
import { handleError } from "../Error";

dotenv.config();

export const uploadFile = async (file: any, folder: string) => {
  try {
    const isStorageFree = await checkUserFolderStorage(
      `${process.env.AWS_BUCKET_DEV}`,
      folder.toLowerCase(),
      file.size,
      0
    );
    if (!isStorageFree.success) {
      throw new HTTPError(
        `Storage is full. Remaining storage ${isStorageFree.remainingStorage} `,
        606
      );
    }
    const fileStream = fs.createReadStream(file.path);

    const uploadParams = {
      Bucket: `${process.env.AWS_BUCKET_DEV}/${folder}`,
      Body: fileStream,
      Key: file.filename,
      ContentType: file.mimetype,

      // ContentDisposition: "inline",
    };

    const result = await s3.upload(uploadParams).promise();
    return result;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const uploadProfile = async (InputData: {
  profileImage: string;
  userId: string;
}) => {
  //get size of existing profile Image
  // let existingFileSize = 0;
  let response: any = null;
  const base64Size = calculateBase64ImageSize(InputData.profileImage);

  // find the existing file
  // const existingProfileImage = await prisma.users.findFirst({
  //   where: {
  //     id: InputData.userId,
  //   },
  // });

  //// if (!existingProfileImage && !isNewUser) {
  //   throw new HTTPError("User not found", 404);
  // }
  // if (existingProfileImage && !isNewUser) {
  //   //not checking the if user exist as when new user is created we still call this function even when user is not created eg while creating minor
  //   if (existingProfileImage?.profileImage) {
  //     existingFileSize = await getFileSize(
  //       existingProfileImage.profileImage.split("/")[4],
  //       InputData.userId.toLowerCase()
  //     );
  //   }
  //   //check the folder storage
  //   const isStorageFree = await checkUserFolderStorage(
  //     `${process.env.AWS_BUCKET_DEV}`,
  //     InputData.userId.toLowerCase(),
  //     base64Size,
  //     existingFileSize
  //   );
  //   if (!isStorageFree.success) {
  //     throw new HTTPError(
  //       `Storage is full. Remaining storage ${isStorageFree.remainingStorage} `,
  //       606
  //     );
  ////   }

  //   //delete existing profile image
  //   if (existingProfileImage?.profileImage) {
  //     await deleteFile(
  //       existingProfileImage.profileImage.split("/")[4],
  //       InputData.userId.toLowerCase()
  //     );
  //   }
  //// }
  //add new profile
  const base64Data = Buffer.from(
    InputData.profileImage.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );

  if (base64Size > 1024 * 1024) {
    response = await imageCompress(base64Data);
  }

  const type = InputData.profileImage.split(";")[0].split("/")[1];

  const params = {
    Bucket: `${process.env.AWS_BUCKET_DEV}/${InputData.userId}`,
    Key: `profileImage/${InputData.userId}.${type}`,
    Body: response ? response.res : base64Data,
    ContentEncoding: "base64",
    ContentType: `image/${type}`,
    CacheControl: "no-cache",
  };

  const { Location, Key } = await s3.upload(params).promise();
  await invalidateCloudFrontCache(Key);
  if (Location)
    return {
      success: true,
      Location,
      Key,
    };
};

// Function to invalidate CloudFront cache
const invalidateCloudFrontCache = async (key: string) => {
  const params = {
    DistributionId: DistributionIdCdn,
    InvalidationBatch: {
      Paths: {
        Quantity: 1,
        Items: [`/${key}`],
      },
      CallerReference: `${Date.now()}`, // Unique reference for invalidation
    },
  };

  try {
    await cloudfront.createInvalidation(params).promise();
  } catch (err) {
    console.error("Error invalidating CloudFront cache:", err);
  }
};

export const uploadMedicine = async (InputData: {
  medImage: string;
  userId: string;
  reminderName: string;
}) => {
  //delete existing profile image
  // await deleteFile(InputData.medImage, InputData.userId.toLowerCase());
  const base64Size = calculateBase64ImageSize(InputData.medImage);

  const isStorageFree = await checkUserFolderStorage(
    `${process.env.AWS_BUCKET_DEV}`,
    InputData.userId,
    base64Size,
    0
  );
  if (!isStorageFree.success) {
    throw new HTTPError(
      `Storage is full. Remaining storage ${isStorageFree.remainingStorage} `,
      606
    );
  }
  const currentTimeStamp = Date.now();
  //add new profile
  const base64Data = Buffer.from(
    InputData.medImage.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );
  const type = InputData.medImage.split(";")[0].split("/")[1];
  const params = {
    Bucket: `${process.env.AWS_BUCKET_DEV}/${InputData.userId}`,
    Key: `medReminderImg_${currentTimeStamp}_${InputData.reminderName.replace(/[^a-zA-Z0-9.]/g, "")}.${type}`,
    Body: base64Data,
    ContentEncoding: "base64",
    ContentType: `image/${type}`,
  };

  const { Location, Key } = await s3.upload(params).promise();
  if (Location)
    return {
      success: true,
      Location,
      Key,
    };
};

//for seed
export const uploadImage = async (InputData: {
  image: string;
  folder: string;
  name: string;
}) => {
  //delete existing profile image
  await deleteFile(`${InputData.name}`, InputData.folder);

  //add new profile
  const base64Data = Buffer.from(
    InputData.image.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );

  const type = InputData.image.split(";")[0].split("/")[1];

  const params = {
    Bucket: `${process.env.AWS_BUCKET_DEV}/${InputData.folder}`,
    Key: `${InputData.name}.${type}`,
    Body: base64Data,
    ContentEncoding: "base64",
    ContentType: `image/${type}`,
  };

  const { Location } = await s3.upload(params).promise();
  if (Location)
    return {
      success: true,
      Location,
    };
};

//for adv without checking the folder storage
export const uploadGenImage = async (file: any, folder: string) => {
  try {
    const fileStream = fs.createReadStream(file.path);

    const uploadParams = {
      Bucket: `${process.env.AWS_BUCKET_DEV}/${folder}`,
      Body: fileStream,
      Key: file.filename,
      ContentType: file.mimetype,

      // ContentDisposition: "inline",
    };

    return s3.upload(uploadParams).promise();
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const uploadFileTest = (file: any, folder: string) => {
  checkUserFolderStorage(`${process.env.AWS_BUCKET_DEV}`, folder, file.size, 0);
  if (!checkUserFolderStorage) {
    throw new HTTPError("Folder storage is full", 500);
  }
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: `${process.env.AWS_BUCKET_DEV}/${folder}`,
    Body: fileStream,
    Key: file.filename,
    ContentType: file.mimetype,

    // ContentDisposition: "inline",
  };

  return s3.upload(uploadParams).promise();
};
