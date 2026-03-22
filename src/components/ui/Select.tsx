import React, { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  icon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, icon, className = '', children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
              {icon}
            </div>
          )}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <select
            ref={ref}
            className={`w-full ${icon ? 'pl-10' : 'pl-3.5'} pr-10 py-2.5 rounded-xl text-sm appearance-none cursor-pointer transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
          >
            {options ? (
              <>
                <option value="">Seleziona...</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </>
            ) : (
              children
            )}
          </select>
        </div>
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

Select.displayName = 'Select';
