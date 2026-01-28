import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Euro,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Scissors,
  Crown,
} from 'lucide-react';
import { analyticsService, PeriodAnalytics, TrattamentoStats, ClienteTopRicavo, SpesaMensile } from '../services/analytics';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format,
} from 'date-fns';
import { it } from 'date-fns/locale';

export const Report: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Today
  const [todayStats, setTodayStats] = useState<PeriodAnalytics | null>(null);

  // This month
  const [thisMonthStats, setThisMonthStats] = useState<PeriodAnalytics | null>(null);
  const [lastMonthStats, setLastMonthStats] = useState<PeriodAnalytics | null>(null);

  // This year
  const [thisYearStats, setThisYearStats] = useState<PeriodAnalytics | null>(null);

  // Top data
  const [topTreatments, setTopTreatments] = useState<TrattamentoStats[]>([]);
  const [topClients, setTopClients] = useState<ClienteTopRicavo[]>([]);

  // Monthly trend (last 6 months)
  const [monthlyTrend, setMonthlyTrend] = useState<{ mese: string; ricavo: number }[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const now = new Date();

      // Date ranges
      const todayRange = {
        data_inizio: startOfDay(now).toISOString(),
        data_fine: endOfDay(now).toISOString(),
      };

      const thisMonthRange = {
        data_inizio: startOfMonth(now).toISOString(),
        data_fine: endOfMonth(now).toISOString(),
      };

      const lastMonthRange = {
        data_inizio: startOfMonth(subMonths(now, 1)).toISOString(),
        data_fine: endOfMonth(subMonths(now, 1)).toISOString(),
      };

      const thisYearRange = {
        data_inizio: startOfYear(now).toISOString(),
        data_fine: endOfYear(now).toISOString(),
      };

      // Fetch all data in parallel
      const [
        todayData,
        thisMonthData,
        lastMonthData,
        thisYearData,
        treatments,
        clients,
      ] = await Promise.all([
        analyticsService.getPeriodAnalytics(todayRange),
        analyticsService.getPeriodAnalytics(thisMonthRange),
        analyticsService.getPeriodAnalytics(lastMonthRange),
        analyticsService.getPeriodAnalytics(thisYearRange),
        analyticsService.getTrattamentiPiuUsati(thisMonthRange, 5),
        analyticsService.getClientiTopRicavo(thisMonthRange, 5),
      ]);

      setTodayStats(todayData);
      setThisMonthStats(thisMonthData);
      setLastMonthStats(lastMonthData);
      setThisYearStats(thisYearData);
      setTopTreatments(treatments);
      setTopClients(clients);

      // Build monthly trend (last 6 months)
      const trendData: { mese: string; ricavo: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthRange = {
          data_inizio: startOfMonth(monthDate).toISOString(),
          data_fine: endOfMonth(monthDate).toISOString(),
        };
        const monthStats = await analyticsService.getPeriodAnalytics(monthRange);
        trendData.push({
          mese: format(monthDate, 'MMM', { locale: it }),
          ricavo: monthStats.ricavo_totale,
        });
      }
      setMonthlyTrend(trendData);

    } catch (error) {
      console.error('Errore caricamento analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) return { value: 0, direction: 'neutral' };
    const percentage = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(percentage)),
      direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral',
    };
  };

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
    if (direction === 'up') return <TrendingUp size={14} className="text-emerald-500" />;
    if (direction === 'down') return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(1)}K`;
    }
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Calculate max for bar chart
  const maxTreatmentRevenue = Math.max(...topTreatments.map(t => t.ricavo_totale), 1);
  const maxTrendRevenue = Math.max(...monthlyTrend.map(m => m.ricavo), 1);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="rounded-2xl p-6 animate-pulse" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="h-6 w-48 rounded mb-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-4 w-20 rounded mb-2" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="h-10 w-24 rounded" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ background: 'var(--card-bg)' }}>
              <div className="h-6 w-32 rounded mb-4" style={{ background: 'var(--glass-border)' }} />
              <div className="h-20 rounded" style={{ background: 'var(--glass-border)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TODAY HERO CARD */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold capitalize">{today}</h2>
              <p className="text-sm" style={{ color: 'var(--sidebar-text)' }}>
                Riepilogo giornata
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2" style={{ color: 'var(--sidebar-text)' }}>
              <Euro size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Incasso</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              €{(todayStats?.ricavo_totale || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2" style={{ color: 'var(--sidebar-text)' }}>
              <Calendar size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Appuntamenti</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{todayStats?.totale_appuntamenti || 0}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2" style={{ color: 'var(--sidebar-text)' }}>
              <Users size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Clienti</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{todayStats?.clienti_unici || 0}</p>
          </div>
        </div>

        {todayStats?.totale_appuntamenti === 0 && (
          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <p className="text-sm" style={{ color: 'var(--sidebar-text)' }}>
              Nessun appuntamento registrato per oggi
            </p>
          </div>
        )}
      </div>

      {/* MONTH & YEAR COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* THIS MONTH vs LAST MONTH */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Questo Mese
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-border)', color: 'var(--color-text-muted)' }}>
              vs mese precedente
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Revenue */}
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                Fatturato
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {formatCurrency(thisMonthStats?.ricavo_totale || 0)}
              </p>
              {lastMonthStats && (
                <div className="flex items-center gap-1">
                  <TrendIcon direction={calculateTrend(thisMonthStats?.ricavo_totale || 0, lastMonthStats.ricavo_totale).direction} />
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: calculateTrend(thisMonthStats?.ricavo_totale || 0, lastMonthStats.ricavo_totale).direction === 'up'
                        ? 'rgb(16, 185, 129)'
                        : calculateTrend(thisMonthStats?.ricavo_totale || 0, lastMonthStats.ricavo_totale).direction === 'down'
                        ? 'rgb(239, 68, 68)'
                        : 'var(--color-text-muted)'
                    }}
                  >
                    {calculateTrend(thisMonthStats?.ricavo_totale || 0, lastMonthStats.ricavo_totale).value}%
                  </span>
                </div>
              )}
            </div>

            {/* Appointments */}
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                Appuntamenti
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {thisMonthStats?.totale_appuntamenti || 0}
              </p>
              {lastMonthStats && (
                <div className="flex items-center gap-1">
                  <TrendIcon direction={calculateTrend(thisMonthStats?.totale_appuntamenti || 0, lastMonthStats.totale_appuntamenti).direction} />
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: calculateTrend(thisMonthStats?.totale_appuntamenti || 0, lastMonthStats.totale_appuntamenti).direction === 'up'
                        ? 'rgb(16, 185, 129)'
                        : calculateTrend(thisMonthStats?.totale_appuntamenti || 0, lastMonthStats.totale_appuntamenti).direction === 'down'
                        ? 'rgb(239, 68, 68)'
                        : 'var(--color-text-muted)'
                    }}
                  >
                    {calculateTrend(thisMonthStats?.totale_appuntamenti || 0, lastMonthStats.totale_appuntamenti).value}%
                  </span>
                </div>
              )}
            </div>

            {/* Clients */}
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                Clienti
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {thisMonthStats?.clienti_unici || 0}
              </p>
              {lastMonthStats && (
                <div className="flex items-center gap-1">
                  <TrendIcon direction={calculateTrend(thisMonthStats?.clienti_unici || 0, lastMonthStats.clienti_unici).direction} />
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: calculateTrend(thisMonthStats?.clienti_unici || 0, lastMonthStats.clienti_unici).direction === 'up'
                        ? 'rgb(16, 185, 129)'
                        : calculateTrend(thisMonthStats?.clienti_unici || 0, lastMonthStats.clienti_unici).direction === 'down'
                        ? 'rgb(239, 68, 68)'
                        : 'var(--color-text-muted)'
                    }}
                  >
                    {calculateTrend(thisMonthStats?.clienti_unici || 0, lastMonthStats.clienti_unici).value}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* THIS YEAR */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} style={{ color: 'var(--color-secondary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Anno {new Date().getFullYear()}
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                Fatturato
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {formatCurrency(thisYearStats?.ricavo_totale || 0)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                Appuntamenti
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {thisYearStats?.totale_appuntamenti || 0}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                Nuovi Clienti
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {thisYearStats?.nuovi_clienti || 0}
              </p>
            </div>
          </div>

          {/* Completion rate */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Tasso completamento
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {(thisYearStats?.tasso_completamento || 0).toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${thisYearStats?.tasso_completamento || 0}%`,
                  background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TOP TREATMENTS & TOP CLIENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP TREATMENTS */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Scissors size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Top 5 Trattamenti
            </h3>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              questo mese
            </span>
          </div>

          {topTreatments.length === 0 ? (
            <div className="py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
              Nessun dato disponibile
            </div>
          ) : (
            <div className="space-y-3">
              {topTreatments.map((treatment, index) => (
                <div key={treatment.trattamento_id} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      background: index === 0
                        ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                        : 'var(--glass-border)',
                      color: index === 0 ? 'white' : 'var(--color-text-muted)',
                    }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {treatment.trattamento_nome}
                    </p>
                    <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(treatment.ricavo_totale / maxTreatmentRevenue) * 100}%`,
                          background: 'var(--color-primary)',
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    €{treatment.ricavo_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TOP CLIENTS */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Crown size={18} style={{ color: 'var(--color-secondary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Top 5 Clienti
            </h3>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              questo mese
            </span>
          </div>

          {topClients.length === 0 ? (
            <div className="py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
              Nessun dato disponibile
            </div>
          ) : (
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div key={client.cliente_id} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: index === 0
                        ? 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))'
                        : 'var(--glass-border)',
                      color: index === 0 ? 'white' : 'var(--color-text-muted)',
                    }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {client.nome} {client.cognome}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {client.totale_appuntamenti} appuntamenti
                    </p>
                  </div>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    €{client.ricavo_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MONTHLY TREND */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Andamento Ultimi 6 Mesi
          </h3>
        </div>

        {monthlyTrend.length === 0 ? (
          <div className="py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
            Nessun dato disponibile
          </div>
        ) : (
          <div className="flex items-end gap-4 h-32">
            {monthlyTrend.map((month, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span
                    className="text-xs font-medium mb-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {formatCurrency(month.ricavo)}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-300"
                    style={{
                      height: `${Math.max((month.ricavo / maxTrendRevenue) * 80, 4)}px`,
                      background: index === monthlyTrend.length - 1
                        ? 'linear-gradient(180deg, var(--color-primary), var(--color-primary-dark))'
                        : 'var(--glass-border)',
                    }}
                  />
                </div>
                <span
                  className="text-xs font-medium capitalize"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {month.mese}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
