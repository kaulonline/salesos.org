import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PremiumEmailService } from '../email/premium-email.service';
import { CreateWaitlistDto, UpdateWaitlistDto, WaitlistStatus } from './dto';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private prisma: PrismaService,
    private premiumEmailService: PremiumEmailService,
  ) {}

  /**
   * Subscribe to waitlist (public endpoint)
   * @param dto - Subscription data
   * @param requestMeta - Request metadata for abuse tracking (IP, user agent)
   */
  async subscribe(
    dto: CreateWaitlistDto,
    requestMeta?: { ip: string; userAgent: string },
  ) {
    // Check if already subscribed
    const existing = await this.prisma.waitlistSubscriber.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      // Don't reveal that email exists, just return success
      this.logger.log(`Duplicate subscription attempt for ${dto.email} from IP: ${requestMeta?.ip}`);
      return { success: true, message: 'You\'re on the list!' };
    }

    // Merge user metadata with request tracking data
    const metadata = {
      ...(dto.metadata || {}),
      signupIp: requestMeta?.ip,
      signupUserAgent: requestMeta?.userAgent,
      signupTimestamp: new Date().toISOString(),
    };

    const subscriber = await this.prisma.waitlistSubscriber.create({
      data: {
        email: dto.email.toLowerCase(),
        company: dto.company,
        name: dto.name,
        source: dto.source || 'landing',
        metadata,
      },
    });

    this.logger.log(`New waitlist subscription: ${subscriber.email} from IP: ${requestMeta?.ip}`);

    // Send confirmation email (fire and forget - don't block response)
    this.premiumEmailService.sendWaitlistConfirmationEmail(
      subscriber.email,
      {
        email: subscriber.email,
        name: subscriber.name || undefined,
        company: subscriber.company || undefined,
      }
    ).catch(error => {
      this.logger.warn(`Failed to send waitlist confirmation email to ${subscriber.email}: ${error.message}`);
    });

    return { success: true, message: 'You\'re on the list!' };
  }

  /**
   * Get all subscribers (admin)
   */
  async getAll(query?: {
    status?: WaitlistStatus;
    search?: string;
    source?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, source, page = 1, limit = 50 } = query || {};

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [subscribers, total] = await Promise.all([
      this.prisma.waitlistSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.waitlistSubscriber.count({ where }),
    ]);

    return {
      subscribers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get subscriber stats (admin)
   */
  async getStats() {
    const [total, byStatus, bySource, recentSignups] = await Promise.all([
      this.prisma.waitlistSubscriber.count(),
      this.prisma.waitlistSubscriber.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.waitlistSubscriber.groupBy({
        by: ['source'],
        _count: true,
      }),
      this.prisma.waitlistSubscriber.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const sourceCounts = bySource.reduce(
      (acc, item) => {
        acc[item.source || 'unknown'] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      recentSignups,
      byStatus: statusCounts,
      bySource: sourceCounts,
    };
  }

  /**
   * Update subscriber (admin)
   */
  async update(id: string, dto: UpdateWaitlistDto) {
    const subscriber = await this.prisma.waitlistSubscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    const updateData: any = { ...dto };

    // Track status transitions
    if (dto.status === WaitlistStatus.INVITED && subscriber.status !== WaitlistStatus.INVITED) {
      updateData.invitedAt = new Date();
    }
    if (dto.status === WaitlistStatus.CONVERTED && subscriber.status !== WaitlistStatus.CONVERTED) {
      updateData.convertedAt = new Date();
    }

    return this.prisma.waitlistSubscriber.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete subscriber (admin)
   */
  async delete(id: string) {
    const subscriber = await this.prisma.waitlistSubscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    await this.prisma.waitlistSubscriber.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Bulk delete subscribers (admin)
   */
  async bulkDelete(ids: string[]) {
    if (!ids || ids.length === 0) {
      return { success: true, deleted: 0 };
    }

    const result = await this.prisma.waitlistSubscriber.deleteMany({
      where: { id: { in: ids } },
    });

    this.logger.log(`Bulk deleted ${result.count} waitlist subscribers`);
    return { success: true, deleted: result.count };
  }

  /**
   * Export subscribers as CSV (admin)
   */
  async exportCsv(status?: WaitlistStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const subscribers = await this.prisma.waitlistSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Email', 'Name', 'Company', 'Source', 'Status', 'Signed Up', 'Notes'];
    const rows = subscribers.map((s) => [
      s.email,
      s.name || '',
      s.company || '',
      s.source || '',
      s.status,
      s.createdAt.toISOString(),
      s.notes || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    return csv;
  }
}
