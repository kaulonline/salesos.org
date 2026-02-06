import React from 'react';
import { ShoppingCart, CheckCircle, Package, Truck, Home } from 'lucide-react';
import { format } from 'date-fns';
import type { OrderStatus } from '../../types/order';

export interface OrderStatusTrackerProps {
  status: OrderStatus;
  orderDate?: string;
  confirmedDate?: string;
  processingDate?: string;
  shippedDate?: string;
  deliveredDate?: string;
  expectedDeliveryDate?: string;
  className?: string;
}

interface StatusStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  dateKey: keyof Omit<OrderStatusTrackerProps, 'status' | 'className'>;
}

const STATUS_STEPS: StatusStep[] = [
  { key: 'ORDERED', label: 'Ordered', icon: <ShoppingCart size={18} />, dateKey: 'orderDate' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: <CheckCircle size={18} />, dateKey: 'confirmedDate' },
  { key: 'PROCESSING', label: 'Processing', icon: <Package size={18} />, dateKey: 'processingDate' },
  { key: 'SHIPPED', label: 'Shipped', icon: <Truck size={18} />, dateKey: 'shippedDate' },
  { key: 'DELIVERED', label: 'Delivered', icon: <Home size={18} />, dateKey: 'deliveredDate' },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  DRAFT: 0,
  PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  COMPLETED: 4,
  CANCELLED: -1,
  RETURNED: -1,
};

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  status,
  orderDate,
  confirmedDate,
  processingDate,
  shippedDate,
  deliveredDate,
  expectedDeliveryDate,
  className = '',
}) => {
  const currentStepIndex = STATUS_ORDER[status] ?? -1;
  const isCancelled = status === 'CANCELLED';
  const isReturned = status === 'RETURNED';

  if (isCancelled || isReturned) {
    return (
      <div className={`bg-white rounded-[24px] p-6 shadow-sm border border-black/5 ${className}`}>
        <div className="flex items-center justify-center gap-3 py-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isCancelled ? 'bg-red-100' : 'bg-[#EAD07D]/20'
          }`}>
            {isCancelled ? (
              <span className="text-red-600 text-xl">x</span>
            ) : (
              <Package size={24} className="text-[#1A1A1A]" />
            )}
          </div>
          <div>
            <p className={`font-semibold ${isCancelled ? 'text-red-600' : 'text-[#1A1A1A]'}`}>
              Order {isCancelled ? 'Cancelled' : 'Returned'}
            </p>
            <p className="text-sm text-[#666]">
              {isCancelled
                ? 'This order has been cancelled'
                : 'This order has been returned'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const dates: Record<string, string | undefined> = {
    orderDate,
    confirmedDate,
    processingDate,
    shippedDate,
    deliveredDate,
  };

  return (
    <div className={`bg-white rounded-[24px] p-6 shadow-sm border border-black/5 ${className}`}>
      <div className="relative">
        {/* Progress Track */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-[#F0EBD8] rounded-full mx-10">
          <div
            className="h-full bg-[#93C01F] rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;
            const stepDate = dates[step.dateKey];

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center z-10 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#93C01F] text-white'
                      : isCurrent
                      ? 'bg-[#EAD07D] text-[#1A1A1A] shadow-md'
                      : 'bg-[#F0EBD8] text-[#999]'
                  } ${isCurrent ? 'animate-pulse' : ''}`}
                >
                  {step.icon}
                </div>

                {/* Label */}
                <p
                  className={`mt-3 text-sm font-medium text-center ${
                    isCompleted || isCurrent ? 'text-[#1A1A1A]' : 'text-[#999]'
                  }`}
                >
                  {step.label}
                </p>

                {/* Date */}
                <p className="mt-1 text-xs text-[#999] text-center h-4">
                  {stepDate
                    ? format(new Date(stepDate), 'MMM d')
                    : step.key === 'DELIVERED' && expectedDeliveryDate && isPending
                    ? `Est. ${format(new Date(expectedDeliveryDate), 'MMM d')}`
                    : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderStatusTracker;
