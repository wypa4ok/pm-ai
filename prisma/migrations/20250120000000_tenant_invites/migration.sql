-- Create tenant_invites table
CREATE TABLE IF NOT EXISTS "tenant_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "claimed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_invites_token_idx ON "tenant_invites" ("token");
CREATE INDEX IF NOT EXISTS tenant_invites_tenant_idx ON "tenant_invites" ("tenant_id");
CREATE INDEX IF NOT EXISTS tenant_invites_owner_idx ON "tenant_invites" ("owner_user_id");

ALTER TABLE "tenant_invites"
  ADD CONSTRAINT tenant_invites_tenant_id_fkey
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
