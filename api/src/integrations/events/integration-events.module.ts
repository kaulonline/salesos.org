import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { SlackModule } from '../slack/slack.module';
import { ZapierModule } from '../zapier/zapier.module';
import { MakeModule } from '../make/make.module';
import { SegmentModule } from '../segment/segment.module';
import { HubSpotModule } from '../hubspot/hubspot.module';
import { MarketoModule } from '../marketo/marketo.module';
import { IntercomModule } from '../intercom/intercom.module';
import { DocuSignModule } from '../docusign/docusign.module';
import { PandaDocModule } from '../pandadoc/pandadoc.module';
import { QuickBooksModule } from '../quickbooks/quickbooks.module';
import { XeroModule } from '../xero/xero.module';
import { MicrosoftGraphModule } from '../microsoft-graph/microsoft-graph.module';
import { DropboxModule } from '../dropbox/dropbox.module';
import { GDriveModule } from '../gdrive/gdrive.module';
import { OpenAIIntegrationModule } from '../openai/openai.module';
import { AnthropicIntegrationModule } from '../anthropic/anthropic.module';
import { IntegrationEventsService } from './integration-events.service';

@Module({
  imports: [
    PrismaModule,
    // Notification / webhook integrations
    SlackModule,
    ZapierModule,
    MakeModule,
    // Analytics
    SegmentModule,
    // CRM sync
    HubSpotModule,
    MarketoModule,
    IntercomModule,
    // Document signing
    DocuSignModule,
    PandaDocModule,
    // Accounting
    QuickBooksModule,
    XeroModule,
    // Microsoft 365 (calendar / email)
    MicrosoftGraphModule,
    // File storage
    DropboxModule,
    GDriveModule,
    // AI (auto-scoring / analysis)
    OpenAIIntegrationModule,
    AnthropicIntegrationModule,
  ],
  providers: [IntegrationEventsService],
  exports: [IntegrationEventsService],
})
export class IntegrationEventsModule {}
