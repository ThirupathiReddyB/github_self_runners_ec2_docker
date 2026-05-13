import jwt, { JwtPayload } from "jsonwebtoken";
import HTTPError from "../HttpError";
import prisma from "../../prisma";
import { adminTokenData } from "../DataTypes/types.admin";
import { Role } from "../../../prisma/generated/prisma/client";
import { ITokenData } from "../DataTypes/types.user";

// Decode a JWT token and return its payload
export const decodeToken = (token: string): JwtPayload => {
  const decodedToken = jwt.decode(token) as JwtPayload;
  if (!decodedToken) {
    throw new HTTPError("Invalid Token.", 401);
  }
  return decodedToken;
};

// Fetch the user associated with the decoded token from the database
export const fetchDashboardUser = async (decodedToken: JwtPayload) => {
  const dashboardUser = await prisma.dashboardUser.findFirst({
    where: { id: decodedToken["id"] },
  });
  if (!dashboardUser) {
    throw new HTTPError("User not found.", 404);
  }
  return dashboardUser;
};

export const getAdminUserName = async (admin: adminTokenData) => {
  const getAdminName = await prisma.dashboardUser.findUniqueOrThrow({
    where: {
      id: parseInt(admin.id),
      role: admin.role as Role,
    },
    select: {
      fullName: true,
    },
  });
  if (!getAdminName) {
    throw new HTTPError("Failed to find admin.", 404);
  }
  return getAdminName;
};

export function isAdminTokenData(
  user: ITokenData | adminTokenData
): user is adminTokenData {
  return (user as adminTokenData).role !== undefined;
}
