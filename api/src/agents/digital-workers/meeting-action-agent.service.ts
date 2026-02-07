/**
 * IRIS Digital Worker Agent - Meeting Action Agent
 *
 * Schedules meetings based on signals and recommendations:
 * - Schedules via Zoom, Teams, or Google Meet
 * - Finds optimal meeting times
 * - Sends calendar invites
 * - Links meetings to CRM records
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AiSdkService } from '../../ai-sdk/ai-sdk.service';
import { CacheService } from '../../cache/cache.service';
import { BaseAgentService, DEFAULT_AGENT_LIMITS } from '../base/base-agent.service';
import { createCRMTools } from '../tools/crm-tools';
import {
  AgentType,
  AgentContext,
  AgentConfig,
  AgentTool,
  InsightType,
  ActionType,
  Priority,
  CRMEntityType,
} from '../types';

/**
 * Meeting scheduling request
 */
interface MeetingRequest {
  title: string;
  description?: string;
  attendees: string[];
  duration: number; // minutes
  preferredTimes?: string[];
  platform?: 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET';
  accountId?: string;
  opportunityId?: string;
  contactId?: string;
  signalId?: string;
}

/**
 * Suggested meeting time
 */
interface SuggestedTime {
  startTime: Date;
  endTime: Date;
  score: number;
  reason: string;
}

interface MeetingPlan {
  suggestedTimes: SuggestedTime[];
  agendaSuggestion: string;
  preparationNotes: string[];
}

@Injectable()
export class MeetingActionAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.MEETING_ACTION;
  protected readonly logger = new Logger(MeetingActionAgentService.name);

  protected readonly config: AgentConfig = {
    type: AgentType.MEETING_ACTION,
    name: 'Meeting Action Agent',
    description: 'Schedules meetings based on signals',
    version: '1.0.0',

    // Manual only - triggered by user or recommendations
    schedule: {
      enabled: false,
    },

    eventTriggers: [
      { eventName: 'meeting.schedule.requested' },
    ],

    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 5,
      maxActionsPerExecution: 5,
    },

    enabled: true,
    requiresApproval: true, // Always require approval before scheduling
  };

  constructor(
    prisma: PrismaService,
    aiSdk: AiSdkService,
    eventEmitter: EventEmitter2,
    cacheService: CacheService,
  ) {
    super();
    this.initializeBase(prisma, aiSdk, eventEmitter, cacheService);
  }

  protected getTools(): AgentTool[] {
    return createCRMTools(this.prisma);
  }

  protected async executeAgent(context: AgentContext): Promise<void> {
    this.logger.log('Starting Meeting Action Agent - scheduling meeting...');

    // Get meeting request from context metadata
    const meetingRequest = context.metadata as unknown as MeetingRequest | undefined;

    if (!meetingRequest?.title || !meetingRequest?.attendees?.length) {
      this.addInsight({
        type: InsightType.INFORMATION,
        priority: Priority.LOW,
        confidence: 1,
        title: 'Invalid Meeting Request',
        description: 'Meeting Action Agent requires title and attendees',
      });
      return;
    }

    // Gather context for meeting planning
    const meetingContext = await this.gatherMeetingContext(meetingRequest, context);

    // Generate meeting plan with suggested times and agenda
    const meetingPlan = await this.generateMeetingPlan(meetingRequest, meetingContext, context);

    // Queue the meeting action for approval
    this.queueAction({
      actionType: ActionType.SCHEDULE_MEETING,
      priority: Priority.MEDIUM,
      description: `Schedule meeting: ${meetingRequest.title}`,
      params: {
        title: meetingRequest.title,
        description: meetingRequest.description || meetingPlan.agendaSuggestion,
        attendees: meetingRequest.attendees,
        duration: meetingRequest.duration || 30,
        platform: meetingRequest.platform || 'ZOOM',
        suggestedTimes: meetingPlan.suggestedTimes,
        accountId: meetingRequest.accountId,
        opportunityId: meetingRequest.opportunityId,
        contactId: meetingRequest.contactId,
        preparationNotes: meetingPlan.preparationNotes,
      },
      entityType: meetingRequest.opportunityId ? CRMEntityType.OPPORTUNITY :
                  meetingRequest.accountId ? CRMEntityType.ACCOUNT :
                  CRMEntityType.CONTACT,
      entityId: meetingRequest.opportunityId || meetingRequest.accountId || meetingRequest.contactId!,
      requiresApproval: true,
    });

    // Add insight with the plan
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.MEDIUM,
      confidence: 0.9,
      title: 'Meeting Plan Ready',
      description: `Prepared meeting plan for "${meetingRequest.title}" with ${meetingRequest.attendees.length} attendee(s)`,
      metadata: {
        suggestedTimes: meetingPlan.suggestedTimes,
        agenda: meetingPlan.agendaSuggestion,
        preparation: meetingPlan.preparationNotes,
      },
    });

    // Emit event for UI
    this.eventEmitter.emit('meeting.plan.ready', {
      request: meetingRequest,
      plan: meetingPlan,
      userId: context.userId,
    });
  }

  private async gatherMeetingContext(meetingRequest: MeetingRequest, context: AgentContext): Promise<any> {
    const result: any = {
      account: null,
      opportunity: null,
      contacts: [],
      recentMeetings: [],
      signal: null,
    };

    // Get account info
    if (meetingRequest.accountId) {
      result.account = await this.prisma.account.findUnique({
        where: { id: meetingRequest.accountId },
      });
    }

    // Get opportunity info
    if (meetingRequest.opportunityId) {
      result.opportunity = await this.prisma.opportunity.findUnique({
        where: { id: meetingRequest.opportunityId },
        include: { account: true },
      });
      if (!result.account && result.opportunity?.account) {
        result.account = result.opportunity.account;
      }
    }

    // Get contact info for attendees
    const attendeeEmails = meetingRequest.attendees.filter(a => a.includes('@'));
    if (attendeeEmails.length > 0) {
      result.contacts = await this.prisma.contact.findMany({
        where: {
          email: { in: attendeeEmails },
        },
        include: { account: true },
      });
    }

    // Get recent meetings with this account/opportunity
    if (meetingRequest.accountId || meetingRequest.opportunityId) {
      result.recentMeetings = await this.prisma.meetingSession.findMany({
        where: {
          OR: [
            { accountId: meetingRequest.accountId },
            { opportunityId: meetingRequest.opportunityId },
          ],
        },
        orderBy: { scheduledStart: 'desc' },
        take: 5,
      });
    }

    // Get signal if referenced
    if (meetingRequest.signalId) {
      result.signal = await this.prisma.accountSignal.findUnique({
        where: { id: meetingRequest.signalId },
      });
    }

    return result;
  }

  private async generateMeetingPlan(meetingRequest: MeetingRequest, meetingContext: any, context: AgentContext): Promise<MeetingPlan> {
    // Build context for LLM
    const contextInfo: string[] = [];

    if (meetingContext.account) {
      contextInfo.push(`ACCOUNT: ${meetingContext.account.name}`);
      contextInfo.push(`Industry: ${meetingContext.account.industry || 'Unknown'}`);
    }

    if (meetingContext.opportunity) {
      contextInfo.push(`\nOPPORTUNITY: ${meetingContext.opportunity.name}`);
      contextInfo.push(`Stage: ${meetingContext.opportunity.stage}`);
      contextInfo.push(`Amount: $${meetingContext.opportunity.amount || 0}`);
    }

    if (meetingContext.contacts.length > 0) {
      contextInfo.push('\nATTENDEES:');
      meetingContext.contacts.forEach((c: any) => {
        contextInfo.push(`- ${c.firstName} ${c.lastName}: ${c.title || 'Unknown'}`);
      });
    }

    if (meetingContext.recentMeetings.length > 0) {
      contextInfo.push('\nRECENT MEETINGS:');
      meetingContext.recentMeetings.forEach((m: any) => {
        contextInfo.push(`- ${m.title} (${m.scheduledStart?.toLocaleDateString() || 'Unknown date'})`);
      });
    }

    if (meetingContext.signal) {
      contextInfo.push(`\nTRIGGERING SIGNAL: ${meetingContext.signal.type}`);
      contextInfo.push(`Signal: ${meetingContext.signal.title}`);
    }

    const prompt = `Plan a sales meeting based on the following context.

MEETING REQUEST:
Title: ${meetingRequest.title}
Duration: ${meetingRequest.duration || 30} minutes
Attendees: ${meetingRequest.attendees.join(', ')}
${meetingRequest.description ? `Description: ${meetingRequest.description}` : ''}

${contextInfo.join('\n')}

Generate:
1. Three suggested meeting times (use business hours, avoid Mondays/Fridays when possible)
2. A suggested meeting agenda
3. Preparation notes for the meeting

Return JSON:
{
  "suggestedTimes": [
    {
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T10:30:00Z",
      "score": 0.9,
      "reason": "Mid-week morning, typically good for decision makers"
    }
  ],
  "agendaSuggestion": "Meeting agenda here...",
  "preparationNotes": ["Note 1", "Note 2"]
}`;

    const systemPrompt = `You are a sales meeting planner. Suggest optimal meeting times and prepare relevant agendas. Focus on making meetings productive and well-prepared. Use realistic future dates.`;

    try {
      const plan = await this.callLLMForJSON<MeetingPlan>(prompt, systemPrompt);

      // Ensure dates are valid future dates
      const now = new Date();
      plan.suggestedTimes = plan.suggestedTimes.map((time, index) => {
        const suggestedDate = new Date(time.startTime);

        // If date is in the past, adjust to next week
        if (suggestedDate <= now) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 2 + index); // Start from day after tomorrow
          futureDate.setHours(10 + index, 0, 0, 0); // 10am, 11am, 12pm

          return {
            ...time,
            startTime: futureDate,
            endTime: new Date(futureDate.getTime() + (meetingRequest.duration || 30) * 60000),
          };
        }

        return {
          ...time,
          startTime: suggestedDate,
          endTime: new Date(suggestedDate.getTime() + (meetingRequest.duration || 30) * 60000),
        };
      });

      return plan;
    } catch (error) {
      // Return default plan
      const defaultTimes = this.generateDefaultTimes(meetingRequest.duration || 30);
      return {
        suggestedTimes: defaultTimes,
        agendaSuggestion: `Meeting: ${meetingRequest.title}\n\n1. Introduction (5 min)\n2. Discussion (${(meetingRequest.duration || 30) - 10} min)\n3. Next Steps (5 min)`,
        preparationNotes: [
          'Review account history before the meeting',
          'Prepare key talking points',
          'Have relevant materials ready to share',
        ],
      };
    }
  }

  private generateDefaultTimes(duration: number): SuggestedTime[] {
    const times: SuggestedTime[] = [];
    const now = new Date();

    // Generate 3 suggested times over the next few days
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(now.getDate() + 2 + i); // Start from day after tomorrow

      // Skip weekends
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }

      date.setHours(10 + i, 0, 0, 0); // 10am, 11am, 12pm

      times.push({
        startTime: new Date(date),
        endTime: new Date(date.getTime() + duration * 60000),
        score: 0.8 - (i * 0.1),
        reason: i === 0 ? 'Optimal mid-morning time' : i === 1 ? 'Late morning alternative' : 'Midday option',
      });
    }

    return times;
  }
}
