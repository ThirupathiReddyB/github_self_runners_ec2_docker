//Takes only letters and spaces and special characters: hyphen,comma,forward-slash,period
import { z } from "zod";

//**CMS validation admin side
//Takes only letters and spaces and special characters: hyphen,comma,forward-slash,period

//username validation
export const userNameValidation = z
  .string()
  .trim()
  .regex(/^(?=(?:.*[A-Za-z]){2,})[A-Za-z ]+$/, "Enter a valid String");

// takes letters number and . only
export const drNameValidation = z
  .string()
  .trim()
  .regex(/^[A-Za-z\s.]*$/, "Only letters, spaces, and . are allowed")
  .refine(
    (val) => val === "" || (val.trim().length >= 2 && val.trim().length <= 50),
    {
      message: "Dr name must be atleast 2 character and max 50 characters",
    }
  );

export const excludeSpecialCharacter = z
  .string()
  .trim()
  .regex(/^[^"&*%$@~]*$/, `" & * % $ @ ~ are not allowed`);

// takes letters number and . only
export const languageInclusiveDrName = z
  .string()
  .trim()
  .regex(/^[^\d@#$%^&*()_+=\[\]{};:'"<>,\\/|`~\-]*$/, "Only letters, spaces, and . are allowed")
  .refine(
    (val) => val === "" || (val.trim().length >= 2 && val.trim().length <= 50),
    {
      message: "Dr name must be atleast 2 character and max 50 characters",
    }
  );