/**
 * ID Validation Utilities for IRIS Sales GPT
 *
 * Provides comprehensive validation for both local database IDs (CUIDs)
 * and Salesforce 18-character IDs to prevent cross-reference errors.
 *
 * Salesforce ID Format:
 * - 15-character (case-sensitive) or 18-character (case-insensitive)
 * - Alphanumeric characters
 * - First 3 characters are the "key prefix" identifying the object type
 *
 * CUID Format:
 * - Starts with 'c'
 * - 25 characters total
 * - Lowercase alphanumeric
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Salesforce Object Key Prefixes
 * These prefixes identify the type of Salesforce object
 */
export const SALESFORCE_KEY_PREFIXES: Record<string, string> = {
  '001': 'Account',
  '003': 'Contact',
  '00Q': 'Lead',
  '006': 'Opportunity',
  '00T': 'Task',
  '00U': 'Event',
  '500': 'Case',
  '005': 'User',
  '00e': 'Campaign',
  '00k': 'CampaignMember',
  '00l': 'Contract',
  '00O': 'Report',
  '00D': 'Organization',
  '01I': 'Asset',
  '02s': 'EmailMessage',
};

export type IdType = 'salesforce' | 'local' | 'unknown';

export interface IdValidationResult {
  isValid: boolean;
  idType: IdType;
  salesforceObjectType?: string;
  error?: string;
}

export class IdValidator {
  /**
   * Check if a string matches CUID format (local database ID)
   * CUID format: starts with 'c', 25 characters, lowercase alphanumeric
   */
  static isCUID(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    // CUID format: starts with 'c', followed by 24 lowercase alphanumeric characters
    return /^c[a-z0-9]{20,28}$/.test(id);
  }

  /**
   * Check if a string matches Salesforce ID format
   * Salesforce uses 15-character (case-sensitive) or 18-character (case-insensitive) IDs
   */
  static isSalesforceId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    // Salesforce ID: 15 or 18 alphanumeric characters
    return /^[a-zA-Z0-9]{15}$/.test(id) || /^[a-zA-Z0-9]{18}$/.test(id);
  }

  /**
   * Determine the type of ID (Salesforce, Local, or Unknown)
   */
  static getIdType(id: string): IdType {
    if (this.isSalesforceId(id)) return 'salesforce';
    if (this.isCUID(id)) return 'local';
    return 'unknown';
  }

  /**
   * Get Salesforce object type from ID key prefix
   */
  static getSalesforceObjectType(id: string): string | undefined {
    if (!this.isSalesforceId(id)) return undefined;
    const prefix = id.substring(0, 3);
    return SALESFORCE_KEY_PREFIXES[prefix];
  }

  /**
   * Validate an ID and return detailed information
   */
  static validate(id: string): IdValidationResult {
    if (!id || typeof id !== 'string') {
      return {
        isValid: false,
        idType: 'unknown',
        error: 'ID is required and must be a string',
      };
    }

    const idType = this.getIdType(id);

    if (idType === 'salesforce') {
      return {
        isValid: true,
        idType: 'salesforce',
        salesforceObjectType: this.getSalesforceObjectType(id),
      };
    }

    if (idType === 'local') {
      return {
        isValid: true,
        idType: 'local',
      };
    }

    return {
      isValid: false,
      idType: 'unknown',
      error: `Invalid ID format: "${id}". Expected either a local CUID (starts with 'c', ~25 chars) or Salesforce ID (15 or 18 alphanumeric chars)`,
    };
  }

  /**
   * Validate that an ID is a local CUID format
   * Throws BadRequestException if validation fails
   */
  static validateLocalId(id: string, entityType: string): void {
    if (!this.isCUID(id)) {
      const idType = this.getIdType(id);
      if (idType === 'salesforce') {
        throw new BadRequestException(
          `Invalid ${entityType} ID format: "${id}" appears to be a Salesforce ID. ` +
            `For Salesforce operations, use the sf_update_record tool instead. ` +
            `For local database operations, provide a local CUID.`,
        );
      }
      throw new BadRequestException(
        `Invalid ${entityType} ID format: "${id}". Expected a local CUID (starts with 'c', ~25 chars).`,
      );
    }
  }

  /**
   * Validate that an ID is a Salesforce ID format
   * Throws BadRequestException if validation fails
   */
  static validateSalesforceId(id: string, sobjectType: string): void {
    if (!this.isSalesforceId(id)) {
      const idType = this.getIdType(id);
      if (idType === 'local') {
        throw new BadRequestException(
          `Invalid Salesforce ${sobjectType} ID format: "${id}" appears to be a local database ID. ` +
            `For local database operations, use the update_${sobjectType.toLowerCase()} tool instead. ` +
            `For Salesforce operations, provide a valid 18-character Salesforce ID.`,
        );
      }
      throw new BadRequestException(
        `Invalid Salesforce ${sobjectType} ID format: "${id}". Expected a 15 or 18-character alphanumeric Salesforce ID.`,
      );
    }
  }

  /**
   * Validate Salesforce cross-reference fields (WhoId, WhatId, AccountId, etc.)
   * These fields must contain valid Salesforce IDs pointing to specific object types
   */
  static validateCrossReferenceField(
    fieldName: string,
    id: string,
    allowedObjectTypes?: string[],
  ): void {
    if (!id) return; // Allow empty/null values

    if (!this.isSalesforceId(id)) {
      throw new BadRequestException(
        `Invalid ${fieldName}: "${id}" is not a valid Salesforce ID format. ` +
          `${fieldName} must be an 18-character Salesforce ID.`,
      );
    }

    if (allowedObjectTypes && allowedObjectTypes.length > 0) {
      const objectType = this.getSalesforceObjectType(id);
      if (objectType && !allowedObjectTypes.includes(objectType)) {
        throw new BadRequestException(
          `Invalid ${fieldName}: "${id}" references a ${objectType}, but ${fieldName} only accepts: ${allowedObjectTypes.join(', ')}.`,
        );
      }
    }
  }

  /**
   * Check if an operation should be routed to Salesforce based on the ID format
   * Returns true if the ID is a Salesforce ID
   */
  static shouldRouteTosalesforce(id: string): boolean {
    return this.isSalesforceId(id);
  }

  /**
   * Convert a 15-character Salesforce ID to 18-character format
   * The 18-character format is case-insensitive
   */
  static to18CharSalesforceId(id: string): string {
    if (!id || id.length === 18) return id;
    if (id.length !== 15) {
      throw new BadRequestException('Salesforce ID must be 15 or 18 characters');
    }

    const suffix: string[] = [];
    const charMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

    for (let i = 0; i < 3; i++) {
      let flags = 0;
      for (let j = 0; j < 5; j++) {
        const c = id.charAt(i * 5 + j);
        if (c >= 'A' && c <= 'Z') {
          flags += 1 << j;
        }
      }
      suffix.push(charMap.charAt(flags));
    }

    return id + suffix.join('');
  }

  /**
   * Normalize a Salesforce ID to 18-character format if it's 15 characters
   */
  static normalizeSalesforceId(id: string): string {
    if (!id) return id;
    if (this.isSalesforceId(id) && id.length === 15) {
      return this.to18CharSalesforceId(id);
    }
    return id;
  }
}

/**
 * Helper function to determine if we should use Salesforce tools vs local tools
 * based on the ID format
 */
export function determineOperationTarget(id: string): {
  target: 'salesforce' | 'local';
  objectType?: string;
} {
  const validation = IdValidator.validate(id);

  if (validation.idType === 'salesforce') {
    return {
      target: 'salesforce',
      objectType: validation.salesforceObjectType,
    };
  }

  return { target: 'local' };
}
