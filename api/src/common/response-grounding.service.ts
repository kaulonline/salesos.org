/**
 * Response Grounding Service
 *
 * Verifies AI responses against tool execution facts before sending to users.
 * Prevents hallucinations by:
 * 1. Extracting claims from AI responses
 * 2. Verifying claims against tool facts
 * 3. Removing or correcting ungrounded claims
 * 4. Generating verified responses based on risk level
 *
 * Inspired by Perplexity's citation-grounded architecture.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  GroundedToolResult,
  RiskLevel,
  BaseFacts,
  EmailSendFacts,
  MeetingScheduleFacts,
  MeetingCancelFacts,
  RecordCreateFacts,
  RecordUpdateFacts,
  RecordDeleteFacts,
  SearchFacts,
} from './grounded-tool-result.interface';

// =============================================================================
// CLAIM INTERFACES
// =============================================================================

export type ClaimType = 'action' | 'state' | 'count' | 'list' | 'assertion';

export interface Claim {
  /** Type of claim being made */
  type: ClaimType;
  /** The claim text extracted from AI response */
  text: string;
  /** The subject of the claim (e.g., email recipient, record name) */
  subject?: string;
  /** The value associated with the claim (e.g., count, status) */
  value?: any;
  /** Original position in the response for replacement */
  startIndex?: number;
  endIndex?: number;
  /** The fact key this claim maps to */
  factKey?: string;
}

export interface VerificationResult {
  /** The claim being verified */
  claim: Claim;
  /** Whether the claim was verified against facts */
  verified: boolean;
  /** Which fact supports this claim */
  groundedBy?: string;
  /** What fact contradicts this claim */
  contradiction?: string;
  /** Confidence score (0-1) */
  confidence: number;
}

export interface GroundingResult {
  /** The final grounded response */
  response: string;
  /** Whether the response was modified */
  wasModified: boolean;
  /** Claims that were removed */
  removedClaims: Claim[];
  /** Claims that were corrected */
  correctedClaims: Array<{ original: Claim; corrected: string }>;
  /** Warnings to log */
  warnings: string[];
  /** Audit trail for compliance */
  auditTrail: GroundingAuditEntry[];
}

export interface GroundingAuditEntry {
  timestamp: Date;
  toolName: string;
  riskLevel: RiskLevel;
  claimsExtracted: number;
  claimsVerified: number;
  claimsRemoved: number;
  claimsCorrected: number;
  responseModified: boolean;
  details?: string;
}

// =============================================================================
// CLAIM EXTRACTION PATTERNS
// =============================================================================

interface ClaimPattern {
  /** Regex pattern to match in AI response */
  pattern: RegExp;
  /** Type of claim */
  type: ClaimType;
  /** Key in facts object to verify against */
  factKey: string;
  /** Optional capture group for value extraction */
  valueGroup?: number;
  /** Optional capture group for subject extraction */
  subjectGroup?: number;
}

const CLAIM_PATTERNS: ClaimPattern[] = [
  // ===== EMAIL ACTION CLAIMS =====
  {
    pattern: /(?:I |I've |I have )?(?:sent|delivered|emailed|forwarded)\s+(?:an? )?(?:email|message)\s+(?:to\s+)?([^\.\n,]+)/i,
    type: 'action',
    factKey: 'email_sent',
    subjectGroup: 1,
  },
  {
    pattern: /email\s+(?:was |has been )?(?:sent|delivered)\s+(?:successfully\s+)?(?:to\s+)?([^\.\n,]+)/i,
    type: 'action',
    factKey: 'email_sent',
    subjectGroup: 1,
  },
  {
    pattern: /(?:successfully |have )?sent\s+(?:the |an? )?email/i,
    type: 'action',
    factKey: 'email_sent',
  },

  // ===== MEETING ACTION CLAIMS =====
  {
    pattern: /(?:I |I've |I have )?(?:scheduled|booked|created|set up)\s+(?:a |the )?(?:meeting|call|session)/i,
    type: 'action',
    factKey: 'meeting_created',
  },
  {
    pattern: /meeting\s+(?:has been |was )?(?:scheduled|booked|created)\s+(?:successfully)?/i,
    type: 'action',
    factKey: 'meeting_created',
  },
  {
    pattern: /(?:calendar )?invit(?:e|ation)s?\s+(?:were |have been |has been )?(?:sent|delivered)\s+(?:to\s+)?([^\.\n,]+)?/i,
    type: 'action',
    factKey: 'invites_sent',
    subjectGroup: 1,
  },
  {
    pattern: /(?:I |I've |I have )?(?:cancelled|canceled|deleted)\s+(?:the |your )?meeting/i,
    type: 'action',
    factKey: 'meeting_cancelled',
  },
  {
    pattern: /meeting\s+(?:has been |was )?(?:cancelled|canceled)/i,
    type: 'action',
    factKey: 'meeting_cancelled',
  },
  {
    pattern: /(?:cancellation )?notifications?\s+(?:were |have been |has been )?sent\s+(?:to\s+)?([^\.\n,]+)?/i,
    type: 'action',
    factKey: 'notifications_sent',
    subjectGroup: 1,
  },

  // ===== RECORD COUNT CLAIMS =====
  {
    pattern: /(\d+)\s+(?:records?|leads?|contacts?|accounts?|opportunities?|tasks?)\s+(?:were |have been |has been )?(?:created|added)/i,
    type: 'count',
    factKey: 'successful_count',
    valueGroup: 1,
  },
  {
    pattern: /(?:created|added)\s+(\d+)\s+(?:records?|leads?|contacts?|accounts?|opportunities?|tasks?)/i,
    type: 'count',
    factKey: 'successful_count',
    valueGroup: 1,
  },
  {
    pattern: /(\d+)\s+(?:records?|leads?|contacts?|accounts?|opportunities?|tasks?)\s+(?:were |have been |has been )?(?:updated|modified)/i,
    type: 'count',
    factKey: 'successful_count',
    valueGroup: 1,
  },
  {
    pattern: /(\d+)\s+(?:records?|leads?|contacts?|accounts?|opportunities?|tasks?)\s+(?:were |have been |has been )?(?:deleted|removed)/i,
    type: 'count',
    factKey: 'successful_count',
    valueGroup: 1,
  },

  // ===== RECORD ACTION CLAIMS =====
  {
    pattern: /(?:I |I've |I have )?(?:created|added)\s+(?:a |the )?(?:new )?(lead|contact|account|opportunity|task)\s*(?:named |called |for )?["']?([^"'\.\n,]+)["']?/i,
    type: 'action',
    factKey: 'record_created',
    subjectGroup: 2,
  },
  {
    pattern: /(?:the )?(lead|contact|account|opportunity|task)\s+(?:has been |was )?(?:created|added)\s+(?:successfully)?/i,
    type: 'action',
    factKey: 'record_created',
  },
  {
    pattern: /(?:I |I've |I have )?(?:updated|modified|changed)\s+(?:the )?(lead|contact|account|opportunity|task)/i,
    type: 'action',
    factKey: 'record_updated',
  },
  {
    pattern: /(?:the )?(lead|contact|account|opportunity|task)\s+(?:has been |was )?(?:updated|modified)/i,
    type: 'action',
    factKey: 'record_updated',
  },
  {
    pattern: /(?:I |I've |I have )?(?:deleted|removed)\s+(?:the )?(lead|contact|account|opportunity|task)/i,
    type: 'action',
    factKey: 'record_deleted',
  },

  // ===== STATE CHANGE CLAIMS =====
  {
    pattern: /status\s+(?:has been |was )?(?:changed|updated|set)\s+(?:from\s+\w+\s+)?to\s+["']?(\w+)["']?/i,
    type: 'state',
    factKey: 'new_status',
    valueGroup: 1,
  },
  {
    pattern: /(?:the |your )?\s*stage\s+(?:has been |was )?(?:changed|updated|moved)\s+to\s+["']?([^"'\.\n,]+)["']?/i,
    type: 'state',
    factKey: 'new_status',
    valueGroup: 1,
  },

  // ===== SEARCH/QUERY CLAIMS =====
  {
    pattern: /found\s+(\d+)\s+(?:matching\s+)?(?:results?|records?|leads?|contacts?|accounts?|opportunities?)/i,
    type: 'count',
    factKey: 'total_matching',
    valueGroup: 1,
  },
  {
    pattern: /(?:there are |showing |returned )\s*(\d+)\s+(?:results?|records?|leads?|contacts?)/i,
    type: 'count',
    factKey: 'total_matching',
    valueGroup: 1,
  },
  {
    pattern: /no\s+(?:matching\s+)?(?:results?|records?|leads?|contacts?)\s+(?:were\s+)?found/i,
    type: 'count',
    factKey: 'total_matching',
    valueGroup: undefined,
  },

  // ===== ASSERTION CLAIMS =====
  {
    pattern: /synced\s+(?:to|with)\s+Salesforce/i,
    type: 'assertion',
    factKey: 'salesforce_synced',
  },
  {
    pattern: /calendar\s+event\s+(?:was |has been )?(?:created|added)/i,
    type: 'assertion',
    factKey: 'calendar_event_created',
  },
];

// =============================================================================
// RESPONSE GROUNDING SERVICE
// =============================================================================

@Injectable()
export class ResponseGroundingService {
  private readonly logger = new Logger(ResponseGroundingService.name);

  constructor() {
    this.logger.log('Response Grounding Service initialized');
  }

  /**
   * Ground an AI response against tool execution facts
   *
   * @param aiResponse - The AI-generated response text
   * @param toolResults - Array of grounded tool results with facts
   * @param riskLevel - The highest risk level among executed tools
   * @returns GroundingResult with the verified response
   */
  async groundResponse(
    aiResponse: string,
    toolResults: GroundedToolResult[],
    riskLevel: RiskLevel,
  ): Promise<GroundingResult> {
    const auditTrail: GroundingAuditEntry[] = [];
    let modifiedResponse = aiResponse;
    const removedClaims: Claim[] = [];
    const correctedClaims: Array<{ original: Claim; corrected: string }> = [];
    const warnings: string[] = [];

    // For empty results or no tool results, return as-is with warning
    if (!toolResults || toolResults.length === 0) {
      warnings.push('No tool results provided for grounding');
      return {
        response: aiResponse,
        wasModified: false,
        removedClaims: [],
        correctedClaims: [],
        warnings,
        auditTrail,
      };
    }

    // Aggregate all facts from tool results
    const aggregatedFacts = this.aggregateFacts(toolResults);

    // Extract claims from AI response
    const claims = this.extractClaims(aiResponse);

    this.logger.debug(
      `Extracted ${claims.length} claims from AI response for ${riskLevel} risk grounding`,
    );

    // Handle based on risk level
    switch (riskLevel) {
      case 'CRITICAL':
        return this.handleCriticalRisk(
          aiResponse,
          toolResults,
          claims,
          aggregatedFacts,
          auditTrail,
        );

      case 'HIGH':
        return this.handleHighRisk(
          aiResponse,
          toolResults,
          claims,
          aggregatedFacts,
          auditTrail,
        );

      case 'MEDIUM':
        return this.handleMediumRisk(
          aiResponse,
          toolResults,
          claims,
          aggregatedFacts,
          auditTrail,
        );

      case 'LOW':
      default:
        return this.handleLowRisk(
          aiResponse,
          toolResults,
          claims,
          aggregatedFacts,
          auditTrail,
        );
    }
  }

  /**
   * Handle CRITICAL risk tools - use verified_response entirely
   */
  private handleCriticalRisk(
    aiResponse: string,
    toolResults: GroundedToolResult[],
    claims: Claim[],
    facts: Record<string, any>,
    auditTrail: GroundingAuditEntry[],
  ): GroundingResult {
    const warnings: string[] = [];
    const removedClaims: Claim[] = [];

    // For CRITICAL tools, build response from verified_responses only
    const verifiedParts: string[] = [];

    for (const result of toolResults) {
      if (result.verified_response) {
        verifiedParts.push(result.verified_response);
      }
    }

    // Extract allowed additions from AI response
    const allowedAdditions = this.extractAllowedAdditions(
      aiResponse,
      toolResults[0]?.allowed_additions || [],
    );

    // Build the grounded response
    let groundedResponse = verifiedParts.join('\n\n');

    // Add allowed additions if any
    if (allowedAdditions) {
      groundedResponse += '\n\n' + allowedAdditions;
    }

    // Any claims in original AI response that contradict facts are removed
    const verificationResults = this.verifyAllClaims(claims, facts);
    const contradictions = verificationResults.filter(
      (v) => !v.verified && v.contradiction,
    );

    if (contradictions.length > 0) {
      warnings.push(
        `CRITICAL: Removed ${contradictions.length} ungrounded claims from AI response`,
      );
      removedClaims.push(...contradictions.map((c) => c.claim));
    }

    // Record audit entry
    auditTrail.push({
      timestamp: new Date(),
      toolName: 'CRITICAL_TOOLS',
      riskLevel: 'CRITICAL',
      claimsExtracted: claims.length,
      claimsVerified: verificationResults.filter((v) => v.verified).length,
      claimsRemoved: contradictions.length,
      claimsCorrected: 0,
      responseModified: groundedResponse !== aiResponse,
      details: `Used verified_response exclusively. Removed claims: ${removedClaims.map((c) => c.text).join(', ')}`,
    });

    this.logger.warn(
      `[GROUNDING:CRITICAL] Modified AI response. Removed ${removedClaims.length} claims`,
    );

    return {
      response: groundedResponse,
      wasModified: true,
      removedClaims,
      correctedClaims: [],
      warnings,
      auditTrail,
    };
  }

  /**
   * Handle HIGH risk tools - verify all action claims, remove ungrounded ones
   */
  private handleHighRisk(
    aiResponse: string,
    toolResults: GroundedToolResult[],
    claims: Claim[],
    facts: Record<string, any>,
    auditTrail: GroundingAuditEntry[],
  ): GroundingResult {
    const warnings: string[] = [];
    const removedClaims: Claim[] = [];
    const correctedClaims: Array<{ original: Claim; corrected: string }> = [];

    // Verify all claims
    const verificationResults = this.verifyAllClaims(claims, facts);

    // Find contradictions and unverified claims
    const contradictions = verificationResults.filter(
      (v) => !v.verified && v.contradiction,
    );

    let modifiedResponse = aiResponse;

    // Remove contradictory claims from response
    if (contradictions.length > 0) {
      modifiedResponse = this.removeContradictions(
        aiResponse,
        contradictions,
      );
      removedClaims.push(...contradictions.map((c) => c.claim));

      warnings.push(
        `HIGH: Removed ${contradictions.length} claims that contradict tool facts`,
      );
    }

    // For failed tool results, add error context
    const failedResults = toolResults.filter((r) => !r.success);
    if (failedResults.length > 0) {
      const errorAddendum = failedResults
        .map((r) => r.error || 'Operation failed')
        .join('. ');

      // If AI response claims success but tool failed, replace with verified_response
      const successClaims = claims.filter(
        (c) =>
          c.type === 'action' &&
          (c.factKey === 'email_sent' ||
            c.factKey === 'meeting_created' ||
            c.factKey === 'record_created'),
      );

      if (successClaims.length > 0) {
        // Use verified_response from failed tools
        modifiedResponse = failedResults
          .map((r) => r.verified_response)
          .join('\n\n');

        removedClaims.push(...successClaims);
        warnings.push(
          'HIGH: AI claimed success but tool failed - replaced with verified error response',
        );
      }
    }

    // Record audit entry
    auditTrail.push({
      timestamp: new Date(),
      toolName: 'HIGH_RISK_TOOLS',
      riskLevel: 'HIGH',
      claimsExtracted: claims.length,
      claimsVerified: verificationResults.filter((v) => v.verified).length,
      claimsRemoved: removedClaims.length,
      claimsCorrected: correctedClaims.length,
      responseModified: modifiedResponse !== aiResponse,
      details: `Verified action claims. Removed: ${removedClaims.map((c) => c.text).join(', ')}`,
    });

    if (modifiedResponse !== aiResponse) {
      this.logger.warn(
        `[GROUNDING:HIGH] Modified AI response. Removed claims: ${removedClaims.map((c) => c.text).join(', ')}`,
      );
    }

    return {
      response: modifiedResponse,
      wasModified: modifiedResponse !== aiResponse,
      removedClaims,
      correctedClaims,
      warnings,
      auditTrail,
    };
  }

  /**
   * Handle MEDIUM risk tools - add confidence warnings for low-confidence claims
   */
  private handleMediumRisk(
    aiResponse: string,
    toolResults: GroundedToolResult[],
    claims: Claim[],
    facts: Record<string, any>,
    auditTrail: GroundingAuditEntry[],
  ): GroundingResult {
    const warnings: string[] = [];
    const removedClaims: Claim[] = [];
    const correctedClaims: Array<{ original: Claim; corrected: string }> = [];

    // Verify all claims
    const verificationResults = this.verifyAllClaims(claims, facts);

    // Find low-confidence claims
    const lowConfidenceClaims = verificationResults.filter(
      (v) => v.confidence < 0.7 && !v.verified,
    );

    let modifiedResponse = aiResponse;

    // Add confidence warnings for medium risk
    if (lowConfidenceClaims.length > 0) {
      const warningPrefix = this.generateConfidenceWarnings(
        lowConfidenceClaims,
        facts,
      );

      if (warningPrefix) {
        modifiedResponse = warningPrefix + '\n\n' + aiResponse;
        warnings.push(
          `MEDIUM: Added confidence warnings for ${lowConfidenceClaims.length} claims`,
        );
      }
    }

    // Record audit entry
    auditTrail.push({
      timestamp: new Date(),
      toolName: 'MEDIUM_RISK_TOOLS',
      riskLevel: 'MEDIUM',
      claimsExtracted: claims.length,
      claimsVerified: verificationResults.filter((v) => v.verified).length,
      claimsRemoved: 0,
      claimsCorrected: 0,
      responseModified: modifiedResponse !== aiResponse,
      details: `Added warnings for ${lowConfidenceClaims.length} low-confidence claims`,
    });

    return {
      response: modifiedResponse,
      wasModified: modifiedResponse !== aiResponse,
      removedClaims,
      correctedClaims,
      warnings,
      auditTrail,
    };
  }

  /**
   * Handle LOW risk tools - minimal intervention, log for audit only
   */
  private handleLowRisk(
    aiResponse: string,
    toolResults: GroundedToolResult[],
    claims: Claim[],
    facts: Record<string, any>,
    auditTrail: GroundingAuditEntry[],
  ): GroundingResult {
    // Verify all claims for audit purposes
    const verificationResults = this.verifyAllClaims(claims, facts);

    // Record audit entry but don't modify response
    auditTrail.push({
      timestamp: new Date(),
      toolName: 'LOW_RISK_TOOLS',
      riskLevel: 'LOW',
      claimsExtracted: claims.length,
      claimsVerified: verificationResults.filter((v) => v.verified).length,
      claimsRemoved: 0,
      claimsCorrected: 0,
      responseModified: false,
      details: 'Low risk - audit only, no modifications',
    });

    return {
      response: aiResponse,
      wasModified: false,
      removedClaims: [],
      correctedClaims: [],
      warnings: [],
      auditTrail,
    };
  }

  /**
   * Extract claims from AI response text
   */
  extractClaims(response: string): Claim[] {
    const claims: Claim[] = [];

    for (const pattern of CLAIM_PATTERNS) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags + 'g');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(response)) !== null) {
        const claim: Claim = {
          type: pattern.type,
          text: match[0],
          factKey: pattern.factKey,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        };

        // Extract value if capture group specified
        if (pattern.valueGroup !== undefined && match[pattern.valueGroup]) {
          const rawValue = match[pattern.valueGroup];
          claim.value = isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
        }

        // Extract subject if capture group specified
        if (pattern.subjectGroup !== undefined && match[pattern.subjectGroup]) {
          claim.subject = match[pattern.subjectGroup].trim();
        }

        claims.push(claim);
      }
    }

    // Sort by position in response
    claims.sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));

    return claims;
  }

  /**
   * Verify all extracted claims against facts
   */
  verifyAllClaims(claims: Claim[], facts: Record<string, any>): VerificationResult[] {
    return claims.map((claim) => this.verifyClaim(claim, facts));
  }

  /**
   * Verify a single claim against facts
   */
  private verifyClaim(claim: Claim, facts: Record<string, any>): VerificationResult {
    const result: VerificationResult = {
      claim,
      verified: false,
      confidence: 0,
    };

    // If no fact key, can't verify
    if (!claim.factKey) {
      result.confidence = 0.3; // Low confidence for unmatched claims
      return result;
    }

    const factValue = facts[claim.factKey];

    // Handle boolean facts
    if (typeof factValue === 'boolean') {
      result.verified = factValue === true;
      result.confidence = 1.0;

      if (!result.verified) {
        result.contradiction = `Fact "${claim.factKey}" is false but claim asserts it is true`;
      } else {
        result.groundedBy = claim.factKey;
      }
      return result;
    }

    // Handle count facts
    if (claim.type === 'count' && claim.value !== undefined) {
      const factCount = Number(factValue);

      if (!isNaN(factCount)) {
        if (claim.value === factCount) {
          result.verified = true;
          result.confidence = 1.0;
          result.groundedBy = `${claim.factKey}=${factCount}`;
        } else {
          result.verified = false;
          result.confidence = 1.0;
          result.contradiction = `Claim states ${claim.value} but fact shows ${factCount}`;
        }
      }
      return result;
    }

    // Handle string/value facts
    if (typeof factValue === 'string' && claim.value) {
      if (
        String(claim.value).toLowerCase() === factValue.toLowerCase()
      ) {
        result.verified = true;
        result.confidence = 1.0;
        result.groundedBy = `${claim.factKey}="${factValue}"`;
      } else {
        result.verified = false;
        result.confidence = 0.9;
        result.contradiction = `Claim states "${claim.value}" but fact shows "${factValue}"`;
      }
      return result;
    }

    // Handle array facts (e.g., recipients)
    if (Array.isArray(factValue)) {
      if (claim.subject) {
        const found = factValue.some(
          (v) =>
            String(v).toLowerCase().includes(claim.subject!.toLowerCase()) ||
            claim.subject!.toLowerCase().includes(String(v).toLowerCase()),
        );
        result.verified = found;
        result.confidence = found ? 0.9 : 0.5;
        if (found) {
          result.groundedBy = `${claim.factKey} contains "${claim.subject}"`;
        } else {
          result.contradiction = `"${claim.subject}" not found in ${claim.factKey}`;
        }
      }
      return result;
    }

    // If fact exists but type doesn't match, medium confidence
    if (factValue !== undefined) {
      result.verified = true;
      result.confidence = 0.6;
      result.groundedBy = claim.factKey;
    }

    return result;
  }

  /**
   * Aggregate facts from multiple tool results
   */
  private aggregateFacts(toolResults: GroundedToolResult[]): Record<string, any> {
    const aggregated: Record<string, any> = {};

    for (const result of toolResults) {
      if (result.facts) {
        Object.entries(result.facts).forEach(([key, value]) => {
          // For arrays, merge them
          if (Array.isArray(value) && Array.isArray(aggregated[key])) {
            aggregated[key] = [...aggregated[key], ...value];
          }
          // For numbers (counts), sum them
          else if (typeof value === 'number' && typeof aggregated[key] === 'number') {
            aggregated[key] = aggregated[key] + value;
          }
          // For booleans, AND them (all must be true)
          else if (typeof value === 'boolean' && typeof aggregated[key] === 'boolean') {
            aggregated[key] = aggregated[key] && value;
          }
          // Otherwise, use latest value
          else {
            aggregated[key] = value;
          }
        });
      }
    }

    return aggregated;
  }

  /**
   * Remove contradictory claims from response
   */
  private removeContradictions(
    response: string,
    contradictions: VerificationResult[],
  ): string {
    let modifiedResponse = response;

    // Sort by position (reverse order to preserve indices)
    const sortedContradictions = [...contradictions].sort(
      (a, b) =>
        (b.claim.startIndex || 0) - (a.claim.startIndex || 0),
    );

    for (const contradiction of sortedContradictions) {
      const { claim } = contradiction;

      if (claim.startIndex !== undefined && claim.endIndex !== undefined) {
        // Find the sentence containing this claim
        const sentenceMatch = this.findContainingSentence(
          modifiedResponse,
          claim.startIndex,
          claim.endIndex,
        );

        if (sentenceMatch) {
          // Remove the entire sentence
          modifiedResponse =
            modifiedResponse.slice(0, sentenceMatch.start) +
            modifiedResponse.slice(sentenceMatch.end);
        } else {
          // Just remove the claim text
          modifiedResponse =
            modifiedResponse.slice(0, claim.startIndex) +
            modifiedResponse.slice(claim.endIndex);
        }
      }
    }

    // Clean up double spaces and empty lines
    modifiedResponse = modifiedResponse
      .replace(/\n{3,}/g, '\n\n')
      .replace(/  +/g, ' ')
      .trim();

    return modifiedResponse;
  }

  /**
   * Find the sentence containing a claim
   */
  private findContainingSentence(
    text: string,
    start: number,
    end: number,
  ): { start: number; end: number } | null {
    // Find sentence boundaries
    const sentenceEndPattern = /[.!?]\s/g;
    let lastEnd = 0;
    let match: RegExpExecArray | null;

    const sentences: { start: number; end: number }[] = [];

    while ((match = sentenceEndPattern.exec(text)) !== null) {
      sentences.push({ start: lastEnd, end: match.index + 1 });
      lastEnd = match.index + match[0].length;
    }

    // Add final sentence
    if (lastEnd < text.length) {
      sentences.push({ start: lastEnd, end: text.length });
    }

    // Find sentence containing the claim
    for (const sentence of sentences) {
      if (sentence.start <= start && sentence.end >= end) {
        return sentence;
      }
    }

    return null;
  }

  /**
   * Generate confidence warnings for low-confidence claims
   */
  private generateConfidenceWarnings(
    lowConfidenceClaims: VerificationResult[],
    facts: Record<string, any>,
  ): string {
    if (lowConfidenceClaims.length === 0) {
      return '';
    }

    const warnings: string[] = [];

    for (const result of lowConfidenceClaims) {
      if (result.contradiction) {
        warnings.push(`Note: ${result.contradiction}`);
      } else if (result.claim.factKey && facts[result.claim.factKey] === undefined) {
        warnings.push(
          `Note: Could not verify "${result.claim.text}" against tool results`,
        );
      }
    }

    return warnings.length > 0
      ? '**Verification Notes:**\n' + warnings.map((w) => `- ${w}`).join('\n')
      : '';
  }

  /**
   * Extract allowed additions from AI response based on tool permissions
   */
  private extractAllowedAdditions(
    aiResponse: string,
    allowedAdditions: string[],
  ): string {
    const additions: string[] = [];

    // Extract suggestions if allowed
    if (allowedAdditions.includes('suggestions')) {
      const suggestionPatterns = [
        /(?:I suggest|I recommend|You (?:could|might|should)|Next steps?|Would you like)/gi,
        /(?:Here are some|Consider|You may want to)/gi,
      ];

      for (const pattern of suggestionPatterns) {
        const matches = aiResponse.match(pattern);
        if (matches) {
          // Find sentences containing suggestions
          const sentencePattern =
            /[^.!?]*(?:suggest|recommend|could|might|should|next steps?)[^.!?]*[.!?]/gi;
          const sentences = aiResponse.match(sentencePattern);
          if (sentences) {
            additions.push(...sentences);
          }
        }
      }
    }

    // Extract context if allowed
    if (allowedAdditions.includes('context')) {
      const contextPatterns = [
        /(?:For context|Note that|Keep in mind|It's worth noting)/gi,
      ];

      for (const pattern of contextPatterns) {
        const sentencePattern = new RegExp(
          `[^.!?]*${pattern.source}[^.!?]*[.!?]`,
          'gi',
        );
        const sentences = aiResponse.match(sentencePattern);
        if (sentences) {
          additions.push(...sentences);
        }
      }
    }

    // Remove duplicates and join
    return Array.from(new Set(additions)).join(' ').trim();
  }

  /**
   * Build response entirely from verified_responses
   */
  buildFromVerifiedResponses(toolResults: GroundedToolResult[]): string {
    return toolResults
      .filter((r) => r.verified_response)
      .map((r) => r.verified_response)
      .join('\n\n');
  }

  /**
   * Get the highest risk level from multiple tool results
   */
  getHighestRiskLevel(toolResults: GroundedToolResult[]): RiskLevel {
    const riskOrder: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    for (const risk of riskOrder) {
      if (toolResults.some((r) => r.risk_level === risk)) {
        return risk;
      }
    }

    return 'LOW';
  }

  /**
   * Log grounding audit entry
   */
  logAuditEntry(entry: GroundingAuditEntry): void {
    const logMessage = {
      timestamp: entry.timestamp.toISOString(),
      tool: entry.toolName,
      riskLevel: entry.riskLevel,
      claims: {
        extracted: entry.claimsExtracted,
        verified: entry.claimsVerified,
        removed: entry.claimsRemoved,
        corrected: entry.claimsCorrected,
      },
      modified: entry.responseModified,
      details: entry.details,
    };

    if (entry.responseModified) {
      this.logger.warn(`[GROUNDING AUDIT] ${JSON.stringify(logMessage)}`);
    } else {
      this.logger.debug(`[GROUNDING AUDIT] ${JSON.stringify(logMessage)}`);
    }
  }

  /**
   * Create a quick verification for common scenarios
   */
  quickVerify(
    claim: string,
    facts: BaseFacts,
  ): { verified: boolean; reason: string } {
    // Check action completion
    if (
      facts.action_completed === false &&
      /(?:sent|created|updated|deleted|scheduled|cancelled)/i.test(claim)
    ) {
      return {
        verified: false,
        reason: 'Action claimed but action_completed is false',
      };
    }

    // Check email specific
    const emailFacts = facts as EmailSendFacts;
    if (
      emailFacts.email_sent === false &&
      /(?:email|message)\s+(?:was\s+)?(?:sent|delivered)/i.test(claim)
    ) {
      return {
        verified: false,
        reason: 'Email send claimed but email_sent is false',
      };
    }

    // Check meeting specific
    const meetingFacts = facts as MeetingScheduleFacts;
    if (
      meetingFacts.meeting_created === false &&
      /meeting\s+(?:was\s+)?(?:scheduled|created|booked)/i.test(claim)
    ) {
      return {
        verified: false,
        reason: 'Meeting creation claimed but meeting_created is false',
      };
    }

    return { verified: true, reason: 'No contradictions found' };
  }
}
