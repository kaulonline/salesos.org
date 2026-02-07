/**
 * Order PDF Generator
 * Generates PDF documents for orders using Puppeteer
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as bwipjs from 'bwip-js';

// Format currency for display
const formatCurrency = (amount?: number, currency: string = 'USD'): string => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date for display
const formatDate = (date?: Date | string): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format short date for status tracker
const formatShortDate = (date?: Date | string): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Get status badge color styles
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'DRAFT': return 'background: #F2F1EA; color: #666;';
    case 'PENDING': return 'background: #FEF3C7; color: #92400E;';
    case 'CONFIRMED': return 'background: #DBEAFE; color: #1D4ED8;';
    case 'PROCESSING': return 'background: #E0E7FF; color: #3730A3;';
    case 'SHIPPED': return 'background: #E9D5FF; color: #7C3AED;';
    case 'DELIVERED':
    case 'COMPLETED': return 'background: #D1FAE5; color: #059669;';
    case 'CANCELLED': return 'background: #FEE2E2; color: #DC2626;';
    default: return 'background: #F2F1EA; color: #666;';
  }
};

// Status step configuration
const STATUS_STEPS = [
  { key: 'ORDERED', label: 'Ordered' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0,
  PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  COMPLETED: 4,
  CANCELLED: -1,
  RETURNED: -1,
};

// Carrier detection patterns
interface CarrierInfo {
  name: string;
  bgColor: string;
  color: string;
}

function detectCarrier(trackingNumber: string): CarrierInfo | null {
  if (!trackingNumber) return null;

  const cleaned = trackingNumber.replace(/[\s-]/g, '').toUpperCase();

  // UPS patterns
  if (/^1Z[A-Z0-9]{16}$/i.test(cleaned) || /^T[A-Z0-9]{10}$/i.test(cleaned) || /^9[0-9]{21}$/i.test(cleaned)) {
    return { name: 'UPS', bgColor: '#FFD100', color: '#412000' };
  }

  // FedEx patterns
  if (/^[0-9]{12}$/.test(cleaned) || /^[0-9]{15}$/.test(cleaned) || /^[0-9]{20}$/.test(cleaned) || /^[0-9]{22}$/.test(cleaned) || /^96[0-9]{20}$/.test(cleaned) || /^DT[0-9]{12}$/i.test(cleaned)) {
    return { name: 'FedEx', bgColor: '#FF6600', color: '#4D148C' };
  }

  // USPS patterns
  if (/^94[0-9]{20}$/.test(cleaned) || /^92[0-9]{20}$/.test(cleaned) || /^93[0-9]{20}$/.test(cleaned) || /^[0-9]{20}$/.test(cleaned) || /^[A-Z]{2}[0-9]{9}US$/i.test(cleaned) || /^420[0-9]{5}[0-9]{22}$/.test(cleaned)) {
    return { name: 'USPS', bgColor: '#FFFFFF', color: '#333366' };
  }

  // DHL patterns
  if (/^[0-9]{10}$/.test(cleaned) || /^[0-9]{11}$/.test(cleaned) || /^[A-Z]{3}[0-9]{7}$/i.test(cleaned) || /^JJD[0-9]{18}$/i.test(cleaned)) {
    return { name: 'DHL', bgColor: '#D40511', color: '#FFCC00' };
  }

  // Amazon patterns
  if (/^TBA[0-9]{12,}$/i.test(cleaned)) {
    return { name: 'Amazon', bgColor: '#FF9900', color: '#232F3E' };
  }

  return null;
}

@Injectable()
export class OrderPdfGenerator implements OnModuleDestroy {
  private readonly logger = new Logger(OrderPdfGenerator.name);
  private browser: puppeteer.Browser | null = null;
  private browserPromise: Promise<puppeteer.Browser> | null = null;

  /**
   * Get or create browser instance (singleton pattern for efficiency)
   */
  private async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    if (this.browserPromise) {
      return this.browserPromise;
    }

    this.browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    });

    this.browser = await this.browserPromise;
    this.browserPromise = null;

    this.browser.on('disconnected', () => {
      this.browser = null;
      this.browserPromise = null;
    });

    return this.browser;
  }

  /**
   * Clean up browser on module destroy
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Generate barcode as SVG data URL
   */
  private async generateBarcodeDataUrl(text: string): Promise<string> {
    try {
      const svg = bwipjs.toSVG({
        bcid: 'code128',
        text: text,
        scale: 2,
        height: 8,
        includetext: true,
        textxalign: 'center',
        textsize: 8,
      });
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    } catch (error) {
      this.logger.warn(`Failed to generate barcode: ${error.message}`);
      return '';
    }
  }

  /**
   * Generate status tracker HTML
   */
  private generateStatusTrackerHtml(order: any): string {
    const currentStepIndex = STATUS_ORDER[order.status] ?? -1;
    const isCancelled = order.status === 'CANCELLED';
    const isReturned = order.status === 'RETURNED';

    if (isCancelled || isReturned) {
      return `
        <div style="background: ${isCancelled ? '#FEE2E2' : '#FEF3C7'}; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <span style="font-weight: 600; color: ${isCancelled ? '#DC2626' : '#92400E'};">
            Order ${isCancelled ? 'Cancelled' : 'Returned'}
          </span>
        </div>
      `;
    }

    const stepsHtml = STATUS_STEPS.map((step, index) => {
      const isCompleted = index < currentStepIndex;
      const isCurrent = index === currentStepIndex;
      const bgColor = isCompleted ? '#93C01F' : isCurrent ? '#EAD07D' : '#F0EBD8';
      const textColor = isCompleted || isCurrent ? '#1A1A1A' : '#999';

      let dateText = '';
      if (step.key === 'ORDERED' && order.orderDate) {
        dateText = formatShortDate(order.orderDate);
      } else if (step.key === 'SHIPPED' && order.shippedDate) {
        dateText = formatShortDate(order.shippedDate);
      } else if (step.key === 'DELIVERED') {
        if (order.deliveredDate) {
          dateText = formatShortDate(order.deliveredDate);
        } else if (order.expectedDeliveryDate && index > currentStepIndex) {
          dateText = `Est. ${formatShortDate(order.expectedDeliveryDate)}`;
        }
      }

      return `
        <div style="flex: 1; text-align: center;">
          <div style="width: 28px; height: 28px; border-radius: 8px; background: ${bgColor}; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 12px; color: ${isCompleted ? 'white' : textColor};">
              ${isCompleted ? '✓' : index + 1}
            </span>
          </div>
          <div style="font-size: 11px; font-weight: 500; color: ${textColor};">${step.label}</div>
          <div style="font-size: 10px; color: #999; margin-top: 2px;">${dateText}</div>
        </div>
      `;
    }).join('');

    const progressWidth = Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100);

    return `
      <div style="background: #F8F8F6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
          Order Progress
        </div>
        <div style="position: relative; padding: 0 20px;">
          <div style="position: absolute; top: 14px; left: 40px; right: 40px; height: 4px; background: #F0EBD8; border-radius: 2px;">
            <div style="width: ${progressWidth}%; height: 100%; background: #93C01F; border-radius: 2px;"></div>
          </div>
          <div style="display: flex; position: relative; z-index: 1;">
            ${stepsHtml}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate shipping info HTML with carrier detection
   */
  private generateShippingInfoHtml(order: any): string {
    if (!order.trackingNumber && !order.shippedDate && !order.expectedDeliveryDate) {
      return '';
    }

    const carrier = order.trackingNumber ? detectCarrier(order.trackingNumber) : null;
    const carrierBadge = carrier
      ? `<span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${carrier.bgColor}; color: ${carrier.color}; margin-right: 8px;">${carrier.name}</span>`
      : order.trackingNumber
      ? `<span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #F8F8F6; color: #666;">Carrier</span>`
      : '';

    return `
      <div style="background: #F8F8F6; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
          Shipping Information
        </div>
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          ${order.trackingNumber ? `
            <div>
              ${carrierBadge}
              <div style="font-size: 13px; color: #666; margin-top: 8px;">
                <strong>Tracking:</strong> <code style="background: white; padding: 2px 6px; border-radius: 4px;">${order.trackingNumber}</code>
              </div>
            </div>
          ` : ''}
          ${order.shippedDate ? `
            <div>
              <div style="font-size: 11px; color: #888;">Shipped</div>
              <div style="font-size: 14px; font-weight: 500; color: #1A1A1A;">${formatShortDate(order.shippedDate)}</div>
            </div>
          ` : ''}
          ${order.deliveredDate ? `
            <div>
              <div style="font-size: 11px; color: #93C01F;">Delivered</div>
              <div style="font-size: 14px; font-weight: 500; color: #1A1A1A;">${formatShortDate(order.deliveredDate)}</div>
            </div>
          ` : order.expectedDeliveryDate ? `
            <div>
              <div style="font-size: 11px; color: #888;">Expected Delivery</div>
              <div style="font-size: 14px; font-weight: 500; color: #1A1A1A;">${formatShortDate(order.expectedDeliveryDate)}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Generate PDF for an order
   */
  async generateOrderPdf(order: any): Promise<Buffer> {
    const html = await this.generateOrderHtml(order);
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate HTML content for the order PDF
   */
  private async generateOrderHtml(order: any): Promise<string> {
    const lineItemsRows = (order.lineItems || [])
      .map(
        (item: any, index: number) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${index + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <div style="font-weight: 500;">${item.productName || 'Unnamed Product'}</div>
            ${item.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${item.description}</div>` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.discount ? `${item.discount}%` : '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">${formatCurrency(item.totalPrice || item.total)}</td>
        </tr>
      `
      )
      .join('');

    // Generate barcode
    const barcodeDataUrl = await this.generateBarcodeDataUrl(order.orderNumber);

    // Generate status tracker
    const statusTrackerHtml = this.generateStatusTrackerHtml(order);

    // Generate shipping info
    const shippingInfoHtml = this.generateShippingInfoHtml(order);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order ${order.orderNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #1A1A1A;
              background: white;
              padding: 40px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              padding-bottom: 24px;
              border-bottom: 2px solid #93C01F;
            }
            .logo {
              font-size: 28px;
              font-weight: 700;
              color: #1A1A1A;
            }
            .logo span {
              color: #93C01F;
            }
            .order-info {
              text-align: right;
            }
            .order-number {
              font-size: 24px;
              font-weight: 600;
              color: #1A1A1A;
              margin-bottom: 4px;
            }
            .order-date {
              font-size: 14px;
              color: #666;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              margin-top: 8px;
            }
            .barcode-container {
              margin-top: 12px;
              padding: 8px;
              background: white;
              border: 1px solid #eee;
              border-radius: 8px;
              display: inline-block;
            }
            .barcode-container img {
              display: block;
              max-width: 180px;
            }
            .addresses {
              display: flex;
              gap: 40px;
              margin-bottom: 24px;
            }
            .address-block {
              flex: 1;
            }
            .address-label {
              font-size: 12px;
              font-weight: 600;
              color: #888;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            .address-name {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .address-details {
              font-size: 14px;
              color: #666;
            }
            .line-items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            .line-items-table th {
              background: #F8F8F6;
              padding: 12px;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .line-items-table th:first-child {
              border-radius: 8px 0 0 8px;
              text-align: center;
            }
            .line-items-table th:last-child {
              border-radius: 0 8px 8px 0;
            }
            .totals {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 40px;
            }
            .totals-table {
              width: 300px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .totals-row.total {
              font-size: 18px;
              font-weight: 700;
              border-top: 2px solid #1A1A1A;
              margin-top: 8px;
              padding-top: 16px;
            }
            .totals-row.total .amount {
              color: #93C01F;
            }
            .payment-info {
              margin-top: 40px;
              padding-top: 24px;
              border-top: 1px solid #eee;
            }
            .payment-title {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .payment-content {
              font-size: 13px;
              color: #666;
            }
            .footer {
              margin-top: 60px;
              padding-top: 24px;
              border-top: 1px solid #eee;
              text-align: center;
              font-size: 12px;
              color: #888;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Sales<span>OS</span></div>
            <div class="order-info">
              <div class="order-number">${order.orderNumber}</div>
              <div class="order-date">Order Date: ${formatDate(order.orderDate)}</div>
              ${order.expectedDeliveryDate ? `<div class="order-date">Expected Delivery: ${formatDate(order.expectedDeliveryDate)}</div>` : ''}
              <span class="status-badge" style="${getStatusColor(order.status)}">${order.status}</span>
              ${barcodeDataUrl ? `
                <div class="barcode-container">
                  <img src="${barcodeDataUrl}" alt="Order Barcode" />
                </div>
              ` : ''}
            </div>
          </div>

          ${statusTrackerHtml}

          ${shippingInfoHtml}

          <div class="addresses">
            <div class="address-block">
              <div class="address-label">Bill To</div>
              <div class="address-name">${order.account?.name || 'N/A'}</div>
              <div class="address-details">
                ${order.billingStreet ? `${order.billingStreet}<br>` : ''}
                ${order.billingCity ? `${order.billingCity}, ` : ''}${order.billingState || ''} ${order.billingPostalCode || ''}
                ${order.billingCountry ? `<br>${order.billingCountry}` : ''}
              </div>
            </div>
            <div class="address-block">
              <div class="address-label">Ship To</div>
              <div class="address-name">${order.account?.name || 'N/A'}</div>
              <div class="address-details">
                ${order.shippingStreet ? `${order.shippingStreet}<br>` : ''}
                ${order.shippingCity ? `${order.shippingCity}, ` : ''}${order.shippingState || ''} ${order.shippingPostalCode || ''}
                ${order.shippingCountry ? `<br>${order.shippingCountry}` : ''}
              </div>
            </div>
            <div class="address-block">
              <div class="address-label">Order Details</div>
              <div class="address-details">
                <strong>Order Name:</strong> ${order.name || 'N/A'}<br>
                ${order.paymentTerms ? `<strong>Payment Terms:</strong> ${order.paymentTerms}<br>` : ''}
                ${order.shippingMethod ? `<strong>Shipping Method:</strong> ${order.shippingMethod}<br>` : ''}
              </div>
            </div>
          </div>

          <table class="line-items-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th>Product / Service</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 120px; text-align: right;">Unit Price</th>
                <th style="width: 80px; text-align: right;">Discount</th>
                <th style="width: 120px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsRows || '<tr><td colspan="6" style="padding: 24px; text-align: center; color: #888;">No line items</td></tr>'}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-table">
              <div class="totals-row">
                <span>Subtotal</span>
                <span>${formatCurrency(order.subtotal)}</span>
              </div>
              ${order.discount ? `
                <div class="totals-row">
                  <span>Discount</span>
                  <span>-${formatCurrency(order.discount)}</span>
                </div>
              ` : ''}
              ${order.tax ? `
                <div class="totals-row">
                  <span>Tax</span>
                  <span>${formatCurrency(order.tax)}</span>
                </div>
              ` : ''}
              ${order.shippingCost ? `
                <div class="totals-row">
                  <span>Shipping</span>
                  <span>${formatCurrency(order.shippingCost)}</span>
                </div>
              ` : ''}
              <div class="totals-row total">
                <span>Grand Total</span>
                <span class="amount">${formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          ${order.paymentStatus ? `
            <div class="payment-info">
              <div class="payment-title">Payment Information</div>
              <div class="payment-content">
                <strong>Status:</strong> ${order.paymentStatus}<br>
                ${order.paymentMethod ? `<strong>Method:</strong> ${order.paymentMethod}<br>` : ''}
                ${order.paidAmount ? `<strong>Amount Paid:</strong> ${formatCurrency(order.paidAmount)}` : ''}
              </div>
            </div>
          ` : ''}

          ${order.notes ? `
            <div class="payment-info">
              <div class="payment-title">Notes</div>
              <div class="payment-content">${order.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            Generated on ${new Date().toLocaleString()} | Order ${order.orderNumber}
          </div>
        </body>
      </html>
    `;
  }
}
