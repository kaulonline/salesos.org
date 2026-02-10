import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsHealthService } from './integrations-health.service';

describe('IntegrationsHealthService', () => {
  let service: IntegrationsHealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntegrationsHealthService],
    }).compile();

    service = module.get<IntegrationsHealthService>(IntegrationsHealthService);
  });

  describe('checkIntegration', () => {
    it('should return ok when testConnection succeeds', async () => {
      const mockService = {
        testConnection: jest.fn().mockResolvedValue({ success: true, message: 'Connected' }),
      };

      const result = await service.checkIntegration('slack', 'org-1', mockService);

      expect(result.provider).toBe('slack');
      expect(result.status).toBe('ok');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return error when testConnection returns failure', async () => {
      const mockService = {
        testConnection: jest.fn().mockResolvedValue({ success: false, message: 'Invalid API key' }),
      };

      const result = await service.checkIntegration('slack', 'org-1', mockService);

      expect(result.status).toBe('error');
      expect(result.error).toBe('Invalid API key');
    });

    it('should return error when testConnection throws', async () => {
      const mockService = {
        testConnection: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      const result = await service.checkIntegration('slack', 'org-1', mockService);

      expect(result.status).toBe('error');
      expect(result.error).toBe('Network error');
    });

    it('should return timeout when testConnection takes too long', async () => {
      const mockService = {
        testConnection: jest.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ success: true, message: 'ok' }), 10000)),
        ),
      };

      const result = await service.checkIntegration('slack', 'org-1', mockService);

      expect(result.status).toBe('timeout');
      expect(result.error).toBe('Health check timed out');
    }, 10000);

    it('should return unconfigured for unknown provider', async () => {
      service.setServiceMap({});

      const result = await service.checkIntegration('unknown', 'org-1');

      expect(result.status).toBe('unconfigured');
      expect(result.error).toContain('Unknown provider');
    });

    it('should return unconfigured when service lacks testConnection', async () => {
      const mockService = {}; // no testConnection method

      const result = await service.checkIntegration('custom', 'org-1', mockService);

      expect(result.status).toBe('unconfigured');
      expect(result.error).toContain('does not support testConnection');
    });
  });

  describe('checkAllIntegrations', () => {
    it('should check all registered services', async () => {
      service.setServiceMap({
        slack: {
          testConnection: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
        },
        hubspot: {
          testConnection: jest.fn().mockResolvedValue({ success: false, message: 'auth failed' }),
        },
      });

      const results = await service.checkAllIntegrations('org-1');

      expect(results).toHaveLength(2);
      const slack = results.find((r) => r.provider === 'slack');
      const hubspot = results.find((r) => r.provider === 'hubspot');
      expect(slack?.status).toBe('ok');
      expect(hubspot?.status).toBe('error');
    });

    it('should handle mixed success and failure', async () => {
      service.setServiceMap({
        slack: {
          testConnection: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
        },
        broken: {
          testConnection: jest.fn().mockRejectedValue(new Error('Connection refused')),
        },
      });

      const results = await service.checkAllIntegrations('org-1');

      expect(results).toHaveLength(2);
      expect(results.find((r) => r.provider === 'slack')?.status).toBe('ok');
      expect(results.find((r) => r.provider === 'broken')?.status).toBe('error');
    });

    it('should return empty array when no services registered', async () => {
      service.setServiceMap({});

      const results = await service.checkAllIntegrations('org-1');

      expect(results).toHaveLength(0);
    });
  });
});
