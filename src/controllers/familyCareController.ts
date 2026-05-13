import { Request, Response } from "express";
import HTTPError from "../utility/HttpError";
import {
  IExistingUserInput,
  IMigrateMinorVerifyOtp,
  INewContactDetailsInput,
  IRegisterUserDataFamilyCare,
  IVerifyOTPForExistingUserInput,
} from "../utility/DataTypes/types.user";

import {
  EditFamilyAccess,
  checkSubsriptionStatus,
  createNewDependant,
  createNewUserFamilyCare,
  UnlinkFamilyMember,
  generateOtpExistingAccount,
  getFamilyMembers,
  migrateDependantToUser,
  releaseMinorGenerateOTP,
  verifyCreateExistingUser,
  deletingDependant,
  deletingFamilyLinks,
  reactivateMinor,
  // generatedOtpDependant,
} from "../services/familyCare.services";

import {
  addNewUserFamilyCareValidation,
  changeAccessValidation,
  dependantRegisterValidation,
  existingUserOtpValidation,
  existingUserValidation,
  releaseMinorInputValidation,
} from "../utility/Validation/familyCareValidations";
import { minorOtpLoginVerificationValidation } from "../utility/Validation/AuthValidation";
import { Helpers } from "../utility/Helpers";
import {
  IChangeAccessType,
  ICreateDependantType,
  IGetFamilyMembersData,
} from "../utility/DataTypes/types.familyCare";
import { autoFetchHash } from "../constants/data";

export const checkSubscription = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    const { checkMinorCount } = req.query;
    if (!user) throw new HTTPError("Unauthorised", 401);

    const checkResponse = await checkSubsriptionStatus(
      user,
      checkMinorCount as string | undefined
    );
    if (!checkResponse)
      throw new HTTPError(`Could Not Create New Dependant`, 204);
    const code = checkResponse.success ? 200 : 400;
    res.status(code).json({ data: checkResponse });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const fcAddNewUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorised", 401);
    }
    const linkFromUserid = user.id;

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const {
      id,
      fullName,
      phoneNumber,
      emailId,
      consent,
      gender,
      dob,
      address,
      pincode,
      emergencyContact,
      bloodGroup,
      createdBy,
      presentDiseases,
      allergies,
      doctorFullName,
      docAddress,
      docPhoneNumber,
      additionalInformation,
      relation,
      profileImage,
      language,
      appLock,
      deviceToken,
    } = req.body;

    if (!id || !pincode || !bloodGroup || !relation) {
      throw new HTTPError("Missing required fields", 422);
    }

    const data: IRegisterUserDataFamilyCare = {
      id,
      fullName,
      phoneNumber,
      emailId,
      consent,
      gender: gender as IRegisterUserDataFamilyCare["gender"],
      dob,
      address,
      pincode,
      emergencyContact,
      bloodGroup,
      createdBy,
      presentDiseases,
      allergies,
      doctorFullName,
      docAddress,
      docPhoneNumber,
      additionalInformation,
      relation,
      profileImage,
      language,
      appLock,
      deviceToken,
      linkFromUserid,
    };

    Helpers.validateWithZod(addNewUserFamilyCareValidation, data);

    const addedNewFamilyCareUser = await createNewUserFamilyCare(data, user);
    if (!addedNewFamilyCareUser) {
      throw new HTTPError("could not create new family care user", 204);
    }
    const code = addedNewFamilyCareUser.success ? 200 : 400;
    res.status(code).json({ data: addedNewFamilyCareUser });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const existingUserSendOtp = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("Unauthorized", 401);
    }
    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { uuid, relation, connectMinor, linkToParent, otpHash } = req.body;
    if (!uuid || !relation) {
      throw new HTTPError("missing required fields", 422);
    }

    const linkFromUserName = user.fullName;
    const data: IExistingUserInput = {
      uuid,
      relation,
      userData: user,
      linkFromUserName,
      connectMinor,
      linkToParent,
      otpHash: otpHash ?? autoFetchHash,
    };

    Helpers.validateWithZod(existingUserValidation, data);

    const addedExistingUser = await generateOtpExistingAccount(data);
    if (!addedExistingUser) {
      throw new HTTPError("could not create a link for existing user", 204);
    }
    const code = addedExistingUser.success ? 200 : 400;
    res.status(code).json({ data: addedExistingUser });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const createExistingUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      throw new HTTPError("unauthorized", 401);
    }

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { uuid, otp, relation, connectMinor, linkToParent } = req.body;
    if (!uuid || !relation || !otp) {
      throw new HTTPError("missing required fields", 422);
    }

    const linkFromUserId = user.id;
    const data: IVerifyOTPForExistingUserInput = {
      uuid,
      otp,
      relation,
      connectMinor,
      linkToParent,
      user,
      linkFromUserId,
    };

    Helpers.validateWithZod(existingUserOtpValidation, data);

    const user_linked = await verifyCreateExistingUser(data);
    if (!user_linked) {
      throw new HTTPError("could not create a link for existing user", 204);
    }
    const code = user_linked.success ? 200 : 400;
    res.status(code).json({ data: user_linked });
  } catch (err) {
    console.log("error", err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const createDependant = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const {
      fullName,
      gender,
      dob,
      pincode,
      bloodGroup,
      relation,
      address,
      emergencyContact,
      presentDiseases,
      allergies,
      doctorFullName,
      docAddress,
      docPhoneNumber,
      additionalInformation,
      profileImage,
    } = req.body;
    if (!fullName || !gender || !dob || !pincode || !bloodGroup || !relation) {
      throw new HTTPError("Please provide all required fields", 422);
    }

    const data: ICreateDependantType = {
      fullName,
      gender: gender as ICreateDependantType["gender"],
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
      relation,
      profileImage,
    };

    Helpers.validateWithZod(dependantRegisterValidation, data);

    const new_dependant = await createNewDependant(data, user);
    if (!new_dependant)
      throw new HTTPError(`Could Not Create New Dependant`, 204);
    const code = new_dependant.success ? 200 : 400;
    res.status(code).json({ data: new_dependant });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
export const deleteDependant = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const dependantId = req.params.id;
    if (!dependantId) {
      throw new HTTPError("Please provide id", 422);
    }

    const new_dependant = await deletingDependant(dependantId, user);
    if (!new_dependant)
      throw new HTTPError(`Could Not Create New Dependant`, 204);
    const code = new_dependant.success ? 200 : 400;
    res.status(code).json({ data: new_dependant });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const getAllFamily = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    if (!user.id) {
      throw new HTTPError("user id missing", 401);
    }

    const { accessType, linkType, relation } = req.query;

    const queryParams: IGetFamilyMembersData = {
      accessType: accessType?.toString() ?? undefined,
      linkType: linkType?.toString() ?? undefined,
      relation: relation?.toString() ?? undefined,
    };

    const allfamily = await getFamilyMembers(user.id, queryParams);
    if (!allfamily) throw new HTTPError(`Could Not find any family`, 204);
    const code = allfamily.success ? 200 : 400;
    res.status(code).json({ data: allfamily });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const changeFamilyAccess = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const {
      memberId,
      access,
      sensitiveAccess,
      linkFromMinor,
      getMedicineReminderOfSecondayUser,
    } = req.body;
    if (!memberId || !access)
      throw new HTTPError("Missing Required Fields", 422);

    const data: IChangeAccessType = {
      memberId,
      access,
      sensitiveAccess,
      linkFromMinor: linkFromMinor ?? undefined,
      getMedicineReminderOfSecondayUser,
    };

    Helpers.validateWithZod(changeAccessValidation, data);

    const ChangeAccess = await EditFamilyAccess(user, data);
    if (!ChangeAccess) throw new HTTPError(`Could Not change access`, 204);
    const code = ChangeAccess.success ? 200 : 400;
    res.status(code).json({ data: ChangeAccess });
  } catch (err) {
    console.log("error", err);
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const detachFamilyMember = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware

    if (!user) throw new HTTPError("Unauthorised", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { famCareMemberId, linkFromMinor } = req.body;

    if (!user.id || !famCareMemberId) {
      throw new HTTPError("Required fields missing", 422);
    }
    const detachUser = await UnlinkFamilyMember(
      user.id,
      famCareMemberId,
      linkFromMinor
    );
    if (!detachUser)
      throw new HTTPError(`Could Not Detach User from Family Care`, 204);
    const code = detachUser.success ? 200 : 400;
    res.status(code).json({ data: detachUser });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const releaseMinorGenerateOtp = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { minorId, phoneNumber, emailId, otpHash } = req.body;
    if ((!minorId && !phoneNumber) || (!minorId && !emailId))
      throw new HTTPError("Missing required fields", 422);

    const data: INewContactDetailsInput = {
      id: minorId,
      phoneNumber,
      emailId,
      otpHash: otpHash ?? autoFetchHash,
    };

    Helpers.validateWithZod(releaseMinorInputValidation, data);

    const detachUser = await releaseMinorGenerateOTP(user, data);
    if (!detachUser)
      throw new HTTPError(`Could Not Detach User from Family Care`, 204);
    const code = detachUser.success ? 200 : 400;
    res.status(code).json({ data: detachUser });
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

export const releaseMinorVerifyOtp = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();

    const { userId, verifiedContact, otp } = req.body;
    if (!userId || !verifiedContact || !otp)
      throw new HTTPError("Missing Required Fields", 422);

    const data: IMigrateMinorVerifyOtp = {
      userId,
      verifiedContact,
      otp,
    };

    Helpers.validateWithZod(minorOtpLoginVerificationValidation, data);

    const otpverifyResponse = await migrateDependantToUser(user, data);

    if (!otpverifyResponse) throw new HTTPError("Could not migrate minor", 204);
    const code = otpverifyResponse.success ? 200 : 400;
    res.status(code).json(otpverifyResponse);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//deleting links

export const deleteFamilyLinks = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);

    const {subscription} = req.query
    const subFlag = subscription?subscription=="true"?true:false:undefined

    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data.linkTo) {
      throw new HTTPError("Missing required fields", 422);
    }

    const deletedFamilyLinks = await deletingFamilyLinks(data.linkTo, user.id,subFlag);
    // const deletedFamilyLinks = await deletingFamilyLinks(data.linkTo, user.id);

    if (!deletedFamilyLinks) throw new HTTPError("Could not delete links", 204);
    const code = deletedFamilyLinks.success ? 200 : 400;
    res.status(code).json(deletedFamilyLinks);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};

//re-activate minor links 
export const reactivateMinorLinks  = async (req: Request, res: Response) => {
  try {
    const user = req.user; // access user object attached in the middleware
    if (!user) throw new HTTPError("Unauthorised", 401);
    const data =
      req.body ??
      (() => {
        throw new HTTPError("API Missing body", 422);
      })();
    if (!data.linkTo) {
      throw new HTTPError("Missing required fields", 422);
    }

    const reactivatedLinks = await reactivateMinor(data.linkTo, user);
    // const reactivatedLinks = await deletingFamilyLinks(data.linkTo, user.id);

    if (!reactivatedLinks) throw new HTTPError("Could not re-activate minor", 204);
    const code = reactivatedLinks.success ? 200 : 400;
    res.status(code).json(reactivatedLinks);
  } catch (err) {
    if (err instanceof HTTPError) {
      res.status(err.code).json({ error: { message: err.message } });
    } else {
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }
};
