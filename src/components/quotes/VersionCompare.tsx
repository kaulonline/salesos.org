import React from 'react';
import {
  Plus,
  Minus,
  Edit2,
  ArrowRight,
  CheckCircle,
  Info,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import type { QuoteVersionComparison, FieldChange, LineItemChange } from '../../types';

interface VersionCompareProps {
  comparison: QuoteVersionComparison;
}

export function VersionCompare({ comparison }: VersionCompareProps) {
  const { versionA, versionB, changes } = comparison;

  if (!changes) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-600" />
        <span className="text-blue-800">No comparison data available.</span>
      </div>
    );
  }

  const hasFieldChanges = changes.fieldChanges && changes.fieldChanges.length > 0;
  const hasLineItemChanges = changes.lineItemChanges && changes.lineItemChanges.length > 0;
  const hasNoChanges = !hasFieldChanges && !hasLineItemChanges;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Card className="flex-1 p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Version A</p>
          <p className="text-lg font-semibold text-gray-900">
            Version {versionA?.versionNumber || 'Unknown'}
          </p>
          {versionA?.snapshot && (
            <p className="text-sm text-gray-500">
              Total: ${versionA.snapshot.total?.toLocaleString() || '0'}
            </p>
          )}
        </Card>

        <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />

        <Card className="flex-1 p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Version B</p>
          <p className="text-lg font-semibold text-gray-900">
            Version {versionB?.versionNumber || 'Unknown'}
          </p>
          {versionB?.snapshot && (
            <p className="text-sm text-gray-500">
              Total: ${versionB.snapshot.total?.toLocaleString() || '0'}
            </p>
          )}
        </Card>
      </div>

      {/* Summary */}
      {changes.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Summary</p>
            <p className="text-sm text-blue-700">{changes.summary}</p>
          </div>
        </div>
      )}

      {hasNoChanges ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">No differences found between these versions.</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Field Changes */}
          {hasFieldChanges && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Field Changes ({changes.fieldChanges.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Field</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Previous Value</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-700"></th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">New Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.fieldChanges.map((change, index) => (
                      <FieldChangeRow key={index} change={change} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Line Item Changes */}
          {hasLineItemChanges && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Line Item Changes ({changes.lineItemChanges.length})
              </h4>
              <div className="space-y-2">
                {changes.lineItemChanges.map((change, index) => (
                  <LineItemChangeCard key={index} change={change} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FieldChangeRowProps {
  change: FieldChange;
}

function FieldChangeRow({ change }: FieldChangeRowProps) {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  };

  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-2 font-medium text-gray-900">
        {formatFieldName(change.field)}
      </td>
      <td className="px-4 py-2">
        <span className="inline-block px-2 py-1 bg-red-50 text-red-700 rounded line-through">
          {formatValue(change.oldValue)}
        </span>
      </td>
      <td className="px-4 py-2 text-center">
        <ArrowRight className="w-4 h-4 text-gray-400 inline-block" />
      </td>
      <td className="px-4 py-2">
        <span className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded font-medium">
          {formatValue(change.newValue)}
        </span>
      </td>
    </tr>
  );
}

interface LineItemChangeCardProps {
  change: LineItemChange;
}

function LineItemChangeCard({ change }: LineItemChangeCardProps) {
  const getChangeConfig = () => {
    switch (change.changeType) {
      case 'ADDED':
        return {
          icon: <Plus className="w-4 h-4" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeVariant: 'success' as const,
          label: 'Added',
        };
      case 'REMOVED':
        return {
          icon: <Minus className="w-4 h-4" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive' as const,
          label: 'Removed',
        };
      case 'MODIFIED':
        return {
          icon: <Edit2 className="w-4 h-4" />,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          badgeVariant: 'warning' as const,
          label: 'Modified',
        };
      default:
        return {
          icon: <Edit2 className="w-4 h-4" />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badgeVariant: 'secondary' as const,
          label: change.changeType,
        };
    }
  };

  const config = getChangeConfig();
  const item = change.newItem || change.oldItem;

  return (
    <Card className={`p-4 ${config.bgColor} border ${config.borderColor}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={config.badgeVariant} className="flex items-center gap-1">
              {config.icon}
              {config.label}
            </Badge>
            <span className="font-medium text-gray-900">
              {item?.productName || `Product ${item?.productId?.slice(-6)}`}
            </span>
          </div>

          {change.changeType === 'MODIFIED' && change.fieldChanges && (
            <div className="pl-1 space-y-1">
              {change.fieldChanges.map((fieldChange, idx) => (
                <p key={idx} className="text-sm text-gray-600">
                  {formatFieldName(fieldChange.field)}: {formatLineItemValue(fieldChange.oldValue)} →{' '}
                  <span className="font-medium">{formatLineItemValue(fieldChange.newValue)}</span>
                </p>
              ))}
            </div>
          )}

          {change.changeType === 'ADDED' && change.newItem && (
            <p className="text-sm text-gray-600 pl-1">
              Quantity: {change.newItem.quantity} × ${change.newItem.unitPrice?.toLocaleString()} ={' '}
              ${change.newItem.totalPrice?.toLocaleString()}
            </p>
          )}

          {change.changeType === 'REMOVED' && change.oldItem && (
            <p className="text-sm text-gray-600 pl-1 line-through">
              Quantity: {change.oldItem.quantity} × ${change.oldItem.unitPrice?.toLocaleString()} ={' '}
              ${change.oldItem.totalPrice?.toLocaleString()}
            </p>
          )}
        </div>

        {item && (
          <span className="font-semibold text-gray-900">
            ${item.totalPrice?.toLocaleString() || '0'}
          </span>
        )}
      </div>
    </Card>
  );
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatLineItemValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

export default VersionCompare;
