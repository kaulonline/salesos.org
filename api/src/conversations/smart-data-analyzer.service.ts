// Smart Data Analyzer - LLM-powered data structure analysis
// Dynamically generates column definitions and visualization recommendations

import { Injectable, Logger } from '@nestjs/common';
import { AzureOpenAI } from 'openai';

export interface SmartColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'email' | 'phone' | 'link' | 'percent' | 'status' | 'boolean';
  sortable: boolean;
  priority: number; // 1 = most important, show first
  hidden?: boolean; // Hide less useful columns like IDs
}

export interface SmartVisualization {
  type: 'table' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'kpi' | 'timeline' | 'cards';
  reason: string;
}

export interface SmartDataAnalysis {
  columns: SmartColumn[];
  visualization: SmartVisualization;
  title: string;
  summary?: string;
  insights?: string[]; // AI-generated key highlights
  showTable?: boolean; // Also show a table below the chart for drill-down
}

@Injectable()
export class SmartDataAnalyzerService {
  private readonly logger = new Logger(SmartDataAnalyzerService.name);
  private client: AzureOpenAI;
  private analysisCache: Map<string, { result: SmartDataAnalysis; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly modelId: string;

  constructor() {
    // PERFORMANCE: Use GPT-4o-mini (fast/cheap model) for data structure analysis
    // This is a simple classification task that doesn't need GPT-4o's capabilities
    this.modelId = 'gpt-4o-mini';
    this.client = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
    });
    this.logger.log(`SmartDataAnalyzer using fast model: ${this.modelId}`);
  }

  /**
   * Analyze data and generate smart column definitions + visualization recommendation
   * PERFORMANCE: Uses fast rule-based analysis - NO LLM call needed
   * This saves 2-4 seconds per query compared to LLM-based analysis
   */
  async analyzeData(data: any[], context?: string): Promise<SmartDataAnalysis> {
    if (!data || data.length === 0) {
      return {
        columns: [],
        visualization: { type: 'table', reason: 'No data to display' },
        title: 'No Data',
      };
    }

    // PERFORMANCE: Always use fast rule-based analysis
    // The fallback is smart enough to infer column types from field names
    // and determine visualization from record count
    return this.fallbackAnalysis(data, context);
  }

  private async callLLMForAnalysis(data: any[], context?: string): Promise<SmartDataAnalysis> {
    // Get sample records (first 3 and last 1 for variety)
    const sampleRecords = data.length <= 4 
      ? data 
      : [...data.slice(0, 3), data[data.length - 1]];
    
    // Clean samples - remove Salesforce 'attributes' metadata
    const cleanSamples = sampleRecords.map(record => {
      const clean: any = {};
      for (const [key, value] of Object.entries(record)) {
        if (key !== 'attributes' && !key.startsWith('__')) {
          clean[key] = value;
        }
      }
      return clean;
    });

    const prompt = `Analyze this dataset and provide smart column definitions and visualization recommendation.

DATASET INFO:
- Total records: ${data.length}
- Context: ${context || 'CRM/Salesforce data query'}

SAMPLE RECORDS (JSON):
${JSON.stringify(cleanSamples, null, 2)}

TASK:
1. For each field, determine:
   - A human-friendly label (e.g., "FirstName" → "First Name", "CloseDate" → "Close Date")
   - The data type from: text, number, currency, date, datetime, email, phone, link, percent, status, boolean
   - Whether it should be sortable
   - Priority (1=highest, show first; higher numbers = less important)
   - Whether to hide it (IDs, internal fields should be hidden)

2. Recommend the best visualization:
   - "table" for lists of records (>6 records)
   - "cards" for small sets (2-6 records with detailed info)
   - "kpi" for 1-3 aggregated metrics
   - "bar-chart" for comparing categories (stage counts, source distribution)
   - "line-chart" for time-series trends
   - "pie-chart" for percentage distributions
   - "timeline" for chronological events/activities

3. Generate a concise, descriptive title for the data:
   - IMPORTANT: Base the title on the user's original query in the context
   - Examples: "Q4 Revenue Forecast", "Top 6 Leads", "Acme Corp Opportunities", "Open Tasks This Week"
   - Do NOT use generic titles like "Query Results" or just "Records"
   - Keep titles short (2-5 words) but meaningful

RESPOND WITH ONLY VALID JSON (no markdown):
{
  "columns": [
    {"key": "fieldName", "label": "Human Label", "type": "text|number|etc", "sortable": true, "priority": 1, "hidden": false}
  ],
  "visualization": {"type": "table|bar-chart|etc", "reason": "Brief explanation"},
  "title": "Descriptive Title Based on Query"
}`;

    const response = await this.client.chat.completions.create({
      model: this.modelId,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Unexpected response type');
    }

    // Parse the JSON response, stripping markdown code blocks if present
    let jsonText = content.trim();
    
    // Remove markdown code block markers (```json or ``` at start/end)
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    const analysis = JSON.parse(jsonText);

    // Validate and normalize
    return {
      columns: (analysis.columns || []).map((col: any) => ({
        key: col.key,
        label: col.label || col.key,
        type: this.normalizeType(col.type),
        sortable: col.sortable !== false,
        priority: col.priority || 5,
        hidden: col.hidden || false,
      })),
      visualization: {
        type: this.normalizeVisualization(analysis.visualization?.type),
        reason: analysis.visualization?.reason || '',
      },
      title: analysis.title || 'Query Results',
    };
  }

  private normalizeType(type: string): SmartColumn['type'] {
    const typeMap: Record<string, SmartColumn['type']> = {
      'string': 'text',
      'text': 'text',
      'number': 'number',
      'integer': 'number',
      'float': 'number',
      'decimal': 'number',
      'currency': 'currency',
      'money': 'currency',
      'date': 'date',
      'datetime': 'datetime',
      'timestamp': 'datetime',
      'email': 'email',
      'phone': 'phone',
      'tel': 'phone',
      'url': 'link',
      'link': 'link',
      'percent': 'percent',
      'percentage': 'percent',
      'status': 'status',
      'stage': 'status',
      'boolean': 'boolean',
      'bool': 'boolean',
    };
    return typeMap[type?.toLowerCase()] || 'text';
  }

  private normalizeVisualization(type: string): SmartVisualization['type'] {
    const vizMap: Record<string, SmartVisualization['type']> = {
      'table': 'table',
      'cards': 'cards',
      'card': 'cards',
      'kpi': 'kpi',
      'metrics': 'kpi',
      'bar': 'bar-chart',
      'bar-chart': 'bar-chart',
      'barchart': 'bar-chart',
      'line': 'line-chart',
      'line-chart': 'line-chart',
      'linechart': 'line-chart',
      'pie': 'pie-chart',
      'pie-chart': 'pie-chart',
      'piechart': 'pie-chart',
      'timeline': 'timeline',
    };
    return vizMap[type?.toLowerCase()] || 'table';
  }

  /**
   * Smart analysis with dynamic visualization detection
   * Detects patterns suitable for charts, KPIs, timelines, etc.
   */
  private fallbackAnalysis(data: any[], context?: string): SmartDataAnalysis {
    const sample = data[0];
    const columns: SmartColumn[] = [];
    let priority = 1;

    // Analyze all fields and their values
    const fieldAnalysis: Map<string, {
      type: SmartColumn['type'];
      hasNumericValues: boolean;
      hasDateValues: boolean;
      uniqueValues: Set<string>;
      numericValues: number[];
    }> = new Map();

    for (const [key, value] of Object.entries(sample)) {
      if (key === 'attributes' || key.startsWith('__')) continue;

      // Infer type from value and collect analysis data
      let type: SmartColumn['type'] = 'text';
      const keyLower = key.toLowerCase();

      // Analyze values across all records for this field
      const allValues = data.map(row => row[key]).filter(v => v !== null && v !== undefined);
      const uniqueValues = new Set(allValues.map(v => String(v)));
      const numericValues: number[] = [];
      let hasNumericValues = false;
      let hasDateValues = false;

      if (keyLower.includes('email')) type = 'email';
      else if (keyLower.includes('phone')) type = 'phone';
      else if (keyLower.includes('date') || keyLower.includes('month') || keyLower.includes('quarter') || keyLower.includes('year') || keyLower.includes('period')) {
        type = 'date';
        hasDateValues = true;
      }
      else if (keyLower.includes('amount') || keyLower.includes('revenue') || keyLower.includes('price') ||
               keyLower.includes('value') || keyLower.includes('total') || keyLower.includes('forecast') ||
               keyLower.includes('projected') || keyLower.includes('sales') || keyLower.includes('budget')) {
        type = 'currency';
        hasNumericValues = true;
        allValues.forEach(v => {
          const num = parseFloat(String(v));
          if (!isNaN(num)) numericValues.push(num);
        });
      }
      else if (keyLower.includes('percent') || keyLower.includes('probability') || keyLower.includes('rate') || keyLower.includes('ratio')) {
        type = 'percent';
        hasNumericValues = true;
        allValues.forEach(v => {
          const num = parseFloat(String(v));
          if (!isNaN(num)) numericValues.push(num);
        });
      }
      else if (keyLower.includes('status') || keyLower.includes('stage') || keyLower.includes('type') || keyLower.includes('category')) {
        type = 'status';
      }
      else if (keyLower.includes('count') || keyLower.includes('number') || keyLower.includes('qty') || keyLower.includes('quantity')) {
        type = 'number';
        hasNumericValues = true;
        allValues.forEach(v => {
          const num = parseFloat(String(v));
          if (!isNaN(num)) numericValues.push(num);
        });
      }
      else if (typeof value === 'number') {
        type = 'number';
        hasNumericValues = true;
        allValues.forEach(v => {
          const num = parseFloat(String(v));
          if (!isNaN(num)) numericValues.push(num);
        });
      }
      else if (typeof value === 'boolean') type = 'boolean';
      else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        type = 'date';
        hasDateValues = true;
      }

      fieldAnalysis.set(key, { type, hasNumericValues, hasDateValues, uniqueValues, numericValues });

      // Hide ID fields
      const hidden = keyLower === 'id' || keyLower.endsWith('id');

      columns.push({
        key,
        label: this.formatColumnLabel(key),
        type,
        sortable: true,
        priority: hidden ? 99 : priority++,
        hidden,
      });
    }

    // SMART VISUALIZATION DETECTION
    const vizResult = this.detectVisualization(data, fieldAnalysis, context);

    // Generate meaningful title from context and data
    const title = this.generateTitle(data, context, vizResult.type);

    // Generate smart insights based on data patterns
    const insights = this.generateInsights(data, fieldAnalysis, context, vizResult.type);

    return {
      columns,
      visualization: { type: vizResult.type, reason: vizResult.reason },
      title,
      insights,
      showTable: vizResult.showTable,
    };
  }

  /**
   * Generate smart insights based on data patterns
   * Rule-based for fast performance
   */
  private generateInsights(
    data: any[],
    fieldAnalysis: Map<string, any>,
    context?: string,
    vizType?: SmartVisualization['type']
  ): string[] {
    const insights: string[] = [];
    const contextLower = (context || '').toLowerCase();
    const recordCount = data.length;

    if (recordCount === 0) return [];

    // Find key fields for analysis
    let numericField: { key: string; values: number[]; type: string } | null = null;
    let labelField: string | null = null;
    let dateField: string | null = null;
    let statusField: string | null = null;

    for (const [key, analysis] of fieldAnalysis) {
      if ((analysis.hasNumericValues || analysis.type === 'currency' || analysis.type === 'number') && analysis.numericValues?.length > 0) {
        if (!numericField || analysis.type === 'currency') {
          numericField = { key, values: analysis.numericValues, type: analysis.type };
        }
      }
      if (analysis.type === 'status' && !statusField) {
        statusField = key;
      }
      if ((analysis.hasDateValues || analysis.type === 'date') && !dateField) {
        dateField = key;
      }
      if (!labelField && analysis.type === 'text' && !key.toLowerCase().includes('id')) {
        labelField = key;
      }
    }

    // Generate insights based on visualization type and data patterns
    if (numericField && numericField.values.length > 0) {
      const values = numericField.values;
      const total = values.reduce((a, b) => a + b, 0);
      const avg = total / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const maxIndex = values.indexOf(max);
      const minIndex = values.indexOf(min);

      // Find the labels for max/min values
      const maxRecord = data[maxIndex];
      const minRecord = data[minIndex];
      const maxLabel = maxRecord?.[labelField || statusField || ''] || maxRecord?.[Object.keys(maxRecord).find(k => !k.toLowerCase().includes('id') && typeof maxRecord[k] === 'string') || ''];
      const minLabel = minRecord?.[labelField || statusField || ''] || minRecord?.[Object.keys(minRecord).find(k => !k.toLowerCase().includes('id') && typeof minRecord[k] === 'string') || ''];

      // Currency formatting
      const formatValue = (val: number): string => {
        if (numericField?.type === 'currency') {
          if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
          return `$${val.toFixed(0)}`;
        }
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
        return val.toFixed(0);
      };

      // Pipeline/Stage insights
      if (vizType === 'bar-chart' || vizType === 'pie-chart') {
        if (maxLabel) {
          const maxPercent = ((max / total) * 100).toFixed(0);
          insights.push(`${maxLabel} leads with ${formatValue(max)} (${maxPercent}% of total)`);
        }
        if (recordCount > 2 && minLabel && minLabel !== maxLabel) {
          insights.push(`${minLabel} has the lowest at ${formatValue(min)}`);
        }
        if (recordCount >= 3) {
          const topHalf = values.slice().sort((a, b) => b - a).slice(0, Math.ceil(values.length / 2));
          const topHalfSum = topHalf.reduce((a, b) => a + b, 0);
          const topHalfPercent = ((topHalfSum / total) * 100).toFixed(0);
          if (parseInt(topHalfPercent) > 60) {
            insights.push(`Top ${Math.ceil(values.length / 2)} categories account for ${topHalfPercent}% of total`);
          }
        }
      }

      // Trend/Forecast insights
      if (vizType === 'line-chart' && values.length >= 3) {
        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        const change = ((lastValue - firstValue) / firstValue) * 100;

        if (change > 0) {
          insights.push(`Showing ${change.toFixed(0)}% growth from start to end of period`);
        } else if (change < 0) {
          insights.push(`Declined ${Math.abs(change).toFixed(0)}% from start to end of period`);
        }

        // Find peak
        if (maxIndex !== 0 && maxIndex !== values.length - 1) {
          insights.push(`Peak of ${formatValue(max)} reached mid-period`);
        }

        // Average insight
        insights.push(`Average across period: ${formatValue(avg)}`);
      }

      // KPI insights
      if (vizType === 'kpi') {
        if (recordCount === 1) {
          insights.push(`Current value: ${formatValue(total)}`);
        } else {
          insights.push(`Combined total: ${formatValue(total)} across ${recordCount} metrics`);
        }
      }

      // Sales/Revenue context
      if (contextLower.includes('sales') || contextLower.includes('revenue') || contextLower.includes('opportunity')) {
        if (!insights.some(i => i.includes('total'))) {
          insights.push(`Total value: ${formatValue(total)}`);
        }
      }
    }

    // Status distribution insights
    if (statusField && recordCount > 1) {
      const statusCounts = new Map<string, number>();
      data.forEach(row => {
        const status = row[statusField];
        if (status) statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });

      if (statusCounts.size > 1 && statusCounts.size <= 6) {
        const sorted = Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1]);
        const topStatus = sorted[0];
        if (topStatus && !insights.some(i => i.includes(topStatus[0]))) {
          insights.push(`Most records in "${topStatus[0]}" status (${topStatus[1]} of ${recordCount})`);
        }
      }
    }

    // Limit to 2-3 insights
    return insights.slice(0, 3);
  }

  /**
   * Detect the best visualization type based on data patterns
   * SMART RULES for Sales Teams:
   * - SDRs/BDRs need: Lead lists, activity data, follow-up tasks → Tables
   * - Sales Reps need: Pipeline views, opportunity details, forecasts → Charts + Tables
   * - Sales Executives need: Summary views, KPIs, drill-down → Charts with Tables
   */
  private detectVisualization(
    data: any[],
    fieldAnalysis: Map<string, any>,
    context?: string
  ): SmartVisualization & { showTable?: boolean } {
    const contextLower = (context || '').toLowerCase();
    const recordCount = data.length;
    const fieldCount = fieldAnalysis.size;

    // Analyze field patterns
    let hasDateField = false;
    let hasNumericField = false;
    let hasStatusField = false;
    let hasIdField = false;
    let hasNameField = false;
    let hasEmailField = false;
    let hasPhoneField = false;
    let numericFieldCount = 0;
    let textFieldCount = 0;
    let totalNumericSum = 0;

    for (const [key, analysis] of fieldAnalysis) {
      const keyLower = key.toLowerCase();

      if (analysis.hasDateValues || analysis.type === 'date') {
        hasDateField = true;
      }
      if (analysis.hasNumericValues || analysis.type === 'number' || analysis.type === 'currency' || analysis.type === 'percent') {
        hasNumericField = true;
        numericFieldCount++;
        totalNumericSum = analysis.numericValues?.reduce((a: number, b: number) => a + b, 0) || 0;
      }
      if (analysis.type === 'status') {
        hasStatusField = true;
      }
      if (analysis.type === 'text' || analysis.type === 'email' || analysis.type === 'phone') {
        textFieldCount++;
      }
      if (keyLower === 'id' || keyLower.endsWith('id')) {
        hasIdField = true;
      }
      if (keyLower.includes('name')) {
        hasNameField = true;
      }
      if (keyLower.includes('email')) {
        hasEmailField = true;
      }
      if (keyLower.includes('phone')) {
        hasPhoneField = true;
      }
    }

    // =================================================================
    // DETECTION LOGIC: Is this AGGREGATED data or DETAILED records?
    // =================================================================

    // AGGREGATED data indicators (GROUP BY results):
    // - Few fields (2-4 columns)
    // - One category/label column + one or more numeric columns
    // - No ID field (aggregations don't have individual record IDs)
    // - No personal fields (email, phone)
    const looksLikeAggregation = (
      fieldCount <= 4 &&
      numericFieldCount >= 1 &&
      !hasIdField &&
      !hasEmailField &&
      !hasPhoneField &&
      (hasStatusField || textFieldCount === 1)
    );

    // DETAILED records indicators (individual CRM records):
    // - Many fields (5+ columns)
    // - Has ID, Name, and/or contact fields
    // - Multiple text fields
    const looksLikeDetailRecords = (
      fieldCount >= 5 ||
      hasIdField ||
      (hasNameField && (hasEmailField || hasPhoneField)) ||
      textFieldCount >= 3
    );

    // =================================================================
    // CONTEXT-BASED DETECTION (user's query intent)
    // =================================================================

    // EXPLICIT TABLE requests - user wants to see records
    if (contextLower.includes('show all') || contextLower.includes('list all') ||
        contextLower.includes('show me all') || contextLower.includes('get all') ||
        contextLower.includes('find all') || contextLower.includes('search for')) {
      return { type: 'table', reason: 'User requested list of records', showTable: false };
    }

    // EXPLICIT record type queries → TABLE (unless aggregation keywords present)
    const recordTypeKeywords = ['lead', 'contact', 'account', 'opportunity', 'task', 'case', 'event'];
    const hasRecordTypeQuery = recordTypeKeywords.some(kw => contextLower.includes(kw));
    const hasAggregationKeyword = ['by stage', 'by status', 'by source', 'by type', 'by owner',
      'count', 'sum', 'total', 'average', 'breakdown', 'distribution', 'pipeline'].some(kw => contextLower.includes(kw));

    if (hasRecordTypeQuery && !hasAggregationKeyword && looksLikeDetailRecords) {
      return { type: 'table', reason: 'Detailed CRM records query', showTable: false };
    }

    // =================================================================
    // CHART-APPROPRIATE SCENARIOS (with optional table)
    // =================================================================

    // FORECASTS & TRENDS → Line Chart (with table for details)
    if (contextLower.includes('forecast') || contextLower.includes('projection') ||
        contextLower.includes('trend') || contextLower.includes('over time')) {
      if (hasDateField && hasNumericField && recordCount >= 3) {
        return { type: 'line-chart', reason: 'Time-series forecast/trend', showTable: recordCount <= 12 };
      }
    }

    // PIPELINE/STAGE ANALYSIS → Bar Chart + Table
    if (contextLower.includes('pipeline') || contextLower.includes('by stage') ||
        contextLower.includes('stage distribution') || contextLower.includes('funnel')) {
      if (looksLikeAggregation && recordCount >= 2 && recordCount <= 12) {
        return { type: 'bar-chart', reason: 'Pipeline stage analysis', showTable: true };
      }
    }

    // DISTRIBUTION/BREAKDOWN queries → Bar or Pie Chart + Table
    if (contextLower.includes('distribution') || contextLower.includes('breakdown') ||
        contextLower.includes('by status') || contextLower.includes('by source') ||
        contextLower.includes('by type') || contextLower.includes('by owner')) {
      if (looksLikeAggregation && recordCount >= 2 && recordCount <= 12) {
        // Pie for percentages, Bar for counts
        if (Math.abs(totalNumericSum - 100) < 10) {
          return { type: 'pie-chart', reason: 'Percentage distribution', showTable: true };
        }
        return { type: 'bar-chart', reason: 'Category distribution', showTable: true };
      }
    }

    // COUNT queries → Bar Chart + Table
    if (contextLower.includes('count') || contextLower.includes('how many')) {
      if (looksLikeAggregation && recordCount >= 2 && recordCount <= 15) {
        return { type: 'bar-chart', reason: 'Count by category', showTable: true };
      }
    }

    // TOP/RANKING queries → Bar Chart (limited, no table needed)
    if (contextLower.includes('top ') || contextLower.includes('highest') ||
        contextLower.includes('lowest') || contextLower.includes('best') ||
        contextLower.includes('worst') || contextLower.includes('ranking')) {
      if (hasNumericField && recordCount >= 2 && recordCount <= 10) {
        return { type: 'bar-chart', reason: 'Ranking comparison', showTable: false };
      }
    }

    // KPI/SUMMARY queries → KPI Cards
    if (contextLower.includes('kpi') || contextLower.includes('metric') ||
        contextLower.includes('summary') || contextLower.includes('overview')) {
      if (recordCount <= 4 && hasNumericField && looksLikeAggregation) {
        return { type: 'kpi', reason: 'Key metrics summary', showTable: false };
      }
    }

    // ACTIVITY/TIMELINE queries → Timeline or Table
    if (contextLower.includes('activity') || contextLower.includes('activities') ||
        contextLower.includes('history') || contextLower.includes('timeline')) {
      if (hasDateField && recordCount >= 2 && recordCount <= 20) {
        return { type: 'timeline', reason: 'Activity timeline', showTable: false };
      }
      // For activities without clear timeline, show table
      return { type: 'table', reason: 'Activity records', showTable: false };
    }

    // =================================================================
    // DATA PATTERN DETECTION (when context doesn't clearly indicate)
    // =================================================================

    // Pure aggregation data (2-3 columns: category + value) → Chart
    if (looksLikeAggregation && recordCount >= 2 && recordCount <= 12) {
      // Only show chart if it's clearly aggregated data
      if (fieldCount <= 3 && numericFieldCount >= 1 && (hasStatusField || textFieldCount === 1)) {
        return { type: 'bar-chart', reason: 'Aggregated data', showTable: true };
      }
    }

    // Small dataset with multiple fields → Cards (for quick overview)
    if (recordCount >= 1 && recordCount <= 4 && fieldCount >= 4 && fieldCount <= 8) {
      if (!hasIdField || recordCount <= 2) {
        return { type: 'cards', reason: 'Small dataset overview', showTable: false };
      }
    }

    // =================================================================
    // DEFAULT: Table for detailed records
    // =================================================================
    return { type: 'table', reason: 'Standard record display', showTable: false };
  }

  /**
   * Format column key to human-readable label
   */
  private formatColumnLabel(key: string): string {
    return key
      .replace(/__c$/i, '') // Remove Salesforce custom field suffix
      .replace(/__r$/i, '') // Remove relationship suffix
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/_/g, ' ') // Replace underscores with spaces
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
  }

  /**
   * Generate a meaningful title based on context and data
   */
  private generateTitle(data: any[], context?: string, vizType?: SmartVisualization['type']): string {
    const recordCount = data.length;
    let title = `${recordCount} Records`;

    if (context) {
      const contextLower = context.toLowerCase();

      // Check for specific chart/analysis types first
      if (contextLower.includes('forecast')) {
        if (contextLower.includes('revenue')) return 'Revenue Forecast';
        if (contextLower.includes('sales')) return 'Sales Forecast';
        return 'Forecast';
      }
      if (contextLower.includes('projection')) return 'Projections';
      if (contextLower.includes('trend')) return 'Trend Analysis';
      if (contextLower.includes('pipeline')) return 'Pipeline Overview';
      if (contextLower.includes('distribution')) return 'Distribution';
      if (contextLower.includes('breakdown')) return 'Breakdown';
      if (contextLower.includes('comparison')) return 'Comparison';
      if (contextLower.includes('performance')) return 'Performance';

      // Extract object type from context
      if (contextLower.includes('lead')) title = `${recordCount} Leads`;
      else if (contextLower.includes('opportunit')) title = `${recordCount} Opportunities`;
      else if (contextLower.includes('contact')) title = `${recordCount} Contacts`;
      else if (contextLower.includes('account')) title = `${recordCount} Accounts`;
      else if (contextLower.includes('task')) title = `${recordCount} Tasks`;
      else if (contextLower.includes('activit')) title = `${recordCount} Activities`;

      // Add qualifiers from context
      if (contextLower.includes('top')) title = `Top ${title}`;
      else if (contextLower.includes('recent') || contextLower.includes('latest')) title = `Recent ${title}`;
      else if (contextLower.includes('open') || contextLower.includes('active')) title = `Open ${title}`;
      else if (contextLower.includes('closed') || contextLower.includes('won')) title = `Closed ${title}`;
      else if (contextLower.includes('this month')) title = `${title} This Month`;
      else if (contextLower.includes('this quarter') || contextLower.includes('q4') || contextLower.includes('q1') || contextLower.includes('q2') || contextLower.includes('q3')) {
        const quarterMatch = contextLower.match(/q[1-4]/);
        title = quarterMatch ? `${quarterMatch[0].toUpperCase()} ${title}` : `${title} This Quarter`;
      }
    }

    // Add visualization type context if applicable
    if (vizType === 'line-chart' && !title.includes('Trend') && !title.includes('Forecast')) {
      title = `${title} Trend`;
    }

    return title;
  }
}
