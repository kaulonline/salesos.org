import React from 'react';
import Barcode from 'react-barcode';

export interface OrderBarcodeProps {
  orderNumber: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 1.2, height: 30, fontSize: 10 },
  md: { width: 1.5, height: 40, fontSize: 12 },
  lg: { width: 2, height: 50, fontSize: 14 },
};

export const OrderBarcode: React.FC<OrderBarcodeProps> = ({
  orderNumber,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const config = sizeConfig[size];

  if (!orderNumber) {
    return null;
  }

  return (
    <div
      className={`inline-flex flex-col items-center bg-white rounded-xl p-3 border border-black/5 ${className}`}
    >
      <Barcode
        value={orderNumber}
        format="CODE128"
        width={config.width}
        height={config.height}
        fontSize={config.fontSize}
        displayValue={showLabel}
        background="#FFFFFF"
        lineColor="#1A1A1A"
        margin={4}
        textMargin={4}
      />
    </div>
  );
};

export default OrderBarcode;
