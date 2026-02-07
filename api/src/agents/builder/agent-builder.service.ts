/**
 * Agent Builder Service
 * 
 * Handles CRUD operations for user-defined agents and their execution.
 * Supports both local database and external CRM (Salesforce) data sources.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiSdkService } from '../../ai-sdk/ai-sdk.service';
import { SalesforceService } from '../../salesforce/salesforce.service';
import { CreateAgentDto, UpdateAgentDto, RunAgentDto, QueryAgentsDto, QueryExecutionLogsDto } from './dto/agent-builder.dto';
import { getAvailableSalesforceTools } from '../tools/salesforce-crm-tools';

@Injectable()
export class AgentBuilderService {
  private readonly logger = new Logger(AgentBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiSdk: AiSdkService,
    private readonly salesforceService: SalesforceService,
  ) {}

  // ==================== AGENT CRUD ====================

  async createAgent(userId: string, dto: CreateAgentDto) {
    const slug = this.generateSlug(dto.name);
    
    // Check for duplicate slug
    const existing = await this.prisma.agentDefinition.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`An agent with slug "${slug}" already exists`);
    }

    const agent = await this.prisma.agentDefinition.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        category: dto.category || 'custom',
        icon: dto.icon,
        color: dto.color,
        systemPrompt: dto.systemPrompt,
        analysisPrompt: dto.analysisPrompt,
        outputFormat: dto.outputFormat,
        modelId: dto.modelId || 'claude-sonnet',
        temperature: dto.temperature || 0.3,
        maxTokens: dto.maxTokens || 4000,
        enabledTools: dto.enabledTools || [],
        triggerConfig: dto.triggerConfig || { manual: true },
        targetEntityTypes: dto.targetEntityTypes || [],
        targetFilters: dto.targetFilters,
        alertTypes: dto.alertTypes || ['INFORMATION'],
        requiresApproval: dto.requiresApproval ?? true,
        maxExecutionTimeMs: dto.maxExecutionTimeMs || 60000,
        maxLLMCalls: dto.maxLLMCalls || 10,
        // External CRM configuration
        useExternalCrmData: dto.useExternalCrmData || false,
        externalCrmProvider: dto.externalCrmProvider || null,
        createdById: userId,
        isDraft: true,
        isPublished: false,
        isEnabled: false,
      },
    });

    // Create initial version
    await this.createVersion(agent.id, '1.0.0', userId, 'Initial creation');

    this.logger.log(`Agent created: ${agent.name} (${agent.id}) by user ${userId}`);
    return agent;
  }

  async updateAgent(agentId: string, userId: string, dto: UpdateAgentDto) {
    const agent = await this.prisma.agentDefinition.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }

    // Check ownership
    if (agent.createdById !== userId) {
      throw new BadRequestException('You can only edit agents you created');
    }

    const updated = await this.prisma.agentDefinition.update({
      where: { id: agentId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Agent updated: ${updated.name} (${updated.id})`);
    return updated;
  }

  async getAgent(agentId: string) {
    const agent = await this.prisma.agentDefinition.findUnique({
      where: { id: agentId },
      include: {
        versions: { orderBy: { createdAt: 'desc' }, take: 5 },
        executions: { orderBy: { startedAt: 'desc' }, take: 10 },
      },
    });
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }
    return agent;
  }

  async listAgents(userId: string, query: QueryAgentsDto) {
    const where: any = {
      OR: [
        { createdById: userId },
        { isGlobal: true },
        { isTemplate: true },
      ],
    };

    if (query.category) where.category = query.category;
    if (query.isEnabled !== undefined) where.isEnabled = query.isEnabled;
    if (query.isPublished !== undefined) where.isPublished = query.isPublished;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [agents, total] = await Promise.all([
      this.prisma.agentDefinition.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prisma.agentDefinition.count({ where }),
    ]);

    return { agents, total };
  }

  async deleteAgent(agentId: string, userId: string) {
    const agent = await this.prisma.agentDefinition.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }
    if (agent.createdById !== userId) {
      throw new BadRequestException('You can only delete agents you created');
    }

    await this.prisma.agentDefinition.delete({ where: { id: agentId } });
    this.logger.log(`Agent deleted: ${agent.name} (${agentId})`);
    return { success: true };
  }

  async publishAgent(agentId: string, userId: string) {
    const agent = await this.prisma.agentDefinition.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);
    if (agent.createdById !== userId) throw new BadRequestException('Not authorized');

    // Validate agent has required fields
    if (!agent.systemPrompt) {
      throw new BadRequestException('Agent must have a system prompt before publishing');
    }

    const updated = await this.prisma.agentDefinition.update({
      where: { id: agentId },
      data: {
        isPublished: true,
        isDraft: false,
        publishedAt: new Date(),
      },
    });

    // Create new version
    const newVersion = this.incrementVersion(agent.version);
    await this.createVersion(agentId, newVersion, userId, 'Published');
    await this.prisma.agentDefinition.update({
      where: { id: agentId },
      data: { version: newVersion },
    });

    return updated;
  }

  async toggleAgent(agentId: string, userId: string, enabled: boolean) {
    const agent = await this.prisma.agentDefinition.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);

    return this.prisma.agentDefinition.update({
      where: { id: agentId },
      data: { isEnabled: enabled },
    });
  }

  // ==================== AGENT EXECUTION ====================

  async runAgent(agentId: string, userId: string, dto: RunAgentDto) {
    const agent = await this.prisma.agentDefinition.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);
    if (!agent.isEnabled && !agent.isDraft) {
      throw new BadRequestException('Agent is not enabled');
    }

    // Create execution record
    const execution = await this.prisma.agentDefinitionExecution.create({
      data: {
        agentId,
        triggeredBy: 'USER_REQUEST',
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        scope: dto.scope,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Log start
    await this.log(execution.id, agentId, 'INFO', 'INIT', `Starting agent execution: ${agent.name}`);

    // Run in background
    this.executeAgent(agent, execution, userId, dto).catch(err => {
      this.logger.error(`Agent execution failed: ${err.message}`, err.stack);
    });

    return {
      executionId: execution.id,
      status: 'RUNNING',
      message: `Agent "${agent.name}" started`,
    };
  }

  private async executeAgent(agent: any, execution: any, userId: string, dto: RunAgentDto) {
    const startTime = Date.now();
    let llmCalls = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let alertsCreated = 0;

    try {
      // Build the prompt
      const systemPrompt = this.buildSystemPrompt(agent);
      const userPrompt = await this.buildUserPrompt(agent, dto, userId);

      await this.log(execution.id, agent.id, 'DEBUG', 'INIT', 'Built prompts', {
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
      });

      // Call LLM
      await this.log(execution.id, agent.id, 'INFO', 'LLM_CALL', 'Calling LLM...');
      const llmStart = Date.now();

      const messages = [{ role: 'user' as const, content: userPrompt }];
      const response = await this.aiSdk.generateChat(messages, systemPrompt);

      llmCalls++;
      const llmLatency = Date.now() - llmStart;
      // generateChat returns { text, usage? }
      const responseText = response.text || '';
      const usage = response.usage as any;
      const promptToks = usage?.promptTokens || usage?.prompt_tokens || 0;
      const completionToks = usage?.completionTokens || usage?.completion_tokens || 0;
      inputTokens += promptToks;
      outputTokens += completionToks;

      await this.log(execution.id, agent.id, 'INFO', 'LLM_CALL', 'LLM response received', {
        latencyMs: llmLatency,
        inputTokens: promptToks,
        outputTokens: completionToks,
      }, promptToks, completionToks, llmLatency, agent.modelId);

      // Parse and process response
      const result = this.parseAgentResponse(responseText);
      
      // Create alerts if any
      if (result.alerts && result.alerts.length > 0) {
        for (const alert of result.alerts) {
          await this.prisma.agentAlert.create({
            data: {
              agentType: 'DEAL_HEALTH', // Use a default for custom agents
              alertType: alert.type || 'INFORMATION',
              priority: alert.priority || 'MEDIUM',
              title: alert.title,
              description: alert.description,
              recommendation: alert.recommendation,
              userId,
              entityType: alert.entityType || dto.entityType || 'Opportunity',
              entityId: alert.entityId || dto.entityId || 'general',
              status: 'PENDING',
              // Store suggested actions for one-tap execution
              suggestedActions: alert.suggestedActions || [],
              metadata: {
                entityName: alert.entityName,
                agentId: agent.id,
                agentName: agent.name,
                executionId: execution.id,
              },
            },
          });
          alertsCreated++;
        }
        await this.log(execution.id, agent.id, 'INFO', 'RESULT', `Created ${alertsCreated} alerts with suggested actions`);
      }

      // Process actions from agent response
      let actionsExecuted = 0;
      let actionsPending = 0;
      if (result.actions && result.actions.length > 0) {
        await this.log(execution.id, agent.id, 'INFO', 'ACTION', `Processing ${result.actions.length} actions...`);

        for (const action of result.actions) {
          try {
            const actionResult = await this.processAgentAction(
              execution.id,
              agent,
              action,
              userId,
            );

            if (actionResult.executed) {
              actionsExecuted++;
              await this.log(execution.id, agent.id, 'INFO', 'ACTION',
                `Executed action: ${action.type}`, actionResult);
            } else if (actionResult.queued) {
              actionsPending++;
              await this.log(execution.id, agent.id, 'INFO', 'ACTION',
                `Queued for approval: ${action.type}`, actionResult);
            }
          } catch (actionError: any) {
            await this.log(execution.id, agent.id, 'WARN', 'ACTION',
              `Action failed: ${action.type} - ${actionError.message}`);
          }
        }

        await this.log(execution.id, agent.id, 'INFO', 'ACTION',
          `Actions complete: ${actionsExecuted} executed, ${actionsPending} pending approval`);
      }

      // Update execution record
      const executionTime = Date.now() - startTime;
      await this.prisma.agentDefinitionExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: executionTime,
          llmCalls,
          inputTokens,
          outputTokens,
          estimatedCost: this.estimateCost(inputTokens, outputTokens),
          alertsCreated,
          actionsCreated: actionsExecuted + actionsPending,
          insightsFound: result.insights?.length || 0,
          resultSummary: result.summary || 'Completed successfully',
          resultData: {
            ...result,
            actionsExecuted,
            actionsPending,
          },
        },
      });

      // Update agent stats
      await this.prisma.agentDefinition.update({
        where: { id: agent.id },
        data: {
          lastRunAt: new Date(),
          runCount: { increment: 1 },
          successCount: { increment: 1 },
        },
      });

      await this.log(execution.id, agent.id, 'INFO', 'RESULT', `Execution completed in ${executionTime}ms`, {
        llmCalls,
        alertsCreated,
        executionTimeMs: executionTime,
      });

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      await this.log(execution.id, agent.id, 'ERROR', 'ERROR', error.message, {
        stack: error.stack,
      });

      await this.prisma.agentDefinitionExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          executionTimeMs: executionTime,
          llmCalls,
          inputTokens,
          outputTokens,
          errorMessage: error.message,
          errorStack: error.stack,
        },
      });

      await this.prisma.agentDefinition.update({
        where: { id: agent.id },
        data: {
          lastRunAt: new Date(),
          runCount: { increment: 1 },
          failureCount: { increment: 1 },
        },
      });
    }
  }

  // ==================== EXECUTION LOGS ====================

  async getExecutionLogs(executionId: string, query: QueryExecutionLogsDto) {
    const where: any = { executionId };
    if (query.level) where.level = query.level;
    if (query.category) where.category = query.category;

    return this.prisma.agentExecutionLog.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: query.limit || 100,
    });
  }

  async getExecution(executionId: string) {
    const execution = await this.prisma.agentDefinitionExecution.findUnique({
      where: { id: executionId },
      include: {
        agent: true,
        logs: { orderBy: { timestamp: 'asc' } },
      },
    });
    if (!execution) throw new NotFoundException(`Execution ${executionId} not found`);
    return execution;
  }

  async listExecutions(agentId: string, limit = 20) {
    return this.prisma.agentDefinitionExecution.findMany({
      where: { agentId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  // ==================== TEMPLATES ====================

  async listTemplates(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;

    return this.prisma.agentTemplate.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { useCount: 'desc' }],
    });
  }

  async createFromTemplate(templateId: string, userId: string, name: string) {
    const template = await this.prisma.agentTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException(`Template ${templateId} not found`);

    const config = template.templateConfig as any;
    
    const agent = await this.createAgent(userId, {
      name: name || `${template.name} (Copy)`,
      description: config.description || template.description,
      category: template.category,
      icon: template.icon,
      color: template.color,
      systemPrompt: config.systemPrompt,
      analysisPrompt: config.analysisPrompt,
      outputFormat: config.outputFormat,
      modelId: config.modelId,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enabledTools: config.enabledTools,
      triggerConfig: config.triggerConfig,
      targetEntityTypes: config.targetEntityTypes,
      alertTypes: config.alertTypes,
      requiresApproval: config.requiresApproval,
    });

    // Increment template use count
    await this.prisma.agentTemplate.update({
      where: { id: templateId },
      data: { useCount: { increment: 1 } },
    });

    return agent;
  }

  // ==================== AVAILABLE TOOLS ====================

  getAvailableTools(includeExternalCrm: boolean = false) {
    const localTools = [
      { name: 'search_opportunities', description: 'Search opportunities with filters', category: 'Local CRM' },
      { name: 'get_opportunity_details', description: 'Get detailed opportunity info', category: 'Local CRM' },
      { name: 'search_accounts', description: 'Search accounts', category: 'Local CRM' },
      { name: 'get_account_details', description: 'Get account details with contacts', category: 'Local CRM' },
      { name: 'search_leads', description: 'Search leads', category: 'Local CRM' },
      { name: 'get_lead_details', description: 'Get lead details', category: 'Local CRM' },
      { name: 'search_activities', description: 'Search recent activities', category: 'Local CRM' },
      { name: 'get_pipeline_summary', description: 'Get pipeline metrics', category: 'Analytics' },
      { name: 'create_task', description: 'Create a follow-up task', category: 'Actions' },
      { name: 'create_note', description: 'Create a note on a record', category: 'Actions' },
    ];

    if (includeExternalCrm) {
      const salesforceTools = getAvailableSalesforceTools();
      return [...localTools, ...salesforceTools];
    }

    return localTools;
  }

  /**
   * Check if a user has Salesforce connected
   */
  async checkSalesforceConnection(userId: string): Promise<{ connected: boolean; orgName?: string }> {
    try {
      const status = await this.salesforceService.getConnectionStatus(userId);
      return {
        connected: status.connected,
        orgName: status.connection?.displayName || status.connection?.username,
      };
    } catch (error) {
      this.logger.warn(`Failed to check Salesforce connection for user ${userId}: ${error}`);
      return { connected: false };
    }
  }

  // ==================== HELPER METHODS ====================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
  }

  private async createVersion(agentId: string, version: string, userId: string, notes: string) {
    const agent = await this.prisma.agentDefinition.findUnique({ where: { id: agentId } });
    if (!agent) return;

    await this.prisma.agentVersion.create({
      data: {
        agentId,
        version,
        configSnapshot: {
          systemPrompt: agent.systemPrompt,
          analysisPrompt: agent.analysisPrompt,
          outputFormat: agent.outputFormat,
          modelId: agent.modelId,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          enabledTools: agent.enabledTools,
          triggerConfig: agent.triggerConfig,
          targetEntityTypes: agent.targetEntityTypes,
          alertTypes: agent.alertTypes,
        },
        changeNotes: notes,
        changedBy: userId,
      },
    });
  }

  private buildSystemPrompt(agent: any): string {
    return `${agent.systemPrompt}

You are an AI agent named "${agent.name}". ${agent.description}

CRITICAL: You MUST respond with a JSON object containing your analysis AND any actions to take.

Your response MUST be valid JSON in this exact format:
\`\`\`json
{
  "summary": "Brief executive summary of your analysis (2-3 sentences)",
  "alerts": [
    {
      "type": "CRITICAL|WARNING|INFORMATION|OPPORTUNITY",
      "priority": "HIGH|MEDIUM|LOW",
      "title": "Alert title",
      "description": "Detailed description",
      "recommendation": "What to do about it",
      "entityType": "Lead|Account|Opportunity|Contact",
      "entityId": "Salesforce ID if applicable",
      "entityName": "Name of the lead/account/contact for display",
      "suggestedActions": [
        {
          "id": "unique-action-id",
          "type": "SEND_EMAIL|SCHEDULE_CALL|CREATE_TASK|UPDATE_STATUS|LOG_ACTIVITY",
          "label": "Button label (e.g., 'Send Follow-up Email')",
          "description": "What this action will do",
          "icon": "email|phone|task|status|note",
          "data": {
            // For SEND_EMAIL:
            "to": "email@example.com",
            "subject": "Pre-written subject line",
            "body": "Pre-written email body with personalization",
            "templateType": "follow_up|introduction|meeting_request"

            // For SCHEDULE_CALL:
            "contactName": "John Smith",
            "phone": "+1234567890",
            "suggestedTime": "2025-01-02T14:00:00Z",
            "callPurpose": "Discovery call to discuss needs",
            "talkingPoints": ["Point 1", "Point 2"]

            // For CREATE_TASK:
            "subject": "Task subject",
            "description": "Task description",
            "dueDate": "2025-01-02",
            "priority": "HIGH|MEDIUM|LOW"

            // For UPDATE_STATUS:
            "currentStatus": "New",
            "newStatus": "Working",
            "reason": "Why this status change"

            // For LOG_ACTIVITY:
            "activityType": "CALL|EMAIL|MEETING",
            "subject": "Activity subject",
            "notes": "Pre-filled notes"
          }
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "CREATE_TASK|UPDATE_LEAD|UPDATE_OPPORTUNITY|CREATE_NOTE|SEND_NOTIFICATION|DRAFT_EMAIL",
      "priority": "HIGH|MEDIUM|LOW",
      "data": {
        // Action-specific data as before
      }
    }
  ],
  "insights": [
    {
      "category": "engagement|pipeline|risk|opportunity",
      "finding": "What you discovered",
      "evidence": "Data supporting this finding",
      "impact": "Why this matters"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "action": "Specific recommended action",
      "reason": "Why this is important",
      "expectedOutcome": "What should happen"
    }
  ]
}
\`\`\`

IMPORTANT - For each alert, you MUST include 2-4 suggestedActions that the user can execute with ONE TAP:
- For leads not contacted: Include SEND_EMAIL with pre-written personalized email, SCHEDULE_CALL with suggested time
- For status updates needed: Include UPDATE_STATUS with the recommended new status
- For follow-ups needed: Include CREATE_TASK with specific due date and description
- Always personalize email bodies with the contact's name and relevant context from the data

Rules:
1. ALWAYS output valid JSON wrapped in \`\`\`json code blocks
2. Each alert MUST have at least 2 suggestedActions with pre-filled data
3. Email bodies should be professional, personalized, and ready to send
4. Include specific entity IDs so actions can be executed immediately
5. Suggested times for calls should be during business hours
6. Be specific and actionable - the user should just tap "Approve" to execute`;
  }

  private async buildUserPrompt(agent: any, dto: RunAgentDto, userId?: string): Promise<string> {
    let prompt = agent.analysisPrompt || 'Analyze the current state and provide insights.';

    if (dto.entityType && dto.entityId) {
      prompt += `\n\nFocus on: ${dto.entityType} with ID ${dto.entityId}`;
    }

    if (dto.scope) {
      prompt += `\n\nScope: ${JSON.stringify(dto.scope)}`;
    }

    // Determine data source: runtime DTO overrides agent's default configuration
    let crmData: string | null = null;
    // Runtime override takes precedence over agent's saved configuration
    const useExternalCrmFromDto = dto.useExternalCrmData !== undefined ? dto.useExternalCrmData : agent.useExternalCrmData;
    const externalProviderFromDto = dto.externalCrmProvider || agent.externalCrmProvider;
    const useExternalCrm = useExternalCrmFromDto && externalProviderFromDto === 'SALESFORCE';

    if (useExternalCrm && userId) {
      // Check if user has Salesforce connected
      const sfConnection = await this.checkSalesforceConnection(userId);
      if (sfConnection.connected) {
        this.logger.log(`Agent ${agent.name} using Salesforce data source for user ${userId}`);
        crmData = await this.fetchSalesforceCrmDataForAgent(agent, dto, userId);
        if (crmData) {
          prompt += `\n\n--- SALESFORCE CRM DATA (Live from ${sfConnection.orgName || 'Connected Org'}) ---\n${crmData}`;
        }
      } else {
        this.logger.warn(`Agent ${agent.name} configured for Salesforce but user ${userId} not connected. Falling back to local data.`);
        crmData = await this.fetchCrmDataForAgent(agent, dto);
        if (crmData) {
          prompt += `\n\n--- LOCAL CRM DATA (Salesforce not connected) ---\n${crmData}`;
        }
      }
    } else {
      // Use local database
      crmData = await this.fetchCrmDataForAgent(agent, dto);
      if (crmData) {
        prompt += `\n\n--- CRM DATA ---\n${crmData}`;
      }
    }

    return prompt;
  }

  private async fetchCrmDataForAgent(agent: any, dto: RunAgentDto): Promise<string> {
    const enabledTools = agent.enabledTools || [];
    const dataSections: string[] = [];

    try {
      // Fetch opportunities if tool is enabled
      if (enabledTools.includes('search_opportunities') || enabledTools.includes('get_opportunity_details')) {
        const opportunities = await this.prisma.opportunity.findMany({
          where: {
            stage: { 
              in: ['PROSPECTING', 'QUALIFICATION', 'NEEDS_ANALYSIS', 'VALUE_PROPOSITION', 
                   'DECISION_MAKERS_IDENTIFIED', 'PERCEPTION_ANALYSIS', 'PROPOSAL_PRICE_QUOTE', 'NEGOTIATION_REVIEW'] 
            },
          },
          include: {
            account: { select: { name: true } },
            owner: { select: { name: true, email: true } },
          },
          take: 20,
          orderBy: { updatedAt: 'desc' },
        });

        if (opportunities.length > 0) {
          // Fetch related activities separately
          const oppIds = opportunities.map(o => o.id);
          const activities = await this.prisma.activity.findMany({
            where: { opportunityId: { in: oppIds } },
            orderBy: { createdAt: 'desc' },
            take: 50,
          });
          
          const activitiesByOpp = new Map<string, any[]>();
          activities.forEach(a => {
            const list = activitiesByOpp.get(a.opportunityId!) || [];
            list.push(a);
            activitiesByOpp.set(a.opportunityId!, list);
          });

          const oppData = opportunities.map(opp => {
            const oppActivities = activitiesByOpp.get(opp.id) || [];
            return {
              id: opp.id,
              name: opp.name,
              account: opp.account?.name || 'Unknown',
              stage: opp.stage,
              amount: opp.amount,
              probability: opp.probability,
              closeDate: opp.closeDate,
              createdAt: opp.createdAt,
              updatedAt: opp.updatedAt,
              lastActivityDate: opp.lastActivityDate,
              nextStep: opp.nextStep,
              owner: opp.owner?.name,
              daysInStage: opp.updatedAt ? Math.floor((Date.now() - new Date(opp.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) : null,
              activityCount: oppActivities.length,
              lastActivityDaysAgo: oppActivities.length > 0 
                ? Math.floor((Date.now() - new Date(oppActivities[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
                : null,
            };
          });
          dataSections.push(`## OPPORTUNITIES (${opportunities.length} open)\n${JSON.stringify(oppData, null, 2)}`);
        }
      }

      // Fetch accounts if tool is enabled
      if (enabledTools.includes('search_accounts') || enabledTools.includes('get_account_details')) {
        const accounts = await this.prisma.account.findMany({
          include: {
            contacts: { take: 3, select: { firstName: true, lastName: true, title: true, email: true } },
            opportunities: { 
              where: { 
                stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
              },
              take: 3,
              select: { name: true, amount: true, stage: true },
            },
          },
          take: 15,
          orderBy: { updatedAt: 'desc' },
        });

        if (accounts.length > 0) {
          const accData = accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            industry: acc.industry,
            rating: acc.rating,
            annualRevenue: acc.annualRevenue,
            contacts: acc.contacts.map(c => ({ name: `${c.firstName} ${c.lastName}`, title: c.title, email: c.email })),
            openOpportunities: acc.opportunities,
          }));
          dataSections.push(`## ACCOUNTS (${accounts.length})\n${JSON.stringify(accData, null, 2)}`);
        }
      }

      // Fetch leads if tool is enabled
      if (enabledTools.includes('search_leads') || enabledTools.includes('get_lead_details')) {
        const leads = await this.prisma.lead.findMany({
          where: {
            status: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'NURTURING'] },
          },
          take: 20,
          orderBy: { updatedAt: 'desc' },
        });

        if (leads.length > 0) {
          const leadData = leads.map(lead => ({
            id: lead.id,
            name: `${lead.firstName} ${lead.lastName}`,
            company: lead.company,
            status: lead.status,
            email: lead.email,
            phone: lead.phone,
            rating: lead.rating,
            leadSource: lead.leadSource,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
          }));
          dataSections.push(`## LEADS (${leads.length})\n${JSON.stringify(leadData, null, 2)}`);
        }
      }

      // Fetch activities if tool is enabled
      if (enabledTools.includes('search_activities') || enabledTools.includes('get_activity_details')) {
        const activities = await this.prisma.activity.findMany({
          include: {
            opportunity: { select: { name: true } },
            account: { select: { name: true } },
          },
          take: 30,
          orderBy: { createdAt: 'desc' },
        });

        if (activities.length > 0) {
          const actData = activities.map(act => ({
            id: act.id,
            type: act.type,
            subject: act.subject,
            outcome: act.outcome,
            activityDate: act.activityDate,
            createdAt: act.createdAt,
            opportunity: act.opportunity?.name,
            account: act.account?.name,
          }));
          dataSections.push(`## RECENT ACTIVITIES (${activities.length})\n${JSON.stringify(actData, null, 2)}`);
        }
      }

      // Fetch tasks if tool is enabled
      if (enabledTools.includes('search_tasks') || enabledTools.includes('get_task_details')) {
        const tasks = await this.prisma.task.findMany({
          where: {
            status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'WAITING'] },
          },
          include: {
            opportunity: { select: { name: true } },
          },
          take: 20,
          orderBy: { dueDate: 'asc' },
        });

        if (tasks.length > 0) {
          const taskData = tasks.map(task => ({
            id: task.id,
            subject: task.subject,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            opportunity: task.opportunity?.name,
            isOverdue: task.dueDate && new Date(task.dueDate) < new Date(),
          }));
          dataSections.push(`## PENDING TASKS (${tasks.length})\n${JSON.stringify(taskData, null, 2)}`);
        }
      }

      return dataSections.length > 0 ? dataSections.join('\n\n') : '';
    } catch (error: any) {
      this.logger.error(`Error fetching CRM data: ${error.message}`);
      return '';
    }
  }

  /**
   * Fetch CRM data from Salesforce for agent analysis - DYNAMIC VERSION
   * This method queries Salesforce using dynamic field discovery, not hardcoded fields.
   * It discovers the schema first and then queries available fields.
   */
  private async fetchSalesforceCrmDataForAgent(agent: any, dto: RunAgentDto, userId: string): Promise<string> {
    const enabledTools = agent.enabledTools || [];
    const dataSections: string[] = [];

    try {
      // Helper to get queryable fields for an object (with caching)
      const getFields = async (objectName: string): Promise<string[]> => {
        try {
          const describe = await this.salesforceService.describeSObject(userId, objectName);
          // Get queryable fields, excluding problematic compound types
          return describe.fields
            .filter((f: any) => f.type !== 'address' && f.type !== 'location' && !f.deprecatedAndHidden)
            .map((f: any) => f.name)
            .slice(0, 40); // Limit to prevent query length issues
        } catch (error) {
          this.logger.warn(`Failed to describe ${objectName}, using minimal fields`);
          return ['Id', 'Name'];
        }
      };

      // Dynamically fetch opportunities from Salesforce
      if (enabledTools.some((t: string) => t.includes('opportunit') || t.includes('sf_'))) {
        try {
          const fields = await getFields('Opportunity');
          const soql = `SELECT ${fields.join(', ')} FROM Opportunity WHERE IsClosed = false ORDER BY LastModifiedDate DESC LIMIT 20`;
          const result = await this.salesforceService.query(userId, soql);
          
          if (result.records && result.records.length > 0) {
            dataSections.push(`## SALESFORCE OPPORTUNITIES (${result.records.length} open)\nFields available: ${fields.slice(0, 10).join(', ')}...\n${JSON.stringify(result.records, null, 2)}`);
          }
        } catch (error: any) {
          this.logger.warn(`Failed to fetch Opportunities: ${error.message}`);
        }
      }

      // Dynamically fetch accounts from Salesforce
      if (enabledTools.some((t: string) => t.includes('account') || t.includes('sf_'))) {
        try {
          const fields = await getFields('Account');
          const soql = `SELECT ${fields.join(', ')} FROM Account ORDER BY LastModifiedDate DESC LIMIT 15`;
          const result = await this.salesforceService.query(userId, soql);
          
          if (result.records && result.records.length > 0) {
            dataSections.push(`## SALESFORCE ACCOUNTS (${result.records.length})\nFields available: ${fields.slice(0, 10).join(', ')}...\n${JSON.stringify(result.records, null, 2)}`);
          }
        } catch (error: any) {
          this.logger.warn(`Failed to fetch Accounts: ${error.message}`);
        }
      }

      // Dynamically fetch leads from Salesforce
      if (enabledTools.some((t: string) => t.includes('lead') || t.includes('sf_'))) {
        try {
          const fields = await getFields('Lead');
          const soql = `SELECT ${fields.join(', ')} FROM Lead WHERE IsConverted = false ORDER BY CreatedDate DESC LIMIT 20`;
          const result = await this.salesforceService.query(userId, soql);
          
          if (result.records && result.records.length > 0) {
            dataSections.push(`## SALESFORCE LEADS (${result.records.length})\nFields available: ${fields.slice(0, 10).join(', ')}...\n${JSON.stringify(result.records, null, 2)}`);
          }
        } catch (error: any) {
          this.logger.warn(`Failed to fetch Leads: ${error.message}`);
        }
      }

      // Dynamically fetch tasks/activities from Salesforce
      if (enabledTools.some((t: string) => t.includes('activit') || t.includes('task') || t.includes('sf_'))) {
        try {
          const fields = await getFields('Task');
          const soql = `SELECT ${fields.join(', ')} FROM Task ORDER BY LastModifiedDate DESC LIMIT 30`;
          const result = await this.salesforceService.query(userId, soql);
          
          if (result.records && result.records.length > 0) {
            dataSections.push(`## SALESFORCE TASKS/ACTIVITIES (${result.records.length})\nFields available: ${fields.slice(0, 10).join(', ')}...\n${JSON.stringify(result.records, null, 2)}`);
          }
        } catch (error: any) {
          this.logger.warn(`Failed to fetch Tasks: ${error.message}`);
        }
      }

      // Dynamically fetch contacts from Salesforce
      if (enabledTools.some((t: string) => t.includes('contact') || t.includes('sf_'))) {
        try {
          const fields = await getFields('Contact');
          const soql = `SELECT ${fields.join(', ')} FROM Contact ORDER BY LastModifiedDate DESC LIMIT 20`;
          const result = await this.salesforceService.query(userId, soql);
          
          if (result.records && result.records.length > 0) {
            dataSections.push(`## SALESFORCE CONTACTS (${result.records.length})\nFields available: ${fields.slice(0, 10).join(', ')}...\n${JSON.stringify(result.records, null, 2)}`);
          }
        } catch (error: any) {
          this.logger.warn(`Failed to fetch Contacts: ${error.message}`);
        }
      }

      // Add available objects info for agent awareness
      try {
        const globalDescribe = await this.salesforceService.describeGlobal(userId);
        const customObjects = globalDescribe.sobjects
          .filter((obj: any) => obj.custom && obj.queryable)
          .map((obj: any) => obj.name)
          .slice(0, 20);
        
        if (customObjects.length > 0) {
          dataSections.push(`## CUSTOM OBJECTS AVAILABLE\nThe following custom objects are available in this Salesforce org and can be queried:\n${customObjects.join(', ')}`);
        }
      } catch (error) {
        // Non-critical, skip
      }

      if (dataSections.length === 0) {
        dataSections.push('No Salesforce data fetched. Use sf_query tool to query specific objects or sf_list_objects to discover available objects.');
      }

      return dataSections.join('\n\n');
    } catch (error: any) {
      this.logger.error(`Error fetching Salesforce CRM data: ${error.message}`);
      return `Error fetching Salesforce data: ${error.message}. The agent can use sf_describe_object and sf_query tools to discover and query data dynamically.`;
    }
  }

  private parseAgentResponse(text: string): any {
    try {
      // Multiple strategies to extract JSON

      // Strategy 1: Look for ```json code block (greedy, handles multi-line)
      const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        const parsed = JSON.parse(jsonBlockMatch[1].trim());
        this.logger.debug(`Parsed JSON from code block: ${Object.keys(parsed).join(', ')}`);
        return parsed;
      }

      // Strategy 2: Look for ``` code block without json tag
      const codeBlockMatch = text.match(/```\s*([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1] && codeBlockMatch[1].trim().startsWith('{')) {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        this.logger.debug(`Parsed JSON from generic code block`);
        return parsed;
      }

      // Strategy 3: Find first { to last } for direct JSON
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = text.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonStr);
        this.logger.debug(`Parsed JSON directly from text: ${Object.keys(parsed).join(', ')}`);
        return parsed;
      }

      // No JSON found - return as summary
      this.logger.warn('No JSON found in agent response, returning as summary');
      return {
        summary: text,
        alerts: [],
        actions: [],
        insights: [],
        recommendations: [],
      };
    } catch (error: any) {
      this.logger.error(`Failed to parse agent response as JSON: ${error.message}`);
      this.logger.debug(`Response text (first 500 chars): ${text.substring(0, 500)}`);
      return {
        summary: text,
        alerts: [],
        actions: [],
        insights: [],
        recommendations: [],
        parseError: error.message,
      };
    }
  }

  /**
   * Process and execute actions from agent response
   * Some actions execute immediately, others are queued for approval
   */
  private async processAgentAction(
    executionId: string,
    agent: any,
    action: any,
    userId: string,
  ): Promise<{ executed: boolean; queued: boolean; result?: any }> {
    const requiresApproval = agent.requiresApproval || action.priority === 'HIGH';

    // Actions that modify CRM data require approval by default
    const modifyingActions = ['UPDATE_LEAD', 'UPDATE_OPPORTUNITY', 'UPDATE_ACCOUNT'];
    const needsApproval = requiresApproval || modifyingActions.includes(action.type);

    if (needsApproval) {
      // Queue action for user approval
      await this.prisma.agentAction.create({
        data: {
          executionId,
          actionType: action.type,
          description: `${action.type}: ${JSON.stringify(action.data).substring(0, 200)}`,
          params: action.data,
          priority: action.priority || 'MEDIUM',
          status: 'PENDING_APPROVAL',
          requiresApproval: true,
          userId,
        },
      });
      return { executed: false, queued: true };
    }

    // Execute action immediately
    switch (action.type) {
      case 'CREATE_TASK':
        return await this.executeCreateTask(action.data, userId);

      case 'CREATE_NOTE':
        return await this.executeCreateNote(action.data, userId);

      case 'SEND_NOTIFICATION':
        return await this.executeSendNotification(action.data, userId, agent.name);

      default:
        // Unknown action type - queue for review
        await this.prisma.agentAction.create({
          data: {
            executionId,
            actionType: action.type,
            description: `${action.type}: ${JSON.stringify(action.data).substring(0, 200)}`,
            params: action.data,
            priority: action.priority || 'MEDIUM',
            status: 'PENDING_APPROVAL',
            requiresApproval: true,
            userId,
          },
        });
        return { executed: false, queued: true };
    }
  }

  /**
   * Execute CREATE_TASK action - creates a task/follow-up activity in the local CRM
   */
  private async executeCreateTask(data: any, userId: string): Promise<{ executed: boolean; queued: boolean; result?: any }> {
    try {
      // Create activity as FOLLOW_UP type (closest to a task)
      const task = await this.prisma.activity.create({
        data: {
          type: 'FOLLOW_UP',
          subject: data.subject || 'Agent Created Task',
          description: data.description,
          userId,
          activityDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
          metadata: {
            createdByAgent: true,
            taskPriority: data.priority || 'MEDIUM',
            relatedToType: data.relatedToType,
            relatedToId: data.relatedToId,
          },
        },
      });

      return {
        executed: true,
        queued: false,
        result: { taskId: task.id, subject: data.subject },
      };
    } catch (error: any) {
      this.logger.error(`Failed to create task: ${error.message}`);
      return { executed: false, queued: false, result: { error: error.message } };
    }
  }

  /**
   * Execute CREATE_NOTE action - creates a note in the local CRM
   */
  private async executeCreateNote(data: any, userId: string): Promise<{ executed: boolean; queued: boolean; result?: any }> {
    try {
      const note = await this.prisma.note.create({
        data: {
          title: data.title || 'Agent Created Note',
          body: data.body || data.content || '',
          userId,
          metadata: {
            createdByAgent: true,
            relatedToType: data.relatedToType,
            relatedToId: data.relatedToId,
          },
        },
      });

      return {
        executed: true,
        queued: false,
        result: { noteId: note.id, title: data.title },
      };
    } catch (error: any) {
      this.logger.error(`Failed to create note: ${error.message}`);
      return { executed: false, queued: false, result: { error: error.message } };
    }
  }

  /**
   * Execute SEND_NOTIFICATION action - creates an alert (which acts as notification)
   */
  private async executeSendNotification(data: any, userId: string, agentName: string): Promise<{ executed: boolean; queued: boolean; result?: any }> {
    try {
      // Create an AgentAlert which serves as the notification
      const alert = await this.prisma.agentAlert.create({
        data: {
          agentType: 'DEAL_HEALTH', // Use default agent type
          alertType: 'ACTION_REQUIRED',
          priority: data.priority || 'MEDIUM',
          title: data.title || `Notification from ${agentName}`,
          description: data.message || data.body || '',
          recommendation: data.recommendation,
          userId,
          entityType: data.entityType || 'General',
          entityId: data.entityId || 'notification',
          status: 'PENDING',
          metadata: {
            agentName,
            isNotification: true,
          },
        },
      });

      this.logger.log(`Created notification alert: ${alert.id} for user ${userId}`);

      return {
        executed: true,
        queued: false,
        result: { alertId: alert.id },
      };
    } catch (error: any) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      return { executed: false, queued: false, result: { error: error.message } };
    }
  }

  // ==================== ALERTS & SUGGESTED ACTIONS ====================

  /**
   * Get alerts for a user with optional filtering
   */
  async getAlerts(userId: string, options: { status?: string; priority?: string; limit?: number }) {
    const where: any = { userId };
    if (options.status) where.status = options.status;
    if (options.priority) where.priority = options.priority;

    return this.prisma.agentAlert.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: options.limit || 50,
    });
  }

  /**
   * Get a single alert with full details
   */
  async getAlert(alertId: string, userId: string) {
    const alert = await this.prisma.agentAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    if (alert.userId !== userId) {
      throw new BadRequestException('Access denied to this alert');
    }

    return alert;
  }

  /**
   * Execute a suggested action from an alert
   */
  async executeAlertAction(
    alertId: string,
    actionId: string,
    userId: string,
    modifications?: any,
  ) {
    const alert = await this.getAlert(alertId, userId);
    const suggestedActions = (alert.suggestedActions as any[]) || [];

    // Support both id-based and index-based action lookup
    let action: any = null;
    let actionIndex: number = -1;

    // Try finding by id first
    action = suggestedActions.find((a: any) => a.id === actionId);

    // If not found, try index-based lookup (e.g., "action-0", "action-1")
    if (!action && actionId.startsWith('action-')) {
      actionIndex = parseInt(actionId.replace('action-', ''), 10);
      if (!isNaN(actionIndex) && actionIndex >= 0 && actionIndex < suggestedActions.length) {
        action = suggestedActions[actionIndex];
      }
    }

    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found in alert`);
    }

    // Support both data formats: action.data/action.type (old) and action.params/action.actionType (new)
    const baseActionData = action.data || action.params || {};
    const actionData = modifications
      ? { ...baseActionData, ...modifications }
      : baseActionData;
    const actionType = action.type || action.actionType;

    this.logger.log(`Executing suggested action ${actionType} from alert ${alertId}`);

    let result: any;

    switch (actionType) {
      case 'SEND_EMAIL':
        result = await this.executeSendEmail(actionData, userId, alert);
        break;

      case 'SCHEDULE_CALL':
      case 'SCHEDULE_MEETING':
        result = await this.executeScheduleCall(actionData, userId, alert);
        break;

      case 'CREATE_TASK':
        result = await this.executeCreateTask(actionData, userId);
        break;

      case 'UPDATE_STATUS':
      case 'UPDATE_STAGE':
        result = await this.executeUpdateStatus(actionData, userId, alert);
        break;

      case 'LOG_ACTIVITY':
      case 'ADD_NOTE':
        result = await this.executeLogActivity(actionData, userId, alert);
        break;

      case 'CLOSE_DEAL':
        result = await this.executeCloseDeal(actionData, userId, alert);
        break;

      default:
        throw new BadRequestException(`Unknown action type: ${actionType}`);
    }

    // Mark the action as executed in the alert
    const updatedActions = suggestedActions.map((a: any, idx: number) => {
      const isTarget = actionIndex >= 0 ? idx === actionIndex : a.id === actionId;
      return isTarget
        ? { ...a, executed: true, executedAt: new Date().toISOString(), result }
        : a;
    });

    await this.prisma.agentAlert.update({
      where: { id: alertId },
      data: {
        suggestedActions: updatedActions,
        status: 'ACTIONED',
        actionedAt: new Date(),
        actionedBy: userId,
      },
    });

    return {
      success: true,
      actionType,
      result,
      message: `Action "${action.label}" executed successfully`,
    };
  }

  /**
   * Execute SEND_EMAIL suggested action
   */
  private async executeSendEmail(data: any, userId: string, alert: any): Promise<any> {
    // Create a draft email activity and log it
    const activity = await this.prisma.activity.create({
      data: {
        type: 'EMAIL',
        subject: data.subject,
        description: data.body,
        userId,
        metadata: {
          to: data.to,
          templateType: data.templateType,
          alertId: alert.id,
          entityType: alert.entityType,
          entityId: alert.entityId,
          status: 'SENT', // In a real implementation, this would integrate with email service
        },
      },
    });

    // Log a note about the email
    await this.prisma.note.create({
      data: {
        title: `Email sent: ${data.subject}`,
        body: `Sent to: ${data.to}\n\n${data.body}`,
        userId,
        metadata: {
          type: 'email_log',
          activityId: activity.id,
        },
      },
    });

    return {
      activityId: activity.id,
      emailTo: data.to,
      subject: data.subject,
    };
  }

  /**
   * Execute SCHEDULE_CALL suggested action
   */
  private async executeScheduleCall(data: any, userId: string, alert: any): Promise<any> {
    // Create a scheduled call activity
    const scheduledTime = data.suggestedTime
      ? new Date(data.suggestedTime)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow

    const activity = await this.prisma.activity.create({
      data: {
        type: 'CALL',
        subject: `Call with ${data.contactName}: ${data.callPurpose}`,
        description: data.talkingPoints?.join('\n- ') || data.callPurpose,
        userId,
        activityDate: scheduledTime,
        metadata: {
          phone: data.phone,
          contactName: data.contactName,
          talkingPoints: data.talkingPoints,
          alertId: alert.id,
          entityType: alert.entityType,
          entityId: alert.entityId,
          status: 'SCHEDULED',
        },
      },
    });

    return {
      activityId: activity.id,
      scheduledTime: scheduledTime.toISOString(),
      contactName: data.contactName,
      phone: data.phone,
    };
  }

  /**
   * Execute UPDATE_STATUS suggested action
   */
  private async executeUpdateStatus(data: any, userId: string, alert: any): Promise<any> {
    // This would update the status in Salesforce or local CRM
    // For now, log it as an activity and queue for actual CRM update

    await this.prisma.activity.create({
      data: {
        type: 'INTERNAL_NOTE',
        subject: `Status update: ${data.currentStatus} → ${data.newStatus}`,
        description: data.reason,
        userId,
        metadata: {
          entityType: alert.entityType,
          entityId: alert.entityId,
          oldStatus: data.currentStatus,
          newStatus: data.newStatus,
          alertId: alert.id,
        },
      },
    });

    // Queue the actual CRM update for execution
    await this.prisma.agentAction.create({
      data: {
        actionType: `UPDATE_${alert.entityType?.toUpperCase()}`,
        description: `Update ${alert.entityType} status from ${data.currentStatus} to ${data.newStatus}`,
        params: {
          entityType: alert.entityType,
          entityId: alert.entityId,
          field: 'Status',
          oldValue: data.currentStatus,
          newValue: data.newStatus,
          reason: data.reason,
        },
        priority: 'HIGH',
        status: 'PENDING',
        userId,
      },
    });

    return {
      entityType: alert.entityType,
      entityId: alert.entityId,
      oldStatus: data.currentStatus,
      newStatus: data.newStatus,
      queued: true, // Actual SF update is queued
    };
  }

  /**
   * Execute LOG_ACTIVITY suggested action
   */
  private async executeLogActivity(data: any, userId: string, alert: any): Promise<any> {
    const activityType = data.activityType || 'INTERNAL_NOTE';

    const activity = await this.prisma.activity.create({
      data: {
        type: activityType as any,
        subject: data.subject,
        description: data.notes,
        userId,
        metadata: {
          alertId: alert.id,
          entityType: alert.entityType,
          entityId: alert.entityId,
        },
      },
    });

    return {
      activityId: activity.id,
      activityType,
      subject: data.subject,
    };
  }

  /**
   * Execute CLOSE_DEAL suggested action
   */
  private async executeCloseDeal(data: any, userId: string, alert: any): Promise<any> {
    // Update the opportunity to Closed Lost or mark as dead
    // For now, log it and queue the CRM update
    const closeReason = data.reason || 'Closed by AI recommendation - deal inactive';

    await this.prisma.activity.create({
      data: {
        type: 'INTERNAL_NOTE',
        subject: `Deal closure requested: ${data.subject || 'Close opportunity'}`,
        description: closeReason,
        userId,
        metadata: {
          alertId: alert.id,
          entityType: alert.entityType,
          entityId: alert.entityId,
          action: 'CLOSE_DEAL',
          closeReason,
        },
      },
    });

    // Queue the actual CRM update
    await this.prisma.agentAction.create({
      data: {
        actionType: 'CLOSE_OPPORTUNITY',
        description: data.subject || `Close opportunity as Lost/Dead`,
        params: {
          entityType: alert.entityType,
          entityId: alert.entityId,
          newStatus: 'Closed Lost',
          closeReason,
          opportunityId: data.opportunityId || alert.entityId,
        },
        priority: 'HIGH',
        status: 'PENDING',
        userId,
      },
    });

    return {
      entityType: alert.entityType,
      entityId: alert.entityId,
      action: 'CLOSE_DEAL',
      closeReason,
      queued: true,
    };
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string, userId: string) {
    const alert = await this.getAlert(alertId, userId);

    return this.prisma.agentAlert.update({
      where: { id: alertId },
      data: {
        status: 'DISMISSED',
        dismissedAt: new Date(),
        dismissedBy: userId,
      },
    });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string) {
    const alert = await this.getAlert(alertId, userId);

    return this.prisma.agentAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });
  }

  // ==================== AI CONFIG GENERATION ====================

  /**
   * Generate agent configuration from natural language description
   * Uses LLM to understand user intent and create a complete agent config
   */
  async generateAgentConfig(userId: string, description: string): Promise<any> {
    this.logger.log(`Generating agent config from description for user ${userId}`);

    const availableTools = this.getAvailableTools(true);
    const toolsList = availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

    const systemPrompt = `You are an AI agent configuration expert. Your task is to generate a complete agent configuration based on a user's natural language description.

Available tools that agents can use:
${toolsList}

Available categories: sales, engagement, analytics, automation, custom

Available alert types: INFORMATION, SUCCESS, WARNING, CRITICAL, OPPORTUNITY, RISK, ACTION_REQUIRED

You must respond with a valid JSON object containing the agent configuration. Be specific and actionable in the system prompt you generate.`;

    const userPrompt = `Create an agent configuration for the following request:

"${description}"

Respond with a JSON object with these fields:
{
  "name": "Short descriptive name (max 50 chars)",
  "description": "Clear description of what this agent does (1-2 sentences)",
  "category": "One of: sales, engagement, analytics, automation, custom",
  "icon": "Icon name (e.g., chart, shield, flash, notification, cpu)",
  "color": "Hex color code for the agent (e.g., #3B82F6)",
  "systemPrompt": "Detailed instructions for the AI on how to behave and analyze data. Be specific about what to look for and how to present findings.",
  "analysisPrompt": "The specific analysis task to perform. Include any criteria or thresholds.",
  "enabledTools": ["Array of tool names from the available tools list that this agent needs"],
  "alertTypes": ["Array of alert types this agent should create"],
  "requiresApproval": true/false (whether actions need human approval),
  "temperature": 0.1 to 0.7 (lower for precise analysis, higher for creative tasks),
  "suggestedTriggers": {
    "schedule": "Optional: cron expression like '0 9 * * 1' for weekly Monday 9am",
    "events": ["Optional: events that should trigger this agent like 'opportunity.updated']
  }
}

Make the systemPrompt detailed and specific to the user's request. Include clear criteria for what constitutes an alert-worthy finding.`;

    try {
      const messages = [{ role: 'user' as const, content: userPrompt }];
      const response = await this.aiSdk.generateChat(messages, systemPrompt);

      const responseText = response.text || '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from LLM response');
      }

      const config = JSON.parse(jsonMatch[0]);

      // Validate and set defaults
      const validatedConfig = {
        name: config.name || 'Custom Agent',
        description: config.description || description.slice(0, 200),
        category: ['sales', 'engagement', 'analytics', 'automation', 'custom'].includes(config.category)
          ? config.category
          : 'custom',
        icon: config.icon || 'cpu',
        color: config.color || '#C9A882',
        systemPrompt: config.systemPrompt || 'You are a helpful AI agent.',
        analysisPrompt: config.analysisPrompt || 'Analyze the data and provide insights.',
        enabledTools: Array.isArray(config.enabledTools) ? config.enabledTools : [],
        alertTypes: Array.isArray(config.alertTypes) ? config.alertTypes : ['INFORMATION'],
        requiresApproval: config.requiresApproval !== false,
        temperature: typeof config.temperature === 'number' ? Math.min(0.7, Math.max(0.1, config.temperature)) : 0.3,
        modelId: 'claude-sonnet',
        maxTokens: 4000,
        suggestedTriggers: config.suggestedTriggers || { manual: true },
        generatedFromDescription: description,
      };

      this.logger.log(`Generated agent config: ${validatedConfig.name}`);
      return validatedConfig;

    } catch (error: any) {
      this.logger.error(`Failed to generate agent config: ${error.message}`);

      // Return a basic default config on error
      return {
        name: 'Custom Agent',
        description: description.slice(0, 200),
        category: 'custom',
        icon: 'cpu',
        color: '#C9A882',
        systemPrompt: `You are an AI agent that helps with: ${description}\n\nAnalyze the relevant data and provide actionable insights.`,
        analysisPrompt: 'Analyze the current state and provide insights based on your purpose.',
        enabledTools: ['search_opportunities', 'search_accounts', 'search_leads'],
        alertTypes: ['INFORMATION', 'WARNING'],
        requiresApproval: true,
        temperature: 0.3,
        modelId: 'claude-sonnet',
        maxTokens: 4000,
        error: error.message,
      };
    }
  }

  /**
   * Create agent directly from natural language description
   */
  async createAgentFromDescription(userId: string, description: string): Promise<any> {
    const config = await this.generateAgentConfig(userId, description);

    // Create the agent with the generated config
    const createDto: CreateAgentDto = {
      name: config.name,
      description: config.description,
      category: config.category,
      icon: config.icon,
      color: config.color,
      systemPrompt: config.systemPrompt,
      analysisPrompt: config.analysisPrompt,
      enabledTools: config.enabledTools,
      alertTypes: config.alertTypes,
      requiresApproval: config.requiresApproval,
      temperature: config.temperature,
      modelId: config.modelId,
      maxTokens: config.maxTokens,
    };

    const agent = await this.createAgent(userId, createDto);

    return {
      agent,
      generatedConfig: config,
      message: `Agent "${agent.name}" created successfully from your description`,
    };
  }

  private estimateCost(inputTokens: number, outputTokens: number): number {
    // Rough estimate: $3/1M input, $15/1M output for Claude
    return (inputTokens * 0.000003) + (outputTokens * 0.000015);
  }

  private async log(
    executionId: string,
    agentId: string | null,
    level: string,
    category: string,
    message: string,
    data?: any,
    promptTokens?: number,
    completionTokens?: number,
    latencyMs?: number,
    modelUsed?: string,
  ) {
    await this.prisma.agentExecutionLog.create({
      data: {
        executionId,
        agentId,
        level,
        category,
        message,
        data,
        promptTokens,
        completionTokens,
        latencyMs,
        modelUsed,
      },
    });
  }
}


