/**
 * IRIS Agent Framework - Salesforce CRM Tools (Dynamic)
 * 
 * FULLY DYNAMIC tool definitions for agents to interact with external Salesforce CRM data.
 * These tools use the SalesforceService to query live Salesforce data WITHOUT hardcoded fields.
 * 
 * The tools dynamically discover object schemas and allow flexible querying.
 */

import { z } from 'zod';
import { AgentTool, AgentContext } from '../types';
import { SalesforceService } from '../../salesforce/salesforce.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('SalesforceCRMTools');

// Cache for object schemas to avoid repeated describe calls
const schemaCache = new Map<string, { fields: string[]; timestamp: number }>();
const SCHEMA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get queryable fields for an object (cached)
 */
async function getQueryableFields(
  salesforceService: SalesforceService,
  userId: string,
  objectName: string
): Promise<string[]> {
  const cacheKey = `${userId}:${objectName}`;
  const cached = schemaCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < SCHEMA_CACHE_TTL) {
    return cached.fields;
  }

  try {
    const describe = await salesforceService.describeSObject(userId, objectName);
    // Get all queryable fields (excluding compound fields that cause issues)
    const fields = describe.fields
      .filter((f: any) => f.type !== 'address' && f.type !== 'location' && !f.deprecatedAndHidden)
      .map((f: any) => f.name)
      .slice(0, 50); // Limit to prevent query too long errors
    
    schemaCache.set(cacheKey, { fields, timestamp: Date.now() });
    return fields;
  } catch (error) {
    logger.warn(`Failed to describe ${objectName}, using default fields`);
    // Return minimal safe fields if describe fails
    return ['Id', 'Name'];
  }
}

/**
 * Build a safe SOQL query with dynamic field selection
 */
function buildDynamicSOQL(
  objectName: string,
  fields: string[],
  whereConditions: string[],
  orderBy?: string,
  limit: number = 20
): string {
  const fieldList = fields.join(', ');
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
  return `SELECT ${fieldList} FROM ${objectName} ${whereClause} ${orderClause} LIMIT ${limit}`.trim();
}

/**
 * Create Salesforce CRM tools factory
 * Returns DYNAMIC tools that query Salesforce without hardcoded field assumptions
 */
export function createSalesforceCRMTools(salesforceService: SalesforceService): AgentTool<any, any>[] {
  return [
    // ==================== DYNAMIC QUERY TOOL ====================
    {
      name: 'sf_query',
      description: 'Execute a dynamic SOQL query against Salesforce. Use this for flexible querying of any object. The system will automatically discover available fields.',
      parameters: z.object({
        objectName: z.string().describe('Salesforce object API name (e.g., Opportunity, Lead, Account, Contact, or custom objects like MyObject__c)'),
        fields: z.array(z.string()).optional().describe('Specific fields to retrieve. If not provided, common fields will be auto-selected.'),
        conditions: z.array(z.object({
          field: z.string(),
          operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'NOT IN']),
          value: z.union([z.string(), z.number(), z.array(z.string())]),
        })).optional().describe('Filter conditions'),
        orderBy: z.string().optional().describe('Field to order by (e.g., "CreatedDate DESC")'),
        limit: z.number().optional().default(20).describe('Max results'),
      }),
      execute: async (params: any, context: AgentContext) => {
        if (!context.userId) {
          return { error: 'User ID required for Salesforce queries' };
        }

        try {
          // Get available fields if not specified
          let fields = params.fields;
          if (!fields || fields.length === 0) {
            fields = await getQueryableFields(salesforceService, context.userId, params.objectName);
          }

          // Build WHERE conditions
          const whereConditions: string[] = [];
          if (params.conditions) {
            for (const cond of params.conditions) {
              let value = cond.value;
              if (cond.operator === 'IN' || cond.operator === 'NOT IN') {
                if (Array.isArray(value)) {
                  value = `(${value.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')})`;
                }
                whereConditions.push(`${cond.field} ${cond.operator} ${value}`);
              } else if (cond.operator === 'LIKE') {
                whereConditions.push(`${cond.field} LIKE '${value}'`);
              } else if (typeof value === 'string') {
                whereConditions.push(`${cond.field} ${cond.operator} '${value}'`);
              } else {
                whereConditions.push(`${cond.field} ${cond.operator} ${value}`);
              }
            }
          }

          const soql = buildDynamicSOQL(
            params.objectName,
            fields,
            whereConditions,
            params.orderBy,
            params.limit || 20
          );

          logger.debug(`Executing dynamic SOQL: ${soql}`);
          const result = await salesforceService.query(context.userId, soql);
          
          return {
            objectName: params.objectName,
            totalSize: result.totalSize,
            records: result.records,
            fieldsQueried: fields,
            source: 'salesforce',
          };
        } catch (error: any) {
          logger.error(`Salesforce query failed: ${error.message}`);
          return { error: `Salesforce query failed: ${error.message}`, source: 'salesforce' };
        }
      },
    },

    // ==================== SCHEMA DISCOVERY TOOL ====================
    {
      name: 'sf_describe_object',
      description: 'Discover the schema of a Salesforce object - get all available fields, their types, and relationships. Use this before querying custom objects or when unsure about field names.',
      parameters: z.object({
        objectName: z.string().describe('Salesforce object API name (e.g., Opportunity, Lead, Account, or custom objects like MyObject__c)'),
      }),
      execute: async (params: any, context: AgentContext) => {
        if (!context.userId) {
          return { error: 'User ID required for Salesforce queries' };
        }

        try {
          const describe = await salesforceService.describeSObject(context.userId, params.objectName);
          
          // Extract useful schema information
          const fields = describe.fields.map((f: any) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            required: !f.nillable && !f.defaultedOnCreate,
            updateable: f.updateable,
            isCustom: f.custom,
            referenceTo: f.referenceTo?.length > 0 ? f.referenceTo : undefined,
          }));

          const relationships = describe.childRelationships?.map((r: any) => ({
            name: r.relationshipName,
            childObject: r.childSObject,
            field: r.field,
          })).filter((r: any) => r.name) || [];

          return {
            objectName: params.objectName,
            label: describe.label,
            isCustom: describe.custom,
            isQueryable: describe.queryable,
            isCreateable: describe.createable,
            isUpdateable: describe.updateable,
            totalFields: fields.length,
            fields: fields.slice(0, 100), // Limit for readability
            relationships: relationships.slice(0, 20),
            recordTypeInfos: describe.recordTypeInfos?.map((rt: any) => ({
              id: rt.recordTypeId,
              name: rt.name,
              isDefault: rt.defaultRecordTypeMapping,
              isActive: rt.active,
            })) || [],
            source: 'salesforce',
          };
        } catch (error: any) {
          logger.error(`Salesforce describe failed: ${error.message}`);
          return { error: `Failed to describe object: ${error.message}`, source: 'salesforce' };
        }
      },
    },

    // ==================== LIST AVAILABLE OBJECTS ====================
    {
      name: 'sf_list_objects',
      description: 'List all available Salesforce objects in the connected org, including standard and custom objects.',
      parameters: z.object({
        includeCustomOnly: z.boolean().optional().describe('If true, only return custom objects'),
        search: z.string().optional().describe('Filter objects by name (case-insensitive)'),
      }),
      execute: async (params: any, context: AgentContext) => {
        if (!context.userId) {
          return { error: 'User ID required for Salesforce queries' };
        }

        try {
          const globalDescribe = await salesforceService.describeGlobal(context.userId);
          
          let objects = globalDescribe.sobjects
            .filter((obj: any) => obj.queryable)
            .map((obj: any) => ({
              name: obj.name,
              label: obj.label,
              isCustom: obj.custom,
              isQueryable: obj.queryable,
              isCreateable: obj.createable,
            }));

          if (params.includeCustomOnly) {
            objects = objects.filter((obj: any) => obj.isCustom);
          }

          if (params.search) {
            const searchLower = params.search.toLowerCase();
            objects = objects.filter((obj: any) => 
              obj.name.toLowerCase().includes(searchLower) ||
              obj.label.toLowerCase().includes(searchLower)
            );
          }

          return {
            totalObjects: objects.length,
            objects: objects.slice(0, 100), // Limit for readability
            source: 'salesforce',
          };
        } catch (error: any) {
          logger.error(`Salesforce global describe failed: ${error.message}`);
          return { error: `Failed to list objects: ${error.message}`, source: 'salesforce' };
        }
      },
    },

    // ==================== FULL-TEXT SEARCH ====================
    {
      name: 'sf_search',
      description: 'Perform a full-text search across Salesforce records using SOSL. Great for finding records by keyword.',
      parameters: z.object({
        searchTerm: z.string().describe('The search term (will search across all text fields)'),
        objects: z.array(z.string()).optional().describe('Objects to search in. Default: Account, Contact, Lead, Opportunity'),
        limit: z.number().optional().default(20).describe('Max results per object'),
      }),
      execute: async (params: any, context: AgentContext) => {
        if (!context.userId) {
          return { error: 'User ID required for Salesforce queries' };
        }

        try {
          const objects = params.objects || ['Account', 'Contact', 'Lead', 'Opportunity'];
          const result = await salesforceService.searchWithHighlight(
            context.userId,
            params.searchTerm,
            objects
          );
          
          return {
            searchTerm: params.searchTerm,
            searchResults: result.searchRecords || [],
            objectsSearched: objects,
            source: 'salesforce',
          };
        } catch (error: any) {
          logger.error(`Salesforce search failed: ${error.message}`);
          return { error: `Search failed: ${error.message}`, source: 'salesforce' };
        }
      },
    },

    // ==================== GET RECORD BY ID ====================
    {
      name: 'sf_get_record',
      description: 'Get a single Salesforce record by its ID. Automatically discovers and returns all queryable fields.',
      parameters: z.object({
        objectName: z.string().describe('Salesforce object API name'),
        recordId: z.string().describe('The Salesforce record ID (15 or 18 character)'),
        fields: z.array(z.string()).optional().describe('Specific fields to retrieve. If not provided, all queryable fields will be returned.'),
      }),
      execute: async (params: any, context: AgentContext) => {
        if (!context.userId) {
          return { error: 'User ID required for Salesforce queries' };
        }

        try {
          let fields = params.fields;
          if (!fields || fields.length === 0) {
            fields = await getQueryableFields(salesforceService, context.userId, params.objectName);
          }

          const soql = `SELECT ${fields.join(', ')} FROM ${params.objectName} WHERE Id = '${params.recordId}'`;
          const result = await salesforceService.query(context.userId, soql);
          
          if (!result.records || result.records.length === 0) {
            return { error: `Record not found: ${params.recordId}`, source: 'salesforce' };
          }

          return {
            record: result.records[0],
            objectName: params.objectName,
            fieldsReturned: fields,
            source: 'salesforce',
          };
        } catch (error: any) {
          logger.error(`Salesforce get record failed: ${error.message}`);
          return { error: `Failed to get record: ${error.message}`, source: 'salesforce' };
        }
      },
    },

    // ==================== GET RELATED RECORDS ====================
    {
      name: 'sf_get_related_records',
      description: 'Get records related to a parent record (e.g., Contacts for an Account, Tasks for an Opportunity).',
      parameters: z.object({
        parentObjectName: z.string().describe('Parent object API name (e.g., Account)'),
        parentRecordId: z.string().describe('Parent record ID'),
        childObjectName: z.string().describe('Child object API name (e.g., Contact, Task, Opportunity)'),
        relationshipField: z.string().describe('Field on child that references parent (e.g., AccountId, WhatId)'),
        limit: z.number().optional().default(20).describe('Max results'),
      }),
      execute: async (params: any, context: AgentContext) => {
        if (!context.userId) {
          return { error: 'User ID required for Salesforce queries' };
        }

        try {
          const fields = await getQueryableFields(salesforceService, context.userId, params.childObjectName);
          const soql = `SELECT ${fields.join(', ')} FROM ${params.childObjectName} WHERE ${params.relationshipField} = '${params.parentRecordId}' LIMIT ${params.limit || 20}`;
          
          const result = await salesforceService.query(context.userId, soql);
          
          return {
            parentObject: params.parentObjectName,
            parentId: params.parentRecordId,
            childObject: params.childObjectName,
            totalSize: result.totalSize,
            records: result.records,
            source: 'salesforce',
          };
        } catch (error: any) {
          logger.error(`Salesforce related records query failed: ${error.message}`);
          return { error: `Failed to get related records: ${error.message}`, source: 'salesforce' };
        }
      },
    },

    // ==================== AGGREGATE QUERY ====================
    {
      name: 'sf_aggregate',
      description: 'Run aggregate queries (COUNT, SUM, AVG, etc.) on Salesforce data for analytics.',
      parameters: z.object({
        objectName: z.string().describe('Salesforce object API name'),
        aggregations: z.array(z.object({
          function: z.enum(['COUNT', 'COUNT_DISTINCT', 'SUM', 'AVG', 'MIN', 'MAX']),
          field: z.string().optional().describe('Field to aggregate (not needed for COUNT())'),
          alias: z.string().optional().describe('Alias for the result'),
        })).describe('Aggregation functions to apply'),
        groupBy: z.array(z.string()).optional().describe('Fields to group by'),
        conditions: z.array(z.object({
          field: z.string(),
          operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN']),
          value: z.union([z.string(), z.number(), z.array(z.string())]),
        })).optional().describe('Filter conditions'),
      }),
      execute: async (params: any, context: AgentContext) => {
        if (!context.userId) {
          return { error: 'User ID required for Salesforce queries' };
        }

        try {
          // Build aggregation SELECT clause
          const selectParts: string[] = [];
          for (const agg of params.aggregations) {
            if (agg.function === 'COUNT' && !agg.field) {
              selectParts.push(agg.alias ? `COUNT() ${agg.alias}` : 'COUNT()');
            } else {
              const aggStr = `${agg.function}(${agg.field})`;
              selectParts.push(agg.alias ? `${aggStr} ${agg.alias}` : aggStr);
            }
          }

          if (params.groupBy && params.groupBy.length > 0) {
            selectParts.push(...params.groupBy);
          }

          // Build WHERE conditions
          const whereConditions: string[] = [];
          if (params.conditions) {
            for (const cond of params.conditions) {
              let value = cond.value;
              if (cond.operator === 'IN') {
                if (Array.isArray(value)) {
                  value = `(${value.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')})`;
                }
                whereConditions.push(`${cond.field} ${cond.operator} ${value}`);
              } else if (typeof value === 'string') {
                whereConditions.push(`${cond.field} ${cond.operator} '${value}'`);
              } else {
                whereConditions.push(`${cond.field} ${cond.operator} ${value}`);
              }
            }
          }

          let soql = `SELECT ${selectParts.join(', ')} FROM ${params.objectName}`;
          if (whereConditions.length > 0) {
            soql += ` WHERE ${whereConditions.join(' AND ')}`;
          }
          if (params.groupBy && params.groupBy.length > 0) {
            soql += ` GROUP BY ${params.groupBy.join(', ')}`;
          }

          logger.debug(`Executing aggregate SOQL: ${soql}`);
          const result = await salesforceService.query(context.userId, soql);
          
          return {
            objectName: params.objectName,
            aggregations: params.aggregations,
            groupBy: params.groupBy,
            results: result.records,
            source: 'salesforce',
          };
        } catch (error: any) {
          logger.error(`Salesforce aggregate query failed: ${error.message}`);
          return { error: `Aggregate query failed: ${error.message}`, source: 'salesforce' };
        }
      },
    },

    // ==================== CREATE RECORD ====================
    {
      name: 'sf_create_record',
      description: 'Create a new record in Salesforce. Use sf_describe_object first to discover required fields.',
      parameters: z.object({
        objectName: z.string().describe('Salesforce object API name'),
        data: z.record(z.string(), z.any()).describe('Field values for the new record (field API names as keys)'),
      }),
      execute: async (params: any, context: AgentContext) => {
        if (!context.userId) {
          return { error: 'User ID required for Salesforce operations' };
        }

        try {
          const result = await salesforceService.create(context.userId, params.objectName, params.data);
          
          return {
            success: true,
            recordId: result.id,
            objectName: params.objectName,
            source: 'salesforce',
          };
        } catch (error: any) {
          logger.error(`Salesforce create failed: ${error.message}`);
          return { error: `Failed to create record: ${error.message}`, source: 'salesforce' };
        }
      },
    },

    // ==================== UPDATE RECORD ====================
    {
      name: 'sf_update_record',
      description: 'Update an existing Salesforce record.',
      parameters: z.object({
        objectName: z.string().describe('Salesforce object API name'),
        recordId: z.string().describe('The Salesforce record ID'),
        data: z.record(z.string(), z.any()).describe('Field values to update (field API names as keys)'),
      }),
      execute: async (params: any, context: AgentContext) => {
        if (!context.userId) {
          return { error: 'User ID required for Salesforce operations' };
        }

        try {
          await salesforceService.update(context.userId, params.objectName, params.recordId, params.data);
          
          return {
            success: true,
            recordId: params.recordId,
            objectName: params.objectName,
            updatedFields: Object.keys(params.data),
            source: 'salesforce',
          };
        } catch (error: any) {
          logger.error(`Salesforce update failed: ${error.message}`);
          return { error: `Failed to update record: ${error.message}`, source: 'salesforce' };
        }
      },
    },
  ];
}

/**
 * Get the list of available Salesforce tools for display in UI
 */
export function getAvailableSalesforceTools() {
  return [
    { name: 'sf_query', description: 'Execute dynamic SOQL queries on any Salesforce object', category: 'Salesforce CRM' },
    { name: 'sf_describe_object', description: 'Discover object schema and available fields', category: 'Salesforce CRM' },
    { name: 'sf_list_objects', description: 'List all available Salesforce objects', category: 'Salesforce CRM' },
    { name: 'sf_search', description: 'Full-text search across Salesforce records', category: 'Salesforce CRM' },
    { name: 'sf_get_record', description: 'Get a single record by ID', category: 'Salesforce CRM' },
    { name: 'sf_get_related_records', description: 'Get related child records', category: 'Salesforce CRM' },
    { name: 'sf_aggregate', description: 'Run aggregate analytics queries', category: 'Salesforce CRM' },
    { name: 'sf_create_record', description: 'Create a new record in Salesforce', category: 'Salesforce CRM' },
    { name: 'sf_update_record', description: 'Update an existing record', category: 'Salesforce CRM' },
  ];
}

