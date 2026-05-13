import * as dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { handleError } from "./Error";

export const sendMessageToMobile = async (
  phoneNumber: string,
  message: string
) => {
  const options = {
    method: "POST",
    url: process.env.SMS_URL as string,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    data: new URLSearchParams({
      userid: process.env.SMS_USER_ID as string,
      password: process.env.SMS_PASSWORD as string,
      send_to: phoneNumber,
      msg: message,
      method: "sendMessage",
      msg_type: "text",
      format: "json",
      auth_scheme: "plain",
      v: "1.1",
    }),
  };

  try {
    await axios(options);
    return true;
  } catch (error) {
    throw handleError(error);
  }
};
