// AI Generated Code by Deloitte + Cursor (BEGIN)
/**
 * Coaching Realtime Service
 * 
 * Real-time AI coaching using Azure OpenAI Realtime API with WebRTC
 * Provides instant feedback during practice sessions instead of file upload
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { CoachingScenario } from '@prisma/client';

@Injectable()
export class CoachingRealtimeService {
  private readonly logger = new Logger(CoachingRealtimeService.name);

  // Azure OpenAI Realtime configuration
  private readonly baseEndpoint: string;
  private readonly apiKey: string;
  private readonly deploymentName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
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
   * Get ephemeral token for coaching practice WebRTC session
   */
  async getCoachingSessionToken(options: {
    sessionId: string;
    userId: string;
    scenario: CoachingScenario;
  }): Promise<{
    token: string;
    expiresAt: number;
    endpoint: string;
    sessionConfig: any;
  }> {
    const sessionsUrl = `${this.baseEndpoint}/openai/realtimeapi/sessions?api-version=2025-04-01-preview`;

    try {
      this.logger.log(`Getting realtime token for coaching session ${options.sessionId}`);

      // Get ephemeral key from sessions endpoint
      const response = await fetch(sessionsUrl, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.deploymentName,
          voice: 'alloy', // AI coach voice
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

      // Session config for real-time coaching
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: this.getScenarioInstructions(options.scenario),
          voice: 'alloy',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500, // Shorter for coaching practice
          },
          tools: [],
          tool_choice: 'none',
        },
      };

      return {
        token: ephemeralKey,
        expiresAt: Date.now() + 60000, // 1 minute
        endpoint: `https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=${this.deploymentName}`,
        sessionConfig,
      };
    } catch (error) {
      this.logger.error(`Failed to get coaching session token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get AI coach instructions based on scenario
   */
  private getScenarioInstructions(scenario: CoachingScenario): string {
    const baseInstructions = `You are an expert sales coach providing REAL-TIME feedback during a practice session.

As the user speaks, you should:
1. Listen actively to their delivery
2. Provide encouraging, constructive feedback
3. Catch issues immediately: unclear value prop, weak close, filler words, etc.
4. Give specific suggestions: "Try saying 'we help companies achieve X' instead"

Keep feedback BRIEF and ACTIONABLE - this is live coaching, not a lecture.
Interrupt politely if you hear a critical mistake that needs immediate correction.
Celebrate wins: "Great hook!", "Strong value statement!", "Perfect timing on that ask!"

`;

    const scenarioGuidance: Record<CoachingScenario, string> = {
      [CoachingScenario.ELEVATOR_PITCH]: `Scenario: ELEVATOR PITCH (30-60 seconds)
Listen for:
- Strong opening hook (first 5 seconds)
- Clear value proposition
- Specific problem solved
- Memorable call to action
- Time limit adherence (flag if over 60s)

Coach them to be concise, compelling, and confident.`,

      [CoachingScenario.OBJECTION_HANDLING]: `Scenario: OBJECTION HANDLING
Listen for:
- Acknowledgment before rebuttal ("I understand...")
- Clarifying questions ("Can you tell me more about that concern?")
- Evidence-based responses (data, case studies)
- Confidence (no apologizing for price)

Flag dismissive responses - objections should be validated first.`,

      [CoachingScenario.DISCOVERY_CALL]: `Scenario: DISCOVERY CALL
Listen for:
- Open-ended questions (What, How, Why)
- Active listening cues ("Tell me more...", "And then what?")
- Pain point identification
- Budget/timeline qualification

Coach them to ask more than they tell (70/30 listen/talk ratio).`,

      [CoachingScenario.DEMO_PRESENTATION]: `Scenario: PRODUCT DEMO
Listen for:
- Personalization to prospect needs
- Feature → Benefit translation ("This feature means you can...")
- Engagement questions throughout
- Clear next steps at end

Flag feature dumping - every feature should tie to their specific pain.`,

      [CoachingScenario.NEGOTIATION]: `Scenario: NEGOTIATION
Listen for:
- Value defense (not price defense)
- Creative solution offers
- Confidence discussing numbers
- Trade-offs, not concessions

Flag weak justifications or giving discounts too easily.`,

      [CoachingScenario.CLOSING]: `Scenario: CLOSING
Listen for:
- Direct ask ("Are you ready to move forward?")
- Trial close attempts
- Handling final objections
- Clear next steps

Coach them to be direct - no apologizing when asking for business.`,

      [CoachingScenario.COLD_CALL]: `Scenario: COLD CALL
Listen for:
- Pattern interrupt (avoid "How are you today?")
- Permission-based approach ("Do you have 27 seconds?")
- Immediate relevance (why calling)
- Strong call to action

Flag long-winded intros - get to value in 10 seconds or less.`,

      [CoachingScenario.FOLLOW_UP]: `Scenario: FOLLOW-UP CALL
Listen for:
- Reference to previous conversation
- New value added (not just "checking in")
- Specific next step proposal
- Professional persistence

Flag weak "just following up" language - always bring new value.`,

      [CoachingScenario.GENERAL_PRACTICE]: `Scenario: GENERAL SALES PRACTICE
Listen for:
- Clarity and confidence
- Professional tone
- Value communication
- Natural, conversational style

Provide general sales coaching on any technique you observe.`,
    };

    return baseInstructions + (scenarioGuidance[scenario] || scenarioGuidance[CoachingScenario.GENERAL_PRACTICE]);
  }

  /**
   * Save real-time coaching session results
   */
  async saveRealtimeSession(
    sessionId: string,
    userId: string,
    data: {
      transcript: string;
      duration: number;
      liveFeedback: string[];
    },
  ): Promise<void> {
    try {
      await this.prisma.coachingSession.update({
        where: { id: sessionId },
        data: {
          transcription: data.transcript,
          durationSeconds: Math.round(data.duration / 1000),
          status: 'COMPLETED',
          feedback: {
            liveCoachingNotes: data.liveFeedback,
            sessionType: 'realtime',
          } as any,
        },
      });

      this.logger.log(`Saved realtime coaching session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to save realtime session: ${error.message}`, error.stack);
      throw error;
    }
  }
}
// AI Generated Code by Deloitte + Cursor (END)
