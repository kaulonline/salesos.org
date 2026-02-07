import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Stock quote data point
 */
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  dividend?: number;
  dividendYield?: number;
  eps?: number;
  week52High?: number;
  week52Low?: number;
  timestamp: string;
}

/**
 * Historical price data point for charting
 */
export interface PriceDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Company financial metrics
 */
export interface FinancialMetrics {
  revenue?: number;
  revenueGrowth?: number;
  netIncome?: number;
  grossProfit?: number;
  operatingIncome?: number;
  ebitda?: number;
  totalAssets?: number;
  totalDebt?: number;
  cashAndEquivalents?: number;
  fiscalYear?: string;
  profitMargin?: number;
  operatingMargin?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
}

/**
 * Analyst ratings and recommendations
 */
export interface AnalystData {
  targetPrice?: number;
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
  totalRatings?: number;
  consensus?: string; // 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'
}

/**
 * Company profile information
 */
export interface CompanyProfile {
  name?: string;
  description?: string;
  sector?: string;
  industry?: string;
  exchange?: string;
  country?: string;
  address?: string;
  officialSite?: string;
  fiscalYearEnd?: string;
  latestQuarter?: string;
}

/**
 * Earnings data point
 */
export interface EarningsDataPoint {
  fiscalDateEnding: string;
  reportedEPS: number;
  estimatedEPS?: number;
  surprise?: number;
  surprisePercentage?: number;
}

/**
 * Complete financial data response
 */
export interface FinancialData {
  symbol: string;
  companyName: string;
  quote?: StockQuote;
  historicalPrices?: PriceDataPoint[];
  metrics?: FinancialMetrics;
  profile?: CompanyProfile;
  analystData?: AnalystData;
  earnings?: {
    annual?: EarningsDataPoint[];
    quarterly?: EarningsDataPoint[];
  };
  error?: string;
}

// Common company name to stock symbol mappings
const SYMBOL_MAPPINGS: Record<string, string> = {
  'apple': 'AAPL',
  'microsoft': 'MSFT',
  'google': 'GOOGL',
  'alphabet': 'GOOGL',
  'amazon': 'AMZN',
  'meta': 'META',
  'facebook': 'META',
  'tesla': 'TSLA',
  'nvidia': 'NVDA',
  'netflix': 'NFLX',
  'salesforce': 'CRM',
  'adobe': 'ADBE',
  'intel': 'INTC',
  'amd': 'AMD',
  'cisco': 'CSCO',
  'oracle': 'ORCL',
  'ibm': 'IBM',
  'paypal': 'PYPL',
  'shopify': 'SHOP',
  'zoom': 'ZM',
  'slack': 'WORK',
  'twitter': 'X',
  'snap': 'SNAP',
  'uber': 'UBER',
  'lyft': 'LYFT',
  'airbnb': 'ABNB',
  'coinbase': 'COIN',
  'robinhood': 'HOOD',
  'palantir': 'PLTR',
  'snowflake': 'SNOW',
  'datadog': 'DDOG',
  'crowdstrike': 'CRWD',
  'okta': 'OKTA',
  'twilio': 'TWLO',
  'stripe': 'PRIVATE', // Private company
  'openai': 'PRIVATE',
  'anthropic': 'PRIVATE',
  'american express': 'AXP',
  'amex': 'AXP',
  'visa': 'V',
  'mastercard': 'MA',
  'jpmorgan': 'JPM',
  'jp morgan': 'JPM',
  'goldman sachs': 'GS',
  'morgan stanley': 'MS',
  'bank of america': 'BAC',
  'wells fargo': 'WFC',
  'citigroup': 'C',
  'disney': 'DIS',
  'coca-cola': 'KO',
  'coke': 'KO',
  'pepsi': 'PEP',
  'pepsico': 'PEP',
  'mcdonalds': 'MCD',
  'starbucks': 'SBUX',
  'nike': 'NKE',
  'walmart': 'WMT',
  'target': 'TGT',
  'costco': 'COST',
  'home depot': 'HD',
  'lowes': 'LOW',
  'johnson & johnson': 'JNJ',
  'pfizer': 'PFE',
  'moderna': 'MRNA',
  'merck': 'MRK',
  'abbvie': 'ABBV',
  'unitedhealth': 'UNH',
  'exxon': 'XOM',
  'exxonmobil': 'XOM',
  'chevron': 'CVX',
  'boeing': 'BA',
  'lockheed': 'LMT',
  'general electric': 'GE',
  'ge': 'GE',
  'ford': 'F',
  'general motors': 'GM',
  'gm': 'GM',
  'toyota': 'TM',
  'honda': 'HMC',
  'berkshire': 'BRK.B',
  'berkshire hathaway': 'BRK.B',
};

@Injectable()
export class FinancialDataService {
  private readonly logger = new Logger(FinancialDataService.name);
  private readonly alphaVantageKey: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.alphaVantageKey = this.configService.get<string>('ALPHA_VANTAGE_API_KEY', '');
    this.enabled = !!this.alphaVantageKey;

    if (this.enabled) {
      this.logger.log('Financial Data service initialized (Alpha Vantage)');
    } else {
      this.logger.warn('Financial Data service disabled - missing ALPHA_VANTAGE_API_KEY');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Convert company name to stock symbol
   */
  getSymbolForCompany(companyName: string): string | null {
    const normalized = companyName.toLowerCase().trim();

    // Check direct mappings first
    if (SYMBOL_MAPPINGS[normalized]) {
      return SYMBOL_MAPPINGS[normalized];
    }

    // Check partial matches
    for (const [name, symbol] of Object.entries(SYMBOL_MAPPINGS)) {
      if (normalized.includes(name) || name.includes(normalized)) {
        return symbol;
      }
    }

    // Check if it looks like a ticker symbol already (1-5 uppercase letters)
    if (/^[A-Z]{1,5}$/.test(companyName.toUpperCase())) {
      return companyName.toUpperCase();
    }

    return null;
  }

  /**
   * Get current stock quote
   */
  async getQuote(symbol: string): Promise<StockQuote | null> {
    if (!this.enabled || symbol === 'PRIVATE') {
      return null;
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`
      );

      if (!response.ok) {
        this.logger.warn(`Alpha Vantage API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Check for rate limit or error
      if (data['Note'] || data['Error Message']) {
        this.logger.warn(`Alpha Vantage response: ${data['Note'] || data['Error Message']}`);
        return null;
      }

      const quote = data['Global Quote'];
      if (!quote || !quote['05. price']) {
        return null;
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        previousClose: parseFloat(quote['08. previous close']),
        volume: parseInt(quote['06. volume'], 10),
        timestamp: quote['07. latest trading day'],
      };
    } catch (error) {
      this.logger.error(`Failed to fetch quote for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get historical daily prices (last 30 days) for charting
   */
  async getHistoricalPrices(symbol: string, days: number = 30): Promise<PriceDataPoint[]> {
    if (!this.enabled || symbol === 'PRIVATE') {
      return [];
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${this.alphaVantageKey}`
      );

      if (!response.ok) {
        this.logger.warn(`Alpha Vantage API error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      // Check for rate limit or error
      if (data['Note'] || data['Error Message']) {
        this.logger.warn(`Alpha Vantage response: ${data['Note'] || data['Error Message']}`);
        return [];
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        return [];
      }

      // Convert to array and sort by date
      const prices: PriceDataPoint[] = Object.entries(timeSeries)
        .slice(0, days)
        .map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'], 10),
        }))
        .reverse(); // Oldest first for charting

      return prices;
    } catch (error) {
      this.logger.error(`Failed to fetch historical prices for ${symbol}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get company overview/fundamentals with all available data
   */
  async getCompanyOverview(symbol: string): Promise<{
    quote: Partial<StockQuote>;
    metrics: FinancialMetrics;
    profile: CompanyProfile;
    analystData: AnalystData;
  } | null> {
    if (!this.enabled || symbol === 'PRIVATE') {
      return null;
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${this.alphaVantageKey}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      // Check for rate limit or error
      if (data['Note'] || data['Error Message'] || !data['Symbol']) {
        return null;
      }

      // Parse analyst ratings
      const strongBuy = parseInt(data['AnalystRatingStrongBuy']) || 0;
      const buy = parseInt(data['AnalystRatingBuy']) || 0;
      const hold = parseInt(data['AnalystRatingHold']) || 0;
      const sell = parseInt(data['AnalystRatingSell']) || 0;
      const strongSell = parseInt(data['AnalystRatingStrongSell']) || 0;
      const totalRatings = strongBuy + buy + hold + sell + strongSell;

      // Determine consensus
      let consensus = 'Hold';
      if (totalRatings > 0) {
        const buyWeight = (strongBuy * 2 + buy) / totalRatings;
        const sellWeight = (strongSell * 2 + sell) / totalRatings;
        if (buyWeight > 0.6) consensus = strongBuy > buy ? 'Strong Buy' : 'Buy';
        else if (sellWeight > 0.6) consensus = strongSell > sell ? 'Strong Sell' : 'Sell';
      }

      return {
        quote: {
          marketCap: parseFloat(data['MarketCapitalization']) || undefined,
          peRatio: parseFloat(data['PERatio']) || undefined,
          eps: parseFloat(data['EPS']) || undefined,
          dividend: parseFloat(data['DividendPerShare']) || undefined,
          dividendYield: parseFloat(data['DividendYield']) || undefined,
          week52High: parseFloat(data['52WeekHigh']) || undefined,
          week52Low: parseFloat(data['52WeekLow']) || undefined,
        },
        metrics: {
          revenue: parseFloat(data['RevenueTTM']) || undefined,
          grossProfit: parseFloat(data['GrossProfitTTM']) || undefined,
          ebitda: data['EBITDA'] !== 'None' ? parseFloat(data['EBITDA']) || undefined : undefined,
          fiscalYear: data['FiscalYearEnd'] || undefined,
          profitMargin: parseFloat(data['ProfitMargin']) || undefined,
          operatingMargin: parseFloat(data['OperatingMarginTTM']) || undefined,
          returnOnEquity: parseFloat(data['ReturnOnEquityTTM']) || undefined,
          returnOnAssets: parseFloat(data['ReturnOnAssetsTTM']) || undefined,
          revenueGrowth: parseFloat(data['QuarterlyRevenueGrowthYOY']) || undefined,
        },
        profile: {
          name: data['Name'] || undefined,
          description: data['Description'] || undefined,
          sector: data['Sector'] || undefined,
          industry: data['Industry'] || undefined,
          exchange: data['Exchange'] || undefined,
          country: data['Country'] || undefined,
          address: data['Address'] || undefined,
          officialSite: data['OfficialSite'] || undefined,
          fiscalYearEnd: data['FiscalYearEnd'] || undefined,
          latestQuarter: data['LatestQuarter'] || undefined,
        },
        analystData: {
          targetPrice: parseFloat(data['AnalystTargetPrice']) || undefined,
          strongBuy,
          buy,
          hold,
          sell,
          strongSell,
          totalRatings,
          consensus,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch overview for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get earnings data (annual and quarterly EPS)
   */
  async getEarnings(symbol: string): Promise<{
    annual: EarningsDataPoint[];
    quarterly: EarningsDataPoint[];
  } | null> {
    if (!this.enabled || symbol === 'PRIVATE') {
      return null;
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=EARNINGS&symbol=${symbol}&apikey=${this.alphaVantageKey}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      // Check for rate limit or error
      if (data['Note'] || data['Error Message']) {
        return null;
      }

      const annual: EarningsDataPoint[] = (data['annualEarnings'] || [])
        .slice(0, 5) // Last 5 years
        .map((e: any) => ({
          fiscalDateEnding: e['fiscalDateEnding'],
          reportedEPS: parseFloat(e['reportedEPS']) || 0,
        }));

      const quarterly: EarningsDataPoint[] = (data['quarterlyEarnings'] || [])
        .slice(0, 8) // Last 8 quarters
        .map((e: any) => ({
          fiscalDateEnding: e['fiscalDateEnding'],
          reportedEPS: parseFloat(e['reportedEPS']) || 0,
          estimatedEPS: parseFloat(e['estimatedEPS']) || undefined,
          surprise: parseFloat(e['surprise']) || undefined,
          surprisePercentage: parseFloat(e['surprisePercentage']) || undefined,
        }));

      return { annual, quarterly };
    } catch (error) {
      this.logger.error(`Failed to fetch earnings for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get complete financial data for a company
   */
  async getFinancialData(companyName: string): Promise<FinancialData | null> {
    const symbol = this.getSymbolForCompany(companyName);

    if (!symbol) {
      this.logger.debug(`No symbol found for company: ${companyName}`);
      return null;
    }

    if (symbol === 'PRIVATE') {
      return {
        symbol: 'PRIVATE',
        companyName,
        error: 'This is a private company - stock data not available',
      };
    }

    // Fetch all data in parallel (Note: Alpha Vantage has rate limits - 5 calls/min for free tier)
    // We'll fetch quote, historical, and overview in parallel
    // Earnings is optional and can be skipped if rate limited
    const [quote, historicalPrices, overview] = await Promise.all([
      this.getQuote(symbol),
      this.getHistoricalPrices(symbol, 30),
      this.getCompanyOverview(symbol),
    ]);

    // Fetch earnings separately to avoid hitting rate limits
    // Skip earnings fetch if overview failed (likely rate limited)
    const earnings = overview ? await this.getEarnings(symbol).catch(() => null) : null;

    if (!quote && historicalPrices.length === 0 && !overview) {
      return null;
    }

    // Merge overview quote data into the real-time quote
    const enrichedQuote = quote
      ? { ...quote, ...(overview?.quote || {}) }
      : overview?.quote
        ? ({ ...overview.quote, symbol, timestamp: new Date().toISOString().split('T')[0] } as StockQuote)
        : undefined;

    return {
      symbol,
      companyName: overview?.profile?.name || companyName,
      quote: enrichedQuote,
      historicalPrices,
      metrics: overview?.metrics,
      profile: overview?.profile,
      analystData: overview?.analystData,
      earnings: earnings || undefined,
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: number): string {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  }

  /**
   * Format percentage for display
   */
  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }
}
