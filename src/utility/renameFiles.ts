import path from "path";
import fs from "fs";
import HTTPError from "./HttpError";
export const renameFile = (data: any, newFileName: string) => {
  try {
    const sanitizedFileName = path
      .basename(newFileName, path.extname(newFileName))
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 50);

    // Extract the file extension safely
    const fileExtension = path.extname(newFileName) || ".jpg";
    const newPath = `${data.destination}/${sanitizedFileName}${fileExtension}`;
    if (!fs.existsSync(data.path)) {
      throw new HTTPError(`File not found`, 404);
    }
    fs.renameSync(data.path, newPath);
    data.filename = `${sanitizedFileName}${fileExtension}`;
    data.originalname = `${sanitizedFileName}${fileExtension}`;

    data.path = newPath;
    return data;
  } catch (error) {
    console.error("Error renaming file:", error);
    throw error;
  }
};
