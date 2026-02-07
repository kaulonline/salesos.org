import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  pagemap?: {
    cse_thumbnail?: Array<{ src: string; width: string; height: string }>;
    metatags?: Array<Record<string, string>>;
    organization?: Array<Record<string, string>>;
  };
}

export interface GoogleSearchResponse {
  kind: string;
  url: { type: string; template: string };
  queries: {
    request: Array<{ totalResults: string; count: number; startIndex: number }>;
    nextPage?: Array<{ startIndex: number }>;
  };
  context: { title: string };
  searchInformation: {
    searchTime: number;
    formattedSearchTime: string;
    totalResults: string;
    formattedTotalResults: string;
  };
  items?: SearchResult[];
}

export interface WebResearchResult {
  query: string;
  searchResults: SearchResult[];
  totalResults: string;
  searchTime: string;
  companyInfo?: {
    name: string;
    website: string;
    description?: string;
    industry?: string;
    socialLinks?: string[];
  };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly apiKey: string;
  private readonly searchEngineId: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_SEARCH_API_KEY', '');
    this.searchEngineId = this.configService.get<string>('GOOGLE_SEARCH_ENGINE_ID', '');
    this.enabled = !!(this.apiKey && this.searchEngineId);

    if (this.enabled) {
      this.logger.log('Google Custom Search service initialized');
    } else {
      this.logger.warn('Google Custom Search disabled - missing API key or Search Engine ID');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Perform a Google Custom Search query
   * @param query - Search query string
   * @param options - Optional search parameters
   * @returns Search results from Google Custom Search API
   */
  async search(
    query: string,
    options: {
      num?: number; // Number of results (1-10)
      start?: number; // Start index for pagination
      siteSearch?: string; // Restrict to specific site
      dateRestrict?: string; // Date restriction (e.g., 'd7' for last 7 days)
      exactTerms?: string; // Exact phrase to search
      excludeTerms?: string; // Terms to exclude
      searchType?: 'image'; // For image search
    } = {},
  ): Promise<GoogleSearchResponse> {
    if (!this.enabled) {
      throw new HttpException(
        'Google Custom Search is not configured. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.searchEngineId,
      q: query,
      num: String(options.num || 10),
    });

    if (options.start) params.append('start', String(options.start));
    if (options.siteSearch) params.append('siteSearch', options.siteSearch);
    if (options.dateRestrict) params.append('dateRestrict', options.dateRestrict);
    if (options.exactTerms) params.append('exactTerms', options.exactTerms);
    if (options.excludeTerms) params.append('excludeTerms', options.excludeTerms);
    if (options.searchType) params.append('searchType', options.searchType);

    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;

    try {
      this.logger.log(`Executing Google search: "${query}"`);
      const response = await fetch(url);

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Google Search API error: ${response.status} - ${errorBody}`);
        throw new HttpException(
          `Google Search API error: ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data: GoogleSearchResponse = await response.json();
      this.logger.log(
        `Search completed: ${data.searchInformation?.totalResults || 0} results in ${data.searchInformation?.formattedSearchTime || 'N/A'}`,
      );

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Google Search failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to perform web search: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Research a company by URL or name
   * Performs multiple searches to gather comprehensive information
   */
  async researchCompany(companyUrlOrName: string): Promise<WebResearchResult> {
    // Extract domain if URL provided
    let searchTerm = companyUrlOrName;
    let domain = '';

    try {
      const url = new URL(
        companyUrlOrName.startsWith('http') ? companyUrlOrName : `https://${companyUrlOrName}`,
      );
      domain = url.hostname.replace('www.', '');
      searchTerm = domain.split('.')[0]; // Get company name from domain
    } catch {
      // Not a URL, use as-is
      searchTerm = companyUrlOrName;
    }

    // Perform company research search
    const companyQuery = domain
      ? `"${domain}" company overview about`
      : `"${searchTerm}" company overview about`;

    const searchResponse = await this.search(companyQuery, { num: 10 });

    // Extract company info from search results
    const companyInfo = this.extractCompanyInfo(searchResponse, searchTerm, domain);

    return {
      query: companyQuery,
      searchResults: searchResponse.items || [],
      totalResults: searchResponse.searchInformation?.totalResults || '0',
      searchTime: searchResponse.searchInformation?.formattedSearchTime || 'N/A',
      companyInfo,
    };
  }

  /**
   * Search for recent news about a company
   */
  async searchCompanyNews(companyName: string, days: number = 30): Promise<WebResearchResult> {
    const query = `"${companyName}" news announcement`;
    const dateRestrict = `d${days}`;

    const searchResponse = await this.search(query, {
      num: 10,
      dateRestrict,
    });

    return {
      query,
      searchResults: searchResponse.items || [],
      totalResults: searchResponse.searchInformation?.totalResults || '0',
      searchTime: searchResponse.searchInformation?.formattedSearchTime || 'N/A',
    };
  }

  /**
   * Search for competitor information
   */
  async searchCompetitors(companyName: string, industry?: string): Promise<WebResearchResult> {
    const query = industry
      ? `"${companyName}" competitors alternatives ${industry}`
      : `"${companyName}" competitors alternatives`;

    const searchResponse = await this.search(query, { num: 10 });

    return {
      query,
      searchResults: searchResponse.items || [],
      totalResults: searchResponse.searchInformation?.totalResults || '0',
      searchTime: searchResponse.searchInformation?.formattedSearchTime || 'N/A',
    };
  }

  /**
   * Search for leadership/key people at a company
   */
  async searchLeadership(companyName: string): Promise<WebResearchResult> {
    const query = `"${companyName}" CEO CTO leadership team executives`;

    const searchResponse = await this.search(query, { num: 10 });

    return {
      query,
      searchResults: searchResponse.items || [],
      totalResults: searchResponse.searchInformation?.totalResults || '0',
      searchTime: searchResponse.searchInformation?.formattedSearchTime || 'N/A',
    };
  }

  /**
   * Search for job postings (indicates company growth/focus areas)
   */
  async searchJobPostings(companyName: string): Promise<WebResearchResult> {
    const query = `"${companyName}" careers jobs hiring`;

    const searchResponse = await this.search(query, {
      num: 10,
      dateRestrict: 'd30', // Last 30 days
    });

    return {
      query,
      searchResults: searchResponse.items || [],
      totalResults: searchResponse.searchInformation?.totalResults || '0',
      searchTime: searchResponse.searchInformation?.formattedSearchTime || 'N/A',
    };
  }

  /**
   * Generic web search for any query
   */
  async webSearch(query: string): Promise<WebResearchResult> {
    const searchResponse = await this.search(query, { num: 10 });

    return {
      query,
      searchResults: searchResponse.items || [],
      totalResults: searchResponse.searchInformation?.totalResults || '0',
      searchTime: searchResponse.searchInformation?.formattedSearchTime || 'N/A',
    };
  }

  /**
   * Extract company information from search results
   */
  private extractCompanyInfo(
    searchResponse: GoogleSearchResponse,
    searchTerm: string,
    domain: string,
  ): WebResearchResult['companyInfo'] {
    const items = searchResponse.items || [];
    let description = '';
    let industry = '';
    const socialLinks: string[] = [];

    for (const item of items) {
      // Look for company website
      if (domain && item.link.includes(domain)) {
        description = item.snippet || description;
      }

      // Extract from metatags
      if (item.pagemap?.metatags?.[0]) {
        const meta = item.pagemap.metatags[0];
        if (!description && meta['og:description']) {
          description = meta['og:description'];
        }
      }

      // Collect social links
      if (
        item.link.includes('linkedin.com') ||
        item.link.includes('twitter.com') ||
        item.link.includes('facebook.com') ||
        item.link.includes('crunchbase.com')
      ) {
        socialLinks.push(item.link);
      }

      // Try to extract industry from snippets
      const industryKeywords = [
        'SaaS',
        'fintech',
        'healthcare',
        'e-commerce',
        'technology',
        'software',
        'consulting',
        'manufacturing',
        'retail',
        'financial services',
      ];
      for (const keyword of industryKeywords) {
        if (item.snippet?.toLowerCase().includes(keyword.toLowerCase())) {
          industry = keyword;
          break;
        }
      }
    }

    return {
      name: searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1),
      website: domain ? `https://${domain}` : '',
      description: description.slice(0, 500),
      industry: industry || undefined,
      socialLinks: socialLinks.slice(0, 5),
    };
  }
}






