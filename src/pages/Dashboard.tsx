import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, TrendingUp, TrendingDown, Clock, ChevronRight,
  Users, Euro, Cake, UserX, PackageX, CalendarClock,
  UserPlus, BarChart3, Target, AlertTriangle, ShoppingBag,
  Sparkles, RefreshCw, Settings2, Eye, EyeOff, RotateCcw, X,
  GripVertical,
} from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { dashboardService, DashboardCompleto } from '../services/dashboard';
import { useAuthStore } from '../stores/authStore';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { DashboardCharts } from '../components/dashboard/DashboardCharts';
import { useDashboardStore, DashboardSection } from '../stores/dashboardStore';
import { InfoTooltip } from '../components/ui/InfoTooltip';

// ============================================
// HELPERS
// ============================================

function getGreeting(): string {
  const ora = new Date().getHours();
  if (ora >= 5 && ora < 12) return 'Buongiorno';
  if (ora >= 12 && ora < 18) return 'Buon pomeriggio';
  return 'Buona sera';
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatEuroDecimal(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function calcTrendPercent(oggi: number, confronto: number): { value: number; positive: boolean } | null {
  if (confronto === 0 && oggi === 0) return null;
  if (confronto === 0) return { value: 100, positive: true };
  const pct = ((oggi - confronto) / confronto) * 100;
  return { value: Math.abs(Math.round(pct)), positive: pct >= 0 };
}

// ============================================
// ANIMATED COMPONENTS
// ============================================

const AnimatedNumber: React.FC<{ value: number; delay?: number }> = ({ value, delay = 0 }) => {
  const animated = useAnimatedCounter(value, { duration: 1000, delay, easing: 'easeOut' });
  return <>{animated}</>;
};

const AnimatedEuro: React.FC<{ value: number; delay?: number }> = ({ value, delay = 0 }) => {
  const animated = useAnimatedCounter(Math.round(value), { duration: 1000, delay, easing: 'easeOut' });
  return <>{formatEuro(animated)}</>;
};

// ============================================
// SECTION HEADER
// ============================================

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; delay?: number }> = ({ title, icon, delay = 0 }) => (
  <div
    className="flex items-center gap-2 mb-4 animate-fade-in-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
    >
      {icon}
    </div>
    <h2
      className="text-sm font-semibold uppercase tracking-wider"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {title}
    </h2>
  </div>
);

// ============================================
// SKELETON LOADER
// ============================================

const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`rounded-2xl p-5 ${className}`}
    style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--glass-border)',
    }}
  >
    <div className="h-4 w-24 rounded shimmer mb-3" />
    <div className="h-9 w-20 rounded shimmer mb-2" />
    <div className="h-3 w-32 rounded shimmer" />
  </div>
);

// ============================================
// DASHBOARD PROPS
// ============================================

interface DashboardProps {
  onNavigate?: (page: string) => void;
  onOpenAppuntamento?: (appuntamentoId: string) => void;
  onOpenCliente?: (clienteId: string) => void;
}

// ============================================
// CUSTOMIZE PANEL (with drag reorder)
// ============================================

const CustomizePanelItem: React.FC<{
  section: DashboardSection;
  onToggle: () => void;
}> = ({ section, onToggle }) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={section}
      dragControls={controls}
      dragListener={false}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors"
      style={{
        background: section.visible
          ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
          : 'transparent',
      }}
    >
      <button
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab active:cursor-grabbing p-0.5 rounded touch-none"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <GripVertical size={14} />
      </button>

      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-3 min-w-0"
      >
        {section.visible ? (
          <Eye size={16} style={{ color: 'var(--color-primary)' }} />
        ) : (
          <EyeOff size={16} style={{ color: 'var(--color-text-muted)' }} />
        )}
        <span
          className="text-sm font-medium flex-1 text-left truncate"
          style={{
            color: section.visible ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          }}
        >
          {section.label}
        </span>
      </button>

      <div
        className="w-8 h-[18px] rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer"
        onClick={onToggle}
        style={{
          background: section.visible
            ? 'var(--color-primary)'
            : 'color-mix(in srgb, var(--color-text-primary) 15%, transparent)',
        }}
      >
        <div
          className="w-3.5 h-3.5 rounded-full absolute top-[2px] transition-all duration-200"
          style={{
            background: 'white',
            left: section.visible ? '16px' : '2px',
          }}
        />
      </div>
    </Reorder.Item>
  );
};

const CustomizePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { sections, toggleSection, reorderSections, resetSections } = useDashboardStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden animate-fade-in-up"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(20px)',
        width: 300,
      }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Personalizza Dashboard
        </span>
        <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:opacity-70">
          <X size={16} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>
      <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <GripVertical size={12} style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Trascina per riordinare
        </span>
      </div>
      <div className="p-2">
        <Reorder.Group
          axis="y"
          values={sections}
          onReorder={reorderSections}
          className="space-y-0.5"
        >
          {sections.map((section) => (
            <CustomizePanelItem
              key={section.id}
              section={section}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </Reorder.Group>
      </div>
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <button
          onClick={resetSections}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{
            color: 'var(--color-text-muted)',
            background: 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)',
          }}
        >
          <RotateCcw size={12} />
          Ripristina predefiniti
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN DASHBOARD
// ============================================

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenAppuntamento, onOpenCliente }) => {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<DashboardCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const { sections, isCustomizing, setCustomizing } = useDashboardStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await dashboardService.getDashboardCompleto();
      setData(result);
    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const oggi = new Date();
  const opzioniData = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const;
  const dataFormattata = oggi.toLocaleDateString('it-IT', opzioniData);

  const trendVsIeri = data ? calcTrendPercent(data.fatturato_oggi, data.fatturato_ieri) : null;
  const trendVsSettimanaScorsa = data ? calcTrendPercent(data.fatturato_oggi, data.fatturato_stesso_giorno_settimana_scorsa) : null;

  const cardStyle = {
    background: 'var(--card-bg)',
    backdropFilter: 'blur(20px)',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 4px 24px var(--glass-shadow)',
  };

  // ============================================
  // SECTION RENDERERS
  // ============================================

  const renderOggi = () => (
    <div>
      <SectionHeader
        title="Oggi"
        icon={<CalendarClock size={16} style={{ color: 'var(--color-primary)' }} />}
        delay={50}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* APPUNTAMENTI OGGI */}
        {loading ? <SkeletonCard /> : (
          <div
            className="relative overflow-hidden rounded-2xl p-5 animate-fade-in-up cursor-pointer group card-hover-lift"
            style={{ ...cardStyle, animationDelay: '100ms' }}
            onClick={() => onNavigate?.('agenda')}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-dark))' }} />
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                Appuntamenti Oggi
                <InfoTooltip text="Numero totale di appuntamenti programmati per oggi, suddivisi per stato: confermati, in attesa, in ritardo e completati. Esclusi gli annullati." />
              </p>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
              >
                <Calendar size={20} className="text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <AnimatedNumber value={data?.appuntamenti_oggi.totale ?? 0} />
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {(data?.appuntamenti_oggi.confermati ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                  {data!.appuntamenti_oggi.confermati} confermati
                </span>
              )}
              {(data?.appuntamenti_oggi.in_attesa ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-warning)' }} />
                  {data!.appuntamenti_oggi.in_attesa} in attesa
                </span>
              )}
              {(data?.appuntamenti_oggi.in_ritardo ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-danger)' }} />
                  {data!.appuntamenti_oggi.in_ritardo} in ritardo
                </span>
              )}
              {(data?.appuntamenti_oggi.completati ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
                  {data!.appuntamenti_oggi.completati} completati
                </span>
              )}
            </div>
          </div>
        )}

        {/* FATTURATO OGGI */}
        {loading ? <SkeletonCard /> : (
          <div
            className="relative overflow-hidden rounded-2xl p-5 animate-fade-in-up card-hover-lift"
            style={{ ...cardStyle, animationDelay: '150ms' }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, var(--color-success), color-mix(in srgb, var(--color-success) 70%, black))' }} />
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                Fatturato Oggi
                <InfoTooltip text="Somma dei prezzi degli appuntamenti completati e in corso di oggi. Le percentuali mostrano il confronto con ieri e con lo stesso giorno della settimana scorsa." />
              </p>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 70%, black))', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-success) 30%, transparent)' }}
              >
                <Euro size={20} className="text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <AnimatedEuro value={data?.fatturato_oggi ?? 0} delay={100} />
            </p>
            <div className="flex items-center gap-3 text-xs">
              {trendVsIeri && (
                <span className="flex items-center gap-1" style={{ color: trendVsIeri.positive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {trendVsIeri.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {trendVsIeri.value}% vs ieri
                </span>
              )}
              {trendVsSettimanaScorsa && (
                <span className="flex items-center gap-1" style={{ color: trendVsSettimanaScorsa.positive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {trendVsSettimanaScorsa.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {trendVsSettimanaScorsa.value}% vs sett. scorsa
                </span>
              )}
              {!trendVsIeri && !trendVsSettimanaScorsa && (
                <span style={{ color: 'var(--color-text-muted)' }}>primo incasso del periodo</span>
              )}
            </div>
          </div>
        )}

        {/* PROSSIMO CLIENTE */}
        {loading ? <SkeletonCard /> : (
          <div
            className="relative overflow-hidden rounded-2xl p-5 animate-fade-in-up cursor-pointer group card-hover-lift"
            style={{ ...cardStyle, animationDelay: '200ms' }}
            onClick={() => data?.prossimo_appuntamento && onOpenAppuntamento?.(data.prossimo_appuntamento.id)}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-dark))' }} />
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                Prossimo Cliente
                <InfoTooltip text="Il prossimo appuntamento in programma da adesso in poi. Mostra il tempo rimanente, il nome del cliente, il trattamento e l'operatrice assegnata." />
              </p>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-secondary) 30%, transparent)' }}
              >
                <Clock size={20} className="text-white" />
              </div>
            </div>
            {data?.prossimo_appuntamento ? (
              <>
                <p className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {(() => {
                    const m = data.prossimo_appuntamento.minuti_mancanti;
                    if (m >= 1440) {
                      const giorni = Math.floor(m / 1440);
                      const ore = Math.floor((m % 1440) / 60);
                      return `tra ${giorni}g${ore > 0 ? ` ${ore}h` : ''}`;
                    }
                    if (m >= 60) {
                      const ore = Math.floor(m / 60);
                      const min = m % 60;
                      return `tra ${ore}h${min > 0 ? ` ${min}min` : ''}`;
                    }
                    return `tra ${m} min`;
                  })()}
                </p>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {data.prossimo_appuntamento.cliente_nome} {data.prossimo_appuntamento.cliente_cognome}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {data.prossimo_appuntamento.trattamento_nome} &middot; {data.prossimo_appuntamento.operatrice_nome}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text-muted)' }}>--:--</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nessun appuntamento</p>
              </>
            )}
          </div>
        )}

        {/* SLOT LIBERI */}
        {loading ? <SkeletonCard /> : (
          <div
            className="relative overflow-hidden rounded-2xl p-5 animate-fade-in-up cursor-pointer group card-hover-lift"
            style={{ ...cardStyle, animationDelay: '250ms' }}
            onClick={() => onNavigate?.('agenda')}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, var(--color-warning), color-mix(in srgb, var(--color-warning) 70%, black))` }} />
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                Slot Liberi
                <InfoTooltip text="Slot disponibili oggi. Calcolato come: (ore lavorative / durata slot) x operatrici attive, meno gli appuntamenti occupati (esclusi annullati e no-show)." />
              </p>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-warning), color-mix(in srgb, var(--color-warning) 70%, black))', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-warning) 30%, transparent)' }}
              >
                <Target size={20} className="text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <AnimatedNumber value={data?.slot_liberi_oggi ?? 0} delay={200} />
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              disponibili oggi
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderGrafici = () => (
    <div>
      <SectionHeader
        title="Andamento Settimanale"
        icon={<BarChart3 size={16} style={{ color: 'var(--color-primary)' }} />}
        delay={200}
      />
      <DashboardCharts dashboardData={data} />
    </div>
  );

  const renderAzioni = () => (
    <div>
      <SectionHeader
        title="Azioni"
        icon={<AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />}
        delay={300}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* CLIENTI DA RICONTATTARE */}
        {loading ? <SkeletonCard /> : (
          <div
            className="rounded-2xl p-4 animate-fade-in-up cursor-pointer card-hover-lift"
            style={{ ...cardStyle, animationDelay: '350ms' }}
            onClick={() => onNavigate?.('clienti')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' }}>
                <UserX size={18} style={{ color: 'var(--color-danger)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold flex items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
                  {data?.clienti_churn_count ?? 0}
                  <InfoTooltip text="Clienti che non vengono da oltre 90 giorni e potrebbero essere a rischio abbandono. Ricontattali per fidelizzarli." />
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Da ricontattare</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} className="ml-auto shrink-0" />
            </div>
          </div>
        )}

        {/* COMPLEANNI OGGI */}
        {loading ? <SkeletonCard /> : (
          <div
            className="rounded-2xl p-4 animate-fade-in-up card-hover-lift"
            style={{ ...cardStyle, animationDelay: '400ms' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' }}>
                <Cake size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold flex items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
                  {data?.compleanni_oggi.length ?? 0}
                  <InfoTooltip text="Clienti attivi che compiono gli anni oggi. Clicca sul nome per aprire la scheda cliente e inviargli gli auguri." />
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {data && data.compleanni_oggi.length > 0
                    ? data.compleanni_oggi.map((c, i) => (
                        <span
                          key={c.id}
                          className="cursor-pointer hover:underline"
                          style={{ color: 'var(--color-accent-dark)' }}
                          onClick={() => onOpenCliente?.(c.id)}
                        >
                          {c.nome}{i < data.compleanni_oggi.length - 1 ? ', ' : ''}
                        </span>
                      ))
                    : 'Nessun compleanno'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NO-SHOW DA RECUPERARE */}
        {loading ? <SkeletonCard /> : (
          <div
            className="rounded-2xl p-4 animate-fade-in-up cursor-pointer card-hover-lift"
            style={{ ...cardStyle, animationDelay: '450ms' }}
            onClick={() => onNavigate?.('clienti')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)' }}>
                <Users size={18} style={{ color: 'var(--color-warning)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold flex items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
                  {data?.no_show_recenti ?? 0}
                  <InfoTooltip text="Appuntamenti degli ultimi 30 giorni in cui il cliente non si e' presentato. Contattali per riprogrammare." />
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No-show da recuperare</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} className="ml-auto shrink-0" />
            </div>
          </div>
        )}

        {/* PRODOTTI SOTTO SCORTA */}
        {loading ? <SkeletonCard /> : (
          <div
            className="rounded-2xl p-4 animate-fade-in-up cursor-pointer card-hover-lift"
            style={{ ...cardStyle, animationDelay: '500ms' }}
            onClick={() => onNavigate?.('magazzino')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' }}>
                <PackageX size={18} style={{ color: 'var(--color-danger)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold flex items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
                  {(data?.alert_prodotti_sotto_scorta ?? 0) + (data?.alert_prodotti_in_scadenza ?? 0)}
                  <InfoTooltip text="Prodotti sotto scorta minima + prodotti in scadenza entro 30 giorni. Vai al magazzino per verificare e riordinare." />
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Prodotti in alert</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} className="ml-auto shrink-0" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAndamento = () => (
    <div>
      <SectionHeader
        title="Andamento"
        icon={<BarChart3 size={16} style={{ color: 'var(--color-success)' }} />}
        delay={550}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* FATTURATO MESE */}
        {loading ? <SkeletonCard /> : (
          <div
            className="rounded-2xl p-5 animate-fade-in-up card-hover-lift"
            style={{ ...cardStyle, animationDelay: '600ms' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                Fatturato Mese
                <InfoTooltip text="Totale incassato nel mese corrente (appuntamenti completati e in corso). La barra mostra la percentuale del mese trascorsa." />
              </p>
              <Euro size={16} style={{ color: 'var(--color-success)' }} />
            </div>
            <p className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              <AnimatedEuro value={data?.fatturato_mese ?? 0} delay={300} />
            </p>
            {(() => {
              const now = new Date();
              const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const dayOfMonth = now.getDate();
              const pctMonth = (dayOfMonth / daysInMonth) * 100;
              return (
                <div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--color-text-primary) 8%, transparent)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(pctMonth, 100)}%`,
                        background: 'linear-gradient(90deg, var(--color-success), color-mix(in srgb, var(--color-success) 70%, black))',
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {Math.round(pctMonth)}% del mese trascorso
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* NUOVI CLIENTI */}
        {loading ? <SkeletonCard /> : (
          <div
            className="rounded-2xl p-5 animate-fade-in-up card-hover-lift"
            style={{ ...cardStyle, animationDelay: '650ms' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                Nuovi Clienti
                <InfoTooltip text="Clienti registrati per la prima volta questo mese. 'Attivi' sono quelli con almeno un appuntamento nel mese corrente." />
              </p>
              <UserPlus size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              <AnimatedNumber value={data?.nuovi_clienti_mese ?? 0} delay={350} />
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              questo mese &middot; {data?.clienti_attivi_mese ?? 0} attivi
            </p>
          </div>
        )}

        {/* SCONTRINO MEDIO */}
        {loading ? <SkeletonCard /> : (
          <div
            className="rounded-2xl p-5 animate-fade-in-up card-hover-lift"
            style={{ ...cardStyle, animationDelay: '700ms' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                Scontrino Medio
                <InfoTooltip text="Importo medio per appuntamento completato. Calcolato come fatturato / numero appuntamenti completati. Mostrato per oggi e come media del mese." />
              </p>
              <ShoppingBag size={16} style={{ color: 'var(--color-secondary)' }} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {formatEuroDecimal(data?.scontrino_medio_oggi ?? 0)}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              oggi &middot; {formatEuroDecimal(data?.scontrino_medio_mese ?? 0)} media mese
            </p>
          </div>
        )}

        {/* SATURAZIONE AGENDA */}
        {loading ? <SkeletonCard /> : (
          <div
            className="rounded-2xl p-5 animate-fade-in-up card-hover-lift"
            style={{ ...cardStyle, animationDelay: '750ms' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                Saturazione Agenda
                <InfoTooltip text="Percentuale di slot occupati rispetto al totale disponibile. Verde >80%, giallo 50-80%, rosso <50%. Indica quanto e' piena l'agenda." />
              </p>
              <CalendarClock size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {Math.round(data?.saturazione_oggi_percentuale ?? 0)}%
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>oggi</p>
            </div>
            <div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--color-text-primary) 8%, transparent)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(data?.saturazione_oggi_percentuale ?? 0, 100)}%`,
                    background: (data?.saturazione_oggi_percentuale ?? 0) > 80
                      ? 'var(--color-success)'
                      : (data?.saturazione_oggi_percentuale ?? 0) > 50
                        ? 'var(--color-warning)'
                        : 'var(--color-danger)',
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Settimana: {Math.round(data?.saturazione_settimana_percentuale ?? 0)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTrattamentiTop = () => (
    <div
      className="rounded-2xl p-6 animate-fade-in-up card-hover-lift"
      style={{ ...cardStyle, animationDelay: '800ms' }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
          Trattamenti Top Oggi
          <InfoTooltip text="Classifica dei trattamenti piu' richiesti oggi, ordinati per numero di prenotazioni. Mostra quante volte e' stato eseguito e il ricavo totale per trattamento." />
        </h3>
        <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl shimmer mb-3" />
        ))
      ) : data && data.trattamenti_top_oggi.length > 0 ? (
        <div className="space-y-3">
          {data.trattamenti_top_oggi.map((t, i) => {
            const maxCount = data.trattamenti_top_oggi[0]?.count ?? 1;
            const pct = (t.count / maxCount) * 100;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {t.nome}
                  </span>
                  <span className="text-sm font-semibold shrink-0 ml-2" style={{ color: 'var(--color-text-primary)' }}>
                    {t.count}x &middot; {formatEuro(t.ricavo)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--color-text-primary) 6%, transparent)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: i === 0
                        ? 'linear-gradient(90deg, var(--color-accent), var(--color-accent-dark))'
                        : i === 1
                          ? 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-dark))'
                          : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-dark))',
                    }}
                  />
                </div>
              </div>
            );
          })}
          {data.vendita_prodotti_oggi > 0 && (
            <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Vendita prodotti oggi
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                  {formatEuro(data.vendita_prodotti_oggi)}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-text-primary) 3%, transparent)' }}>
          <Sparkles size={32} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-2" />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nessun trattamento ancora oggi</p>
        </div>
      )}
    </div>
  );

  const renderProssimiAppuntamenti = () => (
    <div
      className="rounded-2xl p-6 animate-fade-in-up card-hover-lift"
      style={{ ...cardStyle, animationDelay: '850ms' }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
          Prossimi Appuntamenti
          <InfoTooltip text="I prossimi appuntamenti in ordine cronologico. Clicca su un appuntamento per aprire il dettaglio. Il primo della lista e' evidenziato." />
        </h3>
        <button
          onClick={() => onNavigate?.('agenda')}
          className="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-80"
          style={{ color: 'var(--color-primary)' }}
        >
          Vedi tutti
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl shimmer" />
          ))
        ) : data && data.prossimi_appuntamenti.length > 0 ? (
          data.prossimi_appuntamenti.map((app, index) => {
            const dataOra = new Date(app.data_ora_inizio);
            const ora = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const giorno = dataOra.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
            const isFirst = index === 0;

            return (
              <div
                key={app.id}
                onClick={() => onOpenAppuntamento?.(app.id)}
                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer group hover:scale-[1.01]"
                style={{
                  background: isFirst
                    ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
                    : 'color-mix(in srgb, var(--color-text-primary) 2%, transparent)',
                  border: isFirst ? '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)' : '1px solid transparent',
                }}
              >
                <div
                  className="min-w-[56px] text-center py-1.5 px-2 rounded-lg"
                  style={{
                    background: isFirst
                      ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                      : 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)',
                  }}
                >
                  <div className="text-base font-bold" style={{ color: isFirst ? 'white' : 'var(--color-text-primary)' }}>
                    {ora}
                  </div>
                  <div className="text-[10px]" style={{ color: isFirst ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}>
                    {giorno}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {app.cliente_nome} {app.cliente_cognome}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {app.trattamento_nome || 'Nessun trattamento'}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {app.operatrice_nome}
                  </div>
                  <div
                    className="text-[10px] font-medium mt-0.5 px-2 py-0.5 rounded-full inline-block"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                      color: 'var(--color-accent-dark)',
                    }}
                  >
                    {app.trattamento_durata}min
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  style={{ color: 'var(--color-text-muted)' }}
                  className="group-hover:translate-x-1 transition-transform shrink-0"
                />
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-text-primary) 3%, transparent)' }}>
            <Calendar size={32} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nessun appuntamento in programma</p>
          </div>
        )}
      </div>
    </div>
  );

  // Map section IDs to render functions
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    oggi: renderOggi,
    grafici: renderGrafici,
    azioni: renderAzioni,
    andamento: renderAndamento,
    trattamenti_top: renderTrattamentiTop,
    prossimi_appuntamenti: renderProssimiAppuntamenti,
  };

  // Visible sections in user-defined order
  const visibleSections = sections.filter(s => s.visible);

  return (
    <div className="space-y-8">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="flex items-end justify-between animate-fade-in-up">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {getGreeting()}, <span className="gradient-text">{user?.nome || 'Utente'}</span>!
          </h1>
          <p className="mt-1 capitalize" style={{ color: 'var(--color-text-muted)' }}>
            {dataFormattata}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setCustomizing(!isCustomizing)}
              className="p-2 rounded-xl transition-all hover:scale-105"
              style={{
                background: isCustomizing
                  ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)'
                  : 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              }}
              title="Personalizza dashboard"
            >
              <Settings2 size={18} style={{ color: 'var(--color-primary)' }} />
            </button>
            {isCustomizing && <CustomizePanel onClose={() => setCustomizing(false)} />}
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
            title="Aggiorna dati"
          >
            <RefreshCw size={18} style={{ color: 'var(--color-primary)' }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTIONS — rendered in user-defined order */}
      {/* ============================================ */}
      {visibleSections.map(section => {
        const renderer = sectionRenderers[section.id];
        if (!renderer) return null;
        return <div key={section.id}>{renderer()}</div>;
      })}
    </div>
  );
};
