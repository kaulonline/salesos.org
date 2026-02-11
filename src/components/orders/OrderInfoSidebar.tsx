import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, Calendar, Truck, FileText, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency, paymentStatusConfig } from './types';
import type { Order } from '../../types/order';

interface OrderInfoSidebarProps {
  order: Order;
}

export const OrderInfoSidebar: React.FC<OrderInfoSidebarProps> = ({ order }) => {
  const navigate = useNavigate();
  const paymentCfg = paymentStatusConfig[order.paymentStatus] || { label: order.paymentStatus || 'Unknown', color: 'bg-[#F8F8F6] text-[#666]' };

  return (
    <div className="space-y-6">
      {/* Order Info */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
        <h3 className="font-semibold text-[#1A1A1A] mb-4">Order Information</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#999]" />
            </div>
            <div>
              <p className="text-xs text-[#999]">Account</p>
              {order.accountId ? (
                <Link to={`/dashboard/companies/${order.accountId}`} className="text-sm font-medium text-[#1A1A1A] hover:text-[#EAD07D] transition-colors">
                  {order.account?.name || '-'}
                </Link>
              ) : (
                <p className="text-sm font-medium text-[#1A1A1A]">{order.account?.name || '-'}</p>
              )}
            </div>
          </div>

          {order.contact && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
                <User className="w-4 h-4 text-[#999]" />
              </div>
              <div>
                <p className="text-xs text-[#999]">Contact</p>
                {order.contactId ? (
                  <Link to={`/dashboard/contacts/${order.contactId}`} className="text-sm font-medium text-[#1A1A1A] hover:text-[#EAD07D] transition-colors">
                    {order.contact.firstName} {order.contact.lastName}
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    {order.contact.firstName} {order.contact.lastName}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#999]" />
            </div>
            <div>
              <p className="text-xs text-[#999]">Order Date</p>
              <p className="text-sm font-medium text-[#1A1A1A]">
                {format(new Date(order.orderDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {order.expectedDeliveryDate && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <Truck className="w-4 h-4 text-[#1A1A1A]" />
              </div>
              <div>
                <p className="text-xs text-[#999]">Expected Delivery</p>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {format(new Date(order.expectedDeliveryDate), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          {order.quote && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#999]" />
              </div>
              <div>
                <p className="text-xs text-[#999]">Source Quote</p>
                <button
                  onClick={() => navigate(`/dashboard/quotes/${order.quote!.id}`)}
                  className="text-sm font-medium text-[#1A1A1A] hover:text-[#EAD07D] transition-colors"
                >
                  {order.quote.quoteNumber || order.quote.name}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Info */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
        <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#999]" />
          Payment
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#666]">Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${paymentCfg.color}`}>
              {paymentCfg.label}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#666]">Paid</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">
              {formatCurrency(order.paidAmount, order.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#666]">Balance</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">
              {formatCurrency(order.total - order.paidAmount, order.currency)}
            </span>
          </div>
          {order.paymentTerms && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#666]">Terms</span>
              <span className="text-sm text-[#1A1A1A]">{order.paymentTerms}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
