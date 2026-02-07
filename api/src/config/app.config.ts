import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  anthropic: {
    apiKey: string;
    endpoint: string;
    deployment: string;
    enabled: boolean;
  };
  meetingIntelligence: {
    autoUpdateCrm: boolean;
    autoCreateTasks: boolean;
    autoUpdateOpportunity: boolean;
    autoStoreInsights: boolean;
    minTranscriptLength: number;
    // Validation guardrails
    minInsightConfidence: number;
    minBuyingSignalConfidence: number;
    maxActionItemsPerMeeting: number;
    maxInsightsPerMeeting: number;
    maxProbabilityChange: number;
    enableContentFiltering: boolean;
    enableDuplicateDetection: boolean;
    enableAuditLogging: boolean;
  };
}

export default registerAs<AppConfig>('app', () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    endpoint: process.env.ANTHROPIC_ENDPOINT ?? '',
    deployment: process.env.ANTHROPIC_DEPLOYMENT_NAME ?? '',
    enabled: (process.env.USE_ANTHROPIC ?? 'true').toLowerCase() === 'true',
  },
  meetingIntelligence: {
    // Enable automatic CRM updates after meeting analysis
    autoUpdateCrm: (process.env.MEETING_AUTO_UPDATE_CRM ?? 'true').toLowerCase() === 'true',
    // Automatically create tasks from action items
    autoCreateTasks: (process.env.MEETING_AUTO_CREATE_TASKS ?? 'true').toLowerCase() === 'true',
    // Automatically update opportunity stage and probability
    autoUpdateOpportunity: (process.env.MEETING_AUTO_UPDATE_OPPORTUNITY ?? 'true').toLowerCase() === 'true',
    // Automatically store meeting insights (buying signals, objections, etc.)
    autoStoreInsights: (process.env.MEETING_AUTO_STORE_INSIGHTS ?? 'true').toLowerCase() === 'true',
    // Minimum transcript length (chars) to trigger analysis
    minTranscriptLength: parseInt(process.env.MEETING_MIN_TRANSCRIPT_LENGTH ?? '100', 10),
    
    // === VALIDATION GUARDRAILS ===
    // Minimum confidence score (0-1) for insights to be stored
    minInsightConfidence: parseFloat(process.env.MEETING_MIN_INSIGHT_CONFIDENCE ?? '0.5'),
    // Minimum confidence for buying signals (higher threshold for stronger signals)
    minBuyingSignalConfidence: parseFloat(process.env.MEETING_MIN_BUYING_SIGNAL_CONFIDENCE ?? '0.6'),
    // Maximum action items per meeting (prevents junk data floods)
    maxActionItemsPerMeeting: parseInt(process.env.MEETING_MAX_ACTION_ITEMS ?? '20', 10),
    // Maximum insights per meeting
    maxInsightsPerMeeting: parseInt(process.env.MEETING_MAX_INSIGHTS ?? '50', 10),
    // Maximum probability change allowed per meeting (prevents wild swings)
    maxProbabilityChange: parseInt(process.env.MEETING_MAX_PROBABILITY_CHANGE ?? '30', 10),
    // Filter out junk/spam content
    enableContentFiltering: (process.env.MEETING_ENABLE_CONTENT_FILTERING ?? 'true').toLowerCase() === 'true',
    // Check for duplicate action items/insights
    enableDuplicateDetection: (process.env.MEETING_ENABLE_DUPLICATE_DETECTION ?? 'true').toLowerCase() === 'true',
    // Log all CRM changes for audit trail
    enableAuditLogging: (process.env.MEETING_ENABLE_AUDIT_LOGGING ?? 'true').toLowerCase() === 'true',
  },
}));
