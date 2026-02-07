/**
 * IRIS Agent Framework - Public API
 * 
 * This file exports all public interfaces for the agent framework.
 * Import from '@/agents' to use the framework.
 */

// Types
export * from './types';

// DTOs
export * from './dto';

// Base class
export { BaseAgentService, DEFAULT_AGENT_LIMITS } from './base/base-agent.service';

// Orchestrator
export { AgentOrchestratorService } from './orchestrator/agent-orchestrator.service';

// Controller
export { AgentsController } from './agents.controller';

// Tools
export { createCRMTools } from './tools/crm-tools';

// Module
export { AgentsModule } from './agents.module';

// Example agents (for reference)
export { DealHealthAgentService } from './examples/deal-health-agent.service';
export { NextBestActionAgentService } from './examples/next-best-action-agent.service';
export { SalesCoachingAgentService } from './examples/sales-coaching-agent.service';


