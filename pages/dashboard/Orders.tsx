import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ShoppingCart,
  Filter,
  Loader2,
  MoreVertical,
  Eye,
  Trash2,
  Copy,
  Download,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Building2,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { useOrders, useOrderStats, useDownloadOrderPdf } from '../../src/hooks/useOrders';
import type { Order, OrderStatus, PaymentStatus, FulfillmentStatus, OrderFilters } from '../../src/types/order';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', color: 'bg-[#F8F8F6] text-[#666]', icon: <FileText className="w-3.5 h-3.5" /> },
  PENDING: { label: 'Pending', color: 'bg-[#EAD07D]/20 text-[#1A1A1A]', icon: <Clock className="w-3.5 h-3.5" /> },
  CONFIRMED: { label: 'Confirmed', color: 'bg-[#1A1A1A]/10 text-[#1A1A1A]', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  PROCESSING: { label: 'Processing', color: 'bg-[#EAD07D]/30 text-[#1A1A1A]', icon: <Package className="w-3.5 h-3.5" /> },
  SHIPPED: { label: 'Shipped', color: 'bg-[#1A1A1A] text-white', icon: <Truck className="w-3.5 h-3.5" /> },
  DELIVERED: { label: 'Delivered', color: 'bg-[#93C01F]/20 text-[#93C01F]', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  COMPLETED: { label: 'Completed', color: 'bg-[#93C01F]/20 text-[#93C01F]', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600', icon: <XCircle className="w-3.5 h-3.5" /> },
  RETURNED: { label: 'Returned', color: 'bg-[#EAD07D]/40 text-[#1A1A1A]', icon: <Package className="w-3.5 h-3.5" /> },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-[#EAD07D]/20 text-[#1A1A1A]' },
  PARTIAL: { label: 'Partial', color: 'bg-[#1A1A1A]/10 text-[#1A1A1A]' },
  PAID: { label: 'Paid', color: 'bg-[#93C01F]/20 text-[#93C01F]' },
  REFUNDED: { label: 'Refunded', color: 'bg-[#EAD07D]/40 text-[#1A1A1A]' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-600' },
};

const fulfillmentStatusConfig: Record<FulfillmentStatus, { label: string; color: string }> = {
  UNFULFILLED: { label: 'Unfulfilled', color: 'bg-[#F8F8F6] text-[#666]' },
  PARTIAL: { label: 'Partial', color: 'bg-[#EAD07D]/20 text-[#1A1A1A]' },
  FULFILLED: { label: 'Fulfilled', color: 'bg-[#93C01F]/20 text-[#93C01F]' },
  RETURNED: { label: 'Returned', color: 'bg-[#EAD07D]/40 text-[#1A1A1A]' },
};

export default function Orders() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orderId: string | null }>({
    isOpen: false,
    orderId: null,
  });

  const filters: OrderFilters = useMemo(() => ({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
  }), [searchQuery, statusFilter]);

  const { orders, loading, error, refetch, delete: deleteOrder, isDeleting } = useOrders(filters);
  const { stats } = useOrderStats();
  const { download, isDownloading } = useDownloadOrderPdf();

  const handleViewOrder = (id: string) => {
    navigate(`/dashboard/orders/${id}`);
  };

  const handleDeleteOrder = (id: string) => {
    setDeleteModal({ isOpen: true, orderId: id });
    setActionMenuId(null);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteModal.orderId) return;
    try {
      await deleteOrder(deleteModal.orderId);
    } catch (err) {
      // Error handled by hook
    } finally {
      setDeleteModal({ isOpen: false, orderId: null });
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      await download(id);
      setActionMenuId(null);
    } catch (err) {
      // Error handled by hook
    }
  };

  const formatCurrency = (amount: number, compact = true) => {
    if (compact && Math.abs(amount) >= 1000) {
      const absAmount = Math.abs(amount);
      if (absAmount >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
      if (absAmount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
      if (absAmount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
      if (absAmount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <Skeleton className="h-10 w-48 rounded-2xl mb-2" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-[24px]" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-[32px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Orders</h1>
            <p className="text-[#666] mt-1">Manage customer orders and fulfillment</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/orders/new')}
            className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-[#1A1A1A]" />
                </div>
              </div>
              <p className="text-2xl font-light text-[#1A1A1A] mb-1">{stats.total}</p>
              <p className="text-sm text-[#666]">Total Orders</p>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#93C01F]" />
                </div>
              </div>
              <p className="text-2xl font-light text-[#1A1A1A] mb-1">{formatCurrency(stats.totalRevenue || 0)}</p>
              <p className="text-sm text-[#666]">Total Revenue</p>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#EAD07D]/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#1A1A1A]" />
                </div>
              </div>
              <p className="text-2xl font-light text-[#1A1A1A] mb-1">{stats.byStatus?.PENDING || 0}</p>
              <p className="text-sm text-[#666]">Pending</p>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#EAD07D]" />
                </div>
              </div>
              <p className="text-2xl font-light text-[#1A1A1A] mb-1">{stats.ordersThisMonth || 0}</p>
              <p className="text-sm text-[#666]">This Month</p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
            className="px-4 py-2.5 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] outline-none text-sm font-medium text-[#1A1A1A]"
          >
            <option value="">All Statuses</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>
        </div>

        {/* Orders Table */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-red-700">{error}</span>
            <button onClick={() => refetch()} className="text-red-600 hover:text-red-800 font-medium">
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 shadow-sm border border-black/5 text-center">
            <ShoppingCart className="w-12 h-12 text-[#999] mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No Orders Found</h3>
            <p className="text-sm text-[#666] mb-6">
              {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Create your first order to get started'}
            </p>
            {!searchQuery && !statusFilter && (
              <button
                onClick={() => navigate('/dashboard/orders/new')}
                className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors inline-flex items-center gap-2 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Order
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="px-6 py-4 text-left font-medium text-[#666]">Order</th>
                    <th className="px-6 py-4 text-left font-medium text-[#666]">Account</th>
                    <th className="px-6 py-4 text-left font-medium text-[#666]">Status</th>
                    <th className="px-6 py-4 text-left font-medium text-[#666]">Payment</th>
                    <th className="px-6 py-4 text-left font-medium text-[#666]">Fulfillment</th>
                    <th className="px-6 py-4 text-right font-medium text-[#666]">Total</th>
                    <th className="px-6 py-4 text-left font-medium text-[#666]">Date</th>
                    <th className="px-6 py-4 text-right font-medium text-[#666]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusCfg = statusConfig[order.status] || { label: order.status || 'Unknown', color: 'bg-gray-100 text-gray-700', icon: null };
                    const paymentCfg = paymentStatusConfig[order.paymentStatus] || { label: order.paymentStatus || 'Unknown', color: 'bg-gray-100 text-gray-700' };
                    const fulfillmentCfg = fulfillmentStatusConfig[order.fulfillmentStatus] || { label: order.fulfillmentStatus || 'Unknown', color: 'bg-gray-100 text-gray-700' };

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-black/5 hover:bg-[#F8F8F6] cursor-pointer transition-colors"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-[#1A1A1A]">{order.orderNumber}</p>
                            {order.name && (
                              <p className="text-xs text-[#999]">{order.name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#999]" />
                            <span className="text-[#1A1A1A]">{order.account?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${paymentCfg.color}`}>
                            {paymentCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${fulfillmentCfg.color}`}>
                            {fulfillmentCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-[#1A1A1A]">
                            {formatCurrency(order.total)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-[#666] text-sm">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(order.orderDate), 'MMM d, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === order.id ? null : order.id);
                              }}
                              className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] rounded-full transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {actionMenuId === order.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-lg border border-black/5 z-10 overflow-hidden">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewOrder(order.id);
                                  }}
                                  className="w-full px-4 py-3 text-left text-sm hover:bg-[#F8F8F6] flex items-center gap-2 text-[#1A1A1A]"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPdf(order.id);
                                  }}
                                  disabled={isDownloading}
                                  className="w-full px-4 py-3 text-left text-sm hover:bg-[#F8F8F6] flex items-center gap-2 text-[#1A1A1A] disabled:opacity-50"
                                >
                                  <Download className="w-4 h-4" />
                                  Download PDF
                                </button>
                                {order.status === 'DRAFT' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteOrder(order.id);
                                    }}
                                    disabled={isDeleting}
                                    className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 disabled:opacity-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Click outside to close menu */}
        {actionMenuId && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setActionMenuId(null)}
          />
        )}

        <ConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, orderId: null })}
          onConfirm={confirmDeleteOrder}
          title="Delete Order"
          message="Are you sure you want to delete this order? This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          loading={isDeleting}
        />
      </div>
    </div>
  );
}
