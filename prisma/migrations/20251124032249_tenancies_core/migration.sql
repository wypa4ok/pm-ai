/*
  Warnings:

  - Made the column `created_at` on table `tenant_invites` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tenant_invites" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "claimed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "tenancy_id" UUID;

-- CreateTable
CREATE TABLE "tenancies" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenancy_members" (
    "id" UUID NOT NULL,
    "tenancy_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenancy_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenancies_unit_id_idx" ON "tenancies"("unit_id");

-- CreateIndex
CREATE INDEX "tenancies_start_date_end_date_idx" ON "tenancies"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "tenancy_members_tenancy_id_idx" ON "tenancy_members"("tenancy_id");

-- CreateIndex
CREATE INDEX "tenancy_members_tenant_id_idx" ON "tenancy_members"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenancy_members_tenancy_id_tenant_id_key" ON "tenancy_members"("tenancy_id", "tenant_id");

-- CreateIndex
CREATE INDEX "tickets_tenancy_id_idx" ON "tickets"("tenancy_id");

-- CreateIndex
CREATE INDEX "tickets_search_vector_idx" ON "tickets"("search_vector");

-- CreateIndex
CREATE INDEX "tickets_subject_idx" ON "tickets"("subject");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancy_members" ADD CONSTRAINT "tenancy_members_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancy_members" ADD CONSTRAINT "tenancy_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "tenant_invites_owner_idx" RENAME TO "tenant_invites_owner_user_id_idx";

-- RenameIndex
ALTER INDEX "tenant_invites_tenant_idx" RENAME TO "tenant_invites_tenant_id_idx";

-- RenameIndex
ALTER INDEX "tenant_invites_token_idx" RENAME TO "tenant_invites_token_key";
