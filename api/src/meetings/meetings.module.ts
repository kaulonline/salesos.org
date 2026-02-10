import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { MeetingsController } from './meetings.controller';
import { PendingActionsController } from './pending-actions.controller';
import { MeetingsService } from './meetings.service';
import { PendingActionsService } from './services/pending-actions.service';
import { MeetingAnalyzerService } from './services/meeting-analyzer.service';
import { TranscriptProcessorService } from './services/transcript-processor.service';
import { CrmUpdaterService } from './services/crm-updater.service';
// Data quality guardrails
import { MeetingDataValidatorService } from './services/meeting-data-validator.service';
import { CrmAuditService } from './services/crm-audit.service';
// Native platform integrations (no external bot required)
import { ZoomService } from './services/zoom.service';
import { TeamsService } from './services/teams.service';
import { GoogleMeetService } from './services/google-meet.service';
import { MeetingOrchestratorService } from './services/meeting-orchestrator.service';
// Zoom Meeting SDK Bot services
import { ZoomBotService } from './services/zoom-bot.service';
import { MeetingBotOrchestrator } from './services/meeting-bot-orchestrator.service';
import { TranscriptionService } from './services/transcription.service';
// WebSocket Gateway for real-time streaming
import { MeetingWebSocketGateway } from './gateways/meeting-websocket.gateway';
// Health monitoring
import { MeetingHealthService } from './services/meeting-health.service';
// Queue management
import { MeetingQueueService } from './services/meeting-queue.service';
// Lifecycle management
import { MeetingLifecycleService } from './services/meeting-lifecycle.service';
// URL parsing for ad-hoc meetings
import { MeetingUrlParserService } from './services/meeting-url-parser.service';
// Attendee open-source meeting bot service
import { AttendeeService } from './attendee.service';
// WebRTC-based real-time transcription
import { MeetingRealtimeService } from './services/meeting-realtime.service';
// RSVP & invite response tracking
import { MeetingInviteResponseService } from './services/meeting-invite-response.service';
// RSVP sync scheduling
import { MeetingResponseSyncService } from './services/meeting-response-sync.service';
// Meeting intelligence / prep
import { MeetingPrepService } from './services/meeting-prep.service';
// Post-meeting auto-summary
import { MeetingAutoSummaryService } from './services/meeting-auto-summary.service';
// External meeting integration sync (Gong, Calendly)
import { MeetingIntegrationSyncService } from './services/meeting-integration-sync.service';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { GongModule } from '../integrations/gong/gong.module';
import { CalendlyModule } from '../integrations/calendly/calendly.module';
import { SearchModule } from '../search/search.module';
import { ActivitiesModule } from '../activities/activities.module';
import { TasksModule } from '../tasks/tasks.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { AccountsModule } from '../accounts/accounts.module';
import { ContactsModule } from '../contacts/contacts.module';
import { SalesforceModule } from '../salesforce/salesforce.module';
import { NotificationsModule } from '../notifications/notifications.module';
// Note: EmailModule is @Global() so no import needed

@Module({
  imports: [
    HttpModule, // Required for platform API calls
    EventEmitterModule.forRoot(), // For event-driven bot coordination
    ScheduleModule.forRoot(), // For scheduled bot joins
    AnthropicModule,
    SearchModule, // Required for meeting prep company research
    ActivitiesModule,
    TasksModule,
    OpportunitiesModule,
    AccountsModule,
    ContactsModule,
    SalesforceModule,
    NotificationsModule, // Required for MeetingAutoSummaryService
    GongModule, // External call recording sync
    CalendlyModule, // External scheduling sync
    // Note: EmailModule is @Global() so no import needed here
  ],
  controllers: [PendingActionsController, MeetingsController],
  providers: [
    MeetingsService,
    PendingActionsService,
    MeetingAnalyzerService,
    TranscriptProcessorService,
    CrmUpdaterService,
    // Data quality guardrails
    MeetingDataValidatorService, // Validates & sanitizes meeting data
    CrmAuditService, // Audit logging for all CRM changes
    // Native platform services (replaces Attendee bot)
    ZoomService,
    TeamsService,
    GoogleMeetService,
    MeetingOrchestratorService, // Unified orchestration
    // Zoom Meeting SDK Bot services
    ZoomBotService, // Headless bot for joining meetings
    MeetingBotOrchestrator, // Bot lifecycle management
    TranscriptionService, // Audio transcription via Azure Whisper
    // WebSocket Gateway for real-time streaming
    MeetingWebSocketGateway, // Real-time transcript updates to frontend
    // Health monitoring
    MeetingHealthService, // Health checks and metrics
    // Queue management
    MeetingQueueService, // Rate limiting and job queue
    // Lifecycle management
    MeetingLifecycleService, // Graceful shutdown coordination
    // URL parsing
    MeetingUrlParserService, // Parse meeting URLs from any platform
    // Attendee service
    AttendeeService, // Open-source meeting bot integration
    // WebRTC-based real-time transcription
    MeetingRealtimeService, // Azure OpenAI Realtime API integration
    // RSVP & invite response tracking
    MeetingInviteResponseService, // Track RSVP responses and cancellations
    MeetingResponseSyncService, // Scheduled sync of calendar responses
    // Meeting intelligence / prep
    MeetingPrepService, // AI-powered meeting preparation briefings
    // Post-meeting auto-summary
    MeetingAutoSummaryService, // AI-powered post-meeting summary with action items
    // External meeting integration sync
    MeetingIntegrationSyncService, // Gong call import + Calendly event sync
  ],
  exports: [
    MeetingsService,
    PendingActionsService,
    MeetingAnalyzerService,
    MeetingOrchestratorService,
    MeetingDataValidatorService, // Export for use by other modules
    CrmAuditService, // Export for audit access
    ZoomService,
    TeamsService,
    GoogleMeetService,
    ZoomBotService,
    MeetingBotOrchestrator,
    TranscriptionService,
    MeetingWebSocketGateway,
    MeetingHealthService,
    MeetingQueueService,
    MeetingLifecycleService,
    MeetingUrlParserService,
    AttendeeService, // Export for use by other modules
    MeetingInviteResponseService, // Export for RSVP tracking
    MeetingRealtimeService, // Export for WebRTC real-time transcription
    MeetingPrepService, // Export for meeting intelligence
    MeetingAutoSummaryService, // Export for post-meeting summary
    MeetingIntegrationSyncService, // Export for on-demand sync
  ],
})
export class MeetingsModule {}
