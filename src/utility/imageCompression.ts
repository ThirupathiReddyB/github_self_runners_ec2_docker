import sharp from "sharp";
import HTTPError from "./HttpError";
import { handleError } from "./Error";

export const imageCompress = async (image: Buffer) => {
  try {
    const metadata = await sharp(image).metadata();
    const imageFormat = metadata.format;
    if (!imageFormat) {
      throw new HTTPError(
        "Could not determine the image format while compression",
        500
      );
    }
    const newWidth = Math.round((metadata.width ?? 0) * 0.5);

    // Resize to half the width and adjust quality (if applicable)
    const res = await sharp(image)
      .resize({ width: newWidth }) // Resize image
      .toFormat(imageFormat) // Maintain original format dynamically
      .toBuffer();
    if (!res) throw new HTTPError("Could not compress image", 400);

    // Define the output file path
    return {
      res,
      imageFormat,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
