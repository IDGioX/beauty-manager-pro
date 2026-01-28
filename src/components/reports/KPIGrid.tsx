import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface KPIData {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
}

interface KPIGridProps {
  kpis: KPIData[];
  loading?: boolean;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ kpis, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse"
          >
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {kpi.title}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {kpi.value}
            </p>
            {kpi.subtitle && (
              <p className="text-xs text-gray-400 mt-1">{kpi.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
