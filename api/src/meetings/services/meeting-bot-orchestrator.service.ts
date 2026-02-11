/**
 * Meeting Bot Orchestrator
 * 
 * Coordinates the lifecycle of meeting bots and handles:
 * 1. Scheduling bot joins before meetings start
 * 2. Real-time transcription aggregation
 * 3. Post-meeting analysis triggering
 * 4. CRM updates from meeting insights
 * 
 * Uses NestJS event-driven architecture for loose coupling.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { ZoomBotService, BotInstance, TranscriptSegment } from './zoom-bot.service';
import { TranscriptionService } from './transcription.service';
import { PendingActionsService } from './pending-actions.service';
import { AttendeeService, AttendeeBot } from '../attendee.service';
import { DataSourceType } from '@prisma/client';

export interface MeetingBotEvent {
  botId: string;
  meetingSessionId: string;
  meetingNumber?: string;
  mode?: string;
}

export interface TranscriptionEvent extends MeetingBotEvent {
  segment: TranscriptSegment;
}

export interface BotCompletionEvent extends MeetingBotEvent {
  transcriptSegments: TranscriptSegment[];
  duration: number;
}

@Injectable()
export class MeetingBotOrchestrator implements OnModuleInit {
  private readonly logger = new Logger(MeetingBotOrchestrator.name);
  
  // Track pending bot joins (meetingSessionId -> scheduled timeout)
  private scheduledJoins: Map<string, NodeJS.Timeout> = new Map();
  
  // Track Attendee bots (meetingSessionId -> attendeeBotId)
  private attendeeBots: Map<string, string> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly zoomBotService: ZoomBotService,
    private readonly transcriptionService: TranscriptionService,
    private readonly pendingActionsService: PendingActionsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly attendeeService: AttendeeService,
  ) {}

  async onModuleInit() {
    this.logger.log('Meeting Bot Orchestrator initialized');
    
    // Schedule bots for upcoming meetings on startup
    await this.scheduleUpcomingMeetingBots();
  }

  /**
   * Schedule bot joins for meetings starting in the next hour
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduleUpcomingMeetingBots() {
    if (!this.zoomBotService.isConfigured()) {
      return; // Skip if Zoom SDK not configured
    }

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    try {
      // Find scheduled meetings starting within the next hour
      const upcomingMeetings = await this.prisma.meetingSession.findMany({
        where: {
          status: 'SCHEDULED',
          platform: 'ZOOM',
          scheduledStart: {
            gte: now,
            lte: oneHourFromNow,
          },
        },
      });

      for (const meeting of upcomingMeetings) {
        // Skip if already scheduled
        if (this.scheduledJoins.has(meeting.id)) continue;

        // Calculate time until meeting starts (join 1 minute early)
        const joinTime = new Date(meeting.scheduledStart).getTime() - 60 * 1000;
        const delay = Math.max(0, joinTime - now.getTime());

        this.logger.log(`Scheduling bot for meeting ${meeting.id} in ${Math.round(delay / 1000)}s`);

        // Schedule the bot join
        const timeout = setTimeout(async () => {
          await this.joinMeetingWithBot(meeting.id);
          this.scheduledJoins.delete(meeting.id);
        }, delay);

        this.scheduledJoins.set(meeting.id, timeout);
      }
    } catch (error) {
      this.logger.error('Failed to schedule meeting bots', error);
    }
  }

  /**
   * Join a meeting with a bot
   */
  async joinMeetingWithBot(
    meetingSessionId: string,
    options?: { botName?: string; meetingPassword?: string }
  ): Promise<BotInstance | null> {
    try {
      const meeting = await this.prisma.meetingSession.findUnique({
        where: { id: meetingSessionId },
      });

      if (!meeting) {
        this.logger.warn(`Meeting ${meetingSessionId} not found`);
        return null;
      }

      if (meeting.platform !== 'ZOOM') {
        this.logger.warn(`Meeting ${meetingSessionId} is not a Zoom meeting`);
        return null;
      }

      // Extract meeting number from URL or use stored ID
      const meetingNumber = this.extractMeetingNumber(meeting.meetingUrl || meeting.externalMeetingId || '');
      
      if (!meetingNumber) {
        this.logger.error(`Could not extract meeting number for ${meetingSessionId}`);
        return null;
      }

      // Get password from options, metadata, or URL
      const password = options?.meetingPassword || 
                       (meeting.metadata as any)?.password || 
                       this.extractPasswordFromUrl(meeting.meetingUrl || '');

      this.logger.log(`Joining meeting ${meetingSessionId} (Zoom: ${meetingNumber}) as "${options?.botName || 'IRIS Agent'}"`);

      // Update meeting status
      await this.prisma.meetingSession.update({
        where: { id: meetingSessionId },
        data: { 
          status: 'IN_PROGRESS',
          actualStart: new Date(),
          botStatus: 'joining',
        },
      });

      // Join with bot
      const bot = await this.zoomBotService.joinMeeting({
        meetingSessionId,
        meetingNumber,
        meetingPassword: password,
        botName: options?.botName || 'IRIS Agent',
      });

      return bot;
    } catch (error) {
      this.logger.error(`Failed to join meeting ${meetingSessionId}`, error);
      
      // Update meeting status to failed
      await this.prisma.meetingSession.update({
        where: { id: meetingSessionId },
        data: { 
          status: 'FAILED',
          botStatus: 'error',
        },
      }).catch(() => {});

      return null;
    }
  }

  /**
   * Extract password from Zoom URL
   */
  private extractPasswordFromUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('pwd') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract Zoom meeting number from URL
   */
  private extractMeetingNumber(urlOrId: string): string | null {
    // Already a meeting number
    if (/^\d{9,11}$/.test(urlOrId)) {
      return urlOrId;
    }

    // Extract from Zoom URL patterns
    const patterns = [
      /zoom\.us\/j\/(\d+)/,
      /zoom\.us\/wc\/(\d+)/,
      /zoom\.us\/my\/[^?]+\?.*pmi=(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = urlOrId.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Handle bot connected event
   */
  @OnEvent('meeting.bot.connected')
  async handleBotConnected(event: MeetingBotEvent) {
    this.logger.log(`Bot ${event.botId} connected to meeting ${event.meetingSessionId}`);

    // Update meeting session
    await this.prisma.meetingSession.update({
      where: { id: event.meetingSessionId },
      data: {
        status: 'IN_PROGRESS',
        recordingStatus: 'RECORDING',
      },
    });
  }

  /**
   * Handle real-time transcription segments
   */
  @OnEvent('meeting.transcription')
  async handleTranscription(event: TranscriptionEvent) {
    try {
      // Store transcript segment in database
      await this.prisma.transcriptSegment.create({
        data: {
          meetingSessionId: event.meetingSessionId,
          speakerName: event.segment.speakerName || 'Unknown',
          text: event.segment.text,
          startTime: event.segment.startTime / 1000, // Convert ms to seconds
          endTime: event.segment.endTime / 1000,
          duration: (event.segment.endTime - event.segment.startTime) / 1000,
          confidence: event.segment.confidence,
        },
      });

      // Emit for real-time UI updates (via WebSocket)
      this.eventEmitter.emit('meeting.transcript.update', {
        meetingSessionId: event.meetingSessionId,
        segment: event.segment,
      });
    } catch (error) {
      this.logger.error(`Failed to store transcript segment for ${event.meetingSessionId}`, error);
    }
  }

  /**
   * Handle participant events
   */
  @OnEvent('meeting.participant')
  async handleParticipant(event: MeetingBotEvent & { participant: any; action: string }) {
    try {
      if (event.action === 'joined') {
        await this.prisma.meetingParticipant.create({
          data: {
            meetingSessionId: event.meetingSessionId,
            name: event.participant.name,
            email: event.participant.email,
            role: event.participant.isHost ? 'HOST' : 'PARTICIPANT',
            isInternal: false, // Could be determined from email domain
            joinedAt: new Date(),
          },
        });
      } else if (event.action === 'left') {
        await this.prisma.meetingParticipant.updateMany({
          where: {
            meetingSessionId: event.meetingSessionId,
            name: event.participant.name,
            leftAt: null,
          },
          data: {
            leftAt: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to track participant for ${event.meetingSessionId}`, error);
    }
  }

  /**
   * Handle bot leaving meeting (meeting ended)
   */
  @OnEvent('meeting.bot.left')
  async handleBotLeft(event: BotCompletionEvent) {
    this.logger.log(`Bot ${event.botId} left meeting ${event.meetingSessionId}`);

    try {
      // Compile full transcript text (handle missing segments gracefully)
      const fullTranscript = event.transcriptSegments
        ? event.transcriptSegments.map(s => s.text).join(' ')
        : '';

      // Update meeting session
      await this.prisma.meetingSession.update({
        where: { id: event.meetingSessionId },
        data: {
          status: 'COMPLETED',
          recordingStatus: 'COMPLETED',
          actualEnd: new Date(),
          duration: event.duration,
          transcriptText: fullTranscript,
        },
      });

      // Trigger AI analysis
      await this.triggerMeetingAnalysis(event.meetingSessionId, fullTranscript);
    } catch (error) {
      this.logger.error(`Failed to finalize meeting ${event.meetingSessionId}`, error);
    }
  }

  /**
   * Trigger AI analysis of meeting transcript
   * This is the main entry point for intelligent meeting processing
   */
  private async triggerMeetingAnalysis(meetingSessionId: string, transcript: string) {
    if (!transcript || transcript.trim().length < 50) {
      this.logger.warn(`Transcript too short for analysis: ${meetingSessionId}`);
      return;
    }

    this.logger.log(`Triggering intelligent AI analysis for meeting ${meetingSessionId}`);

    // Get meeting context for enriched analysis
    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: {
        lead: true,
        account: true,
        opportunity: true,
      },
    });

    // Emit event for any listeners (WebSocket notifications, etc.)
    this.eventEmitter.emit('meeting.analysis.requested', {
      meetingSessionId,
      transcript,
      crmContext: {
        leadId: meeting?.leadId,
        accountId: meeting?.accountId,
        opportunityId: meeting?.opportunityId,
      },
    });

    // The TranscriptionService handles AI analysis and CRM updates
    const analysis = await this.transcriptionService.analyzeMeetingTranscript(meetingSessionId, transcript);

    // Emit completion event with analysis results for real-time updates
    this.eventEmitter.emit('meeting.analysis.complete', {
      meetingSessionId,
      analysis,
      crmUpdates: {
        tasksCreated: analysis?.actionItems?.length || 0,
        insightsStored: (analysis?.buyingSignals?.length || 0) + (analysis?.objections?.length || 0),
        opportunityUpdated: !!meeting?.opportunityId,
        leadUpdated: !!meeting?.leadId,
      },
    });

    this.logger.log(`Meeting ${meetingSessionId} analysis complete - CRM automatically updated`);
  }

  /**
   * Manually trigger bot to join a meeting
   * Now uses Attendee service as primary, falls back to ZoomBotService
   */
  async triggerBotJoin(
    meetingSessionId: string,
    options?: { botName?: string; meetingPassword?: string }
  ): Promise<{ success: boolean; botId?: string; error?: string }> {
    try {
      // Try Attendee service first (browser-based bot)
      if (this.attendeeService.isAvailable()) {
        const meeting = await this.prisma.meetingSession.findUnique({
          where: { id: meetingSessionId },
        });

        if (!meeting) {
          return { success: false, error: 'Meeting not found' };
        }

        if (!meeting.meetingUrl && !meeting.externalMeetingId) {
          return { success: false, error: 'No meeting URL available' };
        }

        // Build meeting URL if needed
        let meetingUrl = meeting.meetingUrl || '';
        if (!meetingUrl && meeting.externalMeetingId) {
          const pwd = options?.meetingPassword || (meeting.metadata as any)?.password || '';
          meetingUrl = `https://zoom.us/j/${meeting.externalMeetingId}${pwd ? `?pwd=${pwd}` : ''}`;
        }

        if (!meetingUrl) {
          return { success: false, error: 'No meeting URL available' };
        }

        this.logger.log(`Joining meeting via Attendee: ${meetingUrl}`);

        const attendeeBot = await this.attendeeService.createBot({
          meeting_url: meetingUrl,
          bot_name: options?.botName || 'IRIS Agent',
          metadata: { meetingSessionId },
        });

        // Track the bot
        this.attendeeBots.set(meetingSessionId, attendeeBot.id);

        // Update meeting status
        await this.prisma.meetingSession.update({
          where: { id: meetingSessionId },
          data: {
            status: 'IN_PROGRESS',
            actualStart: new Date(),
            botStatus: 'joining',
            metadata: {
              ...(meeting.metadata as object || {}),
              attendeeBotId: attendeeBot.id,
            },
          },
        });

        return { success: true, botId: attendeeBot.id };
      }

      // Fall back to ZoomBotService (native SDK - may not work)
      const bot = await this.joinMeetingWithBot(meetingSessionId, options);
      
      if (bot) {
        return { success: true, botId: bot.id };
      } else {
        return { success: false, error: 'Failed to join meeting' };
      }
    } catch (error) {
      this.logger.error(`Failed to trigger bot join: ${error.message}`);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Force sync transcript from Attendee and update meeting
   */
  async forceSyncTranscript(meetingSessionId: string, botId: string): Promise<{ success: boolean; segmentCount?: number; error?: string }> {
    try {
      this.logger.log(`Force syncing transcript for meeting ${meetingSessionId} from bot ${botId}`);
      
      // Force full sync
      const segmentCount = await this.syncAttendeeTranscript(meetingSessionId, botId, true);
      
      // Get full transcript text from database
      const segments = await this.prisma.transcriptSegment.findMany({
        where: { meetingSessionId },
        orderBy: { startTime: 'asc' },
      });

      const transcriptText = segments
        .map(s => `[${s.speakerName || 'Unknown'}]: ${s.text}`)
        .join('\n');

      // Update meeting with transcript
      await this.prisma.meetingSession.update({
        where: { id: meetingSessionId },
        data: { transcriptText },
      });

      // Clear existing analysis for re-analysis
      await this.prisma.meetingInsight.deleteMany({ where: { meetingSessionId } });
      await this.prisma.meetingAnalysis.deleteMany({ where: { meetingSessionId } });

      this.logger.log(`Force sync complete: ${segmentCount} segments, ${transcriptText.length} chars`);
      
      return { success: true, segmentCount };
    } catch (error) {
      this.logger.error(`Force sync failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manually trigger bot to leave a meeting
   */
  async triggerBotLeave(meetingSessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check Attendee bot first
      const attendeeBotId = this.attendeeBots.get(meetingSessionId);
      if (attendeeBotId && this.attendeeService.isAvailable()) {
        await this.attendeeService.leaveBot(attendeeBotId);
        this.attendeeBots.delete(meetingSessionId);
        
        // Update meeting status
        await this.prisma.meetingSession.update({
          where: { id: meetingSessionId },
          data: { 
            botStatus: 'left',
            status: 'COMPLETED',
            actualEnd: new Date(),
          },
        }).catch(() => {});
        
        return { success: true };
      }

      // Fall back to ZoomBotService
      const bot = this.zoomBotService.getBotByMeetingSession(meetingSessionId);
      
      if (bot) {
        await this.zoomBotService.stopBot(bot.id);
        return { success: true };
      } else {
        return { success: false, error: 'Bot not found for meeting' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get bot status for a meeting
   */
  async getBotStatus(meetingSessionId: string): Promise<{ connected: boolean; status?: string; botId?: string; transcriptLength?: number }> {
    // Check Attendee bot first (from memory or database)
    let attendeeBotId: string | undefined = this.attendeeBots.get(meetingSessionId);
    
    // If not in memory, check database
    if (!attendeeBotId && this.attendeeService.isAvailable()) {
      const meeting = await this.prisma.meetingSession.findUnique({
        where: { id: meetingSessionId },
      });
      if (meeting?.metadata && (meeting.metadata as any).attendeeBotId) {
        attendeeBotId = String((meeting.metadata as any).attendeeBotId);
        this.attendeeBots.set(meetingSessionId, attendeeBotId);
      }
    }
    
    if (attendeeBotId && this.attendeeService.isAvailable()) {
      try {
        const bot = await this.attendeeService.getBot(attendeeBotId);
        const stateMap: Record<string, string> = {
          'joining': 'joining',
          'in_waiting_room': 'waiting',
          'in_meeting': 'connected',
          'joined_recording': 'recording',
          'ended': 'ended',
          'fatal_error': 'error',
        };
        const isConnected = ['in_meeting', 'joined_recording'].includes(bot.state);
        
        // Get transcript length if available
        let transcriptLength = 0;
        try {
          const transcript = await this.attendeeService.getTranscript(attendeeBotId);
          transcriptLength = transcript.length;
        } catch (err) {
          this.logger.warn(`Failed to get transcript length for bot ${attendeeBotId}: ${err.message}`);
        }
        
        return {
          connected: isConnected,
          status: stateMap[bot.state] || bot.state,
          botId: bot.id,
          transcriptLength,
        };
      } catch (error) {
        this.logger.warn(`Failed to get Attendee bot status: ${error.message}`);
      }
    }

    // Fall back to ZoomBotService
    const bot = this.zoomBotService.getBotByMeetingSession(meetingSessionId);
    
    if (bot) {
      return {
        connected: ['connected', 'recording'].includes(bot.status),
        status: bot.status,
        botId: bot.id,
        transcriptLength: bot.transcriptSegments.length,
      };
    }
    
    // Check database for stored bot info
    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
    });
    
    if (meeting?.metadata && (meeting.metadata as any).attendeeBotId) {
      const storedBotId = (meeting.metadata as any).attendeeBotId;
      try {
        const bot = await this.attendeeService.getBot(storedBotId);
        this.attendeeBots.set(meetingSessionId, storedBotId);
        return {
          connected: ['in_meeting', 'joined_recording'].includes(bot.state),
          status: bot.state,
          botId: bot.id,
        };
      } catch (err) {
        this.logger.warn(`Failed to get stored Attendee bot ${storedBotId}: ${err.message}`);
      }
    }
    
    return { connected: false };
  }

  /**
   * Get real-time transcript for active meeting
   */
  async getLiveTranscript(meetingSessionId: string): Promise<TranscriptSegment[]> {
    // Check Attendee bot first (from memory or database)
    let attendeeBotId: string | undefined = this.attendeeBots.get(meetingSessionId);
    
    // If not in memory, check database
    if (!attendeeBotId && this.attendeeService.isAvailable()) {
      const meeting = await this.prisma.meetingSession.findUnique({
        where: { id: meetingSessionId },
      });
      if (meeting?.metadata && (meeting.metadata as any).attendeeBotId) {
        attendeeBotId = String((meeting.metadata as any).attendeeBotId);
        this.attendeeBots.set(meetingSessionId, attendeeBotId);
      }
    }
    
    if (attendeeBotId && this.attendeeService.isAvailable()) {
      try {
        const transcript = await this.attendeeService.getTranscript(attendeeBotId);
        return transcript.map(t => ({
          text: t.transcription.transcript,
          startTime: t.timestamp_ms,
          endTime: t.timestamp_ms + t.duration_ms,
          speakerName: t.speaker_name,
        }));
      } catch (error) {
        this.logger.warn(`Failed to get Attendee transcript: ${error.message}`);
      }
    }

    // Try ZoomBotService
    const bot = this.zoomBotService.getBotByMeetingSession(meetingSessionId);
    
    if (bot) {
      return bot.transcriptSegments;
    }
    
    // Fall back to database
    const segments = await this.prisma.transcriptSegment.findMany({
      where: { meetingSessionId },
      orderBy: { startTime: 'asc' },
    });
    
    return segments.map(s => ({
      text: s.text,
      startTime: s.startTime,
      endTime: s.endTime,
      speakerName: s.speakerName,
      confidence: s.confidence || undefined,
    }));
  }

  /**
   * Poll Attendee bot status and emit events for real-time updates
   * Called periodically when there are active Attendee bots
   */
  @Cron('*/10 * * * * *') // Every 10 seconds
  async pollAttendeeBots() {
    if (!this.attendeeService.isAvailable() || this.attendeeBots.size === 0) {
      return;
    }

    for (const [meetingSessionId, botId] of this.attendeeBots.entries()) {
      try {
        const bot = await this.attendeeService.getBot(botId);
        
        // Emit bot status update
        this.eventEmitter.emit('meeting.bot.status', {
          botId,
          meetingSessionId,
          status: bot.state,
          recordingState: bot.recording_state,
          transcriptionState: bot.transcription_state,
        });

        // If bot is recording, fetch and emit new transcript segments (incremental sync)
        if (bot.state === 'joined_recording' || bot.recording_state === 'in_progress') {
          await this.syncAttendeeTranscript(meetingSessionId, botId, false).catch(err => 
            this.logger.warn(`Incremental sync failed: ${err.message}`)
          );
        }

        // If bot has ended, trigger analysis and cleanup
        if (bot.state === 'ended') {
          this.logger.log(`Attendee bot ${botId} ended for meeting ${meetingSessionId}`);
          await this.handleAttendeeBotEnded(meetingSessionId, botId);
        }
      } catch (error) {
        this.logger.warn(`Failed to poll Attendee bot ${botId}: ${error.message}`);
      }
    }
  }

  /**
   * Sync transcript from Attendee to database and emit events
   */
  private async syncAttendeeTranscript(meetingSessionId: string, botId: string, forceFullSync = false): Promise<number> {
    try {
      const transcript = await this.attendeeService.getTranscript(botId);

      if (!transcript || transcript.length === 0) {
        this.logger.warn(`No transcript available from Attendee for bot ${botId}`);
        return 0;
      }

      // Deduplicate transcript segments based on BOTH timestamp_ms AND text content
      // Attendee streaming can produce multiple segments with same text but different timestamps
      const seenTexts = new Set<string>();
      const uniqueTranscript = transcript.filter((segment) => {
        const textKey = `${segment.speaker_name}:${segment.transcription.transcript.trim()}`;
        if (seenTexts.has(textKey)) {
          return false; // Skip duplicate text
        }
        seenTexts.add(textKey);
        return true;
      });

      if (uniqueTranscript.length !== transcript.length) {
        this.logger.log(`Deduplicated transcript: ${transcript.length} -> ${uniqueTranscript.length} segments (removed ${transcript.length - uniqueTranscript.length} duplicates)`);
      }

      let segmentsToSync = uniqueTranscript;
      
      if (!forceFullSync) {
        // Get existing segments count
        const existingCount = await this.prisma.transcriptSegment.count({
          where: { meetingSessionId },
        });
        // Only process new segments
        segmentsToSync = uniqueTranscript.slice(existingCount);
      } else {
        // Force full sync - clear existing and re-sync all
        await this.prisma.transcriptSegment.deleteMany({
          where: { meetingSessionId },
        });
        this.logger.log(`Force sync: cleared existing segments for meeting ${meetingSessionId}`);
      }
      
      for (const segment of segmentsToSync) {
        // Save to database
        const duration = segment.duration_ms / 1000;
        await this.prisma.transcriptSegment.create({
          data: {
            meetingSessionId,
            text: segment.transcription.transcript,
            startTime: segment.timestamp_ms / 1000, // Convert to seconds
            endTime: (segment.timestamp_ms + segment.duration_ms) / 1000,
            duration,
            speakerName: segment.speaker_name,
          },
        });

        // Emit real-time event for WebSocket
        this.eventEmitter.emit('meeting.transcription', {
          botId,
          meetingSessionId,
          segment: {
            text: segment.transcription.transcript,
            startTime: segment.timestamp_ms,
            endTime: segment.timestamp_ms + segment.duration_ms,
            speakerName: segment.speaker_name,
          },
        });
      }

      if (segmentsToSync.length > 0) {
        this.logger.log(`Synced ${segmentsToSync.length} transcript segments for meeting ${meetingSessionId}`);
      }
      
      return segmentsToSync.length;
    } catch (error) {
      this.logger.error(`Failed to sync transcript for meeting ${meetingSessionId}: ${error.message}`);
      throw error; // Re-throw to let caller handle
    }
  }

  /**
   * Handle Attendee bot ended - save final transcript and trigger analysis
   */
  private async handleAttendeeBotEnded(meetingSessionId: string, botId: string): Promise<void> {
    try {
      this.logger.log(`Handling Attendee bot ended for meeting ${meetingSessionId}, bot ${botId}`);
      
      // Force full transcript sync to ensure we have everything
      let syncedCount = 0;
      try {
        syncedCount = await this.syncAttendeeTranscript(meetingSessionId, botId, true);
        this.logger.log(`Force synced ${syncedCount} transcript segments`);
      } catch (syncError) {
        this.logger.error(`Transcript sync failed, will retry: ${syncError.message}`);
        // Wait and retry once
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          syncedCount = await this.syncAttendeeTranscript(meetingSessionId, botId, true);
          this.logger.log(`Retry sync successful: ${syncedCount} segments`);
        } catch (retryError) {
          this.logger.error(`Transcript sync retry also failed: ${retryError.message}`);
        }
      }

      // Get full transcript text from database
      const segments = await this.prisma.transcriptSegment.findMany({
        where: { meetingSessionId },
        orderBy: { startTime: 'asc' },
      });

      const transcriptText = segments
        .map(s => `[${s.speakerName || 'Unknown'}]: ${s.text}`)
        .join('\n');
      
      this.logger.log(`Built transcript with ${segments.length} segments, ${transcriptText.length} chars`);

      // Update meeting with transcript
      await this.prisma.meetingSession.update({
        where: { id: meetingSessionId },
        data: {
          status: 'COMPLETED',
          actualEnd: new Date(),
          botStatus: 'completed',
          transcriptText,
        },
      });

      // Emit bot left event
      this.eventEmitter.emit('meeting.bot.left', {
        botId,
        meetingSessionId,
        duration: segments.length > 0 
          ? (segments[segments.length - 1].endTime - segments[0].startTime) / 1000 
          : 0,
      });

      // Clean up tracking
      this.attendeeBots.delete(meetingSessionId);

      // Only trigger analysis if we have meaningful transcript and haven't already analyzed
      if (transcriptText && transcriptText.trim().length > 50) {
        // Check if analysis already exists (avoid re-triggering)
        const existingAnalysis = await this.prisma.meetingAnalysis.findUnique({
          where: { meetingSessionId },
        });

        if (existingAnalysis) {
          this.logger.log(`Analysis already exists for meeting ${meetingSessionId}, skipping re-analysis`);
        } else {
          this.logger.log(`Triggering meeting analysis for ${meetingSessionId} with ${transcriptText.length} chars`);
          this.eventEmitter.emit('meeting.analysis.requested', {
            meetingSessionId,
            transcript: transcriptText,
          });

          // Trigger the analysis (this saves to MeetingAnalysis but does NOT auto-execute CRM updates)
          try {
            const analysis = await this.transcriptionService.analyzeMeetingTranscript(meetingSessionId, transcriptText);

            // Check if approval mode is enabled (human-in-the-loop)
            if (this.pendingActionsService.isApprovalModeEnabled()) {
              // Get user's preferred data source from settings
              const meeting = await this.prisma.meetingSession.findUnique({
                where: { id: meetingSessionId },
                include: { owner: { select: { settings: true } } },
              });

              const userSettings = meeting?.owner?.settings as any;
              const preferredDataSource = userSettings?.crmDataSource === 'salesforce'
                ? DataSourceType.SALESFORCE
                : DataSourceType.LOCAL;

              // Generate pending actions for user approval instead of auto-executing
              await this.pendingActionsService.generatePendingActions(
                meeting,
                analysis as any,
                preferredDataSource,
              );

              this.logger.log(`Generated pending actions for meeting ${meetingSessionId} - awaiting user approval`);

              // Emit event so frontend can show pending actions notification
              this.eventEmitter.emit('meeting.pending_actions.created', {
                meetingSessionId,
                actionCount: analysis?.actionItems?.length || 0,
              });
            } else {
              this.logger.log(`Approval mode disabled - CRM updates will be auto-executed by TranscriptionService`);
            }
          } catch (err) {
            this.logger.error(`Failed to analyze meeting ${meetingSessionId}: ${err.message}`);
          }
        }
      } else {
        this.logger.warn(`Transcript too short for analysis (${transcriptText.length} chars), skipping`);
      }

    } catch (error) {
      this.logger.error(`Failed to handle Attendee bot ended: ${error.message}`);
    }
  }
}

