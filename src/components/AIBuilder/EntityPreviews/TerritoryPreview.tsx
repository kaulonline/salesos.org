/**
 * Territory Preview
 * Visual preview of AI-generated territory configuration
 */

import React from 'react';
import { TerritoryConfig } from '../../../types/aiBuilder';
import { cn } from '../../../lib/utils';
import {
  Map,
  Globe,
  Building2,
  Layers,
  Users,
  MapPin,
  Factory,
  TrendingUp,
} from 'lucide-react';

interface TerritoryPreviewProps {
  config: TerritoryConfig;
  className?: string;
}

const typeIcons: Record<string, React.ElementType> = {
  GEOGRAPHIC: Globe,
  NAMED_ACCOUNTS: Building2,
  INDUSTRY: Factory,
  ACCOUNT_SIZE: Layers,
  CUSTOM: Map,
};

const typeLabels: Record<string, string> = {
  GEOGRAPHIC: 'Geographic Territory',
  NAMED_ACCOUNTS: 'Named Accounts Territory',
  INDUSTRY: 'Industry Territory',
  ACCOUNT_SIZE: 'Account Size Territory',
  CUSTOM: 'Custom Territory',
};

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  GEOGRAPHIC: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  NAMED_ACCOUNTS: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  INDUSTRY: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  ACCOUNT_SIZE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  CUSTOM: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
};

const segmentLabels: Record<string, string> = {
  ENTERPRISE: 'Enterprise',
  MID_MARKET: 'Mid-Market',
  SMB: 'SMB',
  STARTUP: 'Startup',
};

export function TerritoryPreview({ config, className }: TerritoryPreviewProps) {
  const TypeIcon = typeIcons[config.type] || Map;
  const colors = typeColors[config.type] || typeColors.GEOGRAPHIC;

  const getCriteriaItems = () => {
    const items: Array<{ icon: React.ElementType; label: string; values: string[] }> = [];

    if (config.criteria?.geographic) {
      const geo = config.criteria.geographic;
      if (geo.countries?.length) {
        items.push({ icon: Globe, label: 'Countries', values: geo.countries });
      }
      if (geo.states?.length) {
        items.push({ icon: MapPin, label: 'States/Regions', values: geo.states });
      }
      if (geo.regions?.length) {
        items.push({ icon: Map, label: 'Regions', values: geo.regions });
      }
      if (geo.cities?.length) {
        items.push({ icon: Building2, label: 'Cities', values: geo.cities });
      }
    }

    if (config.criteria?.industry) {
      const ind = config.criteria.industry;
      if (ind.industries?.length) {
        items.push({ icon: Factory, label: 'Industries', values: ind.industries });
      }
      if (ind.subIndustries?.length) {
        items.push({ icon: Layers, label: 'Sub-Industries', values: ind.subIndustries });
      }
    }

    if (config.criteria?.segment) {
      const seg = config.criteria.segment;
      const segmentValues: string[] = [];
      if (seg.companySize) {
        segmentValues.push(segmentLabels[seg.companySize] || seg.companySize);
      }
      if (seg.minEmployees !== undefined || seg.maxEmployees !== undefined) {
        const min = seg.minEmployees ?? 0;
        const max = seg.maxEmployees ?? '∞';
        segmentValues.push(`${min}-${max} employees`);
      }
      if (seg.minRevenue !== undefined || seg.maxRevenue !== undefined) {
        const min = seg.minRevenue ? `$${(seg.minRevenue / 1e6).toFixed(0)}M` : '$0';
        const max = seg.maxRevenue ? `$${(seg.maxRevenue / 1e6).toFixed(0)}M` : '∞';
        segmentValues.push(`${min}-${max} revenue`);
      }
      if (segmentValues.length) {
        items.push({ icon: TrendingUp, label: 'Segment', values: segmentValues });
      }
    }

    if (config.criteria?.namedAccounts?.length) {
      items.push({ icon: Users, label: 'Named Accounts', values: config.criteria.namedAccounts });
    }

    return items;
  };

  const criteriaItems = getCriteriaItems();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Card */}
      <div className={cn('p-4 rounded-xl border', colors.border, colors.bg)}>
        <div className="flex items-center gap-3 mb-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', 'bg-white')}>
            <TypeIcon className={cn('w-5 h-5', colors.text)} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#1A1A1A]">{config.name}</h3>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', colors.bg, colors.text)}>
              {typeLabels[config.type] || config.type}
            </span>
          </div>
          {config.color && (
            <div
              className="w-6 h-6 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: config.color }}
              title="Territory Color"
            />
          )}
        </div>

        {config.description && (
          <p className="text-sm text-gray-600">{config.description}</p>
        )}
      </div>

      {/* Criteria */}
      {criteriaItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#1A1A1A]">Assignment Criteria</h4>
          <div className="space-y-2">
            {criteriaItems.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.values.slice(0, 5).map((value, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-white rounded-md border border-gray-200 text-[#1A1A1A]"
                      >
                        {value}
                      </span>
                    ))}
                    {item.values.length > 5 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-md text-gray-500">
                        +{item.values.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Rules */}
      {config.criteria?.customRules && config.criteria.customRules.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[#1A1A1A]">Custom Rules</h4>
          <div className="p-3 bg-gray-50 rounded-xl space-y-2">
            {config.criteria.customRules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <code className="px-2 py-0.5 bg-white rounded border border-gray-200">
                  {rule.field}
                </code>
                <span className="text-gray-500">{rule.operator}</span>
                <code className="px-2 py-0.5 bg-white rounded border border-gray-200">
                  {rule.value}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
        <strong>Note:</strong> After creating the territory, you can assign an owner and accounts will
        be automatically matched based on the criteria defined.
      </div>
    </div>
  );
}

export default TerritoryPreview;
