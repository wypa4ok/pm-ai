-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OWNER';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "owner_user_id" UUID NOT NULL,
ADD COLUMN     "tenant_user_id" UUID;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "owner_user_id" UUID NOT NULL,
ADD COLUMN     "tenant_user_id" UUID;

-- CreateIndex
CREATE INDEX "messages_owner_user_id_idx" ON "messages"("owner_user_id");

-- CreateIndex
CREATE INDEX "messages_tenant_user_id_idx" ON "messages"("tenant_user_id");

-- CreateIndex
CREATE INDEX "tickets_owner_user_id_idx" ON "tickets"("owner_user_id");

-- CreateIndex
CREATE INDEX "tickets_tenant_user_id_idx" ON "tickets"("tenant_user_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

