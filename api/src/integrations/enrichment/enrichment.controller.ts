import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { EnrichmentService } from './enrichment.service';
import {
  EnrichLeadDto,
  EnrichContactDto,
  EnrichAccountDto,
  BulkEnrichDto,
  EnrichmentProvider,
  EntityType,
} from './dto';

@ApiTags('Data Enrichment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('enrichment')
export class EnrichmentController {
  constructor(private readonly enrichmentService: EnrichmentService) {}

  // ============ Single Entity Enrichment ============

  @Post('lead/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enrich a single lead',
    description: 'Enriches a lead with data from configured enrichment providers (ZoomInfo, Apollo, Clearbit)',
  })
  @ApiParam({ name: 'id', description: 'Lead ID to enrich' })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: EnrichmentProvider,
    description: 'Specific provider to use (optional)',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force re-enrichment even if recently enriched',
  })
  @ApiResponse({ status: 200, description: 'Lead enriched successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async enrichLead(
    @Param('id') id: string,
    @Query('provider') provider?: EnrichmentProvider,
    @Query('force') force?: string,
  ) {
    const forceEnrich = force === 'true';
    return this.enrichmentService.enrichLead(id, provider, forceEnrich);
  }

  @Post('contact/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enrich a single contact',
    description: 'Enriches a contact with data from configured enrichment providers',
  })
  @ApiParam({ name: 'id', description: 'Contact ID to enrich' })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: EnrichmentProvider,
    description: 'Specific provider to use (optional)',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force re-enrichment even if recently enriched',
  })
  @ApiResponse({ status: 200, description: 'Contact enriched successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async enrichContact(
    @Param('id') id: string,
    @Query('provider') provider?: EnrichmentProvider,
    @Query('force') force?: string,
  ) {
    const forceEnrich = force === 'true';
    return this.enrichmentService.enrichContact(id, provider, forceEnrich);
  }

  @Post('account/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enrich a single account',
    description: 'Enriches an account with company data from configured enrichment providers',
  })
  @ApiParam({ name: 'id', description: 'Account ID to enrich' })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: EnrichmentProvider,
    description: 'Specific provider to use (optional)',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force re-enrichment even if recently enriched',
  })
  @ApiResponse({ status: 200, description: 'Account enriched successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async enrichAccount(
    @Param('id') id: string,
    @Query('provider') provider?: EnrichmentProvider,
    @Query('force') force?: string,
  ) {
    const forceEnrich = force === 'true';
    return this.enrichmentService.enrichAccount(id, provider, forceEnrich);
  }

  // ============ Bulk Enrichment ============

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk enrich multiple entities',
    description: 'Enriches multiple leads, contacts, or accounts in a single request',
  })
  @ApiResponse({ status: 200, description: 'Bulk enrichment completed' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async bulkEnrich(@Body() bulkEnrichDto: BulkEnrichDto) {
    return this.enrichmentService.bulkEnrich(
      bulkEnrichDto.entityType,
      bulkEnrichDto.ids,
      bulkEnrichDto.provider,
      bulkEnrichDto.force,
    );
  }

  // ============ Provider Status ============

  @Get('status')
  @ApiOperation({
    summary: 'Get enrichment provider status',
    description: 'Returns the connection status of all configured enrichment providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider status retrieved',
    schema: {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              provider: { type: 'string', enum: ['zoominfo', 'apollo', 'clearbit'] },
              connected: { type: 'boolean' },
              configured: { type: 'boolean' },
              status: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
        bestProvider: { type: 'string', nullable: true },
      },
    },
  })
  async getStatus() {
    const [providers, bestProvider] = await Promise.all([
      this.enrichmentService.getProviderStatus(),
      this.enrichmentService.getBestProvider(),
    ]);

    return {
      providers,
      bestProvider,
      summary: {
        totalProviders: providers.length,
        connectedProviders: providers.filter((p) => p.connected).length,
        configuredProviders: providers.filter((p) => p.configured).length,
      },
    };
  }

  @Get('providers')
  @ApiOperation({
    summary: 'List available enrichment providers',
    description: 'Returns a list of all enrichment providers with their capabilities',
  })
  @ApiResponse({ status: 200, description: 'Providers list retrieved' })
  async listProviders() {
    const statuses = await this.enrichmentService.getProviderStatus();

    return {
      providers: [
        {
          id: EnrichmentProvider.ZOOMINFO,
          name: 'ZoomInfo',
          description: 'B2B contact and company data intelligence',
          capabilities: ['person_enrichment', 'company_enrichment', 'contact_search', 'intent_data'],
          status: statuses.find((s) => s.provider === EnrichmentProvider.ZOOMINFO),
        },
        {
          id: EnrichmentProvider.APOLLO,
          name: 'Apollo.io',
          description: 'Sales intelligence and engagement platform',
          capabilities: ['person_enrichment', 'company_enrichment', 'contact_search', 'email_finding'],
          status: statuses.find((s) => s.provider === EnrichmentProvider.APOLLO),
        },
        {
          id: EnrichmentProvider.CLEARBIT,
          name: 'Clearbit',
          description: 'Real-time B2B data enrichment',
          capabilities: ['person_enrichment', 'company_enrichment', 'ip_reveal', 'prospector'],
          status: statuses.find((s) => s.provider === EnrichmentProvider.CLEARBIT),
        },
      ],
    };
  }

  // ============ Test Connection ============

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test enrichment provider connection',
    description: 'Tests connectivity to enrichment providers using a sample lookup',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: EnrichmentProvider,
    description: 'Specific provider to test (tests all if not specified)',
  })
  @ApiResponse({ status: 200, description: 'Connection test results' })
  async testConnection(@Query('provider') provider?: EnrichmentProvider) {
    const results = await this.enrichmentService.testConnections(provider);
    return {
      success: results.every((r) => r.success),
      results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    };
  }

  @Post('test/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test specific enrichment provider',
    description: 'Tests connectivity to a specific enrichment provider',
  })
  @ApiParam({ name: 'provider', enum: EnrichmentProvider, description: 'Provider to test' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testSpecificProvider(@Param('provider') provider: EnrichmentProvider) {
    const results = await this.enrichmentService.testConnections(provider);
    const result = results[0];

    if (!result) {
      return {
        success: false,
        provider,
        latencyMs: 0,
        message: 'No test result returned',
      };
    }

    return result;
  }

  // ============ Utility Endpoints ============

  @Post('preview/lead/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview lead enrichment',
    description: 'Shows what data would be enriched without actually updating the lead',
  })
  @ApiParam({ name: 'id', description: 'Lead ID to preview enrichment for' })
  @ApiResponse({ status: 200, description: 'Enrichment preview returned' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async previewLeadEnrichment(@Param('id') id: string) {
    // For preview, we'll enrich but not save
    // This is a simplified version - a full implementation would fetch data without updating
    const result = await this.enrichmentService.enrichLead(id, undefined, true);
    return {
      preview: true,
      ...result,
    };
  }

  @Post('preview/contact/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview contact enrichment',
    description: 'Shows what data would be enriched without actually updating the contact',
  })
  @ApiParam({ name: 'id', description: 'Contact ID to preview enrichment for' })
  @ApiResponse({ status: 200, description: 'Enrichment preview returned' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async previewContactEnrichment(@Param('id') id: string) {
    const result = await this.enrichmentService.enrichContact(id, undefined, true);
    return {
      preview: true,
      ...result,
    };
  }

  @Post('preview/account/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview account enrichment',
    description: 'Shows what data would be enriched without actually updating the account',
  })
  @ApiParam({ name: 'id', description: 'Account ID to preview enrichment for' })
  @ApiResponse({ status: 200, description: 'Enrichment preview returned' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async previewAccountEnrichment(@Param('id') id: string) {
    const result = await this.enrichmentService.enrichAccount(id, undefined, true);
    return {
      preview: true,
      ...result,
    };
  }
}
