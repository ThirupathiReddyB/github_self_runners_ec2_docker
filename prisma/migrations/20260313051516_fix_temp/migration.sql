-- CreateTable
CREATE TABLE "_UsersOnVoucher" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UsersOnVoucher_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UsersOnVoucher_B_index" ON "_UsersOnVoucher"("B");

-- AddForeignKey
ALTER TABLE "_UsersOnVoucher" ADD CONSTRAINT "_UsersOnVoucher_A_fkey" FOREIGN KEY ("A") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UsersOnVoucher" ADD CONSTRAINT "_UsersOnVoucher_B_fkey" FOREIGN KEY ("B") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
