/**
 * Transcription Service
 * 
 * Handles audio transcription using Azure OpenAI Whisper and
 * AI-powered analysis of meeting transcripts using Claude.
 * 
 * Features:
 * - Real-time audio transcription
 * - Batch transcript processing
 * - AI analysis for summaries, action items, insights
 * - Speaker diarization (when available)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { CrmUpdaterService } from './crm-updater.service';
import * as fs from 'fs';
import * as path from 'path';

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    speaker?: string;
  }>;
  language?: string;
  duration?: number;
}

export interface MeetingAnalysisResult {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
    dueDate?: string;
    priority?: string;
  }>;
  overallSentiment?: string;
  sentimentScore?: number;
  buyingSignals: string[];
  objections: string[];
  nextSteps: string[];
  competitorMentions: string[];
  dealRiskLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dealRiskFactors: string[];
  opportunityScore?: number;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  
  // Azure Whisper configuration
  private readonly whisperEndpoint: string;
  private readonly whisperApiKey: string;
  private readonly whisperDeployment: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly anthropicService: AnthropicService,
    private readonly eventEmitter: EventEmitter2,
    private readonly crmUpdater: CrmUpdaterService,
  ) {
    this.whisperEndpoint = this.configService.get<string>('AZURE_WHISPER_ENDPOINT') || '';
    this.whisperApiKey = this.configService.get<string>('AZURE_WHISPER_API_KEY') || '';
    this.whisperDeployment = this.configService.get<string>('AZURE_WHISPER_DEPLOYMENT') || 'whisper';
  }

  /**
   * Transcribe an audio file using Azure OpenAI Whisper
   */
  async transcribeAudioFile(filePath: string): Promise<TranscriptionResult> {
    if (!this.whisperEndpoint || !this.whisperApiKey) {
      throw new Error('Azure Whisper not configured');
    }

    const FormData = require('form-data');
    const axios = require('axios');

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: this.getAudioMimeType(fileName),
      });
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', 'segment');

      const response = await axios.post(
        `${this.whisperEndpoint}/openai/deployments/${this.whisperDeployment}/audio/transcriptions?api-version=2024-02-01`,
        formData,
        {
          headers: {
            'api-key': this.whisperApiKey,
            ...formData.getHeaders(),
          },
          maxBodyLength: Infinity,
          timeout: 300000, // 5 minute timeout for long recordings
        },
      );

      return {
        text: response.data.text,
        segments: response.data.segments?.map((s: any) => ({
          text: s.text,
          start: s.start,
          end: s.end,
        })),
        language: response.data.language,
        duration: response.data.duration,
      };
    } catch (error) {
      this.logger.error('Whisper transcription failed', error);
      throw error;
    }
  }

  /**
   * Transcribe audio buffer (for real-time transcription)
   */
  async transcribeAudioBuffer(
    audioBuffer: Buffer, 
    format: 'wav' | 'mp3' | 'pcm' = 'wav'
  ): Promise<TranscriptionResult> {
    if (!this.whisperEndpoint || !this.whisperApiKey) {
      throw new Error('Azure Whisper not configured');
    }

    const FormData = require('form-data');
    const axios = require('axios');

    try {
      // Convert PCM to WAV if needed
      const wavBuffer = format === 'pcm' 
        ? this.pcmToWav(audioBuffer) 
        : audioBuffer;

      const formData = new FormData();
      formData.append('file', wavBuffer, {
        filename: `audio.${format === 'pcm' ? 'wav' : format}`,
        contentType: `audio/${format === 'pcm' ? 'wav' : format}`,
      });
      formData.append('response_format', 'verbose_json');

      const response = await axios.post(
        `${this.whisperEndpoint}/openai/deployments/${this.whisperDeployment}/audio/transcriptions?api-version=2024-02-01`,
        formData,
        {
          headers: {
            'api-key': this.whisperApiKey,
            ...formData.getHeaders(),
          },
          maxBodyLength: Infinity,
        },
      );

      return {
        text: response.data.text,
        segments: response.data.segments?.map((s: any) => ({
          text: s.text,
          start: s.start,
          end: s.end,
        })),
        language: response.data.language,
        duration: response.data.duration,
      };
    } catch (error) {
      this.logger.error('Whisper buffer transcription failed', error);
      throw error;
    }
  }

  /**
   * Convert PCM buffer to WAV format
   */
  private pcmToWav(pcmData: Buffer, sampleRate = 16000, channels = 1, bitsPerSample = 16): Buffer {
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize;

    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
  }

  /**
   * Get MIME type for audio file
   */
  private getAudioMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.m4a': 'audio/m4a',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
    };
    return mimeTypes[ext] || 'audio/wav';
  }

  /**
   * Analyze meeting transcript using Claude AI
   */
  async analyzeMeetingTranscript(
    meetingSessionId: string,
    transcript: string,
  ): Promise<MeetingAnalysisResult> {
    this.logger.log(`Analyzing transcript for meeting ${meetingSessionId}`);

    // Get meeting context
    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: {
        lead: true,
        account: true,
        opportunity: true,
      },
    });

    const contextInfo = meeting ? `
Meeting Title: ${meeting.title}
${meeting.lead ? `Lead: ${meeting.lead.firstName} ${meeting.lead.lastName} (${meeting.lead.company})` : ''}
${meeting.account ? `Account: ${meeting.account.name}` : ''}
${meeting.opportunity ? `Opportunity: ${meeting.opportunity.name} (Stage: ${meeting.opportunity.stage})` : ''}
` : '';

    const analysisPrompt = `You are an expert sales meeting analyst. Analyze the following meeting transcript and extract key insights.

${contextInfo}

TRANSCRIPT:
${transcript}

Provide a comprehensive analysis in the following JSON format:
{
  "summary": "A 2-3 paragraph executive summary of the meeting",
  "keyPoints": ["Array of key discussion points"],
  "decisions": ["Array of decisions made during the meeting"],
  "actionItems": [
    {
      "task": "Description of action item",
      "assignee": "Person responsible (if mentioned)",
      "dueDate": "Due date (if mentioned)",
      "priority": "HIGH/MEDIUM/LOW"
    }
  ],
  "overallSentiment": "POSITIVE/NEUTRAL/NEGATIVE",
  "sentimentScore": 0.0 to 1.0,
  "buyingSignals": ["Array of positive buying indicators"],
  "objections": ["Array of concerns or objections raised"],
  "nextSteps": ["Array of agreed next steps"],
  "competitorMentions": ["Array of competitor names mentioned"],
  "dealRiskLevel": "NONE/LOW/MEDIUM/HIGH/CRITICAL",
  "dealRiskFactors": ["Array of risk factors identified"],
  "opportunityScore": 0 to 100
}

Be thorough but concise. Focus on actionable insights for a sales team.`;

    try {
      const response = await this.anthropicService.generateChatCompletion({
        messages: [{ role: 'user', content: analysisPrompt }],
        maxTokens: 4096,
      });

      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse analysis response');
      }

      const analysis: MeetingAnalysisResult = JSON.parse(jsonMatch[0]);

      // Store analysis in database (upsert to handle re-analysis)
      await this.prisma.meetingAnalysis.upsert({
        where: { meetingSessionId },
        create: {
          meetingSessionId,
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          decisions: analysis.decisions,
          actionItems: analysis.actionItems as any,
          overallSentiment: analysis.overallSentiment,
          sentimentScore: analysis.sentimentScore,
          buyingSignals: analysis.buyingSignals,
          objections: analysis.objections,
          nextSteps: analysis.nextSteps,
          competitorMentions: analysis.competitorMentions,
          dealRiskLevel: analysis.dealRiskLevel as any,
          dealRiskFactors: analysis.dealRiskFactors,
          opportunityScore: analysis.opportunityScore,
        },
        update: {
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          decisions: analysis.decisions,
          actionItems: analysis.actionItems as any,
          overallSentiment: analysis.overallSentiment,
          sentimentScore: analysis.sentimentScore,
          buyingSignals: analysis.buyingSignals,
          objections: analysis.objections,
          nextSteps: analysis.nextSteps,
          competitorMentions: analysis.competitorMentions,
          dealRiskLevel: analysis.dealRiskLevel as any,
          dealRiskFactors: analysis.dealRiskFactors,
          opportunityScore: analysis.opportunityScore,
        },
      });

      // Create insights as separate records
      await this.createMeetingInsights(meetingSessionId, analysis);

      // Check if human-in-the-loop approval mode is enabled
      const requireApproval = this.configService.get('app.meetingIntelligence.requireApproval', true);

      if (requireApproval) {
        // Skip auto CRM updates - pending actions will be generated by the orchestrator
        this.logger.log(`Approval mode enabled - CRM updates will be proposed (not auto-executed) for meeting ${meetingSessionId}`);
      } else {
        // Legacy behavior: auto-execute CRM updates
        try {
          await this.crmUpdater.updateCrmFromAnalysis(meeting as any, analysis as any);
          this.logger.log(`CRM auto-updated for meeting ${meetingSessionId}`);
        } catch (crmError) {
          this.logger.warn(`Failed to auto-update CRM for meeting ${meetingSessionId}: ${crmError}`);
          // Don't fail the analysis if CRM update fails
        }
      }

      // Emit analysis complete event for WebSocket
      this.eventEmitter.emit('meeting.analysis.complete', {
        meetingSessionId,
        analysis,
      });

      this.logger.log(`Analysis complete for meeting ${meetingSessionId}`);
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze meeting ${meetingSessionId}`, error);
      throw error;
    }
  }

  /**
   * Create meeting insights from analysis
   */
  private async createMeetingInsights(
    meetingSessionId: string,
    analysis: MeetingAnalysisResult,
  ) {
    const insights: Array<{
      type: string;
      title: string;
      description: string;
      priority: string;
    }> = [];

    // Add buying signals as insights
    for (const signal of analysis.buyingSignals || []) {
      insights.push({
        type: 'BUYING_SIGNAL',
        title: 'Buying Signal Detected',
        description: signal,
        priority: 'HIGH',
      });
    }

    // Add objections as insights
    for (const objection of analysis.objections || []) {
      insights.push({
        type: 'OBJECTION',
        title: 'Objection Raised',
        description: objection,
        priority: 'HIGH',
      });
    }

    // Add risk factors as insights
    for (const risk of analysis.dealRiskFactors || []) {
      insights.push({
        type: 'RISK_ALERT',
        title: 'Deal Risk Factor',
        description: risk,
        priority: analysis.dealRiskLevel === 'HIGH' || analysis.dealRiskLevel === 'CRITICAL' 
          ? 'URGENT' 
          : 'MEDIUM',
      });
    }

    // Add competitor mentions as insights
    for (const competitor of analysis.competitorMentions || []) {
      insights.push({
        type: 'COMPETITOR_MENTION',
        title: `Competitor Mentioned: ${competitor}`,
        description: `The prospect mentioned ${competitor} during the meeting.`,
        priority: 'MEDIUM',
      });
    }

    // Batch create insights
    if (insights.length > 0) {
      await this.prisma.meetingInsight.createMany({
        data: insights.map(insight => ({
          meetingSessionId,
          type: insight.type as any,
          title: insight.title,
          description: insight.description,
          priority: insight.priority as any,
          isActioned: false,
        })),
      });
    }
  }

  /**
   * Check if transcription service is configured
   */
  isConfigured(): boolean {
    return !!(this.whisperEndpoint && this.whisperApiKey);
  }
}

