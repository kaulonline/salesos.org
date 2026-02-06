import type { Quote } from '../types';
import { escapeHtml } from '../lib/security';

// Helper to safely escape HTML and handle null/undefined values
const safeEscape = (value: string | undefined | null, fallback = ''): string => {
  if (value === null || value === undefined) return fallback;
  return escapeHtml(String(value));
};

const formatCurrency = (amount?: number, currency: string = 'USD') => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export function generateQuotePrintHtml(quote: Quote): string {
  const lineItemsRows = (quote.lineItems || [])
    .map(
      (item, index) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${index + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 500;">${safeEscape(item.productName, 'Unnamed Product')}</div>
          ${item.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${safeEscape(item.description)}</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice, quote.currency)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.discount ? `${item.discount}%` : '-'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">${formatCurrency(item.total, quote.currency)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Quote ${quote.quoteNumber}</title>
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
          @media print {
            body { padding: 20px; }
            .no-print { display: none !important; }
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 24px;
            border-bottom: 2px solid #EAD07D;
          }
          .logo {
            font-size: 28px;
            font-weight: 700;
            color: #1A1A1A;
          }
          .logo span {
            color: #EAD07D;
          }
          .quote-info {
            text-align: right;
          }
          .quote-number {
            font-size: 24px;
            font-weight: 600;
            color: #1A1A1A;
            margin-bottom: 4px;
          }
          .quote-date {
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
          .status-draft { background: #F2F1EA; color: #666; }
          .status-sent { background: #DBEAFE; color: #1D4ED8; }
          .status-accepted { background: #D1FAE5; color: #059669; }
          .status-rejected { background: #FEE2E2; color: #DC2626; }
          .addresses {
            display: flex;
            gap: 40px;
            margin-bottom: 40px;
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
            color: #EAD07D;
          }
          .terms {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #eee;
          }
          .terms-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .terms-content {
            font-size: 13px;
            color: #666;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 60px;
            padding-top: 24px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 12px;
            color: #888;
          }
          .print-button {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1A1A1A;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }
          .print-button:hover {
            background: #333;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Sales<span>OS</span></div>
          <div class="quote-info">
            <div class="quote-number">${safeEscape(quote.quoteNumber)}</div>
            <div class="quote-date">Created: ${formatDate(quote.createdAt)}</div>
            ${quote.expirationDate ? `<div class="quote-date">Valid Until: ${formatDate(quote.expirationDate)}</div>` : ''}
            <span class="status-badge status-${safeEscape(quote.status?.toLowerCase())}">${safeEscape(quote.status)}</span>
          </div>
        </div>

        <div class="addresses">
          <div class="address-block">
            <div class="address-label">Bill To</div>
            <div class="address-name">${safeEscape(quote.account?.name, 'N/A')}</div>
            <div class="address-details">
              ${quote.billingStreet ? `${safeEscape(quote.billingStreet)}<br>` : ''}
              ${quote.billingCity ? `${safeEscape(quote.billingCity)}, ` : ''}${safeEscape(quote.billingState)} ${safeEscape(quote.billingPostalCode)}
              ${quote.billingCountry ? `<br>${safeEscape(quote.billingCountry)}` : ''}
            </div>
          </div>
          <div class="address-block">
            <div class="address-label">Ship To</div>
            <div class="address-name">${safeEscape(quote.account?.name, 'N/A')}</div>
            <div class="address-details">
              ${quote.shippingStreet ? `${safeEscape(quote.shippingStreet)}<br>` : ''}
              ${quote.shippingCity ? `${safeEscape(quote.shippingCity)}, ` : ''}${safeEscape(quote.shippingState)} ${safeEscape(quote.shippingPostalCode)}
              ${quote.shippingCountry ? `<br>${safeEscape(quote.shippingCountry)}` : ''}
            </div>
          </div>
          <div class="address-block">
            <div class="address-label">Quote Details</div>
            <div class="address-details">
              <strong>Quote Name:</strong> ${safeEscape(quote.name)}<br>
              ${quote.opportunity ? `<strong>Opportunity:</strong> ${safeEscape(quote.opportunity.name)}<br>` : ''}
              ${quote.owner ? `<strong>Sales Rep:</strong> ${safeEscape(quote.owner.name)}<br>` : ''}
              ${quote.paymentTerms ? `<strong>Payment Terms:</strong> ${safeEscape(quote.paymentTerms)}` : ''}
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
              <span>${formatCurrency(quote.subtotal, quote.currency)}</span>
            </div>
            ${quote.discount ? `
              <div class="totals-row">
                <span>Discount</span>
                <span>-${formatCurrency(quote.discount, quote.currency)}</span>
              </div>
            ` : ''}
            ${quote.tax ? `
              <div class="totals-row">
                <span>Tax</span>
                <span>${formatCurrency(quote.tax, quote.currency)}</span>
              </div>
            ` : ''}
            ${quote.shippingHandling ? `
              <div class="totals-row">
                <span>Shipping & Handling</span>
                <span>${formatCurrency(quote.shippingHandling, quote.currency)}</span>
              </div>
            ` : ''}
            <div class="totals-row total">
              <span>Grand Total</span>
              <span class="amount">${formatCurrency(quote.total, quote.currency)}</span>
            </div>
          </div>
        </div>

        ${quote.terms ? `
          <div class="terms">
            <div class="terms-title">Terms & Conditions</div>
            <div class="terms-content">${safeEscape(quote.terms)}</div>
          </div>
        ` : ''}

        ${quote.notes ? `
          <div class="terms">
            <div class="terms-title">Notes</div>
            <div class="terms-content">${safeEscape(quote.notes)}</div>
          </div>
        ` : ''}

        <div class="footer">
          Generated on ${new Date().toLocaleString()} | Quote ${safeEscape(quote.quoteNumber)}
        </div>

        <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
      </body>
    </html>
  `;
}

export function printQuote(quote: Quote): void {
  const html = generateQuotePrintHtml(quote);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Auto-trigger print after a short delay to ensure content is loaded
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
}
