/**
 * Custom Fields Preview
 * Visual preview of AI-generated custom field definitions
 */

import React from 'react';
import { CustomFieldsConfig } from '../../../types/aiBuilder';
import { cn } from '../../../lib/utils';
import {
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Link,
  Mail,
  Phone,
  DollarSign,
  Percent,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface CustomFieldsPreviewProps {
  config: CustomFieldsConfig;
  className?: string;
}

const fieldTypeIcons: Record<string, React.ElementType> = {
  TEXT: Type,
  TEXTAREA: FileText,
  NUMBER: Hash,
  CURRENCY: DollarSign,
  PERCENT: Percent,
  DATE: Calendar,
  DATETIME: Calendar,
  PICKLIST: List,
  MULTI_PICKLIST: List,
  CHECKBOX: CheckSquare,
  URL: Link,
  EMAIL: Mail,
  PHONE: Phone,
  LOOKUP: ExternalLink,
};

const entityColors: Record<string, { bg: string; text: string; border: string }> = {
  LEAD: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  CONTACT: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  ACCOUNT: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  OPPORTUNITY: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

export function CustomFieldsPreview({ config, className }: CustomFieldsPreviewProps) {
  const { fields } = config;

  // Group fields by entity
  const fieldsByEntity = fields?.reduce((acc, field) => {
    const entity = field.entity || 'UNKNOWN';
    if (!acc[entity]) acc[entity] = [];
    acc[entity].push(field);
    return acc;
  }, {} as Record<string, typeof fields>);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[#1A1A1A]">
          {fields?.length || 0} Custom Field{fields?.length !== 1 ? 's' : ''}
        </h3>
        <p className="text-sm text-gray-500">
          Will be added to {Object.keys(fieldsByEntity || {}).length} entit
          {Object.keys(fieldsByEntity || {}).length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      {/* Fields by Entity */}
      {Object.entries(fieldsByEntity || {}).map(([entity, entityFields]) => {
        const colors = entityColors[entity] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

        return (
          <div key={entity} className="space-y-3">
            {/* Entity Header */}
            <div className={cn('px-3 py-1.5 rounded-full text-xs font-medium inline-block', colors.bg, colors.text)}>
              {entity} ({entityFields.length})
            </div>

            {/* Field Cards */}
            <div className="grid gap-3">
              {entityFields.map((field, index) => {
                const Icon = fieldTypeIcons[field.fieldType] || Type;

                return (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-xl border bg-white',
                      colors.border
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={cn('p-2 rounded-lg', colors.bg)}>
                        <Icon className={cn('w-4 h-4', colors.text)} />
                      </div>

                      {/* Field Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#1A1A1A]">{field.label}</span>
                          {field.isRequired && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded">
                              Required
                            </span>
                          )}
                          {field.isUnique && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-700 rounded">
                              Unique
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          <code className="bg-gray-100 px-1.5 py-0.5 rounded">{field.name}</code>
                          <span className="mx-1.5">•</span>
                          <span>{field.fieldType}</span>
                        </div>
                        {field.description && (
                          <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                        )}

                        {/* Picklist Values */}
                        {field.picklistValues && field.picklistValues.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {field.picklistValues.slice(0, 5).map((val, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full"
                              >
                                {val.label}
                              </span>
                            ))}
                            {field.picklistValues.length > 5 && (
                              <span className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full">
                                +{field.picklistValues.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CustomFieldsPreview;
