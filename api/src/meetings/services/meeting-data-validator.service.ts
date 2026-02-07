import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MeetingAnalysisResultDto, ActionItemDto } from '../dto';

/**
 * Validation result with details about what passed/failed
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

/**
 * Configuration for validation thresholds
 */
export interface ValidationConfig {
  // Minimum confidence score for insights (0-1)
  minInsightConfidence: number;
  // Minimum confidence for buying signals
  minBuyingSignalConfidence: number;
  // Minimum transcript length to consider valid
  minTranscriptLength: number;
  // Maximum action items per meeting (sanity check)
  maxActionItemsPerMeeting: number;
  // Maximum insights per meeting
  maxInsightsPerMeeting: number;
  // Minimum action item text length
  minActionItemLength: number;
  // Maximum action item text length
  maxActionItemLength: number;
  // Block profanity/inappropriate content
  enableContentFiltering: boolean;
  // Require assignee for high-priority tasks
  requireAssigneeForHighPriority: boolean;
  // Maximum probability change allowed per meeting
  maxProbabilityChange: number;
  // Allowed stage transitions (prevent invalid jumps)
  allowedStageTransitions: Record<string, string[]>;
}

/**
 * Service responsible for validating and sanitizing meeting data
 * before it's written to the CRM to prevent junk data.
 */
@Injectable()
export class MeetingDataValidatorService {
  private readonly logger = new Logger(MeetingDataValidatorService.name);
  
  private readonly config: ValidationConfig;

  // Common spam/junk patterns to filter out
  private readonly junkPatterns = [
    /^test$/i,
    /^asdf/i,
    /^lorem ipsum/i,
    /^xxx+$/i,
    /^placeholder/i,
    /^todo$/i,
    /^tbd$/i,
    /^n\/a$/i,
    /^\[.*\]$/,  // Just brackets like [action item]
    /^\.+$/,     // Just dots
    /^-+$/,      // Just dashes
  ];

  // Patterns that indicate generic/unhelpful action items
  private readonly genericActionPatterns = [
    /^follow up$/i,
    /^do something$/i,
    /^action item$/i,
    /^task$/i,
    /^check$/i,
    /^review$/i,
    /^look into$/i,
  ];

  // Valid opportunity stages for transition validation
  private readonly validStages = [
    'PROSPECTING',
    'QUALIFICATION',
    'NEEDS_ANALYSIS',
    'VALUE_PROPOSITION',
    'DECISION_MAKERS',
    'PERCEPTION_ANALYSIS',
    'PROPOSAL',
    'NEGOTIATION',
    'CLOSED_WON',
    'CLOSED_LOST',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Load configuration with sensible defaults
    this.config = {
      minInsightConfidence: parseFloat(
        this.configService.get('MEETING_MIN_INSIGHT_CONFIDENCE', '0.5')
      ),
      minBuyingSignalConfidence: parseFloat(
        this.configService.get('MEETING_MIN_BUYING_SIGNAL_CONFIDENCE', '0.6')
      ),
      minTranscriptLength: parseInt(
        this.configService.get('MEETING_MIN_TRANSCRIPT_LENGTH', '100')
      ),
      maxActionItemsPerMeeting: parseInt(
        this.configService.get('MEETING_MAX_ACTION_ITEMS', '20')
      ),
      maxInsightsPerMeeting: parseInt(
        this.configService.get('MEETING_MAX_INSIGHTS', '50')
      ),
      minActionItemLength: 10,
      maxActionItemLength: 500,
      enableContentFiltering: true,
      requireAssigneeForHighPriority: false,
      maxProbabilityChange: 30, // Max 30% change per meeting
      allowedStageTransitions: {
        'PROSPECTING': ['QUALIFICATION', 'CLOSED_LOST'],
        'QUALIFICATION': ['NEEDS_ANALYSIS', 'PROSPECTING', 'CLOSED_LOST'],
        'NEEDS_ANALYSIS': ['VALUE_PROPOSITION', 'QUALIFICATION', 'CLOSED_LOST'],
        'VALUE_PROPOSITION': ['DECISION_MAKERS', 'NEEDS_ANALYSIS', 'CLOSED_LOST'],
        'DECISION_MAKERS': ['PERCEPTION_ANALYSIS', 'VALUE_PROPOSITION', 'CLOSED_LOST'],
        'PERCEPTION_ANALYSIS': ['PROPOSAL', 'DECISION_MAKERS', 'CLOSED_LOST'],
        'PROPOSAL': ['NEGOTIATION', 'PERCEPTION_ANALYSIS', 'CLOSED_LOST'],
        'NEGOTIATION': ['CLOSED_WON', 'CLOSED_LOST', 'PROPOSAL'],
        'CLOSED_WON': [], // Terminal state
        'CLOSED_LOST': ['PROSPECTING'], // Can be reopened
      },
    };

    this.logger.log('Meeting Data Validator initialized with config:', this.config);
  }

  /**
   * Validate and sanitize the entire meeting analysis before CRM updates
   */
  async validateAnalysis(
    analysis: MeetingAnalysisResultDto,
    meetingId: string,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate basic structure
    if (!analysis) {
      return { isValid: false, errors: ['Analysis is null or undefined'], warnings: [] };
    }

    // 2. Validate action items
    const actionItemsResult = this.validateActionItems(analysis.actionItems || []);
    errors.push(...actionItemsResult.errors);
    warnings.push(...actionItemsResult.warnings);

    // 3. Validate buying signals
    const buyingSignalsResult = this.validateBuyingSignals(analysis.buyingSignals || []);
    errors.push(...buyingSignalsResult.errors);
    warnings.push(...buyingSignalsResult.warnings);

    // 4. Validate stage recommendation
    if (analysis.stageRecommendation) {
      const stageResult = await this.validateStageTransition(
        meetingId,
        analysis.stageRecommendation
      );
      errors.push(...stageResult.errors);
      warnings.push(...stageResult.warnings);
    }

    // 5. Validate probability change
    if (analysis.probabilityChange) {
      const probResult = this.validateProbabilityChange(analysis.probabilityChange);
      errors.push(...probResult.errors);
      warnings.push(...probResult.warnings);
    }

    // 6. Validate budget mentioned
    if (analysis.budgetMentioned !== undefined && analysis.budgetMentioned !== null) {
      const budgetResult = this.validateBudget(analysis.budgetMentioned);
      errors.push(...budgetResult.errors);
      warnings.push(...budgetResult.warnings);
    }

    // 7. Check for duplicate insights (against existing data)
    const duplicateResult = await this.checkForDuplicates(meetingId, analysis);
    warnings.push(...duplicateResult.warnings);

    // 8. Sanitize the analysis data
    const sanitizedData = this.sanitizeAnalysis(analysis);

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn(`Validation failed for meeting ${meetingId}: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      this.logger.log(`Validation warnings for meeting ${meetingId}: ${warnings.join(', ')}`);
    }

    return {
      isValid,
      errors,
      warnings,
      sanitizedData,
    };
  }

  /**
   * Validate action items for quality and sanity
   */
  validateActionItems(actionItems: ActionItemDto[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validItems: ActionItemDto[] = [];

    if (actionItems.length > this.config.maxActionItemsPerMeeting) {
      warnings.push(
        `Too many action items (${actionItems.length}), limiting to ${this.config.maxActionItemsPerMeeting}`
      );
    }

    for (const item of actionItems.slice(0, this.config.maxActionItemsPerMeeting)) {
      const itemErrors: string[] = [];

      // Check for empty/null text
      if (!item.text || item.text.trim().length === 0) {
        itemErrors.push('Action item has empty text');
        continue;
      }

      const text = item.text.trim();

      // Check minimum length
      if (text.length < this.config.minActionItemLength) {
        warnings.push(`Action item too short: "${text}"`);
        continue;
      }

      // Check maximum length
      if (text.length > this.config.maxActionItemLength) {
        warnings.push(`Action item too long, truncating: "${text.slice(0, 50)}..."`);
        item.text = text.slice(0, this.config.maxActionItemLength);
      }

      // Check for junk patterns
      if (this.isJunkText(text)) {
        warnings.push(`Filtered junk action item: "${text}"`);
        continue;
      }

      // Check for generic/unhelpful action items
      if (this.isGenericActionItem(text)) {
        warnings.push(`Filtered generic action item: "${text}"`);
        continue;
      }

      // Validate priority
      if (item.priority && !['HIGH', 'MEDIUM', 'LOW'].includes(item.priority.toUpperCase())) {
        item.priority = 'MEDIUM';
        warnings.push(`Invalid priority corrected for: "${text}"`);
      }

      // Validate due date
      if (item.dueDate) {
        const dueDate = new Date(item.dueDate);
        if (isNaN(dueDate.getTime())) {
          item.dueDate = undefined;
          warnings.push(`Invalid due date removed for: "${text}"`);
        } else if (dueDate < new Date()) {
          // Don't create tasks with past due dates
          item.dueDate = undefined;
          warnings.push(`Past due date removed for: "${text}"`);
        } else if (dueDate > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) {
          // Don't allow due dates more than 1 year out
          item.dueDate = undefined;
          warnings.push(`Due date too far in future removed for: "${text}"`);
        }
      }

      // Sanitize assignee
      if (item.assignee) {
        item.assignee = this.sanitizeText(item.assignee);
        if (item.assignee.length < 2) {
          item.assignee = undefined;
        }
      }

      // High priority items should ideally have assignees
      if (
        this.config.requireAssigneeForHighPriority &&
        item.priority?.toUpperCase() === 'HIGH' &&
        !item.assignee
      ) {
        warnings.push(`High priority item without assignee: "${text}"`);
      }

      validItems.push(item);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: validItems,
    };
  }

  /**
   * Validate buying signals with confidence threshold
   */
  validateBuyingSignals(
    buyingSignals: Array<{ signal: string; confidence: number; context?: string }>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validSignals: Array<{ signal: string; confidence: number; context?: string }> = [];

    for (const signal of buyingSignals) {
      // Check confidence threshold
      if (signal.confidence < this.config.minBuyingSignalConfidence) {
        warnings.push(
          `Filtered low-confidence buying signal (${signal.confidence}): "${signal.signal}"`
        );
        continue;
      }

      // Check for empty signal text
      if (!signal.signal || signal.signal.trim().length < 5) {
        warnings.push('Filtered empty or too short buying signal');
        continue;
      }

      // Check for junk
      if (this.isJunkText(signal.signal)) {
        warnings.push(`Filtered junk buying signal: "${signal.signal}"`);
        continue;
      }

      // Sanitize
      signal.signal = this.sanitizeText(signal.signal);
      if (signal.context) {
        signal.context = this.sanitizeText(signal.context);
      }

      // Normalize confidence to 0-1 range
      if (signal.confidence > 1) {
        signal.confidence = signal.confidence / 100;
      }
      signal.confidence = Math.min(1, Math.max(0, signal.confidence));

      validSignals.push(signal);
    }

    return {
      isValid: true,
      errors,
      warnings,
      sanitizedData: validSignals,
    };
  }

  /**
   * Validate stage transition is allowed
   */
  async validateStageTransition(
    meetingId: string,
    newStage: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Normalize stage name
    const normalizedStage = newStage.toUpperCase().replace(/\s+/g, '_');

    // Check if it's a valid stage
    if (!this.validStages.includes(normalizedStage)) {
      errors.push(`Invalid stage: ${newStage}`);
      return { isValid: false, errors, warnings };
    }

    // Get current opportunity stage
    try {
      const meeting = await this.prisma.meetingSession.findUnique({
        where: { id: meetingId },
        include: { opportunity: true },
      });

      if (meeting?.opportunity) {
        const currentStage = meeting.opportunity.stage?.toUpperCase().replace(/\s+/g, '_');
        const allowedTransitions = this.config.allowedStageTransitions[currentStage] || [];

        if (currentStage && !allowedTransitions.includes(normalizedStage)) {
          warnings.push(
            `Stage transition from ${currentStage} to ${normalizedStage} is unusual - flagged for review`
          );
        }

        // Prevent moving backwards multiple stages (potential error)
        const currentIndex = this.validStages.indexOf(currentStage);
        const newIndex = this.validStages.indexOf(normalizedStage);
        if (currentIndex - newIndex > 1 && !normalizedStage.includes('CLOSED')) {
          warnings.push(
            `Stage moving backwards multiple steps: ${currentStage} -> ${normalizedStage}`
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to validate stage transition: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: normalizedStage,
    };
  }

  /**
   * Validate probability change is within reasonable bounds
   */
  validateProbabilityChange(change: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedChange = change;

    // Cap the change at configured maximum
    if (Math.abs(change) > this.config.maxProbabilityChange) {
      warnings.push(
        `Probability change ${change}% exceeds max ${this.config.maxProbabilityChange}%, capping`
      );
      sanitizedChange = change > 0 
        ? this.config.maxProbabilityChange 
        : -this.config.maxProbabilityChange;
    }

    return {
      isValid: true,
      errors,
      warnings,
      sanitizedData: sanitizedChange,
    };
  }

  /**
   * Validate budget value is reasonable
   */
  validateBudget(budget: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for negative budgets
    if (budget < 0) {
      errors.push('Budget cannot be negative');
      return { isValid: false, errors, warnings };
    }

    // Check for unreasonably large budgets (potential parsing error)
    if (budget > 1_000_000_000_000) { // 1 trillion
      warnings.push(`Unusually large budget: $${budget.toLocaleString()}, verify accuracy`);
    }

    // Check for suspiciously round numbers that might be placeholders
    if (budget === 1000000 || budget === 100000 || budget === 10000) {
      warnings.push(`Budget appears to be a round number placeholder: $${budget}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: budget,
    };
  }

  /**
   * Check for duplicate insights to prevent redundant data
   */
  async checkForDuplicates(
    meetingId: string,
    analysis: MeetingAnalysisResultDto
  ): Promise<ValidationResult> {
    const warnings: string[] = [];

    try {
      // Get meeting's opportunity/lead context
      const meeting = await this.prisma.meetingSession.findUnique({
        where: { id: meetingId },
        select: { opportunityId: true, leadId: true, accountId: true },
      });

      if (!meeting) return { isValid: true, errors: [], warnings };

      // Check for duplicate action items (same text within last 7 days)
      if (analysis.actionItems && analysis.actionItems.length > 0) {
        const recentTasks = await this.prisma.task.findMany({
          where: {
            OR: [
              { opportunityId: meeting.opportunityId },
              { leadId: meeting.leadId },
              { accountId: meeting.accountId },
            ],
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          select: { subject: true },
        });

        const existingSubjects = new Set(
          recentTasks.map(t => t.subject.toLowerCase().trim())
        );

        for (const item of analysis.actionItems) {
          const normalizedText = item.text.toLowerCase().trim();
          if (existingSubjects.has(normalizedText)) {
            warnings.push(`Potential duplicate action item: "${item.text}"`);
          }
        }
      }

      // Check for very similar recent insights
      const recentInsights = await this.prisma.meetingInsight.findMany({
        where: {
          meetingSession: {
            OR: [
              { opportunityId: meeting.opportunityId },
              { leadId: meeting.leadId },
              { accountId: meeting.accountId },
            ],
          },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { description: true, type: true },
      });

      // Simple similarity check for buying signals
      for (const signal of analysis.buyingSignals || []) {
        for (const existing of recentInsights.filter(i => i.type === 'BUYING_SIGNAL')) {
          if (this.areSimilar(signal.signal, existing.description)) {
            warnings.push(`Similar buying signal already recorded: "${signal.signal}"`);
            break;
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Duplicate check failed: ${error}`);
    }

    return { isValid: true, errors: [], warnings };
  }

  /**
   * Sanitize the entire analysis object
   */
  sanitizeAnalysis(analysis: MeetingAnalysisResultDto): MeetingAnalysisResultDto {
    return {
      ...analysis,
      executiveSummary: analysis.executiveSummary 
        ? this.sanitizeText(analysis.executiveSummary) 
        : '',
      detailedSummary: analysis.detailedSummary 
        ? this.sanitizeText(analysis.detailedSummary) 
        : '',
      keyPoints: (analysis.keyPoints || [])
        .map(p => this.sanitizeText(p))
        .filter(p => p.length > 0 && !this.isJunkText(p)),
      actionItems: (analysis.actionItems || []).map(item => ({
        ...item,
        text: this.sanitizeText(item.text),
        assignee: item.assignee ? this.sanitizeText(item.assignee) : undefined,
      })),
      decisions: (analysis.decisions || [])
        .map(d => this.sanitizeText(d))
        .filter(d => d.length > 0 && !this.isJunkText(d)),
      questions: (analysis.questions || [])
        .map(q => this.sanitizeText(q))
        .filter(q => q.length > 0),
      concerns: (analysis.concerns || [])
        .map(c => this.sanitizeText(c))
        .filter(c => c.length > 0),
      nextSteps: (analysis.nextSteps || [])
        .map(s => this.sanitizeText(s))
        .filter(s => s.length > 0 && !this.isJunkText(s)),
      recommendedActions: (analysis.recommendedActions || [])
        .map(a => this.sanitizeText(a))
        .filter(a => a.length > 0),
      competitors: (analysis.competitors || [])
        .map(c => this.sanitizeText(c))
        .filter(c => c.length > 0 && c.length < 100), // Company names shouldn't be too long
    };
  }

  /**
   * Sanitize text by removing problematic characters
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Limit consecutive punctuation
      .replace(/([!?.]){3,}/g, '$1$1')
      // Remove potential script tags
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .trim();
  }

  /**
   * Check if text matches junk patterns
   */
  private isJunkText(text: string): boolean {
    const normalized = text.trim().toLowerCase();
    return this.junkPatterns.some(pattern => pattern.test(normalized));
  }

  /**
   * Check if action item is too generic to be useful
   */
  private isGenericActionItem(text: string): boolean {
    const normalized = text.trim().toLowerCase();
    return this.genericActionPatterns.some(pattern => pattern.test(normalized));
  }

  /**
   * Simple similarity check between two strings
   */
  private areSimilar(str1: string, str2: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n1 = normalize(str1);
    const n2 = normalize(str2);
    
    // Check if one contains the other
    if (n1.includes(n2) || n2.includes(n1)) {
      return true;
    }
    
    // Simple word overlap check
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);
    
    // Jaccard similarity > 0.7 means very similar
    return intersection.length / union.size > 0.7;
  }

  /**
   * Validate that a transcript is sufficient for analysis
   */
  validateTranscript(transcript: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!transcript || transcript.trim().length === 0) {
      errors.push('Transcript is empty');
      return { isValid: false, errors, warnings };
    }

    if (transcript.length < this.config.minTranscriptLength) {
      errors.push(
        `Transcript too short (${transcript.length} chars, minimum ${this.config.minTranscriptLength})`
      );
      return { isValid: false, errors, warnings };
    }

    // Check for repetitive content (might indicate transcription error)
    const words = transcript.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    // Check if any single word makes up more than 30% of transcript
    for (const [word, count] of wordCounts) {
      if (word.length > 3 && count / words.length > 0.3) {
        warnings.push(`Transcript may have transcription errors - word "${word}" appears ${count} times`);
        break;
      }
    }

    // Check for test/placeholder content
    if (
      transcript.toLowerCase().includes('test meeting') ||
      transcript.toLowerCase().includes('lorem ipsum') ||
      transcript.toLowerCase().includes('this is a test')
    ) {
      warnings.push('Transcript appears to contain test content');
    }

    return { isValid: true, errors, warnings };
  }
}
