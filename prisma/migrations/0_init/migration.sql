-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('complaint', 'feedback');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('auditor', 'admin', 'superAdmin');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('minor', 'subaccount', 'existing', 'sharedMinor');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('view', 'manage');

-- CreateEnum
CREATE TYPE "VerifiedContactId" AS ENUM ('phoneNumber', 'emailId');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'hn', 'mr');

-- CreateEnum
CREATE TYPE "Changes" AS ENUM ('create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "AdvertiseType" AS ENUM ('promotion', 'feature');

-- CreateEnum
CREATE TYPE "AdvertisePosition" AS ENUM ('top', 'bottom');

-- CreateEnum
CREATE TYPE "NotificationCategories" AS ENUM ('family_care');

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fullName" VARCHAR(280) NOT NULL,
    "phoneNumber" VARCHAR(12),
    "emailId" TEXT,
    "password" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "dob" DATE NOT NULL,
    "address" VARCHAR(2048),
    "pincode" VARCHAR(10) NOT NULL,
    "emergencyContact" VARCHAR(12),
    "profileImage" TEXT,
    "QRCodeURL" TEXT,
    "isSync" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "refreshToken" TEXT DEFAULT '',
    "subscription" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "currentSessionId" TEXT,
    "isMigrated" BOOLEAN NOT NULL DEFAULT false,
    "gender" "Gender" NOT NULL,
    "wrongLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "blockedAt" TIMESTAMP(3),
    "deviceToken" TEXT,
    "verifiedContactId" "VerifiedContactId" NOT NULL,
    "inAppNotificationSync" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsersSetting" (
    "appLock" BOOLEAN NOT NULL DEFAULT false,
    "notification" BOOLEAN NOT NULL DEFAULT false,
    "forUserid" TEXT NOT NULL,
    "id" SERIAL NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'en',

    CONSTRAINT "UsersSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveUsers" (
    "id" TEXT NOT NULL,
    "timeStamp" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Notifications" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "readStatus" BOOLEAN NOT NULL DEFAULT false,
    "changeAccessOf" TEXT,
    "AccessText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedUsers" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" VARCHAR(280) NOT NULL,
    "phoneNumber" VARCHAR(12),
    "emailId" TEXT,
    "hashedPassword" TEXT NOT NULL,
    "hashedOTP" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT NOT NULL,

    CONSTRAINT "VerifiedUsers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpStore" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "hashedOTP" TEXT NOT NULL,
    "emailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL DEFAULT 'self',

    CONSTRAINT "OtpStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "presentDiseases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "doctorFullName" VARCHAR(255),
    "docAddress" VARCHAR(2048),
    "docPhoneNumber" VARCHAR(12),
    "additionalInformation" VARCHAR(2048),
    "forDependantId" TEXT,
    "forUserId" TEXT,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fullName" VARCHAR(280) NOT NULL,
    "phoneNumber" VARCHAR(12),
    "dob" DATE NOT NULL,
    "address" VARCHAR(2048),
    "pincode" VARCHAR(10) NOT NULL,
    "emergencyContact" VARCHAR(12),
    "profileImage" TEXT,
    "QRCodeURL" TEXT,
    "isLoggedIn" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "emailId" TEXT,
    "gender" "Gender" NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isSync" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Dependant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "doctorName" VARCHAR(280) NOT NULL,
    "description" VARCHAR(2048) NOT NULL,
    "apptDate" DATE NOT NULL,
    "apptTime" TIME(6) NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'self',
    "forDependantId" TEXT,
    "forUserId" TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notes" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "forDependantId" TEXT,
    "forUserId" TEXT,

    CONSTRAINT "Notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Familylinks" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkFrom" TEXT NOT NULL,
    "linkTo" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "linkType" "LinkType" NOT NULL,
    "sensitiveDataAccess" BOOLEAN NOT NULL DEFAULT false,
    "synced" BOOLEAN NOT NULL DEFAULT true,
    "accessType" "AccessType" NOT NULL DEFAULT 'view',
    "getMedicineReminderOfSecondayUser" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Familylinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncChanges" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,
    "userChanged" TEXT NOT NULL,
    "changeType" "Changes" NOT NULL,
    "recordId" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "familyMember" TEXT NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SyncChanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentImage" TEXT NOT NULL,
    "documentName" VARCHAR(280) NOT NULL,
    "documentCategory" VARCHAR(280) NOT NULL,
    "documentConsultant" VARCHAR(280),
    "notes" VARCHAR(2048),
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "forDependantId" TEXT,
    "forUserId" TEXT,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "Documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insurance" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "policyNum" TEXT NOT NULL,
    "policyName" TEXT NOT NULL,
    "policyType" TEXT,
    "policyImg" TEXT,
    "insuranceProv" TEXT,
    "renewalAt" TIMESTAMP(3) NOT NULL,
    "ifCoPay" DOUBLE PRECISION DEFAULT 100.00,
    "createdBy" TEXT NOT NULL,
    "forDependantId" TEXT,
    "forUserId" TEXT,

    CONSTRAINT "Insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "medName" VARCHAR(280) NOT NULL,
    "medUnit" TEXT NOT NULL DEFAULT 'tablet',
    "medInventory" INTEGER,
    "medDoctor" TEXT,
    "medIntakeTime" TEXT NOT NULL,
    "medIntakePerDose" INTEGER NOT NULL,
    "medIntakeFrequency" TEXT NOT NULL,
    "medDosage" INTEGER DEFAULT 1,
    "MedDosageSchedule" TIMESTAMP(3)[],
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRefill" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "forDependantId" TEXT,
    "forUserId" TEXT,
    "medImage" TEXT,
    "endAt" TIMESTAMP(3),
    "medReminderFrequency" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facPhoneNumber" VARCHAR(12) NOT NULL,
    "facAddress" VARCHAR(2048) NOT NULL,
    "facPincode" VARCHAR(10) NOT NULL,
    "facSpeciality" TEXT[] DEFAULT ARRAY['general']::TEXT[],
    "facType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "facPrimaryName" VARCHAR(2048) NOT NULL,
    "facSecondaryName" VARCHAR(2048),
    "updatedBy" TEXT NOT NULL,
    "facImageURL" TEXT NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardUser" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fullName" VARCHAR(280) NOT NULL,
    "emailId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "refreshToken" TEXT DEFAULT '',
    "currentSessionId" TEXT,
    "position" TEXT NOT NULL,

    CONSTRAINT "DashboardUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vidSourceUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" TEXT NOT NULL,
    "vidName" VARCHAR(2048) NOT NULL,
    "vidTags" TEXT[],

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vimeoDetails" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "playableLink" TEXT NOT NULL,
    "videoId" INTEGER NOT NULL,

    CONSTRAINT "vimeoDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "advName" VARCHAR(2048) NOT NULL,
    "advRedirectLink" TEXT,
    "advSourceUrl" TEXT NOT NULL,
    "isSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" TEXT NOT NULL,
    "advPosition" "AdvertisePosition" NOT NULL DEFAULT 'top',
    "advType" "AdvertiseType" NOT NULL DEFAULT 'promotion',

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalModule" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vitalName" TEXT NOT NULL,
    "vitalCode" TEXT NOT NULL,
    "vitalDataStructure" JSONB[],
    "filters" JSONB[],
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "VitalModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalsUserData" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vitalRecordData" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'self',
    "recordedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vitalCodeId" TEXT NOT NULL,
    "forDependantId" TEXT,
    "forUserId" TEXT,

    CONSTRAINT "VitalsUserData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMessage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "complaintId" BIGINT,
    "emailId" TEXT,
    "message" TEXT NOT NULL,
    "reply" TEXT,
    "replyBy" TEXT,
    "messageType" "MessageType" NOT NULL,
    "userId" TEXT NOT NULL,
    "isReplied" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isReopened" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "UserMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockReasons" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "blockReason" TEXT NOT NULL,
    "blockedBy" TEXT NOT NULL DEFAULT 'auto-block',

    CONSTRAINT "BlockReasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeleteAccountReasons" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "deletedby" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "DeleteAccountReasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardUserOtpStore" (
    "id" SERIAL NOT NULL,
    "hashedOTP" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fullName" VARCHAR(280) NOT NULL,
    "position" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "DashboardUserOtpStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearNotifications" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "localNotifications" TIMESTAMP(3),

    CONSTRAINT "ClearNotifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_id_key" ON "Users"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Users_phoneNumber_key" ON "Users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Users_emailId_key" ON "Users"("emailId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_currentSessionId_key" ON "Users"("currentSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_phoneNumber_emergencyContact_key" ON "Users"("phoneNumber", "emergencyContact");

-- CreateIndex
CREATE UNIQUE INDEX "UsersSetting_forUserid_key" ON "UsersSetting"("forUserid");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveUsers_id_key" ON "ActiveUsers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedUsers_userId_key" ON "VerifiedUsers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedUsers_phoneNumber_key" ON "VerifiedUsers"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedUsers_emailId_key" ON "VerifiedUsers"("emailId");

-- CreateIndex
CREATE UNIQUE INDEX "OtpStore_userId_createdBy_key" ON "OtpStore"("userId", "createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "HealthRecord_forDependantId_key" ON "HealthRecord"("forDependantId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthRecord_forUserId_key" ON "HealthRecord"("forUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Dependant_id_key" ON "Dependant"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_facPhoneNumber_key" ON "Facility"("facPhoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardUser_emailId_key" ON "DashboardUser"("emailId");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardUser_currentSessionId_key" ON "DashboardUser"("currentSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_vidSourceUrl_key" ON "Video"("vidSourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "vimeoDetails_videoId_key" ON "vimeoDetails"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "VitalModule_vitalName_key" ON "VitalModule"("vitalName");

-- CreateIndex
CREATE UNIQUE INDEX "VitalModule_vitalCode_key" ON "VitalModule"("vitalCode");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardUserOtpStore_emailId_key" ON "DashboardUserOtpStore"("emailId");

-- CreateIndex
CREATE UNIQUE INDEX "ClearNotifications_userId_key" ON "ClearNotifications"("userId");

-- AddForeignKey
ALTER TABLE "UsersSetting" ADD CONSTRAINT "UsersSetting_forUserid_fkey" FOREIGN KEY ("forUserid") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveUsers" ADD CONSTRAINT "ActiveUsers_id_fkey" FOREIGN KEY ("id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_forDependantId_fkey" FOREIGN KEY ("forDependantId") REFERENCES "Dependant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependant" ADD CONSTRAINT "Dependant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_forDependantId_fkey" FOREIGN KEY ("forDependantId") REFERENCES "Dependant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notes" ADD CONSTRAINT "Notes_forDependantId_fkey" FOREIGN KEY ("forDependantId") REFERENCES "Dependant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notes" ADD CONSTRAINT "Notes_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_forDependantId_fkey" FOREIGN KEY ("forDependantId") REFERENCES "Dependant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insurance" ADD CONSTRAINT "Insurance_forDependantId_fkey" FOREIGN KEY ("forDependantId") REFERENCES "Dependant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insurance" ADD CONSTRAINT "Insurance_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_forDependantId_fkey" FOREIGN KEY ("forDependantId") REFERENCES "Dependant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "DashboardUser"("emailId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "DashboardUser"("emailId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vimeoDetails" ADD CONSTRAINT "vimeoDetails_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "DashboardUser"("emailId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalModule" ADD CONSTRAINT "VitalModule_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "DashboardUser"("emailId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalsUserData" ADD CONSTRAINT "VitalsUserData_forDependantId_fkey" FOREIGN KEY ("forDependantId") REFERENCES "Dependant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalsUserData" ADD CONSTRAINT "VitalsUserData_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalsUserData" ADD CONSTRAINT "VitalsUserData_vitalCodeId_fkey" FOREIGN KEY ("vitalCodeId") REFERENCES "VitalModule"("vitalCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_replyBy_fkey" FOREIGN KEY ("replyBy") REFERENCES "DashboardUser"("emailId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockReasons" ADD CONSTRAINT "BlockReasons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearNotifications" ADD CONSTRAINT "ClearNotifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

