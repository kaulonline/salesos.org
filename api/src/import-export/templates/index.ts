/**
 * CRM Template Registry
 *
 * Central export for all CRM templates and helper functions.
 */

import { CRMTemplate, EntityType } from './types';
import { salesforceTemplate } from './salesforce.template';
import { hubspotTemplate } from './hubspot.template';
import { pipedriveTemplate } from './pipedrive.template';
import { zohoTemplate } from './zoho.template';
import { mondayTemplate } from './monday.template';

// Export all types
export * from './types';

// Export all templates
export {
  salesforceTemplate,
  hubspotTemplate,
  pipedriveTemplate,
  zohoTemplate,
  mondayTemplate,
};

/**
 * Registry of all available CRM templates
 */
export const CRM_TEMPLATES: Record<string, CRMTemplate> = {
  salesforce: salesforceTemplate,
  hubspot: hubspotTemplate,
  pipedrive: pipedriveTemplate,
  zoho: zohoTemplate,
  monday: mondayTemplate,
};

/**
 * List of supported CRM types
 */
export const SUPPORTED_CRMS = [
  'salesforce',
  'hubspot',
  'pipedrive',
  'zoho',
  'monday',
] as const;

export type SupportedCRM = (typeof SUPPORTED_CRMS)[number];

/**
 * Get a CRM template by type and entity
 *
 * @param crmType - The CRM type (e.g., 'salesforce', 'hubspot')
 * @param entityType - The entity type (e.g., 'LEAD', 'CONTACT')
 * @returns Field mappings for the specified CRM and entity, or null if not found
 */
export function getCRMTemplate(
  crmType: string,
  entityType: EntityType,
): CRMTemplate | null {
  const template = CRM_TEMPLATES[crmType.toLowerCase()];
  if (!template) {
    return null;
  }
  return template;
}

/**
 * Get field mappings for a specific CRM and entity type
 *
 * @param crmType - The CRM type
 * @param entityType - The entity type
 * @returns Array of field mappings, or empty array if not found
 */
export function getFieldMappings(crmType: string, entityType: EntityType) {
  const template = getCRMTemplate(crmType, entityType);
  if (!template) {
    return [];
  }

  const entityKey = entityType.toLowerCase() + 's'; // LEAD -> leads
  return template.exportFields[entityKey] || [];
}

/**
 * Check if a CRM type is supported
 *
 * @param crmType - The CRM type to check
 * @returns True if the CRM is supported
 */
export function isSupportedCRM(crmType: string): boolean {
  return SUPPORTED_CRMS.includes(crmType.toLowerCase() as SupportedCRM);
}

/**
 * Get all available CRM templates
 *
 * @returns Array of all CRM templates
 */
export function getAllTemplates(): CRMTemplate[] {
  return Object.values(CRM_TEMPLATES);
}

/**
 * Find a field mapping by CSV column name (including aliases)
 *
 * @param csvColumn - The column name from the CSV
 * @param crmType - The CRM type
 * @param entityType - The entity type
 * @returns The matching field mapping, or null if not found
 */
export function findFieldMapping(
  csvColumn: string,
  crmType: string,
  entityType: EntityType,
) {
  const mappings = getFieldMappings(crmType, entityType);
  const normalizedColumn = csvColumn.trim();

  // First, try exact match with crmField
  let match = mappings.find(
    (m) => m.crmField.toLowerCase() === normalizedColumn.toLowerCase(),
  );

  // If no match, try aliases
  if (!match) {
    match = mappings.find((m) =>
      m.aliases.some(
        (alias) => alias.toLowerCase() === normalizedColumn.toLowerCase(),
      ),
    );
  }

  return match || null;
}
