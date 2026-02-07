import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';
import { PrismaService } from '../database/prisma.service';
// Services
import { ZoominfoService } from './zoominfo/zoominfo.service';
import { SnowflakeService } from './snowflake/snowflake.service';
import { SlackService } from './slack/slack.service';
import { HubSpotService } from './hubspot/hubspot.service';
import { StripeService } from './stripe/stripe.service';
import { DocuSignService } from './docusign/docusign.service';
import { ZoomService } from './zoom/zoom.service';
import { OpenAIIntegrationService } from './openai/openai.service';
import { SalesforceService } from './salesforce/salesforce.service';
import { CalendlyService } from './calendly/calendly.service';
import { TeamsService } from './teams/teams.service';
import { IntercomService } from './intercom/intercom.service';
import { LinkedInService } from './linkedin/linkedin.service';
import { ApolloService } from './apollo/apollo.service';
import { GongService } from './gong/gong.service';
import { ClearbitService } from './clearbit/clearbit.service';
import { MarketoService } from './marketo/marketo.service';
import { QuickBooksService } from './quickbooks/quickbooks.service';
import { XeroService } from './xero/xero.service';
import { PandaDocService } from './pandadoc/pandadoc.service';
import { DropboxService } from './dropbox/dropbox.service';
import { GDriveService } from './gdrive/gdrive.service';
import { SegmentService } from './segment/segment.service';
import { LookerService } from './looker/looker.service';
import { ZapierService } from './zapier/zapier.service';
import { MakeService } from './make/make.service';
import { OktaService } from './okta/okta.service';
import { Auth0Service } from './auth0/auth0.service';
import { AnthropicIntegrationService } from './anthropic/anthropic.service';

interface IntegrationStatus {
  connected: boolean;
  configured: boolean;
  lastSyncAt?: string | Date | null;
  error?: string | null;
  message?: string;
}

interface AllIntegrationStatuses {
  [key: string]: IntegrationStatus;
}

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  private readonly serviceMap: Record<string, any>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly zoominfoService: ZoominfoService,
    private readonly snowflakeService: SnowflakeService,
    private readonly slackService: SlackService,
    private readonly hubspotService: HubSpotService,
    private readonly stripeService: StripeService,
    private readonly docusignService: DocuSignService,
    private readonly zoomService: ZoomService,
    private readonly openaiService: OpenAIIntegrationService,
    private readonly salesforceService: SalesforceService,
    private readonly calendlyService: CalendlyService,
    private readonly teamsService: TeamsService,
    private readonly intercomService: IntercomService,
    private readonly linkedinService: LinkedInService,
    private readonly apolloService: ApolloService,
    private readonly gongService: GongService,
    private readonly clearbitService: ClearbitService,
    private readonly marketoService: MarketoService,
    private readonly quickbooksService: QuickBooksService,
    private readonly xeroService: XeroService,
    private readonly pandadocService: PandaDocService,
    private readonly dropboxService: DropboxService,
    private readonly gdriveService: GDriveService,
    private readonly segmentService: SegmentService,
    private readonly lookerService: LookerService,
    private readonly zapierService: ZapierService,
    private readonly makeService: MakeService,
    private readonly oktaService: OktaService,
    private readonly auth0Service: Auth0Service,
    private readonly anthropicService: AnthropicIntegrationService,
  ) {
    // Initialize service map for dynamic lookups
    this.serviceMap = {
      zoominfo: this.zoominfoService,
      snowflake: this.snowflakeService,
      slack: this.slackService,
      hubspot: this.hubspotService,
      stripe: this.stripeService,
      docusign: this.docusignService,
      zoom: this.zoomService,
      openai: this.openaiService,
      salesforce: this.salesforceService,
      calendly: this.calendlyService,
      teams: this.teamsService,
      intercom: this.intercomService,
      linkedin: this.linkedinService,
      apollo: this.apolloService,
      gong: this.gongService,
      clearbit: this.clearbitService,
      marketo: this.marketoService,
      quickbooks: this.quickbooksService,
      xero: this.xeroService,
      pandadoc: this.pandadocService,
      dropbox: this.dropboxService,
      gdrive: this.gdriveService,
      segment: this.segmentService,
      looker: this.lookerService,
      zapier: this.zapierService,
      make: this.makeService,
      okta: this.oktaService,
      auth0: this.auth0Service,
      anthropic: this.anthropicService,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get status of all integrations for current organization' })
  @ApiResponse({ status: 200, description: 'All integration statuses' })
  async getAllStatuses(
    @CurrentOrganization() organizationId: string,
  ): Promise<AllIntegrationStatuses> {
    const statuses: AllIntegrationStatuses = {};

    // Get integration configs scoped to this organization only
    const configs = await this.prisma.integrationConfig.findMany({
      where: { organizationId },
    });
    for (const config of configs) {
      statuses[config.provider] = {
        connected: config.status === 'connected',
        configured: true,
        lastSyncAt: config.lastSyncAt?.toISOString() || null,
        error: config.syncError,
      };
    }

    // Check services that have their own connection status (pass organizationId)
    for (const [provider, service] of Object.entries(this.serviceMap)) {
      try {
        const status = await service.getStatus(organizationId);
        statuses[provider] = status;
      } catch {
        if (!statuses[provider]) {
          statuses[provider] = { connected: false, configured: false };
        }
      }
    }

    // Add remaining integrations as available but not configured
    const allIntegrations = [
      'slack', 'teams', 'zoom', 'intercom',
      'zoominfo', 'linkedin', 'apollo', 'gong', 'clearbit',
      'hubspot', 'salesforce', 'marketo',
      'stripe', 'quickbooks', 'xero',
      'docusign', 'pandadoc', 'dropbox', 'gdrive',
      'snowflake', 'segment', 'looker',
      'zapier', 'make', 'calendly',
      'okta', 'auth0',
      'openai', 'anthropic',
    ];

    for (const integration of allIntegrations) {
      if (!statuses[integration]) {
        statuses[integration] = {
          connected: false,
          configured: true, // Mark as available
        };
      }
    }

    return statuses;
  }

  @Get(':integrationType/config')
  @ApiOperation({ summary: 'Get current configuration for an integration (masked) - Admin only' })
  @ApiResponse({ status: 200, description: 'Integration configuration' })
  async getConfig(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('integrationType') integrationType: string,
  ): Promise<{
    configured: boolean;
    config: Record<string, string>;
    configuredBy?: { id: string; name: string; email: string } | null;
    configuredAt?: string | null;
  }> {
    // Only admins can view integration configurations
    if (req.user?.role?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can view integration configurations');
    }

    const dbConfig = await this.prisma.integrationConfig.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: integrationType }
      },
    });

    if (!dbConfig || !dbConfig.credentials) {
      return { configured: false, config: {}, configuredBy: null, configuredAt: null };
    }

    // Fetch the user who configured this integration
    let configuredBy: { id: string; name: string; email: string } | null = null;
    if (dbConfig.configuredById) {
      const user = await this.prisma.user.findUnique({
        where: { id: dbConfig.configuredById },
        select: { id: true, name: true, email: true },
      });
      if (user) {
        configuredBy = {
          id: user.id,
          name: user.name || 'Unknown User',
          email: user.email,
        };
      }
    }

    const credentials = dbConfig.credentials as Record<string, string>;
    const maskedConfig: Record<string, string> = {};

    // SECURITY: Completely mask all sensitive values - don't reveal any characters
    for (const [key, value] of Object.entries(credentials)) {
      if (!value) continue;

      const strValue = String(value);
      // For API keys, secrets, passwords, and tokens - show only that it exists
      if (key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token')) {
        // Completely mask - don't reveal any actual characters
        maskedConfig[key] = '••••••••••••••••';
      } else {
        // For non-sensitive fields like URLs, base URLs, or IDs, show full value
        // These are needed for users to verify configuration
        maskedConfig[key] = strValue;
      }
    }

    return {
      configured: true,
      config: maskedConfig,
      configuredBy,
      configuredAt: dbConfig.configuredAt?.toISOString() || null,
    };
  }

  @Get(':integrationType/status')
  @ApiOperation({ summary: 'Get status of a specific integration for current organization' })
  @ApiResponse({ status: 200, description: 'Integration status' })
  async getStatus(
    @CurrentOrganization() organizationId: string,
    @Param('integrationType') integrationType: string,
  ): Promise<IntegrationStatus> {
    // Check database first - scoped to organization
    const config = await this.prisma.integrationConfig.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: integrationType }
      },
    });

    if (config) {
      return {
        connected: config.status === 'connected',
        configured: true,
        lastSyncAt: config.lastSyncAt?.toISOString() || null,
        error: config.syncError,
      };
    }

    // Check service-level status
    if (this.serviceMap[integrationType]) {
      try {
        return await this.serviceMap[integrationType].getStatus();
      } catch {
        return { connected: false, configured: false };
      }
    }

    return { connected: false, configured: true };
  }

  @Post(':integrationType/test')
  @ApiOperation({ summary: 'Test connection for an integration' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(
    @CurrentOrganization() organizationId: string,
    @Param('integrationType') integrationType: string,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (this.serviceMap[integrationType]) {
      try {
        return await this.serviceMap[integrationType].testConnection(organizationId);
      } catch (error: any) {
        return { success: false, message: error.message || 'Connection failed' };
      }
    }

    return {
      success: true,
      message: `${integrationType} is available. Configure credentials in Settings > Integrations.`,
    };
  }

  @Post(':integrationType/connect')
  @ApiOperation({ summary: 'Initiate OAuth flow for an integration' })
  @ApiResponse({ status: 200, description: 'OAuth URL or connection result' })
  async connect(@Param('integrationType') integrationType: string): Promise<{ success: boolean; authUrl?: string; message?: string }> {
    const oauthServices = [
      'slack', 'hubspot', 'stripe', 'docusign', 'zoom', 'salesforce',
      'calendly', 'teams', 'intercom', 'linkedin', 'gong', 'quickbooks',
      'xero', 'pandadoc', 'dropbox', 'gdrive', 'looker', 'okta', 'auth0',
    ];

    if (oauthServices.includes(integrationType) && this.serviceMap[integrationType]) {
      try {
        const result = await this.serviceMap[integrationType].initiateOAuth();
        return { success: true, authUrl: result.authUrl };
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    }

    return {
      success: true,
      message: `Configure ${integrationType} API credentials in Settings > Integrations.`,
    };
  }

  @Post(':integrationType/configure')
  @ApiOperation({ summary: 'Configure an API key-based integration - Admin only' })
  @ApiResponse({ status: 200, description: 'Configuration result' })
  async configure(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('integrationType') integrationType: string,
    @Body() body: { apiKey?: string; clientId?: string; clientSecret?: string; webhookUrl?: string; writeKey?: string; munchkinId?: string; baseUrl?: string },
  ): Promise<{ success: boolean; message: string }> {
    // SECURITY: Only admins can configure integrations
    if (req.user?.role?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can configure integrations');
    }

    const userId = req.user?.userId || req.user?.sub;
    const service = this.serviceMap[integrationType];

    // Handle API key-based services (pass organizationId and userId for org-scoped storage with audit)
    if (service) {
      try {
        if (body.apiKey && typeof service.saveApiKey === 'function') {
          await service.saveApiKey(body.apiKey, organizationId, userId);
          return { success: true, message: `${integrationType} configured successfully` };
        }
        if (body.webhookUrl && typeof service.saveWebhook === 'function') {
          await service.saveWebhook(body.webhookUrl, organizationId, userId);
          return { success: true, message: `${integrationType} configured successfully` };
        }
        if (body.writeKey && typeof service.saveCredentials === 'function') {
          await service.saveCredentials({ writeKey: body.writeKey }, organizationId, userId);
          return { success: true, message: `${integrationType} configured successfully` };
        }
        // For services with multiple credentials (like Marketo)
        if (body.clientId && body.clientSecret && typeof service.saveCredentials === 'function') {
          await service.saveCredentials({
            clientId: body.clientId,
            clientSecret: body.clientSecret,
            munchkinId: body.munchkinId,
            baseUrl: body.baseUrl,
          }, organizationId, userId);
          return { success: true, message: `${integrationType} configured successfully` };
        }
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    }

    // Generic configuration storage - scoped to organization
    await this.prisma.integrationConfig.upsert({
      where: {
        organizationId_provider: { organizationId, provider: integrationType }
      },
      update: {
        credentials: body as any,
        status: 'connected',
        configuredById: userId,
        configuredAt: new Date(),
      },
      create: {
        provider: integrationType,
        name: integrationType,
        credentials: body as any,
        status: 'connected',
        settings: {},
        organizationId,
        configuredById: userId,
        configuredAt: new Date(),
      },
    });

    return { success: true, message: `${integrationType} configured successfully` };
  }

  @Delete(':integrationType/disconnect')
  @ApiOperation({ summary: 'Disconnect an integration - Admin only' })
  @ApiResponse({ status: 200, description: 'Disconnection result' })
  async disconnect(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('integrationType') integrationType: string,
  ): Promise<{ success: boolean; message: string }> {
    // SECURITY: Only admins can disconnect integrations
    if (req.user?.role?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can disconnect integrations');
    }

    if (this.serviceMap[integrationType]) {
      try {
        await this.serviceMap[integrationType].disconnect(organizationId);
      } catch {
        // If service disconnect fails, still try to delete from DB
      }
    }

    // Delete from database - scoped to organization
    try {
      await this.prisma.integrationConfig.delete({
        where: {
          organizationId_provider: { organizationId, provider: integrationType }
        },
      });
    } catch {
      // Record might not exist
    }

    return { success: true, message: `${integrationType} disconnected successfully` };
  }

  @Post(':integrationType/sync')
  @ApiOperation({ summary: 'Trigger sync for an integration' })
  @ApiResponse({ status: 200, description: 'Sync result' })
  async triggerSync(
    @CurrentOrganization() organizationId: string,
    @Param('integrationType') integrationType: string,
  ): Promise<{ success: boolean; message: string }> {
    // Update last sync time - scoped to organization
    try {
      await this.prisma.integrationConfig.update({
        where: {
          organizationId_provider: { organizationId, provider: integrationType }
        },
        data: { lastSyncAt: new Date() },
      });
    } catch {
      // Record might not exist
    }

    return {
      success: true,
      message: `Sync triggered for ${integrationType}`,
    };
  }

  @Get('all')
  @ApiOperation({ summary: 'Get list of all available integrations' })
  @ApiResponse({ status: 200, description: 'All available integrations' })
  async getAllIntegrations(
    @CurrentOrganization() organizationId: string,
  ) {
    const integrations = [
      { id: 'slack', name: 'Slack', category: 'communication', oauthBased: true },
      { id: 'teams', name: 'Microsoft Teams', category: 'communication', oauthBased: true },
      { id: 'zoom', name: 'Zoom', category: 'communication', oauthBased: true },
      { id: 'intercom', name: 'Intercom', category: 'communication', oauthBased: true },
      { id: 'zoominfo', name: 'ZoomInfo', category: 'analytics', oauthBased: false },
      { id: 'linkedin', name: 'LinkedIn Sales Nav', category: 'analytics', oauthBased: true },
      { id: 'apollo', name: 'Apollo.io', category: 'analytics', oauthBased: false },
      { id: 'gong', name: 'Gong', category: 'analytics', oauthBased: true },
      { id: 'clearbit', name: 'Clearbit', category: 'analytics', oauthBased: false },
      { id: 'hubspot', name: 'HubSpot', category: 'crm', oauthBased: true },
      { id: 'salesforce', name: 'Salesforce', category: 'crm', oauthBased: true },
      { id: 'marketo', name: 'Marketo', category: 'crm', oauthBased: false },
      { id: 'stripe', name: 'Stripe', category: 'payment', oauthBased: true },
      { id: 'quickbooks', name: 'QuickBooks', category: 'payment', oauthBased: true },
      { id: 'xero', name: 'Xero', category: 'payment', oauthBased: true },
      { id: 'docusign', name: 'DocuSign', category: 'documents', oauthBased: true },
      { id: 'pandadoc', name: 'PandaDoc', category: 'documents', oauthBased: true },
      { id: 'dropbox', name: 'Dropbox', category: 'documents', oauthBased: true },
      { id: 'gdrive', name: 'Google Drive', category: 'documents', oauthBased: true },
      { id: 'snowflake', name: 'Snowflake', category: 'analytics', oauthBased: false },
      { id: 'segment', name: 'Segment', category: 'analytics', oauthBased: false },
      { id: 'looker', name: 'Looker', category: 'analytics', oauthBased: true },
      { id: 'zapier', name: 'Zapier', category: 'automation', oauthBased: false },
      { id: 'make', name: 'Make', category: 'automation', oauthBased: false },
      { id: 'calendly', name: 'Calendly', category: 'scheduling', oauthBased: true },
      { id: 'okta', name: 'Okta SSO', category: 'security', oauthBased: true },
      { id: 'auth0', name: 'Auth0', category: 'security', oauthBased: true },
      { id: 'openai', name: 'OpenAI', category: 'ai', oauthBased: false },
      { id: 'anthropic', name: 'Claude AI', category: 'ai', oauthBased: false },
    ];

    const statuses = await this.getAllStatuses(organizationId);

    return integrations.map(int => ({
      ...int,
      ...statuses[int.id],
    }));
  }
}
