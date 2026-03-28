import { useState, useEffect } from 'react';
import { Toast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import {
  MessageCircle,
  Mail,
  Cake,
  Send,
  Edit2,
  Trash2,
  Save,
  Plus,
  Gift,
  Calendar,
  Eye,
  Copy,
  Check,
  Sparkles,
  Megaphone,
  FileText,
} from 'lucide-react';
import { CampagneTab } from '../components/comunicazioni/CampagneTab';
import * as comunicazioniService from '../services/comunicazioni';
import type {
  TemplateMesaggio,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../types/comunicazione';
import type { Cliente } from '../types/cliente';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

type TabKey = 'campagne' | 'templates' | 'compleanni';

const TIPI_SEMPLICI = [
  { value: 'reminder_appuntamento', label: 'Promemoria', icon: Calendar, desc: 'Prima di un appuntamento' },
  { value: 'auguri_compleanno', label: 'Compleanno', icon: Gift, desc: 'Auguri automatici' },
  { value: 'promozione', label: 'Promozione', icon: Sparkles, desc: 'Offerte e promo' },
  { value: 'manuale', label: 'Libero', icon: MessageCircle, desc: 'Qualsiasi messaggio' },
] as const;

const PLACEHOLDERS = [
  { tag: '{nome}', label: 'Nome', example: 'Maria' },
  { tag: '{cognome}', label: 'Cognome', example: 'Rossi' },
  { tag: '{data_appuntamento}', label: 'Data App.', example: '20/03/2026' },
  { tag: '{ora_appuntamento}', label: 'Ora App.', example: '15:30' },
  { tag: '{trattamento}', label: 'Trattamento', example: 'Manicure' },
  { tag: '{nome_centro}', label: 'Centro', example: 'Beauty Center' },
];

export function Comunicazioni() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('campagne');
  const [templateSubTab, setTemplateSubTab] = useState<'whatsapp' | 'email'>('whatsapp');

  const [birthdaysToday, setBirthdaysToday] = useState<Cliente[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Cliente[]>([]);

  const [templates, setTemplates] = useState<TemplateMesaggio[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateMesaggio | null>(null);
  const [templateForm, setTemplateForm] = useState({
    nome: '',
    tipo: 'reminder_appuntamento' as string,
    canale: 'whatsapp' as 'whatsapp' | 'email',
    oggetto: '',
    corpo: '',
  });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  const [templateStep, setTemplateStep] = useState<1 | 2>(1);
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, birthdaysTodayData, upcomingData] = await Promise.all([
        comunicazioniService.getTemplates(),
        comunicazioniService.getBirthdaysToday(),
        comunicazioniService.getUpcomingBirthdays(7),
      ]);
      setTemplates(templatesData);
      setBirthdaysToday(birthdaysTodayData);
      setUpcomingBirthdays(upcomingData);
    } catch (error) {
      console.error('Errore caricamento:', error);
      showToast('Errore nel caricamento dei dati', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openTemplateModal = (template?: TemplateMesaggio) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        nome: template.nome,
        tipo: template.tipo,
        canale: template.canale,
        oggetto: template.oggetto || '',
        corpo: template.corpo,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm(prev => ({
        ...prev,
        nome: '',
        tipo: 'reminder_appuntamento',
        oggetto: '',
        corpo: '',
      }));
    }
    setShowPreview(false);
    setTemplateStep(template ? 2 : 1);
    setIsTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
    setShowPreview(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.nome.trim()) {
      showToast('Inserisci un nome per il template', 'error');
      return;
    }
    if (!templateForm.corpo.trim()) {
      showToast('Inserisci il testo del messaggio', 'error');
      return;
    }

    setTemplateSaving(true);
    try {
      if (editingTemplate) {
        const updateInput: UpdateTemplateInput = {
          nome: templateForm.nome,
          oggetto: templateForm.canale === 'email' ? templateForm.oggetto || undefined : undefined,
          corpo: templateForm.corpo,
        };
        await comunicazioniService.updateTemplate(editingTemplate.id, updateInput);
        showToast('Template salvato!', 'success');
      } else {
        const codice = `${templateForm.tipo}_${templateForm.canale}_${Date.now()}`;
        const createInput: CreateTemplateInput = {
          codice,
          nome: templateForm.nome,
          tipo: templateForm.tipo,
          canale: templateForm.canale,
          oggetto: templateForm.canale === 'email' ? templateForm.oggetto || undefined : undefined,
          corpo: templateForm.corpo,
        };
        await comunicazioniService.createTemplate(createInput);
        showToast('Template creato!', 'success');
      }
      closeTemplateModal();
      loadData();
    } catch (error: any) {
      console.error('Errore salvataggio template:', error);
      const msg = typeof error === 'string' ? error : error?.message || 'Errore durante il salvataggio';
      showToast(msg, 'error');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await comunicazioniService.deleteTemplate(id);
      showToast('Template eliminato', 'success');
      setConfirmDeleteTemplateId(null);
      loadData();
    } catch (error: any) {
      showToast(error?.message || 'Errore durante l\'eliminazione', 'error');
    }
  };

  const insertPlaceholder = (tag: string) => {
    setTemplateForm(prev => ({
      ...prev,
      corpo: prev.corpo + tag,
    }));
    setCopiedPlaceholder(tag);
    setTimeout(() => setCopiedPlaceholder(null), 1000);
  };

  const getPreviewText = (text: string) => {
    let preview = text;
    PLACEHOLDERS.forEach(p => {
      preview = preview.split(p.tag).join(p.example);
    });
    return preview;
  };

  const sendBirthdayWish = async (cliente: Cliente) => {
    const channels = comunicazioniService.getAvailableChannels(cliente);
    if (channels.length === 0) {
      showToast('Il cliente non ha WhatsApp o email disponibile', 'error');
      return;
    }
    const canale = channels.includes('whatsapp') ? 'whatsapp' : channels[0];
    const destinatario = canale === 'whatsapp'
      ? (cliente.cellulare || cliente.telefono || '')
      : (cliente.email || '');

    try {
      await comunicazioniService.sendMessage(
        canale,
        destinatario,
        `Tantissimi auguri di buon compleanno ${cliente.nome}!`,
        canale === 'email' ? `Auguri ${cliente.nome}!` : undefined
      );
      showToast(`Messaggio aperto per ${cliente.nome}!`, 'success');
    } catch (error) {
      showToast('Errore nell\'apertura del messaggio', 'error');
    }
  };

  const getTipoInfo = (tipo: string) => {
    return TIPI_SEMPLICI.find(t => t.value === tipo);
  };

  const [selectedTipo, setSelectedTipo] = useState<string>('');

  const whatsappTemplates = templates.filter(t => t.canale === 'whatsapp');
  const emailTemplates = templates.filter(t => t.canale === 'email');

  if (loading && templates.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div
          className="animate-spin rounded-full h-8 w-8 border-2"
          style={{ borderColor: 'var(--glass-border)', borderTopColor: 'var(--color-primary)' }}
        />
      </div>
    );
  }

  const renderTemplateCard = (template: TemplateMesaggio) => {
    const tipoInfo = getTipoInfo(template.tipo);
    const TipoIcon = tipoInfo?.icon || MessageCircle;
    const isWhatsApp = template.canale === 'whatsapp';
    const accentColor = isWhatsApp ? '#25D366' : 'var(--color-accent)';

    return (
      <div
        key={template.id}
        className="group rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 2px 8px var(--glass-shadow)',
        }}
      >
        <div className="h-1" style={{ background: accentColor }} />
        <div className="px-4 pt-3 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}
            >
              <TipoIcon size={16} style={{ color: accentColor }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                {template.nome}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {tipoInfo?.label || template.tipo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => openTemplateModal(template)}
              className="p-1.5 rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
              style={{ color: 'var(--color-text-muted)' }}
              title="Modifica"
            >
              <Edit2 size={14} />
            </button>
            {confirmDeleteTemplateId === template.id ? (
              <span className="flex items-center gap-1 text-[10px] font-medium">
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="px-1.5 py-0.5 rounded text-white"
                  style={{ background: 'var(--color-danger)' }}
                >Sì</button>
                <button
                  onClick={() => setConfirmDeleteTemplateId(null)}
                  className="px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}
                >No</button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDeleteTemplateId(template.id)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]"
                style={{ color: 'var(--color-text-muted)' }}
                title="Elimina"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="px-4 pb-4">
          {template.canale === 'email' && template.oggetto && (
            <p
              className="text-xs font-medium mb-1.5 px-3 py-1 rounded-md inline-block"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {template.oggetto}
            </p>
          )}
          <div
            className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
            style={{
              background: isWhatsApp
                ? 'color-mix(in srgb, #25D366 6%, transparent)'
                : 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
              color: 'var(--color-text-secondary)',
              borderLeft: `3px solid color-mix(in srgb, ${accentColor} 40%, transparent)`,
            }}
          >
            <p className="line-clamp-3 text-xs whitespace-pre-wrap">
              {getPreviewText(template.corpo)}
            </p>
          </div>
          {!template.attivo && (
            <div className="mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--color-text-primary) 8%, transparent)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Disattivato
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAddCard = (canale: 'whatsapp' | 'email') => {
    const isWA = canale === 'whatsapp';
    const color = isWA ? '#25D366' : 'var(--color-accent)';
    return (
      <div
        className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer transition-all hover:border-solid group min-h-[140px]"
        style={{ borderColor: `color-mix(in srgb, ${color} 25%, transparent)` }}
        onClick={() => { setTemplateForm(f => ({ ...f, canale })); openTemplateModal(); }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
          style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }}
        >
          <Plus size={20} style={{ color }} />
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Aggiungi testo
        </span>
      </div>
    );
  };

  const renderEmptyState = (canale: 'whatsapp' | 'email') => {
    const isWA = canale === 'whatsapp';
    const color = isWA ? '#25D366' : 'var(--color-accent)';
    return (
      <div
        className="rounded-2xl border-2 border-dashed p-8 text-center transition-colors hover:border-solid cursor-pointer"
        style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
        onClick={() => { setTemplateForm(f => ({ ...f, canale })); openTemplateModal(); }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }}
        >
          {isWA
            ? <MessageCircle size={24} style={{ color }} />
            : <Mail size={24} style={{ color }} />
          }
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Nessun testo {isWA ? 'WhatsApp' : 'Email'}
        </p>
        <p className="text-xs mt-1 mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Clicca per creare il primo
        </p>
        <div
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
        >
          <Plus size={14} />
          Crea testo
        </div>
      </div>
    );
  };

  const baseTemplates = templateSubTab === 'whatsapp' ? whatsappTemplates : emailTemplates;
  const currentTemplates = selectedTipo
    ? baseTemplates.filter(t => t.tipo === selectedTipo)
    : baseTemplates;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Comunicazioni
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Centro Comunicazioni — Campagne, template e compleanni
        </p>
      </div>

      {/* TAB BAR PRINCIPALE */}
      <div
        className="flex gap-1 p-1 rounded-xl animate-fade-in-up"
        style={{ background: 'var(--glass-border)', animationDelay: '50ms' }}
      >
        {([
          { key: 'campagne' as const, label: 'Campagne', Icon: Megaphone, color: 'var(--color-primary)' },
          { key: 'templates' as const, label: 'Templates', Icon: FileText, color: 'var(--color-accent)' },
          { key: 'compleanni' as const, label: 'Compleanni', Icon: Cake, color: 'var(--color-warning)', badge: birthdaysToday.length > 0 ? birthdaysToday.length : undefined },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.key ? 'var(--card-bg)' : 'transparent',
              color: activeTab === tab.key ? tab.color : 'var(--color-text-muted)',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <tab.Icon size={16} />
            {tab.label}
            {tab.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: tab.color }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: CAMPAGNE */}
      {activeTab === 'campagne' && (
        <div className="animate-fade-in-up">
          <CampagneTab templates={templates} showToast={showToast} />
        </div>
      )}

      {/* TAB: COMPLEANNI */}
      {activeTab === 'compleanni' && (
        <div className="animate-fade-in-up space-y-4">
          {birthdaysToday.length === 0 && upcomingBirthdays.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'color-mix(in srgb, var(--color-warning) 4%, transparent)', border: '1px solid var(--glass-border)' }}>
              <Cake size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-warning)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Nessun compleanno nei prossimi giorni</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid color-mix(in srgb, var(--color-warning) 25%, var(--glass-border))' }}>
              <div className="px-5 py-3.5 flex items-center gap-3" style={{ background: 'color-mix(in srgb, var(--color-warning) 8%, transparent)', borderBottom: '1px solid var(--glass-border)' }}>
                <Cake size={18} style={{ color: 'var(--color-warning)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Compleanni</span>
                {birthdaysToday.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-warning)', color: 'white' }}>{birthdaysToday.length} oggi</span>
                )}
              </div>
              <div className="p-4 space-y-3">
                {birthdaysToday.map(cliente => (
                  <div key={cliente.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-warning) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-warning) 15%, transparent)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-warning)', color: 'white' }}>{cliente.nome.charAt(0)}{cliente.cognome.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{cliente.nome} {cliente.cognome}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{[cliente.cellulare && cliente.consenso_whatsapp ? 'WhatsApp' : '', cliente.email && cliente.consenso_email ? 'Email' : ''].filter(Boolean).join(' / ') || 'Nessun canale'}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => sendBirthdayWish(cliente)}><Gift size={14} className="mr-1.5" />Auguri</Button>
                  </div>
                ))}
                {upcomingBirthdays.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-xs font-medium w-full mb-1" style={{ color: 'var(--color-text-muted)' }}>Prossimi 7 giorni</span>
                    {upcomingBirthdays.map(cliente => (
                      <span key={cliente.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)', color: 'var(--color-text-secondary)' }}>
                        {cliente.nome} {cliente.cognome}
                        <span style={{ color: 'var(--color-text-muted)' }}>{cliente.data_nascita ? new Date(cliente.data_nascita).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : ''}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: TEMPLATES */}
      {activeTab === 'templates' && (<div className="space-y-4 animate-fade-in-up">

      {/* Sub-tab WhatsApp / Email */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)' }}>
        <button onClick={() => setTemplateSubTab('whatsapp')} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: templateSubTab === 'whatsapp' ? 'var(--card-bg)' : 'transparent', color: templateSubTab === 'whatsapp' ? '#25D366' : 'var(--color-text-muted)' }}>
          <MessageCircle size={14} /> WhatsApp ({whatsappTemplates.length})
        </button>
        <button onClick={() => setTemplateSubTab('email')} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: templateSubTab === 'email' ? 'var(--card-bg)' : 'transparent', color: templateSubTab === 'email' ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
          <Mail size={14} /> Email ({emailTemplates.length})
        </button>
      </div>

      {/* TYPE FILTER */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <button
          onClick={() => setSelectedTipo('')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: !selectedTipo ? 'var(--color-primary)' : 'var(--glass-border)',
            color: !selectedTipo ? 'white' : 'var(--color-text-secondary)',
          }}
        >
          Tutti ({baseTemplates.length})
        </button>
        {TIPI_SEMPLICI.map(t => {
          const count = baseTemplates.filter(tpl => tpl.tipo === t.value).length;
          const TIcon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setSelectedTipo(selectedTipo === t.value ? '' : t.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: selectedTipo === t.value ? 'var(--color-primary)' : 'var(--glass-border)',
                color: selectedTipo === t.value ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              <TIcon size={12} />
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        {/* Action bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: templateSubTab === 'whatsapp'
                  ? 'color-mix(in srgb, #25D366 15%, transparent)'
                  : 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
              }}
            >
              {templateSubTab === 'whatsapp'
                ? <MessageCircle size={18} style={{ color: '#25D366' }} />
                : <Mail size={18} style={{ color: 'var(--color-accent)' }} />
              }
            </div>
            <div>
              <h2 className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
                Testi {templateSubTab === 'whatsapp' ? 'WhatsApp' : 'Email'}
                {selectedTipo && (
                  <span className="text-xs font-normal ml-2" style={{ color: 'var(--color-text-muted)' }}>
                    — {TIPI_SEMPLICI.find(t => t.value === selectedTipo)?.label}
                  </span>
                )}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {currentTemplates.length} {currentTemplates.length === 1 ? 'testo' : 'testi'}{selectedTipo ? ' filtrati' : ' configurati'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => { setTemplateForm(f => ({ ...f, canale: templateSubTab })); openTemplateModal(); }}
            size="sm"
          >
            <Plus size={16} className="mr-1.5" />
            Nuovo
          </Button>
        </div>

        {/* Templates grid */}
        {currentTemplates.length === 0 ? (
          renderEmptyState(templateSubTab)
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentTemplates.map(renderTemplateCard)}
            {renderAddCard(templateSubTab)}
          </div>
        )}
      </div>

      {/* MODAL STEP 1 - Scegli tipo */}
      <Modal
        isOpen={isTemplateModalOpen && templateStep === 1 && !editingTemplate}
        onClose={closeTemplateModal}
        title="Che tipo di messaggio?"
        size="md"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {TIPI_SEMPLICI.map((t) => {
              const Icon = t.icon;
              const isSelected = templateForm.tipo === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplateForm({ ...templateForm, tipo: t.value })}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all"
                  style={{
                    background: isSelected
                      ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                      : 'color-mix(in srgb, var(--color-text-primary) 3%, transparent)',
                    border: isSelected
                      ? '2px solid var(--color-primary)'
                      : '2px solid var(--glass-border)',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  <Icon size={24} />
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.desc}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <Button variant="secondary" onClick={closeTemplateModal}>Annulla</Button>
            <Button onClick={() => setTemplateStep(2)}>
              Avanti
              <Send size={16} className="ml-1.5" />
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL STEP 2 - Scrivi il testo */}
      <Modal
        isOpen={isTemplateModalOpen && (templateStep === 2 || !!editingTemplate)}
        onClose={closeTemplateModal}
        title={editingTemplate ? 'Modifica Testo' : 'Scrivi il messaggio'}
        size="lg"
      >
        <div className="space-y-5">
          {/* Badge tipo + canale */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
              style={{
                background: templateForm.canale === 'whatsapp'
                  ? 'color-mix(in srgb, #25D366 10%, transparent)'
                  : 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                color: templateForm.canale === 'whatsapp' ? '#25D366' : 'var(--color-accent)',
              }}
            >
              {templateForm.canale === 'whatsapp' ? <MessageCircle size={14} /> : <Mail size={14} />}
              {templateForm.canale === 'whatsapp' ? 'WhatsApp' : 'Email'}
            </span>
            {!editingTemplate && (
              <>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{
                    background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {getTipoInfo(templateForm.tipo)?.label || templateForm.tipo}
                </span>
                <button
                  type="button"
                  onClick={() => setTemplateStep(1)}
                  className="text-xs underline ml-auto"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Cambia tipo
                </button>
              </>
            )}
          </div>

          <Input
            label="Nome (per riconoscerlo)"
            value={templateForm.nome}
            onChange={(e) => setTemplateForm({ ...templateForm, nome: e.target.value })}
            placeholder="es: Promemoria appuntamento"
          />

          {templateForm.canale === 'email' && (
            <Input
              label="Oggetto dell'email"
              value={templateForm.oggetto}
              onChange={(e) => setTemplateForm({ ...templateForm, oggetto: e.target.value })}
              placeholder="es: Promemoria appuntamento"
            />
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Testo del messaggio
            </label>
            <Textarea
              value={templateForm.corpo}
              onChange={(e) => setTemplateForm({ ...templateForm, corpo: e.target.value })}
              rows={5}
              placeholder={templateForm.tipo === 'reminder_appuntamento'
                ? 'Ciao {nome}! Ti ricordiamo il tuo appuntamento di {trattamento} il {data_appuntamento} alle {ora_appuntamento}. Ti aspettiamo!'
                : templateForm.tipo === 'auguri_compleanno'
                ? 'Ciao {nome}! Tanti auguri di buon compleanno da parte di tutto lo staff di {nome_centro}!'
                : 'Scrivi il tuo messaggio qui...'
              }
            />
          </div>

          {/* Campi automatici */}
          <div
            className="rounded-xl p-3.5"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 4%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)',
            }}
          >
            <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--color-primary)' }}>
              Campi automatici (clicca per inserire)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => insertPlaceholder(p.tag)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: copiedPlaceholder === p.tag ? 'var(--color-primary)' : 'var(--card-bg)',
                    color: copiedPlaceholder === p.tag ? 'white' : 'var(--color-text-primary)',
                    border: '1px solid var(--glass-border)',
                  }}
                  title={`Inserisce "${p.example}" al posto di ${p.tag}`}
                >
                  {copiedPlaceholder === p.tag ? <Check size={11} /> : <Copy size={11} />}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Anteprima */}
          <div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              <Eye size={16} />
              {showPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}
            </button>
            {showPreview && templateForm.corpo && (
              <div
                className="mt-3 rounded-xl p-4"
                style={{
                  background: templateForm.canale === 'whatsapp'
                    ? 'color-mix(in srgb, #25D366 6%, transparent)'
                    : 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
                  borderLeft: `3px solid ${templateForm.canale === 'whatsapp' ? '#25D366' : 'var(--color-accent)'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {templateForm.canale === 'whatsapp'
                    ? <MessageCircle size={14} style={{ color: '#25D366' }} />
                    : <Mail size={14} style={{ color: 'var(--color-accent)' }} />
                  }
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Anteprima</span>
                </div>
                {templateForm.canale === 'email' && templateForm.oggetto && (
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {getPreviewText(templateForm.oggetto)}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                  {getPreviewText(templateForm.corpo)}
                </p>
              </div>
            )}
          </div>

          {/* Bottoni */}
          <div className="flex justify-between pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div>
              {!editingTemplate && (
                <Button variant="secondary" onClick={() => setTemplateStep(1)}>Indietro</Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={closeTemplateModal} disabled={templateSaving}>Annulla</Button>
              <Button onClick={handleSaveTemplate} disabled={templateSaving}>
                {templateSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 rounded-full animate-spin mr-2" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-1.5" />
                    {editingTemplate ? 'Salva' : 'Crea'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      </div>)}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
