import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Euro,
  Users,
  Scissors,
  Crown,
  Search,
  Filter,
  X,
  ChevronDown,
  RefreshCw,
  FileText,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  BarChart3,
  Download,
  UserCheck,
  Clock,
  XCircle,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import {
  analyticsService,
  PeriodAnalytics,
  TrattamentoStats,
  ClienteTopRicavo,
  ReportFiltratoResult,
} from '../services/analytics';
import { clientiService } from '../services/clienti';
import { trattamentiService } from '../services/trattamenti';
import { InfoTooltip } from '../components/ui/InfoTooltip';
// CSV export uses blob download
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  parseISO,
} from 'date-fns';
import { it } from 'date-fns/locale';

// ============================================
// TYPES
// ============================================

type TabKey = 'panoramica' | 'interrogazione';

interface FilterOption {
  id: string;
  label: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const Report: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('panoramica');

  return (
    <div className="space-y-6">
      {/* TAB BAR */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'var(--glass-border)' }}
      >
        {[
          { key: 'panoramica' as TabKey, label: 'Panoramica', icon: <BarChart3 size={16} /> },
          { key: 'interrogazione' as TabKey, label: 'Interrogazione Libera', icon: <Filter size={16} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.key ? 'var(--card-bg)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'panoramica' && <PanoramicaTab />}
      {activeTab === 'interrogazione' && <InterrogazioneTab />}
    </div>
  );
};

// ============================================
// TAB 1: PANORAMICA (dati statici)
// ============================================

const PanoramicaTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<PeriodAnalytics | null>(null);
  const [thisMonthStats, setThisMonthStats] = useState<PeriodAnalytics | null>(null);
  const [lastMonthStats, setLastMonthStats] = useState<PeriodAnalytics | null>(null);
  const [thisYearStats, setThisYearStats] = useState<PeriodAnalytics | null>(null);
  const [topTreatments, setTopTreatments] = useState<TrattamentoStats[]>([]);
  const [topClients, setTopClients] = useState<ClienteTopRicavo[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ mese: string; ricavo: number }[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const emptyAnalytics: PeriodAnalytics = {
    totale_appuntamenti: 0, appuntamenti_completati: 0, appuntamenti_annullati: 0,
    appuntamenti_no_show: 0, tasso_completamento: 0, ricavo_totale: 0, ricavo_medio: 0,
    clienti_unici: 0, nuovi_clienti: 0, media_appuntamenti_per_cliente: 0, durata_media_minuti: 0,
  };

  const safePeriodAnalytics = async (filter: { data_inizio: string; data_fine: string }) => {
    try { return await analyticsService.getPeriodAnalytics(filter); }
    catch (e) { console.error('Analytics fallback:', e); return emptyAnalytics; }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayRange = { data_inizio: startOfDay(now).toISOString(), data_fine: endOfDay(now).toISOString() };
      const thisMonthRange = { data_inizio: startOfMonth(now).toISOString(), data_fine: endOfMonth(now).toISOString() };
      const lastMonthRange = { data_inizio: startOfMonth(subMonths(now, 1)).toISOString(), data_fine: endOfMonth(subMonths(now, 1)).toISOString() };
      const thisYearRange = { data_inizio: startOfYear(now).toISOString(), data_fine: endOfYear(now).toISOString() };

      const [todayData, thisMonthData, lastMonthData, thisYearData, treatments, clients] = await Promise.all([
        safePeriodAnalytics(todayRange),
        safePeriodAnalytics(thisMonthRange),
        safePeriodAnalytics(lastMonthRange),
        safePeriodAnalytics(thisYearRange),
        analyticsService.getTrattamentiPiuUsati(thisMonthRange, 5).catch(() => [] as TrattamentoStats[]),
        analyticsService.getClientiTopRicavo(thisMonthRange, 5).catch(() => [] as ClienteTopRicavo[]),
      ]);

      setTodayStats(todayData);
      setThisMonthStats(thisMonthData);
      setLastMonthStats(lastMonthData);
      setThisYearStats(thisYearData);
      setTopTreatments(treatments);
      setTopClients(clients);

      const trendMonths = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
      const trendResults = await Promise.all(
        trendMonths.map(monthDate =>
          safePeriodAnalytics({
            data_inizio: startOfMonth(monthDate).toISOString(),
            data_fine: endOfMonth(monthDate).toISOString(),
          })
        )
      );
      setMonthlyTrend(
        trendMonths.map((monthDate, i) => ({
          mese: format(monthDate, 'MMM', { locale: it }),
          ricavo: trendResults[i].ricavo_totale,
        }))
      );
    } catch (error) {
      console.error('Errore caricamento analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, direction: 'neutral' as const };
    const percentage = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(percentage)),
      direction: (percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
    };
  };

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
    if (direction === 'up') return <TrendingUp size={14} className="text-emerald-500" />;
    if (direction === 'down') return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const maxTreatmentRevenue = Math.max(...topTreatments.map(t => t.ricavo_totale), 1);
  const maxTrendRevenue = Math.max(...monthlyTrend.map(m => m.ricavo), 1);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 shimmer" style={{ background: 'var(--sidebar-bg)' }}>
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
            <div key={i} className="rounded-2xl p-6 shimmer" style={{ background: 'var(--card-bg)', animationDelay: `${i * 100}ms` }}>
              <div className="h-6 w-32 rounded mb-4" style={{ background: 'var(--glass-border)' }} />
              <div className="h-20 rounded" style={{ background: 'var(--glass-border)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const trendColor = (direction: 'up' | 'down' | 'neutral') =>
    direction === 'up' ? 'rgb(16, 185, 129)' : direction === 'down' ? 'rgb(239, 68, 68)' : 'var(--color-text-muted)';

  return (
    <div className="space-y-6">
      {/* TODAY HERO */}
      <div className="rounded-2xl p-6 text-white animate-fade-in-up card-hover-lift" style={{ background: 'var(--sidebar-bg)' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold capitalize">{today}</h2>
              <p className="text-sm" style={{ color: 'var(--sidebar-text)' }}>Riepilogo giornata</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2" style={{ color: 'var(--sidebar-text)' }}>
              <Euro size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Incasso</span>
              <InfoTooltip text="Fatturato totale di oggi" size={12} />
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
            <p className="text-sm" style={{ color: 'var(--sidebar-text)' }}>Nessun appuntamento registrato per oggi</p>
          </div>
        )}
      </div>

      {/* MONTH vs LAST MONTH + YEAR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* This month */}
        <div className="rounded-2xl p-6 animate-fade-in-up card-hover-lift" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Questo Mese</h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-border)', color: 'var(--color-text-muted)' }}>vs mese precedente</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Fatturato', current: thisMonthStats?.ricavo_totale || 0, previous: lastMonthStats?.ricavo_totale || 0, fmt: true },
              { label: 'Appuntamenti', current: thisMonthStats?.totale_appuntamenti || 0, previous: lastMonthStats?.totale_appuntamenti || 0, fmt: false },
              { label: 'Clienti', current: thisMonthStats?.clienti_unici || 0, previous: lastMonthStats?.clienti_unici || 0, fmt: false },
            ].map(item => {
              const trend = calculateTrend(item.current, item.previous);
              return (
                <div key={item.label} className="space-y-1">
                  <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {item.fmt ? formatCurrency(item.current) : item.current}
                  </p>
                  {lastMonthStats && (
                    <div className="flex items-center gap-1">
                      <TrendIcon direction={trend.direction} />
                      <span className="text-xs font-medium" style={{ color: trendColor(trend.direction) }}>{trend.value}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* This year */}
        <div className="rounded-2xl p-6 animate-fade-in-up card-hover-lift" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} style={{ color: 'var(--color-secondary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Anno {new Date().getFullYear()}</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Fatturato</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(thisYearStats?.ricavo_totale || 0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Appuntamenti</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{thisYearStats?.totale_appuntamenti || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Nuovi Clienti</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{thisYearStats?.nuovi_clienti || 0}</p>
            </div>
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Tasso completamento</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{(thisYearStats?.tasso_completamento || 0).toFixed(0)}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${thisYearStats?.tasso_completamento || 0}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }} />
            </div>
          </div>
        </div>
      </div>

      {/* TOP TREATMENTS & TOP CLIENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 animate-fade-in-up card-hover-lift" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <Scissors size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Top 5 Trattamenti</h3>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>questo mese</span>
          </div>
          {topTreatments.length === 0 ? (
            <div className="py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Nessun dato disponibile</div>
          ) : (
            <div className="space-y-3">
              {topTreatments.map((t, i) => (
                <div key={t.trattamento_id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: i === 0 ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' : 'var(--glass-border)', color: i === 0 ? 'white' : 'var(--color-text-muted)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{t.trattamento_nome}</p>
                    <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(t.ricavo_totale / maxTreatmentRevenue) * 100}%`, background: 'var(--color-primary)' }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>€{t.ricavo_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6 animate-fade-in-up card-hover-lift" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '250ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <Crown size={18} style={{ color: 'var(--color-secondary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Top 5 Clienti</h3>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>questo mese</span>
          </div>
          {topClients.length === 0 ? (
            <div className="py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Nessun dato disponibile</div>
          ) : (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.cliente_id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: i === 0 ? 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))' : 'var(--glass-border)', color: i === 0 ? 'white' : 'var(--color-text-muted)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{c.nome} {c.cognome}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.totale_appuntamenti} appuntamenti</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>€{c.ricavo_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MONTHLY TREND */}
      <div className="rounded-2xl p-6 animate-fade-in-up card-hover-lift" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '300ms' }}>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Andamento Ultimi 6 Mesi</h3>
        </div>
        {monthlyTrend.length === 0 ? (
          <div className="py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Nessun dato disponibile</div>
        ) : (
          <div className="flex items-end gap-4 h-32">
            {monthlyTrend.map((month, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(month.ricavo)}</span>
                  <div className="w-full rounded-t-lg transition-all duration-300" style={{ height: `${Math.max((month.ricavo / maxTrendRevenue) * 80, 4)}px`, background: index === monthlyTrend.length - 1 ? 'linear-gradient(180deg, var(--color-primary), var(--color-primary-dark))' : 'var(--glass-border)' }} />
                </div>
                <span className="text-xs font-medium capitalize" style={{ color: 'var(--color-text-muted)' }}>{month.mese}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// TAB 2: INTERROGAZIONE LIBERA (filtri dinamici)
// ============================================

const InterrogazioneTab: React.FC = () => {
  // Filters
  const [dataInizio, setDataInizio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFine, setDataFine] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedClienti, setSelectedClienti] = useState<FilterOption[]>([]);
  const [selectedTrattamenti, setSelectedTrattamenti] = useState<FilterOption[]>([]);

  // Dropdown
  const [clientiOptions, setClientiOptions] = useState<FilterOption[]>([]);
  const [trattamentiOptions, setTrattamentiOptions] = useState<FilterOption[]>([]);
  const [clientiSearch, setClientiSearch] = useState('');
  const [trattamentiSearch, setTrattamentiSearch] = useState('');
  const [showClientiDropdown, setShowClientiDropdown] = useState(false);
  const [showTrattamentiDropdown, setShowTrattamentiDropdown] = useState(false);

  // Results
  const [result, setResult] = useState<ReportFiltratoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [clienti, trattamenti] = await Promise.all([
        clientiService.getClienti(undefined, 500),
        trattamentiService.getTrattamenti(undefined, true),
      ]);
      setClientiOptions(clienti.map((c: any) => ({ id: c.id, label: `${c.cognome} ${c.nome}` })));
      setTrattamentiOptions(trattamenti.map((t: any) => ({ id: t.id, label: t.nome })));
    } catch (err) {
      console.error('Errore caricamento filtri:', err);
    }
  };

  const executeReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getReportFiltrato({
        data_inizio: format(startOfDay(parseISO(dataInizio)), 'yyyy-MM-dd HH:mm:ss'),
        data_fine: format(endOfDay(parseISO(dataFine)), 'yyyy-MM-dd HH:mm:ss'),
        cliente_ids: selectedClienti.length > 0 ? selectedClienti.map(c => c.id) : undefined,
        trattamento_ids: selectedTrattamenti.length > 0 ? selectedTrattamenti.map(t => t.id) : undefined,
      });
      setResult(data);
    } catch (err: any) {
      console.error('Errore report:', err);
      setError(typeof err === 'string' ? err : err?.message || 'Errore durante la generazione del report');
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (range: 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear') => {
    const now = new Date();
    switch (range) {
      case 'today': {
        const d = format(now, 'yyyy-MM-dd');
        setDataInizio(d);
        setDataFine(d);
        break;
      }
      case 'thisWeek': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now); monday.setDate(diff);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        setDataInizio(format(monday, 'yyyy-MM-dd'));
        setDataFine(format(sunday, 'yyyy-MM-dd'));
        break;
      }
      case 'thisMonth':
        setDataInizio(format(startOfMonth(now), 'yyyy-MM-dd'));
        setDataFine(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        setDataInizio(format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'));
        setDataFine(format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'));
        break;
      case 'last3Months':
        setDataInizio(format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'));
        setDataFine(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'thisYear':
        setDataInizio(`${now.getFullYear()}-01-01`);
        setDataFine(`${now.getFullYear()}-12-31`);
        break;
    }
  };

  const toggleClienteFilter = (option: FilterOption) => {
    setSelectedClienti(prev => prev.find(c => c.id === option.id) ? prev.filter(c => c.id !== option.id) : [...prev, option]);
  };
  const toggleTrattamentoFilter = (option: FilterOption) => {
    setSelectedTrattamenti(prev => prev.find(t => t.id === option.id) ? prev.filter(t => t.id !== option.id) : [...prev, option]);
  };

  const filteredClientiOptions = clientiOptions.filter(c => c.label.toLowerCase().includes(clientiSearch.toLowerCase()));
  const filteredTrattamentiOptions = trattamentiOptions.filter(t => t.label.toLowerCase().includes(trattamentiSearch.toLowerCase()));

  const formatCurrency = (value: number) => `\u20AC${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statoLabel = (stato: string) => {
    switch (stato) {
      case 'completato': return 'Completato';
      case 'in_corso': return 'In corso';
      case 'annullato': return 'Annullato';
      case 'no_show': return 'No show';
      case 'confermato': return 'Confermato';
      case 'prenotato': return 'Prenotato';
      default: return stato;
    }
  };
  const statoColor = (stato: string) => {
    switch (stato) {
      case 'completato': return '#10b981';
      case 'in_corso': return '#3b82f6';
      case 'annullato': return '#ef4444';
      case 'no_show': return '#f59e0b';
      case 'confermato': return '#8b5cf6';
      case 'prenotato': return '#6b7280';
      default: return 'var(--color-text-muted)';
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const cleaned = dateStr.replace(' ', 'T');
      const d = parseISO(cleaned);
      return format(d, 'dd/MM/yyyy HH:mm', { locale: it });
    } catch {
      return dateStr;
    }
  };

  // CSV Export
  const exportCSV = async () => {
    if (!result) return;

    const sep = ';';
    const lines: string[] = [];

    // Header info
    lines.push(`Report dal ${dataInizio} al ${dataFine}`);
    lines.push('');

    // KPI Summary
    lines.push('RIEPILOGO GENERALE');
    lines.push(`Fatturato Totale${sep}${result.kpi.ricavo_totale.toFixed(2)}`);
    lines.push(`Fatturato Medio${sep}${result.kpi.ricavo_medio.toFixed(2)}`);
    lines.push(`Appuntamenti Totali${sep}${result.kpi.totale_appuntamenti}`);
    lines.push(`Completati${sep}${result.kpi.appuntamenti_completati}`);
    lines.push(`Annullati${sep}${result.kpi.appuntamenti_annullati}`);
    lines.push(`No Show${sep}${result.kpi.appuntamenti_no_show}`);
    lines.push(`Tasso Completamento${sep}${result.kpi.tasso_completamento.toFixed(1)}%`);
    lines.push(`Clienti Unici${sep}${result.kpi.clienti_unici}`);
    lines.push(`Nuovi Clienti${sep}${result.kpi.nuovi_clienti}`);
    lines.push(`Durata Media (min)${sep}${result.kpi.durata_media_minuti.toFixed(0)}`);
    lines.push('');

    // Operatrici
    if (result.produttivita_operatrici.length > 0) {
      lines.push('PRODUTTIVITA OPERATRICI');
      lines.push(`Operatrice${sep}App. Totali${sep}Completati${sep}Fatturato${sep}Media${sep}Ore Lavorate`);
      for (const op of result.produttivita_operatrici) {
        lines.push(`${op.operatrice_cognome} ${op.operatrice_nome}${sep}${op.totale_appuntamenti}${sep}${op.appuntamenti_completati}${sep}${op.ricavo_totale.toFixed(2)}${sep}${op.ricavo_medio.toFixed(2)}${sep}${op.ore_lavorate.toFixed(1)}`);
      }
      lines.push('');
    }

    // Categorie
    if (result.ricavi_per_categoria.length > 0) {
      lines.push('RICAVI PER CATEGORIA');
      lines.push(`Categoria${sep}Appuntamenti${sep}Fatturato${sep}%`);
      for (const cat of result.ricavi_per_categoria) {
        lines.push(`${cat.categoria_nome}${sep}${cat.totale_appuntamenti}${sep}${cat.ricavo_totale.toFixed(2)}${sep}${cat.percentuale.toFixed(1)}%`);
      }
      lines.push('');
    }

    // Top trattamenti
    if (result.top_trattamenti.length > 0) {
      lines.push('TOP TRATTAMENTI');
      lines.push(`Trattamento${sep}Categoria${sep}Appuntamenti${sep}Fatturato${sep}Media${sep}Durata Media`);
      for (const t of result.top_trattamenti) {
        lines.push(`${t.trattamento_nome}${sep}${t.categoria_nome || ''}${sep}${t.totale_appuntamenti}${sep}${t.ricavo_totale.toFixed(2)}${sep}${t.ricavo_medio.toFixed(2)}${sep}${t.durata_media_minuti.toFixed(0)} min`);
      }
      lines.push('');
    }

    // Top clienti
    if (result.top_clienti.length > 0) {
      lines.push('TOP CLIENTI');
      lines.push(`Cliente${sep}Appuntamenti${sep}Fatturato${sep}Media`);
      for (const c of result.top_clienti) {
        lines.push(`${c.cognome} ${c.nome}${sep}${c.totale_appuntamenti}${sep}${c.ricavo_totale.toFixed(2)}${sep}${c.ricavo_medio.toFixed(2)}`);
      }
      lines.push('');
    }

    // Dettaglio
    lines.push('DETTAGLIO APPUNTAMENTI');
    lines.push(`Data${sep}Cliente${sep}Trattamento${sep}Categoria${sep}Operatrice${sep}Durata${sep}Stato${sep}Prezzo${sep}Note`);
    for (const row of result.dettaglio_appuntamenti) {
      const escapedNote = row.note.replace(/;/g, ',').replace(/\n/g, ' ');
      lines.push(`${formatDateDisplay(row.data)}${sep}${row.cliente_cognome} ${row.cliente_nome}${sep}${row.trattamento_nome}${sep}${row.categoria_trattamento}${sep}${row.operatrice_cognome} ${row.operatrice_nome}${sep}${row.durata_minuti} min${sep}${statoLabel(row.stato)}${sep}${row.prezzo.toFixed(2)}${sep}${escapedNote}`);
    }

    const csvContent = '\uFEFF' + lines.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${dataInizio}_${dataFine}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeFiltersCount = selectedClienti.length + selectedTrattamenti.length;

  // Section renderer helper
  const SectionHeader = ({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: string | number }) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} style={{ color: 'var(--color-primary)' }} />
      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      {badge !== undefined && (
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-border)', color: 'var(--color-text-muted)' }}>{badge}</span>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* FILTER PANEL */}
      <div className="rounded-2xl p-5 animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Filtri</h3>
          {activeFiltersCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-primary)', color: 'white' }}>
              {activeFiltersCount} attivi
            </span>
          )}
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Da</label>
              <input type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>A</label>
              <input type="date" value={dataFine} onChange={e => setDataFine(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              { key: 'today' as const, label: 'Oggi' },
              { key: 'thisWeek' as const, label: 'Settimana' },
              { key: 'thisMonth' as const, label: 'Mese' },
              { key: 'lastMonth' as const, label: 'Mese scorso' },
              { key: 'last3Months' as const, label: '3 Mesi' },
              { key: 'thisYear' as const, label: 'Anno' },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setQuickRange(key)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80" style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-select */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Clienti */}
          <div className="relative flex-1 min-w-[220px]">
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Clienti</label>
            <div className="rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-2" style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }} onClick={() => { setShowClientiDropdown(!showClientiDropdown); setShowTrattamentiDropdown(false); }}>
              <Users size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <span className="flex-1 truncate" style={{ color: selectedClienti.length > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {selectedClienti.length > 0 ? `${selectedClienti.length} clienti selezionati` : 'Tutti i clienti'}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            </div>
            {showClientiDropdown && (
              <div className="absolute z-50 mt-1 w-full rounded-xl shadow-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', maxHeight: '280px' }}>
                <div className="p-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--glass-border)' }}>
                    <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
                    <input type="text" value={clientiSearch} onChange={e => setClientiSearch(e.target.value)} placeholder="Cerca cliente..." className="bg-transparent border-none outline-none text-sm flex-1" style={{ color: 'var(--color-text-primary)' }} autoFocus />
                  </div>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                  {filteredClientiOptions.map(option => {
                    const sel = selectedClienti.some(c => c.id === option.id);
                    return (
                      <div key={option.id} className="px-3 py-2 cursor-pointer flex items-center gap-2 text-sm transition-colors" style={{ background: sel ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: 'var(--color-text-primary)' }} onClick={() => toggleClienteFilter(option)} onMouseEnter={e => (e.currentTarget.style.background = sel ? 'rgba(99, 102, 241, 0.15)' : 'var(--glass-border)')} onMouseLeave={e => (e.currentTarget.style.background = sel ? 'rgba(99, 102, 241, 0.1)' : 'transparent')}>
                        <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0" style={{ borderColor: sel ? 'var(--color-primary)' : 'var(--glass-border)', background: sel ? 'var(--color-primary)' : 'transparent' }}>
                          {sel && <CheckCircle size={12} color="white" />}
                        </div>
                        <span className="truncate">{option.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Trattamenti */}
          <div className="relative flex-1 min-w-[220px]">
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Trattamenti</label>
            <div className="rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-2" style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }} onClick={() => { setShowTrattamentiDropdown(!showTrattamentiDropdown); setShowClientiDropdown(false); }}>
              <Scissors size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <span className="flex-1 truncate" style={{ color: selectedTrattamenti.length > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {selectedTrattamenti.length > 0 ? `${selectedTrattamenti.length} trattamenti selezionati` : 'Tutti i trattamenti'}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            </div>
            {showTrattamentiDropdown && (
              <div className="absolute z-50 mt-1 w-full rounded-xl shadow-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', maxHeight: '280px' }}>
                <div className="p-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--glass-border)' }}>
                    <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
                    <input type="text" value={trattamentiSearch} onChange={e => setTrattamentiSearch(e.target.value)} placeholder="Cerca trattamento..." className="bg-transparent border-none outline-none text-sm flex-1" style={{ color: 'var(--color-text-primary)' }} autoFocus />
                  </div>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                  {filteredTrattamentiOptions.map(option => {
                    const sel = selectedTrattamenti.some(t => t.id === option.id);
                    return (
                      <div key={option.id} className="px-3 py-2 cursor-pointer flex items-center gap-2 text-sm transition-colors" style={{ background: sel ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: 'var(--color-text-primary)' }} onClick={() => toggleTrattamentoFilter(option)} onMouseEnter={e => (e.currentTarget.style.background = sel ? 'rgba(99, 102, 241, 0.15)' : 'var(--glass-border)')} onMouseLeave={e => (e.currentTarget.style.background = sel ? 'rgba(99, 102, 241, 0.1)' : 'transparent')}>
                        <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0" style={{ borderColor: sel ? 'var(--color-primary)' : 'var(--glass-border)', background: sel ? 'var(--color-primary)' : 'transparent' }}>
                          {sel && <CheckCircle size={12} color="white" />}
                        </div>
                        <span className="truncate">{option.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected pills */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {selectedClienti.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--glass-border)', color: 'var(--color-text-primary)' }}>
                <Users size={11} />{c.label}
                <X size={12} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => setSelectedClienti(prev => prev.filter(x => x.id !== c.id))} />
              </span>
            ))}
            {selectedTrattamenti.map(t => (
              <span key={t.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--glass-border)', color: 'var(--color-text-primary)' }}>
                <Scissors size={11} />{t.label}
                <X size={12} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => setSelectedTrattamenti(prev => prev.filter(x => x.id !== t.id))} />
              </span>
            ))}
            <button onClick={() => { setSelectedClienti([]); setSelectedTrattamenti([]); }} className="text-xs px-2 py-1 rounded-full transition-colors hover:opacity-80" style={{ color: 'var(--color-text-muted)' }}>Rimuovi tutti</button>
          </div>
        )}

        {/* Execute */}
        <button onClick={executeReport} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark, var(--color-primary)))' }}>
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? 'Caricamento...' : 'Genera Report'}
        </button>
      </div>

      {/* Click-away */}
      {(showClientiDropdown || showTrattamentiDropdown) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowClientiDropdown(false); setShowTrattamentiDropdown(false); }} />
      )}

      {/* ERRORE */}
      {error && (
        <div
          className="rounded-2xl p-5 flex items-center gap-3"
          style={{ background: 'color-mix(in srgb, var(--color-danger) 8%, var(--card-bg))', border: '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)' }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>Errore nella generazione del report</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-6 shimmer" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: `${i * 100}ms` }}>
              <div className="h-5 w-40 rounded mb-4" style={{ background: 'var(--glass-border)' }} />
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(j => (
                  <div key={j}>
                    <div className="h-3 w-16 rounded mb-2" style={{ background: 'var(--glass-border)' }} />
                    <div className="h-8 w-20 rounded" style={{ background: 'var(--glass-border)' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RESULTS */}
      {!loading && result && (
        <>
          {/* REPORT HEADER + EXPORT */}
          <div className="flex items-center justify-between animate-fade-in-up">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Report {format(parseISO(dataInizio), 'dd/MM/yyyy')} — {format(parseISO(dataFine), 'dd/MM/yyyy')}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {result.kpi.totale_appuntamenti} appuntamenti · {result.kpi.clienti_unici} clienti · {result.dettaglio_appuntamenti.length} righe dettaglio
                {activeFiltersCount > 0 && ` · ${activeFiltersCount} filtri attivi`}
              </p>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--glass-border)', color: 'var(--color-text-primary)' }}
            >
              <Download size={15} />
              Esporta CSV
            </button>
          </div>

          {/* ======== SEZIONE 1: RIEPILOGO KPI ======== */}
          <div className="rounded-2xl p-5 animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '50ms' }}>
            <SectionHeader icon={BarChart3} title="Riepilogo Generale" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: 'Fatturato', value: formatCurrency(result.kpi.ricavo_totale), icon: Euro, color: '#10b981' },
                { label: 'Ticket Medio', value: formatCurrency(result.kpi.ricavo_medio), icon: Euro, color: '#3b82f6' },
                { label: 'Appuntamenti', value: String(result.kpi.totale_appuntamenti), icon: Calendar, color: '#8b5cf6' },
                { label: 'Completati', value: String(result.kpi.appuntamenti_completati), icon: CheckCircle, color: '#10b981' },
                { label: 'Annullati', value: String(result.kpi.appuntamenti_annullati), icon: XCircle, color: '#ef4444' },
                { label: 'No Show', value: String(result.kpi.appuntamenti_no_show), icon: AlertTriangle, color: '#f59e0b' },
                { label: 'Clienti Unici', value: String(result.kpi.clienti_unici), icon: Users, color: '#3b82f6' },
                { label: 'Nuovi Clienti', value: String(result.kpi.nuovi_clienti), icon: UserCheck, color: '#06b6d4' },
                { label: 'Tasso Complet.', value: `${result.kpi.tasso_completamento.toFixed(1)}%`, icon: TrendingUp, color: result.kpi.tasso_completamento >= 80 ? '#10b981' : '#f59e0b' },
                { label: 'Media App/Cli.', value: result.kpi.media_appuntamenti_per_cliente.toFixed(1), icon: Users, color: '#8b5cf6' },
                { label: 'Durata Media', value: `${result.kpi.durata_media_minuti.toFixed(0)} min`, icon: Clock, color: '#6b7280' },
                { label: 'Tasso No Show', value: result.kpi.totale_appuntamenti > 0 ? `${((result.kpi.appuntamenti_no_show / result.kpi.totale_appuntamenti) * 100).toFixed(1)}%` : '0%', icon: AlertTriangle, color: result.kpi.appuntamenti_no_show > 0 ? '#f59e0b' : '#10b981' },
              ].map(kpi => {
                const KIcon = kpi.icon;
                return (
                  <div key={kpi.label} className="p-3 rounded-xl" style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}15` }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <KIcon size={12} style={{ color: kpi.color }} />
                      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</span>
                    </div>
                    <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{kpi.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======== SEZIONE 2: PRODUTTIVITA OPERATRICI ======== */}
          {result.produttivita_operatrici.length > 0 && (
            <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '100ms' }}>
              <div className="p-5 pb-0">
                <SectionHeader icon={UserCheck} title="Produttivit\u00E0 Operatrici" badge={result.produttivita_operatrici.length} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      {['Operatrice', 'App. Totali', 'Completati', 'Fatturato', 'Ticket Medio', 'Ore Lavorate'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.produttivita_operatrici.map(op => (
                      <tr key={op.operatrice_id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="transition-colors" onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{op.operatrice_cognome} {op.operatrice_nome}</td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{op.totale_appuntamenti}</td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{op.appuntamenti_completati}</td>
                        <td className="px-4 py-3 tabular-nums font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(op.ricavo_totale)}</td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(op.ricavo_medio)}</td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{op.ore_lavorate.toFixed(1)}h</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr style={{ borderTop: '2px solid var(--glass-border)' }}>
                      <td className="px-4 py-3 font-bold text-xs uppercase" style={{ color: 'var(--color-text-muted)' }}>Totale</td>
                      <td className="px-4 py-3 tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{result.produttivita_operatrici.reduce((s, o) => s + o.totale_appuntamenti, 0)}</td>
                      <td className="px-4 py-3 tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{result.produttivita_operatrici.reduce((s, o) => s + o.appuntamenti_completati, 0)}</td>
                      <td className="px-4 py-3 tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(result.produttivita_operatrici.reduce((s, o) => s + o.ricavo_totale, 0))}</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{result.produttivita_operatrici.reduce((s, o) => s + o.ore_lavorate, 0).toFixed(1)}h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======== SEZIONE 3: RICAVI PER CATEGORIA ======== */}
          {result.ricavi_per_categoria.length > 0 && (
            <div className="rounded-2xl p-5 animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '150ms' }}>
              <SectionHeader icon={Layers} title="Ricavi per Categoria" badge={result.ricavi_per_categoria.length} />
              <div className="space-y-3">
                {result.ricavi_per_categoria.map(cat => (
                  <div key={cat.categoria_nome} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{cat.categoria_nome}</div>
                    <div className="flex-1">
                      <div className="h-6 rounded-lg overflow-hidden flex items-center" style={{ background: 'var(--glass-border)' }}>
                        <div
                          className="h-full rounded-lg flex items-center px-2"
                          style={{ width: `${Math.max(cat.percentuale, 3)}%`, background: 'var(--color-primary)', minWidth: '40px' }}
                        >
                          <span className="text-[10px] font-bold text-white whitespace-nowrap">{cat.percentuale.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right w-28">
                      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(cat.ricavo_totale)}</span>
                      <span className="text-xs ml-1.5" style={{ color: 'var(--color-text-muted)' }}>{cat.totale_appuntamenti} app.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======== SEZIONE 4: TOP TRATTAMENTI + TOP CLIENTI ======== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Trattamenti */}
            <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '200ms' }}>
              <div className="p-5 pb-0">
                <SectionHeader icon={Scissors} title="Top Trattamenti" badge={result.top_trattamenti.length} />
              </div>
              {result.top_trattamenti.length === 0 ? (
                <div className="p-5 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Nessun dato</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        {['Trattamento', 'N.', 'Fatturato', 'Media'].map(col => (
                          <th key={col} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.top_trattamenti.map((t, i) => (
                        <tr key={t.trattamento_id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="transition-colors" onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: i < 3 ? 'var(--color-primary)' : 'var(--glass-border)', color: i < 3 ? 'white' : 'var(--color-text-muted)' }}>{i + 1}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{t.trattamento_nome}</p>
                                {t.categoria_nome && <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{t.categoria_nome}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{t.totale_appuntamenti}</td>
                          <td className="px-4 py-2.5 tabular-nums font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(t.ricavo_totale)}</td>
                          <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(t.ricavo_medio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Clienti */}
            <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '250ms' }}>
              <div className="p-5 pb-0">
                <SectionHeader icon={Crown} title="Top Clienti" badge={result.top_clienti.length} />
              </div>
              {result.top_clienti.length === 0 ? (
                <div className="p-5 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Nessun dato</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        {['Cliente', 'N.', 'Fatturato', 'Media'].map(col => (
                          <th key={col} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.top_clienti.map((c, i) => (
                        <tr key={c.cliente_id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="transition-colors" onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: i < 3 ? 'var(--color-secondary, var(--color-primary))' : 'var(--glass-border)', color: i < 3 ? 'white' : 'var(--color-text-muted)' }}>{i + 1}</span>
                              <span className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{c.cognome} {c.nome}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{c.totale_appuntamenti}</td>
                          <td className="px-4 py-2.5 tabular-nums font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(c.ricavo_totale)}</td>
                          <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(c.ricavo_medio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ======== SEZIONE 5: DETTAGLIO APPUNTAMENTI ======== */}
          <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '300ms' }}>
            <div className="p-5 pb-0">
              <SectionHeader icon={FileText} title="Dettaglio Appuntamenti" badge={result.dettaglio_appuntamenti.length} />
            </div>
            {result.dettaglio_appuntamenti.length === 0 ? (
              <div className="p-5 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Nessun appuntamento nel periodo</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      {['Data', 'Cliente', 'Trattamento', 'Categoria', 'Operatrice', 'Durata', 'Stato', 'Prezzo'].map(col => (
                        <th key={col} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.dettaglio_appuntamenti.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }} className="transition-colors" onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: 'var(--color-text-primary)' }}>{formatDateDisplay(row.data)}</td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>{row.cliente_cognome} {row.cliente_nome}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{row.trattamento_nome}</td>
                        <td className="px-3 py-2.5">
                          {row.categoria_trattamento ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{row.categoria_trattamento}</span>
                          ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{row.operatrice_cognome} {row.operatrice_nome}</td>
                        <td className="px-3 py-2.5 tabular-nums text-xs" style={{ color: 'var(--color-text-muted)' }}>{row.durata_minuti > 0 ? `${row.durata_minuti} min` : '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${statoColor(row.stato)}15`, color: statoColor(row.stato) }}>{statoLabel(row.stato)}</span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-medium text-right" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(row.prezzo)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--glass-border)' }}>
                      <td colSpan={7} className="px-3 py-3 font-bold text-xs uppercase" style={{ color: 'var(--color-text-muted)' }}>
                        Totale ({result.dettaglio_appuntamenti.length} righe)
                      </td>
                      <td className="px-3 py-3 tabular-nums font-bold text-right" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(result.dettaglio_appuntamenti.reduce((s, r) => s + r.prezzo, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {result.dettaglio_appuntamenti.length >= 1000 && (
                  <div className="px-4 py-2.5 text-center text-[10px]" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--glass-border)' }}>Limite: 1000 righe. Per periodi molto lunghi, restringere i filtri.</div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* EMPTY STATE */}
      {!loading && !result && (
        <div className="rounded-2xl p-12 text-center animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
          <Search size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Seleziona un periodo e premi "Genera Report"</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Puoi filtrare per clienti e trattamenti specifici</p>
        </div>
      )}
    </div>
  );
};
