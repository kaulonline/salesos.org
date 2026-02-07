/**
 * IRIS Agent Framework - Base Agent Service
 * 
 * Abstract base class that all agents must extend.
 * Provides common functionality for:
 * - AI/LLM integration via Vercel AI SDK
 * - State management and caching
 * - Alert and action creation
 * - Execution tracking and metrics
 * - Rate limiting and error handling
 */

import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AiSdkService } from '../../ai-sdk/ai-sdk.service';
import { CacheService } from '../../cache/cache.service';
import { SalesforceService } from '../../salesforce/salesforce.service';
import { OracleCXService } from '../../oracle-cx/oracle-cx.service';
import {
  AgentType,
  AgentContext,
  AgentResult,
  AgentConfig,
  AgentInsight,
  AgentAlert,
  AgentAction,
  AgentTool,
  AgentStatus,
  AgentLimits,
  Priority,
  generateId,
} from '../types';

/**
 * Default limits for agents
 */
export const DEFAULT_AGENT_LIMITS: AgentLimits = {
  maxExecutionTimeMs: 60000,      // 1 minute
  maxLLMCalls: 10,
  maxTokensPerExecution: 50000,
  maxAlertsPerExecution: 20,
  maxActionsPerExecution: 10,
  rateLimitPerHour: 60,
  rateLimitPerDay: 500,
};

/**
 * Execution state tracked during agent run
 */
interface ExecutionState {
  llmCallsCount: number;
  tokensUsed: { input: number; output: number; total: number };
  insights: AgentInsight[];
  alerts: AgentAlert[];
  actions: AgentAction[];
  errors: Array<{ code: string; message: string; recoverable: boolean; timestamp: Date }>;
  startTime: number;
}

export abstract class BaseAgentService {
  // Must be implemented by subclasses
  protected abstract readonly agentType: AgentType;
  protected abstract readonly logger: Logger;
  protected abstract readonly config: AgentConfig;

  // Injected services (set via constructor in subclass)
  protected prisma!: PrismaService;
  protected aiSdk!: AiSdkService;
  protected eventEmitter!: EventEmitter2;
  protected cacheService!: CacheService;
  protected salesforceService?: SalesforceService; // Optional - for agents that need SF data
  protected oracleCXService?: OracleCXService; // Optional - for agents that need Oracle CX data

  // Execution state management for concurrent executions
  private executionStates: Map<string, ExecutionState> = new Map();
  private currentExecutionId: string | null = null;

  /**
   * Get execution state for current execution
   */
  private get executionState(): ExecutionState | null {
    if (!this.currentExecutionId) return null;
    return this.executionStates.get(this.currentExecutionId) || null;
  }

  /**
   * Set execution state for a specific execution
   */
  private setExecutionState(executionId: string, state: ExecutionState | null): void {
    if (state === null) {
      this.executionStates.delete(executionId);
      if (this.currentExecutionId === executionId) {
        this.currentExecutionId = null;
      }
    } else {
      this.executionStates.set(executionId, state);
      this.currentExecutionId = executionId;
    }
  }

  /**
   * Initialize the base agent with required services
   */
  protected initializeBase(
    prisma: PrismaService,
    aiSdk: AiSdkService,
    eventEmitter: EventEmitter2,
    cacheService: CacheService,
    salesforceService?: SalesforceService, // Optional - for agents that need SF data
    oracleCXService?: OracleCXService, // Optional - for agents that need Oracle CX data
  ): void {
    this.prisma = prisma;
    this.aiSdk = aiSdk;
    this.eventEmitter = eventEmitter;
    this.cacheService = cacheService;
    this.salesforceService = salesforceService;
    this.oracleCXService = oracleCXService;
  }

  /**
   * Check if user has Salesforce connected
   * Returns connection status and instance info if connected
   */
  protected async checkSalesforceConnection(userId: string): Promise<{
    connected: boolean;
    instanceUrl?: string;
    orgName?: string;
  }> {
    if (!this.salesforceService) {
      return { connected: false };
    }
    try {
      const status = await this.salesforceService.getConnectionStatus(userId);
      return {
        connected: status.connected,
        instanceUrl: status.connection?.instanceUrl,
        orgName: status.connection?.displayName || status.connection?.username,
      };
    } catch (error) {
      this.logger.warn(`Failed to check Salesforce connection: ${error}`);
      return { connected: false };
    }
  }

  /**
   * Query Salesforce using SOQL
   * Returns null if SF not available or query fails
   */
  protected async querySalesforce<T>(userId: string, soql: string): Promise<{ records: T[]; totalSize: number } | null> {
    if (!this.salesforceService) {
      return null;
    }
    try {
      const result = await this.salesforceService.query(userId, soql);
      return { records: result.records as T[], totalSize: result.totalSize };
    } catch (error) {
      this.logger.warn(`Salesforce query failed: ${error}`);
      return null;
    }
  }

  /**
   * Get Salesforce object schema (for dynamic field discovery)
   */
  protected async describeSalesforceObject(userId: string, objectName: string): Promise<any | null> {
    if (!this.salesforceService) {
      return null;
    }
    try {
      return await this.salesforceService.describeSObject(userId, objectName);
    } catch (error) {
      this.logger.warn(`Failed to describe SF object ${objectName}: ${error}`);
      return null;
    }
  }

  // ==================== ORACLE CX INTEGRATION ====================

  /**
   * Check if user has Oracle CX connected
   * Returns connection status and instance info if connected
   */
  protected async checkOracleCXConnection(userId: string): Promise<{
    connected: boolean;
    instanceUrl?: string;
    displayName?: string;
  }> {
    if (!this.oracleCXService) {
      return { connected: false };
    }
    try {
      const status = await this.oracleCXService.getConnectionStatus(userId);
      return {
        connected: status.connected,
        instanceUrl: status.connection?.instanceUrl,
        displayName: status.connection?.displayName,
      };
    } catch (error) {
      this.logger.warn(`Failed to check Oracle CX connection: ${error}`);
      return { connected: false };
    }
  }

  /**
   * Query Oracle CX resources
   * Returns null if Oracle CX not available or query fails
   */
  protected async queryOracleCX<T>(
    userId: string,
    resource: string,
    params?: any,
  ): Promise<{ items: T[]; totalResults: number } | null> {
    if (!this.oracleCXService) {
      return null;
    }
    try {
      const result = await this.oracleCXService.query(userId, resource, params);
      return { items: result.items as T[], totalResults: result.totalResults };
    } catch (error) {
      this.logger.warn(`Oracle CX query failed: ${error}`);
      return null;
    }
  }

  /**
   * Get Oracle CX resource by ID
   * Returns null if Oracle CX not available or fetch fails
   */
  protected async getOracleCXById<T>(
    userId: string,
    resource: string,
    recordId: string,
  ): Promise<T | null> {
    if (!this.oracleCXService) {
      return null;
    }
    try {
      return await this.oracleCXService.getById<T>(userId, resource, recordId);
    } catch (error) {
      this.logger.warn(`Oracle CX getById failed: ${error}`);
      return null;
    }
  }

  /**
   * Describe Oracle CX resource schema
   */
  protected async describeOracleCXResource(
    userId: string,
    resource: string,
  ): Promise<any | null> {
    if (!this.oracleCXService) {
      return null;
    }
    try {
      return await this.oracleCXService.describeResource(userId, resource);
    } catch (error) {
      this.logger.warn(`Failed to describe Oracle CX resource ${resource}: ${error}`);
      return null;
    }
  }

  /**
   * Determine the data source for an agent
   * Always uses local database - external CRM data should be synced to local DB
   * This ensures AI Agents analyze the single source of truth in IRIS
   */
  protected async determineDataSource(userId: string): Promise<{
    dataSource: 'local' | 'salesforce' | 'oracle_cx';
    dataSourceLabel: string;
  }> {
    // Always use local database as the single source of truth
    // External CRM integrations (Salesforce, Oracle CX) should sync data TO the local DB
    // AI Agents then analyze the local data for consistent results
    return {
      dataSource: 'local',
      dataSourceLabel: 'IRIS Database',
    };
  }

  // ==================== ABSTRACT METHODS ====================

  /**
   * Main execution logic - MUST be implemented by each agent
   */
  protected abstract executeAgent(context: AgentContext): Promise<void>;

  /**
   * Get the tools available to this agent
   */
  protected abstract getTools(): AgentTool[];

  // ==================== PUBLIC API ====================

  /**
   * Execute the agent with full lifecycle management
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const limits = this.config.limits || DEFAULT_AGENT_LIMITS;
    
    // Check rate limits
    const canExecute = await this.checkRateLimit(context);
    if (!canExecute) {
      return this.createRateLimitedResult(context);
    }

    // Initialize execution state
    this.setExecutionState(context.executionId, {
      llmCallsCount: 0,
      tokensUsed: { input: 0, output: 0, total: 0 },
      insights: [],
      alerts: [],
      actions: [],
      errors: [],
      startTime: Date.now(),
    });
    
    // Set as current execution
    this.currentExecutionId = context.executionId;

    let status: AgentStatus = AgentStatus.RUNNING;

    try {
      this.logger.log(`Starting ${this.agentType} agent execution: ${context.executionId}`);
      
      // Emit start event
      this.eventEmitter.emit('agent.execution.started', {
        agentType: this.agentType,
        executionId: context.executionId,
        context,
      });

      // Execute with timeout
      await this.executeWithTimeout(context, limits.maxExecutionTimeMs);
      
      status = AgentStatus.COMPLETED;
      this.logger.log(`${this.agentType} agent completed: ${context.executionId}`);

    } catch (error: any) {
      status = AgentStatus.FAILED;
      this.addError('EXECUTION_ERROR', error.message, false);
      this.logger.error(`${this.agentType} agent failed: ${error.message}`, error.stack);
    }

    // Build result
    const result = this.buildResult(status);

    // Track execution
    await this.trackExecution(context, result);

    // Emit completion event
    this.eventEmitter.emit('agent.execution.completed', {
      agentType: this.agentType,
      executionId: context.executionId,
      result,
    });

    // Cleanup execution state
    this.setExecutionState(context.executionId, null);

    return result;
  }

  /**
   * Handle an event trigger
   */
  async handleEvent(eventName: string, payload: unknown): Promise<void> {
    this.logger.debug(`${this.agentType} received event: ${eventName}`);
    // Override in subclass to handle specific events
  }

  // ==================== PROTECTED HELPERS ====================

  /**
   * Call LLM with automatic tracking and rate limiting
   */
  protected async callLLM(
    prompt: string,
    systemPrompt: string,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    if (!this.executionState) {
      throw new Error('Agent not in execution context');
    }

    const limits = this.config.limits || DEFAULT_AGENT_LIMITS;
    
    // Check LLM call limit
    if (this.executionState.llmCallsCount >= limits.maxLLMCalls) {
      throw new Error(`LLM call limit exceeded: ${limits.maxLLMCalls}`);
    }

    this.executionState.llmCallsCount++;

    const response = await this.aiSdk.generateChat(
      [{ role: 'user', content: prompt }],
      systemPrompt,
    );

    // Track tokens
    if (response.usage && this.executionState) {
      const usage = response.usage as any;
      this.executionState.tokensUsed.input += usage.promptTokens || usage.input_tokens || 0;
      this.executionState.tokensUsed.output += usage.completionTokens || usage.output_tokens || 0;
      this.executionState.tokensUsed.total = 
        this.executionState.tokensUsed.input + this.executionState.tokensUsed.output;
    }

    return response.text;
  }

  /**
   * Call LLM and parse JSON response
   */
  protected async callLLMForJSON<T>(
    prompt: string,
    systemPrompt: string,
  ): Promise<T> {
    const response = await this.callLLM(prompt, systemPrompt + '\n\nRespond with ONLY valid JSON.');
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse LLM response as JSON');
    }
    
    return JSON.parse(jsonMatch[0]) as T;
  }

  /**
   * Get cached data or compute it
   */
  protected async getCached<T>(
    key: string,
    compute: () => Promise<T>,
    ttlSeconds: number = 3600,
  ): Promise<T> {
    const cacheKey = `agent:${this.agentType}:${key}`;
    
    const cached = await this.cacheService.get<T>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // Capture execution state before async operation to preserve context
    const executionState = this.executionState;
    if (!executionState) {
      throw new Error('Agent not in execution context');
    }

    const result = await compute();
    await this.cacheService.set(cacheKey, result, ttlSeconds);
    return result;
  }

  /**
   * Add an insight to the results
   */
  protected addInsight(insight: Omit<AgentInsight, 'id' | 'createdAt'>): void {
    if (!this.executionState) return;
    
    this.executionState.insights.push({
      ...insight,
      id: generateId(),
      createdAt: new Date(),
    });
  }

  /**
   * Create and persist an alert
   */
  protected async createAlert(
    alert: Omit<AgentAlert, 'id' | 'agentType' | 'status' | 'createdAt'>,
  ): Promise<void> {
    if (!this.executionState) return;

    const limits = this.config.limits || DEFAULT_AGENT_LIMITS;
    if (this.executionState.alerts.length >= limits.maxAlertsPerExecution) {
      this.logger.warn(`Alert limit reached: ${limits.maxAlertsPerExecution}`);
      return;
    }

    const fullAlert: AgentAlert = {
      ...alert,
      id: generateId(),
      agentType: this.agentType,
      status: 'PENDING' as any,
      createdAt: new Date(),
    };

    this.executionState.alerts.push(fullAlert);

    // Persist to database
    await this.prisma.agentAlert.create({
      data: {
        id: fullAlert.id,
        agentType: fullAlert.agentType as any, // Cast to Prisma enum type
        alertType: fullAlert.alertType,
        priority: fullAlert.priority,
        title: fullAlert.title,
        description: fullAlert.description,
        recommendation: fullAlert.recommendation,
        userId: fullAlert.userId,
        entityType: fullAlert.entityType,
        entityId: fullAlert.entityId,
        status: 'PENDING',
        expiresAt: fullAlert.expiresAt,
        suggestedActions: fullAlert.suggestedActions as any,
        metadata: fullAlert.metadata as any,
      },
    });

    // Emit real-time event
    this.eventEmitter.emit('agent.alert.created', fullAlert);
  }

  /**
   * Queue an action for execution
   */
  protected queueAction(
    action: Omit<AgentAction, 'id' | 'status' | 'executedAt' | 'result' | 'error'>,
  ): void {
    if (!this.executionState) return;

    const limits = this.config.limits || DEFAULT_AGENT_LIMITS;
    if (this.executionState.actions.length >= limits.maxActionsPerExecution) {
      this.logger.warn(`Action limit reached: ${limits.maxActionsPerExecution}`);
      return;
    }

    this.executionState.actions.push({
      ...action,
      id: generateId(),
      status: action.requiresApproval ? 'PENDING_APPROVAL' as any : 'APPROVED' as any,
    });
  }

  /**
   * Add an error to the execution
   */
  protected addError(code: string, message: string, recoverable: boolean): void {
    if (!this.executionState) return;
    
    this.executionState.errors.push({
      code,
      message,
      recoverable,
      timestamp: new Date(),
    });
  }

  /**
   * Get execution elapsed time
   */
  protected getElapsedTimeMs(): number {
    if (!this.executionState) return 0;
    return Date.now() - this.executionState.startTime;
  }

  // ==================== PRIVATE HELPERS ====================

  private async executeWithTimeout(
    context: AgentContext,
    timeoutMs: number,
  ): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Agent execution timeout')), timeoutMs);
    });

    await Promise.race([
      this.executeAgent(context),
      timeoutPromise,
    ]);
  }

  private async checkRateLimit(context: AgentContext): Promise<boolean> {
    const limits = this.config.limits || DEFAULT_AGENT_LIMITS;
    const hourKey = `agent:${this.agentType}:ratelimit:hour`;
    const dayKey = `agent:${this.agentType}:ratelimit:day`;

    const hourCount = (await this.cacheService.get<number>(hourKey)) || 0;
    const dayCount = (await this.cacheService.get<number>(dayKey)) || 0;

    if (hourCount >= limits.rateLimitPerHour) {
      this.logger.warn(`Hourly rate limit exceeded for ${this.agentType}`);
      return false;
    }

    if (dayCount >= limits.rateLimitPerDay) {
      this.logger.warn(`Daily rate limit exceeded for ${this.agentType}`);
      return false;
    }

    await this.cacheService.set(hourKey, hourCount + 1, 3600);
    await this.cacheService.set(dayKey, dayCount + 1, 86400);

    return true;
  }

  private createRateLimitedResult(context: AgentContext): AgentResult {
    return {
      success: false,
      status: AgentStatus.RATE_LIMITED,
      executionTimeMs: 0,
      llmCallsCount: 0,
      tokensUsed: { input: 0, output: 0, total: 0 },
      insights: [],
      alerts: [],
      actions: [],
      errors: [{
        code: 'RATE_LIMITED',
        message: 'Agent execution rate limited',
        recoverable: true,
        timestamp: new Date(),
      }],
    };
  }

  private buildResult(status: AgentStatus): AgentResult {
    if (!this.executionState) {
      throw new Error('No execution state');
    }

    return {
      success: status === AgentStatus.COMPLETED,
      status,
      executionTimeMs: Date.now() - this.executionState.startTime,
      llmCallsCount: this.executionState.llmCallsCount,
      tokensUsed: this.executionState.tokensUsed,
      insights: this.executionState.insights,
      alerts: this.executionState.alerts,
      actions: this.executionState.actions,
      errors: this.executionState.errors.length > 0 ? this.executionState.errors : undefined,
    };
  }

  private async trackExecution(context: AgentContext, result: AgentResult): Promise<void> {
    try {
      await this.prisma.agentExecution.create({
        data: {
          id: context.executionId,
          agentType: this.agentType as any, // Cast to Prisma enum type
          triggerType: context.trigger,
          triggerId: context.entityId,
          status: result.status,
          startedAt: context.startedAt,
          completedAt: new Date(),
          alertsCreated: result.alerts.length,
          actionsGenerated: result.actions.length,
          userId: context.userId,
          entityType: context.entityType,
          entityId: context.entityId,
          metadata: {
            llmCalls: result.llmCallsCount,
            tokensUsed: result.tokensUsed,
            insightsCount: result.insights.length,
            errorsCount: result.errors?.length || 0,
          },
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to track execution: ${error.message}`);
    }
  }
}


