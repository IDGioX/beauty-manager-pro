import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          style={{
            background: 'var(--input-bg, var(--card-bg))',
            border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--glass-border)'}`,
            color: 'var(--color-text-primary)',
            boxShadow: error ? '0 0 0 2px color-mix(in srgb, var(--color-danger) 15%, transparent)' : 'none',
          }}
          onFocus={e => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent)';
            }
          }}
          onBlur={e => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--glass-border)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs font-medium" style={{ color: 'var(--color-danger)' }}>{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
