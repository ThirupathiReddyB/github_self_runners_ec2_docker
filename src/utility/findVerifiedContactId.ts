import prisma from "../prisma";

export const findVerifedContactId = async (userId: string) => {
  const data = await prisma.users.findFirst({
    where: {
      id: userId,
    },
    select: {
      verifiedContactId: true,
    },
  });
  return data;
};
