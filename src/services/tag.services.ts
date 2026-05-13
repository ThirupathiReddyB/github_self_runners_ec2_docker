import prisma from "../prisma";
import { handleError } from "../utility/Error";

export const createTag = async (tags: string[]) => {
  try {
    //convert all tags to lowercase
    const tagsLower = tags.map((tag) => {
      const loweredCase = tag.toLowerCase();
      return loweredCase.replace(/[^a-zA-Z0-9._-]/g, "-");
    });

    // Step 1: Fetch existing tags in a single query
    const existingTags = await prisma.tags.findMany({
      where: { name: { in: tagsLower } },
      select: { id: true, name: true },
    });

    const existingTagMap = new Map(
      existingTags.map((tag) => [tag.name, tag.id])
    ); // Map for quick lookup
    const newTags = tagsLower.filter((tag) => !existingTagMap.has(tag));

    // Step 2: Bulk insert new tags if any are missing
    if (newTags.length > 0) {
      await prisma.tags.createMany({
        data: newTags.map((name) => ({ name })),
        skipDuplicates: true,
      });
    }

    // Step 3: Fetch IDs of all requested tags in a single query (instead of calling findMany twice)
    const allTags = await prisma.tags.findMany({
      where: { name: { in: tagsLower } },
      select: { id: true },
    });

    return allTags.map((tag) => tag.id);
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

//!Developer API
export const deleteTag = async (tags: string[]) => {
  try {
    //find IDs of all valid tags
    const findTags = await prisma.tags.findMany({
      where: {
        name: {
          in: tags,
        },
      },
      select: {
        id: true,
      },
    });
    if (findTags.length)
      await prisma.tags.deleteMany({
        where: {
          id: {
            in: findTags.map((tag) => tag.id),
          },
        },
      });
  } catch (error: unknown) {
    throw handleError(error);
  }
};
