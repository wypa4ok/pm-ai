-- AlterTable: Add owner_user_id column to units table
-- For existing units, use the owner from any existing ticket for that unit,
-- or use the first owner user in the system if no tickets exist

-- Add the column as nullable first
ALTER TABLE "units" ADD COLUMN "owner_user_id" UUID;

-- Update existing units with owner from their tickets
UPDATE "units" u
SET "owner_user_id" = (
  SELECT t."owner_user_id"
  FROM "tickets" t
  WHERE t."unit_id" = u."id"
  ORDER BY t."created_at" DESC
  LIMIT 1
);

-- For any units still without an owner (no tickets), use first owner from any ticket
UPDATE "units" u
SET "owner_user_id" = (
  SELECT t."owner_user_id"
  FROM "tickets" t
  ORDER BY t."created_at" DESC
  LIMIT 1
)
WHERE "owner_user_id" IS NULL;

-- Make the column NOT NULL
ALTER TABLE "units" ALTER COLUMN "owner_user_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "units_owner_user_id_idx" ON "units"("owner_user_id");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
