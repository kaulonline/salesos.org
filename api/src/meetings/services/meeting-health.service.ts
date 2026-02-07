import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ZoomBotService } from './zoom-bot.service';
import { PrismaService } from '../../database/prisma.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  checks: HealthCheck[];
  metrics: HealthMetrics;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration?: number;
  lastChecked: Date;
}

export interface HealthMetrics {
  activeBots: number;
  totalMeetingsToday: number;
  successfulTranscriptions: number;
  failedTranscriptions: number;
  averageTranscriptionTime: number;
  totalAudioProcessed: number; // in seconds
  queuedMeetings: number;
  errorRate: number;
}

interface MetricWindow {
  timestamp: Date;
  success: boolean;
  duration?: number;
  audioSeconds?: number;
}

@Injectable()
export class MeetingHealthService implements OnModuleInit {
  private readonly logger = new Logger(MeetingHealthService.name);
  private startTime: Date;
  private metricsWindow: MetricWindow[] = [];
  private readonly METRICS_WINDOW_HOURS = 24;

  constructor(
    private readonly zoomBotService: ZoomBotService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.startTime = new Date();
  }

  onModuleInit() {
    this.logger.log('Meeting Health Service initialized');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Track transcription results
    this.eventEmitter.on('transcription.completed', (data: { meetingId: string; duration: number; audioSeconds: number }) => {
      this.recordMetric({ success: true, duration: data.duration, audioSeconds: data.audioSeconds });
    });

    this.eventEmitter.on('transcription.failed', (data: { meetingId: string; error: string }) => {
      this.recordMetric({ success: false });
      this.logger.warn(`Transcription failed for meeting ${data.meetingId}: ${data.error}`);
    });

    // Track bot events
    this.eventEmitter.on('bot.error', (data: { meetingId: string; error: string }) => {
      this.logger.error(`Bot error for meeting ${data.meetingId}: ${data.error}`);
    });
  }

  private recordMetric(data: Omit<MetricWindow, 'timestamp'>): void {
    this.metricsWindow.push({
      timestamp: new Date(),
      ...data,
    });
    this.cleanOldMetrics();
  }

  private cleanOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.METRICS_WINDOW_HOURS * 60 * 60 * 1000);
    this.metricsWindow = this.metricsWindow.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks = await this.runHealthChecks();
    const metrics = await this.calculateMetrics();
    
    // Determine overall status
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warnChecks = checks.filter(c => c.status === 'warn').length;
    
    let status: HealthStatus['status'] = 'healthy';
    if (failedChecks > 0) {
      status = 'unhealthy';
    } else if (warnChecks > 0) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      checks,
      metrics,
    };
  }

  /**
   * Run all health checks
   */
  private async runHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // 1. Database connectivity check
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);

    // 2. Zoom Bot service check
    const botCheck = await this.checkZoomBotService();
    checks.push(botCheck);

    // 3. Active bots health check
    const activeBotsCheck = await this.checkActiveBots();
    checks.push(activeBotsCheck);

    // 4. Error rate check
    const errorRateCheck = this.checkErrorRate();
    checks.push(errorRateCheck);

    // 5. Queue depth check
    const queueCheck = await this.checkQueueDepth();
    checks.push(queueCheck);

    return checks;
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        name: 'database',
        status: 'pass',
        message: 'Database connection healthy',
        duration: Date.now() - start,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'fail',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start,
        lastChecked: new Date(),
      };
    }
  }

  private async checkZoomBotService(): Promise<HealthCheck> {
    try {
      const activeBots = this.zoomBotService.getActiveBots();
      return {
        name: 'zoom_bot_service',
        status: 'pass',
        message: `Zoom Bot Service running with ${activeBots.length} active bots`,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'zoom_bot_service',
        status: 'fail',
        message: `Zoom Bot Service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
      };
    }
  }

  private async checkActiveBots(): Promise<HealthCheck> {
    try {
      const activeBots = this.zoomBotService.getActiveBots();
      const unhealthyBots = activeBots.filter(b => b.status === 'error');
      
      if (unhealthyBots.length === 0) {
        return {
          name: 'active_bots',
          status: 'pass',
          message: `All ${activeBots.length} active bots are healthy`,
          lastChecked: new Date(),
        };
      } else if (unhealthyBots.length < activeBots.length / 2) {
        return {
          name: 'active_bots',
          status: 'warn',
          message: `${unhealthyBots.length}/${activeBots.length} bots in error state`,
          lastChecked: new Date(),
        };
      } else {
        return {
          name: 'active_bots',
          status: 'fail',
          message: `${unhealthyBots.length}/${activeBots.length} bots in error state`,
          lastChecked: new Date(),
        };
      }
    } catch (error) {
      return {
        name: 'active_bots',
        status: 'fail',
        message: `Failed to check active bots: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
      };
    }
  }

  private checkErrorRate(): HealthCheck {
    const totalMetrics = this.metricsWindow.length;
    if (totalMetrics === 0) {
      return {
        name: 'error_rate',
        status: 'pass',
        message: 'No transcriptions recorded yet',
        lastChecked: new Date(),
      };
    }

    const failures = this.metricsWindow.filter(m => !m.success).length;
    const errorRate = failures / totalMetrics;

    if (errorRate < 0.05) {
      return {
        name: 'error_rate',
        status: 'pass',
        message: `Error rate: ${(errorRate * 100).toFixed(2)}%`,
        lastChecked: new Date(),
      };
    } else if (errorRate < 0.15) {
      return {
        name: 'error_rate',
        status: 'warn',
        message: `Error rate elevated: ${(errorRate * 100).toFixed(2)}%`,
        lastChecked: new Date(),
      };
    } else {
      return {
        name: 'error_rate',
        status: 'fail',
        message: `Error rate critical: ${(errorRate * 100).toFixed(2)}%`,
        lastChecked: new Date(),
      };
    }
  }

  private async checkQueueDepth(): Promise<HealthCheck> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const pendingMeetings = await this.prisma.meetingSession.count({
        where: {
          status: 'SCHEDULED',
          scheduledStart: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (pendingMeetings < 50) {
        return {
          name: 'queue_depth',
          status: 'pass',
          message: `${pendingMeetings} meetings scheduled today`,
          lastChecked: new Date(),
        };
      } else if (pendingMeetings < 100) {
        return {
          name: 'queue_depth',
          status: 'warn',
          message: `High queue: ${pendingMeetings} meetings scheduled today`,
          lastChecked: new Date(),
        };
      } else {
        return {
          name: 'queue_depth',
          status: 'fail',
          message: `Queue overload: ${pendingMeetings} meetings scheduled today`,
          lastChecked: new Date(),
        };
      }
    } catch (error) {
      return {
        name: 'queue_depth',
        status: 'warn',
        message: `Could not check queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Calculate metrics from the metrics window and database
   */
  private async calculateMetrics(): Promise<HealthMetrics> {
    const activeBots = this.zoomBotService.getActiveBots().length;
    
    // Calculate from metrics window
    const successes = this.metricsWindow.filter(m => m.success);
    const failures = this.metricsWindow.filter(m => !m.success);
    const totalAudio = successes.reduce((sum, m) => sum + (m.audioSeconds || 0), 0);
    const avgTranscriptionTime = successes.length > 0
      ? successes.reduce((sum, m) => sum + (m.duration || 0), 0) / successes.length
      : 0;
    const errorRate = this.metricsWindow.length > 0
      ? failures.length / this.metricsWindow.length
      : 0;

    // Get database counts
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let totalMeetingsToday = 0;
    let queuedMeetings = 0;

    try {
      totalMeetingsToday = await this.prisma.meetingSession.count({
        where: {
          createdAt: {
            gte: startOfDay,
          },
        },
      });

      queuedMeetings = await this.prisma.meetingSession.count({
        where: {
          status: 'SCHEDULED',
          scheduledStart: {
            gte: new Date(),
          },
        },
      });
    } catch (error) {
      this.logger.warn('Failed to query database for metrics', error);
    }

    return {
      activeBots,
      totalMeetingsToday,
      successfulTranscriptions: successes.length,
      failedTranscriptions: failures.length,
      averageTranscriptionTime: Math.round(avgTranscriptionTime),
      totalAudioProcessed: Math.round(totalAudio),
      queuedMeetings,
      errorRate: Number(errorRate.toFixed(4)),
    };
  }

  /**
   * Periodic health check logging
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async logHealthStatus(): Promise<void> {
    const health = await this.getHealthStatus();
    
    if (health.status === 'unhealthy') {
      this.logger.error('Meeting service UNHEALTHY', {
        checks: health.checks.filter(c => c.status === 'fail'),
        metrics: health.metrics,
      });
      this.eventEmitter.emit('health.unhealthy', health);
    } else if (health.status === 'degraded') {
      this.logger.warn('Meeting service DEGRADED', {
        checks: health.checks.filter(c => c.status === 'warn'),
        metrics: health.metrics,
      });
      this.eventEmitter.emit('health.degraded', health);
    } else {
      this.logger.debug('Meeting service healthy', {
        activeBots: health.metrics.activeBots,
        errorRate: `${(health.metrics.errorRate * 100).toFixed(2)}%`,
      });
    }
  }

  /**
   * Get detailed bot status for monitoring dashboard
   */
  async getBotDetailedStatus(): Promise<{
    summary: {
      total: number;
      byStatus: Record<string, number>;
    };
    bots: Array<{
      meetingId: string;
      status: string;
      startedAt: Date;
      duration: number;
      lastActivity?: Date;
    }>;
  }> {
    const activeBots = this.zoomBotService.getActiveBots();
    
    const byStatus: Record<string, number> = {};
    activeBots.forEach(bot => {
      byStatus[bot.status] = (byStatus[bot.status] || 0) + 1;
    });

    return {
      summary: {
        total: activeBots.length,
        byStatus,
      },
      bots: activeBots.map(bot => ({
        meetingId: bot.meetingSessionId,
        status: bot.status,
        startedAt: bot.startTime || new Date(),
        duration: bot.startTime ? Math.floor((Date.now() - bot.startTime.getTime()) / 1000) : 0,
        lastActivity: bot.lastHealthCheck,
      })),
    };
  }

  /**
   * Get transcription statistics
   */
  getTranscriptionStats(): {
    last24Hours: {
      total: number;
      successful: number;
      failed: number;
      avgDuration: number;
      totalAudioSeconds: number;
    };
    errorBreakdown: Record<string, number>;
  } {
    const successes = this.metricsWindow.filter(m => m.success);
    const failures = this.metricsWindow.filter(m => !m.success);
    
    const avgDuration = successes.length > 0
      ? successes.reduce((sum, m) => sum + (m.duration || 0), 0) / successes.length
      : 0;

    const totalAudio = successes.reduce((sum, m) => sum + (m.audioSeconds || 0), 0);

    return {
      last24Hours: {
        total: this.metricsWindow.length,
        successful: successes.length,
        failed: failures.length,
        avgDuration: Math.round(avgDuration),
        totalAudioSeconds: Math.round(totalAudio),
      },
      errorBreakdown: {}, // Would be populated from error tracking
    };
  }
}
