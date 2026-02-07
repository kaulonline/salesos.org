import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../ai/openai.service';

export interface RevenueForecastData {
  forecast: Array<{ 
    month: string; 
    monthly: number; 
    cumulative: number; 
    confidence: number;
  }>;
  insights: string[];
  growthRate: number;
  trend: 'growing' | 'stable' | 'declining';
}

@Injectable()
export class RevenueForecastService {
  private readonly logger = new Logger(RevenueForecastService.name);

  constructor(private readonly openaiService: OpenAIService) {}

  async generateForecast(
    currentMonthlyRevenue: number,
    userCount: number,
  ): Promise<RevenueForecastData> {
    this.logger.log(`Generating AI revenue forecast for MRR: $${currentMonthlyRevenue}, Users: ${userCount}`);

    try {
      const prompt = this.buildForecastPrompt(currentMonthlyRevenue, userCount);
      const response = await this.openaiService.generateCompletion([
        {
          role: 'system',
          content: `You are a SaaS revenue forecasting expert. Analyze subscription data and generate realistic 24-month projections with insights. Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ], {
        temperature: 0.3,
        maxTokens: 2000,
      });

      const forecast = this.parseForecastResponse(response, currentMonthlyRevenue);
      return forecast;
    } catch (error) {
      this.logger.error('Failed to generate AI forecast', error);
      // Fallback to simple projection
      return this.generateFallbackForecast(currentMonthlyRevenue, userCount);
    }
  }

  private buildForecastPrompt(monthlyRevenue: number, userCount: number): string {
    const avgRevenuePerUser = userCount > 0 ? monthlyRevenue / userCount : 0;

    return `
Analyze this SaaS subscription data and generate a realistic 24-month revenue forecast:

Current Metrics:
- Monthly Recurring Revenue (MRR): $${monthlyRevenue.toFixed(2)}
- Active Users: ${userCount}
- Average Revenue Per User (ARPU): $${avgRevenuePerUser.toFixed(2)}

Generate a JSON response with:
1. "forecast": Array of 24 months with { month: "Jan 25", monthly: number, cumulative: number, confidence: 0-100 }
2. "insights": Array of 3-5 actionable insights about the revenue trajectory
3. "growthRate": Average monthly growth rate as a decimal (e.g., 0.02 for 2%)
4. "trend": "growing" | "stable" | "declining"

Consider:
- Early-stage SaaS typically grows 5-15% monthly
- Account for seasonal variations (Q4 typically stronger)
- Confidence should decrease for further months
- Provide realistic, data-driven projections

Return ONLY the JSON object, no markdown or explanation.`;
  }

  private parseForecastResponse(response: string, currentMRR: number): RevenueForecastData {
    try {
      // Clean response - remove markdown code blocks if present
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const data = JSON.parse(cleaned);

      // Validate and sanitize the forecast data
      if (!data.forecast || !Array.isArray(data.forecast)) {
        throw new Error('Invalid forecast structure');
      }

      // Ensure all required fields exist
      return {
        forecast: data.forecast.map((item: any) => ({
          month: item.month || '',
          monthly: Math.round(item.monthly || currentMRR),
          cumulative: Math.round(item.cumulative || 0),
          confidence: Math.min(100, Math.max(0, item.confidence || 85)),
        })),
        insights: Array.isArray(data.insights) ? data.insights.slice(0, 5) : [],
        growthRate: typeof data.growthRate === 'number' ? data.growthRate : 0.05,
        trend: ['growing', 'stable', 'declining'].includes(data.trend) ? data.trend : 'stable',
      };
    } catch (error) {
      this.logger.error('Failed to parse LLM response', error);
      throw error;
    }
  }

  private generateFallbackForecast(monthlyRevenue: number, userCount: number): RevenueForecastData {
    const forecast: Array<{ month: string; monthly: number; cumulative: number; confidence: number }> = [];
    const currentDate = new Date();
    let cumulative = 0;
    const baseGrowth = 0.05; // 5% monthly growth

    for (let i = 0; i < 24; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      // Apply growth with seasonal variation
      const seasonalMultiplier = this.getSeasonalMultiplier(date.getMonth());
      const projectedMonthly = monthlyRevenue * Math.pow(1 + baseGrowth, i) * seasonalMultiplier;
      cumulative += projectedMonthly;
      
      // Confidence decreases over time
      const confidence = Math.max(50, 95 - (i * 2));

      forecast.push({
        month: monthLabel,
        monthly: Math.round(projectedMonthly),
        cumulative: Math.round(cumulative),
        confidence,
      });
    }

    return {
      forecast,
      insights: [
        `Based on ${userCount} active users, your current MRR is $${monthlyRevenue.toFixed(2)}`,
        `With 5% monthly growth, you could reach $${(monthlyRevenue * Math.pow(1.05, 12)).toFixed(0)} MRR in 12 months`,
        `Focus on user retention to maintain steady revenue growth`,
        `Consider pricing optimization as user base scales`,
      ],
      growthRate: baseGrowth,
      trend: 'growing',
    };
  }

  private getSeasonalMultiplier(month: number): number {
    // Q4 (Oct, Nov, Dec) typically stronger: 1.05-1.1
    // Q1 (Jan, Feb, Mar) slower: 0.95-0.98
    // Q2, Q3 stable: 1.0
    const seasonalFactors = [
      0.97, 0.96, 0.98, // Q1: Jan, Feb, Mar
      1.00, 1.02, 1.01, // Q2: Apr, May, Jun
      0.99, 1.00, 1.01, // Q3: Jul, Aug, Sep
      1.05, 1.08, 1.10, // Q4: Oct, Nov, Dec
    ];
    return seasonalFactors[month] || 1.0;
  }
}
