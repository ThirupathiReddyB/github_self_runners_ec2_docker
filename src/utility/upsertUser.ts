import { Users } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";
import { formatDateForDB } from "./DateTimeFormatters";
import HTTPError from "./HttpError";
import { generateUserId } from "./UserId";
import { IUpdateData } from "./DataTypes/types.user";

export const upsertVerifiedUsers = async (
  fullName: string,
  hashedPassword: string,
  hashedotp: string,
  country: string,
  phoneNumber?: string,
  emailId?: string
) => {
  if (phoneNumber) {
    const UnverifiedUser = await prisma.verifiedUsers.upsert({
      where: {
        phoneNumber,
      },
      update: {
        fullName,
        phoneNumber,
        hashedPassword,
        hashedOTP: hashedotp,
        isVerified: false,
        country,
      },
      create: {
        userId: generateUserId(),
        fullName,
        phoneNumber,
        hashedPassword,
        hashedOTP: hashedotp,
        country,
      },
    });

    if (!UnverifiedUser)
      throw new HTTPError("Could not store data of user", 500);
    if (!UnverifiedUser)
      throw new HTTPError("Could not store data of user", 500);

    return UnverifiedUser;
  } else {
    const UnverifiedUser = await prisma.verifiedUsers.upsert({
      where: {
        emailId: emailId?.toLowerCase(),
      },
      update: {
        fullName,
        emailId: emailId?.toLowerCase(),
        hashedPassword,
        hashedOTP: hashedotp,
        isVerified: false,
        country,
      },
      create: {
        userId: generateUserId(),
        fullName,
        emailId: emailId?.toLowerCase(),
        hashedPassword,
        hashedOTP: hashedotp,
        country,
      },
    });

    if (!UnverifiedUser)
      throw new HTTPError("Could not store data of user", 500);

    return UnverifiedUser;
  }
};

export const updateUserData = async (
  data: IUpdateData,
  userId: string,
  findUser: Users,
  imageLink: string | null
) => {
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
  const updateUser = await prisma.users.update({
    where: {
      id: userId.toLowerCase(),
    },
    data: {
      phoneNumber:
        phoneNumber !== undefined ? { set: phoneNumber ?? null } : undefined,
      emailId:
        emailId !== undefined
          ? { set: emailId?.toLowerCase() ?? null }
          : undefined,
      gender,
      dob: dob ? formatDateForDB(dob) : findUser?.dob,
      address,
      pincode,
      emergencyContact,
      isSync: false,
      profileImage: imageLink ?? findUser.profileImage,
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

  return updateUser;
};
