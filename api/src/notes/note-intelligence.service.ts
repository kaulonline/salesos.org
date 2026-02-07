/**
 * Note Intelligence Service
 *
 * AI-powered note analysis that extracts:
 * - Action items (with assignee, due date, priority)
 * - CRM field updates (budget, timeline, decision makers)
 * - Entity linking suggestions
 * - Sentiment analysis
 *
 * Supports voice transcription via Azure Whisper and
 * generates pending actions for human-in-the-loop approval.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { Note, NoteProcessingStatus, NoteActionType, NoteActionStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Extraction result interfaces
export interface ExtractedEntity {
  name: string;
  type: 'person' | 'company' | 'amount' | 'date' | 'product';
  value?: string;
  confidence: number;
}

export interface ExtractedActionItem {
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  sourceText: string;
}

export interface ProposedCrmUpdate {
  entityType: 'opportunity' | 'lead' | 'account' | 'contact';
  entityId?: string;
  entityName?: string;
  fieldName: string;
  currentValue?: any;
  proposedValue: any;
  confidence: number;
  reasoning: string;
}

export interface SuggestedEntityLink {
  entityType: 'lead' | 'account' | 'contact' | 'opportunity';
  entityId?: string;
  entityName: string;
  confidence: number;
  reasoning: string;
}

export interface SentimentAnalysis {
  overall: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
  positiveSignals: string[];
  negativeSignals: string[];
  riskFactors: string[];
}

export interface NoteExtractionResult {
  entities: ExtractedEntity[];
  actionItems: ExtractedActionItem[];
  crmUpdates: ProposedCrmUpdate[];
  suggestedLinks: SuggestedEntityLink[];
  sentiment: SentimentAnalysis;
  summary: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  language?: string;
  duration?: number;
}

@Injectable()
export class NoteIntelligenceService {
  private readonly logger = new Logger(NoteIntelligenceService.name);

  // Azure Whisper configuration
  private readonly whisperEndpoint: string;
  private readonly whisperApiKey: string;
  private readonly whisperDeployment: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly anthropicService: AnthropicService,
  ) {
    this.whisperEndpoint = this.configService.get<string>('AZURE_WHISPER_ENDPOINT') || '';
    this.whisperApiKey = this.configService.get<string>('AZURE_WHISPER_API_KEY') || '';
    this.whisperDeployment = this.configService.get<string>('AZURE_WHISPER_DEPLOYMENT') || 'whisper';
  }

  /**
   * Process a note: extract insights and generate pending actions
   */
  async processNote(noteId: string, userId: string): Promise<Note> {
    this.logger.log(`Processing note ${noteId} for user ${userId}`);

    // Update status to processing
    await this.prisma.note.update({
      where: { id: noteId },
      data: { processingStatus: NoteProcessingStatus.PROCESSING },
    });

    try {
      const note = await this.prisma.note.findUnique({
        where: { id: noteId },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          account: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          opportunity: { select: { id: true, name: true, stage: true, amount: true } },
        },
      });

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      // Get the text to analyze (transcription or body)
      const textToAnalyze = note.transcription || note.body;

      // Extract insights using AI
      const extraction = await this.extractInsights(textToAnalyze, {
        linkedLead: note.lead,
        linkedAccount: note.account,
        linkedContact: note.contact,
        linkedOpportunity: note.opportunity,
      });

      // Create pending actions from extraction
      await this.createPendingActions(noteId, userId, extraction);

      // Update note with extraction results
      const updatedNote = await this.prisma.note.update({
        where: { id: noteId },
        data: {
          processingStatus: extraction.actionItems.length > 0 || extraction.crmUpdates.length > 0
            ? NoteProcessingStatus.PENDING_REVIEW
            : NoteProcessingStatus.COMPLETED,
          processedAt: new Date(),
          extractedData: extraction as any,
        },
        include: {
          pendingActions: true,
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          account: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          opportunity: { select: { id: true, name: true, stage: true } },
        },
      });

      this.logger.log(`Note ${noteId} processed: ${extraction.actionItems.length} actions, ${extraction.crmUpdates.length} CRM updates`);
      return updatedNote;

    } catch (error) {
      this.logger.error(`Failed to process note ${noteId}: ${error.message}`);

      await this.prisma.note.update({
        where: { id: noteId },
        data: { processingStatus: NoteProcessingStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Transcribe audio file using Azure Whisper
   */
  async transcribeAudio(filePath: string): Promise<TranscriptionResult> {
    if (!this.whisperEndpoint || !this.whisperApiKey) {
      throw new Error('Azure Whisper not configured. Set AZURE_WHISPER_ENDPOINT and AZURE_WHISPER_API_KEY.');
    }

    const FormData = require('form-data');
    const axios = require('axios');

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: this.getAudioMimeType(fileName),
      });
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', 'segment');

      const url = `${this.whisperEndpoint}/openai/deployments/${this.whisperDeployment}/audio/transcriptions?api-version=2024-02-01`;

      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          'api-key': this.whisperApiKey,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      return {
        text: response.data.text,
        segments: response.data.segments?.map((s: any) => ({
          text: s.text,
          start: s.start,
          end: s.end,
        })),
        language: response.data.language,
        duration: response.data.duration,
      };

    } catch (error) {
      this.logger.error(`Transcription failed: ${error.message}`);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Extract insights from note text using AI
   */
  private async extractInsights(text: string, context: {
    linkedLead?: any;
    linkedAccount?: any;
    linkedContact?: any;
    linkedOpportunity?: any;
  }): Promise<NoteExtractionResult> {
    const contextInfo = this.buildContextString(context);

    const prompt = `Analyze this sales note and extract actionable insights.

${contextInfo ? `CONTEXT (linked CRM records):\n${contextInfo}\n` : ''}
NOTE CONTENT:
${text}

Extract the following and return as JSON:

1. ACTION ITEMS: Tasks that need follow-up
   - Look for: "need to", "should", "will", "follow up", "send", "schedule", "call", "email", "meet"
   - Extract: description, assignee (if mentioned or "me"), dueDate (if mentioned or infer from urgency)
   - Priority: HIGH (urgent, ASAP, today, critical), MEDIUM (this week, soon), LOW (no urgency, when possible)

2. CRM UPDATES: Field values mentioned that could update CRM records
   - Budget/Amount: "$50K budget", "looking to spend $100K", "budget is..."
   - Timeline/CloseDate: "Q2 decision", "by end of month", "looking to implement by..."
   - Decision Makers: "CEO approval needed", "VP of Sales is the buyer"
   - Next Steps: "wants demo", "needs proposal", "send pricing"
   - Stage indicators: "just exploring" (Discovery), "comparing vendors" (Evaluation), "ready to buy" (Negotiation)
   - Lead Status: "interested", "not ready", "qualified"

3. ENTITY SUGGESTIONS: CRM records this note might relate to (if not already linked)
   - Company names → Account
   - Person names with context → Lead or Contact
   - Deal references → Opportunity

4. SENTIMENT: Overall tone and signals
   - Positive: interest, urgency, budget confirmed, timeline committed
   - Negative: objections, delays, competition concerns, budget cuts
   - Risk factors: key person leaving, priority changed, competitor preferred

5. SUMMARY: 1-2 sentence summary of the note

Return ONLY valid JSON in this exact format:
{
  "summary": "string",
  "entities": [
    {"name": "string", "type": "person|company|amount|date|product", "value": "string", "confidence": 0.0-1.0}
  ],
  "actionItems": [
    {"description": "string", "assignee": "string|null", "dueDate": "YYYY-MM-DD|null", "priority": "HIGH|MEDIUM|LOW", "confidence": 0.0-1.0, "sourceText": "original text that triggered this"}
  ],
  "crmUpdates": [
    {"entityType": "opportunity|lead|account|contact", "entityName": "string", "fieldName": "string", "proposedValue": "any", "confidence": 0.0-1.0, "reasoning": "why this update"}
  ],
  "suggestedLinks": [
    {"entityType": "lead|account|contact|opportunity", "entityName": "string", "confidence": 0.0-1.0, "reasoning": "why link to this"}
  ],
  "sentiment": {
    "overall": "VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE",
    "positiveSignals": ["string"],
    "negativeSignals": ["string"],
    "riskFactors": ["string"]
  }
}`;

    try {
      const response = await this.anthropicService.generateChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales AI analyst. Extract actionable insights from sales notes to help automate CRM updates and task creation. Be precise and practical. Only extract what is clearly mentioned or strongly implied. Return valid JSON only, without markdown code blocks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        maxTokens: 2000,
      });

      // Strip markdown code blocks if present (```json ... ```)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        // Remove opening ```json or ``` and closing ```
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      // Parse and validate the response
      const extraction = JSON.parse(jsonStr);

      return {
        summary: extraction.summary || '',
        entities: extraction.entities || [],
        actionItems: extraction.actionItems || [],
        crmUpdates: extraction.crmUpdates || [],
        suggestedLinks: extraction.suggestedLinks || [],
        sentiment: extraction.sentiment || {
          overall: 'NEUTRAL',
          positiveSignals: [],
          negativeSignals: [],
          riskFactors: [],
        },
      };

    } catch (error) {
      this.logger.error(`AI extraction failed: ${error.message}`);

      // Return empty extraction on failure
      return {
        summary: '',
        entities: [],
        actionItems: [],
        crmUpdates: [],
        suggestedLinks: [],
        sentiment: {
          overall: 'NEUTRAL',
          positiveSignals: [],
          negativeSignals: [],
          riskFactors: [],
        },
      };
    }
  }

  /**
   * Create pending actions from extraction results
   */
  private async createPendingActions(
    noteId: string,
    userId: string,
    extraction: NoteExtractionResult,
  ): Promise<void> {
    const actions: any[] = [];

    // Create task actions from action items
    for (const item of extraction.actionItems) {
      actions.push({
        noteId,
        userId,
        actionType: NoteActionType.CREATE_TASK,
        status: NoteActionStatus.PENDING,
        targetEntity: 'task',
        proposedValue: {
          subject: item.description,
          assignee: item.assignee,
          dueDate: item.dueDate,
          priority: item.priority,
          description: `From note: ${item.sourceText}`,
        },
        confidence: item.confidence,
        reasoning: `Action item detected: "${item.sourceText}"`,
        sourceText: item.sourceText,
      });
    }

    // Create CRM update actions
    for (const update of extraction.crmUpdates) {
      let actionType: NoteActionType;
      switch (update.entityType) {
        case 'opportunity':
          actionType = NoteActionType.UPDATE_OPPORTUNITY;
          break;
        case 'lead':
          actionType = NoteActionType.UPDATE_LEAD;
          break;
        case 'account':
          actionType = NoteActionType.UPDATE_ACCOUNT;
          break;
        case 'contact':
          actionType = NoteActionType.UPDATE_CONTACT;
          break;
        default:
          continue;
      }

      actions.push({
        noteId,
        userId,
        actionType,
        status: NoteActionStatus.PENDING,
        targetEntity: update.entityType,
        targetEntityId: update.entityId,
        fieldName: update.fieldName,
        proposedValue: update.proposedValue,
        confidence: update.confidence,
        reasoning: update.reasoning,
      });
    }

    // Create entity link suggestions
    for (const link of extraction.suggestedLinks) {
      actions.push({
        noteId,
        userId,
        actionType: NoteActionType.LINK_TO_ENTITY,
        status: NoteActionStatus.PENDING,
        targetEntity: link.entityType,
        targetEntityId: link.entityId,
        proposedValue: { entityName: link.entityName },
        confidence: link.confidence,
        reasoning: link.reasoning,
      });
    }

    // Batch create all pending actions
    if (actions.length > 0) {
      await this.prisma.pendingNoteAction.createMany({
        data: actions,
      });
      this.logger.log(`Created ${actions.length} pending actions for note ${noteId}`);
    }
  }

  /**
   * Build context string from linked entities
   */
  private buildContextString(context: {
    linkedLead?: any;
    linkedAccount?: any;
    linkedContact?: any;
    linkedOpportunity?: any;
  }): string {
    const parts: string[] = [];

    if (context.linkedLead) {
      const lead = context.linkedLead;
      parts.push(`Lead: ${lead.firstName} ${lead.lastName}${lead.company ? ` (${lead.company})` : ''}`);
    }

    if (context.linkedAccount) {
      parts.push(`Account: ${context.linkedAccount.name}`);
    }

    if (context.linkedContact) {
      const contact = context.linkedContact;
      parts.push(`Contact: ${contact.firstName} ${contact.lastName}`);
    }

    if (context.linkedOpportunity) {
      const opp = context.linkedOpportunity;
      parts.push(`Opportunity: ${opp.name} (Stage: ${opp.stage}, Amount: ${opp.amount || 'TBD'})`);
    }

    return parts.join('\n');
  }

  /**
   * Get MIME type for audio file
   */
  private getAudioMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.m4a': 'audio/m4a',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
    };
    return mimeTypes[ext] || 'audio/mpeg';
  }

  /**
   * Re-process a note (useful for manual retry or content changes)
   */
  async reprocessNote(noteId: string, userId: string): Promise<Note> {
    // Delete existing pending actions that haven't been executed
    await this.prisma.pendingNoteAction.deleteMany({
      where: {
        noteId,
        status: { in: [NoteActionStatus.PENDING, NoteActionStatus.REJECTED] },
      },
    });

    return this.processNote(noteId, userId);
  }

  /**
   * Get extraction results for a note
   */
  async getExtractionResults(noteId: string): Promise<NoteExtractionResult | null> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      select: { extractedData: true },
    });

    return note?.extractedData as NoteExtractionResult | null;
  }
}
