# IRIS Agent Framework

A production-grade, reusable AI agent framework built on Vercel AI SDK for the IRIS Sales GPT platform.

## Overview

This framework provides a standardized way to build, deploy, and manage AI agents that can:
- Monitor CRM data and generate insights
- Create alerts and notifications
- Execute automated actions
- Chain to other agents
- Scale horizontally with Redis-backed state

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT ORCHESTRATOR                            │
│  - Priority-based job queue                                      │
│  - Concurrent execution management                               │
│  - Scheduled + event-driven triggering                          │
│  - Health monitoring                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Deal Health  │   │   Pipeline    │   │   Account     │
│    Agent      │   │ Acceleration  │   │ Intelligence  │
│               │   │    Agent      │   │    Agent      │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │   BASE AGENT SERVICE      │
              │  - LLM integration        │
              │  - State management       │
              │  - Alert/Action creation  │
              │  - Rate limiting          │
              │  - Execution tracking     │
              └───────────────────────────┘
```

## Quick Start

### 1. Create a New Agent

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AiSdkService } from '../../ai-sdk/ai-sdk.service';
import { CacheService } from '../../cache/cache.service';
import { 
  BaseAgentService, 
  AgentType, 
  AgentContext, 
  AgentConfig,
  AgentTool,
  Priority,
} from '../index';

@Injectable()
export class MyNewAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.MY_AGENT;
  protected readonly logger = new Logger(MyNewAgentService.name);
  
  protected readonly config: AgentConfig = {
    type: AgentType.MY_AGENT,
    name: 'My New Agent',
    description: 'Description of what this agent does',
    version: '1.0.0',
    
    // Optional: Run on schedule
    schedule: {
      cron: '0 */6 * * *', // Every 6 hours
      enabled: true,
    },
    
    // Optional: Trigger on events
    eventTriggers: [
      { eventName: 'crm.lead.created' },
    ],
    
    limits: {
      maxExecutionTimeMs: 60000,
      maxLLMCalls: 10,
      maxTokensPerExecution: 50000,
      maxAlertsPerExecution: 20,
      maxActionsPerExecution: 10,
      rateLimitPerHour: 60,
      rateLimitPerDay: 500,
    },
    
    enabled: true,
    requiresApproval: false,
  };

  constructor(
    prisma: PrismaService,
    aiSdk: AiSdkService,
    eventEmitter: EventEmitter2,
    cacheService: CacheService,
  ) {
    super();
    this.initializeBase(prisma, aiSdk, eventEmitter, cacheService);
  }

  protected getTools(): AgentTool[] {
    return []; // Return tools this agent can use
  }

  protected async executeAgent(context: AgentContext): Promise<void> {
    // Your agent logic here
    
    // Call LLM
    const analysis = await this.callLLMForJSON<MyAnalysis>(
      'Analyze this data...',
      'You are an AI analyst...'
    );
    
    // Add insights
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.MEDIUM,
      confidence: 0.85,
      title: 'Analysis Complete',
      description: analysis.summary,
    });
    
    // Create alerts
    await this.createAlert({
      alertType: AlertType.ATTENTION_NEEDED,
      priority: Priority.HIGH,
      title: 'Action Required',
      description: 'Details...',
      userId: context.userId!,
      entityType: CRMEntityType.LEAD,
      entityId: 'lead-123',
    });
  }
}
```

### 2. Register the Agent

In `agents.module.ts`:

```typescript
@Module({
  providers: [
    AgentOrchestratorService,
    MyNewAgentService, // Add your agent
  ],
})
export class AgentsModule implements OnModuleInit {
  constructor(
    private readonly orchestrator: AgentOrchestratorService,
    private readonly myAgent: MyNewAgentService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.orchestrator.registerAgent(
      AgentType.MY_AGENT,
      this.myAgent,
      this.myAgent['config'],
    );
  }
}
```

### 3. Trigger the Agent

```typescript
// Manual trigger
await orchestrator.triggerAgent(
  AgentType.MY_AGENT,
  AgentTrigger.USER_REQUEST,
  {
    userId: 'user-123',
    entityType: 'Lead',
    entityId: 'lead-456',
    priority: Priority.HIGH,
  }
);

// Event-driven (automatic via eventTriggers config)
eventEmitter.emit('crm.lead.created', {
  event: 'crm.lead.created',
  entityType: 'Lead',
  entityId: 'lead-456',
  userId: 'user-123',
});
```

## Key Features

### 1. Base Agent Service

The `BaseAgentService` provides:

| Method | Description |
|--------|-------------|
| `execute(context)` | Main entry point with full lifecycle management |
| `callLLM(prompt, system)` | Call LLM with automatic tracking |
| `callLLMForJSON<T>(prompt, system)` | Call LLM and parse JSON response |
| `getCached<T>(key, compute, ttl)` | Cache-aware data fetching |
| `addInsight(insight)` | Add an insight to results |
| `createAlert(alert)` | Create and persist an alert |
| `queueAction(action)` | Queue an action for execution |
| `addError(code, message, recoverable)` | Record an error |

### 2. Agent Orchestrator

The orchestrator handles:

- **Priority Queue**: Jobs are processed by priority (URGENT > HIGH > MEDIUM > LOW)
- **Concurrent Execution**: Configurable max concurrent agents (default: 3)
- **Scheduling**: Cron-based scheduled execution
- **Event Handling**: Automatic triggering on CRM events
- **Rate Limiting**: Per-agent rate limits
- **Retry Logic**: Automatic retry on failure
- **Health Monitoring**: Regular health checks

### 3. Reusable Tools

Pre-built CRM tools in `tools/crm-tools.ts`:

- `get_opportunities` - Query opportunities with filters
- `get_opportunity_details` - Get detailed opportunity info
- `get_stalled_opportunities` - Find stalled deals
- `get_leads` - Query leads
- `get_uncontacted_leads` - Find leads needing contact
- `get_account_health` - Get account health metrics
- `get_activity_timeline` - Get activity history
- `get_overdue_tasks` - Find overdue tasks
- `create_task` - Create a new task
- `get_upcoming_meetings` - Get scheduled meetings
- `get_awaiting_responses` - Get email threads awaiting response
- `get_pipeline_summary` - Get pipeline analytics

### 4. Type Safety

Full TypeScript types for:

- Agent configuration
- Execution context
- Results and insights
- Alerts and actions
- Tools and parameters

## Database Schema

The framework adds these tables:

```sql
-- Track agent executions
agent_executions (
  id, agentType, triggerType, status,
  startedAt, completedAt, alertsCreated,
  actionsGenerated, userId, entityType, entityId, metadata
)

-- Store agent alerts
agent_alerts (
  id, agentType, alertType, priority,
  title, description, recommendation,
  userId, entityType, entityId, status,
  suggestedActions, metadata
)

-- Queue agent actions
agent_actions (
  id, actionType, priority, description, params,
  entityType, entityId, requiresApproval,
  status, executedAt, result, error
)
```

Run migration after adding the schema:

```bash
cd api
npx prisma migrate dev --name add_agent_framework
npx prisma generate
```

## Configuration

### Environment Variables

```env
# Agent Framework
AGENT_MAX_CONCURRENT=3
AGENT_JOB_TIMEOUT_MS=120000
AGENT_ENABLE_SCHEDULED=true
AGENT_ENABLE_EVENTS=true
```

### System Config (Database)

```json
{
  "key": "agent_orchestrator_config",
  "value": {
    "maxConcurrentAgents": 3,
    "jobTimeoutMs": 120000,
    "healthCheckIntervalMs": 60000,
    "enableScheduledAgents": true,
    "enableEventAgents": true
  }
}
```

## Monitoring

### Get Queue Status

```typescript
const status = orchestrator.getQueueStatus();
// { queuedJobs: 5, runningJobs: 2, jobsByAgent: { DEAL_HEALTH: 3 } }
```

### Get Agent Status

```typescript
const agent = orchestrator.getAgentStatus(AgentType.DEAL_HEALTH);
// { type, config, lastExecutedAt, executionCount, errorCount }
```

### Events

The framework emits these events:

- `agent.execution.started` - Agent started executing
- `agent.execution.completed` - Agent finished (success or failure)
- `agent.alert.created` - New alert created
- `agent.job.queued` - Job added to queue

## Best Practices

1. **Keep agents focused**: One agent = one responsibility
2. **Use caching**: Cache LLM responses to reduce costs
3. **Set appropriate limits**: Don't let agents run forever
4. **Handle errors gracefully**: Use `addError()` for recoverable errors
5. **Add insights liberally**: They help users understand what happened
6. **Test with small scopes**: Use `context.scope.maxEntities` during development

## Extending the Framework

### Adding New Agent Types

1. Add to `AgentType` enum in `types/index.ts`
2. Add to `AgentTypeEnum` in Prisma schema
3. Create agent service extending `BaseAgentService`
4. Register in `agents.module.ts`

### Adding New Tools

1. Create tool in `tools/` directory
2. Follow the `AgentTool` interface
3. Use Zod for parameter validation
4. Return typed results

### Adding New Alert Types

1. Add to `AlertType` enum in `types/index.ts`
2. Update UI to handle new alert type
3. Document the alert format

## Example Agents

### Deal Health Agent

Monitors opportunity health and alerts on:
- Stalled deals (no activity)
- At-risk deals (negative signals)
- Deals closing soon with low activity

See: `examples/deal-health-agent.service.ts`

---

Built with ❤️ by Deloitte + Cursor











