import prisma from "../prisma";
import HTTPError from "./HttpError";

export const deleteDependantFromTable = async (userId:string) => {
    const deleteDependant = await prisma.dependant.delete({
      where: { id: userId.toLowerCase() },
    });
    if (!deleteDependant)
        throw new HTTPError("could not remove dependant from table", 500);
    return deleteDependant;
}