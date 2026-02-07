/**
 * Meeting Queue Service - Production-Ready Rate Limiting and Queue Management
 * 
 * This service manages meeting processing queue with:
 * - Rate limiting to prevent API abuse
 * - Priority queue for meeting bot joins
 * - Concurrency control
 * - Dead letter queue for failed jobs
 * - Retry logic with backoff
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

// ==================== INTERFACES ====================

export interface QueueItem {
  id: string;
  type: 'bot_join' | 'transcription' | 'analysis' | 'crm_update';
  meetingId: string;
  priority: 'high' | 'normal' | 'low';
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  keyGenerator: (item: QueueItem) => string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  avgProcessingTime: number;
  throughput: number; // items per minute
}

// ==================== SERVICE ====================

@Injectable()
export class MeetingQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MeetingQueueService.name);
  
  // Queues
  private readonly pendingQueue: Map<string, QueueItem> = new Map();
  private readonly processingQueue: Map<string, QueueItem> = new Map();
  private readonly deadLetterQueue: Map<string, QueueItem> = new Map();
  
  // Rate limiting
  private readonly rateLimitCounters: Map<string, { count: number; resetAt: Date }> = new Map();
  
  // Configuration
  private readonly maxConcurrency: number;
  private readonly maxQueueSize: number;
  private readonly defaultMaxAttempts: number;
  
  // Stats tracking
  private completedCount: number = 0;
  private totalProcessingTime: number = 0;
  private throughputWindow: { timestamp: Date; count: number }[] = [];
  
  // Processing state
  private isProcessing: boolean = false;
  private isShuttingDown: boolean = false;
  private processInterval?: NodeJS.Timeout;

  // Rate limit configs by type
  private readonly rateLimits: Map<string, RateLimitConfig> = new Map([
    ['bot_join', { 
      windowMs: 60000,      // 1 minute window
      maxRequests: 10,       // Max 10 bot joins per minute
      keyGenerator: (item) => `bot_join:global`,
    }],
    ['transcription', { 
      windowMs: 60000,
      maxRequests: 20,
      keyGenerator: (item) => `transcription:global`,
    }],
    ['analysis', { 
      windowMs: 60000,
      maxRequests: 30,
      keyGenerator: (item) => `analysis:global`,
    }],
    ['crm_update', { 
      windowMs: 60000,
      maxRequests: 50,
      keyGenerator: (item) => `crm_update:global`,
    }],
  ]);

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.maxConcurrency = this.configService.get('MEETING_QUEUE_CONCURRENCY', 5);
    this.maxQueueSize = this.configService.get('MEETING_QUEUE_MAX_SIZE', 1000);
    this.defaultMaxAttempts = this.configService.get('MEETING_QUEUE_MAX_ATTEMPTS', 3);
  }

  onModuleInit(): void {
    this.logger.log(`Meeting Queue Service initialized (concurrency: ${this.maxConcurrency})`);
    this.startProcessing();
  }

  onModuleDestroy(): void {
    this.logger.log('Shutting down Meeting Queue Service...');
    this.isShuttingDown = true;
    this.stopProcessing();
  }

  // ==================== PUBLIC API ====================

  /**
   * Add an item to the queue
   */
  async enqueue(
    type: QueueItem['type'],
    meetingId: string,
    payload: Record<string, any>,
    options: {
      priority?: QueueItem['priority'];
      scheduledFor?: Date;
      maxAttempts?: number;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<QueueItem> {
    // Check queue size
    if (this.pendingQueue.size >= this.maxQueueSize) {
      throw new Error('Queue is full. Please try again later.');
    }

    const item: QueueItem = {
      id: this.generateId(),
      type,
      meetingId,
      priority: options.priority || 'normal',
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts || this.defaultMaxAttempts,
      createdAt: new Date(),
      scheduledFor: options.scheduledFor,
      metadata: options.metadata,
    };

    this.pendingQueue.set(item.id, item);
    this.logger.debug(`Enqueued ${type} job ${item.id} for meeting ${meetingId}`);
    
    this.eventEmitter.emit('queue.enqueued', { item });
    return item;
  }

  /**
   * Enqueue a bot join with high priority
   */
  async enqueueBotJoin(meetingId: string, meetingNumber: string, password?: string): Promise<QueueItem> {
    return this.enqueue('bot_join', meetingId, { meetingNumber, password }, { priority: 'high' });
  }

  /**
   * Enqueue transcription processing
   */
  async enqueueTranscription(meetingId: string, audioPath: string): Promise<QueueItem> {
    return this.enqueue('transcription', meetingId, { audioPath }, { priority: 'normal' });
  }

  /**
   * Enqueue AI analysis
   */
  async enqueueAnalysis(meetingId: string): Promise<QueueItem> {
    return this.enqueue('analysis', meetingId, {}, { priority: 'normal' });
  }

  /**
   * Enqueue CRM update
   */
  async enqueueCrmUpdate(meetingId: string, updates: Record<string, any>): Promise<QueueItem> {
    return this.enqueue('crm_update', meetingId, updates, { priority: 'low' });
  }

  /**
   * Get queue item by ID
   */
  getItem(id: string): QueueItem | undefined {
    return this.pendingQueue.get(id) || 
           this.processingQueue.get(id) || 
           this.deadLetterQueue.get(id);
  }

  /**
   * Cancel a pending item
   */
  cancel(id: string): boolean {
    const item = this.pendingQueue.get(id);
    if (item && item.status === 'pending') {
      this.pendingQueue.delete(id);
      this.logger.debug(`Cancelled queue item ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Retry a failed item from dead letter queue
   */
  retry(id: string): boolean {
    const item = this.deadLetterQueue.get(id);
    if (item) {
      item.status = 'pending';
      item.attempts = 0;
      item.error = undefined;
      this.deadLetterQueue.delete(id);
      this.pendingQueue.set(id, item);
      this.logger.log(`Retrying dead letter item ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    // Calculate throughput (items per minute in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentItems = this.throughputWindow.filter(t => t.timestamp > fiveMinutesAgo);
    const throughput = recentItems.reduce((sum, t) => sum + t.count, 0) / 5;

    return {
      pending: this.pendingQueue.size,
      processing: this.processingQueue.size,
      completed: this.completedCount,
      failed: this.deadLetterQueue.size,
      deadLetter: this.deadLetterQueue.size,
      avgProcessingTime: this.completedCount > 0 
        ? Math.round(this.totalProcessingTime / this.completedCount) 
        : 0,
      throughput: Math.round(throughput * 10) / 10,
    };
  }

  /**
   * Get pending items (with optional filtering)
   */
  getPendingItems(filter?: { type?: QueueItem['type']; priority?: QueueItem['priority'] }): QueueItem[] {
    let items = Array.from(this.pendingQueue.values());
    
    if (filter?.type) {
      items = items.filter(i => i.type === filter.type);
    }
    if (filter?.priority) {
      items = items.filter(i => i.priority === filter.priority);
    }
    
    return items.sort((a, b) => {
      // Sort by priority, then by createdAt
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Get dead letter queue items
   */
  getDeadLetterItems(): QueueItem[] {
    return Array.from(this.deadLetterQueue.values());
  }

  // ==================== RATE LIMITING ====================

  /**
   * Check if request is rate limited
   */
  private isRateLimited(item: QueueItem): boolean {
    const config = this.rateLimits.get(item.type);
    if (!config) return false;

    const key = config.keyGenerator(item);
    const counter = this.rateLimitCounters.get(key);
    const now = new Date();

    if (!counter || counter.resetAt < now) {
      // Window expired, reset counter
      this.rateLimitCounters.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + config.windowMs),
      });
      return false;
    }

    if (counter.count >= config.maxRequests) {
      return true;
    }

    counter.count++;
    return false;
  }

  /**
   * Clean up expired rate limit counters
   */
  @Cron(CronExpression.EVERY_MINUTE)
  private cleanupRateLimitCounters(): void {
    const now = new Date();
    for (const [key, counter] of this.rateLimitCounters.entries()) {
      if (counter.resetAt < now) {
        this.rateLimitCounters.delete(key);
      }
    }
  }

  // ==================== QUEUE PROCESSING ====================

  private startProcessing(): void {
    if (this.processInterval) return;
    
    this.processInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.processQueue();
      }
    }, 1000); // Check queue every second
  }

  private stopProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = undefined;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Get available processing slots
      const availableSlots = this.maxConcurrency - this.processingQueue.size;
      if (availableSlots <= 0) return;

      // Get next items to process (sorted by priority and time)
      const pendingItems = this.getPendingItems();
      const itemsToProcess = pendingItems
        .filter(item => !this.isRateLimited(item))
        .filter(item => !item.scheduledFor || item.scheduledFor <= new Date())
        .slice(0, availableSlots);

      // Process items concurrently
      await Promise.all(itemsToProcess.map(item => this.processItem(item)));
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    // Move to processing queue
    this.pendingQueue.delete(item.id);
    item.status = 'processing';
    item.startedAt = new Date();
    item.attempts++;
    this.processingQueue.set(item.id, item);

    try {
      // Emit event for actual processing
      await this.eventEmitter.emitAsync(`queue.process.${item.type}`, {
        item,
        payload: item.payload,
      });

      // Mark as completed
      item.status = 'completed';
      item.completedAt = new Date();
      this.processingQueue.delete(item.id);
      
      // Track stats
      const processingTime = item.completedAt.getTime() - item.startedAt!.getTime();
      this.completedCount++;
      this.totalProcessingTime += processingTime;
      this.trackThroughput();

      this.logger.debug(`Completed ${item.type} job ${item.id} in ${processingTime}ms`);
      this.eventEmitter.emit('queue.completed', { item });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed ${item.type} job ${item.id} (attempt ${item.attempts}): ${errorMessage}`);
      
      item.error = errorMessage;

      if (item.attempts >= item.maxAttempts) {
        // Move to dead letter queue
        item.status = 'failed';
        this.processingQueue.delete(item.id);
        this.deadLetterQueue.set(item.id, item);
        this.logger.error(`Job ${item.id} moved to dead letter queue after ${item.attempts} attempts`);
        this.eventEmitter.emit('queue.deadLetter', { item });
      } else {
        // Retry with exponential backoff
        const backoffMs = Math.pow(2, item.attempts) * 1000;
        item.status = 'pending';
        item.scheduledFor = new Date(Date.now() + backoffMs);
        this.processingQueue.delete(item.id);
        this.pendingQueue.set(item.id, item);
        this.logger.debug(`Job ${item.id} scheduled for retry in ${backoffMs}ms`);
      }

      this.eventEmitter.emit('queue.failed', { item, error: errorMessage });
    }
  }

  private trackThroughput(): void {
    const now = new Date();
    // Find or create entry for current minute
    const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const existing = this.throughputWindow.find(t => t.timestamp.getTime() === currentMinute.getTime());
    
    if (existing) {
      existing.count++;
    } else {
      this.throughputWindow.push({ timestamp: currentMinute, count: 1 });
    }

    // Clean up old entries (keep last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    this.throughputWindow = this.throughputWindow.filter(t => t.timestamp > tenMinutesAgo);
  }

  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle bot join requests from queue
   */
  @OnEvent('queue.process.bot_join')
  private async handleBotJoinJob(event: { item: QueueItem; payload: Record<string, any> }): Promise<void> {
    const { meetingNumber, password } = event.payload;
    // This will be handled by the actual bot service via event listener
    this.eventEmitter.emit('bot.join.request', {
      meetingSessionId: event.item.meetingId,
      meetingNumber,
      password,
      queueItemId: event.item.id,
    });
  }

  @OnEvent('queue.process.transcription')
  private async handleTranscriptionJob(event: { item: QueueItem; payload: Record<string, any> }): Promise<void> {
    const { audioPath } = event.payload;
    this.eventEmitter.emit('transcription.request', {
      meetingSessionId: event.item.meetingId,
      audioPath,
      queueItemId: event.item.id,
    });
  }

  @OnEvent('queue.process.analysis')
  private async handleAnalysisJob(event: { item: QueueItem; payload: Record<string, any> }): Promise<void> {
    this.eventEmitter.emit('analysis.request', {
      meetingSessionId: event.item.meetingId,
      queueItemId: event.item.id,
    });
  }

  @OnEvent('queue.process.crm_update')
  private async handleCrmUpdateJob(event: { item: QueueItem; payload: Record<string, any> }): Promise<void> {
    this.eventEmitter.emit('crm_update.request', {
      meetingSessionId: event.item.meetingId,
      updates: event.payload,
      queueItemId: event.item.id,
    });
  }

  // ==================== CLEANUP ====================

  /**
   * Periodic cleanup of completed items and old stats
   */
  @Cron(CronExpression.EVERY_HOUR)
  private cleanup(): void {
    // Dead letter items older than 24 hours can be removed
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [id, item] of this.deadLetterQueue.entries()) {
      if (item.createdAt < oneDayAgo) {
        this.deadLetterQueue.delete(id);
        this.logger.debug(`Removed old dead letter item ${id}`);
      }
    }

    // Log queue stats
    const stats = this.getStats();
    this.logger.log(`Queue stats: pending=${stats.pending}, processing=${stats.processing}, completed=${stats.completed}, deadLetter=${stats.deadLetter}, throughput=${stats.throughput}/min`);
  }
}
