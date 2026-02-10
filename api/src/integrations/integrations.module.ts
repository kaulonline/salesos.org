import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
// Data & Analytics
import { SnowflakeModule } from './snowflake/snowflake.module';
import { ZoominfoModule } from './zoominfo/zoominfo.module';
import { MockZoomInfoModule } from './mock-zoominfo/mock-zoominfo.module';
import { ApolloModule } from './apollo/apollo.module';
import { GongModule } from './gong/gong.module';
import { ClearbitModule } from './clearbit/clearbit.module';
import { SegmentModule } from './segment/segment.module';
import { LookerModule } from './looker/looker.module';
// Data Enrichment
import { EnrichmentModule } from './enrichment/enrichment.module';
// Microsoft
import { MicrosoftGraphModule } from './microsoft-graph/microsoft-graph.module';
import { TeamsModule } from './teams/teams.module';
// Communication
import { SlackModule } from './slack/slack.module';
import { ZoomModule } from './zoom/zoom.module';
import { IntercomModule } from './intercom/intercom.module';
// CRM
import { HubSpotModule } from './hubspot/hubspot.module';
import { SalesforceModule } from './salesforce/salesforce.module';
import { MarketoModule } from './marketo/marketo.module';
// Payment
import { StripeModule } from './stripe/stripe.module';
import { QuickBooksModule } from './quickbooks/quickbooks.module';
import { XeroModule } from './xero/xero.module';
// Documents
import { DocuSignModule } from './docusign/docusign.module';
import { PandaDocModule } from './pandadoc/pandadoc.module';
import { DropboxModule } from './dropbox/dropbox.module';
import { GDriveModule } from './gdrive/gdrive.module';
// Scheduling
import { CalendlyModule } from './calendly/calendly.module';
// Social
import { LinkedInModule } from './linkedin/linkedin.module';
// Automation
import { ZapierModule } from './zapier/zapier.module';
import { MakeModule } from './make/make.module';
// Security
import { OktaModule } from './okta/okta.module';
import { Auth0Module } from './auth0/auth0.module';
// AI
import { OpenAIIntegrationModule } from './openai/openai.module';
import { AnthropicIntegrationModule } from './anthropic/anthropic.module';
import { AIModule } from './ai/ai.module';
// Events
import { IntegrationEventsModule } from './events/integration-events.module';
// Controller
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [
    PrismaModule,
    // Data & Analytics
    SnowflakeModule,
    ZoominfoModule,
    MockZoomInfoModule,
    ApolloModule,
    GongModule,
    ClearbitModule,
    SegmentModule,
    LookerModule,
    // Data Enrichment
    EnrichmentModule,
    // Microsoft
    MicrosoftGraphModule,
    TeamsModule,
    // Communication
    SlackModule,
    ZoomModule,
    IntercomModule,
    // CRM
    HubSpotModule,
    SalesforceModule,
    MarketoModule,
    // Payment
    StripeModule,
    QuickBooksModule,
    XeroModule,
    // Documents
    DocuSignModule,
    PandaDocModule,
    DropboxModule,
    GDriveModule,
    // Scheduling
    CalendlyModule,
    // Social
    LinkedInModule,
    // Automation
    ZapierModule,
    MakeModule,
    // Security
    OktaModule,
    Auth0Module,
    // AI
    OpenAIIntegrationModule,
    AnthropicIntegrationModule,
    AIModule,
    // Events
    IntegrationEventsModule,
  ],
  controllers: [IntegrationsController],
  exports: [
    // Data & Analytics
    SnowflakeModule,
    ZoominfoModule,
    MockZoomInfoModule,
    ApolloModule,
    GongModule,
    ClearbitModule,
    SegmentModule,
    LookerModule,
    // Data Enrichment
    EnrichmentModule,
    // Microsoft
    MicrosoftGraphModule,
    TeamsModule,
    // Communication
    SlackModule,
    ZoomModule,
    IntercomModule,
    // CRM
    HubSpotModule,
    SalesforceModule,
    MarketoModule,
    // Payment
    StripeModule,
    QuickBooksModule,
    XeroModule,
    // Documents
    DocuSignModule,
    PandaDocModule,
    DropboxModule,
    GDriveModule,
    // Scheduling
    CalendlyModule,
    // Social
    LinkedInModule,
    // Automation
    ZapierModule,
    MakeModule,
    // Security
    OktaModule,
    Auth0Module,
    // AI
    OpenAIIntegrationModule,
    AnthropicIntegrationModule,
    AIModule,
    // Events
    IntegrationEventsModule,
  ],
})
export class IntegrationsModule {}
