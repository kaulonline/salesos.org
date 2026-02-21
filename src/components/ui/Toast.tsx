import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toastOrMessage: Omit<Toast, 'id'> | string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const toastConfig: Record<ToastType, { icon: React.ElementType; bg: string; iconBg: string; iconColor: string; borderColor: string }> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-white',
    iconBg: 'bg-[#93C01F]/20',
    iconColor: 'text-[#93C01F]',
    borderColor: 'border-[#93C01F]/30',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-white',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    borderColor: 'border-red-200',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-white',
    iconBg: 'bg-[#EAD07D]/20',
    iconColor: 'text-[#1A1A1A]',
    borderColor: 'border-[#EAD07D]/30',
  },
  info: {
    icon: Info,
    bg: 'bg-white',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-200',
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = toastConfig[toast.type] || toastConfig.info;
  const Icon = config.icon;
  const isAlert = toast.type === 'error' || toast.type === 'warning';

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onDismiss]);

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      className={`${config.bg} rounded-2xl shadow-lg border ${config.borderColor} p-4 flex items-start gap-3 min-w-[320px] max-w-[420px] animate-in slide-in-from-right fade-in duration-300`}
    >
      <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`} aria-hidden="true">
        <Icon size={20} className={config.iconColor} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-medium text-[#1A1A1A] text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-[#666] mt-0.5 line-clamp-2">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label={`Dismiss ${toast.type} notification`}
        className="p-1 text-[#999] hover:text-[#1A1A1A] transition-colors flex-shrink-0"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toastOrMessage: Omit<Toast, 'id'> | string, type?: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    // Coerce non-string, non-plain-object values (e.g. arrays from NestJS validation) to string
    let toast: Toast;
    if (typeof toastOrMessage === 'string') {
      toast = { id, type: type || 'info', title: toastOrMessage };
    } else if (Array.isArray(toastOrMessage) || typeof toastOrMessage !== 'object' || toastOrMessage === null) {
      toast = { id, type: type || 'error', title: String(toastOrMessage) };
    } else {
      toast = { ...toastOrMessage, id };
    }
    // Ensure type is always valid
    if (!toastConfig[toast.type]) {
      toast.type = 'info';
    }
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      {/* Toast Container */}
      <div
        aria-label="Notifications"
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
