import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnthropicService } from '../../anthropic/anthropic.service';

export interface PlaybookStep {
  id: string;
  name: string;
  order: number;
  description?: string;
}

export interface StepAnalysis {
  stepId: string;
  stepName: string;
  executed: boolean;
  quality: number; // 0-100
  timestamp?: string;
  feedback: string;
  keyPhrases: string[];
}

export interface PlaybookAlignmentResult {
  sessionId: string;
  playbookId: string;
  playbookName: string;
  overallScore: number;
  stepAnalysis: StepAnalysis[];
  strengths: string[];
  improvements: string[];
  coachingRecommendations: string[];
  analyzedAt: Date;
}

export interface KeyMoment {
  id: string;
  timestamp: string;
  type: 'positive' | 'opportunity' | 'critical';
  title: string;
  description: string;
  transcript?: string;
}

export interface SessionComparison {
  session1Id: string;
  session2Id: string;
  session1Score: number;
  session2Score: number;
  improvement: number;
  areasImproved: string[];
  areasDeclined: string[];
  areasToFocus: string[];
  insights: string;
}

@Injectable()
export class CoachingSessionsService {
  private readonly logger = new Logger(CoachingSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  /**
   * Analyze a coaching session against a playbook
   */
  async analyzePlaybookAlignment(
    sessionId: string,
    userId: string,
    playbookId?: string,
  ): Promise<PlaybookAlignmentResult> {
    // Get the coaching session (from video coaching module)
    const session = await this.prisma.coachingSession.findFirst({
      where: {
        id: sessionId,
        userId, // User can only analyze their own sessions
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Get playbook (or use default)
    let playbook: any;
    if (playbookId) {
      playbook = await this.prisma.playbook.findUnique({
        where: { id: playbookId },
        include: {
          steps: { orderBy: { order: 'asc' } },
        },
      });
    }

    // If no playbook specified or found, use a default framework
    if (!playbook) {
      playbook = this.getDefaultPlaybook();
    }

    // Analyze the session using AI
    const analysis = await this.performPlaybookAnalysis(session, playbook);

    // Store the analysis result (upsert to avoid duplicates)
    await this.prisma.playbookAnalysis.upsert({
      where: { coachingSessionId: sessionId },
      update: {
        playbookId: playbook.id,
        overallScore: analysis.overallScore,
        stepAnalysis: analysis.stepAnalysis as any,
        keyPhraseUsage: {},
        strengths: analysis.strengths,
        gaps: analysis.improvements,
        coachingRecommendations: analysis.coachingRecommendations as any,
      },
      create: {
        coachingSessionId: sessionId,
        playbookId: playbook.id,
        overallScore: analysis.overallScore,
        stepAnalysis: analysis.stepAnalysis as any,
        keyPhraseUsage: {},
        strengths: analysis.strengths,
        gaps: analysis.improvements,
        coachingRecommendations: analysis.coachingRecommendations as any,
      },
    });

    return {
      sessionId,
      playbookId: playbook.id,
      playbookName: playbook.name,
      overallScore: analysis.overallScore,
      stepAnalysis: analysis.stepAnalysis,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      coachingRecommendations: analysis.coachingRecommendations,
      analyzedAt: new Date(),
    };
  }

  /**
   * Get key moments from a coaching session
   */
  async getSessionKeyMoments(sessionId: string, userId: string): Promise<KeyMoment[]> {
    const session = await this.prisma.coachingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Check if we have cached key moments
    const existingAnalysis = await this.prisma.playbookAnalysis.findFirst({
      where: { coachingSessionId: sessionId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingAnalysis?.stepAnalysis) {
      // Extract key moments from existing analysis
      return this.extractKeyMomentsFromAnalysis(existingAnalysis, sessionId);
    }

    // Generate key moments using AI
    return this.generateKeyMoments(session);
  }

  /**
   * Compare two coaching sessions
   */
  async compareSessions(
    session1Id: string,
    session2Id: string,
    userId: string,
  ): Promise<SessionComparison> {
    const [session1, session2] = await Promise.all([
      this.prisma.coachingSession.findFirst({
        where: {
          id: session1Id,
          userId,
        },
      }),
      this.prisma.coachingSession.findFirst({
        where: {
          id: session2Id,
          userId,
        },
      }),
    ]);

    if (!session1 || !session2) {
      throw new NotFoundException('One or both sessions not found');
    }

    // Get analyses for both sessions
    const [analysis1, analysis2] = await Promise.all([
      this.prisma.playbookAnalysis.findFirst({
        where: { coachingSessionId: session1Id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.playbookAnalysis.findFirst({
        where: { coachingSessionId: session2Id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const score1 = analysis1?.overallScore ?? this.calculateSessionScore(session1);
    const score2 = analysis2?.overallScore ?? this.calculateSessionScore(session2);

    // Use AI to generate comparison insights
    const comparison = await this.generateSessionComparison(
      session1,
      session2,
      analysis1,
      analysis2,
    );

    return {
      session1Id,
      session2Id,
      session1Score: score1,
      session2Score: score2,
      improvement: score2 - score1,
      areasImproved: comparison.areasImproved,
      areasDeclined: comparison.areasDeclined,
      areasToFocus: comparison.areasToFocus,
      insights: comparison.insights,
    };
  }

  /**
   * Perform AI-powered playbook analysis
   */
  private async performPlaybookAnalysis(
    session: any,
    playbook: any,
  ): Promise<{
    overallScore: number;
    stepAnalysis: StepAnalysis[];
    strengths: string[];
    improvements: string[];
    coachingRecommendations: string[];
  }> {
    const prompt = `
## Coaching Session Analysis

### Session Details
- Type: ${session.scenario || 'GENERAL_PRACTICE'}
- Duration: ${session.durationSeconds || 'Unknown'} seconds
- Transcript available: ${session.transcription ? 'Yes' : 'No'}

### Playbook: ${playbook.name}
Steps to analyze:
${playbook.steps.map((s: any, i: number) => `${i + 1}. ${s.name}: ${s.description || 'No description'}`).join('\n')}

### Session Transcript/Summary
${session.transcription || 'No transcript available - analyze based on feedback scores'}

### Feedback Scores (if available)
${session.feedback ? JSON.stringify(session.feedback, null, 2) : 'No detailed feedback available'}
${session.overallScore ? `Overall Score: ${session.overallScore}` : ''}

---

Analyze this coaching session against the playbook steps. For each step, determine:
1. Was it executed? (true/false)
2. Quality score (0-100)
3. Key timestamp if identifiable
4. Specific feedback
5. Key phrases that indicate execution

Also provide:
- Overall score (0-100)
- Top 3 strengths
- Top 3 areas for improvement
- 3 specific coaching recommendations

Respond in JSON format with this structure:
{
  "overallScore": number,
  "stepAnalysis": [
    {
      "stepId": "string",
      "stepName": "string",
      "executed": boolean,
      "quality": number,
      "timestamp": "string or null",
      "feedback": "string",
      "keyPhrases": ["string"]
    }
  ],
  "strengths": ["string"],
  "improvements": ["string"],
  "coachingRecommendations": ["string"]
}
`;

    try {
      const response = await this.anthropic.generateChatCompletion({
        messages: [
          {
            role: 'system',
            content: `You are an expert sales coach analyzing coaching sessions against proven playbooks.
                     Be specific and actionable in your feedback.
                     Always respond with valid JSON matching the requested format.`,
          },
          { role: 'user', content: prompt },
        ],
        maxTokens: 2000,
      });

      const parsed = JSON.parse(response);
      return {
        overallScore: parsed.overallScore || 50,
        stepAnalysis: parsed.stepAnalysis || [],
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        coachingRecommendations: parsed.coachingRecommendations || [],
      };
    } catch (error) {
      this.logger.error('Failed to analyze session:', error);
      // Return default analysis
      return {
        overallScore: 50,
        stepAnalysis: playbook.steps.map((s: any) => ({
          stepId: s.id,
          stepName: s.name,
          executed: false,
          quality: 50,
          feedback: 'Analysis unavailable',
          keyPhrases: [],
        })),
        strengths: ['Session completed'],
        improvements: ['Review playbook alignment'],
        coachingRecommendations: ['Practice with the playbook framework'],
      };
    }
  }

  /**
   * Generate key moments from a session
   */
  private async generateKeyMoments(session: any): Promise<KeyMoment[]> {
    if (!session.transcription && !session.feedback) {
      // Return generic moments based on session data
      return [
        {
          id: `km_${session.id}_1`,
          timestamp: '0:00',
          type: 'positive',
          title: 'Session Started',
          description: 'Practice session initiated',
        },
        {
          id: `km_${session.id}_2`,
          timestamp: `${Math.floor((session.durationSeconds || 60) / 2)}:00`,
          type: 'opportunity',
          title: 'Mid-session checkpoint',
          description: 'Review pacing and engagement',
        },
      ];
    }

    const prompt = `
## Extract Key Moments

Analyze this coaching session and identify 3-5 key moments:

### Session Info
- Type: ${session.scenario || 'GENERAL_PRACTICE'}
- Duration: ${session.durationSeconds || 'Unknown'} seconds

### Content
${session.transcription || JSON.stringify(session.feedback)}

---

Identify key moments with:
- timestamp (format: "M:SS")
- type: "positive" (good technique), "opportunity" (area to improve), or "critical" (important moment)
- title: Short title (5-7 words)
- description: What happened and why it matters

Respond in JSON array format.
`;

    try {
      const response = await this.anthropic.generateChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are a sales coaching expert identifying key learning moments from sessions. Respond with valid JSON array only.',
          },
          { role: 'user', content: prompt },
        ],
        maxTokens: 1000,
      });

      const moments = JSON.parse(response);
      return moments.map((m: any, i: number) => ({
        id: `km_${session.id}_${i}`,
        timestamp: m.timestamp || '0:00',
        type: m.type || 'opportunity',
        title: m.title || 'Key Moment',
        description: m.description || '',
        transcript: m.transcript,
      }));
    } catch (error) {
      this.logger.error('Failed to generate key moments:', error);
      return [
        {
          id: `km_${session.id}_1`,
          timestamp: '0:00',
          type: 'positive',
          title: 'Session Completed',
          description: 'Practice session finished successfully',
        },
      ];
    }
  }

  /**
   * Generate session comparison insights
   */
  private async generateSessionComparison(
    session1: any,
    session2: any,
    analysis1: any,
    analysis2: any,
  ): Promise<{
    areasImproved: string[];
    areasDeclined: string[];
    areasToFocus: string[];
    insights: string;
  }> {
    const prompt = `
## Compare Two Coaching Sessions

### Session 1 (Earlier)
- Date: ${session1.createdAt}
- Type: ${session1.scenario || 'GENERAL_PRACTICE'}
- Score: ${analysis1?.overallScore || session1.overallScore || 'Unknown'}
- Strengths: ${analysis1?.strengths?.join(', ') || 'Unknown'}
- Gaps: ${analysis1?.gaps?.join(', ') || 'Unknown'}

### Session 2 (Later)
- Date: ${session2.createdAt}
- Type: ${session2.scenario || 'GENERAL_PRACTICE'}
- Score: ${analysis2?.overallScore || session2.overallScore || 'Unknown'}
- Strengths: ${analysis2?.strengths?.join(', ') || 'Unknown'}
- Gaps: ${analysis2?.gaps?.join(', ') || 'Unknown'}

---

Compare these sessions and identify:
1. Areas that improved (2-3 items)
2. Areas that declined (0-2 items)
3. Areas to focus on next (2-3 items)
4. Overall insight (1-2 sentences)

Respond in JSON format.
`;

    try {
      const response = await this.anthropic.generateChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are a sales coaching expert providing progress insights. Be encouraging but honest. Respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        maxTokens: 800,
      });

      const parsed = JSON.parse(response);
      return {
        areasImproved: parsed.areasImproved || [],
        areasDeclined: parsed.areasDeclined || [],
        areasToFocus: parsed.areasToFocus || [],
        insights: parsed.insights || 'Continue practicing to build consistency.',
      };
    } catch (error) {
      this.logger.error('Failed to compare sessions:', error);
      return {
        areasImproved: ['Overall engagement'],
        areasDeclined: [],
        areasToFocus: ['Playbook alignment', 'Discovery questions'],
        insights: 'Continue practicing to build consistency and confidence.',
      };
    }
  }

  /**
   * Extract key moments from existing analysis
   */
  private extractKeyMomentsFromAnalysis(analysis: any, sessionId: string): KeyMoment[] {
    const stepAnalysis = analysis.stepAnalysis as StepAnalysis[] || [];
    const moments: KeyMoment[] = [];

    stepAnalysis.forEach((step, index) => {
      if (step.executed && step.quality >= 70) {
        moments.push({
          id: `km_${sessionId}_pos_${index}`,
          timestamp: step.timestamp || `${index * 2}:00`,
          type: 'positive',
          title: `Strong ${step.stepName}`,
          description: step.feedback,
        });
      } else if (!step.executed || step.quality < 50) {
        moments.push({
          id: `km_${sessionId}_opp_${index}`,
          timestamp: step.timestamp || `${index * 2}:00`,
          type: 'opportunity',
          title: `Improve ${step.stepName}`,
          description: step.feedback,
        });
      }
    });

    return moments.slice(0, 5); // Return max 5 moments
  }

  /**
   * Calculate a basic session score from feedback
   */
  private calculateSessionScore(session: any): number {
    if (session.feedback?.overallScore) {
      return session.feedback.overallScore;
    }
    // Default score based on completion
    return session.status === 'COMPLETED' ? 65 : 40;
  }

  /**
   * Get default playbook when none specified
   */
  private getDefaultPlaybook(): any {
    return {
      id: 'default_discovery',
      name: 'Discovery Call Framework',
      steps: [
        { id: 'step_1', name: 'Opening & Rapport', order: 1, description: 'Build initial connection and set agenda' },
        { id: 'step_2', name: 'Situation Questions', order: 2, description: 'Understand current state and context' },
        { id: 'step_3', name: 'Problem Questions', order: 3, description: 'Uncover pain points and challenges' },
        { id: 'step_4', name: 'Implication Questions', order: 4, description: 'Explore impact of problems' },
        { id: 'step_5', name: 'Need-Payoff Questions', order: 5, description: 'Connect solution to value' },
        { id: 'step_6', name: 'Next Steps', order: 6, description: 'Agree on clear next actions' },
      ],
    };
  }
}
