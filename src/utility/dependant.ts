import { Dependant } from "../../prisma/generated/prisma/client";
import prisma from "../prisma";
import { IUpdateData } from "./DataTypes/types.user";
import { formatDateForDB } from "./DateTimeFormatters";
import { ParsedQs } from 'qs';

export const updateDependant = async (data:IUpdateData,{famCareMemberId}:ParsedQs,findMinor:Dependant|null,imageLink:any) => {
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

    const updateUser = await prisma.dependant.update({
        where: {
          id: (famCareMemberId as string)?.toLowerCase(),
        },
        data: {
          phoneNumber: phoneNumber == "" ? null : phoneNumber,
          emailId: emailId == "" ? null : emailId?.toLowerCase(),
          gender,
          dob: dob ? formatDateForDB(dob) : findMinor?.dob,
          address,
          pincode,
          profileImage: imageLink ?? findMinor?.profileImage,
          emergencyContact,
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
}