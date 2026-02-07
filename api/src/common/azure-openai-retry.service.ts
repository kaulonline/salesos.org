import { Injectable, Logger } from '@nestjs/common';
import { ERROR_MESSAGES } from './error-messages.constant';
import { ConfigService } from '@nestjs/config';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitterFactor: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes needed to close circuit
  timeout: number; // Time in ms before circuit half-opens
}

enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Reject all requests
  HALF_OPEN = 'HALF_OPEN', // Allow limited requests to test recovery
}

/**
 * Azure OpenAI Retry Service
 * 
 * Provides intelligent retry logic with exponential backoff for Azure OpenAI API calls.
 * Handles transient errors, rate limiting (429), and implements circuit breaker pattern
 * to prevent cascading failures and retry storms.
 * 
 * Features:
 * - Exponential backoff with jitter to prevent thundering herd
 * - Rate limit detection and Retry-After header handling
 * - Circuit breaker to stop retries during sustained outages
 * - Configurable retry policies per operation type
 */
@Injectable()
export class AzureOpenAIRetryService {
  private readonly logger = new Logger(AzureOpenAIRetryService.name);
  
  // Default retry configuration
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000, // 1 second
    maxDelayMs: 30000, // 30 seconds
    backoffFactor: 2.0,
    jitterFactor: 0.25, // +/- 25% randomization
  };

  // Circuit breaker configuration
  private readonly circuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5, // Open circuit after 5 consecutive failures
    successThreshold: 2, // Close circuit after 2 consecutive successes in HALF_OPEN
    timeout: 60000, // Wait 60s before trying HALF_OPEN
  };

  // Circuit breaker state
  private circuitState: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private circuitOpenedAt: number | null = null;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Azure OpenAI Retry Service initialized');
  }

  /**
   * Execute an Azure OpenAI API call with retry logic and circuit breaker
   * 
   * @param operation - The async function to execute
   * @param operationName - Name for logging purposes
   * @param retryConfig - Optional custom retry configuration
   * @returns Promise resolving to the operation result
   * @throws Error if all retries are exhausted or circuit is open
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };

    // Check circuit breaker
    if (this.circuitState === CircuitState.OPEN) {
      const now = Date.now();
      if (this.circuitOpenedAt && now - this.circuitOpenedAt >= this.circuitConfig.timeout) {
        // Transition to HALF_OPEN after timeout
        this.circuitState = CircuitState.HALF_OPEN;
        this.consecutiveSuccesses = 0;
        this.logger.log(`Circuit breaker transitioning to HALF_OPEN for ${operationName}`);
      } else {
        throw new Error(ERROR_MESSAGES.AI.CIRCUIT_BREAKER);
      }
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Success - update circuit breaker
        this.handleSuccess();
        
        if (attempt > 0) {
          this.logger.log(`${operationName} succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Determine if we should retry
        const shouldRetry = this.shouldRetryError(error);
        const isLastAttempt = attempt === config.maxRetries;
        
        if (!shouldRetry || isLastAttempt) {
          // Don't retry - update circuit breaker for failure
          this.handleFailure();
          
          if (isLastAttempt) {
            this.logger.error(
              `${operationName} failed after ${attempt + 1} attempts: ${error.message}`,
            );
          } else {
            this.logger.warn(
              `${operationName} failed with non-retryable error: ${error.message}`,
            );
          }
          
          throw this.wrapError(error, operationName, attempt + 1);
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(error, attempt, config);
        
        this.logger.warn(
          `${operationName} failed (attempt ${attempt + 1}/${config.maxRetries + 1}): ${error.message}. Retrying in ${delay}ms...`,
        );
        
        // Wait before retrying
        await this.sleep(delay);
      }
    }
    
    // Should never reach here, but TypeScript needs this
    throw lastError || new Error(`${operationName} failed after ${config.maxRetries + 1} attempts`);
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetryError(error: any): boolean {
    // Extract status code from various error formats
    const statusCode = error.status || error.statusCode || error.response?.status;
    
    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }
    
    // Retry on rate limiting
    if (statusCode === 429) {
      return true;
    }
    
    // Retry on server errors (5xx)
    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }
    
    // Retry on request timeout
    if (statusCode === 408) {
      return true;
    }
    
    // Don't retry on client errors (4xx except 408, 429)
    if (statusCode >= 400 && statusCode < 500) {
      return false;
    }
    
    // Retry on unknown errors (could be transient)
    return true;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(error: any, attempt: number, config: RetryConfig): number {
    // Check for Retry-After header (rate limiting)
    const retryAfter = this.parseRetryAfterHeader(error);
    if (retryAfter !== null) {
      return Math.min(retryAfter, config.maxDelayMs);
    }
    
    // Exponential backoff: initialDelay * backoffFactor^attempt
    const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffFactor, attempt);
    
    // Apply max delay cap
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    const jitter = this.calculateJitter(cappedDelay, config.jitterFactor);
    
    return Math.max(0, cappedDelay + jitter);
  }

  /**
   * Parse Retry-After header from 429 responses
   * Returns delay in milliseconds, or null if not present
   */
  private parseRetryAfterHeader(error: any): number | null {
    const retryAfter = error.response?.headers?.['retry-after'];
    
    if (!retryAfter) {
      return null;
    }
    
    // Retry-After can be seconds (number) or HTTP date
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000; // Convert to milliseconds
    }
    
    // Try parsing as HTTP date
    try {
      const date = new Date(retryAfter);
      const delay = date.getTime() - Date.now();
      return Math.max(0, delay);
    } catch {
      return null;
    }
  }

  /**
   * Calculate jitter to randomize delays and prevent thundering herd
   */
  private calculateJitter(delay: number, jitterFactor: number): number {
    if (jitterFactor <= 0) {
      return 0;
    }
    
    const maxJitter = delay * jitterFactor;
    // Random jitter between -maxJitter and +maxJitter
    return (Math.random() * 2 - 1) * maxJitter;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle successful operation for circuit breaker
   */
  private handleSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      
      if (this.consecutiveSuccesses >= this.circuitConfig.successThreshold) {
        // Close the circuit
        this.circuitState = CircuitState.CLOSED;
        this.consecutiveFailures = 0;
        this.circuitOpenedAt = null;
        this.logger.log('Circuit breaker CLOSED - Service recovered');
      }
    } else if (this.circuitState === CircuitState.CLOSED) {
      // Reset failure counter on success
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Handle failed operation for circuit breaker
   */
  private handleFailure(): void {
    this.consecutiveFailures++;
    
    if (this.circuitState === CircuitState.HALF_OPEN) {
      // Failure during HALF_OPEN - reopen circuit
      this.circuitState = CircuitState.OPEN;
      this.circuitOpenedAt = Date.now();
      this.consecutiveSuccesses = 0;
      this.logger.warn('Circuit breaker reopened after failure in HALF_OPEN state');
    } else if (this.circuitState === CircuitState.CLOSED) {
      if (this.consecutiveFailures >= this.circuitConfig.failureThreshold) {
        // Open the circuit
        this.circuitState = CircuitState.OPEN;
        this.circuitOpenedAt = Date.now();
        this.logger.error(`Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures`);
      }
    }
  }

  /**
   * Wrap error with additional context
   */
  private wrapError(error: any, operationName: string, attempts: number): Error {
    const statusCode = error.status || error.statusCode || error.response?.status;
    
    // Use centralized error messages for user-facing text
    let message: string;
    
    if (statusCode === 429) {
      message = ERROR_MESSAGES.AI.RATE_LIMIT;
    } else if (statusCode >= 500) {
      message = ERROR_MESSAGES.AI.SERVER_ERROR;
    } else if (statusCode === 408) {
      message = ERROR_MESSAGES.AI.TIMEOUT;
    } else {
      message = ERROR_MESSAGES.AI.GENERIC;
    }
    
    const wrappedError = new Error(message);
    wrappedError.cause = error;
    (wrappedError as any).originalError = error;
    (wrappedError as any).statusCode = statusCode;
    (wrappedError as any).attempts = attempts;
    (wrappedError as any).operationName = operationName;
    
    return wrappedError;
  }

  /**
   * Get current circuit breaker state for monitoring
   */
  getCircuitState(): { state: CircuitState; consecutiveFailures: number; consecutiveSuccesses: number } {
    return {
      state: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  /**
   * Manually reset circuit breaker (admin operation)
   */
  resetCircuit(): void {
    this.circuitState = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.circuitOpenedAt = null;
    this.logger.log('Circuit breaker manually reset');
  }
}
