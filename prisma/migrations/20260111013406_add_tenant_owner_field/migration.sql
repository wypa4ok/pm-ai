/*
  Warnings:

  - Added the required column `owner_user_id` to the `tenants` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add column as nullable first
ALTER TABLE "tenants" ADD COLUMN "owner_user_id" UUID;

-- Step 2: Backfill owner_user_id from unit's owner (if tenant has a unit)
UPDATE "tenants" t
SET "owner_user_id" = u."owner_user_id"
FROM "units" u
WHERE t."unit_id" = u."id"
  AND t."owner_user_id" IS NULL;

-- Step 3: Backfill owner_user_id from tickets (if no unit but has tickets)
UPDATE "tenants" t
SET "owner_user_id" = (
  SELECT tk."owner_user_id"
  FROM "tickets" tk
  WHERE tk."tenant_id" = t."id"
  LIMIT 1
)
WHERE t."owner_user_id" IS NULL;

-- Step 4: For any remaining tenants without an owner, use the first available user with OWNER role
-- (This is a fallback for orphaned data)
UPDATE "tenants" t
SET "owner_user_id" = (
  SELECT "id"
  FROM "users"
  WHERE "role" = 'OWNER'
  LIMIT 1
)
WHERE t."owner_user_id" IS NULL;

-- Step 5: Make the column NOT NULL
ALTER TABLE "tenants" ALTER COLUMN "owner_user_id" SET NOT NULL;

-- Step 6: Create index
CREATE INDEX "tenants_owner_user_id_idx" ON "tenants"("owner_user_id");

-- Step 7: Add foreign key constraint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
