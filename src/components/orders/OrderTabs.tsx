import React from 'react';
import { MapPin, Truck, History } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '../../../components/ui/Skeleton';
import ShippingCard from './ShippingCard';
import { formatCurrency } from './types';
import type { Order, OrderTimeline } from '../../types/order';

type TabType = 'items' | 'details' | 'timeline';

interface OrderTabsProps {
  order: Order;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  timeline: OrderTimeline[];
  timelineLoading: boolean;
}

export const OrderTabs: React.FC<OrderTabsProps> = ({
  order,
  activeTab,
  setActiveTab,
  timeline,
  timelineLoading,
}) => {
  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden">
      <div className="border-b border-black/5">
        <div className="flex gap-1 p-2">
          {(['items', 'details', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium rounded-full transition-colors ${
                activeTab === tab
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#666] hover:bg-[#F8F8F6]'
              }`}
            >
              {tab === 'items' && 'Line Items'}
              {tab === 'details' && 'Details'}
              {tab === 'timeline' && 'Timeline'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'items' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="px-3 py-3 text-left font-medium text-[#666]">Product</th>
                  <th className="px-3 py-3 text-right font-medium text-[#666]">Qty</th>
                  <th className="px-3 py-3 text-right font-medium text-[#666]">Unit Price</th>
                  <th className="px-3 py-3 text-right font-medium text-[#666]">Discount</th>
                  <th className="px-3 py-3 text-right font-medium text-[#666]">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-black/5 last:border-0">
                    <td className="px-3 py-4">
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{item.productName}</p>
                        {item.productCode && (
                          <p className="text-xs text-[#999]">{item.productCode}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right text-[#666]">{item.quantity}</td>
                    <td className="px-3 py-4 text-right text-[#666]">
                      {formatCurrency(item.unitPrice, order.currency)}
                    </td>
                    <td className="px-3 py-4 text-right text-[#666]">
                      {formatCurrency(item.discount || 0, order.currency)}
                    </td>
                    <td className="px-3 py-4 text-right font-semibold text-[#1A1A1A]">
                      {formatCurrency(item.totalPrice, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {order.billingAddress && (
              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#999]" />
                  Billing Address
                </h4>
                <div className="text-sm text-[#666] space-y-1">
                  {order.billingAddress.attention && <p>{order.billingAddress.attention}</p>}
                  {order.billingAddress.street && <p>{order.billingAddress.street}</p>}
                  <p>
                    {[order.billingAddress.city, order.billingAddress.state, order.billingAddress.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {order.billingAddress.country && <p>{order.billingAddress.country}</p>}
                </div>
              </div>
            )}

            {order.shippingAddress && (
              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#999]" />
                  Shipping Address
                </h4>
                <div className="text-sm text-[#666] space-y-1">
                  {order.shippingAddress.attention && <p>{order.shippingAddress.attention}</p>}
                  {order.shippingAddress.street && <p>{order.shippingAddress.street}</p>}
                  <p>
                    {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
                </div>
              </div>
            )}

            {/* Shipping Card with carrier detection */}
            <div className="md:col-span-2">
              <ShippingCard
                trackingNumber={order.trackingNumber}
                trackingUrl={order.trackingUrl}
                shippedDate={order.shippedDate}
                expectedDeliveryDate={order.expectedDeliveryDate}
                deliveredDate={order.deliveredDate}
              />
            </div>

            {order.notes && (
              <div className="md:col-span-2">
                <h4 className="font-medium text-[#1A1A1A] mb-3">Notes</h4>
                <p className="text-sm text-[#666] whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            {timelineLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-10 h-10 text-[#999] mx-auto mb-3 opacity-40" />
                <p className="text-[#666]">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {timeline.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F0EBD8] flex items-center justify-center flex-shrink-0">
                      <History className="w-4 h-4 text-[#1A1A1A]" />
                    </div>
                    <div>
                      <p className="text-sm text-[#1A1A1A]">{entry.description}</p>
                      <p className="text-xs text-[#999]">
                        {entry.createdBy?.name && `${entry.createdBy.name} • `}
                        {format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
