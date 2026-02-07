-- AlterEnum: Replace PIPEDRIVE with ORACLE_CX in CrmProvider enum
ALTER TYPE "CrmProvider" RENAME TO "CrmProvider_old";

CREATE TYPE "CrmProvider" AS ENUM ('SALESFORCE', 'HUBSPOT', 'DYNAMICS365', 'ZOHO', 'ORACLE_CX', 'CUSTOM');

-- Update CrmIntegration table
ALTER TABLE "CrmIntegration" ALTER COLUMN "provider" TYPE "CrmProvider" USING (
  CASE 
    WHEN "provider"::text = 'PIPEDRIVE' THEN 'ORACLE_CX'::text::"CrmProvider"
    ELSE "provider"::text::"CrmProvider"
  END
);

-- Update OAuthState table
ALTER TABLE "OAuthState" ALTER COLUMN "provider" TYPE "CrmProvider" USING (
  CASE 
    WHEN "provider"::text = 'PIPEDRIVE' THEN 'ORACLE_CX'::text::"CrmProvider"
    ELSE "provider"::text::"CrmProvider"
  END
);

DROP TYPE "CrmProvider_old";
