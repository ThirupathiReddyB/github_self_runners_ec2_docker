/*
  Warnings:

  - You are about to drop the column `plan_description` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "plan_description";

-- AlterTable
ALTER TABLE "PlanVariants" ADD COLUMN     "variant_description" VARCHAR(1024) NOT NULL DEFAULT 'New Plan Variant';
