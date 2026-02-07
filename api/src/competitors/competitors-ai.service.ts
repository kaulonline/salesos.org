/**
 * Competitor Intelligence AI Service
 *
 * AI-powered features for competitive intelligence:
 * - Auto-generate battlecards from competitor data
 * - Win/loss analysis with pattern detection
 * - Objection handling suggestions
 * - Competitive positioning recommendations
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LLMService } from '../llm/llm.service';

export interface BattlecardGenerationResult {
  title: string;
  overview: string;
  keyTalkingPoints: string[];
  objectionHandling: { objection: string; response: string }[];
  trapQuestions: string[];
  winThemes: string[];
  differentiators: string[];
}

export interface WinLossInsight {
  pattern: string;
  frequency: number;
  recommendation: string;
  confidence: number;
}

export interface PositioningRecommendation {
  scenario: string;
  positioning: string;
  talkingPoints: string[];
  avoidTopics: string[];
}

@Injectable()
export class CompetitorsAIService {
  private readonly logger = new Logger(CompetitorsAIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LLMService,
  ) {}

  /**
   * Auto-generate a battlecard for a competitor based on available data
   * Caches the result in the database and returns cached version if available
   * @param forceRegenerate - If true, regenerate even if cached version exists
   */
  async generateBattlecard(
    competitorId: string,
    organizationId: string,
    forceRegenerate = false,
  ): Promise<BattlecardGenerationResult & { cached: boolean; generatedAt: Date }> {
    // Check for existing AI-generated battlecard
    if (!forceRegenerate) {
      const existingBattlecard = await this.prisma.battlecard.findFirst({
        where: {
          competitorId,
          isAiGenerated: true,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingBattlecard) {
        this.logger.log(`Returning cached battlecard for competitor ${competitorId}`);
        return {
          title: existingBattlecard.title,
          overview: existingBattlecard.overview || '',
          keyTalkingPoints: existingBattlecard.keyTalkingPoints,
          objectionHandling: (existingBattlecard.objectionHandling as { objection: string; response: string }[]) || [],
          trapQuestions: existingBattlecard.trapQuestions,
          winThemes: existingBattlecard.winThemes,
          differentiators: existingBattlecard.differentiators || [],
          cached: true,
          generatedAt: existingBattlecard.createdAt,
        };
      }
    }

    // Fetch competitor data
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, organizationId },
      include: {
        products: true,
        opportunityLinks: {
          include: {
            opportunity: {
              select: {
                id: true,
                name: true,
                stage: true,
                amount: true,
                closeDate: true,
                isClosed: true,
                isWon: true,
              },
            },
          },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!competitor) {
      throw new Error('Competitor not found');
    }

    // Build context for AI
    const wonDeals = competitor.opportunityLinks.filter(
      oc => oc.opportunity.isWon === true && !oc.wasCompetitorWinner
    );
    const lostDeals = competitor.opportunityLinks.filter(
      oc => oc.opportunity.isClosed === true && oc.opportunity.isWon === false && oc.wasCompetitorWinner
    );

    const prompt = `Generate a comprehensive sales battlecard for competing against "${competitor.name}".

COMPETITOR PROFILE:
- Name: ${competitor.name}
- Website: ${competitor.website || 'Unknown'}
- Tier: ${competitor.tier}
- Target Market: ${competitor.targetMarket || 'Unknown'}
- Pricing Model: ${competitor.pricingModel || 'Unknown'}
- Known Strengths: ${competitor.strengths?.join(', ') || 'None documented'}
- Known Weaknesses: ${competitor.weaknesses?.join(', ') || 'None documented'}
- Key Differentiators: ${competitor.differentiators?.join(', ') || 'None documented'}

COMPETITIVE PRODUCTS:
${competitor.products.map(p => `- ${p.name}: Gaps: ${p.featureGaps?.join(', ') || 'None'}, Advantages: ${p.featureAdvantages?.join(', ') || 'None'}`).join('\n') || 'No product data'}

WIN/LOSS HISTORY:
- Deals won against ${competitor.name}: ${wonDeals.length}
- Deals lost to ${competitor.name}: ${lostDeals.length}
- Win rate: ${competitor.winRateAgainst ? (competitor.winRateAgainst * 100).toFixed(1) + '%' : 'Unknown'}

Generate a battlecard with:
1. A compelling title
2. Executive overview (2-3 sentences)
3. 5-7 key talking points for sales reps
4. 4-6 common objections with effective responses
5. 3-5 "trap questions" to ask prospects that highlight competitor weaknesses
6. 3-4 win themes (scenarios where we consistently win)
7. 3-4 key differentiators to emphasize

Return as JSON with this structure:
{
  "title": "string",
  "overview": "string",
  "keyTalkingPoints": ["string"],
  "objectionHandling": [{"objection": "string", "response": "string"}],
  "trapQuestions": ["string"],
  "winThemes": ["string"],
  "differentiators": ["string"]
}`;

    const response = await this.llm.generate(prompt, {
      model: 'smart',
      systemPrompt: 'You are an expert sales strategist specializing in competitive intelligence. Generate actionable, specific battlecard content that sales reps can use immediately. Return valid JSON only.',
      temperature: 0.7,
      maxTokens: 2000,
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const result: BattlecardGenerationResult = JSON.parse(jsonMatch[0]);

      // Deactivate any existing AI-generated battlecards for this competitor
      await this.prisma.battlecard.updateMany({
        where: {
          competitorId,
          isAiGenerated: true,
        },
        data: { isActive: false },
      });

      // Save the new battlecard to database
      const savedBattlecard = await this.prisma.battlecard.create({
        data: {
          competitorId,
          title: result.title,
          overview: result.overview,
          keyTalkingPoints: result.keyTalkingPoints,
          objectionHandling: result.objectionHandling,
          trapQuestions: result.trapQuestions,
          winThemes: result.winThemes,
          differentiators: result.differentiators,
          isAiGenerated: true,
          isActive: true,
        },
      });

      this.logger.log(`Saved AI-generated battlecard ${savedBattlecard.id} for competitor ${competitorId}`);

      return {
        ...result,
        cached: false,
        generatedAt: savedBattlecard.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to parse battlecard response: ${error.message}`);
      throw new Error('Failed to generate battlecard');
    }
  }

  /**
   * Analyze win/loss patterns against a competitor
   * Caches the result in the database
   * @param forceRegenerate - If true, regenerate even if cached version exists
   */
  async analyzeWinLossPatterns(
    competitorId: string,
    organizationId: string,
    forceRegenerate = false,
  ): Promise<{
    insights: WinLossInsight[];
    summary: string;
    recommendations: string[];
    cached: boolean;
    generatedAt: Date | null;
  }> {
    // Check for cached analysis (less than 7 days old)
    if (!forceRegenerate) {
      const competitor = await this.prisma.competitor.findFirst({
        where: { id: competitorId, organizationId },
        select: { aiWinLossAnalysis: true, aiWinLossGeneratedAt: true },
      });

      if (competitor?.aiWinLossAnalysis && competitor.aiWinLossGeneratedAt) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (competitor.aiWinLossGeneratedAt > sevenDaysAgo) {
          this.logger.log(`Returning cached win/loss analysis for competitor ${competitorId}`);
          const cached = competitor.aiWinLossAnalysis as unknown as {
            insights: WinLossInsight[];
            summary: string;
            recommendations: string[];
          };
          return {
            ...cached,
            cached: true,
            generatedAt: competitor.aiWinLossGeneratedAt,
          };
        }
      }
    }

    // Fetch all deals involving this competitor
    const opportunityLinks = await this.prisma.opportunityCompetitor.findMany({
      where: {
        competitorId,
        opportunity: { organizationId },
      },
      include: {
        opportunity: {
          include: {
            account: { select: { industry: true, numberOfEmployees: true, annualRevenue: true } },
            owner: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (opportunityLinks.length < 3) {
      return {
        insights: [],
        summary: 'Insufficient data for pattern analysis. Need at least 3 competitive deals.',
        recommendations: ['Track more competitive deals to enable AI analysis'],
        cached: false,
        generatedAt: null,
      };
    }

    const wonDeals = opportunityLinks.filter(
      oc => oc.opportunity.isWon === true && !oc.wasCompetitorWinner
    );
    const lostDeals = opportunityLinks.filter(
      oc => oc.opportunity.isClosed === true && oc.opportunity.isWon === false && oc.wasCompetitorWinner
    );

    const prompt = `Analyze win/loss patterns from competitive deals.

WON DEALS (${wonDeals.length}):
${wonDeals.map(d => `- ${d.opportunity.name}: Amount: $${d.opportunity.amount || 0}, Industry: ${d.opportunity.account?.industry || 'Unknown'}, Company Size: ${d.opportunity.account?.numberOfEmployees || 'Unknown'} employees`).join('\n') || 'None'}

LOST DEALS (${lostDeals.length}):
${lostDeals.map(d => `- ${d.opportunity.name}: Amount: $${d.opportunity.amount || 0}, Industry: ${d.opportunity.account?.industry || 'Unknown'}, Company Size: ${d.opportunity.account?.numberOfEmployees || 'Unknown'} employees, Loss Reasons: ${d.lossReasons?.join(', ') || 'Not documented'}`).join('\n') || 'None'}

Identify patterns in:
1. Deal sizes where we win vs lose
2. Industries where we perform better
3. Company sizes that favor us
4. Common loss reasons and how to address them

Return JSON:
{
  "insights": [
    {"pattern": "string", "frequency": 0.0-1.0, "recommendation": "string", "confidence": 0.0-1.0}
  ],
  "summary": "2-3 sentence executive summary",
  "recommendations": ["actionable recommendation strings"]
}`;

    const response = await this.llm.generate(prompt, {
      model: 'smart',
      systemPrompt: 'You are a sales analytics expert. Identify actionable patterns from win/loss data. Be specific and data-driven.',
      temperature: 0.5,
      maxTokens: 1500,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const result = JSON.parse(jsonMatch[0]) as {
        insights: WinLossInsight[];
        summary: string;
        recommendations: string[];
      };

      // Save to database
      const now = new Date();
      await this.prisma.competitor.update({
        where: { id: competitorId },
        data: {
          aiWinLossAnalysis: JSON.parse(JSON.stringify(result)),
          aiWinLossGeneratedAt: now,
        },
      });

      this.logger.log(`Saved win/loss analysis for competitor ${competitorId}`);

      return {
        ...result,
        cached: false,
        generatedAt: now,
      };
    } catch (error) {
      this.logger.error(`Failed to parse win/loss analysis: ${error.message}`);
      return {
        insights: [],
        summary: 'Analysis failed - please try again',
        recommendations: [],
        cached: false,
        generatedAt: null,
      };
    }
  }

  /**
   * Generate objection handling suggestions for a specific objection
   */
  async generateObjectionResponse(
    competitorId: string,
    objection: string,
    organizationId: string,
  ): Promise<{
    response: string;
    alternativeResponses: string[];
    proofPoints: string[];
    followUpQuestions: string[];
  }> {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, organizationId },
    });

    if (!competitor) {
      throw new Error('Competitor not found');
    }

    const prompt = `A prospect raised this objection comparing us to ${competitor.name}:

"${objection}"

Competitor context:
- Weaknesses: ${competitor.weaknesses?.join(', ') || 'Unknown'}
- Our differentiators: ${competitor.differentiators?.join(', ') || 'Unknown'}

Generate:
1. A primary response (2-3 sentences, empathetic but redirecting)
2. 2 alternative response approaches
3. 3 proof points or evidence to support our position
4. 2 follow-up questions to regain control of the conversation

Return JSON:
{
  "response": "string",
  "alternativeResponses": ["string"],
  "proofPoints": ["string"],
  "followUpQuestions": ["string"]
}`;

    const response = await this.llm.generate(prompt, {
      model: 'fast',
      systemPrompt: 'You are a sales objection handling expert. Provide professional, non-defensive responses that acknowledge concerns while highlighting strengths.',
      temperature: 0.7,
      maxTokens: 1000,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to parse objection response: ${error.message}`);
      throw new Error('Failed to generate objection response');
    }
  }

  /**
   * Get competitive positioning recommendations for an opportunity
   */
  async getPositioningRecommendations(
    opportunityId: string,
    organizationId: string,
  ): Promise<PositioningRecommendation[]> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: {
        account: true,
        opportunityCompetitors: {
          include: { competitor: true },
        },
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const competitors = opportunity.opportunityCompetitors.map(oc => oc.competitor);

    if (competitors.length === 0) {
      return [{
        scenario: 'No competitors identified',
        positioning: 'Focus on value proposition and customer needs',
        talkingPoints: ['Understand customer pain points', 'Demonstrate unique capabilities'],
        avoidTopics: [],
      }];
    }

    const prompt = `Generate competitive positioning recommendations for this deal.

OPPORTUNITY:
- Name: ${opportunity.name}
- Amount: $${opportunity.amount || 'Unknown'}
- Stage: ${opportunity.stage}

ACCOUNT:
- Company: ${opportunity.account?.name || 'Unknown'}
- Industry: ${opportunity.account?.industry || 'Unknown'}
- Size: ${opportunity.account?.numberOfEmployees || 'Unknown'} employees

COMPETITORS IN DEAL:
${competitors.map(c => `- ${c.name} (${c.tier}): Strengths: ${c.strengths?.join(', ') || 'Unknown'}, Weaknesses: ${c.weaknesses?.join(', ') || 'Unknown'}`).join('\n')}

For each competitor, provide positioning recommendations:
1. Scenario (when this positioning applies)
2. Positioning statement
3. Key talking points
4. Topics to avoid

Return JSON array:
[{
  "scenario": "string",
  "positioning": "string",
  "talkingPoints": ["string"],
  "avoidTopics": ["string"]
}]`;

    const response = await this.llm.generate(prompt, {
      model: 'smart',
      systemPrompt: 'You are a competitive strategy expert. Provide specific, actionable positioning guidance.',
      temperature: 0.6,
      maxTokens: 1500,
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to parse positioning: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze a call transcript for competitive mentions and coaching opportunities
   */
  async analyzeCompetitiveCall(
    transcript: string,
    organizationId: string,
  ): Promise<{
    competitorsMentioned: { name: string; context: string; sentiment: string }[];
    coachingPoints: string[];
    missedOpportunities: string[];
    effectiveTactics: string[];
  }> {
    // Get known competitors for context
    const competitors = await this.prisma.competitor.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: { name: true },
    });

    const competitorNames = competitors.map(c => c.name).join(', ');

    const prompt = `Analyze this sales call transcript for competitive intelligence.

KNOWN COMPETITORS: ${competitorNames || 'None in database'}

TRANSCRIPT:
${transcript.substring(0, 4000)}

Analyze and return:
1. Competitors mentioned (name, context of mention, sentiment - positive/negative/neutral)
2. Coaching points for the sales rep
3. Missed opportunities to differentiate
4. Effective competitive tactics used

Return JSON:
{
  "competitorsMentioned": [{"name": "string", "context": "string", "sentiment": "positive|negative|neutral"}],
  "coachingPoints": ["string"],
  "missedOpportunities": ["string"],
  "effectiveTactics": ["string"]
}`;

    const response = await this.llm.generate(prompt, {
      model: 'smart',
      systemPrompt: 'You are a sales coaching expert specializing in competitive selling. Provide constructive, specific feedback.',
      temperature: 0.5,
      maxTokens: 1500,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to parse call analysis: ${error.message}`);
      return {
        competitorsMentioned: [],
        coachingPoints: ['Unable to analyze transcript'],
        missedOpportunities: [],
        effectiveTactics: [],
      };
    }
  }
}
