import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { ApiKeyStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  private readonly API_KEY_PREFIX = 'sk_';
  private readonly API_KEY_LENGTH = 32;

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateApiKeyDto) {
    const keyValue = this.generateApiKey();
    const keyHash = this.hashKey(keyValue);
    const keyPrefix = keyValue.substring(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        description: dto.description,
        keyHash,
        keyPrefix,
        scopes: dto.scopes || ['read'],
        rateLimit: dto.rateLimit ?? 1000,
        rateLimitWindow: dto.rateLimitWindow ?? 3600,
        ipWhitelist: dto.allowedIps || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: 'ACTIVE',
        userId,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: keyValue,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      rateLimitWindow: apiKey.rateLimitWindow,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      message: 'Store this key securely. It will not be shown again.',
    };
  }

  async findAll(userId: string, filters?: { status?: ApiKeyStatus }) {
    return this.prisma.apiKey.findMany({
      where: {
        userId,
        status: filters?.status,
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        rateLimitWindow: true,
        ipWhitelist: true,
        status: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        rateLimitWindow: true,
        ipWhitelist: true,
        status: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  async update(id: string, userId: string, dto: UpdateApiKeyDto) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        scopes: dto.scopes,
        rateLimit: dto.rateLimit,
        rateLimitWindow: dto.rateLimitWindow,
        ipWhitelist: dto.allowedIps,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        status: dto.status,
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        rateLimitWindow: true,
        ipWhitelist: true,
        status: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({ where: { id } });
    return { success: true };
  }

  async revoke(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: { status: 'REVOKED' },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });
  }

  async regenerate(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const keyValue = this.generateApiKey();
    const keyHash = this.hashKey(keyValue);
    const keyPrefix = keyValue.substring(0, 12);

    await this.prisma.apiKey.update({
      where: { id },
      data: {
        keyHash,
        keyPrefix,
        status: 'ACTIVE',
        usageCount: 0,
      },
    });

    return {
      id,
      key: keyValue,
      keyPrefix,
      message: 'Store this key securely. It will not be shown again.',
    };
  }

  async validateKey(keyValue: string, requiredScopes?: string[], clientIp?: string) {
    const keyHash = this.hashKey(keyValue);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash },
    });

    if (!apiKey) {
      throw new ForbiddenException('Invalid API key');
    }

    if (apiKey.status !== 'ACTIVE') {
      throw new ForbiddenException(`API key is ${apiKey.status.toLowerCase()}`);
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      await this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { status: 'EXPIRED' },
      });
      throw new ForbiddenException('API key has expired');
    }

    if (apiKey.ipWhitelist.length > 0 && clientIp) {
      if (!apiKey.ipWhitelist.includes(clientIp)) {
        throw new ForbiddenException('IP address not allowed');
      }
    }

    if (requiredScopes && requiredScopes.length > 0) {
      const keyScopes = apiKey.scopes as string[];
      const hasAllScopes = requiredScopes.every(scope =>
        keyScopes.includes(scope) || keyScopes.includes('*')
      );
      if (!hasAllScopes) {
        throw new ForbiddenException('Insufficient API key permissions');
      }
    }

    const isRateLimited = await this.checkRateLimit(apiKey.id, apiKey.rateLimit, apiKey.rateLimitWindow);
    if (isRateLimited) {
      throw new ForbiddenException('Rate limit exceeded');
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    // Fetch user separately since there's no relation
    const user = await this.prisma.user.findUnique({
      where: { id: apiKey.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return {
      keyId: apiKey.id,
      userId: apiKey.userId,
      user,
      scopes: apiKey.scopes,
    };
  }

  private async checkRateLimit(keyId: string, limit: number, windowSeconds: number): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowSeconds * 1000);

    const recentRequests = await this.prisma.apiKeyUsageLog.count({
      where: {
        apiKeyId: keyId,
        createdAt: { gte: windowStart },
      },
    });

    return recentRequests >= limit;
  }

  async logUsage(apiKeyId: string, endpoint: string, method: string, statusCode: number, responseTimeMs?: number) {
    await this.prisma.apiKeyUsageLog.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTimeMs: responseTimeMs ?? 0,
      },
    });
  }

  async getUsageLogs(id: string, userId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { apiKeyId: id };
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.apiKeyUsageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiKeyUsageLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUsageStats(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, last24hCount, last7dCount, last30dCount, byEndpoint, avgResponseTime] = await Promise.all([
      this.prisma.apiKeyUsageLog.count({ where: { apiKeyId: id } }),
      this.prisma.apiKeyUsageLog.count({ where: { apiKeyId: id, createdAt: { gte: last24h } } }),
      this.prisma.apiKeyUsageLog.count({ where: { apiKeyId: id, createdAt: { gte: last7d } } }),
      this.prisma.apiKeyUsageLog.count({ where: { apiKeyId: id, createdAt: { gte: last30d } } }),
      this.prisma.apiKeyUsageLog.groupBy({
        by: ['endpoint'],
        where: { apiKeyId: id, createdAt: { gte: last7d } },
        _count: true,
        orderBy: { _count: { endpoint: 'desc' } },
        take: 10,
      }),
      this.prisma.apiKeyUsageLog.aggregate({
        where: { apiKeyId: id },
        _avg: { responseTimeMs: true },
      }),
    ]);

    return {
      total,
      last24h: last24hCount,
      last7d: last7dCount,
      last30d: last30dCount,
      topEndpoints: byEndpoint.map(e => ({
        endpoint: e.endpoint,
        count: e._count,
      })),
      avgResponseTime: avgResponseTime._avg.responseTimeMs || 0,
      rateLimit: {
        limit: apiKey.rateLimit,
        window: apiKey.rateLimitWindow,
      },
    };
  }

  async getGlobalStats() {
    const [total, active, revoked, expired] = await Promise.all([
      this.prisma.apiKey.count(),
      this.prisma.apiKey.count({ where: { status: 'ACTIVE' } }),
      this.prisma.apiKey.count({ where: { status: 'REVOKED' } }),
      this.prisma.apiKey.count({ where: { status: 'EXPIRED' } }),
    ]);

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const requestsLast24h = await this.prisma.apiKeyUsageLog.count({
      where: { createdAt: { gte: last24h } },
    });

    return {
      keys: { total, active, revoked, expired },
      requestsLast24h,
    };
  }

  private generateApiKey(): string {
    const randomBytes = crypto.randomBytes(this.API_KEY_LENGTH);
    return this.API_KEY_PREFIX + randomBytes.toString('hex');
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
