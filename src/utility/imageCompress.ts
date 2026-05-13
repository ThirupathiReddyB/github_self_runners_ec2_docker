const fs = require("fs").promises;
import path from "path";
import sharp from "sharp";

const targetSizeBytes = 128 * 1024; // 128KB in bytes

export const imageCompress = async (imagePath: string) => {
  const tempPath = path.join(
    path.dirname(imagePath),
    "temp_" + path.basename(imagePath)
  );
  try {
    let currentSize = (await fs.stat(imagePath)).size;
    let metadata = await sharp(imagePath).metadata();
    let iterationCount = 0;

    while (currentSize > targetSizeBytes) {
      iterationCount++;

      // Check for invalid dimensions
      if (!metadata.width || metadata.width <= 1) {
        throw new Error("Image width is too small to compress further.");
      }

      const scaleFactor = 0.5; // Reduce size by 80% each iteration
      const newWidth = Math.round((metadata.width || 0) * scaleFactor);

      // Compress and resize the image
      await sharp(imagePath)
        .resize({ width: newWidth }) // Resize to proportional width
        .toFile(tempPath);

      // Replace the original image with the compressed version
      await fs.rename(tempPath, imagePath);

      // Update metadata and file size
      metadata = await sharp(imagePath).metadata();
      currentSize = (await fs.stat(imagePath)).size;

      // Break if the image cannot be compressed further
      if (iterationCount > 10 || currentSize <= targetSizeBytes) {
        console.warn(
          "Image cannot be compressed further without significant loss."
        );
        break;
      }
    }
  } catch (err) {
    console.error("Error compressing image:", err);
    throw new Error("Could not compress image");
  }
};
