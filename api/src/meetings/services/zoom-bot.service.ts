/**
 * Zoom Bot Service - Production-Ready Meeting SDK Integration
 * 
 * This service manages bot instances that join Zoom meetings as participants,
 * capture audio streams, and process them through Azure OpenAI Whisper for
 * real-time transcription.
 * 
 * Production Features:
 * - Connection pooling and bot instance management
 * - Automatic retry with exponential backoff
 * - Health monitoring and self-healing
 * - Graceful shutdown handling
 * - Rate limiting to prevent API abuse
 * - Comprehensive error handling and logging
 * - Resource cleanup and memory management
 * 
 * @see https://developers.zoom.us/docs/meeting-sdk/
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// ==================== INTERFACES ====================

export interface BotInstance {
  id: string;
  meetingSessionId: string;
  meetingNumber: string;
  meetingPassword?: string;
  status: BotStatus;
  process?: ChildProcess;
  audioBuffer: Buffer[];
  transcriptSegments: TranscriptSegment[];
  startTime?: Date;
  lastHealthCheck?: Date;
  error?: string;
  stats: BotStats;
  retryCount: number;
}

export type BotStatus = 
  | 'initializing' 
  | 'joining' 
  | 'connected' 
  | 'recording' 
  | 'leaving' 
  | 'disconnected' 
  | 'error'
  | 'reconnecting';

export interface BotStats {
  audioChunks: number;
  totalAudioDuration: number;
  transcriptSegments: number;
  participantCount: number;
  errors: number;
  reconnects: number;
}

export interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
  speakerName?: string;
  speakerId?: string;
  confidence?: number;
}

export interface BotJoinOptions {
  meetingSessionId: string;
  meetingNumber: string;
  meetingPassword?: string;
  botName?: string;
  joinUrl?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  duration: number;
  sampleRate: number;
  channels: number;
}

export interface BotHealthStatus {
  botId: string;
  status: BotStatus;
  uptime: number;
  lastHealthCheck: Date;
  stats: BotStats;
  healthy: boolean;
}

// ==================== CONFIGURATION ====================

interface ZoomBotConfig {
  sdkKey: string;
  sdkSecret: string;
  whisperEndpoint: string;
  whisperApiKey: string;
  whisperDeployment: string;
  maxConcurrentBots: number;
  maxRetries: number;
  retryDelayMs: number;
  healthCheckIntervalMs: number;
  audioChunkDurationMs: number;
  botTimeoutMs: number;
  enableAutoReconnect: boolean;
}

// ==================== SERVICE ====================

@Injectable()
export class ZoomBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ZoomBotService.name);
  
  // Bot instance management
  private readonly bots: Map<string, BotInstance> = new Map();
  private readonly botsByMeeting: Map<string, string> = new Map(); // meetingSessionId -> botId
  private readonly audioProcessors: Map<string, NodeJS.Timeout> = new Map();
  private readonly pendingJoins: Map<string, BotJoinOptions> = new Map();
  
  // Health monitoring
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly config: ZoomBotConfig;
  
  // Rate limiting
  private readonly joinRateLimit = new Map<string, number>(); // meetingNumber -> lastJoinAttempt
  private readonly JOIN_RATE_LIMIT_MS = 10000; // 10 seconds between join attempts

  // Audio settings
  private readonly SAMPLE_RATE = 16000;
  private readonly AUDIO_FORMAT = 'pcm_s16le';

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = {
      sdkKey: this.configService.get<string>('ZOOM_SDK_KEY') || '',
      sdkSecret: this.configService.get<string>('ZOOM_SDK_SECRET') || '',
      whisperEndpoint: this.configService.get<string>('AZURE_WHISPER_ENDPOINT') || '',
      whisperApiKey: this.configService.get<string>('AZURE_WHISPER_API_KEY') || '',
      whisperDeployment: this.configService.get<string>('AZURE_WHISPER_DEPLOYMENT') || 'whisper',
      maxConcurrentBots: parseInt(this.configService.get<string>('MAX_CONCURRENT_BOTS') || '10', 10),
      maxRetries: parseInt(this.configService.get<string>('BOT_MAX_RETRIES') || '3', 10),
      retryDelayMs: parseInt(this.configService.get<string>('BOT_RETRY_DELAY_MS') || '5000', 10),
      healthCheckIntervalMs: parseInt(this.configService.get<string>('BOT_HEALTH_CHECK_MS') || '30000', 10),
      audioChunkDurationMs: parseInt(this.configService.get<string>('AUDIO_CHUNK_DURATION_MS') || '5000', 10),
      botTimeoutMs: parseInt(this.configService.get<string>('BOT_TIMEOUT_MS') || '7200000', 10), // 2 hours
      enableAutoReconnect: this.configService.get<string>('BOT_AUTO_RECONNECT') !== 'false',
    };
  }

  async onModuleInit() {
    if (!this.isConfigured()) {
      this.logger.warn('Zoom Meeting SDK credentials not configured - bot joining will be disabled');
      return;
    }
    
    this.logger.log('Zoom Bot Service initialized', {
      maxConcurrentBots: this.config.maxConcurrentBots,
      healthCheckInterval: this.config.healthCheckIntervalMs,
    });
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Zoom Bot Service...');
    
    // Stop intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Stop all active bots gracefully
    const stopPromises = Array.from(this.bots.keys()).map(botId => 
      this.stopBot(botId).catch(err => 
        this.logger.error(`Error stopping bot ${botId}`, err)
      )
    );
    
    await Promise.all(stopPromises);
    
    this.logger.log('Zoom Bot Service shutdown complete');
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Join a Zoom meeting as a bot participant
   */
  async joinMeeting(options: BotJoinOptions): Promise<BotInstance> {
    // Validate configuration
    if (!this.isConfigured()) {
      throw new Error('Zoom SDK not configured');
    }
    
    // Check rate limit
    if (!this.checkRateLimit(options.meetingNumber)) {
      throw new Error('Rate limit exceeded - please wait before retrying');
    }
    
    // Check concurrent bot limit
    if (this.getActiveBots().length >= this.config.maxConcurrentBots) {
      throw new Error(`Maximum concurrent bots (${this.config.maxConcurrentBots}) reached`);
    }
    
    // Check if bot already exists for this meeting
    const existingBotId = this.botsByMeeting.get(options.meetingSessionId);
    if (existingBotId) {
      const existingBot = this.bots.get(existingBotId);
      if (existingBot && ['connected', 'recording', 'joining'].includes(existingBot.status)) {
        this.logger.warn(`Bot already active for meeting ${options.meetingSessionId}`);
        return existingBot;
      }
    }
    
    const botId = this.generateBotId(options.meetingSessionId);
    
    this.logger.log(`Initializing bot ${botId} for meeting ${options.meetingNumber}`);

    const bot: BotInstance = {
      id: botId,
      meetingSessionId: options.meetingSessionId,
      meetingNumber: options.meetingNumber,
      meetingPassword: options.meetingPassword,
      status: 'initializing',
      audioBuffer: [],
      transcriptSegments: [],
      retryCount: 0,
      stats: {
        audioChunks: 0,
        totalAudioDuration: 0,
        transcriptSegments: 0,
        participantCount: 0,
        errors: 0,
        reconnects: 0,
      },
    };

    this.bots.set(botId, bot);
    this.botsByMeeting.set(options.meetingSessionId, botId);
    this.joinRateLimit.set(options.meetingNumber, Date.now());

    try {
      // Generate SDK JWT for authentication
      const jwt = this.generateSDKJWT(options.meetingNumber, 0);
      
      // Start the bot process
      await this.startBotProcess(bot, jwt, options.botName || 'IRIS Meeting Agent');
      
      // Start audio processing pipeline
      this.startAudioProcessing(botId);
      
      // Emit event
      this.eventEmitter.emit('meeting.bot.joined', {
        botId,
        meetingSessionId: options.meetingSessionId,
        meetingNumber: options.meetingNumber,
      });

      return bot;
    } catch (error) {
      bot.status = 'error';
      bot.error = error.message;
      this.logger.error(`Failed to join meeting ${options.meetingNumber}`, error);
      
      // Attempt retry if enabled
      if (this.config.enableAutoReconnect && bot.retryCount < this.config.maxRetries) {
        this.scheduleRetry(options);
      }
      
      throw error;
    }
  }

  /**
   * Stop a bot and leave the meeting
   */
  async stopBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot) {
      this.logger.warn(`Bot ${botId} not found`);
      return;
    }

    this.logger.log(`Stopping bot ${botId}`);
    bot.status = 'leaving';

    // Process any remaining audio
    await this.processAudioBuffer(botId);

    // Send leave command to bot process
    if (bot.process && !bot.process.killed) {
      try {
        bot.process.send({ type: 'leave' });
        
        // Wait for graceful exit
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (bot.process && !bot.process.killed) {
              this.logger.warn(`Force killing bot ${botId}`);
              bot.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);
          
          bot.process!.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } catch (error) {
        this.logger.error(`Error stopping bot process ${botId}`, error);
        if (bot.process && !bot.process.killed) {
          bot.process.kill('SIGKILL');
        }
      }
    }

    // Emit completion event
    this.eventEmitter.emit('meeting.bot.left', {
      botId,
      meetingSessionId: bot.meetingSessionId,
      transcriptSegments: bot.transcriptSegments,
      duration: bot.startTime 
        ? Math.floor((Date.now() - bot.startTime.getTime()) / 1000 / 60)
        : 0,
      stats: bot.stats,
    });

    this.cleanupBot(botId);
  }

  /**
   * Get bot instance by ID
   */
  getBot(botId: string): BotInstance | undefined {
    return this.bots.get(botId);
  }

  /**
   * Get bot by meeting session ID
   */
  getBotByMeetingSession(meetingSessionId: string): BotInstance | undefined {
    const botId = this.botsByMeeting.get(meetingSessionId);
    return botId ? this.bots.get(botId) : undefined;
  }

  /**
   * Get all active bots
   */
  getActiveBots(): BotInstance[] {
    return Array.from(this.bots.values()).filter(
      bot => ['connected', 'recording', 'joining', 'reconnecting'].includes(bot.status)
    );
  }

  /**
   * Get transcript segments for a bot
   */
  getTranscript(botId: string): TranscriptSegment[] {
    const bot = this.bots.get(botId);
    return bot?.transcriptSegments || [];
  }

  /**
   * Get full transcript text for a bot
   */
  getFullTranscriptText(botId: string): string {
    const segments = this.getTranscript(botId);
    return segments.map(s => s.text).join(' ');
  }

  /**
   * Get health status for all bots
   */
  getHealthStatus(): BotHealthStatus[] {
    return Array.from(this.bots.values()).map(bot => ({
      botId: bot.id,
      status: bot.status,
      uptime: bot.startTime ? Date.now() - bot.startTime.getTime() : 0,
      lastHealthCheck: bot.lastHealthCheck || new Date(),
      stats: bot.stats,
      healthy: this.isBotHealthy(bot),
    }));
  }

  /**
   * Check if Zoom SDK is configured
   */
  isConfigured(): boolean {
    return !!(this.config.sdkKey && this.config.sdkSecret);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Generate unique bot ID
   */
  private generateBotId(meetingSessionId: string): string {
    const hash = crypto.createHash('md5').update(`${meetingSessionId}_${Date.now()}`).digest('hex').substring(0, 8);
    return `bot_${hash}`;
  }

  /**
   * Generate JWT token for Zoom Meeting SDK authentication
   */
  private generateSDKJWT(meetingNumber: string, role: number = 0): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 2; // 2 hours

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sdkKey: this.config.sdkKey,
      mn: meetingNumber.replace(/\s/g, ''),
      role,
      iat,
      exp,
      tokenExp: exp,
    };

    const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', this.config.sdkSecret)
      .update(`${base64Header}.${base64Payload}`)
      .digest('base64url');

    return `${base64Header}.${base64Payload}.${signature}`;
  }

  /**
   * Check rate limit for meeting joins
   */
  private checkRateLimit(meetingNumber: string): boolean {
    const lastAttempt = this.joinRateLimit.get(meetingNumber);
    if (lastAttempt && Date.now() - lastAttempt < this.JOIN_RATE_LIMIT_MS) {
      return false;
    }
    return true;
  }

  /**
   * Start the bot process
   * 
   * NOTE: The Zoom Meeting SDK for Linux requires native C++ bindings.
   * The bot-runner script handles this gracefully by falling back to webhook-based
   * cloud recording when native SDK is not available.
   * 
   * For production live meeting joining, you would need to:
   * 1. Build a C++ application using libmeetingsdk.so from Zoom Linux SDK
   * 2. Use node-addon-api to create Node.js bindings, OR
   * 3. Use a third-party service like Recall.ai, Fireflies.ai
   * 
   * The webhook-based approach (cloud recording) is Zoom's recommended method
   * for server-side meeting intelligence.
   */
  private async startBotProcess(bot: BotInstance, jwt: string, botName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const botScriptPath = path.join(__dirname, '..', 'bot-runner', 'zoom-bot-runner.js');
      
      // Verify bot runner exists
      if (!fs.existsSync(botScriptPath)) {
        reject(new Error(`Bot runner not found at ${botScriptPath}. The bot runner uses fallback mode (webhook-based cloud recording) when native SDK is unavailable.`));
        return;
      }
      
      this.logger.log('Starting bot process (will use cloud recording fallback if native SDK unavailable)');

      // Spawn the bot process
      const botProcess = spawn('node', [botScriptPath], {
        env: {
          ...process.env,
          ZOOM_SDK_KEY: this.config.sdkKey,
          ZOOM_SDK_SECRET: this.config.sdkSecret,
          ZOOM_JWT: jwt,
          MEETING_NUMBER: bot.meetingNumber,
          MEETING_PASSWORD: bot.meetingPassword || '',
          BOT_NAME: botName,
          BOT_ID: bot.id,
          AUDIO_SAMPLE_RATE: String(this.SAMPLE_RATE),
          MAX_JOIN_RETRIES: String(this.config.maxRetries),
          JOIN_RETRY_DELAY_MS: String(this.config.retryDelayMs),
          HEALTH_CHECK_INTERVAL_MS: String(this.config.healthCheckIntervalMs),
          RECONNECT_ON_ERROR: String(this.config.enableAutoReconnect),
          LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      });

      bot.process = botProcess;
      bot.status = 'joining';

      // Handle IPC messages
      botProcess.on('message', (message: any) => {
        this.handleBotMessage(bot.id, message);
      });

      // Handle stdout
      botProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.logger.debug(`[Bot ${bot.id}] ${output}`);
        }
      });

      // Handle stderr
      botProcess.stderr?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.logger.error(`[Bot ${bot.id}] ${output}`);
        }
      });

      // Handle process exit
      botProcess.on('exit', (code, signal) => {
        this.logger.log(`Bot ${bot.id} process exited`, { code, signal });
        
        if (bot.status !== 'leaving' && bot.status !== 'disconnected') {
          bot.status = code === 0 ? 'disconnected' : 'error';
          
          if (code !== 0 && this.config.enableAutoReconnect) {
            this.handleBotDisconnect(bot);
          }
        }
      });

      // Handle process errors
      botProcess.on('error', (error) => {
        this.logger.error(`Bot ${bot.id} process error`, error);
        bot.status = 'error';
        bot.error = error.message;
        bot.stats.errors++;
        reject(error);
      });

      // Wait for connection with timeout
      const connectionTimeout = setTimeout(() => {
        if (bot.status === 'joining') {
          reject(new Error('Bot connection timeout'));
        }
      }, 60000);

      const checkConnection = setInterval(() => {
        if (bot.status === 'connected' || bot.status === 'recording') {
          clearInterval(checkConnection);
          clearTimeout(connectionTimeout);
          resolve();
        } else if (bot.status === 'error') {
          clearInterval(checkConnection);
          clearTimeout(connectionTimeout);
          reject(new Error(bot.error || 'Bot failed to connect'));
        }
      }, 100);
    });
  }

  /**
   * Handle messages from bot process
   */
  private handleBotMessage(botId: string, message: any) {
    const bot = this.bots.get(botId);
    if (!bot) return;

    switch (message.type) {
      case 'status':
        this.handleStatusMessage(bot, message);
        break;

      case 'audio':
        this.handleAudioMessage(bot, message);
        break;

      case 'participant':
        this.handleParticipantMessage(bot, message);
        break;

      case 'speaker':
        this.handleSpeakerMessage(bot, message);
        break;

      case 'health':
        this.handleHealthMessage(bot, message);
        break;

      case 'error':
        this.handleErrorMessage(bot, message);
        break;
    }
  }

  private handleStatusMessage(bot: BotInstance, message: any) {
    const prevStatus = bot.status;
    bot.status = message.status;
    
    this.logger.log(`Bot ${bot.id} status: ${prevStatus} -> ${message.status}`);
    
    if (message.status === 'connected' || message.status === 'recording') {
      bot.startTime = bot.startTime || new Date();
      
      this.eventEmitter.emit('meeting.bot.connected', {
        botId: bot.id,
        meetingSessionId: bot.meetingSessionId,
      });
    }
  }

  private handleAudioMessage(bot: BotInstance, message: any) {
    const audioData = Buffer.from(message.data, 'base64');
    bot.audioBuffer.push(audioData);
    bot.stats.audioChunks++;
    bot.stats.totalAudioDuration += message.duration || 0;
    
    this.eventEmitter.emit('meeting.audio.chunk', {
      botId: bot.id,
      meetingSessionId: bot.meetingSessionId,
      chunk: {
        data: audioData,
        timestamp: message.timestamp,
        duration: message.duration,
        sampleRate: message.sampleRate || this.SAMPLE_RATE,
        channels: message.channels || 1,
      },
    });
  }

  private handleParticipantMessage(bot: BotInstance, message: any) {
    if (message.action === 'joined') {
      bot.stats.participantCount++;
    } else if (message.action === 'left') {
      bot.stats.participantCount = Math.max(0, bot.stats.participantCount - 1);
    }
    
    this.eventEmitter.emit('meeting.participant', {
      botId: bot.id,
      meetingSessionId: bot.meetingSessionId,
      participant: message.participant,
      action: message.action,
    });
  }

  private handleSpeakerMessage(bot: BotInstance, message: any) {
    this.eventEmitter.emit('meeting.speaker.changed', {
      botId: bot.id,
      meetingSessionId: bot.meetingSessionId,
      speakerName: message.speakerName,
      speakerId: message.speakerId,
    });
  }

  private handleHealthMessage(bot: BotInstance, message: any) {
    bot.lastHealthCheck = new Date();
    if (message.stats) {
      bot.stats = { ...bot.stats, ...message.stats };
    }
  }

  private handleErrorMessage(bot: BotInstance, message: any) {
    bot.stats.errors++;
    bot.error = message.error;
    this.logger.error(`Bot ${bot.id} error: ${message.error}`);
    
    this.eventEmitter.emit('meeting.bot.error', {
      botId: bot.id,
      meetingSessionId: bot.meetingSessionId,
      error: message.error,
    });
  }

  /**
   * Handle bot disconnect and attempt reconnection
   */
  private handleBotDisconnect(bot: BotInstance) {
    if (bot.retryCount >= this.config.maxRetries) {
      this.logger.warn(`Bot ${bot.id} exceeded max retries, giving up`);
      return;
    }
    
    bot.status = 'reconnecting';
    bot.retryCount++;
    bot.stats.reconnects++;
    
    const delay = this.config.retryDelayMs * Math.pow(2, bot.retryCount - 1); // Exponential backoff
    
    this.logger.log(`Scheduling reconnect for bot ${bot.id} in ${delay}ms (attempt ${bot.retryCount})`);
    
    setTimeout(async () => {
      try {
        const jwt = this.generateSDKJWT(bot.meetingNumber, 0);
        await this.startBotProcess(bot, jwt, 'IRIS Meeting Agent');
        this.logger.log(`Bot ${bot.id} reconnected successfully`);
      } catch (error) {
        this.logger.error(`Bot ${bot.id} reconnection failed`, error);
        this.handleBotDisconnect(bot);
      }
    }, delay);
  }

  /**
   * Schedule retry for failed join
   */
  private scheduleRetry(options: BotJoinOptions) {
    const key = options.meetingSessionId;
    
    if (this.pendingJoins.has(key)) {
      return; // Already scheduled
    }
    
    this.pendingJoins.set(key, options);
    
    setTimeout(async () => {
      this.pendingJoins.delete(key);
      
      try {
        await this.joinMeeting(options);
      } catch (error) {
        this.logger.error(`Retry join failed for ${options.meetingSessionId}`, error);
      }
    }, this.config.retryDelayMs);
  }

  /**
   * Start audio processing pipeline
   */
  private startAudioProcessing(botId: string) {
    const processor = setInterval(async () => {
      await this.processAudioBuffer(botId);
    }, this.config.audioChunkDurationMs);

    this.audioProcessors.set(botId, processor);
  }

  /**
   * Process accumulated audio buffer through Whisper
   */
  private async processAudioBuffer(botId: string) {
    const bot = this.bots.get(botId);
    if (!bot || bot.audioBuffer.length === 0) return;

    // Combine all buffered audio
    const audioData = Buffer.concat(bot.audioBuffer);
    bot.audioBuffer = [];

    if (audioData.length < 1000) return; // Skip if too small

    try {
      const endTime = Date.now();
      const chunkDuration = audioData.length / (this.SAMPLE_RATE * 2);
      const startTime = endTime - (chunkDuration * 1000);

      // Transcribe using Azure Whisper
      const transcription = await this.transcribeAudio(audioData);

      if (transcription && transcription.text.trim()) {
        const segment: TranscriptSegment = {
          text: transcription.text,
          startTime,
          endTime,
          confidence: transcription.confidence,
        };

        bot.transcriptSegments.push(segment);
        bot.stats.transcriptSegments++;

        this.eventEmitter.emit('meeting.transcription', {
          botId,
          meetingSessionId: bot.meetingSessionId,
          segment,
        });

        this.logger.debug(`[Bot ${botId}] Transcribed: "${segment.text.substring(0, 50)}..."`);
      }
    } catch (error) {
      this.logger.error(`Failed to process audio for bot ${botId}`, error);
      bot.stats.errors++;
    }
  }

  /**
   * Transcribe audio using Azure OpenAI Whisper
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<{ text: string; confidence?: number } | null> {
    if (!this.config.whisperEndpoint || !this.config.whisperApiKey) {
      return null;
    }

    try {
      const FormData = require('form-data');
      const axios = require('axios');

      // Create WAV buffer from raw PCM
      const wavBuffer = this.createWavBuffer(audioBuffer);

      const formData = new FormData();
      formData.append('file', wavBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav',
      });
      formData.append('response_format', 'verbose_json');

      const response = await axios.post(
        `${this.config.whisperEndpoint}/openai/deployments/${this.config.whisperDeployment}/audio/transcriptions?api-version=2024-02-01`,
        formData,
        {
          headers: {
            'api-key': this.config.whisperApiKey,
            ...formData.getHeaders(),
          },
          maxBodyLength: Infinity,
          timeout: 30000,
        },
      );

      return {
        text: response.data.text || '',
        confidence: response.data.segments?.[0]?.avg_logprob 
          ? Math.exp(response.data.segments[0].avg_logprob) 
          : undefined,
      };
    } catch (error) {
      this.logger.error('Whisper transcription failed', error);
      return null;
    }
  }

  /**
   * Create WAV file buffer from raw PCM data
   */
  private createWavBuffer(pcmData: Buffer): Buffer {
    const numChannels = 1;
    const sampleRate = this.SAMPLE_RATE;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize;

    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      for (const [botId, bot] of this.bots) {
        if (!this.isBotHealthy(bot)) {
          this.logger.warn(`Bot ${botId} health check failed`);
          
          // Emit unhealthy event
          this.eventEmitter.emit('meeting.bot.unhealthy', {
            botId,
            meetingSessionId: bot.meetingSessionId,
            status: bot.status,
            lastHealthCheck: bot.lastHealthCheck,
          });
          
          // Attempt recovery if enabled
          if (this.config.enableAutoReconnect && bot.status !== 'leaving') {
            this.handleBotDisconnect(bot);
          }
        }
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Check if bot is healthy
   */
  private isBotHealthy(bot: BotInstance): boolean {
    // Bot is not healthy if:
    // 1. Status is error
    if (bot.status === 'error') return false;
    
    // 2. No health check in last 2 intervals
    if (bot.lastHealthCheck) {
      const timeSinceLastCheck = Date.now() - bot.lastHealthCheck.getTime();
      if (timeSinceLastCheck > this.config.healthCheckIntervalMs * 2) {
        return false;
      }
    }
    
    // 3. Bot has been running too long (exceeded timeout)
    if (bot.startTime) {
      const uptime = Date.now() - bot.startTime.getTime();
      if (uptime > this.config.botTimeoutMs) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Start cleanup interval for stale bots
   */
  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      for (const [botId, bot] of this.bots) {
        // Clean up disconnected bots after 5 minutes
        if (bot.status === 'disconnected' || bot.status === 'error') {
          const timeSinceEnd = bot.lastHealthCheck 
            ? Date.now() - bot.lastHealthCheck.getTime()
            : 0;
          
          if (timeSinceEnd > 300000) { // 5 minutes
            this.logger.log(`Cleaning up stale bot ${botId}`);
            this.cleanupBot(botId);
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Clean up bot resources
   */
  private cleanupBot(botId: string) {
    const bot = this.bots.get(botId);
    
    // Stop audio processor
    const processor = this.audioProcessors.get(botId);
    if (processor) {
      clearInterval(processor);
      this.audioProcessors.delete(botId);
    }
    
    // Kill process if still running
    if (bot?.process && !bot.process.killed) {
      bot.process.kill('SIGKILL');
    }
    
    // Remove from maps
    if (bot) {
      this.botsByMeeting.delete(bot.meetingSessionId);
    }
    this.bots.delete(botId);
    
    this.logger.log(`Bot ${botId} cleaned up`);
  }
}

