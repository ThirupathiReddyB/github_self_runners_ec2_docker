import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import { uploadGenImage } from "../utility/aws/uploadFile";
import { awsBucketLink } from "../constants/data";

export const uploadFilesDev = async (req: Request, res: Response) => {
  try {
    const imgFile = req.file;

    const { folder } = req.body;

    const file_upload_result = await uploadGenImage(imgFile, folder);
    const bannerImage = `${awsBucketLink}/${file_upload_result.Key}`;
    if (!file_upload_result)
      throw new HTTPError(
        `Could Not get active subscription and add-ons data`,
        204
      );
    res.status(200).json({ data: bannerImage });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
