// Tax Rate Types for SalesOS CRM
// Region-based tax calculation with multiple tax types

export type TaxType = 'SALES' | 'VAT' | 'GST' | 'HST' | 'PST' | 'CUSTOM';

export interface TaxRate {
  id: string;
  name: string;
  description?: string;
  taxType: TaxType;
  rate: number; // Percentage (e.g., 8.25 for 8.25%)
  country: string;
  region?: string; // State/Province
  city?: string;
  postalCode?: string;
  isDefault: boolean;
  isCompound: boolean; // Applied on top of other taxes
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRateDto {
  name: string;
  description?: string;
  taxType: TaxType;
  rate: number;
  country: string;
  region?: string;
  city?: string;
  postalCode?: string;
  isDefault?: boolean;
  isCompound?: boolean;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateTaxRateDto {
  name?: string;
  description?: string;
  taxType?: TaxType;
  rate?: number;
  country?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  isDefault?: boolean;
  isCompound?: boolean;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface TaxCalculationRequest {
  country: string;
  region?: string;
  city?: string;
  postalCode?: string;
  subtotal: number;
}

export interface TaxCalculationResult {
  rates: {
    taxRate: TaxRate;
    amount: number;
  }[];
  totalTax: number;
  effectiveRate: number;
}

export interface TaxRateStats {
  total: number;
  active: number;
  byCountry: {
    country: string;
    count: number;
    avgRate: number;
  }[];
  byType: {
    type: TaxType;
    count: number;
  }[];
}

// Helper constants
export const TAX_TYPES: { value: TaxType; label: string; description: string }[] = [
  { value: 'SALES', label: 'Sales Tax', description: 'US state/local sales tax' },
  { value: 'VAT', label: 'VAT', description: 'Value Added Tax (EU, UK)' },
  { value: 'GST', label: 'GST', description: 'Goods and Services Tax (AU, NZ, CA)' },
  { value: 'HST', label: 'HST', description: 'Harmonized Sales Tax (Canada)' },
  { value: 'PST', label: 'PST', description: 'Provincial Sales Tax (Canada)' },
  { value: 'CUSTOM', label: 'Custom', description: 'Custom tax type' },
];

// Common countries for tax purposes
export const TAX_COUNTRIES = [
  { code: 'US', name: 'United States', hasRegions: true },
  { code: 'CA', name: 'Canada', hasRegions: true },
  { code: 'GB', name: 'United Kingdom', hasRegions: false },
  { code: 'DE', name: 'Germany', hasRegions: false },
  { code: 'FR', name: 'France', hasRegions: false },
  { code: 'AU', name: 'Australia', hasRegions: true },
  { code: 'JP', name: 'Japan', hasRegions: false },
  { code: 'SG', name: 'Singapore', hasRegions: false },
  { code: 'IN', name: 'India', hasRegions: true },
  { code: 'MX', name: 'Mexico', hasRegions: true },
] as const;

// US States for tax calculation
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
] as const;

// Canadian Provinces
export const CA_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
] as const;
