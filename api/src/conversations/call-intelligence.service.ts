import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import {
  CallSearchFiltersDto,
  CallSearchResultDto,
  CallAnalyticsDto,
  SavedSearchDto,
  TrackerDefinitionDto,
  CreateStreamDto,
  CallPlatform,
  CallSentiment,
  CallParticipantDto,
  CallMentionDto,
} from './dto/call-search.dto';

@Injectable()
export class CallIntelligenceService {
  private readonly logger = new Logger(CallIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  /**
   * Search calls/meetings with transcript content
   */
  async searchCalls(
    filters: CallSearchFiltersDto,
    userId: string,
    isAdmin?: boolean,
  ): Promise<{ results: CallSearchResultDto[]; analytics: CallAnalyticsDto }> {
    this.logger.log(`Searching calls with filters: ${JSON.stringify(filters)}`);

    const where: any = {};

    if (!isAdmin) {
      where.ownerId = userId;
    }

    if (filters.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters.opportunityId) {
      where.opportunityId = filters.opportunityId;
    }

    if (filters.platform) {
      where.platform = filters.platform.toUpperCase();
    }

    if (filters.dateFrom || filters.dateTo) {
      where.scheduledStart = {};
      if (filters.dateFrom) where.scheduledStart.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.scheduledStart.lte = new Date(filters.dateTo);
    }

    if (filters.minDuration || filters.maxDuration) {
      where.duration = {};
      if (filters.minDuration) where.duration.gte = filters.minDuration;
      if (filters.maxDuration) where.duration.lte = filters.maxDuration;
    }

    // Get meetings with transcripts
    const meetings = await this.prisma.meetingSession.findMany({
      where: {
        ...where,
        transcriptText: { not: null },
      },
      include: {
        account: true,
        opportunity: true,
        participants: {
          include: {
            contact: true,
          },
        },
        analysis: true,
        transcriptSegments: {
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { scheduledStart: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });

    // Filter by text content if query provided
    let filteredMeetings = meetings;
    const matchedMentions = new Map<string, CallMentionDto[]>();

    if (filters.query || filters.phrases?.length) {
      const searchTerms = [
        ...(filters.query ? [filters.query] : []),
        ...(filters.phrases || []),
      ].map((t) => t.toLowerCase());

      filteredMeetings = meetings.filter((meeting) => {
        const transcript = (meeting.transcriptText || '').toLowerCase();
        const mentions: CallMentionDto[] = [];

        for (const term of searchTerms) {
          if (transcript.includes(term)) {
            // Find context around the match
            const segments = meeting.transcriptSegments || [];
            for (const segment of segments) {
              const segmentText = segment.text.toLowerCase();
              if (segmentText.includes(term)) {
                // Filter by mentionedBy if specified
                if (filters.mentionedBy && filters.mentionedBy !== 'any') {
                  const participant = meeting.participants?.find(
                    (p) => p.email === segment.speakerEmail || p.name === segment.speakerName,
                  );
                  if (participant) {
                    if (filters.mentionedBy === 'internal' && !participant.isInternal) continue;
                    if (filters.mentionedBy === 'external' && participant.isInternal) continue;
                  }
                }

                mentions.push({
                  text: term,
                  timestamp: segment.startTime,
                  speaker: segment.speakerName || 'Unknown',
                  context: segment.text,
                });
              }
            }

            if (mentions.length > 0) {
              matchedMentions.set(meeting.id, mentions);
              return true;
            }
          }
        }
        return false;
      });
    }

    // Transform to response format
    const results = filteredMeetings.map((meeting) =>
      this.transformToCallResult(meeting, matchedMentions.get(meeting.id) || []),
    );

    // Calculate analytics
    const analytics = await this.calculateAnalytics(filters, results, meetings.length, userId);

    return { results, analytics };
  }

  /**
   * Get call details with full transcript
   */
  async getCallDetails(callId: string, userId: string): Promise<CallSearchResultDto | null> {
    const meeting = await this.prisma.meetingSession.findFirst({
      where: {
        id: callId,
      },
      include: {
        account: true,
        opportunity: true,
        participants: {
          include: {
            contact: true,
          },
        },
        analysis: true,
        transcriptSegments: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!meeting) {
      return null;
    }

    return this.transformToCallResult(meeting, []);
  }

  /**
   * Save a search for quick access
   */
  async saveSearch(dto: SavedSearchDto, userId: string): Promise<{ id: string }> {
    // Store in user preferences or a dedicated saved searches table
    // For now, we'll use user settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const settings = (user?.settings as any) || {};
    const savedSearches = settings.savedCallSearches || [];

    const newSearch = {
      id: `search-${Date.now()}`,
      name: dto.name,
      filters: dto.filters,
      isDefault: dto.isDefault || false,
      createdAt: new Date().toISOString(),
    };

    savedSearches.push(newSearch);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          ...settings,
          savedCallSearches: savedSearches,
        },
      },
    });

    return { id: newSearch.id };
  }

  /**
   * Get saved searches for user
   */
  async getSavedSearches(userId: string): Promise<SavedSearchDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const settings = (user?.settings as any) || {};
    return settings.savedCallSearches || [];
  }

  /**
   * Create or update tracker definitions
   */
  async upsertTracker(dto: TrackerDefinitionDto, userId: string): Promise<{ id: string }> {
    // Store trackers in user/org settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const settings = (user?.settings as any) || {};
    const trackers = settings.callTrackers || [];

    const existingIndex = trackers.findIndex((t: any) => t.name === dto.name);
    const tracker = {
      id: existingIndex >= 0 ? trackers[existingIndex].id : `tracker-${Date.now()}`,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      trackers[existingIndex] = tracker;
    } else {
      trackers.push(tracker);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          ...settings,
          callTrackers: trackers,
        },
      },
    });

    return { id: tracker.id };
  }

  /**
   * Get tracker definitions
   */
  async getTrackers(userId: string): Promise<TrackerDefinitionDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const settings = (user?.settings as any) || {};
    return settings.callTrackers || this.getDefaultTrackers();
  }

  /**
   * Create a stream (saved search with notifications)
   */
  async createStream(dto: CreateStreamDto, userId: string): Promise<{ id: string }> {
    this.logger.log(`Creating stream: ${dto.name}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const settings = (user?.settings as any) || {};
    const streams = settings.callStreams || [];

    const stream = {
      id: `stream-${Date.now()}`,
      name: dto.name,
      description: dto.description,
      filters: dto.filters,
      notifyOnNew: dto.notifyOnNew ?? true,
      createdAt: new Date().toISOString(),
    };

    streams.push(stream);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          ...settings,
          callStreams: streams,
        },
      },
    });

    return { id: stream.id };
  }

  /**
   * AI-powered call analysis
   */
  async analyzeCall(callId: string): Promise<{
    summary: string;
    keyTopics: string[];
    actionItems: string[];
    buyingSignals: string[];
    objections: string[];
    sentiment: CallSentiment;
    recommendations: string[];
  }> {
    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: callId },
      include: {
        transcriptSegments: {
          orderBy: { startTime: 'asc' },
        },
        participants: true,
        account: true,
        opportunity: true,
      },
    });

    if (!meeting || !meeting.transcriptText) {
      throw new Error('Meeting or transcript not found');
    }

    const prompt = `Analyze this sales call transcript and provide insights.

Meeting: ${meeting.title}
Account: ${meeting.account?.name || 'Unknown'}
Participants: ${meeting.participants?.map((p) => `${p.name} (${p.isInternal ? 'Internal' : 'External'})`).join(', ')}

Transcript:
${meeting.transcriptText.substring(0, 10000)}

Provide a JSON response with:
1. summary: Executive summary (2-3 sentences)
2. keyTopics: Array of main topics discussed
3. actionItems: Array of action items identified
4. buyingSignals: Array of positive buying signals
5. objections: Array of objections or concerns raised
6. sentiment: Overall sentiment (positive/neutral/negative)
7. recommendations: Array of recommended next steps`;

    try {
      const response = await this.anthropic.generateChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2048,
        temperature: 0.3,
      });
      return JSON.parse(response);
    } catch (error) {
      this.logger.error(`Failed to analyze call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform meeting to call result
   */
  private transformToCallResult(meeting: any, matchedMentions: CallMentionDto[]): CallSearchResultDto {
    const participants: CallParticipantDto[] = (meeting.participants || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.isInternal ? 'internal' : 'external',
      isHost: false,
      speakingTime: p.speakingTime,
      speakingPercentage: p.speakingPercentage,
    }));

    const analysis = meeting.analysis || {};

    return {
      id: meeting.id,
      title: meeting.title,
      date: meeting.scheduledStart || meeting.createdAt,
      duration: meeting.duration || 0,
      participants,
      accountId: meeting.accountId,
      accountName: meeting.account?.name,
      opportunityId: meeting.opportunityId,
      opportunityName: meeting.opportunity?.name,
      opportunityAmount: meeting.opportunity?.amount,
      opportunityStage: meeting.opportunity?.stage,
      platform: (meeting.platform?.toLowerCase() || 'other') as CallPlatform,
      matchedPhrases: matchedMentions,
      matchedTrackers: [],
      sentiment: this.mapSentiment(analysis.overallSentiment),
      engagementScore: analysis.engagementScore || 0,
      keyTopics: analysis.keyPoints || [],
      actionItems: (analysis.actionItems || []).map((a: any) => a.text || a),
      buyingSignals: (analysis.buyingSignals || []).map((b: any) => b.signal || b),
      objections: (analysis.objections || []).map((o: any) => o.objection || o),
      transcriptPreview: meeting.transcriptText?.substring(0, 500),
    };
  }

  /**
   * Calculate analytics for search results
   */
  private async calculateAnalytics(
    filters: CallSearchFiltersDto,
    results: CallSearchResultDto[],
    totalMeetings: number,
    userId: string,
  ): Promise<CallAnalyticsDto> {
    // Calculate calls by week
    const weeklyData: Record<string, number> = {};
    const now = new Date();

    for (let i = 0; i < 32; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekKey = `${weekStart.getMonth() + 1}/${weekStart.getDate()}/${weekStart.getFullYear().toString().slice(2)}`;
      weeklyData[weekKey] = 0;
    }

    results.forEach((call) => {
      const date = new Date(call.date);
      const weekKey = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(2)}`;
      if (weeklyData[weekKey] !== undefined) {
        weeklyData[weekKey]++;
      }
    });

    // Calculate calls by day
    const dailyData: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayKey = day.toISOString().split('T')[0];
      dailyData[dayKey] = 0;
    }

    results.forEach((call) => {
      const dayKey = new Date(call.date).toISOString().split('T')[0];
      if (dailyData[dayKey] !== undefined) {
        dailyData[dayKey]++;
      }
    });

    // Top speakers
    const speakerStats = new Map<string, { count: number; totalTime: number }>();
    results.forEach((call) => {
      call.participants.forEach((p) => {
        const current = speakerStats.get(p.name) || { count: 0, totalTime: 0 };
        speakerStats.set(p.name, {
          count: current.count + 1,
          totalTime: current.totalTime + (p.speakingTime || 0),
        });
      });
    });

    const topSpeakers = Array.from(speakerStats.entries())
      .map(([name, stats]) => ({
        name,
        callCount: stats.count,
        avgSpeakingTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
      }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 10);

    return {
      totalCalls: totalMeetings,
      matchingCalls: results.length,
      matchPercentage: totalMeetings > 0 ? (results.length / totalMeetings) * 100 : 0,
      callsByWeek: Object.entries(weeklyData)
        .reverse()
        .map(([week, count]) => ({ week, count })),
      callsByDay: Object.entries(dailyData)
        .reverse()
        .map(([date, count]) => ({ date, count })),
      topTrackers: await this.calculateTopTrackers(results, userId),
      averageDuration:
        results.length > 0
          ? results.reduce((sum, c) => sum + c.duration, 0) / results.length
          : 0,
      averageSentiment: this.calculateAverageSentiment(results),
      topSpeakers,
    };
  }

  /**
   * Map sentiment string to enum
   */
  private mapSentiment(sentiment?: string): CallSentiment {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return CallSentiment.POSITIVE;
      case 'negative':
        return CallSentiment.NEGATIVE;
      default:
        return CallSentiment.NEUTRAL;
    }
  }

  /**
   * Get default tracker definitions
   */
  private getDefaultTrackers(): TrackerDefinitionDto[] {
    return [
      {
        name: 'Pricing Discussion',
        category: 'pricing',
        keywords: ['price', 'cost', 'budget', 'discount', 'pricing'],
        phrases: ['how much', 'what\'s the cost', 'pricing model'],
        isEnabled: true,
      },
      {
        name: 'Competitor Mentions',
        category: 'competitor',
        keywords: ['competitor', 'alternative', 'compared to'],
        phrases: ['using another', 'looked at'],
        isEnabled: true,
      },
      {
        name: 'Objections',
        category: 'objection',
        keywords: ['concern', 'worried', 'issue', 'problem'],
        phrases: ['not sure', 'need to think', 'have to discuss'],
        isEnabled: true,
      },
      {
        name: 'Next Steps',
        category: 'next-steps',
        keywords: ['next steps', 'follow up', 'schedule', 'meeting'],
        phrases: ['let\'s schedule', 'I\'ll send', 'we should'],
        isEnabled: true,
      },
      {
        name: 'Decision Makers',
        category: 'feature',
        keywords: ['decision', 'approve', 'sign off', 'stakeholder'],
        phrases: ['who decides', 'need approval', 'involve'],
        isEnabled: true,
      },
    ];
  }

  /**
   * Calculate average sentiment score from results
   */
  private calculateAverageSentiment(results: CallSearchResultDto[]): number {
    if (results.length === 0) return 0.5;

    const sentimentScores = results.map((r) => {
      switch (r.sentiment) {
        case CallSentiment.POSITIVE:
          return 1.0;
        case CallSentiment.NEGATIVE:
          return 0.0;
        default:
          return 0.5;
      }
    });

    return sentimentScores.reduce((sum, s) => sum + s, 0) / sentimentScores.length;
  }

  /**
   * Calculate top trackers from search results
   */
  private async calculateTopTrackers(
    results: CallSearchResultDto[],
    userId: string,
  ): Promise<{ name: string; count: number }[]> {
    const trackers = await this.getTrackers(userId);
    const trackerCounts = new Map<string, { count: number; category: string }>();

    // Initialize tracker counts
    trackers.filter((t) => t.isEnabled).forEach((tracker) => {
      trackerCounts.set(tracker.name, { count: 0, category: tracker.category || 'general' });
    });

    // Count matches across all transcripts
    for (const result of results) {
      const transcript = (result.transcriptPreview || '').toLowerCase();

      for (const tracker of trackers.filter((t) => t.isEnabled)) {
        let hasMatch = false;

        // Check keywords
        for (const keyword of tracker.keywords || []) {
          if (transcript.includes(keyword.toLowerCase())) {
            hasMatch = true;
            break;
          }
        }

        // Check phrases
        if (!hasMatch) {
          for (const phrase of tracker.phrases || []) {
            if (transcript.includes(phrase.toLowerCase())) {
              hasMatch = true;
              break;
            }
          }
        }

        if (hasMatch) {
          const current = trackerCounts.get(tracker.name);
          if (current) {
            trackerCounts.set(tracker.name, { ...current, count: current.count + 1 });
          }
        }
      }
    }

    // Convert to sorted array
    return Array.from(trackerCounts.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
      }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
