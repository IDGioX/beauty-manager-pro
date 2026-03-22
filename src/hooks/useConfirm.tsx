import { useState, useCallback, useRef } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: () => void;
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Conferma',
    cancelText: 'Annulla',
    variant: 'danger',
    onConfirm: () => {},
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({
        isOpen: true,
        ...options,
        onConfirm: () => {
          resolve(true);
          resolveRef.current = null;
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        },
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirm,
    confirmState,
    handleCancel,
  };
};
