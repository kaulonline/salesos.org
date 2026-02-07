import { Injectable, Logger } from '@nestjs/common';

/**
 * Dynamic Analytics Service
 * Computes sales metrics from raw CRM data
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  /**
   * Compute analytics based on metric type and data
   */
  async computeMetric(
    metricType: string,
    data: any[],
    options: {
      startDateField?: string;
      endDateField?: string;
      groupByField?: string;
      valueField?: string;
      statusField?: string;
      targetStatus?: string;
      convertedValues?: string[];
    } = {}
  ): Promise<{
    success: boolean;
    metric: string;
    result: any;
    breakdown?: any[];
    insights?: string[];
  }> {
    try {
      this.logger.log(`Computing metric: ${metricType} for ${data.length} records`);

      switch (metricType.toLowerCase()) {
        case 'cycle_time':
        case 'average_cycle_time':
        case 'avg_time':
          return this.computeCycleTime(data, options);

        case 'conversion_rate':
          return this.computeConversionRate(data, options);

        case 'stage_velocity':
          return this.computeStageVelocity(data, options);

        case 'win_rate':
          return this.computeWinRate(data, options);

        case 'average_deal_size':
        case 'avg_deal_size':
          return this.computeAverageDealSize(data, options);

        case 'pipeline_velocity':
          return this.computePipelineVelocity(data, options);

        case 'activity_frequency':
          return this.computeActivityFrequency(data, options);

        case 'distribution':
        case 'breakdown':
          return this.computeDistribution(data, options);

        case 'source_analysis':
        case 'lead_source_analysis':
        case 'attribution_analysis':
          return this.computeSourceAnalysis(data, options);

        case 'source_comparison':
          return this.computeSourceComparison(data, options);

        default:
          // Try to infer the metric type from the data
          return this.autoComputeMetric(data, options);
      }
    } catch (error) {
      this.logger.error(`Analytics computation failed: ${error.message}`);
      return {
        success: false,
        metric: metricType,
        result: null,
        insights: [`Error computing ${metricType}: ${error.message}`],
      };
    }
  }

  /**
   * Compute average time between two date fields
   */
  private computeCycleTime(
    data: any[],
    options: { startDateField?: string; endDateField?: string; groupByField?: string }
  ) {
    const startField = options.startDateField || this.findDateField(data, ['CreatedDate', 'created', 'startDate', 'OpenDate']);
    const endField = options.endDateField || this.findDateField(data, ['CloseDate', 'ClosedDate', 'ConvertedDate', 'endDate', 'LastModifiedDate']);

    if (!startField || !endField) {
      return {
        success: false,
        metric: 'cycle_time',
        result: null,
        insights: ['Could not find start and end date fields in the data'],
      };
    }

    const validRecords = data.filter(r => r[startField] && r[endField]);

    if (validRecords.length === 0) {
      return {
        success: false,
        metric: 'cycle_time',
        result: null,
        insights: ['No records with both start and end dates found'],
      };
    }

    const cycleTimes = validRecords.map(r => {
      const start = new Date(r[startField]);
      const end = new Date(r[endField]);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // Days
    });

    const avgDays = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
    const minDays = Math.min(...cycleTimes);
    const maxDays = Math.max(...cycleTimes);
    const medianDays = this.median(cycleTimes);

    // Group by if specified
    let breakdown: any[] = [];
    const groupField = options.groupByField;
    if (groupField && data[0]?.[groupField] !== undefined) {
      const groups = new Map<string, number[]>();
      validRecords.forEach((r, i) => {
        const group = String(r[groupField] || 'Unknown');
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(cycleTimes[i]);
      });

      breakdown = Array.from(groups.entries()).map(([group, times]) => ({
        group,
        count: times.length,
        avgDays: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        minDays: Math.round(Math.min(...times)),
        maxDays: Math.round(Math.max(...times)),
      })).sort((a, b) => a.avgDays - b.avgDays);
    }

    const insights: string[] = [];
    insights.push(`Average cycle time: ${Math.round(avgDays)} days across ${validRecords.length} records`);
    if (maxDays - minDays > avgDays) {
      insights.push(`High variance: cycles range from ${Math.round(minDays)} to ${Math.round(maxDays)} days`);
    }
    if (breakdown.length > 1) {
      const fastest = breakdown[0];
      const slowest = breakdown[breakdown.length - 1];
      insights.push(`Fastest: ${fastest.group} (${fastest.avgDays} days), Slowest: ${slowest.group} (${slowest.avgDays} days)`);
    }

    return {
      success: true,
      metric: 'cycle_time',
      result: {
        averageDays: Math.round(avgDays * 10) / 10,
        medianDays: Math.round(medianDays * 10) / 10,
        minDays: Math.round(minDays),
        maxDays: Math.round(maxDays),
        recordCount: validRecords.length,
        dateFields: { start: startField, end: endField },
      },
      breakdown,
      insights,
    };
  }

  /**
   * Compute conversion rate
   */
  private computeConversionRate(
    data: any[],
    options: { statusField?: string; targetStatus?: string }
  ) {
    const statusField = options.statusField || this.findField(data, ['Status', 'StageName', 'LeadStatus', 'IsConverted', 'IsWon']);

    if (!statusField) {
      return {
        success: false,
        metric: 'conversion_rate',
        result: null,
        insights: ['Could not find status field in the data'],
      };
    }

    const total = data.length;
    const targetStatuses = options.targetStatus
      ? [options.targetStatus.toLowerCase()]
      : ['converted', 'closed won', 'won', 'true', 'qualified'];

    const converted = data.filter(r => {
      const status = String(r[statusField] || '').toLowerCase();
      return targetStatuses.some(t => status.includes(t));
    }).length;

    const rate = total > 0 ? (converted / total) * 100 : 0;

    // Breakdown by status
    const statusCounts = new Map<string, number>();
    data.forEach(r => {
      const status = String(r[statusField] || 'Unknown');
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const breakdown = Array.from(statusCounts.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      metric: 'conversion_rate',
      result: {
        conversionRate: Math.round(rate * 10) / 10,
        converted,
        total,
        statusField,
      },
      breakdown,
      insights: [
        `Conversion rate: ${Math.round(rate)}% (${converted} of ${total})`,
        breakdown.length > 1 ? `Most common status: ${breakdown[0].status} (${breakdown[0].percentage}%)` : '',
      ].filter(Boolean),
    };
  }

  /**
   * Compute win rate for opportunities
   */
  private computeWinRate(data: any[], options: { statusField?: string }) {
    const statusField = options.statusField || this.findField(data, ['StageName', 'IsWon', 'IsClosed', 'Status']);

    if (!statusField) {
      return {
        success: false,
        metric: 'win_rate',
        result: null,
        insights: ['Could not find status field'],
      };
    }

    const closedWon = data.filter(r => {
      const val = String(r[statusField] || '').toLowerCase();
      return val.includes('closed won') || val.includes('won') || r['IsWon'] === true;
    }).length;

    const closedLost = data.filter(r => {
      const val = String(r[statusField] || '').toLowerCase();
      return val.includes('closed lost') || val.includes('lost');
    }).length;

    const totalClosed = closedWon + closedLost;
    const winRate = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;

    return {
      success: true,
      metric: 'win_rate',
      result: {
        winRate: Math.round(winRate * 10) / 10,
        closedWon,
        closedLost,
        totalClosed,
        openDeals: data.length - totalClosed,
      },
      insights: [
        `Win rate: ${Math.round(winRate)}% (${closedWon} wins out of ${totalClosed} closed deals)`,
        closedLost > closedWon ? `Warning: More deals lost than won` : '',
      ].filter(Boolean),
    };
  }

  /**
   * Compute average deal size
   */
  private computeAverageDealSize(data: any[], options: { valueField?: string }) {
    const valueField = options.valueField || this.findField(data, ['Amount', 'Value', 'DealSize', 'Revenue', 'TotalPrice']);

    if (!valueField) {
      return {
        success: false,
        metric: 'average_deal_size',
        result: null,
        insights: ['Could not find value/amount field'],
      };
    }

    const values = data
      .map(r => Number(r[valueField]))
      .filter(v => !isNaN(v) && v > 0);

    if (values.length === 0) {
      return {
        success: false,
        metric: 'average_deal_size',
        result: null,
        insights: ['No valid numeric values found'],
      };
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const total = values.reduce((a, b) => a + b, 0);
    const median = this.median(values);

    return {
      success: true,
      metric: 'average_deal_size',
      result: {
        averageSize: Math.round(avg),
        medianSize: Math.round(median),
        totalValue: Math.round(total),
        dealCount: values.length,
        minDeal: Math.min(...values),
        maxDeal: Math.max(...values),
      },
      insights: [
        `Average deal size: $${this.formatCurrency(avg)}`,
        `Total pipeline value: $${this.formatCurrency(total)} across ${values.length} deals`,
        median < avg * 0.8 ? `Note: Median ($${this.formatCurrency(median)}) is significantly lower than average - you have some large outlier deals` : '',
      ].filter(Boolean),
    };
  }

  /**
   * Compute stage velocity (time in each stage)
   */
  private computeStageVelocity(data: any[], options: { groupByField?: string }) {
    const stageField = options.groupByField || this.findField(data, ['StageName', 'Stage', 'Status']);

    if (!stageField) {
      return {
        success: false,
        metric: 'stage_velocity',
        result: null,
        insights: ['Could not find stage field'],
      };
    }

    // Group by stage and compute average amounts
    const stageData = new Map<string, { count: number; totalAmount: number }>();
    const amountField = this.findField(data, ['Amount', 'Value']);

    data.forEach(r => {
      const stage = String(r[stageField] || 'Unknown');
      const amount = amountField ? Number(r[amountField]) || 0 : 0;

      if (!stageData.has(stage)) {
        stageData.set(stage, { count: 0, totalAmount: 0 });
      }
      const sd = stageData.get(stage)!;
      sd.count++;
      sd.totalAmount += amount;
    });

    const breakdown = Array.from(stageData.entries()).map(([stage, data]) => ({
      stage,
      count: data.count,
      totalAmount: data.totalAmount,
      avgAmount: data.count > 0 ? Math.round(data.totalAmount / data.count) : 0,
    }));

    return {
      success: true,
      metric: 'stage_velocity',
      result: {
        stageCount: breakdown.length,
        totalRecords: data.length,
      },
      breakdown,
      insights: [
        `${breakdown.length} stages identified`,
        breakdown.length > 0 ? `Largest stage: ${breakdown.sort((a, b) => b.count - a.count)[0].stage} (${breakdown[0].count} records)` : '',
      ].filter(Boolean),
    };
  }

  /**
   * Compute pipeline velocity
   */
  private computePipelineVelocity(data: any[], options: {}) {
    const winRate = this.computeWinRate(data, {});
    const avgDealSize = this.computeAverageDealSize(data, {});
    const cycleTime = this.computeCycleTime(data, {});

    if (!winRate.success || !avgDealSize.success || !winRate.result || !avgDealSize.result) {
      return {
        success: false,
        metric: 'pipeline_velocity',
        result: null,
        insights: ['Could not compute all required metrics for pipeline velocity'],
      };
    }

    // Pipeline Velocity = (# of Opportunities × Win Rate × Average Deal Size) / Sales Cycle Length
    const numOpportunities = data.length;
    const wr = winRate.result.winRate / 100;
    const ads = avgDealSize.result.averageSize;
    const cycleLength = cycleTime.success && cycleTime.result ? cycleTime.result.averageDays : 30; // Default 30 days

    const velocity = (numOpportunities * wr * ads) / cycleLength;

    return {
      success: true,
      metric: 'pipeline_velocity',
      result: {
        velocityPerDay: Math.round(velocity),
        velocityPerMonth: Math.round(velocity * 30),
        components: {
          opportunities: numOpportunities,
          winRate: winRate.result.winRate,
          avgDealSize: ads,
          avgCycleDays: cycleLength,
        },
      },
      insights: [
        `Pipeline velocity: $${this.formatCurrency(velocity)}/day ($${this.formatCurrency(velocity * 30)}/month)`,
        `Based on ${numOpportunities} opportunities with ${Math.round(wr * 100)}% win rate`,
      ],
    };
  }

  /**
   * Compute activity frequency
   */
  private computeActivityFrequency(data: any[], options: { groupByField?: string }) {
    const dateField = this.findDateField(data, ['ActivityDate', 'CreatedDate', 'Date', 'DueDate']);

    if (!dateField) {
      return {
        success: false,
        metric: 'activity_frequency',
        result: null,
        insights: ['Could not find date field'],
      };
    }

    // Group by day/week
    const byDay = new Map<string, number>();
    data.forEach(r => {
      const date = new Date(r[dateField]);
      if (!isNaN(date.getTime())) {
        const dayKey = date.toISOString().split('T')[0];
        byDay.set(dayKey, (byDay.get(dayKey) || 0) + 1);
      }
    });

    const dailyCounts = Array.from(byDay.values());
    const avgPerDay = dailyCounts.length > 0 ? dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length : 0;

    return {
      success: true,
      metric: 'activity_frequency',
      result: {
        totalActivities: data.length,
        uniqueDays: byDay.size,
        avgPerDay: Math.round(avgPerDay * 10) / 10,
        peakDay: dailyCounts.length > 0 ? Math.max(...dailyCounts) : 0,
      },
      insights: [
        `${data.length} activities across ${byDay.size} days`,
        `Average ${Math.round(avgPerDay)} activities per active day`,
      ],
    };
  }

  /**
   * Compute distribution/breakdown
   */
  private computeDistribution(data: any[], options: { groupByField?: string; valueField?: string }) {
    const groupField = options.groupByField || this.findField(data, ['Status', 'StageName', 'Type', 'LeadSource', 'Industry']);

    if (!groupField) {
      return {
        success: false,
        metric: 'distribution',
        result: null,
        insights: ['Could not find field to group by'],
      };
    }

    const valueField = options.valueField || this.findField(data, ['Amount', 'Value']);
    const groups = new Map<string, { count: number; value: number }>();

    data.forEach(r => {
      const group = String(r[groupField] || 'Unknown');
      const value = valueField ? Number(r[valueField]) || 0 : 0;

      if (!groups.has(group)) {
        groups.set(group, { count: 0, value: 0 });
      }
      const g = groups.get(group)!;
      g.count++;
      g.value += value;
    });

    const totalRecords = data.length;
    const breakdown = Array.from(groups.entries())
      .map(([group, groupData]) => ({
        group,
        count: groupData.count,
        value: groupData.value,
        percentage: Math.round((groupData.count / totalRecords) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      metric: 'distribution',
      result: {
        groupCount: breakdown.length,
        totalRecords: data.length,
        groupField,
      },
      breakdown,
      insights: [
        `${breakdown.length} distinct ${groupField} values`,
        breakdown.length > 0 ? `Most common: ${breakdown[0].group} (${breakdown[0].count} records)` : '',
      ].filter(Boolean),
    };
  }

  /**
   * Auto-detect and compute appropriate metric
   */
  private autoComputeMetric(data: any[], options: {}) {
    // Check what fields are available
    const hasDateFields = this.findDateField(data, ['CreatedDate', 'CloseDate']) !== null;
    const hasAmountField = this.findField(data, ['Amount', 'Value']) !== null;
    const hasStatusField = this.findField(data, ['Status', 'StageName', 'IsWon']) !== null;

    if (hasDateFields) {
      return this.computeCycleTime(data, options);
    }
    if (hasAmountField) {
      return this.computeAverageDealSize(data, options);
    }
    if (hasStatusField) {
      const statusField = this.findField(data, ['Status', 'StageName']);
      return this.computeDistribution(data, { groupByField: statusField || undefined });
    }

    return {
      success: false,
      metric: 'auto',
      result: null,
      insights: ['Could not automatically determine appropriate metric for this data'],
    };
  }

  /**
   * Comprehensive lead source analysis - investigates why certain sources perform better
   * Uses dynamic field detection based on data patterns, not hardcoded field names
   */
  private computeSourceAnalysis(
    data: any[],
    options: { groupByField?: string; valueField?: string; statusField?: string; convertedValues?: string[] }
  ) {
    if (!data.length) {
      return {
        success: false,
        metric: 'source_analysis',
        result: null,
        insights: ['No data provided for analysis'],
      };
    }

    const fields = Object.keys(data[0]);

    // Dynamic field detection - find fields by pattern matching, not hardcoded names
    const sourceField = options.groupByField || this.detectFieldByPattern(fields, data, 'source');

    if (!sourceField) {
      return {
        success: false,
        metric: 'source_analysis',
        result: null,
        insights: [`Could not detect source/grouping field. Available: ${fields.join(', ')}. Pass groupByField explicitly.`],
      };
    }

    // Dynamically detect value, status, and date fields
    const valueField = options.valueField || this.detectFieldByPattern(fields, data, 'currency');
    const statusField = options.statusField || this.detectFieldByPattern(fields, data, 'status');

    // Detect what values indicate "converted" by analyzing the data
    const convertedValues = options.convertedValues || this.detectConvertedValues(data, statusField);

    // Group data by source
    const sourceStats = new Map<string, {
      count: number;
      converted: number;
      totalValue: number;
      values: number[];
      cycleTimes: number[];
      records: any[];
    }>();

    data.forEach(r => {
      const source = String(r[sourceField] || 'Unattributed');
      if (!sourceStats.has(source)) {
        sourceStats.set(source, {
          count: 0, converted: 0, totalValue: 0, values: [], cycleTimes: [], records: []
        });
      }

      const stats = sourceStats.get(source)!;
      stats.count++;
      stats.records.push(r);

      // Check conversion using dynamically detected converted values
      if (statusField || r['IsConverted'] !== undefined) {
        const isConverted = this.checkIfConverted(r, statusField, convertedValues);
        if (isConverted) stats.converted++;
      }

      // Track value
      if (valueField && r[valueField]) {
        const val = Number(r[valueField]);
        if (!isNaN(val) && val > 0) {
          stats.values.push(val);
          stats.totalValue += val;
        }
      }

      // Track cycle time
      const createdDate = r['CreatedDate'] || r['created'];
      const convertedDate = r['ConvertedDate'] || r['CloseDate'] || r['convertedDate'];
      if (createdDate && convertedDate) {
        const start = new Date(createdDate);
        const end = new Date(convertedDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          if (days >= 0) stats.cycleTimes.push(days);
        }
      }
    });

    // Compute analysis for each source
    const breakdown = Array.from(sourceStats.entries()).map(([source, stats]) => {
      const conversionRate = stats.count > 0 ? (stats.converted / stats.count) * 100 : 0;
      const avgDealSize = stats.values.length > 0
        ? stats.values.reduce((a, b) => a + b, 0) / stats.values.length
        : 0;
      const avgCycleTime = stats.cycleTimes.length > 0
        ? stats.cycleTimes.reduce((a, b) => a + b, 0) / stats.cycleTimes.length
        : null;

      return {
        source,
        leadCount: stats.count,
        converted: stats.converted,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgDealSize: Math.round(avgDealSize),
        totalValue: Math.round(stats.totalValue),
        avgCycleDays: avgCycleTime !== null ? Math.round(avgCycleTime) : null,
        // Attribution clues for unattributed
        attributionClues: source.toLowerCase().includes('other') || source.toLowerCase().includes('unattributed')
          ? this.detectAttributionClues(stats.records)
          : null,
      };
    }).sort((a, b) => b.conversionRate - a.conversionRate);

    // Generate insights
    const insights: string[] = [];
    const topSource = breakdown[0];
    const avgConversion = breakdown.reduce((sum, b) => sum + b.conversionRate, 0) / breakdown.length;

    if (topSource) {
      insights.push(`Top converting source: ${topSource.source} (${topSource.conversionRate}% conversion rate)`);
    }

    // Find high-performing sources
    const highPerformers = breakdown.filter(b => b.conversionRate > avgConversion * 1.2);
    if (highPerformers.length > 0) {
      insights.push(`High performers: ${highPerformers.map(h => `${h.source} (${h.conversionRate}%)`).join(', ')}`);
    }

    // Analyze unattributed if present
    const unattributed = breakdown.find(b =>
      b.source.toLowerCase().includes('other') ||
      b.source.toLowerCase().includes('unattributed') ||
      b.source === 'null' || b.source === 'Unknown'
    );
    if (unattributed && unattributed.conversionRate > avgConversion) {
      insights.push(`⚠️ Unattributed leads have ${Math.round(unattributed.conversionRate - avgConversion)}% higher conversion than average`);
      if (unattributed.attributionClues) {
        insights.push(`Attribution clues found: ${unattributed.attributionClues.join(', ')}`);
      }
    }

    // Deal size insights
    const avgDealBySource = breakdown.filter(b => b.avgDealSize > 0);
    if (avgDealBySource.length > 0) {
      const highestValue = avgDealBySource.sort((a, b) => b.avgDealSize - a.avgDealSize)[0];
      insights.push(`Highest value source: ${highestValue.source} ($${this.formatCurrency(highestValue.avgDealSize)} avg deal)`);
    }

    return {
      success: true,
      metric: 'source_analysis',
      result: {
        sourceField,
        sourceCount: breakdown.length,
        totalLeads: data.length,
        avgConversionRate: Math.round(avgConversion * 10) / 10,
      },
      breakdown,
      insights,
    };
  }

  /**
   * Detect attribution clues in unattributed/OTHER leads
   */
  private detectAttributionClues(records: any[]): string[] {
    const clues: string[] = [];
    const patterns = {
      hasEmail: 0,
      hasCampaign: 0,
      hasWebsite: 0,
      hasReferral: 0,
      hasPhone: 0,
    };

    records.forEach(r => {
      // Check for email indicators
      if (r['Email'] && (r['Email'].includes('gmail') || r['Email'].includes('outlook'))) {
        patterns.hasEmail++;
      }
      // Check for campaign references
      if (r['Campaign__c'] || r['CampaignId'] || r['Campaign'] || r['LastCampaign']) {
        patterns.hasCampaign++;
      }
      // Check for website
      if (r['Website'] || r['WebsiteUrl'] || r['LeadSource__Website']) {
        patterns.hasWebsite++;
      }
      // Check for referral indicators
      if (r['ReferredBy'] || r['Referral__c'] || (r['Description'] && r['Description'].toLowerCase().includes('referr'))) {
        patterns.hasReferral++;
      }
      // Check for phone
      if (r['Phone'] || r['MobilePhone']) {
        patterns.hasPhone++;
      }
    });

    const total = records.length;
    if (patterns.hasCampaign > total * 0.3) clues.push(`${Math.round(patterns.hasCampaign / total * 100)}% have campaign links`);
    if (patterns.hasWebsite > total * 0.3) clues.push(`${Math.round(patterns.hasWebsite / total * 100)}% have website data`);
    if (patterns.hasReferral > total * 0.2) clues.push(`${Math.round(patterns.hasReferral / total * 100)}% have referral indicators`);
    if (patterns.hasPhone > total * 0.8) clues.push(`${Math.round(patterns.hasPhone / total * 100)}% have phone numbers (possible phone leads)`);

    return clues;
  }

  /**
   * Compare two or more sources head-to-head
   */
  private computeSourceComparison(
    data: any[],
    options: { groupByField?: string; valueField?: string }
  ) {
    // First run source analysis
    const analysis = this.computeSourceAnalysis(data, options);

    if (!analysis.success || !analysis.breakdown) {
      return analysis;
    }

    const breakdown = analysis.breakdown;

    // Create comparison matrix
    const comparison: any[] = [];
    for (let i = 0; i < breakdown.length; i++) {
      for (let j = i + 1; j < breakdown.length; j++) {
        const sourceA = breakdown[i];
        const sourceB = breakdown[j];

        const conversionDiff = sourceA.conversionRate - sourceB.conversionRate;
        const valueDiff = sourceA.avgDealSize - sourceB.avgDealSize;

        comparison.push({
          sourceA: sourceA.source,
          sourceB: sourceB.source,
          conversionDifference: Math.round(conversionDiff * 10) / 10,
          winner: conversionDiff > 0 ? sourceA.source : sourceB.source,
          dealSizeDifference: Math.round(valueDiff),
          recommendation: this.getComparisonRecommendation(sourceA, sourceB),
        });
      }
    }

    return {
      success: true,
      metric: 'source_comparison',
      result: {
        sourcesCompared: breakdown.length,
        pairwiseComparisons: comparison.length,
      },
      breakdown: comparison,
      insights: [
        `Compared ${breakdown.length} sources in ${comparison.length} pairs`,
        comparison.length > 0 ? `Top comparison: ${comparison[0].sourceA} vs ${comparison[0].sourceB} - ${comparison[0].winner} converts ${Math.abs(comparison[0].conversionDifference)}% better` : '',
      ].filter(Boolean),
    };
  }

  private getComparisonRecommendation(sourceA: any, sourceB: any): string {
    const aScore = sourceA.conversionRate * (sourceA.avgDealSize || 1);
    const bScore = sourceB.conversionRate * (sourceB.avgDealSize || 1);

    if (aScore > bScore * 1.5) return `Strongly favor ${sourceA.source}`;
    if (bScore > aScore * 1.5) return `Strongly favor ${sourceB.source}`;
    if (aScore > bScore) return `Slightly favor ${sourceA.source}`;
    if (bScore > aScore) return `Slightly favor ${sourceB.source}`;
    return 'Similar performance';
  }

  // ============================================================================
  // DYNAMIC FIELD DETECTION - No hardcoded field names
  // ============================================================================

  /**
   * Detect field by analyzing data patterns, not hardcoded names
   */
  private detectFieldByPattern(fields: string[], data: any[], patternType: 'source' | 'status' | 'currency' | 'date'): string | null {
    // Pattern indicators for each type
    const patterns: Record<string, { namePatterns: RegExp[]; valueCheck: (val: any) => boolean }> = {
      source: {
        namePatterns: [/source/i, /channel/i, /origin/i, /medium/i, /campaign/i],
        valueCheck: (val) => typeof val === 'string' && val.length > 0 && val.length < 50,
      },
      status: {
        namePatterns: [/status/i, /stage/i, /state/i, /phase/i, /converted/i],
        valueCheck: (val) => typeof val === 'string' || typeof val === 'boolean',
      },
      currency: {
        namePatterns: [/amount/i, /value/i, /price/i, /revenue/i, /total/i, /cost/i],
        valueCheck: (val) => typeof val === 'number' && val >= 0,
      },
      date: {
        namePatterns: [/date/i, /time/i, /created/i, /modified/i, /closed/i],
        valueCheck: (val) => val && !isNaN(new Date(val).getTime()),
      },
    };

    const pattern = patterns[patternType];
    if (!pattern) return null;

    // First pass: match field names
    for (const field of fields) {
      if (pattern.namePatterns.some(p => p.test(field))) {
        // Verify with value check on sample data
        const sampleValues = data.slice(0, 10).map(r => r[field]).filter(v => v != null);
        if (sampleValues.length > 0 && sampleValues.some(v => pattern.valueCheck(v))) {
          return field;
        }
      }
    }

    // Second pass: check values if no name match
    for (const field of fields) {
      const sampleValues = data.slice(0, 10).map(r => r[field]).filter(v => v != null);
      const matchRate = sampleValues.filter(v => pattern.valueCheck(v)).length / Math.max(sampleValues.length, 1);
      if (matchRate > 0.7) {
        return field;
      }
    }

    return null;
  }

  /**
   * Dynamically detect which values indicate "converted" by analyzing data distribution
   */
  private detectConvertedValues(data: any[], statusField: string | null): string[] {
    // Common conversion indicators - but we verify against actual data
    const conversionIndicators = ['converted', 'won', 'closed won', 'qualified', 'customer', 'success', 'complete'];
    const negativeIndicators = ['lost', 'disqualified', 'rejected', 'failed', 'closed lost'];

    if (!statusField) {
      // Check for boolean IsConverted field
      const hasIsConverted = data.some(r => r['IsConverted'] !== undefined);
      if (hasIsConverted) return ['true', 'TRUE', '1'];
      return conversionIndicators;
    }

    // Analyze actual values in the data
    const valueCounts = new Map<string, number>();
    data.forEach(r => {
      const val = String(r[statusField] || '').toLowerCase();
      valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
    });

    // Find values that look like conversion states
    const detectedConverted: string[] = [];
    for (const [value] of valueCounts) {
      const isConversion = conversionIndicators.some(ind => value.includes(ind));
      const isNegative = negativeIndicators.some(ind => value.includes(ind));
      if (isConversion && !isNegative) {
        detectedConverted.push(value);
      }
    }

    return detectedConverted.length > 0 ? detectedConverted : conversionIndicators;
  }

  /**
   * Check if a record is converted using detected patterns
   */
  private checkIfConverted(record: any, statusField: string | null, convertedValues: string[]): boolean {
    // Check boolean IsConverted first
    if (record['IsConverted'] === true || record['IsConverted'] === 'true') {
      return true;
    }

    if (!statusField) return false;

    const status = String(record[statusField] || '').toLowerCase();
    return convertedValues.some(cv => status.includes(cv.toLowerCase()));
  }

  // ============================================================================
  // LEGACY HELPER FUNCTIONS (kept for backward compatibility)
  // ============================================================================

  // Helper functions
  private findField(data: any[], candidates: string[]): string | null {
    if (!data.length) return null;
    const keys = Object.keys(data[0]);
    for (const candidate of candidates) {
      const found = keys.find(k => k.toLowerCase() === candidate.toLowerCase());
      if (found) return found;
    }
    return null;
  }

  private findDateField(data: any[], candidates: string[]): string | null {
    if (!data.length) return null;
    const keys = Object.keys(data[0]);

    // First try exact matches
    for (const candidate of candidates) {
      const found = keys.find(k => k.toLowerCase() === candidate.toLowerCase());
      if (found && this.isDateValue(data[0][found])) return found;
    }

    // Then try partial matches
    for (const key of keys) {
      if (key.toLowerCase().includes('date') && this.isDateValue(data[0][key])) {
        return key;
      }
    }

    return null;
  }

  private isDateValue(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  }
}
