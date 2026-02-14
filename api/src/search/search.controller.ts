import { Controller, Get, Post, Body, Query, HttpException, HttpStatus, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService, WebResearchResult } from './search.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import {
  FinancialDataService,
  StockQuote,
  FinancialMetrics,
  AnalystData,
  CompanyProfile,
  EarningsDataPoint,
} from './financial-data.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';

interface CompanyResearchDto {
  url: string;
  includeNews?: boolean;
  includeLeadership?: boolean;
  includeCompetitors?: boolean;
  includeJobs?: boolean;
  includeFinancials?: boolean;
}

interface WebSearchDto {
  query: string;
  num?: number;
}

// Frontend-compatible price data point
interface PriceDataPoint {
  date: string;
  price: number;
}

// Frontend-compatible chart data
interface ChartData {
  type: 'stock_price' | 'revenue' | 'custom';
  title: string;
  data: PriceDataPoint[];
}

// Frontend-compatible financial data response
interface FrontendFinancialData {
  symbol: string;
  stockQuote?: StockQuote;
  historicalPrices?: PriceDataPoint[];
  chartData?: ChartData;
  metrics?: FinancialMetrics;
  profile?: CompanyProfile;
  analystData?: AnalystData;
  earnings?: {
    annual?: EarningsDataPoint[];
    quarterly?: EarningsDataPoint[];
  };
  error?: string;
}

interface CompanyBriefResponse {
  brief: string;
  research: {
    company: WebResearchResult;
    news?: WebResearchResult;
    leadership?: WebResearchResult;
    competitors?: WebResearchResult;
    jobs?: WebResearchResult;
  };
  financialData?: FrontendFinancialData;
}

@ApiTags('Search')
@ApiBearerAuth('JWT')
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly anthropicService: AnthropicService,
    private readonly financialDataService: FinancialDataService,
  ) {}

  /**
   * Check if Google Search is enabled
   */
  @Get('status')
  getStatus() {
    return {
      enabled: this.searchService.isEnabled(),
      message: this.searchService.isEnabled()
        ? 'Google Custom Search is configured and ready'
        : 'Google Custom Search is not configured. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID.',
    };
  }

  /**
   * Perform a simple web search
   */
  @Get()
  async search(@Query('q') query: string, @Query('num') num?: string): Promise<WebResearchResult> {
    if (!query) {
      throw new HttpException('Query parameter "q" is required', HttpStatus.BAD_REQUEST);
    }

    return this.searchService.webSearch(query);
  }

  /**
   * Research a company and generate an AI-powered brief
   */
  @Post('company-research')
  async researchCompany(@Body() dto: CompanyResearchDto): Promise<CompanyBriefResponse> {
    if (!dto.url) {
      throw new HttpException('Company URL is required', HttpStatus.BAD_REQUEST);
    }

    // Gather research data in parallel
    const researchPromises: Promise<any>[] = [this.searchService.researchCompany(dto.url)];

    // Extract company name for additional searches
    let companyName = dto.url;
    try {
      const url = new URL(dto.url.startsWith('http') ? dto.url : `https://${dto.url}`);
      companyName = url.hostname.replace('www.', '').split('.')[0];
    } catch {
      // Use as-is
    }

    if (dto.includeNews) {
      researchPromises.push(this.searchService.searchCompanyNews(companyName));
    }
    if (dto.includeLeadership) {
      researchPromises.push(this.searchService.searchLeadership(companyName));
    }
    if (dto.includeCompetitors) {
      researchPromises.push(this.searchService.searchCompetitors(companyName));
    }
    if (dto.includeJobs) {
      researchPromises.push(this.searchService.searchJobPostings(companyName));
    }

    const results = await Promise.all(researchPromises);

    const research: CompanyBriefResponse['research'] = {
      company: results[0],
    };

    let idx = 1;
    if (dto.includeNews) research.news = results[idx++];
    if (dto.includeLeadership) research.leadership = results[idx++];
    if (dto.includeCompetitors) research.competitors = results[idx++];
    if (dto.includeJobs) research.jobs = results[idx++];

    // Fetch financial data if requested (separate from web research to avoid rate limits)
    let financialData: CompanyBriefResponse['financialData'];
    if (dto.includeFinancials !== false && this.financialDataService.isEnabled()) {
      try {
        const data = await this.financialDataService.getFinancialData(companyName);
        if (data) {
          // Transform backend FinancialData to frontend-compatible format
          financialData = {
            symbol: data.symbol,
            stockQuote: data.quote,
            historicalPrices: data.historicalPrices?.map((p) => ({
              date: p.date,
              price: p.close,
            })),
            chartData: data.historicalPrices?.length
              ? {
                  type: 'stock_price' as const,
                  title: `${data.symbol} Stock Price (30 Days)`,
                  data: data.historicalPrices.map((p) => ({
                    date: p.date,
                    price: p.close,
                  })),
                }
              : undefined,
            metrics: data.metrics,
            profile: data.profile,
            analystData: data.analystData,
            earnings: data.earnings,
            error: data.error,
          };
        }
      } catch (error) {
        // Financial data is optional - don't fail the whole request
        this.logger.warn(`Failed to fetch financial data for ${companyName}`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Generate AI brief from research
    const brief = await this.generateCompanyBrief(companyName, dto.url, research, financialData);

    return { brief, research, financialData };
  }

  /**
   * Generate an AI-powered company brief from research data
   */
  private async generateCompanyBrief(
    companyName: string,
    url: string,
    research: CompanyBriefResponse['research'],
    financialData?: FrontendFinancialData,
  ): Promise<string> {
    const companyInfo = research.company.companyInfo;
    const companyResults = research.company.searchResults.slice(0, 5);
    const newsResults = research.news?.searchResults.slice(0, 3) || [];
    const leadershipResults = research.leadership?.searchResults.slice(0, 3) || [];
    const competitorResults = research.competitors?.searchResults.slice(0, 3) || [];
    const jobResults = research.jobs?.searchResults.slice(0, 3) || [];

    // Build financial context if available
    let financialContext = '';
    if (financialData && !financialData.error && financialData.stockQuote && financialData.stockQuote.price != null) {
      const quote = financialData.stockQuote;
      const metrics = financialData.metrics;
      financialContext = `
## Financial Data (${financialData.symbol})
- Stock Price: $${quote.price?.toFixed(2) ?? 'N/A'} (${quote.changePercent != null ? (quote.changePercent >= 0 ? '+' : '') + quote.changePercent.toFixed(2) + '%' : 'N/A'})
${quote.low != null && quote.high != null ? `- Day Range: $${quote.low.toFixed(2)} - $${quote.high.toFixed(2)}` : ''}
${quote.volume != null ? `- Volume: ${(quote.volume / 1e6).toFixed(2)}M` : ''}
${quote.marketCap ? `- Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B` : ''}
${quote.peRatio ? `- P/E Ratio: ${quote.peRatio.toFixed(2)}` : ''}
${quote.week52Low && quote.week52High ? `- 52W Range: $${quote.week52Low.toFixed(2)} - $${quote.week52High.toFixed(2)}` : ''}
${metrics?.revenue ? `- Revenue (TTM): $${(metrics.revenue / 1e9).toFixed(2)}B` : ''}
${metrics?.ebitda ? `- EBITDA: $${(metrics.ebitda / 1e9).toFixed(2)}B` : ''}
`;
    } else if (financialData?.error) {
      financialContext = `\n## Financial Note: ${financialData.error}\n`;
    }

    const researchContext = `
COMPANY RESEARCH DATA FOR: ${companyName}
Website: ${url}

## Company Overview Search Results:
${companyResults.map((r) => `- ${r.title}: ${r.snippet}`).join('\n')}

${companyInfo?.description ? `## Extracted Description:\n${companyInfo.description}` : ''}
${companyInfo?.industry ? `## Detected Industry: ${companyInfo.industry}` : ''}
${companyInfo?.socialLinks?.length ? `## Social Links:\n${companyInfo.socialLinks.join('\n')}` : ''}
${financialContext}
${newsResults.length ? `## Recent News:\n${newsResults.map((r) => `- ${r.title}: ${r.snippet}`).join('\n')}` : ''}

${leadershipResults.length ? `## Leadership/Team:\n${leadershipResults.map((r) => `- ${r.title}: ${r.snippet}`).join('\n')}` : ''}

${competitorResults.length ? `## Competitors/Market:\n${competitorResults.map((r) => `- ${r.title}: ${r.snippet}`).join('\n')}` : ''}

${jobResults.length ? `## Recent Job Postings (Growth Signals):\n${jobResults.map((r) => `- ${r.title}: ${r.snippet}`).join('\n')}` : ''}
`;

    const systemPrompt = `You are a sales intelligence analyst. Generate a comprehensive but concise account brief for a sales team based on web research data.

The brief should be in markdown format and include:
1. **Company Overview** - What the company does, their value proposition
2. **Industry & Market Position** - Their industry, market segment, positioning
3. **Financial Performance** - Stock performance, market cap, revenue, key metrics (if available)
4. **Key People** - Leadership team if found
5. **Recent Signals** - News, announcements, growth indicators (job postings)
6. **Competitive Landscape** - Key competitors if found
7. **Sales Angles** - 3-4 specific angles for approaching this company
8. **Recommended Next Steps** - Suggested actions for sales outreach

Be specific and actionable. If information is not found, note it briefly and move on.
Format the output as clean markdown with headers and bullet points.`;

    const userMessage = `Based on the following web research data, generate a sales account brief for ${companyName}:

${researchContext}

Generate a comprehensive account brief for the sales team.`;

    try {
      const brief = await this.anthropicService.generateChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        maxTokens: 2000,
      });

      return brief;
    } catch (error) {
      // Fallback to structured template if AI fails
      return this.generateFallbackBrief(companyName, url, research);
    }
  }

  /**
   * Fallback brief generation without AI
   */
  private generateFallbackBrief(
    companyName: string,
    url: string,
    research: CompanyBriefResponse['research'],
  ): string {
    const info = research.company.companyInfo;
    const capitalizedName = companyName.charAt(0).toUpperCase() + companyName.slice(1);

    return `# Account Brief: ${capitalizedName}

## Company Overview
**Website**: ${url}
${info?.industry ? `**Industry**: ${info.industry}` : '**Industry**: Not determined'}
${info?.description ? `\n${info.description}` : ''}

## Web Research Summary
Found ${research.company.totalResults} results in ${research.company.searchTime}

### Key Findings:
${research.company.searchResults
  .slice(0, 5)
  .map((r) => `- **${r.title}**\n  ${r.snippet}`)
  .join('\n\n')}

${
  research.news?.searchResults.length
    ? `## Recent News
${research.news.searchResults
  .slice(0, 3)
  .map((r) => `- ${r.title}`)
  .join('\n')}`
    : ''
}

${
  research.leadership?.searchResults.length
    ? `## Leadership
${research.leadership.searchResults
  .slice(0, 3)
  .map((r) => `- ${r.title}`)
  .join('\n')}`
    : ''
}

${
  research.jobs?.searchResults.length
    ? `## Growth Signals (Recent Jobs)
${research.jobs.searchResults
  .slice(0, 3)
  .map((r) => `- ${r.title}`)
  .join('\n')}`
    : ''
}

${
  info?.socialLinks?.length
    ? `## Social Links
${info.socialLinks.map((link) => `- ${link}`).join('\n')}`
    : ''
}

## Suggested Sales Angles
1. Research their specific pain points based on the company overview
2. Look for recent announcements that indicate buying signals
3. Identify key decision makers from leadership information
4. Tailor messaging to their industry and market position

---
*Generated from web research on ${new Date().toLocaleDateString()}*
`;
  }
}






