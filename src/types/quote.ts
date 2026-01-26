// Quote/Proposal Types for SalesOS CRM
// Quote generation linked to opportunities with line items

export type QuoteStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  productId?: string;
  productName?: string;
  productCode?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  listPrice?: number;
  discount?: number;
  discountPercent?: number;
  tax?: number;
  taxPercent?: number;
  totalPrice: number; // Backend field: (quantity * unitPrice) - discount
  total?: number; // Alias for backwards compatibility
  sortOrder: number;
  product?: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface Quote {
  id: string;
  quoteNumber: string;
  opportunityId: string;
  accountId: string;
  contactId?: string;
  priceBookId?: string;
  name: string;
  status: QuoteStatus;
  expirationDate?: string;
  validUntil?: string; // Backend field name
  subtotal: number;
  discount?: number;
  discountPercent?: number;
  tax?: number;
  taxPercent?: number;
  shippingCost?: number;
  shippingHandling?: number; // Backend field name
  total?: number; // Alias for backwards compatibility
  totalPrice?: number; // Backend field name
  currency: string;
  terms?: string;
  paymentTerms?: string; // Backend field name
  notes?: string;
  description?: string; // Backend field name
  billingAddress?: Address;
  shippingAddress?: Address;
  isSynced?: boolean;
  sentAt?: string;
  sentDate?: string; // Backend field name
  viewedAt?: string;
  acceptedAt?: string;
  acceptedDate?: string; // Backend field name
  rejectedAt?: string;
  rejectedDate?: string; // Backend field name
  rejectionReason?: string;
  rejectedReason?: string; // Backend field name
  lineItems: QuoteLineItem[];
  opportunity?: {
    id: string;
    name: string;
    stage?: string;
  };
  account?: {
    id: string;
    name: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  owner?: {
    id: string;
    name: string | null;
    email: string;
  };
  createdBy?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteDto {
  opportunityId: string;
  accountId: string;
  contactId?: string;
  priceBookId?: string;
  name: string;
  expirationDate?: string;
  discount?: number;
  discountPercent?: number;
  taxPercent?: number;
  shippingCost?: number;
  terms?: string;
  notes?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  lineItems?: CreateQuoteLineItemDto[];
}

export interface UpdateQuoteDto {
  name?: string;
  contactId?: string;
  priceBookId?: string;
  expirationDate?: string;
  discount?: number;
  discountPercent?: number;
  taxPercent?: number;
  shippingCost?: number;
  terms?: string;
  notes?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
}

export interface CreateQuoteLineItemDto {
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountPercent?: number;
  taxPercent?: number;
}

export interface UpdateQuoteLineItemDto {
  productName?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  listPrice?: number;
  discount?: number;
  discountPercent?: number;
  taxPercent?: number;
  sortOrder?: number;
}

export interface SendQuoteDto {
  recipientEmail: string;
  ccEmails?: string[];
  subject?: string;
  message?: string;
  templateId?: string;
  attachPdf?: boolean;
}

export interface ApproveQuoteDto {
  comments?: string;
}

export interface RejectQuoteDto {
  reason: string;
  comments?: string;
}

export interface QuoteStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  totalValue: number;
  acceptedValue: number;
  averageValue: number;
  conversionRate: number;
}

export interface QuotePdfOptions {
  includeTerms?: boolean;
  includeNotes?: boolean;
  template?: 'standard' | 'professional' | 'minimal';
  logoUrl?: string;
}

// Status color mapping for UI
export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'yellow',
  APPROVED: 'blue',
  SENT: 'blue',
  VIEWED: 'purple',
  ACCEPTED: 'green',
  REJECTED: 'red',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};
