// CPQ Analytics Types for Phase 4

export interface CPQDashboardMetrics {
  quotes: QuoteMetrics;
  orders: OrderMetrics;
  products: ProductMetrics;
  conversion: ConversionMetrics;
  revenue: RevenueMetrics;
}

export interface QuoteMetrics {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  averageValue: number;
  totalValue: number;
  avgDaysToClose: number;
  quotesThisMonth: number;
  quotesLastMonth: number;
  monthOverMonthChange: number;
}

export interface OrderMetrics {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  averageValue: number;
  totalValue: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  monthOverMonthChange: number;
}

export interface ProductMetrics {
  totalProducts: number;
  activeProducts: number;
  topSellingProducts: TopProduct[];
  topRevenueProducts: TopProduct[];
  lowStockProducts: number;
  productsByCategory: CategoryCount[];
}

export interface TopProduct {
  id: string;
  name: string;
  code?: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

export interface CategoryCount {
  category: string;
  count: number;
  revenue: number;
}

export interface ConversionMetrics {
  quoteToOrderRate: number;
  quoteToOrderRateLastMonth: number;
  rateChange: number;
  avgConversionTime: number;
  conversionsByStage: StageConversion[];
  lostReasons: LostReason[];
}

export interface StageConversion {
  stage: string;
  total: number;
  converted: number;
  rate: number;
}

export interface LostReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  monthOverMonthChange: number;
  revenueByMonth: MonthlyRevenue[];
  revenueByProduct: ProductRevenue[];
  revenueByAccount: AccountRevenue[];
  projectedRevenue: number;
  pipelineValue: number;
}

export interface MonthlyRevenue {
  month: string;
  year: number;
  quotes: number;
  orders: number;
  revenue: number;
}

export interface ProductRevenue {
  productId: string;
  productName: string;
  revenue: number;
  quantity: number;
  percentage: number;
}

export interface AccountRevenue {
  accountId: string;
  accountName: string;
  revenue: number;
  orderCount: number;
  quoteCount: number;
}

export interface CPQTrendData {
  period: string;
  quotesCreated: number;
  quotesSent: number;
  quotesAccepted: number;
  quotesRejected: number;
  ordersCreated: number;
  ordersCompleted: number;
  revenue: number;
}

export interface CPQAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  productId?: string;
  userId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface CPQAnalyticsSnapshot {
  id: string;
  ownerId: string;
  date: string;
  quotesCreated: number;
  quotesAccepted: number;
  quotesRejected: number;
  quoteValue: number;
  acceptedValue: number;
  ordersCreated: number;
  ordersCompleted: number;
  orderValue: number;
  topProducts: TopProduct[];
  createdAt: string;
}

export interface QuotePipelineData {
  stage: string;
  count: number;
  value: number;
  avgAge: number;
}

export interface SalesRepPerformance {
  userId: string;
  userName: string;
  quotesCreated: number;
  quotesWon: number;
  quotesLost: number;
  winRate: number;
  totalValue: number;
  avgDealSize: number;
}

export interface CPQForecast {
  period: string;
  projectedQuotes: number;
  projectedOrders: number;
  projectedRevenue: number;
  confidence: number;
  factors: string[];
}
