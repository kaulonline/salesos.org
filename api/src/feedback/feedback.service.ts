// RLHF Feedback Service - Collects and exports human feedback for model improvement
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FeedbackValue } from '@prisma/client';
import {
  SubmitFeedbackDto,
  SubmitPreferencePairDto,
  CreateGoldenExampleDto,
  ExportFeedbackDto,
  FeedbackRating,
} from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit feedback for a message
   * This is the primary feedback collection endpoint
   */
  async submitFeedback(messageId: string, dto: SubmitFeedbackDto) {
    // Get the message with its context
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 10, // Get context
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Find the user query that prompted this response
    const messages = message.conversation.messages;
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    const userQuery = messageIndex > 0 ? messages[messageIndex - 1].content : '';

    // Extract tools used from metadata if available
    const toolsUsed: string[] = [];
    if (message.metadata && typeof message.metadata === 'object') {
      const meta = message.metadata as any;
      if (meta.toolsUsed) {
        toolsUsed.push(...meta.toolsUsed);
      }
    }

    // Get user ID (demo user for now)
    const user = await this.prisma.user.findFirst();
    if (!user) {
      throw new NotFoundException('No user found');
    }

    // Create or update feedback entry
    const feedbackEntry = await this.prisma.feedbackEntry.upsert({
      where: { messageId },
      create: {
        messageId,
        userId: user.id,
        rating: dto.rating as FeedbackValue,
        comment: dto.comment,
        userQuery,
        toolsUsed,
        category: dto.category || this.categorizeQuery(userQuery),
        tags: dto.tags || [],
        accuracyScore: dto.accuracyScore,
        helpfulnessScore: dto.helpfulnessScore,
        clarityScore: dto.clarityScore,
      },
      update: {
        rating: dto.rating as FeedbackValue,
        comment: dto.comment,
        category: dto.category || this.categorizeQuery(userQuery),
        tags: dto.tags || [],
        accuracyScore: dto.accuracyScore,
        helpfulnessScore: dto.helpfulnessScore,
        clarityScore: dto.clarityScore,
      },
    });

    // Also update the message's feedback field for quick access
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        feedback: dto.rating as FeedbackValue,
        feedbackComment: dto.comment,
        feedbackAt: new Date(),
      },
    });

    // Auto-promote to golden example if highly rated with good scores
    if (
      dto.rating === FeedbackRating.POSITIVE &&
      dto.accuracyScore === 5 &&
      dto.helpfulnessScore === 5
    ) {
      await this.promoteToGoldenExample(messageId);
    }

    this.logger.log(`Feedback recorded for message ${messageId}: ${dto.rating}`);

    return {
      success: true,
      feedbackId: feedbackEntry.id,
      message: 'Feedback recorded successfully',
    };
  }

  /**
   * Submit a preference pair for DPO training
   */
  async submitPreferencePair(dto: SubmitPreferencePairDto) {
    const user = await this.prisma.user.findFirst();
    if (!user) {
      throw new NotFoundException('No user found');
    }

    // Verify both messages exist
    const [chosen, rejected] = await Promise.all([
      this.prisma.message.findUnique({ where: { id: dto.chosenId } }),
      this.prisma.message.findUnique({ where: { id: dto.rejectedId } }),
    ]);

    if (!chosen || !rejected) {
      throw new NotFoundException('One or both messages not found');
    }

    const pair = await this.prisma.preferencePair.create({
      data: {
        userId: user.id,
        prompt: dto.prompt,
        chosenId: dto.chosenId,
        rejectedId: dto.rejectedId,
        preferenceStrength: dto.preferenceStrength || 0.75,
        category: dto.category,
      },
    });

    this.logger.log(`Preference pair created: ${pair.id}`);

    return {
      success: true,
      pairId: pair.id,
    };
  }

  /**
   * Create a golden example manually or from a message
   */
  async createGoldenExample(dto: CreateGoldenExampleDto) {
    const example = await this.prisma.goldenExample.create({
      data: {
        userQuery: dto.userQuery,
        assistantResponse: dto.assistantResponse,
        category: dto.category,
        tags: dto.tags || [],
        sourceMessageId: dto.sourceMessageId,
        isManuallyAdded: !dto.sourceMessageId,
      },
    });

    this.logger.log(`Golden example created: ${example.id}`);

    return {
      success: true,
      exampleId: example.id,
    };
  }

  /**
   * Promote a highly-rated message to a golden example
   */
  private async promoteToGoldenExample(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        feedbackEntry: true,
      },
    });

    if (!message || !message.feedbackEntry) return;

    const messages = message.conversation.messages;
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    const userQuery = messageIndex > 0 ? messages[messageIndex - 1].content : '';

    // Check if already exists
    const existing = await this.prisma.goldenExample.findFirst({
      where: { sourceMessageId: messageId },
    });

    if (!existing) {
      await this.prisma.goldenExample.create({
        data: {
          userQuery,
          assistantResponse: message.content,
          category: message.feedbackEntry.category || 'general',
          tags: message.feedbackEntry.tags || [],
          sourceMessageId: messageId,
          isManuallyAdded: false,
        },
      });
      this.logger.log(`Auto-promoted message ${messageId} to golden example`);
    }
  }

  /**
   * Get feedback analytics/statistics
   */
  async getAnalytics() {
    const [totalFeedback, positiveFeedback, negativeFeedback, byCategory, recentFeedback] =
      await Promise.all([
        this.prisma.feedbackEntry.count(),
        this.prisma.feedbackEntry.count({ where: { rating: 'POSITIVE' } }),
        this.prisma.feedbackEntry.count({ where: { rating: 'NEGATIVE' } }),
        this.prisma.feedbackEntry.groupBy({
          by: ['category'],
          _count: { id: true },
          _avg: {
            accuracyScore: true,
            helpfulnessScore: true,
            clarityScore: true,
          },
        }),
        this.prisma.feedbackEntry.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            message: {
              select: { content: true },
            },
          },
        }),
      ]);

    const goldenExamplesCount = await this.prisma.goldenExample.count({
      where: { isActive: true },
    });

    const preferencePairsCount = await this.prisma.preferencePair.count();

    return {
      overview: {
        totalFeedback,
        positiveFeedback,
        negativeFeedback,
        positiveRate: totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0,
        goldenExamplesCount,
        preferencePairsCount,
      },
      byCategory: byCategory.map((c) => ({
        category: c.category || 'uncategorized',
        count: c._count.id,
        avgAccuracy: c._avg.accuracyScore,
        avgHelpfulness: c._avg.helpfulnessScore,
        avgClarity: c._avg.clarityScore,
      })),
      recentFeedback: recentFeedback.map((f) => ({
        id: f.id,
        rating: f.rating,
        category: f.category,
        comment: f.comment,
        preview: f.message.content.substring(0, 100) + '...',
        createdAt: f.createdAt,
      })),
    };
  }

  /**
   * Export feedback data for RLHF training
   */
  async exportForTraining(dto: ExportFeedbackDto) {
    const where: any = {};
    if (dto.category) where.category = dto.category;
    if (dto.rating) where.rating = dto.rating;

    const feedbackEntries = await this.prisma.feedbackEntry.findMany({
      where,
      take: dto.limit || 1000,
      include: {
        message: {
          include: {
            conversation: {
              include: {
                messages: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    const format = dto.format || 'jsonl';

    if (format === 'dpo') {
      // Export preference pairs for DPO training
      const pairs = await this.prisma.preferencePair.findMany({
        where: dto.category ? { category: dto.category } : {},
        take: dto.limit || 1000,
        include: {
          chosen: true,
          rejected: true,
        },
      });

      return pairs.map((p) => ({
        prompt: p.prompt,
        chosen: p.chosen.content,
        rejected: p.rejected.content,
        preference_strength: p.preferenceStrength,
      }));
    }

    // Standard feedback export
    const data = feedbackEntries.map((entry) => {
      const messages = entry.message.conversation.messages;
      const messageIndex = messages.findIndex((m) => m.id === entry.messageId);

      // Build conversation context
      const context = messages.slice(0, messageIndex).map((m) => ({
        role: m.role.toLowerCase(),
        content: m.content,
      }));

      return {
        id: entry.id,
        prompt: entry.userQuery,
        response: entry.message.content,
        rating: entry.rating,
        scores: {
          accuracy: entry.accuracyScore,
          helpfulness: entry.helpfulnessScore,
          clarity: entry.clarityScore,
        },
        category: entry.category,
        tags: entry.tags,
        tools_used: entry.toolsUsed,
        context: context.slice(-4), // Last 4 messages for context
        comment: entry.comment,
      };
    });

    if (format === 'csv') {
      // Return CSV-compatible flat structure
      return data.map((d) => ({
        id: d.id,
        prompt: d.prompt,
        response: d.response.substring(0, 500),
        rating: d.rating,
        accuracy: d.scores.accuracy,
        helpfulness: d.scores.helpfulness,
        clarity: d.scores.clarity,
        category: d.category,
        tags: d.tags.join(','),
        tools_used: d.tools_used.join(','),
        comment: d.comment,
      }));
    }

    return data;
  }

  /**
   * Get golden examples for prompt enhancement
   */
  async getGoldenExamples(category?: string, limit: number = 3) {
    const examples = await this.prisma.goldenExample.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ avgRating: 'desc' }, { usageCount: 'asc' }],
      take: limit,
    });

    // Increment usage count
    await Promise.all(
      examples.map((e) =>
        this.prisma.goldenExample.update({
          where: { id: e.id },
          data: { usageCount: { increment: 1 } },
        }),
      ),
    );

    return examples.map((e) => ({
      userQuery: e.userQuery,
      assistantResponse: e.assistantResponse,
      category: e.category,
    }));
  }

  /**
   * Auto-categorize a query based on keywords
   */
  private categorizeQuery(query: string): string {
    const lower = query.toLowerCase();

    if (lower.includes('lead')) return 'lead_management';
    if (lower.includes('opportunit') || lower.includes('deal')) return 'opportunity_management';
    if (lower.includes('account') || lower.includes('customer')) return 'account_management';
    if (lower.includes('task') || lower.includes('todo')) return 'task_management';
    if (lower.includes('email') || lower.includes('outreach')) return 'email_drafting';
    if (lower.includes('document') || lower.includes('pdf') || lower.includes('file'))
      return 'document_search';
    if (lower.includes('forecast') || lower.includes('pipeline')) return 'analytics';
    if (lower.includes('contact')) return 'contact_management';

    return 'general';
  }
}
