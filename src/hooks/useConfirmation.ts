import { useState, useCallback } from 'react';
import type { ConfirmationVariant } from '../components/ui/ConfirmationModal';

export interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: ConfirmationVariant;
  onConfirm: () => void | Promise<void>;
}

const defaultState: ConfirmationState = {
  isOpen: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'danger',
  onConfirm: () => {},
};

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
}

export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>(defaultState);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        variant: options.variant || 'danger',
        onConfirm: () => resolve(true),
      });
    });
  }, []);

  const close = useCallback(() => {
    setState(defaultState);
    setLoading(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await state.onConfirm();
    } finally {
      close();
    }
  }, [state.onConfirm, close]);

  return {
    state,
    loading,
    confirm,
    close,
    handleConfirm,
  };
}

export default useConfirmation;
