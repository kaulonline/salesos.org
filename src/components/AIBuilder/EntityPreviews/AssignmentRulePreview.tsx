/**
 * Assignment Rule Preview
 * Visual preview of AI-generated assignment rules
 */

import React from 'react';
import { AssignmentRuleConfig, SingleAssignmentRule } from '../../../types/aiBuilder';
import { cn } from '../../../lib/utils';
import {
  Users,
  Filter,
  ArrowRight,
  RefreshCw,
  Scale,
  UserCheck,
  Layers,
} from 'lucide-react';

interface AssignmentRulePreviewProps {
  config: AssignmentRuleConfig;
  className?: string;
}

const methodIcons: Record<string, React.ElementType> = {
  ROUND_ROBIN: RefreshCw,
  LOAD_BALANCED: Scale,
  WEIGHTED: Layers,
  FIXED: UserCheck,
};

const methodLabels: Record<string, string> = {
  ROUND_ROBIN: 'Round Robin',
  LOAD_BALANCED: 'Load Balanced',
  WEIGHTED: 'Weighted',
  FIXED: 'Fixed Assignment',
};

const operatorLabels: Record<string, string> = {
  EQUALS: '=',
  NOT_EQUALS: '≠',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not contains',
  STARTS_WITH: 'starts with',
  ENDS_WITH: 'ends with',
  GREATER_THAN: '>',
  LESS_THAN: '<',
  GREATER_THAN_OR_EQUALS: '≥',
  LESS_THAN_OR_EQUALS: '≤',
  IS_EMPTY: 'is empty',
  IS_NOT_EMPTY: 'is not empty',
  IN: 'in',
  NOT_IN: 'not in',
};

function RuleCard({ rule, index }: { rule: SingleAssignmentRule; index: number }) {
  const MethodIcon = methodIcons[rule.method] || RefreshCw;
  const entityColor = rule.entity === 'LEAD'
    ? { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
    : { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };

  return (
    <div className={cn('p-4 rounded-xl border bg-white', entityColor.border)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', entityColor.bg, entityColor.text)}>
            {rule.entity}
          </span>
          <span className="text-sm font-medium text-[#1A1A1A]">{rule.name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MethodIcon className="w-3.5 h-3.5" />
          {methodLabels[rule.method] || rule.method}
        </div>
      </div>

      {rule.description && (
        <p className="text-xs text-gray-500 mb-3">{rule.description}</p>
      )}

      {/* Visual Flow */}
      <div className="flex items-center gap-2">
        {/* Conditions */}
        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Conditions</span>
          </div>
          {rule.conditions && rule.conditions.length > 0 ? (
            <div className="space-y-1.5">
              {rule.conditions.map((cond, i) => (
                <div key={i} className="text-xs">
                  <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200">
                    {cond.field}
                  </code>
                  <span className="mx-1.5 text-gray-500">
                    {operatorLabels[cond.operator] || cond.operator}
                  </span>
                  <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200">
                    {cond.value}
                  </code>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">All records (no conditions)</div>
          )}
        </div>

        {/* Arrow */}
        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />

        {/* Assignees */}
        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
            <Users className="w-3.5 h-3.5" />
            <span className="font-medium">Assignees</span>
          </div>
          {rule.assignees && rule.assignees.length > 0 ? (
            <div className="space-y-1.5">
              {rule.assignees.map((assignee, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#EAD07D] flex items-center justify-center text-[10px] font-medium">
                    {(assignee.userName || 'U')[0]}
                  </div>
                  <span className="flex-1 truncate">
                    {assignee.userName || assignee.userId}
                  </span>
                  {rule.method === 'WEIGHTED' && assignee.weight && (
                    <span className="px-1.5 py-0.5 bg-white rounded border border-gray-200 text-gray-500">
                      {assignee.weight}x
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">No assignees configured</div>
          )}
        </div>
      </div>

      {/* Priority */}
      {rule.order !== undefined && (
        <div className="mt-3 text-xs text-gray-500">
          Priority: #{rule.order}
        </div>
      )}
    </div>
  );
}

export function AssignmentRulePreview({ config, className }: AssignmentRulePreviewProps) {
  // Normalize to array of rules
  const rules: SingleAssignmentRule[] = config.rules
    ? config.rules
    : config.name
      ? [config as SingleAssignmentRule]
      : [];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[#1A1A1A]">
          {rules.length} Assignment Rule{rules.length !== 1 ? 's' : ''}
        </h3>
        <p className="text-sm text-gray-500">
          Rules are evaluated in priority order
        </p>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule, index) => (
          <RuleCard key={index} rule={rule} index={index} />
        ))}
      </div>

      {/* Help Text */}
      <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
        <strong>Note:</strong> User IDs shown as placeholders. You'll select actual team members
        after applying this configuration.
      </div>
    </div>
  );
}

export default AssignmentRulePreview;
