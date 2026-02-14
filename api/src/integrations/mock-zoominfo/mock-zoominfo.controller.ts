/**
 * Mock ZoomInfo API Controller
 *
 * Simulates ZoomInfo Enterprise API endpoints for testing the end-to-end
 * Digital Worker Agent flow without requiring actual ZoomInfo credentials.
 *
 * Based on ZoomInfo API documentation: https://docs.zoominfo.com/
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

// ==================== TYPES ====================

interface CompanySearchRequest {
  companyName?: string;
  domain?: string;
  industry?: string[];
  employeeRange?: string;
  revenueRange?: string;
  location?: {
    country?: string;
    state?: string;
    city?: string;
  };
  page?: number;
  pageSize?: number;
}

interface ContactSearchRequest {
  companyId?: string;
  companyName?: string;
  jobTitle?: string[];
  jobFunction?: string[];
  managementLevel?: string[];
  location?: {
    country?: string;
    state?: string;
  };
  page?: number;
  pageSize?: number;
}

interface IntentSignalRequest {
  companyIds?: string[];
  topics?: string[];
  minScore?: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ==================== MOCK DATA GENERATORS ====================

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Financial Services', 'Manufacturing',
  'Retail', 'Energy', 'Telecommunications', 'Professional Services',
  'Education', 'Government', 'Media & Entertainment', 'Transportation'
];

const JOB_TITLES = [
  'Chief Executive Officer', 'Chief Technology Officer', 'Chief Financial Officer',
  'VP of Sales', 'VP of Engineering', 'VP of Marketing', 'Director of IT',
  'Director of Operations', 'Sales Manager', 'Product Manager', 'Engineering Manager'
];

const INTENT_TOPICS = [
  'Cloud Migration', 'Digital Transformation', 'Cybersecurity',
  'Data Analytics', 'AI/Machine Learning', 'CRM Software',
  'ERP Implementation', 'Remote Work Solutions', 'Supply Chain Optimization',
  'Customer Experience', 'Sales Enablement', 'Marketing Automation'
];

const NEWS_TYPES = [
  'funding_round', 'executive_change', 'acquisition', 'expansion',
  'product_launch', 'partnership', 'award', 'restructuring'
];

const TECH_STACK = [
  'Salesforce', 'HubSpot', 'Microsoft Dynamics', 'SAP', 'Oracle',
  'AWS', 'Azure', 'Google Cloud', 'Snowflake', 'Databricks',
  'Slack', 'Zoom', 'Microsoft Teams', 'Workday', 'ServiceNow'
];

function generateCompanyId(): string {
  return `zi_${Math.random().toString(36).substring(2, 15)}`;
}

function generateContactId(): string {
  return `zic_${Math.random().toString(36).substring(2, 15)}`;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRevenue(): { value: number; currency: string; formatted: string } {
  const ranges = [
    { min: 1000000, max: 10000000 },
    { min: 10000000, max: 50000000 },
    { min: 50000000, max: 250000000 },
    { min: 250000000, max: 1000000000 },
    { min: 1000000000, max: 10000000000 },
  ];
  const range = randomElement(ranges);
  const value = Math.floor(Math.random() * (range.max - range.min) + range.min);
  return {
    value,
    currency: 'USD',
    formatted: value >= 1000000000
      ? `$${(value / 1000000000).toFixed(1)}B`
      : `$${(value / 1000000).toFixed(0)}M`
  };
}

function generateEmployeeCount(): { value: number; range: string } {
  const ranges = [
    { min: 50, max: 200, label: '50-200' },
    { min: 200, max: 500, label: '200-500' },
    { min: 500, max: 1000, label: '500-1000' },
    { min: 1000, max: 5000, label: '1000-5000' },
    { min: 5000, max: 10000, label: '5000-10000' },
    { min: 10000, max: 50000, label: '10000+' },
  ];
  const range = randomElement(ranges);
  return {
    value: Math.floor(Math.random() * (range.max - range.min) + range.min),
    range: range.label
  };
}

// ==================== CONTROLLER ====================

@ApiTags('Integrations - ZoomInfo Mock')
@ApiBearerAuth('JWT')
@Controller('mock-zoominfo')
export class MockZoomInfoController {
  private readonly logger = new Logger(MockZoomInfoController.name);
  private readonly mockToken = 'mock_zi_token_for_testing';

  // ==================== AUTHENTICATION ====================

  /**
   * POST /mock-zoominfo/authenticate
   * Simulates ZoomInfo JWT authentication
   */
  @Post('authenticate')
  @HttpCode(HttpStatus.OK)
  authenticate(@Body() body: { username?: string; password?: string; client_id?: string }) {
    this.logger.log('Mock ZoomInfo: Authentication request');

    return {
      jwt: this.mockToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
      scope: 'read:companies read:contacts read:intent',
    };
  }

  // ==================== COMPANY ENDPOINTS ====================

  /**
   * POST /mock-zoominfo/search/company
   * Search for companies matching criteria
   */
  @Post('search/company')
  @HttpCode(HttpStatus.OK)
  searchCompanies(
    @Body() body: CompanySearchRequest,
    @Headers('authorization') auth: string,
  ) {
    this.validateAuth(auth);
    this.logger.log(`Mock ZoomInfo: Company search - ${JSON.stringify(body)}`);

    const pageSize = body.pageSize || 10;
    const companies = this.generateMockCompanies(pageSize, body);

    return {
      success: true,
      data: {
        totalResults: Math.floor(Math.random() * 500) + 50,
        currentPage: body.page || 1,
        pageSize,
        results: companies,
      },
      metadata: {
        searchId: `search_${Date.now()}`,
        executionTime: Math.floor(Math.random() * 200) + 50,
      }
    };
  }

  /**
   * POST /mock-zoominfo/enrich/company
   * Enrich company with full details
   */
  @Post('enrich/company')
  @HttpCode(HttpStatus.OK)
  enrichCompany(
    @Body() body: { companyId?: string; domain?: string; companyName?: string },
    @Headers('authorization') auth: string,
  ) {
    this.validateAuth(auth);
    this.logger.log(`Mock ZoomInfo: Company enrich - ${JSON.stringify(body)}`);

    const company = this.generateDetailedCompany(body.companyName || body.domain || 'Acme Corp');

    return {
      success: true,
      data: company,
      metadata: {
        matchConfidence: Math.floor(Math.random() * 20) + 80,
        lastUpdated: new Date().toISOString(),
        creditsUsed: 1,
      }
    };
  }

  // ==================== CONTACT ENDPOINTS ====================

  /**
   * POST /mock-zoominfo/search/contact
   * Search for contacts/executives
   */
  @Post('search/contact')
  @HttpCode(HttpStatus.OK)
  searchContacts(
    @Body() body: ContactSearchRequest,
    @Headers('authorization') auth: string,
  ) {
    this.validateAuth(auth);
    this.logger.log(`Mock ZoomInfo: Contact search - ${JSON.stringify(body)}`);

    const pageSize = body.pageSize || 10;
    const contacts = this.generateMockContacts(pageSize, body.companyName);

    return {
      success: true,
      data: {
        totalResults: Math.floor(Math.random() * 100) + 10,
        currentPage: body.page || 1,
        pageSize,
        results: contacts,
      },
    };
  }

  // ==================== INTENT SIGNALS ====================

  /**
   * POST /mock-zoominfo/intent/signals
   * Get buyer intent signals for companies
   */
  @Post('intent/signals')
  @HttpCode(HttpStatus.OK)
  getIntentSignals(
    @Body() body: IntentSignalRequest,
    @Headers('authorization') auth: string,
  ) {
    this.validateAuth(auth);
    this.logger.log(`Mock ZoomInfo: Intent signals request`);

    const signals = this.generateIntentSignals(body.companyIds?.length || 5);

    return {
      success: true,
      data: {
        signals,
        summary: {
          totalSignals: signals.length,
          avgIntentScore: Math.floor(signals.reduce((a, b) => a + b.intentScore, 0) / signals.length),
          topTopics: randomElements(INTENT_TOPICS, 3),
        }
      },
    };
  }

  // ==================== NEWS & ALERTS ====================

  /**
   * GET /mock-zoominfo/news
   * Get company news and alerts
   */
  @Get('news')
  getNews(
    @Query('companyId') companyId: string,
    @Query('companyName') companyName: string,
    @Query('limit') limit: string,
    @Headers('authorization') auth: string,
  ) {
    this.validateAuth(auth);
    this.logger.log(`Mock ZoomInfo: News request for ${companyName || companyId}`);

    const newsCount = parseInt(limit) || 5;
    const news = this.generateNewsAlerts(newsCount, companyName);

    return {
      success: true,
      data: {
        companyId: companyId || generateCompanyId(),
        companyName: companyName || 'Unknown Company',
        news,
        lastChecked: new Date().toISOString(),
      }
    };
  }

  /**
   * GET /mock-zoominfo/scoops
   * Get sales intelligence scoops (funding, exec changes, etc.)
   */
  @Get('scoops')
  getScoops(
    @Query('companyIds') companyIds: string,
    @Query('types') types: string,
    @Query('limit') limit: string,
    @Headers('authorization') auth: string,
  ) {
    this.validateAuth(auth);

    const scoopTypes = types?.split(',') || NEWS_TYPES;
    const scoops = this.generateScoops(parseInt(limit) || 10, scoopTypes);

    return {
      success: true,
      data: {
        scoops,
        metadata: {
          totalAvailable: scoops.length + Math.floor(Math.random() * 50),
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          }
        }
      }
    };
  }

  // ==================== TECH STACK ====================

  /**
   * GET /mock-zoominfo/technographics
   * Get company technology stack
   */
  @Get('technographics')
  getTechnographics(
    @Query('companyId') companyId: string,
    @Query('companyName') companyName: string,
    @Headers('authorization') auth: string,
  ) {
    this.validateAuth(auth);

    const techStack = this.generateTechStack();

    return {
      success: true,
      data: {
        companyId: companyId || generateCompanyId(),
        companyName: companyName || 'Unknown Company',
        technologies: techStack,
        lastUpdated: new Date().toISOString(),
      }
    };
  }

  // ==================== HELPER METHODS ====================

  private validateAuth(auth: string) {
    // For mock purposes, accept any Bearer token or our mock token
    if (!auth || (!auth.includes('Bearer') && !auth.includes(this.mockToken))) {
      throw new UnauthorizedException('Invalid or missing authentication token');
    }
  }

  private generateMockCompanies(count: number, filters: CompanySearchRequest): any[] {
    const companies: any[] = [];
    const companyNames = [
      'Acme Corporation', 'TechFlow Solutions', 'Global Dynamics', 'Innovate Labs',
      'Quantum Systems', 'DataPrime Inc', 'CloudScale Technologies', 'NextGen Software',
      'Apex Industries', 'Synergy Partners', 'Velocity Networks', 'PrimeLogic Corp',
      'FutureStack', 'AlphaWave', 'Pinnacle Solutions', 'Horizon Enterprises'
    ];

    for (let i = 0; i < count; i++) {
      const name = filters.companyName
        ? `${filters.companyName} ${['Inc', 'Corp', 'LLC', 'Ltd'][i % 4]}`
        : randomElement(companyNames);

      companies.push({
        id: generateCompanyId(),
        name,
        domain: `${name.toLowerCase().replace(/\s+/g, '')}.com`,
        industry: filters.industry?.[0] || randomElement(INDUSTRIES),
        employeeCount: generateEmployeeCount(),
        revenue: generateRevenue(),
        location: {
          country: filters.location?.country || 'United States',
          state: filters.location?.state || randomElement(['CA', 'NY', 'TX', 'WA', 'MA', 'IL']),
          city: randomElement(['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston', 'Chicago']),
        },
        website: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
        linkedInUrl: `https://linkedin.com/company/${name.toLowerCase().replace(/\s+/g, '-')}`,
        founded: 1990 + Math.floor(Math.random() * 30),
        description: `${name} is a leading provider of innovative solutions in the ${randomElement(INDUSTRIES)} sector.`,
      });
    }

    return companies;
  }

  private generateDetailedCompany(baseName: string): any {
    const revenue = generateRevenue();
    const employees = generateEmployeeCount();

    return {
      id: generateCompanyId(),
      name: baseName,
      legalName: `${baseName} Inc.`,
      domain: `${baseName.toLowerCase().replace(/\s+/g, '')}.com`,
      description: `${baseName} is a leading provider of enterprise solutions, helping organizations transform their digital operations.`,
      industry: randomElement(INDUSTRIES),
      subIndustry: `${randomElement(INDUSTRIES)} - Services`,
      naicsCode: `${Math.floor(Math.random() * 90000) + 10000}`,
      sicCode: `${Math.floor(Math.random() * 9000) + 1000}`,
      employeeCount: employees,
      employeeGrowth: {
        sixMonth: Math.floor(Math.random() * 30) - 5,
        oneYear: Math.floor(Math.random() * 50) - 10,
        twoYear: Math.floor(Math.random() * 100) - 20,
      },
      revenue,
      revenueGrowth: {
        yoy: Math.floor(Math.random() * 40) - 10,
      },
      funding: {
        totalRaised: revenue.value * 0.1,
        lastRoundAmount: revenue.value * 0.03,
        lastRoundType: randomElement(['Series A', 'Series B', 'Series C', 'Series D', 'Growth']),
        lastRoundDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      headquarters: {
        street: `${Math.floor(Math.random() * 9000) + 100} Innovation Way`,
        city: randomElement(['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston']),
        state: randomElement(['CA', 'NY', 'TX', 'WA', 'MA']),
        postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
        country: 'United States',
      },
      socialMedia: {
        linkedin: `https://linkedin.com/company/${baseName.toLowerCase().replace(/\s+/g, '-')}`,
        twitter: `https://twitter.com/${baseName.toLowerCase().replace(/\s+/g, '')}`,
        facebook: `https://facebook.com/${baseName.toLowerCase().replace(/\s+/g, '')}`,
      },
      technologies: randomElements(TECH_STACK, 5 + Math.floor(Math.random() * 5)),
      competitors: this.generateMockCompanies(3, {}).map(c => ({ id: c.id, name: c.name })),
      executives: this.generateMockContacts(5, baseName),
      parentCompany: Math.random() > 0.7 ? { id: generateCompanyId(), name: `${baseName} Holdings` } : null,
      subsidiaries: Math.random() > 0.5
        ? [{ id: generateCompanyId(), name: `${baseName} Solutions` }]
        : [],
    };
  }

  private generateMockContacts(count: number, companyName?: string): any[] {
    const firstNames = ['John', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Maria'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    const contacts: any[] = [];
    for (let i = 0; i < count; i++) {
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      const title = JOB_TITLES[i % JOB_TITLES.length];

      contacts.push({
        id: generateContactId(),
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        jobTitle: title,
        jobFunction: title.includes('Sales') ? 'Sales' : title.includes('Engineering') ? 'Engineering' : 'Executive',
        managementLevel: title.includes('Chief') || title.includes('VP') ? 'C-Level/VP' : 'Director/Manager',
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${(companyName || 'company').toLowerCase().replace(/\s+/g, '')}.com`,
        phone: `+1 (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        linkedInUrl: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        company: {
          id: generateCompanyId(),
          name: companyName || randomElement(['Acme Corp', 'TechFlow', 'Global Dynamics']),
        },
        location: {
          city: randomElement(['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston']),
          state: randomElement(['CA', 'NY', 'TX', 'WA', 'MA']),
          country: 'United States',
        },
        lastUpdated: new Date().toISOString(),
      });
    }
    return contacts;
  }

  private generateIntentSignals(count: number): any[] {
    const signals: any[] = [];
    const companies = this.generateMockCompanies(count, {});

    for (const company of companies) {
      const topicCount = Math.floor(Math.random() * 3) + 1;
      const topics = randomElements(INTENT_TOPICS, topicCount);

      for (const topic of topics) {
        signals.push({
          id: `intent_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          company: {
            id: company.id,
            name: company.name,
            domain: company.domain,
          },
          topic,
          intentScore: Math.floor(Math.random() * 40) + 60, // 60-100
          signalStrength: randomElement(['strong', 'moderate', 'emerging']),
          trend: randomElement(['increasing', 'stable', 'new']),
          firstDetected: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          activityCount: Math.floor(Math.random() * 50) + 5,
          sources: randomElements(['Web Research', 'Content Consumption', 'Technology Adoption', 'Job Postings'], 2),
        });
      }
    }

    return signals.sort((a, b) => b.intentScore - a.intentScore);
  }

  private generateNewsAlerts(count: number, companyName?: string): any[] {
    const newsTemplates = [
      { type: 'funding_round', title: 'Announces $X Million Series Y Funding Round', priority: 'high' },
      { type: 'executive_change', title: 'Appoints New Chief Technology Officer', priority: 'high' },
      { type: 'acquisition', title: 'Acquires Cloud Security Startup', priority: 'high' },
      { type: 'expansion', title: 'Opens New EMEA Headquarters in London', priority: 'medium' },
      { type: 'product_launch', title: 'Launches AI-Powered Analytics Platform', priority: 'medium' },
      { type: 'partnership', title: 'Partners with Microsoft for Enterprise Integration', priority: 'medium' },
      { type: 'award', title: 'Named Leader in Gartner Magic Quadrant', priority: 'low' },
      { type: 'restructuring', title: 'Announces Organizational Restructuring', priority: 'medium' },
    ];

    const news: any[] = [];
    const company = companyName || 'Acme Corporation';

    for (let i = 0; i < count; i++) {
      const template = randomElement(newsTemplates);
      const daysAgo = Math.floor(Math.random() * 30);

      news.push({
        id: `news_${Date.now()}_${i}`,
        type: template.type,
        title: `${company} ${template.title.replace('$X', String(Math.floor(Math.random() * 100) + 10)).replace('Series Y', randomElement(['Series A', 'Series B', 'Series C', 'Series D']))}`,
        summary: `${company} has made a significant announcement regarding ${template.type.replace('_', ' ')}. This development signals potential growth opportunities and may impact their technology stack decisions.`,
        priority: template.priority,
        publishedDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        source: randomElement(['PR Newswire', 'Business Wire', 'TechCrunch', 'Reuters', 'Bloomberg']),
        url: `https://news.example.com/article/${Date.now()}`,
        relevanceScore: Math.floor(Math.random() * 30) + 70,
      });
    }

    return news.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  }

  private generateScoops(count: number, types: string[]): any[] {
    const scoops: any[] = [];
    const companies = this.generateMockCompanies(count, {});

    for (let i = 0; i < count; i++) {
      const company = companies[i % companies.length];
      const type = randomElement(types);
      const daysAgo = Math.floor(Math.random() * 14);

      let details = {};
      switch (type) {
        case 'funding_round':
          details = {
            amount: Math.floor(Math.random() * 100) + 10,
            currency: 'USD',
            roundType: randomElement(['Seed', 'Series A', 'Series B', 'Series C', 'Growth']),
            investors: ['Sequoia Capital', 'Andreessen Horowitz', 'Accel'].slice(0, Math.floor(Math.random() * 3) + 1),
          };
          break;
        case 'executive_change':
          details = {
            executiveName: `${randomElement(['John', 'Sarah', 'Michael', 'Jennifer'])} ${randomElement(['Smith', 'Johnson', 'Williams'])}`,
            newTitle: randomElement(['CEO', 'CTO', 'CFO', 'COO', 'CMO']),
            previousTitle: randomElement(['VP', 'Director', 'Head of']),
            changeType: randomElement(['hire', 'promotion', 'departure']),
          };
          break;
        case 'acquisition':
          details = {
            targetCompany: `${randomElement(['Tech', 'Data', 'Cloud', 'AI'])}${randomElement(['Solutions', 'Systems', 'Labs'])}`,
            dealValue: Math.floor(Math.random() * 500) + 50,
            currency: 'USD',
          };
          break;
        default:
          details = { description: `${type.replace('_', ' ')} event detected` };
      }

      scoops.push({
        id: `scoop_${Date.now()}_${i}`,
        type,
        company: {
          id: company.id,
          name: company.name,
          domain: company.domain,
        },
        headline: `${company.name}: ${type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)} Detected`,
        details,
        detectedDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        confidenceScore: Math.floor(Math.random() * 20) + 80,
        sources: Math.floor(Math.random() * 3) + 1,
      });
    }

    return scoops;
  }

  private generateTechStack(): any[] {
    const categories = [
      { name: 'CRM', technologies: ['Salesforce', 'HubSpot', 'Microsoft Dynamics', 'Pipedrive'] },
      { name: 'Cloud Infrastructure', technologies: ['AWS', 'Azure', 'Google Cloud', 'IBM Cloud'] },
      { name: 'Analytics', technologies: ['Tableau', 'Power BI', 'Looker', 'Snowflake', 'Databricks'] },
      { name: 'Marketing Automation', technologies: ['Marketo', 'Pardot', 'HubSpot', 'Mailchimp'] },
      { name: 'Collaboration', technologies: ['Slack', 'Microsoft Teams', 'Zoom', 'Google Workspace'] },
      { name: 'Security', technologies: ['Okta', 'CrowdStrike', 'Palo Alto', 'Zscaler'] },
    ];

    const stack: any[] = [];
    for (const category of categories) {
      if (Math.random() > 0.3) { // 70% chance to include each category
        const tech = randomElement(category.technologies);
        stack.push({
          category: category.name,
          technology: tech,
          confidence: Math.floor(Math.random() * 20) + 80,
          firstDetected: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          lastVerified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }
    return stack;
  }
}
