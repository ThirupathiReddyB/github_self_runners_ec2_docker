import prisma from "../prisma";
import { adminTokenData } from "../utility/DataTypes/types.admin";
import {
  ICreateBlogInput,
  IEditAdvertisementData,
  IEditBlogInput,
  IEditFacilityType,
  IEditVideoType,
  IFacilityType,
  IGetContent,
  IGetFacility,
  IGetVideo,
  IUploadAdvertisementData,
  IVideoType,
} from "../utility/DataTypes/types.contentManagement";
import { ITokenData } from "../utility/DataTypes/types.user";
import HTTPError from "../utility/HttpError";
import { ParsedQs } from "qs";
import { emailingService } from "../utility/emailService";
import { trackActiveSession } from "../utility/changeHistoryTrackFunction";
import { MessageType, VideoType } from "../../prisma/generated/prisma/client";
import { complaintReply } from "../templateDesign/DashboardTemplates";
import { getVimeoVideo } from "../utility/getVimeoVideoDetails";
import axios from "axios";
import { handleError } from "../utility/Error";
import {
  deleteFromS3,
  renameAndUploadCMSImage,
} from "../utility/FileOperations";
import { fetchUserFirst } from "../utility/prismaQueries";
import {
  buildSearchFilter,
  buildVideoFilter,
  finalAdminResultGetAllVideos,
  getAllAdminAdvertisements,
  getAllAdminFacilities,
  getAllAdminVideos,
  getAllUserFacilities,
  getCoordinatesFromAddress,
  isFeatureAvailable,
  // setFiltersGetAllVideos,
} from "../utility/helperFunction/contentManagement.services.helper";
import { normalizeId } from "../utility/UserId";
import { createTag } from "./tag.services";
import { getAllStories } from "./story.services";
import { deleteFile } from "../utility/aws/deleteFile";
import { IGetCommon } from "../utility/DataTypes/types.common";
import { freePlanCode, generateSkip } from "../constants/data";
import {
  getUserMessageQuery,
  updateUserMessageSuperAdmin,
} from "../utility/helperFunction/messages.helper";
import {
  getAdminUserName,
  isAdminTokenData,
} from "../utility/helperFunction/admin.auth.services.helper";
export function isTokenData(
  user: ITokenData | adminTokenData
): user is ITokenData {
  return (user as ITokenData).id !== undefined;
}

//VIDEOS
export const createNewVideo = async (
  admin: adminTokenData,
  data: IVideoType
) => {
  try {
    const {
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      priority,
      vidType,
      description,
      isOverride,
    } = data;

    if (!vidName || !vidSourceUrl)
      throw new HTTPError("Required fields missing", 422);

    const videoURL = vidSourceUrl.split("?")[0];
    const [findVideo, findDefaultVideo] = await Promise.all([
      prisma.video.findFirst({
        where: {
          vidSourceUrl: videoURL,
        },
      }),
      prisma.video.findFirst({
        where: {
          vidType: "default_video",
        },
      }),
    ]);

    if (findVideo) {
      throw new HTTPError(
        `${vidType == "default_video" || vidType == "video" ? "video" : "reel"} with the same URL already exists`,
        422
      );
    }
    if (findDefaultVideo && vidType == "default_video" && !isOverride)
      throw new HTTPError(`${findDefaultVideo.title}`, 609);
    if (findDefaultVideo && vidType == "default_video" && isOverride) {
      await prisma.video.update({
        where: {
          id: findDefaultVideo.id,
        },
        data: {
          vidType: "video",
        },
      });
    }

    let tagIds: number[] = [];
    if (vidTags) tagIds = await createTag(vidTags);

    const videoId = videoURL.split("/")[3];

    const vimeoVideo = await getVimeoVideo(parseInt(videoId));
    if (!vimeoVideo) {
      throw new HTTPError(`Couldn't fetch ${vidType} from vimeo`, 500);
    }
    const fileLink = vimeoVideo.files;
    const hlsFile = fileLink.find((file: any) => file.quality === "hls");
    const addVideo = await prisma.video.create({
      data: {
        title: vidName,
        vidSourceUrl: videoURL,
        // vidTags: vidTagsArray,
        tags: {
          connect: tagIds.map((tag) => ({
            id: tag,
          })),
        },
        isActive,
        isSubscribed,
        priority,
        updatedBy: admin.emailId,
        // dashboardUser: {
        //   connect: {
        //     emailId: admin.emailId,
        //   },
        // },
        vimeoDetails: {
          create: {
            thumbnail: vimeoVideo.pictures.base_link,
            playableLink: hlsFile.link,
            duration: vimeoVideo.duration,
          },
        },
        vidType,
        description,
      },
    });
    if (!addVideo) throw new HTTPError(`Could not add new ${vidType}`, 500);

    return {
      success: true,
      message: `${vidType} was added successfully`,
      video: addVideo,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getAllVideos = async (
  user: ITokenData | adminTokenData,
  queryParams: IGetVideo
) => {
  try {
    let getAllVideos;
    const { search, page, limit = 10, type } = queryParams;

    const skip = generateSkip(limit, page);
    const take = limit ?? undefined;

    const searchFilter = await buildSearchFilter(search, "video");
    if (isAdminTokenData(user)) {
      const { filters, sortByFilters } = buildVideoFilter(queryParams, true);

      getAllVideos = await getAllAdminVideos(
        filters,
        searchFilter,
        sortByFilters,
        queryParams
      );

      const { totalRecords, formattedData } =
        await finalAdminResultGetAllVideos(
          filters,
          searchFilter,
          getAllVideos,
          skip
        );

      return {
        success: true,
        data: formattedData,
        totalRecords: totalRecords,
      };
    } else {
      // user is of type TokenData
      //1. find user
      const findUser = await fetchUserFirst(user.id);

      const findActivePlan = await prisma.subscription.findFirst({
        where: {
          userId: findUser.id,
          status: "active",
        },
        select: {
          planVariants: {
            select: {
              PlanToFeature: {
                where: {
                  feature: {
                    canonicalName: "video",
                  },
                },
                select: {
                  metadata: true,
                },
              },
            },
          },
        },
      });
      const metadataValue =
        findActivePlan?.planVariants.PlanToFeature?.[0]?.metadata?.value;

      const isAvailable = isFeatureAvailable(metadataValue);

      const { filters } = buildVideoFilter(queryParams, false, isAvailable);

      const totalRecords = await prisma.video.count({
        where: {
          ...filters,
          ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
        },
      });

      // Calculate correct page for non-admin infinite scroll
      let newPageValue = page ?? 1;
      if (type == "all" && !search) {
        const totalPages = Math.ceil(totalRecords / (limit || 1));
        newPageValue = (page ?? 1) % totalPages || totalPages;
      }

      getAllVideos = await prisma.video.findMany({
        where: {
          ...filters,
          ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
        },
        orderBy: [{ priority: "asc" }, { id: "asc" }],
        include: {
          tags: {
            select: {
              id: true,
              name: true,
            },
          },
          vimeoDetails: true,

          // dashboardUser: {
          //   select: {
          //     fullName: true,
          //   },
          // },
        },
        take,
        skip: ((newPageValue || 1) - 1) * (limit ?? 0),
      });

      // Collect unique emails
      const emailIds = [
        ...new Set(getAllVideos.map((v) => v.updatedBy).filter(Boolean)),
      ];

      const authorMap = await getAuthors(emailIds)

      // Attach author info without async
      const finalRecords = getAllVideos.map((rec: any) => {
        const { updatedBy, ...remainder } = rec;

        return {
          ...remainder,
          dashboardUser: {
            fullName: authorMap.get(updatedBy) || "Team Thito",
          },
        };
      });

      //track session
      await trackActiveSession(user.id);

      return {
        success: true,
        data: finalRecords,
        totalRecords: totalRecords,
      };
    }
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const editVideosById = async (
  data: IEditVideoType,
  dashboardUser: adminTokenData
) => {
  try {
    const {
      id,
      vidName,
      vidSourceUrl,
      vidTags,
      isActive,
      isSubscribed,
      priority,
      description,
      vidType,
      isOverride,
    } = data;
    let vimeoVideo: any;
    let hlsFile: any;

    const [findVideo, findDefaultVideo] = await Promise.all([
      prisma.video.findFirst({
        where: {
          id,
        },
      }),
      prisma.video.findFirst({
        where: {
          vidType: "default_video",
          NOT: {
            id,
          },
        },
      }),
    ]);

    if (!findVideo)
      throw new HTTPError(
        `${vidType} you are trying to edit does not exist`,
        404
      );

    if (findDefaultVideo && vidType == "default_video" && !isOverride)
      throw new HTTPError(`${findDefaultVideo.title}`, 609);
    if (findDefaultVideo && vidType == "default_video" && isOverride) {
      await prisma.video.update({
        where: {
          id: findDefaultVideo.id,
        },
        data: {
          vidType: "video",
        },
      });
    }

    if (vidSourceUrl) {
      const findExistingVideo = await prisma.video.findFirst({
        where: {
          vidSourceUrl,
          NOT: {
            id,
          },
        },
      });

      if (findExistingVideo) {
        throw new HTTPError(`${vidType} with this URL already exists`, 422);
      }
      const videoId = vidSourceUrl.split("/")[3];

      vimeoVideo = await getVimeoVideo(parseInt(videoId));
      const fileLink = vimeoVideo.files;
      hlsFile = fileLink.find((file: any) => file.quality === "hls");
    }

    let tagIds: number[] = [];
    if (vidTags) tagIds = await createTag(vidTags);

    await prisma.$transaction(async (tx) => {
      const editVideo = await tx.video.update({
        where: {
          id,
        },
        data: {
          title: vidName,
          vidSourceUrl,
          tags: {
            connect: tagIds.map((tag) => ({
              id: tag,
            })),
          },

          isActive: isActive,
          isSubscribed: isSubscribed,
          priority: priority,
          updatedBy: dashboardUser.emailId,
          vimeoDetails: {
            update: {
              thumbnail: vimeoVideo.pictures.base_link,
              playableLink: hlsFile.link,
              duration: vimeoVideo.duration,
            },
          },
          vidType,
          description,
        },
      });
      if (!editVideo) throw new HTTPError(`Could not edit ${vidType}`, 500);
    });

    return {
      success: true,
      message: `${vidType} was added edited successfully`,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const deleteVideo = async (vidId: string, vidType: VideoType) => {
  try {
    const vids = vidId.split(",");

    //find videos
    const findVideos = await prisma.video.findMany({
      where: {
        id: {
          in: vids.map((vid) => parseInt(vid)),
        },
        vidType,
      },
    });
    if (!findVideos || findVideos.length != vids.length)
      throw new HTTPError(`Could not find ${vidType}`, 404);

    const deleteMultiple = findVideos.map(async (videos) => {
      const deleteVideo = await prisma.video.delete({
        where: {
          id: videos.id,
        },
      });
      if (!deleteVideo)
        throw new HTTPError(`Could not delete data from database`, 500);
    });
    if (!deleteMultiple) {
      throw new HTTPError(`Could not delete all ${vidType}(s)`, 500);
    }

    return {
      success: true,
      message: `${vidType}(s) were deleted successfully`,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const syncVimeoThumbnail = async () => {
  try {
    const updateThumbnail: Array<any> = [];
    const getTotalPages = await axios.get(
      `https://api.vimeo.com/me/videos/?page=1&per_page=1&fields=pictures.base_link,link`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        },
      }
    );
    const totalPages = Math.ceil(getTotalPages.data.total / 100);
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      const response = await axios.get(
        `https://api.vimeo.com/me/videos/?page=${currentPage}&per_page=100&fields=pictures.base_link,link`,
        {
          headers: {
            Authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
          },
        }
      );
      updateThumbnail.push(...response.data.data);
    }
    if (updateThumbnail.length === 0) {
      return {
        success: true,
        message: "All videos are up to date.",
      };
    }

    const videoLinks = updateThumbnail.map((thumbnail) => {
      return thumbnail.link;
    });
    const thumbnailLink = updateThumbnail.map(
      (thumbnail) => thumbnail.pictures.base_link
    );

    // 1. Define batch size
    const batchSize = 1000;
    const numBatches = Math.ceil(videoLinks.length / batchSize);

    //2. Update in batches
    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, videoLinks.length);
      const batchVideoLinks = videoLinks.slice(start, end);
      const batchThumbnailLinks = thumbnailLink.slice(start, end);

      const updateOperations = batchVideoLinks.map((link, index) => {
        return prisma.vimeoDetails.updateMany({
          where: {
            video: {
              vidSourceUrl: link,
            },
          },
          data: {
            thumbnail: batchThumbnailLinks[index],
          },
        });
      });

      await Promise.all(updateOperations); // Execute all updates for the current batch
    }

    return {
      success: true,
      message: "All Vimeo videos updated successfully.",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//ADVERTISEMENTS
export const createNewAdvertisement = async (
  admin: adminTokenData,
  data: IUploadAdvertisementData
) => {
  try {
    const {
      file,
      advName,
      advType,
      advPosition,
      isActive,
      isSubscribed,
      priority,
      advRedirectLink,
      advStart,
      advEnd,
      advTimeLimit,
    } = data;

    const advURL = await renameAndUploadCMSImage(file, "advertisement");

    //3. upload data and url in db

    const uploadDocumentResponse = await prisma.advertisement.create({
      data: {
        advName,
        advSourceUrl: advURL,
        advType,
        advPosition,
        isActive: isActive === "true",
        isSubscribed: isSubscribed === "true",
        advRedirectLink,
        priority: parseInt(priority),
        advStart: advStart ? new Date(advStart) : null,
        advEnd: advEnd ? new Date(advEnd) : null,
        advTimeLimit: parseInt(advTimeLimit),
        updatedBy: admin.emailId
        // dashboardUser: {
        //   connect: {
        //     emailId: admin.emailId,
        //   },
        // },
      },
    });

    if (!uploadDocumentResponse)
      throw new HTTPError(`Could Not add advertisement`, 500);

    return {
      success: true,
      uploadDocumentResponse,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getAllAdvertisements = async (
  user: ITokenData | adminTokenData,
  queryParams: IGetCommon
) => {
  try {
    const response: any = {
      success: true,
    };
    let getAllAdvertisements;
    if (isAdminTokenData(user)) {
      // user is of type AdminTokenData
      const filters: any = {};
      const { search, id } = queryParams;

      const searchFilter = await buildSearchFilter(search, "advertisement");

      if (id) {
        filters.id = id;
      }
      getAllAdvertisements = await getAllAdminAdvertisements(
        filters,
        searchFilter,
        queryParams
      );
      const totalRecords = await prisma.advertisement.count();
      response.totalRecords = totalRecords;
      response.data = getAllAdvertisements;
    } else {
      // user is of type TokenData
      //1. find user
      const findUser = await fetchUserFirst(user.id);

      const filters: any = {};

      //find current active plan
      const findActivePlan = await prisma.subscription.findFirst({
        where: {
          userId: findUser.id,
          status: "active",
        },
        select: {
          planVariants: {
            select: {
              plan: {
                select: {
                  planCode: true,
                  id: true,
                }
              },
              PlanToFeature: {
                where: {
                  feature: {
                    canonicalName: "advertisement",
                  },
                },
                select: {
                  metadata: true,
                },
              },
            },
          },
        },
      });
      const metadataValue =
        findActivePlan?.planVariants?.PlanToFeature?.[0]?.metadata?.value;

      const isAvailable = isFeatureAvailable(metadataValue);

      //get all "partner" availed vouchers of user
      const findAvailedVouchers = await prisma.usersToVoucher.findFirst({
        where: {
          userId: user.id,
          status: "success"
        },
        select: {
          voucher: {
            select: {
              code: true,
              advertisement: {
                select: {
                  id: true
                }
              }
            }
          },
          subscription: {
            where: {
              status: "active"
            },
            select: {
              userId: true,
              status: true,
              planVariants: {
                select: {
                  id: true,
                  plan: {
                    select: {
                      planCode: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          updatedAt: "desc"
        }
      });
      const linkedAdv = findAvailedVouchers?.voucher.advertisement.flatMap((adv) => adv.id);

      // console.log("linked Advertisements-Vouchers::", linkedAdv)

      const activePlanCode = findActivePlan?.planVariants.plan.planCode

      const now = new Date();

      const showLinkedAdvCondition = activePlanCode != freePlanCode && linkedAdv && linkedAdv.length && activePlanCode == findAvailedVouchers?.subscription?.planVariants?.plan?.planCode

      // console.log("show condition::", showLinkedAdvCondition, "\nIs available::", isAvailable)
      //If premium(no voucher used) - show only premium adv
      //If premium(partner voucher used) - show only adv of that voucher
      //if Premium(generic voucher used)- show premium adv
      //if free - only free adv

      filters.OR = [
        // Case 1: Records in linkedAdv - skip subscription check
        ...(showLinkedAdvCondition ? [{
          AND: [
            { id: { in: linkedAdv } },

            { isActive: true },
            // {
            //   OR: [{ advStart: { lte: now } }, { advStart: null }],
            // },
            // {
            //   OR: [{ advEnd: { gte: now } }, { advEnd: null }],
            // },
          ],
        }] : [{
          // Case 2: Records not in linkedAdv - include subscription check
          AND: [
            { id: { notIn: linkedAdv } },
            { advType: "feature" },
            { isActive: true },
            isAvailable ? { isSubscribed: true } : { isSubscribed: false },
            {
              OR: [{ advStart: { lte: now } }, { advStart: null }],
            },
            {
              OR: [{ advEnd: { gte: now } }, { advEnd: null }],
            },
          ],
        }]),
      ];

      //2. get advertisements

      getAllAdvertisements = await prisma.advertisement.findMany({
        where: { AND: [filters] },
        orderBy: {
          priority: "asc",
        },
      });

      if (!getAllAdvertisements)
        throw new HTTPError(
          "Could not fetch advertisements from database",
          404
        );

      const notifCount = await prisma.notifications.count({
        where: {
          userId: user.id,
          readStatus: false,
        },
      });

      //track session
      await trackActiveSession(user.id);

      response.unreadNotificationCount = notifCount;
      response.advertisements = getAllAdvertisements;
    }
    return response;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getTags = async () => {
  try {
    const allTags = await prisma.tags.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    if (!allTags)
      return {
        success: true,
        data: [],
      };
    return {
      success: true,
      data: allTags.map((tag) => tag.name),
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const updateAdvertisementById = async (data: IEditAdvertisementData) => {
  try {
    const {
      advId,
      file,
      advName,
      advType,
      advPosition,
      isActive,
      isSubscribed,
      priority,
      advRedirectLink,
      advStart,
      advEnd,
      advTimeLimit,
    } = data;

    let adv_URL;

    //1. Find existing advertisement
    const adv_to_update = await prisma.advertisement.findFirst({
      where: {
        id: advId,
      },
    });

    if (!adv_to_update) {
      throw new HTTPError(`advertisement not found`, 404);
    }
    //2. delete and reupload the file from db and aws

    if (file) {
      await deleteFromS3(adv_to_update.advSourceUrl, "advertisement");

      adv_URL = await renameAndUploadCMSImage(file, "advertisement");
    } else {
      adv_URL = adv_to_update.advSourceUrl;
    }

    //3. update data in db
    const updatedIsActive = isActive
      ? isActive === "true"
      : adv_to_update.isActive;
    const updatedIsSubscribed = isSubscribed
      ? isSubscribed === "true"
      : adv_to_update.isSubscribed;

    const updateAdvertisementData = await prisma.advertisement.update({
      where: {
        id: advId,
      },
      data: {
        advName,
        advPosition,
        advType,
        isActive: updatedIsActive,
        isSubscribed: updatedIsSubscribed,
        priority: priority ? parseInt(priority) : adv_to_update.priority,
        advRedirectLink,
        advSourceUrl: adv_URL,
        advStart: advStart ? new Date(advStart) : adv_to_update.advStart,
        advEnd: advEnd ? new Date(advEnd) : adv_to_update.advEnd,
        advTimeLimit: advTimeLimit
          ? parseInt(advTimeLimit)
          : adv_to_update.advTimeLimit,
      },
    });

    if (!updateAdvertisementData)
      throw new HTTPError(`Could not update advertisement data in db`, 500);

    return {
      success: true,
      message: "advertisement was edited successfully",
      updatedAdvertisement: updateAdvertisementData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const deleteAdvertisements = async (advId: string) => {
  try {
    const advs = advId.split(",");

    const advertisements = await prisma.advertisement.findMany({
      where: {
        id: {
          in: advs.map((adv) => parseInt(adv)),
        },
      },
    });
    if (!advertisements || advertisements.length != advs.length)
      throw new HTTPError(`Could not find advertisement`, 404);

    const deleteMultple = await Promise.all(
      advertisements.map(async (advertisement) => {
        // decode filename into actual filename by removing the url encoded values

        await deleteFromS3(advertisement.advSourceUrl, "advertisement");

        const deleteAdv = await prisma.advertisement.delete({
          where: {
            id: advertisement.id,
          },
        });

        if (!deleteAdv)
          throw new HTTPError(`Could not delete data from database`, 500);
      })
    );
    if (!deleteMultple)
      throw new HTTPError("Could not delete all advertisement(s)", 500);
    return {
      success: true,
      message: "advertisement(s) deleted successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//FACILITIES
export const createNewFacilities = async (
  admin: adminTokenData,
  data: IFacilityType
) => {
  try {
    const {
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
    } = data;

    // const findPhone = await prisma.facility.findUnique({
    //   where: {
    //     facPhoneNumber,
    //   },
    // });
    // if (findPhone) {
    //   throw new HTTPError(
    //     "Facility with this contact number already exists",
    //     422
    //   );
    // }

    //geoloction
    const { lat, lng } = await getCoordinatesFromAddress(
      facAddress,
      facPincode
    );

    const facImageURL = await renameAndUploadCMSImage(file, "facilities");

    const addFacility = await prisma.facility.create({
      data: {
        facPrimaryName,
        facSecondaryName,
        facPhoneNumber,
        facAddress,
        facPincode,
        facSpeciality,
        facType,
        isActive: isActive === "true",
        facImageURL,
        lat,
        long: lng,
        updatedBy: admin.emailId,
        additionalAddress,
        openTime,
        closeTime
      },
    });
    if (!addFacility) throw new HTTPError("Could not add new video", 500);

    return {
      success: true,
      message: "Facility was added successfully",
      video: addFacility,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
export const getAllFacilities = async (
  user: ITokenData | adminTokenData,
  queryParams: IGetFacility
) => {
  try {
    if (!user) throw new HTTPError("Unauthorised", 401);
    let getAllFacilities;
    const filters: any = {};
    const { search, id } = queryParams;
    if (isAdminTokenData(user)) {
      // user is of type AdminTokenData

      const searchFilter = await buildSearchFilter(search, "facility");

      const facilityId = normalizeId(id);

      if (facilityId) {
        filters.id = parseInt(facilityId.toString());
      }

      getAllFacilities = await getAllAdminFacilities(
        filters,
        searchFilter,
        queryParams
      );

      const totalRecords = await prisma.facility.count();

      return {
        success: true,
        data: getAllFacilities,
        totalRecords: totalRecords,
      };
    } else {
      // user is of type TokenData
      //1. find user
      const findUser = await fetchUserFirst(user.id);

      //2. set filters (if any)
      const searchFilter = await buildSearchFilter(search, "facility");

      //3. get facilities

      // Combine the results
      const { facilitiesMatchingPincode, totalRecords } =
        await getAllUserFacilities(searchFilter, queryParams, findUser);
      return {
        success: true,
        Facilities: facilitiesMatchingPincode,
        totalRecords,
      };
    }
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const updateFacilitiesById = async (data: IEditFacilityType) => {
  try {
    const {
      id,
      facPrimaryName,
      facSecondaryName,
      facPhoneNumber,
      facAddress,
      facPincode,
      facSpeciality,
      facType,
      isActive,
      file,
      additionalAddress,
      openTime,
      closeTime
    } = data;
    let facImageURL;
    let lat = data.lat;
    let lng = data.lng;

    const findFacility = await prisma.facility.findFirst({
      where: {
        id,
      },
    });

    if (!findFacility) throw new HTTPError("facility to edit not found", 404);
    // const findPhone = await prisma.facility.findUnique({
    //   where: {
    //     facPhoneNumber,
    //     NOT: {
    //       id,
    //     },
    //   },
    // });
    // if (findPhone) {
    //   throw new HTTPError(
    //     "Facility with this contact number already exists",
    //     422
    //   );
    // }

    // If address and pincode are provided, recalculates coordinates
    if (facAddress && facPincode) {
      ({ lat, lng } = await getCoordinatesFromAddress(facAddress, facPincode));
    }

    const active =
      isActive !== undefined ? isActive === "true" : findFacility.isActive;

    if (file) {
      await deleteFromS3(findFacility.facImageURL, "facilities");

      facImageURL = await renameAndUploadCMSImage(file, "facilities");
    } else {
      facImageURL = findFacility.facImageURL;
    }

    const editFacility = await prisma.facility.update({
      where: {
        id,
      },
      data: {
        facPrimaryName,
        facSecondaryName,
        facPhoneNumber,
        facAddress,
        facPincode,
        facSpeciality,
        facType,
        isActive: active,
        facImageURL,
        lat: lat ?? findFacility.lat,
        long: lng ?? findFacility.long,
        additionalAddress,
        openTime,
        closeTime
      },
    });
    if (!editFacility) throw new HTTPError("Could not edit facility", 500);

    return {
      success: true,
      message: "facility was added edited successfully",
      facility: editFacility,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const deleteFacilities = async (facId: string) => {
  try {
    if (!facId) throw new HTTPError("Required fields are missing", 400);
    const facs = facId.split(",");

    //find facility
    const findFacilities = await prisma.facility.findMany({
      where: {
        id: {
          in: facs.map((fac) => parseInt(fac)),
        },
      },
    });
    if (!findFacilities || findFacilities.length != facs.length)
      throw new HTTPError("Could not find facility", 404);

    let errors = [];

    for (const facility of findFacilities) {
      // decode filename into actual filename by removing the url encoded values

      await deleteFromS3(facility.facImageURL, "facilities");
      const deleteFacilities = await prisma.facility.delete({
        where: {
          id: facility.id,
        },
      });
      if (!deleteFacilities) errors.push(facility.id);
    }

    return {
      success: true,
      message: "Facilities were deleted successfully",
      failedToDel: errors,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getAllAdminContent = async (user: adminTokenData) => {
  try {
    if (!user) throw new HTTPError("Unauthorised", 401);
    //get first 3

    const [advertisements, videos, facs, reels, stories, blogs] =
      await Promise.all([
        getAllAdvertisements(user, {
          limit: 3,
        }),
        getAllVideos(user, { limit: 3, vidType: "video" }),
        getAllFacilities(user, { limit: 3 }),
        getAllVideos(user, { limit: 3, vidType: "reel" }),
        getAllStories(user, { limit: 3 }),
        getBlogService({ limit: 3 }, user),
      ]);
    if (!videos) {
      throw new HTTPError("could not get all videos.", 500);
    }
    if (!facs) {
      throw new HTTPError("could not get all facilities.", 500);
    }
    if (!reels) {
      throw new HTTPError("could not get all reels.", 500);
    }
    return {
      success: true,
      data: {
        advertisements: advertisements.data,
        videos: videos.data ?? [],
        facs: facs.data ?? [],
        reels: reels.data ?? [],
        stories: stories.data ?? [],
        blogs: blogs.data ?? [],
      },
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//BLOGS.

export const createBlogService = async (data: ICreateBlogInput) => {
  try {
    const { title, status, author, updatedBy, content, readTime, tags, file } =
      data;
    //check for title.
    const unique_title = await prisma.blog.findFirst({
      where: {
        title,
      },
    });
    if (unique_title) {
      throw new HTTPError("Title already exists", 500);
    }
    //upload to s3.
    const blog_thumnail_url = await renameAndUploadCMSImage(file, "blog");
    if (!blog_thumnail_url) {
      throw new HTTPError("failed to upload image", 500);
    }
    //do tags thing.
    let tagIds: number[] = [];
    if (tags?.length) {
      tagIds = await createTag(tags);
    }
    //update db.
    const uploadBlogResponse = await prisma.blog.create({
      data: {
        title,
        isActive: status,
        author,
        updatedBy,
        thumbnail: blog_thumnail_url,
        content,
        readTime,
        tags: {
          connect: tagIds.map((tag) => ({
            id: tag,
          })),
        },
      },
    });
    if (!uploadBlogResponse) {
      throw new HTTPError("could not add new blog", 500);
    }
    return {
      success: true,
      message: "Blog added successfully.",
      blog: uploadBlogResponse,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
export const getBlogService = async (
  params: IGetContent,
  user: ITokenData | adminTokenData
) => {
  try {
    const {
      search,
      id,
      page,
      limit = 10,
      sortByField,
      sortByOrder,
      type,
    } = params;
    const skip = generateSkip(limit, page);
    const take = limit ?? undefined;

    const filters: any = {};

    const sortByFilters: { [key: string]: any } = {};
    if (sortByField && sortByOrder) {
      sortByFilters[sortByField] = sortByOrder;
    }

    const searchFilter = await buildSearchFilter(search, "blog");
    if (id) filters.id = id;

    if (!isAdminTokenData(user)) {
      // user is of type userTokenData
      filters.isActive = true;

      await trackActiveSession(user.id);
    }

    const totalRecords = await prisma.blog.count({
      where: {
        ...filters,
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
    });

    // Calculate correct page for non-admin infinite scroll
    let newPageValue = page ?? 1;

    if (type == "all" && !search && !isAdminTokenData(user)) {
      const totalPages = Math.ceil(totalRecords / (limit || 10));
      newPageValue = (page ?? 1) % totalPages || totalPages;
    }

    const getBlog = await prisma.blog.findMany({
      where: {
        ...filters,
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
      orderBy: [{ ...sortByFilters }, { id: "asc" }],
      skip: ((newPageValue || 1) - 1) * (limit ?? 0),
      take: take,
      include: {
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!getBlog) {
      throw new HTTPError("could not get blog", 500);
    }
    const formattedBlogs = isAdminTokenData(user)
      ? getBlog.map((blog, index) => {
        const { tags, ...filteredData } = blog;
        return {
          serialNumber: index + 1 + skip,
          ...filteredData,
          tags: tags.map((tag) => tag.name),
        };
      })
      : getBlog;
    return {
      success: true,
      data: formattedBlogs,
      totalRecords: totalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const updateBlogService = async (data: IEditBlogInput) => {
  try {
    const {
      id,
      title,
      author,
      updatedBy,
      content,
      readTime,
      tags,
      status,
      file,
    } = data;

    const [blog_to_update, findTitle] = await Promise.all([
      prisma.blog.findFirst({ where: { id } }),
      title
        ? prisma.blog.findFirst({
          where: {
            title,
            id: { not: id },
          },
        })
        : Promise.resolve(null),
    ]);

    if (!blog_to_update) {
      throw new HTTPError("Blog you are trying to edit does not exist", 404);
    }

    if (findTitle) {
      throw new HTTPError("Title already exists.", 500);
    }

    let thumbnail_url = blog_to_update.thumbnail;
    if (file) {
      //delete previous file
      //extract name from url.
      const extracted_file_name = thumbnail_url.substring(
        thumbnail_url.lastIndexOf("/") + 1
      );
      //delete the file from s3.
      await deleteFile(extracted_file_name, "blog");

      //upload new file.
      const blog_thumnail_url = await renameAndUploadCMSImage(file, "blog");
      if (!blog_thumnail_url) {
        throw new HTTPError("failed to upload image", 500);
      }
      thumbnail_url = blog_thumnail_url;
    }
    //do tags thing.
    let tagIds: number[] = [];
    if (tags?.length) {
      tagIds = await createTag(tags);
    }
    const updatedBlog = await prisma.blog.update({
      where: {
        id,
      },
      data: {
        title,
        author,
        updatedBy,
        content,
        readTime,
        thumbnail: thumbnail_url,
        isActive: status,
        tags: {
          set: [],
          connect: tagIds.map((tag) => ({
            id: tag,
          })),
        },
      },
    });

    if (!updatedBlog) {
      throw new HTTPError("could not add new blog", 500);
    }

    return {
      success: true,
      message: "Blog updated successfully.",
      blog: updatedBlog,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
export const deleteBlogService = async (id: number) => {
  try {
    console.log(typeof id, id);
    const find_id = await prisma.blog.findFirst({
      where: {
        id,
      },
    });
    if (!find_id) {
      throw new HTTPError("could not find blog id", 404);
    }
    const deleted_data = await prisma.blog.delete({
      where: {
        id,
      },
    });
    if (!deleted_data) {
      throw new HTTPError("error in deleting blog data", 500);
    }
    return {
      success: true,
      message: "Blog data deleted successfully.",
      blog: deleted_data,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//FEEDBACK AND COMPLAINTS
export const getAllMessages = async (
  admin: adminTokenData,
  params: IGetCommon
) => {
  try {
    if (!admin) throw new HTTPError("Unauthorised", 401);
    const { limit, page, filter } = params;
    const superjson = await import("superjson");

    // Filter conditions
    let filterConditions: any = {};
    if (filter === "Read") filterConditions.isRead = true;
    else if (filter === "Unread") filterConditions.isRead = false;
    else if (filter === "Resolved") filterConditions.isResolved = true;
    else if (filter === "Unresolved") filterConditions.isResolved = false;

    //get complaints
    const getComplaints = await prisma.userMessage.findMany({
      where: {
        messageType: "complaint",
        ...filterConditions,
      },
      select: {
        id: true,
        message: true,
        messageType: true,
        emailId: true,
        reply: true,
        replyBy: true,
        createdAt: true,
        updatedAt: true,
        isReplied: true,
        complaintId: true,
        isRead: true,
        isReopened: true,
        isResolved: true,
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        messageImages: {
          select: {
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: page ? (page - 1) * (limit ?? 10) : 0,
      take: limit ?? 10,
    });
    const formattedComplaints = getComplaints.map((complaint) => ({
      ...complaint,
      messageImages: complaint.messageImages.map((img) => img.imageUrl),
    }));
    //get feedback
    const getFeedback = await prisma.userMessage.findMany({
      where: {
        messageType: "feedback",
        ...filterConditions,
      },
      select: {
        id: true,
        message: true,
        messageType: true,
        emailId: true,
        reply: true,
        replyBy: true,
        createdAt: true,
        updatedAt: true,
        isRead: true,
        isReplied: true,
        isResolved: true,
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        messageImages: {
          select: {
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: page && limit ? (page - 1) * limit : 0,
      take: limit ?? 10,
    });

    const formattedFeedbacks = getFeedback.map((feedback) => ({
      ...feedback,
      messageImages: feedback.messageImages.map((img) => img.imageUrl),
    }));

    const complaintsCount = await prisma.userMessage.count({
      where: {
        messageType: "complaint",
        ...filterConditions,
      },
    });
    const feedbackCount = await prisma.userMessage.count({
      where: {
        messageType: "feedback",
        ...filterConditions,
      },
    });

    const totalRecords: any = {};
    totalRecords.complaint = complaintsCount;
    totalRecords.feedback = feedbackCount;

    return {
      success: true,
      complaints: superjson.serialize(formattedComplaints),
      feedbacks: formattedFeedbacks,
      totalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const complaintReplyById = async (
  admin: adminTokenData,
  data: { complaintId: string; reply: string }
) => {
  try {
    if (!admin) throw new HTTPError("Unauthorised", 401);

    const { complaintId, reply } = data;

    //1. Find Complaint
    const getComplaint = await prisma.userMessage.findFirst({
      where: {
        id: parseInt(complaintId),
        messageType: "complaint",
      },
      include: {
        user: true,
      },
    });

    if (!getComplaint) throw new HTTPError("Could not find complaint", 404);
    if (getComplaint.isReplied)
      throw new HTTPError(
        `Message has been already replied to by admin user: ${getComplaint.replyBy}`,
        422
      );

    //2. Note reply in database
    const storeReply = await prisma.userMessage.update({
      where: {
        id: getComplaint.id,
      },
      data: {
        reply,
        replyBy: admin.emailId,
        isReplied: true,
      },
    });
    if (!storeReply)
      throw new HTTPError("Could not record admin reply in database", 500);

    //3. send email with reply to grieved user
    const sendReplyToUser = await emailingService({
      email_id: getComplaint.emailId ?? "",
      data: {
        user_complaintId: getComplaint.complaintId,
        admin_reply: reply,
        name: getComplaint.user?.fullName,
      },
      template: complaintReply,
      subject: `Your complaint No. ${getComplaint.complaintId}`,
      choice: "complaint_reply",
    });
    if (!sendReplyToUser) throw new HTTPError("Invalid Email Address", 400);

    return {
      success: true,
      isReplied: true,
      reply: storeReply.reply,
      repliedBy: storeReply.replyBy,

      message: "Reply sent Successfully to Concerned User",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getComplaintFeedbackById = async (
  admin: adminTokenData,
  data: {
    id: string;
    type: MessageType;
    isRead: boolean;
  },
  params: ParsedQs
) => {
  try {
    if (!admin) throw new HTTPError("Unauthorised", 401);
    const filters: any = {};
    const { id, type, isRead } = data;
    const { isResolved, isReopened } = params;

    const user = await prisma.dashboardUser.findFirst({
      where: {
        emailId: admin.emailId,
      },
    });

    if (isResolved) {
      filters.isResolved = isResolved;
      filters.resolvedBy = user?.fullName;
      filters.resolvedAt = Date.now();
    }
    if (isReopened) {
      filters.isReopened = isReopened;
      filters.resolvedBy = user?.fullName;
      filters.resolvedAt = Date.now();
    }
    //TOBEDONE resolved at should be greater than current timestamp TOBEDONE

    //2. mark as read in database
    const markAsRead = await prisma.userMessage.update({
      where: {
        id: parseInt(id),
      },
      data: {
        isRead,
      },
    });
    if (!markAsRead) {
      throw new HTTPError("Could not update complaint as read in db", 500);
    }

    //find the role of admin
    if (
      (user?.role === "admin" && isReopened) ||
      (user?.role === "auditor" && (isReopened || isResolved))
    ) {
      throw new HTTPError(
        "You cannot mark complaint as reopend or resolved",
        401
      );
    }

    //update complaint as resolved or reopened
    const markAsResolved = await prisma.userMessage.update({
      where: {
        id: parseInt(id),
      },
      data: {
        ...filters,
      },
    });
    if (!markAsResolved) {
      throw new HTTPError("Could not record admin reply in database", 500);
    }

    const getUserMessage = await prisma.userMessage.findFirst({
      where: {
        id: parseInt(id),
        messageType: type,
      },
      select: {
        isReplied: true,
        replyBy: true,
        reply: true,
        id: true,
        isReopened: true,
        isResolved: true,
        resolvedAt: true,
        resolvedBy: true,
      },
    });
    if (!getUserMessage)
      throw new HTTPError("Could not find complaint/feedback", 404);

    return {
      success: true,
      data: getUserMessage,
      message: "Marked message/feedback as read",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const markResolveComplain = async (
  admin: adminTokenData,
  complainId: string,
  type: MessageType,
  toResolve: boolean
) => {
  try {
    await getUserMessageQuery(parseInt(complainId), type);
    if (admin.role == "admin") {
      //if already resolved, then nothing to do,
      //if not resolved, then do.
      if (toResolve === false) {
        throw new HTTPError("Sorry admin can't unresolve complaint.", 401);
      }

      const getAdminName = await getAdminUserName(admin);
      const markAsResolved = await prisma.userMessage.update({
        where: {
          id: parseInt(complainId),
        },
        data: {
          isResolved: true,
          resolvedBy: getAdminName.fullName,
          resolvedAt: new Date(Date.now()),
        },
      });
      if (!markAsResolved) {
        throw new HTTPError("Could not record mark as resolve by admin.", 500);
      }

      return {
        success: true,
        data: {
          isResolved: markAsResolved.isResolved,
          resolvedBy: markAsResolved.resolvedBy,
          resolvedAt: markAsResolved.resolvedAt,
        },
        message: "Marked complaint as resolve by admin.",
      };
    }
    //else - we know its super admin
    //if resolved, then unresolve, mark reopened as true, update isresolved,resolveby,resolveat,
    //if not resolved, then resolve.

    //toResolve= true, means x wants to resolve the complaint.
    let data: any = {};
    if (toResolve) {
      data = {
        isResolved: true,
        resolvedBy: admin.role,
        resolvedAt: new Date(Date.now()),
      };
    } else {
      data = {
        isResolved: false,
        isReopened: true,
        resolvedBy: admin.role,
        resolvedAt: new Date(Date.now()),
      };
    }
    const updateUserMessage = await updateUserMessageSuperAdmin(
      parseInt(complainId),
      type,
      data
    );

    return {
      success: true,
      data: updateUserMessage,
      message: `Successfully ${toResolve ? "resolved" : "reopened"} by superAdmin.`,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getAggregateCmsUser = async (
  user: ITokenData,
  queryParams: IGetContent
) => {
  //videos=reels,blogs,stories
  try {
    const { type, isFiltered } = queryParams;

    //if type == all, then return all data (batch-wise shuffled)
    let getAllContent;
    switch (type) {
      case "all":
        if (isFiltered) {
          getAllContent = await getFilteredAggregateContent(user, queryParams);
        } else {
          const [stories, reels, videos, blogs] = await Promise.all([
            getAllStories(user, queryParams),
            getAllVideos(user, {
              ...queryParams,
              vidType: "reel",
            }),
            getAllVideos(user, {
              ...queryParams,
              vidType: "video",
            }),
            getBlogService(queryParams, user),
          ]);
          getAllContent = {
            story: stories.data,
            videos: videos.data,
            reels: reels.data,
            blogs: blogs.data,
          };
        }

        break;
      case "video": {
        const { data, totalRecords } = await getAllVideos(user, {
          ...queryParams,
          vidType: "video",
        });
        getAllContent = {
          videos: data,
          totalRecords,
        };
        break;
      }
      case "reel": {
        const { data, totalRecords } = await getAllVideos(user, {
          ...queryParams,
          vidType: "reel",
        });
        getAllContent = {
          reels: data,
          totalRecords,
        };
        break;
      }
      case "story": {
        const { data, totalRecords } = await getAllStories(user, queryParams);
        getAllContent = {
          story: data,
          totalRecords,
        };
        break;
      }
      case "blog": {
        //get all blogs API call
        const { data, totalRecords } = await getBlogService(queryParams, user);
        getAllContent = {
          blogs: data,
          totalRecords,
        };
        break;
      }
    }

    //track session
    await trackActiveSession(user.id);

    return {
      success: true,
      data: getAllContent,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

const getFilteredAggregateContent = async (
  user: ITokenData,
  queryParams: IGetContent
) => {
  const { page, search, id, type } = queryParams;

  const limitValues = {
    video: 5,
    reel: 4,
    blog: 4,
    story: 1,
  };
  let defaultVideo: any = null;
  // if (page == 1 && !search) {
  //   const defVideo = await prisma.video.findFirst({
  //     where: {
  //       vidType: "default_video",
  //     },
  //     include: {
  //       tags: {
  //         select: {
  //           id: true,
  //           name: true,
  //         },
  //       },
  //       vimeoDetails: true,
  //       // dashboardUser: {
  //       //   select: {
  //       //     fullName: true,
  //       //   },
  //       // },
  //     },
  //   });
  //   if(defVideo!=null){
  //     const emailIds= [defVideo.updatedBy]
  //     const authorMap = await getAuthors(emailIds)
  //     // Attach author info without async
  //     const { updatedBy, ...remainder } = defVideo;
  //     defaultVideo ={
  //         ...remainder,
  //         dashboardUser: {
  //           fullName: authorMap.get(updatedBy) || "Team Thito",
  //         },
  //       };
  //   }
  // }
  if (page === 1 && !search) {
    const defVideo = await prisma.video.findFirst({
      where: {
        vidType: "default_video",
      },
      select: {
        id: true,
        title: true,
        updatedBy: true,
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
        vimeoDetails: true,
      },
    });

    if (defVideo) {
      const authorMap = await getAuthors([defVideo.updatedBy]);

      defaultVideo = {
        ...defVideo,
        dashboardUser: {
          fullName:
            authorMap.get(defVideo.updatedBy) ?? "Team Thito",
        },
      };
    }
  }

  // const [videos, reels, blogs, stories] = await Promise.all([
  //   getAllVideos(user, {
  //     limit: limitValues.video,
  //     page,
  //     search,
  //     id,
  //     vidType: "video",
  //     type,
  //   }),
  //   getAllVideos(user, {
  //     limit: limitValues.reel,
  //     page,
  //     search,
  //     id,
  //     vidType: "reel",
  //     type,
  //   }),
  //   getBlogService(
  //     {
  //       page,
  //       search,
  //       id,
  //       limit: limitValues.blog,
  //       type,
  //     },
  //     user
  //   ),
  //   getAllStories(user, { page, search, id, limit: limitValues.story, type }),
  // ]);

  // 🔹 Controlled concurrency (reduces CPU spikes under load)
  const videosPromise = getAllVideos(user, {
    limit: limitValues.video,
    page,
    search,
    id,
    vidType: "video",
    type,
  });

  const reelsPromise = getAllVideos(user, {
    limit: limitValues.reel,
    page,
    search,
    id,
    vidType: "reel",
    type,
  });

  const blogsPromise = getBlogService(
    {
      page,
      search,
      id,
      limit: limitValues.blog,
      type,
    },
    user
  );

  const storiesPromise = getAllStories(user, {
    page,
    search,
    id,
    limit: limitValues.story,
    type,
  });

  // 🔹 Await in parallel but after promises are created
  const [videos, reels, blogs, stories] = await Promise.all([
    videosPromise,
    reelsPromise,
    blogsPromise,
    storiesPromise,
  ]);

  return {
    defaultVideo,
    reels: reels.data,
    story: stories.data,
    videos: videos.data,
    blogs: blogs.data,
  };
};

const getAuthors = async (emailIds: string[]) => {
  // Fetch all authors in ONE query
  const authors = await prisma.dashboardUser.findMany({
    where: {
      emailId: { in: emailIds },
    },
    select: {
      emailId: true,
      fullName: true,
    },
  });

  // Convert to lookup map
  const authorMap = new Map(
    authors.map((author) => [author.emailId, author.fullName])
  );
  return authorMap
}
