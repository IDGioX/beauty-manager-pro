import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, Toast as ToastType, ToastType as ToastVariant } from '../../stores/toastStore';

// Configurazione visiva per ogni tipo di toast
const toastConfig: Record<ToastVariant, { icon: React.ReactNode; color: string; bgColor: string }> = {
  success: {
    icon: <CheckCircle size={20} />,
    color: 'var(--color-success)',
    bgColor: 'color-mix(in srgb, var(--color-success) 10%, var(--card-bg))',
  },
  error: {
    icon: <XCircle size={20} />,
    color: 'var(--color-danger)',
    bgColor: 'color-mix(in srgb, var(--color-danger) 10%, var(--card-bg))',
  },
  warning: {
    icon: <AlertTriangle size={20} />,
    color: 'var(--color-warning)',
    bgColor: 'color-mix(in srgb, var(--color-warning) 10%, var(--card-bg))',
  },
  info: {
    icon: <Info size={20} />,
    color: 'var(--color-primary)',
    bgColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--card-bg))',
  },
};

interface ToastItemProps {
  toast: ToastType;
  onRemove: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = toastConfig[toast.type];
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onRemove, 200);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-200 ${
        isExiting ? 'opacity-0 translate-x-4 scale-95' : 'opacity-100 translate-x-0 scale-100'
      }`}
      style={{
        background: config.bgColor,
        border: `1px solid color-mix(in srgb, ${config.color} 20%, transparent)`,
        backdropFilter: 'blur(12px)',
        animation: isExiting ? 'none' : 'toast-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Progress bar */}
      {duration > 0 && (
        <div
          className="absolute top-0 left-0 h-0.5 transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${config.color}, color-mix(in srgb, ${config.color} 60%, transparent))`,
          }}
        />
      )}

      <div className="flex items-start gap-3 p-4">
        {/* Icon with subtle animation */}
        <div
          className="flex-shrink-0 mt-0.5"
          style={{
            color: config.color,
            animation: 'icon-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {toast.title}
          </p>
          {toast.message && (
            <p
              className="text-sm mt-0.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {toast.message}
            </p>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                handleClose();
              }}
              className="mt-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: config.color }}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/5 hover:scale-110"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

/**
 * ToastContainer - Renderizza tutti i toast attivi
 * Posizionato in basso a destra dello schermo
 */
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <>
      <style>{`
        @keyframes toast-enter {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
          }
          60% {
            transform: translateX(-8px) scale(1.02);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes icon-pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <div
        className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </>
  );
};

// ============================================
// Legacy Toast component (per backward compatibility)
// ============================================

interface LegacyToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: LegacyToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = type === 'success' ? toastConfig.success : toastConfig.error;

  return (
    <div className="fixed top-4 right-4 z-[200]">
      <div
        className="min-w-[300px] max-w-md rounded-xl shadow-lg p-4 flex items-start gap-3"
        style={{
          background: config.bgColor,
          border: `1px solid color-mix(in srgb, ${config.color} 20%, transparent)`,
          backdropFilter: 'blur(12px)',
          animation: 'toast-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes toast-enter {
            from {
              opacity: 0;
              transform: translateY(-20px) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>

        <div style={{ color: config.color }} className="flex-shrink-0 mt-0.5">
          {config.icon}
        </div>

        <p
          className="flex-1 text-sm font-medium whitespace-pre-line"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {message.replace(/\\n/g, '\n')}
        </p>

        <button
          onClick={onClose}
          className="flex-shrink-0 rounded p-1 transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:scale-110"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
