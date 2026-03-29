import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Check, AlertCircle, Loader2, ExternalLink, Mail, ArrowRight } from 'lucide-react';
import { ClientSelector } from './ClientSelector';
import * as comunicazioniService from '../../services/comunicazioni';
import { clientiService } from '../../services/clienti';
import { aziendaService } from '../../services/azienda';
import type { CampagnaMarketing, CampagnaDestinatario } from '../../types/comunicazione';
import type { Cliente } from '../../types/cliente';

interface CampagnaSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  campagna: CampagnaMarketing;
  onCompleted: () => void;
}

interface SendResult {
  clienteId: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
}

export function CampagnaSendModal({ isOpen, onClose, campagna, onCompleted }: CampagnaSendModalProps) {
  const [destinatari, setDestinatari] = useState<CampagnaDestinatario[]>([]);
  const [clients, setClients] = useState<Map<string, Cliente>>(new Map());
  const [results, setResults] = useState<SendResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'selecting' | 'sending'>('selecting');
  const [status, setStatus] = useState<'loading' | 'ready' | 'sending' | 'paused' | 'completed'>('loading');
  const [autoMode, setAutoMode] = useState(false);
  const autoModeRef = useRef(false);
  const [message, setMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [nomeCentro, setNomeCentro] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [preparingRecipients, setPreparingRecipients] = useState(false);

  // Carica destinatari esistenti e messaggio
  useEffect(() => {
    if (!isOpen) return;

    // Reset
    setPhase('selecting');
    setStatus('loading');
    setCurrentIndex(0);
    aziendaService.getAzienda().then(a => setNomeCentro(a.nome_centro || '')).catch(() => {});
    setAutoMode(false);
    autoModeRef.current = false;
    setResults([]);

    const load = async () => {
      try {
        // Carica destinatari esistenti
        const dests = await comunicazioniService.getCampagnaDestinatari(campagna.id);
        setDestinatari(dests);
        setSelectedClientIds(dests.map(d => d.cliente_id));

        // Carica info clienti
        const clientMap = new Map<string, Cliente>();
        const allClients = await clientiService.getClienti(undefined, 500, 0, true);
        for (const c of allClients) clientMap.set(c.id, c);
        setClients(clientMap);

        // Risolvi messaggio
        if (campagna.template_id) {
          const templates = await comunicazioniService.getTemplates();
          const tmpl = templates.find(t => t.id === campagna.template_id);
          setMessage(tmpl?.corpo || campagna.messaggio_personalizzato || '');
          setEmailSubject(tmpl?.oggetto || '');
        } else {
          setMessage(campagna.messaggio_personalizzato || '');
          setEmailSubject(campagna.oggetto_email || '');
        }

        setStatus('ready');
      } catch (e) {
        console.error('Errore caricamento campagna:', e);
      }
    };
    load();
  }, [isOpen, campagna.id]);

  // Sostituisci placeholder nel messaggio per un cliente
  const resolveMessage = useCallback((client: Cliente): string => {
    return message
      .replace(/\{nome\}/g, client.nome)
      .replace(/\{cognome\}/g, client.cognome)
      .replace(/\{nome_centro\}/g, nomeCentro);
  }, [message]);

  const resolveSubject = useCallback((client: Cliente): string => {
    return emailSubject
      .replace(/\{nome\}/g, client.nome)
      .replace(/\{cognome\}/g, client.cognome)
      .replace(/\{nome_centro\}/g, nomeCentro);
  }, [emailSubject]);

  // Invia al prossimo cliente
  const sendNext = useCallback(async () => {
    if (currentIndex >= destinatari.length) {
      setStatus('completed');
      try { await comunicazioniService.updateCampagnaStato(campagna.id, 'completata'); } catch (e) { console.error('Errore completamento:', e); }
      return;
    }

    const dest = destinatari[currentIndex];
    const client = clients.get(dest.cliente_id);
    if (!client) {
      setResults(prev => prev.map((r, i) => i === currentIndex ? { ...r, status: 'error', error: 'Cliente non trovato' } : r));
      setCurrentIndex(prev => prev + 1);
      return;
    }

    const resolvedMsg = resolveMessage(client);

    setResults(prev => prev.map((r, i) => i === currentIndex ? { ...r, status: 'sending' } : r));

    try {
      if (campagna.canale === 'whatsapp') {
        const phone = client.cellulare || client.telefono || '';
        if (!phone) throw new Error('Nessun numero di telefono');
        const msgLink = await comunicazioniService.generateWhatsappLink(phone, resolvedMsg);
        await comunicazioniService.openMessageLink(msgLink.link);
        setResults(prev => prev.map((r, i) => i === currentIndex ? { ...r, status: 'sent' } : r));
      } else {
        // Email — invio reale via SMTP
        if (!client.email) throw new Error('Nessuna email');
        const resolvedSubj = resolveSubject(client);
        await comunicazioniService.sendEmail(
          client.email,
          resolvedSubj || 'Comunicazione',
          resolvedMsg,
          client.id,
          undefined,
          'campagna'
        );
        setResults(prev => prev.map((r, i) => i === currentIndex ? { ...r, status: 'sent' } : r));
      }
    } catch (e: any) {
      const errMsg = typeof e === 'string' ? e : e?.message || 'Errore invio';
      setResults(prev => prev.map((r, i) => i === currentIndex ? { ...r, status: 'error', error: errMsg } : r));
    }

    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);

    if (nextIdx >= destinatari.length) {
      setStatus('completed');
      try { await comunicazioniService.updateCampagnaStato(campagna.id, 'completata'); } catch (e) { console.error('Errore completamento:', e); }
    }
  }, [currentIndex, destinatari, clients, campagna, resolveMessage, resolveSubject]);

  // Auto-mode: invio automatico con delay (usa ref per evitare race condition)
  const sendNextRef = useRef(sendNext);
  sendNextRef.current = sendNext;

  useEffect(() => {
    if (!autoMode || status !== 'sending' || currentIndex >= destinatari.length) return;

    const delay = campagna.canale === 'whatsapp' ? 3000 : 1000;
    const timer = setTimeout(() => {
      if (autoModeRef.current) sendNextRef.current();
    }, delay);

    return () => clearTimeout(timer);
  }, [autoMode, status, currentIndex, destinatari.length, campagna.canale]);

  const startSending = async () => {
    if (destinatari.length === 0) {
      setStatus('completed');
      return;
    }
    setStatus('sending');
    try { await comunicazioniService.updateCampagnaStato(campagna.id, 'in_corso'); } catch (e) { console.error(e); }
    sendNext();
  };

  const toggleAuto = () => {
    const next = !autoMode;
    setAutoMode(next);
    autoModeRef.current = next;
    if (next && status === 'ready') {
      startSending();
    }
  };

  // Conferma destinatari e passa alla fase invio
  const confirmRecipients = async () => {
    if (selectedClientIds.length === 0) return;
    setPreparingRecipients(true);
    try {
      await comunicazioniService.prepareCampagnaDestinatari(campagna.id, selectedClientIds);
      const dests = await comunicazioniService.getCampagnaDestinatari(campagna.id);
      setDestinatari(dests);
      setResults(dests.map(d => ({ clienteId: d.cliente_id, status: 'pending' as const })));
      setCurrentIndex(0);
      setPhase('sending');
    } catch (e) {
      console.error('Errore preparazione destinatari:', e);
    } finally {
      setPreparingRecipients(false);
    }
  };

  const handleClose = () => {
    if (status === 'completed') onCompleted();
    onClose();
  };

  if (!isOpen) return null;

  const sent = results.filter(r => r.status === 'sent').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = results.length;
  const progress = total > 0 ? ((sent + errors) / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={handleClose} />

      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="flex items-center gap-3">
            {campagna.canale === 'whatsapp' ? (
              <ExternalLink size={18} style={{ color: '#25D366' }} />
            ) : (
              <Mail size={18} style={{ color: 'var(--color-primary)' }} />
            )}
            <div>
              <h2 className="font-bold text-sm text-white truncate max-w-[260px]">{campagna.nome}</h2>
              <p className="text-[10px] text-white/50">{total} destinatari</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* FASE 1: Selezione destinatari */}
        {phase === 'selecting' && (
          <>
            <div className="px-6 py-4">
              {status === 'loading' ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
              ) : (
                <ClientSelector
                  canale={campagna.canale as 'whatsapp' | 'email'}
                  selectedClientIds={selectedClientIds}
                  onSelectionChange={setSelectedClientIds}
                />
              )}
            </div>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <button onClick={handleClose} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Annulla
              </button>
              <button
                onClick={confirmRecipients}
                disabled={selectedClientIds.length === 0 || preparingRecipients}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
              >
                {preparingRecipients ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                Procedi con {selectedClientIds.length} clienti
              </button>
            </div>
          </>
        )}

        {/* FASE 2: Invio */}
        {phase === 'sending' && (
          <>
            {/* Progress */}
            <div className="px-6 py-3">
              <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                <span>{sent + errors} / {total}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--color-primary)' }} />
              </div>
              {status === 'completed' && (
                <div className="flex gap-4 mt-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>{sent} inviati</span>
                  {errors > 0 && <span className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>{errors} errori</span>}
                </div>
              )}
            </div>

            {/* Lista destinatari */}
            <div className="px-6 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {results.map((result, i) => {
                const client = clients.get(result.clienteId);
                if (!client) return null;
                return (
                  <div key={result.clienteId} className="flex items-center gap-3 py-2" style={{ borderBottom: i < results.length - 1 ? '1px solid var(--glass-border)' : undefined }}>
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {result.status === 'pending' && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--glass-border)' }} />}
                      {result.status === 'sending' && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-primary)' }} />}
                      {result.status === 'sent' && <Check size={14} style={{ color: 'var(--color-success)' }} />}
                      {result.status === 'error' && <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{client.nome} {client.cognome}</p>
                      {result.error && <p className="text-[10px] truncate" style={{ color: 'var(--color-danger)' }}>{result.error}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--glass-border)' }}>
              {status === 'completed' ? (
                <>
                  <div />
                  <button onClick={handleClose} className="px-5 py-2 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--color-primary)' }}>Chiudi</button>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleAuto}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: autoMode ? 'color-mix(in srgb, var(--color-warning) 15%, transparent)' : 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                      color: autoMode ? 'var(--color-warning)' : 'var(--color-primary)',
                    }}
                  >
                    {autoMode ? <><Pause size={13} /> Pausa</> : <><Play size={13} /> Automatico</>}
                  </button>
                  <button
                    onClick={status === 'ready' ? startSending : sendNext}
                    disabled={status === 'sending' && autoMode}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {status === 'ready' ? 'Avvia invio' : `Invia prossimo (${currentIndex + 1}/${total})`}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
