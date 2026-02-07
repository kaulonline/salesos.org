import { IsString, IsEmail, IsOptional, IsArray } from 'class-validator';

/**
 * DTO for inbound email webhook (SendGrid/Mailgun format)
 */
export class InboundEmailDto {
  @IsEmail()
  from: string;

  @IsString()
  @IsOptional()
  fromName?: string;

  @IsString()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  text: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsString()
  @IsOptional()
  messageId?: string;

  @IsArray()
  @IsOptional()
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    url?: string;
  }>;

  @IsString()
  @IsOptional()
  inReplyTo?: string;

  @IsString()
  @IsOptional()
  references?: string;
}

/**
 * AI Analysis result for a ticket
 */
export interface TicketAIAnalysis {
  sentiment: 'frustrated' | 'neutral' | 'satisfied' | 'urgent';
  urgencyScore: number; // 1-10
  suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  shouldEscalate: boolean;
  escalationReason?: string;
  shouldClose: boolean; // Customer indicated ticket can be closed
  closeReason?: string;
  keyIssues: string[];
  suggestedActions: string[];
  autoResponseDraft?: string;
  requiresHumanReview: boolean;
  confidence: number; // 0-1
}

/**
 * Autonomous action that can be taken on a ticket
 */
export interface AutonomousAction {
  type: 'UPDATE_PRIORITY' | 'UPDATE_STATUS' | 'SEND_AUTO_RESPONSE' | 'ESCALATE' | 'REQUEST_INFO';
  description: string;
  payload: Record<string, any>;
  confidence: number;
  approved?: boolean;
  executedAt?: Date;
}
