import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, UserX, UserCheck, MessageCircle, Users, Mail, Shield, ArrowLeft, X, Calendar, Euro, Clock, Award, Scissors, Cake, Star, AlertTriangle, Sparkles, ChevronRight, Heart, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { Toast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { Cliente, CreateClienteInput } from '../types/cliente';
import { clientiService } from '../services/clienti';
import { analyticsService, ClienteCompleteProfile } from '../services/analytics';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface ToastState { message: string; type: 'success' | 'error'; }
interface ClientiProps { openClienteId?: string | null; onClienteOpened?: () => void; onGoBack?: () => void; }

type Segment = 'tutti' | 'attivi' | 'nuovi' | 'compleanno' | 'inattivi';
type DetailTab = 'panoramica' | 'anagrafica' | 'estetica';

// Helpers
const avatarColors = [
  { bg: '#ede9fe', text: '#7c3aed' }, { bg: '#fce7f3', text: '#db2777' },
  { bg: '#d1fae5', text: '#059669' }, { bg: '#fef3c7', text: '#d97706' },
  { bg: '#dbeafe', text: '#2563eb' }, { bg: '#e0e7ff', text: '#4f46e5' },
  { bg: '#ffe4e6', text: '#e11d48' }, { bg: '#ccfbf1', text: '#0d9488' },
];
const getAvatarColor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; };

const isBirthdayWithin = (dataNascita: string | null, days: number): boolean => {
  if (!dataNascita) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const bd = new Date(dataNascita);
  const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  if (thisYear < today) thisYear.setFullYear(thisYear.getFullYear() + 1);
  const diff = (thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= days;
};

const daysUntilBirthday = (dataNascita: string | null): number | null => {
  if (!dataNascita) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const bd = new Date(dataNascita);
  const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  if (thisYear < today) thisYear.setFullYear(thisYear.getFullYear() + 1);
  return Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getClienteAge = (dataNascita: string | null): number | null => {
  if (!dataNascita) return null;
  const bd = new Date(dataNascita);
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
};

const isNewClient = (createdAt: string): boolean => {
  const created = new Date(createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return created >= thirtyDaysAgo;
};

export const Clienti: React.FC<ClientiProps> = ({ openClienteId, onClienteOpened, onGoBack }) => {
  const [allClienti, setAllClienti] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [segment, setSegment] = useState<Segment>('tutti');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [formData, setFormData] = useState<CreateClienteInput>({
    nome: '', cognome: '', data_nascita: '', cellulare: '', email: '',
    indirizzo: '', note: '', consenso_marketing: false, consenso_sms: false,
    consenso_whatsapp: false, consenso_email: false,
  });
  // Detail panel
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('panoramica');
  const [profile, setProfile] = useState<ClienteCompleteProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Overflow menu
  const [overflowClienteId, setOverflowClienteId] = useState<string | null>(null);

  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // Load all clients
  useEffect(() => {
    loadClienti();
    const selectedClienteId = sessionStorage.getItem('selectedClienteId');
    if (selectedClienteId) { selectClienteById(selectedClienteId); sessionStorage.removeItem('selectedClienteId'); }
    const handleNavigateToCliente = (event: Event) => { selectClienteById((event as CustomEvent).detail.clienteId); };
    window.addEventListener('navigateToCliente', handleNavigateToCliente);
    return () => window.removeEventListener('navigateToCliente', handleNavigateToCliente);
  }, []);

  useEffect(() => { if (openClienteId) { selectClienteById(openClienteId).then(() => onClienteOpened?.()); } }, [openClienteId]);

  // Load profile when selecting a client
  useEffect(() => {
    if (selectedCliente) {
      setProfileLoading(true);
      analyticsService.getClienteCompleteProfile(selectedCliente.id, 20)
        .then(setProfile)
        .catch(() => setProfile(null))
        .finally(() => setProfileLoading(false));
    } else {
      setProfile(null);
    }
  }, [selectedCliente?.id]);

  // Close overflow on click outside
  useEffect(() => {
    if (overflowClienteId) {
      const close = () => setOverflowClienteId(null);
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
  }, [overflowClienteId]);

  const selectClienteById = async (id: string) => {
    try {
      const cliente = await clientiService.getCliente(id);
      setSelectedCliente(cliente);
      setDetailTab('panoramica');
      setIsEditing(false);
    } catch { showToast('Cliente non trovato', 'error'); }
  };

  const loadClienti = async () => {
    setLoading(true);
    try { setAllClienti(await clientiService.getClienti(undefined, 500, 0, true)); }
    catch { showToast('Errore caricamento clienti', 'error'); }
    finally { setLoading(false); }
  };

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // No need to reload - filtering is client-side
  }, []);

  // Client-side filtering
  const filteredClienti = useMemo(() => {
    let list = allClienti;

    // Segment filter
    switch (segment) {
      case 'attivi': list = list.filter(c => c.attivo); break;
      case 'inattivi': list = list.filter(c => !c.attivo); break;
      case 'nuovi': list = list.filter(c => c.attivo && isNewClient(c.created_at)); break;
      case 'compleanno': list = list.filter(c => c.attivo && isBirthdayWithin(c.data_nascita, 14)); break;
      default: list = list.filter(c => c.attivo); break; // "tutti" shows active
    }

    // Search filter
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.nome.toLowerCase().includes(s) ||
        c.cognome.toLowerCase().includes(s) ||
        (c.cellulare && c.cellulare.includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s))
      );
    }

    // Sort: cognome asc
    return list.sort((a, b) => a.cognome.localeCompare(b.cognome));
  }, [allClienti, segment, searchTerm]);

  // Stats
  const stats = useMemo(() => ({
    totale: allClienti.filter(c => c.attivo).length,
    nuovi: allClienti.filter(c => c.attivo && isNewClient(c.created_at)).length,
    compleanni: allClienti.filter(c => c.attivo && isBirthdayWithin(c.data_nascita, 14)).length,
    inattivi: allClienti.filter(c => !c.attivo).length,
  }), [allClienti]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.cognome.trim()) { showToast('Nome e cognome sono obbligatori', 'error'); return; }
    setLoading(true);
    try {
      if (editingCliente) {
        const updated = await clientiService.updateCliente(editingCliente.id, {
          nome: formData.nome, cognome: formData.cognome, data_nascita: formData.data_nascita || undefined,
          cellulare: formData.cellulare || undefined, email: formData.email || undefined,
          indirizzo: formData.indirizzo || undefined, note: formData.note || undefined,
          consenso_marketing: formData.consenso_marketing, consenso_whatsapp: formData.consenso_whatsapp, consenso_email: formData.consenso_email,
          consenso_sms: formData.consenso_sms,
        });
        showToast('Cliente modificato con successo!', 'success');
        setSelectedCliente(updated);
        setIsEditing(false);
      } else {
        await clientiService.createCliente({ ...formData, consenso_sms: false });
        showToast('Cliente creato con successo!', 'success');
        setIsModalOpen(false);
      }
      setEditingCliente(null); resetForm(); loadClienti();
    } catch { showToast('Errore durante il salvataggio del cliente', 'error'); }
    finally { setLoading(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!await showConfirm({ title: 'Disattiva Cliente', message: 'Sei sicuro di voler disattivare questo cliente?', confirmText: 'Disattiva', cancelText: 'Annulla', variant: 'warning' })) return;
    setLoading(true);
    try { await clientiService.deactivateCliente(id); showToast('Cliente disattivato!', 'success'); if (selectedCliente?.id === id) setSelectedCliente(null); loadClienti(); }
    catch { showToast('Errore durante la disattivazione', 'error'); } finally { setLoading(false); }
  };

  const handleReactivate = async (id: string) => {
    if (!await showConfirm({ title: 'Riattiva Cliente', message: 'Sei sicuro di voler riattivare questo cliente?', confirmText: 'Riattiva', cancelText: 'Annulla', variant: 'info' })) return;
    setLoading(true);
    try { await clientiService.reactivateCliente(id); showToast('Cliente riattivato!', 'success'); loadClienti(); }
    catch { showToast('Errore durante la riattivazione', 'error'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm({ title: 'Elimina Cliente', message: 'Eliminare definitivamente questo cliente? Azione irreversibile.', confirmText: 'Elimina', cancelText: 'Annulla', variant: 'danger' })) return;
    setLoading(true);
    try { await clientiService.deleteCliente(id); showToast('Cliente eliminato!', 'success'); if (selectedCliente?.id === id) setSelectedCliente(null); loadClienti(); }
    catch { showToast('Errore durante l\'eliminazione', 'error'); } finally { setLoading(false); }
  };

  const startEditInPanel = () => {
    if (!selectedCliente) return;
    setEditingCliente(selectedCliente);
    setFormData({
      nome: selectedCliente.nome, cognome: selectedCliente.cognome, data_nascita: selectedCliente.data_nascita || '',
      cellulare: selectedCliente.cellulare || '', email: selectedCliente.email || '', indirizzo: selectedCliente.indirizzo || '',
      note: selectedCliente.note || '', consenso_marketing: Boolean(selectedCliente.consenso_marketing),
      consenso_sms: Boolean(selectedCliente.consenso_sms), consenso_whatsapp: Boolean(selectedCliente.consenso_whatsapp),
      consenso_email: Boolean(selectedCliente.consenso_email),
    });
    setIsEditing(true);
    setDetailTab('anagrafica');
  };

  const openCreateModal = () => {
    setEditingCliente(null);
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => setFormData({ nome: '', cognome: '', data_nascita: '', cellulare: '', email: '', indirizzo: '', note: '', consenso_marketing: false, consenso_sms: false, consenso_whatsapp: false, consenso_email: false });

  // Segment definitions
  const segments: { key: Segment; label: string; count: number; icon?: React.ReactNode }[] = [
    { key: 'tutti', label: 'Attivi', count: stats.totale },
    { key: 'nuovi', label: 'Nuovi', count: stats.nuovi, icon: <Sparkles size={12} /> },
    { key: 'compleanno', label: 'Compleanni', count: stats.compleanni, icon: <Cake size={12} /> },
    { key: 'inattivi', label: 'Inattivi', count: stats.inattivi },
  ];

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex h-full" style={{ height: 'calc(100vh - 80px)' }}>
        {/* ═══════════════ LEFT: CLIENT LIST ═══════════════ */}
        <div className={`flex flex-col min-w-0 master-panel ${selectedCliente ? 'w-[420px] shrink-0' : 'flex-1'}`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              {onGoBack && (
                <button onClick={onGoBack} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0" style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }} title="Torna all'appuntamento">
                  <ArrowLeft size={14} /><span>Appuntamento</span>
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>Clienti</h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{stats.totale} attivi</p>
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
                placeholder="Cerca cliente..."
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
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

          {/* Segments */}
          <div className="filter-chips">
            {segments.map(seg => (
              <button
                key={seg.key}
                onClick={() => setSegment(seg.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: segment === seg.key ? 'var(--color-primary)' : 'var(--glass-border)',
                  color: segment === seg.key ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                {seg.icon}
                {seg.label}
                <span className="ml-0.5 opacity-70">{seg.count}</span>
              </button>
            ))}
          </div>

          {/* Client List */}
          <div className="flex-1 overflow-y-auto px-3">
            {loading && allClienti.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex gap-3 items-center p-3 rounded-xl">
                    <div className="w-11 h-11 rounded-full shimmer shrink-0" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-32 rounded shimmer" /><div className="h-3 w-20 rounded shimmer" /></div>
                  </div>
                ))}
              </div>
            ) : filteredClienti.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                  <Users size={24} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Nessun cliente trovato</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {searchTerm ? 'Prova con altri termini di ricerca' : 'Inizia aggiungendo il primo cliente'}
                </p>
              </div>
            ) : (
              <div className={selectedCliente ? 'space-y-1 pb-4' : 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2 pb-4'}>
                {filteredClienti.map(cliente => {
                  const ac = getAvatarColor(cliente.cognome + cliente.nome);
                  const isSelected = selectedCliente?.id === cliente.id;
                  const bdDays = daysUntilBirthday(cliente.data_nascita);
                  const isNewC = isNewClient(cliente.created_at);

                  return (
                    <button
                      key={cliente.id}
                      onClick={() => { setSelectedCliente(cliente); setDetailTab('panoramica'); setIsEditing(false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left group list-card ${isSelected ? 'list-card-selected' : ''}`}
                      style={{ opacity: cliente.attivo ? 1 : 0.5 }}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: ac.bg, color: ac.text }}>
                          {cliente.nome.charAt(0)}{cliente.cognome.charAt(0)}
                        </div>
                        {/* Birthday indicator */}
                        {bdDays !== null && bdDays <= 7 && bdDays >= 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#fbbf24', border: '2px solid var(--card-bg, white)' }}>
                            <Cake size={10} style={{ color: '#92400e' }} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {cliente.cognome} {cliente.nome}
                          </p>
                          {isNewC && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                              Nuovo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cliente.cellulare ? (
                            <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{cliente.cellulare}</span>
                          ) : cliente.email ? (
                            <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{cliente.email}</span>
                          ) : (
                            <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Nessun contatto</span>
                          )}
                        </div>
                      </div>

                      {/* Quick indicators */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {cliente.consenso_whatsapp && (
                          <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(37, 211, 102, 0.12)' }}>
                            <MessageCircle size={11} style={{ color: '#25D366' }} />
                          </span>
                        )}
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {/* Footer count */}
            {filteredClienti.length > 0 && (
              <div className="px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {filteredClienti.length} client{filteredClienti.length === 1 ? 'e' : 'i'}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ RIGHT: DETAIL PANEL ═══════════════ */}
        {selectedCliente && (
          <div className="flex-1 min-w-[400px] border-l overflow-y-auto" style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)' }}>
            <ClientDetailPanel
              cliente={selectedCliente}
              profile={profile}
              profileLoading={profileLoading}
              tab={detailTab}
              onTabChange={setDetailTab}
              isEditing={isEditing}
              formData={formData}
              setFormData={setFormData}
              onStartEdit={startEditInPanel}
              onSave={handleCreateOrUpdate}
              onCancelEdit={() => { setIsEditing(false); setEditingCliente(null); resetForm(); }}
              onClose={() => { setSelectedCliente(null); setIsEditing(false); }}
              onDeactivate={() => handleDeactivate(selectedCliente.id)}
              onReactivate={() => handleReactivate(selectedCliente.id)}
              onDelete={() => handleDelete(selectedCliente.id)}
              onClienteUpdated={(updated) => { setSelectedCliente(updated); loadClienti(); }}
              showToast={showToast}
              loading={loading}
            />
          </div>
        )}

      </div>

      {/* CREATE MODAL (only for new clients) */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title="Nuovo Cliente" size="lg">
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2"><Users size={14} style={{ color: 'var(--color-text-muted)' }} /><span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Anagrafica</span></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Nome *" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
              <Input label="Cognome *" value={formData.cognome} onChange={e => setFormData({ ...formData, cognome: e.target.value })} required />
              <Input label="Data di Nascita" type="date" value={formData.data_nascita || ''} onChange={e => setFormData({ ...formData, data_nascita: e.target.value })} />
            </div>
          </div>
          <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2"><Phone size={14} style={{ color: 'var(--color-text-muted)' }} /><span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Contatti</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Cellulare" type="tel" value={formData.cellulare} onChange={e => setFormData({ ...formData, cellulare: e.target.value })} />
              <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <Input label="Indirizzo" value={formData.indirizzo || ''} onChange={e => setFormData({ ...formData, indirizzo: e.target.value })} placeholder="Via, numero civico, citta'..." />
          </div>
          <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <Textarea label="Note" value={formData.note || ''} onChange={e => setFormData({ ...formData, note: e.target.value })} rows={2} placeholder="Note aggiuntive..." />
          </div>
          <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2"><Shield size={14} style={{ color: 'var(--color-text-muted)' }} /><span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Consensi</span></div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'consenso_whatsapp' as const, label: 'WhatsApp' },
                { key: 'consenso_email' as const, label: 'Email' },
              ]).map(c => (
                <label key={c.key} className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors" style={{ background: formData[c.key] ? 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.08)' : 'transparent', border: '1px solid var(--glass-border)' }}>
                  <input type="checkbox" checked={formData[c.key]} onChange={e => setFormData({ ...formData, [c.key]: e.target.checked })} className="rounded" />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>Annulla</Button>
            <Button type="submit" variant="primary" loading={loading}>Crea Cliente</Button>
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
  cliente: Cliente;
  profile: ClienteCompleteProfile | null;
  profileLoading: boolean;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  isEditing: boolean;
  formData: CreateClienteInput;
  setFormData: (data: CreateClienteInput) => void;
  onStartEdit: () => void;
  onSave: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  onClienteUpdated: (updated: Cliente) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  loading: boolean;
}

const ClientDetailPanel: React.FC<DetailPanelProps> = ({
  cliente, profile, profileLoading, tab, onTabChange,
  isEditing, formData, setFormData, onStartEdit, onSave, onCancelEdit,
  onClose, onDeactivate, onReactivate, onDelete, onClienteUpdated, showToast, loading,
}) => {
  const ac = getAvatarColor(cliente.cognome + cliente.nome);
  const age = getClienteAge(cliente.data_nascita);
  const bdDays = daysUntilBirthday(cliente.data_nascita);
  const [showActions, setShowActions] = useState(false);

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'panoramica', label: 'Panoramica' },
    { key: 'anagrafica', label: 'Anagrafica' },
    { key: 'estetica', label: 'Scheda Estetica' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header - Avatar & Name */}
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
                    {cliente.attivo ? (
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
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: ac.bg, color: ac.text }}>
              {cliente.nome.charAt(0)}{cliente.cognome.charAt(0)}
            </div>
            {!cliente.attivo && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#9ca3af', border: '2px solid var(--card-bg, white)' }}>
                <UserX size={10} style={{ color: 'white' }} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {cliente.nome} {cliente.cognome}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {age !== null && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{age} anni</span>
              )}
              {bdDays !== null && bdDays <= 14 && bdDays >= 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#d97706' }}>
                  <Cake size={10} />
                  {bdDays === 0 ? 'Oggi!' : `tra ${bdDays} gg`}
                </span>
              )}
              {isNewClient(cliente.created_at) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <Sparkles size={10} />Nuovo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center gap-2 mt-4">
          {cliente.cellulare && (
            <a href={`tel:${cliente.cellulare}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 12%, transparent)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
              <Phone size={13} />Chiama
            </a>
          )}
          {cliente.cellulare && cliente.consenso_whatsapp && (
            <a href={`https://wa.me/${cliente.cellulare.replace(/\D/g, '').replace(/^0/, '39')}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25D366' }}>
              <MessageCircle size={13} />WhatsApp
            </a>
          )}
          {cliente.email && cliente.consenso_email && (
            <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Mail size={13} />Email
            </a>
          )}
        </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { onTabChange(t.key); if (t.key !== 'anagrafica') onCancelEdit(); }}
            className="px-4 py-2.5 text-xs font-medium transition-colors relative"
            style={{ color: tab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
            {t.label}
            {tab === t.key && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: 'var(--color-primary)' }} />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl">
          {tab === 'panoramica' && <PanoramicaTab profile={profile} loading={profileLoading} />}
          {tab === 'anagrafica' && (
            <AnagraficaTab
              cliente={cliente}
              isEditing={isEditing}
              formData={formData}
              setFormData={setFormData}
              onStartEdit={onStartEdit}
              onSave={onSave}
              onCancel={onCancelEdit}
              loading={loading}
            />
          )}
          {tab === 'estetica' && <SchedaEsteticaTab cliente={cliente} onClienteUpdated={onClienteUpdated} showToast={showToast} />}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// TAB: PANORAMICA
// ═══════════════════════════════════════════════════

const PanoramicaTab: React.FC<{ profile: ClienteCompleteProfile | null; loading: boolean }> = ({ profile, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>Impossibile caricare i dati</div>;
  }

  const { statistiche: s } = profile;

  return (
    <div className="space-y-3">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: <Calendar size={14} />, label: 'Visite', value: s.totale_appuntamenti, color: '#6366f1' },
          { icon: <Euro size={14} />, label: 'Speso totale', value: `€${s.spesa_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: '#10b981' },
          { icon: <Award size={14} />, label: 'Ticket medio', value: `€${s.spesa_media.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: '#f59e0b' },
          {
            icon: <Clock size={14} />,
            label: 'Ultima visita',
            value: s.giorni_da_ultimo_appuntamento !== null
              ? s.giorni_da_ultimo_appuntamento === 0 ? 'Oggi' : `${s.giorni_da_ultimo_appuntamento} gg fa`
              : 'Mai',
            color: s.giorni_da_ultimo_appuntamento !== null && s.giorni_da_ultimo_appuntamento > 60 ? '#ef4444' : '#8b5cf6',
          },
        ].map((kpi, i) => (
          <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--glass-border)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* No-show / Cancellations warning */}
      {(s.appuntamenti_no_show > 0 || s.appuntamenti_annullati > 0) && (
        <div className="flex items-center gap-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
          <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
          <div style={{ color: '#d97706' }}>
            {s.appuntamenti_no_show > 0 && <span>{s.appuntamenti_no_show} no-show</span>}
            {s.appuntamenti_no_show > 0 && s.appuntamenti_annullati > 0 && <span> · </span>}
            {s.appuntamenti_annullati > 0 && <span>{s.appuntamenti_annullati} annullat{s.appuntamenti_annullati === 1 ? 'o' : 'i'}</span>}
          </div>
        </div>
      )}

      {/* Trattamenti Preferiti */}
      {profile.trattamenti_frequenti.length > 0 && (
        <div>
          <h4 className="text-[10px] font-medium uppercase tracking-wider mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
            Trattamenti Preferiti
          </h4>
          <div className="space-y-1.5">
            {profile.trattamenti_frequenti.slice(0, 4).map((t, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--glass-border)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Scissors size={13} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{t.trattamento_nome}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>
                    {t.count}x
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    €{t.spesa_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultimi Appuntamenti */}
      <div>
        <h4 className="text-[10px] font-medium uppercase tracking-wider mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
          Ultimi Appuntamenti
        </h4>
        {profile.appuntamenti.length === 0 ? (
          <div className="text-center py-6 rounded-lg text-xs" style={{ background: 'var(--glass-border)', color: 'var(--color-text-muted)' }}>
            Nessun appuntamento registrato
          </div>
        ) : (
          <div className="space-y-1">
            {profile.appuntamenti.map((app: any, i: number) => (
              <div key={app.id || i} className="flex items-center gap-3 p-2.5 rounded-lg transition-colors"
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                {/* Date badge */}
                <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: 'var(--glass-border)' }}>
                  <span className="text-xs font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
                    {format(parseISO(app.data_ora_inizio), 'd')}
                  </span>
                  <span className="text-[9px] uppercase mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {format(parseISO(app.data_ora_inizio), 'MMM', { locale: it })}
                  </span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{app.trattamento_nome}</p>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    {format(parseISO(app.data_ora_inizio), 'HH:mm')}{app.operatrice_nome ? ` · ${app.operatrice_nome}` : ''}
                  </p>
                </div>
                {/* Price + Status */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    €{(app.prezzo_applicato || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{
                    background: app.stato === 'completato' ? 'rgba(16, 185, 129, 0.12)' : app.stato === 'annullato' ? 'rgba(239, 68, 68, 0.12)' : 'var(--glass-border)',
                    color: app.stato === 'completato' ? '#10b981' : app.stato === 'annullato' ? '#ef4444' : 'var(--color-text-muted)',
                  }}>
                    {app.stato === 'completato' ? 'Completato' : app.stato === 'annullato' ? 'Annullato' : app.stato === 'no_show' ? 'No-show' : app.stato}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// TAB: ANAGRAFICA (view + inline edit)
// ═══════════════════════════════════════════════════

const AnagraficaTab: React.FC<{
  cliente: Cliente;
  isEditing: boolean;
  formData: CreateClienteInput;
  setFormData: (d: CreateClienteInput) => void;
  onStartEdit: () => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ cliente, isEditing, formData, setFormData, onStartEdit: _onStartEdit, onSave, onCancel, loading }) => {

  if (!isEditing) {
    // View mode
    const fields = [
      { label: 'Nome', value: cliente.nome },
      { label: 'Cognome', value: cliente.cognome },
      { label: 'Data di Nascita', value: cliente.data_nascita ? new Date(cliente.data_nascita).toLocaleDateString('it-IT') : null },
      { label: 'Cellulare', value: cliente.cellulare },
      { label: 'Email', value: cliente.email },
      { label: 'Indirizzo', value: cliente.indirizzo },
      { label: 'Note', value: cliente.note },
    ];

    return (
      <div className="space-y-3">
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

        {/* Consensi */}
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Consensi</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {[
              { label: 'WhatsApp', active: cliente.consenso_whatsapp },
              { label: 'Email', active: cliente.consenso_email },
            ].map(c => (
              <span key={c.label} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium" style={{
                background: c.active ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-border)',
                color: c.active ? '#10b981' : 'var(--color-text-muted)',
              }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.active ? '#10b981' : 'var(--color-text-muted)', opacity: c.active ? 1 : 0.4 }} />
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* Meta */}
        <div className="pt-3 space-y-1" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Creato il {new Date(cliente.created_at).toLocaleDateString('it-IT')}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Ultimo aggiornamento {new Date(cliente.updated_at).toLocaleDateString('it-IT')}
          </p>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome *" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
        <Input label="Cognome *" value={formData.cognome} onChange={e => setFormData({ ...formData, cognome: e.target.value })} required />
      </div>
      <Input label="Data di Nascita" type="date" value={formData.data_nascita || ''} onChange={e => setFormData({ ...formData, data_nascita: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Cellulare" type="tel" value={formData.cellulare} onChange={e => setFormData({ ...formData, cellulare: e.target.value })} />
        <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
      </div>
      <Input label="Indirizzo" value={formData.indirizzo || ''} onChange={e => setFormData({ ...formData, indirizzo: e.target.value })} />
      <Textarea label="Note" value={formData.note || ''} onChange={e => setFormData({ ...formData, note: e.target.value })} rows={2} />

      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Consensi</label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {([
            { key: 'consenso_whatsapp' as const, label: 'WhatsApp' },
            { key: 'consenso_email' as const, label: 'Email' },
          ]).map(c => (
            <label key={c.key} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm" style={{ background: formData[c.key] ? 'rgba(16, 185, 129, 0.08)' : 'transparent', border: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" checked={formData[c.key]} onChange={e => setFormData({ ...formData, [c.key]: e.target.checked })} className="rounded" />
              {c.label}
            </label>
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

// ═══════════════════════════════════════════════════
// TAB: SCHEDA ESTETICA
// ═══════════════════════════════════════════════════

interface EsteticaFormData {
  tipo_pelle: string;
  allergie: string;
  patologie: string;
  note_estetiche: string;
  fonte_acquisizione: string;
}

const SchedaEsteticaTab: React.FC<{
  cliente: Cliente;
  onClienteUpdated: (updated: Cliente) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ cliente, onClienteUpdated, showToast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EsteticaFormData>({
    tipo_pelle: '', allergie: '', patologie: '', note_estetiche: '', fonte_acquisizione: '',
  });

  const startEdit = () => {
    setForm({
      tipo_pelle: cliente.tipo_pelle || '',
      allergie: cliente.allergie || '',
      patologie: cliente.patologie || '',
      note_estetiche: cliente.note_estetiche || '',
      fonte_acquisizione: cliente.fonte_acquisizione || '',
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await clientiService.updateCliente(cliente.id, {
        tipo_pelle: form.tipo_pelle || undefined,
        allergie: form.allergie || undefined,
        patologie: form.patologie || undefined,
        note_estetiche: form.note_estetiche || undefined,
        fonte_acquisizione: form.fonte_acquisizione || undefined,
      });
      onClienteUpdated(updated);
      setIsEditing(false);
      showToast('Scheda estetica aggiornata!', 'success');
    } catch {
      showToast('Errore durante il salvataggio', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tipoPelleOptions = [
    { value: '', label: '— Seleziona —' },
    { value: 'Normale', label: 'Normale' },
    { value: 'Secca', label: 'Secca' },
    { value: 'Grassa', label: 'Grassa' },
    { value: 'Mista', label: 'Mista' },
    { value: 'Sensibile', label: 'Sensibile' },
    { value: 'Disidratata', label: 'Disidratata' },
    { value: 'Matura', label: 'Matura' },
  ];

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Tipo di Pelle</label>
          <select
            value={form.tipo_pelle}
            onChange={e => setForm({ ...form, tipo_pelle: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg text-sm appearance-none"
            style={{ background: 'var(--glass-border)', color: 'var(--color-text-primary)', border: '1px solid var(--glass-border)', outline: 'none' }}
          >
            {tipoPelleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Allergie</label>
          <Textarea value={form.allergie} onChange={e => setForm({ ...form, allergie: e.target.value })} rows={2} placeholder="Es: nichel, profumi..." />
        </div>

        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Patologie</label>
          <Textarea value={form.patologie} onChange={e => setForm({ ...form, patologie: e.target.value })} rows={2} placeholder="Es: dermatite, psoriasi..." />
        </div>

        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Note Estetiche</label>
          <Textarea value={form.note_estetiche} onChange={e => setForm({ ...form, note_estetiche: e.target.value })} rows={3} placeholder="Annotazioni estetiche generali..." />
        </div>

        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Fonte Acquisizione</label>
          <Input value={form.fonte_acquisizione} onChange={e => setForm({ ...form, fonte_acquisizione: e.target.value })} placeholder="Es: passaparola, Instagram..." />
        </div>

        <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} size="sm">Annulla</Button>
          <Button type="submit" variant="primary" loading={saving} size="sm">Salva Modifiche</Button>
        </div>
      </form>
    );
  }

  // View mode
  const fields = [
    { label: 'Tipo di Pelle', value: cliente.tipo_pelle, icon: <Heart size={14} /> },
    { label: 'Allergie', value: cliente.allergie, icon: <AlertTriangle size={14} /> },
    { label: 'Patologie', value: cliente.patologie, icon: <Shield size={14} /> },
    { label: 'Note Estetiche', value: cliente.note_estetiche, icon: <Star size={14} /> },
    { label: 'Fonte Acquisizione', value: cliente.fonte_acquisizione, icon: <Users size={14} /> },
  ];

  const hasData = fields.some(f => f.value);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={startEdit} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
          <Edit2 size={13} className="inline mr-1" />{hasData ? 'Modifica' : 'Compila'}
        </button>
      </div>
      {!hasData ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(236, 72, 153, 0.08)' }}>
            <Heart size={24} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Scheda estetica vuota</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            Clicca "Compila" per aggiungere le informazioni estetiche
          </p>
        </div>
      ) : (
        fields.map((f, i) => f.value ? (
          <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--glass-border)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span style={{ color: 'var(--color-text-muted)' }}>{f.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{f.label}</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{f.value}</p>
          </div>
        ) : null)
      )}
    </div>
  );
};
