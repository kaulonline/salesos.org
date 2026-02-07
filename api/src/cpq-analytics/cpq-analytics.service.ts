import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface ForecastPeriod {
  period: string;
  predictedCount: number;
  predictedValue: number;
  lowEstimate: number;
  highEstimate: number;
}

@Injectable()
export class CpqAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string, isAdmin: boolean, organizationId: string) {
    const quoteWhere: Prisma.QuoteWhereInput = {};
    const orderWhere: Prisma.OrderWhereInput = {};

    // Apply organization filter (required for tenant isolation)
    quoteWhere.organizationId = organizationId;
    orderWhere.organizationId = organizationId;

    // Apply owner filter for non-admins
    if (!isAdmin) {
      quoteWhere.ownerId = userId;
      orderWhere.ownerId = userId;
    }

    // Get current month start
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      // Quote totals
      totalQuotes,
      quotesByStatus,
      quoteTotalValue,
      quotesThisMonth,
      quotesLastMonth,
      // Order totals
      totalOrders,
      ordersByStatus,
      orderTotalValue,
      ordersThisMonth,
      ordersLastMonth,
      // Revenue
      acceptedQuoteValue,
      paidOrderValue,
      // Conversion
      acceptedQuotes,
    ] = await Promise.all([
      this.prisma.quote.count({ where: quoteWhere }),
      this.prisma.quote.groupBy({
        by: ['status'],
        where: quoteWhere,
        _count: true,
      }),
      this.prisma.quote.aggregate({ where: quoteWhere, _sum: { totalPrice: true } }),
      this.prisma.quote.count({ where: { ...quoteWhere, createdAt: { gte: startOfMonth } } }),
      this.prisma.quote.count({ where: { ...quoteWhere, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: orderWhere,
        _count: true,
      }),
      this.prisma.order.aggregate({ where: orderWhere, _sum: { total: true } }),
      this.prisma.order.count({ where: { ...orderWhere, createdAt: { gte: startOfMonth } } }),
      this.prisma.order.count({ where: { ...orderWhere, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      this.prisma.quote.aggregate({ where: { ...quoteWhere, status: 'ACCEPTED' }, _sum: { totalPrice: true } }),
      this.prisma.order.aggregate({ where: { ...orderWhere, paymentStatus: 'PAID' }, _sum: { total: true } }),
      this.prisma.quote.count({ where: { ...quoteWhere, status: 'ACCEPTED' } }),
    ]);

    // Map status counts
    const quoteStatusMap = quotesByStatus.reduce(
      (acc, item) => ({ ...acc, [item.status]: item._count }),
      {} as Record<string, number>,
    );
    const orderStatusMap = ordersByStatus.reduce(
      (acc, item) => ({ ...acc, [item.status]: item._count }),
      {} as Record<string, number>,
    );

    // Calculate metrics
    const quoteTotalVal = Number(quoteTotalValue._sum.totalPrice) || 0;
    const orderTotalVal = Number(orderTotalValue._sum.total) || 0;
    const acceptedVal = Number(acceptedQuoteValue._sum.totalPrice) || 0;
    const paidVal = Number(paidOrderValue._sum.total) || 0;
    const totalRevenue = acceptedVal + paidVal;

    const quoteAvgValue = totalQuotes > 0 ? quoteTotalVal / totalQuotes : 0;
    const orderAvgValue = totalOrders > 0 ? orderTotalVal / totalOrders : 0;
    const quoteToOrderRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;

    const quoteMoMChange = quotesLastMonth > 0
      ? ((quotesThisMonth - quotesLastMonth) / quotesLastMonth) * 100
      : quotesThisMonth > 0 ? 100 : 0;
    const orderMoMChange = ordersLastMonth > 0
      ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100
      : ordersThisMonth > 0 ? 100 : 0;

    return {
      quotes: {
        total: totalQuotes,
        draft: quoteStatusMap['DRAFT'] || 0,
        sent: quoteStatusMap['SENT'] || 0,
        accepted: quoteStatusMap['ACCEPTED'] || 0,
        rejected: quoteStatusMap['REJECTED'] || 0,
        expired: quoteStatusMap['EXPIRED'] || 0,
        averageValue: Math.round(quoteAvgValue * 100) / 100,
        totalValue: quoteTotalVal,
        avgDaysToClose: 0,
        quotesThisMonth,
        quotesLastMonth,
        monthOverMonthChange: Math.round(quoteMoMChange * 10) / 10,
      },
      orders: {
        total: totalOrders,
        pending: orderStatusMap['PENDING'] || 0,
        processing: orderStatusMap['PROCESSING'] || 0,
        shipped: orderStatusMap['SHIPPED'] || 0,
        delivered: orderStatusMap['DELIVERED'] || 0,
        cancelled: orderStatusMap['CANCELLED'] || 0,
        averageValue: Math.round(orderAvgValue * 100) / 100,
        totalValue: orderTotalVal,
        ordersThisMonth,
        ordersLastMonth,
        monthOverMonthChange: Math.round(orderMoMChange * 10) / 10,
      },
      products: {
        totalProducts: 0,
        activeProducts: 0,
        topSellingProducts: [],
        topRevenueProducts: [],
        lowStockProducts: 0,
        productsByCategory: [],
      },
      conversion: {
        quoteToOrderRate: Math.round(quoteToOrderRate * 10) / 10,
        quoteToOrderRateLastMonth: 0,
        rateChange: 0,
        avgConversionTime: 0,
        conversionsByStage: [],
        lostReasons: [],
      },
      revenue: {
        totalRevenue,
        revenueThisMonth: 0,
        revenueLastMonth: 0,
        monthOverMonthChange: 0,
        revenueByMonth: [],
        revenueByProduct: [],
        revenueByAccount: [],
        projectedRevenue: 0,
        pipelineValue: quoteTotalVal - acceptedVal,
      },
    };
  }

  private async getQuoteMetrics(where: Prisma.QuoteWhereInput) {
    const [total, byStatus, totalValue, acceptedValue] = await Promise.all([
      this.prisma.quote.count({ where }),
      this.prisma.quote.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: { totalPrice: true },
      }),
      this.prisma.quote.aggregate({
        where,
        _sum: { totalPrice: true },
      }),
      this.prisma.quote.aggregate({
        where: { ...where, status: 'ACCEPTED' },
        _sum: { totalPrice: true },
      }),
    ]);

    const statusMap = byStatus.reduce(
      (acc, item) => ({
        ...acc,
        [item.status]: {
          count: item._count,
          value: item._sum.totalPrice || 0,
        },
      }),
      {},
    );

    const acceptedCount = (statusMap as any).ACCEPTED?.count || 0;
    const conversionRate = total > 0 ? (acceptedCount / total) * 100 : 0;

    return {
      total,
      byStatus: statusMap,
      totalValue: totalValue._sum.totalPrice || 0,
      acceptedValue: acceptedValue._sum.totalPrice || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  private async getOrderMetrics(where: Prisma.OrderWhereInput) {
    const [total, byStatus, byPaymentStatus, totalValue, paidValue] =
      await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.groupBy({
          by: ['status'],
          where,
          _count: true,
          _sum: { total: true },
        }),
        this.prisma.order.groupBy({
          by: ['paymentStatus'],
          where,
          _count: true,
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where,
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: { ...where, paymentStatus: 'PAID' },
          _sum: { total: true },
        }),
      ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => ({
          ...acc,
          [item.status]: {
            count: item._count,
            value: item._sum.total || 0,
          },
        }),
        {},
      ),
      byPaymentStatus: byPaymentStatus.reduce(
        (acc, item) => ({
          ...acc,
          [item.paymentStatus]: {
            count: item._count,
            value: item._sum.total || 0,
          },
        }),
        {},
      ),
      totalValue: totalValue._sum.total || 0,
      paidValue: paidValue._sum.total || 0,
    };
  }

  private async getRecentQuotes(
    where: Prisma.QuoteWhereInput,
    limit: number,
  ) {
    return this.prisma.quote.findMany({
      where,
      select: {
        id: true,
        quoteNumber: true,
        name: true,
        status: true,
        totalPrice: true,
        createdAt: true,
        account: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async getRecentOrders(
    where: Prisma.OrderWhereInput,
    limit: number,
  ) {
    return this.prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        name: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        account: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async getTopProductsInternal(where: Prisma.QuoteWhereInput) {
    // Get quote IDs matching the where clause
    const quotes = await this.prisma.quote.findMany({
      where,
      select: { id: true },
    });

    const quoteIds = quotes.map((q) => q.id);

    if (quoteIds.length === 0) {
      return [];
    }

    // Aggregate line items by product
    const lineItems = await this.prisma.quoteLineItem.groupBy({
      by: ['productName'],
      where: { quoteId: { in: quoteIds } },
      _count: true,
      _sum: { totalPrice: true, quantity: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 10,
    });

    return lineItems.map((item) => ({
      productName: item.productName,
      count: item._count,
      totalQuantity: item._sum.quantity || 0,
      totalValue: item._sum.totalPrice || 0,
    }));
  }

  async getQuotesTrend(
    userId: string,
    isAdmin: boolean,
    organizationId: string,
    period: 'day' | 'week' | 'month' = 'month',
    range: number = 12,
  ) {
    const where: Prisma.QuoteWhereInput = {};
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    // Calculate date ranges based on period
    const now = new Date();
    const periods: { start: Date; end: Date; label: string }[] = [];

    for (let i = range - 1; i >= 0; i--) {
      const end = new Date(now);
      const start = new Date(now);

      if (period === 'day') {
        end.setDate(end.getDate() - i);
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'week') {
        end.setDate(end.getDate() - i * 7);
        start.setDate(start.getDate() - i * 7 - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        end.setMonth(end.getMonth() - i);
        start.setMonth(start.getMonth() - i);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
      }

      periods.push({
        start,
        end,
        label:
          period === 'day'
            ? start.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : period === 'week'
              ? `Week ${range - i}`
              : start.toLocaleDateString('en-US', {
                  month: 'short',
                  year: '2-digit',
                }),
      });
    }

    const orderWhere: Prisma.OrderWhereInput = {};
    orderWhere.organizationId = organizationId;
    if (!isAdmin) {
      orderWhere.ownerId = userId;
    }

    const trends = await Promise.all(
      periods.map(async ({ start, end, label }) => {
        const [quotesCreated, quotesSent, quotesAccepted, quotesRejected, ordersCreated, quoteRevenue] = await Promise.all([
          this.prisma.quote.count({
            where: {
              ...where,
              createdAt: { gte: start, lte: end },
            },
          }),
          this.prisma.quote.count({
            where: {
              ...where,
              status: { in: ['SENT', 'ACCEPTED', 'REJECTED'] },
              sentDate: { gte: start, lte: end },
            },
          }),
          this.prisma.quote.count({
            where: {
              ...where,
              status: 'ACCEPTED',
              acceptedDate: { gte: start, lte: end },
            },
          }),
          this.prisma.quote.count({
            where: {
              ...where,
              status: 'REJECTED',
              updatedAt: { gte: start, lte: end },
            },
          }),
          this.prisma.order.count({
            where: {
              ...orderWhere,
              orderDate: { gte: start, lte: end },
            },
          }),
          this.prisma.quote.aggregate({
            where: {
              ...where,
              status: 'ACCEPTED',
              acceptedDate: { gte: start, lte: end },
            },
            _sum: { totalPrice: true },
          }),
        ]);

        return {
          period: label,
          quotesCreated,
          quotesSent,
          quotesAccepted,
          quotesRejected,
          ordersCreated,
          ordersCompleted: 0, // Would need to track completed orders
          revenue: Number(quoteRevenue._sum.totalPrice || 0),
        };
      }),
    );

    return trends;
  }

  async getOrdersTrend(
    userId: string,
    isAdmin: boolean,
    organizationId: string,
    period: 'day' | 'week' | 'month' = 'month',
    range: number = 12,
  ) {
    const where: Prisma.OrderWhereInput = {};
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const now = new Date();
    const periods: { start: Date; end: Date; label: string }[] = [];

    for (let i = range - 1; i >= 0; i--) {
      const end = new Date(now);
      const start = new Date(now);

      if (period === 'day') {
        end.setDate(end.getDate() - i);
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'week') {
        end.setDate(end.getDate() - i * 7);
        start.setDate(start.getDate() - i * 7 - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        end.setMonth(end.getMonth() - i);
        start.setMonth(start.getMonth() - i);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
      }

      periods.push({
        start,
        end,
        label:
          period === 'day'
            ? start.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : period === 'week'
              ? `Week ${range - i}`
              : start.toLocaleDateString('en-US', {
                  month: 'short',
                  year: '2-digit',
                }),
      });
    }

    const trends = await Promise.all(
      periods.map(async ({ start, end, label }) => {
        const [created, paid, totalValue, paidValue] = await Promise.all([
          this.prisma.order.count({
            where: {
              ...where,
              orderDate: { gte: start, lte: end },
            },
          }),
          this.prisma.order.count({
            where: {
              ...where,
              paymentStatus: 'PAID',
              paidAt: { gte: start, lte: end },
            },
          }),
          this.prisma.order.aggregate({
            where: {
              ...where,
              orderDate: { gte: start, lte: end },
            },
            _sum: { total: true },
          }),
          this.prisma.order.aggregate({
            where: {
              ...where,
              paymentStatus: 'PAID',
              paidAt: { gte: start, lte: end },
            },
            _sum: { total: true },
          }),
        ]);

        return {
          period: label,
          created,
          paid,
          totalValue: totalValue._sum.total || 0,
          paidValue: paidValue._sum.total || 0,
        };
      }),
    );

    return trends;
  }

  async getProductPerformance(userId: string, isAdmin: boolean, organizationId: string) {
    const quoteWhere: Prisma.QuoteWhereInput = {};
    quoteWhere.organizationId = organizationId;
    if (!isAdmin) {
      quoteWhere.ownerId = userId;
    }

    const quotes = await this.prisma.quote.findMany({
      where: quoteWhere,
      select: { id: true, status: true },
    });

    const quoteIds = quotes.map((q) => q.id);
    const acceptedQuoteIds = quotes
      .filter((q) => q.status === 'ACCEPTED')
      .map((q) => q.id);

    if (quoteIds.length === 0) {
      return [];
    }

    const [allProducts, acceptedProducts] = await Promise.all([
      this.prisma.quoteLineItem.groupBy({
        by: ['productName'],
        where: { quoteId: { in: quoteIds } },
        _count: true,
        _sum: { totalPrice: true, quantity: true },
      }),
      acceptedQuoteIds.length > 0
        ? this.prisma.quoteLineItem.groupBy({
            by: ['productName'],
            where: { quoteId: { in: acceptedQuoteIds } },
            _count: true,
            _sum: { totalPrice: true, quantity: true },
          })
        : [],
    ]);

    type ProductStats = { count: number; value: number; quantity: number };
    const acceptedMap = new Map<string, ProductStats>(
      acceptedProducts.map((p) => [
        p.productName,
        {
          count: p._count,
          value: p._sum.totalPrice || 0,
          quantity: p._sum.quantity || 0,
        },
      ] as [string, ProductStats]),
    );

    return allProducts
      .map((product) => {
        const accepted: ProductStats = acceptedMap.get(product.productName) || {
          count: 0,
          value: 0,
          quantity: 0,
        };
        const winRate =
          product._count > 0 ? (accepted.count / product._count) * 100 : 0;

        return {
          productName: product.productName,
          quotedCount: product._count,
          quotedValue: product._sum.totalPrice || 0,
          quotedQuantity: product._sum.quantity || 0,
          acceptedCount: accepted.count,
          acceptedValue: accepted.value,
          acceptedQuantity: accepted.quantity,
          winRate: Math.round(winRate * 100) / 100,
        };
      })
      .sort((a, b) => b.quotedValue - a.quotedValue);
  }

  async getConversionFunnel(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.QuoteWhereInput = {};
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const [draft, sent, accepted, rejected, converted] = await Promise.all([
      this.prisma.quote.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.quote.count({
        where: {
          ...where,
          status: { in: ['SENT', 'ACCEPTED', 'REJECTED'] },
        },
      }),
      this.prisma.quote.count({ where: { ...where, status: 'ACCEPTED' } }),
      this.prisma.quote.count({ where: { ...where, status: 'REJECTED' } }),
      this.prisma.order.count({
        where: {
          organizationId,
          ...(isAdmin ? {} : { ownerId: userId }),
          quoteId: { not: null },
        },
      }),
    ]);

    const total = draft + sent;

    return {
      stages: [
        { stage: 'Draft', count: draft, conversionRate: 100 },
        {
          stage: 'Sent',
          count: sent,
          conversionRate: total > 0 ? Math.round((sent / total) * 100) : 0,
        },
        {
          stage: 'Accepted',
          count: accepted,
          conversionRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
        },
        {
          stage: 'Rejected',
          count: rejected,
          conversionRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
        },
        {
          stage: 'Converted to Order',
          count: converted,
          conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
        },
      ],
    };
  }

  async getQuoteAgeAnalysis(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.QuoteWhereInput = {};
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const quotes = await this.prisma.quote.findMany({
      where: {
        ...where,
        status: 'SENT',
      },
      select: {
        id: true,
        name: true,
        quoteNumber: true,
        totalPrice: true,
        sentDate: true,
        validUntil: true,
        account: {
          select: { id: true, name: true },
        },
      },
    });

    const now = new Date();
    const analysis = quotes.map((quote) => {
      const sentDate = quote.sentDate || new Date();
      const ageInDays = Math.floor(
        (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isExpired = quote.validUntil
        ? now > new Date(quote.validUntil)
        : false;
      const daysUntilExpiry = quote.validUntil
        ? Math.floor(
            (new Date(quote.validUntil).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      return {
        ...quote,
        ageInDays,
        isExpired,
        daysUntilExpiry,
        urgency:
          daysUntilExpiry !== null && daysUntilExpiry <= 7
            ? 'high'
            : daysUntilExpiry !== null && daysUntilExpiry <= 14
              ? 'medium'
              : 'low',
      };
    });

    return {
      total: analysis.length,
      expiredCount: analysis.filter((q) => q.isExpired).length,
      expiringThisWeek: analysis.filter(
        (q) =>
          !q.isExpired &&
          q.daysUntilExpiry !== null &&
          q.daysUntilExpiry <= 7,
      ).length,
      quotes: analysis.sort((a, b) => {
        // Sort by urgency (expired first, then expiring soon)
        if (a.isExpired && !b.isExpired) return -1;
        if (!a.isExpired && b.isExpired) return 1;
        if (a.daysUntilExpiry === null && b.daysUntilExpiry !== null) return 1;
        if (a.daysUntilExpiry !== null && b.daysUntilExpiry === null) return -1;
        return (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0);
      }),
    };
  }

  async getQuotePipeline(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.QuoteWhereInput = {};
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const [byStatus, byStatusValue] = await Promise.all([
      this.prisma.quote.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.quote.groupBy({
        by: ['status'],
        where,
        _sum: { totalPrice: true },
      }),
    ]);

    const statusOrder = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;
    const valueMap = new Map<string, number | Prisma.Decimal>(
      byStatusValue.map((s) => [s.status, s._sum.totalPrice || 0]),
    );

    const stages = statusOrder.map((status) => {
      const countItem = byStatus.find((s) => s.status === status);
      return {
        stage: status,
        count: countItem?._count || 0,
        value: Number(valueMap.get(status) || 0),
        avgAge: 0, // Would need to calculate from createdAt
      };
    });

    const total = stages.reduce((sum, s) => sum + s.count, 0);
    const totalValue = stages.reduce((sum, s) => sum + Number(s.value), 0);

    return {
      stages,
      total,
      totalValue,
    };
  }

  async getTopProducts(
    userId: string,
    isAdmin: boolean,
    organizationId: string,
    limit: number = 5,
    sortBy: 'revenue' | 'quantity' | 'orders' = 'revenue',
  ) {
    const quoteWhere: Prisma.QuoteWhereInput = {};
    quoteWhere.organizationId = organizationId;
    if (!isAdmin) {
      quoteWhere.ownerId = userId;
    }

    const quotes = await this.prisma.quote.findMany({
      where: quoteWhere,
      select: { id: true },
    });

    const quoteIds = quotes.map((q) => q.id);

    if (quoteIds.length === 0) {
      return [];
    }

    // Always order by revenue sum for now, then sort in-memory if needed
    const lineItems = await this.prisma.quoteLineItem.groupBy({
      by: ['productName', 'productId'],
      where: { quoteId: { in: quoteIds } },
      _count: true,
      _sum: { totalPrice: true, quantity: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit * 2, // Get more to allow for re-sorting
    });

    // Sort based on sortBy parameter
    const sorted = [...lineItems].sort((a, b) => {
      if (sortBy === 'revenue') {
        return Number(b._sum?.totalPrice || 0) - Number(a._sum?.totalPrice || 0);
      } else if (sortBy === 'quantity') {
        return Number(b._sum?.quantity || 0) - Number(a._sum?.quantity || 0);
      } else {
        return b._count - a._count;
      }
    }).slice(0, limit);

    return sorted.map((item) => ({
      id: item.productId || '',
      name: item.productName,
      code: '',
      quantity: Number(item._sum?.quantity || 0),
      revenue: Number(item._sum?.totalPrice || 0),
      orderCount: item._count,
    }));
  }

  async getTopAccounts(userId: string, isAdmin: boolean, organizationId: string, limit: number = 5) {
    const where: Prisma.QuoteWhereInput = {};
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    // First get quotes with accountId, then group manually
    const allQuotes = await this.prisma.quote.findMany({
      where,
      select: { accountId: true, totalPrice: true },
    });

    // Group by accountId manually
    const accountGroups = new Map<string, { count: number; total: number }>();
    allQuotes.forEach((q) => {
      if (q.accountId) {
        const existing = accountGroups.get(q.accountId) || { count: 0, total: 0 };
        accountGroups.set(q.accountId, {
          count: existing.count + 1,
          total: existing.total + Number(q.totalPrice || 0),
        });
      }
    });

    // Convert to array and sort
    const quotes = Array.from(accountGroups.entries())
      .map(([accountId, data]) => ({
        accountId,
        _count: data.count,
        _sum: { totalPrice: data.total },
      }))
      .sort((a, b) => Number(b._sum.totalPrice) - Number(a._sum.totalPrice))
      .slice(0, limit);

    const accountIds = quotes
      .map((q) => q.accountId)
      .filter((id): id is string => id !== null);

    if (accountIds.length === 0) {
      return [];
    }

    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    return quotes.map((item) => ({
      accountId: item.accountId || '',
      accountName: accountMap.get(item.accountId!) || 'Unknown',
      revenue: Number(item._sum?.totalPrice || 0),
      orderCount: 0, // Would need separate order query
      quoteCount: item._count,
    }));
  }

  async getSalesRepPerformance(userId: string, isAdmin: boolean, organizationId: string) {
    // Only admins can see all sales reps; non-admins see only their own
    if (!isAdmin) {
      const userQuoteWhere: Prisma.QuoteWhereInput = { ownerId: userId };
      userQuoteWhere.organizationId = organizationId;
      const userQuotes = await this.prisma.quote.findMany({
        where: userQuoteWhere,
        select: { id: true, status: true, totalPrice: true },
      });

      const total = userQuotes.length;
      const won = userQuotes.filter((q) => q.status === 'ACCEPTED').length;
      const lost = userQuotes.filter((q) => q.status === 'REJECTED').length;
      const totalValue = userQuotes.reduce(
        (sum, q) => sum + Number(q.totalPrice || 0),
        0,
      );
      const winRate = total > 0 ? Math.round((won / total) * 100) : 0;
      const avgDealSize = won > 0 ? totalValue / won : 0;

      return [
        {
          userId,
          userName: 'You',
          quotesCreated: total,
          quotesWon: won,
          quotesLost: lost,
          winRate,
          totalValue,
          avgDealSize: Math.round(avgDealSize * 100) / 100,
        },
      ];
    }

    // Admin view: group by owner
    const adminWhere: Prisma.QuoteWhereInput = { organizationId };
    const [byOwner, byOwnerAccepted, byOwnerRejected] = await Promise.all([
      this.prisma.quote.groupBy({
        by: ['ownerId'],
        where: adminWhere,
        _count: true,
        _sum: { totalPrice: true },
      }),
      this.prisma.quote.groupBy({
        by: ['ownerId'],
        where: { ...adminWhere, status: 'ACCEPTED' },
        _count: true,
        _sum: { totalPrice: true },
      }),
      this.prisma.quote.groupBy({
        by: ['ownerId'],
        where: { ...adminWhere, status: 'REJECTED' },
        _count: true,
      }),
    ]);

    const ownerIds = byOwner.map((o) => o.ownerId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const acceptedMap = new Map(
      byOwnerAccepted.map((o) => [
        o.ownerId,
        { count: o._count, value: Number(o._sum.totalPrice || 0) },
      ]),
    );
    const rejectedMap = new Map(
      byOwnerRejected.map((o) => [o.ownerId, o._count]),
    );

    return byOwner
      .map((owner) => {
        const accepted = acceptedMap.get(owner.ownerId) || { count: 0, value: 0 };
        const rejected = rejectedMap.get(owner.ownerId) || 0;
        const winRate =
          owner._count > 0
            ? Math.round((accepted.count / owner._count) * 100)
            : 0;
        const totalValue = Number(owner._sum.totalPrice || 0);
        const avgDealSize = accepted.count > 0 ? totalValue / accepted.count : 0;

        return {
          userId: owner.ownerId,
          userName: userMap.get(owner.ownerId) || 'Unknown',
          quotesCreated: owner._count,
          quotesWon: accepted.count,
          quotesLost: rejected,
          winRate,
          totalValue,
          avgDealSize: Math.round(avgDealSize * 100) / 100,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }

  async getForecast(userId: string, isAdmin: boolean, organizationId: string, periods: number = 3) {
    const where: Prisma.QuoteWhereInput = {};
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    // Get historical data for the past 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historicalQuotes = await this.prisma.quote.findMany({
      where: {
        ...where,
        status: 'ACCEPTED',
        acceptedDate: { gte: sixMonthsAgo },
      },
      select: {
        totalPrice: true,
        acceptedDate: true,
      },
    });

    // Calculate monthly averages
    const monthlyData = new Map<string, { count: number; value: number }>();

    historicalQuotes.forEach((quote) => {
      const date = quote.acceptedDate || new Date();
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const existing = monthlyData.get(key) || { count: 0, value: 0 };
      monthlyData.set(key, {
        count: existing.count + 1,
        value: existing.value + Number(quote.totalPrice || 0),
      });
    });

    const monthlyValues = Array.from(monthlyData.values());
    const avgMonthlyCount =
      monthlyValues.length > 0
        ? monthlyValues.reduce((sum, m) => sum + m.count, 0) / monthlyValues.length
        : 0;
    const avgMonthlyValue =
      monthlyValues.length > 0
        ? monthlyValues.reduce((sum, m) => sum + m.value, 0) / monthlyValues.length
        : 0;

    // Get current pipeline (sent quotes)
    const pipeline = await this.prisma.quote.findMany({
      where: {
        ...where,
        status: 'SENT',
      },
      select: { totalPrice: true },
    });

    const pipelineValue = pipeline.reduce(
      (sum, q) => sum + Number(q.totalPrice || 0),
      0,
    );
    const pipelineCount = pipeline.length;

    // Generate forecast for upcoming periods - return array matching CPQForecast type
    const now = new Date();
    const forecastArray: {
      period: string;
      projectedQuotes: number;
      projectedOrders: number;
      projectedRevenue: number;
      confidence: number;
      factors: string[];
    }[] = [];

    for (let i = 1; i <= periods; i++) {
      const forecastDate = new Date(now);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      // Calculate confidence based on historical data availability
      const confidence = monthlyData.size >= 3 ? 75 : monthlyData.size >= 1 ? 50 : 25;

      forecastArray.push({
        period: forecastDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        projectedQuotes: Math.round(avgMonthlyCount),
        projectedOrders: Math.round(avgMonthlyCount * 0.3), // Assume 30% conversion
        projectedRevenue: Math.round(avgMonthlyValue),
        confidence,
        factors: ['Historical trend', 'Current pipeline'],
      });
    }

    return forecastArray;
  }

  async getWinLossAnalysis(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.QuoteWhereInput = {};
    where.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
    }

    const [accepted, rejected, total] = await Promise.all([
      this.prisma.quote.findMany({
        where: { ...where, status: 'ACCEPTED' },
        select: { totalPrice: true, accountId: true },
      }),
      this.prisma.quote.findMany({
        where: { ...where, status: 'REJECTED' },
        select: { totalPrice: true, accountId: true },
      }),
      this.prisma.quote.count({
        where: {
          ...where,
          status: { in: ['ACCEPTED', 'REJECTED'] },
        },
      }),
    ]);

    const winCount = accepted.length;
    const lossCount = rejected.length;
    const winValue = accepted.reduce(
      (sum, q) => sum + Number(q.totalPrice || 0),
      0,
    );
    const lossValue = rejected.reduce(
      (sum, q) => sum + Number(q.totalPrice || 0),
      0,
    );

    const winRate = total > 0 ? Math.round((winCount / total) * 100) : 0;

    return {
      summary: {
        winCount,
        lossCount,
        winValue,
        lossValue,
        winRate,
        lossRate: 100 - winRate,
        totalDecided: total,
      },
      trends: [],
      byReason: [],
    };
  }

  async getSnapshots(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.CPQAnalyticsSnapshotWhereInput = {};
    // Note: organizationId filter for snapshots will be enabled once the schema is updated
    // For now, snapshots are filtered by ownerId only
    if (!isAdmin) {
      where.ownerId = userId;
    }

    return this.prisma.cPQAnalyticsSnapshot.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 30,
    });
  }

  async createSnapshot(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.QuoteWhereInput = {};
    const orderWhere: Prisma.OrderWhereInput = {};
    where.organizationId = organizationId;
    orderWhere.organizationId = organizationId;
    if (!isAdmin) {
      where.ownerId = userId;
      orderWhere.ownerId = userId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if snapshot already exists for today
    // Note: organizationId filter for snapshots will be enabled once the schema is updated
    const existingSnapshot = await this.prisma.cPQAnalyticsSnapshot.findFirst({
      where: {
        ownerId: userId,
        date: today,
      },
    });

    if (existingSnapshot) {
      return existingSnapshot;
    }

    // Gather metrics
    const [quotesCreated, quotesAccepted, totalQuoteValue, acceptedQuoteValue, topProducts] =
      await Promise.all([
        this.prisma.quote.count({ where }),
        this.prisma.quote.count({ where: { ...where, status: 'ACCEPTED' } }),
        this.prisma.quote.aggregate({
          where,
          _sum: { totalPrice: true },
        }),
        this.prisma.quote.aggregate({
          where: { ...where, status: 'ACCEPTED' },
          _sum: { totalPrice: true },
        }),
        this.getTopProducts(userId, isAdmin, organizationId, 10, 'revenue'),
      ]);

    // Note: organizationId will be saved once the schema is updated
    return this.prisma.cPQAnalyticsSnapshot.create({
      data: {
        ownerId: userId,
        date: today,
        quotesCreated,
        quotesAccepted,
        totalValue: totalQuoteValue._sum.totalPrice || 0,
        acceptedValue: acceptedQuoteValue._sum.totalPrice || 0,
        topProducts: topProducts as any,
      },
    });
  }
}
