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
  module: PermissionModule;
  actions: PermissionAction[];
  dataAccess: DataAccessLevel;
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
  systemProfiles: number;
  customProfiles: number;
  usersWithProfiles: number;
}

// Permission module definitions for UI
export interface PermissionModuleDefinition {
  module: PermissionModule;
  label: string;
  description: string;
  availableActions: PermissionAction[];
  supportsDataAccess: boolean;
}

// Default permission module definitions
export const PERMISSION_MODULES: PermissionModuleDefinition[] = [
  {
    module: 'LEADS',
    label: 'Leads',
    description: 'Manage lead records',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'TRANSFER', 'BULK_UPDATE', 'BULK_DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'CONTACTS',
    label: 'Contacts',
    description: 'Manage contact records',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'TRANSFER', 'BULK_UPDATE', 'BULK_DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'ACCOUNTS',
    label: 'Accounts',
    description: 'Manage account/company records',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'TRANSFER', 'BULK_UPDATE', 'BULK_DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'OPPORTUNITIES',
    label: 'Opportunities',
    description: 'Manage deals and pipeline',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'TRANSFER', 'BULK_UPDATE', 'BULK_DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'PRODUCTS',
    label: 'Products',
    description: 'Manage product catalog',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT'],
    supportsDataAccess: false,
  },
  {
    module: 'QUOTES',
    label: 'Quotes',
    description: 'Create and manage quotes',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    supportsDataAccess: true,
  },
  {
    module: 'CAMPAIGNS',
    label: 'Campaigns',
    description: 'Manage marketing campaigns',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    supportsDataAccess: true,
  },
  {
    module: 'TASKS',
    label: 'Tasks',
    description: 'Manage tasks and activities',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'MEETINGS',
    label: 'Meetings',
    description: 'Manage calendar and meetings',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: true,
  },
  {
    module: 'REPORTS',
    label: 'Reports',
    description: 'View and create reports',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    supportsDataAccess: false,
  },
  {
    module: 'WORKFLOWS',
    label: 'Workflows',
    description: 'Manage automation workflows',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'EMAIL_TEMPLATES',
    label: 'Email Templates',
    description: 'Manage email templates',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'WEB_FORMS',
    label: 'Web Forms',
    description: 'Manage lead capture forms',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'CUSTOM_FIELDS',
    label: 'Custom Fields',
    description: 'Manage custom field definitions',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'ASSIGNMENT_RULES',
    label: 'Assignment Rules',
    description: 'Manage lead/deal assignment rules',
    availableActions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'API_KEYS',
    label: 'API Keys',
    description: 'Manage API access keys',
    availableActions: ['VIEW', 'CREATE', 'DELETE'],
    supportsDataAccess: false,
  },
  {
    module: 'ADMIN',
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
