import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  Truck,
  Loader2,
  Download,
  Copy,
  Edit2,
  MoreVertical,
  XCircle,
} from 'lucide-react';
import ConfirmationModal from '../../src/components/ui/ConfirmationModal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useOrder, useOrderTimeline } from '../../src/hooks/useOrders';
import { printOrder } from '../../src/utils/orderPdfGenerator';
import {
  OrderBarcode,
  OrderStatusTracker,
  EditOrderModal,
  OrderInfoSidebar,
  OrderTabs,
  statusConfig,
  formatCurrency,
} from '../../src/components/orders';
import { useToast } from '../../src/components/ui/Toast';

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
    update,
    confirm,
    cancel,
    ship,
    deliver,
    isUpdating,
    isConfirming,
    isCancelling,
    isShipping,
    isDelivering,
  } = useOrder(isNewOrder ? undefined : id);
  const { timeline, loading: timelineLoading } = useOrderTimeline(isNewOrder ? undefined : id);
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleDownloadPdf = () => {
    if (!order) return;
    setIsDownloading(true);
    try {
      printOrder(order);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showToast({ type: 'error', title: 'Failed to Generate PDF', message: (err as Error).message || 'Please try again' });
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

  const statusCfg = statusConfig[order.status] || { label: order.status || 'Unknown', color: 'bg-[#F8F8F6] text-[#666]', icon: null };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4 mb-8">
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
              <div className="mt-3">
                <OrderBarcode orderNumber={order.orderNumber} size="sm" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                      setShowEditModal(true);
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

            {/* Status Tracker */}
            <OrderStatusTracker
              status={order.status}
              orderDate={order.orderDate}
              shippedDate={order.shippedDate}
              deliveredDate={order.deliveredDate}
              expectedDeliveryDate={order.expectedDeliveryDate}
            />

            {/* Tabs */}
            <OrderTabs
              order={order}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              timeline={timeline}
              timelineLoading={timelineLoading}
            />
          </div>

          {/* Sidebar */}
          <OrderInfoSidebar order={order} />
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

        {/* Edit Order Modal */}
        <EditOrderModal
          isOpen={showEditModal}
          order={order}
          onClose={() => setShowEditModal(false)}
          onUpdate={update}
          isUpdating={isUpdating}
        />
      </div>
    </div>
  );
}
