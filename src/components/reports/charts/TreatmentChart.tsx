import React from 'react';
import { Scissors } from 'lucide-react';
import { TrattamentoStats } from '../../../services/analytics';

interface TreatmentChartProps {
  data: TrattamentoStats[];
  loading?: boolean;
}

export const TreatmentChart: React.FC<TreatmentChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
              <div className="h-8 bg-gray-100 dark:bg-gray-900 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Get max value for scaling
  const maxAppuntamenti = Math.max(...data.map(d => d.totale_appuntamenti), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-6">
        <Scissors size={16} className="text-gray-400" />
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Top Trattamenti
        </h3>
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          Nessun dato disponibile
        </div>
      ) : (
        <div className="space-y-4">
          {data.slice(0, 6).map((item, index) => {
            const percentage = (item.totale_appuntamenti / maxAppuntamenti) * 100;
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate pr-4">
                    {item.trattamento_nome}
                  </span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.totale_appuntamenti}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">
                      €{item.ricavo_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
