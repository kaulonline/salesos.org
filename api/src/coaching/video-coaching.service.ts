/**
 * Video Coaching Service
 *
 * Handles video-based sales coaching for AI-Enabled Sales Coaching.
 * Users can record practice sessions (elevator pitches, discovery calls, demos, etc.)
 * and receive AI-powered feedback on their performance.
 *
 * Features:
 * - Video upload and processing
 * - Audio extraction and transcription via Whisper
 * - AI analysis of sales technique, tone, clarity
 * - Scenario-specific coaching feedback
 * - Progress tracking across sessions
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { ConfigService } from '@nestjs/config';
import { CoachingScenario, CoachingSessionStatus } from '@prisma/client';
import {
  CreateCoachingSessionDto,
  UpdateCoachingSessionDto,
  CoachingFeedback,
} from './dto/coaching.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Re-use the transcription service interfaces
interface TranscriptionResult {
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

@Injectable()
export class VideoCoachingService {
  private readonly logger = new Logger(VideoCoachingService.name);

  // Azure Whisper configuration (shared with TranscriptionService)
  private readonly whisperEndpoint: string;
  private readonly whisperApiKey: string;
  private readonly whisperDeployment: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropicService: AnthropicService,
    private readonly configService: ConfigService,
  ) {
    this.whisperEndpoint = this.configService.get<string>('AZURE_WHISPER_ENDPOINT') || '';
    this.whisperApiKey = this.configService.get<string>('AZURE_WHISPER_API_KEY') || '';
    this.whisperDeployment = this.configService.get<string>('AZURE_WHISPER_DEPLOYMENT') || 'whisper';
  }

  /**
   * Create a new coaching session
   */
  async createSession(
    userId: string,
    dto: CreateCoachingSessionDto,
  ): Promise<any> {
    this.logger.log(`Creating coaching session for user ${userId}, scenario: ${dto.scenario || 'GENERAL_PRACTICE'}`);

    const session = await this.prisma.coachingSession.create({
      data: {
        userId,
        title: dto.title,
        scenario: dto.scenario || CoachingScenario.GENERAL_PRACTICE,
        status: CoachingSessionStatus.RECORDING,
        opportunityId: dto.opportunityId,
        accountId: dto.accountId,
      },
    });

    return session;
  }

  /**
   * Upload and process video/audio for a coaching session
   */
  async uploadMedia(
    sessionId: string,
    userId: string,
    file: { originalname: string; buffer: Buffer; mimetype: string },
  ): Promise<any> {
    const startTime = Date.now();
    this.logger.log(`Processing media upload for session ${sessionId}`);

    // Verify session exists and belongs to user
    const session = await this.prisma.coachingSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Coaching session not found');
    }

    // Update status to uploading
    await this.prisma.coachingSession.update({
      where: { id: sessionId },
      data: { status: CoachingSessionStatus.UPLOADING },
    });

    // Save file to temp directory
    const tempDir = os.tmpdir();
    const ext = path.extname(file.originalname) || this.getExtensionFromMime(file.mimetype);
    const tempPath = path.join(tempDir, `coaching-${sessionId}${ext}`);

    try {
      fs.writeFileSync(tempPath, file.buffer);
      const fileSize = file.buffer.length;

      // Update status to transcribing
      await this.prisma.coachingSession.update({
        where: { id: sessionId },
        data: {
          status: CoachingSessionStatus.TRANSCRIBING,
          fileSize,
        },
      });

      // Extract audio and transcribe
      // For video files, we would extract audio first. For now, we'll handle
      // direct audio files or use ffmpeg for video extraction in production.
      const transcription = await this.transcribeAudioFile(tempPath);

      // Store transcription
      await this.prisma.coachingSession.update({
        where: { id: sessionId },
        data: {
          status: CoachingSessionStatus.ANALYZING,
          transcription: transcription.text,
          transcriptionSegments: transcription.segments || [],
          durationSeconds: Math.round(transcription.duration || 0),
        },
      });

      // Generate AI coaching feedback
      const feedback = await this.generateCoachingFeedback(
        session.scenario,
        transcription.text,
        transcription.segments,
      );

      const processingTime = Date.now() - startTime;

      // Update session with feedback
      const updatedSession = await this.prisma.coachingSession.update({
        where: { id: sessionId },
        data: {
          status: CoachingSessionStatus.COMPLETED,
          feedback: feedback as any,
          overallScore: feedback.scores
            ? Math.round(Object.values(feedback.scores).reduce((a, b) => a + b, 0) / Object.keys(feedback.scores).length)
            : null,
          processingTimeMs: processingTime,
        },
      });

      this.logger.log(`Coaching session ${sessionId} completed in ${processingTime}ms`);
      return updatedSession;

    } catch (error) {
      this.logger.error(`Failed to process coaching session ${sessionId}`, error);

      await this.prisma.coachingSession.update({
        where: { id: sessionId },
        data: {
          status: CoachingSessionStatus.FAILED,
          errorMessage: error.message || 'Processing failed',
        },
      });

      throw error;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  /**
   * Get a coaching session by ID
   */
  async getSession(sessionId: string, userId: string): Promise<any> {
    const session = await this.prisma.coachingSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Coaching session not found');
    }

    return session;
  }

  /**
   * List coaching sessions for a user
   */
  async listSessions(
    userId: string,
    filters?: {
      scenario?: CoachingScenario;
      status?: CoachingSessionStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ sessions: any[]; total: number }> {
    const where: any = { userId };

    if (filters?.scenario) {
      where.scenario = filters.scenario;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const [sessions, total] = await Promise.all([
      this.prisma.coachingSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
      }),
      this.prisma.coachingSession.count({ where }),
    ]);

    return { sessions, total };
  }

  /**
   * Delete a coaching session
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.coachingSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Coaching session not found');
    }

    await this.prisma.coachingSession.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Get coaching progress/stats for a user
   */
  async getProgress(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    scoresByScenario: Record<string, number>;
    recentTrend: 'improving' | 'stable' | 'declining';
    topStrengths: string[];
    focusAreas: string[];
  }> {
    const sessions = await this.prisma.coachingSession.findMany({
      where: {
        userId,
        status: CoachingSessionStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalSessions = await this.prisma.coachingSession.count({
      where: { userId },
    });

    const completedSessions = sessions.length;

    // Calculate average score
    const scores = sessions
      .filter(s => s.overallScore !== null)
      .map(s => s.overallScore as number);
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Calculate scores by scenario
    const scoresByScenario: Record<string, number> = {};
    for (const scenario of Object.values(CoachingScenario)) {
      const scenarioSessions = sessions.filter(s => s.scenario === scenario && s.overallScore !== null);
      if (scenarioSessions.length > 0) {
        scoresByScenario[scenario] = Math.round(
          scenarioSessions.reduce((a, b) => a + (b.overallScore || 0), 0) / scenarioSessions.length
        );
      }
    }

    // Calculate trend from recent sessions
    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (scores.length >= 3) {
      const recentScores = scores.slice(0, 5);
      const olderScores = scores.slice(5, 10);
      if (olderScores.length > 0) {
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
        if (recentAvg > olderAvg + 5) recentTrend = 'improving';
        else if (recentAvg < olderAvg - 5) recentTrend = 'declining';
      }
    }

    // Extract common strengths and focus areas from feedback
    const strengthsMap: Record<string, number> = {};
    const areasMap: Record<string, number> = {};

    for (const session of sessions) {
      const feedback = session.feedback as CoachingFeedback | null;
      if (feedback) {
        for (const strength of feedback.strengths || []) {
          strengthsMap[strength] = (strengthsMap[strength] || 0) + 1;
        }
        for (const area of feedback.areasForImprovement || []) {
          areasMap[area] = (areasMap[area] || 0) + 1;
        }
      }
    }

    const topStrengths = Object.entries(strengthsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([strength]) => strength);

    const focusAreas = Object.entries(areasMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area]) => area);

    return {
      totalSessions,
      completedSessions,
      averageScore,
      scoresByScenario,
      recentTrend,
      topStrengths,
      focusAreas,
    };
  }

  /**
   * Transcribe audio file using Azure Whisper
   */
  private async transcribeAudioFile(filePath: string): Promise<TranscriptionResult> {
    if (!this.whisperEndpoint || !this.whisperApiKey) {
      this.logger.warn('Azure Whisper not configured, using mock transcription');
      // Return mock for development
      return {
        text: 'This is a mock transcription for development. Please configure Azure Whisper.',
        segments: [],
        language: 'en',
        duration: 60,
      };
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
          timeout: 300000, // 5 minute timeout
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
      throw new BadRequestException('Failed to transcribe audio: ' + error.message);
    }
  }

  /**
   * Generate AI coaching feedback from transcription
   */
  private async generateCoachingFeedback(
    scenario: CoachingScenario,
    transcription: string,
    segments?: Array<{ text: string; start: number; end: number }>,
  ): Promise<CoachingFeedback> {
    const scenarioContext = this.getScenarioContext(scenario);

    const prompt = `You are an expert sales coach analyzing a sales professional's practice recording.
Provide detailed, actionable feedback to help them improve.

## Scenario
${scenarioContext.name}: ${scenarioContext.description}

## Key Evaluation Criteria for This Scenario
${scenarioContext.criteria.map(c => `- ${c}`).join('\n')}

## Transcription
${transcription}

${segments && segments.length > 0 ? `
## Timestamps
The recording was ${Math.round((segments[segments.length - 1]?.end || 0))} seconds long.
` : ''}

## Your Task
Analyze this sales practice session and provide comprehensive coaching feedback in the following JSON format:

{
  "overallAssessment": "A 2-3 sentence summary of the overall performance",
  "strengths": ["List 2-4 specific things they did well"],
  "areasForImprovement": ["List 2-4 specific areas that need work"],
  "scores": {
    "clarity": 0-100,
    "confidence": 0-100,
    "pacing": 0-100,
    "engagement": 0-100,
    "valueProposition": 0-100
    ${scenarioContext.additionalScores ? `, ${scenarioContext.additionalScores}` : ''}
  },
  "scenarioFeedback": [
    {
      "category": "Category name (e.g., Opening, Value Prop, Close)",
      "observation": "What was observed",
      "suggestion": "Specific improvement suggestion",
      "importance": "HIGH/MEDIUM/LOW"
    }
  ],
  "keyMoments": [
    {
      "timestamp": approximate_seconds_into_recording,
      "type": "STRENGTH/IMPROVEMENT/TIP",
      "text": "What happened at this moment",
      "suggestion": "Optional suggestion for improvement"
    }
  ],
  "recommendations": [
    {
      "priority": 1-5,
      "area": "Area to work on",
      "action": "Specific action to take",
      "example": "Optional example phrase or approach"
    }
  ],
  "suggestedPhrases": [
    {
      "context": "When to use this phrase",
      "original": "What they said (if applicable)",
      "improved": "Better way to phrase it"
    }
  ]
}

Be encouraging but honest. Focus on actionable, specific feedback. Score fairly - 70 is average, 80+ is good, 90+ is excellent.`;

    try {
      const response = await this.anthropicService.generateChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4096,
      });

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse coaching feedback response');
      }

      const feedback: CoachingFeedback = JSON.parse(jsonMatch[0]);
      return feedback;
    } catch (error) {
      this.logger.error('Failed to generate coaching feedback', error);
      // Return basic feedback on error
      return {
        overallAssessment: 'Unable to generate detailed feedback. Please try again.',
        strengths: ['Recording received successfully'],
        areasForImprovement: ['Analysis could not be completed'],
        scores: {
          clarity: 50,
          confidence: 50,
          pacing: 50,
          engagement: 50,
          valueProposition: 50,
        },
        scenarioFeedback: [],
        keyMoments: [],
        recommendations: [{
          priority: 1,
          area: 'Recording',
          action: 'Try recording again with better audio quality',
        }],
      };
    }
  }

  /**
   * Get scenario-specific context for coaching
   */
  private getScenarioContext(scenario: CoachingScenario): {
    name: string;
    description: string;
    criteria: string[];
    additionalScores?: string;
  } {
    const contexts: Record<CoachingScenario, {
      name: string;
      description: string;
      criteria: string[];
      additionalScores?: string;
    }> = {
      [CoachingScenario.ELEVATOR_PITCH]: {
        name: 'Elevator Pitch',
        description: 'A brief, persuasive speech to spark interest in your product or service (30-60 seconds)',
        criteria: [
          'Hook - Does it grab attention immediately?',
          'Value proposition - Is the unique value clear?',
          'Brevity - Is it concise and memorable?',
          'Call to action - Does it invite further conversation?',
        ],
      },
      [CoachingScenario.DISCOVERY_CALL]: {
        name: 'Discovery Call',
        description: 'Initial conversation to understand prospect needs, challenges, and goals',
        criteria: [
          'Question quality - Are questions open-ended and insightful?',
          'Active listening - Do they acknowledge and build on responses?',
          'Pain point identification - Are challenges clearly uncovered?',
          'Rapport building - Is there a personal connection?',
        ],
      },
      [CoachingScenario.DEMO_PRESENTATION]: {
        name: 'Product Demo',
        description: 'Demonstrating product features and benefits tailored to prospect needs',
        criteria: [
          'Personalization - Is the demo tailored to their specific needs?',
          'Feature-benefit linkage - Are features tied to business outcomes?',
          'Storytelling - Are there compelling use cases?',
          'Engagement - Is the prospect involved, not just watching?',
        ],
      },
      [CoachingScenario.OBJECTION_HANDLING]: {
        name: 'Objection Handling',
        description: 'Responding to prospect concerns and objections professionally',
        criteria: [
          'Acknowledgment - Are objections validated, not dismissed?',
          'Clarification - Are questions asked to understand the real concern?',
          'Response quality - Is the response relevant and persuasive?',
          'Confidence - Is the response delivered with conviction?',
        ],
        additionalScores: '"objectionHandling": 0-100',
      },
      [CoachingScenario.NEGOTIATION]: {
        name: 'Negotiation',
        description: 'Discussing terms, pricing, and reaching mutually beneficial agreements',
        criteria: [
          'Value defense - Is the value clearly articulated when discussing price?',
          'Win-win approach - Are creative solutions proposed?',
          'Confidence - Is pricing discussed without apologizing?',
          'Trade-offs - Are concessions exchanged strategically?',
        ],
        additionalScores: '"closingTechnique": 0-100',
      },
      [CoachingScenario.CLOSING]: {
        name: 'Closing',
        description: 'Asking for the business and moving the deal forward',
        criteria: [
          'Timing - Is the close attempted at the right moment?',
          'Directness - Is the ask clear and confident?',
          'Next steps - Are concrete actions proposed?',
          'Urgency - Is there appropriate urgency without pressure?',
        ],
        additionalScores: '"closingTechnique": 0-100',
      },
      [CoachingScenario.COLD_CALL]: {
        name: 'Cold Call',
        description: 'Initial outreach call to a prospect with no prior relationship',
        criteria: [
          'Opening hook - Does it capture attention in the first 10 seconds?',
          'Permission-based - Is permission asked to continue?',
          'Relevance - Is the reason for calling immediately clear?',
          'Objection readiness - Are early objections handled smoothly?',
        ],
        additionalScores: '"objectionHandling": 0-100',
      },
      [CoachingScenario.FOLLOW_UP]: {
        name: 'Follow-up Call',
        description: 'Reconnecting with a prospect after initial contact or meeting',
        criteria: [
          'Context setting - Is prior conversation referenced?',
          'Value addition - Is new value or information provided?',
          'Next step proposal - Are clear next steps suggested?',
          'Persistence vs. pressure - Is follow-up professional, not pushy?',
        ],
      },
      [CoachingScenario.GENERAL_PRACTICE]: {
        name: 'General Practice',
        description: 'Open-ended sales practice session',
        criteria: [
          'Communication clarity - Is the message clear and understandable?',
          'Professional tone - Is the delivery professional and confident?',
          'Value communication - Is value effectively communicated?',
          'Engagement - Is the approach engaging and conversational?',
        ],
      },
    };

    return contexts[scenario];
  }

  /**
   * Get MIME type from filename
   */
  private getAudioMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.m4a': 'audio/m4a',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
    };
    return mimeTypes[ext] || 'audio/wav';
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMime(mimeType: string): string {
    const extensions: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'video/mp4': '.mp4',
      'audio/mp4': '.m4a',
      'audio/m4a': '.m4a',
      'audio/wav': '.wav',
      'audio/webm': '.webm',
      'video/webm': '.webm',
      'audio/ogg': '.ogg',
      'audio/flac': '.flac',
    };
    return extensions[mimeType] || '.wav';
  }
}
