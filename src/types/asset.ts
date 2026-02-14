// Asset/Installed Base Types for SalesOS CRM
// Track customer-owned products for upsell/renewal opportunities

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'PENDING' | 'RETURNED' | 'UNDER_REPAIR';
export type SupportContractType = 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' | 'CUSTOM';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING_RENEWAL';

export interface Asset {
  id: string;
  accountId: string;
  organizationId?: string;
  productId?: string;
  name: string;
  serialNumber?: string;
  status: AssetStatus;
  quantity: number;
  purchaseDate?: string;
  installDate?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  renewalDate?: string;
  renewalValue?: number;
  licenseKey?: string;
  seatCount?: number;
  seatsUsed?: number;
  version?: string;
  configuration?: Record<string, any>;
  supportContractId?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
    ownerId?: string;
  };
  product?: {
    id: string;
    name: string;
    sku: string;
    description?: string;
  };
  supportContract?: SupportContract;
}

export interface SupportContract {
  id: string;
  accountId: string;
  organizationId?: string;
  contractNumber: string;
  name: string;
  type: SupportContractType;
  startDate: string;
  endDate: string;
  contractValue: number;
  annualValue?: number;
  slaLevel?: string;
  responseTime?: number;
  autoRenew: boolean;
  renewalNotice?: number;
  status: ContractStatus;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
  };
  coveredAssets?: Asset[];
}

export interface CreateAssetDto {
  accountId: string;
  productId?: string;
  name: string;
  serialNumber?: string;
  status?: AssetStatus;
  quantity?: number;
  purchaseDate?: string;
  installDate?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  renewalDate?: string;
  renewalValue?: number;
  licenseKey?: string;
  seatCount?: number;
  seatsUsed?: number;
  version?: string;
  configuration?: Record<string, any>;
  supportContractId?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAssetDto extends Partial<CreateAssetDto> {}

export interface CreateSupportContractDto {
  accountId: string;
  contractNumber?: string;
  name: string;
  type?: SupportContractType;
  startDate: string;
  endDate: string;
  contractValue: number;
  annualValue?: number;
  slaLevel?: string;
  responseTime?: number;
  autoRenew?: boolean;
  renewalNotice?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateSupportContractDto extends Partial<CreateSupportContractDto> {
  status?: ContractStatus;
}

export interface AssetStats {
  total: number;
  active?: number;
  byStatus: { status: AssetStatus; count: number }[];
  totalRenewalValue: number;
  expiringIn30Days?: number;
  expiringIn90Days: number;
}

export interface ContractStats {
  total: number;
  byStatus: { status: ContractStatus; count: number }[];
  byType: { type: SupportContractType; count: number; value: number }[];
  totalContractValue: number;
  totalAnnualValue: number;
  expiringIn30Days: number;
  expiringIn90Days: number;
}

export interface AccountAssetSummary {
  totalAssets: number;
  activeAssets: number;
  totalRenewalValue: number;
  renewalsNext30Days: { count: number; value: number };
  renewalsNext90Days: { count: number; value: number };
  expiredWarranties: number;
  seatUtilization: { total: number; used: number; percentage: number };
  supportContracts: { active: number; totalValue: number };
}

export interface ExpiringAssetsResponse {
  urgent: { assets: Asset[]; totalValue: number };
  upcoming: { assets: Asset[]; totalValue: number };
  later: { assets: Asset[]; totalValue: number };
  totalAssets: number;
  totalValue: number;
  assets?: Asset[];
  summary?: {
    critical?: number;
    criticalValue?: number;
    warning?: number;
    warningValue?: number;
    upcoming?: number;
    upcomingValue?: number;
    expiring0to30?: number;
    value0to30?: number;
    expiring31to60?: number;
    value31to60?: number;
    expiring61to90?: number;
    value61to90?: number;
  };
}

export interface RenewalPipelineResponse {
  period: string;
  startDate: string;
  endDate: string;
  totalAssets: number;
  totalValue: number;
  byMonth: {
    month: string;
    assetCount: number;
    count?: number;
    value: number;
    assets: Asset[];
  }[];
}

// UI helper constants
export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  EXPIRED: 'Expired',
  PENDING: 'Pending',
  RETURNED: 'Returned',
  UNDER_REPAIR: 'Under Repair',
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  ACTIVE: 'bg-[#93C01F]/20 text-[#93C01F]',
  INACTIVE: 'bg-[#F8F8F6] text-[#666]',
  EXPIRED: 'bg-red-100 text-red-700',
  PENDING: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  RETURNED: 'bg-purple-100 text-purple-700',
  UNDER_REPAIR: 'bg-orange-100 text-orange-700',
};

export const CONTRACT_TYPE_LABELS: Record<SupportContractType, string> = {
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  ENTERPRISE: 'Enterprise',
  CUSTOM: 'Custom',
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  DRAFT: 'bg-[#F8F8F6] text-[#666]',
  ACTIVE: 'bg-[#93C01F]/20 text-[#93C01F]',
  EXPIRED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-[#F8F8F6] text-[#666]',
  PENDING_RENEWAL: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
};

// Aliases for shorter import names
export const STATUS_LABELS = ASSET_STATUS_LABELS;
export const STATUS_COLORS = ASSET_STATUS_COLORS;
