import React from 'react';
import { User, TrendingUp } from 'lucide-react';
import { ClienteTopFrequenza, ClienteTopRicavo } from '../../../services/analytics';

interface TopClientsTableProps {
  frequenzaData: ClienteTopFrequenza[];
  ricavoData: ClienteTopRicavo[];
  loading?: boolean;
}

export const TopClientsTable: React.FC<TopClientsTableProps> = ({
  frequenzaData,
  ricavoData,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-16 bg-gray-100 dark:bg-gray-900 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Clienti per Frequenza */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <User size={16} className="text-gray-400" />
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Top Clienti per Frequenza
          </h3>
        </div>

        {frequenzaData.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            Nessun dato disponibile
          </div>
        ) : (
          <div className="space-y-2">
            {frequenzaData.map((cliente, index) => (
              <div
                key={cliente.cliente_id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {cliente.nome} {cliente.cognome}
                  </p>
                  <p className="text-xs text-gray-500">
                    {cliente.totale_appuntamenti} appuntamenti
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  €{cliente.ricavo_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Clienti per Ricavo */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={16} className="text-gray-400" />
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Top Clienti per Ricavo
          </h3>
        </div>

        {ricavoData.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            Nessun dato disponibile
          </div>
        ) : (
          <div className="space-y-2">
            {ricavoData.map((cliente, index) => (
              <div
                key={cliente.cliente_id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {cliente.nome} {cliente.cognome}
                  </p>
                  <p className="text-xs text-gray-500">
                    {cliente.totale_appuntamenti} appuntamenti
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    €{cliente.ricavo_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-gray-400">
                    media €{cliente.ricavo_medio.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
