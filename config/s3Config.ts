import AWS from "aws-sdk";
import { SQSClient } from "@aws-sdk/client-sqs";

AWS.config.region = process.env.AWS_REGION_DEV;
const accessKey = process.env.AWS_ACCESS_KEY_DEV;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY_DEV;

AWS.config.update({
  accessKeyId: accessKey,
  secretAccessKey: secretKey,
});
export const s3 = new AWS.S3();
export const sns = new AWS.SNS();
export const cloudfront = new AWS.CloudFront();

export const sqs = new SQSClient({
  region: process.env.AWS_REGION_DEV as string,
});
