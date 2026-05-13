import { statusCodes } from "./StatusCodes";

export const formResponse = (code:number, data:any) => {
  return {
    status_code: code,
    flag: statusCodes[code].flag,
    message: statusCodes[code].message,
    data: data,
  };
};
