/**
 * IRIS Digital Worker Agent - Learn More Agent
 *
 * Answers questions using multi-source context:
 * - Queries CRM data (accounts, contacts, opportunities)
 * - Searches indexed documents
 * - Synthesizes answers from multiple sources
 * - Provides cited, accurate responses
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AiSdkService } from '../../ai-sdk/ai-sdk.service';
import { CacheService } from '../../cache/cache.service';
import { SalesforceService } from '../../salesforce/salesforce.service';
import { OracleCXService } from '../../oracle-cx/oracle-cx.service';
import { BaseAgentService, DEFAULT_AGENT_LIMITS } from '../base/base-agent.service';
import { createCRMTools } from '../tools/crm-tools';
import {
  AgentType,
  AgentContext,
  AgentConfig,
  AgentTool,
  InsightType,
  Priority,
  CRMEntityType,
} from '../types';

/**
 * Question classification result
 */
interface QuestionClassification {
  category: 'ACCOUNT' | 'CONTACT' | 'DEAL' | 'ACTIVITY' | 'GENERAL' | 'DOCUMENT';
  entityIds: string[];
  keywords: string[];
  requiresDocuments: boolean;
  requiresCRM: boolean;
}

/**
 * Answer with sources
 */
interface AnswerResult {
  answer: string;
  confidence: number;
  sources: Array<{
    type: string;
    name: string;
    excerpt: string;
  }>;
  followUpQuestions: string[];
}

@Injectable()
export class LearnMoreAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.LEARN_MORE;
  protected readonly logger = new Logger(LearnMoreAgentService.name);

  protected readonly config: AgentConfig = {
    type: AgentType.LEARN_MORE,
    name: 'Learn More Agent',
    description: 'Answers questions using multi-source context',
    version: '1.0.0',

    // Manual only - triggered by user questions
    schedule: {
      enabled: false,
    },

    eventTriggers: [],

    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 10,
      maxAlertsPerExecution: 5,
    },

    enabled: true,
    requiresApproval: false,
  };

  constructor(
    prisma: PrismaService,
    aiSdk: AiSdkService,
    eventEmitter: EventEmitter2,
    cacheService: CacheService,
    private readonly sfService: SalesforceService,
    private readonly ocxService: OracleCXService,
  ) {
    super();
    this.initializeBase(prisma, aiSdk, eventEmitter, cacheService, sfService, ocxService);
  }

  protected getTools(): AgentTool[] {
    return createCRMTools(this.prisma);
  }

  protected async executeAgent(context: AgentContext): Promise<void> {
    this.logger.log('Starting Learn More Agent - answering question...');

    // Get question from context metadata
    const question = context.metadata?.question as string;

    if (!question) {
      this.addInsight({
        type: InsightType.INFORMATION,
        priority: Priority.LOW,
        confidence: 1,
        title: 'No Question Provided',
        description: 'Learn More Agent requires a question in context.metadata.question',
      });
      return;
    }

    // Classify the question to determine data sources
    const classification = await this.classifyQuestion(question);
    this.logger.log(`Question classified as: ${classification.category}`);

    // Gather context from relevant sources
    const contextData = await this.gatherContext(classification, context);

    // Generate answer
    const answer = await this.generateAnswer(question, contextData, context);

    // Store answer in context for return
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.MEDIUM,
      confidence: answer.confidence,
      title: 'Answer Generated',
      description: answer.answer,
      metadata: {
        sources: answer.sources,
        followUpQuestions: answer.followUpQuestions,
      },
    });

    // Emit event with answer
    this.eventEmitter.emit('learn-more.answer.ready', {
      question,
      answer: answer.answer,
      sources: answer.sources,
      confidence: answer.confidence,
      userId: context.userId,
    });
  }

  private async classifyQuestion(question: string): Promise<QuestionClassification> {
    const prompt = `Classify this sales-related question to determine what data sources to query.

QUESTION: ${question}

Determine:
1. Category: ACCOUNT, CONTACT, DEAL, ACTIVITY, GENERAL, or DOCUMENT
2. Any specific entity names or IDs mentioned
3. Key search terms
4. Whether document search is needed
5. Whether CRM data is needed

Return JSON:
{
  "category": "ACCOUNT",
  "entityIds": [],
  "keywords": ["keyword1", "keyword2"],
  "requiresDocuments": true,
  "requiresCRM": true
}`;

    const systemPrompt = 'You are a question classifier for a sales CRM system. Classify questions accurately.';

    try {
      return await this.callLLMForJSON<QuestionClassification>(prompt, systemPrompt);
    } catch (error) {
      // Default classification
      return {
        category: 'GENERAL',
        entityIds: [],
        keywords: question.split(' ').filter(w => w.length > 3),
        requiresDocuments: true,
        requiresCRM: true,
      };
    }
  }

  private async gatherContext(classification: QuestionClassification, context: AgentContext): Promise<string> {
    const contextParts: string[] = [];

    // Determine data source
    const sourceInfo = await this.determineDataSource(context.userId!);

    if (classification.requiresCRM) {
      // Query CRM based on category
      switch (classification.category) {
        case 'ACCOUNT':
          const accounts = await this.searchAccounts(classification.keywords, context);
          if (accounts.length > 0) {
            contextParts.push('RELEVANT ACCOUNTS:');
            accounts.forEach(a => {
              contextParts.push(`- ${a.name}: ${a.industry || 'Unknown industry'}, Revenue: ${a.annualRevenue || 'Unknown'}`);
              if (a.description) contextParts.push(`  Description: ${a.description}`);
            });
          }
          break;

        case 'CONTACT':
          const contacts = await this.searchContacts(classification.keywords, context);
          if (contacts.length > 0) {
            contextParts.push('RELEVANT CONTACTS:');
            contacts.forEach(c => {
              contextParts.push(`- ${c.firstName} ${c.lastName}: ${c.title || 'Unknown'} at ${c.account?.name || 'Unknown company'}`);
              contextParts.push(`  Email: ${c.email || 'N/A'}, Phone: ${c.phone || 'N/A'}`);
            });
          }
          break;

        case 'DEAL':
          const opportunities = await this.searchOpportunities(classification.keywords, context);
          if (opportunities.length > 0) {
            contextParts.push('RELEVANT OPPORTUNITIES:');
            opportunities.forEach(o => {
              contextParts.push(`- ${o.name}: $${o.amount || 0} (${o.stage})`);
              contextParts.push(`  Account: ${o.account?.name || 'Unknown'}, Close: ${o.closeDate?.toLocaleDateString() || 'TBD'}`);
            });
          }
          break;

        case 'ACTIVITY':
          const activities = await this.searchActivities(classification.keywords, context);
          if (activities.length > 0) {
            contextParts.push('RELEVANT ACTIVITIES:');
            activities.forEach(a => {
              contextParts.push(`- ${a.type}: ${a.subject} (${a.createdAt.toLocaleDateString()})`);
              if (a.description) contextParts.push(`  ${a.description.substring(0, 200)}...`);
            });
          }
          break;
      }

      // Also get general CRM stats
      const stats = await this.getCRMStats(context);
      contextParts.push('\nCRM OVERVIEW:');
      contextParts.push(`- Total Accounts: ${stats.accounts}`);
      contextParts.push(`- Open Opportunities: ${stats.opportunities} (Value: $${stats.pipelineValue})`);
      contextParts.push(`- Active Contacts: ${stats.contacts}`);
    }

    if (classification.requiresDocuments) {
      // Search indexed documents
      const docs = await this.searchDocuments(classification.keywords, context);
      if (docs.length > 0) {
        contextParts.push('\nRELEVANT DOCUMENTS:');
        docs.forEach(d => {
          contextParts.push(`- ${d.title}: ${d.excerpt}`);
        });
      }
    }

    contextParts.push(`\nData Source: ${sourceInfo.dataSourceLabel}`);

    return contextParts.join('\n') || 'No relevant context found.';
  }

  private async searchAccounts(keywords: string[], context: AgentContext): Promise<any[]> {
    const searchTerm = keywords.join(' ');
    return this.prisma.account.findMany({
      where: {
        ownerId: context.userId,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { industry: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });
  }

  private async searchContacts(keywords: string[], context: AgentContext): Promise<any[]> {
    const searchTerm = keywords.join(' ');
    return this.prisma.contact.findMany({
      where: {
        ownerId: context.userId,
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: { account: true },
      take: 5,
    });
  }

  private async searchOpportunities(keywords: string[], context: AgentContext): Promise<any[]> {
    const searchTerm = keywords.join(' ');
    return this.prisma.opportunity.findMany({
      where: {
        ownerId: context.userId,
        name: { contains: searchTerm, mode: 'insensitive' },
      },
      include: { account: true },
      take: 5,
    });
  }

  private async searchActivities(keywords: string[], context: AgentContext): Promise<any[]> {
    const searchTerm = keywords.join(' ');
    return this.prisma.activity.findMany({
      where: {
        userId: context.userId,
        OR: [
          { subject: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async searchDocuments(keywords: string[], context: AgentContext): Promise<any[]> {
    // Search in indexed documents
    try {
      const searchTerm = keywords.join(' ');
      const documents = await this.prisma.indexedDocument.findMany({
        where: {
          filename: { contains: searchTerm, mode: 'insensitive' },
          status: 'COMPLETE',
        },
        take: 5,
      });

      return documents.map(d => ({
        title: d.filename,
        excerpt: d.summary?.substring(0, 300) || 'No content preview',
      }));
    } catch (error) {
      return [];
    }
  }

  private async getCRMStats(context: AgentContext): Promise<any> {
    const [accounts, contacts, opportunities] = await Promise.all([
      this.prisma.account.count({ where: { ownerId: context.userId } }),
      this.prisma.contact.count({ where: { ownerId: context.userId } }),
      this.prisma.opportunity.findMany({
        where: {
          ownerId: context.userId,
          stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
        },
        select: { amount: true },
      }),
    ]);

    const pipelineValue = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);

    return {
      accounts,
      contacts,
      opportunities: opportunities.length,
      pipelineValue,
    };
  }

  private async generateAnswer(question: string, contextData: string, context: AgentContext): Promise<AnswerResult> {
    const prompt = `Answer this sales question using the provided context. Be specific and cite your sources.

QUESTION: ${question}

CONTEXT:
${contextData}

Provide a comprehensive answer based on the available data. If information is incomplete, acknowledge what's missing. Suggest follow-up questions the user might want to ask.

Return JSON:
{
  "answer": "Your detailed answer here",
  "confidence": 0.85,
  "sources": [
    {"type": "CRM", "name": "Account: Company X", "excerpt": "Key information used"}
  ],
  "followUpQuestions": ["Suggested question 1", "Suggested question 2"]
}`;

    const systemPrompt = `You are a helpful sales assistant with access to CRM data and documents. Provide accurate, actionable answers. Always cite your sources and be transparent about data limitations.`;

    try {
      return await this.callLLMForJSON<AnswerResult>(prompt, systemPrompt);
    } catch (error) {
      return {
        answer: `I was unable to generate a complete answer. Error: ${error}`,
        confidence: 0,
        sources: [],
        followUpQuestions: ['Could you rephrase your question?'],
      };
    }
  }
}
