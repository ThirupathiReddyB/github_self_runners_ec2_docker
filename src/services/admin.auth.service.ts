import prisma from "../prisma";
import {
  adminTokenData,
  createAdminAuditorInput,
  createAdminInput,
  role,
  updateAdminAuditorInput,
} from "../utility/DataTypes/types.admin";
import HTTPError from "../utility/HttpError";
import {
  generateAccessTokenAdmin,
  generateRefreshTokenAdmin,
} from "../utility/Tokens";
import crypto from "crypto";
import { StoreOtpInDb, verifyOTPFromDb } from "../utility/OtpStorageInDb";
import { IUpdateData } from "../utility/DataTypes/types.user";
import { trackActiveSession } from "../utility/changeHistoryTrackFunction";
import {
  otp_verification_dashboardUsers,
  otp_verification_dashboardUsers_login,
  successAdminAuditorRegistration,
} from "../templateDesign/DashboardTemplates";
import { Role } from "../../prisma/generated/prisma/client";
import { handleError } from "../utility/Error";
import {
  decodeToken,
  fetchDashboardUser,
} from "../utility/helperFunction/admin.auth.services.helper";
import { checkRefreshToken, extractToken } from "../utility/tokenValidation";
import { getUserByUniqueData } from "../utility/prismaQueries";
import { emailingService } from "../utility/emailService";
import { IGetCommon } from "../utility/DataTypes/types.common";

//login
//check session
export const checkAdminSession = async (data: { emailId: string }) => {
  try {
    const { emailId } = data;

    //check if user exist
    const findUser = await prisma.dashboardUser.findFirst({
      where: {
        emailId: {
          equals: emailId,
          mode: "insensitive",
        },
      },
    });
    if (!findUser) {
      throw new HTTPError("could not find user ", 404);
    }

    //check user session
    const isSessionValid = await prisma.dashboardUser.findFirst({
      where: {
        emailId: {
          equals: emailId,
          mode: "insensitive",
        },
        NOT: {
          currentSessionId: null,
        },
      },
    });
    if (isSessionValid) {
      throw new HTTPError("You are already logged in", 423);
    }
    return {
      success: true,
      message: "You can continue to login",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
//1.send otp
export const createOtpforLogin = async (data: { emailId: string }) => {
  try {
    const { emailId } = data;

    const existingAdmin = await prisma.dashboardUser.findFirst({
      where: {
        emailId: {
          equals: emailId,
          mode: "insensitive",
        },
      },
    });
    if (!existingAdmin) {
      throw new HTTPError(`user with ${emailId} does not exist`, 404); // user already exist throw error
    }

    const storedOtpInDb = await StoreOtpInDb(
      emailId,
      existingAdmin.position,
      existingAdmin.role,
      existingAdmin.fullName,
      otp_verification_dashboardUsers_login,
      "THITO - OTP for login",
      "otp_verification_dashboardUsers_login"
    );

    if (!storedOtpInDb.success) {
      throw new HTTPError("cannot store otp", 204);
    }

    return {
      success: true,
      message: "OTP send successfully!!",
      emailId: emailId,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
//2.verify otp
export const loginDashboardUser = async (data: {
  emailId: string;
  otp: number;
}) => {
  try {
    const { emailId, otp } = data;

    const findUser = await prisma.dashboardUser.findFirst({
      where: {
        emailId: {
          equals: emailId,
          mode: "insensitive",
        },
      },
    });
    if (!findUser) {
      throw new HTTPError(`could not find user with email id ${emailId}`, 404);
    }
    //otp verification
    const verifyUser = await verifyOTPFromDb(emailId, otp);
    if (!verifyUser) {
      throw new HTTPError("cannot verify user: db error", 500);
    }

    //session id generation
    const currentSessionId = crypto.randomBytes(20).toString("hex");
    //token generation
    const { id, role } = findUser;
    const adminData = {
      id,
      emailId,
      role,
      currentSessionId,
    };
    const accessToken = generateAccessTokenAdmin(adminData);
    const refreshToken = generateRefreshTokenAdmin(adminData);
    //adding refresh token to db
    const loggedinAdmin = await prisma.dashboardUser.update({
      data: {
        refreshToken,
        currentSessionId,
      },
      where: {
        id,
        emailId,
      },
    });
    if (!loggedinAdmin) {
      throw new HTTPError("DB Error:could not login user", 500);
    }
    await prisma.dashboardUserOtpStore.delete({
      where: {
        emailId,
      },
    });
    return {
      success: true,
      message: " logged in successfully!!",
      role: findUser.role,
      name: findUser.fullName,
      accessToken: accessToken,
      emailId: findUser.emailId,
      position: findUser.position,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//refresh token
export const generateNewAccessToken = async (token: string) => {
  try {
    // Extract access token from the provided Bearer token
    const accessToken = extractToken(token);

    // Decode access token to get payload
    const decodedToken = decodeToken(accessToken);

    // 3. Find User
    const dashboardUsers = await fetchDashboardUser(decodedToken);

    //check if the session is valid
    if (dashboardUsers.currentSessionId !== decodedToken.currentSessionId) {
      throw new HTTPError("Session invalidated. Please log in again.", 403);
    }

    // 4. Check Refresh Token
    if (decodedToken["exp"] && Date.now() / 1000 >= decodedToken["exp"]) {
      // Access token expired
      const refreshToken = dashboardUsers.refreshToken;
      if (!refreshToken) {
        await prisma.dashboardUser.update({
          where: { id: dashboardUsers.id },
          data: { refreshToken: "", currentSessionId: null },
        });
        throw new HTTPError("Access and refresh tokens expired.", 403);
      }

      const refreshDecodedToken = await checkRefreshToken(refreshToken);

      if (
        dashboardUsers.currentSessionId !== refreshDecodedToken.currentSessionId
      ) {
        await prisma.dashboardUser.update({
          where: { id: dashboardUsers.id },
          data: { refreshToken: "", currentSessionId: null },
        });
        throw new HTTPError("Session invalidated. Please log in again.", 403);
      }
      if (
        refreshDecodedToken["exp"] &&
        Date.now() / 1000 >= refreshDecodedToken["exp"]
      ) {
        // Refresh token also expired
        await prisma.dashboardUser.update({
          where: { id: dashboardUsers.id },
          data: { refreshToken: "", currentSessionId: null },
        });
        throw new HTTPError("Session expired. Please Log in again", 403);
      } else {
        // Generate new access token using refresh token data
        const userData = {
          id: refreshDecodedToken["id"],
          emailId: refreshDecodedToken["emailId"],
          role: refreshDecodedToken["role"],
          currentSessionId: refreshDecodedToken["currentSessionId"],
        };
        const newAccessToken = generateAccessTokenAdmin(userData);

        return {
          success: true,
          refreshToken: newAccessToken,
        };
      }
    } else {
      // Access token still valid
      return {
        success: true,
        refreshToken: accessToken,
      };
    }
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//logout admin
export const logoutAdmin = async (token: adminTokenData) => {
  try {
    const { id, emailId } = token;
    //logout user
    const updateUser = await prisma.dashboardUser.update({
      data: {
        refreshToken: "",
        currentSessionId: null,
      },
      where: {
        id: parseInt(id),
        emailId,
      },
    });

    if (!updateUser) throw new HTTPError("User not found", 404);

    return {
      success: true,
      message: "successfully logged Out",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

// CRUD superAdmin
//create otp for superAdmin
export const createOtpforSuperAdminRegistration = async (
  data: createAdminInput
) => {
  try {
    const { emailId, fullName, position } = data;

    const existingAdmin = await prisma.dashboardUser.findFirst({
      where: {
        emailId: {
          equals: emailId,
          mode: "insensitive",
        },
      },
    });
    if (existingAdmin) {
      throw new HTTPError(`user with ${emailId} already exist`, 400); // user already exist throw error
    }

    const storedOtpInDb = await StoreOtpInDb(
      emailId,
      position,
      "superAdmin" as Role,
      fullName,
      otp_verification_dashboardUsers,
      "OTP for registration in THITO Dashboard",
      "otp_verification_dashboardUsers"
    );

    if (!storedOtpInDb.success) {
      throw new HTTPError("cannot store otp", 204);
    }
    return {
      success: true,
      message: "OTP send successfully!!",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//re-send otp for superAdmin
export const resendOtpforSuperAdminRegistration = async (emailId: string) => {
  try {
    const existingAdmin = await prisma.dashboardUserOtpStore.findFirst({
      where: {
        emailId: {
          equals: emailId,
          mode: "insensitive",
        },
      },
    });
    if (!existingAdmin) {
      throw new HTTPError(`user could not be found`, 404); // user already exist throw error
    }

    const storedOtpInDb = await StoreOtpInDb(
      emailId,
      existingAdmin.position,
      "superAdmin" as Role,
      existingAdmin.fullName,
      otp_verification_dashboardUsers,
      "OTP for registration in THITO Dashboard",
      "otp_verification_dashboardUsers"
    );

    if (!storedOtpInDb.success) {
      throw new HTTPError("cannot store otp", 204);
    }
    return {
      success: true,
      message: "OTP send successfully!!",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//verify otp for superadmin
export const verifyOtpSuperAdmin = async (data: {
  emailId: string;
  otp: number;
}) => {
  try {
    const { emailId, otp } = data;

    const verifyUser = await verifyOTPFromDb(emailId, otp);
    if (!verifyUser) {
      throw new HTTPError("cannot verify user: db error", 500);
    }

    const admin_create = await prisma.dashboardUser.create({
      data: {
        fullName: verifyUser.fullName,
        emailId,
        position: verifyUser.position,
        // password: hashedPassword,
        role: verifyUser.role,
      },
    });
    if (!admin_create) {
      throw new HTTPError("could not create admin", 500);
    }
    await prisma.dashboardUserOtpStore.delete({
      where: {
        emailId,
      },
    });
    let formattedStr =
      verifyUser.role.charAt(0) + verifyUser.role.slice(1).toLowerCase();

    const response = await emailingService({
      email_id: emailId,
      data: { role: formattedStr as role, fullName: verifyUser.fullName },
      subject: "Successful registration in THITO Dashboard",
      template: successAdminAuditorRegistration,
      choice: "successAdminAuditorRegistration",
    });
    if (!response) throw new HTTPError("Invalid Email Address", 400);

    return {
      success: true,
      message: "Super admin created successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
//read Superadmin
export const getSuperAdmin = async () => {
  try {
    const findAdmin = await prisma.dashboardUser.findMany({
      where: {
        // id: adminId,
        role: "superAdmin",
      },
      select: {
        id: true,
        fullName: true,
        emailId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!findAdmin) {
      throw new HTTPError("No Super Admin Found", 404);
    }
    return {
      success: true,
      data: findAdmin,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
//update superAdmin
export const updateSuperAdmin = async (
  data: updateAdminAuditorInput,
  admin: adminTokenData
) => {
  try {
    const adminId = parseInt(admin.id);
    const { fullName, emailId, position } = data;

    const findAdmin = await prisma.dashboardUser.findUnique({
      where: {
        id: adminId,
        role: "superAdmin",
      },
    });
    if (!findAdmin) {
      throw new HTTPError("Could not find superadmin", 404);
    }

    const updateAdmin = await prisma.dashboardUser.update({
      where: {
        id: adminId,
        role: "superAdmin",
      },
      data: {
        fullName,
        emailId,
        position,
      },
    });
    if (!updateAdmin) {
      throw new HTTPError("Failed to update data", 500);
    }
    let formattedStr =
      updateAdmin.role.charAt(0) + updateAdmin.role.slice(1).toLowerCase();

    if (emailId) {
      const response = await emailingService({
        email_id: emailId,
        data: { role: formattedStr as role, fullName: updateAdmin.fullName },
        subject: "Successful registration in THITO Dashboard",
        template: successAdminAuditorRegistration,
        choice: "successAdminAuditorRegistration",
      });
      if (!response) throw new HTTPError("Invalid Email Address", 400);
    }

    return {
      success: true,
      data: "Super admin updated successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};
//delete superadmin
export const deleteSuperAdmin = async (admin: adminTokenData) => {
  try {
    const adminId = parseInt(admin.id);

    const findAdmin = await prisma.dashboardUser.findUnique({
      where: {
        id: adminId,
        role: "superAdmin",
      },
    });
    if (!findAdmin) {
      throw new HTTPError("Could not find superadmin", 404);
    }

    const deleteAdmin = await prisma.dashboardUser.delete({
      where: {
        id: adminId,
        role: "superAdmin",
      },
    });
    if (!deleteAdmin) {
      throw new HTTPError("Failed to update data", 500);
    }

    return {
      success: true,
      data: "Super admin deleted successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//CRUD admin auditor
//create otp for admin & auditor
export const createOtpforAdminAuditor = async (
  data: createAdminAuditorInput
) => {
  try {
    const { emailId, fullName, position, role } = data;

    const existingAdmin = await prisma.dashboardUser.findFirst({
      where: {
        emailId: {
          equals: emailId,
          mode: "insensitive",
        },
      },
    });
    if (existingAdmin) {
      throw new HTTPError(`user with ${emailId} already exist`, 422); // user already exist throw error
    }
    // create otp
    const storedOtpInDb = await StoreOtpInDb(
      emailId,
      position,
      role,
      fullName,
      otp_verification_dashboardUsers,
      "OTP for registration in THITO Dashboard",
      "otp_verification_dashboardUsers"
    );

    if (!storedOtpInDb.success) {
      throw new HTTPError("cannot store otp", 204);
    }

    return {
      success: true,
      message: "OTP send successfully!!",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//resend otp for admin & auditor
export const resendOtpForAdminAuditor = async (emailId: string) => {
  try {
    const existingAdmin = await prisma.dashboardUserOtpStore.findFirst({
      where: {
        emailId: {
          equals: emailId,
          mode: "insensitive",
        },
      },
    });
    if (!existingAdmin) {
      throw new HTTPError(`user not found`, 404); // user already exist throw error
    }
    // create otp
    const storedOtpInDb = await StoreOtpInDb(
      emailId,
      existingAdmin.position,
      existingAdmin.role,
      existingAdmin.fullName,
      otp_verification_dashboardUsers,
      "OTP for registration in THITO Dashboard",
      "otp_verification_dashboardUsers"
    );

    if (!storedOtpInDb.success) {
      throw new HTTPError("cannot store otp", 204);
    }

    return {
      success: true,
      message: "OTP send successfully!!",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//verify otp
export const verifyOtpAdminAuditor = async (data: {
  emailId: string;
  otp: number;
}) => {
  try {
    const { emailId, otp } = data;
    const verifyUser = await verifyOTPFromDb(emailId, otp);
    if (!verifyUser) {
      throw new HTTPError("cannot verify user: db error", 500);
    }

    const admin_create = await prisma.dashboardUser.create({
      data: {
        fullName: verifyUser.fullName,
        emailId,
        position: verifyUser.position,
        // password: hashedPassword,
        role: verifyUser.role,
      },
    });
    if (!admin_create) {
      throw new HTTPError("could not create admin", 500);
    }
    await prisma.dashboardUserOtpStore.delete({
      where: {
        emailId,
      },
    });
    let formattedStr =
      verifyUser.role.charAt(0) + verifyUser.role.slice(1).toLowerCase();

    const response = await emailingService({
      email_id: emailId,
      data: { role: formattedStr as role, fullName: verifyUser.fullName },
      subject: "Successful registration in THITO Dashboard",
      template: successAdminAuditorRegistration,
      choice: "successAdminAuditorRegistration",
    });
    if (!response) throw new HTTPError("Invalid Email Address", 400);

    return {
      success: true,
      message: `${verifyUser.role} created successfully`,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//update admin&auditor
export const updateAdminData = async (
  admin: adminTokenData,
  data: updateAdminAuditorInput,
  id: number
) => {
  try {
    const { fullName, position } = data;
    if (admin.role == "superAdmin") {
      //1. Superadmin is changing admin/ auditor details
      const findAdmin = await prisma.dashboardUser.findUnique({
        where: {
          id,
          OR: [{ role: "admin" }, { role: "auditor" }],
        },
        select: {
          role: true,
        },
      });

      if (!findAdmin) {
        throw new HTTPError("Could not find admin or auditor", 404);
      }

      const updateAdmin = await prisma.dashboardUser.update({
        where: {
          id,
          OR: [{ role: "admin" }, { role: "auditor" }],
        },
        data: {
          fullName,
          position,
        },
      });
      if (!updateAdmin) {
        throw new HTTPError("Failed to update data", 500);
      }
      return {
        success: true,
        data: "admin/auditor updated successfully",
      };
    }

    //2. admin is changing his own details
    const findAdmin = await prisma.dashboardUser.findUnique({
      where: {
        id: parseInt(admin.id.toString()),
        role: "admin",
      },
      select: {
        role: true,
      },
    });
    if (!findAdmin) {
      throw new HTTPError("Could not find admin", 500);
    }

    const updateAdmin = await prisma.dashboardUser.update({
      where: {
        id: parseInt(admin.id.toString()),
        role: "admin",
      },
      data: {
        fullName,
        position,
      },
    });
    if (!updateAdmin) {
      throw new HTTPError("Failed to update data", 500);
    }

    return {
      success: true,
      data: "admin updated successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//getAdminAuditor
export const fetchAdminAuditor = async (params: IGetCommon) => {
  try {
    const { id, page, search, limit, sortByField, sortByOrder } = params;
    const filters: { id?: number } = {};
    const sortByFilters: { [key: string]: any } = {};
    const searchFilter: Array<{}> = [];
    if (sortByField && sortByOrder) {
      sortByFilters[sortByField ] = sortByOrder;
    }
    if (id) {
      filters.id = parseInt(id as string);
    }
    if (search) {
      searchFilter.push(
        { emailId: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
        { position: { contains: search, mode: "insensitive" } }
        // { role: { contains: search, mode: "insensitive" } }
      );
    }

    const fetchedData = await prisma.dashboardUser.findMany({
      where: {
        ...filters,
        AND: [
          { OR: [{ role: "admin" }, { role: "auditor" }] },
          ...(searchFilter.length > 0 ? [{ OR: searchFilter }] : []),
        ],
      },
      orderBy: {
        ...sortByFilters,
      },
      select: {
        id: true,
        fullName: true,
        emailId: true,
        role: true,
        position: true,
        createdAt: true,
      },
      skip: page ? (page - 1) * (limit ?? 500) : 0,
      take: limit ?? 500,
    });
    if (!fetchedData) {
      throw new HTTPError("No data found", 404);
    }

    const totalRecords = await prisma.dashboardUser.count({
      where: {
        role: {
          in: ["admin", "auditor"],
        },
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
    });

    return {
      success: true,
      data: fetchedData,
      totalRecords: totalRecords,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//deleteAdminAuditor
export const deleteAdminAuditors = async (id: string) => {
  try {
    let adminAuditorId: Array<number> = [];
    if (!id) {
      throw new HTTPError("provide the id of the user to be deleted", 400);
    }
    if (!Array.isArray(id)) {
      adminAuditorId = id.split(",").map((item: string) => {
        return parseInt(item);
      });
    }
    const fetchedData = await prisma.dashboardUser.findMany({
      where: {
        id: {
          in: adminAuditorId,
        },
        OR: [{ role: "admin" }, { role: "auditor" }],
      },
    });
    if (!fetchedData.length) {
      throw new HTTPError("No data found", 404);
    }

    const deletedData = await prisma.dashboardUser.deleteMany({
      where: {
        id: {
          in: adminAuditorId,
        },
        OR: [{ role: "admin" }, { role: "auditor" }],
      },
    });

    if (!deletedData || deletedData.count == 0) {
      throw new HTTPError("could not delete the user", 500);
    }

    return {
      success: true,
      data: "admin/auditor deleted successfully",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//getDashboardData
export const getSuperAdminDashboardData = async () => {
  try {
    const AllData: any = {};
    const totalUsers = await prisma.users.count({});
    if (!totalUsers) throw new HTTPError("No data found", 404);
    // const activeUsersDaily
    const [totalMale, totalFemale, otherGender] = await Promise.all([
      prisma.users.count({
        where: {
          gender: "male",
        },
      }),
      prisma.users.count({
        where: {
          gender: "female",
        },
      }),
      prisma.users.count({
        where: {
          gender: "other",
        },
      }),
    ]);
    const currentDate: Date = new Date(Date.now());
    const oneDayAgo = new Date(currentDate);
    oneDayAgo.setDate(currentDate.getDate() - 1);

    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(currentDate.getDate() - 7);

    const oneMonthAgo = new Date(currentDate);
    oneMonthAgo.setDate(currentDate.getDate() - 30);

    const [inActiveUsersMonthly, activeUsersMonthly] = await Promise.all([
      prisma.users.count({
        where: {
          activeUsers: {
            timeStamp: {
              lt: oneMonthAgo,
            },
          },
        },
      }),
      prisma.activeUsers.count({
        where: {
          timeStamp: {
            gte: oneMonthAgo,
            lte: currentDate,
          },
        },
      }),
    ]);

    AllData.totalUsers = totalUsers;
    AllData.totalMale = totalMale;
    AllData.totalFemale = totalFemale;
    AllData.otherGender = otherGender;
    AllData.monthlyinActiveUsers = inActiveUsersMonthly;

    AllData.monthlyActiveUser = activeUsersMonthly;

    return {
      success: true,
      data: AllData,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//USER Mutations
//Edit User by id
//update user by id - other
export const adminUpdateUserById = async (
  data: IUpdateData,
  userId: string
) => {
  try {
    if (!data || !userId) throw new HTTPError("Required Data missing", 400);

    const {
      phoneNumber,
      emailId,
      gender,
      dob,
      address,
      pincode,
      emergencyContact,
      bloodGroup,
      presentDiseases,
      allergies,
      doctorFullName,
      docAddress,
      docPhoneNumber,
      additionalInformation,
    } = data;

    const findUser = await getUserByUniqueData(userId);
    if (!findUser) throw new HTTPError("User not found!", 404);

    const updateUser = await prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        phoneNumber,
        emailId,
        gender,
        dob,
        address,
        pincode,
        emergencyContact,
        isSync: false,
        healthRecord: {
          update: {
            bloodGroup,
            presentDiseases,
            allergies,
            doctorFullName,
            docAddress,
            docPhoneNumber,
            additionalInformation,
          },
        },
      },
    });

    if (!updateUser) throw new HTTPError("Could Not update User Data", 500);
    await trackActiveSession(userId);

    const returnData = {
      success: true,
      id: updateUser.id,
      message: "User Data was updated successfully",
    };
    return returnData;
  } catch (error: unknown) {
    throw handleError(error);
  }
};
