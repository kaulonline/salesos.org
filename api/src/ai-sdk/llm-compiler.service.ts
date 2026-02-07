// LLMCompiler - Parallel Function Calling with DAG Execution
// Based on ICML 2024 paper: "An LLM Compiler for Parallel Function Calling"
// Achieves up to 3.7x latency speedup through parallel tool execution

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';

// Tool dependency graph for determining execution order
export interface ToolNode {
  name: string;
  description: string;
  embedding?: number[]; // For semantic matching
  dependencies: string[]; // Tools that must run before this one
  outputType: string; // What this tool produces
  inputTypes: string[]; // What this tool needs
}

// Execution plan node
export interface ExecutionNode {
  id: string;
  toolName: string;
  args: any;
  dependencies: string[]; // IDs of nodes that must complete first
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  startTime?: number;
  endTime?: number;
}

// Execution DAG
export interface ExecutionPlan {
  nodes: Map<string, ExecutionNode>;
  rootNodes: string[]; // Nodes with no dependencies (can start immediately)
  estimatedParallelism: number;
}

// Tool definitions with their relationships
const TOOL_GRAPH: Record<string, ToolNode> = {
  // Search tools - no dependencies, can run in parallel
  sf_query: {
    name: 'sf_query',
    description: 'Execute SOQL query to search Salesforce records',
    dependencies: [],
    outputType: 'records',
    inputTypes: ['query_string'],
  },
  sf_search: {
    name: 'sf_search',
    description: 'Search across multiple Salesforce objects using SOSL',
    dependencies: [],
    outputType: 'records',
    inputTypes: ['search_term'],
  },
  web_search: {
    name: 'web_search',
    description: 'Search the web for information',
    dependencies: [],
    outputType: 'web_results',
    inputTypes: ['query_string'],
  },
  research_company: {
    name: 'research_company',
    description: 'Research company information from web',
    dependencies: [],
    outputType: 'company_info',
    inputTypes: ['company_name'],
  },

  // Get tools - may depend on search results for IDs
  sf_get_record: {
    name: 'sf_get_record',
    description: 'Get a single Salesforce record by ID',
    dependencies: [], // Can be independent or depend on search
    outputType: 'record',
    inputTypes: ['record_id'],
  },

  // Create tools - independent
  sf_create_lead: {
    name: 'sf_create_lead',
    description: 'Create a new Lead',
    dependencies: [],
    outputType: 'record_id',
    inputTypes: ['lead_data'],
  },
  sf_create_contact: {
    name: 'sf_create_contact',
    description: 'Create a new Contact',
    dependencies: [],
    outputType: 'record_id',
    inputTypes: ['contact_data'],
  },
  sf_create_account: {
    name: 'sf_create_account',
    description: 'Create a new Account',
    dependencies: [],
    outputType: 'record_id',
    inputTypes: ['account_data'],
  },
  sf_create_opportunity: {
    name: 'sf_create_opportunity',
    description: 'Create a new Opportunity',
    dependencies: [],
    outputType: 'record_id',
    inputTypes: ['opportunity_data'],
  },
  sf_create_task: {
    name: 'sf_create_task',
    description: 'Create a new Task',
    dependencies: [],
    outputType: 'record_id',
    inputTypes: ['task_data'],
  },

  // Update tools - need record ID first
  sf_update_record: {
    name: 'sf_update_record',
    description: 'Update a Salesforce record',
    dependencies: [],
    outputType: 'success',
    inputTypes: ['record_id', 'update_data'],
  },

  // Describe tools - metadata, no dependencies
  sf_describe_object: {
    name: 'sf_describe_object',
    description: 'Get object metadata and fields',
    dependencies: [],
    outputType: 'metadata',
    inputTypes: ['object_name'],
  },
  sf_list_objects: {
    name: 'sf_list_objects',
    description: 'List available Salesforce objects',
    dependencies: [],
    outputType: 'object_list',
    inputTypes: [],
  },
};

// Common parallel execution patterns
const PARALLEL_PATTERNS: Record<string, string[][]> = {
  // Research pattern: search CRM and web simultaneously
  research: [['sf_search', 'research_company']],

  // Comprehensive search: search multiple objects
  comprehensive_search: [['sf_query', 'sf_search']],

  // Create with context: search first, then create
  create_with_search: [['sf_search'], ['sf_create_lead']],

  // Multi-create: create multiple records in parallel
  bulk_create: [['sf_create_lead', 'sf_create_task']],
};

@Injectable()
export class LLMCompilerService {
  private readonly logger = new Logger(LLMCompilerService.name);
  private readonly client: AzureOpenAI;
  private readonly fastModelId: string;
  private readonly fullModelId: string;

  // Simple keyword-based tool embeddings (could be enhanced with real embeddings)
  private toolKeywords: Map<string, Set<string>> = new Map();

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('AZURE_OPENAI_ENDPOINT', '');
    const apiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY', '');
    const apiVersion = this.configService.get<string>('AZURE_OPENAI_API_VERSION', '2025-01-01-preview');
    this.fastModelId = 'gpt-4o-mini';
    this.fullModelId = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4o');

    this.client = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
    });

    // Initialize tool keywords for fast matching
    this.initializeToolKeywords();

    this.logger.log('LLMCompiler initialized - Parallel execution enabled');
  }

  /**
   * Initialize keyword index for fast tool matching
   */
  private initializeToolKeywords(): void {
    const keywordMap: Record<string, string[]> = {
      sf_query: ['query', 'soql', 'select', 'where', 'find', 'records', 'data'],
      sf_search: ['search', 'find', 'lookup', 'sosl', 'across', 'multiple'],
      sf_get_record: ['get', 'fetch', 'retrieve', 'record', 'details', 'id'],
      sf_create_lead: ['create', 'new', 'add', 'lead', 'prospect'],
      sf_create_contact: ['create', 'new', 'add', 'contact', 'person'],
      sf_create_account: ['create', 'new', 'add', 'account', 'company', 'organization'],
      sf_create_opportunity: ['create', 'new', 'add', 'opportunity', 'deal', 'opp'],
      sf_create_task: ['create', 'new', 'add', 'task', 'todo', 'followup', 'reminder'],
      sf_update_record: ['update', 'edit', 'modify', 'change', 'set'],
      sf_describe_object: ['describe', 'fields', 'metadata', 'schema', 'structure'],
      sf_list_objects: ['list', 'objects', 'available', 'all'],
      research_company: ['research', 'company', 'about', 'info', 'background', 'news'],
      web_search: ['web', 'search', 'google', 'internet', 'online'],
    };

    for (const [tool, keywords] of Object.entries(keywordMap)) {
      this.toolKeywords.set(tool, new Set(keywords));
    }
  }

  /**
   * Fast tool matching using keyword overlap
   */
  matchToolsByKeywords(query: string, availableTools: string[]): string[] {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const scores: Array<{ tool: string; score: number }> = [];

    for (const tool of availableTools) {
      const keywords = this.toolKeywords.get(tool);
      if (!keywords) continue;

      let score = 0;
      for (const word of queryWords) {
        if (keywords.has(word)) score++;
      }
      if (score > 0) {
        scores.push({ tool, score });
      }
    }

    // Sort by score descending and return top matches
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.tool);
  }

  /**
   * Plan execution DAG from LLM tool calls
   * Analyzes dependencies and creates parallel execution groups
   */
  planExecution(toolCalls: Array<{ name: string; args: any }>): ExecutionPlan {
    const nodes = new Map<string, ExecutionNode>();
    const rootNodes: string[] = [];

    // Create nodes for each tool call
    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      const nodeId = `node_${i}`;

      // Analyze dependencies based on argument references
      const dependencies = this.analyzeDependencies(call, toolCalls.slice(0, i), nodes);

      const node: ExecutionNode = {
        id: nodeId,
        toolName: call.name,
        args: call.args,
        dependencies,
        status: 'pending',
      };

      nodes.set(nodeId, node);

      if (dependencies.length === 0) {
        rootNodes.push(nodeId);
      }
    }

    // Calculate parallelism
    const estimatedParallelism = this.calculateParallelism(nodes);

    return { nodes, rootNodes, estimatedParallelism };
  }

  /**
   * Analyze dependencies between tool calls
   */
  private analyzeDependencies(
    currentCall: { name: string; args: any },
    previousCalls: Array<{ name: string; args: any }>,
    nodes: Map<string, ExecutionNode>
  ): string[] {
    const dependencies: string[] = [];
    const argString = JSON.stringify(currentCall.args).toLowerCase();

    // Check if current call references output from previous calls
    let nodeIndex = 0;
    for (const prevCall of previousCalls) {
      const nodeId = `node_${nodeIndex}`;

      // Check for ID references (e.g., record IDs from previous searches)
      if (argString.includes('$') || argString.includes('result')) {
        dependencies.push(nodeId);
      }

      // Check for logical dependencies
      const toolGraph = TOOL_GRAPH[currentCall.name];
      const prevToolGraph = TOOL_GRAPH[prevCall.name];

      if (toolGraph && prevToolGraph) {
        // If current tool needs output type that previous tool produces
        if (toolGraph.inputTypes.some(input =>
          prevToolGraph.outputType === input ||
          (input === 'record_id' && prevToolGraph.outputType === 'records')
        )) {
          dependencies.push(nodeId);
        }
      }

      nodeIndex++;
    }

    return dependencies;
  }

  /**
   * Calculate maximum parallelism in the DAG
   */
  private calculateParallelism(nodes: Map<string, ExecutionNode>): number {
    // Count nodes at each level
    const levels = new Map<string, number>();

    const getLevel = (nodeId: string): number => {
      if (levels.has(nodeId)) return levels.get(nodeId)!;

      const node = nodes.get(nodeId)!;
      if (node.dependencies.length === 0) {
        levels.set(nodeId, 0);
        return 0;
      }

      const maxDepLevel = Math.max(...node.dependencies.map(d => getLevel(d)));
      const level = maxDepLevel + 1;
      levels.set(nodeId, level);
      return level;
    };

    for (const nodeId of nodes.keys()) {
      getLevel(nodeId);
    }

    // Count nodes per level
    const levelCounts = new Map<number, number>();
    for (const level of levels.values()) {
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    }

    return Math.max(...levelCounts.values(), 1);
  }

  /**
   * Execute plan with parallel tool execution
   */
  async executePlan(
    plan: ExecutionPlan,
    toolExecutor: (name: string, args: any) => Promise<any>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const startTime = Date.now();
    let completed = 0;
    const total = plan.nodes.size;

    const executeNode = async (nodeId: string): Promise<void> => {
      const node = plan.nodes.get(nodeId)!;

      // Wait for dependencies
      await Promise.all(
        node.dependencies.map(depId => {
          return new Promise<void>((resolve) => {
            const checkDep = () => {
              const depNode = plan.nodes.get(depId)!;
              if (depNode.status === 'completed' || depNode.status === 'failed') {
                resolve();
              } else {
                setTimeout(checkDep, 10);
              }
            };
            checkDep();
          });
        })
      );

      // Execute the tool
      node.status = 'running';
      node.startTime = Date.now();

      try {
        // Resolve any references to previous results in args
        const resolvedArgs = this.resolveArgReferences(node.args, results);

        const result = await toolExecutor(node.toolName, resolvedArgs);
        node.result = result;
        node.status = 'completed';
        results.set(nodeId, result);
      } catch (error) {
        node.status = 'failed';
        node.result = { error: error.message };
        results.set(nodeId, { error: error.message });
      }

      node.endTime = Date.now();
      completed++;

      if (onProgress) {
        onProgress(completed, total);
      }
    };

    // Execute all nodes, starting with root nodes in parallel
    const pendingNodes = new Set(plan.nodes.keys());
    const executionPromises: Promise<void>[] = [];

    // Start root nodes immediately
    for (const rootId of plan.rootNodes) {
      executionPromises.push(executeNode(rootId));
      pendingNodes.delete(rootId);
    }

    // Start dependent nodes as their dependencies complete
    while (pendingNodes.size > 0) {
      for (const nodeId of pendingNodes) {
        const node = plan.nodes.get(nodeId)!;
        const allDepsCompleted = node.dependencies.every(depId => {
          const depNode = plan.nodes.get(depId)!;
          return depNode.status === 'completed' || depNode.status === 'failed';
        });

        if (allDepsCompleted) {
          executionPromises.push(executeNode(nodeId));
          pendingNodes.delete(nodeId);
        }
      }

      // Small delay to prevent busy loop
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    // Wait for all executions to complete
    await Promise.all(executionPromises);

    const totalTime = Date.now() - startTime;
    this.logger.log(`[COMPILER] Executed ${total} tools in ${totalTime}ms (parallelism: ${plan.estimatedParallelism})`);

    return results;
  }

  /**
   * Resolve references to previous results in arguments
   */
  private resolveArgReferences(args: any, results: Map<string, any>): any {
    if (typeof args === 'string') {
      // Check for $nodeId.field references
      const refMatch = args.match(/\$(\w+)\.(\w+)/);
      if (refMatch) {
        const [, nodeId, field] = refMatch;
        const result = results.get(nodeId);
        if (result && result[field]) {
          return args.replace(refMatch[0], result[field]);
        }
      }
      return args;
    }

    if (Array.isArray(args)) {
      return args.map(a => this.resolveArgReferences(a, results));
    }

    if (typeof args === 'object' && args !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(args)) {
        resolved[key] = this.resolveArgReferences(value, results);
      }
      return resolved;
    }

    return args;
  }

  /**
   * Quick planning for common patterns (no LLM call needed)
   */
  getQuickPlan(intent: string, query: string): string[][] | null {
    const queryLower = query.toLowerCase();

    // Research pattern: parallel CRM + web search
    if (intent === 'research' || queryLower.includes('research')) {
      return PARALLEL_PATTERNS.research;
    }

    // Comprehensive search pattern
    if (queryLower.includes('all') && (queryLower.includes('find') || queryLower.includes('search'))) {
      return PARALLEL_PATTERNS.comprehensive_search;
    }

    return null;
  }

  /**
   * Estimate time savings from parallel execution
   */
  estimateTimeSavings(plan: ExecutionPlan, avgToolTimeMs: number = 300): {
    sequentialTime: number;
    parallelTime: number;
    savings: number;
    savingsPercent: number;
  } {
    const nodeCount = plan.nodes.size;
    const sequentialTime = nodeCount * avgToolTimeMs;

    // Calculate parallel time based on DAG depth
    const depths = new Map<string, number>();

    const getDepth = (nodeId: string): number => {
      if (depths.has(nodeId)) return depths.get(nodeId)!;

      const node = plan.nodes.get(nodeId)!;
      if (node.dependencies.length === 0) {
        depths.set(nodeId, 1);
        return 1;
      }

      const maxDepDepth = Math.max(...node.dependencies.map(d => getDepth(d)));
      const depth = maxDepDepth + 1;
      depths.set(nodeId, depth);
      return depth;
    };

    for (const nodeId of plan.nodes.keys()) {
      getDepth(nodeId);
    }

    const maxDepth = Math.max(...depths.values());
    const parallelTime = maxDepth * avgToolTimeMs;
    const savings = sequentialTime - parallelTime;
    const savingsPercent = (savings / sequentialTime) * 100;

    return { sequentialTime, parallelTime, savings, savingsPercent };
  }
}
