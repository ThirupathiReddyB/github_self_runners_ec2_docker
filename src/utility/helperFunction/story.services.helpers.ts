import prisma from "../../prisma";
import { deleteFile } from "../aws/deleteFile";
import HTTPError from "../HttpError";
import { awsBucketLink } from "../../constants/data";
import { uploadGenImage } from "../aws/uploadFile";
import { unlinkFile } from "../Helpers";

export const storyImageMutations = async (
  images: string[],
  imageTitles: string[],
  imageDescriptions: string[],
  storyId: number
) => {
  //find all existing images
  const ids: { id: number }[] = await prisma.storyImage.findMany({
    where: {
      filename: {
        in: images,
      },
      storyId,
    },
    select: {
      id: true,
    },
  });

  // Filter out any `null` values from the resulting array
  const validIds: number[] = ids.map((id) => id.id);

  //Find all images under table (casestudy/initiative)
  const existingImages = await prisma.storyImage.findMany({
    where: { storyId },
  });

  // Convert the current images into a map
  const existingImagesMap = new Map(
    existingImages.map((image: any) => [image.id, image])
  );
  const imagesToDelete: number[] = [];
  const existingStoryImages: any[] = [];

  for (const imgId of validIds) {
    // If image exists in the database, check if it needs updating
    if (existingImagesMap.has(imgId)) {
      const existingImg = existingImagesMap.get(imgId);

      //check if the name is changed of the existing image
      if (
        existingImg.title !== imageTitles[validIds.indexOf(imgId)] ||
        existingImg.description !== imageDescriptions[validIds.indexOf(imgId)]
      ) {
        //update the name in db
        const updateImageData = await prisma.storyImage.update({
          where: {
            id: imgId,
          },
          data: {
            title: imageTitles[validIds.indexOf(imgId)],
            description: imageDescriptions[validIds.indexOf(imgId)],
          },
        });
        if (!updateImageData)
          throw new HTTPError("Could not update image title", 400);
      }
      existingStoryImages.push({
        title: imageTitles[validIds.indexOf(imgId)],
        description: imageDescriptions[validIds.indexOf(imgId)],
        filename: existingImg.filename,
      });

      // Remove it from the map, so we know it doesn't need deletion
      existingImagesMap.delete(imgId);
    }
  }
  imagesToDelete.push(...existingImagesMap.keys());

  //delete the images that were removed (from DB and AWS)
  //AWS DELETE FIRST
  imagesToDelete.forEach(async (img) => {
    const existingImg = existingImagesMap.get(img);
    const response = await deleteFile(existingImg, "story");
    if (!response) throw new HTTPError("Could not remove image from AWS", 400);
  });

  //DB DELETE SECOND
  const deletedDbImages = await prisma.storyImage.deleteMany({
    where: { id: { in: imagesToDelete } },
  });
  if (!deletedDbImages)
    throw new HTTPError("Could not delete image for resource", 400);

  return {
    success: true,
    existingStoryImages,
  };
};

export const findStory = async (id?: number) => {
  const findStory = id
    ? await prisma.story.findFirst({
        where: { id },
      })
    : null;

  if (id && !findStory) throw new HTTPError("Could not find story", 404);
};

export const existingStoryTitle = async (title: string, id?: number) => {
  const existingStoryTitle = await prisma.story.findFirst({
    where: {
      title: {
        equals: title,
        mode: "insensitive",
      },
      NOT: id
        ? {
            id,
          }
        : undefined,
    },
  });
  if (existingStoryTitle)
    throw new HTTPError("Story with same name already exists", 400);
};

export const handleExistingImages = async (
  existingImages: string[],
  existingImageTitles: string[],
  existingImageDescriptions: string[],
  id?: number
) => {
  if (id) {
    const { success } = await storyImageMutations(
      existingImages ?? [],
      existingImageTitles ?? [],
      existingImageDescriptions ?? [],
      id
    );
    if (!success)
      throw new HTTPError("could not update existing images data", 400);
  }
};

export const handleNewImages = async (
  images: Express.Multer.File[],
  imageTitles?: string[],
  imageDescriptions?: string[],
) => {
  const imagesData: {
    title?: string;
    description?: string;
    filename: string;
  }[] = [];

  if (images) {
    let index = 0;
    for (const file of images) {
      const file_upload_result = await uploadGenImage(file, "story");

      //SQS logic
      ////   await imageCompress(file.path); // Compress before sending

      //   // Read the compressed file
      ////   const fileBuffer = fs.readFileSync(file.path);
      ////   const base64File = fileBuffer.toString("base64");
      //   // console.log(fileBuffer, base64File);

      ////   if (Buffer.byteLength(base64File, "utf8") > 262144) {
      ////     console.log("something::", Buffer.byteLength(base64File, "utf8"));
      ////     throw new HTTPError("File too large for SQS", 400);
      ////   }

      // //   const message = {
      ////     Bucket: process.env.AWS_BUCKET_DEV,
      ////     Key: `story/${Date.now()}-${file.originalname}`,
      // //     Body: base64File,
      // //     ContentType: file.mimetype,
      ////   };

      ////   await sqs.send(
      // //     new SendMessageCommand({
      ////       QueueUrl: SQS_QUEUE_URL,
      // //       MessageBody: JSON.stringify(message),
      // //     })
      // //   );
      if (!file_upload_result) {
        throw new HTTPError("Could not upload to s3", 502);
      }
      imagesData.push({
        title: imageTitles ? imageTitles[index] : undefined,
        description: imageDescriptions ? imageDescriptions[index] : undefined,
        filename: `${awsBucketLink}/${file_upload_result.Key}`,
      });
      unlinkFile(file.path);
      index++;
    }
  }
  return imagesData;
};
