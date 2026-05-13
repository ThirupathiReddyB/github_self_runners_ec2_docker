import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  checkUserSession,
  createNewUser,
  forgotPasswordGenerateOtp,
  forgotPasswordVerifyOtp,
  generateUserRefreshToken,
  generatedOtpRegistration,
  otpLoginGenerate,
  otpLoginVerify,
  passwordLogin,
  resendOtp,
  resetPassword,
  userLogout,
  verifiedOtpRegistration,
} from "../services/auth.services";

import {
  IForgotPasswordInput,
  IOtpLoginData,
  IOtpLoginVerifyInput,
  IPasswordLoginData,
  IRegisterUserdata,
  IResetPasswordInput,
  ISessionData,
} from "../utility/DataTypes/types.user";
import {
  IGenerateOtpData,
  verifiedOtpReturnData,
  verifyOtpData,
} from "../utility/DataTypes/otp";
import {
  createUserRegistration,
  generateOtpForResetPasswordValidation,
  loginWithPasswordValidation,
  otpLoginGenerateValidation,
  otpLoginVerificationValidation,
  registrationValidation,
  ResendOtpValidation,
  ResetPasswordValidation,
  sessionInputValidation,
  verifyOtpForRegistrationValidation,
  verifyOtpForResetPasswordValidation,
} from "../utility/Validation/AuthValidation";
import { decryptPassword } from "../utility/decryptingPassword";
import { Helpers } from "../utility/Helpers";
import { autoFetchHash } from "../constants/data";

export const generateOtpForRegistration = async (
  req: Request,
  res: Response
) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { fullName, password, country, phoneNumber, emailId, otpHash } =
      req.body;
    if (!fullName || !password || (!emailId && !phoneNumber) || !country) {
      throw new HTTPError("Please provide all required fields", 400);
    }

    const otpHashFinalValue = otpHash ?? autoFetchHash;
    const decryptedPassword = await decryptPassword(password);

    const data: IGenerateOtpData = {
      fullName,
      password: decryptedPassword,
      country,
      phoneNumber,
      emailId,
      otpHash: otpHashFinalValue,
    };

    Helpers.validateWithZod(registrationValidation, data);

    const newUser = await generatedOtpRegistration(data, false);
    if (!newUser)
      throw new HTTPError("Could Not Generate OTP for new User", 204);
    const code = newUser.success ? 200 : 400;
    res.status(code).json(newUser);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      console.log(err);
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const generateOtpForRegistrationSubaccount = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data) throw new HTTPError("API Missing body", 422);
    if (
      !data.fullName ||
      !data.password ||
      (!data.emailId && !data.phoneNumber) ||
      !data.country
    ) {
      throw new HTTPError("Please provide all required fields", 400);
    }
    data.password = await decryptPassword(data.password);
    data.user = user;
    data.otpHash = data.otpHash ?? autoFetchHash;
    Helpers.validateWithZod(registrationValidation, data);
    const checkSubscripton = true;
    const newUser = await generatedOtpRegistration(data, checkSubscripton);
    if (!newUser)
      throw new HTTPError("Could Not Generate OTP for new User", 204);
    const code = newUser.success ? 200 : 400;
    res.status(code).json(newUser);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      console.log(err);
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
export const resendOtpRegistration = async (req: Request, res: Response) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { id, otpHash } = req.body;
    if (!id) {
      throw new HTTPError("Please provide all required fields", 422);
    }
    const data: { id: string; otpHash: string } = {
      id,
      otpHash: otpHash ?? autoFetchHash,
    };

    Helpers.validateWithZod(ResendOtpValidation, data);

    const newUser = await resendOtp(data);
    if (!newUser) throw new HTTPError("Could Not Resend OTP for new User", 204);
    const code = newUser.success ? 200 : 400;
    res.status(code).json(newUser);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const verifyOtpForRegistration = async (
  req: Request,
  res: Response
): Promise<void | verifiedOtpReturnData> => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { id, otp, consent } = req.body;
    if (!id || !otp) {
      throw new HTTPError("please provide all required fields", 422);
    }
    if (!consent) {
      throw new HTTPError("Please provide your consent", 600);
    }

    const data: verifyOtpData = {
      id,
      otp,
      consent,
    };
    Helpers.validateWithZod(verifyOtpForRegistrationValidation, data);

    const otp_data = await verifiedOtpRegistration(data);
    if (!otp_data)
      throw new HTTPError("Could Not Verify OTP for new User", 204);
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

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const data: IRegisterUserdata = req.body;
    if (!data) throw new HTTPError("API Missing body", 422);

    const { id, pincode, bloodGroup, deviceToken } = data;
    //validations
    if (!id || !pincode || !bloodGroup || !deviceToken) {
      throw new HTTPError("Missing required fields", 400);
    }

    Helpers.validateWithZod(createUserRegistration, data);

    const newUserData = await createNewUser(data);

    if (!newUserData) throw new HTTPError("Could Not create new User", 204);
    const code = newUserData.success ? 200 : 400;
    res.status(code).json(newUserData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const loginWithPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { userId, pass, language, deviceToken } = req.body;
    if (!userId || !pass || !language || !deviceToken)
      throw new HTTPError("Missing Required Fields", 422);

    const data: IPasswordLoginData = {
      userId,
      pass,
      language,
      deviceToken,
    };

    Helpers.validateWithZod(loginWithPasswordValidation, data);

    const loginData = await passwordLogin(data);

    if (!loginData) throw new HTTPError("Could Not Log in user", 204);
    const code = loginData.success ? 200 : 400;
    res.status(code).json(loginData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const checkSession = async (req: Request, res: Response) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { userId, password } = req.body;
    if (!userId) {
      throw new HTTPError("missing required field", 422);
    }
    const data: ISessionData = { userId, password };

    Helpers.validateWithZod(sessionInputValidation, data);

    const sessionData = await checkUserSession(data);

    if (!sessionData) throw new HTTPError("Could Not Log in user", 204);
    const code = sessionData.success ? 200 : 400;
    res.status(code).json(sessionData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const loginWithOtpGenerate = async (req: Request, res: Response) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { userId, otpHash } = req.body;

    if (!userId) {
      throw new HTTPError("please provide all required fields", 422);
    }
    const data: IOtpLoginData = { userId, otpHash: otpHash ?? autoFetchHash };

    Helpers.validateWithZod(otpLoginGenerateValidation, data);

    const loginData = await otpLoginGenerate(data);
    if (!loginData)
      throw new HTTPError("Could Not Generate OTP for logging in user", 204);
    const code = loginData.success ? 200 : 400;
    res.status(code).json(loginData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const loginWithOtpVerify = async (req: Request, res: Response) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { userId, verifiedContact, otp, language, deviceToken } = req.body;
    if (!userId || !verifiedContact || !otp || !language || !deviceToken) {
      throw new HTTPError("please provide all required fields", 422);
    }

    const data: IOtpLoginVerifyInput = {
      userId,
      verifiedContact,
      otp,
      language,
      deviceToken,
    };

    Helpers.validateWithZod(otpLoginVerificationValidation, data);

    const loginData = await otpLoginVerify(data);

    if (!loginData) throw new HTTPError("Could Not Log in User", 204);
    const code = loginData.success ? 200 : 400;
    res.status(code).json(loginData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    const logoutData = await userLogout(user);

    if (!logoutData?.success)
      throw new HTTPError("Could Not Log Out User", 204);
    const code = logoutData.success ? 200 : 400;
    res.clearCookie("sessionToken");
    res.status(code).json(logoutData);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const generateOtpForResetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { userId, otpHash } = req.body;
    if (!userId) throw new HTTPError("please provide all required fields", 422);

    const data: { userId: string; otpHash: string } = {
      userId,
      otpHash: otpHash ?? autoFetchHash,
    };
    Helpers.validateWithZod(generateOtpForResetPasswordValidation, data);

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

export const verifiedOtpForResetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    const { verifiedContact, otp, userId } = req.body;

    if (!verifiedContact || !otp) {
      throw new HTTPError("Missing required fields", 422);
    }

    const data: IForgotPasswordInput = {
      userId,
      verifiedContact,
      otp,
    };

    Helpers.validateWithZod(verifyOtpForResetPasswordValidation, data);

    const otp_data = await forgotPasswordVerifyOtp(data);
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

export const userResetPassword = async (req: Request, res: Response) => {
  try {
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { userId, newpassword, isLoggedInWithOTP } = req.body;
    if (!userId || !newpassword) {
      throw new HTTPError("please provide all required fields", 422);
    }

    const hashedNewpassword = await decryptPassword(newpassword);
    const data: IResetPasswordInput = {
      userId,
      newpassword: hashedNewpassword,
    };
    Helpers.validateWithZod(ResetPasswordValidation, data);

    const updated_user = await resetPassword(data, isLoggedInWithOTP);
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

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const data = req.headers.authorization;
    if (!data) throw new HTTPError("Access Token Missing", 400);
    const refreshToken = await generateUserRefreshToken(data);
    if (!refreshToken) throw new HTTPError("could not generate refresh", 204);
    const code = refreshToken.success ? 200 : 400;
    res.status(code).json(refreshToken);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

// Error handling middleware
