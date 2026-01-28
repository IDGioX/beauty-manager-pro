import React, { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-2.5
            bg-white dark:bg-gray-800 border-2 rounded-xl
            text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-900
            disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 disabled:cursor-not-allowed
            resize-none
            ${error
              ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900'
              : 'border-gray-200 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-100 dark:focus:ring-primary-900'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
