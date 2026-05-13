import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import dotenv from "dotenv";
import { GroupedFiles, IGetCommon } from "../utility/DataTypes/types.common";
dotenv.config();
import { Helpers } from "../utility/Helpers";
import { ICreateStory } from "../utility/DataTypes/types.story";
import {
  createStoryValidation,
  editStoryValidation,
} from "../utility/Validation/story.validation";
import {
  createUpdateStory,
  deleteStory,
  getAllStories,
} from "../services/story.services";

export const createStory = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin || admin.role === "auditor") {
      throw new HTTPError("Not authorised to do this action", 401);
    }

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const files = req.files as GroupedFiles;
    const images = files.imageFile ?? [];

    if (!images || images.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const { title, tags, imageTitles, imageDescriptions } = req.body;
    const inputData: ICreateStory = {
      title,
      tags,
      images,
      imageTitles,
      imageDescriptions,
      isActive: true,
    };

    Helpers.validateWithZod(createStoryValidation, inputData);

    const addNewStory = await createUpdateStory(admin, inputData);
    if (!addNewStory) {
      throw new HTTPError("could not add story", 204);
    }
    const code = addNewStory.success ? 200 : 400;
    res.status(code).json({ data: addNewStory });
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

export const getStoryAdmin = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }
    const queryParams = req.query;
    const { search, id, sortByField, sortByOrder, page, limit } = queryParams;

    const params: IGetCommon = {
      search: search as string,
      id: parseInt(id as string),
      sortByField: sortByField as string,
      sortByOrder: sortByOrder
        ? (sortByOrder as IGetCommon["sortByOrder"])
        : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };

    const getVideos = await getAllStories(admin, params);
    if (!getVideos) {
      throw new HTTPError("could not get videos", 204);
    }
    const code = getVideos.success ? 200 : 400;
    res.status(code).json({ data: getVideos });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getStoryUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const queryParams = req.query;
    const { search, id, sortByField, sortByOrder, page, limit } = queryParams;

    const params: IGetCommon = {
      search: search as string,
      id: parseInt(id as string),
      sortByField: sortByField as string,
      sortByOrder: sortByOrder
        ? (sortByOrder as IGetCommon["sortByOrder"])
        : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };

    const getVideos = await getAllStories(user, params);
    if (!getVideos) {
      throw new HTTPError("could not get videos", 204);
    }
    const code = getVideos.success ? 200 : 400;
    res.status(code).json({ data: getVideos });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const editStoryById = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin || admin.role === "auditor") {
      throw new HTTPError("Not authorised to do this action", 401);
    }

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const storyId = parseInt(req.params.id);
    if (!storyId) throw new HTTPError("Story ID is required", 422);

    const files = req.files as GroupedFiles;
    const images = files.imageFile ?? [];

    const {
      title,
      tags,
      imageTitles,
      imageDescriptions,
      existingImages,
      existingImageTitles,
      existingImageDescriptions,
      isActive,
    } = req.body;
    const inputData: ICreateStory = {
      id: storyId,
      title,
      tags,
      images,
      imageTitles,
      imageDescriptions,
      existingImages,
      existingImageTitles,
      existingImageDescriptions,
      isActive: isActive === "true" ,
    };

    Helpers.validateWithZod(editStoryValidation, inputData);

    const updatedStory = await createUpdateStory(admin, inputData);
    if (!updatedStory) {
      throw new HTTPError("could not update story", 204);
    }
    const code = updatedStory.success ? 200 : 400;
    res.status(code).json({ data: updatedStory });
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

export const deleteStories = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 204);

    const { id } = req.query;

    if (!id) throw new HTTPError("Enter id of records to delete", 422);

    const delStoryResponse = await deleteStory(id as string);

    if (!delStoryResponse)
      throw new HTTPError(`Could Not delete video data`, 204);
    const code = delStoryResponse.success ? 200 : 400;
    res.status(code).json({ data: delStoryResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
