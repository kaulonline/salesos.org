import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
  Headers,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { SupportService } from './support.service';
import { EmailPollingService } from './email-polling.service';
import { AIAgentsService } from './ai-agents.service';
import { SupportQueuesService } from './support-queues.service';
import { CreateAIAgentDto, UpdateAIAgentDto } from './dto/ai-agent.dto';
import { CreateQueueDto, UpdateQueueDto } from './dto/queue.dto';
import {
  InitiateTicketDto,
  VerifyTicketDto,
  CheckTicketStatusDto,
  CreateTicketDto,
} from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateResponseDto } from './dto/create-response.dto';
import { InboundEmailDto } from './dto/inbound-email.dto';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { TicketStatus, TicketCategory, TicketPriority, AIAgentSpecialization, AIAgentStatus } from '@prisma/client';

// Role-based access control
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler()) ||
                  this.reflector.get<string[]>('roles', context.getClass());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return roles.includes(user?.role?.toUpperCase());
  }
}

// ==================== PUBLIC ENDPOINTS ====================

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Public: Initiate ticket submission (sends verification email)
   */
  @Post('initiate')
  initiateTicket(@Body() dto: InitiateTicketDto) {
    return this.supportService.initiateTicketSubmission(dto);
  }

  /**
   * Public: Verify email and create ticket
   */
  @Post('verify')
  verifyAndCreate(@Body() dto: VerifyTicketDto) {
    return this.supportService.verifyAndCreateTicket(dto);
  }

  /**
   * Public: Check ticket status by case ID and email
   */
  @Post('status')
  checkStatus(@Body() dto: CheckTicketStatusDto) {
    return this.supportService.checkTicketStatus(dto);
  }

  /**
   * Public: Get ticket info by feedback token (for feedback page)
   */
  @Get('feedback/:token')
  getFeedbackInfo(@Param('token') token: string) {
    return this.supportService.getTicketByFeedbackToken(token);
  }

  /**
   * Public: Submit CSAT feedback
   */
  @Post('feedback/:token')
  submitFeedback(
    @Param('token') token: string,
    @Body() body: { rating: number; feedback?: string },
  ) {
    return this.supportService.submitFeedback(token, body.rating, body.feedback);
  }
}

// ==================== USER ENDPOINTS (logged-in users) ====================

@Controller('support/user')
@UseGuards(JwtAuthGuard)
export class UserSupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * User: Get my tickets
   */
  @Get('tickets')
  getMyTickets(@Request() req) {
    return this.supportService.getUserTickets(req.user.userId);
  }

  /**
   * User: Get single ticket
   */
  @Get('tickets/:id')
  getMyTicket(@Request() req, @Param('id') id: string) {
    return this.supportService.getUserTicket(req.user.userId, id);
  }

  /**
   * User: Create ticket (skips email verification for logged-in users)
   */
  @Post('tickets')
  createTicket(@Request() req, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicketForUser(req.user.userId, dto);
  }
}

// ==================== ADMIN ENDPOINTS ====================

@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly emailPolling: EmailPollingService,
    private readonly aiAgentsService: AIAgentsService,
    private readonly queuesService: SupportQueuesService,
  ) {}

  /**
   * Admin: Get all tickets with filtering
   */
  @Get('tickets')
  getAllTickets(
    @Query('status') status?: TicketStatus,
    @Query('category') category?: TicketCategory,
    @Query('priority') priority?: TicketPriority,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supportService.getAllTickets({
      status,
      category,
      priority,
      assignedToId,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Admin: Get ticket statistics
   */
  @Get('stats')
  getStats() {
    return this.supportService.getStats();
  }

  /**
   * Admin: Get CSAT statistics
   */
  @Get('csat-stats')
  getCSATStats() {
    return this.supportService.getCSATStats();
  }

  /**
   * Admin: Manually send feedback request for a ticket
   */
  @Post('tickets/:id/send-feedback')
  sendFeedbackRequest(@Param('id') id: string) {
    return this.supportService.sendFeedbackRequest(id);
  }

  /**
   * Admin: Get ticket by ID
   */
  @Get('tickets/:id')
  getTicket(@Param('id') id: string) {
    return this.supportService.getTicketById(id);
  }

  /**
   * Admin: Update ticket (status, priority, assignee, etc.)
   */
  @Patch('tickets/:id')
  updateTicket(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.supportService.updateTicket(id, dto, req.user.userId);
  }

  /**
   * Admin: Add response to ticket
   */
  @Post('tickets/:id/respond')
  addResponse(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateResponseDto,
  ) {
    return this.supportService.addResponse(id, dto, req.user.userId);
  }

  /**
   * Admin: Generate AI draft response
   */
  @Post('tickets/:id/generate-draft')
  async generateDraft(@Param('id') id: string) {
    const draft = await this.supportService.generateAiDraft(id);
    return { draft };
  }

  /**
   * Admin: Get pending AI actions for a ticket
   */
  @Get('tickets/:id/actions')
  getPendingActions(@Param('id') id: string) {
    return this.supportService.getPendingActions(id);
  }

  /**
   * Admin: Approve and execute a pending action
   */
  @Post('tickets/:id/actions/:index/approve')
  approveAction(
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.supportService.approveAction(id, parseInt(index));
  }

  /**
   * Admin: Dismiss a pending action
   */
  @Post('tickets/:id/actions/:index/dismiss')
  dismissAction(
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.supportService.dismissAction(id, parseInt(index));
  }

  /**
   * Admin: Re-analyze a ticket and get fresh AI suggestions
   */
  @Post('tickets/:id/analyze')
  reanalyzeTicket(@Param('id') id: string) {
    return this.supportService.reanalyzeTicket(id);
  }

  /**
   * Admin: Get email polling status
   */
  @Get('email-polling/status')
  getEmailPollingStatus() {
    return this.emailPolling.getStatus();
  }

  /**
   * Admin: Manually trigger email polling
   */
  @Post('email-polling/poll')
  async triggerEmailPoll() {
    const result = await this.emailPolling.pollForReplies();
    return {
      success: true,
      ...result,
      message: `Processed ${result.processed} emails with ${result.errors} errors`,
    };
  }

  // ==================== AI AGENTS ====================

  /**
   * Admin: Get all AI agents
   */
  @Get('ai-agents')
  getAIAgents(
    @Query('status') status?: AIAgentStatus,
    @Query('specialization') specialization?: AIAgentSpecialization,
    @Query('isOnline') isOnline?: string,
    @Query('search') search?: string,
  ) {
    return this.aiAgentsService.findAll({
      status,
      specialization,
      isOnline: isOnline === 'true' ? true : isOnline === 'false' ? false : undefined,
      search,
    });
  }

  /**
   * Admin: Get AI agents stats
   */
  @Get('ai-agents/stats')
  getAIAgentsStats() {
    return this.aiAgentsService.getStats();
  }

  /**
   * Admin: Get available AI agents for assignment
   */
  @Get('ai-agents/available')
  getAvailableAgents(@Query('specialization') specialization?: AIAgentSpecialization) {
    return this.aiAgentsService.getAvailableAgents(specialization);
  }

  /**
   * Admin: Get single AI agent
   */
  @Get('ai-agents/:id')
  getAIAgent(@Param('id') id: string) {
    return this.aiAgentsService.findOne(id);
  }

  /**
   * Admin: Create AI agent
   */
  @Post('ai-agents')
  createAIAgent(@Body() dto: CreateAIAgentDto) {
    return this.aiAgentsService.create(dto);
  }

  /**
   * Admin: Update AI agent
   */
  @Patch('ai-agents/:id')
  updateAIAgent(@Param('id') id: string, @Body() dto: UpdateAIAgentDto) {
    return this.aiAgentsService.update(id, dto);
  }

  /**
   * Admin: Toggle AI agent online status
   */
  @Post('ai-agents/:id/toggle-online')
  toggleAIAgentOnline(@Param('id') id: string) {
    return this.aiAgentsService.toggleOnline(id);
  }

  /**
   * Admin: Delete AI agent
   */
  @Delete('ai-agents/:id')
  deleteAIAgent(@Param('id') id: string) {
    return this.aiAgentsService.remove(id);
  }

  // ==================== SUPPORT QUEUES ====================

  /**
   * Admin: Get all queues
   */
  @Get('queues')
  getQueues(@Query('activeOnly') activeOnly?: string) {
    return this.queuesService.findAll(activeOnly === 'true');
  }

  /**
   * Admin: Get queue stats
   */
  @Get('queues/stats')
  getQueuesStats() {
    return this.queuesService.getStats();
  }

  /**
   * Admin: Get single queue
   */
  @Get('queues/:id')
  getQueue(@Param('id') id: string) {
    return this.queuesService.findOne(id);
  }

  /**
   * Admin: Create queue
   */
  @Post('queues')
  createQueue(@Body() dto: CreateQueueDto) {
    return this.queuesService.create(dto);
  }

  /**
   * Admin: Update queue
   */
  @Patch('queues/:id')
  updateQueue(@Param('id') id: string, @Body() dto: UpdateQueueDto) {
    return this.queuesService.update(id, dto);
  }

  /**
   * Admin: Delete queue
   */
  @Delete('queues/:id')
  deleteQueue(@Param('id') id: string) {
    return this.queuesService.remove(id);
  }

  /**
   * Admin: Assign agent to queue
   */
  @Post('queues/:id/agents')
  assignAgentToQueue(
    @Param('id') queueId: string,
    @Body() body: { agentId: string; priority?: number },
  ) {
    return this.queuesService.assignAgent(queueId, body);
  }

  /**
   * Admin: Remove agent from queue
   */
  @Delete('queues/:id/agents/:agentId')
  removeAgentFromQueue(
    @Param('id') queueId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.queuesService.removeAgent(queueId, agentId);
  }

  /**
   * Admin: Assign ticket to AI agent
   */
  @Post('tickets/:id/assign-agent')
  async assignTicketToAgent(
    @Param('id') ticketId: string,
    @Body() body: { agentId: string },
  ) {
    return this.supportService.assignToAIAgent(ticketId, body.agentId);
  }

  /**
   * Admin: Route ticket to queue
   */
  @Post('tickets/:id/route')
  async routeTicketToQueue(@Param('id') ticketId: string) {
    return this.supportService.routeTicketToQueue(ticketId);
  }
}

// ==================== WEBHOOK ENDPOINTS ====================

@Controller('webhooks/support')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly supportService: SupportService) {}

  /**
   * Webhook: Process inbound email from SendGrid/Mailgun
   *
   * Configure your email provider to forward replies to:
   * POST https://engage.iriseller.com/api/webhooks/support/inbound-email
   *
   * Authentication: Include X-Webhook-Secret header with WEBHOOK_SECRET env var
   */
  @Post('inbound-email')
  async processInboundEmail(
    @Body() body: any,
    @Headers('x-webhook-secret') webhookSecret?: string,
  ) {
    // Validate webhook secret
    const expectedSecret = process.env.WEBHOOK_SECRET || 'iris-support-webhook-secret';
    if (webhookSecret !== expectedSecret) {
      this.logger.warn('Invalid webhook secret received');
      throw new UnauthorizedException('Invalid webhook secret');
    }

    // Parse the email based on provider format
    let email: InboundEmailDto;

    // SendGrid format
    if (body.from && body.subject) {
      email = {
        from: this.extractEmail(body.from),
        fromName: this.extractName(body.from),
        to: body.to,
        subject: body.subject,
        text: body.text || body.plain || '',
        html: body.html,
        messageId: body.messageId || body['Message-Id'],
        attachments: body.attachments,
      };
    }
    // Mailgun format
    else if (body.sender && body.Subject) {
      email = {
        from: body.sender,
        fromName: body['From'],
        to: body.recipient,
        subject: body.Subject,
        text: body['body-plain'] || body['stripped-text'] || '',
        html: body['body-html'],
        messageId: body['Message-Id'],
      };
    }
    // Generic format
    else {
      this.logger.error('Unknown email format received', body);
      return { success: false, message: 'Unknown email format' };
    }

    this.logger.log(`Processing inbound email from ${email.from}`);

    const result = await this.supportService.processInboundEmail(email);
    return result;
  }

  /**
   * Extract email address from "Name <email@example.com>" format
   */
  private extractEmail(from: string): string {
    const match = from.match(/<([^>]+)>/);
    return match ? match[1].toLowerCase() : from.toLowerCase().trim();
  }

  /**
   * Extract name from "Name <email@example.com>" format
   */
  private extractName(from: string): string | undefined {
    const match = from.match(/^([^<]+)</);
    return match ? match[1].trim() : undefined;
  }
}
