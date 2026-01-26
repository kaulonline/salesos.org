// Price Book Types for SalesOS CRM
// Multiple pricing tiers with currency support

export type PriceBookStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface PriceBook {
  id: string;
  name: string;
  description?: string;
  isStandard: boolean;
  isActive: boolean;
  currency: string;
  validFrom?: string;
  validTo?: string;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceBookEntry {
  id: string;
  priceBookId: string;
  productId: string;
  unitPrice: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  discountPercent?: number;
  isActive: boolean;
  product?: {
    id: string;
    name: string;
    code?: string;
    category?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceBookDto {
  name: string;
  description?: string;
  isStandard?: boolean;
  currency?: string;
  validFrom?: string;
  validTo?: string;
}

export interface UpdatePriceBookDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  currency?: string;
  validFrom?: string;
  validTo?: string;
}

export interface CreatePriceBookEntryDto {
  productId: string;
  unitPrice: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  discountPercent?: number;
}

export interface UpdatePriceBookEntryDto {
  unitPrice?: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  discountPercent?: number;
  isActive?: boolean;
}

export interface BulkCreatePriceBookEntriesDto {
  entries: CreatePriceBookEntryDto[];
}

export interface PriceBookStats {
  total: number;
  active: number;
  standard: number;
  totalEntries: number;
  byCurrency: Record<string, number>;
}

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];
