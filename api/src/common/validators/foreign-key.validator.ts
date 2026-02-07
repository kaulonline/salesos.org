import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IdValidator } from './id.validator';

/**
 * Foreign Key Validation Helper
 *
 * Provides utilities for validating foreign key references in service methods
 * before executing Prisma queries. This prevents ID format mismatch errors
 * when Salesforce IDs are accidentally passed to local database operations.
 */

export interface ForeignKeyValidationResult {
  isValid: boolean;
  isSalesforceId: boolean;
  normalizedId?: string;
  error?: string;
}

/**
 * Validate a foreign key ID before using it in a Prisma query.
 * Throws BadRequestException with helpful message if ID is wrong format.
 *
 * @param id - The foreign key ID to validate
 * @param fieldName - The field name (e.g., 'accountId', 'leadId') for error messages
 * @param entityType - The entity type being referenced (e.g., 'Account', 'Lead')
 */
export function validateForeignKeyId(
  id: string | null | undefined,
  fieldName: string,
  entityType: string,
): void {
  // Allow null/undefined - these are optional foreign keys
  if (!id) return;

  // Check if it's a Salesforce ID
  if (IdValidator.isSalesforceId(id)) {
    const sfObjectType = IdValidator.getSalesforceObjectType(id);
    throw new BadRequestException(
      `Invalid ${fieldName}: The ID "${id}" is a Salesforce ID${sfObjectType ? ` (${sfObjectType})` : ''}. ` +
      `For local database operations, provide a local ${entityType} ID. ` +
      `For Salesforce operations, use the chat interface with Salesforce mode enabled.`
    );
  }

  // Check if it's a valid CUID
  if (!IdValidator.isCUID(id)) {
    throw new BadRequestException(
      `Invalid ${fieldName}: "${id}" is not a valid ID format. ` +
      `Expected a local database ID for ${entityType}.`
    );
  }
}

/**
 * Validate multiple foreign key IDs at once.
 * Useful when a create/update operation has multiple optional foreign keys.
 *
 * @param foreignKeys - Object mapping field names to their values
 * @param entityTypes - Object mapping field names to their entity types
 */
export function validateForeignKeys(
  foreignKeys: Record<string, string | null | undefined>,
  entityTypes: Record<string, string>,
): void {
  for (const [fieldName, id] of Object.entries(foreignKeys)) {
    if (id) {
      const entityType = entityTypes[fieldName] || fieldName.replace('Id', '');
      validateForeignKeyId(id, fieldName, entityType);
    }
  }
}

/**
 * Check if a foreign key ID is a Salesforce ID.
 * Returns true if it's a Salesforce format, false if local or empty.
 *
 * This is useful when you need to route operations differently
 * based on the ID format without throwing errors.
 */
export function isSalesforceForeignKey(id: string | null | undefined): boolean {
  if (!id) return false;
  return IdValidator.isSalesforceId(id);
}

/**
 * Determine the appropriate operation target based on foreign key format.
 *
 * @param id - The foreign key ID to check
 * @returns 'salesforce' | 'local' | 'none'
 */
export function getForeignKeyTarget(id: string | null | undefined): 'salesforce' | 'local' | 'none' {
  if (!id) return 'none';
  if (IdValidator.isSalesforceId(id)) return 'salesforce';
  if (IdValidator.isCUID(id)) return 'local';
  return 'none';
}

/**
 * Validate an entity reference exists in the local database.
 * This combines ID format validation with existence checking.
 *
 * @param prisma - The Prisma client instance
 * @param model - The Prisma model name (e.g., 'account', 'lead')
 * @param id - The ID to validate
 * @param fieldName - The field name for error messages
 * @returns The found entity or throws NotFoundException
 */
export async function validateEntityReference<T>(
  prisma: any,
  model: string,
  id: string | null | undefined,
  fieldName: string,
): Promise<T | null> {
  if (!id) return null;

  // Validate format first
  const entityType = model.charAt(0).toUpperCase() + model.slice(1);
  validateForeignKeyId(id, fieldName, entityType);

  // Check existence
  const entity = await prisma[model].findUnique({ where: { id } });
  if (!entity) {
    throw new NotFoundException(
      `${entityType} with ID "${id}" not found. ` +
      `Please verify the ${fieldName} exists.`
    );
  }

  return entity as T;
}

/**
 * Common foreign key field to entity type mappings
 */
export const FOREIGN_KEY_ENTITY_MAP: Record<string, string> = {
  accountId: 'Account',
  leadId: 'Lead',
  contactId: 'Contact',
  opportunityId: 'Opportunity',
  parentAccountId: 'Account',
  reportsToId: 'Contact',
  ownerId: 'User',
  assignedToId: 'User',
  createdById: 'User',
  userId: 'User',
  taskId: 'Task',
  campaignId: 'Campaign',
  contractId: 'Contract',
  quoteId: 'Quote',
  noteId: 'Note',
};

/**
 * Validate common CRM foreign keys.
 * Convenience function that uses the standard entity type mappings.
 */
export function validateCrmForeignKeys(data: Record<string, any>): void {
  const foreignKeyFields = [
    'accountId',
    'leadId',
    'contactId',
    'opportunityId',
    'parentAccountId',
    'reportsToId',
    'ownerId',
    'assignedToId',
    'taskId',
    'campaignId',
    'contractId',
    'quoteId',
  ];

  for (const field of foreignKeyFields) {
    if (data[field]) {
      validateForeignKeyId(data[field], field, FOREIGN_KEY_ENTITY_MAP[field] || field);
    }
  }
}
