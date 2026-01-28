import React from 'react';
import { AppuntamentoWithDetails, Operatrice } from '../../types/agenda';

interface WeekViewCalendarProps {
  selectedDate: Date;
  appuntamenti: AppuntamentoWithDetails[];
  operatrici: Operatrice[];
  selectedOperatriciIds: string[];
  onDateClick: (date: Date) => void;
  onAppuntamentoClick: (appuntamento: AppuntamentoWithDetails) => void;
}

export const WeekViewCalendar: React.FC<WeekViewCalendarProps> = ({
  selectedDate,
  appuntamenti,
  operatrici,
  selectedOperatriciIds,
  onDateClick,
  onAppuntamentoClick,
}) => {
  // Ottieni i giorni della settimana corrente
  const getWeekDays = (date: Date): Date[] => {
    const days: Date[] = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  // Filtra appuntamenti per giorno
  const getAppuntamentiForDay = (date: Date): AppuntamentoWithDetails[] => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return appuntamenti
      .filter((app) => {
        const appDate = new Date(app.data_ora_inizio);
        return appDate >= dayStart && appDate <= dayEnd;
      })
      .filter(
        (app) =>
          selectedOperatriciIds.length === 0 ||
          selectedOperatriciIds.includes(app.operatrice_id)
      )
      .sort(
        (a, b) =>
          new Date(a.data_ora_inizio).getTime() -
          new Date(b.data_ora_inizio).getTime()
      );
  };

  const isToday = (date: Date): boolean => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOperatriceColor = (operatriceId: string): string => {
    const op = operatrici.find((o) => o.id === operatriceId);
    return op?.colore_agenda || 'var(--color-primary)';
  };

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 flex">
        {weekDays.map((day, index) => {
          const dayAppuntamenti = getAppuntamentiForDay(day);
          const isTodayDate = isToday(day);
          const isWeekend = index >= 5;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col min-w-0"
              style={{
                borderRight: index < 6 ? '1px solid var(--glass-border)' : 'none',
                background: isWeekend
                  ? 'color-mix(in srgb, var(--bg-base) 50%, transparent)'
                  : 'transparent',
              }}
            >
              {/* Header del giorno */}
              <button
                onClick={() => onDateClick(day)}
                className="p-4 text-center transition-all hover:opacity-80"
                style={{
                  background: isTodayDate
                    ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                    : 'transparent',
                  borderBottom: '1px solid var(--glass-border)',
                }}
              >
                <div
                  className="text-xs font-medium uppercase tracking-wider mb-1"
                  style={{
                    color: isTodayDate ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)',
                  }}
                >
                  {dayNames[index]}
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color: isTodayDate ? 'white' : 'var(--color-text-primary)',
                  }}
                >
                  {day.getDate()}
                </div>
              </button>

              {/* Lista appuntamenti */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {dayAppuntamenti.map((app) => {
                  const color = getOperatriceColor(app.operatrice_id);
                  return (
                    <button
                      key={app.id}
                      onClick={() => onAppuntamentoClick(app)}
                      className="w-full rounded-lg p-2.5 text-left transition-all hover:scale-[1.02] hover:shadow-md"
                      style={{
                        background: `color-mix(in srgb, ${color} 12%, var(--card-bg))`,
                        borderLeft: `4px solid ${color}`,
                      }}
                    >
                      {/* Ora */}
                      <div
                        className="text-xs font-bold mb-1"
                        style={{ color }}
                      >
                        {formatTime(app.data_ora_inizio)} - {formatTime(app.data_ora_fine)}
                      </div>

                      {/* Cliente */}
                      <div
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {app.cliente_nome} {app.cliente_cognome}
                      </div>

                      {/* Trattamento */}
                      <div
                        className="text-xs truncate mt-0.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {app.trattamento_nome}
                      </div>

                      {/* Operatore - pallino colorato + nome */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className="text-xs truncate"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {app.operatrice_nome}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
