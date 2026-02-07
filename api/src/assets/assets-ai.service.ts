/**
 * Assets/Installed Base AI Service
 *
 * AI-powered features for asset management:
 * - Renewal risk scoring and prediction
 * - Upsell/cross-sell recommendations
 * - Asset health scoring
 * - License optimization suggestions
 * - Automated renewal messaging
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LLMService } from '../llm/llm.service';

export interface RenewalRiskScore {
  assetId: string;
  assetName: string;
  riskScore: number; // 0-100, higher = more at risk
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: string[];
  recommendations: string[];
  predictedRenewalProbability: number;
}

export interface UpsellRecommendation {
  accountId: string;
  accountName: string;
  recommendation: string;
  products: string[];
  estimatedValue: number;
  confidence: number;
  reasoning: string;
  nextSteps: string[];
}

export interface AssetHealthScore {
  assetId: string;
  healthScore: number; // 0-100
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  issues: string[];
  recommendations: string[];
}

export interface LicenseOptimization {
  accountId: string;
  currentSeats: number;
  usedSeats: number;
  utilizationRate: number;
  recommendation: 'MAINTAIN' | 'DOWNSIZE' | 'EXPAND';
  suggestedSeats: number;
  annualSavingsOrCost: number;
  reasoning: string;
}

@Injectable()
export class AssetsAIService {
  private readonly logger = new Logger(AssetsAIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LLMService,
  ) {}

  /**
   * Calculate renewal risk scores for assets
   */
  async calculateRenewalRisk(
    organizationId: string,
    options?: { accountId?: string; daysAhead?: number },
  ): Promise<RenewalRiskScore[]> {
    const daysAhead = options?.daysAhead || 90;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Fetch assets with upcoming renewals
    const assets = await this.prisma.asset.findMany({
      where: {
        organizationId,
        ...(options?.accountId && { accountId: options.accountId }),
        renewalDate: { lte: futureDate, gte: new Date() },
        status: 'ACTIVE',
      },
      include: {
        account: {
          include: {
            contacts: { take: 3, orderBy: { createdAt: 'desc' } },
            opportunities: {
              where: { isClosed: false },
              take: 5,
            },
            activities: { take: 10, orderBy: { createdAt: 'desc' } },
          },
        },
        product: true,
        supportContract: true,
      },
    });

    if (assets.length === 0) {
      return [];
    }

    const riskScores: RenewalRiskScore[] = [];

    for (const asset of assets) {
      // Calculate base risk factors
      const riskFactors: string[] = [];
      let baseRiskScore = 30; // Start at moderate risk

      // Factor: Days until renewal
      const daysUntilRenewal = Math.ceil(
        (new Date(asset.renewalDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilRenewal < 30) {
        baseRiskScore += 15;
        riskFactors.push('Renewal date within 30 days');
      }

      // Factor: Recent activity
      const recentActivities = asset.account?.activities?.filter(
        a => new Date(a.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
      ).length || 0;
      if (recentActivities < 2) {
        baseRiskScore += 20;
        riskFactors.push('Low recent engagement (< 2 activities in 30 days)');
      }

      // Factor: Support contract status
      if (!asset.supportContract) {
        baseRiskScore += 10;
        riskFactors.push('No active support contract');
      } else if (asset.supportContract.status === 'EXPIRED') {
        baseRiskScore += 15;
        riskFactors.push('Support contract expired');
      }

      // Factor: Seat utilization
      if (asset.seatCount && asset.seatsUsed) {
        const utilization = asset.seatsUsed / asset.seatCount;
        if (utilization < 0.5) {
          baseRiskScore += 15;
          riskFactors.push(`Low seat utilization (${(utilization * 100).toFixed(0)}%)`);
        }
      }

      // Factor: Open opportunities (positive signal)
      const openOpportunities = asset.account?.opportunities?.length || 0;
      if (openOpportunities > 0) {
        baseRiskScore -= 10;
      } else {
        riskFactors.push('No active opportunities');
      }

      // Normalize score
      const riskScore = Math.min(100, Math.max(0, baseRiskScore));

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (riskScore >= 70) riskLevel = 'CRITICAL';
      else if (riskScore >= 50) riskLevel = 'HIGH';
      else if (riskScore >= 30) riskLevel = 'MEDIUM';
      else riskLevel = 'LOW';

      // Generate recommendations based on risk factors
      const recommendations: string[] = [];
      if (riskFactors.includes('Low recent engagement (< 2 activities in 30 days)')) {
        recommendations.push('Schedule a check-in call with the account');
      }
      if (riskFactors.includes('No active support contract')) {
        recommendations.push('Propose a support contract renewal');
      }
      if (riskFactors.some(f => f.includes('Low seat utilization'))) {
        recommendations.push('Conduct a usage review to identify adoption blockers');
      }
      if (riskFactors.includes('Renewal date within 30 days')) {
        recommendations.push('Escalate to manager and prepare renewal proposal');
      }

      riskScores.push({
        assetId: asset.id,
        assetName: asset.name,
        riskScore,
        riskLevel,
        riskFactors,
        recommendations,
        predictedRenewalProbability: Math.round((100 - riskScore) / 100 * 100) / 100,
      });
    }

    // Sort by risk score descending
    return riskScores.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Generate AI-powered upsell recommendations for an account
   */
  async generateUpsellRecommendations(
    accountId: string,
    organizationId: string,
  ): Promise<UpsellRecommendation[]> {
    // Fetch account with assets and history
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, organizationId },
      include: {
        assets: {
          include: { product: true },
          where: { status: 'ACTIVE' },
        },
        opportunities: {
          where: { isClosed: true, isWon: true },
          orderBy: { closeDate: 'desc' },
          take: 10,
        },
        contacts: { take: 5 },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Fetch available products
    const allProducts = await this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      take: 20,
    });

    // Find products not yet purchased
    const ownedProductIds = new Set(account.assets.map(a => a.productId).filter(Boolean));
    const availableProducts = allProducts.filter(p => !ownedProductIds.has(p.id));

    const prompt = `Generate upsell/cross-sell recommendations for this account.

ACCOUNT:
- Name: ${account.name}
- Industry: ${account.industry || 'Unknown'}
- Size: ${account.numberOfEmployees || 'Unknown'} employees
- Annual Revenue: $${account.annualRevenue || 'Unknown'}

CURRENT ASSETS (${account.assets.length}):
${account.assets.map(a => `- ${a.name} (${a.product?.name || 'Unknown product'}): ${a.seatCount || 0} seats, ${a.seatsUsed || 0} used`).join('\n') || 'None'}

PURCHASE HISTORY:
${account.opportunities.map(o => `- ${o.name}: $${o.amount}, closed ${o.closeDate?.toISOString().split('T')[0]}`).join('\n') || 'None'}

AVAILABLE PRODUCTS:
${availableProducts.map(p => `- ${p.name}: ${p.description?.substring(0, 100) || 'No description'}`).join('\n') || 'None'}

Analyze the account and suggest 2-3 upsell opportunities:
1. Which products would benefit this account?
2. Why would they need it based on their current setup?
3. Estimated deal value
4. Recommended next steps

Return JSON array:
[{
  "recommendation": "string",
  "products": ["product names"],
  "estimatedValue": number,
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "nextSteps": ["string"]
}]`;

    const response = await this.llm.generate(prompt, {
      model: 'smart',
      systemPrompt: 'You are a sales expansion strategist. Identify genuine value opportunities, not just upselling for revenue.',
      temperature: 0.6,
      maxTokens: 1500,
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      const recommendations = JSON.parse(jsonMatch[0]);
      return recommendations.map((r: any) => ({
        accountId: account.id,
        accountName: account.name,
        ...r,
      }));
    } catch (error) {
      this.logger.error(`Failed to parse upsell recommendations: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate asset health scores based on usage and support data
   */
  async calculateAssetHealth(
    assetId: string,
    organizationId: string,
  ): Promise<AssetHealthScore> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
      include: {
        account: true,
        product: true,
        supportContract: true,
      },
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    const issues: string[] = [];
    let healthScore = 100;

    // Check seat utilization
    if (asset.seatCount && asset.seatsUsed !== null) {
      const utilization = asset.seatsUsed / asset.seatCount;
      if (utilization < 0.3) {
        healthScore -= 30;
        issues.push(`Very low seat utilization (${(utilization * 100).toFixed(0)}%)`);
      } else if (utilization < 0.5) {
        healthScore -= 15;
        issues.push(`Low seat utilization (${(utilization * 100).toFixed(0)}%)`);
      } else if (utilization > 0.95) {
        healthScore -= 10;
        issues.push('Near capacity - may need expansion');
      }
    }

    // Check warranty status
    if (asset.warrantyEndDate) {
      const warrantyEnd = new Date(asset.warrantyEndDate);
      if (warrantyEnd < new Date()) {
        healthScore -= 20;
        issues.push('Warranty expired');
      } else if (warrantyEnd.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000) {
        healthScore -= 10;
        issues.push('Warranty expiring within 30 days');
      }
    }

    // Check support contract
    if (!asset.supportContract) {
      healthScore -= 15;
      issues.push('No support contract');
    } else if (asset.supportContract.status !== 'ACTIVATED') {
      healthScore -= 10;
      issues.push(`Support contract status: ${asset.supportContract.status}`);
    }

    // Check asset status
    if (asset.status !== 'ACTIVE') {
      healthScore -= 25;
      issues.push(`Asset status: ${asset.status}`);
    }

    // Normalize score
    healthScore = Math.max(0, healthScore);

    // Determine health status
    let healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
    if (healthScore >= 70) healthStatus = 'HEALTHY';
    else if (healthScore >= 40) healthStatus = 'AT_RISK';
    else healthStatus = 'CRITICAL';

    // Generate recommendations
    const recommendations: string[] = [];
    if (issues.some(i => i.includes('utilization'))) {
      recommendations.push('Schedule adoption review meeting');
      recommendations.push('Provide training resources to increase usage');
    }
    if (issues.some(i => i.includes('Warranty'))) {
      recommendations.push('Contact about warranty renewal options');
    }
    if (issues.some(i => i.includes('support contract'))) {
      recommendations.push('Propose support contract to ensure continuity');
    }

    return {
      assetId: asset.id,
      healthScore,
      healthStatus,
      issues,
      recommendations,
    };
  }

  /**
   * Analyze license optimization opportunities
   */
  async analyzeLicenseOptimization(
    accountId: string,
    organizationId: string,
  ): Promise<LicenseOptimization[]> {
    const assets = await this.prisma.asset.findMany({
      where: {
        accountId,
        organizationId,
        status: 'ACTIVE',
        seatCount: { not: null },
      },
      include: { product: true },
    });

    const optimizations: LicenseOptimization[] = [];

    for (const asset of assets) {
      if (!asset.seatCount) continue;

      const usedSeats = asset.seatsUsed || 0;
      const utilization = usedSeats / asset.seatCount;
      const renewalValue = asset.renewalValue || 0;
      const costPerSeat = asset.seatCount > 0 ? renewalValue / asset.seatCount : 0;

      let recommendation: 'MAINTAIN' | 'DOWNSIZE' | 'EXPAND';
      let suggestedSeats = asset.seatCount;
      let annualSavingsOrCost = 0;
      let reasoning = '';

      if (utilization < 0.5 && asset.seatCount > 5) {
        // Recommend downsizing
        recommendation = 'DOWNSIZE';
        suggestedSeats = Math.max(Math.ceil(usedSeats * 1.2), 5); // 20% buffer
        annualSavingsOrCost = (asset.seatCount - suggestedSeats) * costPerSeat;
        reasoning = `Current utilization is ${(utilization * 100).toFixed(0)}%. Reducing to ${suggestedSeats} seats (with 20% buffer) would save approximately $${annualSavingsOrCost.toFixed(0)}/year.`;
      } else if (utilization > 0.9) {
        // Recommend expansion
        recommendation = 'EXPAND';
        suggestedSeats = Math.ceil(asset.seatCount * 1.3); // 30% increase
        annualSavingsOrCost = -(suggestedSeats - asset.seatCount) * costPerSeat;
        reasoning = `Current utilization is ${(utilization * 100).toFixed(0)}%. Consider adding seats to accommodate growth. Estimated additional cost: $${Math.abs(annualSavingsOrCost).toFixed(0)}/year.`;
      } else {
        recommendation = 'MAINTAIN';
        reasoning = `Current utilization of ${(utilization * 100).toFixed(0)}% is optimal. No changes recommended.`;
      }

      optimizations.push({
        accountId,
        currentSeats: asset.seatCount,
        usedSeats,
        utilizationRate: utilization,
        recommendation,
        suggestedSeats,
        annualSavingsOrCost,
        reasoning,
      });
    }

    return optimizations;
  }

  /**
   * Generate personalized renewal reminder message
   */
  async generateRenewalMessage(
    assetId: string,
    organizationId: string,
    style: 'formal' | 'friendly' | 'urgent' = 'friendly',
  ): Promise<{
    subject: string;
    body: string;
    callToAction: string;
  }> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
      include: {
        account: {
          include: {
            contacts: { take: 1, orderBy: { createdAt: 'asc' } },
          },
        },
        product: true,
      },
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    const primaryContact = asset.account?.contacts?.[0];
    const daysUntilRenewal = asset.renewalDate
      ? Math.ceil((new Date(asset.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const prompt = `Generate a renewal reminder email for:

ASSET: ${asset.name}
PRODUCT: ${asset.product?.name || 'Unknown'}
RENEWAL DATE: ${asset.renewalDate?.toISOString().split('T')[0] || 'Unknown'}
DAYS UNTIL RENEWAL: ${daysUntilRenewal || 'Unknown'}
RENEWAL VALUE: $${asset.renewalValue || 'Unknown'}

CONTACT: ${primaryContact?.firstName || 'Customer'} ${primaryContact?.lastName || ''}
COMPANY: ${asset.account?.name || 'Unknown'}

TONE: ${style}

Generate:
1. Email subject line
2. Email body (2-3 paragraphs)
3. Clear call to action

Return JSON:
{
  "subject": "string",
  "body": "string",
  "callToAction": "string"
}`;

    const response = await this.llm.generate(prompt, {
      model: 'fast',
      systemPrompt: 'You are a customer success manager writing renewal communications. Be helpful and value-focused, not pushy.',
      temperature: 0.7,
      maxTokens: 800,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to generate renewal message: ${error.message}`);
      throw new Error('Failed to generate renewal message');
    }
  }
}
