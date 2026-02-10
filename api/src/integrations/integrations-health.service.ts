import { Injectable, Logger } from '@nestjs/common';
import { ConnectionTestResult } from './base/base-integration.service';

export interface HealthCheckResult {
  provider: string;
  status: 'ok' | 'error' | 'timeout' | 'unconfigured';
  latencyMs: number;
  error?: string;
}

@Injectable()
export class IntegrationsHealthService {
  private readonly logger = new Logger(IntegrationsHealthService.name);
  private readonly TIMEOUT_MS = 5000;

  private serviceMap: Record<string, any> = {};

  /**
   * Register the service map from the controller so health service can iterate.
   */
  setServiceMap(serviceMap: Record<string, any>): void {
    this.serviceMap = serviceMap;
  }

  /**
   * Check health of all registered integrations for a given organization.
   */
  async checkAllIntegrations(organizationId: string): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    const entries = Object.entries(this.serviceMap);
    const checks = entries.map(([provider, service]) =>
      this.checkIntegration(provider, organizationId, service),
    );

    const settled = await Promise.allSettled(checks);
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    return results;
  }

  /**
   * Check health of a single integration provider.
   */
  async checkIntegration(
    provider: string,
    organizationId: string,
    service?: any,
  ): Promise<HealthCheckResult> {
    const svc = service || this.serviceMap[provider];
    if (!svc) {
      return {
        provider,
        status: 'unconfigured',
        latencyMs: 0,
        error: `Unknown provider: ${provider}`,
      };
    }

    if (typeof svc.testConnection !== 'function') {
      return {
        provider,
        status: 'unconfigured',
        latencyMs: 0,
        error: 'Provider does not support testConnection',
      };
    }

    const start = Date.now();
    try {
      const result: ConnectionTestResult = await Promise.race([
        svc.testConnection(organizationId),
        new Promise<ConnectionTestResult>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timed out')), this.TIMEOUT_MS),
        ),
      ]);

      const latencyMs = Date.now() - start;

      return {
        provider,
        status: result.success ? 'ok' : 'error',
        latencyMs,
        error: result.success ? undefined : result.message,
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      const isTimeout = error.message === 'Health check timed out';

      this.logger.warn(
        `Health check failed for ${provider}: ${error.message}`,
      );

      return {
        provider,
        status: isTimeout ? 'timeout' : 'error',
        latencyMs,
        error: error.message,
      };
    }
  }
}
