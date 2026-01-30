// Territory Management Types

export type TerritoryType = 'GEOGRAPHIC' | 'NAMED_ACCOUNTS' | 'INDUSTRY' | 'ACCOUNT_SIZE' | 'CUSTOM';

export interface Territory {
  id: string;
  name: string;
  description?: string | null;
  type: TerritoryType;
  criteria?: Record<string, any> | null;
  ownerId?: string | null;
  owner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  color?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  accountCount: number;
  performanceStats?: TerritoryPerformance | null;
}

export interface TerritoryPerformance {
  id: string;
  territoryId: string;
  accountCount: number;
  pipelineValue: number;
  closedWonValue: number;
  closedLostValue: number;
  winRate: number;
  avgDealSize: number;
  updatedAt: string;
}

export interface TerritoryAccount {
  id: string;
  name: string;
  industry?: string | null;
  billingState?: string | null;
  billingCountry?: string | null;
  type?: string | null;
  numberOfEmployees?: number | null;
  annualRevenue?: number | null;
  openPipeline: number;
  contacts: number;
  deals: number;
  assignedAt: string;
}

export interface CreateTerritoryDto {
  name: string;
  description?: string;
  type: TerritoryType;
  criteria?: Record<string, any>;
  ownerId?: string;
  color?: string;
}

export interface UpdateTerritoryDto {
  name?: string;
  description?: string;
  type?: TerritoryType;
  criteria?: Record<string, any>;
  ownerId?: string;
  color?: string;
  isActive?: boolean;
}

export interface AssignAccountsDto {
  accountIds: string[];
}

export interface TerritoryStats {
  totalTerritories: number;
  activeTerritories: number;
  totalAccounts: number;
  byType: Array<{ type: TerritoryType; count: number }>;
}
