import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  style,
}) => {
  return (
    <div
      className={`rounded-xl transition-all duration-150 ${hover ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--glass-border)',
        ...style,
      }}
      onMouseEnter={hover ? e => {
        e.currentTarget.style.background = 'var(--card-hover, var(--card-bg))';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      } : undefined}
      onMouseLeave={hover ? e => {
        e.currentTarget.style.background = 'var(--card-bg)';
        e.currentTarget.style.boxShadow = 'none';
      } : undefined}
    >
      {children}
    </div>
  );
};
