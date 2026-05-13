-- CreateEnum
CREATE TYPE "AppEnv" AS ENUM ('ios', 'android');

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "is_app_new_version" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "app_version" TEXT NOT NULL,
    "app_env" "AppEnv" NOT NULL,
    "is_force" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionFeatures" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "appVersionId" INTEGER NOT NULL,
    "feature_description" TEXT NOT NULL,

    CONSTRAINT "VersionFeatures_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VersionFeatures" ADD CONSTRAINT "VersionFeatures_appVersionId_fkey" FOREIGN KEY ("appVersionId") REFERENCES "AppVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
