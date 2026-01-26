/**
 * Workflow Preview
 * Visual preview of AI-generated workflow automation configuration
 */

import React from 'react';
import { WorkflowConfig } from '../../../types/aiBuilder';
import { cn } from '../../../lib/utils';
import {
  Play,
  Mail,
  CheckSquare,
  Edit3,
  PlusCircle,
  Bell,
  UserPlus,
  Tag,
  Globe,
  ArrowRight,
  Zap
} from 'lucide-react';

interface WorkflowPreviewProps {
  config: WorkflowConfig;
  className?: string;
}

const triggerLabels: Record<string, string> = {
  RECORD_CREATED: 'Record Created',
  RECORD_UPDATED: 'Record Updated',
  STAGE_CHANGED: 'Stage Changed',
  FIELD_CHANGED: 'Field Changed',
  DATE_REACHED: 'Date Reached',
  MANUAL: 'Manual Trigger',
};

const actionIcons: Record<string, React.ReactNode> = {
  SEND_EMAIL: <Mail className="w-4 h-4" />,
  CREATE_TASK: <CheckSquare className="w-4 h-4" />,
  UPDATE_FIELD: <Edit3 className="w-4 h-4" />,
  CREATE_RECORD: <PlusCircle className="w-4 h-4" />,
  NOTIFY_USER: <Bell className="w-4 h-4" />,
  ASSIGN_TO: <UserPlus className="w-4 h-4" />,
  ADD_TAG: <Tag className="w-4 h-4" />,
  WEBHOOK: <Globe className="w-4 h-4" />,
};

const actionLabels: Record<string, string> = {
  SEND_EMAIL: 'Send Email',
  CREATE_TASK: 'Create Task',
  UPDATE_FIELD: 'Update Field',
  CREATE_RECORD: 'Create Record',
  NOTIFY_USER: 'Send Notification',
  ASSIGN_TO: 'Assign Record',
  ADD_TAG: 'Add Tag',
  WEBHOOK: 'Call Webhook',
};

export function WorkflowPreview({ config, className }: WorkflowPreviewProps) {
  const { name, description, trigger, conditions, actions, isActive } = config;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Workflow Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#EAD07D]" />
            <h3 className="text-lg font-semibold text-[#1A1A1A]">{name}</h3>
          </div>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
        {isActive !== undefined && (
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          )}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        )}
      </div>

      {/* Workflow Flow */}
      <div className="space-y-3">
        {/* Trigger */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Play className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 p-3 bg-purple-50 rounded-xl">
            <div className="text-xs text-purple-600 font-medium mb-1">TRIGGER</div>
            <div className="text-sm font-medium text-[#1A1A1A]">
              {triggerLabels[trigger.type] || trigger.type}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              On: {trigger.entity}
              {trigger.conditions && trigger.conditions.length > 0 && (
                <span className="ml-2">
                  ({trigger.conditions.length} condition{trigger.conditions.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
        </div>

        {/* Conditions (if any) */}
        {conditions && conditions.length > 0 && (
          <>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="text-xs text-amber-600 font-medium mb-2">CONDITIONS</div>
              <div className="space-y-1">
                {conditions.map((condition, index) => (
                  <div key={index} className="text-xs text-gray-600 flex items-center gap-1">
                    {index > 0 && (
                      <span className="text-amber-600 font-medium mr-1">
                        {condition.logicalOperator || 'AND'}
                      </span>
                    )}
                    <span className="font-medium">{condition.field}</span>
                    <span>{condition.operator}</span>
                    <span className="text-amber-700">{condition.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-medium">ACTIONS</div>
          {actions
            .sort((a, b) => a.order - b.order)
            .map((action, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl"
              >
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  {actionIcons[action.type] || <Zap className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#1A1A1A]">
                    {index + 1}. {actionLabels[action.type] || action.type}
                  </div>
                  {action.config && Object.keys(action.config).length > 0 && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {action.type === 'SEND_EMAIL' && action.config.templateName && (
                        <span>Template: {action.config.templateName}</span>
                      )}
                      {action.type === 'CREATE_TASK' && action.config.subject && (
                        <span>"{action.config.subject}"</span>
                      )}
                      {action.type === 'UPDATE_FIELD' && action.config.field && (
                        <span>Set {action.config.field} to {action.config.value}</span>
                      )}
                      {action.type === 'NOTIFY_USER' && action.config.message && (
                        <span>"{action.config.message}"</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>1 trigger</span>
        <span>{conditions?.length || 0} conditions</span>
        <span>{actions.length} action{actions.length > 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

export default WorkflowPreview;
