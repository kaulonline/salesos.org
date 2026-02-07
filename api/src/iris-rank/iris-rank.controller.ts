/**
 * IRISRank API Controller
 *
 * Exposes IRISRank algorithm as a REST API for external teams and integrations.
 *
 * Use Cases:
 * - Sales Ops: Daily lead scoring, territory prioritization
 * - Marketing: Campaign targeting, segment prioritization
 * - Customer Success: At-risk detection, health scores
 * - Data Science: ML model features, A/B testing
 * - External Partners: CRM integrations
 * - Mobile Apps: Quick ranking queries
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { IRISRankService, CRMEntity, RankingContext, IRISRankResult, MomentumMetrics } from '../ai-sdk/iris-rank.service';
import { AnthropicService } from '../anthropic/anthropic.service';

// ============================================================================
// DTOs - Input/Output schemas
// ============================================================================

/**
 * Entity input for scoring (flexible schema)
 */
interface EntityInput {
  /** Unique identifier */
  id: string;
  /** Entity type (Lead, Contact, Account, Opportunity, or custom) */
  type: string;
  /** Display name */
  name: string;
  /** Arbitrary properties */
  properties?: Record<string, any>;
  /** Activity history */
  activities?: Array<{
    type: string;
    date: string; // ISO date string
    outcome?: 'positive' | 'neutral' | 'negative';
  }>;
  /** Connections to other entities */
  connections?: Array<{
    targetId: string;
    targetType: string;
    relationshipType: string;
    strength?: number;
    /** When this connection was established (ISO date string) */
    createdDate?: string;
  }>;
  /** When entity was created (ISO date string) */
  createdDate?: string;
  /** When entity was last modified (ISO date string) */
  lastModifiedDate?: string;
}

/**
 * Request body for scoring entities
 */
interface ScoreEntitiesRequest {
  /** Entities to rank */
  entities: EntityInput[];
  /** Optional query for relevance scoring */
  query?: string;
  /** Filter by entity types */
  entityTypes?: string[];
  /** Number of results to return */
  limit?: number;
  /** Custom weights (optional) */
  weights?: {
    network?: number;
    activity?: number;
    relevance?: number;
    momentum?: number;
  };
}

/**
 * Simplified response for API consumers
 */
interface RankingResponse {
  /** Ranked entity ID */
  id: string;
  /** Entity name */
  name: string;
  /** Entity type */
  type: string;
  /** Overall rank score (0-1) */
  rank: number;
  /** Component scores */
  scores: {
    network: number;
    activity: number;
    relevance: number;
    momentum: number;
  };
  /** Momentum/trend data */
  momentum: {
    velocity: number;
    acceleration: number;
    trend: string;
    daysSinceLastActivity: number;
  };
  /** Human-readable insights */
  insights: string[];
}

/**
 * Batch processing request
 */
interface BatchScoreRequest {
  /** Multiple entity sets to process */
  batches: Array<{
    batchId: string;
    entities: EntityInput[];
    query?: string;
    limit?: number;
  }>;
}

/**
 * At-risk detection request
 */
interface AtRiskRequest {
  /** Entities to analyze */
  entities: EntityInput[];
  /** Number of at-risk entities to return */
  limit?: number;
  /** Days threshold for inactivity */
  inactivityThreshold?: number;
}

/**
 * Insights/analytics request
 */
interface InsightsRequest {
  /** Entities to analyze */
  entities: EntityInput[];
  /** Types of insights to generate */
  insightTypes?: ('distribution' | 'trends' | 'recommendations' | 'segments')[];
}

// ============================================================================
// Controller
// ============================================================================

/**
 * Request body for AI next steps generation
 */
interface NextStepsRequest {
  /** Entity data */
  entity: EntityInput;
  /** Additional context about the entity */
  context?: {
    recentActivities?: string[];
    dealStage?: string;
    lastContactDate?: string;
    notes?: string;
  };
}

@ApiTags('IRISRank API')
@Controller('iris-rank')
export class IRISRankController {
  private readonly logger = new Logger(IRISRankController.name);

  constructor(
    private readonly irisRank: IRISRankService,
    private readonly anthropicService: AnthropicService,
  ) {}

  // --------------------------------------------------------------------------
  // Core Ranking Endpoints
  // --------------------------------------------------------------------------

  @Post('score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Score and rank entities',
    description: `
      Compute IRISRank scores for a set of entities. Returns ranked list with
      network importance, activity signals, momentum metrics, and actionable insights.

      **Use Cases:**
      - Daily lead prioritization
      - Account health scoring
      - Campaign targeting
      - Territory optimization
    `,
  })
  @ApiResponse({ status: 200, description: 'Entities ranked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async scoreEntities(
    @Request() req,
    @Body() request: ScoreEntitiesRequest,
  ): Promise<{
    success: boolean;
    count: number;
    results: RankingResponse[];
    computedAt: string;
    algorithm: string;
  }> {
    const startTime = Date.now();
    const userId = req.user?.userId || req.user?.id || 'unknown';
    this.logger.log(`[IRISRank API] Score request from user ${userId} with ${request.entities.length} entities`);

    // Validate input
    if (!request.entities || request.entities.length === 0) {
      throw new BadRequestException('At least one entity is required');
    }

    if (request.entities.length > 1000) {
      throw new BadRequestException('Maximum 1000 entities per request. Use /batch for larger datasets.');
    }

    // Convert to CRMEntity format
    const entities = this.convertToCRMEntities(request.entities);

    // Apply custom weights if provided
    if (request.weights) {
      const { network, activity, relevance, momentum } = request.weights;
      if (network !== undefined || activity !== undefined || relevance !== undefined || momentum !== undefined) {
        this.irisRank.updateWeights(
          network ?? 0.30,
          activity ?? 0.25,
          relevance ?? 0.20,
          momentum ?? 0.25,
        );
      }
    }

    // Compute rankings
    const context: RankingContext = {
      query: request.query,
      entityTypes: request.entityTypes,
    };

    const ranked = await this.irisRank.getRankedEntities(
      userId,
      entities,
      context,
      request.limit || 50,
    );

    // Convert to API response format
    const results = this.formatResults(ranked);

    const computeTime = Date.now() - startTime;
    this.logger.log(`[IRISRank API] Scored ${request.entities.length} entities in ${computeTime}ms`);

    return {
      success: true,
      count: results.length,
      results,
      computedAt: new Date().toISOString(),
      algorithm: 'IRISRank v2.0 (PageRank + Velocity + Momentum)',
    };
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch score multiple entity sets',
    description: `
      Process multiple batches of entities in a single request.
      Useful for comparing different segments or territories.

      **Use Cases:**
      - Compare lead quality across territories
      - Score multiple campaign segments
      - Regional account health comparison
    `,
  })
  async batchScore(
    @Request() req,
    @Body() request: BatchScoreRequest,
  ): Promise<{
    success: boolean;
    batches: Array<{
      batchId: string;
      count: number;
      results: RankingResponse[];
    }>;
    computedAt: string;
  }> {
    const userId = req.user?.userId || req.user?.id || 'unknown';
    this.logger.log(`[IRISRank API] Batch request from user ${userId} with ${request.batches.length} batches`);

    if (!request.batches || request.batches.length === 0) {
      throw new BadRequestException('At least one batch is required');
    }

    if (request.batches.length > 10) {
      throw new BadRequestException('Maximum 10 batches per request');
    }

    const results = await Promise.all(
      request.batches.map(async (batch) => {
        const entities = this.convertToCRMEntities(batch.entities);
        const ranked = await this.irisRank.getRankedEntities(
          userId,
          entities,
          { query: batch.query },
          batch.limit || 20,
        );

        return {
          batchId: batch.batchId,
          count: ranked.length,
          results: this.formatResults(ranked),
        };
      }),
    );

    return {
      success: true,
      batches: results,
      computedAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Specialized Endpoints
  // --------------------------------------------------------------------------

  @Post('at-risk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Identify at-risk entities',
    description: `
      Find entities with declining engagement or churn risk signals.
      Uses velocity and acceleration to detect negative momentum.

      **Use Cases:**
      - Customer success: Identify accounts needing attention
      - Sales: Find stalled deals
      - Marketing: Re-engagement campaigns
    `,
  })
  async getAtRisk(
    @Request() req,
    @Body() request: AtRiskRequest,
  ): Promise<{
    success: boolean;
    atRiskCount: number;
    results: Array<RankingResponse & { riskLevel: string; riskFactors: string[] }>;
    computedAt: string;
  }> {
    const userId = req.user?.userId || req.user?.id || 'unknown';
    this.logger.log(`[IRISRank API] At-risk request from user ${userId}`);

    const entities = this.convertToCRMEntities(request.entities);
    const atRisk = await this.irisRank.getAtRiskEntities(userId, entities, request.limit || 10);

    const results = atRisk.map((r) => {
      const base = this.formatSingleResult(r);
      return {
        ...base,
        riskLevel: r.momentum?.trend === 'churning' ? 'Critical' :
                   r.momentum?.trend === 'at_risk' ? 'High' : 'Medium',
        riskFactors: this.extractRiskFactors(r),
      };
    });

    return {
      success: true,
      atRiskCount: results.length,
      results,
      computedAt: new Date().toISOString(),
    };
  }

  @Post('momentum')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find entities with positive momentum',
    description: `
      Identify entities with accelerating engagement - hot leads,
      progressing deals, engaged accounts.

      **Use Cases:**
      - Sales: Find hot leads to prioritize
      - Marketing: Identify engaged prospects
      - Success: Find expansion opportunities
    `,
  })
  async getMomentum(
    @Request() req,
    @Body() request: AtRiskRequest,
  ): Promise<{
    success: boolean;
    count: number;
    results: Array<RankingResponse & { heatLevel: string }>;
    computedAt: string;
  }> {
    const userId = req.user?.userId || req.user?.id || 'unknown';
    this.logger.log(`[IRISRank API] Momentum request from user ${userId}`);

    const entities = this.convertToCRMEntities(request.entities);
    const hot = await this.irisRank.getMomentumEntities(userId, entities, request.limit || 10);

    const results = hot.map((r) => {
      const base = this.formatSingleResult(r);
      return {
        ...base,
        heatLevel: r.momentum?.trend === 'accelerating' ? 'Hot' :
                   r.momentum?.trend === 'steady' ? 'Warm' : 'Active',
      };
    });

    return {
      success: true,
      count: results.length,
      results,
      computedAt: new Date().toISOString(),
    };
  }

  @Post('insights')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate portfolio insights',
    description: `
      Analyze a set of entities and generate actionable insights
      about distribution, trends, and recommendations.

      **Use Cases:**
      - Sales ops: Pipeline health reports
      - Leadership: Territory performance
      - Marketing: Segment analysis
    `,
  })
  async getInsights(
    @Request() req,
    @Body() request: InsightsRequest,
  ): Promise<{
    success: boolean;
    insights: {
      summary: {
        totalEntities: number;
        avgRank: number;
        avgMomentum: number;
      };
      distribution: {
        byTrend: Record<string, number>;
        byType: Record<string, number>;
      };
      recommendations: string[];
    };
    computedAt: string;
  }> {
    const userId = req.user?.userId || req.user?.id || 'unknown';
    this.logger.log(`[IRISRank API] Insights request from user ${userId}`);

    const entities = this.convertToCRMEntities(request.entities);
    const ranked = await this.irisRank.getRankedEntities(userId, entities, {}, entities.length);

    // Calculate distribution
    const byTrend: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalRank = 0;
    let totalMomentum = 0;

    for (const r of ranked) {
      const trend = r.momentum?.trend || 'unknown';
      byTrend[trend] = (byTrend[trend] || 0) + 1;
      byType[r.entityType] = (byType[r.entityType] || 0) + 1;
      totalRank += r.rank;
      totalMomentum += r.momentum?.momentumScore || 0.5;
    }

    // Generate recommendations
    const recommendations: string[] = [];
    const churning = byTrend['churning'] || 0;
    const atRisk = byTrend['at_risk'] || 0;
    const accelerating = byTrend['accelerating'] || 0;

    if (churning > 0) {
      recommendations.push(`${churning} entities are churning - immediate outreach needed`);
    }
    if (atRisk > ranked.length * 0.3) {
      recommendations.push(`${Math.round(atRisk / ranked.length * 100)}% of portfolio is at risk - review engagement strategy`);
    }
    if (accelerating > 0) {
      recommendations.push(`${accelerating} entities have strong momentum - prioritize for conversion`);
    }
    if (ranked.length > 0 && totalMomentum / ranked.length < 0.4) {
      recommendations.push('Overall portfolio momentum is low - consider re-engagement campaigns');
    }

    return {
      success: true,
      insights: {
        summary: {
          totalEntities: ranked.length,
          avgRank: ranked.length > 0 ? Math.round(totalRank / ranked.length * 100) / 100 : 0,
          avgMomentum: ranked.length > 0 ? Math.round(totalMomentum / ranked.length * 100) / 100 : 0,
        },
        distribution: {
          byTrend,
          byType,
        },
        recommendations,
      },
      computedAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // AI-Powered Endpoints
  // --------------------------------------------------------------------------

  @Post('next-steps')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate AI-powered next steps for an entity',
    description: `
      Uses Claude AI to analyze an entity's data and generate personalized
      engagement recommendations and next steps.

      **Use Cases:**
      - Sales: Get specific actions to move a lead forward
      - Account Management: Re-engagement strategies
      - Pipeline: Deal acceleration tactics
    `,
  })
  @ApiResponse({ status: 200, description: 'Next steps generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async generateNextSteps(
    @Request() req,
    @Body() request: NextStepsRequest,
  ): Promise<{
    success: boolean;
    entityId: string;
    entityName: string;
    entityType: string;
    nextSteps: Array<{
      priority: 'high' | 'medium' | 'low';
      action: string;
      reasoning: string;
      timing: string;
    }>;
    summary: string;
    generatedAt: string;
  }> {
    const userId = req.user?.userId || req.user?.id || 'unknown';
    this.logger.log(`[IRISRank API] Next steps request from user ${userId} for entity ${request.entity.id}`);

    if (!request.entity || !request.entity.id) {
      throw new BadRequestException('Entity with id is required');
    }

    const entity = request.entity;
    const context = request.context || {};

    // Build a rich prompt for Claude
    const entityDescription = this.buildEntityDescription(entity, context);

    const systemPrompt = `You are IRIS, an expert AI sales assistant specializing in CRM optimization and sales strategy.
Your task is to analyze a CRM entity and provide specific, actionable next steps for engagement.

Guidelines:
- Be specific and actionable - avoid generic advice
- Consider the entity's current status, activity history, and momentum
- Prioritize actions that will have the highest impact
- Include timing recommendations (immediate, this week, this month)
- Provide brief reasoning for each recommendation
- Limit to 3-5 most impactful actions

Output Format:
Return a JSON object with this exact structure:
{
  "summary": "Brief 1-2 sentence executive summary",
  "nextSteps": [
    {
      "priority": "high|medium|low",
      "action": "Specific action to take",
      "reasoning": "Why this action matters",
      "timing": "When to do this"
    }
  ]
}`;

    const userPrompt = `Analyze this ${entity.type} and provide next steps for engagement:

${entityDescription}

Generate 3-5 specific, actionable next steps to effectively engage with this ${entity.type.toLowerCase()} and move them forward in the sales process.`;

    try {
      const response = await this.anthropicService.generateChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 1024,
      });

      // Parse the JSON response
      let parsed: any;
      try {
        // Extract JSON from the response (handle markdown code blocks)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        this.logger.warn(`Failed to parse AI response as JSON: ${parseError.message}`);
        // Return a structured fallback
        parsed = {
          summary: 'Unable to generate detailed analysis. Please try again.',
          nextSteps: [
            {
              priority: 'high',
              action: `Follow up with ${entity.name}`,
              reasoning: 'Maintain engagement momentum',
              timing: 'This week',
            },
          ],
        };
      }

      return {
        success: true,
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
        nextSteps: parsed.nextSteps || [],
        summary: parsed.summary || '',
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate next steps: ${error.message}`);
      throw new BadRequestException(`Failed to generate next steps: ${error.message}`);
    }
  }

  /**
   * Build a rich description of an entity for AI analysis
   */
  private buildEntityDescription(entity: EntityInput, context: any): string {
    const lines: string[] = [];

    lines.push(`**${entity.type}: ${entity.name}**`);
    lines.push(`ID: ${entity.id}`);

    if (entity.properties) {
      const props = entity.properties;
      if (props.email || props.Email) lines.push(`Email: ${props.email || props.Email}`);
      if (props.phone || props.Phone) lines.push(`Phone: ${props.phone || props.Phone}`);
      if (props.company || props.Company) lines.push(`Company: ${props.company || props.Company}`);
      if (props.title || props.Title) lines.push(`Title: ${props.title || props.Title}`);
      if (props.status || props.Status) lines.push(`Status: ${props.status || props.Status}`);
      if (props.rating || props.Rating) lines.push(`Rating: ${props.rating || props.Rating}`);
      if (props.industry || props.Industry) lines.push(`Industry: ${props.industry || props.Industry}`);
      if (props.leadSource || props.LeadSource) lines.push(`Lead Source: ${props.leadSource || props.LeadSource}`);
      if (props.amount || props.Amount) lines.push(`Deal Amount: $${props.amount || props.Amount}`);
      if (props.stageName || props.StageName) lines.push(`Stage: ${props.stageName || props.StageName}`);
    }

    if (entity.createdDate) {
      lines.push(`Created: ${entity.createdDate}`);
    }
    if (entity.lastModifiedDate) {
      lines.push(`Last Modified: ${entity.lastModifiedDate}`);
    }

    if (entity.activities && entity.activities.length > 0) {
      lines.push('\n**Recent Activities:**');
      entity.activities.slice(0, 5).forEach((a) => {
        lines.push(`- ${a.type} on ${a.date} (${a.outcome || 'neutral'})`);
      });
    }

    if (context.recentActivities && context.recentActivities.length > 0) {
      lines.push('\n**Additional Context:**');
      context.recentActivities.forEach((a: string) => lines.push(`- ${a}`));
    }

    if (context.dealStage) {
      lines.push(`\nDeal Stage: ${context.dealStage}`);
    }
    if (context.lastContactDate) {
      lines.push(`Last Contact: ${context.lastContactDate}`);
    }
    if (context.notes) {
      lines.push(`\nNotes: ${context.notes}`);
    }

    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // Utility Endpoints
  // --------------------------------------------------------------------------

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current IRISRank configuration',
    description: 'Returns the current weights, activity types, and relationship types.',
  })
  async getConfig(): Promise<{
    weights: { network: number; activity: number; relevance: number; momentum: number };
    activityTypes: string[];
    relationshipTypes: string[];
    velocityPeriodDays: number;
  }> {
    const config = this.irisRank.getConfig();
    return {
      weights: {
        network: config.networkWeight || 0.30,
        activity: config.activityWeight || 0.25,
        relevance: config.relevanceWeight || 0.20,
        momentum: config.momentumWeight || 0.25,
      },
      activityTypes: Object.keys(config.activityTypes || {}),
      relationshipTypes: Object.keys(config.relationshipTypes || {}),
      velocityPeriodDays: config.velocityPeriodDays || 7,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get IRISRank usage statistics',
    description: 'Returns computation statistics and cache info.',
  })
  async getStats(): Promise<any> {
    return this.irisRank.getStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  async healthCheck(): Promise<{ status: string; algorithm: string; version: string }> {
    return {
      status: 'healthy',
      algorithm: 'IRISRank',
      version: '2.0.0',
    };
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private convertToCRMEntities(inputs: EntityInput[]): CRMEntity[] {
    return inputs.map((input) => ({
      id: input.id,
      type: input.type,
      name: input.name,
      properties: input.properties || {},
      activities: (input.activities || []).map((a) => ({
        type: a.type,
        date: new Date(a.date),
        outcome: a.outcome || 'neutral',
      })),
      connections: (input.connections || []).map((c) => ({
        targetId: c.targetId,
        targetType: c.targetType,
        relationshipType: c.relationshipType,
        strength: c.strength,
        // Preserve original date if provided, otherwise default to 90 days ago for proper decay
        createdDate: c.createdDate
          ? new Date(c.createdDate)
          : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      })),
      // Preserve original dates if provided
      createdDate: input.createdDate
        ? new Date(input.createdDate)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastModifiedDate: input.lastModifiedDate
        ? new Date(input.lastModifiedDate)
        : new Date(),
    }));
  }

  private formatResults(ranked: IRISRankResult[]): RankingResponse[] {
    return ranked.map((r) => this.formatSingleResult(r));
  }

  private formatSingleResult(r: IRISRankResult): RankingResponse {
    return {
      id: r.entityId,
      name: r.entityName,
      type: r.entityType,
      rank: Math.round(r.rank * 100) / 100,
      scores: {
        network: Math.round(r.networkScore * 100) / 100,
        activity: Math.round(r.activityScore * 100) / 100,
        relevance: Math.round(r.relevanceScore * 100) / 100,
        momentum: Math.round((r.momentum?.momentumScore || 0.5) * 100) / 100,
      },
      momentum: {
        velocity: Math.round((r.momentum?.velocity || 0) * 100) / 100,
        acceleration: Math.round((r.momentum?.acceleration || 0) * 100) / 100,
        trend: r.momentum?.trend || 'unknown',
        daysSinceLastActivity: r.momentum?.daysSinceLastActivity || 999,
      },
      insights: r.explanation || [],
    };
  }

  private extractRiskFactors(r: IRISRankResult): string[] {
    const factors: string[] = [];

    if (r.momentum?.daysSinceLastActivity > 30) {
      factors.push(`No activity for ${r.momentum.daysSinceLastActivity} days`);
    }
    if (r.momentum?.velocity < -0.2) {
      factors.push(`Engagement declining ${Math.abs(Math.round(r.momentum.velocity * 100))}%`);
    }
    if (r.momentum?.acceleration < -0.1) {
      factors.push('Negative trend accelerating');
    }
    if (r.activityScore < 0.3) {
      factors.push('Low overall engagement');
    }

    return factors.length > 0 ? factors : ['General decline in engagement'];
  }
}
