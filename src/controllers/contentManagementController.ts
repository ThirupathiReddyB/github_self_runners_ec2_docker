import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  CreateBlogValidation,
  CreateVideoValidation,
  DeleteBlogValidation,
  UpdateAdvertisementValidation,
  UpdateBlogValidation,
  UpdateFacilitiesValidation,
  UpdateVideoValidation,
  CreateAdvertisementValidation,
  VGetCommon,
  CreateFacilitiesValidation,
} from "../utility/Validation/contentManagementValidations";
import {
  complaintReplyById,
  createNewAdvertisement,
  createNewFacilities,
  createNewVideo,
  deleteAdvertisements,
  deleteFacilities,
  deleteVideo,
  updateAdvertisementById,
  updateFacilitiesById,
  editVideosById,
  getAllAdvertisements,
  getAllAdminContent,
  getAllFacilities,
  getAllMessages,
  getAllVideos,
  getComplaintFeedbackById,
  syncVimeoThumbnail,
  markResolveComplain,
  createBlogService,
  getBlogService,
  updateBlogService,
  deleteBlogService,
} from "../services/contentManagement.services";
import { Helpers } from "../utility/Helpers";
import {
  ICreateBlogInput,
  IEditAdvertisementData,
  IEditBlogInput,
  IEditFacilityType,
  IEditVideoType,
  IFacilityType,
  IGetContent,
  IGetVideo,
  IUploadAdvertisementData,
  IVideoType,
} from "../utility/DataTypes/types.contentManagement";
import { getTags } from "../services/tag.services";
// import { VideoType } from "../../../prisma/generated/prisma/client";
import { VfeedbackValidation } from "../utility/Validation/adminValidation";
import { IGetCommon } from "../utility/DataTypes/types.common";
import { VideoType } from "../../prisma/generated/prisma/enums";

//CONTENT MANAGEMENT
//Aggregate Get
export const getAllContent = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const contentMgmt = await getAllAdminContent(admin);
    if (!contentMgmt) {
      throw new HTTPError("could not get cms content", 204);
    }
    const code = contentMgmt.success ? 200 : 400;
    res.status(code).json({ data: contentMgmt });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//GET TAGS
export const readTags = async (req: Request, res: Response) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const getAllTags = await getTags();
    if (!getAllTags) {
      throw new HTTPError("could not get tags", 204);
    }
    const code = getAllTags.success ? 200 : 400;
    res.status(code).json({ data: getAllTags });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//VIDEOS
//Create Video
export const createVideo = async (req: Request, res: Response) => {
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
      })();

    if (!form_data) {
      throw new HTTPError("Missing required fields", 422);
    }
    const {
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      priority,
      isDefault,
      isOverride,
    } = form_data;
    const inputData: IVideoType = {
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      priority,
      vidType: isDefault
        ? ("default_video" as VideoType)
        : ("video" as VideoType),
      isOverride,
    };

    Helpers.validateWithZod(CreateVideoValidation, inputData);

    const createdVideo = await createNewVideo(admin, inputData);
    if (!createdVideo) {
      throw new HTTPError("could not add video", 204);
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

//get videos
export const getVideosAdmin = async (req: Request, res: Response) => {
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
      vidType: "video" as VideoType,
    };

    const getVideos = await getAllVideos(admin, params);
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

//Edit Video
export const editVideoById = async (req: Request, res: Response) => {
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
      })();
    const vidId = req.params.id;
    if (!vidId) throw new HTTPError("Video Id not provided", 422);

    const {
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      priority,
      isDefault,
      isOverride,
    } = form_data;
    const inputData: IEditVideoType = {
      id: parseInt(vidId),
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      priority,
      vidType: isDefault
        ? ("default_video" as VideoType)
        : ("video" as VideoType),
      isOverride,
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

//Delete Videos
export const deleteVideos = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 204);

    const { id } = req.query;

    if (!id) throw new HTTPError("Enter id of records to delete", 422);

    const deleteVideoData = await deleteVideo(id as string, "video");

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

//sync thumbnail
export const syncThumbnail = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 204);

    const syncedThumbnail = await syncVimeoThumbnail();

    if (!syncedThumbnail) throw new HTTPError(`Could Not sync thumbnail`, 204);
    const code = syncedThumbnail.success ? 200 : 400;
    res.status(code).json({ data: syncedThumbnail });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//ADVERTISEMENTS
//Create Advertisement
export const createAdvertisement = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 204);

    const file = req.file;
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const {
      advName,
      advRedirectLink,
      advType,
      advPosition,
      isActive,
      isSubscribed,
      priority,
      advStart,
      advEnd,
      advTimeLimit,
    } = req.body;

    if (
      !file ||
      !advName ||
      !advRedirectLink ||
      !advType ||
      !advPosition ||
      !isActive ||
      !isSubscribed ||
      !priority ||
      !advTimeLimit
    )
      throw new HTTPError("Missing Required fields", 422);

    const data: IUploadAdvertisementData = {
      file,
      advName,
      advRedirectLink,
      advType,
      advPosition,
      isActive,
      isSubscribed,
      priority,
      advStart,
      advEnd,
      advTimeLimit,
    };

    Helpers.validateWithZod(CreateAdvertisementValidation, data);

    const createdAdvertisement = await createNewAdvertisement(admin, data);
    if (!createdAdvertisement) {
      throw new HTTPError("could not add advertisement", 204);
    }
    const code = createdAdvertisement.success ? 200 : 400;
    res.status(code).json({ data: createdAdvertisement });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//get advertisements
export const getAdvertisementsAdmin = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const { id, page, search, limit, filter } = req.query;

    const data: IGetCommon = {
      id: typeof id === "string" ? parseInt(id) : undefined,
      page: typeof page === "string" ? parseInt(page) : 1,
      search: typeof search === "string" ? search : undefined,
      limit: typeof limit === "string" ? parseInt(limit) : 500,
      filter: typeof filter === "string" ? filter : undefined,
    };
    Helpers.validateWithZod(VGetCommon, data);

    const getAdvertisements = await getAllAdvertisements(admin, data);
    if (!getAdvertisements) {
      throw new HTTPError("could not get advertisements", 204);
    }
    const code = getAdvertisements.success ? 200 : 400;
    res.status(code).json({ data: getAdvertisements });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//Edit advertisement
export const editAdvertisementById = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const file = req.file;
    const advId = req.params.id;
    if (!advId) throw new HTTPError("advertisement Id not provided", 422);

    const {
      advName,
      advRedirectLink,
      advType,
      advPosition,
      isActive,
      isSubscribed,
      priority,
      advStart,
      advEnd,
      advTimeLimit,
    } = req.body;

    const data: IEditAdvertisementData = {
      file,
      advId: parseInt(advId),
      advName,
      advRedirectLink,
      advType,
      advPosition,
      isActive,
      isSubscribed,
      priority,
      advStart,
      advEnd,
      advTimeLimit,
    };

    Helpers.validateWithZod(UpdateAdvertisementValidation, data);

    const editedAdvertisement = await updateAdvertisementById(data);
    if (!editedAdvertisement) {
      throw new HTTPError("could not edit advertisement", 204);
    }
    const code = editedAdvertisement.success ? 200 : 400;
    res.status(code).json({ data: editedAdvertisement });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//Delete advertisements
export const deleteAdvertisement = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 401);

    const { id } = req.query;

    if (!id) throw new HTTPError("Enter id of records to delete", 422);

    const deleteAdvertisementData = await deleteAdvertisements(id as string);

    if (!deleteAdvertisementData)
      throw new HTTPError(`Could Not update appointment data`, 204);
    const code = deleteAdvertisementData.success ? 200 : 400;
    res.status(code).json({ data: deleteAdvertisementData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//BLOGS

export const createBlog = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor") {
      throw new HTTPError("Not authorized to do this action", 204);
    }

    const file = req.file;
    const form_data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    if (!file || !form_data) {
      throw new HTTPError("Missing required fields.", 422);
    }

    const { title, author, content, readTime, tags } = form_data;

    Helpers.validateWithZod(CreateBlogValidation, { file, form_data });

    const inputData: ICreateBlogInput = {
      title,
      status: true,
      author,
      updatedBy: admin.emailId,
      content,
      readTime: parseInt(readTime),
      tags,
      file,
    };

    const createBlog = await createBlogService(inputData);
    if (!createBlog) {
      throw new HTTPError("could not add blog", 204);
    }
    const code = createBlog.success ? 200 : 400;
    res.status(code).json({ data: createBlog });
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

export const getBlog = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized.", 401);
    }
    const queryParams = req.query;
    const { search, id, sortByField, sortByOrder, page, limit } = queryParams;

    const params: IGetContent = {
      search: search as string,
      id: parseInt(id as string),
      sortByField: sortByField as string,
      sortByOrder: sortByOrder
        ? (sortByOrder as IGetContent["sortByOrder"])
        : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };

    const getBlogResponse = await getBlogService(params, admin);
    if (!getBlogResponse) {
      throw new HTTPError("could not get blogs", 204);
    }

    const code = getBlogResponse.success ? 200 : 400;
    res.status(code).json({ data: getBlogResponse });
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

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }
    if (admin.role == "auditor") {
      throw new HTTPError("Not authorized to do this action", 204);
    }

    const form_data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const file = req.file;
    const blogId = req.params.id;
    if (!blogId) {
      throw new HTTPError("Blog Id not provided.", 422);
    }

    const { title, author, content, readTime, tags, status } = form_data;

    Helpers.validateWithZod(UpdateBlogValidation, { blogId, form_data, file });

    const inputData: IEditBlogInput = {
      id: parseInt(blogId),
      title,
      author,
      updatedBy: admin.emailId,
      content,
      readTime: readTime ? parseInt(readTime) : undefined,
      tags,
      status,
      file,
    };

    const editedBlog = await updateBlogService(inputData);
    if (!editedBlog) {
      throw new HTTPError("could not edit blog", 204);
    }

    const code = editedBlog.success ? 200 : 400;
    res.status(code).json({ data: editedBlog });
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

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor") {
      throw new HTTPError("Not authorized to do this action", 204);
    }
    const id = req.params.id;
    if (!id) {
      throw new HTTPError("blog id not provided.", 422);
    }

    Helpers.validateWithZod(DeleteBlogValidation, { id });

    const delete_id = parseInt(id);

    const deletedBlog = await deleteBlogService(delete_id);
    if (!deletedBlog) {
      throw new HTTPError(`Could Not delete blog.`, 204);
    }

    const code = deletedBlog.success ? 200 : 400;
    res.status(code).json({ data: deletedBlog });
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

//FACILITIES
//Create Facilities
export const createFacilities = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;

    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 401);
    const file = req.file;
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const {
      facPrimaryName,
      facSecondaryName,
      facPhoneNumber,
      facAddress,
      facPincode,
      facSpeciality,
      facType,
      isActive,
      additionalAddress,
      openTime,
      closeTime
    } = req.body;

    if (
      !file ||
      !facPrimaryName ||
      !facPhoneNumber ||
      !facAddress ||
      !facPincode ||
      !facSpeciality ||
      !facType
    ) {
      throw new HTTPError("Please upload a file", 422);
    }

    const data: IFacilityType = {
      file,
      facPrimaryName,
      facSecondaryName,
      facPhoneNumber,
      facAddress,
      facPincode,
      facSpeciality,
      facType,
      isActive,
      additionalAddress,
      openTime,
      closeTime
    };

    Helpers.validateWithZod(CreateFacilitiesValidation, data);

    const createdFacilities = await createNewFacilities(admin, data);
    if (!createdFacilities) {
      throw new HTTPError("could not add Facilities", 204);
    }
    const code = createdFacilities.success ? 200 : 400;
    res.status(code).json({ data: createdFacilities });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//get Facilitiess
export const getFacilitiesAdmin = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const { id, page, search, limit } = req.query;

    const data: IGetCommon = {
      id: typeof id === "string" ? parseInt(id) : undefined,
      page: typeof page === "string" ? parseInt(page) : 1,
      search: typeof search === "string" ? search.toLowerCase() : undefined,
      limit: typeof limit === "string" ? parseInt(limit) : 500,
    };
    Helpers.validateWithZod(VGetCommon, data);
    const getFacilitiess = await getAllFacilities(admin, data);
    if (!getFacilitiess) {
      throw new HTTPError("could not get Facilitiess", 204);
    }
    const code = getFacilitiess.success ? 200 : 400;
    res.status(code).json({ data: getFacilitiess });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//Edit Facilities
export const editFacilitiesById = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }
    const file = req.file;
    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const facId = req.params.id;
    if (!facId) throw new HTTPError("Facilities Id not provided", 422);

    const input: IEditFacilityType = {
      id: parseInt(facId),
      ...data,
      file,
    };
    Helpers.validateWithZod(UpdateFacilitiesValidation, input);

    const editedFacilities = await updateFacilitiesById(input);
    if (!editedFacilities) {
      throw new HTTPError("could not edit Facilities", 204);
    }
    const code = editedFacilities.success ? 200 : 400;
    res.status(code).json({ data: editedFacilities });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//Delete Facilitiess
export const deleteFacility = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 401);

    const { id } = req.query;

    if (!id) throw new HTTPError("Enter id of records to delete", 422);

    const deleteFacilitiesData = await deleteFacilities(id as string);

    if (!deleteFacilitiesData)
      throw new HTTPError(`Could Not update appointment data`, 204);
    const code = deleteFacilitiesData.success ? 200 : 400;
    res.status(code).json({ data: deleteFacilitiesData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//FEEDBACK AND COMPLAINTS
//Get all feedbacks and complaints
export const getUserMessages = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    const { page, limit, filter } = req.query;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const data: IGetCommon = {
      page: typeof page === "string" ? parseInt(page) : 1,
      limit: typeof limit === "string" ? parseInt(limit) : 500,
      filter: typeof filter === "string" ? filter : undefined,
    };
    const getMessages = await getAllMessages(admin, data);
    if (!getMessages) {
      throw new HTTPError("could not get messages", 204);
    }
    const code = getMessages.success ? 200 : 400;
    res.status(code).json({ data: getMessages });
  } catch (err) {
    console.log("error", err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//reply to complaints
export const replyCompliantById = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (admin.role == "auditor")
      throw new HTTPError("Not authorised to do this action", 401);

    const complaintId = req.params.id;
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!complaintId || !data)
      throw new HTTPError("Missing required Fields", 422);

    Helpers.validateWithZod(VfeedbackValidation, data);

    const adminComplaintReply = await complaintReplyById(admin, {
      complaintId,
      reply: data.reply,
    });

    if (!adminComplaintReply) {
      throw new HTTPError("could not edit advertisement", 204);
    }
    const code = adminComplaintReply.success ? 200 : 400;
    res.status(code).json({ data: adminComplaintReply });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//get complaint and feedback and mark them as read
export const getComplaintAndFeedback = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const id = req.params.id;
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    if (!id || !data.type || data.isRead === undefined) {
      throw new HTTPError("Missing required Fields", 422);
    }

    const params = req.query;
    const getComplaintFeedback = await getComplaintFeedbackById(
      admin,
      {
        id,
        type: data.type,
        isRead: data.isRead,
      },
      params
    );

    if (!getComplaintFeedback) {
      throw new HTTPError("could not edit advertisement", 204);
    }
    const code = getComplaintFeedback.success ? 200 : 400;
    res.status(code).json({ data: getComplaintFeedback });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//mark-resolve-and-unresolve
export const markResolveAndUnresolve = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }
    //auditor -> no permission,
    //admin -> can resolve, if already resolved, then nothing to do.
    //superadmin -> can resolve and unresolve.

    if (admin.role == "auditor") {
      throw new HTTPError("Not authorised to do this action", 401);
    }

    const complainId = req.params.id;
    if (!complainId) {
      throw new HTTPError("Complain Id not provided", 422);
    }
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    //body -> {type, toResolve}
    if (!data.type || typeof data.toResolve !== "boolean") {
      throw new HTTPError("Missing required Fields", 422);
    }

    const markResolve = await markResolveComplain(
      admin,
      complainId,
      data.type,
      data.toResolve
    );
    if (!markResolve) {
      throw new HTTPError("failed to perform resolve/unresolve action.", 500);
    }

    const statusCode = markResolve.success ? 200 : 500;
    res.status(statusCode).json({ data: markResolve });
  } catch (error: any) {
    console.log("Error", error);
    if (error instanceof HTTPError) {
      res.status(error.code).json({ error: { message: error.message } });
    } else {
      res.status(500).json({
        error: { message: "Internal server error", message1: error.message },
      });
    }
  }
};
