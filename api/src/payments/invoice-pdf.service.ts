// Invoice PDF Service - Generates branded invoice PDFs using IRIS design system
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as puppeteer from 'puppeteer';

// IRIS Design System Colors
const COLORS = {
  dark: '#1A1A1A',
  gold: '#EAD07D',
  goldLight: '#F5E9C4',
  background: '#F8F8F6',
  backgroundAlt: '#F2F1EA',
  text: '#1A1A1A',
  textMuted: '#666666',
  textLight: '#999999',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// IRIS Logo SVG (command symbol)
const LOGO_SVG = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="10" fill="${COLORS.dark}"/>
  <path d="M12 16C12 13.7909 13.7909 12 16 12C18.2091 12 20 13.7909 20 16C20 18.2091 18.2091 20 16 20C13.7909 20 12 18.2091 12 16Z" stroke="${COLORS.white}" stroke-width="2.5" fill="none"/>
  <path d="M20 16C20 13.7909 21.7909 12 24 12C26.2091 12 28 13.7909 28 16C28 18.2091 26.2091 20 24 20C21.7909 20 20 18.2091 20 16Z" stroke="${COLORS.white}" stroke-width="2.5" fill="none"/>
  <path d="M12 24C12 21.7909 13.7909 20 16 20C18.2091 20 20 21.7909 20 24C20 26.2091 18.2091 28 16 28C13.7909 28 12 26.2091 12 24Z" stroke="${COLORS.white}" stroke-width="2.5" fill="none"/>
  <path d="M20 24C20 21.7909 21.7909 20 24 20C26.2091 20 28 21.7909 28 24C28 26.2091 26.2091 28 24 28C21.7909 28 20 26.2091 20 24Z" stroke="${COLORS.white}" stroke-width="2.5" fill="none"/>
</svg>
`;

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);
  private readonly companyName: string;
  private readonly companyAddress: string;
  private readonly companyEmail: string;
  private readonly companyWebsite: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.companyName = this.configService.get<string>('COMPANY_NAME') || 'IRIS';
    this.companyAddress = this.configService.get<string>('COMPANY_ADDRESS') || '';
    this.companyEmail = this.configService.get<string>('COMPANY_EMAIL') || 'billing@irisbots.ai';
    this.companyWebsite = this.configService.get<string>('APP_URL') || 'https://irisbots.ai';
  }

  async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    // Fetch invoice with all relations
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        subscription: {
          include: { licenseType: true },
        },
        lineItems: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const html = this.generateInvoiceHtml(invoice);
    const pdf = await this.htmlToPdf(html);

    return pdf;
  }

  private generateInvoiceHtml(invoice: any): string {
    const customer = invoice.customer;
    const user = customer?.user;
    const lineItems = invoice.lineItems || [];
    const subscription = invoice.subscription;

    // Format currency
    const formatCurrency = (cents: number, currency = 'USD') => {
      const amount = cents / 100;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    // Format date
    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Status badge colors
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'PAID':
          return COLORS.success;
        case 'PENDING':
        case 'OPEN':
          return COLORS.warning;
        case 'VOID':
        case 'UNCOLLECTIBLE':
          return COLORS.error;
        default:
          return COLORS.textMuted;
      }
    };

    // Generate line items HTML
    const lineItemsHtml = lineItems.length > 0
      ? lineItems.map((item: any) => `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid ${COLORS.backgroundAlt};">
              <div style="font-weight: 500; color: ${COLORS.text};">${item.description}</div>
              ${item.periodStart && item.periodEnd ? `
                <div style="font-size: 12px; color: ${COLORS.textMuted}; margin-top: 4px;">
                  ${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}
                </div>
              ` : ''}
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid ${COLORS.backgroundAlt}; text-align: center; color: ${COLORS.textMuted};">
              ${item.quantity}
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid ${COLORS.backgroundAlt}; text-align: right; color: ${COLORS.textMuted};">
              ${formatCurrency(item.unitAmount, invoice.currency)}
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid ${COLORS.backgroundAlt}; text-align: right; font-weight: 500; color: ${COLORS.text};">
              ${formatCurrency(item.amount, invoice.currency)}
            </td>
          </tr>
        `).join('')
      : `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid ${COLORS.backgroundAlt};">
              <div style="font-weight: 500; color: ${COLORS.text};">
                ${subscription?.licenseType?.name || 'Subscription'} - ${subscription?.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}
              </div>
              ${invoice.description ? `<div style="font-size: 12px; color: ${COLORS.textMuted}; margin-top: 4px;">${invoice.description}</div>` : ''}
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid ${COLORS.backgroundAlt}; text-align: center; color: ${COLORS.textMuted};">1</td>
            <td style="padding: 16px 0; border-bottom: 1px solid ${COLORS.backgroundAlt}; text-align: right; color: ${COLORS.textMuted};">
              ${formatCurrency(invoice.subtotal, invoice.currency)}
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid ${COLORS.backgroundAlt}; text-align: right; font-weight: 500; color: ${COLORS.text};">
              ${formatCurrency(invoice.subtotal, invoice.currency)}
            </td>
          </tr>
        `;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: ${COLORS.text};
      background: ${COLORS.white};
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0;
    }

    .header {
      background: linear-gradient(135deg, ${COLORS.dark} 0%, #2d2d2d 100%);
      padding: 40px;
      color: ${COLORS.white};
      border-radius: 0 0 24px 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .company-name {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .invoice-badge {
      background: ${COLORS.gold};
      color: ${COLORS.dark};
      padding: 8px 20px;
      border-radius: 100px;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.5px;
    }

    .invoice-meta {
      margin-top: 32px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }

    .meta-item {
      background: rgba(255,255,255,0.1);
      padding: 16px 20px;
      border-radius: 12px;
    }

    .meta-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255,255,255,0.6);
      margin-bottom: 4px;
    }

    .meta-value {
      font-size: 16px;
      font-weight: 600;
    }

    .content {
      padding: 40px;
    }

    .billing-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }

    .billing-box {
      background: ${COLORS.background};
      padding: 24px;
      border-radius: 16px;
    }

    .billing-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${COLORS.textMuted};
      margin-bottom: 12px;
      font-weight: 600;
    }

    .billing-name {
      font-size: 18px;
      font-weight: 600;
      color: ${COLORS.text};
      margin-bottom: 8px;
    }

    .billing-detail {
      font-size: 14px;
      color: ${COLORS.textMuted};
      line-height: 1.6;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }

    .items-table th {
      text-align: left;
      padding: 12px 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${COLORS.textMuted};
      border-bottom: 2px solid ${COLORS.backgroundAlt};
      font-weight: 600;
    }

    .items-table th:nth-child(2),
    .items-table th:nth-child(3),
    .items-table th:nth-child(4) {
      text-align: right;
    }

    .items-table th:nth-child(2) {
      text-align: center;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
    }

    .totals-box {
      width: 320px;
      background: ${COLORS.background};
      padding: 24px;
      border-radius: 16px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .total-label {
      color: ${COLORS.textMuted};
    }

    .total-value {
      font-weight: 500;
      color: ${COLORS.text};
    }

    .total-row.discount .total-value {
      color: ${COLORS.success};
    }

    .total-row.grand-total {
      border-top: 2px solid ${COLORS.dark};
      margin-top: 12px;
      padding-top: 16px;
    }

    .total-row.grand-total .total-label {
      font-size: 16px;
      font-weight: 600;
      color: ${COLORS.text};
    }

    .total-row.grand-total .total-value {
      font-size: 24px;
      font-weight: 700;
      color: ${COLORS.dark};
    }

    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .footer {
      margin-top: 48px;
      padding-top: 32px;
      border-top: 1px solid ${COLORS.backgroundAlt};
      text-align: center;
    }

    .footer-text {
      font-size: 12px;
      color: ${COLORS.textMuted};
      margin-bottom: 8px;
    }

    .footer-contact {
      font-size: 13px;
      color: ${COLORS.text};
    }

    .footer-contact a {
      color: ${COLORS.gold};
      text-decoration: none;
      font-weight: 500;
    }

    .paid-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 120px;
      font-weight: 800;
      color: rgba(16, 185, 129, 0.08);
      pointer-events: none;
      z-index: 0;
    }

    .notes-section {
      margin-top: 32px;
      padding: 20px;
      background: ${COLORS.backgroundAlt};
      border-radius: 12px;
      border-left: 4px solid ${COLORS.gold};
    }

    .notes-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${COLORS.textMuted};
      margin-bottom: 8px;
      font-weight: 600;
    }

    .notes-text {
      font-size: 13px;
      color: ${COLORS.text};
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${invoice.status === 'PAID' ? '<div class="paid-watermark">PAID</div>' : ''}

  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo-section">
          ${LOGO_SVG}
          <span class="company-name">${this.companyName}</span>
        </div>
        <div class="invoice-badge">INVOICE</div>
      </div>

      <div class="invoice-meta">
        <div class="meta-item">
          <div class="meta-label">Invoice Number</div>
          <div class="meta-value">${invoice.invoiceNumber}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Issue Date</div>
          <div class="meta-value">${formatDate(invoice.invoiceDate)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Status</div>
          <div class="meta-value">
            <span class="status-badge" style="background: ${getStatusColor(invoice.status)}20; color: ${getStatusColor(invoice.status)};">
              ${invoice.status}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Billing Section -->
      <div class="billing-section">
        <div class="billing-box">
          <div class="billing-title">From</div>
          <div class="billing-name">${this.companyName}</div>
          <div class="billing-detail">
            ${this.companyAddress ? `${this.companyAddress}<br>` : ''}
            ${this.companyEmail}<br>
            ${this.companyWebsite}
          </div>
        </div>
        <div class="billing-box">
          <div class="billing-title">Bill To</div>
          <div class="billing-name">${customer?.billingName || user?.name || 'Customer'}</div>
          <div class="billing-detail">
            ${customer?.billingEmail || user?.email || ''}<br>
            ${customer?.billingAddress ? `
              ${(customer.billingAddress as any)?.line1 || ''}<br>
              ${(customer.billingAddress as any)?.city || ''} ${(customer.billingAddress as any)?.state || ''} ${(customer.billingAddress as any)?.postal_code || ''}<br>
              ${(customer.billingAddress as any)?.country || ''}
            ` : ''}
            ${customer?.taxId ? `<br>Tax ID: ${customer.taxId}` : ''}
          </div>
        </div>
      </div>

      <!-- Line Items -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50%;">Description</th>
            <th style="width: 15%;">Qty</th>
            <th style="width: 17.5%;">Unit Price</th>
            <th style="width: 17.5%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals-section">
        <div class="totals-box">
          <div class="total-row">
            <span class="total-label">Subtotal</span>
            <span class="total-value">${formatCurrency(invoice.subtotal, invoice.currency)}</span>
          </div>
          ${invoice.discountAmount > 0 ? `
            <div class="total-row discount">
              <span class="total-label">Discount</span>
              <span class="total-value">-${formatCurrency(invoice.discountAmount, invoice.currency)}</span>
            </div>
          ` : ''}
          ${invoice.taxAmount > 0 ? `
            <div class="total-row">
              <span class="total-label">Tax</span>
              <span class="total-value">${formatCurrency(invoice.taxAmount, invoice.currency)}</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span class="total-label">Total Due</span>
            <span class="total-value">${formatCurrency(invoice.total, invoice.currency)}</span>
          </div>
          ${invoice.amountPaid > 0 && invoice.amountPaid < invoice.total ? `
            <div class="total-row">
              <span class="total-label">Amount Paid</span>
              <span class="total-value" style="color: ${COLORS.success};">-${formatCurrency(invoice.amountPaid, invoice.currency)}</span>
            </div>
            <div class="total-row">
              <span class="total-label" style="font-weight: 600;">Balance Due</span>
              <span class="total-value" style="font-weight: 600;">${formatCurrency(invoice.amountDue, invoice.currency)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      ${invoice.notes ? `
        <div class="notes-section">
          <div class="notes-title">Notes</div>
          <div class="notes-text">${invoice.notes}</div>
        </div>
      ` : ''}

      <!-- Footer -->
      <div class="footer">
        <div class="footer-text">Thank you for your business!</div>
        <div class="footer-contact">
          Questions? Contact us at <a href="mailto:${this.companyEmail}">${this.companyEmail}</a>
        </div>
        ${invoice.footer ? `<div class="footer-text" style="margin-top: 12px;">${invoice.footer}</div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to generate PDF', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
