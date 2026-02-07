import React from 'react';
import { FileText, Clock, CheckCircle, Package, Truck, XCircle } from 'lucide-react';
import type { OrderStatus, PaymentStatus } from '../../types/order';

export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
}

export const statusConfig: Record<OrderStatus, StatusConfig> = {
  DRAFT: { label: 'Draft', color: 'bg-[#F8F8F6] text-[#666]', icon: React.createElement(FileText, { className: 'w-4 h-4' }) },
  PENDING: { label: 'Pending', color: 'bg-[#EAD07D]/20 text-[#1A1A1A]', icon: React.createElement(Clock, { className: 'w-4 h-4' }) },
  CONFIRMED: { label: 'Confirmed', color: 'bg-[#1A1A1A]/10 text-[#1A1A1A]', icon: React.createElement(CheckCircle, { className: 'w-4 h-4' }) },
  PROCESSING: { label: 'Processing', color: 'bg-[#EAD07D]/30 text-[#1A1A1A]', icon: React.createElement(Package, { className: 'w-4 h-4' }) },
  SHIPPED: { label: 'Shipped', color: 'bg-[#1A1A1A] text-white', icon: React.createElement(Truck, { className: 'w-4 h-4' }) },
  DELIVERED: { label: 'Delivered', color: 'bg-[#93C01F]/20 text-[#93C01F]', icon: React.createElement(CheckCircle, { className: 'w-4 h-4' }) },
  COMPLETED: { label: 'Completed', color: 'bg-[#93C01F]/20 text-[#93C01F]', icon: React.createElement(CheckCircle, { className: 'w-4 h-4' }) },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600', icon: React.createElement(XCircle, { className: 'w-4 h-4' }) },
  RETURNED: { label: 'Returned', color: 'bg-[#EAD07D]/40 text-[#1A1A1A]', icon: React.createElement(Package, { className: 'w-4 h-4' }) },
};

export const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-[#EAD07D]/20 text-[#1A1A1A]' },
  PARTIAL: { label: 'Partial', color: 'bg-[#1A1A1A]/10 text-[#1A1A1A]' },
  PAID: { label: 'Paid', color: 'bg-[#93C01F]/20 text-[#93C01F]' },
  REFUNDED: { label: 'Refunded', color: 'bg-[#EAD07D]/40 text-[#1A1A1A]' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-600' },
};

export const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'] as const;
export const PAYMENT_METHODS = ['Credit Card', 'Bank Transfer', 'Check', 'PayPal', 'Wire Transfer'] as const;
