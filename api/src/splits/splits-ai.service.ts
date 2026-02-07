/**
 * Revenue Splits AI Service
 *
 * AI-powered features for revenue split management:
 * - Fair split suggestions based on contribution
 * - Quota impact analysis
 * - Conflict detection and resolution
 * - Historical pattern analysis
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LLMService } from '../llm/llm.service';

export interface SplitSuggestion {
  userId: string;
  userName: string;
  suggestedPercent: number;
  splitType: string;
  reasoning: string;
  historicalBasis?: string;
}

export interface QuotaImpact {
  userId: string;
  userName: string;
  currentQuota: number;
  attainmentBefore: number;
  attainmentAfter: number;
  creditAmount: number;
  impactAssessment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface SplitConflict {
  type: 'OVER_100' | 'DUPLICATE' | 'MISSING_PRIMARY' | 'UNUSUAL_PATTERN' | 'POLICY_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  affectedUsers: string[];
  suggestedResolution: string;
}

export interface SplitAnalytics {
  opportunityId: string;
  totalPercent: number;
  splitCount: number;
  conflicts: SplitConflict[];
  suggestions: string[];
  complianceStatus: 'COMPLIANT' | 'NEEDS_REVIEW' | 'VIOLATION';
}

@Injectable()
export class SplitsAIService {
  private readonly logger = new Logger(SplitsAIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LLMService,
  ) {}

  /**
   * Generate fair split suggestions based on contribution and history
   */
  async suggestSplits(
    opportunityId: string,
    organizationId: string,
  ): Promise<SplitSuggestion[]> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: {
        owner: true,
        account: {
          include: {
            owner: true,
          },
        },
        activities: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        splits: {
          include: { user: true },
        },
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    // Analyze activity contributors
    const activityByUser = new Map<string, { count: number; name: string }>();
    for (const activity of opportunity.activities) {
      if (activity.userId) {
        const current = activityByUser.get(activity.userId) || { count: 0, name: activity.user?.name || 'Unknown' };
        activityByUser.set(activity.userId, { count: current.count + 1, name: current.name });
      }
    }

    // Get historical split patterns for similar deals
    const historicalSplits = await this.prisma.opportunitySplit.findMany({
      where: {
        opportunity: {
          organizationId,
          isClosed: true, isWon: true,
          amount: {
            gte: (opportunity.amount || 0) * 0.5,
            lte: (opportunity.amount || 0) * 1.5,
          },
        },
        status: 'APPROVED',
      },
      include: {
        user: true,
        opportunity: true,
      },
      take: 100,
    });

    // Calculate average splits by role
    const splitPatterns = new Map<string, number[]>();
    for (const split of historicalSplits) {
      const key = split.splitType;
      const current = splitPatterns.get(key) || [];
      current.push(split.splitPercent);
      splitPatterns.set(key, current);
    }

    const averageSplits = new Map<string, number>();
    for (const [type, percents] of splitPatterns) {
      averageSplits.set(type, percents.reduce((a, b) => a + b, 0) / percents.length);
    }

    const suggestions: SplitSuggestion[] = [];

    // Primary owner always gets a split
    if (opportunity.owner) {
      const avgRevenueSplit = averageSplits.get('REVENUE') || 70;
      suggestions.push({
        userId: opportunity.owner.id,
        userName: opportunity.owner.name || opportunity.owner.email,
        suggestedPercent: Math.round(avgRevenueSplit),
        splitType: 'REVENUE',
        reasoning: 'Primary opportunity owner - responsible for deal execution',
        historicalBasis: `Based on ${splitPatterns.get('REVENUE')?.length || 0} similar closed deals`,
      });
    }

    // Account owner gets overlay split if different from opp owner
    if (opportunity.account?.owner && opportunity.account.owner.id !== opportunity.owner?.id) {
      const avgOverlaySplit = averageSplits.get('OVERLAY') || 15;
      suggestions.push({
        userId: opportunity.account.owner.id,
        userName: opportunity.account.owner.name || opportunity.account.owner.email,
        suggestedPercent: Math.round(avgOverlaySplit),
        splitType: 'OVERLAY',
        reasoning: 'Account owner - maintains strategic relationship',
        historicalBasis: `Based on ${splitPatterns.get('OVERLAY')?.length || 0} similar closed deals`,
      });
    }

    // Top activity contributors get consideration
    const sortedContributors = Array.from(activityByUser.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .filter(([userId]) =>
        userId !== opportunity.owner?.id &&
        userId !== opportunity.account?.owner?.id
      )
      .slice(0, 2);

    for (const [userId, data] of sortedContributors) {
      if (data.count >= 5) {
        suggestions.push({
          userId,
          userName: data.name,
          suggestedPercent: Math.min(Math.round(data.count / 2), 15),
          splitType: 'QUOTA',
          reasoning: `Significant contributor with ${data.count} activities on this deal`,
        });
      }
    }

    // Normalize to not exceed 100%
    const total = suggestions.reduce((sum, s) => sum + s.suggestedPercent, 0);
    if (total > 100) {
      const factor = 100 / total;
      for (const suggestion of suggestions) {
        suggestion.suggestedPercent = Math.round(suggestion.suggestedPercent * factor);
      }
    }

    return suggestions;
  }

  /**
   * Analyze quota impact of splits on team members
   */
  async analyzeQuotaImpact(
    opportunityId: string,
    organizationId: string,
  ): Promise<QuotaImpact[]> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: {
        splits: {
          include: { user: true },
          where: { includeInQuota: true },
        },
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const dealAmount = opportunity.amount || 0;
    const impacts: QuotaImpact[] = [];

    for (const split of opportunity.splits) {
      // Get user's quota and current attainment
      // Note: This assumes a quota tracking system exists
      const creditAmount = (dealAmount * split.splitPercent) / 100;

      // Simplified quota calculation - in real system, fetch from quota table
      const estimatedQuota = 1000000; // Default annual quota
      const estimatedAttainmentBefore = 0.65; // 65% attainment

      const attainmentAfter = estimatedAttainmentBefore + (creditAmount / estimatedQuota);

      let impactAssessment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      if (attainmentAfter >= 1.0 && estimatedAttainmentBefore < 1.0) {
        impactAssessment = 'POSITIVE'; // Pushes to quota attainment
      } else if (creditAmount > estimatedQuota * 0.1) {
        impactAssessment = 'POSITIVE'; // Significant contribution
      } else if (creditAmount < estimatedQuota * 0.01) {
        impactAssessment = 'NEUTRAL'; // Minimal impact
      } else {
        impactAssessment = 'NEUTRAL';
      }

      impacts.push({
        userId: split.userId,
        userName: split.user?.name || split.user?.email || 'Unknown',
        currentQuota: estimatedQuota,
        attainmentBefore: estimatedAttainmentBefore,
        attainmentAfter,
        creditAmount,
        impactAssessment,
      });
    }

    return impacts;
  }

  /**
   * Detect conflicts in split configurations
   */
  async detectConflicts(
    opportunityId: string,
    organizationId: string,
  ): Promise<SplitConflict[]> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: {
        splits: {
          include: { user: true },
        },
        owner: true,
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const conflicts: SplitConflict[] = [];
    const splits = opportunity.splits;

    // Check 1: Total exceeds 100%
    const totalPercent = splits.reduce((sum, s) => sum + s.splitPercent, 0);
    if (totalPercent > 100) {
      conflicts.push({
        type: 'OVER_100',
        severity: 'HIGH',
        description: `Total split percentage is ${totalPercent.toFixed(1)}%, exceeding 100%`,
        affectedUsers: splits.map(s => s.user?.name || s.userId),
        suggestedResolution: `Reduce splits proportionally to sum to 100%`,
      });
    }

    // Check 2: Duplicate user/type combinations
    const seen = new Set<string>();
    for (const split of splits) {
      const key = `${split.userId}-${split.splitType}`;
      if (seen.has(key)) {
        conflicts.push({
          type: 'DUPLICATE',
          severity: 'MEDIUM',
          description: `Duplicate ${split.splitType} split for ${split.user?.name || split.userId}`,
          affectedUsers: [split.user?.name || split.userId],
          suggestedResolution: 'Merge or remove duplicate split entries',
        });
      }
      seen.add(key);
    }

    // Check 3: Missing primary owner
    const hasOwnerSplit = splits.some(
      s => s.userId === opportunity.owner?.id && s.splitType === 'REVENUE'
    );
    if (opportunity.owner && !hasOwnerSplit && splits.length > 0) {
      conflicts.push({
        type: 'MISSING_PRIMARY',
        severity: 'MEDIUM',
        description: `Opportunity owner ${opportunity.owner.name || opportunity.owner.email} does not have a revenue split`,
        affectedUsers: [opportunity.owner.name || opportunity.owner.email],
        suggestedResolution: 'Add a revenue split for the opportunity owner',
      });
    }

    // Check 4: Unusual patterns (very small or very large splits)
    for (const split of splits) {
      if (split.splitPercent < 5 && split.splitType === 'REVENUE') {
        conflicts.push({
          type: 'UNUSUAL_PATTERN',
          severity: 'LOW',
          description: `${split.user?.name || split.userId} has unusually small revenue split (${split.splitPercent}%)`,
          affectedUsers: [split.user?.name || split.userId],
          suggestedResolution: 'Review if this split is intentional or should be removed',
        });
      }
      if (split.splitPercent > 80 && splits.length > 1) {
        conflicts.push({
          type: 'UNUSUAL_PATTERN',
          severity: 'LOW',
          description: `${split.user?.name || split.userId} has unusually large split (${split.splitPercent}%) with other team members present`,
          affectedUsers: [split.user?.name || split.userId],
          suggestedResolution: 'Review split distribution for fairness',
        });
      }
    }

    return conflicts;
  }

  /**
   * Get comprehensive split analytics for an opportunity
   */
  async getAnalytics(
    opportunityId: string,
    organizationId: string,
  ): Promise<SplitAnalytics> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: {
        splits: true,
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const conflicts = await this.detectConflicts(opportunityId, organizationId);
    const totalPercent = opportunity.splits.reduce((sum, s) => sum + s.splitPercent, 0);

    // Determine compliance status
    let complianceStatus: 'COMPLIANT' | 'NEEDS_REVIEW' | 'VIOLATION';
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'HIGH');
    const mediumSeverityConflicts = conflicts.filter(c => c.severity === 'MEDIUM');

    if (highSeverityConflicts.length > 0) {
      complianceStatus = 'VIOLATION';
    } else if (mediumSeverityConflicts.length > 0) {
      complianceStatus = 'NEEDS_REVIEW';
    } else {
      complianceStatus = 'COMPLIANT';
    }

    // Generate suggestions
    const suggestions: string[] = [];
    if (totalPercent < 100 && opportunity.splits.length > 0) {
      suggestions.push(`${(100 - totalPercent).toFixed(1)}% of credit is unallocated - consider adding more splits`);
    }
    if (opportunity.splits.every(s => s.status === 'PENDING')) {
      suggestions.push('All splits are pending approval - consider expediting review');
    }
    if (!opportunity.splits.some(s => s.includeInForecast)) {
      suggestions.push('No splits are included in forecast - this deal may be underrepresented in projections');
    }

    return {
      opportunityId,
      totalPercent,
      splitCount: opportunity.splits.length,
      conflicts,
      suggestions,
      complianceStatus,
    };
  }

  /**
   * AI-powered split recommendation based on deal context
   */
  async getAIRecommendation(
    opportunityId: string,
    organizationId: string,
  ): Promise<{
    recommendation: string;
    suggestedSplits: SplitSuggestion[];
    confidence: number;
    reasoning: string;
  }> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: {
        owner: true,
        account: { include: { owner: true } },
        activities: {
          include: { user: true },
          take: 30,
        },
        splits: { include: { user: true } },
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    // Get activity summary
    const activityByUser = new Map<string, number>();
    for (const activity of opportunity.activities) {
      if (activity.userId) {
        activityByUser.set(activity.userId, (activityByUser.get(activity.userId) || 0) + 1);
      }
    }

    const prompt = `Recommend fair revenue splits for this sales opportunity.

OPPORTUNITY:
- Name: ${opportunity.name}
- Amount: $${opportunity.amount || 0}
- Stage: ${opportunity.stage}
- Owner: ${opportunity.owner?.name || 'Unknown'}

ACCOUNT:
- Name: ${opportunity.account?.name || 'Unknown'}
- Account Owner: ${opportunity.account?.owner?.name || 'Same as opportunity owner'}

ACTIVITY CONTRIBUTORS:
${Array.from(activityByUser.entries()).map(([userId, count]) => {
  const activity = opportunity.activities.find(a => a.userId === userId);
  return `- ${activity?.user?.name || userId}: ${count} activities`;
}).join('\n') || 'No activities recorded'}

CURRENT SPLITS:
${opportunity.splits.map(s => `- ${s.user?.name || s.userId}: ${s.splitPercent}% (${s.splitType})`).join('\n') || 'None configured'}

Based on standard sales compensation practices:
1. Primary opportunity owner typically gets 60-80% for revenue split
2. Account owners get 10-20% overlay if different from opp owner
3. Significant contributors (5+ activities) may deserve 5-15% quota credit
4. Total should equal 100%

Provide split recommendations with reasoning.

Return JSON:
{
  "recommendation": "summary recommendation",
  "suggestedSplits": [
    {"userId": "string", "userName": "string", "suggestedPercent": number, "splitType": "REVENUE|OVERLAY|QUOTA|REFERRAL", "reasoning": "string"}
  ],
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation"
}`;

    const response = await this.llm.generate(prompt, {
      model: 'smart',
      systemPrompt: 'You are a sales compensation expert. Recommend fair, defensible split configurations based on contribution and industry standards.',
      temperature: 0.5,
      maxTokens: 1200,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to parse AI recommendation: ${error.message}`);
      return {
        recommendation: 'Unable to generate recommendation',
        suggestedSplits: [],
        confidence: 0,
        reasoning: 'Analysis failed - please configure splits manually',
      };
    }
  }
}
