import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { GongService } from '../../integrations/gong/gong.service';
import { CalendlyService } from '../../integrations/calendly/calendly.service';
import { MeetingPlatform } from '@prisma/client';

@Injectable()
export class MeetingIntegrationSyncService {
  private readonly logger = new Logger(MeetingIntegrationSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gongService: GongService,
    private readonly calendlyService: CalendlyService,
  ) {}

  /**
   * Sync Gong call recordings into MeetingSession records.
   * Runs every 30 minutes for connected organizations.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncGongCalls(): Promise<void> {
    const configs = await this.getConnectedConfigs('gong');
    for (const config of configs) {
      await this.syncGongCallsForOrg(config).catch((err) => {
        this.logger.error(`Gong sync failed for org ${config.organizationId}: ${err.message}`);
      });
    }
  }

  /**
   * Sync Calendly scheduled events into MeetingSession records.
   * Runs every 10 minutes for connected organizations.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncCalendlyEvents(): Promise<void> {
    const configs = await this.getConnectedConfigs('calendly');
    for (const config of configs) {
      await this.syncCalendlyEventsForOrg(config).catch((err) => {
        this.logger.error(`Calendly sync failed for org ${config.organizationId}: ${err.message}`);
      });
    }
  }

  /**
   * On-demand sync for a specific organization — callable from the API.
   */
  async syncGongForOrganization(organizationId: string): Promise<{ imported: number }> {
    const config = await this.prisma.integrationConfig.findFirst({
      where: { organizationId, provider: 'gong', status: 'connected' },
    });
    if (!config) return { imported: 0 };
    return this.syncGongCallsForOrg(config);
  }

  async syncCalendlyForOrganization(organizationId: string): Promise<{ imported: number }> {
    const config = await this.prisma.integrationConfig.findFirst({
      where: { organizationId, provider: 'calendly', status: 'connected' },
    });
    if (!config) return { imported: 0 };
    return this.syncCalendlyEventsForOrg(config);
  }

  // ──────────────────────────────────────
  // Gong sync logic
  // ──────────────────────────────────────

  private async syncGongCallsForOrg(config: any): Promise<{ imported: number }> {
    this.gongService.setOrganizationContext(config.organizationId);
    let imported = 0;

    try {
      // Fetch calls from the last 24 hours (or since last sync)
      const lastSyncAt = config.lastSyncAt
        ? new Date(config.lastSyncAt).toISOString()
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const callsResponse = await this.gongService.getCalls(lastSyncAt);
      const calls = callsResponse?.calls || callsResponse?.records || [];

      // Get the first admin/owner for this org to assign as meeting owner
      const ownerId = await this.getOrgOwnerId(config.organizationId);
      if (!ownerId) {
        this.logger.warn(`No owner found for org ${config.organizationId}, skipping Gong sync`);
        return { imported: 0 };
      }

      for (const call of calls) {
        const externalId = call.id || call.callId;

        // Skip if already imported
        const existing = await this.prisma.meetingSession.findFirst({
          where: {
            externalMeetingId: `gong:${externalId}`,
          },
        });
        if (existing) continue;

        // Create meeting session from Gong call
        await this.prisma.meetingSession.create({
          data: {
            title: call.title || call.purpose || 'Gong Call',
            platform: MeetingPlatform.OTHER,
            status: 'COMPLETED',
            externalMeetingId: `gong:${externalId}`,
            scheduledStart: call.started ? new Date(call.started) : new Date(),
            actualStart: call.started ? new Date(call.started) : undefined,
            actualEnd: call.ended ? new Date(call.ended) : undefined,
            duration: call.duration || 0,
            ownerId,
            recordingUrl: call.mediaUrl || call.url || undefined,
            metadata: { source: 'gong', gongCallId: externalId },
          },
        });
        imported++;
      }

      // Update last sync time
      await this.prisma.integrationConfig.update({
        where: { id: config.id },
        data: { lastSyncAt: new Date(), syncError: null },
      });

      if (imported > 0) {
        this.logger.log(`Gong sync: imported ${imported} calls for org ${config.organizationId}`);
      }
    } catch (error: any) {
      await this.prisma.integrationConfig.update({
        where: { id: config.id },
        data: { syncError: error.message },
      });
      throw error;
    } finally {
      this.gongService.clearOrganizationContext();
    }

    return { imported };
  }

  // ──────────────────────────────────────
  // Calendly sync logic
  // ──────────────────────────────────────

  private async syncCalendlyEventsForOrg(config: any): Promise<{ imported: number }> {
    this.calendlyService.setOrganizationContext(config.organizationId);
    let imported = 0;

    try {
      // Fetch upcoming events for the next 7 days
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const events = await this.calendlyService.getScheduledEvents(startTime, endTime);

      // Get the first admin/owner for this org to assign as meeting owner
      const ownerId = await this.getOrgOwnerId(config.organizationId);
      if (!ownerId) {
        this.logger.warn(`No owner found for org ${config.organizationId}, skipping Calendly sync`);
        return { imported: 0 };
      }

      for (const event of events || []) {
        const externalId = event.uri || event.uuid;
        const eventId = externalId?.split('/').pop() || externalId;

        // Skip if already imported
        const existing = await this.prisma.meetingSession.findFirst({
          where: {
            externalMeetingId: `calendly:${eventId}`,
          },
        });
        if (existing) continue;

        // Determine meeting platform from Calendly location
        const locationConfig = event.location || {};
        const meetingUrl: string = locationConfig.join_url || '';
        let platform: MeetingPlatform = MeetingPlatform.OTHER;
        if (meetingUrl.includes('zoom')) platform = MeetingPlatform.ZOOM;
        else if (meetingUrl.includes('teams')) platform = MeetingPlatform.TEAMS;
        else if (meetingUrl.includes('meet.google')) platform = MeetingPlatform.GOOGLE_MEET;

        // Create meeting session from Calendly event
        await this.prisma.meetingSession.create({
          data: {
            title: event.name || 'Calendly Meeting',
            platform,
            status: 'SCHEDULED',
            externalMeetingId: `calendly:${eventId}`,
            scheduledStart: event.start_time ? new Date(event.start_time) : new Date(),
            scheduledEnd: event.end_time ? new Date(event.end_time) : undefined,
            meetingUrl: meetingUrl || undefined,
            ownerId,
            duration: event.start_time && event.end_time
              ? Math.round((new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000)
              : undefined,
            metadata: { source: 'calendly', calendlyEventId: eventId },
          },
        });
        imported++;
      }

      // Update last sync time
      await this.prisma.integrationConfig.update({
        where: { id: config.id },
        data: { lastSyncAt: new Date(), syncError: null },
      });

      if (imported > 0) {
        this.logger.log(`Calendly sync: imported ${imported} events for org ${config.organizationId}`);
      }
    } catch (error: any) {
      await this.prisma.integrationConfig.update({
        where: { id: config.id },
        data: { syncError: error.message },
      });
      throw error;
    } finally {
      this.calendlyService.clearOrganizationContext();
    }

    return { imported };
  }

  // ──────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────

  private async getConnectedConfigs(provider: string): Promise<any[]> {
    return this.prisma.integrationConfig.findMany({
      where: { provider, status: 'connected' },
    });
  }

  /**
   * Find the first user in an organization to use as the default meeting owner.
   */
  private async getOrgOwnerId(organizationId: string): Promise<string | null> {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, role: { in: ['OWNER', 'ADMIN', 'MEMBER'] } },
      select: { userId: true },
      orderBy: { createdAt: 'asc' },
    });
    return member?.userId || null;
  }
}
