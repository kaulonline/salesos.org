// Tool Embeddings Service - Fast Semantic Tool Matching
// Uses lightweight embeddings for sub-millisecond tool selection

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// Pre-computed tool embeddings using TF-IDF-like approach
// Each tool has a vector of weighted keyword scores
interface ToolEmbedding {
  name: string;
  description: string;
  vector: number[];
  keywords: string[];
  category: string;
  priority: number; // Higher = more commonly used
}

// Vocabulary for embedding (most important CRM/Salesforce terms)
const VOCABULARY = [
  // Actions
  'show', 'list', 'find', 'search', 'get', 'create', 'add', 'new', 'update',
  'edit', 'change', 'delete', 'remove', 'research', 'describe', 'count',
  // Objects
  'lead', 'leads', 'contact', 'contacts', 'account', 'accounts', 'opportunity',
  'opportunities', 'task', 'tasks', 'record', 'records', 'object', 'objects',
  // Qualifiers
  'all', 'my', 'recent', 'top', 'open', 'closed', 'won', 'lost', 'active',
  // Data operations
  'query', 'soql', 'sosl', 'bulk', 'batch', 'import', 'export',
  // Research
  'company', 'web', 'news', 'info', 'about', 'background', 'competitor',
  // Admin
  'user', 'users', 'profile', 'permission', 'field', 'fields', 'metadata',
  'schema', 'org', 'config', 'setting', 'role', 'group',
  // Email
  'email', 'emails', 'mail', 'send', 'draft', 'drafts', 'compose', 'write',
  'message', 'messages', 'inbox', 'thread', 'threads', 'reply', 'response',
  'awaiting', 'pending', 'followup',
  // Meeting
  'schedule', 'meeting', 'meetings', 'zoom', 'teams', 'meet', 'call', 'video',
  'book', 'calendar', 'invite', 'attendee', 'attendees', 'demo', 'conference',
  'cancel', 'rsvp', 'participant', 'participants', 'upcoming', 'scheduled',
  // Document
  'document', 'documents', 'file', 'files', 'pdf', 'pdfs', 'indexed', 'summary',
  'content', 'text', 'page', 'pages',
  // Quotes/Contracts
  'quote', 'quotes', 'proposal', 'proposals', 'contract', 'contracts', 'agreement',
  'agreements', 'pricing',
];

// Pre-defined tool embeddings (hand-crafted for speed)
const TOOL_EMBEDDINGS: ToolEmbedding[] = [
  {
    name: 'sf_query',
    description: 'Execute SOQL query',
    keywords: ['show', 'list', 'find', 'search', 'get', 'query', 'soql', 'record', 'records', 'all', 'my', 'recent', 'top'],
    category: 'search',
    priority: 10,
    vector: [], // Will be computed
  },
  {
    name: 'sf_search',
    description: 'SOSL search across objects',
    keywords: ['search', 'find', 'sosl', 'across', 'multiple', 'record', 'records'],
    category: 'search',
    priority: 9,
    vector: [],
  },
  {
    name: 'sf_get_record',
    description: 'Get record by ID',
    keywords: ['get', 'show', 'record', 'detail', 'id', 'specific'],
    category: 'search',
    priority: 7,
    vector: [],
  },
  {
    name: 'sf_create_lead',
    description: 'Create new lead',
    keywords: ['create', 'add', 'new', 'lead', 'leads', 'prospect'],
    category: 'create',
    priority: 9,
    vector: [],
  },
  {
    name: 'sf_create_contact',
    description: 'Create new contact',
    keywords: ['create', 'add', 'new', 'contact', 'contacts', 'person'],
    category: 'create',
    priority: 8,
    vector: [],
  },
  {
    name: 'sf_create_account',
    description: 'Create new account',
    keywords: ['create', 'add', 'new', 'account', 'accounts', 'company', 'organization'],
    category: 'create',
    priority: 8,
    vector: [],
  },
  {
    name: 'sf_create_opportunity',
    description: 'Create new opportunity',
    keywords: ['create', 'add', 'new', 'opportunity', 'opportunities', 'deal'],
    category: 'create',
    priority: 8,
    vector: [],
  },
  {
    name: 'sf_create_task',
    description: 'Create new task',
    keywords: ['create', 'add', 'new', 'task', 'tasks', 'todo', 'followup', 'reminder'],
    category: 'create',
    priority: 8,
    vector: [],
  },
  {
    name: 'sf_update_record',
    description: 'Update existing record',
    keywords: ['update', 'edit', 'change', 'modify', 'set', 'record'],
    category: 'update',
    priority: 7,
    vector: [],
  },
  {
    name: 'sf_delete_record',
    description: 'Delete record',
    keywords: ['delete', 'remove', 'record'],
    category: 'delete',
    priority: 5,
    vector: [],
  },
  {
    name: 'research_company',
    description: 'Research company from web',
    keywords: ['research', 'company', 'web', 'news', 'info', 'about', 'background', 'competitor'],
    category: 'research',
    priority: 8,
    vector: [],
  },
  {
    name: 'web_search',
    description: 'Search the web',
    keywords: ['web', 'search', 'internet', 'google', 'online', 'find'],
    category: 'research',
    priority: 6,
    vector: [],
  },
  {
    name: 'sf_describe_object',
    description: 'Get object metadata',
    keywords: ['describe', 'metadata', 'schema', 'field', 'fields', 'object', 'structure'],
    category: 'admin',
    priority: 5,
    vector: [],
  },
  {
    name: 'sf_list_objects',
    description: 'List available objects',
    keywords: ['list', 'object', 'objects', 'all', 'available'],
    category: 'admin',
    priority: 4,
    vector: [],
  },
  {
    name: 'sf_list_users',
    description: 'List org users',
    keywords: ['list', 'user', 'users', 'all'],
    category: 'admin',
    priority: 4,
    vector: [],
  },
  {
    name: 'sf_bulk_create',
    description: 'Bulk create records',
    keywords: ['bulk', 'batch', 'create', 'multiple', 'many', 'import'],
    category: 'bulk',
    priority: 5,
    vector: [],
  },
  {
    name: 'sf_bulk_update',
    description: 'Bulk update records',
    keywords: ['bulk', 'batch', 'update', 'multiple', 'many'],
    category: 'bulk',
    priority: 5,
    vector: [],
  },
  // Email tools
  {
    name: 'send_email',
    description: 'Send an email to a contact or lead',
    keywords: ['send', 'email', 'emails', 'mail', 'compose', 'write', 'message', 'contact', 'lead'],
    category: 'email',
    priority: 10,
    vector: [],
  },
  {
    name: 'send_email_draft',
    description: 'Send a saved email draft',
    keywords: ['send', 'email', 'draft', 'drafts', 'mail'],
    category: 'email',
    priority: 8,
    vector: [],
  },
  {
    name: 'get_email_threads',
    description: 'Get email threads/conversations',
    keywords: ['get', 'show', 'list', 'email', 'emails', 'thread', 'threads', 'inbox', 'messages'],
    category: 'email',
    priority: 8,
    vector: [],
  },
  {
    name: 'get_awaiting_responses',
    description: 'Get emails awaiting response',
    keywords: ['awaiting', 'pending', 'response', 'reply', 'waiting', 'email', 'emails', 'followup'],
    category: 'email',
    priority: 8,
    vector: [],
  },
  {
    name: 'get_thread_messages',
    description: 'Get messages in an email thread',
    keywords: ['get', 'show', 'message', 'messages', 'thread', 'email', 'reply'],
    category: 'email',
    priority: 7,
    vector: [],
  },
  {
    name: 'get_email_drafts',
    description: 'Get saved email drafts',
    keywords: ['get', 'show', 'list', 'draft', 'drafts', 'email', 'emails'],
    category: 'email',
    priority: 7,
    vector: [],
  },
  // Meeting tools
  {
    name: 'schedule_meeting',
    description: 'Schedule a video meeting on Zoom, Teams, or Google Meet',
    keywords: ['schedule', 'meeting', 'meetings', 'zoom', 'teams', 'meet', 'call', 'video', 'book', 'calendar', 'invite', 'demo', 'conference'],
    category: 'meeting',
    priority: 10,
    vector: [],
  },
  {
    name: 'list_meetings',
    description: 'List all meetings. ALWAYS call this first to find meeting IDs when user mentions a meeting by person name',
    keywords: ['list', 'show', 'get', 'meetings', 'meeting', 'scheduled', 'upcoming', 'my', 'all', 'find', 'search', 'with', 'david', 'cancel', 'delete'],
    category: 'meeting',
    priority: 10,
    vector: [],
  },
  {
    name: 'cancel_meeting',
    description: 'Cancel or delete a scheduled meeting',
    keywords: ['cancel', 'delete', 'remove', 'meeting', 'meetings', 'scheduled', 'call', 'video', 'zoom', 'teams'],
    category: 'meeting',
    priority: 9,
    vector: [],
  },
  {
    name: 'get_meeting_rsvp_status',
    description: 'Get RSVP status and participant responses for a meeting',
    keywords: ['rsvp', 'response', 'status', 'meeting', 'meetings', 'attendee', 'attendees', 'participant', 'participants', 'accepted', 'declined', 'pending'],
    category: 'meeting',
    priority: 8,
    vector: [],
  },
  {
    name: 'get_meeting_participants',
    description: 'Get detailed participant list for a meeting',
    keywords: ['who', 'participant', 'participants', 'attendee', 'attendees', 'invited', 'attending', 'meeting', 'meetings'],
    category: 'meeting',
    priority: 8,
    vector: [],
  },
  {
    name: 'get_meeting_response_history',
    description: 'Get the response history and audit trail for meeting invitations',
    keywords: ['history', 'response', 'responses', 'audit', 'trail', 'meeting', 'meetings', 'rsvp', 'changes'],
    category: 'meeting',
    priority: 6,
    vector: [],
  },
  {
    name: 'get_upcoming_meetings',
    description: 'Get upcoming scheduled meetings',
    keywords: ['upcoming', 'scheduled', 'meeting', 'meetings', 'calendar', 'schedule', 'next', 'future'],
    category: 'meeting',
    priority: 8,
    vector: [],
  },
  {
    name: 'get_meeting_details',
    description: 'Get detailed information about a specific meeting',
    keywords: ['get', 'show', 'meeting', 'meetings', 'details', 'info', 'about'],
    category: 'meeting',
    priority: 7,
    vector: [],
  },
  {
    name: 'update_meeting_rsvp',
    description: 'Update the RSVP status for a meeting participant',
    keywords: ['update', 'rsvp', 'meeting', 'meetings', 'response', 'status', 'accept', 'decline'],
    category: 'meeting',
    priority: 7,
    vector: [],
  },
  {
    name: 'resend_meeting_invite',
    description: 'Resend meeting invitation to participants',
    keywords: ['resend', 'meeting', 'meetings', 'invite', 'invitation', 'email', 'reminder'],
    category: 'meeting',
    priority: 6,
    vector: [],
  },
  // Document tools
  {
    name: 'list_indexed_documents',
    description: 'List all indexed documents available for search',
    keywords: ['list', 'documents', 'document', 'files', 'indexed', 'available', 'pdf', 'show'],
    category: 'document',
    priority: 8,
    vector: [],
  },
  {
    name: 'search_document',
    description: 'Search within a specific document for relevant content',
    keywords: ['search', 'document', 'documents', 'find', 'content', 'pdf', 'text', 'in'],
    category: 'document',
    priority: 9,
    vector: [],
  },
  {
    name: 'get_document_summary',
    description: 'Get a summary of a document',
    keywords: ['summary', 'document', 'documents', 'summarize', 'overview', 'pdf', 'what'],
    category: 'document',
    priority: 8,
    vector: [],
  },
  // Quotes and Contracts tools
  {
    name: 'search_quotes',
    description: 'Search for quotes/proposals',
    keywords: ['search', 'find', 'list', 'show', 'quote', 'quotes', 'proposal', 'proposals', 'pricing'],
    category: 'search',
    priority: 7,
    vector: [],
  },
  {
    name: 'create_quote',
    description: 'Create a new quote or proposal',
    keywords: ['create', 'new', 'quote', 'quotes', 'proposal', 'pricing', 'generate'],
    category: 'create',
    priority: 7,
    vector: [],
  },
  {
    name: 'search_contracts',
    description: 'Search for contracts',
    keywords: ['search', 'find', 'list', 'show', 'contract', 'contracts', 'agreement', 'agreements'],
    category: 'search',
    priority: 7,
    vector: [],
  },
  {
    name: 'create_contract',
    description: 'Create a new contract from a quote',
    keywords: ['create', 'new', 'contract', 'contracts', 'agreement', 'generate'],
    category: 'create',
    priority: 7,
    vector: [],
  },
];

@Injectable()
export class ToolEmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(ToolEmbeddingsService.name);
  private embeddings: ToolEmbedding[] = [];
  private vocabularyIndex: Map<string, number> = new Map();

  onModuleInit() {
    this.initializeEmbeddings();
    this.logger.log(`Tool embeddings initialized: ${this.embeddings.length} tools, ${VOCABULARY.length} vocabulary size`);
  }

  /**
   * Initialize embeddings by computing vectors from keywords
   */
  private initializeEmbeddings(): void {
    // Build vocabulary index
    VOCABULARY.forEach((word, idx) => {
      this.vocabularyIndex.set(word, idx);
    });

    // Compute vectors for each tool
    this.embeddings = TOOL_EMBEDDINGS.map(tool => ({
      ...tool,
      vector: this.computeVector(tool.keywords),
    }));
  }

  /**
   * Compute embedding vector from keywords
   */
  private computeVector(keywords: string[]): number[] {
    const vector = new Array(VOCABULARY.length).fill(0);

    for (const keyword of keywords) {
      const idx = this.vocabularyIndex.get(keyword);
      if (idx !== undefined) {
        vector[idx] = 1;
      }
    }

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return vector.map(val => val / magnitude);
    }
    return vector;
  }

  /**
   * Embed a query string into vector space
   */
  embedQuery(query: string): number[] {
    const words = query.toLowerCase().split(/\s+/);
    const vector = new Array(VOCABULARY.length).fill(0);

    for (const word of words) {
      // Check exact match
      const idx = this.vocabularyIndex.get(word);
      if (idx !== undefined) {
        vector[idx] = 1;
        continue;
      }

      // Check partial matches (e.g., "leads" -> "lead")
      for (const [vocabWord, vocabIdx] of this.vocabularyIndex) {
        if (word.includes(vocabWord) || vocabWord.includes(word)) {
          vector[vocabIdx] = 0.5; // Partial match
        }
      }
    }

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return vector.map(val => val / magnitude);
    }
    return vector;
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    return dotProduct; // Vectors are already normalized
  }

  /**
   * Find most similar tools to a query
   * Returns in ~0.1ms for typical queries
   */
  findSimilarTools(query: string, topK: number = 5, availableTools?: string[]): Array<{
    tool: string;
    score: number;
    category: string;
  }> {
    const startTime = performance.now();
    const queryVector = this.embedQuery(query);

    let candidates = this.embeddings;

    // Filter to available tools if specified
    if (availableTools) {
      const availableSet = new Set(availableTools);
      candidates = candidates.filter(e => availableSet.has(e.name));
    }

    // Score all tools
    const scores = candidates.map(tool => ({
      tool: tool.name,
      score: this.cosineSimilarity(queryVector, tool.vector) + (tool.priority * 0.01), // Slight boost for priority
      category: tool.category,
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const elapsed = performance.now() - startTime;
    this.logger.debug(`[EMBEDDINGS] Found ${topK} tools in ${elapsed.toFixed(2)}ms`);

    return scores.slice(0, topK);
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): string[] {
    return this.embeddings
      .filter(e => e.category === category)
      .sort((a, b) => b.priority - a.priority)
      .map(e => e.name);
  }

  /**
   * Detect query intent from embedding similarity
   */
  detectIntent(query: string): {
    intent: string;
    confidence: number;
    suggestedTools: string[];
  } {
    const startTime = performance.now();
    const queryVector = this.embedQuery(query);

    // Compute category scores
    const categoryScores: Record<string, number[]> = {
      search: [],
      create: [],
      update: [],
      delete: [],
      research: [],
      admin: [],
      bulk: [],
      email: [],
      meeting: [],
      document: [],
    };

    for (const tool of this.embeddings) {
      const similarity = this.cosineSimilarity(queryVector, tool.vector);
      if (categoryScores[tool.category]) {
        categoryScores[tool.category].push(similarity);
      }
    }

    // Find best category
    let bestCategory = 'search';
    let bestScore = 0;

    for (const [category, scores] of Object.entries(categoryScores)) {
      if (scores.length === 0) continue;
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestCategory = category;
      }
    }

    // Get suggested tools
    const similarTools = this.findSimilarTools(query, 5);
    const suggestedTools = similarTools.map(t => t.tool);

    const elapsed = performance.now() - startTime;
    this.logger.debug(`[EMBEDDINGS] Intent detected in ${elapsed.toFixed(2)}ms: ${bestCategory}`);

    return {
      intent: bestCategory,
      confidence: Math.min(bestScore * 1.5, 1), // Scale confidence
      suggestedTools,
    };
  }

  /**
   * Hybrid search: combine embedding similarity with keyword matching
   */
  hybridSearch(query: string, topK: number = 5): Array<{
    tool: string;
    embeddingScore: number;
    keywordScore: number;
    combinedScore: number;
  }> {
    const startTime = performance.now();
    const queryLower = query.toLowerCase();
    const queryWords = new Set(queryLower.split(/\s+/));

    const results = this.embeddings.map(tool => {
      // Embedding score
      const queryVector = this.embedQuery(query);
      const embeddingScore = this.cosineSimilarity(queryVector, tool.vector);

      // Keyword score (exact matches)
      let keywordMatches = 0;
      for (const keyword of tool.keywords) {
        if (queryLower.includes(keyword) || queryWords.has(keyword)) {
          keywordMatches++;
        }
      }
      const keywordScore = keywordMatches / tool.keywords.length;

      // Combined score (weighted)
      const combinedScore = (embeddingScore * 0.6) + (keywordScore * 0.4) + (tool.priority * 0.005);

      return {
        tool: tool.name,
        embeddingScore,
        keywordScore,
        combinedScore,
      };
    });

    results.sort((a, b) => b.combinedScore - a.combinedScore);

    const elapsed = performance.now() - startTime;
    this.logger.debug(`[EMBEDDINGS] Hybrid search in ${elapsed.toFixed(2)}ms`);

    return results.slice(0, topK);
  }
}
