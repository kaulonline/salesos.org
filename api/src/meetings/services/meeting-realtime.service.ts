import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';

/**
 * Meeting Realtime Service
 *
 * Handles WebRTC-based real-time transcription for meetings using Azure OpenAI Realtime API.
 * This provides instant transcription compared to polling-based approaches.
 *
 * Architecture:
 * 1. Client establishes WebRTC connection to Azure OpenAI Realtime
 * 2. Meeting audio is streamed through WebRTC
 * 3. Azure provides instant transcription via data channel
 * 4. Transcripts are saved and emitted in real-time
 */
@Injectable()
export class MeetingRealtimeService {
  private readonly logger = new Logger(MeetingRealtimeService.name);

  // Azure OpenAI Realtime configuration
  private readonly baseEndpoint: string;
  private readonly apiKey: string;
  private readonly deploymentName: string;

  // Meeting transcription instructions (no voice response, just transcription)
  private readonly TRANSCRIPTION_INSTRUCTIONS = `You are a meeting transcription assistant. Your ONLY job is to:
1. Listen to the meeting audio
2. Provide accurate transcription with speaker identification when possible
3. DO NOT respond verbally - only transcribe

When transcribing:
- Identify different speakers as "Speaker 1", "Speaker 2", etc. or by name if mentioned
- Capture what is said accurately
- Note any unclear audio as [inaudible]
- Note non-verbal sounds like [laughter], [pause], [crosstalk] when relevant

This is a transcription-only session. Do not engage in conversation.`;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Use same Azure OpenAI Realtime configuration as mobile app (RealtimeService)
    this.baseEndpoint = this.configService.get<string>(
      'AZURE_OPENAI_REALTIME_ENDPOINT',
      'https://ai-info9026ai379805514059.openai.azure.com',
    );
    this.apiKey = this.configService.get<string>(
      'AZURE_OPENAI_REALTIME_API_KEY',
      '',
    );
    this.deploymentName = this.configService.get<string>(
      'AZURE_OPENAI_REALTIME_DEPLOYMENT',
      'gpt-realtime',
    );
  }

  /**
   * Check if WebRTC realtime is configured
   */
  isConfigured(): boolean {
    return !!(this.baseEndpoint && this.apiKey);
  }

  /**
   * Get ephemeral token for meeting transcription WebRTC session
   * This is used by clients to establish direct WebRTC connection to Azure
   */
  async getTranscriptionToken(options: {
    meetingSessionId: string;
    userId: string;
  }): Promise<{
    token: string;
    expiresAt: number;
    endpoint: string;
    sessionConfig: any;
  }> {
    const sessionsUrl = `${this.baseEndpoint}/openai/realtimeapi/sessions?api-version=2025-04-01-preview`;

    try {
      this.logger.log(`Getting transcription token for meeting ${options.meetingSessionId}`);

      // Get ephemeral key from sessions endpoint
      const response = await fetch(sessionsUrl, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.deploymentName,
          voice: 'shimmer', // Required but won't be used for transcription-only
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Sessions endpoint failed: ${response.status} - ${errorText}`);
        throw new Error(`Failed to get ephemeral token: ${response.status}`);
      }

      const data = await response.json();
      const ephemeralKey = data.client_secret?.value || data.key || data.token;

      if (!ephemeralKey) {
        throw new Error('No ephemeral key in response');
      }

      // Session config optimized for transcription (no voice output)
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'], // Need audio input for transcription
          instructions: this.TRANSCRIPTION_INSTRUCTIONS,
          voice: 'shimmer', // Required by API but output will be ignored
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.3, // Lower threshold to catch more speech
            prefix_padding_ms: 500,
            silence_duration_ms: 1000, // Longer silence for meetings
          },
          // No tools - transcription only
          tools: [],
          tool_choice: 'none',
        },
      };

      // Store the session reference for later transcript aggregation
      await this.prisma.meetingSession.update({
        where: { id: options.meetingSessionId },
        data: {
          metadata: {
            realtimeSessionActive: true,
            realtimeSessionStartedAt: new Date().toISOString(),
          },
        },
      });

      return {
        token: ephemeralKey,
        expiresAt: Date.now() + 60000, // 1 minute
        endpoint: `https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=${this.deploymentName}`,
        sessionConfig,
      };
    } catch (error) {
      this.logger.error(`Failed to get transcription token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Exchange SDP for WebRTC connection
   * Proxies the SDP exchange with Azure for enhanced security
   */
  async exchangeSDP(
    token: string,
    sdpOffer: string,
  ): Promise<{ sdpAnswer: string }> {
    const url = `https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=${this.deploymentName}`;

    try {
      this.logger.log('Exchanging SDP for meeting transcription');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
        body: sdpOffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SDP exchange failed: ${response.status} - ${errorText}`);
      }

      const sdpAnswer = await response.text();
      return { sdpAnswer };
    } catch (error) {
      this.logger.error(`SDP exchange error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process incoming transcript segment from WebRTC data channel
   * Called by the WebSocket gateway when client sends transcript data
   */
  async processTranscriptSegment(
    meetingSessionId: string,
    segment: {
      text: string;
      speakerName?: string;
      startTime: number;
      endTime: number;
      confidence?: number;
      isFinal?: boolean;
    },
  ): Promise<void> {
    try {
      // Only store final transcripts, not interim
      if (segment.isFinal !== false) {
        const startTimeSec = segment.startTime / 1000; // Convert ms to seconds
        const endTimeSec = segment.endTime / 1000;
        const duration = endTimeSec - startTimeSec;

        // Store in database
        await this.prisma.transcriptSegment.create({
          data: {
            meetingSessionId,
            text: segment.text,
            speakerName: segment.speakerName || 'Unknown',
            startTime: startTimeSec,
            endTime: endTimeSec,
            duration: duration > 0 ? duration : 0,
            confidence: segment.confidence,
          },
        });
      }

      // Emit real-time event for WebSocket broadcast
      this.eventEmitter.emit('meeting.transcript.realtime', {
        meetingSessionId,
        segment: {
          text: segment.text,
          speakerName: segment.speakerName,
          startTime: segment.startTime,
          endTime: segment.endTime,
          confidence: segment.confidence,
          isFinal: segment.isFinal,
        },
      });

      this.logger.debug(`Processed transcript segment for meeting ${meetingSessionId}`);
    } catch (error) {
      this.logger.error(`Failed to process transcript segment: ${error.message}`);
    }
  }

  /**
   * Mark realtime session as ended and compile final transcript
   */
  async endRealtimeSession(meetingSessionId: string): Promise<void> {
    try {
      // Get all transcript segments
      const segments = await this.prisma.transcriptSegment.findMany({
        where: { meetingSessionId },
        orderBy: { startTime: 'asc' },
      });

      // Compile full transcript text
      const transcriptText = segments
        .map(s => `[${s.speakerName || 'Unknown'}]: ${s.text}`)
        .join('\n');

      // Update meeting session
      await this.prisma.meetingSession.update({
        where: { id: meetingSessionId },
        data: {
          transcriptText,
          metadata: {
            realtimeSessionActive: false,
            realtimeSessionEndedAt: new Date().toISOString(),
            transcriptSegmentCount: segments.length,
          },
        },
      });

      this.logger.log(`Ended realtime session for meeting ${meetingSessionId} with ${segments.length} segments`);

      // Emit session ended event
      this.eventEmitter.emit('meeting.realtime.ended', {
        meetingSessionId,
        segmentCount: segments.length,
        transcriptLength: transcriptText.length,
      });
    } catch (error) {
      this.logger.error(`Failed to end realtime session: ${error.message}`);
    }
  }

  /**
   * Get WebRTC configuration for clients
   */
  getWebRTCConfig(): {
    iceServers: Array<{ urls: string }>;
    audioConstraints: Record<string, any>;
  } {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      audioConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1,
      },
    };
  }
}
