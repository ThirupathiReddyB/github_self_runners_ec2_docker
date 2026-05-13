import HTTPError from "./HttpError";
import { refundErrorCodes } from "./StatusCodes";

export const handleError = (err: unknown) => {
  console.log("Error->Log:", err);

  if (err instanceof HTTPError) {
    return new HTTPError(err.formDetail || err.message, err.code);
  } else if (err instanceof Error) {
    if (err.name === "PrismaClientKnownRequestError") {
      return new HTTPError("Prisma client error", 412);
    }
    return new HTTPError("Internal Server Error", 500);
  } else {
    return new HTTPError("Internal Server Error", 500);
  }
};

export const handleRefundResponse = async (
  parsedBody: any,
  // txnId: number,
  // amount: number,
  // refundId: string
) => {
  try{
  const { error_code } = parsedBody;
  const errorDetails = refundErrorCodes[parseInt(error_code)] || {
    status: "UNKNOWN",
    message: "Unknown Error Code",
  };



  throw new HTTPError( `Refund Status: ${errorDetails.status}, Message: ${errorDetails.message}`,661)
}
catch(err){
  handleError(err)
}
};
