import { $Enums, Role } from "../../../prisma/generated/prisma/client";

export type adminTokenData = {
  id: string;
  role: string;
  emailId: string;
  accessToken: string;
};

export type createAdminInput = {
  fullName: string;
  emailId: string;
  position: string;
};

export enum role {
  auditor = "auditor",
  superAdmin = "superAdmin",
  admin = "admin",
}

export type emailData = {
  emailId: string;
  subject: string;
  role?: role;
  fullName: string;
};

export type complaintData = {
  emailId: string;
  admin_reply?: string;
  user_complaintId: BigInt | null;
  name: string;
};

export type createAdminAuditorInput = {
  fullName: string;
  emailId: string;
  password: string;
  position: string;
  role: Role;
};

export type updateAdminAuditorInput = {
  emailId?: string;
  fullName?: string;
  position?: string;
  role?: Role;
};

// export type createAdminAuditorInput = {
//   fullName: string;
//   emailId: string;
//   password: string;
//   role :
// };

export type generateAccessTokenAdminInput = {
  emailId: string;
  id: number;
  role: $Enums.Role;
  currentSessionId: string;
};
