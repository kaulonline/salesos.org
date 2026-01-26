/**
 * Profile Preview
 * Visual preview of AI-generated permission profile configuration
 */

import React from 'react';
import { ProfileConfig } from '../../../types/aiBuilder';
import { cn } from '../../../lib/utils';
import {
  Shield,
  Eye,
  Plus,
  Edit3,
  Trash2,
  Download,
  Upload,
  Users,
  Check,
  X
} from 'lucide-react';

interface ProfilePreviewProps {
  config: ProfileConfig;
  className?: string;
}

const moduleLabels: Record<string, string> = {
  LEADS: 'Leads',
  CONTACTS: 'Contacts',
  ACCOUNTS: 'Accounts',
  OPPORTUNITIES: 'Opportunities',
  PRODUCTS: 'Products',
  QUOTES: 'Quotes',
  CAMPAIGNS: 'Campaigns',
  TASKS: 'Tasks',
  MEETINGS: 'Meetings',
  REPORTS: 'Reports',
  WORKFLOWS: 'Workflows',
  EMAIL_TEMPLATES: 'Email Templates',
  WEB_FORMS: 'Web Forms',
  CUSTOM_FIELDS: 'Custom Fields',
  ASSIGNMENT_RULES: 'Assignment Rules',
  API_KEYS: 'API Keys',
  ADMIN: 'Administration',
};

const actionIcons: Record<string, React.ReactNode> = {
  VIEW: <Eye className="w-3 h-3" />,
  CREATE: <Plus className="w-3 h-3" />,
  EDIT: <Edit3 className="w-3 h-3" />,
  DELETE: <Trash2 className="w-3 h-3" />,
  EXPORT: <Download className="w-3 h-3" />,
  IMPORT: <Upload className="w-3 h-3" />,
  ASSIGN: <Users className="w-3 h-3" />,
};

const dataAccessColors: Record<string, { bg: string; text: string }> = {
  NONE: { bg: 'bg-gray-100', text: 'text-gray-500' },
  OWN: { bg: 'bg-blue-100', text: 'text-blue-700' },
  TEAM: { bg: 'bg-purple-100', text: 'text-purple-700' },
  ALL: { bg: 'bg-green-100', text: 'text-green-700' },
};

export function ProfilePreview({ config, className }: ProfilePreviewProps) {
  const { name, description, permissions } = config;

  // Get all unique actions across all permissions
  const allActions = Array.from(
    new Set(permissions.flatMap(p => p.actions))
  ).sort((a, b) => {
    const order = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'TRANSFER', 'BULK_UPDATE', 'BULK_DELETE'];
    return order.indexOf(a) - order.indexOf(b);
  }).slice(0, 7); // Show max 7 columns

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#EAD07D]/20 rounded-xl">
            <Shield className="w-5 h-5 text-[#EAD07D]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1A1A1A]">{name}</h3>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 font-medium text-gray-700 border-b border-gray-200">
                  Module
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-700 border-b border-gray-200">
                  Access
                </th>
                {allActions.map(action => (
                  <th
                    key={action}
                    className="px-2 py-2 text-center font-medium text-gray-700 border-b border-gray-200"
                    title={action}
                  >
                    <div className="flex items-center justify-center">
                      {actionIcons[action] || <span className="text-xs">{action.slice(0, 3)}</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permissions.map((permission, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-[#1A1A1A]">
                    {moduleLabels[permission.module] || permission.module}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      dataAccessColors[permission.dataAccess]?.bg || 'bg-gray-100',
                      dataAccessColors[permission.dataAccess]?.text || 'text-gray-600'
                    )}>
                      {permission.dataAccess}
                    </span>
                  </td>
                  {allActions.map(action => (
                    <td key={action} className="px-2 py-2 text-center">
                      {permission.actions.includes(action) ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">Access Levels:</span>
        </div>
        {Object.entries(dataAccessColors).map(([level, colors]) => (
          <div key={level} className="flex items-center gap-1">
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', colors.bg, colors.text)}>
              {level}
            </span>
            <span className="text-gray-400">
              {level === 'NONE' && '(No access)'}
              {level === 'OWN' && '(Own records)'}
              {level === 'TEAM' && '(Team records)'}
              {level === 'ALL' && '(All records)'}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>{permissions.length} modules</span>
        <span>{permissions.filter(p => p.actions.includes('VIEW')).length} viewable</span>
        <span>{permissions.filter(p => p.actions.includes('CREATE')).length} creatable</span>
        <span>{permissions.filter(p => p.actions.includes('DELETE')).length} deletable</span>
      </div>
    </div>
  );
}

export default ProfilePreview;
