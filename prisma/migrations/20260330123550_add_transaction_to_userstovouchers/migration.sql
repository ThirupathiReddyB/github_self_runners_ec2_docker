/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `UsersToVoucher` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UsersToVoucher" ADD COLUMN     "transactionId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "UsersToVoucher_transactionId_key" ON "UsersToVoucher"("transactionId");

-- AddForeignKey
ALTER TABLE "UsersToVoucher" ADD CONSTRAINT "UsersToVoucher_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
