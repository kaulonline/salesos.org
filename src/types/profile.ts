// Profile & Permission Types for SalesOS CRM
// Granular role-based access control

export type PermissionAction =
  | 'VIEW'
  | 'CREATE'
  | 'EDIT'
  | 'DELETE'
  | 'EXPORT'
  | 'IMPORT'
  | 'ASSIGN'
  | 'TRANSFER'
  | 'BULK_UPDATE'
  | 'BULK_DELETE';

export type PermissionModule =
  | 'LEADS'
  | 'CONTACTS'
  | 'ACCOUNTS'
  | 'OPPORTUNITIES'
  | 'PRODUCTS'
  | 'QUOTES'
  | 'CAMPAIGNS'
  | 'TASKS'
  | 'MEETINGS'
  | 'REPORTS'
  | 'WORKFLOWS'
  | 'EMAIL_TEMPLATES'
  | 'WEB_FORMS'
  | 'CUSTOM_FIELDS'
  | 'ASSIGNMENT_RULES'
  | 'API_KEYS'
  | 'ADMIN';

export type DataAccessLevel =
  | 'NONE'
  | 'OWN'
  | 'TEAM'
  | 'ALL';

export interface Permission {
  module: PermissionModule | string;
  actions?: PermissionAction[];
  dataAccess: DataAccessLevel;
  // Alternate flat permission fields (used by some UI components)
  read?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  [key: string]: any;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isDefault: boolean;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileDto {
  name: string;
  description?: string;
  permissions: Permission[];
  copyFromProfileId?: string;
}

export interface UpdateProfileDto {
  name?: string;
  description?: string;
  permissions?: Permission[];
  isDefault?: boolean;
}

export interface ProfileUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  profileId: string;
}

export interface AssignUsersToProfileDto {
  userIds: string[];
}

export interface ProfileStats {
  total: number;
  system?: number;
  custom?: number;
  totalUsers?: number;
  systemProfiles: number;
  customProfiles: number;
  usersWithProfiles: number;
}

// Permission module definitions for UI
export interface PermissionModuleDefinition {
  module: PermissionModule;
  key: string;
  label: string;
  description: string;
  availableActions: PermissionAction[];
  supportsDataAccess: boolean;
}

// Default permission module definitions
export const PERMISSION_MODULES: PermissionModuleDefinition[] = [
  {
    module: 'LEADS',
    key: 'LEADS',
    label: 'Leads',
    description: 'Manage lead records',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'TRANSFER', 'BULK_UPDATE', 'BULK_DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'CONTACTS',
    key: 'CONTACTS',
    label: 'Contacts',
    description: 'Manage contact records',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'TRANSFER', 'BULK_UPDATE', 'BULK_DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'ACCOUNTS',
    key: 'ACCOUNTS',
    label: 'Accounts',
    description: 'Manage account/company records',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'TRANSFER', 'BULK_UPDATE', 'BULK_DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'OPPORTUNITIES',
    key: 'OPPORTUNITIES',
    label: 'Opportunities',
    description: 'Manage deals and pipeline',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'TRANSFER', 'BULK_UPDATE', 'BULK_DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'PRODUCTS',
    key: 'PRODUCTS',
    label: 'Products',
    description: 'Manage product catalog',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT'],
    supportsDataAccess: false,
  },
  {
    module: 'QUOTES',
    key: 'QUOTES',
    label: 'Quotes',
    description: 'Create and manage quotes',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    supportsDataAccess: true,
  },
  {
    module: 'CAMPAIGNS',
    key: 'CAMPAIGNS',
    label: 'Campaigns',
    description: 'Manage marketing campaigns',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    supportsDataAccess: true,
  },
  {
    module: 'TASKS',
    key: 'TASKS',
    label: 'Tasks',
    description: 'Manage tasks and activities',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'MEETINGS',
    key: 'MEETINGS',
    label: 'Meetings',
    description: 'Manage calendar and meetings',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'REPORTS',
    key: 'REPORTS',
    label: 'Reports',
    description: 'View and create reports',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    supportsDataAccess: false,
  },
  {
    module: 'WORKFLOWS',
    key: 'WORKFLOWS',
    label: 'Workflows',
    description: 'Manage automation workflows',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'EMAIL_TEMPLATES',
    key: 'EMAIL_TEMPLATES',
    label: 'Email Templates',
    description: 'Manage email templates',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'WEB_FORMS',
    key: 'WEB_FORMS',
    label: 'Web Forms',
    description: 'Manage lead capture forms',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'CUSTOM_FIELDS',
    key: 'CUSTOM_FIELDS',
    label: 'Custom Fields',
    description: 'Manage custom field definitions',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'ASSIGNMENT_RULES',
    key: 'ASSIGNMENT_RULES',
    label: 'Assignment Rules',
    description: 'Manage lead/deal assignment rules',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'API_KEYS',
    key: 'API_KEYS',
    label: 'API Keys',
    description: 'Manage API access keys',
    availableActions: ['VIEW', 'CREATE', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'ADMIN',
    key: 'ADMIN',
    label: 'Administration',
    description: 'System administration',
    availableActions: ['VIEW', 'EDIT'],
    supportsDataAccess: false,
  },
];

// Default system profiles
export const SYSTEM_PROFILES = {
  ADMIN: 'system-admin',
  MANAGER: 'system-manager',
  SALES_REP: 'system-sales-rep',
  VIEWER: 'system-viewer',
} as const;
