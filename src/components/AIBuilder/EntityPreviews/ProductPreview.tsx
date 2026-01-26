/**
 * Product Preview
 * Visual preview of AI-generated product configuration
 */

import React from 'react';
import { ProductConfig } from '../../../types/aiBuilder';
import { cn } from '../../../lib/utils';
import {
  Package,
  Tag,
  DollarSign,
  Repeat,
  Check,
  Box,
  Layers
} from 'lucide-react';

interface ProductPreviewProps {
  config: ProductConfig;
  className?: string;
}

const typeLabels: Record<string, string> = {
  PRODUCT: 'Product',
  SERVICE: 'Service',
  SUBSCRIPTION: 'Subscription',
  LICENSE: 'License',
  BUNDLE: 'Bundle',
  ADD_ON: 'Add-On',
};

const typeIcons: Record<string, React.ReactNode> = {
  PRODUCT: <Box className="w-5 h-5" />,
  SERVICE: <Package className="w-5 h-5" />,
  SUBSCRIPTION: <Repeat className="w-5 h-5" />,
  LICENSE: <Tag className="w-5 h-5" />,
  BUNDLE: <Layers className="w-5 h-5" />,
  ADD_ON: <Package className="w-5 h-5" />,
};

const billingLabels: Record<string, string> = {
  ONE_TIME: 'One-time',
  MONTHLY: '/month',
  QUARTERLY: '/quarter',
  SEMI_ANNUAL: '/6 months',
  ANNUAL: '/year',
};

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function ProductPreview({ config, className }: ProductPreviewProps) {
  const {
    name,
    sku,
    description,
    type,
    category,
    unitPrice,
    costPrice,
    currency = 'USD',
    billingFrequency,
    isActive,
    features,
    priceTiers,
  } = config;

  const margin = costPrice ? ((unitPrice - costPrice) / unitPrice * 100).toFixed(1) : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Product Card */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#EAD07D]/20 to-[#EAD07D]/5 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/80 rounded-xl text-[#1A1A1A]">
                {typeIcons[type] || <Package className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">{name}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{sku}</span>
                  <span className="px-2 py-0.5 bg-white/80 rounded-full">
                    {typeLabels[type] || type}
                  </span>
                  {category && <span>{category}</span>}
                </div>
              </div>
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
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}

          {/* Pricing */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#1A1A1A]">
              {formatCurrency(unitPrice, currency)}
            </span>
            {billingFrequency && billingFrequency !== 'ONE_TIME' && (
              <span className="text-gray-500">
                {billingLabels[billingFrequency]}
              </span>
            )}
          </div>

          {/* Cost & Margin */}
          {costPrice && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-gray-500">
                Cost: {formatCurrency(costPrice, currency)}
              </div>
              {margin && (
                <div className="text-green-600 font-medium">
                  {margin}% margin
                </div>
              )}
            </div>
          )}

          {/* Features */}
          {features && features.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase">Features</div>
              <ul className="space-y-1.5">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Price Tiers */}
          {priceTiers && priceTiers.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase">Volume Pricing</div>
              <div className="bg-gray-50 rounded-xl p-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="pb-2">Quantity</th>
                      <th className="pb-2">Unit Price</th>
                      {priceTiers.some(t => t.discount) && <th className="pb-2">Discount</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {priceTiers.map((tier, index) => (
                      <tr key={index}>
                        <td className="py-1.5">
                          {tier.minQuantity}
                          {tier.maxQuantity ? ` - ${tier.maxQuantity}` : '+'}
                        </td>
                        <td className="py-1.5 font-medium">
                          {formatCurrency(tier.unitPrice, currency)}
                        </td>
                        {priceTiers.some(t => t.discount) && (
                          <td className="py-1.5 text-green-600">
                            {tier.discount ? `${tier.discount}% off` : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          {formatCurrency(unitPrice, currency)}
        </span>
        <span>{typeLabels[type]}</span>
        {features && <span>{features.length} features</span>}
        {priceTiers && <span>{priceTiers.length} price tiers</span>}
      </div>
    </div>
  );
}

export default ProductPreview;
