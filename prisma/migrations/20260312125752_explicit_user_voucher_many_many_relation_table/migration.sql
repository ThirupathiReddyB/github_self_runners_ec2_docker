/*
  Warnings:

  - You are about to drop the `_UsersToVoucher` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UsersToVoucher" DROP CONSTRAINT "_UsersToVoucher_A_fkey";

-- DropForeignKey
ALTER TABLE "_UsersToVoucher" DROP CONSTRAINT "_UsersToVoucher_B_fkey";

-- DropTable
DROP TABLE "_UsersToVoucher";

-- CreateTable
CREATE TABLE "UsersToVoucher" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "voucherId" INTEGER NOT NULL,

    CONSTRAINT "UsersToVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsersToVoucher_userId_voucherId_idx" ON "UsersToVoucher"("userId", "voucherId");

-- AddForeignKey
ALTER TABLE "UsersToVoucher" ADD CONSTRAINT "UsersToVoucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsersToVoucher" ADD CONSTRAINT "UsersToVoucher_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
