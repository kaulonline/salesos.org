/**
 * Coaching Effectiveness DTOs
 *
 * Data Transfer Objects for the Coaching Effectiveness Metrics system.
 * Phase 2 Vertiv O2O Journey - Measures impact of coaching on sales performance.
 */

import { IsString, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';

// ==================== QUERY DTOs ====================

export class GetEffectivenessQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  lookbackDays?: number = 90;
}

export class GetRepEffectivenessQueryDto extends GetEffectivenessQueryDto {
  @IsOptional()
  @IsString()
  repId?: string;
}

// ==================== RESPONSE INTERFACES ====================

/**
 * Coaching intervention event - a 1:1 or coaching session
 */
export interface CoachingIntervention {
  id: string;
  type: 'ONE_ON_ONE' | 'COACHING_SESSION' | 'VIDEO_COACHING' | 'AGENDA_SESSION';
  repId: string;
  repName: string;
  managerId: string;
  managerName: string;
  date: string;
  duration?: number;
  actionItemsCreated: number;
  actionItemsCompleted: number;
  keyTopics?: string[];
}

/**
 * Before/After metrics comparison for a rep
 */
export interface BeforeAfterMetrics {
  periodLabel: string;
  // Win rate metrics
  winRate: number;
  winRateBefore: number;
  winRateChange: number;
  winRateChangePercent: number;
  // Deal size metrics
  avgDealSize: number;
  avgDealSizeBefore: number;
  avgDealSizeChange: number;
  avgDealSizeChangePercent: number;
  // Activity metrics
  activityLevel: number;
  activityLevelBefore: number;
  activityLevelChange: number;
  activityLevelChangePercent: number;
  // Pipeline coverage
  pipelineCoverage: number;
  pipelineCoverageBefore: number;
  pipelineCoverageChange: number;
  pipelineCoverageChangePercent: number;
  // Cycle time
  avgCycleTime: number;
  avgCycleTimeBefore: number;
  avgCycleTimeChange: number;
  avgCycleTimeChangePercent: number;
}

/**
 * Action item completion metrics
 */
export interface ActionItemCompletionMetrics {
  totalAssigned: number;
  totalCompleted: number;
  totalOverdue: number;
  completionRate: number;
  onTimeRate: number;
  avgDaysToComplete: number;
  byCategory: Array<{
    category: string;
    assigned: number;
    completed: number;
    completionRate: number;
  }>;
  byPriority: Array<{
    priority: string;
    assigned: number;
    completed: number;
    completionRate: number;
  }>;
}

/**
 * Performance trajectory data point
 */
export interface PerformanceDataPoint {
  period: string; // ISO date string
  winRate: number;
  avgDealSize: number;
  activityScore: number;
  pipelineValue: number;
  dealsWon: number;
  dealsLost: number;
  coachingInterventions: number;
  actionItemsCompleted: number;
}

/**
 * Coaching ROI metrics
 */
export interface CoachingROIMetrics {
  // Revenue metrics
  totalRevenueInfluenced: number;
  revenueFromCoachedDeals: number;
  avgDealSizeIncrease: number;
  avgDealSizeIncreasePercent: number;
  // Win metrics
  additionalDealsWon: number;
  winRateImprovement: number;
  winRateImprovementPercent: number;
  // Time metrics
  cycleTimeReduction: number;
  cycleTimeReductionPercent: number;
  // Activity metrics
  activityIncrease: number;
  activityIncreasePercent: number;
  // ROI calculation
  estimatedROI: number; // Revenue influenced / coaching investment
  coachingHoursInvested: number;
  revenuePerCoachingHour: number;
}

/**
 * Individual rep effectiveness summary
 */
export interface RepEffectivenessSummary {
  repId: string;
  repName: string;
  email?: string;
  // Coaching engagement
  totalCoachingSessions: number;
  lastCoachingDate?: string;
  avgSessionsPerMonth: number;
  // Performance metrics
  currentWinRate: number;
  winRateChange: number;
  currentAvgDealSize: number;
  avgDealSizeChange: number;
  // Action item metrics
  actionItemCompletionRate: number;
  onTimeCompletionRate: number;
  // Trend
  performanceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  trendScore: number; // -100 to 100
  // ROI
  revenueInfluenced: number;
  estimatedCoachingImpact: number;
}

/**
 * Team comparison metrics
 */
export interface TeamComparisonMetrics {
  teamId?: string;
  teamName?: string;
  managerId: string;
  managerName: string;
  // Aggregate metrics
  totalReps: number;
  repsWithImprovedWinRate: number;
  repsWithImprovedDealSize: number;
  avgWinRateChange: number;
  avgDealSizeChange: number;
  // Coaching metrics
  totalCoachingSessions: number;
  avgSessionsPerRep: number;
  actionItemCompletionRate: number;
  // ROI
  totalRevenueInfluenced: number;
  avgROIPerRep: number;
  // Rep details
  repSummaries: RepEffectivenessSummary[];
}

/**
 * Overall effectiveness dashboard summary
 */
export interface EffectivenessDashboardSummary {
  // Period info
  periodStart: string;
  periodEnd: string;
  // Overall metrics
  totalCoachingInterventions: number;
  totalRepsCoached: number;
  totalActionItemsCreated: number;
  totalActionItemsCompleted: number;
  overallCompletionRate: number;
  // Before/After summary
  avgWinRateChange: number;
  avgDealSizeChange: number;
  avgActivityChange: number;
  avgPipelineChange: number;
  // Performance distribution
  repsImproving: number;
  repsStable: number;
  repsDeclining: number;
  // ROI summary
  totalRevenueInfluenced: number;
  estimatedCoachingROI: number;
  // Top performers
  topImprovers: RepEffectivenessSummary[];
  // Recent interventions
  recentInterventions: CoachingIntervention[];
  // Trajectory
  performanceTrajectory: PerformanceDataPoint[];
}

/**
 * Full rep effectiveness report
 */
export interface RepEffectivenessReport {
  repId: string;
  repName: string;
  email?: string;
  periodStart: string;
  periodEnd: string;
  // Coaching history
  coachingInterventions: CoachingIntervention[];
  totalCoachingSessions: number;
  // Before/After comparison
  beforeAfterMetrics: BeforeAfterMetrics;
  // Action items
  actionItemMetrics: ActionItemCompletionMetrics;
  // Performance trajectory
  performanceTrajectory: PerformanceDataPoint[];
  // ROI
  roiMetrics: CoachingROIMetrics;
  // Summary
  summary: RepEffectivenessSummary;
}
