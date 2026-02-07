import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { SupportTicket, TicketResponse, TicketPriority, TicketStatus } from '@prisma/client';
import { TicketAIAnalysis, AutonomousAction } from './dto/inbound-email.dto';

@Injectable()
export class TicketAIAnalysisService {
  private readonly logger = new Logger(TicketAIAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  /**
   * Analyze a ticket and its conversation to determine sentiment, urgency, and suggested actions
   */
  async analyzeTicket(ticketId: string): Promise<TicketAIAnalysis> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Build conversation context
    const conversation = this.buildConversationContext(ticket, ticket.responses);

    const analysisPrompt = `You are an AI support ticket analyst for IRIS CRM. Analyze this support ticket conversation and provide a structured assessment.

TICKET DETAILS:
- Case ID: ${ticket.caseId}
- Category: ${ticket.category}
- Current Priority: ${ticket.priority}
- Current Status: ${ticket.status}
- Subject: ${ticket.subject}
- Customer: ${ticket.name || 'Unknown'} (${ticket.email})

CONVERSATION:
${conversation}

Analyze this ticket and respond with a JSON object containing:

{
  "sentiment": "frustrated" | "neutral" | "satisfied" | "urgent",
  "urgencyScore": 1-10 (10 being most urgent),
  "suggestedPriority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "shouldEscalate": true/false,
  "escalationReason": "reason if escalation needed",
  "shouldClose": true/false,
  "closeReason": "reason if ticket should be closed",
  "keyIssues": ["issue1", "issue2"],
  "suggestedActions": ["action1", "action2"],
  "requiresHumanReview": true/false,
  "confidence": 0.0-1.0
}

ANALYSIS GUIDELINES:
- Mark as "frustrated" if customer expresses anger, disappointment, or uses urgent language
- Mark as "urgent" if there's mention of deadlines, business impact, or data loss
- Mark as "satisfied" if customer thanks the team, expresses gratitude, or indicates their issue is resolved
- Set shouldClose=true if customer explicitly asks to close/resolve the ticket, says they're good/all set, thanks and confirms resolution, or indicates no further help is needed
- Suggest CRITICAL priority for security issues, data loss, or complete system failures
- Suggest HIGH priority for major functionality broken affecting business
- Escalate if: multiple failed resolution attempts, customer threatens to leave, legal mentions, or VIP customer
- requiresHumanReview should be true for complex issues, edge cases, or low confidence
- Provide actionable, specific suggested actions

Respond ONLY with the JSON object, no other text.`;

    try {
      const response = await this.anthropic.generateFastCompletion({
        messages: [
          { role: 'user', content: analysisPrompt },
        ],
        maxTokens: 1024,
        temperature: 0.3,
      });

      // Parse JSON response
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);

      // Ensure defaults for new fields (backward compatibility)
      const analysis: TicketAIAnalysis = {
        ...parsed,
        shouldClose: parsed.shouldClose ?? false,
        closeReason: parsed.closeReason ?? undefined,
      };

      // Store analysis in ticket metadata
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          metadata: {
            ...(ticket.metadata as object || {}),
            lastAnalysis: {
              ...analysis,
              analyzedAt: new Date().toISOString(),
            },
          },
        },
      });

      this.logger.log(`Analyzed ticket ${ticket.caseId}: sentiment=${analysis.sentiment}, urgency=${analysis.urgencyScore}`);
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze ticket ${ticketId}: ${error.message}`);
      // Return a default analysis on error
      return {
        sentiment: 'neutral',
        urgencyScore: 5,
        suggestedPriority: ticket.priority,
        shouldEscalate: false,
        shouldClose: false,
        keyIssues: [],
        suggestedActions: ['Review ticket manually'],
        requiresHumanReview: true,
        confidence: 0,
      };
    }
  }

  /**
   * Generate autonomous actions based on ticket analysis
   */
  async generateAutonomousActions(ticketId: string, analysis: TicketAIAnalysis): Promise<AutonomousAction[]> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) return [];

    const actions: AutonomousAction[] = [];

    // Priority update action
    if (analysis.suggestedPriority !== ticket.priority && analysis.confidence > 0.7) {
      const priorityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      const currentLevel = priorityOrder[ticket.priority];
      const suggestedLevel = priorityOrder[analysis.suggestedPriority];

      if (suggestedLevel > currentLevel) {
        actions.push({
          type: 'UPDATE_PRIORITY',
          description: `Increase priority from ${ticket.priority} to ${analysis.suggestedPriority} based on ${analysis.sentiment} sentiment and urgency score of ${analysis.urgencyScore}/10`,
          payload: {
            from: ticket.priority,
            to: analysis.suggestedPriority,
          },
          confidence: analysis.confidence,
        });
      }
    }

    // Status update action (move from WAITING_ON_CUSTOMER to OPEN when customer replies)
    if (ticket.status === TicketStatus.WAITING_ON_CUSTOMER && !analysis.shouldClose) {
      actions.push({
        type: 'UPDATE_STATUS',
        description: 'Customer has responded - move ticket back to active queue',
        payload: {
          from: ticket.status,
          to: TicketStatus.OPEN,
        },
        confidence: 1.0,
      });
    }

    // Auto-close ticket when customer indicates satisfaction/resolution
    if (analysis.shouldClose && analysis.confidence > 0.8 &&
        ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      actions.push({
        type: 'UPDATE_STATUS',
        description: analysis.closeReason || 'Customer confirmed issue is resolved and requested ticket closure',
        payload: {
          from: ticket.status,
          to: TicketStatus.RESOLVED,
        },
        confidence: analysis.confidence,
      });
    }

    // Escalation action
    if (analysis.shouldEscalate && analysis.confidence > 0.8) {
      actions.push({
        type: 'ESCALATE',
        description: analysis.escalationReason || 'Ticket requires escalation based on analysis',
        payload: {
          reason: analysis.escalationReason,
          suggestedPriority: 'CRITICAL',
        },
        confidence: analysis.confidence,
      });
    }

    // Auto-response action for simple queries
    if (!analysis.requiresHumanReview && analysis.confidence > 0.85 && analysis.sentiment !== 'frustrated') {
      actions.push({
        type: 'SEND_AUTO_RESPONSE',
        description: 'Send automated acknowledgment response',
        payload: {
          type: 'acknowledgment',
        },
        confidence: analysis.confidence,
      });
    }

    // Request more info action
    if (analysis.keyIssues.length === 0 || analysis.confidence < 0.5) {
      actions.push({
        type: 'REQUEST_INFO',
        description: 'Request more details from customer to better understand the issue',
        payload: {
          missingInfo: ['detailed steps to reproduce', 'expected vs actual behavior', 'screenshots if applicable'],
        },
        confidence: 0.9,
      });
    }

    return actions;
  }

  /**
   * Execute an autonomous action on a ticket
   */
  async executeAction(ticketId: string, action: AutonomousAction, executedBy?: string): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    switch (action.type) {
      case 'UPDATE_PRIORITY':
        await this.prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            priority: action.payload.to as TicketPriority,
            metadata: {
              ...(ticket.metadata as object || {}),
              priorityHistory: [
                ...((ticket.metadata as any)?.priorityHistory || []),
                {
                  from: action.payload.from,
                  to: action.payload.to,
                  reason: action.description,
                  automated: !executedBy,
                  executedAt: new Date().toISOString(),
                },
              ],
            },
          },
        });
        this.logger.log(`Auto-updated priority for ${ticket.caseId}: ${action.payload.from} -> ${action.payload.to}`);
        break;

      case 'UPDATE_STATUS':
        await this.prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: action.payload.to as TicketStatus,
          },
        });
        this.logger.log(`Auto-updated status for ${ticket.caseId}: ${action.payload.from} -> ${action.payload.to}`);
        break;

      case 'ESCALATE':
        await this.prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            priority: TicketPriority.CRITICAL,
            metadata: {
              ...(ticket.metadata as object || {}),
              escalated: true,
              escalatedAt: new Date().toISOString(),
              escalationReason: action.payload.reason,
            },
          },
        });
        this.logger.warn(`Escalated ticket ${ticket.caseId}: ${action.payload.reason}`);
        break;

      default:
        this.logger.log(`Action ${action.type} requires manual execution`);
    }

    // Log the action execution
    await this.prisma.ticketResponse.create({
      data: {
        ticketId,
        content: `[SYSTEM] Autonomous action executed: ${action.description}`,
        isInternal: true,
        isAiGenerated: true,
      },
    });
  }

  /**
   * Generate an auto-response draft based on the ticket context
   */
  async generateAutoResponse(ticketId: string, responseType: 'acknowledgment' | 'info_request' | 'resolution'): Promise<string> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        responses: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const templates: Record<string, string> = {
      acknowledgment: `Generate a brief, warm acknowledgment response for a customer who just replied to their support ticket. Let them know we've received their message and are looking into it. Keep it to 2-3 sentences.`,
      info_request: `Generate a polite request for more information. We need: detailed steps to reproduce the issue, expected vs actual behavior, and any relevant screenshots. Keep it friendly and concise.`,
      resolution: `Generate a brief follow-up asking if the provided solution resolved their issue. Offer additional help if needed. Keep it to 2-3 sentences.`,
    };

    const prompt = `You are a customer support agent for IRIS CRM.

TICKET: ${ticket.caseId}
SUBJECT: ${ticket.subject}
CUSTOMER: ${ticket.name || 'Customer'}

${templates[responseType]}

Write in a warm, professional tone. Do not use headers or heavy formatting. Just write natural paragraphs.`;

    try {
      const response = await this.anthropic.generateFastCompletion({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 256,
        temperature: 0.7,
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to generate auto-response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build conversation context string from ticket and responses
   */
  private buildConversationContext(ticket: SupportTicket, responses: TicketResponse[]): string {
    let context = `[ORIGINAL REQUEST]\nFrom: ${ticket.name || 'Customer'} (${ticket.email})\n${ticket.description}\n`;

    for (const response of responses) {
      const sender = response.isInternal ? '[INTERNAL NOTE]' : (response.responderId ? '[SUPPORT AGENT]' : '[CUSTOMER]');
      context += `\n${sender} (${new Date(response.createdAt).toISOString()}):\n${response.content}\n`;
    }

    return context;
  }
}
