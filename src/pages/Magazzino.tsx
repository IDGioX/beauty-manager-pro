import { useState, useEffect } from 'react';
import {
  Package, TrendingUp, TrendingDown, History, AlertTriangle, X,
  Search, Plus, Edit2, Trash2, Clock, Eye, EyeOff, Settings, Filter,
  Euro, MoreHorizontal, Save
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Toast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { magazzinoService } from '../services/magazzino';
import {
  Prodotto, CategoriaProdotto, AlertCount,
  UpdateProdottoInput,
  UNITA_MISURA_OPTIONS, USO_OPTIONS,
} from '../types/magazzino';
import { ProdottoModal } from '../components/magazzino/ProdottoModal';
import { CategorieModal } from '../components/magazzino/CategorieModal';
import { CaricoTab } from '../components/magazzino/CaricoTab';
import { ScaricoTab } from '../components/magazzino/ScaricoTab';
import { MovimentiTab } from '../components/magazzino/MovimentiTab';

type TabType = 'articoli' | 'carico' | 'scarico' | 'movimenti';
interface ToastState { message: string; type: 'success' | 'error'; }
interface MagazzinoProps { onNavigateToAgenda?: (appuntamentoId: string) => void; }

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'articoli', label: 'Articoli', icon: <Package size={15} /> },
  { id: 'carico', label: 'Carico', icon: <TrendingUp size={15} /> },
  { id: 'scarico', label: 'Scarichi', icon: <TrendingDown size={15} /> },
  { id: 'movimenti', label: 'Movimenti', icon: <History size={15} /> },
];

// ═══════════════ HELPERS ═══════════════
const formatPrice = (p: number | null) => p === null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p);
const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('it-IT') : '—';
const formatDateTime = (d: string) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ═══════════════ ANAGRAFICA PRODOTTO TAB (inline view/edit) ═══════════════
function AnagraficaProdottoTab({
  prodotto,
  categorie,
  isEditing,
  onCancelEdit,
  onProdottoUpdated,
  showToast,
}: {
  prodotto: Prodotto;
  categorie: CategoriaProdotto[];
  isEditing: boolean;
  onCancelEdit: () => void;
  onProdottoUpdated: (p: Prodotto) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '', categoria_id: '', barcode: '', descrizione: '', marca: '', linea: '',
    unita_misura: 'pz', capacita: undefined as number | undefined,
    scorta_minima: 0, scorta_riordino: 0,
    prezzo_vendita: undefined as number | undefined,
    uso: 'interno' as 'interno' | 'vendita' | 'entrambi',
    data_scadenza: '', note: '',
  });

  useEffect(() => {
    if (isEditing) {
      setForm({
        nome: prodotto.nome,
        categoria_id: prodotto.categoria_id || '',
        barcode: prodotto.barcode || '',
        descrizione: prodotto.descrizione || '',
        marca: prodotto.marca || '',
        linea: prodotto.linea || '',
        unita_misura: prodotto.unita_misura,
        capacita: prodotto.capacita ?? undefined,
        scorta_minima: prodotto.scorta_minima,
        scorta_riordino: prodotto.scorta_riordino,
        prezzo_vendita: prodotto.prezzo_vendita ?? undefined,
        uso: (prodotto.uso as 'interno' | 'vendita' | 'entrambi') || 'interno',
        data_scadenza: prodotto.data_scadenza || '',
        note: prodotto.note || '',
      });
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!form.nome.trim()) { showToast('Il nome è obbligatorio', 'error'); return; }
    setSaving(true);
    try {
      const input: UpdateProdottoInput = {
        nome: form.nome,
        categoria_id: form.categoria_id || undefined,
        barcode: form.barcode || undefined,
        descrizione: form.descrizione || undefined,
        marca: form.marca || undefined,
        linea: form.linea || undefined,
        unita_misura: form.unita_misura,
        capacita: form.capacita,
        scorta_minima: form.scorta_minima,
        scorta_riordino: form.scorta_riordino,
        prezzo_vendita: form.prezzo_vendita,
        uso: form.uso,
        data_scadenza: form.data_scadenza || undefined,
        note: form.note || undefined,
      };
      const updated = await magazzinoService.updateProdotto(prodotto.id, input);
      onProdottoUpdated(updated);
      onCancelEdit();
      showToast('Prodotto aggiornato', 'success');
    } catch { showToast('Errore durante il salvataggio', 'error'); }
    finally { setSaving(false); }
  };

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between py-2.5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-sm text-right max-w-[60%]" style={{ color: 'var(--color-text-primary)' }}>{value || '—'}</span>
    </div>
  );

  if (isEditing) {
    return (
      <div className="space-y-5 animate-fade-in-up">
        <div className="grid grid-cols-1 gap-4">
          <Input label="Nome *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          <Select label="Categoria" value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
            <option value="">Nessuna categoria</option>
            {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Marca" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} />
          <Input label="Linea" value={form.linea} onChange={e => setForm({ ...form, linea: e.target.value })} />
        </div>
        <Input label="Codice a Barre" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
        <Select label="Uso" value={form.uso} onChange={e => setForm({ ...form, uso: e.target.value as any })}>
          {USO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Textarea label="Descrizione" value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} rows={2} />

        <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>Unità e Quantità</p>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Unità di Misura" value={form.unita_misura} onChange={e => setForm({ ...form, unita_misura: e.target.value })}>
              {UNITA_MISURA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Input label="Capacità" type="number" step="0.01" value={form.capacita ?? ''} onChange={e => setForm({ ...form, capacita: e.target.value ? parseFloat(e.target.value) : undefined })} />
            <Input label="Scorta Minima" type="number" value={form.scorta_minima} onChange={e => setForm({ ...form, scorta_minima: parseInt(e.target.value) || 0 })} />
            <Input label="Scorta Riordino" type="number" value={form.scorta_riordino} onChange={e => setForm({ ...form, scorta_riordino: parseInt(e.target.value) || 0 })} />
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>Prezzo e Scadenza</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prezzo Vendita" type="number" step="0.01" value={form.prezzo_vendita ?? ''} onChange={e => setForm({ ...form, prezzo_vendita: e.target.value ? parseFloat(e.target.value) : undefined })} />
            <Input label="Data Scadenza" type="date" value={form.data_scadenza} onChange={e => setForm({ ...form, data_scadenza: e.target.value })} />
          </div>
        </div>

        <Textarea label="Note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} />

        <div className="flex gap-3 pt-2">
          <Button variant="primary" onClick={handleSave} loading={saving} className="flex-1">
            <Save size={14} className="mr-1.5" />Salva
          </Button>
          <Button variant="secondary" onClick={onCancelEdit} className="flex-1">Annulla</Button>
        </div>
      </div>
    );
  }

  // View mode
  const usoLabel = USO_OPTIONS.find(o => o.value === prodotto.uso)?.label || prodotto.uso || '—';
  const umLabel = UNITA_MISURA_OPTIONS.find(o => o.value === prodotto.unita_misura)?.label || prodotto.unita_misura;

  return (
    <div className="animate-fade-in-up">
      <InfoRow label="Nome" value={prodotto.nome} />
      <InfoRow label="Codice" value={<span className="font-mono text-xs">{prodotto.codice}</span>} />
      <InfoRow label="Categoria" value={prodotto.categoria_nome || '—'} />
      <InfoRow label="Marca" value={prodotto.marca} />
      <InfoRow label="Linea" value={prodotto.linea} />
      <InfoRow label="Barcode" value={prodotto.barcode ? <span className="font-mono text-xs">{prodotto.barcode}</span> : '—'} />
      <InfoRow label="Uso" value={usoLabel} />
      <InfoRow label="Descrizione" value={prodotto.descrizione} />

      <div className="mt-5 mb-3">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Unità e Scorte</span>
      </div>
      <InfoRow label="Unità di Misura" value={umLabel} />
      <InfoRow label="Capacità" value={prodotto.capacita != null ? prodotto.capacita : '—'} />
      <InfoRow label="Giacenza" value={<span className="font-semibold">{prodotto.giacenza} {prodotto.unita_misura}</span>} />
      <InfoRow label="Scorta Minima" value={`${prodotto.scorta_minima} ${prodotto.unita_misura}`} />
      <InfoRow label="Scorta Riordino" value={`${prodotto.scorta_riordino} ${prodotto.unita_misura}`} />

      <div className="mt-5 mb-3">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Prezzo e Scadenza</span>
      </div>
      <InfoRow label="Prezzo Vendita" value={formatPrice(prodotto.prezzo_vendita)} />
      <InfoRow label="Data Scadenza" value={formatDate(prodotto.data_scadenza)} />
      <InfoRow label="Note" value={prodotto.note} />

      <div className="mt-5 pt-3 space-y-1" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Creato: {formatDateTime(prodotto.created_at)}</p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Aggiornato: {formatDateTime(prodotto.updated_at)}</p>
      </div>
    </div>
  );
}

// ═══════════════ PRODOTTO DETAIL PANEL ═══════════════
function ProdottoDetailPanel({
  prodotto,
  categorie,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onClose,
  onProdottoUpdated,
  onDelete,
  onToggleAttivo,
  showToast,
}: {
  prodotto: Prodotto;
  categorie: CategoriaProdotto[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onProdottoUpdated: (p: Prodotto) => void;
  onDelete: (p: Prodotto) => void;
  onToggleAttivo: (p: Prodotto) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [showOverflow, setShowOverflow] = useState(false);

  const isScorta = prodotto.scorta_minima > 0 && prodotto.giacenza <= prodotto.scorta_minima;
  const isScadenza = prodotto.data_scadenza && new Date(prodotto.data_scadenza) <= new Date(Date.now() + 30 * 86400000);
  const isScaduto = prodotto.data_scadenza && new Date(prodotto.data_scadenza) < new Date();

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="p-5 pb-4">
        <div className="max-w-2xl">
        <div className="flex items-start justify-between mb-4">
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <X size={18} />
          </button>
          <div className="flex items-center gap-1">
            {!isEditing && (
              <button onClick={onStartEdit} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                <Edit2 size={13} className="inline mr-1" />Modifica
              </button>
            )}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowOverflow(!showOverflow); }} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <MoreHorizontal size={18} />
              </button>
              {showOverflow && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOverflow(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg py-1 z-50" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                    <button onClick={() => { setShowOverflow(false); onToggleAttivo(prodotto); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors" style={{ color: prodotto.attivo ? '#f59e0b' : '#10b981' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      {prodotto.attivo ? <><EyeOff size={14} />Disattiva</> : <><Eye size={14} />Riattiva</>}
                    </button>
                    <button onClick={() => { setShowOverflow(false); onDelete(prodotto); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors" style={{ color: '#ef4444' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <Trash2 size={14} />Elimina
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Product Name + Badges */}
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {prodotto.nome}
          </h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-mono" style={{ background: 'var(--glass-border)', color: 'var(--color-text-muted)' }}>
              {prodotto.codice}
            </span>
            {prodotto.categoria_nome && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                {prodotto.categoria_nome}
              </span>
            )}
            {!prodotto.attivo && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#9ca3af' }} />
                Inattivo
              </span>
            )}
          </div>

          {/* Quick Info Pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}>
              <Package size={13} style={{ color: 'var(--color-text-muted)' }} />
              {prodotto.giacenza} {prodotto.unita_misura}
            </span>
            {prodotto.prezzo_vendita != null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}>
                <Euro size={13} style={{ color: 'var(--color-text-muted)' }} />
                {formatPrice(prodotto.prezzo_vendita)}
              </span>
            )}
            {isScorta && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}>
                <AlertTriangle size={13} />Sotto scorta
              </span>
            )}
            {isScaduto ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}>
                <Clock size={13} />Scaduto
              </span>
            ) : isScadenza ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' }}>
                <Clock size={13} />In scadenza
              </span>
            ) : null}
          </div>
        </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <div className="max-w-2xl">
          <AnagraficaProdottoTab
            prodotto={prodotto}
            categorie={categorie}
            isEditing={isEditing}
            onCancelEdit={onCancelEdit}
            onProdottoUpdated={onProdottoUpdated}
            showToast={showToast}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════ MAIN MAGAZZINO COMPONENT ═══════════════
export function Magazzino({ onNavigateToAgenda }: MagazzinoProps) {
  const [activeTab, setActiveTab] = useState<TabType>('articoli');
  const [alertCount, setAlertCount] = useState<AlertCount | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Listener per quick actions dalla ricerca globale
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as TabType;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('magazzinoTabChange', handler);
    return () => window.removeEventListener('magazzinoTabChange', handler);
  }, []);

  // Articoli state
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [categorie, setCategorie] = useState<CategoriaProdotto[]>([]);
  const [loadingProdotti, setLoadingProdotti] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [showInattivi, setShowInattivi] = useState(false);
  const [filterSottoScorta, setFilterSottoScorta] = useState(false);
  const [filterInScadenza, setFilterInScadenza] = useState(false);
  const [selectedProdotto, setSelectedProdotto] = useState<Prodotto | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategorieModalOpen, setIsCategorieModalOpen] = useState(false);
  const [showCategorieFilter, setShowCategorieFilter] = useState(false);
  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();

  const showToast = (msg: string, type: 'success' | 'error') => setToast({ message: msg, type });

  const loadAlerts = async () => {
    try {
      const count = await magazzinoService.getAlertCount();
      setAlertCount(count);
    } catch (error) {
      console.error('Errore caricamento alert:', error);
    }
  };

  const loadProdotti = async (params?: { search?: string; cat?: string; inattivi?: boolean; sottoScorta?: boolean; inScadenza?: boolean }) => {
    try {
      setLoadingProdotti(true);
      const [p, c] = await Promise.all([
        magazzinoService.getProdotti({
          search: (params?.search ?? searchTerm) || undefined,
          categoriaId: (params?.cat ?? selectedCategoria) || undefined,
          attivoOnly: !(params?.inattivi ?? showInattivi),
          soloSottoScorta: params?.sottoScorta ?? filterSottoScorta,
          soloInScadenza: params?.inScadenza ?? filterInScadenza,
        }),
        magazzinoService.getCategorie(),
      ]);
      setProdotti(p);
      setCategorie(c);
    } catch { showToast('Errore nel caricamento dei prodotti', 'error'); }
    finally { setLoadingProdotti(false); }
  };

  useEffect(() => { loadAlerts(); }, [refreshKey]);
  useEffect(() => {
    loadProdotti({ search: searchTerm, cat: selectedCategoria, inattivi: showInattivi, sottoScorta: filterSottoScorta, inScadenza: filterInScadenza });
  }, [searchTerm, selectedCategoria, showInattivi, filterSottoScorta, filterInScadenza, refreshKey]);

  const handleRefresh = () => setRefreshKey(k => k + 1);

  const handleToggleAttivo = async (prodotto: Prodotto) => {
    try {
      if (prodotto.attivo) { await magazzinoService.deactivateProdotto(prodotto.id); showToast('Prodotto disattivato', 'success'); }
      else { await magazzinoService.reactivateProdotto(prodotto.id); showToast('Prodotto riattivato', 'success'); }
      if (selectedProdotto?.id === prodotto.id) setSelectedProdotto(null);
      handleRefresh();
    } catch { showToast('Errore durante l\'operazione', 'error'); }
  };

  const handleDelete = async (prodotto: Prodotto) => {
    if (!await showConfirm({ title: 'Elimina Prodotto', message: `Sei sicuro di voler eliminare "${prodotto.nome}"? Questa azione non può essere annullata.`, confirmText: 'Elimina', variant: 'danger' })) return;
    try {
      await magazzinoService.deleteProdotto(prodotto.id);
      showToast('Prodotto eliminato', 'success');
      if (selectedProdotto?.id === prodotto.id) setSelectedProdotto(null);
      handleRefresh();
    } catch (error: any) { showToast(error.message || 'Errore durante l\'eliminazione', 'error'); }
  };

  const totalAlerts = alertCount ? alertCount.sotto_scorta + alertCount.in_scadenza + alertCount.scaduti : 0;
  const sottoScortaCount = prodotti.filter(p => p.scorta_minima > 0 && p.giacenza <= p.scorta_minima).length;
  const inScadenzaCount = prodotti.filter(p => p.data_scadenza && new Date(p.data_scadenza) > new Date() && new Date(p.data_scadenza) <= new Date(Date.now() + 30 * 86400000)).length;
  const valoreInventario = prodotti.reduce((a, p) => a + (p.prezzo_vendita || 0) * p.giacenza, 0);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="px-5 pt-3 pb-0 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Magazzino</h1>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--glass-border)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'var(--card-bg)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>
              {tab.icon}
              {tab.label}
              {tab.id === 'articoli' && totalAlerts > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}>{totalAlerts}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════ TAB CONTENT ═══════════════ */}
      <div className="flex-1 min-h-0">
        {activeTab === 'articoli' && (
          <div className="flex h-full">
            {/* ═══════════════ LEFT: PRODUCT LIST ═══════════════ */}
            <div className={`flex flex-col min-w-0 master-panel ${selectedProdotto ? 'w-[420px] shrink-0' : 'flex-1'}`}>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 px-5 py-3 shrink-0">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {prodotti.length} prodott{prodotti.length === 1 ? 'o' : 'i'} · {sottoScortaCount > 0 && <span style={{ color: '#ef4444' }}>{sottoScortaCount} sotto scorta</span>}
                  {inScadenzaCount > 0 && <span style={{ color: '#f59e0b' }}> · {inScadenzaCount} in scadenza</span>}
                </span>
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} className="shrink-0 whitespace-nowrap"><Plus size={15} className="mr-1" />Nuovo</Button>
              </div>

              {/* Search */}
              <div className="px-5 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: 'var(--color-text-muted)' }} />
                  <input type="text" placeholder="Cerca prodotto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm" style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--color-text-primary)', outline: 'none' }} />
                </div>
              </div>

              {/* Filters */}
              <div className="filter-chips">
                  <button onClick={() => setFilterSottoScorta(!filterSottoScorta)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: filterSottoScorta ? '#ef4444' : 'var(--glass-border)', color: filterSottoScorta ? 'white' : 'var(--color-text-secondary)' }}>
                    <AlertTriangle size={11} />Sotto scorta
                  </button>
                  <button onClick={() => setFilterInScadenza(!filterInScadenza)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: filterInScadenza ? '#f59e0b' : 'var(--glass-border)', color: filterInScadenza ? 'white' : 'var(--color-text-secondary)' }}>
                    <Clock size={11} />In scadenza
                  </button>
                  <button onClick={() => setShowInattivi(!showInattivi)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: showInattivi ? 'var(--color-primary)' : 'var(--glass-border)', color: showInattivi ? 'white' : 'var(--color-text-secondary)' }}>
                    {showInattivi ? <Eye size={11} /> : <EyeOff size={11} />}{showInattivi ? 'Tutti' : 'Solo attivi'}
                  </button>
                  {/* Categorie dropdown */}
                  <div className="relative">
                    <button onClick={() => setShowCategorieFilter(!showCategorieFilter)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                      style={{ background: selectedCategoria ? 'var(--color-primary)' : 'var(--glass-border)', color: selectedCategoria ? 'white' : 'var(--color-text-secondary)' }}>
                      <Filter size={11} />Categorie
                      {selectedCategoria && <span className="px-1 py-0.5 rounded text-[9px]" style={{ background: 'rgba(255,255,255,0.25)' }}>1</span>}
                    </button>
                    {showCategorieFilter && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowCategorieFilter(false)} />
                        <div className="absolute left-0 mt-2 w-64 rounded-xl shadow-xl z-50 overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                          <div className="px-3 py-2 flex justify-between items-center" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <span className="font-medium text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Filtra per Categoria</span>
                            <button onClick={() => setShowCategorieFilter(false)} className="p-1 rounded" style={{ color: 'var(--color-text-muted)' }}><X size={13} /></button>
                          </div>
                          <div className="p-1.5 max-h-52 overflow-y-auto">
                            <button onClick={() => { setSelectedCategoria(''); setShowCategorieFilter(false); }}
                              className="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors"
                              style={{ background: !selectedCategoria ? 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.08)' : 'transparent', color: 'var(--color-text-primary)', fontWeight: !selectedCategoria ? 600 : 400 }}>
                              Tutte le categorie
                            </button>
                            <div className="my-1" style={{ borderTop: '1px solid var(--glass-border)' }} />
                            {categorie.map(cat => {
                              const sel = selectedCategoria === cat.id;
                              return (
                                <button key={cat.id} onClick={() => { setSelectedCategoria(sel ? '' : cat.id); setShowCategorieFilter(false); }}
                                  className="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors"
                                  style={{ background: sel ? 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.08)' : 'transparent', color: 'var(--color-text-primary)', fontWeight: sel ? 600 : 400 }}>
                                  {cat.nome}
                                </button>
                              );
                            })}
                          </div>
                          <div className="p-1.5" style={{ borderTop: '1px solid var(--glass-border)' }}>
                            <button onClick={() => { setShowCategorieFilter(false); setIsCategorieModalOpen(true); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                              <Settings size={12} />Gestisci Categorie
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
              </div>

              {/* Product list */}
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {loadingProdotti && prodotti.length === 0 ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex gap-3 items-center p-3 rounded-xl" style={{ background: 'var(--glass-border)' }}>
                        <div className="w-10 h-10 rounded-lg shimmer" /><div className="flex-1 space-y-2"><div className="h-3.5 w-32 rounded shimmer" /><div className="h-3 w-20 rounded shimmer" /></div>
                      </div>
                    ))}
                  </div>
                ) : prodotti.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                      <Package size={24} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Nessun prodotto trovato</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {searchTerm || selectedCategoria || filterSottoScorta || filterInScadenza ? 'Prova a modificare i filtri' : 'Crea il primo prodotto'}
                    </p>
                  </div>
                ) : (
                  <div className={selectedProdotto ? 'space-y-1' : 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2'}>
                    {prodotti.map(prodotto => {
                      const isSelected = selectedProdotto?.id === prodotto.id;
                      const isScorta = prodotto.scorta_minima > 0 && prodotto.giacenza <= prodotto.scorta_minima;
                      const isScaduto = prodotto.data_scadenza && new Date(prodotto.data_scadenza) < new Date();
                      const isScadenza = prodotto.data_scadenza && !isScaduto && new Date(prodotto.data_scadenza) <= new Date(Date.now() + 30 * 86400000);

                      return (
                        <button
                          key={prodotto.id}
                          onClick={() => { setSelectedProdotto(prodotto); setIsEditing(false); }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left group list-card ${isSelected ? 'list-card-selected' : ''}`}
                          style={{ opacity: prodotto.attivo ? 1 : 0.5 }}
                        >
                          {/* Icon */}
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: isScorta || isScaduto ? 'rgba(239, 68, 68, 0.08)' : isScadenza ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.08)' }}>
                            {isScorta || isScaduto || isScadenza
                              ? <AlertTriangle size={16} style={{ color: isScaduto || isScorta ? '#ef4444' : '#f59e0b' }} />
                              : <Package size={16} style={{ color: '#6366f1' }} />
                            }
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{prodotto.nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{prodotto.codice}</span>
                              {(prodotto.marca || prodotto.linea) && (
                                <span className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                                  {[prodotto.marca, prodotto.linea].filter(Boolean).join(' — ')}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Right info */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold" style={{ color: isScorta ? '#ef4444' : 'var(--color-text-primary)' }}>
                              {prodotto.giacenza} <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>{prodotto.unita_misura}</span>
                            </p>
                            {prodotto.prezzo_vendita != null && (
                              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatPrice(prodotto.prezzo_vendita)}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer count */}
              {prodotti.length > 0 && (
                <div className="px-5 py-2 flex items-center justify-between text-[11px] font-medium shrink-0"
                  style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--glass-border)' }}>
                  <span>{prodotti.length} prodott{prodotti.length === 1 ? 'o' : 'i'} — {prodotti.reduce((a, p) => a + p.giacenza, 0)} pezzi</span>
                  <span>€ {valoreInventario.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* ═══════════════ RIGHT: DETAIL PANEL ═══════════════ */}
            {selectedProdotto && (
              <div className="flex-1 min-w-0 animate-fade-in-up">
                <ProdottoDetailPanel
                  prodotto={selectedProdotto}
                  categorie={categorie}
                  isEditing={isEditing}
                  onStartEdit={() => setIsEditing(true)}
                  onCancelEdit={() => setIsEditing(false)}
                  onClose={() => { setSelectedProdotto(null); setIsEditing(false); }}
                  onProdottoUpdated={(updated) => { setSelectedProdotto(updated); setIsEditing(false); handleRefresh(); }}
                  onDelete={handleDelete}
                  onToggleAttivo={handleToggleAttivo}
                  showToast={showToast}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'carico' && (
          <div className="p-5 overflow-y-auto" style={{ height: '100%' }}>
            <CaricoTab onRefresh={handleRefresh} />
          </div>
        )}
        {activeTab === 'scarico' && (
          <div className="p-5 overflow-y-auto" style={{ height: '100%' }}>
            <ScaricoTab onRefresh={handleRefresh} />
          </div>
        )}
        {activeTab === 'movimenti' && (
          <div className="p-5 overflow-y-auto" style={{ height: '100%' }}>
            <MovimentiTab
              onOpenCarico={() => setActiveTab('carico')}
              onOpenScarico={() => setActiveTab('scarico')}
              onOpenAppuntamento={(appId) => { if (onNavigateToAgenda) onNavigateToAgenda(appId); }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <ProdottoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); handleRefresh(); showToast('Prodotto creato', 'success'); }} prodotto={null} categorie={categorie} />
      <CategorieModal isOpen={isCategorieModalOpen} onClose={() => setIsCategorieModalOpen(false)} onSave={() => handleRefresh()} />
      <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmText} variant={confirmState.variant} onConfirm={confirmState.onConfirm} onCancel={handleCancel} />
    </div>
  );
}
