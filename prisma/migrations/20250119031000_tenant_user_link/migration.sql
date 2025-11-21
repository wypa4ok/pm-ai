-- Add user_id to tenants and enforce uniqueness when set
ALTER TABLE "tenants"
ADD COLUMN IF NOT EXISTS "user_id" uuid;

ALTER TABLE "tenants"
ADD CONSTRAINT "tenants_user_id_key" UNIQUE ("user_id");

CREATE INDEX IF NOT EXISTS "tenants_user_id_idx" ON "tenants" ("user_id");

-- Ensure tickets.tenant_user_id is indexed
CREATE INDEX IF NOT EXISTS "tickets_tenant_user_id_idx" ON "tickets" ("tenant_user_id");

-- Link tickets.tenant_user_id to tenants.user_id (nullable)
ALTER TABLE "tickets"
ADD CONSTRAINT "tickets_tenant_user_id_fkey"
FOREIGN KEY ("tenant_user_id") REFERENCES "tenants"("user_id")
ON DELETE SET NULL ON UPDATE CASCADE;
