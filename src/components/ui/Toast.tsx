import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-4 fade-in">
      <div
        className={`
          min-w-[300px] max-w-md rounded-lg shadow-lg border p-4 flex items-start gap-3
          ${
            type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }
        `}
      >
        {type === 'success' ? (
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        )}

        <p
          className={`flex-1 text-sm font-medium whitespace-pre-line ${
            type === 'success' ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
          }`}
        >
          {message.replace(/\\n/g, '\n')}
        </p>

        <button
          onClick={onClose}
          className={`
            flex-shrink-0 rounded p-1 transition-colors
            ${
              type === 'success'
                ? 'hover:bg-green-100 dark:hover:bg-green-800 text-green-600 dark:text-green-400'
                : 'hover:bg-red-100 dark:hover:bg-red-800 text-red-600 dark:text-red-400'
            }
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
