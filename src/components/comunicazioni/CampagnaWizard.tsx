import { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Mail, ArrowRight, ArrowLeft, FileText, Edit3, Eye, Loader2, AlertTriangle, Send, Save } from 'lucide-react';
import { ClientSelector } from './ClientSelector';
import * as comunicazioniService from '../../services/comunicazioni';
import type { CampagnaMarketing, TemplateMesaggio, CreateCampagnaInput } from '../../types/comunicazione';

interface CampagnaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (campagna: CampagnaMarketing, sendNow: boolean) => void;
  templates: TemplateMesaggio[];
  showToast: (message: string, type: 'success' | 'error') => void;
}

const PLACEHOLDERS = [
  { tag: '{nome}', label: 'Nome' },
  { tag: '{cognome}', label: 'Cognome' },
  { tag: '{nome_centro}', label: 'Centro' },
];

export function CampagnaWizard({ isOpen, onClose, onCreated, templates, showToast }: CampagnaWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Form data
  const [canale, setCanale] = useState<'whatsapp' | 'email'>('whatsapp');
  const [useTemplate, setUseTemplate] = useState(true);
  const [templateId, setTemplateId] = useState('');
  const [nome, setNome] = useState('');
  const [messaggioPersonalizzato, setMessaggioPersonalizzato] = useState('');
  const [oggettoEmail, setOggettoEmail] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const msgTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset completo quando si apre il wizard
  useEffect(() => {
    if (isOpen) {
      setStep(1 as 1 | 2 | 3);
      setSaving(false);
      setCanale('whatsapp');
      setUseTemplate(true);
      setTemplateId('');
      setNome('');
      setMessaggioPersonalizzato('');
      setOggettoEmail('');
      setSelectedClientIds([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTemplates = templates.filter(t => t.canale === canale && t.attivo);
  const selectedTemplate = filteredTemplates.find(t => t.id === templateId);

  const canGoNext = () => {
    switch (step) {
      case 1: return useTemplate ? !!templateId : !!messaggioPersonalizzato.trim();
      case 2: return selectedClientIds.length > 0;
      case 3: return true;
      default: return false;
    }
  };

  const getMessage = (): string => {
    if (useTemplate && selectedTemplate) return selectedTemplate.corpo;
    return messaggioPersonalizzato;
  };

  const getCampaignName = (): string => {
    if (nome.trim()) return nome;
    if (useTemplate && selectedTemplate) return `Campagna ${selectedTemplate.nome}`;
    const today = new Date().toLocaleDateString('it-IT');
    return `Campagna ${canale === 'whatsapp' ? 'WhatsApp' : 'Email'} ${today}`;
  };

  const handleCreate = async (sendNow: boolean) => {
    setSaving(true);
    try {
      const input: CreateCampagnaInput = {
        nome: getCampaignName(),
        canale,
        ...(useTemplate
          ? { template_id: templateId }
          : {
              messaggio_personalizzato: messaggioPersonalizzato,
              ...(canale === 'email' && oggettoEmail ? { oggetto_email: oggettoEmail } : {}),
            }),
      };

      const campagna = await comunicazioniService.createCampagna(input);
      await comunicazioniService.prepareCampagnaDestinatari(campagna.id, selectedClientIds);
      showToast(sendNow ? 'Campagna creata! Avvio invio...' : 'Campagna salvata come bozza', 'success');
      onCreated(campagna, sendNow);
    } catch (e: any) {
      console.error('Errore creazione campagna:', e);
      const msg = typeof e === 'string' ? e : e?.message || 'Errore durante la creazione della campagna';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (tag: string) => {
    const el = msgTextareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = messaggioPersonalizzato;
      const newText = text.substring(0, start) + tag + text.substring(end);
      setMessaggioPersonalizzato(newText);
      // Reimposta cursore dopo il tag inserito
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + tag.length;
        el.focus();
      });
    } else {
      setMessaggioPersonalizzato(prev => prev + tag);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />

      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'var(--sidebar-bg)' }}>
          <div>
            <h2 className="font-bold text-base text-white">Nuova Campagna</h2>
            <p className="text-xs text-white/50">Passo {step} di 3</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1" style={{ background: 'var(--glass-border)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%`, background: 'var(--color-primary)' }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {/* STEP 1: Canale + Messaggio */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Canale selector inline */}
              <div className="flex gap-2">
                <button onClick={() => { setCanale('whatsapp'); setTemplateId(''); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{ background: canale === 'whatsapp' ? 'color-mix(in srgb, #25D366 12%, transparent)' : 'var(--card-bg)', border: `1.5px solid ${canale === 'whatsapp' ? '#25D366' : 'var(--glass-border)'}`, color: canale === 'whatsapp' ? '#25D366' : 'var(--color-text-muted)' }}>
                  <MessageCircle size={15} /> WhatsApp
                </button>
                <button onClick={() => { setCanale('email'); setTemplateId(''); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{ background: canale === 'email' ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'var(--card-bg)', border: `1.5px solid ${canale === 'email' ? 'var(--color-primary)' : 'var(--glass-border)'}`, color: canale === 'email' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  <Mail size={15} /> Email
                </button>
              </div>

              {/* Toggle template/personalizzato */}
              <div
                className="flex p-1 rounded-xl"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}
              >
                <button
                  onClick={() => setUseTemplate(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: useTemplate ? 'var(--card-bg)' : 'transparent',
                    color: useTemplate ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  <FileText size={13} /> Template
                </button>
                <button
                  onClick={() => setUseTemplate(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: !useTemplate ? 'var(--card-bg)' : 'transparent',
                    color: !useTemplate ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  <Edit3 size={13} /> Personalizzato
                </button>
              </div>

              {useTemplate ? (
                <div className="space-y-2">
                  {filteredTemplates.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
                      Nessun template per {canale === 'whatsapp' ? 'WhatsApp' : 'Email'}. Creane uno nella sezione Templates.
                    </p>
                  ) : (
                    filteredTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTemplateId(t.id)}
                        className="w-full p-3 rounded-xl text-left transition-all"
                        style={{
                          background: templateId === t.id ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
                          border: `1px solid ${templateId === t.id ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                        }}
                      >
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{t.nome}</p>
                        <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{t.corpo}</p>
                      </button>
                    ))
                  )}

                  {/* Anteprima template selezionato */}
                  {selectedTemplate && (
                    <div
                      className="rounded-xl p-3 mt-3"
                      style={{ background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)', border: '1px solid var(--glass-border)' }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Eye size={12} style={{ color: 'var(--color-primary)' }} />
                        <span className="text-[10px] font-medium" style={{ color: 'var(--color-primary)' }}>Anteprima</span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {selectedTemplate.corpo}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Nome campagna */}
                  <div>
                    <label className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Nome campagna</label>
                    <input
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="es. Promo Primavera"
                      className="w-full px-3 py-2 rounded-lg text-sm mt-1"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }}
                    />
                  </div>

                  {/* Oggetto email */}
                  {canale === 'email' && (
                    <div>
                      <label className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Oggetto email</label>
                      <input
                        value={oggettoEmail}
                        onChange={e => setOggettoEmail(e.target.value)}
                        placeholder="Oggetto dell'email"
                        className="w-full px-3 py-2 rounded-lg text-sm mt-1"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }}
                      />
                    </div>
                  )}

                  {/* Messaggio */}
                  <div>
                    <label className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Messaggio</label>
                    <textarea
                      ref={msgTextareaRef}
                      value={messaggioPersonalizzato}
                      onChange={e => setMessaggioPersonalizzato(e.target.value)}
                      placeholder="Scrivi il tuo messaggio..."
                      rows={5}
                      className="w-full px-3 py-2 rounded-lg text-sm mt-1 resize-none"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }}
                    />
                  </div>

                  {/* Placeholder */}
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map(p => (
                      <button
                        key={p.tag}
                        onClick={() => insertPlaceholder(p.tag)}
                        className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                        style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}
                      >
                        {p.tag} {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Destinatari */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Seleziona i destinatari</p>
              <ClientSelector
                canale={canale}
                selectedClientIds={selectedClientIds}
                onSelectionChange={setSelectedClientIds}
              />
            </div>
          )}

          {/* STEP 3: Riepilogo */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Riepilogo campagna</p>

              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)', border: '1px solid var(--glass-border)' }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Nome</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{getCampaignName()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Canale</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: canale === 'whatsapp' ? '#25D366' : 'var(--color-primary)' }}
                  >
                    {canale === 'whatsapp' ? 'WhatsApp' : 'Email'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tipo messaggio</span>
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {useTemplate ? selectedTemplate?.nome || 'Template' : 'Personalizzato'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Destinatari</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                    {selectedClientIds.length} clienti
                  </span>
                </div>
              </div>

              {/* Preview messaggio */}
              <div
                className="rounded-xl p-3"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
              >
                <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Anteprima messaggio</p>
                <p className="text-xs whitespace-pre-wrap line-clamp-5" style={{ color: 'var(--color-text-secondary)' }}>
                  {getMessage()}
                </p>
              </div>

              {/* Warning WhatsApp */}
              {canale === 'whatsapp' && (
                <div
                  className="flex items-start gap-2 rounded-xl p-3"
                  style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)' }}
                >
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    Verranno aperti {selectedClientIds.length} link WhatsApp. Dovrai inviare ogni messaggio manualmente.
                    {selectedClientIds.length > 50 && ' Questa operazione potrebbe richiedere diversi minuti.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-between" style={{ borderTop: '1px solid var(--glass-border)' }}>
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as any)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <ArrowLeft size={14} /> Indietro
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as any)}
              disabled={!canGoNext()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}
            >
              Avanti <ArrowRight size={14} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleCreate(false)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                style={{ background: 'var(--glass-border)', color: 'var(--color-text-primary)' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salva bozza
              </button>
              <button
                onClick={() => handleCreate(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Crea e Invia
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
