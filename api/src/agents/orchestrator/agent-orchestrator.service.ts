/**
 * IRIS Agent Framework - Agent Orchestrator
 * 
 * Central orchestration service that manages:
 * - Agent registration and discovery
 * - Priority-based job queue
 * - Scheduled execution via cron
 * - Event-driven triggering
 * - Concurrent execution management
 * - Health monitoring
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../cache/cache.service';
import {
  AgentType,
  AgentContext,
  AgentResult,
  AgentConfig,
  AgentTrigger,
  RegisteredAgent,
  Priority,
  generateId,
} from '../types';
import { BaseAgentService } from '../base/base-agent.service';

/**
 * Job in the execution queue
 */
interface AgentJob {
  id: string;
  agentType: AgentType;
  context: AgentContext;
  priority: number; // Lower = higher priority (0 = URGENT)
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * Orchestrator configuration
 */
interface OrchestratorConfig {
  maxConcurrentAgents: number;
  jobTimeoutMs: number;
  healthCheckIntervalMs: number;
  enableScheduledAgents: boolean;
  enableEventAgents: boolean;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrentAgents: 4, // Conservative to prevent resource contention with chat
  jobTimeoutMs: 180000, // 3 minutes - increased for complex agent tasks
  healthCheckIntervalMs: 60000, // 1 minute
  enableScheduledAgents: true, // ENABLED with safeguards
  enableEventAgents: true,
};

@Injectable()
export class AgentOrchestratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  
  // Registry of all agents
  private readonly registry = new Map<AgentType, RegisteredAgent>();
  
  // Job queue (priority queue)
  private jobQueue: AgentJob[] = [];
  
  // Currently running jobs
  private runningJobs = new Map<string, AgentJob>();
  
  // Configuration
  private config: OrchestratorConfig = DEFAULT_CONFIG;
  
  // Processing state
  private isProcessing = false;
  private isShuttingDown = false;
  
  // Debouncing: Track last trigger time per agent type
  private lastTriggerTime = new Map<AgentType, number>();
  private readonly DEBOUNCE_MS = 30000; // 30 seconds between same agent triggers

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Agent Orchestrator initializing...');
    await this.loadConfiguration();
    this.startProcessing();
    this.logger.log(`Agent Orchestrator ready. Registered agents: ${this.registry.size}`);
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Agent Orchestrator shutting down...');
    this.isShuttingDown = true;
    
    // Wait for running jobs to complete (with timeout)
    const timeout = setTimeout(() => {
      this.logger.warn('Shutdown timeout - forcing stop');
    }, 30000);

    while (this.runningJobs.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    clearTimeout(timeout);
    this.logger.log('Agent Orchestrator shutdown complete');
  }

  // ==================== PUBLIC API ====================

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(
    agentType: AgentType,
    agentInstance: BaseAgentService,
    config: AgentConfig,
  ): void {
    if (this.registry.has(agentType)) {
      this.logger.warn(`Agent ${agentType} already registered, replacing...`);
    }

    this.registry.set(agentType, {
      type: agentType,
      config,
      instance: agentInstance,
      registeredAt: new Date(),
      executionCount: 0,
      errorCount: 0,
    });

    this.logger.log(`Registered agent: ${agentType} (${config.name})`);
  }

  /**
   * Trigger an agent execution
   */
  async triggerAgent(
    agentType: AgentType,
    trigger: AgentTrigger,
    options?: {
      entityType?: string;
      entityId?: string;
      userId?: string;
      priority?: Priority;
      metadata?: Record<string, unknown>;
    },
  ): Promise<string> {
    const registered = this.registry.get(agentType);
    if (!registered) {
      throw new Error(`Agent ${agentType} not registered`);
    }

    if (!registered.config.enabled) {
      throw new Error(`Agent ${agentType} is disabled`);
    }
    
    // DEBOUNCING: Prevent rapid re-triggering of same agent (unless URGENT)
    if (trigger !== AgentTrigger.USER_REQUEST && options?.priority !== Priority.URGENT) {
      const lastTrigger = this.lastTriggerTime.get(agentType) || 0;
      const timeSinceLastTrigger = Date.now() - lastTrigger;
      
      if (timeSinceLastTrigger < this.DEBOUNCE_MS) {
        this.logger.debug(
          `Agent ${agentType} debounced (${Math.round(timeSinceLastTrigger / 1000)}s since last trigger)`
        );
        // Return a placeholder execution ID instead of throwing
        return `debounced-${Date.now()}-${agentType}`;
      }
      
      this.lastTriggerTime.set(agentType, Date.now());
    }

    const executionId = generateId();
    const context: AgentContext = {
      executionId,
      trigger,
      entityType: options?.entityType as any,
      entityId: options?.entityId,
      userId: options?.userId,
      metadata: options?.metadata,
      startedAt: new Date(),
      timeoutMs: registered.config.limits.maxExecutionTimeMs,
    };

    const job: AgentJob = {
      id: executionId,
      agentType,
      context,
      priority: this.priorityToNumber(options?.priority || Priority.MEDIUM),
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 2,
    };

    this.enqueueJob(job);
    this.logger.log(`Queued ${agentType} job: ${executionId}`);

    return executionId;
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentType: AgentType): RegisteredAgent | undefined {
    return this.registry.get(agentType);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): RegisteredAgent[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queuedJobs: number;
    runningJobs: number;
    jobsByAgent: Record<string, number>;
  } {
    const jobsByAgent: Record<string, number> = {};
    
    for (const job of this.jobQueue) {
      jobsByAgent[job.agentType] = (jobsByAgent[job.agentType] || 0) + 1;
    }

    return {
      queuedJobs: this.jobQueue.length,
      runningJobs: this.runningJobs.size,
      jobsByAgent,
    };
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle CRM entity events
   */
  @OnEvent('crm.**')
  async handleCRMEvent(payload: { event: string; entityType: string; entityId: string; userId?: string }): Promise<void> {
    if (!this.config.enableEventAgents) return;
    
    // THROTTLING: Skip event-based triggers if queue is heavily loaded
    // This prevents agents from interfering with user-facing operations like chat
    const queueLoad = this.jobQueue.length + this.runningJobs.size;
    if (queueLoad > 10) {
      this.logger.debug(`Skipping event-based agent triggers due to high queue load (${queueLoad} jobs)`);
      return;
    }

    for (const [agentType, registered] of this.registry) {
      if (!registered.config.enabled) continue;
      
      const triggers = registered.config.eventTriggers || [];
      const matchingTrigger = triggers.find(t => 
        payload.event.match(new RegExp(t.eventName.replace('*', '.*')))
      );

      if (matchingTrigger) {
        // Lower priority for event-triggered agents to avoid blocking chat
        await this.triggerAgent(agentType, AgentTrigger.EVENT, {
          entityType: payload.entityType,
          entityId: payload.entityId,
          userId: payload.userId,
          priority: Priority.LOW, // Force low priority for event triggers
          metadata: { sourceEvent: payload.event },
        });
      }
    }
  }

  // ==================== SCHEDULED EXECUTION ====================

  /**
   * Process scheduled agents every minute
   * Safeguards: Skip if queue is loaded or during peak hours
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledAgents(): Promise<void> {
    if (!this.config.enableScheduledAgents || this.isShuttingDown) return;

    // SAFEGUARD: Don't schedule agents if queue is already loaded
    const queueLoad = this.jobQueue.length + this.runningJobs.size;
    if (queueLoad > 5) {
      this.logger.debug(`Skipping scheduled agents due to queue load (${queueLoad} jobs)`);
      return;
    }

    for (const [agentType, registered] of this.registry) {
      if (!registered.config.enabled || !registered.config.schedule?.enabled) continue;

      // Check if it's time to run based on cron
      if (this.shouldRunScheduledAgent(registered)) {
        await this.triggerAgent(agentType, AgentTrigger.SCHEDULED, {
          priority: Priority.LOW,
        });
      }
    }
  }

  /**
   * Health check every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async healthCheck(): Promise<void> {
    const status = this.getQueueStatus();
    
    this.logger.log(
      `Health: ${this.registry.size} agents, ${status.queuedJobs} queued, ${status.runningJobs} running`
    );

    // Check for stuck jobs
    const now = Date.now();
    for (const [jobId, job] of this.runningJobs) {
      const runningTime = now - job.createdAt.getTime();
      if (runningTime > this.config.jobTimeoutMs) {
        this.logger.warn(`Job ${jobId} appears stuck (${runningTime}ms)`);
      }
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async loadConfiguration(): Promise<void> {
    try {
      const configRecord = await this.prisma.systemConfig.findUnique({
        where: { key: 'agent_orchestrator_config' },
      });
      
      if (configRecord) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configRecord.value) };
      }
    } catch (error) {
      this.logger.warn('Failed to load orchestrator config, using defaults');
    }
  }

  private enqueueJob(job: AgentJob): void {
    // Insert in priority order
    const insertIndex = this.jobQueue.findIndex(j => j.priority > job.priority);
    if (insertIndex === -1) {
      this.jobQueue.push(job);
    } else {
      this.jobQueue.splice(insertIndex, 0, job);
    }

    // Emit event
    this.eventEmitter.emit('agent.job.queued', { jobId: job.id, agentType: job.agentType });
  }

  private startProcessing(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (!this.isShuttingDown) {
      // Check if we can run more jobs
      if (this.runningJobs.size < this.config.maxConcurrentAgents && this.jobQueue.length > 0) {
        const job = this.jobQueue.shift()!;
        this.executeJob(job); // Don't await - run concurrently
      }

      // Small delay to prevent tight loop
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async executeJob(job: AgentJob): Promise<void> {
    const registered = this.registry.get(job.agentType);
    if (!registered) {
      this.logger.error(`Agent ${job.agentType} not found for job ${job.id}`);
      return;
    }

    this.runningJobs.set(job.id, job);

    try {
      const agent = registered.instance as BaseAgentService;
      const result = await agent.execute(job.context);

      // Update registry stats
      registered.lastExecutedAt = new Date();
      registered.executionCount++;
      if (!result.success) {
        registered.errorCount++;
      }

      this.logger.log(
        `Job ${job.id} completed: ${result.success ? 'SUCCESS' : 'FAILED'} ` +
        `(${result.executionTimeMs}ms, ${result.llmCallsCount} LLM calls)`
      );

    } catch (error: any) {
      registered.errorCount++;
      this.logger.error(`Job ${job.id} error: ${error.message}`);

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.priority = Math.max(0, job.priority - 1); // Increase priority on retry
        this.enqueueJob(job);
        this.logger.log(`Job ${job.id} queued for retry (${job.retryCount}/${job.maxRetries})`);
      }
    } finally {
      this.runningJobs.delete(job.id);
    }
  }

  private shouldRunScheduledAgent(registered: RegisteredAgent): boolean {
    if (!registered.config.schedule?.cron) return false;
    
    // Simple minute-based check (for more complex cron, use cron-parser library)
    const lastRun = registered.lastExecutedAt?.getTime() || 0;
    const minInterval = 60000; // At least 1 minute between runs
    
    return Date.now() - lastRun >= minInterval;
  }

  private priorityToNumber(priority: Priority): number {
    switch (priority) {
      case Priority.URGENT: return 0;
      case Priority.HIGH: return 1;
      case Priority.MEDIUM: return 2;
      case Priority.LOW: return 3;
      default: return 2;
    }
  }
}












