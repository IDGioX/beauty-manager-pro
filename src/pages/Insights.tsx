import React, { useState, useEffect } from 'react';
import {
  Users,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Crown,
  UserMinus,
  UserPlus,
  UserCheck,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Info,
  Target,
} from 'lucide-react';
import { insightsService, InsightsData, ClienteSegmentato } from '../services/insights';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

type TabId = 'clienti' | 'performance';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'clienti', label: 'Clienti', icon: Users },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function Insights() {
  const [activeTab, setActiveTab] = useState<TabId>('clienti');
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await insightsService.getInsightsData();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento');
      console.error('Insights error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Insights
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Analisi intelligente dei tuoi dati
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Aggiorna
        </button>
      </div>

      {/* TABS */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'var(--glass-border)' }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center"
              style={{
                background: isActive ? 'var(--card-bg)' : 'transparent',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* CONTENT */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : data ? (
        <>
          {activeTab === 'clienti' && <TabClienti data={data} />}
          {activeTab === 'performance' && <TabPerformance data={data} />}
        </>
      ) : null}
    </div>
  );
}

// ============================================
// TAB: CLIENTI
// ============================================

function TabClienti({ data }: { data: InsightsData }) {
  const { segmentazione } = data;
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

  const segments = [
    {
      id: 'vip',
      label: 'VIP',
      icon: Crown,
      color: 'var(--color-warning)',
      clients: segmentazione.vip,
      description: 'Spesa superiore alla media e almeno 5 visite',
    },
    {
      id: 'abituali',
      label: 'Abituali',
      icon: UserCheck,
      color: 'var(--color-success)',
      clients: segmentazione.abituali,
      description: 'Clienti fidelizzati attivi negli ultimi 60 giorni',
    },
    {
      id: 'nuovi',
      label: 'Nuovi',
      icon: UserPlus,
      color: 'var(--color-primary)',
      clients: segmentazione.nuovi,
      description: 'Una sola visita negli ultimi 60 giorni',
    },
    {
      id: 'a_rischio',
      label: 'A Rischio',
      icon: AlertTriangle,
      color: 'var(--color-warning)',
      clients: segmentazione.a_rischio,
      description: 'Assenti da 60-120 giorni',
    },
    {
      id: 'persi',
      label: 'Persi',
      icon: UserMinus,
      color: 'var(--color-danger)',
      clients: segmentazione.persi,
      description: 'Assenti da oltre 120 giorni',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI ROW */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Clienti Attivi"
          value={segmentazione.totale_clienti_attivi.toString()}
          icon={Users}
          explanation="Tutti i clienti che hanno almeno un appuntamento completato. Include VIP, abituali, nuovi, a rischio e persi."
        />
        <KpiCard
          label="Tasso di Ritorno"
          value={`${segmentazione.tasso_ritorno.toFixed(0)}%`}
          icon={TrendingUp}
          color={segmentazione.tasso_ritorno >= 60 ? 'var(--color-success)' : 'var(--color-warning)'}
          explanation="Percentuale di clienti che tornano almeno una seconda volta. Sotto il 50% è un segnale d'allarme, sopra il 70% è ottimo."
        />
        <KpiCard
          label="Clienti VIP"
          value={segmentazione.vip.length.toString()}
          icon={Crown}
          color="var(--color-warning)"
          explanation="Clienti con spesa totale superiore al doppio della media e almeno 5 visite. Sono i clienti più importanti da coccolare."
        />
      </div>

      {/* SEGMENTS */}
      <div className="space-y-3">
        {segments.map(seg => (
          <div key={seg.id}>
            <button
              onClick={() => setExpandedSegment(expandedSegment === seg.id ? null : seg.id)}
              className="w-full flex items-center justify-between p-4 rounded-2xl transition-all"
              style={{
                background: 'var(--card-bg)',
                border: expandedSegment === seg.id ? `1px solid color-mix(in srgb, ${seg.color} 30%, transparent)` : '1px solid var(--glass-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `color-mix(in srgb, ${seg.color} 10%, transparent)`, color: seg.color }}
                >
                  <seg.icon size={18} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {seg.label}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `color-mix(in srgb, ${seg.color} 10%, transparent)`, color: seg.color }}
                    >
                      {seg.clients.length}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{seg.description}</p>
                </div>
              </div>
              <ChevronRight
                size={16}
                style={{
                  color: 'var(--color-text-muted)',
                  transform: expandedSegment === seg.id ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {expandedSegment === seg.id && seg.clients.length > 0 && (
              <div
                className="mt-1 rounded-2xl overflow-hidden"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>Cliente</th>
                      <th className="text-right text-xs font-medium px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>Visite</th>
                      <th className="text-right text-xs font-medium px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>Spesa Totale</th>
                      <th className="text-right text-xs font-medium px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>Ultima Visita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seg.clients.slice(0, 20).map(c => (
                      <ClienteRow key={c.cliente_id} cliente={c} />
                    ))}
                  </tbody>
                </table>
                {seg.clients.length > 20 && (
                  <p className="text-center text-xs py-3" style={{ color: 'var(--color-text-muted)' }}>
                    e altri {seg.clients.length - 20} clienti...
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClienteRow({ cliente }: { cliente: ClienteSegmentato }) {
  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try {
      return format(new Date(d), 'dd MMM yyyy', { locale: it });
    } catch {
      return '-';
    }
  };

  return (
    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
      <td className="px-4 py-3">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {cliente.nome} {cliente.cognome}
        </span>
        {cliente.cellulare && (
          <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>{cliente.cellulare}</span>
        )}
      </td>
      <td className="text-right px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {cliente.totale_appuntamenti}
      </td>
      <td className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {cliente.spesa_totale.toFixed(0)}€
      </td>
      <td className="text-right px-4 py-3">
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {formatDate(cliente.ultimo_appuntamento)}
        </span>
        {cliente.giorni_assenza != null && cliente.giorni_assenza > 0 && (
          <span className="text-xs block" style={{ color: cliente.giorni_assenza > 90 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
            {cliente.giorni_assenza}gg fa
          </span>
        )}
      </td>
    </tr>
  );
}

// ============================================
// TAB: PERFORMANCE
// ============================================

function TabPerformance({ data }: { data: InsightsData }) {
  return (
    <div className="space-y-6">
      {/* HEATMAP OCCUPAZIONE */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}>
            <Clock size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Mappa Occupazione</h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ultimi 90 giorni — più scuro = più appuntamenti</p>
          </div>
        </div>
        <OccupazioneHeatmap slots={data.occupazione} />
        <InfoExpander>
          <p><strong>Come si legge:</strong> Ogni cella rappresenta una fascia oraria in un giorno della settimana. Più la cella è scura, più appuntamenti ci sono stati in quel momento negli ultimi 90 giorni.</p>
          <p><strong>A cosa serve:</strong> Individua le ore e i giorni "morti" dove hai pochi appuntamenti. Puoi usarli per promozioni mirate (es. "Sconto 20% il martedì pomeriggio") o per ottimizzare i turni delle operatrici.</p>
          <p><strong>Come viene calcolato:</strong> Conta tutti gli appuntamenti non annullati degli ultimi 90 giorni, raggruppati per giorno della settimana e fascia oraria.</p>
        </InfoExpander>
      </div>

      {/* MARGINI TRATTAMENTI */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-success) 10%, transparent)', color: 'var(--color-success)' }}>
            <Target size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Margine per Trattamento</h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ultimi 12 mesi — ricavo meno costo prodotti usati</p>
          </div>
        </div>

        {data.margini_trattamenti.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>
            Dati insufficienti — servono almeno 3 appuntamenti per trattamento
          </p>
        ) : (
          <div className="space-y-3">
            {data.margini_trattamenti.slice(0, 10).map(m => (
              <MargineBar key={m.trattamento_id} margine={m} maxRicavo={data.margini_trattamenti[0]?.ricavo_totale || 1} />
            ))}
          </div>
        )}
        <InfoExpander>
          <p><strong>Come si legge:</strong> La barra verde chiaro è il ricavo totale del trattamento, la barra rossa rappresenta il costo dei prodotti usati. La percentuale è il margine: quanto ti resta dopo aver tolto i costi dei prodotti.</p>
          <p><strong>A cosa serve:</strong> Capire quali trattamenti ti fanno realmente guadagnare. Un trattamento con tanti appuntamenti ma margine basso potrebbe non valere lo sforzo. Al contrario, uno con margine alto meriterebbe più promozione.</p>
          <p><strong>Come viene calcolato:</strong> Ricavo = somma dei prezzi applicati negli ultimi 12 mesi. Costo = somma dei prodotti scaricati dal magazzino per quegli appuntamenti, moltiplicati per il loro prezzo d'acquisto. Mostrati solo trattamenti con almeno 3 appuntamenti.</p>
        </InfoExpander>
      </div>

      {/* CONFRONTO MESI */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}>
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Andamento Mensile</h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ultimi 12 mesi</p>
          </div>
        </div>

        {data.confronto_mesi.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>Nessun dato disponibile</p>
        ) : (
          <div className="space-y-1">
            <MonthlyChart months={data.confronto_mesi} />
          </div>
        )}
        <InfoExpander>
          <p><strong>Come si legge:</strong> Ogni barra rappresenta il fatturato di un mese. L'ultima barra (più scura) è il mese corrente. I numeri in basso riassumono fatturato, appuntamenti, clienti unici e ticket medio dell'ultimo mese.</p>
          <p><strong>A cosa serve:</strong> Avere una visione d'insieme dell'andamento nel tempo. Individuare stagionalità (mesi forti e deboli), tendenze di crescita o calo, e confrontare le performance.</p>
          <p><strong>Ticket medio:</strong> Il fatturato diviso per il numero di appuntamenti. Se il ticket medio sale, stai vendendo trattamenti più costosi o facendo upselling.</p>
        </InfoExpander>
      </div>
    </div>
  );
}

function OccupazioneHeatmap({ slots }: { slots: InsightsData['occupazione'] }) {
  const giorni = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const giorniIdx = [1, 2, 3, 4, 5, 6]; // SQLite %w: 0=Sun, 1=Mon...
  const fasce = ['09-10', '10-11', '11-12', '12-13', '13-14', '14-15', '15-16', '16-17', '17-18', '18-19'];

  const slotMap: Record<string, number> = {};
  let maxVal = 1;
  for (const s of slots) {
    const key = `${s.giorno_settimana}-${s.fascia_oraria}`;
    slotMap[key] = s.totale_appuntamenti;
    if (s.totale_appuntamenti > maxVal) maxVal = s.totale_appuntamenti;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Header */}
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '60px repeat(10, 1fr)' }}>
          <div />
          {fasce.map(f => (
            <div key={f} className="text-center text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {f}
            </div>
          ))}
        </div>
        {/* Rows */}
        {giorniIdx.map((gIdx, i) => (
          <div key={gIdx} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '60px repeat(10, 1fr)' }}>
            <div className="flex items-center text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {giorni[i]}
            </div>
            {fasce.map(f => {
              const val = slotMap[`${gIdx}-${f}`] || 0;
              const intensity = val / maxVal;
              return (
                <div
                  key={f}
                  className="rounded-md aspect-[2/1] flex items-center justify-center text-[10px] font-medium transition-all cursor-default"
                  style={{
                    background: val > 0
                      ? `color-mix(in srgb, var(--color-primary) ${Math.round(intensity * 60 + 5)}%, var(--card-bg))`
                      : 'var(--glass-border)',
                    color: intensity > 0.5 ? 'var(--color-text-on-primary, white)' : 'var(--color-text-muted)',
                    opacity: val > 0 ? 1 : 0.4,
                  }}
                  title={`${giorni[i]} ${f}: ${val} appuntamenti`}
                >
                  {val > 0 ? val : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MargineBar({ margine, maxRicavo }: { margine: InsightsData['margini_trattamenti'][0]; maxRicavo: number }) {
  const barWidth = (margine.ricavo_totale / maxRicavo) * 100;
  const costoWidth = (margine.costo_prodotti / maxRicavo) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
          {margine.trattamento_nome}
        </span>
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {margine.totale_appuntamenti} app.
          </span>
          <span className="text-sm font-bold" style={{ color: margine.margine_percentuale >= 80 ? 'var(--color-success)' : margine.margine_percentuale >= 50 ? 'var(--color-text-primary)' : 'var(--color-warning)' }}>
            {margine.margine_percentuale.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="relative h-5 rounded-lg overflow-hidden" style={{ background: 'var(--glass-border)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-lg"
          style={{ width: `${barWidth}%`, background: 'color-mix(in srgb, var(--color-success) 25%, transparent)' }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-lg"
          style={{ width: `${costoWidth}%`, background: 'color-mix(in srgb, var(--color-danger) 20%, transparent)' }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {margine.ricavo_totale.toFixed(0)}€ ricavo
          </span>
          {margine.costo_prodotti > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {margine.costo_prodotti.toFixed(0)}€ costi
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthlyChart({ months }: { months: InsightsData['confronto_mesi'] }) {
  const maxRicavo = Math.max(...months.map(m => m.ricavo), 1);

  const formatMonth = (m: string) => {
    try {
      const [y, mo] = m.split('-');
      const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
      return format(d, 'MMM yy', { locale: it });
    } catch {
      return m;
    }
  };

  return (
    <div>
      {/* Chart bars */}
      <div className="flex items-end gap-2" style={{ height: '180px' }}>
        {months.map((m, i) => {
          const height = (m.ricavo / maxRicavo) * 100;

          return (
            <div key={m.mese} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {m.ricavo >= 1000 ? `${(m.ricavo / 1000).toFixed(1)}k` : `${m.ricavo.toFixed(0)}€`}
              </span>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${Math.max(height, 2)}%`,
                  background: i === months.length - 1
                    ? 'var(--color-primary)'
                    : 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
                }}
              />
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {formatMonth(m.mese)}
              </span>
            </div>
          );
        })}
      </div>
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4 mt-5 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
        {months.length > 0 && (() => {
          const last = months[months.length - 1];
          return (
            <>
              <MiniStat label="Fatturato" value={`${last.ricavo.toFixed(0)}€`} />
              <MiniStat label="Appuntamenti" value={last.appuntamenti.toString()} />
              <MiniStat label="Clienti" value={last.clienti_unici.toString()} />
              <MiniStat label="Ticket Medio" value={`${last.ticket_medio.toFixed(0)}€`} />
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================

function KpiCard({ label, value, icon: Icon, color, explanation }: { label: string; value: string; icon: React.ElementType; color?: string; explanation?: string }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div
      className="p-4 rounded-2xl"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: color || 'var(--color-text-muted)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        {explanation && (
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="ml-auto p-0.5 rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <Info size={12} />
          </button>
        )}
      </div>
      <span className="text-2xl font-bold" style={{ color: color || 'var(--color-text-primary)' }}>
        {value}
      </span>
      {showInfo && explanation && (
        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {explanation}
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
    </div>
  );
}

function InfoExpander({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
      >
        <Info size={13} />
        {open ? 'Nascondi dettagli' : 'Come si legge questo dato?'}
        <ChevronDown
          size={13}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>
      {open && (
        <div
          className="mt-2 p-3 rounded-xl text-xs leading-relaxed space-y-1.5"
          style={{ background: 'color-mix(in srgb, var(--color-primary) 5%, var(--card-bg))', border: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--glass-border)' }} />
            <div className="space-y-2 flex-1">
              <div className="h-3 rounded-full w-48" style={{ background: 'var(--glass-border)' }} />
              <div className="h-2 rounded-full w-64" style={{ background: 'var(--glass-border)' }} />
            </div>
          </div>
          <div className="h-2 rounded-full w-full" style={{ background: 'var(--glass-border)' }} />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--color-text-muted)' }}>
      <AlertTriangle size={40} className="mb-4 opacity-30" />
      <p className="text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 rounded-xl text-sm font-medium"
        style={{ background: 'var(--color-primary)', color: 'white' }}
      >
        Riprova
      </button>
    </div>
  );
}
