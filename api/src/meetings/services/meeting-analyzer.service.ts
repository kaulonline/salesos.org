import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { ActivitiesService } from '../../activities/activities.service';
import { CrmUpdaterService } from './crm-updater.service';
import { MeetingAnalysisResultDto } from '../dto';

const MEETING_ANALYSIS_SYSTEM_PROMPT = `You are an expert sales meeting analyst. Your task is to analyze meeting transcripts and extract actionable sales intelligence.

For each meeting transcript, you must provide:

1. **Executive Summary**: A 2-3 sentence overview of the meeting
2. **Key Points**: The most important topics discussed (5-10 bullet points)
3. **Action Items**: Specific tasks with assignees and due dates if mentioned
4. **Decisions Made**: Any decisions or agreements reached
5. **Open Questions**: Unresolved questions or concerns
6. **Buying Signals**: Indicators of purchase intent (with confidence 0-1)
7. **Objections**: Customer concerns or pushback
8. **Competitors**: Any competitor mentions
9. **Next Steps**: Agreed upon follow-up actions
10. **Sentiment Analysis**: Overall meeting sentiment
11. **Opportunity Impact**: Recommendations for CRM updates

RESPONSE FORMAT (JSON):
{
  "executiveSummary": "string",
  "detailedSummary": "string",
  "keyPoints": ["string"],
  "actionItems": [{"text": "string", "assignee": "string|null", "dueDate": "ISO date|null", "priority": "HIGH|MEDIUM|LOW"}],
  "decisions": ["string"],
  "questions": ["string"],
  "concerns": ["string"],
  "buyingSignals": [{"signal": "string", "confidence": 0-1, "context": "string"}],
  "objections": [{"objection": "string", "response": "string|null", "resolved": boolean}],
  "competitors": ["string"],
  "pricingDiscussion": "string|null",
  "budgetMentioned": number|null,
  "timelineMentioned": "string|null",
  "nextSteps": ["string"],
  "recommendedActions": ["string"],
  "overallSentiment": "VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE",
  "customerSentiment": "VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE",
  "engagementScore": 0-100,
  "stageRecommendation": "string|null",
  "probabilityChange": number|null,
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL"
}

Be specific and actionable. Extract actual names, dates, and numbers when mentioned.`;

@Injectable()
export class MeetingAnalyzerService {
  private readonly logger = new Logger(MeetingAnalyzerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly activitiesService: ActivitiesService,
    private readonly crmUpdater: CrmUpdaterService,
  ) {}

  /**
   * Analyze a meeting and extract sales intelligence
   */
  async analyzeMeeting(meetingSessionId: string): Promise<MeetingAnalysisResultDto> {
    this.logger.log(`Analyzing meeting: ${meetingSessionId}`);

    // Get meeting with transcript
    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: {
        participants: {
          include: { contact: true },
        },
        transcriptSegments: {
          orderBy: { startTime: 'asc' },
        },
        opportunity: {
          include: { account: true },
        },
        account: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingSessionId} not found`);
    }

    if (!meeting.transcriptText && meeting.transcriptSegments.length === 0) {
      throw new Error('Meeting has no transcript to analyze');
    }

    // Build transcript text
    const transcript = this.buildTranscriptText(meeting);

    // Build context about the opportunity/account
    const context = this.buildMeetingContext(meeting);

    // Call Claude for analysis
    const analysisPrompt = `${context}\n\nMEETING TRANSCRIPT:\n${transcript}\n\nPlease analyze this meeting and provide structured insights.`;

    const startTime = Date.now();
    const response = await this.anthropic.generateChatCompletion({
      messages: [
        { role: 'system', content: MEETING_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.3,
      maxTokens: 4000,
    });
    const processingTime = Date.now() - startTime;

    // Parse response
    const analysis = this.parseAnalysisResponse(response);

    // Save analysis to database using the actual schema fields
    const savedAnalysis = await this.prisma.meetingAnalysis.create({
      data: {
        meetingSessionId,
        summary: analysis.executiveSummary || analysis.detailedSummary || 'No summary available',
        keyPoints: analysis.keyPoints || [],
        decisions: analysis.decisions || [],
        actionItems: (analysis.actionItems || []) as any[],
        overallSentiment: analysis.overallSentiment?.toLowerCase() || 'neutral',
        sentimentScore: this.sentimentToScore(analysis.overallSentiment),
        buyingSignals: (analysis.buyingSignals || []).map((bs: any) => typeof bs === 'string' ? bs : bs.signal),
        objections: (analysis.objections || []).map((obj: any) => typeof obj === 'string' ? obj : obj.objection),
        nextSteps: analysis.nextSteps || [],
        competitorMentions: analysis.competitors || [],
        dealRiskLevel: this.mapRiskLevel(analysis.riskLevel),
        dealRiskFactors: analysis.concerns || [],
        opportunityScore: analysis.engagementScore || null,
        topicsDiscussed: analysis.keyPoints || [],
        questionsAsked: (analysis.questions || []).map((q: string) => ({ question: q, askedBy: null, answered: null })),
        followUpRecommendations: (analysis.recommendedActions || []).map((action: string) => ({
          type: 'recommendation',
          description: action,
          priority: 'MEDIUM',
          suggestedDate: null,
        })),
        modelUsed: 'claude-sonnet-4-5',
        processingTime,
      },
    });

    // Update meeting status
    await this.prisma.meetingSession.update({
      where: { id: meetingSessionId },
      data: { status: 'COMPLETED' },
    });

    // Update CRM with insights
    try {
      await this.crmUpdater.updateCrmFromAnalysis(meeting as any, savedAnalysis as any);
    } catch (crmError) {
      this.logger.warn(`Failed to update CRM: ${crmError}`);
      // Don't fail the analysis if CRM update fails
    }

    return analysis;
  }

  /**
   * Convert sentiment string to numeric score
   */
  private sentimentToScore(sentiment?: string): number | null {
    if (!sentiment) return null;
    const sentimentMap: Record<string, number> = {
      'VERY_POSITIVE': 1.0,
      'POSITIVE': 0.5,
      'NEUTRAL': 0,
      'NEGATIVE': -0.5,
      'VERY_NEGATIVE': -1.0,
    };
    return sentimentMap[sentiment.toUpperCase()] ?? null;
  }

  /**
   * Map risk level string to enum
   */
  private mapRiskLevel(riskLevel?: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null {
    if (!riskLevel) return null;
    const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const upper = riskLevel.toUpperCase();
    return validLevels.includes(upper) ? upper as any : null;
  }

  /**
   * Build transcript text from segments or raw transcript
   */
  private buildTranscriptText(meeting: any): string {
    if (meeting.transcriptSegments && meeting.transcriptSegments.length > 0) {
      return meeting.transcriptSegments
        .map((seg: any) => {
          const speaker = seg.speakerLabel || 'Unknown';
          const timestamp = this.formatTimestamp(seg.startTime);
          return `[${timestamp}] ${speaker}: ${seg.text}`;
        })
        .join('\n');
    }

    return meeting.transcriptText || '';
  }

  /**
   * Build context about the meeting
   */
  private buildMeetingContext(meeting: any): string {
    const parts: string[] = [];

    parts.push(`MEETING CONTEXT:`);
    parts.push(`Title: ${meeting.title}`);
    parts.push(`Date: ${meeting.scheduledAt?.toISOString() || meeting.startedAt?.toISOString()}`);
    parts.push(`Duration: ${meeting.duration || 'Unknown'} minutes`);

    if (meeting.participants && meeting.participants.length > 0) {
      parts.push(`\nPARTICIPANTS:`);
      meeting.participants.forEach((p: any) => {
        const role = p.isExternal ? '(External)' : '(Internal)';
        const contactInfo = p.contact ? ` - ${p.contact.title}` : '';
        parts.push(`- ${p.name} ${role}${contactInfo}`);
      });
    }

    if (meeting.opportunity) {
      parts.push(`\nOPPORTUNITY CONTEXT:`);
      parts.push(`Name: ${meeting.opportunity.name}`);
      parts.push(`Stage: ${meeting.opportunity.stage}`);
      parts.push(`Amount: $${meeting.opportunity.amount?.toLocaleString() || 'Not specified'}`);
      parts.push(`Close Date: ${meeting.opportunity.closeDate?.toISOString() || 'Not set'}`);
    }

    if (meeting.account) {
      parts.push(`\nACCOUNT:`);
      parts.push(`Name: ${meeting.account.name}`);
      parts.push(`Industry: ${meeting.account.industry || 'Unknown'}`);
    }

    return parts.join('\n');
  }

  /**
   * Parse Claude's analysis response
   */
  private parseAnalysisResponse(response: string): MeetingAnalysisResultDto {
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const json = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(json);
    } catch (error) {
      this.logger.error(`Failed to parse analysis response: ${error.message}`);
      throw new Error('Failed to parse meeting analysis');
    }
  }

  /**
   * Format timestamp (seconds) to MM:SS
   */
  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Analyze sentiment for a specific segment
   */
  async analyzeSegmentSentiment(text: string): Promise<string> {
    const response = await this.anthropic.generateChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of the following text and respond with exactly one of: VERY_POSITIVE, POSITIVE, NEUTRAL, NEGATIVE, VERY_NEGATIVE',
        },
        { role: 'user', content: text },
      ],
      temperature: 0,
      maxTokens: 20,
    });

    return response.trim();
  }

  /**
   * Extract entities from transcript
   */
  async extractEntities(transcript: string): Promise<{
    companies: string[];
    people: string[];
    products: string[];
    amounts: string[];
    dates: string[];
  }> {
    const response = await this.anthropic.generateChatCompletion({
      messages: [
        {
          role: 'system',
          content: `Extract entities from the text and return JSON:
{
  "companies": ["company names mentioned"],
  "people": ["people names mentioned"],
  "products": ["products/services mentioned"],
  "amounts": ["dollar amounts mentioned"],
  "dates": ["dates/timelines mentioned"]
}`,
        },
        { role: 'user', content: transcript },
      ],
      temperature: 0,
      maxTokens: 1000,
    });

    try {
      return JSON.parse(response);
    } catch {
      return { companies: [], people: [], products: [], amounts: [], dates: [] };
    }
  }
}
