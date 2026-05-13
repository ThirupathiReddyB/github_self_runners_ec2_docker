-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "plan_description" VARCHAR(1024) NOT NULL DEFAULT 'New Plan';

-- CreateTable
CREATE TABLE "Integrations" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embed_link" TEXT,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "Integrations_pkey" PRIMARY KEY ("id")
);
