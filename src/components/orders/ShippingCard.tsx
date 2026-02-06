import React, { useState } from 'react';
import { Package, ExternalLink, Copy, Check, Truck, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { detectCarrier, getTrackingUrl, type CarrierInfo } from '../../utils/carrierDetector';

export interface ShippingCardProps {
  trackingNumber?: string;
  trackingUrl?: string;
  shippedDate?: string;
  expectedDeliveryDate?: string;
  deliveredDate?: string;
  carrier?: string;
  className?: string;
}

export const ShippingCard: React.FC<ShippingCardProps> = ({
  trackingNumber,
  trackingUrl,
  shippedDate,
  expectedDeliveryDate,
  deliveredDate,
  carrier: carrierOverride,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const detectedCarrier = trackingNumber ? detectCarrier(trackingNumber) : null;
  const finalTrackingUrl = getTrackingUrl(trackingNumber || '', trackingUrl);

  const handleCopy = async () => {
    if (trackingNumber) {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!trackingNumber && !shippedDate && !expectedDeliveryDate) {
    return (
      <div className={`bg-white rounded-[24px] p-5 shadow-sm border border-black/5 ${className}`}>
        <h4 className="font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-[#999]" />
          Shipping
        </h4>
        <div className="flex items-center justify-center py-6 text-center">
          <div>
            <Truck className="w-10 h-10 text-[#999] mx-auto mb-2 opacity-40" />
            <p className="text-sm text-[#666]">No shipping information yet</p>
          </div>
        </div>
      </div>
    );
  }

  const carrierName = carrierOverride || detectedCarrier?.name || 'Unknown Carrier';

  return (
    <div className={`bg-white rounded-[24px] p-5 shadow-sm border border-black/5 ${className}`}>
      <h4 className="font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
        <Package className="w-4 h-4 text-[#999]" />
        Shipping
      </h4>

      <div className="space-y-4">
        {/* Carrier Badge */}
        {trackingNumber && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {detectedCarrier ? (
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: detectedCarrier.bgColor,
                    color: detectedCarrier.color,
                  }}
                >
                  {detectedCarrier.name}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F8F8F6] text-[#666]">
                  {carrierName}
                </span>
              )}
            </div>
            {deliveredDate && (
              <span className="px-3 py-1 bg-[#93C01F]/20 text-[#93C01F] rounded-full text-xs font-semibold">
                Delivered
              </span>
            )}
          </div>
        )}

        {/* Tracking Number */}
        {trackingNumber && (
          <div>
            <p className="text-xs text-[#999] mb-1">Tracking Number</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-[#F8F8F6] rounded-lg text-sm font-mono text-[#1A1A1A] truncate">
                {trackingNumber}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
                title="Copy tracking number"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#93C01F]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              {finalTrackingUrl && (
                <a
                  href={finalTrackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
                  title="Track package"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          {shippedDate && (
            <div className="p-3 bg-[#F8F8F6] rounded-xl">
              <div className="flex items-center gap-2 text-[#999] mb-1">
                <Truck className="w-3 h-3" />
                <span className="text-xs">Shipped</span>
              </div>
              <p className="text-sm font-medium text-[#1A1A1A]">
                {format(new Date(shippedDate), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {deliveredDate ? (
            <div className="p-3 bg-[#93C01F]/10 rounded-xl">
              <div className="flex items-center gap-2 text-[#93C01F] mb-1">
                <Check className="w-3 h-3" />
                <span className="text-xs">Delivered</span>
              </div>
              <p className="text-sm font-medium text-[#1A1A1A]">
                {format(new Date(deliveredDate), 'MMM d, yyyy')}
              </p>
            </div>
          ) : expectedDeliveryDate ? (
            <div className="p-3 bg-[#EAD07D]/10 rounded-xl">
              <div className="flex items-center gap-2 text-[#1A1A1A] mb-1">
                <Calendar className="w-3 h-3" />
                <span className="text-xs">Expected</span>
              </div>
              <p className="text-sm font-medium text-[#1A1A1A]">
                {format(new Date(expectedDeliveryDate), 'MMM d, yyyy')}
              </p>
            </div>
          ) : null}
        </div>

        {/* Track Button */}
        {finalTrackingUrl && (
          <a
            href={finalTrackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
          >
            <Truck className="w-4 h-4" />
            Track Package
          </a>
        )}
      </div>
    </div>
  );
};

export default ShippingCard;
