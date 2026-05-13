-- DropIndex
DROP INDEX "Facility_facPhoneNumber_key";

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "additionalAddress" VARCHAR(2048),
ADD COLUMN     "closeTime" VARCHAR(10),
ADD COLUMN     "openTime" VARCHAR(10);
