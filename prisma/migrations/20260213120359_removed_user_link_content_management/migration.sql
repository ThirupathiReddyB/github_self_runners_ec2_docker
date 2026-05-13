/*
  Warnings:

  - Made the column `referal_code` on table `Users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Advertisement" DROP CONSTRAINT "Advertisement_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "Facility" DROP CONSTRAINT "Facility_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "UserMessage" DROP CONSTRAINT "UserMessage_replyBy_fkey";

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "VitalModule" DROP CONSTRAINT "VitalModule_updatedBy_fkey";

-- AlterTable
ALTER TABLE "Facility" ALTER COLUMN "lat" DROP DEFAULT,
ALTER COLUMN "long" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Users" ALTER COLUMN "referal_code" SET NOT NULL;
