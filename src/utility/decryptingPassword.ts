import cryptoJs from "crypto-js";
import dotenv from "dotenv";
dotenv.config();

export const decryptPassword = async (password: string) => {
  const decryptedPassword = cryptoJs.AES.decrypt(password, process.env.DECRYPTKEY as string);
  return decryptedPassword.toString(cryptoJs.enc.Utf8);
};

export const encryptPassword = async (password: string) => {
   const key = process.env.DECRYPTKEY as string
    if(!key){
        console.error("AES encryption key is not defined in environment variables.");
        return '';
    }
  const encryptedPassword = cryptoJs.AES.encrypt(password, key);
  return encryptedPassword.toString();
}
