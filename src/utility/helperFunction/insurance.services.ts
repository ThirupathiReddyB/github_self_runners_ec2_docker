import { Insurance } from "../../../prisma/generated/prisma/client";
import { deleteFile } from "../aws/deleteFile";
import { uploadFileToS3 } from "../FileOperations";
import HTTPError from "../HttpError";
import { ParsedQs } from "qs";

export const getPolicyURL = async (
  file: Express.Multer.File ,
  policy_to_update: Insurance,
  { famCareMemberId }: ParsedQs,
  userId: string
) => {
  let policyURL = null;
  //if file exists, delete from aws and re-upload
  if (file && policy_to_update.policyImg != null) {
    const fileName = decodeURIComponent(
      policy_to_update.policyImg.split("/")[4]
    );
    const result = famCareMemberId
      ? await deleteFile(fileName, (famCareMemberId as string)?.toLowerCase())
      : await deleteFile(fileName, userId.toLowerCase());
    if (!result) throw new HTTPError("Could not delete file from s3", 502);
    if (famCareMemberId) {
      policyURL = await uploadFileToS3(
        file,
        "Insurance",
        famCareMemberId as string
      );
    } else {
      policyURL = await uploadFileToS3(file, "Insurance", userId);
    }
  }
  //else if file and no existing file, upload
  else if (file && policy_to_update.policyImg == null) {
    if (famCareMemberId) {
      policyURL = await uploadFileToS3(
        file,
        "Insurance",
        famCareMemberId as string
      );
    } else {
      policyURL = await uploadFileToS3(file, "Insurance", userId);
    }
  }
  //else, keep existing url
  else {
    policyURL = policy_to_update.policyImg;
  }
  return policyURL;
};
