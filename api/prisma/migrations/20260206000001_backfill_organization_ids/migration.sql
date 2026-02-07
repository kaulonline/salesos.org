-- Migration: Backfill organizationId for existing records
-- This assigns organizationId based on the owner's organization membership

-- Create a function to get user's primary organization
CREATE OR REPLACE FUNCTION get_user_organization(user_id TEXT)
RETURNS TEXT AS $$
DECLARE
    org_id TEXT;
BEGIN
    -- Get the user's first/primary organization membership
    SELECT "organizationId" INTO org_id
    FROM "organization_members"
    WHERE "userId" = user_id AND "isActive" = true
    ORDER BY "joinedAt" ASC
    LIMIT 1;

    RETURN org_id;
END;
$$ LANGUAGE plpgsql;

-- Update Lead records
UPDATE "Lead"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Account records
UPDATE "Account"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Contact records
UPDATE "Contact"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Opportunity records
UPDATE "Opportunity"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Quote records
UPDATE "Quote"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Order records
UPDATE "orders"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Task records
UPDATE "Task"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Activity records
UPDATE "Activity"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Note records
UPDATE "Note"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Pipeline records
UPDATE "Pipeline"
SET "organizationId" = (SELECT id FROM "organizations" LIMIT 1)
WHERE "organizationId" IS NULL;

-- Update PipelineStage records
UPDATE "PipelineStage"
SET "organizationId" = (SELECT id FROM "organizations" LIMIT 1)
WHERE "organizationId" IS NULL;

-- Update Contract records
UPDATE "Contract"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Campaign records
UPDATE "Campaign"
SET "organizationId" = get_user_organization("ownerId")
WHERE "organizationId" IS NULL AND "ownerId" IS NOT NULL;

-- Update Product records (use first org as products may be shared)
UPDATE "Product"
SET "organizationId" = (SELECT id FROM "organizations" LIMIT 1)
WHERE "organizationId" IS NULL;

-- Update EmailThread records
UPDATE "EmailThread"
SET "organizationId" = get_user_organization("userId")
WHERE "organizationId" IS NULL AND "userId" IS NOT NULL;

-- Update Playbook records
UPDATE "playbooks"
SET "organizationId" = get_user_organization("createdBy")
WHERE "organizationId" IS NULL AND "createdBy" IS NOT NULL;

-- Drop the helper function
DROP FUNCTION get_user_organization(TEXT);

-- Log results
DO $$
BEGIN
    RAISE NOTICE 'Organization ID backfill complete';
END $$;
