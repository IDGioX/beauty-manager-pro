import { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, RotateCcw, Eye, History, ArrowUpDown, X, User, Users, Truck, AlertTriangle } from 'lucide-react';
import { MovimentoDetailModal } from './MovimentoDetailModal';
import { magazzinoService } from '../../services/magazzino';
import { operatriciService } from '../../services/operatrici';
import { clientiService } from '../../services/clienti';
import {
  MovimentoMagazzino,
  FiltriMovimenti,
  TipoMovimento,
  TIPI_MOVIMENTO_LABELS,
} from '../../types/magazzino';
import { Operatrice } from '../../types/agenda';
import { Cliente } from '../../types/cliente';

interface MovimentiTabProps {
  onOpenCarico?: () => void;
  onOpenScarico?: () => void;
  onOpenAppuntamento?: (appuntamentoId: string) => void;
}

type DatePreset = 'oggi' | 'settimana' | 'mese' | '30gg' | '90gg' | 'tutto';

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'oggi', label: 'Oggi' },
  { key: 'settimana', label: 'Settimana' },
  { key: 'mese', label: 'Mese' },
  { key: '30gg', label: '30 gg' },
  { key: '90gg', label: '90 gg' },
  { key: 'tutto', label: 'Tutto' },
];

const TIPO_COLORS: Record<TipoMovimento, { border: string; bg: string; text: string }> = {
  carico:          { border: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981' },
  reso:            { border: '#34d399', bg: 'rgba(52, 211, 153, 0.08)', text: '#059669' },
  scarico_uso:     { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)',  text: '#ef4444' },
  scarico_vendita: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', text: '#d97706' },
  scarto:          { border: '#9ca3af', bg: 'rgba(156, 163, 175, 0.08)', text: '#6b7280' },
  inventario:      { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', text: '#3b82f6' },
};

function getDateRange(preset: DatePreset): { data_da?: string; data_a?: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (preset) {
    case 'oggi':
      return { data_da: fmt(now), data_a: fmt(now) };
    case 'settimana': {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { data_da: fmt(monday), data_a: fmt(now) };
    }
    case 'mese':
      return { data_da: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), data_a: fmt(now) };
    case '30gg': {
      const d30 = new Date(now);
      d30.setDate(now.getDate() - 30);
      return { data_da: fmt(d30), data_a: fmt(now) };
    }
    case '90gg': {
      const d90 = new Date(now);
      d90.setDate(now.getDate() - 90);
      return { data_da: fmt(d90), data_a: fmt(now) };
    }
    case 'tutto':
      return {};
  }
}

function groupByDate(movimenti: MovimentoMagazzino[]): { date: string; label: string; items: MovimentoMagazzino[] }[] {
  const groups: Map<string, MovimentoMagazzino[]> = new Map();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  for (const m of movimenti) {
    const dateKey = m.created_at.split('T')[0];
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(m);
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => {
    let label: string;
    if (dateKey === today) label = 'Oggi';
    else if (dateKey === yesterday) label = 'Ieri';
    else label = new Date(dateKey).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return { date: dateKey, label, items };
  });
}

export function MovimentiTab({ onOpenCarico, onOpenScarico, onOpenAppuntamento }: MovimentiTabProps) {
  const [movimenti, setMovimenti] = useState<MovimentoMagazzino[]>([]);
  const [operatrici, setOperatrici] = useState<Operatrice[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovimento, setSelectedMovimento] = useState<MovimentoMagazzino | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('30gg');
  const [filtri, setFiltri] = useState<FiltriMovimenti>(() => ({
    ...getDateRange('30gg'),
  }));
  // Track which stat card is active as filter
  const [activeStatFilter, setActiveStatFilter] = useState<'all' | 'entrate' | 'uscite' | 'inventario'>('all');

  const loadMovimenti = async (f?: FiltriMovimenti) => {
    try {
      setLoading(true);
      const data = await magazzinoService.getMovimenti(f ?? filtri, 500);
      setMovimenti(data);
    } catch (error) {
      console.error('Errore caricamento movimenti:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    operatriciService.getOperatrici().then(setOperatrici).catch(console.error);
    clientiService.getClienti().then(setClienti).catch(console.error);
  }, []);

  useEffect(() => {
    loadMovimenti(filtri);
  }, [filtri]);

  // Apply date preset
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const range = getDateRange(preset);
    setFiltri(prev => ({ ...prev, data_da: range.data_da, data_a: range.data_a }));
  };

  // Set individual filter
  const setFilter = <K extends keyof FiltriMovimenti>(key: K, value: FiltriMovimenti[K]) => {
    setFiltri(prev => ({ ...prev, [key]: value }));
    // If changing date manually, clear preset
    if (key === 'data_da' || key === 'data_a') setDatePreset('tutto');
  };

  const clearFilter = (key: keyof FiltriMovimenti) => {
    setFiltri(prev => ({ ...prev, [key]: undefined }));
    if (key === 'data_da' || key === 'data_a') setDatePreset('tutto');
  };

  const handleResetAll = () => {
    setFiltri({});
    setSearchTerm('');
    setDatePreset('tutto');
    setActiveStatFilter('all');
  };

  // Active filter chips
  const activeFilters: { key: keyof FiltriMovimenti; label: string }[] = useMemo(() => {
    const chips: { key: keyof FiltriMovimenti; label: string }[] = [];
    if (filtri.tipo) chips.push({ key: 'tipo', label: `Tipo: ${TIPI_MOVIMENTO_LABELS[filtri.tipo]}` });
    if (filtri.operatrice_id) {
      const op = operatrici.find(o => o.id === filtri.operatrice_id);
      chips.push({ key: 'operatrice_id', label: `Operatrice: ${op ? `${op.nome} ${op.cognome}` : '...'}` });
    }
    if (filtri.cliente_id) {
      const cl = clienti.find(c => c.id === filtri.cliente_id);
      chips.push({ key: 'cliente_id', label: `Cliente: ${cl ? `${cl.nome} ${cl.cognome}` : '...'}` });
    }
    if (filtri.fornitore) chips.push({ key: 'fornitore', label: `Fornitore: ${filtri.fornitore}` });
    return chips;
  }, [filtri, operatrici, clienti]);

  // Text search
  const formatDateShort = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const searchFiltered = useMemo(() => {
    if (!searchTerm) return movimenti;
    const s = searchTerm.toLowerCase().trim();
    return movimenti.filter(m =>
      [m.prodotto_nome, m.prodotto_codice, m.cliente_nome, m.operatrice_nome,
        m.fornitore, formatDateShort(m.created_at), TIPI_MOVIMENTO_LABELS[m.tipo],
        m.note, m.documento_riferimento, m.lotto,
      ].some(v => v?.toLowerCase().includes(s))
    );
  }, [movimenti, searchTerm]);

  // Apply stat card filter
  const filteredMovimenti = useMemo(() => {
    if (activeStatFilter === 'all') return searchFiltered;
    return searchFiltered.filter(m => {
      switch (activeStatFilter) {
        case 'entrate': return ['carico', 'reso'].includes(m.tipo);
        case 'uscite': return ['scarico_uso', 'scarico_vendita', 'scarto'].includes(m.tipo);
        case 'inventario': return m.tipo === 'inventario';
        default: return true;
      }
    });
  }, [searchFiltered, activeStatFilter]);

  // Stats computed from full (non-stat-filtered) dataset
  const stats = useMemo(() => {
    const entrate = searchFiltered.filter(m => ['carico', 'reso'].includes(m.tipo));
    const uscite = searchFiltered.filter(m => ['scarico_uso', 'scarico_vendita', 'scarto'].includes(m.tipo));
    const inv = searchFiltered.filter(m => m.tipo === 'inventario');
    const qtyEntrate = entrate.reduce((sum, m) => sum + m.quantita, 0);
    const qtyUscite = uscite.reduce((sum, m) => sum + m.quantita, 0);
    return {
      total: searchFiltered.length,
      entrate: entrate.length,
      uscite: uscite.length,
      inventari: inv.length,
      qtyEntrate,
      qtyUscite,
      netto: qtyEntrate - qtyUscite,
    };
  }, [searchFiltered]);

  // Grouped data
  const groupedMovimenti = useMemo(() => groupByDate(filteredMovimenti), [filteredMovimenti]);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  const getQuantitaDisplay = (m: MovimentoMagazzino) => {
    const isPositive = ['carico', 'reso'].includes(m.tipo) || (m.tipo === 'inventario' && m.quantita > 0);
    return (
      <span className="font-semibold tabular-nums text-[13px]" style={{ color: isPositive ? '#10b981' : m.tipo === 'scarto' ? '#6b7280' : '#ef4444' }}>
        {isPositive ? '+' : '−'}{m.quantita}
      </span>
    );
  };

  const handleStatClick = (filter: 'all' | 'entrate' | 'uscite' | 'inventario') => {
    setActiveStatFilter(prev => prev === filter ? 'all' : filter);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* STAT CARDS - clickable as quick filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-up">
        {([
          { key: 'all' as const, icon: <ArrowUpDown size={17} />, value: stats.total, label: 'Totale', accent: '#6366f1' },
          { key: 'entrate' as const, icon: <TrendingUp size={17} />, value: stats.entrate, label: 'Entrate', accent: '#10b981', sub: `+${stats.qtyEntrate} pz` },
          { key: 'uscite' as const, icon: <TrendingDown size={17} />, value: stats.uscite, label: 'Uscite', accent: '#ef4444', sub: `−${stats.qtyUscite} pz` },
          { key: 'inventario' as const, icon: <RotateCcw size={17} />, value: stats.inventari, label: 'Inventari', accent: '#3b82f6' },
        ]).map(s => (
          <button key={s.key} onClick={() => handleStatClick(s.key)}
            className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
            style={{
              background: activeStatFilter === s.key ? `${s.accent}10` : 'var(--card-bg)',
              border: `1.5px solid ${activeStatFilter === s.key ? s.accent : 'var(--glass-border)'}`,
              boxShadow: activeStatFilter === s.key ? `0 0 0 1px ${s.accent}30` : 'none',
            }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.accent}15`, color: s.accent }}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {s.label}
                {s.sub && <span className="ml-1 font-medium" style={{ color: s.accent }}>{s.sub}</span>}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* FILTER BAR - always visible, horizontal */}
      <div className="rounded-xl p-3 animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '50ms' }}>
        {/* Row 1: Search + Date presets */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={15} style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Cerca prodotto, cliente, fornitore..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[13px]"
              style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }} />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded" style={{ color: 'var(--color-text-muted)' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Date presets */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {DATE_PRESETS.map(p => (
              <button key={p.key} onClick={() => applyDatePreset(p.key)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
                style={{
                  background: datePreset === p.key ? 'var(--color-primary, #6366f1)' : 'transparent',
                  color: datePreset === p.key ? 'white' : 'var(--color-text-secondary)',
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Divider + custom date range */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0" style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '10px' }}>
            <input type="date" value={filtri.data_da || ''} onChange={e => setFilter('data_da', e.target.value || undefined)}
              className="px-2 py-1 rounded-md text-[11px]"
              style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }} />
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>—</span>
            <input type="date" value={filtri.data_a || ''} onChange={e => setFilter('data_a', e.target.value || undefined)}
              className="px-2 py-1 rounded-md text-[11px]"
              style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }} />
          </div>
        </div>

        {/* Row 2: Dropdown filters */}
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {/* Tipo */}
          <select value={filtri.tipo || ''} onChange={e => setFilter('tipo', (e.target.value as TipoMovimento) || undefined)}
            className="px-2.5 py-1 rounded-lg text-[12px]"
            style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: filtri.tipo ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
            <option value="">Tipo movimento</option>
            {Object.entries(TIPI_MOVIMENTO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          {/* Operatrice */}
          <select value={filtri.operatrice_id || ''} onChange={e => setFilter('operatrice_id', e.target.value || undefined)}
            className="px-2.5 py-1 rounded-lg text-[12px]"
            style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: filtri.operatrice_id ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
            <option value="">Operatrice</option>
            {operatrici.map(op => <option key={op.id} value={op.id}>{op.nome} {op.cognome}</option>)}
          </select>

          {/* Cliente */}
          <select value={filtri.cliente_id || ''} onChange={e => setFilter('cliente_id', e.target.value || undefined)}
            className="px-2.5 py-1 rounded-lg text-[12px]"
            style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: filtri.cliente_id ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
            <option value="">Cliente</option>
            {clienti.map(cl => <option key={cl.id} value={cl.id}>{cl.nome} {cl.cognome}</option>)}
          </select>

          {/* Fornitore */}
          <input type="text" placeholder="Fornitore..." value={filtri.fornitore || ''}
            onChange={e => setFilter('fornitore', e.target.value || undefined)}
            className="px-2.5 py-1 rounded-lg text-[12px] w-32"
            style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }} />

          {/* Spacer + reset */}
          <div className="flex-1" />
          {(activeFilters.length > 0 || searchTerm) && (
            <button onClick={handleResetAll}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
              <X size={12} />Resetta
            </button>
          )}
        </div>

        {/* Row 3: Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {activeFilters.map(f => (
              <span key={f.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ background: 'var(--color-primary, #6366f1)', color: 'white' }}>
                {f.label}
                <button onClick={() => clearFilter(f.key)} className="hover:opacity-80 ml-0.5"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '100ms' }}>
        {loading && movimenti.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-16 rounded shimmer" /><div className="flex-1 space-y-1.5"><div className="h-4 w-40 rounded shimmer" /><div className="h-3 w-24 rounded shimmer" /></div>
                <div className="h-5 w-16 rounded-full shimmer" /><div className="h-4 w-10 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : filteredMovimenti.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
              <History size={26} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Nessun movimento trovato</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {searchTerm || activeFilters.length > 0 ? 'Prova a modificare i filtri di ricerca' : 'I movimenti appariranno qui dopo un carico o scarico'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10" style={{ background: 'var(--card-bg)' }}>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {/* Color rail spacer */}
                  <th className="w-1 p-0" />
                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)' }}>Ora</th>
                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)' }}>Tipo</th>
                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)' }}>Prodotto</th>
                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)' }}>Riferimenti</th>
                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--color-text-muted)' }}>Qtà</th>
                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--color-text-muted)' }}>Giacenza</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {groupedMovimenti.map(group => (
                  <>
                    {/* Date group header */}
                    <tr key={`group-${group.date}`}>
                      <td colSpan={8} className="px-3 py-2" style={{ background: 'var(--glass-border)' }}>
                        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                          {group.label}
                        </span>
                        <span className="text-[10px] ml-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                          ({group.items.length} moviment{group.items.length === 1 ? 'o' : 'i'})
                        </span>
                      </td>
                    </tr>
                    {group.items.map(m => {
                      const colors = TIPO_COLORS[m.tipo] || TIPO_COLORS.inventario;
                      return (
                        <tr key={m.id} className="group transition-colors cursor-pointer"
                          style={{ borderBottom: '1px solid var(--glass-border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => setSelectedMovimento(m)}>
                          {/* Color rail */}
                          <td className="w-1 p-0">
                            <div className="w-[3px] h-full min-h-[44px]" style={{ background: colors.border }} />
                          </td>
                          {/* Time */}
                          <td className="px-3 py-2.5">
                            <span className="text-[12px] tabular-nums font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                              {formatTime(m.created_at)}
                            </span>
                          </td>
                          {/* Tipo badge */}
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap"
                              style={{ background: colors.bg, color: colors.text }}>
                              {m.tipo === 'scarto' && <AlertTriangle size={10} />}
                              {TIPI_MOVIMENTO_LABELS[m.tipo]}
                            </span>
                          </td>
                          {/* Product */}
                          <td className="px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{m.prodotto_nome}</p>
                              {m.prodotto_codice && (
                                <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{m.prodotto_codice}</p>
                              )}
                            </div>
                          </td>
                          {/* References */}
                          <td className="px-3 py-2.5">
                            <div className="text-[11px] space-y-0.5 max-w-[200px]" style={{ color: 'var(--color-text-muted)' }}>
                              {m.operatrice_nome && <p><User size={9} className="inline mr-1" />{m.operatrice_nome}</p>}
                              {m.cliente_nome && <p style={{ color: 'var(--color-text-secondary)' }}><Users size={9} className="inline mr-1" />{m.cliente_nome}</p>}
                              {m.fornitore && <p><Truck size={9} className="inline mr-1" />{m.fornitore}</p>}
                              {m.note && <p className="italic truncate" title={m.note}>{m.note}</p>}
                            </div>
                          </td>
                          {/* Qty */}
                          <td className="px-3 py-2.5 text-right">{getQuantitaDisplay(m)}</td>
                          {/* Stock */}
                          <td className="px-3 py-2.5 text-right">
                            <span className="text-[13px] tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{m.giacenza_risultante}</span>
                          </td>
                          {/* Detail button */}
                          <td className="px-2 py-2.5 text-center">
                            <button onClick={e => { e.stopPropagation(); setSelectedMovimento(m); }}
                              className="p-1 rounded-md transition-all opacity-0 group-hover:opacity-100"
                              style={{ color: 'var(--color-text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = '#6366f1'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SUMMARY FOOTER */}
        {filteredMovimenti.length > 0 && (
          <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-medium" style={{ color: 'var(--color-text-muted)', borderTop: '2px solid var(--glass-border)', background: 'var(--glass-border)' }}>
            <span>{filteredMovimenti.length} moviment{filteredMovimenti.length === 1 ? 'o' : 'i'}</span>
            <span className="flex items-center gap-1">
              <TrendingUp size={11} style={{ color: '#10b981' }} />
              <span style={{ color: '#10b981' }}>+{stats.qtyEntrate}</span>
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown size={11} style={{ color: '#ef4444' }} />
              <span style={{ color: '#ef4444' }}>−{stats.qtyUscite}</span>
            </span>
            <span className="flex items-center gap-1 font-semibold" style={{ color: stats.netto >= 0 ? '#10b981' : '#ef4444' }}>
              Netto: {stats.netto >= 0 ? '+' : ''}{stats.netto} pz
            </span>
          </div>
        )}
      </div>

      {/* Modal Dettaglio */}
      <MovimentoDetailModal
        isOpen={!!selectedMovimento}
        onClose={() => setSelectedMovimento(null)}
        movimento={selectedMovimento}
        onNavigateToAppuntamento={(appId) => { setSelectedMovimento(null); onOpenAppuntamento?.(appId); }}
        onNavigateToCarico={onOpenCarico}
        onNavigateToScarico={onOpenScarico}
      />
    </div>
  );
}
