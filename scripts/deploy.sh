#!/bin/bash

set -e

REGION=ap-south-1
IMAGE=nodejs-testing

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

aws ecr get-login-password \
  --region $REGION \
  | docker login \
  --username AWS \
  --password-stdin $ECR_URI

docker pull $ECR_URI/$IMAGE:latest

docker stop $IMAGE || true
docker rm $IMAGE || true

mkdir -p /opt/nodejs-testing

aws secretsmanager get-secret-value \
  --secret-id testing-dev \
  --query SecretString \
  --output text > /opt/nodejs-testing/.env

docker run -d \
  --name $IMAGE \
  --restart unless-stopped \
  --env-file /opt/nodejs-testing/.env \
  -p 3000:3000 \
  $ECR_URI/$IMAGE:latest
