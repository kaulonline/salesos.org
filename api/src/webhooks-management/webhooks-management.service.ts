import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { validateWebhookUrl } from '../common/utils/url-validator';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksManagementService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateWebhookDto) {
    // Validate webhook URL for SSRF protection
    const urlValidation = validateWebhookUrl(dto.url);
    if (!urlValidation.valid) {
      throw new BadRequestException(urlValidation.error);
    }

    const secret = this.generateSecret();

    return this.prisma.webhook.create({
      data: {
        name: dto.name,
        description: dto.description,
        url: dto.url,
        secret,
        events: dto.events,
        customHeaders: dto.headers || {},
        isActive: dto.isActive ?? true,
        maxRetries: dto.retryAttempts ?? 3,
        retryDelaySeconds: dto.retryDelaySeconds ?? 60,
        userId,
      },
    });
  }

  async findAll(userId: string, filters?: { isActive?: boolean }) {
    return this.prisma.webhook.findMany({
      where: {
        userId,
        isActive: filters?.isActive,
      },
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        events: true,
        isActive: true,
        maxRetries: true,
        retryDelaySeconds: true,
        lastDeliveryAt: true,
        successCount: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        secret: true,
        events: true,
        customHeaders: true,
        isActive: true,
        maxRetries: true,
        retryDelaySeconds: true,
        lastDeliveryAt: true,
        successCount: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  async update(id: string, userId: string, dto: UpdateWebhookDto) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Validate webhook URL for SSRF protection if URL is being updated
    if (dto.url) {
      const urlValidation = validateWebhookUrl(dto.url);
      if (!urlValidation.valid) {
        throw new BadRequestException(urlValidation.error);
      }
    }

    return this.prisma.webhook.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        url: dto.url,
        events: dto.events,
        customHeaders: dto.headers,
        isActive: dto.isActive,
        maxRetries: dto.retryAttempts,
        retryDelaySeconds: dto.retryDelaySeconds,
      },
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        events: true,
        customHeaders: true,
        isActive: true,
        maxRetries: true,
        retryDelaySeconds: true,
        lastDeliveryAt: true,
        successCount: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.prisma.webhook.delete({ where: { id } });
    return { success: true };
  }

  async regenerateSecret(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const newSecret = this.generateSecret();

    await this.prisma.webhook.update({
      where: { id },
      data: { secret: newSecret },
    });

    return {
      id,
      secret: newSecret,
      message: 'Store this secret securely. It will not be shown again.',
    };
  }

  async trigger(event: string, payload: Record<string, any>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { has: event },
      },
    });

    const results = await Promise.allSettled(
      webhooks.map(webhook => this.deliverWebhook(webhook, event, payload))
    );

    return {
      event,
      webhooksTriggered: webhooks.length,
      results: results.map((result, index) => ({
        webhookId: webhooks[index].id,
        status: result.status,
        error: result.status === 'rejected' ? result.reason?.message : undefined,
      })),
    };
  }

  private async deliverWebhook(
    webhook: any,
    event: string,
    payload: Record<string, any>,
    attemptNumber: number = 1
  ) {
    const timestamp = Date.now();
    const eventId = crypto.randomUUID();
    const body = JSON.stringify({
      event,
      eventId,
      timestamp,
      data: payload,
    });

    const signature = this.generateSignature(body, webhook.secret);

    const startTime = Date.now();
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp.toString(),
          ...((webhook.customHeaders as Record<string, string>) || {}),
        },
        body,
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => null);

      if (!response.ok) {
        throw new Error(`HTTP ${statusCode}: ${responseBody}`);
      }

      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastDeliveryAt: new Date(),
          lastSuccessAt: new Date(),
          deliveryCount: { increment: 1 },
          successCount: { increment: 1 },
          consecutiveFailures: 0,
        },
      });

    } catch (err) {
      error = err.message;

      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastDeliveryAt: new Date(),
          lastFailureAt: new Date(),
          deliveryCount: { increment: 1 },
          failureCount: { increment: 1 },
          consecutiveFailures: { increment: 1 },
        },
      });

      if (webhook.retryEnabled && attemptNumber < webhook.maxRetries) {
        setTimeout(() => {
          this.deliverWebhook(webhook, event, payload, attemptNumber + 1);
        }, webhook.retryDelaySeconds * 1000 * attemptNumber);
      }
    }

    const responseTimeMs = Date.now() - startTime;

    await this.prisma.webhookDeliveryLog.create({
      data: {
        webhookId: webhook.id,
        event,
        eventId,
        requestPayload: payload as any,
        statusCode,
        responseBody,
        responseTimeMs,
        attemptNumber,
        errorMessage: error,
        success: !error,
      },
    });

    if (error) {
      throw new Error(error);
    }
  }

  async getDeliveryLogs(id: string, userId: string, filters?: {
    success?: boolean;
    event?: string;
    page?: number;
    limit?: number;
  }) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { webhookId: id };
    if (filters?.success !== undefined) where.success = filters.success;
    if (filters?.event) where.event = filters.event;

    const [logs, total] = await Promise.all([
      this.prisma.webhookDeliveryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webhookDeliveryLog.count({ where }),
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

  async test(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const testPayload = {
      test: true,
      message: 'This is a test webhook delivery',
      timestamp: new Date().toISOString(),
    };

    try {
      await this.deliverWebhook(webhook, 'test', testPayload);
      return {
        success: true,
        message: 'Test webhook delivered successfully',
      };
    } catch (err) {
      return {
        success: false,
        message: 'Test webhook delivery failed',
        error: err.message,
      };
    }
  }

  async getStats(userId: string) {
    const [total, active, deliveriesLast24h] = await Promise.all([
      this.prisma.webhook.count({ where: { userId } }),
      this.prisma.webhook.count({ where: { userId, isActive: true } }),
      this.prisma.webhookDeliveryLog.count({
        where: {
          webhook: { userId },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const successCount = await this.prisma.webhookDeliveryLog.count({
      where: {
        webhook: { userId },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        success: true,
      },
    });

    const totalDeliveries = await this.prisma.webhookDeliveryLog.count({
      where: {
        webhook: { userId },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    return {
      webhooks: {
        total,
        active,
        inactive: total - active,
      },
      deliveriesLast24h,
      last7dSuccessRate: totalDeliveries > 0 ? (successCount / totalDeliveries) * 100 : 100,
    };
  }

  getAvailableEvents() {
    return [
      'lead.created',
      'lead.updated',
      'lead.converted',
      'lead.deleted',
      'contact.created',
      'contact.updated',
      'contact.deleted',
      'account.created',
      'account.updated',
      'account.deleted',
      'opportunity.created',
      'opportunity.updated',
      'opportunity.stage_changed',
      'opportunity.won',
      'opportunity.lost',
      'opportunity.deleted',
      'quote.created',
      'quote.sent',
      'quote.accepted',
      'quote.rejected',
      'quote.expired',
      'activity.created',
      'activity.completed',
      'task.created',
      'task.completed',
      'task.overdue',
      'user.created',
      'user.updated',
      'form.submitted',
    ];
  }

  private generateSecret(): string {
    return 'whsec_' + crypto.randomBytes(24).toString('hex');
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}
