/**
 * Meeting WebSocket Gateway
 * 
 * Provides real-time streaming of meeting transcripts and events to connected clients.
 * Uses Socket.IO for reliable bidirectional communication.
 * 
 * Features:
 * - Real-time transcript streaming
 * - Meeting status updates
 * - Participant join/leave notifications
 * - Active speaker tracking
 * - Connection management with rooms
 * - Redis adapter support for horizontal scaling
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

interface ClientSubscription {
  clientId: string;
  meetingSessionId: string;
  subscribedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/ws/meetings',
  transports: ['websocket', 'polling'],
})
export class MeetingWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MeetingWebSocketGateway.name);
  private readonly subscriptions: Map<string, ClientSubscription[]> = new Map();

  /**
   * Initialize WebSocket server with optional Redis adapter for horizontal scaling
   * Redis adapter enables WebSocket events to be broadcast across multiple server instances
   */
  async afterInit(server: Server) {
    this.logger.log('Meeting WebSocket Gateway initializing...');

    // Check if Redis is configured for WebSocket scaling
    const useRedis = process.env.USE_REDIS === 'true';
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');

    if (useRedis) {
      try {
        const pubClient = createClient({
          socket: { host: redisHost, port: redisPort },
          password: process.env.REDIS_PASSWORD || undefined,
        });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        server.adapter(createAdapter(pubClient, subClient));
        this.logger.log(`WebSocket Redis adapter connected to ${redisHost}:${redisPort}`);
      } catch (error) {
        this.logger.warn(`Failed to connect Redis adapter: ${error.message}. Using in-memory adapter.`);
      }
    } else {
      this.logger.log('WebSocket using in-memory adapter (set USE_REDIS=true for distributed scaling)');
    }

    this.logger.log('Meeting WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Send connection acknowledgment
    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up subscriptions
    for (const [meetingId, subs] of this.subscriptions) {
      const filtered = subs.filter(s => s.clientId !== client.id);
      if (filtered.length === 0) {
        this.subscriptions.delete(meetingId);
      } else {
        this.subscriptions.set(meetingId, filtered);
      }
    }
  }

  /**
   * Subscribe to meeting updates
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingSessionId: string },
  ) {
    const { meetingSessionId } = data;
    
    if (!meetingSessionId) {
      return { error: 'meetingSessionId is required' };
    }
    
    // Join the room
    client.join(`meeting:${meetingSessionId}`);
    
    // Track subscription
    const subs = this.subscriptions.get(meetingSessionId) || [];
    subs.push({
      clientId: client.id,
      meetingSessionId,
      subscribedAt: new Date(),
    });
    this.subscriptions.set(meetingSessionId, subs);
    
    this.logger.log(`Client ${client.id} subscribed to meeting ${meetingSessionId}`);
    
    return {
      success: true,
      meetingSessionId,
      subscribedAt: new Date().toISOString(),
    };
  }

  /**
   * Unsubscribe from meeting updates
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingSessionId: string },
  ) {
    const { meetingSessionId } = data;
    
    // Leave the room
    client.leave(`meeting:${meetingSessionId}`);
    
    // Remove subscription
    const subs = this.subscriptions.get(meetingSessionId) || [];
    const filtered = subs.filter(s => s.clientId !== client.id);
    if (filtered.length === 0) {
      this.subscriptions.delete(meetingSessionId);
    } else {
      this.subscriptions.set(meetingSessionId, filtered);
    }
    
    this.logger.log(`Client ${client.id} unsubscribed from meeting ${meetingSessionId}`);
    
    return { success: true };
  }

  /**
   * Get current subscribers count for a meeting
   */
  @SubscribeMessage('getSubscribers')
  handleGetSubscribers(
    @MessageBody() data: { meetingSessionId: string },
  ) {
    const subs = this.subscriptions.get(data.meetingSessionId) || [];
    return { count: subs.length };
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle real-time transcription events
   */
  @OnEvent('meeting.transcription')
  handleTranscription(payload: {
    botId: string;
    meetingSessionId: string;
    segment: {
      text: string;
      startTime: number;
      endTime: number;
      speakerName?: string;
      confidence?: number;
    };
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('transcription', {
      meetingSessionId: payload.meetingSessionId,
      segment: payload.segment,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle transcript updates (for stored segments)
   */
  @OnEvent('meeting.transcript.update')
  handleTranscriptUpdate(payload: {
    meetingSessionId: string;
    segment: any;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('transcript_update', {
      meetingSessionId: payload.meetingSessionId,
      segment: payload.segment,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle bot connected event
   */
  @OnEvent('meeting.bot.connected')
  handleBotConnected(payload: {
    botId: string;
    meetingSessionId: string;
    mode?: string;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('bot_connected', {
      meetingSessionId: payload.meetingSessionId,
      botId: payload.botId,
      mode: payload.mode,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle bot left event
   */
  @OnEvent('meeting.bot.left')
  handleBotLeft(payload: {
    botId: string;
    meetingSessionId: string;
    duration: number;
    stats?: any;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('bot_left', {
      meetingSessionId: payload.meetingSessionId,
      botId: payload.botId,
      duration: payload.duration,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle bot error event
   */
  @OnEvent('meeting.bot.error')
  handleBotError(payload: {
    botId: string;
    meetingSessionId: string;
    error: string;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('bot_error', {
      meetingSessionId: payload.meetingSessionId,
      botId: payload.botId,
      error: payload.error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle participant events
   */
  @OnEvent('meeting.participant')
  handleParticipant(payload: {
    botId: string;
    meetingSessionId: string;
    participant: any;
    action: 'joined' | 'left';
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('participant', {
      meetingSessionId: payload.meetingSessionId,
      participant: payload.participant,
      action: payload.action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle speaker change events
   */
  @OnEvent('meeting.speaker.changed')
  handleSpeakerChanged(payload: {
    botId: string;
    meetingSessionId: string;
    speakerName: string;
    speakerId: string;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('speaker_changed', {
      meetingSessionId: payload.meetingSessionId,
      speakerName: payload.speakerName,
      speakerId: payload.speakerId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle analysis complete event
   */
  @OnEvent('meeting.analysis.complete')
  handleAnalysisComplete(payload: {
    meetingSessionId: string;
    analysis: any;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('analysis_complete', {
      meetingSessionId: payload.meetingSessionId,
      analysis: payload.analysis,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle WebRTC real-time transcript segment
   * This comes from the MeetingRealtimeService when using Azure OpenAI Realtime API
   */
  @OnEvent('meeting.transcript.realtime')
  handleRealtimeTranscript(payload: {
    meetingSessionId: string;
    segment: {
      text: string;
      speakerName?: string;
      startTime: number;
      endTime: number;
      confidence?: number;
      isFinal?: boolean;
    };
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('realtime_transcript', {
      meetingSessionId: payload.meetingSessionId,
      segment: payload.segment,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle WebRTC realtime session ended event
   */
  @OnEvent('meeting.realtime.ended')
  handleRealtimeEnded(payload: {
    meetingSessionId: string;
    segmentCount: number;
    transcriptLength: number;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('realtime_session_ended', {
      meetingSessionId: payload.meetingSessionId,
      segmentCount: payload.segmentCount,
      transcriptLength: payload.transcriptLength,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle pending actions created event (human-in-the-loop approval)
   */
  @OnEvent('meeting.pending_actions.created')
  handlePendingActionsCreated(payload: {
    meetingSessionId: string;
    actionCount: number;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('pending_actions_created', {
      meetingSessionId: payload.meetingSessionId,
      actionCount: payload.actionCount,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle bot status update (from Attendee polling)
   */
  @OnEvent('meeting.bot.status')
  handleBotStatus(payload: {
    botId: string;
    meetingSessionId: string;
    status: string;
    recordingState?: string;
    transcriptionState?: string;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('bot_status', {
      meetingSessionId: payload.meetingSessionId,
      botId: payload.botId,
      status: payload.status,
      recordingState: payload.recordingState,
      transcriptionState: payload.transcriptionState,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle bot unhealthy event
   */
  @OnEvent('meeting.bot.unhealthy')
  handleBotUnhealthy(payload: {
    botId: string;
    meetingSessionId: string;
    status: string;
    lastHealthCheck: Date;
  }) {
    this.server.to(`meeting:${payload.meetingSessionId}`).emit('bot_unhealthy', {
      meetingSessionId: payload.meetingSessionId,
      botId: payload.botId,
      status: payload.status,
      lastHealthCheck: payload.lastHealthCheck,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Broadcast to all subscribers of a meeting
   */
  broadcastToMeeting(meetingSessionId: string, event: string, data: any) {
    this.server.to(`meeting:${meetingSessionId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get subscriber count for a meeting
   */
  getSubscriberCount(meetingSessionId: string): number {
    return this.subscriptions.get(meetingSessionId)?.length || 0;
  }

  /**
   * Check if meeting has subscribers
   */
  hasSubscribers(meetingSessionId: string): boolean {
    return this.getSubscriberCount(meetingSessionId) > 0;
  }
}

