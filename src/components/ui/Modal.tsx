import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Scroll wrapper */}
      <div className="fixed inset-0 z-[101] overflow-y-auto pointer-events-none">
        <div className="min-h-full flex items-start justify-center p-4 pt-[6vh] pb-8">
          {/* Modal card */}
          <div
            className={`pointer-events-auto relative w-full ${sizes[size]} rounded-2xl shadow-2xl`}
            style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--glass-border, rgba(0,0,0,0.1))' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
              style={{ background: 'var(--sidebar-bg, #111827)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-[15px] font-semibold text-white tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[72vh] overflow-y-auto scrollbar-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
