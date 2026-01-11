-- AlterTable
ALTER TABLE "users" ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT;
