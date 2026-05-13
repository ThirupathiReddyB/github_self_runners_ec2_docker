import prisma from "../prisma";
import { remainingTime } from "./BlockUserRemainingTime";
import { IUserWithSettings } from "./DataTypes/types.user";
import { decryptPassword } from "./decryptingPassword";
import HTTPError from "./HttpError";
import bcrypt from 'bcrypt';

export const checkPassword = async (password:string | undefined,findUser:IUserWithSettings) => {
    if (password) {
      //if minor logging in for the first time
      password = await decryptPassword(password);
      if (
        findUser.password === process.env.DEPENDANTPASSWORD &&
        findUser.isMigrated
      ) {
        throw new HTTPError("Password is not set. Login Using OTP", 604);
      }
        if (!bcrypt.compareSync(password, findUser.password)) {
            await handleLoginAttempts(findUser);
      }
    }

}

export const handleLoginAttempts = async (findUser:IUserWithSettings) => {
    
        const totalLoginAttempts = await prisma.users.update({
          where: {
            id: findUser.id.toLowerCase(),
          },
          data: {
            wrongLoginAttempts: findUser.wrongLoginAttempts + 1,
          },
        });
        if (totalLoginAttempts.wrongLoginAttempts >= 5) {
          const updatedData = await prisma.users.update({
            where: {
              id: findUser.id.toLowerCase(),
            },
            data: {
              isBlocked: true,
              blockedAt: new Date(),
            },
          });

          await prisma.blockReasons.create({
            data: {
              blockReason: "auto-block",
              blockedBy: "app",
              user: {
                connect: {
                  id: findUser.id.toLowerCase(),
                },
              },
            },
          });

          if (
            updatedData.isBlocked &&
            updatedData.blockedAt &&
            updatedData.wrongLoginAttempts === 5
          ) {
            const error = await remainingTime(updatedData.blockedAt);
            throw new HTTPError(JSON.stringify(error), 603);
          }
        }
        const remainingAttempts = 5 - totalLoginAttempts.wrongLoginAttempts;
        const error = {
          message: `Invalid credentials .You will be blocked after ${remainingAttempts} unsuccessfull attempts`,
          remainingAttempts: remainingAttempts,
          isUserBlocked: false,
        };
        throw new HTTPError(JSON.stringify(error), 401);
      
}