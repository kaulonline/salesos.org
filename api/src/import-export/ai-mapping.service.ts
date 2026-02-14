import { Injectable, Logger } from '@nestjs/common';
import { AnthropicService } from '../anthropic/anthropic.service';
import {
  EntityType,
  FieldMappingSuggestion,
  CRMDetection,
  getCRMTemplate,
  SUPPORTED_CRMS,
} from './templates';

/**
 * AI-Powered Field Mapping Service
 *
 * Uses AI to intelligently map CSV columns to SalesOS fields with confidence scores.
 */
@Injectable()
export class AIMappingService {
  private readonly logger = new Logger(AIMappingService.name);

  constructor(private readonly anthropicService: AnthropicService) {}

  /**
   * Suggest field mappings for CSV headers using AI
   *
   * @param headers - CSV column headers
   * @param entityType - The entity type (LEAD, CONTACT, ACCOUNT, OPPORTUNITY)
   * @param crmType - Optional CRM type to improve accuracy
   * @returns Array of field mapping suggestions with confidence scores
   */
  async suggestFieldMappings(
    headers: string[],
    entityType: EntityType,
    crmType?: string,
  ): Promise<FieldMappingSuggestion[]> {
    try {
      // Get template if CRM type is specified
      const template = crmType ? getCRMTemplate(crmType, entityType) : null;
      const entityKey = entityType.toLowerCase() + 's'; // LEAD -> leads

      // Build list of available SalesOS fields based on entity type
      const salesosFields = this.getEntityFieldDefinitions(entityType);

      // Build AI prompt
      let prompt = `You are an expert at mapping CRM data fields. Analyze these CSV column headers and suggest the best SalesOS field mapping for each.

CSV Headers: ${headers.join(', ')}

SalesOS ${entityType} Fields Available:
${salesosFields}
`;

      if (template) {
        const commonFields = template.exportFields[entityKey]
          ?.map((f) => f.crmField)
          .join(', ');
        prompt += `\nThis CSV export came from ${crmType}. Common ${crmType} field names include:
${commonFields}
`;
      }

      prompt += `\nFor each CSV header, provide:
1. The best matching SalesOS field name (or "SKIP" if no good match)
2. Confidence score (0-100)
3. Brief reasoning for your choice
4. Any recommended data transformation (e.g., "parse_date", "parse_currency", "uppercase", "trim")

Return ONLY a valid JSON array with this exact structure:
[
  {
    "csvColumn": "First Name",
    "suggestedField": "firstName",
    "confidence": 95,
    "reasoning": "Exact match for first name field",
    "transform": "trim",
    "isRequired": true
  }
]

IMPORTANT:
- Return ONLY the JSON array, no other text
- Use exact field names from the SalesOS fields list
- Set isRequired to true only for firstName, lastName (contacts/leads) or name (accounts/opportunities)
- Suggest "SKIP" for columns that don't map to any SalesOS field
`;

      this.logger.log(
        `Requesting AI field mappings for ${headers.length} columns`,
      );

      const response = await this.anthropicService.generateFastCompletion({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent mapping
        maxTokens: 2000,
      });

      // Parse AI response
      const suggestions = this.parseAIMappings(response, headers);

      this.logger.log(`Generated ${suggestions.length} field mapping suggestions`);

      return suggestions;
    } catch (error) {
      this.logger.error('Failed to generate AI field mappings', error.stack);
      // Return fallback: exact name matches only
      return this.generateFallbackMappings(headers, entityType);
    }
  }

  /**
   * Detect CRM type from CSV headers using AI
   *
   * @param headers - CSV column headers
   * @returns CRM detection result with confidence score
   */
  async detectCRMType(headers: string[]): Promise<CRMDetection> {
    try {
      const prompt = `You are an expert at identifying CRM systems based on their data export formats.

Analyze these CSV headers and determine which CRM system they likely came from:

CSV Headers: ${headers.join(', ')}

Possible CRM systems:
- Salesforce: Uses fields like "FirstName", "LastName", "AccountId", "StageName", "CloseDate", "BillingStreet"
- HubSpot: Uses lowercase with spaces like "First Name", "Last Name", "Company name", "Deal Stage", "hs_lead_status"
- Pipedrive: Uses simple fields like "Title", "Organization", "Stage", "Value", "Expected close date"
- Zoho CRM: Similar to Salesforce but uses "First Name", "Last Name", "Account Name", "Deal Name", "Closing Date"
- Monday.com: Very flexible, often uses "Name", "Status", "Company", "Value", "Location"
- Unknown: If headers don't match any known CRM pattern

Return ONLY a valid JSON object with this exact structure:
{
  "crm": "salesforce",
  "confidence": 85,
  "reasoning": "Headers match Salesforce naming conventions with FirstName, LastName, AccountId format"
}

IMPORTANT:
- Return ONLY the JSON object, no other text
- crm must be one of: "salesforce", "hubspot", "pipedrive", "zoho", "monday", "unknown"
- confidence should be 0-100
- reasoning should be 1-2 sentences explaining your choice
`;

      this.logger.log('Requesting AI CRM detection');

      const response = await this.anthropicService.generateFastCompletion({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        maxTokens: 200,
      });

      const detection = this.parseCRMDetection(response);

      this.logger.log(
        `Detected CRM: ${detection.crm} with ${detection.confidence}% confidence`,
      );

      return detection;
    } catch (error) {
      this.logger.error('Failed to detect CRM type', error.stack);
      return {
        crm: 'unknown',
        confidence: 0,
        reasoning: 'Failed to analyze headers',
      };
    }
  }

  /**
   * Parse AI response into field mapping suggestions
   */
  private parseAIMappings(
    response: string,
    originalHeaders: string[],
  ): FieldMappingSuggestion[] {
    try {
      // Extract JSON from response (handle cases where AI adds text before/after JSON)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed
        .filter((item) => item.suggestedField !== 'SKIP')
        .map((item) => ({
          csvColumn: item.csvColumn || '',
          suggestedField: item.suggestedField || '',
          confidence: Math.min(100, Math.max(0, item.confidence || 0)),
          reasoning: item.reasoning || 'AI suggestion',
          transform: item.transform || undefined,
          isRequired: item.isRequired === true,
        }));
    } catch (error) {
      this.logger.warn('Failed to parse AI response', error.message);
      return [];
    }
  }

  /**
   * Parse AI response for CRM detection
   */
  private parseCRMDetection(response: string): CRMDetection {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate CRM type
      const crm = SUPPORTED_CRMS.includes(parsed.crm)
        ? parsed.crm
        : 'unknown';

      return {
        crm: crm as any,
        confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
        reasoning: parsed.reasoning || 'AI detection',
      };
    } catch (error) {
      this.logger.warn('Failed to parse CRM detection response', error.message);
      return {
        crm: 'unknown',
        confidence: 0,
        reasoning: 'Failed to parse AI response',
      };
    }
  }

  /**
   * Generate fallback mappings using simple name matching
   */
  private generateFallbackMappings(
    headers: string[],
    entityType: EntityType,
  ): FieldMappingSuggestion[] {
    const fieldMap: Record<string, string> = {
      // Common field mappings
      'first name': 'firstName',
      firstname: 'firstName',
      'last name': 'lastName',
      lastname: 'lastName',
      email: 'email',
      phone: 'phone',
      mobile: 'mobile',
      company: 'company',
      title: 'title',
      status: 'status',
      name: entityType === 'LEAD' || entityType === 'CONTACT' ? 'firstName' : 'name',
      amount: 'amount',
      value: 'amount',
      stage: 'stage',
      'close date': 'closeDate',
      closedate: 'closeDate',
      website: 'website',
      industry: 'industry',
      address: 'street',
      street: 'street',
      city: 'city',
      state: 'state',
      country: 'country',
      'postal code': 'postalCode',
      zip: 'postalCode',
    };

    return headers
      .map((header) => {
        const normalized = header.toLowerCase().trim();
        const suggestedField = fieldMap[normalized];

        if (!suggestedField) {
          return null;
        }

        return {
          csvColumn: header,
          suggestedField,
          confidence: 70,
          reasoning: 'Exact name match',
          isRequired: ['firstName', 'lastName', 'name'].includes(
            suggestedField,
          ),
        };
      })
      .filter(Boolean) as FieldMappingSuggestion[];
  }

  /**
   * Get field definitions for an entity type
   */
  private getEntityFieldDefinitions(entityType: EntityType): string {
    const fieldsByEntity: Record<EntityType, string[]> = {
      LEAD: [
        'firstName - First name (required)',
        'lastName - Last name (required)',
        'email - Email address',
        'phone - Phone number',
        'mobile - Mobile phone',
        'company - Company name',
        'title - Job title',
        'status - Lead status',
        'leadSource - Lead source',
        'rating - Lead rating',
        'industry - Industry',
        'numberOfEmployees - Number of employees',
        'annualRevenue - Annual revenue',
        'website - Website URL',
        'street - Street address',
        'city - City',
        'state - State/province',
        'postalCode - Postal/ZIP code',
        'country - Country',
        'description - Description/notes',
      ],
      CONTACT: [
        'firstName - First name (required)',
        'lastName - Last name (required)',
        'email - Email address',
        'phone - Phone number',
        'mobile - Mobile phone',
        'title - Job title',
        'accountId - Associated account (will be looked up)',
        'department - Department',
        'leadSource - Lead source',
        'mailingStreet - Mailing street address',
        'mailingCity - Mailing city',
        'mailingState - Mailing state/province',
        'mailingPostalCode - Mailing postal/ZIP code',
        'mailingCountry - Mailing country',
        'description - Description/notes',
      ],
      ACCOUNT: [
        'name - Account name (required)',
        'type - Account type',
        'industry - Industry',
        'website - Website URL',
        'phone - Phone number',
        'numberOfEmployees - Number of employees',
        'annualRevenue - Annual revenue',
        'billingStreet - Billing street address',
        'billingCity - Billing city',
        'billingState - Billing state/province',
        'billingPostalCode - Billing postal/ZIP code',
        'billingCountry - Billing country',
        'shippingStreet - Shipping street address',
        'shippingCity - Shipping city',
        'shippingState - Shipping state/province',
        'shippingPostalCode - Shipping postal/ZIP code',
        'shippingCountry - Shipping country',
        'description - Description/notes',
      ],
      OPPORTUNITY: [
        'name - Opportunity name (required)',
        'accountId - Associated account (will be looked up)',
        'stage - Sales stage (required)',
        'amount - Deal amount',
        'closeDate - Expected close date (required)',
        'probability - Win probability (0-100)',
        'type - Opportunity type',
        'leadSource - Lead source',
        'nextStep - Next step',
        'description - Description/notes',
        'isClosed - Whether closed (true/false)',
        'isWon - Whether won (true/false)',
      ],
    };

    const fields = fieldsByEntity[entityType] || [];
    return fields.map((f, i) => `${i + 1}. ${f}`).join('\n');
  }
}
