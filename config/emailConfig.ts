export const emailHost =
  process.env.NODE_ENV === "prod"
    ? "smtp.hostinger.com"
    : "smtpout.secureserver.net";
export const emailPort = process.env.NODE_ENV === "prod" ? 465 : 587;
// export const emailSecure = true;
export const emailService: string =
  process.env.NODE_ENV === "prod" ? "" : "gmail";

export const emailSecure: boolean = emailPort == 465
