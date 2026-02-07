import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseIntegrationService,
  ConnectionTestResult,
  IntegrationCredentials,
} from '../base/base-integration.service';
import axios from 'axios';

@Injectable()
export class ClearbitService extends BaseIntegrationService {
  protected readonly provider = 'clearbit';
  protected readonly displayName = 'Clearbit';
  protected readonly logger = new Logger(ClearbitService.name);

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) {
      return { success: false, message: 'No API key configured' };
    }

    try {
      // Test with a simple company lookup
      const response = await axios.get('https://company.clearbit.com/v2/companies/find', {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
        params: { domain: 'clearbit.com' },
      });

      return {
        success: true,
        message: 'Connected to Clearbit',
        details: { testCompany: response.data.name },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    const credentials: IntegrationCredentials = { apiKey };
    await this.saveCredentials(credentials);
  }

  async enrichCompany(domain: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    const response = await axios.get('https://company.clearbit.com/v2/companies/find', {
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
      params: { domain },
    });

    return response.data;
  }

  async enrichPerson(email: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    const response = await axios.get('https://person.clearbit.com/v2/people/find', {
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
      params: { email },
    });

    return response.data;
  }

  async enrichCombined(email: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    const response = await axios.get('https://person.clearbit.com/v2/combined/find', {
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
      params: { email },
    });

    return response.data;
  }

  async revealVisitor(ip: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    const response = await axios.get('https://reveal.clearbit.com/v1/companies/find', {
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
      params: { ip },
    });

    return response.data;
  }

  async prospectorSearch(query: {
    domain?: string;
    role?: string;
    seniority?: string;
    title?: string;
    limit?: number;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    const response = await axios.get('https://prospector.clearbit.com/v1/people/search', {
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
      params: {
        domain: query.domain,
        role: query.role,
        seniority: query.seniority,
        title: query.title,
        limit: query.limit || 10,
      },
    });

    return response.data;
  }

  // ============ Enhanced Enrichment Methods ============

  /**
   * Enrich company with full data mapping
   */
  async enrichCompanyFull(domain: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    try {
      this.logger.log(`Enriching company via Clearbit: ${domain}`);

      const response = await axios.get('https://company.clearbit.com/v2/companies/find', {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
        params: { domain },
      });

      if (!response.data) {
        return null;
      }

      return this.mapCompanyResponse(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.warn(`Company not found in Clearbit: ${domain}`);
        return null;
      }
      this.logger.error(`Failed to enrich company ${domain} via Clearbit:`, error.message);
      throw error;
    }
  }

  /**
   * Enrich person with full data mapping
   */
  async enrichPersonFull(email: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    try {
      this.logger.log(`Enriching person via Clearbit: ${email}`);

      const response = await axios.get('https://person.clearbit.com/v2/people/find', {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
        params: { email },
      });

      if (!response.data) {
        return null;
      }

      return this.mapPersonResponse(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.warn(`Person not found in Clearbit: ${email}`);
        return null;
      }
      this.logger.error(`Failed to enrich person ${email} via Clearbit:`, error.message);
      throw error;
    }
  }

  /**
   * Reveal company from IP address (for website visitors)
   */
  async reveal(ip: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    try {
      this.logger.log(`Revealing company from IP: ${ip}`);

      const response = await axios.get('https://reveal.clearbit.com/v1/companies/find', {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
        params: { ip },
      });

      if (!response.data?.company) {
        return null;
      }

      return {
        company: this.mapCompanyResponse(response.data.company),
        confidence: response.data.confidence,
        fuzzy: response.data.fuzzy,
        domain: response.data.domain,
        type: response.data.type,
        ip,
        revealedAt: new Date(),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.warn(`No company found for IP: ${ip}`);
        return null;
      }
      this.logger.error(`Failed to reveal company from IP ${ip}:`, error.message);
      throw error;
    }
  }

  /**
   * Combined enrichment (person + company in one call)
   */
  async enrichCombinedFull(email: string): Promise<{ person: any; company: any } | null> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    try {
      this.logger.log(`Combined enrichment via Clearbit: ${email}`);

      const response = await axios.get('https://person.clearbit.com/v2/combined/find', {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
        params: { email },
      });

      if (!response.data) {
        return null;
      }

      return {
        person: response.data.person ? this.mapPersonResponse(response.data.person) : null,
        company: response.data.company ? this.mapCompanyResponse(response.data.company) : null,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.warn(`No data found in Clearbit for: ${email}`);
        return null;
      }
      this.logger.error(`Combined enrichment failed for ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Search for contacts at a company
   */
  async searchContacts(filters: {
    domain: string;
    role?: string;
    seniority?: string;
    title?: string;
    name?: string;
    limit?: number;
  }): Promise<any[]> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Clearbit not connected');

    try {
      const response = await axios.get('https://prospector.clearbit.com/v1/people/search', {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
        params: {
          domain: filters.domain,
          role: filters.role,
          seniority: filters.seniority,
          title: filters.title,
          name: filters.name,
          limit: filters.limit || 10,
        },
      });

      return (response.data || []).map((person: any) => this.mapProspectorResponse(person));
    } catch (error: any) {
      this.logger.error('Clearbit prospector search failed:', error.message);
      return [];
    }
  }

  /**
   * Map Clearbit company response to standard format
   */
  private mapCompanyResponse(company: any): any {
    return {
      id: company.id,
      name: company.name,
      legalName: company.legalName,
      domain: company.domain,
      website: company.domain ? `https://${company.domain}` : undefined,
      industry: company.category?.industry,
      subIndustry: company.category?.subIndustry,
      sector: company.category?.sector,
      employeeCount: company.metrics?.employees,
      employeeRange: company.metrics?.employeesRange,
      annualRevenue: company.metrics?.estimatedAnnualRevenue
        ? this.parseRevenue(company.metrics.estimatedAnnualRevenue)
        : undefined,
      revenueRange: company.metrics?.estimatedAnnualRevenue,
      founded: company.foundedYear,
      description: company.description,
      logoUrl: company.logo,
      linkedinUrl: company.linkedin?.handle
        ? `https://linkedin.com/company/${company.linkedin.handle}`
        : undefined,
      twitterUrl: company.twitter?.handle
        ? `https://twitter.com/${company.twitter.handle}`
        : undefined,
      facebookUrl: company.facebook?.handle
        ? `https://facebook.com/${company.facebook.handle}`
        : undefined,
      phone: company.phone,
      location: {
        street: company.geo?.streetNumber
          ? `${company.geo.streetNumber} ${company.geo.streetName}`
          : company.geo?.streetName,
        city: company.geo?.city,
        state: company.geo?.state,
        stateCode: company.geo?.stateCode,
        postalCode: company.geo?.postalCode,
        country: company.geo?.country,
        countryCode: company.geo?.countryCode,
      },
      techStack: company.tech || [],
      tags: company.tags || [],
      type: company.type,
      naicsCode: company.category?.naicsCode,
      sicCode: company.category?.sicCode,
      stockSymbol: company.ticker,
      parentDomain: company.parentDomain,
      ultimateParentDomain: company.ultimateParentDomain,
      emailProvider: company.emailProvider,
      timeZone: company.timeZone,
      utcOffset: company.utcOffset,
      crunchbase: company.crunchbase?.handle,
      provider: 'clearbit',
      enrichedAt: new Date(),
    };
  }

  /**
   * Map Clearbit person response to standard format
   */
  private mapPersonResponse(person: any): any {
    return {
      id: person.id,
      firstName: person.name?.givenName,
      lastName: person.name?.familyName,
      fullName: person.name?.fullName,
      email: person.email,
      phone: person.phone,
      title: person.employment?.title,
      role: person.employment?.role,
      seniorityLevel: person.employment?.seniority,
      department: person.employment?.role, // Clearbit uses role for department
      linkedinUrl: person.linkedin?.handle
        ? `https://linkedin.com/in/${person.linkedin.handle}`
        : undefined,
      twitterHandle: person.twitter?.handle,
      avatarUrl: person.avatar,
      location: {
        city: person.geo?.city,
        state: person.geo?.state,
        stateCode: person.geo?.stateCode,
        country: person.geo?.country,
        countryCode: person.geo?.countryCode,
      },
      company: person.employment?.name,
      companyDomain: person.employment?.domain,
      bio: person.bio,
      site: person.site,
      timezone: person.timeZone,
      utcOffset: person.utcOffset,
      provider: 'clearbit',
      enrichedAt: new Date(),
    };
  }

  /**
   * Map Clearbit prospector response to standard format
   */
  private mapProspectorResponse(person: any): any {
    return {
      id: person.id,
      firstName: person.name?.givenName,
      lastName: person.name?.familyName,
      fullName: person.name?.fullName,
      email: person.email,
      verified: person.verified,
      title: person.title,
      role: person.role,
      seniorityLevel: person.seniority,
      company: person.company?.name,
      companyDomain: person.company?.domain,
      linkedinUrl: person.linkedin
        ? `https://linkedin.com/in/${person.linkedin}`
        : undefined,
      provider: 'clearbit',
      enrichedAt: new Date(),
    };
  }

  /**
   * Parse revenue string to number
   */
  private parseRevenue(revenueStr: string): number | undefined {
    if (!revenueStr) return undefined;

    // Handle formats like "$1M-$10M", "$10M-$50M", etc.
    const match = revenueStr.match(/\$(\d+\.?\d*)([MBK])?/);
    if (!match) return undefined;

    let value = parseFloat(match[1]);
    const multiplier = match[2];

    if (multiplier === 'K') value *= 1000;
    if (multiplier === 'M') value *= 1000000;
    if (multiplier === 'B') value *= 1000000000;

    return value;
  }
}
