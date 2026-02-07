import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { RlsContextInterceptor } from './common/interceptors/rls-context.interceptor';
import { OrganizationMiddleware } from './common/middleware/organization.middleware';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CsrfGuard } from './common/guards/csrf.guard';
import { OrganizationGuard } from './common/guards/organization.guard';
import { CsrfService } from './auth/csrf.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { envSchema } from './config/validation';
import { PrismaModule } from './database/prisma.module';
import { ConversationsModule } from './conversations/conversations.module';
import { LeadsModule } from './leads/leads.module';
import { AccountsModule } from './accounts/accounts.module';
import { ContactsModule } from './contacts/contacts.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { TasksModule } from './tasks/tasks.module';
import { ActivitiesModule } from './activities/activities.module';
import { QuotesModule } from './quotes/quotes.module';
import { ProductsModule } from './products/products.module';
import { ContractsModule } from './contracts/contracts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { NotesModule } from './notes/notes.module';
import { SearchModule } from './search/search.module';
import { PageIndexModule } from './pageindex/pageindex.module';
import { DocumentsModule } from './documents/documents.module';
import { AiSdkModule } from './ai-sdk/ai-sdk.module';
import { FeedbackModule } from './feedback/feedback.module';
import { MeetingsModule } from './meetings/meetings.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';
import { EmailTrackingModule } from './email-tracking/email-tracking.module';
import { SalesforceModule } from './salesforce/salesforce.module';
import { OracleCXModule } from './oracle-cx/oracle-cx.module';
import { CrmAdminModule } from './crm-admin/crm-admin.module';
import { RedisCacheModule } from './cache/cache.module';
import { CacheService } from './cache/cache.service';
import { AgentsModule } from './agents/agents.module';
import { LicensingModule } from './licensing/licensing.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SalesforcePackageModule } from './salesforce-package/salesforce-package.module';
import { UsersModule } from './users/users.module';
import { IRISRankModule } from './iris-rank/iris-rank.module';
import { DeviceTrackingModule } from './device-tracking/device-tracking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FeatureVisibilityModule } from './feature-visibility/feature-visibility.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SmartCaptureModule } from './smart-capture/smart-capture.module';
import { AppContentModule } from './app-content/app-content.module';
import { ClientErrorsModule } from './client-errors/client-errors.module';
import { ImagesModule } from './images/images.module';
import { EmailAdminModule } from './email-admin/email-admin.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { SupportModule } from './support/support.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { LLMModule } from './llm/llm.module';
import { AzureOpenAIRetryService } from './common/azure-openai-retry.service';
import { ResponseGroundingModule } from './common/response-grounding.module';
import { CoachingModule } from './coaching/coaching.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ImportExportModule } from './import-export/import-export.module';
import { ReportingModule } from './reporting/reporting.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { EmailIntegrationsModule } from './email-integrations/email-integrations.module';
import { CalendarIntegrationsModule } from './calendar-integrations/calendar-integrations.module';
import { TeamMessagesModule } from './team-messages/team-messages.module';
import { PaymentsModule } from './payments/payments.module';
import { TwoFactorModule } from './two-factor/two-factor.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PriceBooksModule } from './price-books/price-books.module';
import { AssignmentRulesModule } from './assignment-rules/assignment-rules.module';
import { WebFormsModule } from './web-forms/web-forms.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { WebhooksManagementModule } from './webhooks-management/webhooks-management.module';
import { AIBuilderModule } from './ai-builder/ai-builder.module';
import { OrdersModule } from './orders/orders.module';
import { ESignatureModule } from './esignature/esignature.module';
import { CpqAnalyticsModule } from './cpq-analytics/cpq-analytics.module';
import { TerritoriesModule } from './territories/territories.module';
import { PlaybooksModule } from './playbooks/playbooks.module';
import { DigitalWorkersModule } from './digital-workers/digital-workers.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { OutcomeBillingModule } from './outcome-billing/outcome-billing.module';
import { CollaborationModule } from './collaboration/collaboration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validate: (config) => envSchema.parse(config),
    }),
    // Rate limiting configuration - prevents DoS and ensures fair usage
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1 second window
        limit: 20,     // 20 requests per second per IP
      },
      {
        name: 'medium',
        ttl: 60000,   // 1 minute window
        limit: 200,    // 200 requests per minute per IP
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour window
        limit: 2000,   // 2000 requests per hour per IP
      },
    ]),
    // Schedule module for cron jobs (email polling, etc.)
    ScheduleModule.forRoot(),
    PrismaModule,
    ResponseGroundingModule, // AI response verification against tool facts
    LLMModule, // Unified LLM API via LiteLLM - supports 100+ providers
    EmailModule, // Global email service for sending meeting invites
    ConversationsModule,
    LeadsModule,
    AccountsModule,
    ContactsModule,
    OpportunitiesModule,
    PipelinesModule, // Sales pipeline configuration - custom stages and workflows
    TasksModule,
    ActivitiesModule,
    QuotesModule,
    ProductsModule, // Product catalog for quotes and opportunities
    ContractsModule,
    CampaignsModule,
    NotesModule,
    SearchModule,
    PageIndexModule,
    DocumentsModule,
    AiSdkModule,
    FeedbackModule,
    MeetingsModule, // Meeting Intelligence - Native platform integrations
    AuthModule,
    AdminModule, // Admin UI configuration management
    EmailTrackingModule, // Email tracking and CRM automation
    SalesforceModule, // Salesforce CRM integration via OAuth
    OracleCXModule, // Oracle CX Sales Cloud integration via OAuth
    CrmAdminModule, // CRM admin configuration (database-driven)
    RedisCacheModule, // Distributed caching with Redis
    AgentsModule, // AI Agent Framework - autonomous sales agents
    LicensingModule, // License management and feature access control
    OrganizationsModule, // Enterprise B2B organization management
    SalesforcePackageModule, // Salesforce Package API for managed/unmanaged package
    UsersModule, // User preferences and settings management
    IRISRankModule, // IRISRank API for entity scoring and insights
    DeviceTrackingModule, // Mobile/tablet device tracking and session management
    NotificationsModule, // Push notifications via WebSocket
    FeatureVisibilityModule, // Feature visibility control per device/license
    RealtimeModule, // WebRTC-based real-time voice with Azure OpenAI
    SmartCaptureModule, // Smart Camera & Notepad - OCR and AI-powered data capture
    AppContentModule, // App content management for legal, help, and informational pages
    ClientErrorsModule, // Client-side error reporting from mobile and web apps
    ImagesModule, // Pexels image proxy - secures API key server-side
    EmailAdminModule, // Email templates, campaigns, queue, and CRM event triggers
    EmailTemplatesModule, // User-accessible email templates (view/create own templates)
    SupportModule, // Support ticket system - public form, admin panel, AI draft responses
    WaitlistModule, // Waitlist subscribers - pre-launch lead collection
    CoachingModule, // Video coaching - AI-powered sales practice feedback (MVP #2)
    DashboardModule, // Mode-aware dashboard data for right panel (Salesforce/Oracle/Local)
    ImportExportModule, // Bulk import/export - CSV/Excel for leads, contacts, accounts, opportunities
    ReportingModule, // Sales reporting - pipeline, win rate, activity, revenue, lead conversion, forecast
    WorkflowsModule, // Workflow automation - triggers, conditions, actions for CRM automation
    EmailIntegrationsModule, // Email integrations - Gmail/Outlook OAuth for email sync
    CalendarIntegrationsModule, // Calendar integrations - Google/Outlook Calendar OAuth for event sync
    TeamMessagesModule, // Team messaging - channels and direct messages
    PaymentsModule, // Payment processing - Stripe (US/Global) and Razorpay (India)
    OutcomeBillingModule, // Outcome-based billing - charges based on closed deals
    TwoFactorModule, // Two-factor authentication with TOTP and backup codes
    CustomFieldsModule, // User-defined custom fields on CRM entities
    ProfilesModule, // Role-based access control with granular permissions
    PriceBooksModule, // Product pricing with multiple price books and currencies
    AssignmentRulesModule, // Auto-assignment rules for leads and opportunities
    WebFormsModule, // Embeddable lead capture forms
    ApiKeysModule, // User-managed API keys with scopes and rate limiting
    WebhooksManagementModule, // Webhook subscriptions and delivery management
    AIBuilderModule, // AI-powered configuration generation from natural language
    OrdersModule, // CPQ Phase 4 - Sales orders from quotes
    ESignatureModule, // CPQ Phase 4 - E-signature integrations
    CpqAnalyticsModule, // CPQ Phase 4 - Quote and order analytics
    TerritoriesModule, // Sales territory management with auto-assignment rules
    PlaybooksModule, // Sales playbooks with step-by-step execution tracking
    DigitalWorkersModule, // AI Digital Workers - signals, coaching agenda, recommendations
    IntegrationsModule, // External integrations - Snowflake, ZoomInfo, Microsoft 365
    CollaborationModule, // Real-time collaboration - presence tracking and record locking
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CacheService, // Global cache service
    AzureOpenAIRetryService, // Global retry service for Azure OpenAI
    CsrfService, // CSRF token service for guard
    // Global rate limiting guard - applies to all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global CSRF protection guard - validates CSRF tokens on state-changing requests
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    // Global organization guard - enforces multi-tenant isolation
    // Validates that users belong to the organization they're accessing
    {
      provide: APP_GUARD,
      useClass: OrganizationGuard,
    },
    // Global RLS context interceptor - sets PostgreSQL RLS context for tenant isolation
    // This provides database-level isolation as a defense-in-depth measure
    {
      provide: APP_INTERCEPTOR,
      useClass: RlsContextInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply OrganizationMiddleware to all routes except auth and public endpoints
    consumer
      .apply(OrganizationMiddleware)
      .exclude(
        'auth/(.*)',
        'health',
        'waitlist/(.*)',
        'support/tickets/public',
        'web-forms/submit/(.*)',
      )
      .forRoutes('*');
  }
}
