import { addMinutes, isAfter } from "date-fns";
import prisma from "../../prisma";
import { getVimeoVideo } from "../getVimeoVideoDetails";

import { invalidAttempts } from "../../constants/data";

// Function to unblock the user after 30 minutes
export async function unblockUsers() {
  try {
    //user unblock
    const users = await prisma.users.findMany({
      where: {
        isBlocked: true,
      },
      include: {
        blockReasons: {
          where: {
            blockReason: "auto-block",
            blockedBy: "app",
          },
        },
      },
    });

    const now = new Date();

    for (const user of users) {
      if (user.blockedAt && isAfter(now, addMinutes(user.blockedAt, 30))) {
        await prisma.users.update({
          where: {
            id: user.id,
          },
          data: {
            isBlocked: false,
            blockedAt: null, // Clear the blocked timestamp
            wrongLoginAttempts: invalidAttempts,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error deleting old non-registered users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

//get vimeo videos from vimeo
export async function vimeoVideos() {
  try {
    const getTotalRecords = await getVimeoVideo(1);
    const totalPages = Math.ceil(getTotalRecords.data.total / 100);
   
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      await getVimeoVideo(currentPage);
     
    }

     } catch (error) {
    console.error("Error fetching vimeo videos from vimeo platform", error);
  } finally {
    await prisma.$disconnect();
  }
}


