// Order Types for CPQ Phase 4

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'FAILED';

export type FulfillmentStatus = 'UNFULFILLED' | 'PARTIAL' | 'FULFILLED' | 'RETURNED';

export interface OrderLineItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productCode?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountPercent?: number;
  tax?: number;
  taxPercent?: number;
  totalPrice: number;
  fulfilledQuantity: number;
  returnedQuantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  attention?: string;
}

export interface Order {
  id: string;
  ownerId: string;
  orderNumber: string;
  name?: string;
  quoteId?: string;
  quote?: {
    id: string;
    name: string;
    quoteNumber?: string;
  };
  accountId: string;
  account?: {
    id: string;
    name: string;
  };
  contactId?: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  opportunityId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotal: number;
  discount?: number;
  discountPercent?: number;
  tax?: number;
  taxPercent?: number;
  shippingCost?: number;
  total: number;
  paidAmount: number;
  currency: string;
  billingAddress?: OrderAddress;
  shippingAddress?: OrderAddress;
  lineItems: OrderLineItem[];
  orderDate: string;
  shippedDate?: string;
  deliveredDate?: string;
  expectedDeliveryDate?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  internalNotes?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
  };
}

export interface CreateOrderDto {
  name?: string;
  accountId: string;
  contactId?: string;
  opportunityId?: string;
  billingAddress?: OrderAddress;
  shippingAddress?: OrderAddress;
  lineItems: CreateOrderLineItemDto[];
  discount?: number;
  discountPercent?: number;
  tax?: number;
  taxPercent?: number;
  shippingCost?: number;
  currency?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  internalNotes?: string;
  paymentTerms?: string;
}

export interface CreateOrderLineItemDto {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  discountPercent?: number;
  notes?: string;
}

export interface UpdateOrderDto {
  name?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  billingAddress?: OrderAddress;
  shippingAddress?: OrderAddress;
  discount?: number;
  discountPercent?: number;
  tax?: number;
  taxPercent?: number;
  shippingCost?: number;
  expectedDeliveryDate?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  internalNotes?: string;
  paymentTerms?: string;
  paymentMethod?: string;
}

export interface UpdateOrderLineItemDto {
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  discountPercent?: number;
  fulfilledQuantity?: number;
  returnedQuantity?: number;
  notes?: string;
}

export interface ConvertQuoteToOrderDto {
  quoteId: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  internalNotes?: string;
}

export interface FulfillOrderDto {
  lineItems: {
    lineItemId: string;
    quantity: number;
  }[];
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
}

export interface RecordPaymentDto {
  amount: number;
  paymentMethod: string;
  paymentDate?: string;
  reference?: string;
  notes?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  accountId?: string;
  quoteId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  minTotal?: number;
  maxTotal?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderStats {
  total: number;
  byStatus: Record<OrderStatus, number>;
  byPaymentStatus: Record<PaymentStatus, number>;
  byFulfillmentStatus: Record<FulfillmentStatus, number>;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  averageOrderValue: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
}

export interface OrderTimeline {
  id: string;
  orderId: string;
  action: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
  };
}
