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
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none group-focus-within:text-primary-500 transition-colors">
              {icon}
            </div>
          )}
          {/* Dropdown arrow icon */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <select
            ref={ref}
            className={`
              w-full ${icon ? 'pl-10' : 'pl-4'} pr-10 py-3
              bg-white dark:bg-gray-800 border-2 rounded-xl
              text-base font-normal text-gray-900 dark:text-gray-100
              font-sans
              transition-all duration-200
              appearance-none cursor-pointer
              focus:outline-none focus:ring-4 focus:ring-offset-0
              hover:border-gray-300 dark:hover:border-gray-500
              disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60
              ${error
                ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/50'
                : 'border-gray-200 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-100 dark:focus:ring-primary-900/50'
              }
              ${className}
            `}
            style={{
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}
            {...props}
          >
            {options ? (
              <>
                <option value="" style={{ fontFamily: 'inherit' }}>Seleziona un'opzione...</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ fontFamily: 'inherit', padding: '8px' }}>
                    {opt.label}
                  </option>
                ))}
              </>
            ) : (
              children
            )}
          </select>
        </div>
        {error && (
          <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
