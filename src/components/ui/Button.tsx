import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm gap-1',
  md: 'px-4 py-2 text-sm gap-1.5',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const base = `inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]}`;

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-primary)',
      color: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    },
    secondary: {
      background: 'var(--glass-border)',
      color: 'var(--color-text-primary)',
    },
    success: {
      background: 'var(--color-success)',
      color: '#fff',
    },
    danger: {
      background: 'var(--color-danger)',
      color: '#fff',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-secondary)',
    },
    glass: {
      background: 'var(--card-bg)',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--glass-border)',
    },
  };

  return (
    <button
      className={`${base} ${className}`}
      disabled={disabled || loading}
      style={{ ...variantStyles[variant], ...style }}
      onMouseEnter={e => {
        if (disabled || loading) return;
        if (variant === 'primary') e.currentTarget.style.filter = 'brightness(0.9)';
        else if (variant === 'ghost') e.currentTarget.style.background = 'var(--glass-border)';
        else if (variant === 'glass') e.currentTarget.style.background = 'var(--card-hover, var(--card-bg))';
        else e.currentTarget.style.filter = 'brightness(0.9)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = '';
        e.currentTarget.style.background = (variantStyles[variant].background as string) || '';
      }}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};
