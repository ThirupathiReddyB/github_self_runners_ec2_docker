-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "plan_variant_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_plan_variant_id_fkey" FOREIGN KEY ("plan_variant_id") REFERENCES "PlanVariants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
