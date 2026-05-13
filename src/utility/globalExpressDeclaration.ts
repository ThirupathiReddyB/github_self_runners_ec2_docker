import { adminTokenData } from "../utility/DataTypes/types.admin";
import { IVersionData } from "./DataTypes/types.common";
import { ITokenData } from "./DataTypes/types.user";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DEPENDANTPASSWORD: string;
    }
  }
  namespace Express {
    interface Request {
      admin?: adminTokenData;
      user?: ITokenData;
      version?:IVersionData;
      expiredToken?: {
        accessToken: string;
      };
    }
  }
}
