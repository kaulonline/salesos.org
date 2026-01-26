import React from 'react';
import { X, AlertTriangle, Trash2, Shield, Info } from 'lucide-react';

export type ConfirmationVariant = 'danger' | 'warning' | 'info';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  loading?: boolean;
}

const variantConfig: Record<ConfirmationVariant, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  buttonBg: string;
  buttonHover: string;
}> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    buttonBg: 'bg-yellow-600',
    buttonHover: 'hover:bg-yellow-700',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
  },
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center mx-auto mb-4`}>
            <Icon size={24} className={config.iconColor} />
          </div>

          {/* Title */}
          <h3 className="text-xl font-medium text-[#1A1A1A] text-center mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-[#666] text-center text-sm">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-full ${config.buttonBg} text-white ${config.buttonHover} transition-colors font-medium disabled:opacity-50`}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
