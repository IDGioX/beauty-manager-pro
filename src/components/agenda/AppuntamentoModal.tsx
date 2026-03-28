import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Save, Trash2, Calendar, Clock, User, Scissors, UserPlus, X, Check, ExternalLink, Euro, AlertTriangle, FileText, ChevronDown, ChevronUp, Gift, Package } from 'lucide-react';
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
import { pacchettiService, type PacchettoCliente, type PacchettoSeduta, type SedutaConPacchetto } from '../../services/pacchetti';
import type { Cliente, CreateClienteInput } from '../../types/cliente';
import type { Trattamento } from '../../types/trattamento';
import type { CreateAppuntamentoInput, UpdateAppuntamentoInput } from '../../types/agenda';

const ClienteInfoPanel: React.FC<{ cliente: Cliente }> = ({ cliente }) => {
  const [expanded, setExpanded] = useState(false);

  const items: { label: string; value: string; warn?: boolean }[] = [];
  if (cliente.allergie) items.push({ label: 'Allergie', value: cliente.allergie, warn: true });
  if (cliente.patologie) items.push({ label: 'Patologie', value: cliente.patologie, warn: true });
  if (cliente.tipo_pelle) items.push({ label: 'Tipo pelle', value: cliente.tipo_pelle });
  if (cliente.note_estetiche) items.push({ label: 'Note estetiche', value: cliente.note_estetiche });
  if (cliente.note) items.push({ label: 'Note', value: cliente.note });

  if (items.length === 0) return null;

  const hasWarnings = items.some(i => i.warn);
  const preview = items[0];

  return (
    <div
      className="mt-2 rounded-lg overflow-hidden text-xs"
      style={{
        background: hasWarnings
          ? 'color-mix(in srgb, var(--color-warning) 10%, var(--card-bg))'
          : 'color-mix(in srgb, var(--color-primary) 8%, var(--card-bg))',
        border: `1px solid ${hasWarnings ? 'color-mix(in srgb, var(--color-warning) 30%, transparent)' : 'var(--glass-border)'}`,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {hasWarnings ? (
          <AlertTriangle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
        ) : (
          <FileText size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        )}
        <span className="flex-1 truncate">
          {!expanded && (
            <span>
              <strong>{preview.label}:</strong> {preview.value}
              {items.length > 1 && <span style={{ color: 'var(--color-text-muted)' }}> (+{items.length - 1})</span>}
            </span>
          )}
          {expanded && (
            <strong>Scheda cliente</strong>
          )}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 space-y-1.5" style={{ borderTop: '1px solid var(--glass-border)' }}>
          {items.map((item, i) => (
            <div key={i} className="pt-1.5">
              <div className="flex items-center gap-1.5">
                {item.warn && <AlertTriangle size={11} style={{ color: 'var(--color-warning)' }} />}
                <span className="font-semibold" style={{ color: item.warn ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>
                  {item.label}
                </span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  const [omaggio, setOmaggio] = useState(false);
  const [prodottiUsati, setProdottiUsati] = useState<ProdottoUsato[]>([]);
  const [prodottiAcquistati, setProdottiAcquistati] = useState<ProdottoUsato[]>([]);

  // Flag per evitare il ricalcolo automatico della durata in modalità edit
  const skipAutoCalculateRef = useRef(false);

  // Package session linking state
  const [pacchettiCliente, setPacchettiCliente] = useState<PacchettoCliente[]>([]);
  const [seduteDisponibili, setSeduteDisponibili] = useState<Map<string, PacchettoSeduta[]>>(new Map());
  const [collegaPacchetto, setCollegaPacchetto] = useState(false);
  const [selectedPacchettoClienteId, setSelectedPacchettoClienteId] = useState('');
  const [selectedNumeroSeduta, setSelectedNumeroSeduta] = useState(0);
  const [sedutaLinkata, setSedutaLinkata] = useState<SedutaConPacchetto | null>(null);
  const [trattamentiPacchetto, setTrattamentiPacchetto] = useState<{ trattamento_id: string; trattamento_nome: string }[]>([]);
  const [selectedTrattamentiPkgIds, setSelectedTrattamentiPkgIds] = useState<string[]>([]);
  const [wasUnlinked, setWasUnlinked] = useState(false);
  const prezzoPrePacchettoRef = useRef<string>('');
  const trattamentoPrePacchettoRef = useRef<string>('');

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
      setOmaggio(selectedAppuntamento.omaggio || false);
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

  // Ricalcola durata quando cambiano i trattamenti selezionati del pacchetto
  useEffect(() => {
    if (!collegaPacchetto || selectedTrattamentiPkgIds.length === 0 || !dataOraInizio) return;
    if (skipAutoCalculateRef.current) return;

    const durataTotale = selectedTrattamentiPkgIds.reduce((sum, id) => {
      const t = trattamenti.find(tr => tr.id === id);
      return sum + (t?.durata_minuti || 0);
    }, 0);

    if (durataTotale > 0) {
      const start = new Date(dataOraInizio);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + durataTotale);
      setDataOraFine(formatDateTimeForInput(end));
    }
  }, [collegaPacchetto, selectedTrattamentiPkgIds, dataOraInizio, trattamenti]);

  // Carica pacchetti attivi del cliente quando cambia clienteId
  useEffect(() => {
    if (!clienteId) {
      setPacchettiCliente([]);
      setSeduteDisponibili(new Map());
      setCollegaPacchetto(false);
      setSelectedPacchettoClienteId('');
      setSelectedNumeroSeduta(0);
      setSedutaLinkata(null);
      return;
    }
    const fetchPacchetti = async () => {
      try {
        const pks = await pacchettiService.getPacchettiCliente(clienteId, 'attivo');
        // Carica tutte le sedute PRIMA di aggiornare lo stato, per evitare render intermedi
        const map = new Map<string, PacchettoSeduta[]>();
        for (const pc of pks) {
          const sedute = await pacchettiService.getSedutePacchetto(pc.id);
          map.set(pc.id, sedute);
        }
        // Aggiorna entrambi nello stesso batch
        setPacchettiCliente(pks);
        setSeduteDisponibili(map);
      } catch (e) { console.error('Errore caricamento pacchetti cliente:', e); }
    };
    fetchPacchetti();
  }, [clienteId]);

  // In edit mode, carica link seduta esistente
  useEffect(() => {
    if (modalMode === 'edit' && selectedAppuntamento) {
      pacchettiService.getSedutaByAppuntamento(selectedAppuntamento.id).then(s => {
        if (s) {
          setSedutaLinkata(s);
          setCollegaPacchetto(true);
          setSelectedPacchettoClienteId(s.pacchetto_cliente_id);
          setSelectedNumeroSeduta(s.numero_seduta);
        }
      }).catch(e => console.error('Errore caricamento seduta collegata:', e));
    }
  }, [modalMode, selectedAppuntamento]);

  // Carica i trattamenti del pacchetto quando cambia la selezione
  useEffect(() => {
    if (!collegaPacchetto || !selectedPacchettoClienteId) {
      setTrattamentiPacchetto([]);
      return;
    }
    const pkg = pacchettiCliente.find(p => p.id === selectedPacchettoClienteId);
    if (!pkg) return;
    pacchettiService.getPacchettoById(pkg.pacchetto_id).then(fullPkg => {
      const tratt = fullPkg.trattamenti_inclusi.map(t => ({ trattamento_id: t.trattamento_id, trattamento_nome: t.trattamento_nome }));
      setTrattamentiPacchetto(tratt);
      // Auto-seleziona tutti i trattamenti, il primo diventa trattamentoId
      const allIds = tratt.map(t => t.trattamento_id);
      setSelectedTrattamentiPkgIds(allIds);
      if (allIds.length > 0) {
        setTrattamentoId(allIds[0]);
      }
    }).catch(() => {});
  }, [collegaPacchetto, selectedPacchettoClienteId, pacchettiCliente]);

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
    setOmaggio(false);
    setProdottiUsati([]);
    setProdottiAcquistati([]);
    setError(null);
    skipAutoCalculateRef.current = false;
    // Reset package linking state
    setPacchettiCliente([]);
    setSeduteDisponibili(new Map());
    setCollegaPacchetto(false);
    setSelectedPacchettoClienteId('');
    setSelectedNumeroSeduta(0);
    setSedutaLinkata(null);
    setTrattamentiPacchetto([]);
    setSelectedTrattamentiPkgIds([]);
    setWasUnlinked(false);
    setShowDeleteConfirm(false);
    prezzoPrePacchettoRef.current = '';
    trattamentoPrePacchettoRef.current = '';
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
          ...((page === 'clienti' || page === 'pacchetti') && entityId ? { clienteId: entityId } : {}),
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

      // Cattura dati pacchetto PRIMA della creazione (il modal si chiude dopo createAppuntamento)
      const shouldLinkPkg = collegaPacchetto && !!selectedPacchettoClienteId && selectedNumeroSeduta > 0;
      const linkPkgClienteId = selectedPacchettoClienteId;
      const linkSedutaNum = selectedNumeroSeduta;
      const linkSedutaId = shouldLinkPkg
        ? (seduteDisponibili.get(linkPkgClienteId) || []).find(s => s.numero_seduta === linkSedutaNum)?.id || null
        : null;
      const createStato = stato;
      const shouldUnlink = wasUnlinked;

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
          omaggio,
        };
        const newAppId = await createAppuntamento(input);

        // Collega a pacchetto (usa variabili catturate, non stato componente che potrebbe essere smontato)
        if (shouldLinkPkg && newAppId) {
          try {
            await pacchettiService.collegaSedutaAppuntamento(linkPkgClienteId, linkSedutaNum, newAppId);
            if (createStato === 'completato' && linkSedutaId) {
              await pacchettiService.completaSedutaById(linkSedutaId, newAppId);
            }
          } catch (e) { console.error('Errore collegamento pacchetto:', e); }
        }
      } else if (modalMode === 'edit' && selectedAppuntamento) {
        const editAppId = selectedAppuntamento.id;
        const hadLinkedSeduta = !!sedutaLinkata;
        const input: UpdateAppuntamentoInput = {
          cliente_id: clienteId,
          operatrice_id: operatriceId,
          trattamento_id: trattamentoId,
          data_ora_inizio: startDate.toISOString(),
          data_ora_fine: endDate.toISOString(),
          stato: stato,
          note_prenotazione: note || undefined,
          prezzo_applicato: prezzoApplicato ? parseFloat(prezzoApplicato) : undefined,
          omaggio,
        };
        await updateAppuntamento(editAppId, input);

        // Gestione collegamento/scollegamento pacchetto (usa variabili catturate)
        try {
          if (shouldLinkPkg && !hadLinkedSeduta) {
            await pacchettiService.collegaSedutaAppuntamento(linkPkgClienteId, linkSedutaNum, editAppId);
          }
          if (shouldUnlink) {
            await pacchettiService.scollegaSedutaAppuntamento(editAppId);
          }
          if (createStato === 'completato' && shouldLinkPkg && linkSedutaId) {
            await pacchettiService.completaSedutaById(linkSedutaId, editAppId);
          }
          // Se stato diventa annullato/no_show, scollega la seduta dal pacchetto
          if ((createStato === 'annullato' || createStato === 'no_show') && hadLinkedSeduta) {
            await pacchettiService.scollegaSedutaAppuntamento(editAppId);
          }
        } catch (e) { console.error('Errore gestione pacchetto:', e); }
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

        // Gestione prodotti ACQUISTATI (scarico_vendita)
        for (const prodotto of prodottiAcquistati) {
          try {
            if (prodotto.da_rimuovere && prodotto.gia_registrato) {
              await magazzinoService.registraReso({
                prodotto_id: prodotto.prodotto_id,
                quantita: prodotto.quantita_originale || prodotto.quantita,
                operatrice_id: operatriceId || undefined,
                cliente_id: clienteId || undefined,
                appuntamento_id: appId || undefined,
                note: `Reso vendita - ${trattamentoNome}`,
              });
            } else if (prodotto.gia_registrato && prodotto.quantita_originale !== undefined) {
              const differenza = prodotto.quantita - prodotto.quantita_originale;
              if (differenza > 0) {
                await magazzinoService.registraScarico({
                  prodotto_id: prodotto.prodotto_id,
                  quantita: differenza,
                  tipo: 'scarico_vendita',
                  operatrice_id: operatriceId || undefined,
                  cliente_id: clienteId || undefined,
                  appuntamento_id: appId || undefined,
                  note: `Correzione vendita (+${differenza}) - ${trattamentoNome}`,
                });
              } else if (differenza < 0) {
                await magazzinoService.registraReso({
                  prodotto_id: prodotto.prodotto_id,
                  quantita: Math.abs(differenza),
                  operatrice_id: operatriceId || undefined,
                  cliente_id: clienteId || undefined,
                  appuntamento_id: appId || undefined,
                  note: `Correzione vendita (${differenza}) - ${trattamentoNome}`,
                });
              }
            } else if (!prodotto.gia_registrato && !prodotto.da_rimuovere) {
              await magazzinoService.registraScarico({
                prodotto_id: prodotto.prodotto_id,
                quantita: prodotto.quantita,
                tipo: 'scarico_vendita',
                operatrice_id: operatriceId || undefined,
                cliente_id: clienteId || undefined,
                appuntamento_id: appId || undefined,
                note: `Venduto al cliente - ${trattamentoNome}`,
              });
            }
          } catch (movimentoError) {
            console.error('Errore registrazione vendita prodotto:', movimentoError);
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!selectedAppuntamento) return;

    setIsLoading(true);
    try {
      // Scollega seduta pacchetto se collegata (ignora errori)
      try {
        await pacchettiService.scollegaSedutaAppuntamento(selectedAppuntamento.id);
      } catch { /* ignora — potrebbe non avere seduta collegata */ }
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
              <QuickNavButton page="pacchetti" entityId={clienteId} title="Vai ai pacchetti del cliente" />
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
          {/* Info Cliente Panel */}
          {(() => {
            const cliente = clienti.find(c => c.id === clienteId);
            if (!cliente) return null;
            const hasInfo = cliente.note || cliente.allergie || cliente.patologie || cliente.note_estetiche || cliente.tipo_pelle;
            if (!hasInfo) return null;
            return <ClienteInfoPanel cliente={cliente} />;
          })()}
        </div>

        {/* Sezione Pacchetto — visibile solo se il cliente ha pacchetti attivi */}
        {clienteId && pacchettiCliente.length > 0 && (() => {
          // Filtra pacchetti con almeno una seduta disponibile
          const pacchettiDisponibili = pacchettiCliente.filter(pc => {
            const sedute = seduteDisponibili.get(pc.id) || [];
            return sedute.some(s => s.stato === 'pianificata' && !s.appuntamento_id);
          });
          // Mostra anche se c'è una seduta già linkata (edit mode)
          if (pacchettiDisponibili.length === 0 && !sedutaLinkata) return null;

          const selectedPkg = pacchettiCliente.find(p => p.id === selectedPacchettoClienteId);
          const selectedSedute = seduteDisponibili.get(selectedPacchettoClienteId) || [];
          const seduteLibere = selectedSedute.filter(s => s.stato === 'pianificata' && !s.appuntamento_id);

          const formatPrice = (v: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);

          const handleToggleCollega = (checked: boolean) => {
            if (checked) {
              // Verifica che ci sia almeno un pacchetto con sedute disponibili
              const firstPkg = pacchettiDisponibili[0];
              if (!firstPkg) return; // Nessun pacchetto disponibile, non attivare

              const sedute = seduteDisponibili.get(firstPkg.id) || [];
              const nextSeduta = sedute.find(s => s.stato === 'pianificata' && !s.appuntamento_id);
              if (!nextSeduta) return; // Nessuna seduta libera

              setCollegaPacchetto(true);
              setSelectedPacchettoClienteId(firstPkg.id);
              setSelectedNumeroSeduta(nextSeduta.numero_seduta);
              // Salva prezzo e trattamento corrente, azzera prezzo
              prezzoPrePacchettoRef.current = prezzoApplicato;
              trattamentoPrePacchettoRef.current = trattamentoId;
              setPrezzoApplicato('0');
            } else {
              setCollegaPacchetto(false);
              // Ripristina prezzo e trattamento precedenti
              setPrezzoApplicato(prezzoPrePacchettoRef.current);
              setTrattamentoId(trattamentoPrePacchettoRef.current);
              setSelectedPacchettoClienteId('');
              setSelectedNumeroSeduta(0);
              setTrattamentiPacchetto([]);
              setSelectedTrattamentiPkgIds([]);
            }
          };

          return (
            <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} style={{ color: 'var(--color-primary)' }} />
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Pacchetto</span>
                </div>
                {/* Toggle collega */}
                {!sedutaLinkata && (
                  <button type="button" onClick={() => handleToggleCollega(!collegaPacchetto)}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                    style={{
                      background: collegaPacchetto ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'var(--glass-border)',
                      color: collegaPacchetto ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    }}>
                    {collegaPacchetto ? 'Collegato' : 'Collega a pacchetto'}
                  </button>
                )}
              </div>

              {/* Seduta già linkata (edit mode) */}
              {sedutaLinkata && (() => {
                const payPct = sedutaLinkata.importo_totale > 0 ? Math.min(100, Math.round((sedutaLinkata.importo_pagato / sedutaLinkata.importo_totale) * 100)) : 0;
                return (
                  <div className="rounded-xl p-3 space-y-2.5" style={{ background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        Seduta {sedutaLinkata.numero_seduta} di {sedutaLinkata.sedute_totali}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: sedutaLinkata.stato_seduta === 'completata' ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' : 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: sedutaLinkata.stato_seduta === 'completata' ? 'var(--color-success)' : 'var(--color-primary)' }}>
                        {sedutaLinkata.stato_seduta === 'completata' ? 'Completata' : 'Pianificata'}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{sedutaLinkata.pacchetto_nome}</p>

                    {/* Progress sedute */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-12 shrink-0" style={{ color: 'var(--color-text-muted)' }}>Sedute</span>
                      <div className="flex items-center gap-1 flex-1">
                        {Array.from({ length: sedutaLinkata.sedute_totali }, (_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < sedutaLinkata.sedute_completate ? 'var(--color-success)' : 'var(--glass-border)' }} />
                        ))}
                        <span className="text-[10px] ml-1" style={{ color: 'var(--color-text-muted)' }}>{sedutaLinkata.sedute_completate}/{sedutaLinkata.sedute_totali}</span>
                      </div>
                    </div>

                    {/* Progress pagamento */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-12 shrink-0" style={{ color: 'var(--color-text-muted)' }}>Pagato</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${payPct}%`, background: payPct >= 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                      </div>
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>{formatPrice(sedutaLinkata.importo_pagato)} / {formatPrice(sedutaLinkata.importo_totale)}</span>
                    </div>

                    {/* Prezzo appuntamento */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-12 shrink-0" style={{ color: 'var(--color-text-muted)' }}>Prezzo</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>€0 — incluso nel pacchetto</span>
                    </div>

                    {sedutaLinkata.stato_seduta === 'pianificata' && (
                      <button type="button" onClick={() => { setCollegaPacchetto(false); setWasUnlinked(true); setSedutaLinkata(null); setPrezzoApplicato(prezzoPrePacchettoRef.current); setTrattamentoId(trattamentoPrePacchettoRef.current); setTrattamentiPacchetto([]); setSelectedTrattamentiPkgIds([]); }}
                        className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        Scollega dal pacchetto
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Selezione pacchetto/seduta (create mode o nuovo collegamento) */}
              {collegaPacchetto && !sedutaLinkata && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Pacchetto</label>
                    <select value={selectedPacchettoClienteId}
                      onChange={e => {
                        const pkgId = e.target.value;
                        setSelectedPacchettoClienteId(pkgId);
                        const sedute = seduteDisponibili.get(pkgId) || [];
                        const next = sedute.find(s => s.stato === 'pianificata' && !s.appuntamento_id);
                        setSelectedNumeroSeduta(next?.numero_seduta || 1);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-sm"
                      style={{ background: 'var(--input-bg, var(--card-bg))', border: '1.5px solid var(--glass-border)', color: 'var(--color-text-primary)', outline: 'none' }}>
                      {pacchettiDisponibili.map(pc => (
                        <option key={pc.id} value={pc.id}>
                          {pc.pacchetto_nome} — sed. {pc.sedute_completate}/{pc.sedute_totali}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPacchettoClienteId && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Seduta</label>
                      <select value={selectedNumeroSeduta}
                        onChange={e => setSelectedNumeroSeduta(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl text-sm"
                        style={{ background: 'var(--input-bg, var(--card-bg))', border: '1.5px solid var(--glass-border)', color: 'var(--color-text-primary)', outline: 'none' }}>
                        {seduteLibere.map(s => (
                          <option key={s.id} value={s.numero_seduta}>
                            Seduta {s.numero_seduta}{s.numero_seduta === seduteLibere[0]?.numero_seduta ? ' (prossima)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Trattamenti del pacchetto — checklist multi-selezione */}
                  {trattamentiPacchetto.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                        Trattamenti {selectedTrattamentiPkgIds.length > 0 && <span style={{ color: 'var(--color-primary)' }}>({selectedTrattamentiPkgIds.length})</span>}
                      </label>
                      <div className="rounded-xl p-2 space-y-0.5" style={{ background: 'var(--input-bg, var(--card-bg))', border: '1.5px solid var(--glass-border)' }}>
                        {trattamentiPacchetto.map(t => {
                          const checked = selectedTrattamentiPkgIds.includes(t.trattamento_id);
                          const trattamento = trattamenti.find(tr => tr.id === t.trattamento_id);
                          return (
                            <button key={t.trattamento_id} type="button"
                              onClick={() => {
                                const newIds = checked
                                  ? selectedTrattamentiPkgIds.filter(id => id !== t.trattamento_id)
                                  : [...selectedTrattamentiPkgIds, t.trattamento_id];
                                setSelectedTrattamentiPkgIds(newIds);
                                // Il primo selezionato diventa il trattamentoId principale
                                setTrattamentoId(newIds[0] || '');
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
                              style={{ background: checked ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent' }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                                style={{ background: checked ? 'var(--color-primary)' : 'transparent', border: checked ? 'none' : '1.5px solid var(--glass-border)' }}>
                                {checked && <Check size={11} className="text-white" />}
                              </div>
                              <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{t.trattamento_nome}</span>
                              {trattamento && <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>{trattamento.durata_minuti} min</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Riepilogo strutturato */}
                  {selectedPkg && selectedNumeroSeduta > 0 && (() => {
                    const payPct = selectedPkg.importo_totale > 0 ? Math.min(100, Math.round((selectedPkg.importo_pagato / selectedPkg.importo_totale) * 100)) : 0;
                    return (
                      <div className="rounded-xl p-3 space-y-2.5" style={{ background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            Seduta {selectedNumeroSeduta} di {selectedPkg.sedute_totali}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{selectedPkg.pacchetto_nome}</p>

                        {/* Progress sedute */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] w-12 shrink-0" style={{ color: 'var(--color-text-muted)' }}>Sedute</span>
                          <div className="flex items-center gap-1 flex-1">
                            {Array.from({ length: Math.min(selectedPkg.sedute_totali, 15) }, (_, i) => (
                              <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < selectedPkg.sedute_completate ? 'var(--color-success)' : i === selectedPkg.sedute_completate ? 'var(--color-primary)' : 'var(--glass-border)' }} />
                            ))}
                            <span className="text-[10px] ml-1" style={{ color: 'var(--color-text-muted)' }}>{selectedPkg.sedute_completate}/{selectedPkg.sedute_totali}</span>
                          </div>
                        </div>

                        {/* Progress pagamento */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] w-12 shrink-0" style={{ color: 'var(--color-text-muted)' }}>Pagato</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
                            <div className="h-full rounded-full" style={{ width: `${payPct}%`, background: payPct >= 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                          </div>
                          <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>{formatPrice(selectedPkg.importo_pagato)} / {formatPrice(selectedPkg.importo_totale)}</span>
                        </div>

                        {/* Prezzo */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] w-12 shrink-0" style={{ color: 'var(--color-text-muted)' }}>Prezzo</span>
                          <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>€0 — incluso nel pacchetto</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })()}

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
            {/* Trattamento: nascosto quando collegato a pacchetto (il trattamento si sceglie nella sezione Pacchetto) */}
            {!collegaPacchetto && (
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
            )}
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Prezzo (€)</label>
                <button type="button" disabled={isLoading}
                  onClick={() => {
                    const next = !omaggio;
                    setOmaggio(next);
                    if (next) setPrezzoApplicato('0');
                  }}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all"
                  style={{
                    background: omaggio ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' : 'transparent',
                    color: omaggio ? 'var(--color-success)' : 'var(--color-text-muted)',
                    border: omaggio ? '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)' : '1px solid transparent',
                  }}>
                  <Gift size={11} />
                  {omaggio ? 'Omaggio' : 'Omaggio'}
                </button>
              </div>
              <input type="number" step="0.01" min="0"
                value={prezzoApplicato}
                onChange={(e) => setPrezzoApplicato(e.target.value)}
                disabled={isLoading || omaggio}
                placeholder={omaggio ? 'Omaggio — €0' : 'Es: 50.00'}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm"
                style={{
                  background: omaggio ? 'color-mix(in srgb, var(--color-success) 5%, var(--input-bg, var(--card-bg)))' : 'var(--input-bg, var(--card-bg))',
                  border: omaggio ? '1.5px solid color-mix(in srgb, var(--color-success) 25%, transparent)' : '1.5px solid var(--glass-border)',
                  color: omaggio ? 'var(--color-success)' : 'var(--color-text-primary)',
                  outline: 'none',
                  opacity: omaggio ? 0.7 : 1,
                }} />
            </div>
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
              mode="uso"
            />
          </div>
        )}

        {/* Sezione Articoli Acquistati - visibile solo quando stato = completato */}
        {stato === 'completato' && (
          <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <ProdottiUsatiSection
              appuntamentoId={selectedAppuntamento?.id}
              operatriceId={operatriceId}
              onProdottiChange={setProdottiAcquistati}
              disabled={isLoading}
              mode="vendita"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-5 mt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
          {modalMode === 'edit' && !showDeleteConfirm && (
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              className="gap-1.5"
            >
              <Trash2 size={16} />
              Elimina
            </Button>
          )}
          {modalMode === 'edit' && showDeleteConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--color-danger, #ef4444)' }}>Confermi?</span>
              <Button type="button" variant="danger" onClick={handleDelete} disabled={isLoading} size="sm">Sì, elimina</Button>
              <Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(false)} size="sm">No</Button>
            </div>
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
