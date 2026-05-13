import prisma from "../prisma";
import HTTPError from "./HttpError";

export const fetchHealthRecord = async (userId:string) => {
    const healthData = await prisma.healthRecord.findFirst({
        where: {
          forDependantId: userId,
        },
      });

      if (!healthData)
        throw new HTTPError("Could Not fetch updated health data", 404);

    return healthData;
}

export const fetchHealthRecordForUserId = async (userId:string) => {
    const healthData = await prisma.healthRecord.findFirst({
      where: {
        forUserId: userId,
      },
    });
    if (!healthData)
        throw new HTTPError("Could Not fetch updated health data", 404);
    
    return healthData;
}