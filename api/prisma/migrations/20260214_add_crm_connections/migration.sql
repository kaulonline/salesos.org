-- Add CRM Connection table for OAuth tokens
CREATE TABLE IF NOT EXISTS "crm_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "crm_type" TEXT NOT NULL,
    "instance_url" TEXT,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_type" TEXT DEFAULT 'Bearer',
    "expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_connections_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "crm_connections_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "crm_connections_organization_id_idx" ON "crm_connections"("organization_id");
CREATE INDEX IF NOT EXISTS "crm_connections_user_id_idx" ON "crm_connections"("user_id");
CREATE INDEX IF NOT EXISTS "crm_connections_crm_type_idx" ON "crm_connections"("crm_type");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_connections_org_crm_unique" ON "crm_connections"("organization_id", "crm_type") WHERE "is_active" = true;

-- Add import_method field to migrations table
ALTER TABLE "migrations" ADD COLUMN IF NOT EXISTS "import_method" TEXT DEFAULT 'csv';
ALTER TABLE "migrations" ADD COLUMN IF NOT EXISTS "crm_connection_id" TEXT;
ALTER TABLE "migrations" ADD COLUMN IF NOT EXISTS "api_records_fetched" INTEGER DEFAULT 0;

-- Foreign key for CRM connection
ALTER TABLE "migrations" ADD CONSTRAINT "migrations_crm_connection_id_fkey"
    FOREIGN KEY ("crm_connection_id") REFERENCES "crm_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
