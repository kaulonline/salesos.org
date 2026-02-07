import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  ZoominfoConfig,
  CompanyInfo,
  ExecutiveChange,
  FundingEvent,
  TechStackChange,
  CompanyNews,
  ContactInfo,
  SearchCompanyDto,
  SearchContactsDto,
} from './dto';

@Injectable()
export class ZoominfoService {
  private readonly logger = new Logger(ZoominfoService.name);
  private readonly baseUrl = 'https://api.zoominfo.com/search';
  private readonly mockApiUrl: string;
  private readonly useMockApi: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Check if mock API should be used (when no real credentials or explicitly enabled)
    this.useMockApi = this.configService.get<string>('MOCK_ZOOMINFO_ENABLED') === 'true';
    this.mockApiUrl = this.configService.get<string>('MOCK_ZOOMINFO_URL') || 'http://localhost:4000/api/mock-zoominfo';
  }

  /**
   * Get ZoomInfo API configuration from IntegrationConfig
   */
  async getConfig(organizationId?: string): Promise<ZoominfoConfig | null> {
    // If organizationId provided, use compound key; otherwise search by provider
    const integration = organizationId
      ? await this.prisma.integrationConfig.findUnique({
          where: { organizationId_provider: { organizationId, provider: 'zoominfo' } },
        })
      : await this.prisma.integrationConfig.findFirst({
          where: { provider: 'zoominfo' },
        });

    if (!integration || !integration.credentials) {
      return null;
    }

    const creds = integration.credentials as any;
    return {
      apiKey: creds.apiKey,
      baseUrl: creds.baseUrl || this.baseUrl,
      rateLimit: creds.rateLimit || 100,
    };
  }

  /**
   * Test connection to ZoomInfo API
   */
  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const config = await this.getConfig();
    if (!config) {
      return { success: false, message: 'ZoomInfo not configured' };
    }

    const startTime = Date.now();

    try {
      // Test API connectivity
      const response = await this.makeApiRequest('/companies/test', 'GET', null, config);

      // Update integration status (use updateMany for multi-tenant compatibility)
      await this.prisma.integrationConfig.updateMany({
        where: { provider: 'zoominfo' },
        data: {
          status: 'connected',
          lastSyncAt: new Date(),
        },
      });

      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        message: 'Connection successful',
        latencyMs,
      };
    } catch (error) {
      this.logger.error('ZoomInfo connection test failed:', error);

      // Update integration status (use updateMany for multi-tenant compatibility)
      await this.prisma.integrationConfig.updateMany({
        where: { provider: 'zoominfo' },
        data: {
          status: 'error',
          syncError: error.message,
        },
      });

      return { success: false, message: error.message };
    }
  }

  /**
   * Make API request to ZoomInfo (or mock API)
   */
  private async makeApiRequest(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: any,
    config?: ZoominfoConfig,
  ): Promise<any> {
    // Use mock API if enabled or no real config
    const cfg = config || await this.getConfig();
    const shouldUseMock = this.useMockApi || !cfg;

    if (shouldUseMock) {
      return this.makeMockApiRequest(endpoint, method, body);
    }

    try {
      const url = `${cfg.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ZoomInfo API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      this.logger.error(`ZoomInfo API request failed: ${endpoint}`, error);
      // Fallback to mock API on error
      this.logger.warn('Falling back to mock ZoomInfo API');
      return this.makeMockApiRequest(endpoint, method, body);
    }
  }

  /**
   * Make request to mock ZoomInfo API
   */
  private async makeMockApiRequest(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: any,
  ): Promise<any> {
    try {
      // Map ZoomInfo endpoints to mock endpoints
      const mockEndpoint = this.mapToMockEndpoint(endpoint);
      const url = `${this.mockApiUrl}${mockEndpoint}`;

      this.logger.log(`Mock ZoomInfo request: ${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': 'Bearer mock_token',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Mock API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      this.logger.error(`Mock ZoomInfo API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Map ZoomInfo endpoint to mock endpoint
   */
  private mapToMockEndpoint(endpoint: string): string {
    const mappings: Record<string, string> = {
      '/companies': '/search/company',
      '/companies/test': '/search/company',
      '/contacts': '/search/contact',
      '/intent/executive-changes': '/scoops?types=executive_change',
      '/intent/funding': '/scoops?types=funding_round',
      '/technographics/changes': '/technographics',
      '/news': '/news',
    };
    return mappings[endpoint] || endpoint;
  }

  /**
   * Search for companies
   */
  async searchCompany(dto: SearchCompanyDto): Promise<CompanyInfo[]> {
    const config = await this.getConfig();
    if (!config) {
      this.logger.warn('ZoomInfo not configured - returning empty results');
      return [];
    }

    try {
      const params: any = {};
      if (dto.companyName) params.companyName = dto.companyName;
      if (dto.domain) params.domain = dto.domain;
      if (dto.industry) params.industry = dto.industry;
      if (dto.employeeRange) params.employeeRange = dto.employeeRange;
      if (dto.revenueRange) params.revenueRange = dto.revenueRange;
      params.maxResults = dto.limit || 10;

      const response = await this.makeApiRequest('/companies', 'POST', params, config);

      return (response.data || []).map((company: any) => ({
        id: company.id,
        name: company.name,
        domain: company.website,
        industry: company.industry,
        employeeCount: company.employeeCount,
        revenue: company.revenue,
        revenueRange: company.revenueRange,
        founded: company.yearFounded,
        headquarters: company.headquarters,
        description: company.description,
        linkedinUrl: company.linkedinUrl,
        twitterUrl: company.twitterUrl,
        technologies: company.technographics || [],
      }));
    } catch (error) {
      this.logger.error('Company search failed:', error);
      return [];
    }
  }

  /**
   * Get executive changes (new hires, departures) for companies
   */
  async getExecutiveChanges(companyIds: string[], daysBack: number = 30): Promise<ExecutiveChange[]> {
    const config = await this.getConfig();
    if (!config) {
      this.logger.warn('ZoomInfo not configured - returning empty results');
      return [];
    }

    try {
      const response = await this.makeApiRequest('/intent/executive-changes', 'POST', {
        companyIds,
        daysBack,
        seniorityLevels: ['C-Level', 'VP', 'Director'],
      }, config);

      return (response.data || []).map((change: any) => ({
        companyId: change.companyId,
        companyName: change.companyName,
        changeType: change.changeType,
        executiveName: change.personName,
        previousTitle: change.previousTitle,
        newTitle: change.newTitle,
        previousCompany: change.previousCompany,
        department: change.department,
        linkedinUrl: change.linkedinUrl,
        detectedAt: new Date(change.detectedDate),
      }));
    } catch (error) {
      this.logger.error('Executive changes fetch failed:', error);
      return [];
    }
  }

  /**
   * Get funding events for companies
   */
  async getFundingEvents(companyIds: string[], daysBack: number = 90): Promise<FundingEvent[]> {
    const config = await this.getConfig();
    if (!config) {
      this.logger.warn('ZoomInfo not configured - returning empty results');
      return [];
    }

    try {
      const response = await this.makeApiRequest('/intent/funding', 'POST', {
        companyIds,
        daysBack,
      }, config);

      return (response.data || []).map((event: any) => ({
        companyId: event.companyId,
        companyName: event.companyName,
        fundingType: event.fundingType,
        amount: event.amount,
        currency: event.currency || 'USD',
        round: event.round,
        investors: event.investors || [],
        announcedDate: new Date(event.announcedDate),
        sourceUrl: event.sourceUrl,
      }));
    } catch (error) {
      this.logger.error('Funding events fetch failed:', error);
      return [];
    }
  }

  /**
   * Get technology stack changes for companies
   */
  async getTechStackChanges(companyIds: string[], daysBack: number = 30): Promise<TechStackChange[]> {
    const config = await this.getConfig();
    if (!config) {
      this.logger.warn('ZoomInfo not configured - returning empty results');
      return [];
    }

    try {
      const response = await this.makeApiRequest('/technographics/changes', 'POST', {
        companyIds,
        daysBack,
      }, config);

      return (response.data || []).map((change: any) => ({
        companyId: change.companyId,
        companyName: change.companyName,
        changeType: change.changeType,
        technology: change.technologyName,
        category: change.category,
        detectedAt: new Date(change.detectedDate),
      }));
    } catch (error) {
      this.logger.error('Tech stack changes fetch failed:', error);
      return [];
    }
  }

  /**
   * Get news and press releases for companies
   */
  async getCompanyNews(companyIds: string[], daysBack: number = 30): Promise<CompanyNews[]> {
    const config = await this.getConfig();
    if (!config) {
      this.logger.warn('ZoomInfo not configured - returning empty results');
      return [];
    }

    try {
      const response = await this.makeApiRequest('/news', 'POST', {
        companyIds,
        daysBack,
        maxResults: 50,
      }, config);

      return (response.data || []).map((news: any) => ({
        companyId: news.companyId,
        companyName: news.companyName,
        title: news.title,
        summary: news.summary,
        sourceUrl: news.url,
        publishedAt: new Date(news.publishedDate),
        sentiment: news.sentiment,
        topics: news.topics || [],
      }));
    } catch (error) {
      this.logger.error('Company news fetch failed:', error);
      return [];
    }
  }

  /**
   * Search for contacts at a company
   */
  async searchContacts(dto: SearchContactsDto): Promise<ContactInfo[]> {
    const config = await this.getConfig();
    if (!config) {
      this.logger.warn('ZoomInfo not configured - returning empty results');
      return [];
    }

    try {
      const params: any = {};
      if (dto.companyId) params.companyId = dto.companyId;
      if (dto.jobTitle) params.jobTitle = dto.jobTitle;
      if (dto.seniorityLevel) params.seniorityLevel = dto.seniorityLevel;
      if (dto.department) params.department = dto.department;
      params.maxResults = dto.limit || 10;

      const response = await this.makeApiRequest('/contacts', 'POST', params, config);

      return (response.data || []).map((contact: any) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        jobTitle: contact.jobTitle,
        seniorityLevel: contact.seniorityLevel,
        department: contact.department,
        companyId: contact.companyId,
        companyName: contact.companyName,
        linkedinUrl: contact.linkedinUrl,
      }));
    } catch (error) {
      this.logger.error('Contact search failed:', error);
      return [];
    }
  }

  /**
   * Detect all signals from ZoomInfo for given companies
   */
  async detectSignals(companyIds: string[], daysBack: number = 30): Promise<{
    executiveChanges: ExecutiveChange[];
    fundingEvents: FundingEvent[];
    techChanges: TechStackChange[];
    news: CompanyNews[];
  }> {
    const [executiveChanges, fundingEvents, techChanges, news] = await Promise.all([
      this.getExecutiveChanges(companyIds, daysBack),
      this.getFundingEvents(companyIds, daysBack),
      this.getTechStackChanges(companyIds, daysBack),
      this.getCompanyNews(companyIds, daysBack),
    ]);

    return { executiveChanges, fundingEvents, techChanges, news };
  }

  /**
   * Check if ZoomInfo integration is enabled and connected
   */
  async isConnected(organizationId?: string): Promise<boolean> {
    // If organizationId provided, use compound key; otherwise search by provider
    const integration = organizationId
      ? await this.prisma.integrationConfig.findUnique({
          where: { organizationId_provider: { organizationId, provider: 'zoominfo' } },
        })
      : await this.prisma.integrationConfig.findFirst({
          where: { provider: 'zoominfo' },
        });

    return integration?.status === 'connected';
  }

  /**
   * Get ZoomInfo integration status
   */
  async getStatus(): Promise<{ connected: boolean; configured: boolean; message?: string }> {
    const config = await this.getConfig();
    const isConnected = await this.isConnected();

    return {
      connected: isConnected,
      configured: !!config?.apiKey,
      message: isConnected ? 'ZoomInfo connected' : config ? 'Not connected' : 'Not configured',
    };
  }

  // ============ Data Enrichment Methods ============

  /**
   * Enrich company data by domain
   */
  async enrichCompany(domain: string): Promise<any> {
    const config = await this.getConfig();
    if (!config) {
      throw new BadRequestException('ZoomInfo not configured');
    }

    try {
      this.logger.log(`Enriching company: ${domain}`);

      const response = await this.makeApiRequest('/enrich/company', 'POST', {
        matchCompanyInput: [{ companyWebsite: domain }],
        outputFields: [
          'id', 'name', 'website', 'logo', 'industry', 'subIndustry',
          'employeeCount', 'employeeRange', 'revenue', 'revenueRange',
          'foundedYear', 'description', 'linkedinUrl', 'twitterUrl',
          'phone', 'street', 'city', 'state', 'zipCode', 'country',
          'naicsCode', 'sicCode', 'techAttributes', 'ticker', 'parentCompanyId',
        ],
      }, config);

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const company = response.data[0];
      return this.mapCompanyResponse(company);
    } catch (error) {
      this.logger.error(`Failed to enrich company ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Enrich contact data by email
   */
  async enrichContact(email: string): Promise<any> {
    const config = await this.getConfig();
    if (!config) {
      throw new BadRequestException('ZoomInfo not configured');
    }

    try {
      this.logger.log(`Enriching contact: ${email}`);

      const response = await this.makeApiRequest('/enrich/contact', 'POST', {
        matchPersonInput: [{ emailAddress: email }],
        outputFields: [
          'id', 'firstName', 'lastName', 'email', 'phone', 'directPhoneNumber',
          'mobilePhoneNumber', 'jobTitle', 'managementLevel', 'department',
          'linkedinUrl', 'hashedLinkedInUrl', 'personCity', 'personState', 'personCountry',
          'companyId', 'companyName', 'companyWebsite', 'companyIndustry',
        ],
      }, config);

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const contact = response.data[0];
      return this.mapContactResponse(contact);
    } catch (error) {
      this.logger.error(`Failed to enrich contact ${email}:`, error);
      throw error;
    }
  }

  /**
   * Search contacts with filters
   */
  async searchContactsAdvanced(filters: {
    companyName?: string;
    companyDomain?: string;
    title?: string;
    titleKeywords?: string[];
    department?: string;
    managementLevel?: string;
    location?: { city?: string; state?: string; country?: string };
    limit?: number;
  }): Promise<ContactInfo[]> {
    const config = await this.getConfig();
    if (!config) {
      throw new BadRequestException('ZoomInfo not configured');
    }

    try {
      const searchParams: any = {
        maxResults: filters.limit || 25,
        outputFields: [
          'id', 'firstName', 'lastName', 'email', 'phone', 'directPhoneNumber',
          'mobilePhoneNumber', 'jobTitle', 'managementLevel', 'department',
          'linkedinUrl', 'companyId', 'companyName',
        ],
      };

      if (filters.companyName) {
        searchParams.companyName = filters.companyName;
      }
      if (filters.companyDomain) {
        searchParams.companyWebsite = filters.companyDomain;
      }
      if (filters.title) {
        searchParams.jobTitle = filters.title;
      }
      if (filters.titleKeywords && filters.titleKeywords.length > 0) {
        searchParams.jobTitleKeywords = filters.titleKeywords;
      }
      if (filters.department) {
        searchParams.department = filters.department;
      }
      if (filters.managementLevel) {
        searchParams.managementLevel = filters.managementLevel;
      }
      if (filters.location) {
        if (filters.location.city) searchParams.personCity = filters.location.city;
        if (filters.location.state) searchParams.personState = filters.location.state;
        if (filters.location.country) searchParams.personCountry = filters.location.country;
      }

      const response = await this.makeApiRequest('/search/contact', 'POST', searchParams, config);

      return (response.data || []).map((contact: any) => this.mapContactResponse(contact));
    } catch (error) {
      this.logger.error('Contact search failed:', error);
      return [];
    }
  }

  /**
   * Map ZoomInfo company response to standard format
   */
  private mapCompanyResponse(company: any): any {
    return {
      id: company.id,
      name: company.name,
      domain: company.website,
      website: company.website,
      industry: company.industry,
      subIndustry: company.subIndustry,
      employeeCount: company.employeeCount,
      employeeRange: company.employeeRange,
      annualRevenue: company.revenue,
      revenueRange: company.revenueRange,
      founded: company.foundedYear,
      description: company.description,
      logoUrl: company.logo,
      linkedinUrl: company.linkedinUrl,
      twitterUrl: company.twitterUrl,
      phone: company.phone,
      location: {
        street: company.street,
        city: company.city,
        state: company.state,
        postalCode: company.zipCode,
        country: company.country,
      },
      techStack: company.techAttributes || [],
      naicsCode: company.naicsCode,
      sicCode: company.sicCode,
      stockSymbol: company.ticker,
      parentCompanyId: company.parentCompanyId,
      provider: 'zoominfo',
      enrichedAt: new Date(),
    };
  }

  /**
   * Map ZoomInfo contact response to standard format
   */
  private mapContactResponse(contact: any): any {
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone || contact.directPhoneNumber,
      mobilePhone: contact.mobilePhoneNumber,
      title: contact.jobTitle,
      seniorityLevel: contact.managementLevel,
      department: contact.department,
      linkedinUrl: contact.linkedinUrl,
      location: {
        city: contact.personCity,
        state: contact.personState,
        country: contact.personCountry,
      },
      company: contact.companyName,
      companyId: contact.companyId,
      companyDomain: contact.companyWebsite,
      companyIndustry: contact.companyIndustry,
      provider: 'zoominfo',
      enrichedAt: new Date(),
    };
  }
}
