import { useState, useCallback, useEffect } from 'react';
import { paymentsApi, adminPaymentsApi } from '../api';
import type {
  BillingCustomer,
  Subscription,
  Invoice,
  PaymentMethod,
  Coupon,
  Payment,
  PaymentsDashboard,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentGateway,
  GatewayConfig,
  UpdateGatewayConfigDto,
} from '../api/payments';

// ============= Billing Customer Hook =============

export function useBillingCustomer() {
  const [customer, setCustomer] = useState<BillingCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomer = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await paymentsApi.getBillingCustomer();
      setCustomer(data);
    } catch (err) {
      console.error('Failed to fetch billing customer:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const updateCustomer = async (data: Partial<BillingCustomer>) => {
    try {
      const updated = await paymentsApi.updateBillingCustomer(data);
      setCustomer(updated);
      return updated;
    } catch (err) {
      console.error('Failed to update billing customer:', err);
      throw err;
    }
  };

  const openCustomerPortal = async () => {
    try {
      const session = await paymentsApi.createCustomerPortalSession();
      window.open(session.url, '_blank');
      return session;
    } catch (err) {
      console.error('Failed to create customer portal session:', err);
      throw err;
    }
  };

  return {
    customer,
    loading,
    error,
    refetch: fetchCustomer,
    updateCustomer,
    openCustomerPortal,
  };
}

// ============= Subscriptions Hook =============

export function useSubscriptions(initialParams?: {
  page?: number;
  limit?: number;
  status?: SubscriptionStatus;
}) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async (params?: typeof initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentsApi.getSubscriptions({
        page: params?.page || page,
        limit: params?.limit || 10,
        status: params?.status,
      });
      setSubscriptions(response.data);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setError('Failed to load subscriptions');
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSubscriptions(initialParams);
  }, []);

  const cancelSubscription = async (id: string, immediately = false, reason?: string) => {
    try {
      const updated = await paymentsApi.cancelSubscription(id, { immediately, reason });
      setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      throw err;
    }
  };

  const resumeSubscription = async (id: string) => {
    try {
      const updated = await paymentsApi.resumeSubscription(id);
      setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err) {
      console.error('Failed to resume subscription:', err);
      throw err;
    }
  };

  const changePlan = async (id: string, newLicenseTypeId: string, billingCycle?: 'monthly' | 'yearly') => {
    try {
      const updated = await paymentsApi.changeSubscriptionPlan(id, { newLicenseTypeId, billingCycle });
      setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err) {
      console.error('Failed to change subscription plan:', err);
      throw err;
    }
  };

  return {
    subscriptions,
    total,
    page,
    setPage,
    loading,
    error,
    refetch: fetchSubscriptions,
    cancelSubscription,
    resumeSubscription,
    changePlan,
  };
}

// ============= Invoices Hook =============

export function useInvoices(initialParams?: {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async (params?: typeof initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentsApi.getInvoices({
        page: params?.page || page,
        limit: params?.limit || 10,
        status: params?.status,
      });
      setInvoices(response.data);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError('Failed to load invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInvoices(initialParams);
  }, []);

  return {
    invoices,
    total,
    page,
    setPage,
    loading,
    error,
    refetch: fetchInvoices,
  };
}

// ============= Payment Methods Hook =============

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await paymentsApi.getPaymentMethods();
      setPaymentMethods(data);
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
      setError('Failed to load payment methods');
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const addPaymentMethod = async (paymentMethodId: string, gateway: 'STRIPE' | 'RAZORPAY', setAsDefault = false) => {
    try {
      const newMethod = await paymentsApi.addPaymentMethod({ paymentMethodId, gateway, setAsDefault });
      setPaymentMethods(prev => [...prev, newMethod]);
      return newMethod;
    } catch (err) {
      console.error('Failed to add payment method:', err);
      throw err;
    }
  };

  const removePaymentMethod = async (id: string) => {
    try {
      await paymentsApi.removePaymentMethod(id);
      setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
    } catch (err) {
      console.error('Failed to remove payment method:', err);
      throw err;
    }
  };

  const setDefaultPaymentMethod = async (id: string) => {
    try {
      await paymentsApi.setDefaultPaymentMethod(id);
      setPaymentMethods(prev => prev.map(pm => ({
        ...pm,
        isDefault: pm.id === id,
      })));
    } catch (err) {
      console.error('Failed to set default payment method:', err);
      throw err;
    }
  };

  return {
    paymentMethods,
    loading,
    error,
    refetch: fetchPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
  };
}

// ============= Checkout Hook =============

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = async (
    licenseTypeId: string,
    billingCycle: 'monthly' | 'yearly',
    options?: {
      couponCode?: string;
      gateway?: 'STRIPE' | 'RAZORPAY';
    }
  ) => {
    try {
      setLoading(true);
      setError(null);
      const session = await paymentsApi.createCheckoutSession({
        licenseTypeId,
        billingCycle,
        couponCode: options?.couponCode,
        gateway: options?.gateway,
      });
      return session;
    } catch (err: any) {
      console.error('Failed to create checkout session:', err);
      setError(err.response?.data?.message || 'Failed to create checkout session');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const validateCoupon = async (code: string, licenseTypeId?: string, amount?: number) => {
    try {
      const result = await paymentsApi.validateCoupon({ code, licenseTypeId, amount });
      return result;
    } catch (err) {
      console.error('Failed to validate coupon:', err);
      return { valid: false, message: 'Failed to validate coupon' };
    }
  };

  const createPortalSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const session = await paymentsApi.createCustomerPortalSession();
      return session;
    } catch (err: any) {
      console.error('Failed to create portal session:', err);
      setError(err.response?.data?.message || 'Failed to open billing portal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createCheckoutSession,
    validateCoupon,
    createPortalSession,
  };
}

// ============= Admin Payment Dashboard Hook =============

export function usePaymentsDashboard() {
  const [dashboard, setDashboard] = useState<PaymentsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminPaymentsApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to fetch payments dashboard:', err);
      setError('Failed to load payment analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboard,
    loading,
    error,
    refetch: fetchDashboard,
  };
}

// ============= Admin Transactions Hook =============

export function useTransactions(initialParams?: {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}) {
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (params?: typeof initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminPaymentsApi.getTransactions({
        page: params?.page || page,
        limit: params?.limit || 20,
        status: params?.status,
        startDate: params?.startDate,
        endDate: params?.endDate,
      });
      setTransactions(response.data);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTransactions(initialParams);
  }, []);

  const refundPayment = async (id: string, amount?: number, reason?: string) => {
    try {
      const updated = await adminPaymentsApi.refundPayment(id, { amount, reason });
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      console.error('Failed to refund payment:', err);
      throw err;
    }
  };

  return {
    transactions,
    total,
    page,
    setPage,
    loading,
    error,
    refetch: fetchTransactions,
    refundPayment,
  };
}

// ============= Admin Coupons Hook =============

export function useCoupons(initialParams?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
}) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoupons = useCallback(async (params?: typeof initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminPaymentsApi.getCoupons({
        page: params?.page || page,
        limit: params?.limit || 20,
        isActive: params?.isActive,
      });
      setCoupons(response.data);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
      setError('Failed to load coupons');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCoupons(initialParams);
  }, []);

  const createCoupon = async (data: Parameters<typeof adminPaymentsApi.createCoupon>[0]) => {
    try {
      const newCoupon = await adminPaymentsApi.createCoupon(data);
      setCoupons(prev => [newCoupon, ...prev]);
      return newCoupon;
    } catch (err) {
      console.error('Failed to create coupon:', err);
      throw err;
    }
  };

  const updateCoupon = async (id: string, data: Partial<Coupon>) => {
    try {
      const updated = await adminPaymentsApi.updateCoupon(id, data);
      setCoupons(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      console.error('Failed to update coupon:', err);
      throw err;
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await adminPaymentsApi.deleteCoupon(id);
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete coupon:', err);
      throw err;
    }
  };

  return {
    coupons,
    total,
    page,
    setPage,
    loading,
    error,
    refetch: fetchCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
  };
}

// ============= Gateway Configuration Hook =============

export function useGatewayConfigs() {
  const [configs, setConfigs] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminPaymentsApi.getGatewayConfigs();
      setConfigs(data);
    } catch (err) {
      console.error('Failed to fetch gateway configs:', err);
      setError('Failed to load gateway configurations');
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const updateConfig = async (provider: PaymentGateway, data: UpdateGatewayConfigDto) => {
    try {
      const updated = await adminPaymentsApi.updateGatewayConfig(provider, data);
      setConfigs(prev => prev.map(c => c.provider === provider ? updated : c));
      return updated;
    } catch (err) {
      console.error('Failed to update gateway config:', err);
      throw err;
    }
  };

  const testConnection = async (provider: PaymentGateway) => {
    try {
      setTesting(provider);
      const result = await adminPaymentsApi.testGatewayConnection(provider);
      // Refetch to get updated connection status
      await fetchConfigs();
      return result;
    } catch (err) {
      console.error('Failed to test connection:', err);
      throw err;
    } finally {
      setTesting(null);
    }
  };

  return {
    configs,
    loading,
    error,
    testing,
    refetch: fetchConfigs,
    updateConfig,
    testConnection,
  };
}
