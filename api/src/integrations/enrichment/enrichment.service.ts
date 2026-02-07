import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ZoominfoService } from '../zoominfo/zoominfo.service';
import { ApolloService } from '../apollo/apollo.service';
import { ClearbitService } from '../clearbit/clearbit.service';
import {
  EnrichmentProvider,
  EntityType,
  EnrichmentStatus,
  EnrichmentResult,
  BulkEnrichmentResult,
  ProviderStatus,
  EnrichedPersonData,
  EnrichedCompanyData,
} from './dto';

interface EnrichmentConfig {
  autoEnrichLeads: boolean;
  autoEnrichContacts: boolean;
  autoEnrichAccounts: boolean;
  preferredProvider: EnrichmentProvider;
  fallbackProviders: EnrichmentProvider[];
  enrichmentCooldownHours: number; // Minimum hours between enrichments
}

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  // Default configuration
  private defaultConfig: EnrichmentConfig = {
    autoEnrichLeads: true,
    autoEnrichContacts: true,
    autoEnrichAccounts: true,
    preferredProvider: EnrichmentProvider.CLEARBIT,
    fallbackProviders: [EnrichmentProvider.APOLLO, EnrichmentProvider.ZOOMINFO],
    enrichmentCooldownHours: 24,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly zoominfoService: ZoominfoService,
    private readonly apolloService: ApolloService,
    private readonly clearbitService: ClearbitService,
  ) {}

  // ============ Main Enrichment Methods ============

  /**
   * Enrich a lead by ID
   */
  async enrichLead(
    leadId: string,
    provider?: EnrichmentProvider,
    force: boolean = false,
  ): Promise<EnrichmentResult> {
    this.logger.log(`Enriching lead: ${leadId}`);

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    // Check if recently enriched
    if (!force && lead.metadata) {
      const metadata = lead.metadata as any;
      if (metadata.lastEnrichedAt) {
        const hoursSinceEnrichment =
          (Date.now() - new Date(metadata.lastEnrichedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceEnrichment < this.defaultConfig.enrichmentCooldownHours) {
          return {
            success: false,
            provider: provider || this.defaultConfig.preferredProvider,
            entityId: leadId,
            entityType: EntityType.LEAD,
            status: EnrichmentStatus.COMPLETED,
            error: `Lead was enriched ${Math.round(hoursSinceEnrichment)} hours ago. Use force=true to re-enrich.`,
            enrichedAt: new Date(metadata.lastEnrichedAt),
          };
        }
      }
    }

    // Get enrichment data using email
    if (!lead.email) {
      return {
        success: false,
        provider: provider || this.defaultConfig.preferredProvider,
        entityId: leadId,
        entityType: EntityType.LEAD,
        status: EnrichmentStatus.FAILED,
        error: 'Lead has no email address for enrichment',
        enrichedAt: new Date(),
      };
    }

    const enrichedData = await this.enrichPerson(lead.email, provider);

    if (!enrichedData.success || !enrichedData.data) {
      return {
        success: false,
        provider: enrichedData.provider,
        entityId: leadId,
        entityType: EntityType.LEAD,
        status: EnrichmentStatus.FAILED,
        error: enrichedData.error,
        enrichedAt: new Date(),
      };
    }

    // Update lead with enriched data
    const personData = enrichedData.data as EnrichedPersonData;
    const fieldsUpdated: string[] = [];
    const updateData: any = {};

    // Map enriched fields to lead fields
    if (personData.title && !lead.title) {
      updateData.title = personData.title;
      fieldsUpdated.push('title');
    }
    if (personData.phone && !lead.phone) {
      updateData.phone = personData.phone;
      fieldsUpdated.push('phone');
    }
    if (personData.company && !lead.company) {
      updateData.company = personData.company;
      fieldsUpdated.push('company');
    }
    if (personData.linkedinUrl) {
      fieldsUpdated.push('linkedinUrl');
    }
    if (personData.location) {
      if (personData.location.city && !lead.city) {
        updateData.city = personData.location.city;
        fieldsUpdated.push('city');
      }
      if (personData.location.state && !lead.state) {
        updateData.state = personData.location.state;
        fieldsUpdated.push('state');
      }
      if (personData.location.country && !lead.country) {
        updateData.country = personData.location.country;
        fieldsUpdated.push('country');
      }
    }

    // Update metadata with enrichment info
    const existingMetadata = (lead.metadata as any) || {};
    updateData.metadata = {
      ...existingMetadata,
      lastEnrichedAt: new Date().toISOString(),
      enrichmentProvider: enrichedData.provider,
      enrichedData: personData,
      linkedinUrl: personData.linkedinUrl,
      twitterHandle: personData.twitterHandle,
    };

    await this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    this.logger.log(`Lead ${leadId} enriched successfully. Fields updated: ${fieldsUpdated.join(', ')}`);

    return {
      success: true,
      provider: enrichedData.provider,
      entityId: leadId,
      entityType: EntityType.LEAD,
      status: EnrichmentStatus.COMPLETED,
      data: personData,
      fieldsUpdated,
      enrichedAt: new Date(),
    };
  }

  /**
   * Enrich a contact by ID
   */
  async enrichContact(
    contactId: string,
    provider?: EnrichmentProvider,
    force: boolean = false,
  ): Promise<EnrichmentResult> {
    this.logger.log(`Enriching contact: ${contactId}`);

    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: { account: { select: { domain: true } } },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    // Check if recently enriched
    if (!force && contact.metadata) {
      const metadata = contact.metadata as any;
      if (metadata.lastEnrichedAt) {
        const hoursSinceEnrichment =
          (Date.now() - new Date(metadata.lastEnrichedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceEnrichment < this.defaultConfig.enrichmentCooldownHours) {
          return {
            success: false,
            provider: provider || this.defaultConfig.preferredProvider,
            entityId: contactId,
            entityType: EntityType.CONTACT,
            status: EnrichmentStatus.COMPLETED,
            error: `Contact was enriched ${Math.round(hoursSinceEnrichment)} hours ago. Use force=true to re-enrich.`,
            enrichedAt: new Date(metadata.lastEnrichedAt),
          };
        }
      }
    }

    // Get enrichment data using email
    if (!contact.email) {
      return {
        success: false,
        provider: provider || this.defaultConfig.preferredProvider,
        entityId: contactId,
        entityType: EntityType.CONTACT,
        status: EnrichmentStatus.FAILED,
        error: 'Contact has no email address for enrichment',
        enrichedAt: new Date(),
      };
    }

    const enrichedData = await this.enrichPerson(contact.email, provider);

    if (!enrichedData.success || !enrichedData.data) {
      return {
        success: false,
        provider: enrichedData.provider,
        entityId: contactId,
        entityType: EntityType.CONTACT,
        status: EnrichmentStatus.FAILED,
        error: enrichedData.error,
        enrichedAt: new Date(),
      };
    }

    // Update contact with enriched data
    const personData = enrichedData.data as EnrichedPersonData;
    const fieldsUpdated: string[] = [];
    const updateData: any = {};

    // Map enriched fields to contact fields
    if (personData.title && !contact.title) {
      updateData.title = personData.title;
      fieldsUpdated.push('title');
    }
    if (personData.phone && !contact.phone) {
      updateData.phone = personData.phone;
      fieldsUpdated.push('phone');
    }
    if (personData.mobilePhone && !contact.mobilePhone) {
      updateData.mobilePhone = personData.mobilePhone;
      fieldsUpdated.push('mobilePhone');
    }
    if (personData.department && !contact.department) {
      updateData.department = personData.department;
      fieldsUpdated.push('department');
    }
    if (personData.linkedinUrl && !contact.linkedinUrl) {
      updateData.linkedinUrl = personData.linkedinUrl;
      fieldsUpdated.push('linkedinUrl');
    }
    if (personData.twitterHandle && !contact.twitterHandle) {
      updateData.twitterHandle = personData.twitterHandle;
      fieldsUpdated.push('twitterHandle');
    }
    if (personData.avatarUrl && !contact.avatarUrl) {
      updateData.avatarUrl = personData.avatarUrl;
      fieldsUpdated.push('avatarUrl');
    }
    if (personData.location) {
      if (personData.location.city && !contact.mailingCity) {
        updateData.mailingCity = personData.location.city;
        fieldsUpdated.push('mailingCity');
      }
      if (personData.location.state && !contact.mailingState) {
        updateData.mailingState = personData.location.state;
        fieldsUpdated.push('mailingState');
      }
      if (personData.location.country && !contact.mailingCountry) {
        updateData.mailingCountry = personData.location.country;
        fieldsUpdated.push('mailingCountry');
      }
    }

    // Map seniority level
    if (personData.seniorityLevel && !contact.seniorityLevel) {
      const seniorityMap: Record<string, string> = {
        'c-level': 'C_LEVEL',
        'c_level': 'C_LEVEL',
        'executive': 'C_LEVEL',
        'vp': 'VP',
        'vice president': 'VP',
        'director': 'DIRECTOR',
        'manager': 'MANAGER',
        'senior': 'SENIOR',
        'mid': 'MID',
        'junior': 'JUNIOR',
        'entry': 'ENTRY',
      };
      const mapped = seniorityMap[personData.seniorityLevel.toLowerCase()];
      if (mapped) {
        updateData.seniorityLevel = mapped;
        fieldsUpdated.push('seniorityLevel');
      }
    }

    // Update metadata with enrichment info
    const existingMetadata = (contact.metadata as any) || {};
    updateData.metadata = {
      ...existingMetadata,
      lastEnrichedAt: new Date().toISOString(),
      enrichmentProvider: enrichedData.provider,
      enrichedData: personData,
    };

    await this.prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });

    this.logger.log(`Contact ${contactId} enriched successfully. Fields updated: ${fieldsUpdated.join(', ')}`);

    return {
      success: true,
      provider: enrichedData.provider,
      entityId: contactId,
      entityType: EntityType.CONTACT,
      status: EnrichmentStatus.COMPLETED,
      data: personData,
      fieldsUpdated,
      enrichedAt: new Date(),
    };
  }

  /**
   * Enrich an account by ID
   */
  async enrichAccount(
    accountId: string,
    provider?: EnrichmentProvider,
    force: boolean = false,
  ): Promise<EnrichmentResult> {
    this.logger.log(`Enriching account: ${accountId}`);

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    // Check if recently enriched
    if (!force && account.metadata) {
      const metadata = account.metadata as any;
      if (metadata.lastEnrichedAt) {
        const hoursSinceEnrichment =
          (Date.now() - new Date(metadata.lastEnrichedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceEnrichment < this.defaultConfig.enrichmentCooldownHours) {
          return {
            success: false,
            provider: provider || this.defaultConfig.preferredProvider,
            entityId: accountId,
            entityType: EntityType.ACCOUNT,
            status: EnrichmentStatus.COMPLETED,
            error: `Account was enriched ${Math.round(hoursSinceEnrichment)} hours ago. Use force=true to re-enrich.`,
            enrichedAt: new Date(metadata.lastEnrichedAt),
          };
        }
      }
    }

    // Get enrichment data using domain or website
    const domain = account.domain || this.extractDomain(account.website);
    if (!domain) {
      return {
        success: false,
        provider: provider || this.defaultConfig.preferredProvider,
        entityId: accountId,
        entityType: EntityType.ACCOUNT,
        status: EnrichmentStatus.FAILED,
        error: 'Account has no domain or website for enrichment',
        enrichedAt: new Date(),
      };
    }

    const enrichedData = await this.enrichCompany(domain, provider);

    if (!enrichedData.success || !enrichedData.data) {
      return {
        success: false,
        provider: enrichedData.provider,
        entityId: accountId,
        entityType: EntityType.ACCOUNT,
        status: EnrichmentStatus.FAILED,
        error: enrichedData.error,
        enrichedAt: new Date(),
      };
    }

    // Update account with enriched data
    const companyData = enrichedData.data as EnrichedCompanyData;
    const fieldsUpdated: string[] = [];
    const updateData: any = {};

    // Map enriched fields to account fields
    if (companyData.industry && !account.industry) {
      updateData.industry = companyData.industry;
      fieldsUpdated.push('industry');
    }
    if (companyData.phone && !account.phone) {
      updateData.phone = companyData.phone;
      fieldsUpdated.push('phone');
    }
    if (companyData.employeeCount && !account.numberOfEmployees) {
      updateData.numberOfEmployees = companyData.employeeCount;
      fieldsUpdated.push('numberOfEmployees');
    }
    if (companyData.annualRevenue && !account.annualRevenue) {
      updateData.annualRevenue = companyData.annualRevenue;
      fieldsUpdated.push('annualRevenue');
    }
    if (companyData.description && !account.description) {
      updateData.description = companyData.description;
      fieldsUpdated.push('description');
    }
    if (companyData.website && !account.website) {
      updateData.website = companyData.website;
      fieldsUpdated.push('website');
    }
    if (companyData.domain && !account.domain) {
      updateData.domain = companyData.domain;
      fieldsUpdated.push('domain');
    }

    // Update address if not set
    if (companyData.location) {
      if (companyData.location.street && !account.billingStreet) {
        updateData.billingStreet = companyData.location.street;
        fieldsUpdated.push('billingStreet');
      }
      if (companyData.location.city && !account.billingCity) {
        updateData.billingCity = companyData.location.city;
        fieldsUpdated.push('billingCity');
      }
      if (companyData.location.state && !account.billingState) {
        updateData.billingState = companyData.location.state;
        fieldsUpdated.push('billingState');
      }
      if (companyData.location.postalCode && !account.billingPostalCode) {
        updateData.billingPostalCode = companyData.location.postalCode;
        fieldsUpdated.push('billingPostalCode');
      }
      if (companyData.location.country && !account.billingCountry) {
        updateData.billingCountry = companyData.location.country;
        fieldsUpdated.push('billingCountry');
      }
    }

    // Update tech stack
    if (companyData.techStack && companyData.techStack.length > 0) {
      const existingTechStack = account.techStack || [];
      const mergedTechStack = [...new Set([...existingTechStack, ...companyData.techStack])];
      updateData.techStack = mergedTechStack;
      fieldsUpdated.push('techStack');
    }

    // Update metadata with enrichment info
    const existingMetadata = (account.metadata as any) || {};
    updateData.metadata = {
      ...existingMetadata,
      lastEnrichedAt: new Date().toISOString(),
      enrichmentProvider: enrichedData.provider,
      enrichedData: companyData,
      linkedinUrl: companyData.linkedinUrl,
      twitterUrl: companyData.twitterUrl,
      facebookUrl: companyData.facebookUrl,
      logoUrl: companyData.logoUrl,
      founded: companyData.founded,
      naicsCode: companyData.naicsCode,
      sicCode: companyData.sicCode,
      stockSymbol: companyData.stockSymbol,
    };

    await this.prisma.account.update({
      where: { id: accountId },
      data: updateData,
    });

    this.logger.log(`Account ${accountId} enriched successfully. Fields updated: ${fieldsUpdated.join(', ')}`);

    return {
      success: true,
      provider: enrichedData.provider,
      entityId: accountId,
      entityType: EntityType.ACCOUNT,
      status: EnrichmentStatus.COMPLETED,
      data: companyData,
      fieldsUpdated,
      enrichedAt: new Date(),
    };
  }

  /**
   * Bulk enrich multiple entities
   */
  async bulkEnrich(
    entityType: EntityType,
    ids: string[],
    provider?: EnrichmentProvider,
    force: boolean = false,
  ): Promise<BulkEnrichmentResult> {
    this.logger.log(`Bulk enriching ${ids.length} ${entityType}s`);

    const results: EnrichmentResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process in batches to respect rate limits
    const batchSize = 10;
    const delayBetweenBatches = 1000; // 1 second

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (id) => {
          try {
            let result: EnrichmentResult;

            switch (entityType) {
              case EntityType.LEAD:
                result = await this.enrichLead(id, provider, force);
                break;
              case EntityType.CONTACT:
                result = await this.enrichContact(id, provider, force);
                break;
              case EntityType.ACCOUNT:
                result = await this.enrichAccount(id, provider, force);
                break;
              default:
                throw new BadRequestException(`Unknown entity type: ${entityType}`);
            }

            if (result.success) {
              successful++;
            } else {
              failed++;
            }

            return result;
          } catch (error: any) {
            failed++;
            return {
              success: false,
              provider: provider || this.defaultConfig.preferredProvider,
              entityId: id,
              entityType,
              status: EnrichmentStatus.FAILED,
              error: error.message,
              enrichedAt: new Date(),
            };
          }
        }),
      );

      results.push(...batchResults);

      // Delay between batches to respect rate limits
      if (i + batchSize < ids.length) {
        await this.delay(delayBetweenBatches);
      }
    }

    return {
      total: ids.length,
      successful,
      failed,
      results,
    };
  }

  // ============ Provider Status Methods ============

  /**
   * Get status of all enrichment providers
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    // Check ZoomInfo
    try {
      const zoominfoStatus = await this.zoominfoService.getStatus();
      statuses.push({
        provider: EnrichmentProvider.ZOOMINFO,
        connected: zoominfoStatus.connected,
        configured: zoominfoStatus.configured,
        status: zoominfoStatus.connected ? 'connected' : zoominfoStatus.configured ? 'disconnected' : 'not_configured',
      });
    } catch (error: any) {
      statuses.push({
        provider: EnrichmentProvider.ZOOMINFO,
        connected: false,
        configured: false,
        status: 'error',
        error: error.message,
      });
    }

    // Check Apollo
    try {
      const apolloStatus = await this.apolloService.getStatus();
      statuses.push({
        provider: EnrichmentProvider.APOLLO,
        connected: apolloStatus.connected,
        configured: apolloStatus.configured,
        status: apolloStatus.status,
      });
    } catch (error: any) {
      statuses.push({
        provider: EnrichmentProvider.APOLLO,
        connected: false,
        configured: false,
        status: 'error',
        error: error.message,
      });
    }

    // Check Clearbit
    try {
      const clearbitStatus = await this.clearbitService.getStatus();
      statuses.push({
        provider: EnrichmentProvider.CLEARBIT,
        connected: clearbitStatus.connected,
        configured: clearbitStatus.configured,
        status: clearbitStatus.status,
      });
    } catch (error: any) {
      statuses.push({
        provider: EnrichmentProvider.CLEARBIT,
        connected: false,
        configured: false,
        status: 'error',
        error: error.message,
      });
    }

    return statuses;
  }

  /**
   * Get the best available enrichment provider
   */
  async getBestProvider(): Promise<EnrichmentProvider | null> {
    const statuses = await this.getProviderStatus();
    const connectedProviders = statuses.filter((s) => s.connected);

    if (connectedProviders.length === 0) {
      return null;
    }

    // Return preferred provider if available
    const preferred = connectedProviders.find(
      (s) => s.provider === this.defaultConfig.preferredProvider,
    );
    if (preferred) {
      return preferred.provider;
    }

    // Return first available fallback
    for (const fallback of this.defaultConfig.fallbackProviders) {
      const available = connectedProviders.find((s) => s.provider === fallback);
      if (available) {
        return available.provider;
      }
    }

    // Return any connected provider
    return connectedProviders[0].provider;
  }

  // ============ Core Enrichment Logic ============

  /**
   * Enrich person data using configured providers with fallback
   */
  private async enrichPerson(
    email: string,
    preferredProvider?: EnrichmentProvider,
  ): Promise<{ success: boolean; provider: EnrichmentProvider; data?: EnrichedPersonData; error?: string }> {
    const providers = this.getProviderOrder(preferredProvider);

    for (const provider of providers) {
      try {
        const isConnected = await this.isProviderConnected(provider);
        if (!isConnected) {
          continue;
        }

        const data = await this.enrichPersonWithProvider(email, provider);
        if (data) {
          return { success: true, provider, data };
        }
      } catch (error: any) {
        this.logger.warn(`Provider ${provider} failed for person enrichment: ${error.message}`);
        // Continue to next provider
      }
    }

    return {
      success: false,
      provider: preferredProvider || this.defaultConfig.preferredProvider,
      error: 'No enrichment data found from any provider',
    };
  }

  /**
   * Enrich company data using configured providers with fallback
   */
  private async enrichCompany(
    domain: string,
    preferredProvider?: EnrichmentProvider,
  ): Promise<{ success: boolean; provider: EnrichmentProvider; data?: EnrichedCompanyData; error?: string }> {
    const providers = this.getProviderOrder(preferredProvider);

    for (const provider of providers) {
      try {
        const isConnected = await this.isProviderConnected(provider);
        if (!isConnected) {
          continue;
        }

        const data = await this.enrichCompanyWithProvider(domain, provider);
        if (data) {
          return { success: true, provider, data };
        }
      } catch (error: any) {
        this.logger.warn(`Provider ${provider} failed for company enrichment: ${error.message}`);
        // Continue to next provider
      }
    }

    return {
      success: false,
      provider: preferredProvider || this.defaultConfig.preferredProvider,
      error: 'No enrichment data found from any provider',
    };
  }

  /**
   * Enrich person using specific provider
   */
  private async enrichPersonWithProvider(
    email: string,
    provider: EnrichmentProvider,
  ): Promise<EnrichedPersonData | null> {
    switch (provider) {
      case EnrichmentProvider.CLEARBIT:
        return await this.clearbitService.enrichPersonFull(email);

      case EnrichmentProvider.APOLLO:
        return await this.apolloService.enrichPersonFull(email);

      case EnrichmentProvider.ZOOMINFO:
        return await this.zoominfoService.enrichContact(email);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Enrich company using specific provider
   */
  private async enrichCompanyWithProvider(
    domain: string,
    provider: EnrichmentProvider,
  ): Promise<EnrichedCompanyData | null> {
    switch (provider) {
      case EnrichmentProvider.CLEARBIT:
        return await this.clearbitService.enrichCompanyFull(domain);

      case EnrichmentProvider.APOLLO:
        return await this.apolloService.enrichCompany(domain);

      case EnrichmentProvider.ZOOMINFO:
        return await this.zoominfoService.enrichCompany(domain);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Check if a provider is connected
   */
  private async isProviderConnected(provider: EnrichmentProvider): Promise<boolean> {
    try {
      switch (provider) {
        case EnrichmentProvider.CLEARBIT:
          return await this.clearbitService.isConnected();

        case EnrichmentProvider.APOLLO:
          return await this.apolloService.isConnected();

        case EnrichmentProvider.ZOOMINFO:
          return await this.zoominfoService.isConnected();

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get provider order based on preference
   */
  private getProviderOrder(preferredProvider?: EnrichmentProvider): EnrichmentProvider[] {
    if (preferredProvider) {
      // Put preferred provider first, then fallbacks
      return [
        preferredProvider,
        ...this.defaultConfig.fallbackProviders.filter((p) => p !== preferredProvider),
      ];
    }

    // Use default order: preferred + fallbacks
    return [
      this.defaultConfig.preferredProvider,
      ...this.defaultConfig.fallbackProviders.filter(
        (p) => p !== this.defaultConfig.preferredProvider,
      ),
    ];
  }

  // ============ Auto-Enrichment Hooks ============

  /**
   * Auto-enrich a newly created lead (called from LeadsService)
   */
  async autoEnrichLead(leadId: string): Promise<void> {
    if (!this.defaultConfig.autoEnrichLeads) {
      return;
    }

    try {
      const bestProvider = await this.getBestProvider();
      if (!bestProvider) {
        this.logger.debug('No enrichment providers available for auto-enrichment');
        return;
      }

      // Run enrichment asynchronously
      this.enrichLead(leadId, bestProvider, false).catch((error) => {
        this.logger.error(`Auto-enrichment failed for lead ${leadId}:`, error);
      });
    } catch (error) {
      this.logger.error(`Failed to trigger auto-enrichment for lead ${leadId}:`, error);
    }
  }

  /**
   * Auto-enrich a newly created contact (called from ContactsService)
   */
  async autoEnrichContact(contactId: string): Promise<void> {
    if (!this.defaultConfig.autoEnrichContacts) {
      return;
    }

    try {
      const bestProvider = await this.getBestProvider();
      if (!bestProvider) {
        this.logger.debug('No enrichment providers available for auto-enrichment');
        return;
      }

      // Run enrichment asynchronously
      this.enrichContact(contactId, bestProvider, false).catch((error) => {
        this.logger.error(`Auto-enrichment failed for contact ${contactId}:`, error);
      });
    } catch (error) {
      this.logger.error(`Failed to trigger auto-enrichment for contact ${contactId}:`, error);
    }
  }

  /**
   * Auto-enrich a newly created account (called from AccountsService)
   */
  async autoEnrichAccount(accountId: string): Promise<void> {
    if (!this.defaultConfig.autoEnrichAccounts) {
      return;
    }

    try {
      const bestProvider = await this.getBestProvider();
      if (!bestProvider) {
        this.logger.debug('No enrichment providers available for auto-enrichment');
        return;
      }

      // Run enrichment asynchronously
      this.enrichAccount(accountId, bestProvider, false).catch((error) => {
        this.logger.error(`Auto-enrichment failed for account ${accountId}:`, error);
      });
    } catch (error) {
      this.logger.error(`Failed to trigger auto-enrichment for account ${accountId}:`, error);
    }
  }

  // ============ Test Connection Methods ============

  /**
   * Test connections to enrichment providers
   */
  async testConnections(
    provider?: EnrichmentProvider,
  ): Promise<Array<{ provider: EnrichmentProvider; success: boolean; latencyMs: number; message: string; error?: string }>> {
    const results: Array<{
      provider: EnrichmentProvider;
      success: boolean;
      latencyMs: number;
      message: string;
      error?: string;
    }> = [];

    const providersToTest = provider
      ? [provider]
      : [EnrichmentProvider.ZOOMINFO, EnrichmentProvider.APOLLO, EnrichmentProvider.CLEARBIT];

    for (const p of providersToTest) {
      const startTime = Date.now();
      try {
        let success = false;
        let message = '';

        switch (p) {
          case EnrichmentProvider.ZOOMINFO:
            const zoominfoStatus = await this.zoominfoService.getStatus();
            if (!zoominfoStatus.configured) {
              message = 'ZoomInfo is not configured. Please add API credentials.';
            } else if (zoominfoStatus.connected) {
              success = true;
              message = 'Successfully connected to ZoomInfo API';
            } else {
              message = 'ZoomInfo is configured but connection failed. Please verify credentials.';
            }
            break;

          case EnrichmentProvider.APOLLO:
            const apolloStatus = await this.apolloService.getStatus();
            if (!apolloStatus.configured) {
              message = 'Apollo is not configured. Please add API credentials.';
            } else if (apolloStatus.connected) {
              success = true;
              message = 'Successfully connected to Apollo.io API';
            } else {
              message = 'Apollo is configured but connection failed. Please verify credentials.';
            }
            break;

          case EnrichmentProvider.CLEARBIT:
            const clearbitStatus = await this.clearbitService.getStatus();
            if (!clearbitStatus.configured) {
              message = 'Clearbit is not configured. Please add API credentials.';
            } else if (clearbitStatus.connected) {
              success = true;
              message = 'Successfully connected to Clearbit API';
            } else {
              message = 'Clearbit is configured but connection failed. Please verify credentials.';
            }
            break;
        }

        const latencyMs = Date.now() - startTime;
        results.push({ provider: p, success, latencyMs, message });
      } catch (error: any) {
        const latencyMs = Date.now() - startTime;
        results.push({
          provider: p,
          success: false,
          latencyMs,
          message: `Connection test failed for ${p}`,
          error: error.message,
        });
      }
    }

    return results;
  }

  // ============ Utility Methods ============

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string | null): string | null {
    if (!url) return null;

    try {
      // Handle URLs without protocol
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlWithProtocol);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      // If URL parsing fails, try simple extraction
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
      return match ? match[1] : null;
    }
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
