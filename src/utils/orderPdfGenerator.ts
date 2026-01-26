import type { Order } from '../types/order';

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

export function generateOrderPrintHtml(order: Order): string {
  const lineItemsRows = (order.lineItems || [])
    .map(
      (item, index) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${index + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 500;">${item.productName || 'Unnamed Product'}</div>
          ${item.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${item.description}</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.discount ? `${item.discount}%` : '-'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">${formatCurrency(item.total)}</td>
      </tr>
    `
    )
    .join('');

  const getStatusColor = (status: string) => {
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
          <div class="order-info">
            <div class="order-number">${order.orderNumber}</div>
            <div class="order-date">Order Date: ${formatDate(order.orderDate)}</div>
            ${order.expectedDeliveryDate ? `<div class="order-date">Expected Delivery: ${formatDate(order.expectedDeliveryDate)}</div>` : ''}
            <span class="status-badge" style="${getStatusColor(order.status)}">${order.status}</span>
          </div>
        </div>

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
              <strong>Order Name:</strong> ${order.name}<br>
              ${order.paymentTerms ? `<strong>Payment Terms:</strong> ${order.paymentTerms}<br>` : ''}
              ${order.shippingMethod ? `<strong>Shipping Method:</strong> ${order.shippingMethod}<br>` : ''}
              ${order.trackingNumber ? `<strong>Tracking #:</strong> ${order.trackingNumber}` : ''}
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

        <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
      </body>
    </html>
  `;
}

export function printOrder(order: Order): void {
  const html = generateOrderPrintHtml(order);
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
