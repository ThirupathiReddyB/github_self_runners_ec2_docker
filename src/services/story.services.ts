import prisma from "../prisma";
import { trackActiveSession } from "../utility/changeHistoryTrackFunction";
import { adminTokenData } from "../utility/DataTypes/types.admin";
import { IGetContent } from "../utility/DataTypes/types.contentManagement";
import { ICreateStory } from "../utility/DataTypes/types.story";
import { ITokenData } from "../utility/DataTypes/types.user";
import { handleError } from "../utility/Error";
import { isAdminTokenData } from "../utility/helperFunction/admin.auth.services.helper";
import { buildSearchFilter } from "../utility/helperFunction/contentManagement.services.helper";
import {
  existingStoryTitle,
  findStory,
  handleExistingImages,
  handleNewImages,
} from "../utility/helperFunction/story.services.helpers";
import HTTPError from "../utility/HttpError";
import { createTag } from "./tag.services";

export const storyCommonSelect = {
  id: true,
  createdAt: true,
  title: true,
  isActive: true,
  updatedBy: true,
  tags: {
    select: {
      // id: true,
      name: true,
    },
  },
  storyImage: {
    select: {
      id: true,
      filename: true,
      title: true,
      description: true,
    },
  },
};

export const createUpdateStory = async (
  admin: adminTokenData,
  data: ICreateStory
) => {
  try {
    const {
      id,
      title,
      tags,
      images,
      imageTitles,
      imageDescriptions,
      existingImages,
      existingImageTitles,
      existingImageDescriptions,
    } = data;

    //pre-processing:
    // find story
    // find story with same name
    await Promise.all([findStory(id), existingStoryTitle(title, id)]);

    //get tagIds
    let tagIds: number[] = [];
    if (tags) tagIds = await createTag(tags);

    //process images
    //handle existing images
    await handleExistingImages(
      existingImages ?? [],
      existingImageTitles ?? [],
      existingImageDescriptions ?? [],
      id
    );

    //handle new images
    const imagesData = await handleNewImages(
      images,
      imageTitles,
      imageDescriptions
    );

    //database changes
    const storyData = await prisma.story.upsert({
      where: id ? { id } : { title },
      create: {
        title,
        updatedBy: admin.emailId,
        tags: {
          connect: tagIds.map((tag) => ({
            id: tag,
          })),
        },
        storyImage: {
          createMany: { data: imagesData },
        },
      },
      update: {
        title,
        updatedBy: admin.emailId,
        tags: {
          connect: tagIds.map((tag) => ({
            id: tag,
          })),
        },
        storyImage: {
          createMany: { data: imagesData },
        },
      },
      select: storyCommonSelect,
    });

    if (!storyData) throw new HTTPError("Could not create story", 500);

    return {
      success: true,
      data: storyData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const getAllStories = async (
  user: ITokenData | adminTokenData,
  queryParams: IGetContent
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
    } = queryParams;
    const skip = page && limit ? (page - 1) * limit : 0;
    const take = limit ?? undefined;

    const filters: any = {};

    const sortByFilters: { [key: string]: any } = {};
    if (sortByField && sortByOrder) {
      sortByFilters[sortByField] = sortByOrder;
    }

    const searchFilter = await buildSearchFilter(search, "story");

    if (id) filters.id = id;

    if (!isAdminTokenData(user)) {
      // user is of type userTokenData
      filters.isActive = true;

      await trackActiveSession(user.id);
    }

    const totalRecords = await prisma.story.count({
      where: {
        ...filters,
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
    });

    //total stories = 10 prisma.story.count
    //per page = 5 (limit)
    //page =1 1-5
    //page=2 6-10
    //totalRecords/limit 10/5 = 2
    //page=3 1-5 [] => page=1
    //page=4 []=> page=1

    // Calculate correct page for non-admin infinite scroll
    let newPageValue = page ?? 1;
    if (type == "all" && !search && !isAdminTokenData(user)) {
      const totalPages = Math.ceil(totalRecords / (limit || 1)); // 10/5 = 2

      newPageValue = (page ?? 1) % totalPages || totalPages;
      //newPageValue = 1%2 => 1
      //newPageVlaue = 2%2 => 0 || 2
      //newPageValue 3%2 => 1
      //newPageVlaue = 4%2 => 0 || 2
    }

    const getStories = await prisma.story.findMany({
      where: {
        ...filters,
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
      orderBy: [{ ...sortByFilters }, { id: "asc" }],
      skip: ((newPageValue || 1) - 1) * (limit ?? 0),
      take: take,
      select: storyCommonSelect,
    });
    if (!getStories)
      throw new HTTPError("Could not fetch stories from database", 500);

    const formattedStories = isAdminTokenData(user)
      ? getStories.map((story, index) => {
          const { tags, storyImage, ...filteredData } = story;
          return {
            serialNumber: index + 1 + skip,
            ...filteredData,
            tags: story.tags.map((tag) => tag.name),
            stories: storyImage.map((img) => {
              const { filename, ...filtered } = img;
              return {
                ...filtered,
                source: {
                  uri: filename,
                },
              };
            }),
          };
        })
      : getStories.map((story) => {
          const { storyImage, ...filteredData } = story;
          return {
            ...filteredData,
            stories: storyImage.map((img) => {
              const { filename, ...filtered } = img;
              return {
                ...filtered,
                source: {
                  uri: filename,
                },
              };
            }),
          };
        });

    return {
      success: true,
      data: formattedStories,
      totalRecords: totalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const deleteStory = async (storyId: string) => {
  try {
    const stories = storyId.split(",");

    //find stories to delete
    const findStories = await prisma.story.findMany({
      where: {
        id: {
          in: stories.map((story) => parseInt(story)),
        },
      },
    });
    if (!findStories || findStories.length != stories.length)
      throw new HTTPError(`Could not find stories`, 404);

    const deleteMultiple = findStories.map(async (story) => {
      const delStory = await prisma.story.delete({
        where: {
          id: story.id,
        },
      });
      if (!delStory)
        throw new HTTPError(`Could not delete data from database`, 500);
    });
    if (!deleteMultiple) {
      throw new HTTPError(`Could not delete all story(ies)`, 500);
    }

    return {
      success: true,
      message: `Story(ies) were deleted successfully`,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
