/**
 * Meeting Lifecycle Manager - Graceful Shutdown and Initialization
 * 
 * This service coordinates the lifecycle of all meeting-related services,
 * ensuring proper initialization order and graceful shutdown with
 * cleanup of active resources.
 */

import { 
  Injectable, 
  Logger, 
  OnModuleInit, 
  OnModuleDestroy, 
  OnApplicationShutdown 
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ZoomBotService } from './zoom-bot.service';
import { MeetingQueueService } from './meeting-queue.service';
import { MeetingWebSocketGateway } from '../gateways/meeting-websocket.gateway';

interface ShutdownState {
  phase: 'running' | 'draining' | 'cleanup' | 'stopped';
  startedAt?: Date;
  completedAt?: Date;
  errors: string[];
}

@Injectable()
export class MeetingLifecycleService implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(MeetingLifecycleService.name);
  private shutdownState: ShutdownState = { phase: 'running', errors: [] };
  private readonly shutdownTimeout = 30000; // 30 seconds max shutdown time
  private isInitialized = false;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly zoomBotService: ZoomBotService,
    private readonly queueService: MeetingQueueService,
    private readonly websocketGateway: MeetingWebSocketGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Meeting Lifecycle Manager initializing...');
    
    try {
      // Subscribe to process signals for graceful shutdown
      this.setupSignalHandlers();
      
      // Emit initialization event
      this.eventEmitter.emit('meeting.lifecycle.init', { timestamp: new Date() });
      
      this.isInitialized = true;
      this.logger.log('Meeting Lifecycle Manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Meeting Lifecycle Manager', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.performGracefulShutdown('module_destroy');
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    await this.performGracefulShutdown(signal || 'unknown');
  }

  private setupSignalHandlers(): void {
    // These are backup handlers in case NestJS doesn't catch them
    const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'];
    
    for (const signal of signals) {
      process.on(signal, async () => {
        this.logger.warn(`Received ${signal}, initiating graceful shutdown...`);
        await this.performGracefulShutdown(signal);
      });
    }

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception in meeting service', error);
      this.eventEmitter.emit('meeting.lifecycle.error', { type: 'uncaughtException', error });
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection in meeting service', reason);
      this.eventEmitter.emit('meeting.lifecycle.error', { type: 'unhandledRejection', reason });
    });
  }

  /**
   * Perform graceful shutdown with proper cleanup
   */
  private async performGracefulShutdown(trigger: string): Promise<void> {
    if (this.shutdownState.phase !== 'running') {
      this.logger.warn('Shutdown already in progress, skipping...');
      return;
    }

    this.shutdownState = {
      phase: 'draining',
      startedAt: new Date(),
      errors: [],
    };

    this.logger.log(`Starting graceful shutdown (trigger: ${trigger})`);
    this.eventEmitter.emit('meeting.lifecycle.shutdown.start', { trigger });

    try {
      // Create shutdown timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Shutdown timeout')), this.shutdownTimeout);
      });

      // Perform shutdown steps with timeout
      await Promise.race([
        this.executeShutdownSteps(),
        timeoutPromise,
      ]);

      this.shutdownState.phase = 'stopped';
      this.shutdownState.completedAt = new Date();
      
      const duration = this.shutdownState.completedAt.getTime() - this.shutdownState.startedAt!.getTime();
      this.logger.log(`Graceful shutdown completed in ${duration}ms`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.shutdownState.errors.push(errorMessage);
      this.logger.error(`Shutdown error: ${errorMessage}`);
      
      // Force cleanup on timeout
      if (errorMessage === 'Shutdown timeout') {
        this.logger.warn('Forcing cleanup due to timeout...');
        await this.forceCleanup();
      }
    }

    this.eventEmitter.emit('meeting.lifecycle.shutdown.complete', {
      trigger,
      duration: this.shutdownState.completedAt 
        ? this.shutdownState.completedAt.getTime() - this.shutdownState.startedAt!.getTime()
        : null,
      errors: this.shutdownState.errors,
    });
  }

  /**
   * Execute shutdown steps in order
   */
  private async executeShutdownSteps(): Promise<void> {
    // Step 1: Stop accepting new requests
    this.logger.log('Step 1/5: Stopping new request acceptance...');
    this.eventEmitter.emit('meeting.lifecycle.shutdown.phase', { phase: 'stop_new_requests' });
    // The queue service handles this internally via isShuttingDown flag

    // Step 2: Notify connected WebSocket clients
    this.logger.log('Step 2/5: Notifying WebSocket clients...');
    try {
      await this.notifyWebSocketClients();
    } catch (error) {
      this.logger.warn('Error notifying WebSocket clients', error);
      this.shutdownState.errors.push(`WebSocket notification: ${error}`);
    }

    // Step 3: Drain the queue (wait for in-progress items)
    this.logger.log('Step 3/5: Draining processing queue...');
    this.shutdownState.phase = 'draining';
    try {
      await this.drainQueue();
    } catch (error) {
      this.logger.warn('Error draining queue', error);
      this.shutdownState.errors.push(`Queue drain: ${error}`);
    }

    // Step 4: Stop all active bots
    this.logger.log('Step 4/5: Stopping active meeting bots...');
    this.shutdownState.phase = 'cleanup';
    try {
      await this.stopAllBots();
    } catch (error) {
      this.logger.warn('Error stopping bots', error);
      this.shutdownState.errors.push(`Bot stop: ${error}`);
    }

    // Step 5: Final cleanup
    this.logger.log('Step 5/5: Final resource cleanup...');
    try {
      await this.finalCleanup();
    } catch (error) {
      this.logger.warn('Error in final cleanup', error);
      this.shutdownState.errors.push(`Final cleanup: ${error}`);
    }
  }

  /**
   * Notify all connected WebSocket clients about shutdown
   */
  private async notifyWebSocketClients(): Promise<void> {
    this.websocketGateway.broadcastToMeeting('all', 'meeting-status', {
      type: 'shutdown',
      message: 'Server is shutting down. Please reconnect shortly.',
      timestamp: new Date().toISOString(),
    });

    // Give clients time to receive the message
    await this.sleep(1000);
  }

  /**
   * Drain the processing queue
   */
  private async drainQueue(): Promise<void> {
    const maxWaitTime = 15000; // 15 seconds max for queue drain
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const stats = this.queueService.getStats();
      
      if (stats.processing === 0) {
        this.logger.log(`Queue drained: ${stats.pending} pending items preserved`);
        return;
      }
      
      this.logger.debug(`Waiting for ${stats.processing} processing items...`);
      await this.sleep(1000);
    }
    
    const finalStats = this.queueService.getStats();
    this.logger.warn(`Queue drain timeout. ${finalStats.processing} items still processing.`);
  }

  /**
   * Stop all active meeting bots
   */
  private async stopAllBots(): Promise<void> {
    const activeBots = this.zoomBotService.getActiveBots();
    
    if (activeBots.length === 0) {
      this.logger.log('No active bots to stop');
      return;
    }

    this.logger.log(`Stopping ${activeBots.length} active bots...`);
    
    // Stop all bots in parallel
    const stopPromises = activeBots.map(async (bot) => {
      try {
        await this.zoomBotService.stopBot(bot.id);
        this.logger.debug(`Stopped bot for meeting ${bot.meetingSessionId}`);
      } catch (error) {
        this.logger.warn(`Failed to stop bot ${bot.id}: ${error}`);
      }
    });

    await Promise.allSettled(stopPromises);
    this.logger.log('All bots stop commands issued');
  }

  /**
   * Final cleanup of resources
   */
  private async finalCleanup(): Promise<void> {
    // Clean up any temporary files
    this.eventEmitter.emit('meeting.lifecycle.cleanup', { phase: 'final' });
    
    // Wait a moment for cleanup handlers
    await this.sleep(500);
  }

  /**
   * Force cleanup when graceful shutdown fails
   */
  private async forceCleanup(): Promise<void> {
    this.logger.warn('Forcing cleanup...');
    
    try {
      // Force stop all bots without waiting
      const activeBots = this.zoomBotService.getActiveBots();
      for (const bot of activeBots) {
        try {
          // Force kill the process
          if (bot.process && !bot.process.killed) {
            bot.process.kill('SIGKILL');
          }
        } catch (e) {
          // Ignore errors during force cleanup
        }
      }
    } catch (error) {
      this.logger.error('Error during force cleanup', error);
    }
    
    this.shutdownState.phase = 'stopped';
    this.shutdownState.completedAt = new Date();
  }

  /**
   * Get current shutdown state
   */
  getShutdownState(): ShutdownState {
    return { ...this.shutdownState };
  }

  /**
   * Check if system is in shutdown mode
   */
  isShuttingDown(): boolean {
    return this.shutdownState.phase !== 'running';
  }

  /**
   * Helper sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
