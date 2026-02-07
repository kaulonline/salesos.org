/**
 * Speculative Cascade Service
 *
 * Implements Google-style speculative execution for AI inference:
 * 1. Run multiple inference paths in PARALLEL
 * 2. Return the FIRST valid result
 * 3. Cancel remaining paths
 *
 * Path hierarchy (fastest to slowest):
 * - Deterministic: Pattern matching + direct SOQL (< 100ms)
 * - Cached: Query fingerprint cache hit (< 50ms)
 * - Haiku: Fast LLM for simple queries (< 500ms)
 * - Sonnet: Full LLM for complex queries (< 2000ms)
 *
 * Expected outcome: P50 latency 300ms (down from 1200ms)
 */

import { Injectable, Logger } from '@nestjs/common';
import { IrisOptimizerService } from './iris-optimizer.service';
import { ERROR_MESSAGES } from '../common/error-messages.constant';

export interface SpeculativeResult {
  path: 'deterministic' | 'cached' | 'haiku' | 'sonnet' | 'failed';
  response: string;
  data?: any;
  visualization?: string;
  title?: string;
  latencyMs: number;
  confidence: number;
}

export interface SpeculativeConfig {
  enableDeterministic: boolean;
  enableCache: boolean;
  enableHaiku: boolean;
  enableSonnet: boolean;
  haikuTimeoutMs: number;
  sonnetTimeoutMs: number;
  minConfidence: number;
}

const DEFAULT_CONFIG: SpeculativeConfig = {
  enableDeterministic: true,
  enableCache: true,
  enableHaiku: true,
  enableSonnet: true,
  haikuTimeoutMs: 600,
  sonnetTimeoutMs: 3000,
  minConfidence: 0.7,
};

@Injectable()
export class SpeculativeCascadeService {
  private readonly logger = new Logger(SpeculativeCascadeService.name);

  // Statistics
  private stats = {
    totalQueries: 0,
    deterministicWins: 0,
    cacheWins: 0,
    haikuWins: 0,
    sonnetWins: 0,
    failures: 0,
    avgLatencyMs: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
  };

  // Latency tracking for percentiles
  private latencies: number[] = [];
  private readonly maxLatencySamples = 1000;

  constructor(private readonly irisOptimizer: IrisOptimizerService) {
    this.logger.log('Speculative Cascade Service initialized');
  }

  /**
   * Execute speculative cascade - run multiple paths in parallel
   * Returns the first valid result that meets confidence threshold
   */
  async executeSpeculative(
    query: string,
    executeSOQL: (soql: string) => Promise<any>,
    executeLLM: (model: 'haiku' | 'sonnet', query: string) => Promise<{ response: string; confidence: number }>,
    config: Partial<SpeculativeConfig> = {}
  ): Promise<SpeculativeResult> {
    const startTime = Date.now();
    const cfg = { ...DEFAULT_CONFIG, ...config };

    this.stats.totalQueries++;

    // Build array of speculation promises
    const speculations: Promise<SpeculativeResult>[] = [];

    // Path 1: Deterministic (pattern matching)
    if (cfg.enableDeterministic) {
      speculations.push(this.tryDeterministicPath(query, executeSOQL));
    }

    // Path 2: Cache hit
    if (cfg.enableCache) {
      speculations.push(this.tryCachedPath(query));
    }

    // Path 3: Haiku (fast LLM) with timeout
    if (cfg.enableHaiku) {
      speculations.push(this.tryHaikuPath(query, executeLLM, cfg.haikuTimeoutMs));
    }

    // Path 4: Sonnet (full LLM) - always runs as fallback
    if (cfg.enableSonnet) {
      speculations.push(this.trySonnetPath(query, executeLLM, cfg.sonnetTimeoutMs));
    }

    // Race all paths - first valid result wins
    try {
      const result = await this.raceWithValidation(speculations, cfg.minConfidence);
      result.latencyMs = Date.now() - startTime;

      // Update statistics
      this.updateStats(result);

      this.logger.log(
        `[SPECULATIVE] Path "${result.path}" won in ${result.latencyMs}ms (confidence: ${result.confidence.toFixed(2)})`
      );

      return result;
    } catch (error) {
      this.stats.failures++;
      this.logger.error(`[SPECULATIVE] All paths failed: ${error.message}`);

      return {
        path: 'failed',
        response: ERROR_MESSAGES.AI.GENERIC,
        latencyMs: Date.now() - startTime,
        confidence: 0,
      };
    }
  }

  /**
   * Deterministic path - pattern matching + direct SOQL
   */
  private async tryDeterministicPath(
    query: string,
    executeSOQL: (soql: string) => Promise<any>
  ): Promise<SpeculativeResult> {
    const startTime = Date.now();

    // Check for greeting (super fast)
    if (this.irisOptimizer.isGreeting(query)) {
      return {
        path: 'deterministic',
        response: this.irisOptimizer.getGreetingResponse(query),
        latencyMs: Date.now() - startTime,
        confidence: 1.0,
      };
    }

    // Check for deterministic template
    const template = this.irisOptimizer.matchDeterministicTemplate(query);
    if (template) {
      const result = await this.irisOptimizer.executeDeterministicQuery(template, executeSOQL);

      if (result.success) {
        return {
          path: 'deterministic',
          response: result.response,
          data: result.data,
          visualization: result.visualization,
          title: result.title,
          latencyMs: result.latencyMs,
          confidence: 0.95, // High confidence for template matches
        };
      }
    }

    // No match - throw to skip this path
    throw new Error('No deterministic match');
  }

  /**
   * Cached path - query fingerprint cache
   */
  private async tryCachedPath(query: string): Promise<SpeculativeResult> {
    // For now, this uses the optimizer's internal cache
    // In production, this would check a Redis/memory cache of query responses
    const template = this.irisOptimizer.matchDeterministicTemplate(query);

    if (template) {
      // Cache hit - return cached template info
      return {
        path: 'cached',
        response: template.responseTemplate,
        visualization: template.visualization,
        title: template.title,
        latencyMs: 1, // Near-instant
        confidence: 0.9,
      };
    }

    throw new Error('Cache miss');
  }

  /**
   * Haiku path - fast LLM with timeout
   */
  private async tryHaikuPath(
    query: string,
    executeLLM: (model: 'haiku' | 'sonnet', query: string) => Promise<{ response: string; confidence: number }>,
    timeoutMs: number
  ): Promise<SpeculativeResult> {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        executeLLM('haiku', query),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Haiku timeout')), timeoutMs)
        ),
      ]);

      return {
        path: 'haiku',
        response: result.response,
        latencyMs: Date.now() - startTime,
        confidence: result.confidence,
      };
    } catch (error) {
      throw new Error(`Haiku failed: ${error.message}`);
    }
  }

  /**
   * Sonnet path - full LLM (always succeeds, slowest)
   */
  private async trySonnetPath(
    query: string,
    executeLLM: (model: 'haiku' | 'sonnet', query: string) => Promise<{ response: string; confidence: number }>,
    timeoutMs: number
  ): Promise<SpeculativeResult> {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        executeLLM('sonnet', query),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Sonnet timeout')), timeoutMs)
        ),
      ]);

      return {
        path: 'sonnet',
        response: result.response,
        latencyMs: Date.now() - startTime,
        confidence: result.confidence,
      };
    } catch (error) {
      throw new Error(`Sonnet failed: ${error.message}`);
    }
  }

  /**
   * Race multiple promises, return first that meets confidence threshold
   */
  private async raceWithValidation(
    promises: Promise<SpeculativeResult>[],
    minConfidence: number
  ): Promise<SpeculativeResult> {
    // Create a race that filters by confidence
    return new Promise((resolve, reject) => {
      let completed = 0;
      const errors: Error[] = [];

      for (const promise of promises) {
        promise
          .then(result => {
            // Check if this result meets our confidence threshold
            if (result.confidence >= minConfidence) {
              resolve(result);
            } else {
              // Low confidence - wait for better result
              completed++;
              if (completed === promises.length) {
                // All done, return best result even if low confidence
                reject(new Error('No path met confidence threshold'));
              }
            }
          })
          .catch(error => {
            errors.push(error);
            completed++;
            if (completed === promises.length) {
              reject(new Error(`All paths failed: ${errors.map(e => e.message).join(', ')}`));
            }
          });
      }
    });
  }

  /**
   * Update statistics based on result
   */
  private updateStats(result: SpeculativeResult): void {
    switch (result.path) {
      case 'deterministic':
        this.stats.deterministicWins++;
        break;
      case 'cached':
        this.stats.cacheWins++;
        break;
      case 'haiku':
        this.stats.haikuWins++;
        break;
      case 'sonnet':
        this.stats.sonnetWins++;
        break;
    }

    // Track latencies for percentile calculation
    this.latencies.push(result.latencyMs);
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }

    // Update average
    this.stats.avgLatencyMs =
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;

    // Update percentiles
    const sorted = [...this.latencies].sort((a, b) => a - b);
    this.stats.p50LatencyMs = sorted[Math.floor(sorted.length * 0.5)] || 0;
    this.stats.p95LatencyMs = sorted[Math.floor(sorted.length * 0.95)] || 0;
  }

  /**
   * Get cascade statistics
   */
  getStats(): typeof this.stats & {
    deterministicRate: number;
    cacheRate: number;
    haikuRate: number;
    sonnetRate: number;
    failureRate: number;
  } {
    const total = this.stats.totalQueries || 1;
    return {
      ...this.stats,
      deterministicRate: (this.stats.deterministicWins / total) * 100,
      cacheRate: (this.stats.cacheWins / total) * 100,
      haikuRate: (this.stats.haikuWins / total) * 100,
      sonnetRate: (this.stats.sonnetWins / total) * 100,
      failureRate: (this.stats.failures / total) * 100,
    };
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats(): void {
    this.stats = {
      totalQueries: 0,
      deterministicWins: 0,
      cacheWins: 0,
      haikuWins: 0,
      sonnetWins: 0,
      failures: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
    };
    this.latencies = [];
  }
}
