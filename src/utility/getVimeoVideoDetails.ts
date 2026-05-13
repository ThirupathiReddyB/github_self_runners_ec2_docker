import axios from "axios";
import HTTPError from "./HttpError";
import prisma from "../prisma";




export const getVimeoVideo = async (videoId: number) => {
  try {
    const response = await axios.get(
      `https://api.vimeo.com/videos/${videoId}?fields=uri,link,duration,play.hls.link,pictures.base_link,files`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error instanceof HTTPError) {
      throw new HTTPError(error.message, error.code);
    } else {
      const data = {
        fieldName: "vidSourceUrl",
        message: "Video URL does not exist on vimeo",
      };
      if (error.response.status === 404) {
        throw new HTTPError(data, 400);
      } else {
        console.log(error);
        throw new HTTPError("Something went wrong", error.code);
      }
    }
  }
};

export const getVimeoVideoThumbnail = async () => {
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
      updateThumbnail.push(response);
    }
    if (updateThumbnail.length === 0) {
      return null;
    }
    const videoLinks = updateThumbnail.map((thumbnail) => thumbnail.link);
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

  } catch (error) {
    console.error("Error fetching video duration:", error);
    throw error;
  }
};

