import React, { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X, FileDown } from 'lucide-react';
import { useAgendaStore } from '../stores/agendaStore';
import { AppuntamentoModal } from '../components/agenda/AppuntamentoModal';
import { ExportModal } from '../components/agenda/ExportModal';
import { WeekViewCalendar } from '../components/agenda/WeekViewCalendar';
import { Button } from '../components/ui/Button';
import type { AppuntamentoWithDetails } from '../types/agenda';
import type { EventClickArg, DateSelectArg, EventDropArg, EventResizeDoneArg, DateClickArg } from '@fullcalendar/core';

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

  // Carica operatrici all'avvio e quando si cambia vista
  useEffect(() => {
    loadOperatrici();
  }, [viewMode]);

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
  }, [openAppuntamentoId]);

  // Polling automatico ogni minuto per aggiornare stati
  useEffect(() => {
    const interval = setInterval(() => {
      aggiornaStatiAutomatici();
    }, 60000);

    return () => clearInterval(interval);
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

  // Prepara le risorse (operatrici) per FullCalendar
  const resources = operatrici
    .filter(op => selectedOperatriciIds.length === 0 || selectedOperatriciIds.includes(op.id))
    .map((op) => ({
      id: op.id,
      title: `${op.nome} ${op.cognome}`,
      eventColor: op.colore_agenda,
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
      setSelectedOperatrici(newSelection.length === operatrici.length ? [] : newSelection);
    }
  };

  const selectAllOperatrici = () => {
    setSelectedOperatrici([]);
  };

  // Prepara gli eventi per FullCalendar
  const events = appuntamenti.map((app) => ({
    id: app.id,
    resourceId: app.operatrice_id,
    title: `${app.cliente_nome} ${app.cliente_cognome} - ${app.trattamento_nome}`,
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
    } catch {
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
    } catch {
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

  // Conta operatrici visibili
  const visibleOperatriciCount = selectedOperatriciIds.length === 0
    ? operatrici.length
    : selectedOperatriciIds.length;

  return (
    <>
      <AppuntamentoModal />
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
        <div className="mb-4 flex items-center justify-between">
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
              {visibleOperatriciCount} operator{visibleOperatriciCount === 1 ? 'e' : 'i'} • {appuntamenti.length} appuntament{appuntamenti.length === 1 ? 'o' : 'i'}
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
                      Mostra tutte ({operatrici.length})
                    </button>
                    <div className="my-2" style={{ borderTop: '1px solid var(--glass-border)' }} />

                    {/* Lista operatrici */}
                    {operatrici.map((op) => {
                      const isVisible = selectedOperatriciIds.length === 0 || selectedOperatriciIds.includes(op.id);

                      return (
                        <button
                          key={op.id}
                          onClick={() => toggleOperatrice(op.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isVisible ? '' : 'opacity-50'
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                            style={{
                              borderColor: isVisible ? op.colore_agenda : 'var(--color-text-muted)',
                              backgroundColor: isVisible ? op.colore_agenda : 'transparent',
                            }}
                          >
                            {isVisible && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span
                            className="text-sm"
                            style={{ color: isVisible ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                          >
                            {op.nome} {op.cognome}
                          </span>
                        </button>
                      );
                    })}
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
              appuntamenti={appuntamenti}
              operatrici={operatrici}
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
