import { JsonObject } from "@prisma/client/runtime/client";


class HTTPError extends Error {
  code: number;
  formDetail?: JsonObject; // Stores field-specific errors

  constructor(message: string | JsonObject, code: number) {
    let errorMessage = "Invalid form data"; // Default message
    let formDetail: JsonObject | undefined;

    if (typeof message === "string") {
      errorMessage = message;
    } else if (message instanceof Error) {
      errorMessage = message.message;
    } else {
      formDetail = message;
    }

    super(errorMessage);
    this.code = code;
    this.formDetail = formDetail;

    if (formDetail) {
      console.log(this.formDetail, "set details");
    }
  }
}

export default HTTPError;
