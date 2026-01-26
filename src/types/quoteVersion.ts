// Quote Version Types for SalesOS CRM
// Version history, snapshots, and comparison

import type { Quote, QuoteLineItem } from './quote';

export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED';

export interface QuoteVersionSnapshot {
  // Core quote fields
  name: string;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  currency: string;
  expirationDate?: string;
  terms?: string;
  notes?: string;
  // Line items at time of snapshot
  lineItems: QuoteLineItemSnapshot[];
  // Address snapshots
  billingAddress?: AddressSnapshot;
  shippingAddress?: AddressSnapshot;
  // Related entity IDs
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  priceBookId?: string;
}

export interface QuoteLineItemSnapshot {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  description?: string;
}

export interface AddressSnapshot {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface FieldChange {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  changeType: ChangeType;
}

export interface LineItemChange {
  lineItemId: string;
  productName: string;
  changeType: ChangeType;
  fieldChanges?: FieldChange[];
}

export interface QuoteVersionChanges {
  summary: string;
  fieldChanges: FieldChange[];
  lineItemChanges: LineItemChange[];
  totalChange?: number;
  percentChange?: number;
}

export interface QuoteVersion {
  id: string;
  quoteId: string;
  versionNumber: number;
  snapshot: QuoteVersionSnapshot;
  changes?: QuoteVersionChanges;
  createdById: string;
  createdByName: string;
  reason?: string;
  createdAt: string;
}

export interface QuoteVersionComparison {
  versionA: QuoteVersion;
  versionB: QuoteVersion;
  differences: QuoteVersionChanges;
}

// DTOs
export interface CreateQuoteVersionDto {
  reason?: string;
}

export interface RestoreVersionDto {
  versionId: string;
  reason?: string;
}

export interface CompareVersionsDto {
  versionAId: string;
  versionBId: string;
}

// Stats
export interface QuoteVersionStats {
  totalVersions: number;
  avgVersionsPerQuote: number;
  mostRevisedQuotes: {
    quoteId: string;
    quoteName: string;
    versionCount: number;
  }[];
}

// Helper function types
export type VersionDiffField = {
  path: string;
  label: string;
  oldValue: any;
  newValue: any;
};

// Version labels for display
export const VERSION_CHANGE_LABELS: Record<ChangeType, { label: string; color: string }> = {
  ADDED: { label: 'Added', color: 'text-green-600' },
  REMOVED: { label: 'Removed', color: 'text-red-600' },
  MODIFIED: { label: 'Modified', color: 'text-blue-600' },
};

// Fields to track for version changes
export const TRACKED_QUOTE_FIELDS = [
  { field: 'name', label: 'Quote Name' },
  { field: 'status', label: 'Status' },
  { field: 'total', label: 'Total Amount' },
  { field: 'subtotal', label: 'Subtotal' },
  { field: 'discount', label: 'Discount' },
  { field: 'tax', label: 'Tax' },
  { field: 'currency', label: 'Currency' },
  { field: 'expirationDate', label: 'Expiration Date' },
  { field: 'terms', label: 'Terms & Conditions' },
  { field: 'notes', label: 'Notes' },
  { field: 'contactId', label: 'Contact' },
  { field: 'accountId', label: 'Account' },
  { field: 'priceBookId', label: 'Price Book' },
] as const;

export const TRACKED_LINE_ITEM_FIELDS = [
  { field: 'quantity', label: 'Quantity' },
  { field: 'unitPrice', label: 'Unit Price' },
  { field: 'discount', label: 'Discount' },
  { field: 'total', label: 'Line Total' },
  { field: 'description', label: 'Description' },
] as const;
