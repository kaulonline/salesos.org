// Outcome Invoice Generator Service - Generates invoices for outcome-based billing
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { Invoice, InvoiceStatus, OutcomeEventStatus } from '@prisma/client';

@Injectable()
export class OutcomeInvoiceGeneratorService {
  private readonly logger = new Logger(OutcomeInvoiceGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs daily at 2 AM to check if it's billing day for any organization.
   * This ensures invoices are generated on the configured billing day for each org.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processOutcomeBilling(): Promise<void> {
    this.logger.log('Starting daily outcome billing processing...');

    const today = new Date().getDate();

    // Find all active plans where today is the billing day
    const plans = await this.prisma.outcomePricingPlan.findMany({
      where: {
        isActive: true,
        billingDay: today,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(
      `Found ${plans.length} organizations with billing day ${today}`,
    );

    let successCount = 0;
    let errorCount = 0;

    for (const plan of plans) {
      try {
        const invoice = await this.generateOutcomeInvoice(plan.organizationId);
        if (invoice) {
          successCount++;
          this.logger.log(
            `Generated invoice ${invoice.invoiceNumber} for organization ${plan.organization.name}`,
          );
        } else {
          this.logger.debug(
            `No pending events to invoice for organization ${plan.organization.name}`,
          );
        }
      } catch (err) {
        errorCount++;
        this.logger.error(
          `Failed to generate invoice for organization ${plan.organization.name}: ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log(
      `Outcome billing processing complete. Success: ${successCount}, Errors: ${errorCount}`,
    );
  }

  /**
   * Generate an invoice for all pending outcome events for an organization.
   */
  async generateOutcomeInvoice(organizationId: string): Promise<Invoice | null> {
    // Get the pricing plan
    const plan = await this.prisma.outcomePricingPlan.findUnique({
      where: { organizationId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                role: { in: ['OWNER', 'ADMIN'] },
                isActive: true,
              },
              include: {
                user: {
                  include: {
                    billingCustomer: true,
                  },
                },
              },
              orderBy: { role: 'asc' }, // ADMIN comes before OWNER alphabetically, but we want OWNER first
              take: 5,
            },
          },
        },
      },
    });

    if (!plan || !plan.isActive) {
      this.logger.warn(
        `No active pricing plan found for organization ${organizationId}`,
      );
      return null;
    }

    // Calculate billing period (last month)
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // Last day of previous month
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1); // First day of previous month

    // Get pending outcome events for this period
    const events = await this.prisma.outcomeEvent.findMany({
      where: {
        organizationId,
        status: OutcomeEventStatus.PENDING,
        billingPeriodStart: { gte: periodStart },
        billingPeriodEnd: { lte: new Date(periodEnd.getTime() + 86400000) }, // Add a day buffer
      },
      orderBy: { closedDate: 'asc' },
    });

    if (events.length === 0) {
      this.logger.debug(
        `No pending outcome events for organization ${organizationId}`,
      );
      return null;
    }

    // Find a billing customer - look for org admin/owner with billing customer
    let billingCustomer: { id: string } | null = null;
    for (const member of plan.organization.members) {
      if (member.user.billingCustomer) {
        billingCustomer = member.user.billingCustomer;
        break;
      }
    }

    if (!billingCustomer) {
      // If no billing customer exists, we cannot create a proper invoice
      // The organization needs to set up billing before invoices can be generated
      this.logger.warn(
        `No billing customer found for organization ${organizationId}. ` +
          `Cannot generate invoice until a billing customer is set up. ` +
          `${events.length} events remain pending.`,
      );
      return null;
    }

    // Calculate totals
    const subtotal = events.reduce((sum, e) => sum + e.feeAmount, 0);
    const totalDealValue = events.reduce((sum, e) => sum + e.dealAmount, 0);

    // Generate invoice number
    const invoiceNumber = `OBB-${plan.organization.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Create invoice with transaction
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Create the invoice
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: billingCustomer.id,
          status: InvoiceStatus.OPEN,
          currency: plan.currency,
          subtotal,
          discountAmount: 0,
          taxAmount: 0,
          total: subtotal,
          amountPaid: 0,
          amountDue: subtotal,
          invoiceDate: new Date(),
          dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          billingReason: 'outcome_billing',
          description: `Outcome-based billing for ${periodStart.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}`,
          notes: `${events.length} deals closed totaling $${(totalDealValue / 100).toLocaleString()}`,
          metadata: {
            organizationId,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            pricingModel: plan.pricingModel,
            eventCount: events.length,
            totalDealValue,
          },
          // Create line items for each event
          lineItems: {
            create: events.map((e, index) => ({
              description: `Deal closed: ${e.opportunityName} (${e.accountName}) - $${(e.dealAmount / 100).toLocaleString()} deal`,
              quantity: 1,
              unitAmount: e.feeAmount,
              amount: e.feeAmount,
              periodStart,
              periodEnd,
              type: 'outcome_fee',
              metadata: {
                outcomeEventId: e.id,
                opportunityId: e.opportunityId,
                dealAmount: e.dealAmount,
                feeCalculation: e.feeCalculation,
              },
            })),
          },
        },
        include: {
          lineItems: true,
        },
      });

      // Update all events to INVOICED status
      await tx.outcomeEvent.updateMany({
        where: {
          id: { in: events.map((e) => e.id) },
        },
        data: {
          status: OutcomeEventStatus.INVOICED,
          invoiceId: newInvoice.id,
          invoicedAt: new Date(),
        },
      });

      return newInvoice;
    });

    this.logger.log(
      `Created invoice ${invoice.invoiceNumber} for organization ${organizationId}: ` +
        `$${(subtotal / 100).toFixed(2)} for ${events.length} deals`,
    );

    return invoice;
  }

  /**
   * Mark events as paid when an invoice is paid.
   * Called from webhook handlers when invoice payment is confirmed.
   */
  async markEventsAsPaid(invoiceId: string): Promise<number> {
    const result = await this.prisma.outcomeEvent.updateMany({
      where: {
        invoiceId,
        status: OutcomeEventStatus.INVOICED,
      },
      data: {
        status: OutcomeEventStatus.PAID,
      },
    });

    this.logger.log(
      `Marked ${result.count} outcome events as PAID for invoice ${invoiceId}`,
    );

    return result.count;
  }

  /**
   * Get invoice summary for an organization.
   */
  async getInvoiceSummary(organizationId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        billingReason: 'outcome_billing',
        metadata: {
          path: ['organizationId'],
          equals: organizationId,
        },
      },
      include: {
        lineItems: true,
      },
      orderBy: { invoiceDate: 'desc' },
      take: 12, // Last 12 invoices
    });

    const summary = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      paidAmount: invoices
        .filter((inv) => inv.status === 'PAID')
        .reduce((sum, inv) => sum + inv.total, 0),
      outstandingAmount: invoices
        .filter((inv) => inv.status === 'OPEN')
        .reduce((sum, inv) => sum + inv.amountDue, 0),
      recentInvoices: invoices.slice(0, 6),
    };

    return summary;
  }
}
