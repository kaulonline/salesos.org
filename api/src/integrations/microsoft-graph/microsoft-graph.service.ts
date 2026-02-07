import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  MicrosoftGraphConfig,
  CalendarEvent,
  TimeSlot,
  Email,
  CallRecording,
  CreateEventDto,
  SendEmailDto,
  GetAvailabilityDto,
  GetEventsDto,
  GetEmailsDto,
} from './dto';

@Injectable()
export class MicrosoftGraphService {
  private readonly logger = new Logger(MicrosoftGraphService.name);
  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';
  private readonly authUrl = 'https://login.microsoftonline.com';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get Microsoft Graph configuration from IntegrationConfig
   */
  async getConfig(organizationId?: string): Promise<MicrosoftGraphConfig | null> {
    // If organizationId provided, use compound key; otherwise search by provider
    const integration = organizationId
      ? await this.prisma.integrationConfig.findUnique({
          where: { organizationId_provider: { organizationId, provider: 'microsoft365' } },
        })
      : await this.prisma.integrationConfig.findFirst({
          where: { provider: 'microsoft365' },
        });

    if (!integration || !integration.credentials) {
      return null;
    }

    const creds = integration.credentials as any;
    return {
      tenantId: creds.tenantId,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      redirectUri: creds.redirectUri,
    };
  }

  /**
   * Get OAuth URL for user consent
   */
  async getOAuthUrl(userId: string, redirectUri: string): Promise<string> {
    const config = await this.getConfig();
    if (!config) {
      throw new BadRequestException('Microsoft 365 not configured');
    }

    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      'Calendars.ReadWrite',
      'Mail.ReadWrite',
      'Mail.Send',
      'OnlineMeetings.ReadWrite',
      'User.Read',
    ].join(' ');

    // Store state for CSRF protection
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    await this.prisma.oAuthState.create({
      data: {
        state,
        userId,
        provider: 'CUSTOM',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: redirectUri || config.redirectUri || '',
      scope: scopes,
      state,
      response_mode: 'query',
    });

    return `${this.authUrl}/${config.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(code: string, state: string, redirectUri: string): Promise<{ userId: string; success: boolean }> {
    // Verify state
    const storedState = await this.prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!storedState || storedState.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    const config = await this.getConfig();
    if (!config) {
      throw new BadRequestException('Microsoft 365 not configured');
    }

    try {
      const tokenResponse = await fetch(`${this.authUrl}/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokens = await tokenResponse.json();

      // Store tokens in user's settings or a separate table
      // For now, we'll update the integration config with user tokens
      // In production, you'd want a separate UserIntegrationToken table

      await this.prisma.oAuthState.delete({
        where: { state },
      });

      // Update integration status
      // Note: In a multi-tenant system, organizationId should be stored in OAuth state
      await this.prisma.integrationConfig.updateMany({
        where: { provider: 'microsoft365' },
        data: {
          status: 'connected',
          lastSyncAt: new Date(),
        },
      });

      return { userId: storedState.userId, success: true };
    } catch (error) {
      this.logger.error('OAuth callback failed:', error);
      throw new BadRequestException(`OAuth failed: ${error.message}`);
    }
  }

  /**
   * Get user access token (from stored tokens or refresh)
   */
  private async getAccessToken(userId?: string): Promise<string> {
    // In a production implementation, you'd fetch the user's stored tokens
    // and refresh if needed. For now, return a placeholder.
    const config = await this.getConfig();
    if (!config) {
      throw new BadRequestException('Microsoft 365 not configured');
    }

    // This would be replaced with actual token management
    throw new BadRequestException('User not authenticated with Microsoft 365');
  }

  /**
   * Make API request to Microsoft Graph
   */
  private async makeGraphRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    accessToken: string,
    body?: any,
  ): Promise<any> {
    try {
      const response = await fetch(`${this.graphBaseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Graph API error: ${response.status} - ${error}`);
      }

      if (response.status === 204) {
        return { success: true };
      }

      return response.json();
    } catch (error) {
      this.logger.error(`Graph API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Get calendar availability for scheduling
   */
  async getAvailability(userId: string, dto: GetAvailabilityDto): Promise<TimeSlot[]> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const requestBody = {
        schedules: dto.attendees || [userId],
        startTime: {
          dateTime: dto.startTime,
          timeZone: 'UTC',
        },
        endTime: {
          dateTime: dto.endTime,
          timeZone: 'UTC',
        },
        availabilityViewInterval: dto.duration || 30,
      };

      const response = await this.makeGraphRequest(
        '/me/calendar/getSchedule',
        'POST',
        accessToken,
        requestBody,
      );

      // Parse availability from response
      const slots: TimeSlot[] = [];
      const startDate = new Date(dto.startTime);
      const endDate = new Date(dto.endTime);
      const intervalMs = (dto.duration || 30) * 60 * 1000;

      // Response contains availability view as a string of digits
      // 0 = Free, 1 = Tentative, 2 = Busy, 3 = Out of Office, 4 = Working Elsewhere
      for (const schedule of response.value || []) {
        const availabilityView = schedule.availabilityView || '';
        let currentTime = new Date(startDate);

        for (let i = 0; i < availabilityView.length && currentTime < endDate; i++) {
          const isAvailable = availabilityView[i] === '0';
          slots.push({
            start: new Date(currentTime),
            end: new Date(currentTime.getTime() + intervalMs),
            available: isAvailable,
          });
          currentTime = new Date(currentTime.getTime() + intervalMs);
        }
      }

      return slots;
    } catch (error) {
      this.logger.error('Get availability failed:', error);
      return [];
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(userId: string, dto: CreateEventDto): Promise<CalendarEvent | null> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const eventBody: any = {
        subject: dto.subject,
        start: {
          dateTime: dto.startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: dto.endTime,
          timeZone: 'UTC',
        },
        body: dto.body ? {
          contentType: 'HTML',
          content: dto.body,
        } : undefined,
        location: dto.location ? {
          displayName: dto.location,
        } : undefined,
        attendees: dto.attendees?.map(email => ({
          emailAddress: { address: email },
          type: 'required',
        })),
        isOnlineMeeting: dto.isOnlineMeeting || false,
        onlineMeetingProvider: dto.isOnlineMeeting ? 'teamsForBusiness' : undefined,
      };

      const response = await this.makeGraphRequest(
        '/me/events',
        'POST',
        accessToken,
        eventBody,
      );

      return {
        id: response.id,
        subject: response.subject,
        start: new Date(response.start.dateTime),
        end: new Date(response.end.dateTime),
        location: response.location?.displayName,
        organizer: response.organizer?.emailAddress?.address,
        attendees: response.attendees?.map((a: any) => ({
          email: a.emailAddress.address,
          name: a.emailAddress.name,
          response: a.status?.response?.toLowerCase(),
        })) || [],
        isOnlineMeeting: response.isOnlineMeeting || false,
        onlineMeetingUrl: response.onlineMeeting?.joinUrl,
        body: response.body?.content,
      };
    } catch (error) {
      this.logger.error('Create event failed:', error);
      return null;
    }
  }

  /**
   * Get calendar events
   */
  async getEvents(userId: string, dto: GetEventsDto): Promise<CalendarEvent[]> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const params = new URLSearchParams();
      params.append('$top', String(dto.limit || 50));
      params.append('$orderby', 'start/dateTime');

      if (dto.startDate) {
        params.append('$filter', `start/dateTime ge '${dto.startDate}'`);
      }

      const response = await this.makeGraphRequest(
        `/me/events?${params}`,
        'GET',
        accessToken,
      );

      return (response.value || []).map((event: any) => ({
        id: event.id,
        subject: event.subject,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        location: event.location?.displayName,
        organizer: event.organizer?.emailAddress?.address,
        attendees: event.attendees?.map((a: any) => ({
          email: a.emailAddress.address,
          name: a.emailAddress.name,
          response: a.status?.response?.toLowerCase(),
        })) || [],
        isOnlineMeeting: event.isOnlineMeeting || false,
        onlineMeetingUrl: event.onlineMeeting?.joinUrl,
        body: event.body?.content,
      }));
    } catch (error) {
      this.logger.error('Get events failed:', error);
      return [];
    }
  }

  /**
   * Send an email
   */
  async sendEmail(userId: string, dto: SendEmailDto): Promise<{ success: boolean; messageId?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const message = {
        subject: dto.subject,
        body: {
          contentType: 'HTML',
          content: dto.body,
        },
        toRecipients: dto.to.map(email => ({
          emailAddress: { address: email },
        })),
        ccRecipients: dto.cc?.map(email => ({
          emailAddress: { address: email },
        })),
      };

      if (dto.saveAsDraft) {
        const response = await this.makeGraphRequest(
          '/me/messages',
          'POST',
          accessToken,
          message,
        );
        return { success: true, messageId: response.id };
      } else {
        await this.makeGraphRequest(
          '/me/sendMail',
          'POST',
          accessToken,
          { message },
        );
        return { success: true };
      }
    } catch (error) {
      this.logger.error('Send email failed:', error);
      return { success: false };
    }
  }

  /**
   * Get emails from mailbox
   */
  async getEmails(userId: string, dto: GetEmailsDto): Promise<Email[]> {
    try {
      const accessToken = await this.getAccessToken(userId);

      let folder = 'inbox';
      if (dto.folder === 'sent') folder = 'sentItems';
      if (dto.folder === 'drafts') folder = 'drafts';

      const params = new URLSearchParams();
      params.append('$top', String(dto.limit || 25));
      params.append('$orderby', 'receivedDateTime desc');
      params.append('$select', 'id,subject,from,toRecipients,bodyPreview,receivedDateTime,isRead,importance,hasAttachments');

      const filters: string[] = [];
      if (dto.unreadOnly) {
        filters.push('isRead eq false');
      }
      if (dto.search) {
        filters.push(`contains(subject, '${dto.search}') or contains(bodyPreview, '${dto.search}')`);
      }
      if (filters.length > 0) {
        params.append('$filter', filters.join(' and '));
      }

      const response = await this.makeGraphRequest(
        `/me/mailFolders/${folder}/messages?${params}`,
        'GET',
        accessToken,
      );

      return (response.value || []).map((email: any) => ({
        id: email.id,
        subject: email.subject,
        from: {
          email: email.from?.emailAddress?.address,
          name: email.from?.emailAddress?.name,
        },
        to: email.toRecipients?.map((r: any) => ({
          email: r.emailAddress?.address,
          name: r.emailAddress?.name,
        })) || [],
        bodyPreview: email.bodyPreview,
        receivedAt: new Date(email.receivedDateTime),
        isRead: email.isRead,
        importance: email.importance?.toLowerCase() || 'normal',
        hasAttachments: email.hasAttachments,
      }));
    } catch (error) {
      this.logger.error('Get emails failed:', error);
      return [];
    }
  }

  /**
   * Get Teams call recordings
   */
  async getCallRecordings(userId: string, meetingId?: string): Promise<CallRecording[]> {
    try {
      const accessToken = await this.getAccessToken(userId);

      // Microsoft Graph API for call recordings requires different permissions
      // This is a simplified implementation
      const response = await this.makeGraphRequest(
        `/communications/callRecords${meetingId ? `?$filter=organizer_v2/user/id eq '${meetingId}'` : ''}`,
        'GET',
        accessToken,
      );

      return (response.value || []).map((record: any) => ({
        id: record.id,
        meetingId: record.joinWebUrl,
        startTime: new Date(record.startDateTime),
        endTime: new Date(record.endDateTime),
        participants: record.participants?.map((p: any) => p.user?.displayName) || [],
      }));
    } catch (error) {
      this.logger.error('Get call recordings failed:', error);
      return [];
    }
  }

  /**
   * Test connection to Microsoft Graph
   */
  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const config = await this.getConfig();
    if (!config) {
      return { success: false, message: 'Microsoft 365 not configured' };
    }

    const startTime = Date.now();

    try {
      // Test app-only authentication
      const tokenResponse = await fetch(`${this.authUrl}/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Authentication failed: ${error}`);
      }

      // Update integration status
      // Note: In a multi-tenant system, organizationId should be passed to this method
      await this.prisma.integrationConfig.updateMany({
        where: { provider: 'microsoft365' },
        data: {
          status: 'connected',
          lastSyncAt: new Date(),
        },
      });

      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        message: 'Connection successful',
        latencyMs,
      };
    } catch (error) {
      this.logger.error('Microsoft Graph connection test failed:', error);

      await this.prisma.integrationConfig.updateMany({
        where: { provider: 'microsoft365' },
        data: {
          status: 'error',
          syncError: error.message,
        },
      });

      return { success: false, message: error.message };
    }
  }

  /**
   * Check if Microsoft 365 integration is enabled and connected
   */
  async isConnected(organizationId?: string): Promise<boolean> {
    // If organizationId provided, use compound key; otherwise search by provider
    const integration = organizationId
      ? await this.prisma.integrationConfig.findUnique({
          where: { organizationId_provider: { organizationId, provider: 'microsoft365' } },
        })
      : await this.prisma.integrationConfig.findFirst({
          where: { provider: 'microsoft365' },
        });

    return integration?.status === 'connected';
  }
}
