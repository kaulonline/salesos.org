/**
 * IRISRank - Generic Knowledge Graph Ranking Algorithm
 *
 * A portable, configurable PageRank-inspired algorithm for ranking entities.
 * Can be used with any CRM, ERP, or data system.
 *
 * Key Design Principles:
 * 1. ZERO HARDCODING - All weights, types, and parameters are configurable
 * 2. PORTABLE - No vendor-specific code; works with any data source
 * 3. EXTENSIBLE - Easy to add new activity types, relationship types
 * 4. OBSERVABLE - Full statistics and explainability
 *
 * Algorithm combines:
 * 1. Network importance (PageRank-style graph centrality)
 * 2. Activity signals (time-decayed engagement metrics)
 * 3. Query relevance (semantic similarity to current context)
 */

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';

// ============================================================================
// CONFIGURATION INTERFACES - Everything is configurable
// ============================================================================

/**
 * Configuration for activity signal weights
 * Define your own activity types with custom weights and decay rates
 */
export interface ActivityConfig {
  /** Weight of this activity (-1 to 1, negative for bad signals) */
  weight: number;
  /** Days until signal strength halves (half-life) */
  decayDays: number;
  /** Optional category for grouping */
  category?: string;
}

/**
 * Configuration for relationship type weights
 */
export interface RelationshipConfig {
  /** Weight of this relationship type (0 to 1) */
  weight: number;
  /** Whether this is a bidirectional relationship */
  bidirectional?: boolean;
}

/**
 * Full IRISRank configuration
 */
export interface IRISRankConfig {
  /** PageRank damping factor (default: 0.85) */
  dampingFactor?: number;
  /** Convergence threshold for PageRank iteration (default: 0.0001) */
  convergenceThreshold?: number;
  /** Maximum PageRank iterations (default: 50) */
  maxIterations?: number;

  /** Weight of network score in final rank (0-1) */
  networkWeight?: number;
  /** Weight of activity score in final rank (0-1) */
  activityWeight?: number;
  /** Weight of relevance score in final rank (0-1) */
  relevanceWeight?: number;
  /** Weight of momentum score in final rank (0-1) - NEW in v2.0 */
  momentumWeight?: number;

  /** Cache validity duration in milliseconds */
  cacheValidityMs?: number;

  /** Activity type configurations - define your own! */
  activityTypes?: Record<string, ActivityConfig>;

  /** Relationship type configurations - define your own! */
  relationshipTypes?: Record<string, RelationshipConfig>;

  /** Custom scoring function (optional) */
  customScorer?: (entity: CRMEntity, context: RankingContext) => number;

  // ============ PHASE 1: VELOCITY & MOMENTUM CONFIG (v2.0) ============
  /** Period in days for velocity calculation (default: 7) */
  velocityPeriodDays?: number;
  /** Number of periods to compare for acceleration (default: 2) */
  accelerationPeriods?: number;
  /** Threshold for positive momentum detection (default: 0.1) */
  positiveMomentumThreshold?: number;
  /** Threshold for negative momentum (churn risk) detection (default: -0.1) */
  negativeMomentumThreshold?: number;
  /** Seasonal adjustment factors by month (1-12) */
  seasonalFactors?: Record<number, number>;
}

/**
 * Default configuration - can be overridden entirely
 */
export const DEFAULT_IRIS_RANK_CONFIG: Required<Omit<IRISRankConfig, 'customScorer'>> = {
  dampingFactor: 0.85,
  convergenceThreshold: 0.0001,
  maxIterations: 50,
  // Adjusted weights to include momentum (total = 1.0)
  networkWeight: 0.30,      // Graph centrality importance
  activityWeight: 0.25,     // Current engagement level
  relevanceWeight: 0.20,    // Query match score
  momentumWeight: 0.25,     // NEW: Velocity + Acceleration signal
  cacheValidityMs: 5 * 60 * 1000, // 5 minutes

  // PHASE 1: Velocity & Momentum settings
  velocityPeriodDays: 7,              // Compare week-over-week
  accelerationPeriods: 2,             // Compare last 2 velocity periods
  positiveMomentumThreshold: 0.1,     // +10% velocity = positive momentum
  negativeMomentumThreshold: -0.15,   // -15% velocity = churn risk
  seasonalFactors: {                  // Q4 typically higher for B2B
    1: 0.85, 2: 0.90, 3: 0.95,        // Q1: Post-holiday slowdown
    4: 1.00, 5: 1.00, 6: 0.95,        // Q2: Steady
    7: 0.85, 8: 0.80, 9: 0.95,        // Q3: Summer slowdown
    10: 1.05, 11: 1.10, 12: 1.00,     // Q4: Budget flush
  },

  // Default activity types - OVERRIDE THESE for your use case
  activityTypes: {
    // Positive engagement signals
    'email_replied': { weight: 0.25, decayDays: 14, category: 'communication' },
    'email_opened': { weight: 0.10, decayDays: 7, category: 'communication' },
    'email_sent': { weight: 0.05, decayDays: 7, category: 'communication' },
    'meeting_attended': { weight: 0.35, decayDays: 30, category: 'meeting' },
    'meeting_scheduled': { weight: 0.20, decayDays: 14, category: 'meeting' },
    'call_answered': { weight: 0.20, decayDays: 14, category: 'communication' },
    'call_made': { weight: 0.10, decayDays: 7, category: 'communication' },
    'task_completed': { weight: 0.15, decayDays: 14, category: 'task' },
    'task_created': { weight: 0.05, decayDays: 7, category: 'task' },
    'stage_advanced': { weight: 0.30, decayDays: 60, category: 'pipeline' },
    'deal_won': { weight: 0.50, decayDays: 90, category: 'pipeline' },
    'content_downloaded': { weight: 0.20, decayDays: 14, category: 'engagement' },
    'website_visit': { weight: 0.05, decayDays: 3, category: 'engagement' },
    'referral_received': { weight: 0.50, decayDays: 90, category: 'referral' },
    'referral_given': { weight: 0.40, decayDays: 90, category: 'referral' },
    // New entity lifecycle activities
    'lead_created': { weight: 0.10, decayDays: 90, category: 'lifecycle' },
    'lead_qualified': { weight: 0.35, decayDays: 60, category: 'pipeline' },
    'profile_updated': { weight: 0.08, decayDays: 14, category: 'engagement' },

    // Negative signals
    'email_bounced': { weight: -0.15, decayDays: 30, category: 'communication' },
    'meeting_no_show': { weight: -0.20, decayDays: 30, category: 'meeting' },
    'call_missed': { weight: -0.05, decayDays: 7, category: 'communication' },
    'task_overdue': { weight: -0.10, decayDays: 7, category: 'task' },
    'stage_regressed': { weight: -0.25, decayDays: 60, category: 'pipeline' },
    'deal_lost': { weight: -0.30, decayDays: 90, category: 'pipeline' },
    'unsubscribed': { weight: -0.40, decayDays: 180, category: 'engagement' },
  },

  // Default relationship types - OVERRIDE THESE for your use case
  relationshipTypes: {
    'owns': { weight: 1.0, bidirectional: false },
    'employs': { weight: 0.8, bidirectional: false },
    'works_at': { weight: 0.8, bidirectional: false },
    'associated_to': { weight: 0.7, bidirectional: true },
    'referred_by': { weight: 0.9, bidirectional: false },
    'related_to': { weight: 0.3, bidirectional: true },
    'reports_to': { weight: 0.5, bidirectional: false },
    'partner_of': { weight: 0.6, bidirectional: true },
    'parent_of': { weight: 0.7, bidirectional: false },
    'child_of': { weight: 0.7, bidirectional: false },
    // New relationship types for CRM entities
    'primary_contact': { weight: 0.95, bidirectional: true },
    'subsidiary_of': { weight: 0.8, bidirectional: false },
  },
};

// ============================================================================
// ENTITY INTERFACES - Generic, vendor-agnostic
// ============================================================================

/**
 * Generic entity that can represent any CRM object
 */
export interface CRMEntity {
  /** Unique identifier */
  id: string;
  /** Entity type (e.g., 'Lead', 'Contact', 'Account', 'Customer', 'Deal') */
  type: string;
  /** Display name */
  name: string;
  /** Arbitrary properties - schema-free */
  properties: Record<string, any>;
  /** Connections to other entities */
  connections: EntityConnection[];
  /** Activity history */
  activities: EntityActivity[];
  /** When entity was created */
  createdDate: Date;
  /** When entity was last modified */
  lastModifiedDate: Date;
  /** Optional: pre-computed importance score (0-1) */
  importanceHint?: number;
}

/**
 * Connection between entities
 */
export interface EntityConnection {
  /** Target entity ID */
  targetId: string;
  /** Target entity type */
  targetType: string;
  /** Relationship type (must exist in config) */
  relationshipType: string;
  /** Connection strength modifier (0-1, default 1) */
  strength?: number;
  /** When connection was established */
  createdDate: Date;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Activity/event on an entity
 */
export interface EntityActivity {
  /** Activity type (must exist in config) */
  type: string;
  /** When activity occurred */
  date: Date;
  /** Outcome classification */
  outcome: 'positive' | 'neutral' | 'negative';
  /** Related entity ID (if applicable) */
  relatedEntityId?: string;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Context for ranking (query, filters, etc.)
 */
export interface RankingContext {
  /** Search query for relevance scoring */
  query?: string;
  /** Filter by entity types */
  entityTypes?: string[];
  /** Custom context data */
  custom?: Record<string, any>;
}

/**
 * Momentum metrics for predictive engagement (PHASE 1 - v2.0)
 */
export interface MomentumMetrics {
  /** Engagement velocity: rate of change in activity (positive = increasing) */
  velocity: number;
  /** Engagement acceleration: change in velocity (positive = accelerating) */
  acceleration: number;
  /** Combined momentum score (0-1, normalized) */
  momentumScore: number;
  /** Seasonal adjustment factor applied */
  seasonalFactor: number;
  /** Trend classification */
  trend: 'accelerating' | 'steady' | 'decelerating' | 'at_risk' | 'churning';
  /** Days since last activity */
  daysSinceLastActivity: number;
  /** Activity counts by period for transparency */
  periodCounts: {
    currentPeriod: number;
    previousPeriod: number;
    twoPeriodsAgo: number;
  };
}

/**
 * Ranking result with full explainability
 */
export interface IRISRankResult {
  /** Entity ID */
  entityId: string;
  /** Entity type */
  entityType: string;
  /** Entity name */
  entityName: string;
  /** Final normalized rank (0-1) */
  rank: number;
  /** Network/graph centrality score (0-1) */
  networkScore: number;
  /** Time-decayed activity score (0-1) */
  activityScore: number;
  /** Query relevance score (0-1) */
  relevanceScore: number;
  /** Momentum score (0-1) - NEW in v2.0 */
  momentumScore: number;
  /** Human-readable explanation */
  explanation: string[];
  /** Detailed score breakdown */
  breakdown: {
    topActivities: Array<{ type: string; contribution: number }>;
    topConnections: Array<{ type: string; count: number }>;
    recencyFactor: number;
  };
  /** PHASE 1: Momentum metrics for predictive insights */
  momentum: MomentumMetrics;
}

// ============================================================================
// IRIS RANK SERVICE - Fully configurable
// ============================================================================

/** Injection token for custom configuration */
export const IRIS_RANK_CONFIG = 'IRIS_RANK_CONFIG';

@Injectable()
export class IRISRankService {
  private readonly logger = new Logger(IRISRankService.name);
  private readonly config: Required<Omit<IRISRankConfig, 'customScorer'>>;
  private readonly customScorer?: IRISRankConfig['customScorer'];

  // Caches
  private readonly rankCache = new Map<string, Map<string, number>>();
  private readonly lastComputeTime = new Map<string, Date>();

  // Statistics
  private stats = {
    totalComputations: 0,
    cacheHits: 0,
    avgComputeTimeMs: 0,
    entitiesRanked: 0,
  };

  constructor(
    @Optional() @Inject(IRIS_RANK_CONFIG) customConfig?: IRISRankConfig
  ) {
    // Merge custom config with defaults
    this.config = {
      ...DEFAULT_IRIS_RANK_CONFIG,
      ...customConfig,
      activityTypes: {
        ...DEFAULT_IRIS_RANK_CONFIG.activityTypes,
        ...customConfig?.activityTypes,
      },
      relationshipTypes: {
        ...DEFAULT_IRIS_RANK_CONFIG.relationshipTypes,
        ...customConfig?.relationshipTypes,
      },
    };
    this.customScorer = customConfig?.customScorer;

    this.logger.log('IRISRank initialized with configuration:');
    this.logger.log(`  - Activity types: ${Object.keys(this.config.activityTypes).length}`);
    this.logger.log(`  - Relationship types: ${Object.keys(this.config.relationshipTypes).length}`);
    this.logger.log(`  - Weights: network=${this.config.networkWeight}, activity=${this.config.activityWeight}, relevance=${this.config.relevanceWeight}`);
  }

  /**
   * Compute IRISRank for all entities
   * Uses power iteration (PageRank algorithm)
   */
  async computeIRISRank(
    scopeId: string,
    entities: CRMEntity[]
  ): Promise<Map<string, number>> {
    const startTime = Date.now();

    // Check cache
    const cached = this.rankCache.get(scopeId);
    const lastCompute = this.lastComputeTime.get(scopeId);
    if (cached && lastCompute && Date.now() - lastCompute.getTime() < this.config.cacheValidityMs) {
      this.stats.cacheHits++;
      this.logger.debug(`Cache hit for scope ${scopeId}`);
      return cached;
    }

    const n = entities.length;
    if (n === 0) return new Map();

    // Build entity index
    const entityIndex = new Map<string, number>();
    entities.forEach((e, i) => entityIndex.set(e.id, i));

    // Build adjacency matrix
    const adjacency = this.buildAdjacencyMatrix(entities, entityIndex);

    // Initialize ranks
    let ranks = new Array(n).fill(1 / n);
    let newRanks = new Array(n).fill(0);

    // Power iteration
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      newRanks.fill((1 - this.config.dampingFactor) / n);

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (adjacency[j][i] > 0) {
            const outSum = adjacency[j].reduce((a, b) => a + b, 0);
            if (outSum > 0) {
              newRanks[i] += this.config.dampingFactor * ranks[j] * adjacency[j][i] / outSum;
            }
          }
        }
      }

      // Check convergence
      const diff = ranks.reduce((sum, r, i) => sum + Math.abs(r - newRanks[i]), 0);
      if (diff < this.config.convergenceThreshold) {
        this.logger.debug(`Converged after ${iter + 1} iterations`);
        break;
      }

      [ranks, newRanks] = [newRanks, ranks];
    }

    // Blend with activity scores
    for (let i = 0; i < n; i++) {
      const activityScore = this.computeActivityScore(entities[i]);
      ranks[i] = ranks[i] * (1 - this.config.activityWeight) + activityScore * this.config.activityWeight;
    }

    // Normalize
    const maxRank = Math.max(...ranks, 0.001);
    const result = new Map<string, number>();
    entities.forEach((e, i) => result.set(e.id, ranks[i] / maxRank));

    // Update cache and stats
    this.rankCache.set(scopeId, result);
    this.lastComputeTime.set(scopeId, new Date());

    const computeTime = Date.now() - startTime;
    this.stats.totalComputations++;
    this.stats.entitiesRanked += n;
    this.stats.avgComputeTimeMs = (this.stats.avgComputeTimeMs * (this.stats.totalComputations - 1) + computeTime) / this.stats.totalComputations;

    this.logger.log(`Computed IRISRank for ${n} entities in ${computeTime}ms`);
    return result;
  }

  /**
   * Get ranked entities with full explainability
   * Now includes PHASE 1 momentum metrics (velocity, acceleration, trend)
   */
  async getRankedEntities(
    scopeId: string,
    entities: CRMEntity[],
    context: RankingContext = {},
    limit: number = 10
  ): Promise<IRISRankResult[]> {
    const baseRanks = await this.computeIRISRank(scopeId, entities);
    const results: IRISRankResult[] = [];

    for (const entity of entities) {
      // Apply type filter if specified
      if (context.entityTypes?.length && !context.entityTypes.includes(entity.type)) {
        continue;
      }

      const networkScore = baseRanks.get(entity.id) || 0;
      const activityScore = this.computeActivityScore(entity);
      const relevanceScore = this.computeRelevanceScore(entity, context);

      // PHASE 1: Compute momentum metrics (velocity + acceleration)
      const momentum = this.computeMomentumMetrics(entity);

      // Apply custom scorer if provided
      let customScore = 0;
      if (this.customScorer) {
        customScore = this.customScorer(entity, context);
      }

      // Compute final rank with momentum integration (v2.0 formula)
      // IRISRank = Network × w1 + Activity × w2 + Relevance × w3 + Momentum × w4
      const rank = customScore > 0
        ? customScore
        : (networkScore * this.config.networkWeight +
           activityScore * this.config.activityWeight +
           relevanceScore * this.config.relevanceWeight +
           momentum.momentumScore * this.config.momentumWeight);

      results.push({
        entityId: entity.id,
        entityType: entity.type,
        entityName: entity.name,
        rank,
        networkScore,
        activityScore,
        relevanceScore,
        momentumScore: momentum.momentumScore,
        explanation: this.generateExplanation(entity, networkScore, activityScore, relevanceScore, momentum),
        breakdown: this.generateBreakdown(entity),
        momentum, // Full momentum metrics for transparency
      });
    }

    return results
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit);
  }

  /**
   * Get entities that need attention (at-risk or churning based on momentum)
   * Enhanced in v2.0 to use velocity and acceleration signals
   */
  async getAtRiskEntities(
    scopeId: string,
    entities: CRMEntity[],
    limit: number = 5
  ): Promise<IRISRankResult[]> {
    const results = await this.getRankedEntities(scopeId, entities, {}, entities.length);

    // PHASE 1: Use momentum trend for at-risk detection
    return results
      .filter(r =>
        r.momentum.trend === 'at_risk' ||
        r.momentum.trend === 'churning' ||
        (r.momentum.velocity < this.config.negativeMomentumThreshold) ||
        (r.networkScore > 0.5 && r.activityScore < 0.3) // Legacy condition
      )
      .sort((a, b) => {
        // Prioritize by: churn risk > at risk > decelerating
        const riskScore = (r: IRISRankResult) => {
          if (r.momentum.trend === 'churning') return 100;
          if (r.momentum.trend === 'at_risk') return 75;
          if (r.momentum.trend === 'decelerating') return 50;
          return Math.abs(r.momentum.velocity) * 25;
        };
        return riskScore(b) - riskScore(a);
      })
      .slice(0, limit);
  }

  /**
   * Get entities with positive momentum (accelerating engagement)
   * Enhanced in v2.0 to use velocity and acceleration signals
   */
  async getMomentumEntities(
    scopeId: string,
    entities: CRMEntity[],
    limit: number = 5
  ): Promise<IRISRankResult[]> {
    const results = await this.getRankedEntities(scopeId, entities, {}, entities.length);

    // PHASE 1: Use momentum trend for hot leads detection
    return results
      .filter(r =>
        r.momentum.trend === 'accelerating' ||
        r.momentum.trend === 'steady' ||
        r.momentum.velocity > this.config.positiveMomentumThreshold
      )
      .sort((a, b) => {
        // Prioritize by: acceleration > velocity > momentum score
        const hotScore = (r: IRISRankResult) => {
          let score = r.momentum.momentumScore * 50;
          if (r.momentum.trend === 'accelerating') score += 50;
          score += r.momentum.velocity * 30;
          score += r.momentum.acceleration * 20;
          return score;
        };
        return hotScore(b) - hotScore(a);
      })
      .slice(0, limit);
  }

  /**
   * Build adjacency matrix from entity connections
   */
  private buildAdjacencyMatrix(
    entities: CRMEntity[],
    entityIndex: Map<string, number>
  ): number[][] {
    const n = entities.length;
    const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
    const now = Date.now();

    for (const entity of entities) {
      const i = entityIndex.get(entity.id)!;

      for (const conn of entity.connections) {
        const j = entityIndex.get(conn.targetId);
        if (j === undefined) continue;

        // Get weight from config (default to 0.3 if unknown type)
        const relConfig = this.config.relationshipTypes[conn.relationshipType.toLowerCase()];
        let weight = relConfig?.weight ?? 0.3;

        // Apply strength modifier
        weight *= conn.strength ?? 1;

        // Time decay (6-month half-life)
        const daysSince = (now - conn.createdDate.getTime()) / (1000 * 60 * 60 * 24);
        weight *= Math.exp(-daysSince / 180);

        matrix[i][j] = weight;

        // Handle bidirectional relationships
        if (relConfig?.bidirectional) {
          matrix[j][i] = weight;
        }
      }
    }

    return matrix;
  }

  /**
   * Compute activity score with time decay
   */
  private computeActivityScore(entity: CRMEntity): number {
    if (!entity.activities?.length) {
      return entity.importanceHint ?? 0.5; // Use hint or default
    }

    const now = Date.now();
    let score = 0.5; // Base score

    for (const activity of entity.activities) {
      const typeKey = activity.type.toLowerCase().replace(/[^a-z_]/g, '_');
      const config = this.config.activityTypes[typeKey];

      if (!config) {
        this.logger.debug(`Unknown activity type: ${activity.type}`);
        continue;
      }

      // Time decay
      const daysSince = (now - activity.date.getTime()) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-daysSince / config.decayDays);

      // Outcome modifier
      let outcomeMultiplier = 1;
      if (activity.outcome === 'positive') outcomeMultiplier = 1.2;
      if (activity.outcome === 'negative') outcomeMultiplier = 0.8;

      score += config.weight * decayFactor * outcomeMultiplier;
    }

    return Math.max(0, Math.min(1, score));
  }

  // ============================================================================
  // PHASE 1: VELOCITY, ACCELERATION & MOMENTUM (v2.0)
  // ============================================================================

  /**
   * Count activities within a time period
   * @param entity - Entity to analyze
   * @param startDaysAgo - Start of period (days ago from now)
   * @param endDaysAgo - End of period (days ago from now, 0 = now)
   * @returns Weighted activity count for the period
   */
  private countActivitiesInPeriod(
    entity: CRMEntity,
    startDaysAgo: number,
    endDaysAgo: number = 0
  ): number {
    if (!entity.activities?.length) return 0;

    const now = Date.now();
    const startTime = now - startDaysAgo * 24 * 60 * 60 * 1000;
    const endTime = now - endDaysAgo * 24 * 60 * 60 * 1000;

    let weightedCount = 0;

    for (const activity of entity.activities) {
      const activityTime = activity.date.getTime();
      if (activityTime >= startTime && activityTime <= endTime) {
        // Get activity weight from config
        const typeKey = activity.type.toLowerCase().replace(/[^a-z_]/g, '_');
        const config = this.config.activityTypes[typeKey];
        const weight = config?.weight ?? 0.1;

        // Positive activities count more
        const outcomeMultiplier = activity.outcome === 'positive' ? 1.5 :
                                  activity.outcome === 'negative' ? 0.5 : 1.0;

        weightedCount += Math.abs(weight) * outcomeMultiplier;
      }
    }

    return weightedCount;
  }

  /**
   * Compute Engagement Velocity
   * Rate of change in engagement between two periods
   *
   * Formula: V = (E_current - E_previous) / E_previous
   * Where E = weighted activity count for the period
   *
   * @returns velocity value (positive = increasing engagement, negative = declining)
   */
  private computeEngagementVelocity(entity: CRMEntity): {
    velocity: number;
    currentPeriod: number;
    previousPeriod: number;
  } {
    const periodDays = this.config.velocityPeriodDays;

    // Count activities in current period (last N days)
    const currentPeriod = this.countActivitiesInPeriod(entity, periodDays, 0);

    // Count activities in previous period (N to 2N days ago)
    const previousPeriod = this.countActivitiesInPeriod(entity, periodDays * 2, periodDays);

    // Calculate velocity (rate of change)
    // Avoid division by zero - use small epsilon
    const epsilon = 0.01;
    const velocity = previousPeriod > epsilon
      ? (currentPeriod - previousPeriod) / previousPeriod
      : currentPeriod > 0 ? 1.0 : 0; // If no previous activity, any current activity = max positive velocity

    return {
      velocity: Math.max(-1, Math.min(1, velocity)), // Clamp to [-1, 1]
      currentPeriod,
      previousPeriod,
    };
  }

  /**
   * Compute Engagement Acceleration
   * Change in velocity over time (second derivative)
   *
   * Formula: A = V_current - V_previous
   * Where V = velocity for each period pair
   *
   * @returns acceleration value (positive = velocity increasing, negative = velocity decreasing)
   */
  private computeEngagementAcceleration(entity: CRMEntity): {
    acceleration: number;
    twoPeriodsAgo: number;
  } {
    const periodDays = this.config.velocityPeriodDays;

    // Current velocity (period 0-1 vs 1-2)
    const currentPeriod = this.countActivitiesInPeriod(entity, periodDays, 0);
    const previousPeriod = this.countActivitiesInPeriod(entity, periodDays * 2, periodDays);
    const twoPeriodsAgo = this.countActivitiesInPeriod(entity, periodDays * 3, periodDays * 2);

    const epsilon = 0.01;

    // Current velocity
    const currentVelocity = previousPeriod > epsilon
      ? (currentPeriod - previousPeriod) / previousPeriod
      : currentPeriod > 0 ? 1.0 : 0;

    // Previous velocity
    const previousVelocity = twoPeriodsAgo > epsilon
      ? (previousPeriod - twoPeriodsAgo) / twoPeriodsAgo
      : previousPeriod > 0 ? 1.0 : 0;

    // Acceleration = change in velocity
    const acceleration = currentVelocity - previousVelocity;

    return {
      acceleration: Math.max(-1, Math.min(1, acceleration)), // Clamp to [-1, 1]
      twoPeriodsAgo,
    };
  }

  /**
   * Compute comprehensive Momentum Score
   * Combines velocity, acceleration, and seasonal factors into a single predictive metric
   *
   * Formula: M = α × Velocity + β × Acceleration + γ × SeasonalFactor + δ × RecencyBonus
   *
   * @returns MomentumMetrics with all predictive signals
   */
  computeMomentumMetrics(entity: CRMEntity): MomentumMetrics {
    // Get velocity
    const velocityData = this.computeEngagementVelocity(entity);

    // Get acceleration
    const accelerationData = this.computeEngagementAcceleration(entity);

    // Get seasonal factor for current month
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const seasonalFactor = this.config.seasonalFactors[currentMonth] ?? 1.0;

    // Calculate days since last activity
    const now = Date.now();
    let daysSinceLastActivity = 999; // Default if no activities
    if (entity.activities?.length) {
      const lastActivityTime = Math.max(...entity.activities.map(a => a.date.getTime()));
      daysSinceLastActivity = Math.floor((now - lastActivityTime) / (1000 * 60 * 60 * 24));
    }

    // Recency bonus: recent activity gets a boost
    const recencyBonus = daysSinceLastActivity <= 7 ? 0.2 :
                         daysSinceLastActivity <= 14 ? 0.1 :
                         daysSinceLastActivity <= 30 ? 0.05 : 0;

    // Compute raw momentum score
    // Weights: 50% velocity, 30% acceleration, 20% recency
    const rawMomentum = (
      0.50 * velocityData.velocity +
      0.30 * accelerationData.acceleration +
      0.20 * recencyBonus
    );

    // Apply seasonal adjustment
    const adjustedMomentum = rawMomentum * seasonalFactor;

    // Normalize to 0-1 range (raw is in [-1, 1] range approximately)
    const momentumScore = Math.max(0, Math.min(1, (adjustedMomentum + 1) / 2));

    // Classify trend
    let trend: MomentumMetrics['trend'];
    if (velocityData.velocity > this.config.positiveMomentumThreshold &&
        accelerationData.acceleration > 0) {
      trend = 'accelerating';
    } else if (velocityData.velocity > this.config.positiveMomentumThreshold) {
      trend = 'steady';
    } else if (velocityData.velocity > this.config.negativeMomentumThreshold) {
      trend = 'decelerating';
    } else if (velocityData.velocity > -0.5) {
      trend = 'at_risk';
    } else {
      trend = 'churning';
    }

    // Override to churning if no activity for extended period
    if (daysSinceLastActivity > 60) {
      trend = 'churning';
    } else if (daysSinceLastActivity > 30 && trend !== 'accelerating') {
      trend = 'at_risk';
    }

    return {
      velocity: velocityData.velocity,
      acceleration: accelerationData.acceleration,
      momentumScore,
      seasonalFactor,
      trend,
      daysSinceLastActivity,
      periodCounts: {
        currentPeriod: velocityData.currentPeriod,
        previousPeriod: velocityData.previousPeriod,
        twoPeriodsAgo: accelerationData.twoPeriodsAgo,
      },
    };
  }

  /**
   * Compute query relevance score
   */
  private computeRelevanceScore(entity: CRMEntity, context: RankingContext): number {
    if (!context.query) return 0.5;

    const queryWords = new Set(
      context.query.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2)
    );

    if (queryWords.size === 0) return 0.5;

    // Build searchable text
    const searchText = [
      entity.name,
      entity.type,
      ...Object.values(entity.properties)
        .filter(v => typeof v === 'string' || typeof v === 'number')
        .map(v => String(v)),
    ].join(' ').toLowerCase();

    // Count matches
    let matches = 0;
    for (const word of queryWords) {
      if (searchText.includes(word)) matches++;
    }

    return matches / queryWords.size;
  }

  /**
   * Generate human-readable explanation
   * Enhanced in v2.0 to include momentum/velocity insights
   */
  private generateExplanation(
    entity: CRMEntity,
    networkScore: number,
    activityScore: number,
    relevanceScore: number,
    momentum?: MomentumMetrics
  ): string[] {
    const explanations: string[] = [];

    // PHASE 1: Momentum/Trend explanation (most actionable, show first)
    if (momentum) {
      switch (momentum.trend) {
        case 'accelerating':
          explanations.push(`📈 Accelerating: Engagement increasing rapidly (velocity: +${(momentum.velocity * 100).toFixed(0)}%)`);
          break;
        case 'steady':
          explanations.push(`➡️ Steady: Consistent engagement pattern`);
          break;
        case 'decelerating':
          explanations.push(`📉 Decelerating: Engagement slowing down (velocity: ${(momentum.velocity * 100).toFixed(0)}%)`);
          break;
        case 'at_risk':
          explanations.push(`⚠️ At Risk: ${momentum.daysSinceLastActivity} days since last activity`);
          break;
        case 'churning':
          explanations.push(`🚨 Churning: No engagement for ${momentum.daysSinceLastActivity}+ days - needs immediate attention`);
          break;
      }

      // Add velocity insight if significant
      if (Math.abs(momentum.velocity) > 0.3) {
        const direction = momentum.velocity > 0 ? 'up' : 'down';
        explanations.push(`Velocity: ${direction} ${Math.abs(momentum.velocity * 100).toFixed(0)}% week-over-week`);
      }

      // Add acceleration insight if changing
      if (Math.abs(momentum.acceleration) > 0.2) {
        const accelDirection = momentum.acceleration > 0 ? 'picking up speed' : 'losing momentum';
        explanations.push(`Trend: ${accelDirection}`);
      }
    }

    // Network explanation
    if (networkScore > 0.7) {
      explanations.push('High network influence (well-connected)');
    } else if (networkScore > 0.4) {
      explanations.push('Moderate network connections');
    } else if (networkScore < 0.2) {
      explanations.push('Limited network connections');
    }

    // Activity explanation
    if (activityScore > 0.7) {
      explanations.push('Strong recent engagement');
    } else if (activityScore > 0.4) {
      explanations.push('Some recent activity');
    } else if (activityScore < 0.3) {
      explanations.push('Limited recent engagement');
    }

    // Relevance explanation
    if (relevanceScore > 0.7) {
      explanations.push('Highly relevant to query');
    } else if (relevanceScore > 0.4) {
      explanations.push('Moderately relevant');
    }

    // Recent activity highlight
    if (entity.activities?.length) {
      const recent = entity.activities
        .filter(a => a.outcome === 'positive')
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

      if (recent) {
        const daysSince = Math.floor((Date.now() - recent.date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 7) {
          explanations.push(`Recent positive activity: ${recent.type.replace(/_/g, ' ')}`);
        }
      }
    }

    return explanations;
  }

  /**
   * Generate detailed breakdown
   */
  private generateBreakdown(entity: CRMEntity): IRISRankResult['breakdown'] {
    // Top activities by contribution
    const activityContributions: Array<{ type: string; contribution: number }> = [];
    const now = Date.now();

    for (const activity of entity.activities || []) {
      const typeKey = activity.type.toLowerCase().replace(/[^a-z_]/g, '_');
      const config = this.config.activityTypes[typeKey];
      if (!config) continue;

      const daysSince = (now - activity.date.getTime()) / (1000 * 60 * 60 * 24);
      const contribution = config.weight * Math.exp(-daysSince / config.decayDays);

      activityContributions.push({ type: activity.type, contribution });
    }

    // Connection counts by type
    const connectionCounts = new Map<string, number>();
    for (const conn of entity.connections || []) {
      const count = connectionCounts.get(conn.relationshipType) || 0;
      connectionCounts.set(conn.relationshipType, count + 1);
    }

    // Recency factor
    const daysSinceModified = (now - entity.lastModifiedDate.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.exp(-daysSinceModified / 30);

    return {
      topActivities: activityContributions
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .slice(0, 5),
      topConnections: Array.from(connectionCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      recencyFactor,
    };
  }

  /**
   * Invalidate cache for scope
   */
  clearCache(scopeId: string): void {
    this.rankCache.delete(scopeId);
    this.lastComputeTime.delete(scopeId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.rankCache.clear();
    this.lastComputeTime.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.rankCache.size,
      configuredActivityTypes: Object.keys(this.config.activityTypes).length,
      configuredRelationshipTypes: Object.keys(this.config.relationshipTypes).length,
    };
  }

  /**
   * Get current configuration (for inspection)
   */
  getConfig(): IRISRankConfig {
    return { ...this.config };
  }

  /**
   * Add or update activity type at runtime
   */
  addActivityType(name: string, config: ActivityConfig): void {
    this.config.activityTypes[name.toLowerCase()] = config;
    this.clearAllCaches();
    this.logger.log(`Added activity type: ${name}`);
  }

  /**
   * Add or update relationship type at runtime
   */
  addRelationshipType(name: string, config: RelationshipConfig): void {
    this.config.relationshipTypes[name.toLowerCase()] = config;
    this.clearAllCaches();
    this.logger.log(`Added relationship type: ${name}`);
  }

  /**
   * Update ranking weights at runtime
   * All four weights (network, activity, relevance, momentum) will be normalized to sum to 1.0
   */
  updateWeights(
    network: number,
    activity: number,
    relevance: number,
    momentum?: number,
  ): void {
    const momentumVal = momentum ?? this.config.momentumWeight;
    const total = network + activity + relevance + momentumVal;
    this.config.networkWeight = network / total;
    this.config.activityWeight = activity / total;
    this.config.relevanceWeight = relevance / total;
    this.config.momentumWeight = momentumVal / total;
    this.clearAllCaches();
    this.logger.log(
      `Updated weights: network=${this.config.networkWeight.toFixed(2)}, ` +
        `activity=${this.config.activityWeight.toFixed(2)}, ` +
        `relevance=${this.config.relevanceWeight.toFixed(2)}, ` +
        `momentum=${this.config.momentumWeight.toFixed(2)}`,
    );
  }
}

// ============================================================================
// FACTORY FUNCTION - For standalone usage outside NestJS
// ============================================================================

/**
 * Create IRISRank instance without dependency injection
 * Use this for standalone usage or in non-NestJS environments
 *
 * @example
 * const ranker = createIRISRanker({
 *   networkWeight: 0.5,
 *   activityWeight: 0.3,
 *   relevanceWeight: 0.2,
 *   activityTypes: {
 *     'custom_event': { weight: 0.3, decayDays: 7 }
 *   }
 * });
 * const results = await ranker.getRankedEntities('user123', entities, { query: 'high value' });
 */
export function createIRISRanker(config?: IRISRankConfig): IRISRankService {
  return new IRISRankService(config);
}

// ============================================================================
// HELPER FUNCTIONS - For data transformation
// ============================================================================

/**
 * Transform generic records to CRMEntity format
 * Useful for adapting data from any source
 */
export function transformToEntity(
  record: Record<string, any>,
  options: {
    idField?: string;
    nameField?: string;
    typeValue?: string;
    typeField?: string;
    createdDateField?: string;
    modifiedDateField?: string;
    connectionExtractor?: (record: Record<string, any>) => EntityConnection[];
    activityExtractor?: (record: Record<string, any>) => EntityActivity[];
  } = {}
): CRMEntity {
  const {
    idField = 'id',
    nameField = 'name',
    typeValue,
    typeField = 'type',
    createdDateField = 'createdAt',
    modifiedDateField = 'updatedAt',
    connectionExtractor,
    activityExtractor,
  } = options;

  return {
    id: record[idField] || record.Id || record._id || String(Math.random()),
    name: record[nameField] || record.Name || record.title || 'Unknown',
    type: typeValue || record[typeField] || 'Entity',
    properties: { ...record },
    connections: connectionExtractor?.(record) || [],
    activities: activityExtractor?.(record) || [],
    createdDate: new Date(record[createdDateField] || record.CreatedDate || Date.now()),
    lastModifiedDate: new Date(record[modifiedDateField] || record.LastModifiedDate || record[createdDateField] || Date.now()),
  };
}

/**
 * Batch transform records
 */
export function transformToEntities(
  records: Record<string, any>[],
  options: Parameters<typeof transformToEntity>[1] = {}
): CRMEntity[] {
  return records.map(r => transformToEntity(r, options));
}
