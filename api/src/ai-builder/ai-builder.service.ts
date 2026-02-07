import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { LLMService } from '../llm/llm.service';
import {
  AIBuilderEntityType,
  GenerateConfigDto,
  GenerateConfigResponseDto,
  RefineConfigDto,
  GenerationPreviewDto,
} from './dto';
import {
  WEB_FORM_SYSTEM_PROMPT,
  WEB_FORM_EXAMPLES,
  CUSTOM_FIELDS_SYSTEM_PROMPT,
  CUSTOM_FIELDS_EXAMPLES,
  EMAIL_TEMPLATE_SYSTEM_PROMPT,
  EMAIL_TEMPLATE_EXAMPLES,
  ASSIGNMENT_RULE_SYSTEM_PROMPT,
  ASSIGNMENT_RULE_EXAMPLES,
  WORKFLOW_SYSTEM_PROMPT,
  WORKFLOW_EXAMPLES,
  PRODUCT_SYSTEM_PROMPT,
  PRODUCT_EXAMPLES,
  PROFILE_SYSTEM_PROMPT,
  PROFILE_EXAMPLES,
  REPORT_SYSTEM_PROMPT,
  REPORT_EXAMPLES,
  SMART_BUILDER_SYSTEM_PROMPT,
  SMART_BUILDER_EXAMPLES,
  TERRITORY_SYSTEM_PROMPT,
  TERRITORY_EXAMPLES,
  PLAYBOOK_SYSTEM_PROMPT,
  PLAYBOOK_EXAMPLES,
} from './prompts';

interface EntityPromptConfig {
  systemPrompt: string;
  examples: Array<{ user: string; assistant: string }>;
}

@Injectable()
export class AIBuilderService {
  private readonly logger = new Logger(AIBuilderService.name);

  // Map entity types to their prompt configurations
  private readonly promptConfigs: Record<AIBuilderEntityType, EntityPromptConfig> = {
    [AIBuilderEntityType.WEB_FORM]: {
      systemPrompt: WEB_FORM_SYSTEM_PROMPT,
      examples: WEB_FORM_EXAMPLES,
    },
    [AIBuilderEntityType.CUSTOM_FIELDS]: {
      systemPrompt: CUSTOM_FIELDS_SYSTEM_PROMPT,
      examples: CUSTOM_FIELDS_EXAMPLES,
    },
    [AIBuilderEntityType.EMAIL_TEMPLATE]: {
      systemPrompt: EMAIL_TEMPLATE_SYSTEM_PROMPT,
      examples: EMAIL_TEMPLATE_EXAMPLES,
    },
    [AIBuilderEntityType.ASSIGNMENT_RULE]: {
      systemPrompt: ASSIGNMENT_RULE_SYSTEM_PROMPT,
      examples: ASSIGNMENT_RULE_EXAMPLES,
    },
    [AIBuilderEntityType.WORKFLOW]: {
      systemPrompt: WORKFLOW_SYSTEM_PROMPT,
      examples: WORKFLOW_EXAMPLES,
    },
    [AIBuilderEntityType.PRODUCT]: {
      systemPrompt: PRODUCT_SYSTEM_PROMPT,
      examples: PRODUCT_EXAMPLES,
    },
    [AIBuilderEntityType.PROFILE]: {
      systemPrompt: PROFILE_SYSTEM_PROMPT,
      examples: PROFILE_EXAMPLES,
    },
    [AIBuilderEntityType.REPORT]: {
      systemPrompt: REPORT_SYSTEM_PROMPT,
      examples: REPORT_EXAMPLES,
    },
    [AIBuilderEntityType.SMART_BUILDER]: {
      systemPrompt: SMART_BUILDER_SYSTEM_PROMPT,
      examples: SMART_BUILDER_EXAMPLES,
    },
    [AIBuilderEntityType.TERRITORY]: {
      systemPrompt: TERRITORY_SYSTEM_PROMPT,
      examples: TERRITORY_EXAMPLES,
    },
    [AIBuilderEntityType.PLAYBOOK]: {
      systemPrompt: PLAYBOOK_SYSTEM_PROMPT,
      examples: PLAYBOOK_EXAMPLES,
    },
  };

  constructor(private readonly llmService: LLMService) {}

  /**
   * Generate configuration from natural language prompt
   */
  async generate(dto: GenerateConfigDto): Promise<GenerateConfigResponseDto> {
    const { entityType, prompt, context } = dto;

    this.logger.log(`Generating ${entityType} from prompt: "${prompt.substring(0, 50)}..."`);

    const promptConfig = this.promptConfigs[entityType];
    if (!promptConfig) {
      throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }

    try {
      // Build the conversation with examples
      const messages = this.buildMessages(promptConfig, prompt, context);

      // Call LLM with smart model for quality generation
      const response = await this.llmService.chat({
        model: 'smart', // Use Claude Sonnet for quality
        messages,
        temperature: 0.3, // Lower temperature for more consistent JSON output
        maxTokens: 4000,
      });

      // Extract JSON from response
      const content = this.extractContent(response);
      const rawConfig = this.extractJSON(content);

      if (!rawConfig) {
        this.logger.error(`Failed to extract JSON from response: ${content.substring(0, 200)}`);
        return {
          success: false,
          error: 'Failed to generate valid configuration. Please try rephrasing your request.',
        };
      }

      // Generate preview
      const preview = this.generatePreview(entityType, rawConfig);

      return {
        success: true,
        preview,
        rawConfig,
        conversationId: `ai-builder-${Date.now()}`, // Simple conversation tracking
      };
    } catch (error) {
      this.logger.error(`AI Builder generation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message || 'Failed to generate configuration',
      };
    }
  }

  /**
   * Refine a previously generated configuration
   */
  async refine(dto: RefineConfigDto): Promise<GenerateConfigResponseDto> {
    const { entityType, prompt, previousConfig } = dto;

    this.logger.log(`Refining ${entityType} with: "${prompt.substring(0, 50)}..."`);

    const promptConfig = this.promptConfigs[entityType];
    if (!promptConfig) {
      throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }

    try {
      // Build messages with previous config as context
      const messages = [
        { role: 'system' as const, content: promptConfig.systemPrompt },
        {
          role: 'user' as const,
          content: `Here is the current configuration:\n\n${JSON.stringify(previousConfig, null, 2)}`,
        },
        {
          role: 'assistant' as const,
          content: 'I understand the current configuration. What changes would you like me to make?',
        },
        {
          role: 'user' as const,
          content: `Please modify the configuration: ${prompt}\n\nOutput only the updated JSON, no explanations.`,
        },
      ];

      const response = await this.llmService.chat({
        model: 'smart',
        messages,
        temperature: 0.3,
        maxTokens: 4000,
      });

      const content = this.extractContent(response);
      const rawConfig = this.extractJSON(content);

      if (!rawConfig) {
        return {
          success: false,
          error: 'Failed to refine configuration. Please try a different instruction.',
        };
      }

      const preview = this.generatePreview(entityType, rawConfig);

      return {
        success: true,
        preview,
        rawConfig,
      };
    } catch (error) {
      this.logger.error(`AI Builder refinement failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message || 'Failed to refine configuration',
      };
    }
  }

  /**
   * Extract text content from LLM response
   */
  private extractContent(response: any): string {
    // Handle ChatCompletionResponse format
    if (response.choices && response.choices.length > 0) {
      const message = response.choices[0].message;
      if (typeof message.content === 'string') {
        return message.content;
      }
      // Handle content blocks
      if (Array.isArray(message.content)) {
        return message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('');
      }
    }
    // Fallback for simple string response
    if (typeof response === 'string') {
      return response;
    }
    return '';
  }

  /**
   * Build messages array with system prompt, examples, and user prompt
   */
  private buildMessages(
    config: EntityPromptConfig,
    userPrompt: string,
    context?: Record<string, any>,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: config.systemPrompt },
    ];

    // Add examples as few-shot learning
    for (const example of config.examples) {
      messages.push({ role: 'user', content: example.user });
      messages.push({ role: 'assistant', content: example.assistant });
    }

    // Add context if provided
    let contextNote = '';
    if (context) {
      if (context.existingFields?.length) {
        contextNote += `\n\nExisting fields to avoid duplicating: ${context.existingFields.join(', ')}`;
      }
      if (context.industry) {
        contextNote += `\n\nIndustry context: ${context.industry}`;
      }
      if (context.companyType) {
        contextNote += `\n\nCompany type: ${context.companyType}`;
      }
      if (context.targetEntity) {
        contextNote += `\n\nTarget entity: ${context.targetEntity}`;
      }
      if (context.teamMembers?.length) {
        contextNote += `\n\nAvailable team members:\n${context.teamMembers.map((m) => `- ${m.name} (${m.email}): ID=${m.id}`).join('\n')}`;
      }
      if (context.mergeFields?.length) {
        contextNote += `\n\nAvailable merge fields: ${context.mergeFields.join(', ')}`;
      }
    }

    // Add the user's prompt
    messages.push({
      role: 'user',
      content: userPrompt + contextNote,
    });

    return messages;
  }

  /**
   * Extract JSON from LLM response (handles markdown code blocks)
   */
  private extractJSON(content: string): Record<string, any> | null {
    try {
      // Try direct parsing first
      return JSON.parse(content.trim());
    } catch {
      // Try to extract from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          // Fall through
        }
      }

      // Try to find JSON object in the response
      const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          return JSON.parse(jsonObjectMatch[0]);
        } catch {
          // Fall through
        }
      }

      return null;
    }
  }

  /**
   * Generate a human-readable preview of the configuration
   */
  private generatePreview(
    entityType: AIBuilderEntityType,
    config: Record<string, any>,
  ): GenerationPreviewDto {
    const preview: GenerationPreviewDto = {
      summary: '',
      entities: [],
      warnings: [],
      suggestions: [],
    };

    switch (entityType) {
      case AIBuilderEntityType.WEB_FORM:
        preview.summary = `Web form "${config.name}" with ${config.fields?.length || 0} fields`;
        preview.entities = [
          {
            entityType: 'Web Form',
            description: config.description || config.name,
            count: config.fields?.length || 0,
          },
        ];
        if (config.fields) {
          const fieldTypes = config.fields.map((f: any) => f.type);
          if (!fieldTypes.includes('email')) {
            preview.suggestions?.push('Consider adding an email field for contact purposes');
          }
          const requiredCount = config.fields.filter((f: any) => f.required).length;
          if (requiredCount > 5) {
            preview.warnings?.push(
              `${requiredCount} required fields may reduce form completion rates`,
            );
          }
        }
        break;

      case AIBuilderEntityType.CUSTOM_FIELDS:
        const fieldCount = config.fields?.length || 0;
        preview.summary = `${fieldCount} custom field${fieldCount !== 1 ? 's' : ''} to be created`;
        if (config.fields) {
          const byEntity = config.fields.reduce((acc: any, f: any) => {
            acc[f.entity] = (acc[f.entity] || 0) + 1;
            return acc;
          }, {});
          preview.entities = Object.entries(byEntity).map(([entity, count]) => ({
            entityType: `${entity} Fields`,
            description: `Custom fields for ${entity} entity`,
            count: count as number,
          }));
        }
        break;

      case AIBuilderEntityType.EMAIL_TEMPLATE:
        preview.summary = `Email template "${config.name}" (${config.category || 'General'})`;
        preview.entities = [
          {
            entityType: 'Email Template',
            description: config.description || config.subject,
            count: config.variables?.length || 0,
          },
        ];
        if (config.variables?.length > 0) {
          preview.suggestions?.push(
            `Template uses ${config.variables.length} merge fields: ${config.variables.join(', ')}`,
          );
        }
        break;

      case AIBuilderEntityType.ASSIGNMENT_RULE:
        const rules = config.rules || [config];
        preview.summary = `${rules.length} assignment rule${rules.length !== 1 ? 's' : ''} to be created`;
        preview.entities = rules.map((rule: any) => ({
          entityType: 'Assignment Rule',
          description: rule.name,
          count: rule.conditions?.length || 0,
        }));
        break;

      case AIBuilderEntityType.WORKFLOW:
        preview.summary = `Workflow "${config.name}" with ${config.actions?.length || 0} action${(config.actions?.length || 0) !== 1 ? 's' : ''}`;
        preview.entities = [
          {
            entityType: 'Workflow',
            description: config.description || config.name,
            count: config.actions?.length || 0,
          },
        ];
        if (config.conditions?.length > 0) {
          preview.suggestions?.push(`Workflow has ${config.conditions.length} condition(s) that must be met`);
        }
        if (config.delayMinutes > 0) {
          preview.suggestions?.push(`Actions will be delayed by ${config.delayMinutes} minutes`);
        }
        break;

      case AIBuilderEntityType.PRODUCT:
        const products = config.products || [config];
        preview.summary = `${products.length} product${products.length !== 1 ? 's' : ''} to be created`;
        preview.entities = products.map((product: any) => ({
          entityType: 'Product',
          description: `${product.name} (${product.sku}) - $${product.listPrice}`,
          count: product.features?.length || 0,
        }));
        break;

      case AIBuilderEntityType.PROFILE:
        const moduleCount = config.permissions?.length || 0;
        preview.summary = `Permission profile "${config.name}" with ${moduleCount} module${moduleCount !== 1 ? 's' : ''} configured`;
        preview.entities = [
          {
            entityType: 'Profile',
            description: config.description || config.name,
            count: moduleCount,
          },
        ];
        // Check for sensitive permissions
        const hasAdmin = config.permissions?.some((p: any) => p.module === 'ADMIN');
        const hasDelete = config.permissions?.some((p: any) => p.actions?.includes('DELETE'));
        if (hasAdmin) {
          preview.warnings?.push('Profile includes ADMIN module access');
        }
        if (hasDelete) {
          preview.suggestions?.push('Profile includes DELETE permissions - verify this is intended');
        }
        break;

      case AIBuilderEntityType.REPORT:
        preview.summary = `${config.type || 'Custom'} report "${config.name}"`;
        preview.entities = [
          {
            entityType: 'Report',
            description: `${config.chartType || 'Table'} chart grouped by ${config.groupBy || 'default'}`,
          },
        ];
        if (config.filters?.dateRange) {
          preview.suggestions?.push(`Date range: ${config.filters.dateRange.replace(/_/g, ' ')}`);
        }
        if (config.metrics?.length > 0) {
          preview.suggestions?.push(`Metrics: ${config.metrics.join(', ')}`);
        }
        break;

      case AIBuilderEntityType.SMART_BUILDER:
        const entityCount = config.entities?.length || 0;
        preview.summary = config.summary || `Smart Builder will create ${entityCount} entities`;
        preview.entities = config.entities?.map((entity: any) => ({
          entityType: this.formatEntityType(entity.entityType),
          description: entity.description || entity.name,
          count: entity.order,
        })) || [];
        if (config.crossReferences?.length > 0) {
          preview.suggestions?.push(`${config.crossReferences.length} cross-references will connect these entities`);
        }
        break;

      case AIBuilderEntityType.TERRITORY:
        const typeLabels: Record<string, string> = {
          GEOGRAPHIC: 'Geographic',
          NAMED_ACCOUNTS: 'Named Accounts',
          INDUSTRY: 'Industry',
          ACCOUNT_SIZE: 'Account Size',
          CUSTOM: 'Custom',
        };
        preview.summary = `${typeLabels[config.type] || config.type} territory "${config.name}"`;
        const criteriaDescriptions: string[] = [];
        if (config.criteria?.geographic) {
          const geo = config.criteria.geographic;
          if (geo.states?.length) criteriaDescriptions.push(`${geo.states.length} state(s)`);
          if (geo.countries?.length) criteriaDescriptions.push(`${geo.countries.length} country(ies)`);
          if (geo.regions?.length) criteriaDescriptions.push(`${geo.regions.length} region(s)`);
        }
        if (config.criteria?.industry?.industries?.length) {
          criteriaDescriptions.push(`${config.criteria.industry.industries.length} industry(ies)`);
        }
        if (config.criteria?.segment?.companySize) {
          criteriaDescriptions.push(config.criteria.segment.companySize);
        }
        if (config.criteria?.namedAccounts?.length) {
          criteriaDescriptions.push(`${config.criteria.namedAccounts.length} named account(s)`);
        }
        preview.entities = [
          {
            entityType: 'Territory',
            description: config.description || criteriaDescriptions.join(', ') || config.name,
          },
        ];
        if (criteriaDescriptions.length > 0) {
          preview.suggestions?.push(`Criteria: ${criteriaDescriptions.join(', ')}`);
        }
        break;

      case AIBuilderEntityType.PLAYBOOK:
        const stepCount = config.steps?.length || 0;
        const triggerLabels: Record<string, string> = {
          MANUAL: 'Manual start',
          DEAL_CREATED: 'When deal is created',
          DEAL_STAGE_CHANGE: 'When deal changes stage',
          LEAD_QUALIFIED: 'When lead is qualified',
          ACCOUNT_CREATED: 'When account is created',
        };
        preview.summary = `Playbook "${config.name}" with ${stepCount} step${stepCount !== 1 ? 's' : ''}`;
        preview.entities = [
          {
            entityType: 'Playbook',
            description: config.description || config.name,
            count: stepCount,
          },
        ];
        // Add trigger info
        const triggerInfo = triggerLabels[config.trigger] || config.trigger;
        preview.suggestions?.push(`Trigger: ${triggerInfo}${config.targetStage ? ` (${config.targetStage})` : ''}`);
        // Summarize step types
        if (config.steps?.length > 0) {
          const stepTypeCounts: Record<string, number> = {};
          config.steps.forEach((step: any) => {
            stepTypeCounts[step.type] = (stepTypeCounts[step.type] || 0) + 1;
          });
          const stepSummary = Object.entries(stepTypeCounts)
            .map(([type, count]) => `${count} ${type.toLowerCase()}${count > 1 ? 's' : ''}`)
            .join(', ');
          preview.suggestions?.push(`Steps: ${stepSummary}`);
          // Check for required steps
          const requiredCount = config.steps.filter((s: any) => s.isRequired).length;
          if (requiredCount > 0) {
            preview.suggestions?.push(`${requiredCount} required step${requiredCount !== 1 ? 's' : ''}`);
          }
          // Calculate total duration
          const maxDaysOffset = Math.max(...config.steps.map((s: any) => s.daysOffset || 0));
          if (maxDaysOffset > 0) {
            preview.suggestions?.push(`Duration: ~${maxDaysOffset} day${maxDaysOffset !== 1 ? 's' : ''}`);
          }
        }
        break;

      default:
        preview.summary = `Generated ${entityType} configuration`;
        preview.entities = [{ entityType, description: 'Configuration generated' }];
    }

    // Remove empty arrays
    if (!preview.warnings?.length) delete preview.warnings;
    if (!preview.suggestions?.length) delete preview.suggestions;

    return preview;
  }

  /**
   * Format entity type for display
   */
  private formatEntityType(type: string): string {
    const typeMap: Record<string, string> = {
      'web-form': 'Web Form',
      'custom-fields': 'Custom Fields',
      'email-template': 'Email Template',
      'assignment-rule': 'Assignment Rule',
      'workflow': 'Workflow',
      'product': 'Product',
      'profile': 'Profile',
      'report': 'Report',
      'territory': 'Territory',
      'playbook': 'Playbook',
    };
    return typeMap[type] || type;
  }

  /**
   * Get supported entity types with descriptions
   */
  getSupportedEntityTypes(): Array<{ type: AIBuilderEntityType; description: string; examples: string[] }> {
    return [
      {
        type: AIBuilderEntityType.WEB_FORM,
        description: 'Lead capture forms with fields, validation, and styling',
        examples: [
          'Create a demo request form for enterprise software',
          'Build a contact form with name, email, and message',
          'Make a webinar registration form',
        ],
      },
      {
        type: AIBuilderEntityType.CUSTOM_FIELDS,
        description: 'Custom fields on Leads, Contacts, Accounts, or Opportunities',
        examples: [
          'Add BANT qualification fields to leads',
          'Track competitor information on opportunities',
          'Create industry and company size fields',
        ],
      },
      {
        type: AIBuilderEntityType.EMAIL_TEMPLATE,
        description: 'Email templates with merge fields and professional formatting',
        examples: [
          'Write a follow-up email for demo attendees',
          'Create a proposal delivery email template',
          'Build a cold outreach sequence email',
        ],
      },
      {
        type: AIBuilderEntityType.ASSIGNMENT_RULE,
        description: 'Auto-assign leads and opportunities based on criteria',
        examples: [
          'Route enterprise leads to senior reps',
          'Distribute leads by region to territory owners',
          'Assign deals by value to different teams',
        ],
      },
      {
        type: AIBuilderEntityType.WORKFLOW,
        description: 'Automation workflows with triggers, conditions, and actions',
        examples: [
          'When a deal moves to Negotiation, create a task for legal review',
          'Send welcome email and create follow-up task when lead is created',
          'Alert owner when opportunity has no activity for 7 days',
        ],
      },
      {
        type: AIBuilderEntityType.PRODUCT,
        description: 'Products and pricing with SKUs, features, and billing options',
        examples: [
          'Add our Pro plan: $49/user/month with analytics features',
          'Create a consulting service package at $200/hour',
          'Add enterprise software license at $10,000/year',
        ],
      },
      {
        type: AIBuilderEntityType.PROFILE,
        description: 'Permission profiles for role-based access control',
        examples: [
          'Create a role for SDRs who can create leads but not delete',
          'Manager role with team-level access to all sales data',
          'Read-only viewer role for executives',
        ],
      },
      {
        type: AIBuilderEntityType.REPORT,
        description: 'Sales reports and analytics dashboards',
        examples: [
          'Show conversion rates by lead source for last quarter',
          'Pipeline value by stage with month-over-month comparison',
          'Activity report showing calls and emails by rep',
        ],
      },
      {
        type: AIBuilderEntityType.SMART_BUILDER,
        description: 'Generate multiple related entities from a single high-level requirement',
        examples: [
          'Set up our complete lead qualification workflow',
          'Create our SDR team setup with roles, rules, and templates',
          'Configure our enterprise sales process end-to-end',
        ],
      },
      {
        type: AIBuilderEntityType.TERRITORY,
        description: 'Sales territories with geographic, industry, or segment-based criteria',
        examples: [
          'Create a West Coast territory for CA, OR, WA',
          'Set up an Enterprise territory for 500+ employee companies',
          'Create a Healthcare industry territory',
        ],
      },
      {
        type: AIBuilderEntityType.PLAYBOOK,
        description: 'Sales playbooks with guided steps, triggers, and best practices',
        examples: [
          'Create an enterprise discovery process using MEDDIC',
          'Build a lead qualification playbook using BANT',
          'Make a deal closing sequence for negotiation stage',
          'Create a customer onboarding playbook',
        ],
      },
    ];
  }
}
