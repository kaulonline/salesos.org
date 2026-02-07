import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PQueue from 'p-queue';

/**
 * AI Request Queue Statistics
 */
export interface AiQueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
  totalTokensUsed: number;
  requestsPerMinute: number;
}

/**
 * AI Request Queue Service
 * 
 * Provides concurrency control and rate limiting for AI/LLM requests to:
 * - Prevent overwhelming the AI provider (Claude/OpenAI)
 * - Control costs by limiting concurrent requests
 * - Provide visibility into AI usage
 * - Enable graceful degradation under load
 */
@Injectable()
export class AiQueueService implements OnModuleInit {
  private readonly logger = new Logger(AiQueueService.name);
  private queue: PQueue;
  
  // Statistics tracking
  private completedCount = 0;
  private failedCount = 0;
  private totalProcessingTime = 0;
  private totalTokensUsed = 0;
  private requestTimestamps: Date[] = [];
  
  // Configuration
  private readonly maxConcurrency: number;
  private readonly maxPerMinute: number;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    // Load configuration from environment (parse as integers since env vars are strings)
    this.maxConcurrency = parseInt(this.configService.get<string>('AI_MAX_CONCURRENCY', '5'), 10);
    this.maxPerMinute = parseInt(this.configService.get<string>('AI_MAX_PER_MINUTE', '30'), 10);
    this.timeout = parseInt(this.configService.get<string>('AI_REQUEST_TIMEOUT', '120000'), 10); // 2 minutes default

    // Initialize the queue with concurrency and rate limiting
    this.queue = new PQueue({
      concurrency: this.maxConcurrency,
      intervalCap: this.maxPerMinute,
      interval: 60000, // 1 minute
      timeout: this.timeout,
    });

    // Set up event handlers
    this.queue.on('active', () => {
      this.logger.debug(
        `Queue active. Size: ${this.queue.size}, Pending: ${this.queue.pending}`
      );
    });

    this.queue.on('idle', () => {
      this.logger.debug('Queue is idle');
    });

    // Note: p-queue v6 doesn't have an 'error' event
    // Errors are handled in the individual promise rejections
  }

  onModuleInit() {
    this.logger.log(
      `AI Queue initialized - Max concurrency: ${this.maxConcurrency}, ` +
      `Max per minute: ${this.maxPerMinute}, Timeout: ${this.timeout}ms`
    );
  }

  /**
   * Add a request to the queue
   * @param fn The async function to execute
   * @param priority Optional priority (lower = higher priority)
   * @returns Promise that resolves with the result
   */
  async enqueue<T>(
    fn: () => Promise<T>,
    options?: { priority?: number; signal?: AbortSignal }
  ): Promise<T> {
    const startTime = Date.now();
    this.requestTimestamps.push(new Date());
    
    // Clean up old timestamps (keep last minute only)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);

    try {
      const result = await this.queue.add(fn, {
        priority: options?.priority,
        signal: options?.signal,
      });
      
      const processingTime = Date.now() - startTime;
      this.totalProcessingTime += processingTime;
      this.completedCount++;
      
      this.logger.debug(`AI request completed in ${processingTime}ms`);
      
      return result as T;
    } catch (error) {
      this.failedCount++;
      
      if (error.name === 'TimeoutError') {
        this.logger.warn(`AI request timed out after ${this.timeout}ms`);
        throw new Error('AI request timed out. Please try again.');
      }
      
      throw error;
    }
  }

  /**
   * Add token usage to statistics
   * @param tokens Number of tokens used
   */
  trackTokenUsage(tokens: number): void {
    this.totalTokensUsed += tokens;
  }

  /**
   * Get queue statistics
   */
  getStats(): AiQueueStats {
    const avgProcessingTime = this.completedCount > 0
      ? this.totalProcessingTime / this.completedCount
      : 0;

    return {
      pending: this.queue.pending,
      active: this.queue.size - this.queue.pending,
      completed: this.completedCount,
      failed: this.failedCount,
      avgProcessingTime: Math.round(avgProcessingTime),
      totalTokensUsed: this.totalTokensUsed,
      requestsPerMinute: this.requestTimestamps.length,
    };
  }

  /**
   * Check if the queue is at capacity
   */
  isAtCapacity(): boolean {
    return this.queue.size >= this.maxConcurrency * 2; // Buffer of 2x concurrency
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Pause the queue (for maintenance or emergencies)
   */
  pause(): void {
    this.queue.pause();
    this.logger.warn('AI queue paused');
  }

  /**
   * Resume the queue
   */
  resume(): void {
    this.queue.start();
    this.logger.log('AI queue resumed');
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.queue.clear();
    this.logger.warn('AI queue cleared');
  }

  /**
   * Wait for all requests to complete
   */
  async drain(): Promise<void> {
    await this.queue.onIdle();
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.completedCount = 0;
    this.failedCount = 0;
    this.totalProcessingTime = 0;
    this.totalTokensUsed = 0;
    this.requestTimestamps = [];
    this.logger.log('AI queue statistics reset');
  }
}

