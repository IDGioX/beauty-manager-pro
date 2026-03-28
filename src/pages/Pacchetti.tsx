import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package, Plus, Search, Edit2, Trash2, Users, X,
  CheckCircle, ChevronRight, ChevronDown, ChevronUp,
  MoreHorizontal, Circle, Check, EyeOff, Eye,
  AlertTriangle, ArrowLeft,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Toast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { invoke } from '@tauri-apps/api/core';
import {
  pacchettiService,
  PacchettoConTrattamenti,
  PacchettoCliente,
  PacchettoSeduta,
  PacchettoPagamento,
  CreatePacchettoInput,
  UpdatePacchettoInput,
  TrattamentoInclusoInput,
} from '../services/pacchetti';
import { clientiService } from '../services/clienti';
import type { Cliente } from '../types/cliente';
import type { Trattamento } from '../types/trattamento';

// ============================================
// HELPERS
// ============================================

interface ToastState { message: string; type: 'success' | 'error'; }

type ViewMode = 'catalogo' | 'per_cliente';

const formatPrice = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);

const TIPO_LABELS: Record<string, string> = {
  anticipo: 'Anticipo', dilazionato: 'Dilazionato', per_seduta: 'Per seduta',
};

const STATO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  attivo: { label: 'Attivo', bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' },
  completato: { label: 'Completato', bg: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)' },
  sospeso: { label: 'Sospeso', bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', color: 'var(--color-warning)' },
  annullato: { label: 'Annullato', bg: 'color-mix(in srgb, var(--color-danger) 15%, transparent)', color: 'var(--color-danger)' },
};

const todayISO = () => new Date().toISOString().split('T')[0];

// ============================================
// MAIN COMPONENT
// ============================================

export const Pacchetti: React.FC<{
  openClienteId?: string | null;
  onClienteOpened?: () => void;
  onGoBack?: () => void;
}> = ({ openClienteId, onClienteOpened, onGoBack }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('catalogo');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Catalogo
  const [pacchetti, setPacchetti] = useState<PacchettoConTrattamenti[]>([]);
  const [trattamenti, setTrattamenti] = useState<Trattamento[]>([]);
  const [searchCatalogo, setSearchCatalogo] = useState('');
  const [selectedPacchetto, setSelectedPacchetto] = useState<PacchettoConTrattamenti | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nome: '', descrizione: '', prezzo_totale: 0, num_sedute: 1, tipo_pagamento: 'anticipo', trattamentiIds: [] as string[] });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nome: '', descrizione: '', prezzo_totale: 0, num_sedute: 1, tipo_pagamento: 'anticipo', trattamentiIds: [] as string[] });
  const [filterAttivo, setFilterAttivo] = useState<'tutti' | 'attivi' | 'inattivi'>('tutti');
  const [showOverflow, setShowOverflow] = useState(false);

  // Per Cliente
  const [searchClienti, setSearchClienti] = useState('');
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [clientiPacchetti, setClientiPacchetti] = useState<Map<string, PacchettoCliente[]>>(new Map());
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [seduteMap, setSeduteMap] = useState<Map<string, PacchettoSeduta[]>>(new Map());
  const [filterStatoPkg, setFilterStatoPkg] = useState<'tutti' | 'attivo' | 'completato' | 'annullato'>('attivo');

  // Assegnazione
  const [isAssegnaOpen, setIsAssegnaOpen] = useState(false);
  const [assegnaForm, setAssegnaForm] = useState({
    pacchetto_id: '', cliente_id: '', note: '',
    data_inizio: todayISO(),
    importo_personalizzato: false,
    importo_totale: 0,
    tipo_pagamento: 'anticipo' as string,
  });
  const [payInput, setPayInput] = useState<{ id: string; importo: number } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();
  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // ============================================
  // DATA LOADING
  // ============================================

  useEffect(() => { loadCatalogo(); }, []);

  // Navigazione da appuntamento: apri vista Per Cliente con cliente specifico
  useEffect(() => {
    if (!openClienteId) return;
    setViewMode('per_cliente');
    // Carica clienti e poi seleziona quello giusto
    const openTarget = async () => {
      const cls = await clientiService.getClienti(undefined, 100);
      setClienti(cls);
      const map = new Map<string, PacchettoCliente[]>();
      const results = await Promise.all(cls.map(c => pacchettiService.getPacchettiCliente(c.id).then(p => ({ id: c.id, p }))));
      results.forEach(r => { if (r.p.length > 0) map.set(r.id, r.p); });
      setClientiPacchetti(map);
      const target = cls.find(c => c.id === openClienteId);
      if (target) {
        const hasPacchetti = map.has(target.id);
        if (hasPacchetti) {
          // Cliente ha pacchetti: selezionalo nella vista Per Cliente
          selectCliente(target);
        } else {
          // Cliente senza pacchetti: apri direttamente il modal Assegna
          openAssegna({ clienteId: target.id });
        }
      }
      onClienteOpened?.();
    };
    openTarget();
  }, [openClienteId]);

  const loadCatalogo = async () => {
    setLoading(true);
    try {
      const [pList, trList] = await Promise.all([
        pacchettiService.getPacchetti(false),
        invoke<Trattamento[]>('get_trattamenti', { categoriaId: null, attivoOnly: true }),
      ]);
      setPacchetti(pList);
      setTrattamenti(trList);
    } catch { showToast('Errore nel caricamento', 'error'); }
    finally { setLoading(false); }
  };

  const loadClientiPacchetti = async (search: string) => {
    try {
      const cls = await clientiService.getClienti(search || undefined, 100);
      setClienti(cls);
      const map = new Map<string, PacchettoCliente[]>();
      const results = await Promise.all(cls.map(c => pacchettiService.getPacchettiCliente(c.id).then(p => ({ id: c.id, p }))));
      results.forEach(r => { if (r.p.length > 0) map.set(r.id, r.p); });
      setClientiPacchetti(map);
    } catch { showToast('Errore nel caricamento', 'error'); }
  };

  useEffect(() => {
    if (viewMode === 'per_cliente') {
      const t = setTimeout(() => loadClientiPacchetti(searchClienti), 300);
      return () => clearTimeout(t);
    }
  }, [viewMode, searchClienti]);

  // ============================================
  // CATALOGO — FILTERED LIST
  // ============================================

  const filtered = useMemo(() => {
    let list = pacchetti;
    if (filterAttivo === 'attivi') list = list.filter(p => p.attivo);
    if (filterAttivo === 'inattivi') list = list.filter(p => !p.attivo);
    if (searchCatalogo.trim()) {
      const s = searchCatalogo.toLowerCase();
      list = list.filter(p => p.nome.toLowerCase().includes(s) || (p.descrizione && p.descrizione.toLowerCase().includes(s)));
    }
    return list;
  }, [pacchetti, searchCatalogo, filterAttivo]);

  const countAttivi = pacchetti.filter(p => p.attivo).length;
  const countInattivi = pacchetti.filter(p => !p.attivo).length;

  // Per Cliente — filtered list
  const clientiConPacchetti = useMemo(() => clienti.filter(c => clientiPacchetti.has(c.id)), [clienti, clientiPacchetti]);

  // ============================================
  // VIEW SWITCH
  // ============================================

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedPacchetto(null);
    setSelectedCliente(null);
    setIsEditing(false);
    setSeduteMap(new Map());
    setPayInput(null);
  };

  // ============================================
  // CATALOGO HANDLERS
  // ============================================

  const selectPacchetto = (p: PacchettoConTrattamenti) => {
    setSelectedPacchetto(p);
    setIsEditing(false);
    setShowOverflow(false);
  };

  const startEdit = () => {
    if (!selectedPacchetto) return;
    setEditForm({
      nome: selectedPacchetto.nome, descrizione: selectedPacchetto.descrizione || '',
      prezzo_totale: selectedPacchetto.prezzo_totale, num_sedute: selectedPacchetto.num_sedute,
      tipo_pagamento: selectedPacchetto.tipo_pagamento,
      trattamentiIds: selectedPacchetto.trattamenti_inclusi.map(t => t.trattamento_id),
    });
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPacchetto || !editForm.nome.trim()) return;
    const trattamentiInput: TrattamentoInclusoInput[] = editForm.trattamentiIds.map((id, i) => ({ trattamento_id: id, ordine: i + 1 }));
    try {
      const updated = await pacchettiService.updatePacchetto(selectedPacchetto.id, {
        nome: editForm.nome, descrizione: editForm.descrizione || undefined,
        prezzo_totale: editForm.prezzo_totale, num_sedute: editForm.num_sedute,
        tipo_pagamento: editForm.tipo_pagamento, trattamenti: trattamentiInput,
      } as UpdatePacchettoInput);
      showToast('Pacchetto aggiornato', 'success');
      setSelectedPacchetto(updated);
      setIsEditing(false);
      loadCatalogo();
    } catch { showToast('Errore nel salvataggio', 'error'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nome.trim()) { showToast('Il nome è obbligatorio', 'error'); return; }
    if (createForm.prezzo_totale <= 0) { showToast('Inserisci un prezzo valido', 'error'); return; }
    const trattamentiInput: TrattamentoInclusoInput[] = createForm.trattamentiIds.map((id, i) => ({ trattamento_id: id, ordine: i + 1 }));
    try {
      await pacchettiService.createPacchetto({
        nome: createForm.nome, descrizione: createForm.descrizione || undefined,
        prezzo_totale: createForm.prezzo_totale, num_sedute: createForm.num_sedute,
        tipo_pagamento: createForm.tipo_pagamento, trattamenti: trattamentiInput,
      } as CreatePacchettoInput);
      showToast('Pacchetto creato', 'success');
      setIsCreateOpen(false);
      loadCatalogo();
    } catch { showToast('Errore nella creazione', 'error'); }
  };

  const handleToggleAttivo = async () => {
    if (!selectedPacchetto) return;
    if (selectedPacchetto.attivo) {
      if (!await showConfirm({
        title: 'Disattiva Pacchetto',
        message: `Disattivare "${selectedPacchetto.nome}"? Il pacchetto non sarà più disponibile per nuove assegnazioni, ma lo storico resta consultabile.`,
        confirmText: 'Disattiva',
        cancelText: 'Annulla',
        variant: 'danger',
      })) return;
    }
    try {
      const updated = await pacchettiService.updatePacchetto(selectedPacchetto.id, { attivo: !selectedPacchetto.attivo });
      showToast(selectedPacchetto.attivo ? 'Pacchetto disattivato' : 'Pacchetto riattivato', 'success');
      setSelectedPacchetto(updated);
      loadCatalogo();
    } catch { showToast('Errore', 'error'); }
  };

  const toggleTrattamento = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter(t => t !== id) : [...ids, id];

  // ============================================
  // PER CLIENTE HANDLERS
  // ============================================

  const selectCliente = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setPayInput(null);
    // Carica sedute per tutti i pacchetti del cliente
    const pks = clientiPacchetti.get(cliente.id) || [];
    const map = new Map<string, PacchettoSeduta[]>();
    const results = await Promise.all(
      pks.map(pc => pacchettiService.getSedutePacchetto(pc.id).then(s => ({ id: pc.id, s })).catch(() => ({ id: pc.id, s: [] as PacchettoSeduta[] })))
    );
    results.forEach(r => map.set(r.id, r.s));
    setSeduteMap(map);
  };

  const reloadClienteSedute = async () => {
    if (!selectedCliente) return;
    const pks = clientiPacchetti.get(selectedCliente.id) || [];
    const map = new Map<string, PacchettoSeduta[]>();
    const results = await Promise.all(
      pks.map(pc => pacchettiService.getSedutePacchetto(pc.id).then(s => ({ id: pc.id, s })).catch(() => ({ id: pc.id, s: [] as PacchettoSeduta[] })))
    );
    results.forEach(r => map.set(r.id, r.s));
    setSeduteMap(map);
  };

  const handlePagamentoSeduta = async (sedutaId: string, importo: number) => {
    try {
      await pacchettiService.registraPagamentoSeduta(sedutaId, importo);
      showToast('Pagamento registrato', 'success');
      await loadClientiPacchetti(searchClienti);
      await reloadClienteSedute();
    } catch { showToast('Errore nel pagamento', 'error'); }
  };

  const handleSaveAssegnazione = async (pcId: string, note: string, importo: number) => {
    try {
      await pacchettiService.updatePacchettoCliente(pcId, importo, note);
      showToast('Assegnazione aggiornata', 'success');
      loadClientiPacchetti(searchClienti);
    } catch { showToast('Errore nel salvataggio', 'error'); }
  };

  const handleAnnullaAssegnazione = async (pcId: string, pacchettoNome: string) => {
    if (!await showConfirm({
      title: 'Annulla Assegnazione',
      message: `Annullare l'assegnazione del pacchetto "${pacchettoNome}"? L'operazione non è reversibile.`,
      confirmText: 'Annulla Assegnazione',
      cancelText: 'Indietro',
      variant: 'danger',
    })) return;
    try {
      await pacchettiService.annullaPacchettoCliente(pcId);
      showToast('Assegnazione annullata', 'success');
      await loadClientiPacchetti(searchClienti);
      await reloadClienteSedute();
    } catch { showToast('Errore nell\'annullamento', 'error'); }
  };

  const handleRiattivaAssegnazione = async (pcId: string) => {
    try {
      await pacchettiService.updatePacchettoCliente(pcId, undefined, undefined, 'attivo');
      showToast('Assegnazione riattivata', 'success');
      await loadClientiPacchetti(searchClienti);
      await reloadClienteSedute();
    } catch { showToast('Errore nella riattivazione', 'error'); }
  };

  const handleEliminaAssegnazione = async (pcId: string, pacchettoNome: string) => {
    if (!await showConfirm({
      title: 'Elimina Assegnazione',
      message: `Eliminare definitivamente l'assegnazione del pacchetto "${pacchettoNome}"? Tutte le sedute e i pagamenti verranno cancellati. Questa azione è irreversibile.`,
      confirmText: 'Elimina definitivamente',
      cancelText: 'Annulla',
      variant: 'danger',
    })) return;
    try {
      await pacchettiService.eliminaPacchettoCliente(pcId);
      showToast('Assegnazione eliminata', 'success');
      await loadClientiPacchetti(searchClienti);
      await reloadClienteSedute();
    } catch { showToast('Errore nell\'eliminazione', 'error'); }
  };

  // ============================================
  // ASSEGNAZIONE HANDLERS
  // ============================================

  const openAssegna = (context?: { pacchettoId?: string; clienteId?: string }) => {
    const pkg = context?.pacchettoId ? pacchetti.find(p => p.id === context.pacchettoId) : null;
    setAssegnaForm({
      pacchetto_id: context?.pacchettoId || '',
      cliente_id: context?.clienteId || '',
      data_inizio: todayISO(),
      importo_personalizzato: false,
      importo_totale: pkg?.prezzo_totale || 0,
      tipo_pagamento: pkg?.tipo_pagamento || 'anticipo',
      note: '',
    });
    setIsAssegnaOpen(true);
  };

  const handleAssegna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assegnaForm.pacchetto_id || !assegnaForm.cliente_id) { showToast('Seleziona pacchetto e cliente', 'error'); return; }
    try {
      const selectedPkg = pacchetti.find(p => p.id === assegnaForm.pacchetto_id);
      await pacchettiService.assegnaPacchetto({
        pacchetto_id: assegnaForm.pacchetto_id,
        cliente_id: assegnaForm.cliente_id,
        data_inizio: assegnaForm.data_inizio || undefined,
        importo_totale: assegnaForm.importo_personalizzato ? assegnaForm.importo_totale : selectedPkg?.prezzo_totale,
        tipo_pagamento: assegnaForm.tipo_pagamento,
        note: assegnaForm.note || undefined,
      });
      showToast('Pacchetto assegnato', 'success');
      setIsAssegnaOpen(false);
      if (viewMode === 'per_cliente') loadClientiPacchetti(searchClienti);
    } catch { showToast('Errore nell\'assegnazione', 'error'); }
  };

  // Duplicate check for assignment modal
  const assegnaDuplicateWarning = useMemo(() => {
    if (!assegnaForm.pacchetto_id || !assegnaForm.cliente_id) return false;
    const clientPkgs = clientiPacchetti.get(assegnaForm.cliente_id) || [];
    return clientPkgs.some(p => p.pacchetto_id === assegnaForm.pacchetto_id && p.stato === 'attivo');
  }, [assegnaForm.pacchetto_id, assegnaForm.cliente_id, clientiPacchetti]);

  // Preview data for assignment modal
  const assegnaPreview = useMemo(() => {
    if (!assegnaForm.pacchetto_id) return null;
    return pacchetti.find(p => p.id === assegnaForm.pacchetto_id) || null;
  }, [assegnaForm.pacchetto_id, pacchetti]);

  // Determine if detail panel is open
  const hasDetailOpen = (viewMode === 'catalogo' && selectedPacchetto !== null) || (viewMode === 'per_cliente' && selectedCliente !== null);

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog {...confirmState} onCancel={handleCancel} />

      <div className="flex h-full" style={{ height: 'calc(100vh - 80px)' }}>
        {/* ═══════════════ LEFT PANEL ═══════════════ */}
        <div className={`flex flex-col min-w-0 master-panel ${hasDetailOpen ? 'w-[420px] shrink-0' : 'flex-1'}`}>

          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-5 py-4">
            <div className="flex items-center gap-2 min-w-0">
              {onGoBack && (
                <button onClick={onGoBack} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0" style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }} title="Torna all'appuntamento">
                  <ArrowLeft size={14} /><span>Appuntamento</span>
                </button>
              )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>Pacchetti</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {viewMode === 'catalogo'
                  ? `${pacchetti.length} pacchett${pacchetti.length === 1 ? 'o' : 'i'}`
                  : `${clientiConPacchetti.length} client${clientiConPacchetti.length === 1 ? 'e' : 'i'} con pacchetti`}
              </p>
            </div>
            </div>
            <Button
              onClick={() => viewMode === 'catalogo'
                ? (setCreateForm({ nome: '', descrizione: '', prezzo_totale: 0, num_sedute: 1, tipo_pagamento: 'anticipo', trattamentiIds: [] }), setIsCreateOpen(true))
                : openAssegna(selectedCliente ? { clienteId: selectedCliente.id } : undefined)
              }
              variant="primary" size="sm" className="shrink-0 whitespace-nowrap">
              <Plus size={15} className="mr-1" />{viewMode === 'catalogo' ? 'Nuovo' : 'Assegna'}
            </Button>
          </div>

          {/* Search */}
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: 'var(--color-text-muted)' }} />
              <input ref={searchRef} type="text"
                placeholder={viewMode === 'catalogo' ? 'Cerca pacchetto...' : 'Cerca cliente...'}
                value={viewMode === 'catalogo' ? searchCatalogo : searchClienti}
                onChange={e => viewMode === 'catalogo' ? setSearchCatalogo(e.target.value) : setSearchClienti(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-sm"
                style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--color-text-primary)', outline: 'none' }}
              />
              {(viewMode === 'catalogo' ? searchCatalogo : searchClienti) && (
                <button onClick={() => { viewMode === 'catalogo' ? setSearchCatalogo('') : setSearchClienti(''); searchRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md" style={{ color: 'var(--color-text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* View switcher + Catalogo sub-filters */}
          <div className="filter-chips">
            {/* View switch */}
            <button onClick={() => switchView('catalogo')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{ background: viewMode === 'catalogo' ? 'var(--color-primary)' : 'var(--glass-border)', color: viewMode === 'catalogo' ? 'white' : 'var(--color-text-secondary)' }}>
              <Package size={12} />Catalogo <span className="opacity-70">{pacchetti.length}</span>
            </button>
            <button onClick={() => switchView('per_cliente')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{ background: viewMode === 'per_cliente' ? 'var(--color-primary)' : 'var(--glass-border)', color: viewMode === 'per_cliente' ? 'white' : 'var(--color-text-secondary)' }}>
              <Users size={12} />Per Cliente
            </button>

            {/* Catalogo sub-filters */}
            {viewMode === 'catalogo' && (
              <>
                <div className="w-px h-4 mx-1" style={{ background: 'var(--glass-border)' }} />
                <button onClick={() => setFilterAttivo('tutti')}
                  className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                  style={{ background: filterAttivo === 'tutti' ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent', color: filterAttivo === 'tutti' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  Tutti <span className="opacity-70">{pacchetti.length}</span>
                </button>
                <button onClick={() => setFilterAttivo('attivi')}
                  className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                  style={{ background: filterAttivo === 'attivi' ? 'color-mix(in srgb, var(--color-success) 12%, transparent)' : 'transparent', color: filterAttivo === 'attivi' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                  Attivi <span className="opacity-70">{countAttivi}</span>
                </button>
                {countInattivi > 0 && (
                  <button onClick={() => setFilterAttivo('inattivi')}
                    className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                    style={{ background: filterAttivo === 'inattivi' ? 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)' : 'transparent', color: 'var(--color-text-muted)' }}>
                    Inattivi <span className="opacity-70">{countInattivi}</span>
                  </button>
                )}
              </>
            )}

          </div>

          {/* ═══════════════ LIST CONTENT ═══════════════ */}
          <div className="flex-1 overflow-y-auto px-3">

            {/* ---- CATALOGO VIEW ---- */}
            {viewMode === 'catalogo' && (
              loading && pacchetti.length === 0 ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-3 items-center p-3 rounded-xl">
                      <div className="w-10 h-10 rounded-xl shimmer shrink-0" />
                      <div className="flex-1 space-y-2"><div className="h-4 w-32 rounded shimmer" /><div className="h-3 w-24 rounded shimmer" /></div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                    <Package size={24} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Nessun pacchetto</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {searchCatalogo ? 'Prova a modificare la ricerca' : 'Crea il primo pacchetto'}
                  </p>
                </div>
              ) : (
                <div className={selectedPacchetto ? 'space-y-1 pb-4' : 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2 pb-4'}>
                  {filtered.map(p => {
                    const isSelected = selectedPacchetto?.id === p.id;
                    return (
                      <button key={p.id} onClick={() => selectPacchetto(p)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left group list-card ${isSelected ? 'list-card-selected' : ''}`}
                        style={{ opacity: p.attivo ? 1 : 0.5 }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>
                          <Package size={18} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{p.nome}</p>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {p.num_sedute} sedute · {formatPrice(p.prezzo_totale)}
                          </span>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* ---- PER CLIENTE VIEW ---- */}
            {viewMode === 'per_cliente' && (
              clientiConPacchetti.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                    <Users size={24} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Nessun pacchetto assegnato</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Assegna un pacchetto per iniziare</p>
                </div>
              ) : (
                <div className={selectedCliente ? 'space-y-1 pb-4' : 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2 pb-4'}>
                  {clientiConPacchetti.map(cliente => {
                    const pks = clientiPacchetti.get(cliente.id) || [];
                    const attivi = pks.filter(p => p.stato === 'attivo').length;
                    const completati = pks.filter(p => p.stato === 'completato').length;
                    const isSelected = selectedCliente?.id === cliente.id;

                    return (
                      <button key={cliente.id} onClick={() => selectCliente(cliente)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left group list-card ${isSelected ? 'list-card-selected' : ''}`}>
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>
                          {cliente.nome.charAt(0)}{cliente.cognome.charAt(0)}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {cliente.cognome} {cliente.nome}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {pks.length} pacchett{pks.length === 1 ? 'o' : 'i'}
                            </span>
                            {/* Status dots */}
                            <div className="flex gap-0.5 items-center">
                              {attivi > 0 && Array.from({ length: Math.min(attivi, 4) }, (_, i) => (
                                <div key={`a${i}`} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                              ))}
                              {completati > 0 && Array.from({ length: Math.min(completati, 4) }, (_, i) => (
                                <div key={`c${i}`} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* Footer count */}
            {viewMode === 'catalogo' && filtered.length > 0 && (
              <div className="px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {filtered.length} pacchett{filtered.length === 1 ? 'o' : 'i'} — {countAttivi} attiv{countAttivi === 1 ? 'o' : 'i'}
              </div>
            )}
            {viewMode === 'per_cliente' && clientiConPacchetti.length > 0 && (
              <div className="px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {clientiConPacchetti.length} client{clientiConPacchetti.length === 1 ? 'e' : 'i'} con pacchetti
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ RIGHT: DETAIL PANEL ═══════════════ */}

        {/* Catalogo detail */}
        {selectedPacchetto && viewMode === 'catalogo' && (
          <div className="flex-1 min-w-[400px] border-l overflow-y-auto" style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)' }}>
            <PacchettoDetailPanel
              pacchetto={selectedPacchetto}
              trattamenti={trattamenti}
              isEditing={isEditing}
              formData={editForm}
              setFormData={setEditForm}
              onStartEdit={startEdit}
              onSave={handleEditSave}
              onCancelEdit={cancelEdit}
              onClose={() => { setSelectedPacchetto(null); setIsEditing(false); }}
              onToggleAttivo={handleToggleAttivo}
              onAssegna={() => openAssegna({ pacchettoId: selectedPacchetto.id })}
              showOverflow={showOverflow}
              setShowOverflow={setShowOverflow}
              toggleTrattamento={toggleTrattamento}
            />
          </div>
        )}

        {/* Per Cliente detail */}
        {selectedCliente && viewMode === 'per_cliente' && (
          <div className="flex-1 min-w-[400px] border-l overflow-y-auto" style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)' }}>
            <ClientePacchettiPanel
              cliente={selectedCliente}
              pacchetti={clientiPacchetti.get(selectedCliente.id) || []}
              seduteMap={seduteMap}
              payInput={payInput}
              onPayInputChange={setPayInput}
              onRegistraPagamentoSeduta={handlePagamentoSeduta}
              onAnnullaAssegnazione={handleAnnullaAssegnazione}
              onRiattivaAssegnazione={handleRiattivaAssegnazione}
              onEliminaAssegnazione={handleEliminaAssegnazione}
              onSaveAssegnazione={handleSaveAssegnazione}
              filterStato={filterStatoPkg}
              onFilterChange={setFilterStatoPkg}
              onReloadData={() => loadClientiPacchetti(searchClienti)}
              onAssegna={() => openAssegna({ clienteId: selectedCliente.id })}
              onClose={() => { setSelectedCliente(null); setSeduteMap(new Map()); setPayInput(null); }}
            />
          </div>
        )}
      </div>

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* CREATE */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nuovo Pacchetto">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome *" value={createForm.nome} onChange={e => setCreateForm({ ...createForm, nome: e.target.value })} placeholder="Es. Percorso Laser 10 sedute" required />
          <Textarea label="Descrizione" value={createForm.descrizione} onChange={e => setCreateForm({ ...createForm, descrizione: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prezzo *" type="number" min={0} step={0.01} value={createForm.prezzo_totale || ''} onChange={e => setCreateForm({ ...createForm, prezzo_totale: parseFloat(e.target.value) || 0 })} required />
            <Input label="Sedute *" type="number" min={1} value={createForm.num_sedute} onChange={e => setCreateForm({ ...createForm, num_sedute: parseInt(e.target.value) || 1 })} required />
          </div>
          <TrattamentiCheckList trattamenti={trattamenti} selectedIds={createForm.trattamentiIds} onToggle={(id) => setCreateForm(f => ({ ...f, trattamentiIds: toggleTrattamento(f.trattamentiIds, id) }))} />
          <div className="flex gap-3 justify-end pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
            <Button type="submit" variant="primary">Crea</Button>
          </div>
        </form>
      </Modal>

      {/* ASSEGNA (enhanced) */}
      <Modal isOpen={isAssegnaOpen} onClose={() => setIsAssegnaOpen(false)} title="Assegna Pacchetto">
        <form onSubmit={handleAssegna} className="space-y-4">
          <ClienteSearchSelect value={assegnaForm.cliente_id} onChange={id => setAssegnaForm(f => ({ ...f, cliente_id: id }))} />
          <Select label="Pacchetto *" value={assegnaForm.pacchetto_id} onChange={e => {
            const pkgId = e.target.value;
            const pkg = pacchetti.find(p => p.id === pkgId);
            setAssegnaForm(f => ({ ...f, pacchetto_id: pkgId, importo_totale: pkg?.prezzo_totale || 0 }));
          }}>
            <option value="">Seleziona pacchetto...</option>
            {pacchetti.filter(p => p.attivo).map(p => (
              <option key={p.id} value={p.id}>{p.nome} — {formatPrice(p.prezzo_totale)} ({p.num_sedute} sedute)</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Data inizio</label>
              <input type="date" value={assegnaForm.data_inizio}
                onChange={e => setAssegnaForm(f => ({ ...f, data_inizio: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--input-bg, var(--card-bg))', border: '1.5px solid var(--glass-border)', color: 'var(--color-text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Importo
                <button type="button" onClick={() => setAssegnaForm(f => ({ ...f, importo_personalizzato: !f.importo_personalizzato }))}
                  className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded"
                  style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                  {assegnaForm.importo_personalizzato ? 'Usa listino' : 'Personalizza'}
                </button>
              </label>
              <input type="number" min={0} step={0.01}
                value={assegnaForm.importo_personalizzato ? (assegnaForm.importo_totale || '') : (assegnaPreview?.prezzo_totale || '')}
                onChange={e => setAssegnaForm(f => ({ ...f, importo_totale: parseFloat(e.target.value) || 0 }))}
                disabled={!assegnaForm.importo_personalizzato}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--input-bg, var(--card-bg))', border: '1.5px solid var(--glass-border)', color: 'var(--color-text-primary)', outline: 'none', opacity: assegnaForm.importo_personalizzato ? 1 : 0.6 }} />
            </div>
          </div>

          <Select label="Modalità pagamento" value={assegnaForm.tipo_pagamento} onChange={e => setAssegnaForm(f => ({ ...f, tipo_pagamento: e.target.value }))}>
            <option value="anticipo">Anticipo</option>
            <option value="dilazionato">Dilazionato</option>
            <option value="per_seduta">Per seduta</option>
          </Select>

          <Textarea label="Note" value={assegnaForm.note} onChange={e => setAssegnaForm(f => ({ ...f, note: e.target.value }))} rows={2} />

          {/* Preview */}
          {assegnaPreview && (
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Riepilogo</p>
              <div className="flex items-center gap-2">
                <Package size={14} style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{assegnaPreview.nome}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {assegnaPreview.num_sedute} sedute · {TIPO_LABELS[assegnaForm.tipo_pagamento] || assegnaForm.tipo_pagamento}
              </p>
              {assegnaPreview.trattamenti_inclusi.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Trattamenti: {assegnaPreview.trattamenti_inclusi.map(t => t.trattamento_nome).join(', ')}
                </p>
              )}
              <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                {formatPrice(assegnaForm.importo_personalizzato ? assegnaForm.importo_totale : assegnaPreview.prezzo_totale)}
                {assegnaForm.importo_personalizzato && assegnaForm.importo_totale !== assegnaPreview.prezzo_totale && (
                  <span className="text-xs font-normal line-through ml-2" style={{ color: 'var(--color-text-muted)' }}>
                    {formatPrice(assegnaPreview.prezzo_totale)}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Duplicate warning */}
          {assegnaDuplicateWarning && (
            <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)' }}>
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
              <p className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                Questo cliente ha già questo pacchetto attivo. Continuando verrà creata una seconda assegnazione.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAssegnaOpen(false)}>Annulla</Button>
            <Button type="submit" variant="primary">Conferma Assegna</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

// ============================================
// PROGRESS DOTS
// ============================================

const ProgressDots: React.FC<{ completate: number; totali: number; sedute?: PacchettoSeduta[] }> = ({ completate, totali, sedute }) => {
  if (totali > 15) {
    const pct = Math.min(100, Math.round((completate / totali) * 100));
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--color-success)' }} />
        </div>
        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{completate}/{totali}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totali }, (_, i) => {
        const seduta = sedute?.find(s => s.numero_seduta === i + 1);
        const stato = seduta?.stato || (i < completate ? 'completata' : 'pianificata');
        return (
          <div key={i} className="w-2 h-2 rounded-full transition-colors" style={{
            background: stato === 'completata' ? 'var(--color-success)'
              : stato === 'saltata' ? 'var(--color-warning)'
              : 'var(--glass-border)',
          }} />
        );
      })}
      <span className="text-[10px] font-medium ml-1" style={{ color: 'var(--color-text-muted)' }}>{completate}/{totali}</span>
    </div>
  );
};

// ============================================
// CLIENTE PACCHETTI PANEL (NEW)
// ============================================

const ClientePacchettiPanel: React.FC<{
  cliente: Cliente;
  pacchetti: PacchettoCliente[];
  seduteMap: Map<string, PacchettoSeduta[]>;
  payInput: { id: string; importo: number } | null;
  onPayInputChange: (v: { id: string; importo: number } | null) => void;
  onRegistraPagamentoSeduta: (sedutaId: string, importo: number) => void;
  onAnnullaAssegnazione: (pcId: string, pacchettoNome: string) => void;
  onRiattivaAssegnazione: (pcId: string) => void;
  onEliminaAssegnazione: (pcId: string, pacchettoNome: string) => void;
  onSaveAssegnazione: (pcId: string, note: string, importo: number) => void;
  filterStato: 'tutti' | 'attivo' | 'completato' | 'annullato';
  onFilterChange: (stato: 'tutti' | 'attivo' | 'completato' | 'annullato') => void;
  onReloadData: () => void;
  onAssegna: () => void;
  onClose: () => void;
}> = ({ cliente, pacchetti: pks, seduteMap, payInput, onPayInputChange, onRegistraPagamentoSeduta, onAnnullaAssegnazione, onRiattivaAssegnazione, onEliminaAssegnazione, onSaveAssegnazione, filterStato, onFilterChange, onReloadData, onAssegna, onClose }) => {

  const filteredPks = filterStato === 'tutti' ? pks : pks.filter(p => p.stato === filterStato);
  const attivi = pks.filter(p => p.stato === 'attivo').length;
  const completati = pks.filter(p => p.stato === 'completato').length;
  const [expandedPkgId, setExpandedPkgId] = useState<string | null>(filteredPks.length === 1 ? filteredPks[0]?.id || null : null);
  const [pagamentiMap, setPagamentiMap] = useState<Map<string, PacchettoPagamento[]>>(new Map());
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editImporto, setEditImporto] = useState(0);
  const [overflowPkgId, setOverflowPkgId] = useState<string | null>(null);

  const startEditPkg = (pc: PacchettoCliente) => {
    setEditingPkgId(pc.id);
    setEditNote(pc.note || '');
    setEditImporto(pc.importo_totale);
  };

  const cancelEditPkg = () => setEditingPkgId(null);

  // Carica pagamenti quando si espande
  useEffect(() => {
    if (expandedPkgId && !pagamentiMap.has(expandedPkgId)) {
      pacchettiService.getPagamentiPacchetto(expandedPkgId).then(p => {
        setPagamentiMap(prev => { const m = new Map(prev); m.set(expandedPkgId, p); return m; });
      }).catch(() => {});
    }
  }, [expandedPkgId]);

  const handleAddPagamento = async (pcId: string, importo: number, tipo?: string) => {
    try {
      await pacchettiService.aggiungiPagamentoPacchetto(pcId, importo, tipo);
      const p = await pacchettiService.getPagamentiPacchetto(pcId);
      setPagamentiMap(prev => { const m = new Map(prev); m.set(pcId, p); return m; });
      onReloadData();
    } catch (e) { console.error('Errore registrazione pagamento:', e); }
  };
  const [quickPayPkgId, setQuickPayPkgId] = useState<string | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState('');

  const saveEditPkg = (pcId: string) => {
    onSaveAssegnazione(pcId, editNote, editImporto);
    setEditingPkgId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="max-w-2xl">
          <div className="flex items-start justify-between mb-4">
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <X size={18} />
            </button>
            <div className="flex items-center gap-1">
              <button onClick={onAssegna} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                <Plus size={13} className="inline mr-1" />Assegna pacchetto
              </button>
            </div>
          </div>

          {/* Client info */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>
              {cliente.nome.charAt(0)}{cliente.cognome.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {cliente.cognome} {cliente.nome}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {pks.length} pacchett{pks.length === 1 ? 'o' : 'i'}
                {attivi > 0 && <> · {attivi} attiv{attivi === 1 ? 'o' : 'i'}</>}
                {completati > 0 && <> · {completati} completat{completati === 1 ? 'o' : 'i'}</>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtri stato pacchetti */}
      {pks.length > 0 && (() => {
        const countPkgAttivi = pks.filter(p => p.stato === 'attivo').length;
        const countPkgCompletati = pks.filter(p => p.stato === 'completato').length;
        const countPkgAnnullati = pks.filter(p => p.stato === 'annullato').length;
        return (
          <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap">
            <button onClick={() => onFilterChange('tutti')}
              className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{ background: filterStato === 'tutti' ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent', color: filterStato === 'tutti' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              Tutti <span className="opacity-70">{pks.length}</span>
            </button>
            {countPkgAttivi > 0 && (
              <button onClick={() => onFilterChange('attivo')}
                className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{ background: filterStato === 'attivo' ? 'color-mix(in srgb, var(--color-success) 12%, transparent)' : 'transparent', color: filterStato === 'attivo' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                Attivi <span className="opacity-70">{countPkgAttivi}</span>
              </button>
            )}
            {countPkgCompletati > 0 && (
              <button onClick={() => onFilterChange('completato')}
                className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{ background: filterStato === 'completato' ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent', color: filterStato === 'completato' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                Completati <span className="opacity-70">{countPkgCompletati}</span>
              </button>
            )}
            {countPkgAnnullati > 0 && (
              <button onClick={() => onFilterChange('annullato')}
                className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{ background: filterStato === 'annullato' ? 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)' : 'transparent', color: 'var(--color-text-muted)' }}>
                Annullati <span className="opacity-70">{countPkgAnnullati}</span>
              </button>
            )}
          </div>
        );
      })()}

      {/* Package cards */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="max-w-2xl space-y-3">
          {filteredPks.map(pc => {
            const isEditingThis = editingPkgId === pc.id;
            const isExpanded = expandedPkgId === pc.id;
            const stato = STATO_CONFIG[pc.stato] || STATO_CONFIG.attivo;
            const payPct = pc.importo_totale > 0 ? Math.min(100, Math.round((pc.importo_pagato / pc.importo_totale) * 100)) : 0;
            const isOverflowOpen = overflowPkgId === pc.id;
            const pkgSedute = seduteMap.get(pc.id) || [];

            return (
              <div key={pc.id} className="rounded-xl overflow-hidden" style={{ background: 'color-mix(in srgb, var(--glass-border) 30%, transparent)', border: '1px solid var(--glass-border)' }}>
                {/* Card header — compatto, cliccabile */}
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedPkgId(isExpanded ? null : pc.id)}>
                  {/* Icona + info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{pc.pacchetto_nome}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: stato.bg, color: stato.color }}>{stato.label}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}>
                        {pc.tipo_pagamento === 'anticipo' ? 'Anticipo' : pc.tipo_pagamento === 'per_seduta' ? 'Per seduta' : 'Dilazionato'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressDots completate={pc.sedute_completate} totali={pc.sedute_totali} />
                      {pc.importo_totale > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
                            <div className="h-full rounded-full" style={{ width: `${payPct}%`, background: payPct >= 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Prezzo a destra */}
                  {pc.importo_totale > 0 && (
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold" style={{ color: payPct >= 100 ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                        {formatPrice(pc.importo_pagato)}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}> / {formatPrice(pc.importo_totale)}</span>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {pc.sedute_completate}/{pc.sedute_totali} sed.
                        {pc.importo_rimanente <= 0 && pc.importo_totale > 0 && <span style={{ color: 'var(--color-success)' }}> · Saldato</span>}
                      </p>
                    </div>
                  )}
                  {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
                </div>

                {/* Contenuto espanso */}
                {isExpanded && (
                <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  {/* Azioni — riga compatta */}
                  <div className="flex items-center gap-1 justify-end pt-1.5">
                    {!isEditingThis && pc.stato !== 'annullato' && pc.stato !== 'completato' && (
                      <button onClick={() => startEditPkg(pc)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors"
                        style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                        <Edit2 size={10} className="inline mr-1" />Modifica
                      </button>
                    )}
                    <div className="relative">
                      <button onClick={() => setOverflowPkgId(isOverflowOpen ? null : pc.id)}
                        className="p-1 rounded-md transition-colors" style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <MoreHorizontal size={14} />
                      </button>
                      {isOverflowOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOverflowPkgId(null)} />
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg py-1 z-50" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                            {(pc.stato === 'attivo' || pc.stato === 'sospeso') && (
                              <button onClick={() => { setOverflowPkgId(null); onAnnullaAssegnazione(pc.id, pc.pacchetto_nome); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors" style={{ color: '#f59e0b' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                <EyeOff size={13} />Annulla
                              </button>
                            )}
                            {pc.stato === 'annullato' && (
                              <button onClick={() => { setOverflowPkgId(null); onRiattivaAssegnazione(pc.id); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors" style={{ color: '#10b981' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                <Eye size={13} />Riattiva
                              </button>
                            )}
                            <button onClick={() => { setOverflowPkgId(null); onEliminaAssegnazione(pc.id, pc.pacchetto_nome); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors" style={{ color: '#ef4444' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                              <Trash2 size={13} />Elimina
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pagamento anticipo/dilazionato — storico + registra */}
                  {(pc.tipo_pagamento === 'anticipo' || pc.tipo_pagamento === 'dilazionato') && pc.stato === 'attivo' && (
                    <div className="space-y-1.5">
                      {(pagamentiMap.get(pc.id) || []).map(pag => (
                        <div key={pag.id} className="flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px]"
                          style={{ background: 'color-mix(in srgb, var(--color-success) 4%, transparent)' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>{new Date(pag.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
                          <span className="font-medium" style={{ color: pag.tipo === 'anticipo' ? 'var(--color-primary)' : 'var(--color-success)' }}>
                            {pag.tipo === 'anticipo' ? 'Anticipo' : 'Pagamento'}
                          </span>
                          <span className="flex-1" />
                          <span className="font-semibold" style={{ color: 'var(--color-success)' }}>{formatPrice(pag.importo)}</span>
                        </div>
                      ))}
                      {pc.importo_rimanente > 0 && (
                        quickPayPkgId === pc.id ? (
                          <div className="flex items-center gap-2">
                            <input type="number" step="0.01" min="0" value={quickPayAmount}
                              onChange={e => setQuickPayAmount(e.target.value)}
                              className="flex-1 px-2 py-1 rounded-md text-xs"
                              style={{ background: 'var(--input-bg, var(--card-bg))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)', outline: 'none', maxWidth: 110 }}
                              placeholder={`€ ${pc.importo_rimanente.toFixed(2)}`} autoFocus />
                            <button onClick={() => {
                              const amt = parseFloat(quickPayAmount) || 0;
                              if (amt > 0) {
                                const hasAnticipo = (pagamentiMap.get(pc.id) || []).some(p => p.tipo === 'anticipo');
                                handleAddPagamento(pc.id, amt, pc.tipo_pagamento === 'anticipo' && !hasAnticipo ? 'anticipo' : 'pagamento');
                                setQuickPayPkgId(null); setQuickPayAmount('');
                              }
                            }}
                              className="text-[10px] font-medium px-2 py-1 rounded-md" style={{ background: 'var(--color-success)', color: 'white' }}>OK</button>
                            <button onClick={() => setQuickPayPkgId(null)} className="p-0.5" style={{ color: 'var(--color-text-muted)' }}><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setQuickPayPkgId(pc.id)}
                            className="text-[10px] font-medium px-2.5 py-1 rounded-md transition-colors"
                            style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                            {pc.tipo_pagamento === 'anticipo' && (pagamentiMap.get(pc.id) || []).length === 0 ? '+ Anticipo' : '+ Pagamento'}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {/* Edit form (inline) */}
                  {isEditingThis ? (
                    <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Modifica assegnazione</p>
                      <Input label="Importo totale" type="number" min={0} step={0.01}
                        value={editImporto || ''} onChange={e => setEditImporto(parseFloat(e.target.value) || 0)} />
                      <Textarea label="Note" value={editNote} onChange={e => setEditNote(e.target.value)} rows={2} />
                      <div className="flex gap-2">
                        <Button onClick={() => saveEditPkg(pc.id)} variant="primary" size="sm">Salva</Button>
                        <Button onClick={cancelEditPkg} variant="ghost" size="sm">Annulla</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {pc.note && (
                        <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>{pc.note}</p>
                      )}

                      {/* Sedute — stato da appuntamento, link diretto */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Sedute</p>
                        <div className="space-y-1.5">
                          {pkgSedute.map(s => {
                            const done = s.stato === 'completata';
                            const saltata = s.stato === 'saltata';
                            const hasApp = !!s.appuntamento_id;
                            const appStato = s.appuntamento_stato;

                            // Colori stato appuntamento
                            const statoConfig: Record<string, { label: string; color: string; bg: string }> = {
                              prenotato: { label: 'Prenotato', color: 'var(--color-primary)', bg: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' },
                              confermato: { label: 'Confermato', color: 'var(--color-primary)', bg: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' },
                              in_corso: { label: 'In corso', color: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)' },
                              completato: { label: 'Completato', color: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)' },
                              annullato: { label: 'Annullato', color: 'var(--color-danger, #ef4444)', bg: 'color-mix(in srgb, var(--color-danger, #ef4444) 12%, transparent)' },
                              no_show: { label: 'No Show', color: 'var(--color-text-muted)', bg: 'var(--glass-border)' },
                            };
                            const appStatoInfo = appStato ? statoConfig[appStato] || null : null;

                            return (
                              <div key={s.id} className="rounded-lg px-3 py-2"
                                style={{ background: done ? 'color-mix(in srgb, var(--color-success) 5%, transparent)' : saltata ? 'color-mix(in srgb, var(--color-warning) 5%, transparent)' : 'color-mix(in srgb, var(--glass-border) 30%, transparent)' }}>
                                <div className="flex items-center gap-2.5">
                                  {done ? <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                                    : saltata ? <Circle size={14} style={{ color: 'var(--color-warning)' }} />
                                    : hasApp ? <CheckCircle size={14} style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
                                    : <Circle size={14} style={{ color: 'var(--color-text-muted)' }} />}

                                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                    Seduta {s.numero_seduta}
                                  </span>

                                  {/* Data appuntamento o prevista */}
                                  {s.appuntamento_data && (
                                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                      {new Date(s.appuntamento_data).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}
                                  {!s.appuntamento_data && s.data_prevista && (
                                    <span className="text-[10px] italic" style={{ color: 'var(--color-text-muted)' }}>
                                      prev. {new Date(s.data_prevista).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}

                                  <div className="flex-1" />

                                  {/* Badge stato appuntamento */}
                                  {hasApp && appStatoInfo && (
                                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: appStatoInfo.bg, color: appStatoInfo.color }}>
                                      {appStatoInfo.label}
                                    </span>
                                  )}

                                  {/* Badge pagato */}
                                  {s.importo_pagato > 0 && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)' }}>
                                      {formatPrice(s.importo_pagato)}
                                    </span>
                                  )}

                                  {/* Link all'appuntamento */}
                                  {hasApp && (
                                    <button onClick={() => {
                                      window.dispatchEvent(new CustomEvent('navigateToPage', { detail: { appuntamentoId: s.appuntamento_id } }));
                                    }}
                                      className="p-1 rounded-md transition-colors" style={{ color: 'var(--color-text-muted)' }}
                                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 10%, transparent)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                                      title="Apri appuntamento">
                                      <ChevronRight size={13} />
                                    </button>
                                  )}

                                  {/* Non prenotata */}
                                  {!hasApp && !done && !saltata && (
                                    <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>Non prenotata</span>
                                  )}
                                </div>

                                {/* Pagamento inline — per tipo "per_seduta", sempre visibile */}
                                {pc.tipo_pagamento === 'per_seduta' && pc.stato === 'attivo' && !saltata && (() => {
                                  const isPayEditing = payInput?.id === s.id;
                                  const prezzoPerSeduta = pc.sedute_totali > 0 ? pc.importo_totale / pc.sedute_totali : 0;
                                  return (
                                    <div className="mt-1.5 pl-6 flex items-center gap-2">
                                      {isPayEditing ? (
                                        <>
                                          <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>€</span>
                                          <input type="number" step="0.01" min="0"
                                            value={payInput?.importo || ''}
                                            onChange={e => onPayInputChange({ id: s.id, importo: parseFloat(e.target.value) || 0 })}
                                            placeholder={prezzoPerSeduta.toFixed(2)}
                                            className="px-2 py-1 rounded-md text-xs"
                                            style={{ background: 'var(--input-bg, var(--card-bg))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)', outline: 'none', width: 80 }}
                                            autoFocus />
                                          <button onClick={() => { const amt = payInput?.importo || 0; if (amt > 0) onRegistraPagamentoSeduta(s.id, amt); onPayInputChange(null); }}
                                            className="text-[10px] font-medium px-2 py-1 rounded-md" style={{ background: 'var(--color-success)', color: 'white' }}>OK</button>
                                          <button onClick={() => onPayInputChange(null)} className="p-0.5" style={{ color: 'var(--color-text-muted)' }}><X size={12} /></button>
                                        </>
                                      ) : (
                                        <button onClick={() => onPayInputChange({ id: s.id, importo: s.importo_pagato || prezzoPerSeduta })}
                                          className="text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors"
                                          style={{ color: s.importo_pagato > 0 ? 'var(--color-success)' : 'var(--color-primary)', background: s.importo_pagato > 0 ? 'color-mix(in srgb, var(--color-success) 8%, transparent)' : 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                                          {s.importo_pagato > 0 ? formatPrice(s.importo_pagato) : 'Registra'}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PACCHETTO DETAIL PANEL (catalog)
// ============================================

const PacchettoDetailPanel: React.FC<{
  pacchetto: PacchettoConTrattamenti;
  trattamenti: Trattamento[];
  isEditing: boolean;
  formData: { nome: string; descrizione: string; prezzo_totale: number; num_sedute: number; tipo_pagamento: string; trattamentiIds: string[] };
  setFormData: (d: any) => void;
  onStartEdit: () => void;
  onSave: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onToggleAttivo: () => void;
  onAssegna: () => void;
  showOverflow: boolean;
  setShowOverflow: (v: boolean) => void;
  toggleTrattamento: (ids: string[], id: string) => string[];
}> = ({ pacchetto: p, trattamenti, isEditing, formData, setFormData, onStartEdit, onSave, onCancelEdit, onClose, onToggleAttivo, onAssegna, showOverflow, setShowOverflow, toggleTrattamento }) => {

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
                <button onClick={onStartEdit} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                  <Edit2 size={13} className="inline mr-1" />Modifica
                </button>
              )}
              <div className="relative">
                <button onClick={e => { e.stopPropagation(); setShowOverflow(!showOverflow); }} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <MoreHorizontal size={18} />
                </button>
                {showOverflow && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowOverflow(false)} />
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg py-1 z-50" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                      <button onClick={() => { setShowOverflow(false); onAssegna(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors" style={{ color: 'var(--color-primary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <Users size={14} />Assegna a cliente
                      </button>
                      <button onClick={() => { setShowOverflow(false); onToggleAttivo(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors" style={{ color: p.attivo ? '#ef4444' : '#10b981' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        {p.attivo ? <><EyeOff size={14} />Disattiva</> : <><Eye size={14} />Riattiva</>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={onSave} className="space-y-4">
              <Input label="Nome *" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
              <Textarea label="Descrizione" value={formData.descrizione} onChange={e => setFormData({ ...formData, descrizione: e.target.value })} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Prezzo" type="number" min={0} step={0.01} value={formData.prezzo_totale || ''} onChange={e => setFormData({ ...formData, prezzo_totale: parseFloat(e.target.value) || 0 })} />
                <Input label="Sedute" type="number" min={1} value={formData.num_sedute} onChange={e => setFormData({ ...formData, num_sedute: parseInt(e.target.value) || 1 })} />
              </div>
              <TrattamentiCheckList trattamenti={trattamenti} selectedIds={formData.trattamentiIds} onToggle={(id) => setFormData({ ...formData, trattamentiIds: toggleTrattamento(formData.trattamentiIds, id) })} />
              <div className="flex gap-2 pt-3">
                <Button type="submit" variant="primary" size="sm">Salva</Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>Annulla</Button>
              </div>
            </form>
          ) : (
            <>
              {/* View mode */}
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>
                  <Package size={22} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{p.nome}</h2>
                  {!p.attivo && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--glass-border)', color: 'var(--color-text-muted)' }}>Disattivato</span>}
                </div>
              </div>
              {p.descrizione && <p className="text-sm mt-2 mb-4" style={{ color: 'var(--color-text-secondary)' }}>{p.descrizione}</p>}

              {/* Info rows */}
              <div className="space-y-3 mt-4">
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Prezzo totale</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{formatPrice(p.prezzo_totale)}</span>
                </div>
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Numero sedute</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{p.num_sedute}</span>
                </div>
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Prezzo per seduta</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatPrice(p.prezzo_totale / Math.max(p.num_sedute, 1))}</span>
                </div>
              </div>

              {/* Treatments */}
              {p.trattamenti_inclusi.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Trattamenti inclusi</p>
                  <div className="space-y-1">
                    {p.trattamenti_inclusi.map(t => (
                      <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--glass-border) 50%, transparent)' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{t.trattamento_nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// SHARED: Trattamenti Checklist
// ============================================

function TrattamentiCheckList({ trattamenti, selectedIds, onToggle }: { trattamenti: Trattamento[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        Trattamenti inclusi {selectedIds.length > 0 && <span style={{ color: 'var(--color-primary)' }}>({selectedIds.length})</span>}
      </label>
      <div className="rounded-xl p-2 max-h-40 overflow-y-auto space-y-0.5" style={{ background: 'var(--input-bg, var(--card-bg))', border: '1.5px solid var(--glass-border)' }}>
        {trattamenti.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: 'var(--color-text-muted)' }}>Nessun trattamento</p>
        ) : [...trattamenti].sort((a, b) => {
          const aChecked = selectedIds.includes(a.id) ? 0 : 1;
          const bChecked = selectedIds.includes(b.id) ? 0 : 1;
          return aChecked - bChecked;
        }).map(t => {
          const checked = selectedIds.includes(t.id);
          return (
            <button key={t.id} type="button" onClick={() => onToggle(t.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
              style={{ background: checked ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent' }}>
              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                style={{ background: checked ? 'var(--color-primary)' : 'transparent', border: checked ? 'none' : '1.5px solid var(--glass-border)' }}>
                {checked && <Check size={11} className="text-white" />}
              </div>
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{t.nome}</span>
              {t.prezzo_listino != null && <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>{formatPrice(t.prezzo_listino)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// SHARED: Client Search Select
// ============================================

function ClienteSearchSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Cliente[]>([]);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [open, setOpen] = useState(false);

  // Pre-carica il cliente se value è già settato
  useEffect(() => {
    if (value && !selected) {
      clientiService.getClienti(undefined, 100).then(cls => {
        const c = cls.find(cl => cl.id === value);
        if (c) setSelected(c);
      }).catch(() => {});
    }
    if (!value && selected) {
      setSelected(null);
    }
  }, [value]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { const cls = await clientiService.getClienti(search, 10); setResults(cls); setOpen(true); } catch (e) { console.error('Errore ricerca clienti:', e); }
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const pick = (c: Cliente) => { setSelected(c); onChange(c.id); setSearch(''); setOpen(false); };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Cliente *</label>
      {selected ? (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: 'var(--input-bg, var(--card-bg))', border: '1.5px solid var(--glass-border)' }}>
          <span className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>{selected.cognome} {selected.nome}</span>
          <button type="button" onClick={() => { setSelected(null); onChange(''); }} style={{ color: 'var(--color-text-muted)' }}><X size={14} /></button>
        </div>
      ) : (
        <input type="text" placeholder="Cerca cliente..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm"
          style={{ background: 'var(--input-bg, var(--card-bg))', border: '1.5px solid var(--glass-border)', color: 'var(--color-text-primary)', outline: 'none' }}
          onFocus={() => results.length > 0 && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} />
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {results.map(c => (
            <button key={c.id} type="button" onMouseDown={() => pick(c)} className="w-full px-3.5 py-2.5 text-left text-sm transition-colors flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              {c.cognome} {c.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
