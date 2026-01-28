import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Euro,
  Users,
  UserPlus,
} from 'lucide-react';
import { DateRangePicker, DateRange } from './DateRangePicker';
import { KPIGrid, KPIData } from './KPIGrid';
import { TreatmentChart } from './charts/TreatmentChart';
import { DailyReport } from './DailyReport';
import { analyticsService } from '../../services/analytics';
import {
  PeriodAnalytics,
  TrattamentoStats,
  ClienteTopRicavo,
} from '../../services/analytics';
import { startOfMonth, endOfMonth } from 'date-fns';

export const GeneralReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    data_inizio: startOfMonth(new Date()).toISOString(),
    data_fine: endOfMonth(new Date()).toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [periodAnalytics, setPeriodAnalytics] = useState<PeriodAnalytics | null>(null);
  const [trattamentiStats, setTrattamentiStats] = useState<TrattamentoStats[]>([]);
  const [clientiRicavo, setClientiRicavo] = useState<ClienteTopRicavo[]>([]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [period, trattamenti, ricavo] = await Promise.all([
        analyticsService.getPeriodAnalytics(dateRange),
        analyticsService.getTrattamentiPiuUsati(dateRange, 10),
        analyticsService.getClientiTopRicavo(dateRange, 5),
      ]);

      setPeriodAnalytics(period);
      setTrattamentiStats(trattamenti);
      setClientiRicavo(ricavo);
    } catch (error) {
      console.error('Errore caricamento analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildKPIs = (): KPIData[] => {
    if (!periodAnalytics) return [];

    return [
      {
        title: 'Fatturato',
        value: `€${periodAnalytics.ricavo_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        icon: Euro,
        color: 'bg-green-500',
        subtitle: `Media €${periodAnalytics.ricavo_medio.toFixed(0)}/app.`,
      },
      {
        title: 'Appuntamenti',
        value: periodAnalytics.totale_appuntamenti,
        icon: Calendar,
        color: 'bg-blue-500',
      },
      {
        title: 'Clienti',
        value: periodAnalytics.clienti_unici,
        icon: Users,
        color: 'bg-orange-500',
      },
      {
        title: 'Nuovi Clienti',
        value: periodAnalytics.nuovi_clienti,
        icon: UserPlus,
        color: 'bg-pink-500',
      },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Daily Report */}
      <DailyReport />

      {/* Date Range Picker */}
      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {/* KPI Grid */}
      <KPIGrid kpis={buildKPIs()} loading={loading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treatment Chart */}
        <TreatmentChart data={trattamentiStats} loading={loading} />

        {/* Top Clients by Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <Users size={16} className="text-gray-400" />
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Top Clienti
            </h3>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
              ))}
            </div>
          ) : clientiRicavo.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              Nessun dato disponibile
            </div>
          ) : (
            <div className="space-y-2">
              {clientiRicavo.map((cliente, index) => (
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
      </div>
    </div>
  );
};
