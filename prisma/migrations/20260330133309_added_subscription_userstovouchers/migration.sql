/*
  Warnings:

  - You are about to drop the column `transactionId` on the `UsersToVoucher` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[subscriptionId]` on the table `UsersToVoucher` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "UsersToVoucher" DROP CONSTRAINT "UsersToVoucher_transactionId_fkey";

-- DropIndex
DROP INDEX "UsersToVoucher_transactionId_key";

-- AlterTable
ALTER TABLE "UsersToVoucher" DROP COLUMN "transactionId",
ADD COLUMN     "subscriptionId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "UsersToVoucher_subscriptionId_key" ON "UsersToVoucher"("subscriptionId");

-- AddForeignKey
ALTER TABLE "UsersToVoucher" ADD CONSTRAINT "UsersToVoucher_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
