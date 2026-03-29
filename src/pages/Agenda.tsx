import React, { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { EventResizeDoneArg } from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X, FileDown, AlertTriangle, Check, XCircle, UserX } from 'lucide-react';
import { useAgendaStore } from '../stores/agendaStore';
import { AppuntamentoModal } from '../components/agenda/AppuntamentoModal';
import { ExportModal } from '../components/agenda/ExportModal';
import { WeekViewCalendar } from '../components/agenda/WeekViewCalendar';
import { Button } from '../components/ui/Button';
import { pacchettiService, type SedutaConPacchetto } from '../services/pacchetti';
import type { AppuntamentoWithDetails } from '../types/agenda';
import type { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';

interface AgendaProps {
  openAppuntamentoId?: string | null;
  onAppuntamentoOpened?: () => void;
}

export const Agenda: React.FC<AgendaProps> = ({ openAppuntamentoId, onAppuntamentoOpened }) => {
  const calendarRef = useRef<FullCalendar>(null);

  const {
    operatrici,
    appuntamenti,
    selectedDate,
    selectedOperatriciIds,
    viewMode,
    isLoading,
    loadOperatrici,
    loadAppuntamenti,
    aggiornaStatiAutomatici,
    setSelectedDate,
    setSelectedOperatrici,
    setViewMode,
    openCreateModal,
    openEditModal,
    openEditModalById,
    updateAppuntamento,
  } = useAgendaStore();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showOperatriciFilter, setShowOperatriciFilter] = useState(false);
  const [showInattive, setShowInattive] = useState(false);
  const [pendingAppuntamenti, setPendingAppuntamenti] = useState<AppuntamentoWithDetails[]>([]);
  const [showPendingPopup, setShowPendingPopup] = useState(false);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  // Tiene traccia dei giorni già controllati per non riaprire il popup navigando via e tornando
  const checkedDaysRef = useRef<Set<string>>(new Set());

  // Carica operatrici all'avvio e quando si cambia vista
  useEffect(() => {
    loadOperatrici();
  }, [viewMode, loadOperatrici]);

  // Pulisce i filtri operatrici non più validi (es. operatore disattivato)
  useEffect(() => {
    if (operatrici.length > 0 && selectedOperatriciIds.length > 0) {
      const validOperatriciIds = operatrici.map(op => op.id);
      const cleanedSelection = selectedOperatriciIds.filter(id => validOperatriciIds.includes(id));

      // Se alcuni ID non sono più validi, aggiorna la selezione
      if (cleanedSelection.length !== selectedOperatriciIds.length) {
        setSelectedOperatrici(cleanedSelection.length === validOperatriciIds.length ? [] : cleanedSelection);
      }
    }
  }, [operatrici, selectedOperatriciIds, setSelectedOperatrici]);

  // Apri appuntamento specifico se richiesto
  useEffect(() => {
    if (openAppuntamentoId) {
      openEditModalById(openAppuntamentoId)
        .then(() => {
          onAppuntamentoOpened?.();
        })
        .catch((error) => {
          console.error('Errore apertura appuntamento:', error);
          onAppuntamentoOpened?.();
        });
    }
  }, [openAppuntamentoId, openEditModalById, onAppuntamentoOpened]);

  // Polling automatico ogni minuto per aggiornare stati
  useEffect(() => {
    const interval = setInterval(() => {
      aggiornaStatiAutomatici();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Listener per quick actions dalla ricerca globale
  useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent).detail;
      if (action === 'nuovo') openCreateModal(new Date(), '');
    };
    window.addEventListener('agendaAction', handler);
    return () => window.removeEventListener('agendaAction', handler);
  }, []);

  // Carica appuntamenti quando cambia la data o la vista
  useEffect(() => {
    const loadData = async () => {
      await aggiornaStatiAutomatici();

      if (viewMode === 'day') {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        await loadAppuntamenti(startOfDay, endOfDay);
      } else {
        // Vista settimana/mese: carica l'intero mese per avere tutti i dati
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        await loadAppuntamenti(startOfMonth, endOfMonth);
      }
    };

    loadData();
  }, [selectedDate, viewMode]);

  // Cambia vista quando viewMode cambia
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi && viewMode !== 'week') {
      if (viewMode === 'day') {
        calendarApi.changeView('resourceTimeGridDay');
      } else if (viewMode === 'month') {
        calendarApi.changeView('dayGridMonth');
      }
    }
  }, [viewMode]);

  // Controlla appuntamenti non risolti (recap fine giornata)
  const wasLoadingRef = useRef(false);
  const [recapPrezzi, setRecapPrezzi] = useState<Map<string, string>>(new Map());
  const [recapSedute, setRecapSedute] = useState<Map<string, SedutaConPacchetto>>(new Map());
  const [showCompletati, setShowCompletati] = useState(false);

  useEffect(() => {
    if (isLoading) { wasLoadingRef.current = true; return; }
    if (!wasLoadingRef.current) return;
    wasLoadingRef.current = false;

    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selDay = new Date(selectedDate); selDay.setHours(0, 0, 0, 0);
    const dayKey = selDay.toISOString().slice(0, 10);

    if (checkedDaysRef.current.has(dayKey) || viewMode !== 'day') return;

    const isPast = selDay < today;
    const isToday = selDay.getTime() === today.getTime();
    const isAfterClosing = isToday && now.getHours() >= 19;

    if (!isPast && !isAfterClosing) return;

    const nonRisolti = appuntamenti.filter(a => a.stato === 'prenotato' || a.stato === 'in_corso');
    checkedDaysRef.current.add(dayKey);

    if (nonRisolti.length > 0) {
      setPendingAppuntamenti(nonRisolti);
      setShowPendingPopup(true);
      // Pre-compila i prezzi
      const prezziMap = new Map<string, string>();
      nonRisolti.forEach(a => { prezziMap.set(a.id, a.prezzo_applicato?.toString() || ''); });
      setRecapPrezzi(prezziMap);
      // Carica info pacchetto per ogni appuntamento
      const seduteMap = new Map<string, SedutaConPacchetto>();
      Promise.all(nonRisolti.map(a =>
        pacchettiService.getSedutaByAppuntamento(a.id).then(s => { if (s) seduteMap.set(a.id, s); }).catch(e => console.error('Errore caricamento seduta pacchetto:', e))
      )).then(() => setRecapSedute(new Map(seduteMap)));
    }
  }, [appuntamenti, selectedDate, viewMode, isLoading]);

  const handleResolvePending = async (appId: string, nuovoStato: 'completato' | 'annullato' | 'no_show') => {
    setUpdatingAppId(appId);
    try {
      // Aggiorna prezzo se modificato
      const prezzoStr = recapPrezzi.get(appId);
      const prezzo = prezzoStr ? parseFloat(prezzoStr) : undefined;
      await updateAppuntamento(appId, { stato: nuovoStato, prezzo_applicato: prezzo });
      // Completa seduta pacchetto se collegata e stato = completato
      if (nuovoStato === 'completato') {
        const seduta = recapSedute.get(appId);
        if (seduta && seduta.stato_seduta === 'pianificata') {
          await pacchettiService.completaSedutaById(seduta.seduta_id, appId);
        }
      }
      // Scollega seduta pacchetto se annullato/no_show
      if (nuovoStato === 'annullato' || nuovoStato === 'no_show') {
        try { await pacchettiService.scollegaSedutaAppuntamento(appId); } catch { /* ignora */ }
      }
      setPendingAppuntamenti(prev => {
        const remaining = prev.filter(a => a.id !== appId);
        if (remaining.length === 0) setShowPendingPopup(false);
        return remaining;
      });
    } catch (err) {
      console.error('Errore aggiornamento stato:', err);
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleResolveAllPending = async () => {
    setUpdatingAppId('bulk');
    try {
      for (const app of pendingAppuntamenti) {
        const prezzoStr = recapPrezzi.get(app.id);
        const prezzo = prezzoStr ? parseFloat(prezzoStr) : undefined;
        await updateAppuntamento(app.id, { stato: 'completato', prezzo_applicato: prezzo });
        const seduta = recapSedute.get(app.id);
        if (seduta && seduta.stato_seduta === 'pianificata') {
          await pacchettiService.completaSedutaById(seduta.seduta_id, app.id);
        }
      }
      setPendingAppuntamenti([]);
      setShowPendingPopup(false);
    } catch (err) {
      console.error('Errore bulk completamento:', err);
    } finally {
      setUpdatingAppId(null);
    }
  };

  const closeRecapPopup = () => {
    setShowPendingPopup(false);
    // Se ci sono ancora appuntamenti non risolti, rimuovi il giorno dal cache
    // cosi' il popup si rimostra quando l'utente torna
    if (pendingAppuntamenti.length > 0) {
      const dayKey = new Date(selectedDate).toISOString().slice(0, 10);
      checkedDaysRef.current.delete(dayKey);
    }
  };

  // Separa operatrici attive e inattive
  const operatriciAttive = operatrici.filter(op => op.attiva);
  const operatriciInattive = operatrici.filter(op => !op.attiva);

  // Operatrici da mostrare (attive + inattive se showInattive è true)
  const operatriciVisibili = showInattive
    ? [...operatriciAttive, ...operatriciInattive]
    : operatriciAttive;

  // Prepara le risorse (operatrici) per FullCalendar
  const resources = operatriciVisibili
    .filter(op => selectedOperatriciIds.length === 0 || selectedOperatriciIds.includes(op.id))
    .map((op) => ({
      id: op.id,
      title: op.attiva ? `${op.nome} ${op.cognome}` : `${op.nome} ${op.cognome} (inattiva)`,
      eventColor: op.attiva ? op.colore_agenda : '#9CA3AF', // Grigio per inattive
    }));

  // Toggle singola operatrice
  const toggleOperatrice = (id: string) => {
    if (selectedOperatriciIds.length === 0) {
      // Modalità "tutte" -> seleziona solo questa
      setSelectedOperatrici([id]);
    } else if (selectedOperatriciIds.includes(id)) {
      // È selezionata -> deseleziona
      const newSelection = selectedOperatriciIds.filter(opId => opId !== id);
      setSelectedOperatrici(newSelection.length === 0 ? [] : newSelection);
    } else {
      // Non è selezionata -> aggiungi
      const newSelection = [...selectedOperatriciIds, id];
      // Se tutte le visibili sono selezionate, torna a "mostra tutte"
      setSelectedOperatrici(newSelection.length === operatriciVisibili.length ? [] : newSelection);
    }
  };

  const selectAllOperatrici = () => {
    setSelectedOperatrici([]);
  };

  // Prepara gli eventi per FullCalendar (filtrati per operatore selezionato e visibilità inattive)
  const operatriciVisibiliIds = operatriciVisibili.map(op => op.id);
  const filteredAppuntamenti = appuntamenti
    .filter(app => operatriciVisibiliIds.includes(app.operatrice_id)) // Filtra per operatrici visibili
    .filter(app => selectedOperatriciIds.length === 0 || selectedOperatriciIds.includes(app.operatrice_id));

  const events = filteredAppuntamenti.map((app) => ({
    id: app.id,
    resourceId: app.operatrice_id,
    title: `${app.cliente_nome} ${app.cliente_cognome} - ${app.trattamento_nome}`,
    classNames: app.omaggio ? ['fc-event-omaggio'] : [],
    start: new Date(app.data_ora_inizio),
    end: new Date(app.data_ora_fine),
    backgroundColor: app.operatrice_colore,
    borderColor: app.operatrice_colore,
    extendedProps: { appuntamento: app },
  }));

  const handleEventClick = async (info: EventClickArg) => {
    // Usa openEditModalById che carica i dati freschi dal backend
    // per evitare problemi di sincronizzazione dopo resize/drop
    const eventId = info.event.id;
    if (eventId) {
      await openEditModalById(eventId);
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    let resourceId = selectInfo.resource?.id;
    if (!resourceId && resources.length > 0) {
      resourceId = resources[0].id;
    }
    if (resourceId) {
      openCreateModal(selectInfo.start, resourceId);
      selectInfo.view.calendar.unselect();
    }
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const appuntamento = info.event.extendedProps.appuntamento;
    const newResourceId = info.event.getResources()[0]?.id;

    if (!appuntamento) return;

    try {
      await updateAppuntamento(appuntamento.id, {
        data_ora_inizio: info.event.start?.toISOString(),
        data_ora_fine: info.event.end?.toISOString(),
        operatrice_id: newResourceId || appuntamento.operatrice_id,
      });
    } catch (err) {
      console.error('Errore spostamento appuntamento:', err);
      info.revert();
    }
  };

  const handleEventResize = async (info: EventResizeDoneArg) => {
    const appuntamento = info.event.extendedProps.appuntamento;

    if (!appuntamento) return;

    try {
      await updateAppuntamento(appuntamento.id, {
        data_ora_inizio: info.event.start?.toISOString(),
        data_ora_fine: info.event.end?.toISOString(),
      });
    } catch (err) {
      console.error('Errore ridimensionamento appuntamento:', err);
      info.revert();
    }
  };

  const goToPrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
    calendarRef.current?.getApi().gotoDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    calendarRef.current?.getApi().gotoDate(newDate);
  };

  const goToPrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToPrevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
    calendarRef.current?.getApi().gotoDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
    calendarRef.current?.getApi().gotoDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    calendarRef.current?.getApi().gotoDate(today);
  };

  const formatDate = (date: Date) => {
    if (viewMode === 'month') {
      // Per la vista mese, mostra solo mese e anno
      return new Intl.DateTimeFormat('it-IT', {
        year: 'numeric',
        month: 'long',
      }).format(date);
    }
    if (viewMode === 'week') {
      // Per la vista settimana, mostra il range
      const weekStart = new Date(date);
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diff);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startDay = weekStart.getDate();
      const endDay = weekEnd.getDate();
      const month = weekStart.toLocaleDateString('it-IT', { month: 'long' });
      const year = weekStart.getFullYear();

      return `${startDay} - ${endDay} ${month} ${year}`;
    }
    return new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const handleWeekAppuntamentoClick = (app: AppuntamentoWithDetails) => {
    openEditModal(app);
  };

  const handleWeekDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  // Conta operatrici visibili (solo quelle effettivamente mostrate)
  const visibleOperatriciCount = selectedOperatriciIds.length === 0
    ? operatriciVisibili.length
    : selectedOperatriciIds.filter(id => operatriciVisibili.some(op => op.id === id)).length;

  return (
    <>
      <AppuntamentoModal />

      {/* Recap fine giornata */}
      {showPendingPopup && pendingAppuntamenti.length > 0 && (() => {
        const completati = appuntamenti.filter(a => a.stato === 'completato');
        const annullati = appuntamenti.filter(a => a.stato === 'annullato' || a.stato === 'no_show');
        const totalGiornata = appuntamenti.length;
        const isBulkUpdating = updatingAppId === 'bulk';

        return (
          <>
            <div className="fixed inset-0 z-[100]" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={closeRecapPopup} />
            <div className="fixed inset-0 z-[101] overflow-y-auto pointer-events-none">
              <div className="min-h-full flex items-start justify-center p-4 pt-[6vh]">
                <div className="pointer-events-auto relative w-full max-w-xl rounded-2xl shadow-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }} onClick={e => e.stopPropagation()}>

                  {/* Header */}
                  <div className="flex items-center gap-3 px-6 py-4 rounded-t-2xl" style={{ background: 'color-mix(in srgb, var(--color-warning) 12%, var(--card-bg))', borderBottom: '1px solid var(--glass-border)' }}>
                    <CalendarIcon size={20} style={{ color: 'var(--color-primary)' }} />
                    <div className="flex-1">
                      <h3 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        Recap Giornata
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {totalGiornata} appuntament{totalGiornata === 1 ? 'o' : 'i'} · {completati.length} completat{completati.length === 1 ? 'o' : 'i'} · <span style={{ color: 'var(--color-warning)' }}>{pendingAppuntamenti.length} da risolvere</span>
                      </p>
                    </div>
                    <button onClick={closeRecapPopup} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <X size={16} />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto">
                    {/* Da risolvere */}
                    <div className="px-6 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                        <AlertTriangle size={12} /> Da risolvere ({pendingAppuntamenti.length})
                      </p>
                      <div className="space-y-3">
                        {pendingAppuntamenti.map(app => {
                          const ora = new Date(app.data_ora_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                          const isUpdating = updatingAppId === app.id || isBulkUpdating;
                          const sedutaInfo = recapSedute.get(app.id);
                          const prezzoVal = recapPrezzi.get(app.id) || '';

                          return (
                            <div key={app.id} className="rounded-xl p-3 space-y-2.5" style={{ background: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', border: '1px solid var(--glass-border)' }}>
                              {/* Info appuntamento */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                    {app.omaggio && <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mr-1.5" style={{ background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' }}>OMG</span>}
                                    {app.cliente_nome} {app.cliente_cognome}
                                  </p>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    {ora} · {app.trattamento_nome} · {app.operatrice_nome} {app.operatrice_cognome}
                                  </p>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', color: 'var(--color-warning)' }}>
                                  {app.stato}
                                </span>
                              </div>

                              {/* Badge pacchetto */}
                              {sedutaInfo && (
                                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)' }}>
                                  <span className="text-[10px] font-semibold" style={{ color: 'var(--color-primary)' }}>📦</span>
                                  <span className="text-[11px]" style={{ color: 'var(--color-text-primary)' }}>
                                    Seduta {sedutaInfo.numero_seduta}/{sedutaInfo.sedute_totali} — {sedutaInfo.pacchetto_nome}
                                  </span>
                                </div>
                              )}

                              {/* Prezzo */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>Prezzo €</span>
                                {sedutaInfo ? (
                                  <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>€0 — pacchetto</span>
                                ) : (
                                  <>
                                    <input type="number" step="0.01" min="0" value={prezzoVal}
                                      onChange={e => setRecapPrezzi(prev => { const m = new Map(prev); m.set(app.id, e.target.value); return m; })}
                                      className="flex-1 px-2.5 py-1 rounded-lg text-xs"
                                      style={{ background: 'var(--input-bg, var(--card-bg))', border: prezzoVal ? '1px solid var(--glass-border)' : '1px solid color-mix(in srgb, var(--color-warning) 40%, transparent)', color: 'var(--color-text-primary)', outline: 'none', maxWidth: 120 }}
                                      placeholder="Da inserire" />
                                    {!prezzoVal && (
                                      <span className="text-[9px] font-medium" style={{ color: 'var(--color-warning)' }}>mancante</span>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Bottoni azione */}
                              <div className="flex gap-2">
                                <button onClick={() => handleResolvePending(app.id, 'completato')} disabled={isUpdating}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                                  style={{ background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-success) 25%, transparent)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-success) 15%, transparent)'; }}>
                                  <Check size={14} />Completato
                                </button>
                                <button onClick={() => handleResolvePending(app.id, 'annullato')} disabled={isUpdating}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                                  style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)', color: 'var(--color-danger)' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger) 25%, transparent)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger) 15%, transparent)'; }}>
                                  <XCircle size={14} />Annullato
                                </button>
                                <button onClick={() => handleResolvePending(app.id, 'no_show')} disabled={isUpdating}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                                  style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text-muted) 20%, transparent)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}>
                                  <UserX size={14} />No Show
                                </button>
                                {(updatingAppId === app.id) && (
                                  <div className="flex items-center ml-2">
                                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'var(--color-primary)' }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Completati (collassabile) */}
                    {completati.length > 0 && (
                      <div className="px-6 pb-4">
                        <button onClick={() => setShowCompletati(!showCompletati)}
                          className="w-full flex items-center justify-between py-2 text-left" style={{ borderTop: '1px solid var(--glass-border)' }}>
                          <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 pt-2" style={{ color: 'var(--color-success)' }}>
                            <Check size={12} /> Completati ({completati.length})
                          </span>
                          <span className="text-[10px] pt-2" style={{ color: 'var(--color-text-muted)' }}>{showCompletati ? 'nascondi' : 'mostra'}</span>
                        </button>
                        {showCompletati && (
                          <div className="space-y-1 mt-2">
                            {completati.map(app => {
                              const ora = new Date(app.data_ora_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                              return (
                                <div key={app.id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'color-mix(in srgb, var(--color-success) 4%, transparent)' }}>
                                  <span style={{ color: 'var(--color-text-muted)' }}>{ora}</span>
                                  <span className="font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>{app.cliente_nome} {app.cliente_cognome}</span>
                                  <span style={{ color: 'var(--color-text-secondary)' }}>{app.trattamento_nome}</span>
                                  {app.prezzo_applicato != null && <span style={{ color: 'var(--color-text-muted)' }}>€{app.prezzo_applicato.toFixed(2)}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Annullati/No Show */}
                    {annullati.length > 0 && (
                      <div className="px-6 pb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                          <XCircle size={12} /> Annullati / No Show ({annullati.length})
                        </p>
                        <div className="space-y-1">
                          {annullati.map(app => {
                            const ora = new Date(app.data_ora_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={app.id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs" style={{ opacity: 0.6 }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>{ora}</span>
                                <span className="font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>{app.cliente_nome} {app.cliente_cognome}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)', color: 'var(--color-danger)' }}>{app.stato}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 flex items-center justify-between rounded-b-2xl" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    {pendingAppuntamenti.length > 1 && (
                      <button onClick={handleResolveAllPending} disabled={isBulkUpdating}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                        style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-success) 22%, transparent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-success) 12%, transparent)'; }}>
                        <Check size={14} />Completa tutti
                        {isBulkUpdating && <div className="w-3 h-3 border-2 rounded-full animate-spin ml-1" style={{ borderColor: 'transparent', borderTopColor: 'var(--color-success)' }} />}
                      </button>
                    )}
                    <Button variant="secondary" size="sm" onClick={closeRecapPopup}>Chiudi</Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          selectedDate={selectedDate}
          selectedOperatriciIds={selectedOperatriciIds}
          operatrici={operatrici}
        />
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {/* Header con controlli */}
        <div className="mb-4 flex items-center justify-between animate-fade-in-up">
          <div>
            <h2
              className="text-xl font-semibold capitalize"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {formatDate(selectedDate)}
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {visibleOperatriciCount} operator{visibleOperatriciCount === 1 ? 'e' : 'i'} • {filteredAppuntamenti.length} appuntament{filteredAppuntamenti.length === 1 ? 'o' : 'i'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Vista */}
            <div
              className="flex rounded-xl p-1"
              style={{ background: 'var(--card-hover)' }}
            >
              <button
                onClick={() => setViewMode('day')}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
                style={{
                  background: viewMode === 'day' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'day' ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                Giorno
              </button>
              <button
                onClick={() => setViewMode('week')}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
                style={{
                  background: viewMode === 'week' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'week' ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                Settimana
              </button>
              <button
                onClick={() => setViewMode('month')}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
                style={{
                  background: viewMode === 'month' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'month' ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                Mese
              </button>
            </div>

            {/* Filtro Operatrici */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOperatriciFilter(!showOperatriciFilter)}
                className="gap-2"
              >
                <Filter size={16} />
                Operatori
                {selectedOperatriciIds.length > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-xs rounded-full"
                    style={{ background: 'var(--color-primary)', color: 'white' }}
                  >
                    {selectedOperatriciIds.length}
                  </span>
                )}
              </Button>

              {/* Dropdown Filtro */}
              {showOperatriciFilter && (
                <div
                  className="absolute right-0 mt-2 w-72 rounded-xl shadow-xl z-50"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--glass-border)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div
                    className="p-3 flex justify-between items-center"
                    style={{ borderBottom: '1px solid var(--glass-border)' }}
                  >
                    <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      Filtra Operatori
                    </span>
                    <button
                      onClick={() => setShowOperatriciFilter(false)}
                      className="p-1 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {/* Mostra tutte */}
                    <button
                      onClick={selectAllOperatrici}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors"
                      style={{
                        background: selectedOperatriciIds.length === 0
                          ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
                          : 'transparent',
                        color: 'var(--color-primary)',
                        fontWeight: selectedOperatriciIds.length === 0 ? 500 : 400,
                      }}
                    >
                      Mostra tutte ({operatriciVisibili.length})
                    </button>
                    <div className="my-2" style={{ borderTop: '1px solid var(--glass-border)' }} />

                    {/* Lista operatrici visibili */}
                    {operatriciVisibili.map((op) => {
                      const isSelected = selectedOperatriciIds.length === 0 || selectedOperatriciIds.includes(op.id);
                      const displayColor = op.attiva ? op.colore_agenda : '#9CA3AF';

                      return (
                        <button
                          key={op.id}
                          onClick={() => toggleOperatrice(op.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isSelected ? '' : 'opacity-50'
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                            style={{
                              borderColor: isSelected ? displayColor : 'var(--color-text-muted)',
                              backgroundColor: isSelected ? displayColor : 'transparent',
                            }}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span
                            className="text-sm flex items-center gap-2"
                            style={{ color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                          >
                            {op.nome} {op.cognome}
                            {!op.attiva && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                inattiva
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}

                    {/* Toggle mostra inattive - solo se ce ne sono */}
                    {operatriciInattive.length > 0 && (
                      <>
                        <div className="my-2" style={{ borderTop: '1px solid var(--glass-border)' }} />
                        <button
                          onClick={() => setShowInattive(!showInattive)}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {showInattive ? 'Nascondi' : 'Mostra'} inattive ({operatriciInattive.length})
                        </button>
                      </>
                    )}
                  </div>

                  {/* Footer info */}
                  {selectedOperatriciIds.length > 0 && (
                    <div
                      className="px-3 py-2 rounded-b-xl"
                      style={{
                        borderTop: '1px solid var(--glass-border)',
                        background: 'var(--card-hover)',
                      }}
                    >
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {selectedOperatriciIds.length} di {operatrici.length} operatori visibili
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Esporta */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="gap-2"
            >
              <FileDown size={16} />
              Esporta
            </Button>

            {/* Navigazione Data */}
            <Button
              variant="secondary"
              size="sm"
              onClick={viewMode === 'day' ? goToPrevDay : viewMode === 'week' ? goToPrevWeek : goToPrevMonth}
              className="!px-3"
            >
              <ChevronLeft size={20} />
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={goToToday}
              className="gap-2"
            >
              <CalendarIcon size={16} />
              Oggi
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={viewMode === 'day' ? goToNextDay : viewMode === 'week' ? goToNextWeek : goToNextMonth}
              className="!px-3"
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </div>

        {/* Calendario */}
        <div
          className="flex-1 rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
                  style={{
                    border: '4px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
                    borderTopColor: 'var(--color-primary)',
                  }}
                />
                <p style={{ color: 'var(--color-text-secondary)' }}>Caricamento...</p>
              </div>
            </div>
          ) : viewMode === 'week' ? (
            <WeekViewCalendar
              selectedDate={selectedDate}
              appuntamenti={filteredAppuntamenti}
              operatrici={operatriciVisibili}
              selectedOperatriciIds={selectedOperatriciIds}
              onDateClick={handleWeekDateClick}
              onAppuntamentoClick={handleWeekAppuntamentoClick}
            />
          ) : viewMode === 'month' ? (
            <FullCalendar
              key={`month-view-${selectedDate.getFullYear()}-${selectedDate.getMonth()}`}
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={selectedDate}
              locale={itLocale}
              height="100%"
              headerToolbar={false}
              events={events}
              editable={false}
              selectable={false}
              dayMaxEvents={3}
              eventClick={handleEventClick}
              dateClick={(info) => {
                setSelectedDate(info.date);
                setViewMode('day');
              }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
            />
          ) : resources.length > 0 ? (
            <FullCalendar
              key={`day-${resources.length}`}
              ref={calendarRef}
              plugins={[resourceTimeGridPlugin, dayGridPlugin, interactionPlugin]}
              schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
              initialView="resourceTimeGridDay"
              initialDate={selectedDate}
              locale={itLocale}
              height="100%"
              headerToolbar={false}
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              slotDuration="00:15:00"
              snapDuration="00:05:00"
              slotLabelInterval="01:00"
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              allDaySlot={false}
              resources={resources}
              events={events}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              eventClick={handleEventClick}
              select={handleDateSelect}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              resourceAreaHeaderContent="Operatori"
              resourceAreaWidth="160px"
              slotMinWidth={180}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              eventContent={(arg) => {
                const app = arg.event.extendedProps.appuntamento;
                const isOmaggio = app?.omaggio;
                return (
                  <div className="fc-event-main-frame" style={{ overflow: 'hidden', height: '100%', padding: '2px 4px', position: 'relative' }}>
                    <div className="fc-event-time" style={{ fontSize: '10px', fontWeight: 600, opacity: 0.85 }}>{arg.timeText}</div>
                    <div className="fc-event-title" style={{ fontSize: '11px', lineHeight: 1.2 }}>
                      {arg.event.title}
                    </div>
                    {isOmaggio && (
                      <span style={{
                        position: 'absolute', top: 2, right: 3,
                        fontSize: '8px', fontWeight: 800, letterSpacing: '0.5px',
                        padding: '1px 4px', borderRadius: '3px',
                        background: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.9)',
                      }}>OMG</span>
                    )}
                  </div>
                );
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p style={{ color: 'var(--color-text-secondary)' }}>Nessun operatore disponibile</p>
                <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Aggiungi operatori dalla sezione "Operatori"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
