import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { CalendarProvider, ConnectionStatus, Prisma } from '@prisma/client';
import { UpdateCalendarConnectionDto, CalendarListResponseDto } from './dto/calendar-integration.dto';
import * as crypto from 'crypto';

// OAuth configuration interface
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  userInfoUrl: string;
  calendarsUrl: string;
}

// Token response from OAuth providers
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

// User info from providers
interface UserInfo {
  email: string;
  name?: string;
  id?: string;
}

// Transformed calendar event for database storage
interface TransformedCalendarEvent {
  externalId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  timezone: string;
  status: string;
  organizerEmail?: string;
  organizerName?: string;
  attendees?: { email: string; name?: string; status?: string }[];
  meetingUrl?: string;
  meetingProvider?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  recurringEventId?: string;
  rawData: any;
}

@Injectable()
export class CalendarIntegrationsService {
  private readonly logger = new Logger(CalendarIntegrationsService.name);
  private readonly oauthStates = new Map<string, { userId: string; provider: CalendarProvider; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get OAuth configuration for a provider
   */
  private getOAuthConfig(provider: CalendarProvider): OAuthConfig {
    const baseRedirectUri = this.configService.get<string>('APP_URL', 'http://localhost:4000');

    switch (provider) {
      case CalendarProvider.GOOGLE:
        return {
          clientId: this.configService.get<string>('GOOGLE_CLIENT_ID', ''),
          clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
          redirectUri: `${baseRedirectUri}/api/calendar-integrations/callback/google`,
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scopes: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
          ],
          userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
          calendarsUrl: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        };

      case CalendarProvider.OUTLOOK:
        return {
          clientId: this.configService.get<string>('MICROSOFT_CLIENT_ID', ''),
          clientSecret: this.configService.get<string>('MICROSOFT_CLIENT_SECRET', ''),
          redirectUri: `${baseRedirectUri}/api/calendar-integrations/callback/outlook`,
          authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          scopes: [
            'offline_access',
            'https://graph.microsoft.com/Calendars.Read',
            'https://graph.microsoft.com/Calendars.ReadWrite',
            'https://graph.microsoft.com/User.Read',
          ],
          userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
          calendarsUrl: 'https://graph.microsoft.com/v1.0/me/calendars',
        };

      default:
        throw new BadRequestException(`Unsupported calendar provider: ${provider}`);
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  async initiateOAuth(userId: string, provider: CalendarProvider): Promise<{ authUrl: string; state: string }> {
    const config = this.getOAuthConfig(provider);

    if (!config.clientId || !config.clientSecret) {
      throw new BadRequestException(`${provider} OAuth is not configured. Please set up the client credentials.`);
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with expiration (10 minutes)
    this.oauthStates.set(state, {
      userId,
      provider,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Clean up old states
    this.cleanupExpiredStates();

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline', // For Google refresh tokens
      prompt: 'consent', // Force consent to get refresh token
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    this.logger.log(`Initiated Calendar OAuth for ${provider}, state: ${state.substring(0, 8)}...`);

    return { authUrl, state };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(
    provider: CalendarProvider,
    code: string,
    state: string,
  ): Promise<{ success: boolean; connectionId?: string; email?: string; error?: string }> {
    // Verify state
    const stateData = this.oauthStates.get(state);
    if (!stateData) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    if (stateData.expiresAt < Date.now()) {
      this.oauthStates.delete(state);
      throw new UnauthorizedException('OAuth state has expired');
    }

    if (stateData.provider !== provider) {
      throw new BadRequestException('Provider mismatch');
    }

    const { userId } = stateData;
    this.oauthStates.delete(state);

    const config = this.getOAuthConfig(provider);

    try {
      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(config, code);

      // Get user info
      const userInfo = await this.getUserInfo(provider, tokenResponse.access_token);

      // Get calendars and find primary
      const calendars = await this.getCalendars(provider, tokenResponse.access_token);
      const primaryCalendar = calendars.find(c => c.primary) || calendars[0];

      // Calculate token expiration
      const tokenExpiresAt = tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null;

      // Upsert connection
      const connection = await this.prisma.calendarConnection.upsert({
        where: {
          userId_provider_email: {
            userId,
            provider,
            email: userInfo.email,
          },
        },
        update: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || undefined,
          tokenExpiresAt,
          status: ConnectionStatus.ACTIVE,
          lastError: null,
          calendarId: primaryCalendar?.id,
          calendarName: primaryCalendar?.name,
          providerUserId: userInfo.id,
          updatedAt: new Date(),
        },
        create: {
          userId,
          provider,
          email: userInfo.email,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          tokenExpiresAt,
          status: ConnectionStatus.ACTIVE,
          calendarId: primaryCalendar?.id,
          calendarName: primaryCalendar?.name,
          providerUserId: userInfo.id,
          providerData: { name: userInfo.name } as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`Calendar OAuth successful for ${provider}: ${userInfo.email}`);

      return {
        success: true,
        connectionId: connection.id,
        email: userInfo.email,
      };
    } catch (error) {
      this.logger.error(`Calendar OAuth callback failed for ${provider}: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(config: OAuthConfig, code: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      this.logger.error(`Token exchange failed: ${errorData}`);
      throw new BadRequestException('Failed to exchange authorization code');
    }

    return response.json();
  }

  /**
   * Get user info from provider
   */
  private async getUserInfo(provider: CalendarProvider, accessToken: string): Promise<UserInfo> {
    const config = this.getOAuthConfig(provider);

    const response = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to get user info');
    }

    const data = await response.json();

    if (provider === CalendarProvider.GOOGLE) {
      return {
        email: data.email,
        name: data.name,
        id: data.id,
      };
    } else if (provider === CalendarProvider.OUTLOOK) {
      return {
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        id: data.id,
      };
    }

    throw new BadRequestException('Unknown provider');
  }

  /**
   * Get calendars from provider
   */
  private async getCalendars(provider: CalendarProvider, accessToken: string): Promise<CalendarListResponseDto[]> {
    const config = this.getOAuthConfig(provider);

    const response = await fetch(config.calendarsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      this.logger.warn('Failed to fetch calendars');
      return [];
    }

    const data = await response.json();

    if (provider === CalendarProvider.GOOGLE) {
      return (data.items || []).map((cal: any) => ({
        id: cal.id,
        name: cal.summary,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
      }));
    } else if (provider === CalendarProvider.OUTLOOK) {
      return (data.value || []).map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        primary: cal.isDefaultCalendar || false,
        accessRole: cal.canEdit ? 'writer' : 'reader',
      }));
    }

    return [];
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(connectionId: string): Promise<void> {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (!connection.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    const config = this.getOAuthConfig(connection.provider);

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          status: ConnectionStatus.EXPIRED,
          lastError: 'Refresh token expired or revoked',
        },
      });
      throw new BadRequestException('Failed to refresh access token');
    }

    const tokenData: TokenResponse = await response.json();

    await this.prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || connection.refreshToken,
        tokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
        status: ConnectionStatus.ACTIVE,
        lastError: null,
      },
    });

    this.logger.log(`Refreshed token for calendar connection ${connectionId}`);
  }

  /**
   * Get all calendar connections for a user
   */
  async getConnections(userId: string) {
    return this.prisma.calendarConnection.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        status: true,
        calendarId: true,
        calendarName: true,
        syncEnabled: true,
        syncPastDays: true,
        syncFutureDays: true,
        lastSyncAt: true,
        eventsSynced: true,
        lastEventAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific connection
   */
  async getConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
      select: {
        id: true,
        provider: true,
        email: true,
        status: true,
        calendarId: true,
        calendarName: true,
        syncEnabled: true,
        syncPastDays: true,
        syncFutureDays: true,
        lastSyncAt: true,
        eventsSynced: true,
        lastEventAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    return connection;
  }

  /**
   * Get available calendars for a connection
   */
  async getAvailableCalendars(connectionId: string, userId: string): Promise<CalendarListResponseDto[]> {
    const connection = await this.prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Check if token needs refresh
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      await this.refreshAccessToken(connectionId);
      const refreshed = await this.prisma.calendarConnection.findUnique({
        where: { id: connectionId },
      });
      if (refreshed) {
        return this.getCalendars(connection.provider, refreshed.accessToken);
      }
    }

    return this.getCalendars(connection.provider, connection.accessToken);
  }

  /**
   * Update connection settings
   */
  async updateConnection(connectionId: string, userId: string, dto: UpdateCalendarConnectionDto) {
    const connection = await this.prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    return this.prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        syncEnabled: dto.syncEnabled,
        syncPastDays: dto.syncPastDays,
        syncFutureDays: dto.syncFutureDays,
        calendarId: dto.calendarId,
      },
      select: {
        id: true,
        provider: true,
        email: true,
        status: true,
        calendarId: true,
        calendarName: true,
        syncEnabled: true,
        syncPastDays: true,
        syncFutureDays: true,
        lastSyncAt: true,
        eventsSynced: true,
        lastEventAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Disconnect/delete a calendar connection
   */
  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const connection = await this.prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Delete synced events for this connection
    await this.prisma.syncedCalendarEvent.deleteMany({
      where: { calendarConnectionId: connectionId },
    });

    // Delete the connection
    await this.prisma.calendarConnection.delete({
      where: { id: connectionId },
    });

    this.logger.log(`Deleted calendar connection ${connectionId}`);
  }

  /**
   * Get available integrations with their configuration status
   */
  getAvailableIntegrations() {
    const googleConfigured = !!(
      this.configService.get<string>('GOOGLE_CLIENT_ID') &&
      this.configService.get<string>('GOOGLE_CLIENT_SECRET')
    );

    const outlookConfigured = !!(
      this.configService.get<string>('MICROSOFT_CLIENT_ID') &&
      this.configService.get<string>('MICROSOFT_CLIENT_SECRET')
    );

    return [
      {
        provider: CalendarProvider.GOOGLE,
        name: 'Google Calendar',
        description: 'Sync your Google Calendar events with CRM meetings',
        configured: googleConfigured,
        icon: 'google-calendar',
      },
      {
        provider: CalendarProvider.OUTLOOK,
        name: 'Outlook Calendar',
        description: 'Sync your Outlook/Microsoft 365 calendar events',
        configured: outlookConfigured,
        icon: 'outlook-calendar',
      },
    ];
  }

  /**
   * Clean up expired OAuth states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [key, value] of this.oauthStates.entries()) {
      if (value.expiresAt < now) {
        this.oauthStates.delete(key);
      }
    }
  }

  /**
   * Trigger a manual sync for a connection
   */
  async triggerSync(connectionId: string, userId: string) {
    let connection = await this.prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new BadRequestException('Connection is not active');
    }

    // Check if token needs refresh
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      await this.refreshAccessToken(connectionId);
      // Re-fetch connection with updated token
      connection = await this.prisma.calendarConnection.findFirst({
        where: { id: connectionId, userId },
      });
      if (!connection) {
        throw new NotFoundException('Connection not found after token refresh');
      }
    }

    try {
      // Fetch events from provider
      const events = await this.fetchEventsFromProvider(connection);

      // Upsert each event to database
      let syncedCount = 0;
      for (const event of events) {
        try {
          await this.upsertSyncedEvent(connection, event);
          syncedCount++;
        } catch (eventError) {
          this.logger.warn(`Failed to sync event ${event.externalId}: ${eventError.message}`);
        }
      }

      // Update connection metadata
      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncAt: new Date(),
          eventsSynced: syncedCount,
          lastError: null,
        },
      });

      this.logger.log(`Calendar sync complete for ${connectionId}: ${syncedCount} events synced`);

      return {
        success: true,
        message: `Synced ${syncedCount} events`,
        eventsSynced: syncedCount,
        totalFetched: events.length,
      };
    } catch (error) {
      this.logger.error(`Calendar sync failed for ${connectionId}: ${error.message}`);

      // Update connection with error
      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncAt: new Date(),
          lastError: error.message,
        },
      });

      throw new BadRequestException(`Sync failed: ${error.message}`);
    }
  }

  /**
   * Fetch events from the calendar provider
   */
  private async fetchEventsFromProvider(connection: any): Promise<TransformedCalendarEvent[]> {
    const syncPastDays = connection.syncPastDays || 7;
    const syncFutureDays = connection.syncFutureDays || 30;

    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - syncPastDays);

    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + syncFutureDays);

    if (connection.provider === CalendarProvider.GOOGLE) {
      return this.fetchGoogleEvents(connection, timeMin, timeMax);
    } else if (connection.provider === CalendarProvider.OUTLOOK) {
      return this.fetchOutlookEvents(connection, timeMin, timeMax);
    }

    throw new BadRequestException(`Unsupported provider: ${connection.provider}`);
  }

  /**
   * Fetch events from Google Calendar
   */
  private async fetchGoogleEvents(
    connection: any,
    timeMin: Date,
    timeMax: Date,
  ): Promise<TransformedCalendarEvent[]> {
    const calendarId = connection.calendarId || 'primary';
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin', timeMin.toISOString());
    url.searchParams.set('timeMax', timeMax.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
    });

    if (response.status === 401) {
      // Token expired, try refresh
      await this.refreshAccessToken(connection.id);
      throw new UnauthorizedException('Token expired, please retry sync');
    }

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Google Calendar API error: ${errorText}`);
      throw new BadRequestException('Failed to fetch Google Calendar events');
    }

    const data = await response.json();
    const events: TransformedCalendarEvent[] = [];

    for (const item of data.items || []) {
      events.push(this.transformGoogleEvent(item));
    }

    return events;
  }

  /**
   * Transform Google Calendar event to our format
   */
  private transformGoogleEvent(item: any): TransformedCalendarEvent {
    const start = item.start?.dateTime ? new Date(item.start.dateTime) : new Date(item.start?.date);
    const end = item.end?.dateTime ? new Date(item.end.dateTime) : new Date(item.end?.date);
    const allDay = !item.start?.dateTime;

    // Extract meeting URL from conferenceData or description
    let meetingUrl: string | undefined;
    let meetingProvider: string | undefined;
    if (item.conferenceData?.entryPoints) {
      const videoEntry = item.conferenceData.entryPoints.find((e: any) => e.entryPointType === 'video');
      meetingUrl = videoEntry?.uri;
      meetingProvider = item.conferenceData.conferenceSolution?.name?.toLowerCase();
    } else if (item.hangoutLink) {
      meetingUrl = item.hangoutLink;
      meetingProvider = 'google-meet';
    }

    return {
      externalId: item.id,
      title: item.summary || 'No title',
      description: item.description,
      location: item.location,
      startTime: start,
      endTime: end,
      allDay,
      timezone: item.start?.timeZone || 'UTC',
      status: item.status || 'confirmed',
      organizerEmail: item.organizer?.email,
      organizerName: item.organizer?.displayName,
      attendees: (item.attendees || []).map((a: any) => ({
        email: a.email,
        name: a.displayName,
        status: a.responseStatus,
      })),
      meetingUrl,
      meetingProvider,
      isRecurring: !!item.recurringEventId,
      recurrenceRule: item.recurrence?.[0],
      recurringEventId: item.recurringEventId,
      rawData: item,
    };
  }

  /**
   * Fetch events from Outlook Calendar
   */
  private async fetchOutlookEvents(
    connection: any,
    timeMin: Date,
    timeMax: Date,
  ): Promise<TransformedCalendarEvent[]> {
    const calendarId = connection.calendarId || '';
    const basePath = calendarId
      ? `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`
      : 'https://graph.microsoft.com/v1.0/me/events';

    const url = new URL(basePath);
    url.searchParams.set('$filter', `start/dateTime ge '${timeMin.toISOString()}' and end/dateTime le '${timeMax.toISOString()}'`);
    url.searchParams.set('$orderby', 'start/dateTime');
    url.searchParams.set('$top', '250');
    url.searchParams.set('$select', 'id,subject,body,start,end,location,organizer,attendees,isAllDay,recurrence,onlineMeeting,webLink,seriesMasterId');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
    });

    if (response.status === 401) {
      // Token expired, try refresh
      await this.refreshAccessToken(connection.id);
      throw new UnauthorizedException('Token expired, please retry sync');
    }

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Microsoft Graph API error: ${errorText}`);
      throw new BadRequestException('Failed to fetch Outlook Calendar events');
    }

    const data = await response.json();
    const events: TransformedCalendarEvent[] = [];

    for (const item of data.value || []) {
      events.push(this.transformOutlookEvent(item));
    }

    return events;
  }

  /**
   * Transform Outlook Calendar event to our format
   */
  private transformOutlookEvent(item: any): TransformedCalendarEvent {
    const start = new Date(item.start?.dateTime + 'Z');
    const end = new Date(item.end?.dateTime + 'Z');

    // Extract meeting URL
    let meetingUrl: string | undefined;
    let meetingProvider: string | undefined;
    if (item.onlineMeeting?.joinUrl) {
      meetingUrl = item.onlineMeeting.joinUrl;
      meetingProvider = 'microsoft-teams';
    }

    return {
      externalId: item.id,
      title: item.subject || 'No title',
      description: item.body?.content,
      location: item.location?.displayName,
      startTime: start,
      endTime: end,
      allDay: item.isAllDay || false,
      timezone: item.start?.timeZone || 'UTC',
      status: item.showAs === 'free' ? 'tentative' : 'confirmed',
      organizerEmail: item.organizer?.emailAddress?.address,
      organizerName: item.organizer?.emailAddress?.name,
      attendees: (item.attendees || []).map((a: any) => ({
        email: a.emailAddress?.address,
        name: a.emailAddress?.name,
        status: a.status?.response?.toLowerCase(),
      })),
      meetingUrl,
      meetingProvider,
      isRecurring: !!item.seriesMasterId,
      recurrenceRule: item.recurrence ? JSON.stringify(item.recurrence) : undefined,
      recurringEventId: item.seriesMasterId,
      rawData: item,
    };
  }

  /**
   * Upsert a synced event to the database
   */
  private async upsertSyncedEvent(connection: any, event: TransformedCalendarEvent): Promise<void> {
    await this.prisma.syncedCalendarEvent.upsert({
      where: {
        calendarConnectionId_externalId: {
          calendarConnectionId: connection.id,
          externalId: event.externalId,
        },
      },
      update: {
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
        allDay: event.allDay,
        timezone: event.timezone,
        status: event.status,
        organizerEmail: event.organizerEmail,
        organizerName: event.organizerName,
        attendees: event.attendees as any,
        meetingUrl: event.meetingUrl,
        meetingProvider: event.meetingProvider,
        isRecurring: event.isRecurring,
        recurrenceRule: event.recurrenceRule,
        recurringEventId: event.recurringEventId,
        rawData: event.rawData,
        lastSyncedAt: new Date(),
      },
      create: {
        calendarConnectionId: connection.id,
        provider: connection.provider,
        externalId: event.externalId,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
        allDay: event.allDay,
        timezone: event.timezone,
        status: event.status,
        organizerEmail: event.organizerEmail,
        organizerName: event.organizerName,
        attendees: event.attendees as any,
        meetingUrl: event.meetingUrl,
        meetingProvider: event.meetingProvider,
        isRecurring: event.isRecurring,
        recurrenceRule: event.recurrenceRule,
        recurringEventId: event.recurringEventId,
        rawData: event.rawData,
        lastSyncedAt: new Date(),
      },
    });
  }
}
