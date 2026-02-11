/**
 * Meeting Orchestrator Service
 * 
 * Unified service that orchestrates meeting intelligence across all platforms:
 * - Zoom
 * - Microsoft Teams  
 * - Google Meet
 * 
 * This service provides a single interface for:
 * 1. Scheduling meetings with auto-recording enabled
 * 2. Processing recordings and transcripts
 * 3. Extracting insights using Claude AI
 * 4. Updating CRM records automatically
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZoomService, ZoomRecording, ZoomTranscriptContent } from './zoom.service';
import { TeamsService, TeamsTranscriptContent } from './teams.service';
import { GoogleMeetService, GoogleMeetTranscriptEntry } from './google-meet.service';
import { MeetingAnalyzerService } from './meeting-analyzer.service';
import { CrmUpdaterService } from './crm-updater.service';
import { TranscriptProcessorService } from './transcript-processor.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { PrismaService } from '../../database/prisma.service';
import { MeetingAnalysisResultDto } from '../dto';

export type MeetingPlatform = 'zoom' | 'teams' | 'google_meet';

// Local interfaces for processed transcript data
export interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface ProcessedTranscript {
  text: string;
  segments: TranscriptSegment[];
  speakers: string[];
  totalDuration: number;
  metadata?: {
    title?: string;
    date?: Date;
    platform?: string;
  };
}

export interface CrmUpdateResult {
  activityCreated: boolean;
  tasksCreated: number;
  opportunityUpdated: boolean;
  insightsStored: number;
}

export interface ScheduleMeetingRequest {
  platform: MeetingPlatform;
  title: string;
  description?: string;
  startTime: Date;
  duration: number; // minutes
  hostEmail?: string;
  hostUserId?: string; // for Teams
  attendees?: Array<{ email: string; name?: string }>;
  enableRecording?: boolean;
  enableTranscription?: boolean;
  crmContext?: {
    opportunityId?: string;
    accountId?: string;
    leadId?: string;
    contactIds?: string[];
  };
}

export interface ScheduledMeeting {
  id: string;
  platform: MeetingPlatform;
  externalId: string;
  joinUrl: string;
  title: string;
  startTime: Date;
  endTime: Date;
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  crmContext?: ScheduleMeetingRequest['crmContext'];
}

export interface MeetingRecordingStatus {
  meetingId: string;
  platform: MeetingPlatform;
  status: 'pending' | 'recording' | 'processing' | 'ready' | 'failed';
  hasRecording: boolean;
  hasTranscript: boolean;
  recordingUrl?: string;
  transcriptUrl?: string;
  processedAt?: Date;
}

export interface ProcessMeetingResult {
  meetingId: string;
  platform: MeetingPlatform;
  transcript: ProcessedTranscript;
  analysis: MeetingAnalysisResultDto;
  crmUpdates: CrmUpdateResult;
}

export interface MeetingWebhookEvent {
  platform: MeetingPlatform;
  event: string;
  meetingId?: string;
  data?: any;
}

@Injectable()
export class MeetingOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(MeetingOrchestratorService.name);
  
  // Track pending meetings for processing
  private pendingMeetings = new Map<string, {
    platform: MeetingPlatform;
    externalId: string;
    crmContext?: ScheduleMeetingRequest['crmContext'];
  }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly zoomService: ZoomService,
    private readonly teamsService: TeamsService,
    private readonly googleMeetService: GoogleMeetService,
    private readonly analyzerService: MeetingAnalyzerService,
    private readonly crmUpdater: CrmUpdaterService,
    private readonly transcriptProcessor: TranscriptProcessorService,
    private readonly anthropic: AnthropicService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Meeting Orchestrator initialized');
    
    // Log which platforms are configured
    const platforms: string[] = [];
    if (this.configService.get('ZOOM_CLIENT_ID')) platforms.push('Zoom');
    if (this.configService.get('TEAMS_CLIENT_ID')) platforms.push('Teams');
    if (this.configService.get('GOOGLE_CLIENT_EMAIL')) platforms.push('Google Meet');
    
    if (platforms.length > 0) {
      this.logger.log(`Configured platforms: ${platforms.join(', ')}`);
    } else {
      this.logger.warn('No meeting platforms configured');
    }
  }

  /**
   * Schedule a meeting on the specified platform with recording enabled
   */
  async scheduleMeeting(request: ScheduleMeetingRequest): Promise<ScheduledMeeting> {
    this.logger.log(`Scheduling ${request.platform} meeting: ${request.title}`);

    let result: ScheduledMeeting;
    const endTime = new Date(request.startTime.getTime() + request.duration * 60 * 1000);

    switch (request.platform) {
      case 'zoom':
        result = await this.scheduleZoomMeeting(request, endTime);
        break;
      case 'teams':
        result = await this.scheduleTeamsMeeting(request, endTime);
        break;
      case 'google_meet':
        result = await this.scheduleGoogleMeeting(request, endTime);
        break;
      default:
        throw new Error(`Unsupported platform: ${request.platform}`);
    }

    // Store CRM context for later processing
    if (request.crmContext) {
      this.pendingMeetings.set(result.id, {
        platform: request.platform,
        externalId: result.externalId,
        crmContext: request.crmContext,
      });
    }

    this.logger.log(`Meeting scheduled: ${result.id} on ${result.platform}`);
    return result;
  }

  private async scheduleZoomMeeting(request: ScheduleMeetingRequest, endTime: Date): Promise<ScheduledMeeting> {
    if (!request.hostEmail) {
      throw new Error('hostEmail is required for Zoom meetings');
    }

    const meeting = await this.zoomService.createMeeting({
      topic: request.title,
      startTime: request.startTime,
      duration: request.duration,
      hostEmail: request.hostEmail,
      agenda: request.description,
      enableTranscription: request.enableTranscription !== false,
      invitees: request.attendees?.map(a => a.email),
    });

    return {
      id: `zoom_${meeting.id}`,
      platform: 'zoom',
      externalId: meeting.id.toString(),
      joinUrl: meeting.join_url,
      title: meeting.topic,
      startTime: new Date(meeting.start_time),
      endTime,
      recordingEnabled: meeting.settings.auto_recording === 'cloud',
      transcriptionEnabled: true,
      crmContext: request.crmContext,
    };
  }

  private async scheduleTeamsMeeting(request: ScheduleMeetingRequest, endTime: Date): Promise<ScheduledMeeting> {
    if (!request.hostUserId) {
      throw new Error('hostUserId is required for Teams meetings');
    }

    const meeting = await this.teamsService.createMeeting({
      subject: request.title,
      startDateTime: request.startTime,
      endDateTime: endTime,
      organizerUserId: request.hostUserId,
      attendees: request.attendees?.map(a => ({ email: a.email, displayName: a.name })),
      enableRecording: request.enableRecording !== false,
      enableTranscription: request.enableTranscription !== false,
      recordAutomatically: true,
    });

    return {
      id: `teams_${meeting.id}`,
      platform: 'teams',
      externalId: meeting.id,
      joinUrl: meeting.joinWebUrl,
      title: meeting.subject,
      startTime: new Date(meeting.startDateTime),
      endTime: new Date(meeting.endDateTime),
      recordingEnabled: meeting.recordAutomatically,
      transcriptionEnabled: meeting.allowTranscription,
      crmContext: request.crmContext,
    };
  }

  private async scheduleGoogleMeeting(request: ScheduleMeetingRequest, endTime: Date): Promise<ScheduledMeeting> {
    // Google Meet uses Calendar API for scheduling
    const event = await this.googleMeetService.createCalendarEventWithMeet({
      summary: request.title,
      startDateTime: request.startTime,
      endDateTime: endTime,
      attendees: request.attendees?.map(a => ({ email: a.email })),
    });

    const meetUrl = event.conferenceData?.entryPoints?.find(
      e => e.entryPointType === 'video'
    )?.uri || '';

    return {
      id: `google_${event.id}`,
      platform: 'google_meet',
      externalId: event.id,
      joinUrl: meetUrl,
      title: event.summary,
      startTime: new Date(event.start.dateTime),
      endTime: new Date(event.end.dateTime),
      recordingEnabled: true, // Google Meet auto-records if enabled in admin
      transcriptionEnabled: true,
      crmContext: request.crmContext,
    };
  }

  /**
   * Process a completed meeting: retrieve transcript, analyze, and update CRM
   */
  async processMeeting(
    meetingId: string,
    platform: MeetingPlatform,
    externalId: string,
    crmContext?: ScheduleMeetingRequest['crmContext'],
  ): Promise<ProcessMeetingResult> {
    this.logger.log(`Processing ${platform} meeting: ${meetingId}`);

    // Step 1: Get transcript
    let transcript: ProcessedTranscript;
    
    switch (platform) {
      case 'zoom':
        transcript = await this.processZoomMeeting(externalId);
        break;
      case 'teams':
        transcript = await this.processTeamsMeeting(externalId, crmContext);
        break;
      case 'google_meet':
        transcript = await this.processGoogleMeeting(externalId);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Step 2: Analyze transcript with Claude AI
    // Create meeting object with full context for intelligent analysis
    const meetingData = {
      id: meetingId,
      title: transcript.metadata?.title || 'Meeting',
      transcriptRaw: transcript.text,
      transcriptText: transcript.text,
      startedAt: new Date(),
      duration: transcript.totalDuration,
      opportunityId: crmContext?.opportunityId,
      accountId: crmContext?.accountId,
      leadId: crmContext?.leadId,
      userId: 'system',
      ownerId: 'system',
      participants: transcript.speakers.map(speaker => ({
        name: speaker,
        isExternal: !speaker.toLowerCase().includes('iris') && !speaker.toLowerCase().includes('agent'),
      })),
    };

    // Perform full AI analysis using the analyzer service
    this.logger.log(`Running AI analysis on transcript (${transcript.text.length} chars, ${transcript.segments.length} segments)`);
    const analysis = await this.analyzeTranscriptWithAI(transcript, crmContext);

    // Step 3: Update CRM with analysis results - use the actual meeting data
    await this.crmUpdater.updateCrmFromAnalysis(meetingData, analysis);
    
    const crmUpdates: CrmUpdateResult = {
      activityCreated: true,
      tasksCreated: analysis.actionItems?.length || 0,
      opportunityUpdated: !!crmContext?.opportunityId,
      insightsStored: (analysis.buyingSignals?.length || 0) + 
                      (analysis.objections?.length || 0) + 
                      (analysis.concerns?.length || 0),
    };

    this.logger.log(`Meeting ${meetingId} processed successfully - Created ${crmUpdates.tasksCreated} tasks, stored ${crmUpdates.insightsStored} insights`);

    return {
      meetingId,
      platform,
      transcript,
      analysis,
      crmUpdates,
    };
  }

  private async processZoomMeeting(meetingId: string): Promise<ProcessedTranscript> {
    // Get recording
    const recording = await this.zoomService.getMeetingRecordings(meetingId);
    
    if (!recording) {
      throw new Error(`No recording found for Zoom meeting ${meetingId}`);
    }

    // Try to get Zoom's built-in transcript first
    const vttTranscript = await this.zoomService.downloadTranscript(recording);
    
    if (vttTranscript) {
      // Parse VTT to structured format
      const segments = this.zoomService.parseVttTranscript(vttTranscript);
      return this.convertToProcessedTranscript(segments, recording);
    }

    // Fall back to Whisper transcription
    const audioBuffer = await this.zoomService.downloadAudio(recording);
    if (!audioBuffer) {
      throw new Error(`No audio found for Zoom meeting ${meetingId}`);
    }

    const result = await this.transcriptProcessor.transcribe(audioBuffer, {
      format: 'm4a' as 'wav' | 'mp3' | 'webm',
    });
    return this.convertTranscriptionToProcessedTranscript(result, meetingId, 'zoom');
  }

  private async processTeamsMeeting(meetingId: string, crmContext?: ScheduleMeetingRequest['crmContext']): Promise<ProcessedTranscript> {
    // Teams requires organizer user ID - resolve from pending meetings map or CRM context
    let organizerUserId = '';
    const pendingMeeting = this.pendingMeetings.get(meetingId);
    if (pendingMeeting?.crmContext?.contactIds?.[0]) {
      organizerUserId = pendingMeeting.crmContext.contactIds[0];
    } else if (crmContext?.contactIds?.[0]) {
      organizerUserId = crmContext.contactIds[0];
    } else if (crmContext?.leadId) {
      organizerUserId = crmContext.leadId;
    } else {
      this.logger.warn(`No organizer user ID found for Teams meeting ${meetingId}, transcript retrieval may fail`);
    }
    
    // Get transcripts
    const transcripts = await this.teamsService.getMeetingTranscripts(meetingId, organizerUserId);
    
    if (transcripts.length > 0) {
      // Download and parse transcript
      const vttContent = await this.teamsService.downloadTranscriptContent(
        meetingId,
        transcripts[0].id,
        organizerUserId,
      );
      
      const segments = this.teamsService.parseVttTranscript(vttContent);
      return this.convertTeamsToProcessedTranscript(segments, meetingId);
    }

    // Fall back to recording + Whisper
    const recordings = await this.teamsService.getMeetingRecordings(meetingId, organizerUserId);
    
    if (recordings.length > 0) {
      const audioBuffer = await this.teamsService.downloadRecordingContent(
        meetingId,
        recordings[0].id,
        organizerUserId,
      );
      
      const result = await this.transcriptProcessor.transcribe(audioBuffer, {
        format: 'mp3' as 'wav' | 'mp3' | 'webm',
      });
      return this.convertTranscriptionToProcessedTranscript(result, meetingId, 'teams');
    }

    throw new Error(`No transcript or recording found for Teams meeting ${meetingId}`);
  }

  private async processGoogleMeeting(conferenceId: string): Promise<ProcessedTranscript> {
    // Get transcripts
    const transcripts = await this.googleMeetService.getTranscripts(`conferenceRecords/${conferenceId}`);
    
    if (transcripts.length > 0 && transcripts[0].state === 'FILE_GENERATED') {
      // Get transcript entries
      const entries = await this.googleMeetService.getTranscriptEntries(transcripts[0].name);
      return this.convertGoogleToProcessedTranscript(entries, conferenceId);
    }

    // Fall back to recording + Whisper
    const recordings = await this.googleMeetService.getRecordings(`conferenceRecords/${conferenceId}`);
    
    if (recordings.length > 0 && recordings[0].state === 'FILE_GENERATED') {
      const audioBuffer = await this.googleMeetService.downloadRecording(recordings[0]);
      
      if (audioBuffer) {
        const result = await this.transcriptProcessor.transcribe(audioBuffer, {
          format: 'mp3' as 'wav' | 'mp3' | 'webm',
        });
        return this.convertTranscriptionToProcessedTranscript(result, conferenceId, 'google_meet');
      }
    }

    throw new Error(`No transcript or recording found for Google Meet ${conferenceId}`);
  }

  /**
   * Handle webhook events from meeting platforms
   */
  async handleWebhook(event: MeetingWebhookEvent): Promise<void> {
    this.logger.log(`Webhook received: ${event.platform} - ${event.event}`);

    switch (event.event) {
      case 'recording_ready':
      case 'transcript_ready':
        // Auto-process the meeting
        if (event.meetingId) {
          const pending = this.pendingMeetings.get(`${event.platform}_${event.meetingId}`);
          
          try {
            await this.processMeeting(
              `${event.platform}_${event.meetingId}`,
              event.platform,
              event.meetingId,
              pending?.crmContext,
            );
            
            // Clean up pending meeting
            this.pendingMeetings.delete(`${event.platform}_${event.meetingId}`);
          } catch (error) {
            this.logger.error(`Failed to process meeting ${event.meetingId}`, error);
          }
        }
        break;

      case 'meeting_ended':
        // Mark meeting as ended, wait for recording to be ready
        this.logger.log(`Meeting ended: ${event.meetingId}`);
        break;

      case 'meeting_deleted':
        // Delete the meeting from our system when it's deleted in Zoom
        if (event.meetingId) {
          this.logger.log(`Meeting deleted in Zoom: ${event.meetingId}, removing from our system`);
          try {
            // Find and delete the meeting session by external meeting ID
            const meetingSession = await this.prisma.meetingSession.findFirst({
              where: { 
                OR: [
                  { externalMeetingId: event.meetingId },
                  { externalMeetingId: event.meetingId.toString() },
                ],
                platform: 'ZOOM',
              },
            });

            if (meetingSession) {
              await this.prisma.meetingSession.delete({
                where: { id: meetingSession.id },
              });
              this.logger.log(`Deleted meeting session ${meetingSession.id} for Zoom meeting ${event.meetingId}`);
              
              // Clean up any pending meeting data
              this.pendingMeetings.delete(`zoom_${event.meetingId}`);
            } else {
              this.logger.debug(`No meeting session found for deleted Zoom meeting ${event.meetingId}`);
            }
          } catch (error) {
            this.logger.error(`Failed to delete meeting for Zoom meeting ${event.meetingId}`, error);
          }
        }
        break;

      default:
        this.logger.debug(`Unhandled webhook event: ${event.event}`);
    }
  }

  /**
   * Check recording status for a meeting
   */
  async getRecordingStatus(
    meetingId: string,
    platform: MeetingPlatform,
    externalId: string,
  ): Promise<MeetingRecordingStatus> {
    let hasRecording = false;
    let hasTranscript = false;
    let status: MeetingRecordingStatus['status'] = 'pending';

    try {
      switch (platform) {
        case 'zoom': {
          const recording = await this.zoomService.getMeetingRecordings(externalId);
          hasRecording = !!recording?.recording_files?.some(f => f.file_type === 'MP4' || f.file_type === 'M4A');
          hasTranscript = !!recording?.recording_files?.some(f => f.file_type === 'TRANSCRIPT');
          status = hasRecording ? 'ready' : 'pending';
          break;
        }

        case 'teams': {
          // Would need organizer ID
          status = 'pending';
          break;
        }

        case 'google_meet': {
          const recordings = await this.googleMeetService.getRecordings(`conferenceRecords/${externalId}`);
          const transcripts = await this.googleMeetService.getTranscripts(`conferenceRecords/${externalId}`);
          
          hasRecording = recordings.some(r => r.state === 'FILE_GENERATED');
          hasTranscript = transcripts.some(t => t.state === 'FILE_GENERATED');
          status = hasRecording ? 'ready' : recordings.length > 0 ? 'processing' : 'pending';
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get recording status for ${meetingId}`, error);
      status = 'failed';
    }

    return {
      meetingId,
      platform,
      status,
      hasRecording,
      hasTranscript,
    };
  }

  /**
   * Convert Zoom transcript to ProcessedTranscript format
   */
  private convertToProcessedTranscript(
    segments: ZoomTranscriptContent[],
    recording: ZoomRecording,
  ): ProcessedTranscript {
    const speakers = [...new Set(segments.map(s => s.speaker_name).filter(Boolean))];
    const totalDuration = segments.length > 0 
      ? segments[segments.length - 1].end_time - segments[0].start_time 
      : 0;

    return {
      text: segments.map(s => `${s.speaker_name || 'Speaker'}: ${s.text}`).join('\n'),
      segments: segments.map(s => ({
        speaker: s.speaker_name || 'Unknown',
        text: s.text,
        startTime: s.start_time,
        endTime: s.end_time,
        confidence: 1.0,
      })),
      speakers: speakers as string[],
      totalDuration,
      metadata: {
        title: recording.topic,
        date: new Date(recording.start_time),
        platform: 'zoom',
      },
    };
  }

  /**
   * Convert Teams transcript to ProcessedTranscript format
   */
  private convertTeamsToProcessedTranscript(
    segments: TeamsTranscriptContent[],
    meetingId: string,
  ): ProcessedTranscript {
    const speakers = [...new Set(segments.map(s => s.speakerName))];
    const totalDuration = segments.length > 0 
      ? segments[segments.length - 1].endTime - segments[0].startTime 
      : 0;

    return {
      text: segments.map(s => `${s.speakerName}: ${s.text}`).join('\n'),
      segments: segments.map(s => ({
        speaker: s.speakerName,
        text: s.text,
        startTime: s.startTime,
        endTime: s.endTime,
        confidence: 1.0,
      })),
      speakers,
      totalDuration,
      metadata: {
        title: `Teams Meeting ${meetingId}`,
        platform: 'teams',
      },
    };
  }

  /**
   * Convert Google Meet transcript to ProcessedTranscript format
   */
  private convertGoogleToProcessedTranscript(
    entries: GoogleMeetTranscriptEntry[],
    conferenceId: string,
  ): ProcessedTranscript {
    const speakers = [...new Set(entries.map(e => e.participant))];
    
    // Convert ISO timestamps to seconds
    const segments = entries.map(e => ({
      speaker: e.participant,
      text: e.text,
      startTime: new Date(e.startTime).getTime() / 1000,
      endTime: new Date(e.endTime).getTime() / 1000,
      confidence: 1.0,
    }));

    const totalDuration = segments.length > 0 
      ? segments[segments.length - 1].endTime - segments[0].startTime 
      : 0;

    return {
      text: entries.map(e => `${e.participant}: ${e.text}`).join('\n'),
      segments,
      speakers,
      totalDuration,
      metadata: {
        title: `Google Meet ${conferenceId}`,
        platform: 'google_meet',
      },
    };
  }

  /**
   * Convert Whisper transcription result to ProcessedTranscript format
   */
  private convertTranscriptionToProcessedTranscript(
    result: { text: string; segments: Array<{ text: string; startTime: number; endTime: number; speakerLabel?: string }>; duration: number },
    meetingId: string,
    platform: string,
  ): ProcessedTranscript {
    const speakers = [...new Set(result.segments.map(s => s.speakerLabel || 'Speaker').filter(Boolean))];

    return {
      text: result.text,
      segments: result.segments.map(s => ({
        speaker: s.speakerLabel || 'Speaker',
        text: s.text,
        startTime: s.startTime,
        endTime: s.endTime,
        confidence: 0.9,
      })),
      speakers,
      totalDuration: result.duration,
      metadata: {
        title: `${platform} Meeting ${meetingId}`,
        platform,
      },
    };
  }

  /**
   * Analyze transcript using Claude AI for intelligent insights extraction
   */
  private async analyzeTranscriptWithAI(
    transcript: ProcessedTranscript,
    crmContext?: ScheduleMeetingRequest['crmContext'],
  ): Promise<MeetingAnalysisResultDto> {
    // Build context for better analysis
    let contextInfo = `Meeting: ${transcript.metadata?.title || 'Untitled'}\n`;
    contextInfo += `Platform: ${transcript.metadata?.platform || 'Unknown'}\n`;
    contextInfo += `Duration: ${Math.round(transcript.totalDuration / 60)} minutes\n`;
    contextInfo += `Speakers: ${transcript.speakers.join(', ')}\n`;

    // Add CRM context if available
    if (crmContext?.opportunityId) {
      try {
        const opportunity = await this.prisma.opportunity.findUnique({
          where: { id: crmContext.opportunityId },
          include: { account: true },
        });
        if (opportunity) {
          contextInfo += `\nOpportunity: ${opportunity.name}\n`;
          contextInfo += `Stage: ${opportunity.stage}\n`;
          contextInfo += `Amount: $${opportunity.amount?.toLocaleString() || 'Not specified'}\n`;
          if (opportunity.account) {
            contextInfo += `Account: ${opportunity.account.name}\n`;
          }
        }
      } catch (e) {
        this.logger.warn('Failed to fetch opportunity context', e);
      }
    }

    if (crmContext?.leadId) {
      try {
        const lead = await this.prisma.lead.findUnique({
          where: { id: crmContext.leadId },
        });
        if (lead) {
          contextInfo += `\nLead: ${lead.firstName} ${lead.lastName}\n`;
          contextInfo += `Company: ${lead.company || 'Unknown'}\n`;
          contextInfo += `Title: ${lead.title || 'Unknown'}\n`;
        }
      } catch (e) {
        this.logger.warn('Failed to fetch lead context', e);
      }
    }

    const analysisPrompt = `You are an expert sales meeting analyst. Analyze this meeting transcript and extract actionable intelligence.

CONTEXT:
${contextInfo}

TRANSCRIPT:
${transcript.text}

Provide analysis in this exact JSON format:
{
  "executiveSummary": "2-3 sentence overview",
  "detailedSummary": "Detailed meeting summary",
  "keyPoints": ["Key point 1", "Key point 2"],
  "actionItems": [{"text": "Action description", "assignee": "Person name or null", "dueDate": "ISO date or null", "priority": "HIGH|MEDIUM|LOW"}],
  "decisions": ["Decision made"],
  "questions": ["Open question"],
  "concerns": ["Risk or concern identified"],
  "buyingSignals": [{"signal": "Signal description", "confidence": 0.8, "context": "Where it was mentioned"}],
  "objections": [{"objection": "Customer concern", "response": "How it was addressed or null", "resolved": true}],
  "competitors": ["Competitor names mentioned"],
  "pricingDiscussion": "Summary of pricing discussion or null",
  "budgetMentioned": 50000,
  "timelineMentioned": "Q1 2026 or null",
  "nextSteps": ["Agreed next step"],
  "recommendedActions": ["What sales rep should do next"],
  "overallSentiment": "POSITIVE",
  "customerSentiment": "POSITIVE",
  "engagementScore": 75,
  "stageRecommendation": "Negotiation" or null,
  "probabilityChange": 10 or null,
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL"
}

Be specific and extract actual names, dates, amounts when mentioned. Focus on actionable intelligence.`;

    try {
      const response = await this.anthropic.generateChatCompletion({
        messages: [{ role: 'user', content: analysisPrompt }],
        maxTokens: 4096,
        temperature: 0.3,
      });

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const analysis: MeetingAnalysisResultDto = JSON.parse(jsonMatch[0]);
      
      this.logger.log(`AI Analysis complete: ${analysis.actionItems?.length || 0} action items, ${analysis.buyingSignals?.length || 0} buying signals`);
      
      return analysis;
    } catch (error) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      
      // Return a minimal analysis if AI fails
      return {
        executiveSummary: `Meeting with ${transcript.speakers.length} participants lasted ${Math.round(transcript.totalDuration / 60)} minutes.`,
        detailedSummary: transcript.text.slice(0, 1000),
        keyPoints: transcript.speakers.map(s => `Participant: ${s}`),
        actionItems: [],
        decisions: [],
        questions: [],
        concerns: [],
        buyingSignals: [],
        objections: [],
        competitors: [],
        pricingDiscussion: undefined,
        budgetMentioned: undefined,
        timelineMentioned: undefined,
        nextSteps: ['Review meeting recording for details'],
        recommendedActions: ['Follow up with attendees'],
        overallSentiment: 'NEUTRAL',
        customerSentiment: 'NEUTRAL',
        engagementScore: 50,
        stageRecommendation: undefined,
        probabilityChange: undefined,
        riskLevel: 'LOW',
      };
    }
  }

  /**
   * Get supported platforms based on configuration
   */
  getSupportedPlatforms(): MeetingPlatform[] {
    const platforms: MeetingPlatform[] = [];
    
    if (this.configService.get('ZOOM_CLIENT_ID')) {
      platforms.push('zoom');
    }
    if (this.configService.get('TEAMS_CLIENT_ID')) {
      platforms.push('teams');
    }
    if (this.configService.get('GOOGLE_CLIENT_EMAIL')) {
      platforms.push('google_meet');
    }
    
    return platforms;
  }
}
