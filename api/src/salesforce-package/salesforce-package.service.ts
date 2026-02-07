import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { CacheService } from '../cache/cache.service';
import { SendMessageDto, InitiateStreamDto, MessageResponseDto, PollResponseDto, CreateConversationDto } from './dto/chat-message.dto';
import type { Response } from 'express';

@Injectable()
export class SalesforcePackageService {
  private readonly logger = new Logger(SalesforcePackageService.name);
  private readonly CHUNK_CACHE_PREFIX = 'sf_pkg_chunks:';
  private readonly CHUNK_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get configuration for a package installation
   */
  async getConfig(installation: any): Promise<any> {
    const remaining = installation.apiCallLimit - installation.apiCallsToday;
    const lastReset = new Date(installation.lastResetDate);
    const resetAt = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000);

    return {
      installation: {
        orgId: installation.orgId,
        orgName: installation.orgName,
        isActive: installation.isActive,
        features: installation.features,
        apiCallLimit: installation.apiCallLimit,
        apiCallsToday: installation.apiCallsToday,
        apiCallsRemaining: remaining > 0 ? remaining : 0,
        resetDate: resetAt.toISOString(),
      },
      endpoints: {
        auth: '/api/salesforce-package/auth',
        chat: '/api/salesforce-package/chat',
        conversations: '/api/salesforce-package/conversations',
      },
      limits: {
        maxMessageLength: 10000,
        maxConversations: 100,
        rateLimitPerHour: 100,
      },
    };
  }

  /**
   * Update configuration for a package installation
   */
  async updateConfig(installation: any, updates: Partial<any>): Promise<any> {
    const allowedFields = ['features', 'apiCallLimit', 'metadata'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    const updated = await this.prisma.salesforcePackageInstallation.update({
      where: { id: installation.id },
      data: updateData,
    });

    return {
      success: true,
      installation: {
        orgId: updated.orgId,
        features: updated.features,
        apiCallLimit: updated.apiCallLimit,
      },
    };
  }

  /**
   * Get analytics for a package installation
   */
  async getAnalytics(installation: any, startDate: Date, endDate: Date): Promise<any> {
    const users = await this.prisma.salesforcePackageUser.findMany({
      where: {
        installationId: installation.id,
        lastActiveAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { messageCount: 'desc' },
    });

    const totalMessages = users.reduce((sum, u) => sum + u.messageCount, 0);
    const totalConversations = users.reduce((sum, u) => sum + u.conversationCount, 0);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      usage: {
        totalApiCalls: installation.apiCallsToday,
        totalMessages,
        totalConversations,
        activeUsers: users.length,
        avgMessagesPerUser: users.length > 0 ? Math.round(totalMessages / users.length) : 0,
        peakUsageDay: new Date().toISOString().split('T')[0], // TODO: Implement proper tracking
      },
      users: users.map((u) => ({
        email: u.email,
        messageCount: u.messageCount,
        conversationCount: u.conversationCount,
        lastActiveAt: u.lastActiveAt.toISOString(),
      })),
      apiCallsByDay: [], // TODO: Implement daily tracking
    };
  }

  /**
   * List conversations for a user
   */
  async getConversations(
    user: any,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    // Get or create IRIS user link
    const irisUserId = await this.getOrCreateIrisUser(user);

    const conversations = await this.prisma.conversation.findMany({
      where: { userId: irisUserId },
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    const total = await this.prisma.conversation.count({
      where: { userId: irisUserId },
    });

    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        messageCount: c._count.messages,
        lastMessage: c.messages[0]
          ? {
              content: c.messages[0].content.substring(0, 100),
              createdAt: c.messages[0].createdAt.toISOString(),
            }
          : null,
      })),
      total,
      hasMore: offset + conversations.length < total,
    };
  }

  /**
   * Get a specific conversation with messages
   */
  async getConversation(user: any, conversationId: string): Promise<any> {
    const irisUserId = await this.getOrCreateIrisUser(user);

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: irisUserId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          metadata: m.metadata,
        })),
      },
    };
  }

  /**
   * Create a new conversation
   */
  async createConversation(user: any, dto: CreateConversationDto): Promise<any> {
    const irisUserId = await this.getOrCreateIrisUser(user);

    const conversation = await this.prisma.conversation.create({
      data: {
        userId: irisUserId,
        title: dto.title || 'New Conversation',
        metadata: (dto.metadata || {}) as any,
      },
    });

    // Increment user conversation count
    await this.prisma.salesforcePackageUser.update({
      where: { id: user.id },
      data: { conversationCount: { increment: 1 } },
    });

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
      },
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(user: any, conversationId: string): Promise<any> {
    const irisUserId = await this.getOrCreateIrisUser(user);

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: irisUserId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return {
      success: true,
      message: 'Conversation deleted',
    };
  }

  /**
   * Send a message and get complete response (non-streaming)
   */
  async sendMessage(
    user: any,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const irisUserId = await this.getOrCreateIrisUser(user);
    const installation = user.installation;

    // Validate message length
    if (dto.message.length > 10000) {
      throw new BadRequestException('Message exceeds maximum length of 10000 characters');
    }

    // Get or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: irisUserId,
      },
    });

    if (!conversation) {
      // Create new conversation with the provided ID pattern
      conversation = await this.prisma.conversation.create({
        data: {
          userId: irisUserId,
          title: dto.message.substring(0, 50),
          metadata: {
            mode: dto.mode || 'crm',
            salesforceContext: dto.context ? JSON.parse(JSON.stringify(dto.context)) : null,
            packageInstallationId: installation.id,
          },
        },
      });
    }

    // Build context-enriched message
    const enrichedMessage = this.buildEnrichedMessage(dto);

    // Use the conversations service to process the message
    // Note: This would need to be adapted based on your actual ConversationsService implementation
    const response = await this.processMessage(irisUserId, conversation.id, enrichedMessage, dto.mode);

    // Update user stats
    await this.prisma.salesforcePackageUser.update({
      where: { id: user.id },
      data: {
        messageCount: { increment: 1 },
        lastActiveAt: new Date(),
      },
    });

    const remaining = installation.apiCallLimit - installation.apiCallsToday - 1;

    return {
      conversationId: conversation.id,
      message: {
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
        suggestedFollowUps: response.suggestedFollowUps,
        metadata: response.metadata,
      },
      usage: {
        tokensUsed: response.tokensUsed || 0,
        apiCallsRemaining: remaining > 0 ? remaining : 0,
      },
    };
  }

  /**
   * Initiate a streaming request and return request ID
   */
  async initiateStream(
    user: any,
    conversationId: string,
    dto: InitiateStreamDto,
  ): Promise<{ requestId: string; conversationId: string }> {
    const irisUserId = await this.getOrCreateIrisUser(user);
    const requestId = dto.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: irisUserId,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          userId: irisUserId,
          title: dto.message.substring(0, 50),
          metadata: {
            mode: dto.mode || 'crm',
            salesforceContext: dto.context ? JSON.parse(JSON.stringify(dto.context)) : null,
            packageInstallationId: user.installation.id,
          },
        },
      });
    }

    // Initialize chunk storage in cache
    await this.cacheService.set(
      `${this.CHUNK_CACHE_PREFIX}${requestId}`,
      JSON.stringify({
        chunks: [],
        isComplete: false,
        conversationId: conversation.id,
        userId: user.id,
      }),
      this.CHUNK_TTL,
    );

    // Start processing in background
    this.processStreamingMessage(user, conversation.id, dto, requestId).catch((error) => {
      this.logger.error(`Streaming error for request ${requestId}:`, error);
    });

    return {
      requestId,
      conversationId: conversation.id,
    };
  }

  /**
   * Poll for message chunks
   */
  async pollChunks(requestId: string, lastChunkIndex: number): Promise<PollResponseDto> {
    const cached = await this.cacheService.get(`${this.CHUNK_CACHE_PREFIX}${requestId}`);

    if (!cached || typeof cached !== 'string') {
      return {
        chunks: [],
        isComplete: true,
        totalChunks: 0,
      };
    }

    const data = JSON.parse(cached);
    const newChunks = data.chunks.slice(lastChunkIndex);

    return {
      chunks: newChunks,
      isComplete: data.isComplete,
      totalChunks: data.chunks.length,
    };
  }

  /**
   * Stream response via SSE
   */
  async streamResponse(
    user: any,
    conversationId: string,
    dto: SendMessageDto,
    res: Response,
  ): Promise<void> {
    const irisUserId = await this.getOrCreateIrisUser(user);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Get or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: irisUserId,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          userId: irisUserId,
          title: dto.message.substring(0, 50),
          metadata: {
            mode: dto.mode || 'crm',
            salesforceContext: dto.context ? JSON.parse(JSON.stringify(dto.context)) : null,
            packageInstallationId: user.installation.id,
          },
        },
      });
    }

    const messageId = `msg_${Date.now()}`;

    // Send start event
    res.write(`event: start\ndata: ${JSON.stringify({ conversationId: conversation.id, messageId })}\n\n`);

    try {
      // Build enriched message
      const enrichedMessage = this.buildEnrichedMessage(dto);

      // Process and stream response
      // This would integrate with your actual AI service
      const chunks = await this.generateStreamingResponse(irisUserId, conversation.id, enrichedMessage, dto.mode);

      for (const chunk of chunks) {
        res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay for realistic streaming
      }

      // Send complete event
      res.write(`event: complete\ndata: ${JSON.stringify({ messageId, totalTokens: 150 })}\n\n`);

      // Update user stats
      await this.prisma.salesforcePackageUser.update({
        where: { id: user.id },
        data: {
          messageCount: { increment: 1 },
          lastActiveAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Streaming error:', error);
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      res.end();
    }
  }

  // ========================
  // Private Helper Methods
  // ========================

  /**
   * Get or create an IRIS user linked to the Salesforce package user
   */
  private async getOrCreateIrisUser(packageUser: any): Promise<string> {
    if (packageUser.irisUserId) {
      return packageUser.irisUserId;
    }

    // Create a new IRIS user for this Salesforce package user
    const irisUser = await this.prisma.user.create({
      data: {
        email: `sf_${packageUser.salesforceUserId}@package.iris`,
        passwordHash: 'sf_package_user_no_login',
        name: packageUser.name,
        role: 'USER',
        status: 'ACTIVE',
        settings: {
          source: 'salesforce_package',
          packageInstallationId: packageUser.installationId,
        },
      },
    });

    // Link the users
    await this.prisma.salesforcePackageUser.update({
      where: { id: packageUser.id },
      data: { irisUserId: irisUser.id },
    });

    return irisUser.id;
  }

  /**
   * Build enriched message with comprehensive Salesforce context
   * This creates a rich context that enables highly contextual AI responses
   */
  private buildEnrichedMessage(dto: SendMessageDto): string {
    let message = dto.message;

    if (dto.context) {
      const contextSections: string[] = [];

      // User Context
      if (dto.context.user) {
        const user = dto.context.user;
        contextSections.push(`## Current User
- Name: ${user.name || 'Unknown'}
- Title: ${user.title || 'N/A'}
- Department: ${user.department || 'N/A'}
- Profile: ${user.profile || 'N/A'}
- Timezone: ${user.timezone || 'N/A'}`);
      }

      // Record Context
      if (dto.context.objectType && dto.context.record) {
        const record = dto.context.record;
        contextSections.push(`## Currently Viewing: ${dto.context.objectType}
- Record ID: ${dto.context.recordId}
- Name: ${record.name || 'Unknown'}
${this.formatRecordDetails(dto.context.objectType, record)}`);
      }

      // Account Context
      if (dto.context.account) {
        const account = dto.context.account;
        contextSections.push(`## Related Account
- Name: ${account.name || 'Unknown'}
- Industry: ${account.industry || 'N/A'}
- Type: ${account.type || 'N/A'}
- Annual Revenue: ${account.annualRevenue ? `$${account.annualRevenue.toLocaleString()}` : 'N/A'}`);
      }

      // Stakeholders/Contacts
      if (dto.context.stakeholders && dto.context.stakeholders.length > 0) {
        const stakeholdersStr = dto.context.stakeholders
          .slice(0, 5)
          .map((s: any) => `- ${s.name} (${s.title || 'No title'}): ${s.role || 'Contact'}${s.isPrimary ? ' [Primary]' : ''}`)
          .join('\n');
        contextSections.push(`## Key Stakeholders\n${stakeholdersStr}`);
      } else if (dto.context.contacts && dto.context.contacts.length > 0) {
        const contactsStr = dto.context.contacts
          .slice(0, 5)
          .map((c: any) => `- ${c.name} (${c.title || 'No title'}): ${c.email || 'No email'}`)
          .join('\n');
        contextSections.push(`## Related Contacts\n${contactsStr}`);
      }

      // Open Opportunities
      if (dto.context.openOpportunities && dto.context.openOpportunities.length > 0) {
        const oppsStr = dto.context.openOpportunities
          .slice(0, 5)
          .map((o: any) => `- ${o.name}: $${o.amount?.toLocaleString() || '0'} (${o.stage}, Close: ${o.closeDate || 'TBD'})`)
          .join('\n');
        contextSections.push(`## Open Opportunities (Pipeline: $${dto.context.pipelineValue?.toLocaleString() || '0'})\n${oppsStr}`);
      }

      // Open Cases
      if (dto.context.openCases && dto.context.openCases.length > 0) {
        const casesStr = dto.context.openCases
          .slice(0, 3)
          .map((c: any) => `- [${c.priority || 'Normal'}] ${c.subject}: ${c.status}`)
          .join('\n');
        contextSections.push(`## Open Support Cases\n${casesStr}`);
      }

      // Deal Health for Opportunities
      if (dto.context.dealHealth) {
        const health = dto.context.dealHealth;
        let healthSection = `## Deal Health Score: ${health.score}% (${health.status})`;
        if (health.risks && health.risks.length > 0) {
          healthSection += `\nRisks:\n${health.risks.map((r: string) => `- ⚠️ ${r}`).join('\n')}`;
        }
        if (health.positives && health.positives.length > 0) {
          healthSection += `\nPositives:\n${health.positives.map((p: string) => `- ✅ ${p}`).join('\n')}`;
        }
        contextSections.push(healthSection);
      }

      // Lead Score
      if (dto.context.leadScore !== undefined) {
        contextSections.push(`## Lead Score: ${dto.context.leadScore}/100${dto.context.leadAgeDays ? ` (Age: ${dto.context.leadAgeDays} days)` : ''}`);
      }

      // Competitors
      if (dto.context.competitors && dto.context.competitors.length > 0) {
        const compStr = dto.context.competitors
          .map((c: any) => `- ${c.name}${c.strengths ? ` | Strengths: ${c.strengths}` : ''}${c.weaknesses ? ` | Weaknesses: ${c.weaknesses}` : ''}`)
          .join('\n');
        contextSections.push(`## Competitors\n${compStr}`);
      }

      // Recent Activities
      if (dto.context.recentActivities && dto.context.recentActivities.length > 0) {
        const activitiesStr = dto.context.recentActivities
          .slice(0, 3)
          .map((a: any) => `- [${a.type}] ${a.subject}: ${a.status || a.date || 'N/A'}`)
          .join('\n');
        contextSections.push(`## Recent Activities\n${activitiesStr}`);
      }

      // Global Context (when not on a record)
      if (dto.context.contextType === 'global') {
        if (dto.context.pipelineSummary) {
          const pipeline = dto.context.pipelineSummary;
          contextSections.push(`## Your Pipeline Summary
- Total Pipeline: $${pipeline.totalPipeline?.toLocaleString() || '0'}
- Open Opportunities: ${pipeline.totalOpportunities || 0}
- Closing This Month: ${pipeline.closingThisMonth?.count || 0} deals worth $${pipeline.closingThisMonth?.amount?.toLocaleString() || '0'}`);
        }

        if (dto.context.todaysTasks && dto.context.todaysTasks.length > 0) {
          const tasksStr = dto.context.todaysTasks
            .slice(0, 5)
            .map((t: any) => `- [${t.priority || 'Normal'}] ${t.subject}${t.relatedTo ? ` (${t.relatedTo})` : ''}`)
            .join('\n');
          contextSections.push(`## Today's Tasks\n${tasksStr}`);
        }
      }

      // Build the enriched message
      if (contextSections.length > 0) {
        const contextBlock = `<salesforce_context>
${contextSections.join('\n\n')}
</salesforce_context>

`;
        message = contextBlock + `User Query: ${message}`;
      }
    }

    return message;
  }

  /**
   * Format record-specific details based on object type
   */
  private formatRecordDetails(objectType: string, record: any): string {
    const details: string[] = [];

    switch (objectType) {
      case 'Account':
        if (record.industry) details.push(`- Industry: ${record.industry}`);
        if (record.type) details.push(`- Type: ${record.type}`);
        if (record.website) details.push(`- Website: ${record.website}`);
        if (record.annualRevenue) details.push(`- Annual Revenue: $${record.annualRevenue.toLocaleString()}`);
        if (record.employees) details.push(`- Employees: ${record.employees}`);
        if (record.location) details.push(`- Location: ${record.location}`);
        if (record.owner) details.push(`- Owner: ${record.owner}`);
        break;

      case 'Contact':
        if (record.title) details.push(`- Title: ${record.title}`);
        if (record.department) details.push(`- Department: ${record.department}`);
        if (record.email) details.push(`- Email: ${record.email}`);
        if (record.phone) details.push(`- Phone: ${record.phone}`);
        if (record.leadSource) details.push(`- Lead Source: ${record.leadSource}`);
        break;

      case 'Opportunity':
        if (record.amount) details.push(`- Amount: $${record.amount.toLocaleString()}`);
        if (record.stage) details.push(`- Stage: ${record.stage}`);
        if (record.probability) details.push(`- Probability: ${record.probability}%`);
        if (record.closeDate) details.push(`- Close Date: ${record.closeDate}`);
        if (record.daysUntilClose !== undefined && record.daysUntilClose !== null) {
          details.push(`- Days Until Close: ${record.daysUntilClose}`);
        }
        if (record.nextStep) details.push(`- Next Step: ${record.nextStep}`);
        if (record.forecastCategory) details.push(`- Forecast: ${record.forecastCategory}`);
        break;

      case 'Lead':
        if (record.company) details.push(`- Company: ${record.company}`);
        if (record.title) details.push(`- Title: ${record.title}`);
        if (record.status) details.push(`- Status: ${record.status}`);
        if (record.rating) details.push(`- Rating: ${record.rating}`);
        if (record.industry) details.push(`- Industry: ${record.industry}`);
        if (record.annualRevenue) details.push(`- Annual Revenue: $${record.annualRevenue.toLocaleString()}`);
        break;

      case 'Case':
        if (record.caseNumber) details.push(`- Case Number: ${record.caseNumber}`);
        if (record.status) details.push(`- Status: ${record.status}`);
        if (record.priority) details.push(`- Priority: ${record.priority}`);
        if (record.type) details.push(`- Type: ${record.type}`);
        if (record.origin) details.push(`- Origin: ${record.origin}`);
        if (record.caseAgeDays !== undefined) details.push(`- Age: ${record.caseAgeDays} days`);
        break;

      case 'Task':
      case 'Event':
        if (record.status) details.push(`- Status: ${record.status}`);
        if (record.priority) details.push(`- Priority: ${record.priority}`);
        if (record.dueDate) details.push(`- Due Date: ${record.dueDate}`);
        if (record.relatedTo) details.push(`- Related To: ${record.relatedTo}`);
        break;
    }

    return details.join('\n');
  }

  /**
   * Process a message and return response (simplified implementation)
   */
  private async processMessage(
    userId: string,
    conversationId: string,
    message: string,
    mode?: string,
  ): Promise<any> {
    // Store user message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'USER',
        content: message,
      },
    });

    // Here you would integrate with your actual ConversationsService
    // For now, return a placeholder response
    const assistantContent = `I understand you're asking about: "${message.substring(0, 100)}..."

I'm processing your request through the IRIS Salesforce Package. In a full implementation, this would:
1. Analyze your query using Claude AI
2. Execute any relevant CRM tools
3. Return comprehensive results

This response demonstrates the API connectivity is working correctly.`;

    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: assistantContent,
      },
    });

    // Update conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      messageId: assistantMessage.id,
      content: assistantContent,
      toolCalls: [],
      suggestedFollowUps: [
        'Show me my top leads',
        'Update this opportunity',
        'Search for similar accounts',
      ],
      metadata: { mode },
      tokensUsed: 150,
    };
  }

  /**
   * Process streaming message in background
   */
  private async processStreamingMessage(
    user: any,
    conversationId: string,
    dto: SendMessageDto,
    requestId: string,
  ): Promise<void> {
    try {
      const enrichedMessage = this.buildEnrichedMessage(dto);
      const chunks = await this.generateStreamingResponse(
        user.irisUserId || user.id,
        conversationId,
        enrichedMessage,
        dto.mode,
      );

      const cachedData = {
        chunks: chunks.map((content, index) => ({
          index,
          content,
          type: index === chunks.length - 1 ? 'complete' : 'text',
        })),
        isComplete: true,
        conversationId,
      };

      await this.cacheService.set(
        `${this.CHUNK_CACHE_PREFIX}${requestId}`,
        JSON.stringify(cachedData),
        this.CHUNK_TTL,
      );

      // Update user stats
      await this.prisma.salesforcePackageUser.update({
        where: { id: user.id },
        data: {
          messageCount: { increment: 1 },
          lastActiveAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error processing streaming message:`, error);

      await this.cacheService.set(
        `${this.CHUNK_CACHE_PREFIX}${requestId}`,
        JSON.stringify({
          chunks: [{ index: 0, content: `Error: ${error.message}`, type: 'complete' }],
          isComplete: true,
        }),
        this.CHUNK_TTL,
      );
    }
  }

  /**
   * Generate streaming response chunks (simplified)
   */
  private async generateStreamingResponse(
    userId: string,
    conversationId: string,
    message: string,
    mode?: string,
  ): Promise<string[]> {
    // This would integrate with your actual AI streaming service
    // For demonstration, return simulated chunks
    const fullResponse = `I'm processing your request through the IRIS Salesforce Package.

Your query was: "${message.substring(0, 50)}..."

Here's what I can help you with:
• Search and manage leads, accounts, and opportunities
• Get real-time company research and intelligence
• Draft emails and schedule follow-ups
• Analyze documents and contracts
• Generate reports and insights

How would you like me to assist you today?`;

    // Split into chunks for streaming effect
    const words = fullResponse.split(' ');
    const chunks: string[] = [];
    let current = '';

    for (let i = 0; i < words.length; i++) {
      current += (current ? ' ' : '') + words[i];
      if (current.length > 30 || i === words.length - 1) {
        chunks.push(current);
        current = '';
      }
    }

    return chunks;
  }
}
