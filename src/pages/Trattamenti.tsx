import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, X, ChevronRight, MoreHorizontal, Plus, Search, Edit2, Trash2, Clock, Euro, Sparkles, FolderOpen, EyeOff, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Toast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { CategorieTrattamentiModal } from '../components/trattamenti/CategorieTrattamentiModal';
import { trattamentiService } from '../services/trattamenti';
import { Trattamento, CategoriaTrattamento, CreateTrattamentoInput } from '../types/trattamento';

interface ToastState { message: string; type: 'success' | 'error'; }
interface TrattamentiProps { onGoBack?: () => void; }

// Color palette for categories
const catColors = [
  { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1' }, { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899' },
  { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' }, { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' }, { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6' },
  { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' }, { bg: 'rgba(6, 182, 212, 0.1)', text: '#06b6d4' },
];
const getCatColor = (name: string) => { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return catColors[Math.abs(h) % catColors.length]; };

export const Trattamenti: React.FC<TrattamentiProps> = ({ onGoBack }) => {
  const [trattamenti, setTrattamenti] = useState<Trattamento[]>([]);
  const [categorie, setCategorie] = useState<CategoriaTrattamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Create modal (new only)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateTrattamentoInput>({ categoria_id: '', nome: '', descrizione: '', durata_minuti: 30, prezzo_listino: 0, attivo: true, note_operative: '' });

  // Detail panel
  const [selectedTrattamento, setSelectedTrattamento] = useState<Trattamento | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<CreateTrattamentoInput>({ categoria_id: '', nome: '', descrizione: '', durata_minuti: 30, prezzo_listino: 0, attivo: true, note_operative: '' });

  // Overflow menu
  const [showOverflow, setShowOverflow] = useState(false);

  // Categorie modal
  const [isCategorieModalOpen, setIsCategorieModalOpen] = useState(false);

  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();
  const searchRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  useEffect(() => { loadData(); }, []);

  // Close overflow on click outside
  useEffect(() => {
    if (showOverflow) {
      const close = () => setShowOverflow(false);
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
  }, [showOverflow]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [t, c] = await Promise.all([trattamentiService.getTrattamenti(undefined, true), trattamentiService.getCategorie()]);
      setTrattamenti(t); setCategorie(c);
    } catch { showToast('Errore nel caricamento dei dati', 'error'); }
    finally { setLoading(false); }
  };

  // Client-side filtering
  const filtered = useMemo(() => {
    return trattamenti.filter(t => {
      const matchSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (t.descrizione && t.descrizione.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch && (!selectedCategoria || t.categoria_id === selectedCategoria);
    });
  }, [trattamenti, searchTerm, selectedCategoria]);

  // Create modal
  const openCreateModal = () => {
    setCreateFormData({ categoria_id: categorie[0]?.id ?? '', nome: '', descrizione: '', durata_minuti: 30, prezzo_listino: 0, attivo: true, note_operative: '' });
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.nome.trim() || !createFormData.categoria_id) { showToast('Nome e categoria sono obbligatori', 'error'); return; }
    try {
      await trattamentiService.createTrattamento(createFormData);
      showToast('Trattamento creato con successo', 'success');
      setIsModalOpen(false);
      loadData();
    } catch { showToast('Errore nel salvataggio', 'error'); }
  };

  // Detail panel: select treatment
  const selectTrattamento = (t: Trattamento) => {
    setSelectedTrattamento(t);
    setIsEditing(false);
  };

  // Detail panel: start editing
  const startEdit = () => {
    if (!selectedTrattamento) return;
    setEditFormData({
      categoria_id: selectedTrattamento.categoria_id || '',
      nome: selectedTrattamento.nome,
      descrizione: selectedTrattamento.descrizione || '',
      durata_minuti: Number(selectedTrattamento.durata_minuti),
      prezzo_listino: selectedTrattamento.prezzo_listino || 0,
      attivo: selectedTrattamento.attivo,
      note_operative: selectedTrattamento.note_operative || '',
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrattamento) return;
    if (!editFormData.nome.trim() || !editFormData.categoria_id) { showToast('Nome e categoria sono obbligatori', 'error'); return; }
    try {
      const updated = await trattamentiService.updateTrattamento(selectedTrattamento.id, {
        categoria_id: editFormData.categoria_id,
        nome: editFormData.nome,
        descrizione: editFormData.descrizione || undefined,
        durata_minuti: editFormData.durata_minuti,
        prezzo_listino: editFormData.prezzo_listino,
        attivo: editFormData.attivo,
        note_operative: editFormData.note_operative || undefined,
      });
      showToast('Trattamento aggiornato con successo', 'success');
      setSelectedTrattamento(updated);
      setIsEditing(false);
      loadData();
    } catch { showToast('Errore nel salvataggio', 'error'); }
  };

  const handleToggleAttivo = async (id: string) => {
    const t = trattamenti.find(tr => tr.id === id);
    if (!t) return;
    try {
      await trattamentiService.updateTrattamento(id, { attivo: !t.attivo });
      showToast(t.attivo ? 'Trattamento disattivato' : 'Trattamento riattivato', 'success');
      if (selectedTrattamento?.id === id) {
        setSelectedTrattamento({ ...t, attivo: !t.attivo });
      }
      loadData();
    } catch { showToast('Errore durante l\'operazione', 'error'); }
  };

  const handleDelete = async (id: string) => {
    const t = trattamenti.find(tr => tr.id === id);
    if (!t) return;
    if (!await showConfirm({ title: 'Elimina Trattamento', message: `Sei sicuro di voler eliminare il trattamento "${t.nome}"? Questa azione è irreversibile.`, confirmText: 'Elimina', cancelText: 'Annulla', variant: 'danger' })) return;
    try {
      await trattamentiService.deleteTrattamento(id);
      showToast('Trattamento eliminato', 'success');
      if (selectedTrattamento?.id === id) setSelectedTrattamento(null);
      loadData();
    } catch { showToast('Errore nell\'eliminazione', 'error'); }
  };

  // Category chips data
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>();
    trattamenti.forEach(t => {
      if (t.categoria_id) counts.set(t.categoria_id, (counts.get(t.categoria_id) || 0) + 1);
    });
    return categorie.map(c => ({ id: c.id, nome: c.nome, count: counts.get(c.id) || 0 }));
  }, [categorie, trattamenti]);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex h-full" style={{ height: 'calc(100vh - 80px)' }}>
        {/* ═══════════════ LEFT: TREATMENT LIST ═══════════════ */}
        <div className={`flex flex-col min-w-0 master-panel ${selectedTrattamento ? 'w-[420px] shrink-0' : 'flex-1'}`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              {onGoBack && (
                <button onClick={onGoBack} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0" style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }} title="Torna all'appuntamento">
                  <ArrowLeft size={14} /><span>Appuntamento</span>
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>Trattamenti</h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{trattamenti.length} trattament{trattamenti.length === 1 ? 'o' : 'i'}</p>
              </div>
            </div>
            <Button onClick={openCreateModal} variant="primary" size="sm" className="shrink-0 whitespace-nowrap">
              <Plus size={15} className="mr-1" />Nuovo
            </Button>
          </div>

          {/* Search */}
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Cerca per nome o descrizione..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-sm"
                style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--color-text-primary)', outline: 'none' }}
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); searchRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md" style={{ color: 'var(--color-text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="filter-chips">
            <button
              onClick={() => setSelectedCategoria('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: !selectedCategoria ? 'var(--color-primary)' : 'var(--glass-border)',
                color: !selectedCategoria ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              Tutti
              <span className="ml-0.5 opacity-70">{trattamenti.length}</span>
            </button>
            {categoryChips.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(selectedCategoria === cat.id ? '' : cat.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: selectedCategoria === cat.id ? 'var(--color-primary)' : 'var(--glass-border)',
                  color: selectedCategoria === cat.id ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                {cat.nome}
                <span className="ml-0.5 opacity-70">{cat.count}</span>
              </button>
            ))}
            <button
              onClick={() => setIsCategorieModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{ background: 'transparent', color: 'var(--color-text-muted)' }}
            >
              <FolderOpen size={12} />Gestisci
            </button>
          </div>

          {/* Treatment List */}
          <div className="flex-1 overflow-y-auto px-3">
            {loading && trattamenti.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex gap-3 items-center p-3 rounded-xl">
                    <div className="w-3 h-3 rounded-full shimmer shrink-0" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-32 rounded shimmer" /><div className="h-3 w-20 rounded shimmer" /></div>
                    <div className="h-4 w-16 rounded shimmer" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                  <Sparkles size={24} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Nessun trattamento trovato</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {searchTerm || selectedCategoria ? 'Prova a modificare i filtri' : 'Inizia creando il primo trattamento'}
                </p>
              </div>
            ) : (
              <div className={selectedTrattamento ? 'space-y-1 pb-4' : 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2 pb-4'}>
                {filtered.map(t => {
                  const cc = getCatColor(t.categoria_nome || 'N/A');
                  const isSelected = selectedTrattamento?.id === t.id;

                  return (
                    <button
                      key={t.id}
                      onClick={() => selectTrattamento(t)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left group list-card ${isSelected ? 'list-card-selected' : ''}`}
                      style={{ opacity: t.attivo ? 1 : 0.5 }}
                    >
                      {/* Category color dot */}
                      <div className="shrink-0">
                        <div className="w-3 h-3 rounded-full" style={{ background: cc.text }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {t.nome}
                          </p>
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: cc.bg, color: cc.text }}>
                            {t.categoria_nome || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {t.durata_minuti} min
                            {t.prezzo_listino ? ` · \u20AC${t.prezzo_listino.toFixed(2)}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Chevron */}
                      <div className="flex items-center shrink-0">
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {/* Footer count */}
            {filtered.length > 0 && (
              <div className="px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {filtered.length} trattament{filtered.length === 1 ? 'o' : 'i'} — {filtered.filter(t => t.attivo).length} attiv{filtered.filter(t => t.attivo).length === 1 ? 'o' : 'i'}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ RIGHT: DETAIL PANEL ═══════════════ */}
        {selectedTrattamento && (
          <div className="flex-1 min-w-[400px] border-l overflow-y-auto" style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)' }}>
            <TrattamentoDetailPanel
              trattamento={selectedTrattamento}
              categorie={categorie}
              isEditing={isEditing}
              formData={editFormData}
              setFormData={setEditFormData}
              onStartEdit={startEdit}
              onSave={handleEditSave}
              onCancelEdit={cancelEdit}
              onClose={() => { setSelectedTrattamento(null); setIsEditing(false); }}
              onDelete={() => handleDelete(selectedTrattamento.id)}
              onToggleAttivo={() => handleToggleAttivo(selectedTrattamento.id)}
              showOverflow={showOverflow}
              setShowOverflow={setShowOverflow}
            />
          </div>
        )}

      </div>

      {/* CREATE MODAL (only for new treatments) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuovo Trattamento">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Categoria *" value={createFormData.categoria_id} onChange={e => setCreateFormData({ ...createFormData, categoria_id: e.target.value })} required>
            <option value="">Seleziona categoria</option>
            {categorie.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
          </Select>
          <Input label="Nome Trattamento *" value={createFormData.nome} onChange={e => setCreateFormData({ ...createFormData, nome: e.target.value })} placeholder="es. Pulizia viso profonda" required />
          <Textarea label="Descrizione" value={createFormData.descrizione || ''} onChange={e => setCreateFormData({ ...createFormData, descrizione: e.target.value })} rows={3} placeholder="Descrizione del trattamento..." />
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" label="Durata (minuti) *" value={createFormData.durata_minuti} onChange={e => setCreateFormData({ ...createFormData, durata_minuti: parseInt(e.target.value) || 0 })} min="1" required />
            <Input type="number" label={`Prezzo (\u20AC)`} value={createFormData.prezzo_listino || 0} onChange={e => setCreateFormData({ ...createFormData, prezzo_listino: parseFloat(e.target.value) || 0 })} step="0.01" min="0" />
          </div>
          <Textarea label="Note Operative" value={createFormData.note_operative || ''} onChange={e => setCreateFormData({ ...createFormData, note_operative: e.target.value })} rows={2} placeholder="Note per gli operatori..." />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={createFormData.attivo} onChange={e => setCreateFormData({ ...createFormData, attivo: e.target.checked })} className="rounded" />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Trattamento attivo</span>
          </label>
          <div className="flex gap-3 justify-end pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
            <Button type="submit" variant="primary">Crea</Button>
          </div>
        </form>
      </Modal>

      <CategorieTrattamentiModal isOpen={isCategorieModalOpen} onClose={() => setIsCategorieModalOpen(false)} onSave={loadData} />
      <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmText} cancelText={confirmState.cancelText} variant={confirmState.variant} onConfirm={confirmState.onConfirm} onCancel={handleCancel} />
    </>
  );
};

// ═══════════════════════════════════════════════════
// DETAIL PANEL COMPONENT
// ═══════════════════════════════════════════════════

const TrattamentoDetailPanel: React.FC<{
  trattamento: Trattamento;
  categorie: CategoriaTrattamento[];
  isEditing: boolean;
  formData: CreateTrattamentoInput;
  setFormData: (d: CreateTrattamentoInput) => void;
  onStartEdit: () => void;
  onSave: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  onToggleAttivo: () => void;
  showOverflow: boolean;
  setShowOverflow: (v: boolean) => void;
}> = ({ trattamento, categorie, isEditing, formData, setFormData, onStartEdit, onSave, onCancelEdit, onClose, onDelete, onToggleAttivo, showOverflow, setShowOverflow }) => {
  const cc = getCatColor(trattamento.categoria_nome || 'N/A');

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
                    <button onClick={() => { setShowOverflow(false); onToggleAttivo(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors" style={{ color: trattamento.attivo ? '#f59e0b' : '#10b981' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      {trattamento.attivo ? <><EyeOff size={14} />Disattiva</> : <><Eye size={14} />Riattiva</>}
                    </button>
                    <button onClick={() => { setShowOverflow(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors" style={{ color: '#ef4444' }}
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

        {/* Treatment Name + Badges */}
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {trattamento.nome}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: cc.bg, color: cc.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cc.text }} />
              {trattamento.categoria_nome || 'N/A'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
              background: trattamento.attivo ? 'rgba(16, 185, 129, 0.12)' : 'rgba(156, 163, 175, 0.15)',
              color: trattamento.attivo ? '#10b981' : '#9ca3af',
            }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: trattamento.attivo ? '#10b981' : '#9ca3af' }} />
              {trattamento.attivo ? 'Attivo' : 'Inattivo'}
            </span>
          </div>

          {/* Quick Info Pills */}
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}>
              <Clock size={13} style={{ color: 'var(--color-text-muted)' }} />
              {trattamento.durata_minuti} min
            </span>
            {trattamento.prezzo_listino != null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}>
                <Euro size={13} style={{ color: 'var(--color-text-muted)' }} />
                {'\u20AC'}{trattamento.prezzo_listino.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <div className="max-w-2xl">
          <AnagraficaTrattamentoTab
            trattamento={trattamento}
            categorie={categorie}
            isEditing={isEditing}
            formData={formData}
            setFormData={setFormData}
            onSave={onSave}
            onCancel={onCancelEdit}
          />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// TAB: ANAGRAFICA TRATTAMENTO (view + inline edit)
// ═══════════════════════════════════════════════════

const AnagraficaTrattamentoTab: React.FC<{
  trattamento: Trattamento;
  categorie: CategoriaTrattamento[];
  isEditing: boolean;
  formData: CreateTrattamentoInput;
  setFormData: (d: CreateTrattamentoInput) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}> = ({ trattamento, categorie, isEditing, formData, setFormData, onSave, onCancel }) => {
  if (!isEditing) {
    // View mode
    const catNome = categorie.find(c => c.id === trattamento.categoria_id)?.nome || trattamento.categoria_nome || 'N/A';

    const fields: { label: string; value: string | number | null | undefined }[] = [
      { label: 'Nome', value: trattamento.nome },
      { label: 'Categoria', value: catNome },
      { label: 'Descrizione', value: trattamento.descrizione },
      { label: 'Durata', value: `${trattamento.durata_minuti} minuti` },
      { label: 'Prezzo', value: trattamento.prezzo_listino != null ? `\u20AC ${trattamento.prezzo_listino.toFixed(2)}` : null },
      { label: 'Note Operative', value: trattamento.note_operative },
      { label: 'Controindicazioni', value: trattamento.controindicazioni },
      { label: 'Attrezzature Richieste', value: trattamento.attrezzature_richieste },
    ];

    return (
      <div className="space-y-5">
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={i}>
              <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{f.label}</label>
              <p className="text-sm mt-0.5 whitespace-pre-wrap" style={{ color: f.value ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {f.value || '\u2014'}
              </p>
            </div>
          ))}
        </div>

        {/* Meta */}
        <div className="pt-3 space-y-1" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Creato il {new Date(trattamento.created_at).toLocaleDateString('it-IT')}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Ultimo aggiornamento {new Date(trattamento.updated_at).toLocaleDateString('it-IT')}
          </p>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <form onSubmit={onSave} className="space-y-4">
      <Select label="Categoria *" value={formData.categoria_id} onChange={e => setFormData({ ...formData, categoria_id: e.target.value })} required>
        <option value="">Seleziona categoria</option>
        {categorie.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
      </Select>
      <Input label="Nome Trattamento *" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
      <Textarea label="Descrizione" value={formData.descrizione || ''} onChange={e => setFormData({ ...formData, descrizione: e.target.value })} rows={3} placeholder="Descrizione del trattamento..." />
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" label="Durata (minuti) *" value={formData.durata_minuti} onChange={e => setFormData({ ...formData, durata_minuti: parseInt(e.target.value) || 0 })} min="1" required />
        <Input type="number" label={`Prezzo (\u20AC)`} value={formData.prezzo_listino || 0} onChange={e => setFormData({ ...formData, prezzo_listino: parseFloat(e.target.value) || 0 })} step="0.01" min="0" />
      </div>
      <Textarea label="Note Operative" value={formData.note_operative || ''} onChange={e => setFormData({ ...formData, note_operative: e.target.value })} rows={2} placeholder="Note per gli operatori..." />
      <label className="flex items-center gap-2 p-2 rounded-lg cursor-pointer" style={{ border: '1px solid var(--glass-border)', background: formData.attivo ? 'rgba(16, 185, 129, 0.08)' : 'transparent' }}>
        <input type="checkbox" checked={formData.attivo} onChange={e => setFormData({ ...formData, attivo: e.target.checked })} className="rounded" />
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Trattamento attivo</span>
      </label>

      <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <Button type="button" variant="secondary" onClick={onCancel} size="sm">Annulla</Button>
        <Button type="submit" variant="primary" size="sm">Salva Modifiche</Button>
      </div>
    </form>
  );
};
