// License Decorators - Declarative license and feature access control
import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { LicenseGuard } from '../guards/license.guard';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';

// Metadata keys
export const REQUIRE_LICENSE_KEY = 'requireLicense';
export const REQUIRE_FEATURE_KEY = 'requiredFeatures';

/**
 * Decorator to require an active license for the route
 * @example
 * @RequireLicense()
 * @Get('premium-data')
 * async getPremiumData() { ... }
 */
export const RequireLicense = () => {
  return applyDecorators(
    SetMetadata(REQUIRE_LICENSE_KEY, true),
    UseGuards(JwtAuthGuard, LicenseGuard),
  );
};

/**
 * Decorator to require specific feature access
 * @param features - One or more feature keys that must be accessible
 * @example
 * @RequireFeature('ai_chat')
 * @Post('chat')
 * async chat() { ... }
 * 
 * @RequireFeature('crm_salesforce', 'crm_write')
 * @Put('salesforce/update')
 * async updateSalesforce() { ... }
 */
export const RequireFeature = (...features: string[]) => {
  return applyDecorators(
    SetMetadata(REQUIRE_FEATURE_KEY, features),
    UseGuards(JwtAuthGuard, LicenseGuard),
  );
};

/**
 * Decorator that combines license requirement with feature check
 * @param features - One or more feature keys
 * @example
 * @RequireLicenseAndFeature('meetings_record')
 * @Post('meetings/start-recording')
 * async startRecording() { ... }
 */
export const RequireLicenseAndFeature = (...features: string[]) => {
  return applyDecorators(
    SetMetadata(REQUIRE_LICENSE_KEY, true),
    SetMetadata(REQUIRE_FEATURE_KEY, features),
    UseGuards(LicenseGuard),
  );
};

// ============================================
// COMMON FEATURE KEYS
// ============================================

/**
 * Predefined feature keys for type safety
 * These keys must match the featureKey values in the license_features table
 */
export const LicenseFeatures = {
  // AI Features
  AI_CHAT: 'ai_chat',
  AI_DOCUMENT_SEARCH: 'ai_document_search',
  AI_WEB_RESEARCH: 'ai_web_research',
  AI_AGENTS: 'ai_agents',
  CUSTOM_AGENTS: 'custom_agents',
  
  // CRM Features
  CRM_SALESFORCE: 'crm_salesforce',
  CRM_ORACLE_CX: 'crm_oracle_cx',
  CRM_HUBSPOT: 'crm_hubspot',
  CRM_SYNC: 'crm_sync',
  CRM_WRITE: 'crm_write',
  
  // Meeting Features
  MEETINGS_RECORD: 'meetings_record',
  MEETINGS_INTELLIGENCE: 'meetings_intelligence',
  MEETINGS_TRANSCRIBE: 'meetings_transcribe',
  MEETINGS_INSIGHTS: 'meetings_insights',
  MEETINGS_ACTION_ITEMS: 'meetings_action_items',
  
  // Data Features
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  DATA_API_ACCESS: 'data_api_access',
  API_ACCESS: 'api_access',
  WEBHOOKS: 'webhooks',
  TRANSACTIONAL_DATA: 'transactional_data',
  METADATA_MANAGEMENT: 'metadata_management',
  
  // Entity Management Features
  LEADS_MANAGEMENT: 'leads_management',
  CONTACTS_MANAGEMENT: 'contacts_management',
  ACCOUNTS_MANAGEMENT: 'accounts_management',
  OPPORTUNITIES_MANAGEMENT: 'opportunities_management',
  DOCUMENTS_MANAGEMENT: 'documents_management',
  
  // Advanced Features
  BASIC_ANALYTICS: 'basic_analytics',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  ADVANCED_AUTOMATION: 'advanced_automation',
  ADVANCED_CUSTOM_AGENTS: 'advanced_custom_agents',
  
  // Email Features
  EMAIL_TRACKING: 'email_tracking',
  EMAIL_AUTOMATION: 'email_automation',
} as const;

export type LicenseFeatureKey = typeof LicenseFeatures[keyof typeof LicenseFeatures];
