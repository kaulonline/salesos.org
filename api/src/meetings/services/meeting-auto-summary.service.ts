/**
 * Meeting Auto-Summary Service
 *
 * Post-Meeting Auto-Summary for Phase 2 Vertiv O2O Journey.
 * Auto-generates meeting summaries from transcription, extracts action items,
 * and auto-creates follow-up tasks and coaching action items.
 *
 * Features:
 * - AI-powered structured meeting summaries
 * - Action item extraction with owners and due dates
 * - Auto-creation of CRM Tasks from action items
 * - Auto-creation of CoachingActionItems for coaching sessions
 * - Key discussion point extraction with timestamps
 * - Decision tracking
 * - Follow-up topic identification
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { TasksService } from '../../tasks/tasks.service';
import { NotificationSchedulerService } from '../../notifications/notification-scheduler.service';
import {
  TaskPriority,
  ActionItemPriority,
  ActionItemSourceType,
  ActionItemStatus,
  Prisma,
} from '@prisma/client';

// ==================== TYPES ====================

export interface MeetingSummary {
  id: string;
  meetingSessionId: string;

  // Core Summary
  executiveSummary: string;
  keyDiscussionPoints: KeyDiscussionPoint[];
  decisions: Decision[];

  // Action Items
  actionItems: ExtractedActionItem[];
  actionItemsApproved: boolean;

  // Follow-up
  followUpTopics: string[];
  nextMeetingSuggestions: string[];

  // Metadata
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  participantEngagement: ParticipantEngagement[];
  meetingEffectiveness: number; // 0-100

  // Processing info
  generatedAt: string;
  modelUsed: string;
  processingTimeMs: number;
}

export interface KeyDiscussionPoint {
  topic: string;
  summary: string;
  timestamp?: string; // MM:SS format
  speakers?: string[];
  importance: 'high' | 'medium' | 'low';
}

export interface Decision {
  description: string;
  madeBy?: string;
  timestamp?: string;
  context?: string;
}

export interface ExtractedActionItem {
  id: string;
  title: string;
  description?: string;
  owner?: string; // Name or email of assignee
  ownerEmail?: string;
  dueDate?: string; // ISO date string
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category?: string;
  sourceQuote?: string; // The transcript text that generated this
  timestamp?: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'created';
  createdTaskId?: string;
  createdCoachingActionItemId?: string;
}

export interface ParticipantEngagement {
  name: string;
  speakingTimePercent: number;
  questionsAsked: number;
  keyContributions: string[];
}

export interface GenerateSummaryDto {
  includeActionItems?: boolean;
  autoApproveActions?: boolean;
  customPrompt?: string;
  meetingType?: 'sales' | 'coaching' | 'internal' | 'customer';
}

export interface ApproveActionsDto {
  approvedActionIds: string[];
  rejectedActionIds?: string[];
  modifications?: {
    actionId: string;
    owner?: string;
    ownerEmail?: string;
    dueDate?: string;
    priority?: string;
    title?: string;
  }[];
  createTasks?: boolean;
  createCoachingActionItems?: boolean;
}

// ==================== PROMPTS ====================

const SUMMARY_SYSTEM_PROMPT = `You are an expert meeting analyst specializing in sales and coaching conversations. Your task is to analyze meeting transcripts and generate comprehensive, actionable summaries.

For each meeting transcript, you must provide:

1. **Executive Summary**: A concise 2-3 sentence overview of the meeting's purpose and key outcomes.

2. **Key Discussion Points**: The most important topics discussed with:
   - Topic name
   - Brief summary of what was discussed
   - Timestamp (if identifiable from transcript)
   - Speakers involved
   - Importance level (high/medium/low)

3. **Decisions Made**: Any agreements or decisions reached during the meeting:
   - What was decided
   - Who made/approved the decision
   - Context if relevant

4. **Action Items**: Specific tasks that need to be completed:
   - Clear, actionable title
   - Description of what needs to be done
   - Owner (who is responsible) - infer from context
   - Due date (if mentioned or inferrable)
   - Priority (urgent/high/medium/low)
   - Category (e.g., "follow-up", "preparation", "research", "admin")
   - The exact quote from transcript that generated this

5. **Follow-up Topics**: Topics that should be discussed in future meetings

6. **Participant Engagement**: How each participant contributed:
   - Estimated speaking time percentage
   - Number of questions asked
   - Key contributions

7. **Meeting Effectiveness Score**: 0-100 rating based on:
   - Clear outcomes achieved
   - Time used efficiently
   - All participants engaged
   - Action items defined

8. **Overall Sentiment**: positive/neutral/negative/mixed

RESPONSE FORMAT (JSON):
{
  "executiveSummary": "string",
  "keyDiscussionPoints": [
    {
      "topic": "string",
      "summary": "string",
      "timestamp": "MM:SS or null",
      "speakers": ["string"],
      "importance": "high|medium|low"
    }
  ],
  "decisions": [
    {
      "description": "string",
      "madeBy": "string or null",
      "timestamp": "MM:SS or null",
      "context": "string or null"
    }
  ],
  "actionItems": [
    {
      "title": "string (imperative, specific)",
      "description": "string",
      "owner": "string (name) or null",
      "ownerEmail": "string or null",
      "dueDate": "ISO date or null",
      "priority": "urgent|high|medium|low",
      "category": "string",
      "sourceQuote": "string (exact transcript excerpt)"
    }
  ],
  "followUpTopics": ["string"],
  "nextMeetingSuggestions": ["string"],
  "participantEngagement": [
    {
      "name": "string",
      "speakingTimePercent": number,
      "questionsAsked": number,
      "keyContributions": ["string"]
    }
  ],
  "meetingEffectiveness": number (0-100),
  "sentiment": "positive|neutral|negative|mixed"
}

Be specific and actionable. Extract actual names, dates, and deadlines when mentioned. If a due date isn't explicit, suggest a reasonable one based on context (e.g., "next week" becomes 7 days from now, "end of month" becomes the actual date).`;

// ==================== SERVICE ====================

@Injectable()
export class MeetingAutoSummaryService {
  private readonly logger = new Logger(MeetingAutoSummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly tasksService: TasksService,
    private readonly notificationScheduler: NotificationSchedulerService,
  ) {}

  /**
   * Generate a comprehensive meeting summary from transcript
   */
  async generateSummary(
    meetingSessionId: string,
    userId: string,
    options: GenerateSummaryDto = {},
  ): Promise<MeetingSummary> {
    this.logger.log(`Generating summary for meeting: ${meetingSessionId}`);

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
        analysis: true,
        opportunity: {
          include: { account: true },
        },
        account: true,
        lead: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingSessionId} not found`);
    }

    // Verify ownership
    if (meeting.ownerId !== userId) {
      // Check if user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== 'ADMIN') {
        throw new NotFoundException(`Meeting ${meetingSessionId} not found`);
      }
    }

    if (!meeting.transcriptText && meeting.transcriptSegments.length === 0) {
      throw new BadRequestException('Meeting has no transcript to analyze');
    }

    // Build transcript text
    const transcript = this.buildTranscriptText(meeting);

    // Build context
    const context = this.buildMeetingContext(meeting, options.meetingType);

    // Generate summary via Claude
    const prompt = `${context}\n\nMEETING TRANSCRIPT:\n${transcript}\n\n${options.customPrompt || 'Please analyze this meeting and generate a comprehensive summary with action items.'}`;

    const startTime = Date.now();
    const response = await this.anthropic.generateChatCompletion({
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 6000,
    });
    const processingTime = Date.now() - startTime;

    // Parse response
    const parsed = this.parseSummaryResponse(response);

    // Build summary object
    const summary: MeetingSummary = {
      id: `summary-${meetingSessionId}`,
      meetingSessionId,
      executiveSummary: parsed.executiveSummary || 'No summary available',
      keyDiscussionPoints: (parsed.keyDiscussionPoints || []).map((point: any, idx: number) => ({
        topic: point.topic || `Topic ${idx + 1}`,
        summary: point.summary || '',
        timestamp: point.timestamp,
        speakers: point.speakers || [],
        importance: point.importance || 'medium',
      })),
      decisions: (parsed.decisions || []).map((decision: any) => ({
        description: decision.description || '',
        madeBy: decision.madeBy,
        timestamp: decision.timestamp,
        context: decision.context,
      })),
      actionItems: (parsed.actionItems || []).map((item: any, idx: number) => ({
        id: `action-${meetingSessionId}-${idx}`,
        title: item.title || 'Untitled action',
        description: item.description,
        owner: item.owner,
        ownerEmail: item.ownerEmail,
        dueDate: item.dueDate ? this.normalizeDueDate(item.dueDate) : undefined,
        priority: this.mapPriority(item.priority),
        category: item.category || 'follow-up',
        sourceQuote: item.sourceQuote,
        timestamp: item.timestamp,
        status: options.autoApproveActions ? 'approved' : 'pending_approval',
      })),
      actionItemsApproved: options.autoApproveActions || false,
      followUpTopics: parsed.followUpTopics || [],
      nextMeetingSuggestions: parsed.nextMeetingSuggestions || [],
      sentiment: parsed.sentiment || 'neutral',
      participantEngagement: (parsed.participantEngagement || []).map((p: any) => ({
        name: p.name || 'Unknown',
        speakingTimePercent: p.speakingTimePercent || 0,
        questionsAsked: p.questionsAsked || 0,
        keyContributions: p.keyContributions || [],
      })),
      meetingEffectiveness: parsed.meetingEffectiveness || 50,
      generatedAt: new Date().toISOString(),
      modelUsed: 'claude-sonnet-4-5',
      processingTimeMs: processingTime,
    };

    // Store/update MeetingAnalysis
    await this.saveSummaryToAnalysis(meetingSessionId, summary);

    // If auto-approve, create the action items immediately
    if (options.autoApproveActions && summary.actionItems.length > 0) {
      await this.createActionItemsFromSummary(
        meeting,
        summary.actionItems,
        userId,
        options.meetingType === 'coaching',
      );
    }

    this.logger.log(`Summary generated for meeting ${meetingSessionId} in ${processingTime}ms`);

    return summary;
  }

  /**
   * Get the summary for a meeting
   */
  async getSummary(
    meetingSessionId: string,
    userId: string,
  ): Promise<MeetingSummary | null> {
    const analysis = await this.prisma.meetingAnalysis.findUnique({
      where: { meetingSessionId },
      include: {
        meetingSession: {
          select: { ownerId: true },
        },
      },
    });

    if (!analysis) {
      return null;
    }

    // Verify ownership
    if (analysis.meetingSession.ownerId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== 'ADMIN') {
        return null;
      }
    }

    // Parse stored summary from analysis
    return this.parseAnalysisToSummary(analysis);
  }

  /**
   * Approve and create action items from a summary
   */
  async approveAndCreateActions(
    meetingSessionId: string,
    userId: string,
    dto: ApproveActionsDto,
  ): Promise<{
    tasksCreated: number;
    coachingItemsCreated: number;
    taskIds: string[];
    coachingItemIds: string[];
  }> {
    this.logger.log(`Approving actions for meeting: ${meetingSessionId}`);

    // Get the meeting and analysis
    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: {
        analysis: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingSessionId} not found`);
    }

    if (meeting.ownerId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== 'ADMIN') {
        throw new NotFoundException(`Meeting ${meetingSessionId} not found`);
      }
    }

    if (!meeting.analysis) {
      throw new BadRequestException('Meeting has no summary/analysis to approve');
    }

    // Get the stored action items
    const storedActionItems = (meeting.analysis.actionItems as any[]) || [];

    // Apply modifications
    const modificationMap = new Map(
      (dto.modifications || []).map((m) => [m.actionId, m]),
    );

    // Filter to approved items
    const approvedItems = storedActionItems
      .filter(
        (item) =>
          dto.approvedActionIds.includes(item.id || item.text) &&
          !dto.rejectedActionIds?.includes(item.id || item.text),
      )
      .map((item) => {
        const mod = modificationMap.get(item.id || item.text);
        if (mod) {
          return {
            ...item,
            owner: mod.owner || item.owner || item.assignee,
            ownerEmail: mod.ownerEmail || item.ownerEmail,
            dueDate: mod.dueDate || item.dueDate,
            priority: mod.priority || item.priority,
            title: mod.title || item.title || item.text,
          };
        }
        return item;
      });

    const result = {
      tasksCreated: 0,
      coachingItemsCreated: 0,
      taskIds: [] as string[],
      coachingItemIds: [] as string[],
    };

    // Create Tasks if requested
    if (dto.createTasks) {
      // Get organizationId for the user
      const organizationId = await this.getOrganizationIdForUser(userId);
      if (!organizationId) {
        this.logger.warn(`Cannot create tasks for meeting ${meetingSessionId}: User does not belong to an organization`);
      } else {
        for (const item of approvedItems) {
          try {
            // Resolve owner to user ID
            const ownerId = await this.resolveUserIdFromName(
              item.owner,
              item.ownerEmail,
              userId,
            );

            const task = await this.tasksService.createTask(
              {
                subject: item.title || item.text || 'Follow-up from meeting',
                description: item.description || item.sourceQuote,
                priority: this.mapToTaskPriority(item.priority),
                dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
                assignedToId: ownerId,
                // Link to related CRM records from meeting
                opportunityId: meeting.opportunityId || undefined,
                accountId: meeting.accountId || undefined,
                leadId: meeting.leadId || undefined,
              },
              userId,
              organizationId,
            );

            result.taskIds.push(task.id);
            result.tasksCreated++;
          } catch (error) {
            this.logger.warn(`Failed to create task for action item: ${error}`);
          }
        }
      }
    }

    // Create CoachingActionItems if requested
    if (dto.createCoachingActionItems) {
      for (const item of approvedItems) {
        try {
          // For coaching items, we need a rep ID (the person being coached)
          // This would typically come from the meeting context
          const repId = await this.resolveRepIdFromMeeting(meeting);

          if (repId) {
            const coachingItem = await this.prisma.coachingActionItem.create({
              data: {
                repId,
                managerId: userId,
                sourceType: ActionItemSourceType.MEETING_SESSION,
                meetingSessionId,
                title: item.title || item.text || 'Follow-up from coaching session',
                description: item.description || item.sourceQuote,
                category: item.category || 'Coaching',
                priority: this.mapToActionItemPriority(item.priority),
                status: ActionItemStatus.PENDING,
                dueDate: item.dueDate
                  ? new Date(item.dueDate)
                  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 1 week
              },
            });

            result.coachingItemIds.push(coachingItem.id);
            result.coachingItemsCreated++;

            // Send notification to rep
            await this.notificationScheduler.sendSystemNotification(
              repId,
              'New Action Item from Meeting',
              `"${item.title || item.text}" assigned from your coaching session`,
              {
                type: 'ACTION_ITEM',
                priority: item.priority === 'urgent' || item.priority === 'high' ? 'HIGH' : 'NORMAL',
                action: 'view_action_item',
                actionData: { actionItemId: coachingItem.id },
              },
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to create coaching action item: ${error}`);
        }
      }
    }

    // Update analysis to mark items as approved
    const updatedActionItems = storedActionItems.map((item) => ({
      ...item,
      status: dto.approvedActionIds.includes(item.id || item.text)
        ? 'approved'
        : dto.rejectedActionIds?.includes(item.id || item.text)
          ? 'rejected'
          : item.status,
    }));

    await this.prisma.meetingAnalysis.update({
      where: { meetingSessionId },
      data: {
        actionItems: updatedActionItems as Prisma.InputJsonValue[],
      },
    });

    this.logger.log(
      `Created ${result.tasksCreated} tasks and ${result.coachingItemsCreated} coaching items for meeting ${meetingSessionId}`,
    );

    return result;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Build transcript text from segments or raw transcript
   */
  private buildTranscriptText(meeting: any): string {
    if (meeting.transcriptSegments && meeting.transcriptSegments.length > 0) {
      return meeting.transcriptSegments
        .map((seg: any) => {
          const speaker = seg.speakerName || 'Unknown';
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
  private buildMeetingContext(meeting: any, meetingType?: string): string {
    const parts: string[] = [];

    parts.push(`MEETING CONTEXT:`);
    parts.push(`Title: ${meeting.title}`);
    parts.push(`Date: ${meeting.scheduledStart?.toISOString() || meeting.actualStart?.toISOString() || 'Unknown'}`);
    parts.push(`Duration: ${meeting.duration || 'Unknown'} minutes`);
    parts.push(`Type: ${meetingType || 'general'}`);

    if (meeting.participants && meeting.participants.length > 0) {
      parts.push(`\nPARTICIPANTS:`);
      meeting.participants.forEach((p: any) => {
        const role = p.isInternal ? '(Internal)' : '(External)';
        const contactInfo = p.contact ? ` - ${p.contact.title}` : '';
        parts.push(`- ${p.name} <${p.email || 'no email'}> ${role}${contactInfo}`);
      });
    }

    if (meeting.opportunity) {
      parts.push(`\nOPPORTUNITY CONTEXT:`);
      parts.push(`Name: ${meeting.opportunity.name}`);
      parts.push(`Stage: ${meeting.opportunity.stage}`);
      parts.push(`Amount: $${meeting.opportunity.amount?.toLocaleString() || 'Not specified'}`);
      if (meeting.opportunity.account) {
        parts.push(`Account: ${meeting.opportunity.account.name}`);
      }
    }

    if (meeting.account && !meeting.opportunity) {
      parts.push(`\nACCOUNT:`);
      parts.push(`Name: ${meeting.account.name}`);
      parts.push(`Industry: ${meeting.account.industry || 'Unknown'}`);
    }

    if (meeting.lead) {
      parts.push(`\nLEAD:`);
      parts.push(`Name: ${meeting.lead.firstName} ${meeting.lead.lastName}`);
      parts.push(`Company: ${meeting.lead.company || 'Unknown'}`);
    }

    return parts.join('\n');
  }

  /**
   * Parse Claude's summary response
   */
  private parseSummaryResponse(response: string): any {
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch =
        response.match(/```json\n?([\s\S]*?)\n?```/) ||
        response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const json = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(json);
    } catch (error) {
      this.logger.error(`Failed to parse summary response: ${error}`);
      return {
        executiveSummary: 'Failed to parse meeting summary',
        keyDiscussionPoints: [],
        decisions: [],
        actionItems: [],
        followUpTopics: [],
        nextMeetingSuggestions: [],
        participantEngagement: [],
        meetingEffectiveness: 0,
        sentiment: 'neutral',
      };
    }
  }

  /**
   * Save summary to MeetingAnalysis
   */
  private async saveSummaryToAnalysis(
    meetingSessionId: string,
    summary: MeetingSummary,
  ): Promise<void> {
    const analysisData: Prisma.MeetingAnalysisCreateInput = {
      meetingSession: { connect: { id: meetingSessionId } },
      summary: summary.executiveSummary,
      keyPoints: summary.keyDiscussionPoints.map((p) => p.topic),
      decisions: summary.decisions.map((d) => d.description),
      actionItems: summary.actionItems.map((item) => ({
        id: item.id,
        text: item.title,
        title: item.title,
        description: item.description,
        assignee: item.owner,
        ownerEmail: item.ownerEmail,
        dueDate: item.dueDate,
        priority: item.priority?.toUpperCase() || 'MEDIUM',
        category: item.category,
        sourceQuote: item.sourceQuote,
        timestamp: item.timestamp,
        status: item.status,
      })) as Prisma.InputJsonValue[],
      overallSentiment: summary.sentiment,
      sentimentScore: this.sentimentToScore(summary.sentiment),
      topicsDiscussed: summary.keyDiscussionPoints.map((p) => p.topic),
      questionsAsked: [],
      followUpRecommendations: summary.followUpTopics.map((topic) => ({
        type: 'follow_up',
        description: topic,
        priority: 'MEDIUM',
      })) as Prisma.InputJsonValue[],
      modelUsed: summary.modelUsed,
      processingTime: summary.processingTimeMs,
    };

    // Upsert the analysis
    await this.prisma.meetingAnalysis.upsert({
      where: { meetingSessionId },
      create: analysisData,
      update: {
        summary: summary.executiveSummary,
        keyPoints: summary.keyDiscussionPoints.map((p) => p.topic),
        decisions: summary.decisions.map((d) => d.description),
        actionItems: analysisData.actionItems,
        overallSentiment: summary.sentiment,
        sentimentScore: this.sentimentToScore(summary.sentiment),
        topicsDiscussed: summary.keyDiscussionPoints.map((p) => p.topic),
        followUpRecommendations: analysisData.followUpRecommendations,
        modelUsed: summary.modelUsed,
        processingTime: summary.processingTimeMs,
      },
    });
  }

  /**
   * Parse MeetingAnalysis back to MeetingSummary format
   */
  private parseAnalysisToSummary(analysis: any): MeetingSummary {
    const actionItems = (analysis.actionItems as any[]) || [];

    return {
      id: `summary-${analysis.meetingSessionId}`,
      meetingSessionId: analysis.meetingSessionId,
      executiveSummary: analysis.summary || '',
      keyDiscussionPoints: (analysis.keyPoints || []).map((point: string, idx: number) => ({
        topic: point,
        summary: '',
        importance: 'medium' as const,
      })),
      decisions: (analysis.decisions || []).map((d: string) => ({
        description: d,
      })),
      actionItems: actionItems.map((item: any, idx: number) => ({
        id: item.id || `action-${analysis.meetingSessionId}-${idx}`,
        title: item.title || item.text || '',
        description: item.description,
        owner: item.assignee || item.owner,
        ownerEmail: item.ownerEmail,
        dueDate: item.dueDate,
        priority: (item.priority?.toLowerCase() || 'medium') as any,
        category: item.category,
        sourceQuote: item.sourceQuote,
        timestamp: item.timestamp,
        status: item.status || 'pending_approval',
        createdTaskId: item.createdTaskId,
        createdCoachingActionItemId: item.createdCoachingActionItemId,
      })),
      actionItemsApproved: actionItems.some((item: any) => item.status === 'approved'),
      followUpTopics: (analysis.followUpRecommendations as any[] || []).map(
        (r: any) => r.description || r,
      ),
      nextMeetingSuggestions: [],
      sentiment: (analysis.overallSentiment as any) || 'neutral',
      participantEngagement: [],
      meetingEffectiveness: analysis.opportunityScore || 50,
      generatedAt: analysis.createdAt?.toISOString() || new Date().toISOString(),
      modelUsed: analysis.modelUsed || 'unknown',
      processingTimeMs: analysis.processingTime || 0,
    };
  }

  /**
   * Create action items from summary
   */
  private async createActionItemsFromSummary(
    meeting: any,
    actionItems: ExtractedActionItem[],
    userId: string,
    isCoachingMeeting: boolean,
  ): Promise<void> {
    // Get organizationId for the user (needed for regular tasks)
    const organizationId = await this.getOrganizationIdForUser(userId);

    for (const item of actionItems) {
      if (isCoachingMeeting) {
        // Create coaching action item
        const repId = await this.resolveRepIdFromMeeting(meeting);
        if (repId) {
          await this.prisma.coachingActionItem.create({
            data: {
              repId,
              managerId: userId,
              sourceType: ActionItemSourceType.MEETING_SESSION,
              meetingSessionId: meeting.id,
              title: item.title,
              description: item.description,
              category: item.category || 'Coaching',
              priority: this.mapToActionItemPriority(item.priority),
              status: ActionItemStatus.PENDING,
              dueDate: item.dueDate
                ? new Date(item.dueDate)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }
      } else {
        // Create regular task
        if (!organizationId) {
          this.logger.warn(`Cannot create task for meeting ${meeting.id}: User does not belong to an organization`);
          continue;
        }

        const ownerId = await this.resolveUserIdFromName(
          item.owner,
          item.ownerEmail,
          userId,
        );

        await this.tasksService.createTask(
          {
            subject: item.title,
            description: item.description || item.sourceQuote,
            priority: this.mapToTaskPriority(item.priority),
            dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
            assignedToId: ownerId,
            opportunityId: meeting.opportunityId || undefined,
            accountId: meeting.accountId || undefined,
            leadId: meeting.leadId || undefined,
          },
          userId,
          organizationId,
        );
      }
    }
  }

  /**
   * Resolve user ID from name or email
   */
  private async resolveUserIdFromName(
    name?: string,
    email?: string,
    fallbackUserId?: string,
  ): Promise<string> {
    if (email) {
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (user) return user.id;
    }

    if (name) {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { name: { contains: name, mode: 'insensitive' } },
            { email: { contains: name.split(' ')[0], mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (user) return user.id;
    }

    return fallbackUserId || '';
  }

  /**
   * Resolve rep ID from meeting context
   */
  private async resolveRepIdFromMeeting(meeting: any): Promise<string | null> {
    // Look for non-manager internal participants
    for (const participant of meeting.participants || []) {
      if (participant.isInternal && !participant.isBot) {
        const user = await this.prisma.user.findFirst({
          where: { email: { equals: participant.email, mode: 'insensitive' } },
          select: { id: true, role: true },
        });
        if (user && user.role !== 'MANAGER' && user.role !== 'ADMIN') {
          return user.id;
        }
      }
    }

    // If we can't identify a rep, use the meeting owner (might be the rep themselves)
    return meeting.ownerId;
  }

  /**
   * Format timestamp to MM:SS
   */
  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Normalize due date strings
   */
  private normalizeDueDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Handle relative dates
      const lowerStr = dateStr.toLowerCase();
      const now = new Date();

      if (lowerStr.includes('tomorrow')) {
        now.setDate(now.getDate() + 1);
        return now.toISOString();
      }
      if (lowerStr.includes('next week')) {
        now.setDate(now.getDate() + 7);
        return now.toISOString();
      }
      if (lowerStr.includes('end of week')) {
        const dayOfWeek = now.getDay();
        const daysUntilFriday = 5 - dayOfWeek;
        now.setDate(now.getDate() + (daysUntilFriday > 0 ? daysUntilFriday : 7 + daysUntilFriday));
        return now.toISOString();
      }
      if (lowerStr.includes('end of month')) {
        now.setMonth(now.getMonth() + 1, 0);
        return now.toISOString();
      }
    }

    // Default to 7 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate.toISOString();
  }

  /**
   * Map priority string to enum
   */
  private mapPriority(priority?: string): 'urgent' | 'high' | 'medium' | 'low' {
    const lowerPriority = priority?.toLowerCase();
    if (lowerPriority === 'urgent' || lowerPriority === 'critical') return 'urgent';
    if (lowerPriority === 'high') return 'high';
    if (lowerPriority === 'low') return 'low';
    return 'medium';
  }

  /**
   * Map to TaskPriority enum
   */
  private mapToTaskPriority(priority?: string): TaskPriority {
    const lowerPriority = priority?.toLowerCase();
    if (lowerPriority === 'urgent') return TaskPriority.URGENT;
    if (lowerPriority === 'high') return TaskPriority.HIGH;
    if (lowerPriority === 'low') return TaskPriority.LOW;
    return TaskPriority.NORMAL;
  }

  /**
   * Map to ActionItemPriority enum
   */
  private mapToActionItemPriority(priority?: string): ActionItemPriority {
    const lowerPriority = priority?.toLowerCase();
    if (lowerPriority === 'urgent') return ActionItemPriority.URGENT;
    if (lowerPriority === 'high') return ActionItemPriority.HIGH;
    if (lowerPriority === 'low') return ActionItemPriority.LOW;
    return ActionItemPriority.MEDIUM;
  }

  /**
   * Convert sentiment to numeric score
   */
  private sentimentToScore(sentiment?: string): number | null {
    if (!sentiment) return null;
    const sentimentMap: Record<string, number> = {
      positive: 0.7,
      neutral: 0,
      negative: -0.7,
      mixed: 0.1,
    };
    return sentimentMap[sentiment.toLowerCase()] ?? null;
  }

  /**
   * Get organization ID for a user from their active membership
   */
  private async getOrganizationIdForUser(userId: string): Promise<string | null> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { organizationId: true },
    });
    return membership?.organizationId || null;
  }
}
