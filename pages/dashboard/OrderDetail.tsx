import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Building2,
  User,
  Calendar,
  FileText,
  MoreVertical,
  Loader2,
  Download,
  Copy,
  Edit2,
  MapPin,
  CreditCard,
  History,
  ExternalLink,
} from 'lucide-react';
import ConfirmationModal from '../../src/components/ui/ConfirmationModal';
import { format } from 'date-fns';
import { Skeleton } from '../../components/ui/Skeleton';
import { useOrder, useOrderTimeline } from '../../src/hooks/useOrders';
import { printOrder } from '../../src/utils/orderPdfGenerator';
import type { OrderStatus, PaymentStatus, FulfillmentStatus } from '../../src/types/order';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', color: 'bg-[#F8F8F6] text-[#666]', icon: <FileText className="w-4 h-4" /> },
  PENDING: { label: 'Pending', color: 'bg-[#EAD07D]/20 text-[#1A1A1A]', icon: <Clock className="w-4 h-4" /> },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-4 h-4" /> },
  PROCESSING: { label: 'Processing', color: 'bg-[#EAD07D]/30 text-[#1A1A1A]', icon: <Package className="w-4 h-4" /> },
  SHIPPED: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-4 h-4" /> },
  DELIVERED: { label: 'Delivered', color: 'bg-[#93C01F]/20 text-[#93C01F]', icon: <CheckCircle className="w-4 h-4" /> },
  COMPLETED: { label: 'Completed', color: 'bg-[#93C01F]/20 text-[#93C01F]', icon: <CheckCircle className="w-4 h-4" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
  RETURNED: { label: 'Returned', color: 'bg-orange-100 text-orange-700', icon: <Package className="w-4 h-4" /> },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-[#EAD07D]/20 text-[#1A1A1A]' },
  PARTIAL: { label: 'Partial', color: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'Paid', color: 'bg-[#93C01F]/20 text-[#93C01F]' },
  REFUNDED: { label: 'Refunded', color: 'bg-orange-100 text-orange-700' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700' },
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewOrder = id === 'new';
  const [activeTab, setActiveTab] = useState<'items' | 'details' | 'timeline'>('items');
  const [showActions, setShowActions] = useState(false);
  const [showDeliverConfirm, setShowDeliverConfirm] = useState(false);

  const {
    order,
    loading,
    error,
    confirm,
    cancel,
    ship,
    deliver,
    isConfirming,
    isCancelling,
    isShipping,
    isDelivering,
  } = useOrder(isNewOrder ? undefined : id);
  const { timeline, loading: timelineLoading } = useOrderTimeline(isNewOrder ? undefined : id);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = () => {
    if (!order) return;
    setIsDownloading(true);
    try {
      printOrder(order);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // For new orders, show a placeholder
  if (isNewOrder) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate('/dashboard/orders')}
              className="p-2.5 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Create New Order</h1>
              <p className="text-[#666] mt-1">Create a new order from scratch or convert from a quote</p>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-12 shadow-sm border border-black/5 text-center">
            <ShoppingCart className="w-12 h-12 text-[#999] mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">Order Creation</h3>
            <p className="text-[#666] mb-6">
              To create a new order, convert an accepted quote from the Quotes page or create one directly.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/dashboard/quotes')}
                className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
              >
                Go to Quotes
              </button>
              <button
                onClick={() => navigate('/dashboard/orders')}
                className="px-5 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm"
              >
                View Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleConfirm = async () => {
    try {
      await confirm();
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason !== null) {
      try {
        await cancel(reason || undefined);
      } catch (err) {
        // Error handled by hook
      }
    }
  };

  const handleShip = async () => {
    const trackingNumber = window.prompt('Tracking number (optional):');
    if (trackingNumber !== null) {
      try {
        await ship({ trackingNumber: trackingNumber || undefined });
      } catch (err) {
        // Error handled by hook
      }
    }
  };

  const handleDeliver = () => {
    setShowDeliverConfirm(true);
  };

  const confirmDeliver = async () => {
    try {
      await deliver();
    } catch (err) {
      // Error handled by hook
    } finally {
      setShowDeliverConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <Skeleton className="h-10 w-64 rounded-2xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-[24px]" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-[32px]" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 rounded-[32px]" />
              <Skeleton className="h-48 rounded-[32px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-700">{error || 'Order not found'}</p>
            <button
              onClick={() => navigate('/dashboard/orders')}
              className="mt-2 text-red-600 hover:text-red-800 font-medium"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusCfg = statusConfig[order.status];
  const paymentCfg = paymentStatusConfig[order.paymentStatus];

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/orders')}
              className="p-2.5 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">{order.orderNumber}</h1>
                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${statusCfg.color}`}>
                  {statusCfg.icon}
                  {statusCfg.label}
                </span>
              </div>
              {order.name && (
                <p className="text-[#666] mt-1">{order.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order.status === 'DRAFT' && (
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 font-medium text-sm disabled:opacity-50"
              >
                {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Order
              </button>
            )}
            {order.status === 'CONFIRMED' || order.status === 'PROCESSING' ? (
              <button
                onClick={handleShip}
                disabled={isShipping}
                className="px-5 py-2.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium text-sm disabled:opacity-50"
              >
                {isShipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                Mark Shipped
              </button>
            ) : null}
            {order.status === 'SHIPPED' && (
              <button
                onClick={handleDeliver}
                disabled={isDelivering}
                className="px-5 py-2.5 rounded-full bg-[#93C01F] text-white hover:bg-[#7BA019] transition-colors flex items-center gap-2 font-medium text-sm disabled:opacity-50"
              >
                {isDelivering ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Mark Delivered
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2.5 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] rounded-full transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showActions && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-lg border border-black/5 z-10 overflow-hidden">
                  <button
                    onClick={() => {
                      handleDownloadPdf();
                      setShowActions(false);
                    }}
                    disabled={isDownloading}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-[#F8F8F6] flex items-center gap-2 text-[#1A1A1A] disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/dashboard/orders/${order.id}/edit`);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-[#F8F8F6] flex items-center gap-2 text-[#1A1A1A]"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Order
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(order.orderNumber);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-[#F8F8F6] flex items-center gap-2 text-[#1A1A1A]"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Order Number
                  </button>
                  {!['CANCELLED', 'COMPLETED', 'DELIVERED'].includes(order.status) && (
                    <button
                      onClick={() => {
                        handleCancel();
                        setShowActions(false);
                      }}
                      disabled={isCancelling}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Order
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5">
                <p className="text-sm text-[#666] mb-1">Subtotal</p>
                <p className="text-lg font-semibold text-[#1A1A1A]">
                  {formatCurrency(order.subtotal, order.currency)}
                </p>
              </div>
              <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5">
                <p className="text-sm text-[#666] mb-1">Discount</p>
                <p className="text-lg font-semibold text-[#1A1A1A]">
                  {formatCurrency(order.discount || 0, order.currency)}
                </p>
              </div>
              <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5">
                <p className="text-sm text-[#666] mb-1">Tax</p>
                <p className="text-lg font-semibold text-[#1A1A1A]">
                  {formatCurrency(order.tax || 0, order.currency)}
                </p>
              </div>
              <div className="bg-[#1A1A1A] rounded-[24px] p-4">
                <p className="text-sm text-white/60 mb-1">Total</p>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(order.total, order.currency)}
                </p>
              </div>
            </div>

            {/* Tabs */}
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

                    {order.trackingNumber && (
                      <div>
                        <h4 className="font-medium text-[#1A1A1A] mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#999]" />
                          Tracking
                        </h4>
                        <p className="text-sm text-[#666]">
                          {order.trackingNumber}
                          {order.trackingUrl && (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-[#1A1A1A] hover:text-[#EAD07D] inline-flex items-center gap-1 font-medium"
                            >
                              Track <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </p>
                      </div>
                    )}

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
          </div>

          {/* Sidebar */}
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
                    <p className="text-sm font-medium text-[#1A1A1A]">{order.account?.name || '-'}</p>
                  </div>
                </div>

                {order.contact && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
                      <User className="w-4 h-4 text-[#999]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#999]">Contact</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {order.contact.firstName} {order.contact.lastName}
                      </p>
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
        </div>

        {/* Click outside to close menu */}
        {showActions && (
          <div className="fixed inset-0 z-0" onClick={() => setShowActions(false)} />
        )}

        <ConfirmationModal
          isOpen={showDeliverConfirm}
          onClose={() => setShowDeliverConfirm(false)}
          onConfirm={confirmDeliver}
          title="Mark as Delivered"
          message="Are you sure you want to mark this order as delivered? This will update the order status."
          confirmLabel="Mark Delivered"
          variant="info"
          loading={isDelivering}
        />
      </div>
    </div>
  );
}
