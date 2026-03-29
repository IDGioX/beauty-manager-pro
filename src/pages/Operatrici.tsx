import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, X, ChevronRight, MoreHorizontal, Phone, Mail, Edit2, Trash2, UserX, UserCheck, Plus, Search, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { Toast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import type { Operatrice } from '../types/agenda';

const SPEC_COLORS = [
  { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6' },
  { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
  { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
  { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899' },
  { bg: 'rgba(6, 182, 212, 0.1)', text: '#06b6d4' },
  { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
  { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1' },
];
const getSpecColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return SPEC_COLORS[Math.abs(h) % SPEC_COLORS.length];
};
const parseSpecs = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
  } catch {}
  return raw.split(',').map(s => s.trim()).filter(Boolean);
};
// Converte qualsiasi formato (JSON array o stringa) in stringa leggibile per il form
const specsToFormString = (raw: string | null | undefined): string => {
  return parseSpecs(raw).join(', ');
};
const SpecBadge: React.FC<{ spec: string; size?: 'sm' | 'md' }> = ({ spec, size = 'sm' }) => {
  const c = getSpecColor(spec);
  return (
    <span
      className={`inline-flex items-center font-medium ${size === 'sm' ? 'px-1.5 py-0.5 rounded text-[9px]' : 'px-2 py-0.5 rounded-md text-[10px]'}`}
      style={{ background: c.bg, color: c.text }}
    >
      {spec}
    </span>
  );
};
import { operatriciService, CreateOperatriceInput, UpdateOperatriceInput } from '../services/operatrici';

interface ToastState { message: string; type: 'success' | 'error'; }

const defaultColors = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316'];

type Segment = 'attivi' | 'inattivi';

interface OperatriciProps { onGoBack?: () => void; }

export const Operatrici: React.FC<OperatriciProps> = ({ onGoBack }) => {
  const [allOperatrici, setAllOperatrici] = useState<Operatrice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [segment, setSegment] = useState<Segment>('attivi');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Detail panel
  const [selectedOperatrice, setSelectedOperatrice] = useState<Operatrice | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form data for both create modal and edit panel
  const [formData, setFormData] = useState<CreateOperatriceInput & { note?: string }>({
    codice: '', nome: '', cognome: '', telefono: '', email: '', colore_agenda: defaultColors[0], specializzazioni: '', note: '',
  });

  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();
  const searchRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // Generate unique codice for new operators
  const generateCodice = useCallback(async (): Promise<string> => {
    try {
      const existingCodes = new Set(allOperatrici.map(op => op.codice));
      let num = allOperatrici.length + 1;
      let code = `OP${String(num).padStart(3, '0')}`;
      while (existingCodes.has(code)) {
        num++;
        code = `OP${String(num).padStart(3, '0')}`;
      }
      return code;
    } catch { return `OP${Date.now().toString().slice(-6)}`; }
  }, [allOperatrici]);

  // Load all operators (active + inactive) once
  useEffect(() => { loadOperatrici(); }, []);

  const loadOperatrici = async () => {
    setLoading(true);
    try {
      const data = await operatriciService.getOperatrici(true);
      setAllOperatrici(data);
    } catch { showToast('Errore nel caricamento degli operatori', 'error'); }
    finally { setLoading(false); }
  };

  // Client-side filtering
  const filteredOperatrici = useMemo(() => {
    let list = allOperatrici;

    // Segment filter
    if (segment === 'attivi') {
      list = list.filter(op => op.attiva);
    } else {
      list = list.filter(op => !op.attiva);
    }

    // Search filter
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(op =>
        op.nome.toLowerCase().includes(s) ||
        op.cognome.toLowerCase().includes(s) ||
        op.codice.toLowerCase().includes(s) ||
        (op.telefono && op.telefono.includes(s)) ||
        (op.email && op.email.toLowerCase().includes(s))
      );
    }

    // Sort: cognome asc
    return list.sort((a, b) => a.cognome.localeCompare(b.cognome));
  }, [allOperatrici, segment, searchTerm]);

  // Stats
  const stats = useMemo(() => ({
    attivi: allOperatrici.filter(op => op.attiva).length,
    inattivi: allOperatrici.filter(op => !op.attiva).length,
  }), [allOperatrici]);

  // Search handler - filter as you type
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Create (modal only)
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.cognome.trim()) { showToast('Nome e cognome sono obbligatori', 'error'); return; }
    setLoading(true);
    try {
      const autoCodice = await generateCodice();
      await operatriciService.createOperatrice({
        codice: autoCodice, nome: formData.nome, cognome: formData.cognome,
        telefono: formData.telefono || undefined, email: formData.email || undefined,
        colore_agenda: formData.colore_agenda, specializzazioni: formData.specializzazioni || undefined,
      });
      showToast('Operatore creato con successo!', 'success');
      setIsModalOpen(false);
      resetForm();
      loadOperatrici();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Errore durante il salvataggio';
      showToast(msg, 'error');
    } finally { setLoading(false); }
  };

  // Update (panel inline edit)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperatrice) return;
    if (!formData.nome.trim() || !formData.cognome.trim()) { showToast('Nome e cognome sono obbligatori', 'error'); return; }
    setLoading(true);
    try {
      const updated = await operatriciService.updateOperatrice(selectedOperatrice.id, {
        codice: selectedOperatrice.codice,
        nome: formData.nome,
        cognome: formData.cognome,
        telefono: formData.telefono || undefined,
        email: formData.email || undefined,
        colore_agenda: formData.colore_agenda,
        specializzazioni: formData.specializzazioni || undefined,
        note: formData.note || undefined,
      } as UpdateOperatriceInput);
      showToast('Operatore modificato con successo!', 'success');
      setSelectedOperatrice(updated);
      setIsEditing(false);
      loadOperatrici();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Errore durante il salvataggio';
      showToast(msg, 'error');
    } finally { setLoading(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!await showConfirm({ title: 'Disattiva Operatore', message: 'Sei sicuro di voler disattivare questo operatore? Potrà essere riattivato in seguito.', confirmText: 'Disattiva', cancelText: 'Annulla', variant: 'warning' })) return;
    setLoading(true);
    try {
      await operatriciService.deactivateOperatrice(id);
      showToast('Operatore disattivato!', 'success');
      if (selectedOperatrice?.id === id) setSelectedOperatrice(null);
      loadOperatrici();
    } catch { showToast('Errore durante la disattivazione', 'error'); }
    finally { setLoading(false); }
  };

  const handleReactivate = async (id: string) => {
    if (!await showConfirm({ title: 'Riattiva Operatore', message: 'Sei sicuro di voler riattivare questo operatore?', confirmText: 'Riattiva', cancelText: 'Annulla', variant: 'info' })) return;
    setLoading(true);
    try {
      await operatriciService.reactivateOperatrice(id);
      showToast('Operatore riattivato!', 'success');
      loadOperatrici();
    } catch { showToast('Errore durante la riattivazione', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm({ title: 'Elimina Operatore', message: 'Eliminare definitivamente questo operatore? Azione irreversibile.', confirmText: 'Elimina', cancelText: 'Annulla', variant: 'danger' })) return;
    setLoading(true);
    try {
      await operatriciService.deleteOperatrice(id);
      showToast('Operatore eliminato!', 'success');
      if (selectedOperatrice?.id === id) setSelectedOperatrice(null);
      loadOperatrici();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Errore durante l\'eliminazione';
      showToast(msg, 'error');
    } finally { setLoading(false); }
  };

  const startEditInPanel = () => {
    if (!selectedOperatrice) return;
    setFormData({
      codice: selectedOperatrice.codice,
      nome: selectedOperatrice.nome,
      cognome: selectedOperatrice.cognome,
      telefono: selectedOperatrice.telefono || '',
      email: selectedOperatrice.email || '',
      colore_agenda: selectedOperatrice.colore_agenda,
      specializzazioni: specsToFormString(selectedOperatrice.specializzazioni),
      note: selectedOperatrice.note || '',
    });
    setIsEditing(true);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => setFormData({
    codice: '', nome: '', cognome: '', telefono: '', email: '',
    colore_agenda: defaultColors[0], specializzazioni: '', note: '',
  });

  // Segment definitions
  const segments: { key: Segment; label: string; count: number }[] = [
    { key: 'attivi', label: 'Attivi', count: stats.attivi },
    { key: 'inattivi', label: 'Inattivi', count: stats.inattivi },
  ];

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex h-full" style={{ height: 'calc(100vh - 80px)' }}>
        {/* ═══════════════ LEFT: OPERATOR LIST ═══════════════ */}
        <div className={`flex flex-col min-w-0 master-panel ${selectedOperatrice ? 'w-[420px] shrink-0' : 'flex-1'}`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-5 py-3">
            <div className="flex items-center gap-2 min-w-0">
              {onGoBack && (
                <button onClick={onGoBack} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0" style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }} title="Torna all'appuntamento">
                  <ArrowLeft size={14} /><span>Appuntamento</span>
                </button>
              )}
              <h1 className="text-lg font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>Operatori</h1>
            </div>
            <Button onClick={openCreateModal} variant="primary" size="sm" className="shrink-0 whitespace-nowrap">
              <Plus size={15} className="mr-1" />Nuovo
            </Button>
          </div>

          {/* Search + Segments inline */}
          <div className="px-5 pb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Cerca operatore..."
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--color-text-primary)', outline: 'none' }}
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); searchRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md" style={{ color: 'var(--color-text-muted)' }}>
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              {segments.map(seg => (
                <button
                  key={seg.key}
                  onClick={() => setSegment(seg.key)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all"
                  style={{
                    background: segment === seg.key ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent',
                    color: segment === seg.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  {seg.label} {seg.count}
                </button>
              ))}
            </div>
          </div>

          {/* Operator List */}
          <div className="flex-1 overflow-y-auto px-3">
            {loading && allOperatrici.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex gap-3 items-center p-3 rounded-xl">
                    <div className="w-11 h-11 rounded-full shimmer shrink-0" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-32 rounded shimmer" /><div className="h-3 w-20 rounded shimmer" /></div>
                  </div>
                ))}
              </div>
            ) : filteredOperatrici.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                  <Users size={24} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Nessun operatore trovato</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {searchTerm ? 'Prova con altri termini di ricerca' : 'Inizia aggiungendo il primo operatore'}
                </p>
              </div>
            ) : (
              <div className={selectedOperatrice ? 'space-y-1 pb-4' : 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2 pb-4'}>
                {filteredOperatrici.map(op => {
                  const isSelected = selectedOperatrice?.id === op.id;
                  const specs = parseSpecs(op.specializzazioni);

                  return (
                    <button
                      key={op.id}
                      onClick={() => { setSelectedOperatrice(op); setIsEditing(false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left group list-card ${isSelected ? 'list-card-selected' : ''}`}
                      style={{ opacity: op.attiva ? 1 : 0.5 }}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: op.colore_agenda }}>
                          {op.nome.charAt(0)}{op.cognome.charAt(0)}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {op.cognome} {op.nome}
                        </p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {specs.length > 0 ? (
                            <>
                              {specs.slice(0, 3).map((s, i) => <SpecBadge key={i} spec={s} size="sm" />)}
                              {specs.length > 3 && (
                                <span className="text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}>+{specs.length - 3}</span>
                              )}
                            </>
                          ) : op.telefono ? (
                            <span className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{op.telefono}</span>
                          ) : null}
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
            {filteredOperatrici.length > 0 && (
              <div className="px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {filteredOperatrici.length} operator{filteredOperatrici.length === 1 ? 'e' : 'i'}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ RIGHT: DETAIL PANEL ═══════════════ */}
        {selectedOperatrice && (
          <div className="flex-1 min-w-[400px] border-l overflow-y-auto" style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)' }}>
            <OperatriceDetailPanel
              operatrice={selectedOperatrice}
              isEditing={isEditing}
              formData={formData}
              setFormData={setFormData}
              onStartEdit={startEditInPanel}
              onSave={handleUpdate}
              onCancelEdit={() => setIsEditing(false)}
              onClose={() => { setSelectedOperatrice(null); setIsEditing(false); }}
              onDeactivate={() => handleDeactivate(selectedOperatrice.id)}
              onReactivate={() => handleReactivate(selectedOperatrice.id)}
              onDelete={() => handleDelete(selectedOperatrice.id)}
              loading={loading}
            />
          </div>
        )}

      </div>

      {/* CREATE MODAL (only for new operators) */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title="Nuovo Operatore">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nome *" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required disabled={loading} />
              <Input label="Cognome *" value={formData.cognome} onChange={e => setFormData({ ...formData, cognome: e.target.value })} required disabled={loading} />
            </div>
          </div>
          <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Colore Agenda</span>
            <div className="flex gap-2 flex-wrap">
              {defaultColors.map(color => (
                <button key={color} type="button" onClick={() => setFormData({ ...formData, colore_agenda: color })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${formData.colore_agenda === color ? 'scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: color, borderColor: formData.colore_agenda === color ? 'var(--color-text-primary)' : 'transparent' }} />
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Contatti</span>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Telefono" type="tel" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} disabled={loading} />
              <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={loading} />
            </div>
          </div>
          <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <Input label="Specializzazioni" value={formData.specializzazioni} onChange={e => setFormData({ ...formData, specializzazioni: e.target.value })} placeholder="es: Massaggi, Trattamenti viso..." disabled={loading} />
            <Textarea label="Note" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} rows={2} disabled={loading} />
          </div>
          <div className="flex gap-3 justify-end pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }} disabled={loading}>Annulla</Button>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Salvataggio...' : 'Crea Operatore'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmText} cancelText={confirmState.cancelText} variant={confirmState.variant} onConfirm={confirmState.onConfirm} onCancel={handleCancel} />
    </>
  );
};

// ═══════════════════════════════════════════════════
// DETAIL PANEL COMPONENT
// ═══════════════════════════════════════════════════

interface DetailPanelProps {
  operatrice: Operatrice;
  isEditing: boolean;
  formData: CreateOperatriceInput & { note?: string };
  setFormData: (data: CreateOperatriceInput & { note?: string }) => void;
  onStartEdit: () => void;
  onSave: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  loading: boolean;
}

const OperatriceDetailPanel: React.FC<DetailPanelProps> = ({
  operatrice, isEditing, formData, setFormData,
  onStartEdit, onSave, onCancelEdit, onClose, onDeactivate, onReactivate, onDelete, loading,
}) => {
  const [showActions, setShowActions] = useState(false);
  const specs = parseSpecs(operatrice.specializzazioni);

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="p-4 pb-3">
        <div className="max-w-2xl">
        <div className="flex items-start justify-between mb-4">
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <X size={18} />
          </button>
          <div className="flex items-center gap-1">
            {!isEditing && (
              <button onClick={onStartEdit} className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors" style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
                <Edit2 size={13} className="inline mr-1" />Modifica
              </button>
            )}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <MoreHorizontal size={18} />
              </button>
              {showActions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg py-1 z-50" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                    {operatrice.attiva ? (
                      <button onClick={() => { setShowActions(false); onDeactivate(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors" style={{ color: '#f59e0b' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <UserX size={14} />Disattiva
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { setShowActions(false); onReactivate(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors" style={{ color: '#10b981' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <UserCheck size={14} />Riattiva
                        </button>
                        <button onClick={() => { setShowActions(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors" style={{ color: '#ef4444' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <Trash2 size={14} />Elimina
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Avatar + Name Block */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white" style={{ background: operatrice.colore_agenda }}>
              {operatrice.nome.charAt(0)}{operatrice.cognome.charAt(0)}
            </div>
            {!operatrice.attiva && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#9ca3af', border: '2px solid var(--card-bg, white)' }}>
                <UserX size={10} style={{ color: 'white' }} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {operatrice.cognome} {operatrice.nome}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-mono" style={{ background: 'var(--glass-border)', color: 'var(--color-text-muted)' }}>
                {operatrice.codice}
              </span>
              {specs.map((s, i) => <SpecBadge key={i} spec={s} size="md" />)}
            </div>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center gap-2 mt-4">
          {operatrice.telefono && (
            <a href={`tel:${operatrice.telefono}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 12%, transparent)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
              <Phone size={13} />Chiama
            </a>
          )}
          {operatrice.email && (
            <a href={`mailto:${operatrice.email}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Mail size={13} />Email
            </a>
          )}
        </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <div className="max-w-2xl">
          <AnagraficaTab
            operatrice={operatrice}
            isEditing={isEditing}
            formData={formData}
            setFormData={setFormData}
            onSave={onSave}
            onCancel={onCancelEdit}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// TAB: ANAGRAFICA (view + inline edit)
// ═══════════════════════════════════════════════════

const AnagraficaTab: React.FC<{
  operatrice: Operatrice;
  isEditing: boolean;
  formData: CreateOperatriceInput & { note?: string };
  setFormData: (data: CreateOperatriceInput & { note?: string }) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ operatrice, isEditing, formData, setFormData, onSave, onCancel, loading }) => {
  const specs = parseSpecs(operatrice.specializzazioni);

  if (!isEditing) {
    // View mode
    const fields = [
      { label: 'Nome', value: operatrice.nome },
      { label: 'Cognome', value: operatrice.cognome },
      { label: 'Codice', value: operatrice.codice },
      { label: 'Telefono', value: operatrice.telefono },
      { label: 'Email', value: operatrice.email },
      { label: 'Note', value: operatrice.note },
    ];

    return (
      <div className="space-y-5">
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={i}>
              <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{f.label}</label>
              <p className="text-sm mt-0.5" style={{ color: f.value ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {f.value || '—'}
              </p>
            </div>
          ))}
        </div>

        {/* Specializzazioni */}
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Specializzazioni</label>
          {specs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {specs.map((s, i) => <SpecBadge key={i} spec={s} size="md" />)}
            </div>
          ) : (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>—</p>
          )}
        </div>

        {/* Colore Agenda */}
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Colore Agenda</label>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-6 h-6 rounded-lg" style={{ background: operatrice.colore_agenda, border: '1px solid rgba(0,0,0,0.1)' }} />
          </div>
        </div>

        {/* Meta */}
        <div className="pt-3 space-y-1" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Creato il {new Date(operatrice.created_at).toLocaleDateString('it-IT')}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Ultimo aggiornamento {new Date(operatrice.updated_at).toLocaleDateString('it-IT')}
          </p>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <form onSubmit={onSave} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome *" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required disabled={loading} />
        <Input label="Cognome *" value={formData.cognome} onChange={e => setFormData({ ...formData, cognome: e.target.value })} required disabled={loading} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Telefono" type="tel" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} disabled={loading} />
        <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={loading} />
      </div>
      <Input label="Specializzazioni" value={formData.specializzazioni} onChange={e => setFormData({ ...formData, specializzazioni: e.target.value })} placeholder="es: Massaggi, Trattamenti viso..." disabled={loading} />
      <Textarea label="Note" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} rows={2} disabled={loading} />

      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Colore Agenda</label>
        <div className="flex gap-2 flex-wrap mt-1.5">
          {defaultColors.map(color => (
            <button key={color} type="button" onClick={() => setFormData({ ...formData, colore_agenda: color })}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${formData.colore_agenda === color ? 'scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: color, borderColor: formData.colore_agenda === color ? 'var(--color-text-primary)' : 'transparent' }} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <Button type="button" variant="secondary" onClick={onCancel} size="sm">Annulla</Button>
        <Button type="submit" variant="primary" loading={loading} size="sm">Salva Modifiche</Button>
      </div>
    </form>
  );
};
