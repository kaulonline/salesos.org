/**
 * Partner Portal AI Service
 *
 * AI-powered features for partner relationship management:
 * - Deal registration scoring and prioritization
 * - Partner matching for opportunities
 * - Automated deal approval recommendations
 * - Partner performance insights
 * - Co-selling recommendations
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LLMService } from '../llm/llm.service';

export interface DealRegistrationScore {
  registrationId: string;
  score: number; // 0-100, higher = more likely to close
  tier: 'HOT' | 'WARM' | 'COLD';
  factors: { factor: string; impact: 'positive' | 'negative'; weight: number }[];
  recommendation: 'AUTO_APPROVE' | 'REVIEW' | 'REJECT';
  reasoning: string;
  suggestedCommissionRate?: number;
}

export interface PartnerMatch {
  partnerId: string;
  partnerName: string;
  matchScore: number; // 0-100
  matchReasons: string[];
  strengths: string[];
  considerations: string[];
}

export interface PartnerInsight {
  category: string;
  insight: string;
  trend: 'improving' | 'stable' | 'declining';
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CoSellingRecommendation {
  opportunityId: string;
  opportunityName: string;
  recommendedPartners: {
    partnerId: string;
    partnerName: string;
    reason: string;
    expectedContribution: string;
  }[];
  expectedOutcome: string;
}

@Injectable()
export class PartnersAIService {
  private readonly logger = new Logger(PartnersAIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LLMService,
  ) {}

  /**
   * Score a deal registration for likelihood to close
   */
  async scoreDealRegistration(
    registrationId: string,
    organizationId: string,
  ): Promise<DealRegistrationScore> {
    const registration = await this.prisma.dealRegistration.findFirst({
      where: { id: registrationId, organizationId },
      include: {
        partner: {
          include: {
            dealRegistrations: {
              where: { status: { in: ['WON', 'CONVERTED', 'APPROVED'] } },
              take: 20,
            },
          },
        },
        account: true,
      },
    });

    if (!registration) {
      throw new Error('Deal registration not found');
    }

    const factors: { factor: string; impact: 'positive' | 'negative'; weight: number }[] = [];
    let score = 50; // Start at neutral

    // Factor: Partner tier and history
    const partnerWinRate = registration.partner.dealRegistrations.filter(
      d => d.status === 'WON'
    ).length / Math.max(registration.partner.dealRegistrations.length, 1);

    if (registration.partner.tier === 'PLATINUM') {
      score += 15;
      factors.push({ factor: 'Platinum partner', impact: 'positive', weight: 15 });
    } else if (registration.partner.tier === 'GOLD') {
      score += 10;
      factors.push({ factor: 'Gold partner', impact: 'positive', weight: 10 });
    }

    if (partnerWinRate > 0.5 && registration.partner.dealRegistrations.length >= 5) {
      score += 10;
      factors.push({ factor: `Strong partner track record (${(partnerWinRate * 100).toFixed(0)}% win rate)`, impact: 'positive', weight: 10 });
    }

    // Factor: Deal value
    if (registration.estimatedValue) {
      if (registration.estimatedValue > 100000) {
        score += 5;
        factors.push({ factor: 'High-value deal ($100k+)', impact: 'positive', weight: 5 });
      } else if (registration.estimatedValue < 10000) {
        score -= 5;
        factors.push({ factor: 'Small deal value', impact: 'negative', weight: 5 });
      }
    } else {
      score -= 10;
      factors.push({ factor: 'No estimated value provided', impact: 'negative', weight: 10 });
    }

    // Factor: Existing account relationship
    if (registration.accountId) {
      score += 15;
      factors.push({ factor: 'Linked to existing account', impact: 'positive', weight: 15 });
    }

    // Factor: Product interest completeness
    if (registration.productInterest && registration.productInterest.length > 0) {
      score += 5;
      factors.push({ factor: 'Products identified', impact: 'positive', weight: 5 });
    } else {
      score -= 5;
      factors.push({ factor: 'No products specified', impact: 'negative', weight: 5 });
    }

    // Factor: Close date reasonableness
    if (registration.estimatedCloseDate) {
      const daysToClose = Math.ceil(
        (new Date(registration.estimatedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysToClose > 30 && daysToClose < 180) {
        score += 5;
        factors.push({ factor: 'Reasonable close timeline', impact: 'positive', weight: 5 });
      } else if (daysToClose < 7) {
        score -= 10;
        factors.push({ factor: 'Unrealistic close date', impact: 'negative', weight: 10 });
      }
    }

    // Normalize score
    score = Math.min(100, Math.max(0, score));

    // Determine tier and recommendation
    let tier: 'HOT' | 'WARM' | 'COLD';
    let recommendation: 'AUTO_APPROVE' | 'REVIEW' | 'REJECT';
    let reasoning: string;

    if (score >= 75) {
      tier = 'HOT';
      recommendation = 'AUTO_APPROVE';
      reasoning = 'High-quality registration from trusted partner with strong indicators.';
    } else if (score >= 50) {
      tier = 'WARM';
      recommendation = 'REVIEW';
      reasoning = 'Moderate quality registration - recommend manual review before approval.';
    } else {
      tier = 'COLD';
      recommendation = score < 30 ? 'REJECT' : 'REVIEW';
      reasoning = 'Low-quality registration with multiple risk factors. Consider requesting more information.';
    }

    // Suggest commission rate based on partner tier and deal quality
    let suggestedCommissionRate = registration.partner.commissionRate || 10;
    if (tier === 'HOT' && registration.partner.tier === 'PLATINUM') {
      suggestedCommissionRate = Math.min(suggestedCommissionRate + 5, 25);
    }

    return {
      registrationId: registration.id,
      score,
      tier,
      factors,
      recommendation,
      reasoning,
      suggestedCommissionRate,
    };
  }

  /**
   * Find best-matched partners for an opportunity
   */
  async findPartnerMatches(
    opportunityId: string,
    organizationId: string,
    limit = 5,
  ): Promise<PartnerMatch[]> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: {
        account: true,
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    // Get active partners
    const partners = await this.prisma.partner.findMany({
      where: {
        organizationId,
        status: 'APPROVED',
        portalEnabled: true,
      },
      include: {
        accounts: { include: { account: true } },
        dealRegistrations: {
          where: { status: { in: ['WON', 'CONVERTED'] } },
          take: 10,
        },
      },
    });

    if (partners.length === 0) {
      return [];
    }

    const prompt = `Match the best partners for this opportunity.

OPPORTUNITY:
- Name: ${opportunity.name}
- Value: $${opportunity.amount || 'Unknown'}
- Stage: ${opportunity.stage}
- Account Industry: ${opportunity.account?.industry || 'Unknown'}
- Account Size: ${opportunity.account?.numberOfEmployees || 'Unknown'} employees

AVAILABLE PARTNERS:
${partners.map(p => `
- ${p.companyName} (${p.tier}):
  Type: ${p.type}
  Territory: ${p.territory || 'Global'}
  Industries: ${p.industry?.join(', ') || 'All'}
  Certifications: ${p.certifications?.join(', ') || 'None'}
  Total Revenue: $${p.totalRevenue || 0}
  Win Rate: ${p.dealRegistrations.length > 0 ? ((p.dealRegistrations.filter(d => d.status === 'WON').length / p.dealRegistrations.length) * 100).toFixed(0) : 0}%
`).join('\n')}

Rank the top ${limit} partners for this opportunity. Consider:
1. Industry expertise match
2. Territory coverage
3. Partner tier and performance
4. Relevant certifications

Return JSON array:
[{
  "partnerId": "string",
  "partnerName": "string",
  "matchScore": 0-100,
  "matchReasons": ["string"],
  "strengths": ["string"],
  "considerations": ["string"]
}]`;

    const response = await this.llm.generate(prompt, {
      model: 'smart',
      systemPrompt: 'You are a partner ecosystem expert. Match partners based on genuine fit, not just tier.',
      temperature: 0.5,
      maxTokens: 1500,
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      const matches = JSON.parse(jsonMatch[0]);

      // Validate partner IDs exist
      const validPartnerIds = new Set(partners.map(p => p.id));
      return matches
        .filter((m: any) => validPartnerIds.has(m.partnerId) || partners.some(p => p.companyName === m.partnerName))
        .map((m: any) => ({
          ...m,
          partnerId: m.partnerId || partners.find(p => p.companyName === m.partnerName)?.id,
        }))
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to parse partner matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate performance insights for a partner
   */
  async generatePartnerInsights(
    partnerId: string,
    organizationId: string,
  ): Promise<PartnerInsight[]> {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, organizationId },
      include: {
        dealRegistrations: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        accounts: { take: 20 },
        users: { take: 10 },
      },
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Calculate metrics
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);

    const recentRegistrations = partner.dealRegistrations.filter(
      d => new Date(d.createdAt) > last90Days
    );
    const olderRegistrations = partner.dealRegistrations.filter(
      d => new Date(d.createdAt) <= last90Days
    );

    const recentWinRate = recentRegistrations.filter(d => d.status === 'WON').length /
      Math.max(recentRegistrations.filter(d => ['WON', 'LOST', 'REJECTED'].includes(d.status)).length, 1);
    const olderWinRate = olderRegistrations.filter(d => d.status === 'WON').length /
      Math.max(olderRegistrations.filter(d => ['WON', 'LOST', 'REJECTED'].includes(d.status)).length, 1);

    const prompt = `Analyze this partner's performance and generate insights.

PARTNER: ${partner.companyName}
- Tier: ${partner.tier}
- Type: ${partner.type}
- Commission Rate: ${partner.commissionRate}%
- Total Revenue: $${partner.totalRevenue}
- Total Deals: ${partner.totalDeals}
- Assigned Accounts: ${partner.accounts.length}
- Active Users: ${partner.users.filter(u => u.isActive).length}

RECENT PERFORMANCE (Last 90 days):
- Registrations: ${recentRegistrations.length}
- Win Rate: ${(recentWinRate * 100).toFixed(0)}%
- Approved: ${recentRegistrations.filter(d => d.status === 'APPROVED').length}
- Won: ${recentRegistrations.filter(d => d.status === 'WON').length}

HISTORICAL (Before 90 days):
- Registrations: ${olderRegistrations.length}
- Win Rate: ${(olderWinRate * 100).toFixed(0)}%

Generate 3-5 actionable insights about this partner's performance.

Return JSON array:
[{
  "category": "string (e.g., 'Performance', 'Engagement', 'Growth')",
  "insight": "string",
  "trend": "improving|stable|declining",
  "recommendation": "string",
  "priority": "high|medium|low"
}]`;

    const response = await this.llm.generate(prompt, {
      model: 'smart',
      systemPrompt: 'You are a partner success manager. Provide actionable, balanced insights that help improve the partnership.',
      temperature: 0.6,
      maxTokens: 1200,
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to parse partner insights: ${error.message}`);
      return [];
    }
  }

  /**
   * Get co-selling recommendations for opportunities
   */
  async getCoSellingRecommendations(
    organizationId: string,
    options?: { minDealSize?: number; limit?: number },
  ): Promise<CoSellingRecommendation[]> {
    const minDealSize = options?.minDealSize || 50000;
    const limit = options?.limit || 10;

    // Find opportunities that could benefit from partner involvement
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        organizationId,
        isClosed: false,
        amount: { gte: minDealSize },
      },
      include: {
        account: true,
        owner: true,
      },
      orderBy: { amount: 'desc' },
      take: limit,
    });

    if (opportunities.length === 0) {
      return [];
    }

    // Get available partners
    const partners = await this.prisma.partner.findMany({
      where: {
        organizationId,
        status: 'APPROVED',
        portalEnabled: true,
      },
      select: {
        id: true,
        companyName: true,
        type: true,
        tier: true,
        industry: true,
        territory: true,
      },
    });

    const recommendations: CoSellingRecommendation[] = [];

    for (const opp of opportunities) {
      const relevantPartners = partners.filter(p => {
        // Match by industry
        if (p.industry?.length && opp.account?.industry) {
          return p.industry.includes(opp.account.industry);
        }
        return true;
      }).slice(0, 3);

      if (relevantPartners.length > 0) {
        recommendations.push({
          opportunityId: opp.id,
          opportunityName: opp.name,
          recommendedPartners: relevantPartners.map(p => ({
            partnerId: p.id,
            partnerName: p.companyName,
            reason: `${p.type} partner with ${p.tier} tier${p.industry?.includes(opp.account?.industry || '') ? ` and ${opp.account?.industry} expertise` : ''}`,
            expectedContribution: p.type === 'SYSTEM_INTEGRATOR' ? 'Implementation and services' :
              p.type === 'RESELLER' ? 'Deal execution and local presence' :
              p.type === 'TECHNOLOGY' ? 'Technical integration' : 'Market access',
          })),
          expectedOutcome: `Partner involvement could accelerate deal closure and provide additional value to ${opp.account?.name || 'the customer'}`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Auto-approve deal registrations meeting criteria
   */
  async processAutoApprovals(
    organizationId: string,
  ): Promise<{
    processed: number;
    approved: number;
    rejected: number;
    pending: number;
    results: { registrationId: string; action: string; reason: string }[];
  }> {
    // Get pending registrations
    const registrations = await this.prisma.dealRegistration.findMany({
      where: {
        organizationId,
        status: 'PENDING',
      },
      include: {
        partner: true,
      },
    });

    const results: { registrationId: string; action: string; reason: string }[] = [];
    let approved = 0;
    let rejected = 0;
    let pending = 0;

    for (const reg of registrations) {
      const score = await this.scoreDealRegistration(reg.id, organizationId);

      if (score.recommendation === 'AUTO_APPROVE') {
        // Auto-approve
        await this.prisma.dealRegistration.update({
          where: { id: reg.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            commissionRate: score.suggestedCommissionRate,
            approvedUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          },
        });
        approved++;
        results.push({
          registrationId: reg.id,
          action: 'APPROVED',
          reason: score.reasoning,
        });
      } else if (score.recommendation === 'REJECT' && score.score < 25) {
        // Auto-reject very low quality
        await this.prisma.dealRegistration.update({
          where: { id: reg.id },
          data: {
            status: 'REJECTED',
            rejectedAt: new Date(),
            rejectionReason: 'Auto-rejected: ' + score.reasoning,
          },
        });
        rejected++;
        results.push({
          registrationId: reg.id,
          action: 'REJECTED',
          reason: score.reasoning,
        });
      } else {
        // Leave for manual review
        pending++;
        results.push({
          registrationId: reg.id,
          action: 'PENDING',
          reason: 'Requires manual review: ' + score.reasoning,
        });
      }
    }

    return {
      processed: registrations.length,
      approved,
      rejected,
      pending,
      results,
    };
  }
}
