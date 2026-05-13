import HTTPError from "./HttpError";

export const validateGenderSpecificRecords = async (
  gender: string,
  vitalCode: string
) => {
  if (gender == "male" && vitalCode == "period01")
    throw new HTTPError(
      "Cannot Add Record for male,please re enter the whole data",
      612
    );
};
