import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';
import { AzureOpenAIRetryService } from './common/azure-openai-retry.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly retryService: AzureOpenAIRetryService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Health check endpoint for load balancers and monitoring
   * Exempt from rate limiting to ensure availability checks work
   */
  @Get('health')
  @SkipThrottle()
  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    database: boolean;
    uptime: number;
  }> {
    const dbHealthy = await this.prisma.healthCheck();
    return {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      database: dbHealthy,
      uptime: process.uptime(),
    };
  }

  /**
   * Readiness check - indicates if the service is ready to accept traffic
   */
  @Get('ready')
  @SkipThrottle()
  async readinessCheck(): Promise<{ ready: boolean }> {
    const dbHealthy = await this.prisma.healthCheck();
    return { ready: dbHealthy };
  }

  /**
   * AI service health check - monitor circuit breaker and Azure OpenAI status
   * Useful for debugging retry loops and rate limiting issues
   */
  @Get('health/ai')
  @SkipThrottle()
  aiServiceHealth(): {
    circuitBreaker: { state: string; consecutiveFailures: number; consecutiveSuccesses: number };
    status: string;
  } {
    const circuitState = this.retryService.getCircuitState();
    const isHealthy = circuitState.state === 'CLOSED' || circuitState.state === 'HALF_OPEN';
    
    return {
      circuitBreaker: circuitState,
      status: isHealthy ? 'operational' : 'degraded',
    };
  }
}
