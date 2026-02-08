import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LLMService } from '../llm/llm.service';

export interface AIEnrichmentResult {
  score: number; // 0-100
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  insights: {
    buyingIntent: string;
    urgency: string;
    budgetIndicator: string;
    decisionMakerLikelihood: string;
    fitScore: string;
    riskFactors: string[];
    positiveSignals: string[];
  };
  companyInfo: {
    estimatedRevenue: string;
    employeeRange: string;
    industryVertical: string;
    techMaturity: string;
    potentialUseCase: string;
  };
  recommendedActions: string[];
  summary: string;
}

@Injectable()
export class AccessRequestAIService {
  private readonly logger = new Logger(AccessRequestAIService.name);

  constructor(
    private prisma: PrismaService,
    private llmService: LLMService,
  ) {}

  /**
   * Enrich an access request with AI-powered scoring and insights
   */
  async enrichAccessRequest(requestId: string): Promise<AIEnrichmentResult> {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Access request not found');
    }

    this.logger.log(`Starting AI enrichment for access request ${requestId}`);

    try {
      const enrichmentResult = await this.generateAIEnrichment(request);

      // Update the access request with AI insights
      await this.prisma.accessRequest.update({
        where: { id: requestId },
        data: {
          aiScore: enrichmentResult.score,
          aiPriority: enrichmentResult.priority,
          aiInsights: enrichmentResult.insights as any,
          aiCompanyInfo: enrichmentResult.companyInfo as any,
          aiRecommendedActions: enrichmentResult.recommendedActions,
          aiSummary: enrichmentResult.summary,
          aiEnrichedAt: new Date(),
        },
      });

      this.logger.log(
        `AI enrichment complete for ${requestId}: Score=${enrichmentResult.score}, Priority=${enrichmentResult.priority}`,
      );

      return enrichmentResult;
    } catch (error) {
      this.logger.error(
        `AI enrichment failed for ${requestId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate AI enrichment using LLM
   */
  private async generateAIEnrichment(request: any): Promise<AIEnrichmentResult> {
    const prompt = this.buildEnrichmentPrompt(request);

    const response = await this.llmService.chat({
      model: 'fast', // Use fast model for efficiency
      messages: [
        {
          role: 'system',
          content: `You are a sales intelligence AI that analyzes inbound lead requests for a B2B SaaS CRM platform called SalesOS. Your job is to:
1. Score leads from 0-100 based on likelihood to convert
2. Identify priority level (HIGH/MEDIUM/LOW)
3. Extract key buying signals and risk factors
4. Provide actionable recommendations for the sales team

Always respond with valid JSON matching the exact schema provided.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Low temperature for consistent scoring
      responseFormat: { type: 'json_object' },
    });

    const rawContent = response.choices?.[0]?.message?.content || '{}';
    const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);

    try {
      const parsed = JSON.parse(content);
      return this.validateAndNormalizeResult(parsed);
    } catch (error) {
      this.logger.warn(`Failed to parse AI response, using fallback scoring`);
      return this.calculateFallbackScore(request);
    }
  }

  /**
   * Build the prompt for AI enrichment
   */
  private buildEnrichmentPrompt(request: any): string {
    return `Analyze this access request for SalesOS CRM and provide lead scoring and enrichment.

## Access Request Details

**Contact Information:**
- Name: ${request.firstName} ${request.lastName}
- Email: ${request.email}
- Job Title: ${request.jobTitle || 'Not provided'}
- Phone: ${request.phone || 'Not provided'}

**Company Information:**
- Company: ${request.companyName}
- Company Size: ${request.companySize || 'Not provided'}
- Industry: ${request.industry || 'Not provided'}
- Website: ${request.website || 'Not provided'}

**Request Details:**
- Request Type: ${request.requestType}
- Interests: ${(request.interests || []).join(', ') || 'Not specified'}
- How They Heard About Us: ${request.howHeard || 'Not provided'}
- Message: ${request.message || 'No message provided'}

## Scoring Criteria

Consider these factors for scoring (0-100):
- **Company Size**: Enterprise (1000+) = higher score, SMB = medium, Startup = lower
- **Job Title**: C-level/VP = higher, Manager = medium, Individual = lower
- **Request Type**: Enterprise inquiry = highest, Demo = high, Free trial = medium
- **Industry Fit**: Tech/SaaS/Finance = higher fit for CRM
- **Message Quality**: Detailed requirements = higher intent
- **Interests Breadth**: Multiple features = higher engagement

## Response Schema

Respond with this exact JSON structure:
{
  "score": <number 0-100>,
  "priority": "<HIGH|MEDIUM|LOW>",
  "insights": {
    "buyingIntent": "<HIGH|MEDIUM|LOW with brief explanation>",
    "urgency": "<IMMEDIATE|NEAR_TERM|EXPLORING with explanation>",
    "budgetIndicator": "<ENTERPRISE|MID_MARKET|SMB|UNKNOWN>",
    "decisionMakerLikelihood": "<HIGH|MEDIUM|LOW based on title>",
    "fitScore": "<EXCELLENT|GOOD|MODERATE|POOR with reason>",
    "riskFactors": ["<list of concerns or red flags>"],
    "positiveSignals": ["<list of positive buying signals>"]
  },
  "companyInfo": {
    "estimatedRevenue": "<revenue range estimate>",
    "employeeRange": "<normalized employee range>",
    "industryVertical": "<specific industry vertical>",
    "techMaturity": "<HIGH|MEDIUM|LOW>",
    "potentialUseCase": "<primary use case for SalesOS>"
  },
  "recommendedActions": [
    "<specific action 1>",
    "<specific action 2>",
    "<specific action 3>"
  ],
  "summary": "<2-3 sentence executive summary for sales team>"
}`;
  }

  /**
   * Validate and normalize AI response
   */
  private validateAndNormalizeResult(parsed: any): AIEnrichmentResult {
    return {
      score: Math.min(100, Math.max(0, parseInt(parsed.score) || 50)),
      priority: ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.priority)
        ? parsed.priority
        : 'MEDIUM',
      insights: {
        buyingIntent: parsed.insights?.buyingIntent || 'Unknown',
        urgency: parsed.insights?.urgency || 'Unknown',
        budgetIndicator: parsed.insights?.budgetIndicator || 'Unknown',
        decisionMakerLikelihood: parsed.insights?.decisionMakerLikelihood || 'Unknown',
        fitScore: parsed.insights?.fitScore || 'Unknown',
        riskFactors: Array.isArray(parsed.insights?.riskFactors)
          ? parsed.insights.riskFactors
          : [],
        positiveSignals: Array.isArray(parsed.insights?.positiveSignals)
          ? parsed.insights.positiveSignals
          : [],
      },
      companyInfo: {
        estimatedRevenue: parsed.companyInfo?.estimatedRevenue || 'Unknown',
        employeeRange: parsed.companyInfo?.employeeRange || 'Unknown',
        industryVertical: parsed.companyInfo?.industryVertical || 'Unknown',
        techMaturity: parsed.companyInfo?.techMaturity || 'Unknown',
        potentialUseCase: parsed.companyInfo?.potentialUseCase || 'Unknown',
      },
      recommendedActions: Array.isArray(parsed.recommendedActions)
        ? parsed.recommendedActions.slice(0, 5)
        : ['Review request details', 'Reach out via email'],
      summary: parsed.summary || 'AI analysis pending review.',
    };
  }

  /**
   * Calculate fallback score when AI fails
   */
  private calculateFallbackScore(request: any): AIEnrichmentResult {
    let score = 50;

    // Company size scoring
    const sizeScores: Record<string, number> = {
      '1-10': 10,
      '11-50': 20,
      '51-200': 30,
      '201-500': 40,
      '501-1000': 50,
      '1000+': 60,
    };
    score += sizeScores[request.companySize] || 15;

    // Request type scoring
    const typeScores: Record<string, number> = {
      ENTERPRISE: 30,
      DEMO: 20,
      FREE_TRIAL: 10,
      PARTNER: 25,
      OTHER: 5,
    };
    score += typeScores[request.requestType] || 10;

    // Interest breadth
    const interestCount = (request.interests || []).length;
    score += Math.min(interestCount * 3, 15);

    // Has message = more engaged
    if (request.message && request.message.length > 50) {
      score += 10;
    }

    // Normalize score
    score = Math.min(100, Math.max(0, score));

    const priority =
      score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';

    return {
      score,
      priority,
      insights: {
        buyingIntent: priority,
        urgency: request.requestType === 'ENTERPRISE' ? 'NEAR_TERM' : 'EXPLORING',
        budgetIndicator: this.inferBudget(request.companySize),
        decisionMakerLikelihood: this.inferDecisionMaker(request.jobTitle),
        fitScore: 'MODERATE',
        riskFactors: ['AI enrichment unavailable - manual review recommended'],
        positiveSignals: this.extractPositiveSignals(request),
      },
      companyInfo: {
        estimatedRevenue: 'Unknown',
        employeeRange: request.companySize || 'Unknown',
        industryVertical: request.industry || 'Unknown',
        techMaturity: 'Unknown',
        potentialUseCase: 'General CRM usage',
      },
      recommendedActions: [
        'Review request manually',
        `Send personalized email to ${request.email}`,
        'Research company website',
      ],
      summary: `${request.firstName} from ${request.companyName} submitted a ${request.requestType.toLowerCase()} request. Score: ${score}/100. Manual review recommended.`,
    };
  }

  /**
   * Infer budget from company size
   */
  private inferBudget(companySize?: string): string {
    const mapping: Record<string, string> = {
      '1-10': 'SMB',
      '11-50': 'SMB',
      '51-200': 'MID_MARKET',
      '201-500': 'MID_MARKET',
      '501-1000': 'ENTERPRISE',
      '1000+': 'ENTERPRISE',
    };
    return mapping[companySize || ''] || 'UNKNOWN';
  }

  /**
   * Infer decision maker likelihood from job title
   */
  private inferDecisionMaker(jobTitle?: string): string {
    if (!jobTitle) return 'UNKNOWN';
    const title = jobTitle.toLowerCase();

    if (
      title.includes('ceo') ||
      title.includes('cfo') ||
      title.includes('cto') ||
      title.includes('coo') ||
      title.includes('chief') ||
      title.includes('founder') ||
      title.includes('owner') ||
      title.includes('president')
    ) {
      return 'HIGH';
    }

    if (
      title.includes('vp') ||
      title.includes('vice president') ||
      title.includes('director') ||
      title.includes('head of')
    ) {
      return 'HIGH';
    }

    if (
      title.includes('manager') ||
      title.includes('lead') ||
      title.includes('senior')
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Extract positive signals from request
   */
  private extractPositiveSignals(request: any): string[] {
    const signals: string[] = [];

    if (request.requestType === 'ENTERPRISE') {
      signals.push('Enterprise-level inquiry');
    }
    if (request.requestType === 'DEMO') {
      signals.push('Requested product demo');
    }
    if ((request.interests || []).length >= 3) {
      signals.push('Interest in multiple features');
    }
    if (request.message && request.message.length > 100) {
      signals.push('Detailed requirements provided');
    }
    if (request.phone) {
      signals.push('Provided phone number');
    }
    if (['501-1000', '1000+'].includes(request.companySize)) {
      signals.push('Large company size');
    }

    return signals.length > 0 ? signals : ['Submitted access request'];
  }

  /**
   * Bulk enrich multiple access requests
   */
  async bulkEnrich(requestIds: string[]): Promise<void> {
    this.logger.log(`Starting bulk AI enrichment for ${requestIds.length} requests`);

    for (const id of requestIds) {
      try {
        await this.enrichAccessRequest(id);
        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.warn(`Failed to enrich request ${id}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk enrichment complete`);
  }

  /**
   * Auto-sort access requests by AI score
   */
  async getSortedRequests(options?: {
    status?: string;
    minScore?: number;
    priority?: string;
    limit?: number;
  }) {
    const { status, minScore, priority, limit = 50 } = options || {};

    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (minScore) {
      where.aiScore = { gte: minScore };
    }
    if (priority) {
      where.aiPriority = priority;
    }

    return this.prisma.accessRequest.findMany({
      where,
      orderBy: [
        { aiPriority: 'asc' }, // HIGH comes before LOW alphabetically
        { aiScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  }
}
