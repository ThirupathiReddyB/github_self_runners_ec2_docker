/*
  Warnings:

  - A unique constraint covering the columns `[referal_code]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,referal_code]` on the table `Users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('plan', 'voucher', 'add_on');

-- CreateEnum
CREATE TYPE "PlanPeriod" AS ENUM ('weekly', 'monthly', 'yearly', 'unlimited');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('generic', 'partner', 'referal');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('active', 'inactive', 'upcoming');

-- CreateEnum
CREATE TYPE "Faqtype" AS ENUM ('payment', 'selfAwarness', 'general');

-- CreateEnum
CREATE TYPE "cName" AS ENUM ('family_care', 'health_analysis', 'video', 'blog', 'story', 'reel', 'sos', 'appointment_booking', 'discount_on_medicine', 'medicine_delivery', 'insurance', 'storage', 'advertisement');

-- CreateEnum
CREATE TYPE "Value" AS ENUM ('Int', 'String', 'Boolean');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('video', 'reel', 'default_video');

-- AlterTable
ALTER TABLE "Advertisement" ADD COLUMN     "advEnd" TIMESTAMP(3),
ADD COLUMN     "advStart" TIMESTAMP(3),
ADD COLUMN     "advTimeLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "voucher_id" INTEGER,
ALTER COLUMN "priority" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "long" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "referal_code" TEXT,
ADD COLUMN     "refered_by" TEXT;

-- CreateTable
CREATE TABLE "vitalSync" (
    "id" SERIAL NOT NULL,
    "lastSync" TIMESTAMP(3),
    "vitalCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "vitalSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageImage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messageId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "MessageImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "canonicalName" "cName" NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metadata" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "value" JSONB NOT NULL,
    "remark" TEXT NOT NULL,
    "feature_id" INTEGER NOT NULL,

    CONSTRAINT "Metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "plan_code" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVariants" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" "PlanPeriod" NOT NULL,
    "interval" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "default_expiry" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "planId" INTEGER NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "PlanVariants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanToFeature" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "plan_variant_id" INTEGER NOT NULL,
    "feature_id" INTEGER NOT NULL,
    "metadata_id" INTEGER NOT NULL,

    CONSTRAINT "PlanToFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "VoucherType" NOT NULL DEFAULT 'generic',
    "partner_email" TEXT,
    "description" TEXT NOT NULL,
    "min_spend" INTEGER DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL,
    "expires_at" TIMESTAMP(3),
    "redeem_limit" INTEGER,
    "availed_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "locked_at" TIMESTAMP(3),
    "lockedBy" TEXT,
    "updatedBy" TEXT NOT NULL,
    "advertisement_type" TEXT,
    "voucher_banner" TEXT,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Addon" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "period" "PlanPeriod" NOT NULL,
    "interval" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "updatedBy" TEXT NOT NULL,
    "featureId" INTEGER NOT NULL,

    CONSTRAINT "Addon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserToAddOn" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "addon_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "UserToAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQS" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "type" "Faqtype" NOT NULL,

    CONSTRAINT "FAQS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "plan_variant_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "dependant_id" TEXT,
    "status" "Status" NOT NULL DEFAULT 'active',

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txnid" TEXT NOT NULL,
    "payment_mode" TEXT NOT NULL,
    "payment_source" TEXT NOT NULL DEFAULT 'payu',
    "bank_ref_number" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_full_name" TEXT NOT NULL,
    "user_address" TEXT,
    "gst" INTEGER NOT NULL,
    "error" TEXT NOT NULL,
    "mihpayid" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Items" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "planDetails" JSONB,
    "amount" INTEGER NOT NULL,
    "transactionId" INTEGER NOT NULL,

    CONSTRAINT "Items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blog" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "author" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read_time" INTEGER NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryImage" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "storyId" INTEGER NOT NULL,
    "title" VARCHAR(280),
    "description" VARCHAR(2048),
    "filename" TEXT NOT NULL,

    CONSTRAINT "StoryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "msme_no" TEXT NOT NULL,
    "gst" INTEGER NOT NULL,
    "company_logo" TEXT NOT NULL,
    "signatory" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tags" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UsersToVoucher" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UsersToVoucher_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BlogToTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BlogToTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StoryToTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_StoryToTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TagsToVideo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TagsToVideo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "vitalSync_userId_vitalCodeId_key" ON "vitalSync"("userId", "vitalCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_name_key" ON "Feature"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_canonicalName_key" ON "Feature"("canonicalName");

-- CreateIndex
CREATE UNIQUE INDEX "Metadata_feature_id_value_key" ON "Metadata"("feature_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_plan_code_key" ON "Plan"("plan_code");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVariants_period_interval_planId_key" ON "PlanVariants"("period", "interval", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Addon_name_key" ON "Addon"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txnid_key" ON "Transaction"("txnid");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_title_key" ON "Blog"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Story_title_key" ON "Story"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Tags_name_key" ON "Tags"("name");

-- CreateIndex
CREATE INDEX "_UsersToVoucher_B_index" ON "_UsersToVoucher"("B");

-- CreateIndex
CREATE INDEX "_BlogToTags_B_index" ON "_BlogToTags"("B");

-- CreateIndex
CREATE INDEX "_StoryToTags_B_index" ON "_StoryToTags"("B");

-- CreateIndex
CREATE INDEX "_TagsToVideo_B_index" ON "_TagsToVideo"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Users_referal_code_key" ON "Users"("referal_code");

-- CreateIndex
CREATE UNIQUE INDEX "Users_id_referal_code_key" ON "Users"("id", "referal_code");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_refered_by_fkey" FOREIGN KEY ("refered_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitalSync" ADD CONSTRAINT "vitalSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitalSync" ADD CONSTRAINT "vitalSync_vitalCodeId_fkey" FOREIGN KEY ("vitalCodeId") REFERENCES "VitalModule"("vitalCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageImage" ADD CONSTRAINT "MessageImage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "UserMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVariants" ADD CONSTRAINT "PlanVariants_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanToFeature" ADD CONSTRAINT "PlanToFeature_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanToFeature" ADD CONSTRAINT "PlanToFeature_metadata_id_fkey" FOREIGN KEY ("metadata_id") REFERENCES "Metadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanToFeature" ADD CONSTRAINT "PlanToFeature_plan_variant_id_fkey" FOREIGN KEY ("plan_variant_id") REFERENCES "PlanVariants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addon" ADD CONSTRAINT "Addon_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToAddOn" ADD CONSTRAINT "UserToAddOn_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "Addon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToAddOn" ADD CONSTRAINT "UserToAddOn_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_variant_id_fkey" FOREIGN KEY ("plan_variant_id") REFERENCES "PlanVariants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_dependant_id_fkey" FOREIGN KEY ("dependant_id") REFERENCES "Dependant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Items" ADD CONSTRAINT "Items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryImage" ADD CONSTRAINT "StoryImage_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UsersToVoucher" ADD CONSTRAINT "_UsersToVoucher_A_fkey" FOREIGN KEY ("A") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UsersToVoucher" ADD CONSTRAINT "_UsersToVoucher_B_fkey" FOREIGN KEY ("B") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogToTags" ADD CONSTRAINT "_BlogToTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogToTags" ADD CONSTRAINT "_BlogToTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoryToTags" ADD CONSTRAINT "_StoryToTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoryToTags" ADD CONSTRAINT "_StoryToTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagsToVideo" ADD CONSTRAINT "_TagsToVideo_A_fkey" FOREIGN KEY ("A") REFERENCES "Tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagsToVideo" ADD CONSTRAINT "_TagsToVideo_B_fkey" FOREIGN KEY ("B") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;



INSERT INTO "Plan" ("name", "updated_at", "plan_code", "updatedBy", "notes")
VALUES 
  ('Premium Plan', NOW(), 'premium_001', 'system', 'Default plan for all users'),
  ('Free Plan', NOW(), 'free_000', 'system', 'Free plan for all users')
ON CONFLICT ("plan_code") DO NOTHING;

-- Insert plan variants only if not already present for the given plan
INSERT INTO "PlanVariants" ("name", "period", "interval", "amount", "is_default", "planId", "updatedBy")
SELECT * FROM (
    SELECT 
        'Quaterly' AS name,
         'monthly'::"PlanPeriod" AS period,
        3 AS interval,
        1599 AS amount,
        true AS is_default,
        p.id AS planId,
        'system' AS updatedBy
    FROM "Plan" p 
    WHERE p.plan_code = 'premium_001'
      AND NOT EXISTS (
          SELECT 1 FROM "PlanVariants" pv WHERE pv."planId" = p.id AND pv.name = 'Quaterly'
      )

    UNION ALL

    SELECT 
        'Free' AS name,
         'unlimited'::"PlanPeriod" AS period,
        0 AS interval,
        0.0 AS amount,
        false AS is_default,
        p.id AS planId,
        'system' AS updatedBy
    FROM "Plan" p 
    WHERE p.plan_code = 'free_000'
      AND NOT EXISTS (
          SELECT 1 FROM "PlanVariants" pv WHERE pv."planId" = p.id AND pv.name = 'Free'
      )
) AS insert_variants(name, period, interval, amount, is_default, planId, updatedBy);


DO $$
DECLARE
  premium_id INT;
  premium_interval INT;
  premium_period TEXT;
  free_id INT;
BEGIN
  -- Get premium default plan variant
  SELECT pv.id, pv.interval, pv.period INTO premium_id, premium_interval, premium_period
  FROM "PlanVariants" pv
  JOIN "Plan" p ON pv."planId" = p.id
  WHERE p."plan_code" = 'premium_001' AND pv."is_default" = true
  LIMIT 1;

  -- Get free variant
  SELECT pv.id INTO free_id
  FROM "PlanVariants" pv
  JOIN "Plan" p ON pv."planId" = p.id
  WHERE p."plan_code" = 'free_000' AND pv."is_default" = false
  LIMIT 1;

  -- Insert active subscription for users without one
  INSERT INTO "Subscription" ("user_id", "plan_variant_id", "status", "created_at", "updated_at", "expires_at")
  SELECT
    u.id,
    premium_id,
    'active',
    NOW(),
    NOW(),
    CASE
      WHEN premium_period = 'monthly' THEN NOW() + (premium_interval || ' month')::interval
      WHEN premium_period = 'weekly' THEN NOW() + (premium_interval || ' week')::interval
      WHEN premium_period = 'yearly' THEN NOW() + (premium_interval || ' year')::interval
      WHEN premium_period = 'unlimited' THEN NULL
      ELSE NOW()
    END
  FROM "Users" u
  WHERE NOT EXISTS (
    SELECT 1 FROM "Subscription" s WHERE s.user_id = u.id
  );

  -- Insert inactive free subscription for users without any
 INSERT INTO "Subscription" ("user_id", "plan_variant_id", "status", "created_at", "updated_at")
SELECT
  u.id,
  free_id,
  'inactive',
  NOW(),
  NOW()
FROM "Users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" s 
  WHERE s.user_id = u.id AND s.plan_variant_id = free_id
);

  -- Insert active free subscription for dependants without any
  INSERT INTO "Subscription" ("dependant_id", "plan_variant_id", "status", "created_at", "updated_at")
  SELECT
    d.id,
    free_id,
    'active',
    NOW(),
    NOW()
  FROM "Dependant" d
  WHERE NOT EXISTS (
    SELECT 1 FROM "Subscription" s WHERE s.dependant_id = d.id
  );

END $$;

-- Generate referral code for users who don't have one
DO $$
DECLARE
  u RECORD;
  code TEXT;
BEGIN
  FOR u IN
    SELECT id FROM "Users" WHERE referal_code IS NULL
  LOOP
    -- Generate a unique code
    LOOP
      code := (
        SELECT string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', trunc(random()*26)::int+1, 1), '')
        FROM generate_series(1, 4)
      ) || (
        SELECT string_agg(trunc(random()*10)::int::text, '')
        FROM generate_series(1, 4)
      );

      -- Ensure the code is unique
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "Users" WHERE referal_code = code
      );
    END LOOP;

    -- Assign the code to the user
    UPDATE "Users"
    SET referal_code = code
    WHERE id = u.id;
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;



-- END OF MIGRATION --

