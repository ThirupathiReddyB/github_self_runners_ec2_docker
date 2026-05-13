import prisma from "../prisma";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import crypto from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";

import {
  IDefaultOutput,
  IForgotPasswordInput,
  IOtpLoginData,
  IOtpLoginVerifyInput,
  IPasswordLoginData,
  IRegisterUserdata,
  IResetPasswordInput,
  ITokenData,
  ISessionData,
} from "../utility/DataTypes/types.user";
import HTTPError from "../utility/HttpError";
import {
  generateOtpReturnData,
  IGenerateOtpData,
  resendOtpReturnData,
  verifiedOtpReturnData,
  verifyOtpData,
} from "../utility/DataTypes/otp";
import { verifyOTP } from "../utility/verifyOTP";
import { createS3Folder } from "../utility/aws/createFolder";
import { generateAccessToken, generateRefreshToken } from "../utility/Tokens";
import { createUserFunctionality } from "../utility/CreateUserFunction";
import { trackActiveSession } from "../utility/changeHistoryTrackFunction";
import {
  createUserOtpVerification,
  forgotPasswordOtpVerification,
  loginOTP,
  userId_information,
} from "../templateDesign/userTemplates";
import {
  fetchUserByUniqueDataAndCheckBlock,
  fetchUserByVerifiedContactAndCheckBlock,
} from "../utility/prismaQueries";
import { checkPassword, handleLoginAttempts } from "../utility/checkPassword";
import { upsertVerifiedUsers } from "../utility/upsertUser";
import { checkRefreshToken } from "../utility/tokenValidation";
import { invalidAttempts } from "../constants/data";
import { handleError } from "../utility/Error";
import {
  generateAndSendOTP,
  handleOTPProcess,
} from "../utility/handleOTPOperation";
import { sendMessageToMobile } from "../utility/sendOtp";
import { checkSubsriptionStatus } from "./familyCare.services";
dotenv.config();

//Registration
export const generatedOtpRegistration = async (
  data: IGenerateOtpData,
  checkSubscription: boolean
) => {
  try {
    const { fullName, phoneNumber, password, emailId, country, otpHash } = data;
    if (data.user && checkSubscription === true) {
      await checkSubsriptionStatus(data.user, "false");
    }

    //hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    // send otp using email id
    if (emailId && !phoneNumber) {
      const email = emailId.toLowerCase();
      const existing_user = await prisma.users.findFirst({
        where: {
          emailId: {
            equals: emailId,
            mode: "insensitive",
          },
        },
      });
      if (existing_user) {
        throw new HTTPError(`User with ${email} already exist`, 422); // user already exist throw error
      } else {
        //generate OTP

        // add 2h validation TOBEDONE
        const { hashedotp } = await generateAndSendOTP({
          contact: email,
          contactType: "emailId",
          uuid: null,
          checkMinorCount: false,
          otpSubjectOrOtpMessage: "OTP for registration in THITO App",
          relation: undefined,
          otpTemplate: createUserOtpVerification,
          choice: "createUserOtpVerification",
        });

        //add data to temporary storage
        // const generatedId = generateUserId() as string;
        const UnverifiedUser = await upsertVerifiedUsers(
          fullName,
          hashedPassword,
          hashedotp,
          country,
          undefined,
          emailId
        );

        const returnData: generateOtpReturnData = {
          success: true,
          id: UnverifiedUser.userId,
          verified: UnverifiedUser.isVerified,
          message: "OTP sent successfully",
          verifiedContact: emailId,
          verifiedContactId: "emailId",
        };
        return returnData;
      }
    } else {
      const existing_user = await prisma.users.findFirst({
        where: {
          phoneNumber,
        },
      });
      if (existing_user) {
        throw new HTTPError(`User with ${phoneNumber} already exist`, 422);
      }

      const { hashedotp } = await generateAndSendOTP({
        contact: phoneNumber as string,
        contactType: "phoneNumber",
        uuid: null,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "newUserRegistration",
        otpHash,
      });

      const UnverifiedUser = await upsertVerifiedUsers(
        fullName,
        hashedPassword,
        hashedotp,
        country,
        phoneNumber
      );

      const returnData: generateOtpReturnData = {
        success: true,
        id: UnverifiedUser.userId,
        verified: UnverifiedUser.isVerified,
        message: "OTP sent successfully",
        verifiedContact: phoneNumber as string,
        verifiedContactId: "phoneNumber",
      };
      return returnData;
    }
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//verify otp
export const verifiedOtpRegistration = async (
  data: verifyOtpData
): Promise<verifiedOtpReturnData | void> => {
  try {
    const { id, otp, consent } = data;
    if (consent === false) {
      throw new HTTPError("User did not give consent", 600);
    }
    const findUnverifiedUser = await prisma.verifiedUsers.findFirst({
      where: {
        userId: {
          equals: id.toLocaleLowerCase(),
          mode: "insensitive",
        },
      },
    });
    if (!findUnverifiedUser) throw new HTTPError("User not found", 404);

    if (findUnverifiedUser.isVerified === true) {
      await prisma.verifiedUsers.update({
        where: {
          id: findUnverifiedUser.id,
        },
        data: {
          isVerified: false,
          hashedOTP: "not_verified",
        },
      });
      throw new HTTPError("Invalid otp, please regenerate", 400);
    }

    const registration_id =
      findUnverifiedUser.emailId ?? (findUnverifiedUser.phoneNumber as string);
    const verifyOTP_response = await verifyOTP(
      findUnverifiedUser.hashedOTP,
      otp,
      registration_id
    );
    if (!verifyOTP_response) throw new HTTPError("Invalid OTP", 400);

    const verifiedUser = await prisma.verifiedUsers.update({
      where: {
        id: findUnverifiedUser.id,
      },
      data: {
        isVerified: true,
        hashedOTP: "",
      },
    });

    const values = {
      id: verifiedUser.userId.toLowerCase(),
      fullName: verifiedUser.fullName,
      emailId: verifiedUser.emailId ?? undefined,
      phoneNumber: verifiedUser.phoneNumber ?? undefined,
    };

    const otpVerified: verifiedOtpReturnData = {
      success: true,
      user_data: values,
      verified: verifiedUser.isVerified,
      consent: true,
      message: "Congratulations! Your identity is verified",
    };
    return otpVerified;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//resend otp for registration
export const resendOtp = async (data: { id: string; otpHash: string }) => {
  try {
    const { id, otpHash } = data;

    const findVerifyUser = await prisma.verifiedUsers.findFirst({
      where: {
        userId: {
          equals: id,
          mode: "insensitive",
        },
      },
    });

    if (!findVerifyUser)
      throw new HTTPError("User Not found,please generate the otp", 404);

    const { emailId, phoneNumber } = findVerifyUser;

    if (emailId) {
      const { hashedotp } = await generateAndSendOTP({
        contact: emailId,
        contactType: "emailId",
        uuid: null,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "OTP for registration in THITO App",
        relation: undefined,
        otpTemplate: createUserOtpVerification,
        choice: "createUserOtpVerification",
      });

      const UnverifiedUser = await prisma.verifiedUsers.update({
        where: {
          emailId,
        },
        data: {
          hashedOTP: hashedotp,
          isVerified: false,
        },
      });

      if (!UnverifiedUser) throw new HTTPError("Could Not Store new OTP", 500);

      const returnData: resendOtpReturnData = {
        success: true,
        id: UnverifiedUser.userId,
        verified: UnverifiedUser.isVerified,
        message: "OTP sent successfully",
      };
      return returnData;
    } else if (phoneNumber) {
      const { hashedotp } = await generateAndSendOTP({
        contact: phoneNumber,
        contactType: "phoneNumber",
        uuid: null,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "resendRegistationOtp",
        otpHash,
      });

      const UnverifiedUser = await prisma.verifiedUsers.update({
        where: {
          phoneNumber,
        },
        data: {
          hashedOTP: hashedotp,
          isVerified: false,
        },
      });

      if (!UnverifiedUser) throw new HTTPError("Could Not Store new OTP", 500);

      const returnData: resendOtpReturnData = {
        success: true,
        id: UnverifiedUser.userId,
        verified: UnverifiedUser.isVerified,
        message: "OTP sent successfully",
      };
      return returnData;
    }
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//create user
export const createNewUser = async (data: IRegisterUserdata) => {
  try {
    const { id } = data;
    data.createdBy = "self";

    const result = await createUserFunctionality(data);

    if (!result) {
      throw new HTTPError("could not create user", 204);
    }
    const { password, refreshToken, healthRecord, ...filteredData } = result;

    if (result.emailId && result.verifiedContactId == "emailId") {
      generateAndSendOTP({
        contact: result.emailId.toLowerCase(),
        contactType: "emailId",
        uuid: id.toUpperCase(),
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "Successful registration in THITO App",
        relation: undefined,
        otpTemplate: userId_information,
      });
    } else if (
      result.phoneNumber &&
      result.verifiedContactId == "phoneNumber"
    ) {
      const msg = `Dear User (${id.toUpperCase()}), welcome to THITO. Your User ID is ${id.toUpperCase()}. You can use it for login. Stay updated with your health data. -STEIGEN HEALTHCARE`;
      sendMessageToMobile(result.phoneNumber, msg);
    }

    //remove data from temp storage
    await prisma.verifiedUsers.delete({
      where: {
        userId: result.id,
      },
    });

    const settings = await prisma.usersSetting.findUnique({
      where: {
        forUserid: id.toLowerCase(),
      },
      select: {
        language: true,
        notification: true,
        appLock: true,
      },
    });
    //create s3 folder for user
    createS3Folder(result.id.toLowerCase());

    //login the user directly after sucessful registeration
    const uniqueSessionId = crypto.randomBytes(20).toString("hex");
    const { emailId, phoneNumber } = result;

    //generate jwt token
    const userData = {
      id: id.toLowerCase(),
      emailId: emailId ? emailId.toLowerCase() : null,
      phoneNumber,
      currentSessionId: uniqueSessionId,
    };
    //update user status to loggedIn
    const loggedInUser = await prisma.users.update({
      data: {
        refreshToken: generateRefreshToken(userData),
        currentSessionId: uniqueSessionId,
      },
      where: {
        id: id.toLowerCase(),
      },
    });

    if (!loggedInUser) {
      throw new HTTPError("DB Error: Could not update user data", 500);
    }

    //track active session of user
    await trackActiveSession(id.toLowerCase());
    return {
      success: true,
      message: "Successfully added new user and logged in",
      data: {
        userData: {
          U6: filteredData,
          H8: result.healthRecord,
        },
        uniqueKey: crypto.randomBytes(16).toString("hex"),
        accessToken: generateAccessToken(userData),
        planDetails: result.planDetails
      },
      settings,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//check session
export const checkUserSession = async (data: ISessionData) => {
  try {
    const { userId, password } = data;
    //check if user exist
    let findUser: any;
    findUser = await fetchUserByVerifiedContactAndCheckBlock(userId);
    //check password
    await checkPassword(password, findUser);
    //check user session
    const isSessionValid = await prisma.users.findFirst({
      where: {
        OR: [
          {
            emailId: {
              equals: userId,
              mode: "insensitive",
            },
          },
          { id: { equals: userId, mode: "insensitive" } },
          { phoneNumber: userId },
        ],
        NOT: {
          currentSessionId: null,
        },
      },
    });

    return {
      success: true,
      message: isSessionValid
        ? "User Already logged in"
        : "You can continue to login",
      isLoggedIn: !!isSessionValid,
      //  isMigrated: false,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//User Login Logic
export const passwordLogin = async (data: IPasswordLoginData) => {
  try {
    const { userId, language, deviceToken } = data;
    let { pass } = data;
    let findUser = await fetchUserByVerifiedContactAndCheckBlock(userId);

    //if minor logging in for the first time
    await checkPassword(pass, findUser);

    const uniqueSessionId = crypto.randomBytes(20).toString("hex");
    const { id, emailId, phoneNumber } = findUser;

    //generate jwt token
    const userData = {
      id: id.toLowerCase(),
      emailId: emailId ? emailId.toLowerCase() : null,
      phoneNumber,
      currentSessionId: uniqueSessionId,
    };

    const accessToken = generateAccessToken(userData);
    const generatedRefreshToken = generateRefreshToken(userData);

    //update user status to loggedIn
    const loggedInUser = await prisma.users.update({
      data: {
        refreshToken: generatedRefreshToken,
        currentSessionId: uniqueSessionId,
        wrongLoginAttempts: invalidAttempts,
        deviceToken,
      },
      where: {
        id: findUser.id.toLowerCase(),
      },
      include: {
        healthRecord: true,
      },
    });
    if (!loggedInUser)
      throw new HTTPError("DB Error: Could not update user data", 500);
    const settings = await prisma.usersSetting.update({
      where: {
        forUserid: findUser.id.toLowerCase(),
      },
      data: {
        language,
      },
      select: {
        language: true,
        notification: true,
        appLock: true,
      },
    });
    if (!settings) {
      throw new HTTPError("could not update settings data", 500);
    }

    await trackActiveSession(findUser.id.toLowerCase());

    const {
      password,
      currentSessionId,
      refreshToken,
      healthRecord,
      ...filteredData
    } = loggedInUser;

    return {
      success: true,
      message: "successfully logged In",
      data: {
        userData: {
          U6: filteredData,
          H8: healthRecord,
        },
        uniqueKey: crypto.randomBytes(16).toString("hex"),
        accessToken,
      },
      settings,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const otpLoginGenerate = async (data: IOtpLoginData) => {
  try {
    const { userId, otpHash } = data;

    let findUser = await fetchUserByVerifiedContactAndCheckBlock(userId);

    const { phoneNumber, emailId } = findUser;

    let verifiedContact;
    //generate OTP
    if (phoneNumber && findUser.verifiedContactId === "phoneNumber") {
      verifiedContact = phoneNumber;
      await handleOTPProcess({
        contact: phoneNumber,
        contactType: "phoneNumber",
        userData: findUser,
        uuid: findUser.id,
        checkMinorCount: false,
        selfcreated: true,

        otpSubjectOrOtpMessage: "userLogin",
        otpHash,
      });
    } else if (emailId && findUser.verifiedContactId === "emailId") {
      verifiedContact = emailId;

      await handleOTPProcess({
        contact: emailId,
        contactType: "emailId",
        userData: findUser,
        uuid: findUser.id,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "THITO - OTP for Login",
        selfcreated: true,
        otpTemplate: loginOTP,
      });
    }

    const returnData = {
      success: true,
      userId: findUser.id.toLowerCase(),
      uniqueKey: crypto.randomBytes(16).toString("hex"),
      message: "OTP sent successfully",
      verifiedContact,
      verifiedContactId: findUser.verifiedContactId,
    };
    return returnData;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const otpLoginVerify = async (data: IOtpLoginVerifyInput) => {
  try {
    const { userId, verifiedContact, otp, language, deviceToken } = data;

    let findUser = await fetchUserByUniqueDataAndCheckBlock(userId);

    //get hashed otp
    const findLoginUser = await prisma.otpStore.findUnique({
      where: {
        userId_createdBy: {
          userId: findUser.id.toLowerCase(),
          createdBy: "self",
        },
      },
    });
    if (!findLoginUser)
      throw new HTTPError("Please generate otp before proceddig", 404);

    if (
      (findUser.verifiedContactId === "emailId" &&
        findLoginUser.emailId !== verifiedContact) ||
      (findUser.verifiedContactId === "phoneNumber" &&
        findLoginUser.phoneNumber !== verifiedContact)
    )
      throw new HTTPError("Enter Correct verified contact", 401);

    const hashedotp = findLoginUser.hashedOTP;
    const verifyOTP_response = await verifyOTP(hashedotp, otp, verifiedContact);
    if (!verifyOTP_response) {
      await handleLoginAttempts(findUser);
    }

    const { id, emailId, phoneNumber } = findUser;
    const currentDate: Date = new Date(Date.now());
    const uniqueSessionId =
      crypto.randomBytes(20).toString("hex") + "+" + currentDate;
    const userData = {
      id: id.toLowerCase(),
      emailId: emailId ? emailId.toLowerCase() : null,
      phoneNumber,
      currentSessionId: uniqueSessionId,
    };

    const accessToken = generateAccessToken(userData);

    const generatedRefreshToken = generateRefreshToken(userData);

    //update user status to loggedIn
    const loggedInUser = await prisma.users.update({
      data: {
        // isLoggedIn: true,
        refreshToken: generatedRefreshToken,
        currentSessionId: uniqueSessionId,
        wrongLoginAttempts: invalidAttempts,
        deviceToken,
      },
      where: {
        id: findUser.id.toLowerCase(),
      },
      include: {
        healthRecord: true,
      },
    });

    if (!loggedInUser) throw new HTTPError("Could not update user data", 500);

    //delete data from OTP store
    await prisma.otpStore.delete({
      where: {
        userId_createdBy: {
          userId: userId.toLowerCase(),
          createdBy: "self",
        },
      },
    });
    const settings = await prisma.usersSetting.update({
      where: {
        forUserid: userId.toLowerCase(),
      },
      data: {
        language,
      },
      select: {
        language: true,
        notification: true,
        appLock: true,
      },
    });
    if (!settings) {
      throw new HTTPError("could not update settings data", 500);
    }

    await trackActiveSession(findUser.id.toLowerCase());

    const {
      password,
      refreshToken,
      currentSessionId,
      healthRecord,
      ...filteredData
    } = loggedInUser;

    const isMinor =
      loggedInUser.isMigrated &&
      loggedInUser.password === process.env.DEPENDANTPASSWORD;
    return {
      success: true,
      passwordReset: isMinor,
      message: "successfully logged In",
      data: {
        userData: {
          U6: filteredData,
          H8: healthRecord,
        },
        uniqueKey: crypto.randomBytes(16).toString("hex"),
        accessToken,
      },
      settings,
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const userLogout = async (user: ITokenData) => {
  try {
    const { id } = user;

    //logout user
    const updateUser = await prisma.users.update({
      data: {
        // isLoggedIn: false,
        refreshToken: "",
        currentSessionId: null,
        deviceToken: null,
      },
      where: {
        id: id.toLowerCase(),
      },
    });

    if (!updateUser) throw new HTTPError("User not found", 404);
    await trackActiveSession(id.toLowerCase());

    return {
      success: true,
      message: "successfully logged Out",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//forgot password logic
export const forgotPasswordGenerateOtp = async (data: {
  userId: string;
  otpHash: string;
}) => {
  try {
    const { userId, otpHash } = data;
    //find user
    let findUser = await fetchUserByVerifiedContactAndCheckBlock(userId);

    if (
      findUser.isMigrated === true &&
      findUser.password === process.env.DEPENDANTPASSWORD
    ) {
      //minor changing passsword -> throw error
      throw new HTTPError(
        "Your password is not set. Please login using OTP",
        604
      );
    }
    const { phoneNumber, emailId } = findUser;

    let verifiedContact;
    //generate OTP
    if (phoneNumber && findUser.verifiedContactId === "phoneNumber") {
      verifiedContact = phoneNumber;
      await handleOTPProcess({
        contact: phoneNumber,
        contactType: "phoneNumber",
        userData: findUser,
        uuid: findUser.id,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "forgotPassword",
        selfcreated: true,
        otpHash,
      });
    } else if (emailId && findUser.verifiedContactId === "emailId") {
      verifiedContact = emailId.toLowerCase();

      await handleOTPProcess({
        contact: emailId.toLowerCase(),
        contactType: "emailId",
        userData: findUser,
        uuid: findUser.id,
        checkMinorCount: false,
        otpSubjectOrOtpMessage: "Reset password in THITO App",
        selfcreated: true,
        otpTemplate: forgotPasswordOtpVerification,
        otpHash,
      });
    } else {
      throw new HTTPError("Email id or phonenumber is not verified", 401);
    }

    await trackActiveSession(findUser.id.toLowerCase());

    const returnData = {
      success: true,
      userId: findUser.id.toLowerCase(),
      verifiedContact,
      message: "OTP sent successfully",
      verifiedContactId: findUser.verifiedContactId,
    };
    return returnData;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const forgotPasswordVerifyOtp = async (
  data: IForgotPasswordInput
): Promise<void | verifiedOtpReturnData> => {
  try {
    const { userId, verifiedContact, otp } = data;

    let findUser = await fetchUserByUniqueDataAndCheckBlock(userId);

    if (
      findUser.isMigrated === true &&
      findUser.password === process.env.DEPENDANTPASSWORD
    ) {
      //minor changing passsword -> throw error
      throw new HTTPError(
        "Your password is not set. Please login using OTP",
        604
      );
    }

    const findUserInTempStorage = await prisma.otpStore.findUnique({
      where: {
        userId_createdBy: {
          userId: userId.toLowerCase(),
          createdBy: "self",
        },
      },
    });

    if (!findUserInTempStorage) throw new HTTPError("Invalid otp ", 401);

    const hashedotp = findUserInTempStorage.hashedOTP;

    const verifyOTP_response = await verifyOTP(hashedotp, otp, verifiedContact);

    if (!verifyOTP_response) {
      await handleLoginAttempts(findUser);
    }
    await prisma.otpStore.delete({
      where: {
        userId_createdBy: {
          userId: userId.toLowerCase(),
          createdBy: "self",
        },
      },
    });

    await prisma.users.update({
      where: {
        id: userId.toLowerCase(),
      },
      data: {
        wrongLoginAttempts: invalidAttempts,
      },
    });
    await trackActiveSession(userId.toLowerCase());

    return {
      success: true,
      verified: true,
      message: "Your account has been verified successfully! ",
    };
  } catch (error: unknown) {
    throw handleError(error);
  }
};

export const resetPassword = async (
  data: IResetPasswordInput,
  isLoggedInWithOTP: boolean
) => {
  try {
    const { userId, newpassword } = data;
    //hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newpassword, salt);

    //find User
    let findUser = await fetchUserByUniqueDataAndCheckBlock(userId);
    //If minor setting password for the first time

    let updatedPassword;
    if (
      findUser.isMigrated === true &&
      findUser.password === process.env.DEPENDANTPASSWORD &&
      !isLoggedInWithOTP
    ) {
      //minor changing passsword -> throw error
      throw new HTTPError(
        "Your password is not set. Please login using OTP",
        604
      );
    } else {
      //user changing password
      updatedPassword = await prisma.users.update({
        where: {
          id: userId.toLowerCase(),
        },
        data: {
          password: hashedPassword,
        },
      });
    }

    if (!updatedPassword) throw new HTTPError("Could Not update password", 500);
    const passwordUpdatedResponse: IDefaultOutput = {
      success: true,
      message: "Your password is updated successfully",
      toLogin: false,
    };
    await trackActiveSession(userId.toLowerCase());

    return passwordUpdatedResponse;
  } catch (error: unknown) {
    throw handleError(error);
  }
};

//refresh access token for new session
export const generateUserRefreshToken = async (data: string) => {
  try {
    if (!data) throw new HTTPError("Missing Required Fields", 422);

    const accessToken = data.split(" ")[1];
    if (!accessToken) {
      throw new HTTPError("No token provided.", 401);
    }

    const decodedToken = jwt.decode(accessToken) as JwtPayload;

    if (!decodedToken) throw new HTTPError("Invalid Token.", 401);

    // 3. Find User
    const userId = decodedToken["id"];
    let user = await fetchUserByUniqueDataAndCheckBlock(userId);

    //check if user is logged in
    const refreshToken = user.refreshToken;
    if (!refreshToken) {
      throw new HTTPError("Refresh token not found, user logged out", 403);
    }

    //check if the session is valid
    if (user.currentSessionId !== decodedToken.currentSessionId) {
      throw new HTTPError("Session invalidated. Please log in again.", 403);
    }

    // 4. Check Refresh Token
    if (
      decodedToken["exp"] &&
      (Date.now() + 90 * 1000) / 1000 >= decodedToken["exp"]
    ) {
      // Access token expired
      const refreshDecodedToken = await checkRefreshToken(refreshToken);

      //check session of user through refresh token for security reason
      if (user.currentSessionId !== refreshDecodedToken.currentSessionId) {
        await prisma.users.update({
          where: { id: user.id.toLowerCase() },
          data: {
            refreshToken: null,
            currentSessionId: null,
            deviceToken: null,
          },
        });
        throw new HTTPError("Session invalidated. Please log in again.", 403);
      }
      if (
        refreshDecodedToken["exp"] &&
        Date.now() / 1000 >= refreshDecodedToken["exp"]
      ) {
        // Refresh token also expired
        await prisma.users.update({
          where: { id: user.id.toLowerCase() },
          data: { refreshToken: "", currentSessionId: null, deviceToken: null },
        });
        throw new HTTPError(
          "Session expired/Refresh token also expired. Please Login again",
          403
        );
      } else {
        // Generate new access token using refresh token data
        const userData = {
          id: refreshDecodedToken["id"],
          emailId: refreshDecodedToken["emailId"],
          phoneNumber: refreshDecodedToken["phoneNumber"],
          currentSessionId: refreshDecodedToken["currentSessionId"],
        };
        const newAccessToken = generateAccessToken(userData);
        await trackActiveSession(user.id.toLowerCase());

        return {
          success: true,
          refreshToken: newAccessToken,
        };
      }
    } else {
      await trackActiveSession(user.id.toLowerCase());

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

//Helper Function
