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
export class ApolloService extends BaseIntegrationService {
  protected readonly provider = 'apollo';
  protected readonly displayName = 'Apollo.io';
  protected readonly logger = new Logger(ApolloService.name);

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
      const response = await axios.get('https://api.apollo.io/api/v1/auth/health', {
        headers: { 'X-Api-Key': credentials.apiKey },
      });

      return {
        success: true,
        message: 'Connected to Apollo.io',
        details: response.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    const credentials: IntegrationCredentials = { apiKey };
    await this.saveCredentials(credentials);
  }

  async searchPeople(query: {
    personTitles?: string[];
    personLocations?: string[];
    organizationIds?: string[];
    perPage?: number;
    page?: number;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Apollo not connected');

    const response = await axios.post(
      'https://api.apollo.io/api/v1/mixed_people/search',
      {
        person_titles: query.personTitles,
        person_locations: query.personLocations,
        organization_ids: query.organizationIds,
        per_page: query.perPage || 25,
        page: query.page || 1,
      },
      { headers: { 'X-Api-Key': credentials.apiKey } },
    );

    return response.data;
  }

  async searchOrganizations(query: {
    organizationNames?: string[];
    organizationLocations?: string[];
    organizationIndustries?: string[];
    perPage?: number;
    page?: number;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Apollo not connected');

    const response = await axios.post(
      'https://api.apollo.io/api/v1/mixed_companies/search',
      {
        organization_names: query.organizationNames,
        organization_locations: query.organizationLocations,
        organization_industry_tag_ids: query.organizationIndustries,
        per_page: query.perPage || 25,
        page: query.page || 1,
      },
      { headers: { 'X-Api-Key': credentials.apiKey } },
    );

    return response.data;
  }

  async enrichPerson(email: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Apollo not connected');

    const response = await axios.post(
      'https://api.apollo.io/api/v1/people/match',
      { email },
      { headers: { 'X-Api-Key': credentials.apiKey } },
    );

    return response.data;
  }

  async enrichCompany(domain: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Apollo not connected');

    try {
      this.logger.log(`Enriching company via Apollo: ${domain}`);

      const response = await axios.post(
        'https://api.apollo.io/api/v1/organizations/enrich',
        { domain },
        { headers: { 'X-Api-Key': credentials.apiKey } },
      );

      if (!response.data?.organization) {
        return null;
      }

      const org = response.data.organization;
      return this.mapCompanyResponse(org);
    } catch (error: any) {
      this.logger.error(`Failed to enrich company ${domain} via Apollo:`, error.message);
      throw error;
    }
  }

  /**
   * Enhanced person enrichment with full data mapping
   */
  async enrichPersonFull(email: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Apollo not connected');

    try {
      this.logger.log(`Enriching person via Apollo: ${email}`);

      const response = await axios.post(
        'https://api.apollo.io/api/v1/people/match',
        { email, reveal_personal_emails: true },
        { headers: { 'X-Api-Key': credentials.apiKey } },
      );

      if (!response.data?.person) {
        return null;
      }

      const person = response.data.person;
      return this.mapPersonResponse(person);
    } catch (error: any) {
      this.logger.error(`Failed to enrich person ${email} via Apollo:`, error.message);
      throw error;
    }
  }

  /**
   * Search for people with advanced filters
   */
  async searchPeopleAdvanced(filters: {
    companyDomain?: string;
    companyName?: string;
    titles?: string[];
    seniorityLevels?: string[];
    departments?: string[];
    locations?: string[];
    limit?: number;
  }): Promise<any[]> {
    const credentials = await this.getCredentials();
    if (!credentials?.apiKey) throw new Error('Apollo not connected');

    try {
      const searchParams: any = {
        per_page: filters.limit || 25,
        page: 1,
      };

      if (filters.companyDomain) {
        searchParams.organization_domains = [filters.companyDomain];
      }
      if (filters.companyName) {
        searchParams.organization_names = [filters.companyName];
      }
      if (filters.titles && filters.titles.length > 0) {
        searchParams.person_titles = filters.titles;
      }
      if (filters.seniorityLevels && filters.seniorityLevels.length > 0) {
        searchParams.person_seniorities = filters.seniorityLevels;
      }
      if (filters.departments && filters.departments.length > 0) {
        searchParams.person_departments = filters.departments;
      }
      if (filters.locations && filters.locations.length > 0) {
        searchParams.person_locations = filters.locations;
      }

      const response = await axios.post(
        'https://api.apollo.io/api/v1/mixed_people/search',
        searchParams,
        { headers: { 'X-Api-Key': credentials.apiKey } },
      );

      return (response.data?.people || []).map((person: any) => this.mapPersonResponse(person));
    } catch (error: any) {
      this.logger.error('Apollo people search failed:', error.message);
      return [];
    }
  }

  /**
   * Map Apollo organization response to standard format
   */
  private mapCompanyResponse(org: any): any {
    return {
      id: org.id,
      name: org.name,
      domain: org.primary_domain || org.website_url,
      website: org.website_url,
      industry: org.industry,
      subIndustry: org.subindustries?.join(', '),
      employeeCount: org.estimated_num_employees,
      employeeRange: this.getEmployeeRange(org.estimated_num_employees),
      annualRevenue: org.annual_revenue,
      revenueRange: org.annual_revenue_printed,
      founded: org.founded_year,
      description: org.short_description || org.seo_description,
      logoUrl: org.logo_url,
      linkedinUrl: org.linkedin_url,
      twitterUrl: org.twitter_url,
      facebookUrl: org.facebook_url,
      phone: org.phone,
      location: {
        street: org.street_address,
        city: org.city,
        state: org.state,
        postalCode: org.postal_code,
        country: org.country,
      },
      techStack: org.technologies || [],
      tags: org.keywords || [],
      naicsCode: org.naics_code,
      sicCode: org.sic_code,
      stockSymbol: org.publicly_traded_symbol,
      provider: 'apollo',
      enrichedAt: new Date(),
    };
  }

  /**
   * Map Apollo person response to standard format
   */
  private mapPersonResponse(person: any): any {
    return {
      id: person.id,
      firstName: person.first_name,
      lastName: person.last_name,
      email: person.email,
      phone: person.phone_numbers?.[0]?.sanitized_number,
      mobilePhone: person.mobile_phone,
      title: person.title,
      seniorityLevel: person.seniority,
      department: person.departments?.join(', '),
      linkedinUrl: person.linkedin_url,
      twitterHandle: person.twitter_url?.replace('https://twitter.com/', ''),
      avatarUrl: person.photo_url,
      location: {
        city: person.city,
        state: person.state,
        country: person.country,
      },
      company: person.organization?.name,
      companyId: person.organization?.id,
      companyDomain: person.organization?.primary_domain,
      headline: person.headline,
      bio: person.employment_history ? this.buildEmploymentSummary(person.employment_history) : undefined,
      employment: person.employment_history?.map((emp: any) => ({
        company: emp.organization_name,
        title: emp.title,
        startDate: emp.start_date,
        endDate: emp.end_date,
        isCurrent: emp.current,
      })),
      provider: 'apollo',
      enrichedAt: new Date(),
    };
  }

  /**
   * Get employee range string from count
   */
  private getEmployeeRange(count: number): string {
    if (!count) return 'Unknown';
    if (count < 10) return '1-10';
    if (count < 50) return '11-50';
    if (count < 200) return '51-200';
    if (count < 500) return '201-500';
    if (count < 1000) return '501-1000';
    if (count < 5000) return '1001-5000';
    if (count < 10000) return '5001-10000';
    return '10000+';
  }

  /**
   * Build employment summary from history
   */
  private buildEmploymentSummary(history: any[]): string {
    if (!history || history.length === 0) return '';
    const current = history.find((h) => h.current);
    if (current) {
      return `${current.title} at ${current.organization_name}`;
    }
    return `Previously at ${history[0].organization_name}`;
  }
}
