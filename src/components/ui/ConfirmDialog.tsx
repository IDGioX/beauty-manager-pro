import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const variantColors: Record<string, string> = {
    danger: 'var(--color-danger)',
    warning: 'var(--color-warning, #f59e0b)',
    info: 'var(--color-primary)',
  };

  return (
    <div className="fixed inset-0 z-[102] flex items-start justify-center p-4 pt-[15vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, ${variantColors[variant]} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${variantColors[variant]} 25%, transparent)`,
              }}
            >
              <AlertTriangle size={20} style={{ color: variantColors[variant] }} />
            </div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>
            {message.replace(/\\n/g, '\n')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
            size="lg"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="flex-1"
            size="lg"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
