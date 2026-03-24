import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Save, Trash2, Calendar, Clock, User, Scissors, UserPlus, X, Check, ExternalLink, Euro } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Textarea } from '../ui/Textarea';
import { useAgendaStore } from '../../stores/agendaStore';
import { ProdottiUsatiSection, ProdottoUsato } from './ProdottiUsatiSection';
import { ReminderButton } from './ReminderButton';
import { magazzinoService } from '../../services/magazzino';
import type { Cliente, CreateClienteInput } from '../../types/cliente';
import type { Trattamento } from '../../types/trattamento';
import type { CreateAppuntamentoInput, UpdateAppuntamentoInput } from '../../types/agenda';

export const AppuntamentoModal: React.FC = () => {
  const {
    isModalOpen,
    modalMode,
    selectedAppuntamento,
    modalInitialTime,
    operatrici,
    closeModal,
    createAppuntamento,
    updateAppuntamento,
    deleteAppuntamento,
  } = useAgendaStore();

  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [trattamenti, setTrattamenti] = useState<Trattamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick add client state
  const [showQuickAddClient, setShowQuickAddClient] = useState(false);
  const [quickClientNome, setQuickClientNome] = useState('');
  const [quickClientCognome, setQuickClientCognome] = useState('');
  const [quickClientCellulare, setQuickClientCellulare] = useState('');
  const [quickClientEmail, setQuickClientEmail] = useState('');
  const [quickClientDataNascita, setQuickClientDataNascita] = useState('');
  const [quickClientConsensoWhatsapp, setQuickClientConsensoWhatsapp] = useState(true);
  const [quickClientConsensoEmail, setQuickClientConsensoEmail] = useState(false);
  const [quickClientSaving, setQuickClientSaving] = useState(false);

  // Form state
  const [clienteId, setClienteId] = useState('');
  const [operatriceId, setOperatriceId] = useState('');
  const [trattamentoId, setTrattamentoId] = useState('');
  const [dataOraInizio, setDataOraInizio] = useState('');
  const [dataOraFine, setDataOraFine] = useState('');
  const [stato, setStato] = useState<'prenotato' | 'in_corso' | 'completato' | 'annullato' | 'no_show'>('prenotato');
  const [note, setNote] = useState('');
  const [prezzoApplicato, setPrezzoApplicato] = useState<string>('');
  const [prodottiUsati, setProdottiUsati] = useState<ProdottoUsato[]>([]);

  // Flag per evitare il ricalcolo automatico della durata in modalità edit
  const skipAutoCalculateRef = useRef(false);

  // Carica clienti e trattamenti quando il modal si apre
  useEffect(() => {
    if (isModalOpen) {
      loadData();
    }
  }, [isModalOpen]);

  // Inizializza il form in base alla modalità
  useEffect(() => {
    if (!isModalOpen) {
      resetForm();
      return;
    }

    if (modalMode === 'create' && modalInitialTime) {
      // Modalità creazione: inizializza con l'orario cliccato
      setOperatriceId(modalInitialTime.operatriceId);
      setDataOraInizio(formatDateTimeForInput(modalInitialTime.start));
      // Fine: 1 ora dopo l'inizio di default
      const endTime = new Date(modalInitialTime.start);
      endTime.setHours(endTime.getHours() + 1);
      setDataOraFine(formatDateTimeForInput(endTime));
    } else if (modalMode === 'edit' && selectedAppuntamento) {
      // Modalità modifica: carica i dati dell'appuntamento
      // Imposta il flag per evitare il ricalcolo automatico della durata
      skipAutoCalculateRef.current = true;
      setClienteId(selectedAppuntamento.cliente_id);
      setOperatriceId(selectedAppuntamento.operatrice_id);
      setTrattamentoId(selectedAppuntamento.trattamento_id);
      setDataOraInizio(formatDateTimeForInput(new Date(selectedAppuntamento.data_ora_inizio)));
      setDataOraFine(formatDateTimeForInput(new Date(selectedAppuntamento.data_ora_fine)));
      setStato(selectedAppuntamento.stato);
      setNote(selectedAppuntamento.note_prenotazione || '');
      setPrezzoApplicato(selectedAppuntamento.prezzo_applicato?.toString() || '');
      // Resetta il flag dopo un breve delay per permettere il rendering
      setTimeout(() => {
        skipAutoCalculateRef.current = false;
      }, 100);
    }
  }, [isModalOpen, modalMode, modalInitialTime, selectedAppuntamento]);

  // Aggiorna automaticamente la fine quando cambia trattamento o inizio
  // Ma solo in modalità create o se l'utente cambia manualmente il trattamento
  useEffect(() => {
    // Skip se siamo in fase di caricamento dati in edit mode
    if (skipAutoCalculateRef.current) {
      return;
    }

    if (trattamentoId && dataOraInizio) {
      const trattamento = trattamenti.find((t) => t.id === trattamentoId);
      if (trattamento) {
        const start = new Date(dataOraInizio);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + trattamento.durata_minuti);
        setDataOraFine(formatDateTimeForInput(end));

        // Imposta prezzo se non già impostato
        if (!prezzoApplicato && trattamento.prezzo_listino) {
          setPrezzoApplicato(trattamento.prezzo_listino.toString());
        }
      }
    }
  }, [trattamentoId, dataOraInizio, trattamenti]);

  const loadData = async () => {
    try {
      const clientiData = await invoke<Cliente[]>('get_clienti', {
        search: null,
        limit: 1000,
        offset: 0,
      });

      const trattamentiData = await invoke<Trattamento[]>('get_trattamenti', {
        categoriaId: null,
        attivoOnly: true,
      });

      const clientiFiltrati = clientiData.filter((c) => c.attivo);
      const trattamentiFiltrati = trattamentiData.filter((t) => t.attivo);

      setClienti(clientiFiltrati);
      setTrattamenti(trattamentiFiltrati);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err?.message || 'Errore nel caricamento dei dati');
    }
  };

  const resetForm = () => {
    setClienteId('');
    setOperatriceId('');
    setTrattamentoId('');
    setDataOraInizio('');
    setDataOraFine('');
    setStato('prenotato');
    setNote('');
    setPrezzoApplicato('');
    setProdottiUsati([]);
    setError(null);
    skipAutoCalculateRef.current = false;
    // Reset quick add client form
    setShowQuickAddClient(false);
    setQuickClientNome('');
    setQuickClientCognome('');
    setQuickClientCellulare('');
    setQuickClientEmail('');
    setQuickClientDataNascita('');
    setQuickClientConsensoWhatsapp(true);
    setQuickClientConsensoEmail(false);
  };

  const handleQuickAddClient = async () => {
    if (!quickClientNome.trim() || !quickClientCognome.trim()) {
      setError('Nome e cognome sono obbligatori');
      return;
    }

    setQuickClientSaving(true);
    setError(null);

    try {
      const input: CreateClienteInput = {
        nome: quickClientNome.trim(),
        cognome: quickClientCognome.trim(),
        cellulare: quickClientCellulare.trim() || undefined,
        email: quickClientEmail.trim() || undefined,
        data_nascita: quickClientDataNascita || undefined,
        consenso_marketing: false,
        consenso_sms: false,
        consenso_whatsapp: quickClientConsensoWhatsapp,
        consenso_email: quickClientConsensoEmail,
      };

      const newCliente = await invoke<Cliente>('create_cliente', { input });

      // Ricarica la lista clienti
      await loadData();

      // Seleziona automaticamente il nuovo cliente
      setClienteId(newCliente.id);

      // Reset e chiudi il form quick add
      setShowQuickAddClient(false);
      setQuickClientNome('');
      setQuickClientCognome('');
      setQuickClientCellulare('');
      setQuickClientEmail('');
      setQuickClientDataNascita('');
      setQuickClientConsensoWhatsapp(true);
      setQuickClientConsensoEmail(false);
      } catch (err: any) {
      console.error('Error creating quick client:', err);
      setError(err?.message || 'Errore durante la creazione del cliente');
    } finally {
      setQuickClientSaving(false);
    }
  };

  const formatDateTimeForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Navigazione rapida verso le anagrafiche
  const handleNavigateTo = (page: string, entityId?: string) => {
    const appId = selectedAppuntamento?.id;
    closeModal();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigateToPage', {
        detail: {
          page,
          ...(page === 'clienti' && entityId ? { clienteId: entityId } : {}),
          fromAppuntamentoId: appId,
        },
      }));
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!clienteId || !operatriceId || !trattamentoId || !dataOraInizio || !dataOraFine) {
        throw new Error('Compilare tutti i campi obbligatori');
      }

      const startDate = new Date(dataOraInizio);
      const endDate = new Date(dataOraFine);

      if (endDate <= startDate) {
        throw new Error('La data di fine deve essere successiva alla data di inizio');
      }

      if (modalMode === 'create') {
        const input: CreateAppuntamentoInput = {
          cliente_id: clienteId,
          operatrice_id: operatriceId,
          trattamento_id: trattamentoId,
          data_ora_inizio: startDate.toISOString(),
          data_ora_fine: endDate.toISOString(),
          stato: stato,
          note_prenotazione: note || undefined,
          prezzo_applicato: prezzoApplicato ? parseFloat(prezzoApplicato) : undefined,
        };
        await createAppuntamento(input);
      } else if (modalMode === 'edit' && selectedAppuntamento) {
        const input: UpdateAppuntamentoInput = {
          cliente_id: clienteId,
          operatrice_id: operatriceId,
          trattamento_id: trattamentoId,
          data_ora_inizio: startDate.toISOString(),
          data_ora_fine: endDate.toISOString(),
          stato: stato,
          note_prenotazione: note || undefined,
          prezzo_applicato: prezzoApplicato ? parseFloat(prezzoApplicato) : undefined,
        };
        await updateAppuntamento(selectedAppuntamento.id, input);
      }

      // Reso automatico prodotti se si torna da completato a un altro stato
      if (modalMode === 'edit' && selectedAppuntamento?.stato === 'completato' && stato !== 'completato') {
        const appId = selectedAppuntamento.id;
        const trattamentoNome = trattamenti.find(t => t.id === trattamentoId)?.nome || 'Trattamento';
        try {
          const movimenti = await magazzinoService.getMovimentiAppuntamento(appId);
          for (const mov of movimenti) {
            try {
              await magazzinoService.registraReso({
                prodotto_id: mov.prodotto_id,
                quantita: mov.quantita,
                operatrice_id: operatriceId || undefined,
                cliente_id: clienteId || undefined,
                appuntamento_id: appId || undefined,
                note: `Reso automatico - stato cambiato da completato a ${stato} - ${trattamentoNome}`,
              });
            } catch (movErr) {
              console.error('Errore reso prodotto:', movErr);
            }
          }
        } catch (err) {
          console.error('Errore caricamento movimenti per reso:', err);
        }
      }

      // Gestione prodotti usati quando l'appuntamento è completato
      if (stato === 'completato') {
        const appId = selectedAppuntamento?.id;
        const trattamentoNome = trattamenti.find(t => t.id === trattamentoId)?.nome || 'Trattamento';

        for (const prodotto of prodottiUsati) {
          try {
            if (prodotto.da_rimuovere && prodotto.gia_registrato) {
              await magazzinoService.registraReso({
                prodotto_id: prodotto.prodotto_id,
                quantita: prodotto.quantita_originale || prodotto.quantita,
                operatrice_id: operatriceId || undefined,
                cliente_id: clienteId || undefined,
                appuntamento_id: appId || undefined,
                note: `Reso per correzione appuntamento - ${trattamentoNome}`,
              });
            } else if (prodotto.gia_registrato && prodotto.quantita_originale !== undefined) {
              const differenza = prodotto.quantita - prodotto.quantita_originale;
              if (differenza > 0) {
                await magazzinoService.registraScarico({
                  prodotto_id: prodotto.prodotto_id,
                  quantita: differenza,
                  tipo: 'scarico_uso',
                  operatrice_id: operatriceId || undefined,
                  cliente_id: clienteId || undefined,
                  appuntamento_id: appId || undefined,
                  note: `Correzione appuntamento (+${differenza}) - ${trattamentoNome}`,
                });
              } else if (differenza < 0) {
                await magazzinoService.registraReso({
                  prodotto_id: prodotto.prodotto_id,
                  quantita: Math.abs(differenza),
                  operatrice_id: operatriceId || undefined,
                  cliente_id: clienteId || undefined,
                  appuntamento_id: appId || undefined,
                  note: `Correzione appuntamento (${differenza}) - ${trattamentoNome}`,
                });
              }
            } else if (!prodotto.gia_registrato && !prodotto.da_rimuovere) {
              await magazzinoService.registraScarico({
                prodotto_id: prodotto.prodotto_id,
                quantita: prodotto.quantita,
                tipo: 'scarico_uso',
                operatrice_id: operatriceId || undefined,
                cliente_id: clienteId || undefined,
                appuntamento_id: appId || undefined,
                note: `Usato per appuntamento - ${trattamentoNome}`,
              });
            }
          } catch (movimentoError) {
            console.error('Errore registrazione movimento prodotto:', movimentoError);
          }
        }
      }

      closeModal();
    } catch (err: any) {
      setError(err?.message || 'Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppuntamento) return;

    if (!confirm('Sei sicuro di voler eliminare questo appuntamento?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteAppuntamento(selectedAppuntamento.id);
      closeModal();
    } catch (err: any) {
      setError(err?.message || 'Errore durante l\'eliminazione');
    } finally {
      setIsLoading(false);
    }
  };

  const clientiOptions = clienti.map((c) => {
    const contactInfo = [];
    if (c.cellulare) contactInfo.push(`📱 ${c.cellulare}`);
    if (c.email) contactInfo.push(`📧 ${c.email}`);

    return {
      value: c.id,
      label: `${c.cognome} ${c.nome}`,
      subtitle: contactInfo.length > 0 ? contactInfo.join(' • ') : undefined,
      metadata: c.indirizzo ? `📍 ${c.indirizzo}` : undefined,
    };
  });

  const parseSpecializzazioni = (spec: string | null): string => {
    if (!spec) return '';
    try {
      const parsed = JSON.parse(spec);
      if (Array.isArray(parsed)) return parsed.join(', ');
      return spec;
    } catch {
      return spec;
    }
  };

  const operatriciOptions = operatrici.map((o) => {
    const spec = parseSpecializzazioni(o.specializzazioni);
    return {
      value: o.id,
      label: `${o.cognome} ${o.nome}`,
      subtitle: spec || undefined,
    };
  });

  const trattamentiOptions = trattamenti.map((t) => ({
    value: t.id,
    label: t.nome,
    subtitle: `${t.durata_minuti} min${t.prezzo_listino ? ` — €${t.prezzo_listino.toFixed(2)}` : ''}`,
  }));

  // Quick nav button component
  const QuickNavButton = ({ page, entityId, title }: { page: string; entityId?: string; title: string }) => {
    if (!entityId) return null;
    return (
      <button
        type="button"
        onClick={() => handleNavigateTo(page, entityId)}
        className="p-1 rounded-md transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 10%, transparent)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        title={title}
      >
        <ExternalLink size={13} />
      </button>
    );
  };

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={closeModal}
      title={modalMode === 'create' ? 'Nuovo Appuntamento' : 'Modifica Appuntamento'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              background: 'color-mix(in srgb, rgb(239, 68, 68) 10%, transparent)',
              color: 'rgb(220, 38, 38)',
              border: '1px solid color-mix(in srgb, rgb(239, 68, 68) 20%, transparent)',
            }}
          >
            {error}
          </div>
        )}

        {/* Sezione Cliente */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={16} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Cliente</span>
              <QuickNavButton page="clienti" entityId={clienteId} title="Apri anagrafica cliente" />
            </div>
            {!showQuickAddClient && (
              <button
                type="button"
                onClick={() => setShowQuickAddClient(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <UserPlus size={14} />
                Nuovo
              </button>
            )}
          </div>

          {/* Quick Add Client Form */}
          {showQuickAddClient ? (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                background: 'var(--input-bg, var(--card-bg))',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Nuovo cliente</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddClient(false);
                    setQuickClientNome('');
                    setQuickClientCognome('');
                    setQuickClientCellulare('');
                    setQuickClientEmail('');
                    setQuickClientDataNascita('');
                    setQuickClientConsensoWhatsapp(true);
                    setQuickClientConsensoEmail(false);
                                  }}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Anagrafica */}
              <div className="grid grid-cols-3 gap-3">
                <Input
                  type="text"
                  label="Nome *"
                  value={quickClientNome}
                  onChange={(e) => setQuickClientNome(e.target.value)}
                  placeholder="Nome"
                  disabled={quickClientSaving}
                />
                <Input
                  type="text"
                  label="Cognome *"
                  value={quickClientCognome}
                  onChange={(e) => setQuickClientCognome(e.target.value)}
                  placeholder="Cognome"
                  disabled={quickClientSaving}
                />
                <Input
                  type="date"
                  label="Data nascita"
                  value={quickClientDataNascita}
                  onChange={(e) => setQuickClientDataNascita(e.target.value)}
                  disabled={quickClientSaving}
                />
              </div>

              {/* Contatti */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="tel"
                  label="Cellulare"
                  value={quickClientCellulare}
                  onChange={(e) => setQuickClientCellulare(e.target.value)}
                  placeholder="Es: 333 1234567"
                  disabled={quickClientSaving}
                />
                <Input
                  type="email"
                  label="Email"
                  value={quickClientEmail}
                  onChange={(e) => setQuickClientEmail(e.target.value)}
                  placeholder="email@esempio.it"
                  disabled={quickClientSaving}
                />
              </div>

              {/* Consensi */}
              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Consensi:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickClientConsensoWhatsapp}
                    onChange={(e) => setQuickClientConsensoWhatsapp(e.target.checked)}
                    disabled={quickClientSaving}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>WhatsApp</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickClientConsensoEmail}
                    onChange={(e) => setQuickClientConsensoEmail(e.target.checked)}
                    disabled={quickClientSaving}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Email</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowQuickAddClient(false);
                    setQuickClientNome('');
                    setQuickClientCognome('');
                    setQuickClientCellulare('');
                    setQuickClientEmail('');
                    setQuickClientDataNascita('');
                    setQuickClientConsensoWhatsapp(true);
                    setQuickClientConsensoEmail(false);
                                  }}
                  disabled={quickClientSaving}
                >
                  Annulla
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleQuickAddClient}
                  disabled={quickClientSaving || !quickClientNome.trim() || !quickClientCognome.trim()}
                  className="gap-1.5"
                >
                  {quickClientSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Crea e seleziona
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <SearchableSelect
                value={clienteId}
                onChange={(value) => setClienteId(value)}
                options={clientiOptions}
                placeholder="Cerca e seleziona un cliente..."
                required
                disabled={isLoading}
                icon={<User size={18} />}
              />
              {clienti.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Nessun cliente disponibile. Clicca su "Nuovo" per crearne uno.
                </p>
              )}
            </>
          )}
        </div>

        {/* Sezione Servizio */}
        <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2">
            <Scissors size={16} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Servizio</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Operatore *</label>
                <QuickNavButton page="operatrici" entityId={operatriceId} title="Apri anagrafica operatore" />
              </div>
              <SearchableSelect
                value={operatriceId}
                onChange={(value) => setOperatriceId(value)}
                options={operatriciOptions}
                placeholder="Cerca operatore..."
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Trattamento *</label>
                <QuickNavButton page="trattamenti" entityId={trattamentoId} title="Apri scheda trattamento" />
              </div>
              <SearchableSelect
                value={trattamentoId}
                onChange={(value) => setTrattamentoId(value)}
                options={trattamentiOptions}
                placeholder="Cerca trattamento..."
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Sezione Orario */}
        <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2">
            <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Orario</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="datetime-local"
              label="Inizio *"
              value={dataOraInizio}
              onChange={(e) => setDataOraInizio(e.target.value)}
              required
              disabled={isLoading}
            />
            <Input
              type="datetime-local"
              label="Fine *"
              value={dataOraFine}
              onChange={(e) => setDataOraFine(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {dataOraInizio && dataOraFine && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
              <Clock size={14} />
              Durata: {Math.round((new Date(dataOraFine).getTime() - new Date(dataOraInizio).getTime()) / 60000)} minuti
            </p>
          )}
        </div>

        {/* Sezione Dettagli */}
        <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2">
            <Euro size={16} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Dettagli</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Stato *"
              value={stato}
              onChange={(e) => setStato(e.target.value as any)}
              required
              disabled={isLoading}
            >
              <option value="prenotato">Prenotato</option>
              <option value="in_corso">In Corso</option>
              <option value="completato">Completato</option>
              <option value="annullato">Annullato</option>
              <option value="no_show">No Show</option>
            </Select>

            <Input
              type="number"
              label="Prezzo (€)"
              value={prezzoApplicato}
              onChange={(e) => setPrezzoApplicato(e.target.value)}
              step="0.01"
              min="0"
              disabled={isLoading}
              placeholder="Es: 50.00"
            />
          </div>

          <Textarea
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            disabled={isLoading}
            placeholder="Note aggiuntive..."
          />
        </div>

        {/* Sezione Prodotti Usati - visibile solo quando stato = completato */}
        {stato === 'completato' && (
          <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <ProdottiUsatiSection
              appuntamentoId={selectedAppuntamento?.id}
              operatriceId={operatriceId}
              onProdottiChange={setProdottiUsati}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-5 mt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
          {modalMode === 'edit' && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={isLoading}
              className="gap-1.5"
            >
              <Trash2 size={16} />
              Elimina
            </Button>
          )}

          {/* Reminder Button - solo in edit e con stato prenotato/confermato/in_corso */}
          {modalMode === 'edit' && selectedAppuntamento && ['prenotato', 'confermato', 'in_corso'].includes(stato) && (() => {
            const cliente = clienti.find(c => c.id === clienteId);
            if (!cliente) {
              if (clienti.length === 0) {
                return (
                  <Button type="button" variant="secondary" size="sm" disabled className="gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Caricamento...
                  </Button>
                );
              }
              return null;
            }
            return (
              <ReminderButton
                appuntamentoId={selectedAppuntamento.id}
                clienteTelefono={cliente.cellulare || cliente.telefono}
                clienteEmail={cliente.email}
                clienteConsensoWhatsapp={cliente.consenso_whatsapp}
                clienteConsensoEmail={cliente.consenso_email}
                reminderInviato={selectedAppuntamento.reminder_inviato}
                disabled={isLoading}
                onSuccess={() => {}}
                onError={(err) => setError(err)}
              />
            );
          })()}

          <div className="flex-1" />

          <Button
            type="button"
            variant="secondary"
            onClick={closeModal}
            disabled={isLoading}
          >
            Annulla
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="gap-1.5"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save size={16} />
                {modalMode === 'create' ? 'Crea' : 'Salva'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
