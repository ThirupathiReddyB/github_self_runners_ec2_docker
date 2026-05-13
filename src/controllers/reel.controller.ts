import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import { Helpers } from "../utility/Helpers";
import {
  createNewVideo,
  deleteVideo,
  editVideosById,
  getAllVideos,
} from "../services/contentManagement.services";
import {
  IEditVideoType,
  IGetVideo,
  IVideoType,
} from "../utility/DataTypes/types.contentManagement";
import {
  CreateVideoValidation,
  UpdateVideoValidation,
} from "../utility/Validation/contentManagementValidations";
import { VideoType } from "../../prisma/generated/prisma/client";

export const createReel = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin || admin.role == "auditor") {
      throw new HTTPError("Not authorised to do this action", 401);
    }

    const form_data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });

    if (!form_data) {
      throw new HTTPError("Missing required fields", 422);
    }
    const {
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      description,
      priority,
    } = form_data;

    const inputData: IVideoType = {
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      priority,
      vidType: "reel" as VideoType,
      description,
    };

    Helpers.validateWithZod(CreateVideoValidation, inputData);

    const createdVideo = await createNewVideo(admin, inputData);
    if (!createdVideo) {
      throw new HTTPError("could not add reel", 204);
    }
    const code = createdVideo.success ? 200 : 400;
    res.status(code).json({ data: createdVideo });
  } catch (err) {
    if (err instanceof HTTPError) {
      console.log("Error", err);
      if (err.code === 400) {
        res.status(err.code).json({
          error: { message: err.message },
          formErrror: { message: err.formDetail },
        });
      } else {
        res.status(err.code).json({ error: { message: err.message } });
      }
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getReelAdmin = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }
    const queryParams = req.query;
    const { search, id, sortByField, sortByOrder, page, limit } = queryParams;

    const params: IGetVideo = {
      search: search as string,
      id: parseInt(id as string),
      sortByField: sortByField as string,
      sortByOrder: sortByOrder
        ? (sortByOrder as IGetVideo["sortByOrder"])
        : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
      vidType: "reel" as VideoType,
    };

    const getReels = await getAllVideos(admin, params);
    if (!getReels) {
      throw new HTTPError("could not get Reels", 204);
    }
    const code = getReels.success ? 200 : 400;
    res.status(code).json({ data: getReels });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const editReelById = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 401);
    const form_data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });
    const vidId = req.params.id;
    if (!vidId) throw new HTTPError("Video Id not provided", 422);

    const {
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      priority,
      description,
    } = form_data;
    const inputData: IEditVideoType = {
      id: parseInt(vidId),
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      priority,
      description,
      vidType: "reel" as VideoType,
    };

    Helpers.validateWithZod(UpdateVideoValidation, inputData);

    const editedVideo = await editVideosById(inputData, admin);
    if (!editedVideo) {
      throw new HTTPError("could not edit video", 204);
    }
    const code = editedVideo.success ? 200 : 400;
    res.status(code).json({ form_data: editedVideo });
  } catch (err) {
    if (err instanceof HTTPError) {
      console.log(err);
      if (err.code === 400) {
        res.status(err.code).json({
          error: { message: err.message },
          formErrror: { message: err.formDetail },
        });
      } else {
        res.status(err.code).json({ error: { message: err.message } });
      }
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteReel = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 204);

    const { id } = req.query;

    if (!id) throw new HTTPError("Enter id of records to delete", 422);

    const deleteVideoData = await deleteVideo(id as string, "reel");

    if (!deleteVideoData)
      throw new HTTPError(`Could Not delete video data`, 204);
    const code = deleteVideoData.success ? 200 : 400;
    res.status(code).json({ data: deleteVideoData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
