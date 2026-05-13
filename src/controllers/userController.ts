import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  addUserMessage,
  changeContactOtpVerify,
  removeUserById,
  getAllAppUsers,
  getHomePageData,
  getUserDataById,
  getUserSetting,
  getUserSyncedData,
  newUserContactDetails,
  editUserById,
  updateUserSetting,
  verifyUserPassword,
  getUserStorageDetails,
  checkExistingUserById,
  checkExistingUserByIdRegistration,
  markAsInAppNotifSynced,
  getQrData,
  generateExcelAndExport,
  getFaqsData,
} from "../services/user.services";
import {
  checkExistingUserValidation,
  deleteUserValidation,
  NewContactDetailsValidations,
  updateUserSettingValidation,
  updateUserValidation,
  userComplaintValidation,
  userFeedbackValidation,
} from "../utility/Validation/userValidation";
import {
  detachloginWithPasswordValidation,
  ResetPasswordValidation,
  verifyOtpForDetailsChangeValidation,
  verifyOtpForResetPasswordValidation,
} from "../utility/Validation/AuthValidation";
import {
  getAggregateCmsUser,
  getAllAdvertisements,
  getAllFacilities,
} from "../services/contentManagement.services";
import {
  forgotPasswordGenerateOtp,
  forgotPasswordVerifyOtp,
  resetPassword,
} from "../services/auth.services";
import { decryptPassword } from "../utility/decryptingPassword";
import {
  ICheckExistingUser,
  ICheckUserDetails,
  IGetUserById,
  IResetPasswordInput,
  IVerifyPasswordData,
} from "../utility/DataTypes/types.user";
import {
  IGetContent,
  IGetFacility,
} from "../utility/DataTypes/types.contentManagement";
import {
  GroupedFiles,
  IGetCommon,
  ISearchAppUsers,
} from "../utility/DataTypes/types.common";
import { getTags } from "../services/tag.services";
import { Helpers } from "../utility/Helpers";
import { VGetCommon } from "../utility/Validation/contentManagementValidations";
import { VGetFaqs } from "../utility/Validation/plan.validation";
import { autoFetchHash } from "../constants/data";

export const testRoute1 = async (_req: Request, res: Response) => {
  try {
    res.json("user connected");
  } catch (err: any) {
    console.log(err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json(err);
    }
  }
};

//User functions
//!Admin Function
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new HTTPError("Unauthorized", 401);
    }

    const { page, search, searchBy, limit, sortByField } = req.query;
    const data: ISearchAppUsers = {
      page: typeof page === "string" ? parseInt(page) : 1,
      limit: typeof limit === "string" ? parseInt(limit) : 50,
      search: typeof search === "string" ? search : undefined,
      searchBy: typeof searchBy === "string" ? searchBy : undefined,
      sortByField: typeof sortByField === "string" ? sortByField : undefined,
    };
    const allUser = await getAllAppUsers(data);
    if (!allUser) throw new HTTPError("Could Not Fetch User data", 204);
    const code = allUser.success ? 200 : 400;
    res.status(code).json(allUser);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//!admin function
export const exportUsers = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin || admin.role !== "superAdmin") {
      throw new HTTPError("Unauthorized", 401);
    }

    const { search, searchBy, sortByField } = req.query;

    const data: ISearchAppUsers = {
      search: typeof search === "string" ? search : undefined,
      searchBy: typeof searchBy === "string" ? searchBy : undefined,
      sortByField: typeof sortByField === "string" ? sortByField : undefined,
    };

    //Generates Excel file
    const exportDataResponse = await generateExcelAndExport(data, admin);

    if (!exportDataResponse)
      throw new HTTPError(
        `Could Not export details for user ${req.params.id}`,
        204
      );
    const code = exportDataResponse.success ? 200 : 400;
    res.status(code).json({ data: exportDataResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getUserSettings = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    if (!user.id) throw new HTTPError("Required Data missing", 422);

    const getSettingsData = await getUserSetting(user.id);

    if (!getSettingsData)
      throw new HTTPError(
        `Could Not update details for user ${req.params.id}`,
        204
      );
    const code = getSettingsData.success ? 200 : 400;
    res.status(code).json({ data: getSettingsData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data || !user.id) throw new HTTPError("Missing required Data", 422);

    Helpers.validateWithZod(updateUserSettingValidation, data);
    const updatedData = await updateUserSetting(data, user.id);

    if (!updatedData)
      throw new HTTPError(
        `Could Not update details for user ${req.params.id}`,
        204
      );
    const code = updatedData.success ? 200 : 400;
    res.status(code).json({ data: updatedData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//Admin panel function
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    const admin = req.admin;
    const type = req.query.type;
    const userId: string = req.params.id;
    if (!user && !admin) throw new HTTPError("Unauthorised", 401);

    if (user && user.id !== userId)
      throw new HTTPError("Id not matching authorised user", 401);

    if (!type || !userId) throw new HTTPError("Required Data missing", 422);

    const data: IGetUserById = {
      userId,
      type: type as IGetUserById["type"],
    };

    const loggedInUser = user ?? admin;

    const userData = await getUserDataById(data, loggedInUser);

    if (!userData)
      throw new HTTPError(`Could Not Fetch Data for user ${userId}`, 204);
    const code = userData.success ? 200 : 400;
    res.status(code).json(userData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const updateUserById = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data) throw new HTTPError("Missing required Data", 422);

    const queryParams = req.query;

    Helpers.validateWithZod(updateUserValidation, data);

    if (req.body.password || req.body.password == "")
      throw new HTTPError(
        "Validation Error: Password is not subject to change using this API",
        400
      );
    const updatedData = await editUserById(data, user.id, queryParams);

    if (!updatedData)
      throw new HTTPError(
        `Could Not update details for user ${req.params.id}`,
        204
      );
    const code = updatedData.success ? 200 : 400;
    res.status(code).json({ data: updatedData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//check existing user in edit profile
export const checkExistingUserUpdateProfile = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { phoneNumber, emailId, password, id } = req.body;

    if (password || password == "")
      throw new HTTPError(
        "Validation Error: Password is not subject to change using this API",
        400
      );

    const { famCareMemberId } = req.query;

    const data = {
      userId: id,
      phoneNumber,
      emailId,
      famCareMemberId:
        typeof famCareMemberId === "string" ? famCareMemberId : undefined,
    };

    Helpers.validateWithZod(checkExistingUserValidation, data);

    const updatedData = await checkExistingUserById(data, user.id);

    if (!updatedData)
      throw new HTTPError(
        `Could Not update details for user ${req.params.id}`,
        204
      );
    const code = updatedData.success ? 200 : 400;
    res.status(code).json({ data: updatedData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//check if any data exist
export const checkExistingUserRegistration = async (
  req: Request,
  res: Response
) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const {
      id,
      phoneNumber,
      emailId,
      emergencyContact,
      deviceToken,
      gender,
      dob,
      pincode,
      address,
    } = req.body;
    if (!id || !pincode || !gender || !dob)
      throw new HTTPError("Required Data missing", 422);

    const data: ICheckUserDetails = {
      userId: id,
      phoneNumber,
      emailId,
      emergencyContact,
      deviceToken,
      gender,
      dob,
      pincode,
      address,
    };

    Helpers.validateWithZod(checkExistingUserValidation, data);

    const updatedData = await checkExistingUserByIdRegistration(data);

    if (!updatedData)
      throw new HTTPError(
        `Could Not update details for user ${req.params.id}`,
        204
      );
    const code = updatedData.success ? 200 : 400;
    res.status(code).json({ data: updatedData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

// authorized user
export const checkExistingUserRegistrationFamilyCare = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      });
    const { phoneNumber, emailId, emergencyContact, id, docPhoneNumber } =
      req.body;

    const data: ICheckExistingUser = {
      phoneNumber,
      emailId,
      emergencyContact,
      userId: id,
      docPhoneNumber,
    };

    Helpers.validateWithZod(checkExistingUserValidation, data);

    const updatedData = await checkExistingUserByIdRegistration(data);

    if (!updatedData)
      throw new HTTPError(
        `Could Not update details for user ${req.params.id}`,
        204
      );
    const code = updatedData.success ? 200 : 400;
    res.status(code).json({ data: updatedData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//reset password flow
//1. Generate OTP
export const protectedGenerateOtpForResetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorised", 401);
    if (!user.id) {
      throw new HTTPError("please provide all required fields", 401);
    }
    const { otpHash } = req.body;

    const data: { userId: string; otpHash: string } = {
      userId: user.id,
      otpHash: otpHash ?? autoFetchHash,
    };

    const generatedOtpData = await forgotPasswordGenerateOtp(data);
    if (!generatedOtpData)
      throw new HTTPError("Could Not Generate OTP for Password Reset", 204);
    const code = generatedOtpData.success ? 200 : 400;
    res.status(code).json(generatedOtpData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//2. Verify OTP
export const protectedVerifiedOtpForResetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorised", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data) throw new HTTPError("API Missing body", 422);

    const input = {
      ...data,
      userId: user.id,
    };

    Helpers.validateWithZod(verifyOtpForResetPasswordValidation, input);

    const { verifiedContact, otp } = data;

    if (!verifiedContact || !otp || !user.id) {
      throw new HTTPError("Missing required fields", 422);
    }

    const otp_data = await forgotPasswordVerifyOtp(input);
    if (!otp_data)
      throw new HTTPError("Could Not Verify OTP for Password Reset", 204);
    const code = otp_data.success ? 200 : 400;
    res.status(code).json(otp_data);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//3. Reset Password
export const protectedUserResetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorised", 401);
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { isLoggedInWithOTP, newpassword } = req.body;
    if (!user.id || !newpassword) {
      throw new HTTPError("please provide all required fields", 422);
    }

    const formattedPassword = await decryptPassword(newpassword);
    const input: IResetPasswordInput = {
      userId: user.id,
      newpassword: formattedPassword,
    };

    Helpers.validateWithZod(ResetPasswordValidation, input);

    const updated_user = await resetPassword(input, isLoggedInWithOTP);
    if (!updated_user)
      throw new HTTPError("Could Not Reset User Password", 204);
    const code = updated_user.success ? 200 : 400;
    res.status(code).json(updated_user);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//sync changes
export const syncUserChanges = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    const { lastSyncDate, famCareMemberId } = req.query;
    const data: { lastSyncDate?: string; famCareMemberId?: string } = {
      lastSyncDate: lastSyncDate?.toString(),
      famCareMemberId: famCareMemberId?.toString(),
    };

    const syncedData = await getUserSyncedData(user, data);

    if (!syncedData)
      throw new HTTPError(`Could Not get updated data for user`, 204);
    const code = syncedData.success ? 200 : 400;
    res.status(code).json({ data: syncedData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//sync completed
export const syncCompleted = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    const syncedData = await markAsInAppNotifSynced(user);

    if (!syncedData)
      throw new HTTPError(`Could Not get updated data for user`, 204);
    const code = syncedData.success ? 200 : 400;
    res.status(code).json({ data: syncedData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
//password verify -> new details -> OTP verify
//1. Verify User Password
export const userPasswordVerify = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { password } = req.body;
    if (!user.id || !password)
      throw new HTTPError("Missing required fields", 422);

    const input: IVerifyPasswordData = {
      password,
      userId: user.id,
    };

    Helpers.validateWithZod(detachloginWithPasswordValidation, input);

    const verifyPasswordResponse = await verifyUserPassword(input);

    if (!verifyPasswordResponse)
      throw new HTTPError(`Could Not verify password of user ${user.id}`, 204);
    const code = verifyPasswordResponse.success ? 200 : 400;
    res.status(code).json({ data: verifyPasswordResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//2. Take new details and generate otp
export const userNewContact = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data) throw new HTTPError("Missing required Data", 422);

    const input = {
      ...data,
      otpHash: data.otpHash ?? autoFetchHash,
      id: user.id,
    };

    Helpers.validateWithZod(NewContactDetailsValidations, input);
    if ((!user.id && !data.emailId) || (!user.id && !data.phoneNumber))
      throw new HTTPError("Missing required fields", 422);

    const newContactDetails = await newUserContactDetails(input);

    if (!newContactDetails)
      throw new HTTPError(`Could Not verify passowrd of user ${user.id}`, 204);
    const code = newContactDetails.success ? 200 : 400;
    res.status(code).json({ data: newContactDetails });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//3. Verify OTP and change details
export const userOtpVerify = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) throw new HTTPError("Unauthorised", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data) throw new HTTPError("Missing required Data", 422);

    const input = {
      ...data,
      userId: user.id,
    };

    Helpers.validateWithZod(verifyOtpForDetailsChangeValidation, input);

    if (
      !user.id ||
      !data.verifiedContact ||
      !data.otp ||
      !data.verifiedContactId
    ) {
      throw new HTTPError("please provide all required fields", 422);
    }

    const otpverifyResponse = await changeContactOtpVerify(input);

    if (!otpverifyResponse) throw new HTTPError("Could Not Log in User", 204);
    const code = otpverifyResponse.success ? 200 : 400;
    res.status(code).json(otpverifyResponse);
  } catch (err) {
    console.log("error status", err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { reason } = req.body;
    if (!reason) throw new HTTPError("Reason for deletion is required", 422)
    const deleteData = {
      reason,
      role: "SELF",
      email: "",
    };

    Helpers.validateWithZod(deleteUserValidation, deleteData);

    const userData = await removeUserById(user.id, deleteData);
    if (!userData)
      throw new HTTPError(`Could Not delete user ${req.params.id}`, 204);
    const code = userData.success ? 200 : 400;
    res.status(code).json({ data: userData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const splashUserData = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    const queryParams = req.query;

    if (!user) throw new HTTPError("Unauthorized", 401);
    const userData = await getHomePageData(user, queryParams);
    if (!userData) throw new HTTPError(`Could Not Redirect User`, 204);
    const code = userData.success ? 200 : 400;
    res.status(code).json({ data: userData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//QR data
export const userQrData = async (req: Request, res: Response) => {
  try {
    let id = req.params.id;
    // Ensure we decode it in case the frontend used encodeURIComponent
    id = decodeURIComponent(id);


    const userData = await getQrData(id);
    if (!userData) throw new HTTPError(`Could Not find User QR data`, 204);
    const code = userData.success ? 200 : 400;
    res.status(code).json({ data: userData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//CONTENT MANAGEMENT
//get all content
export const getAllUserContent = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }

    const { search, id, isFiltered, page, limit, type } = req.query;

    const queryParams: IGetContent = {
      search: search as string,
      id: parseInt(id as string),
      // sortByField: sortByField as string,
      // sortByOrder: sortByOrder
      //   ? (sortByOrder as IGetVideo["sortByOrder"])
      //   : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
      type: (type as IGetContent["type"]) ?? ("all" as IGetContent["type"]),
      isFiltered: isFiltered == "true",
    };

    const getContent = await getAggregateCmsUser(user, queryParams);
    if (!getContent) {
      throw new HTTPError("could not get aggregate content", 204);
    }
    const code = getContent.success ? 200 : 400;
    res.status(code).json({ data: getContent });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//advertisements
export const getAdvertisementsUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const { page, limit } = req.query;
    const data: IGetCommon = {
      page: typeof page === "string" ? parseInt(page) : 1,
      limit: typeof limit === "string" ? parseInt(limit) : 500,
    };
    const getAdvertisements = await getAllAdvertisements(user, data);
    if (!getAdvertisements) {
      throw new HTTPError("could not get advertisements", 204);
    }
    const code = getAdvertisements.success ? 200 : 400;
    res.status(code).json({ data: getAdvertisements });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//get tags
export const readTags = async (_req: Request, res: Response) => {
  try {
    const getAllTags = await getTags();
    if (!getAllTags) {
      throw new HTTPError("could not get tags", 204);
    }
    const code = getAllTags.success ? 200 : 400;
    res.status(code).json({ data: getAllTags });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
//facilities
export const getFacilitiesUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }

    const { id, page, search, limit, type } = req.query;

    const data: IGetFacility = {
      id: typeof id === "string" ? parseInt(id) : undefined,
      page: typeof page === "string" ? parseInt(page) : 1,
      search: typeof search === "string" ? search : undefined,
      limit: typeof limit === "string" ? parseInt(limit) : 500,
      type:
        typeof type === "string"
          ? (type.toLowerCase() as IGetFacility["type"])
          : undefined,
    };
    Helpers.validateWithZod(VGetCommon, data);
    const getFacilities = await getAllFacilities(user, data);
    if (!getFacilities) {
      throw new HTTPError("could not get facilities", 204);
    }
    const code = getFacilities.success ? 200 : 400;
    res.status(code).json({ data: getFacilities });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//Feedback and Complaints
export const userFeedbackComplaint = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorized", 401);

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data) throw new HTTPError("missing api body", 422);
    const files_ = req.files ? (req.files as GroupedFiles) : undefined; //check for undefined??.
    const files = files_?.imageFiles ?? undefined;
    if (data.type == "complaint") {
      Helpers.validateWithZod(userComplaintValidation, data);
    } else {
      Helpers.validateWithZod(userFeedbackValidation, data);
    }

    if (!data.message || !data.type || !user.id)
      throw new HTTPError("Required Data missing", 422);

    const feedbackData = await addUserMessage(user.id, { ...data, files });
    if (!feedbackData) throw new HTTPError(`Could Not add ${data.type}`, 204);
    const code = feedbackData.success ? 200 : 400;
    res.status(code).json({ data: feedbackData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const userStorage = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorized", 401);

    const id = req.params.id;
    if (!id) throw new HTTPError("Provide User ID to get storage details", 422);

    const userStorageData = await getUserStorageDetails(id);
    if (!userStorageData)
      throw new HTTPError("Could Not fetch storage details", 204);
    const code = userStorageData.success ? 200 : 400;
    res.status(code).json({ data: userStorageData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getFaqs = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorized", 401);
    const params = req.query;
    Helpers.validateWithZod(VGetFaqs, params);
    const faqsData = await getFaqsData(params.type as string);
    if (!faqsData) {
      throw new HTTPError("Could Not fetch FAQs", 204);
    }
    const code = faqsData.success ? 200 : 400;
    res.status(code).json({ data: faqsData });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
