import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: 'primary' | 'blue' | 'purple' | 'orange' | 'none';
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  gradient = 'none',
  glass: _glass = false,
}) => {
  const gradients = {
    primary: 'bg-gray-900 dark:bg-gray-100',
    blue: 'bg-blue-600',
    purple: 'bg-indigo-600',
    orange: 'bg-amber-500',
    none: 'bg-white dark:bg-gray-900',
  };

  const borderClass = gradient === 'none'
    ? 'border border-gray-200/80 dark:border-gray-800'
    : '';

  return (
    <div
      className={`
        ${gradients[gradient]}
        rounded-xl shadow-sm
        ${borderClass}
        transition-all duration-150
        ${hover ? 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700' : ''}
        ${gradient !== 'none' ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-gray-100'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
