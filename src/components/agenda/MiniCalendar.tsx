import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  selectedDate,
  onDateSelect,
  onMonthChange,
}) => {
  const [viewDate, setViewDate] = React.useState(new Date(selectedDate));

  // Aggiorna viewDate quando selectedDate cambia mese
  React.useEffect(() => {
    if (
      selectedDate.getMonth() !== viewDate.getMonth() ||
      selectedDate.getFullYear() !== viewDate.getFullYear()
    ) {
      setViewDate(new Date(selectedDate));
    }
  }, [selectedDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const monthNames = [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ];

  // Ottieni i giorni del mese per la griglia
  const getDaysInMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];

    // Giorni vuoti all'inizio (per allineare al lunedì)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Converti da domenica=0 a lunedì=0

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Giorni del mese
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const days = getDaysInMonth();

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const isSelected = (date: Date | null): boolean => {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return d.getTime() === sel.getTime();
  };

  const isInSelectedWeek = (date: Date | null): boolean => {
    if (!date) return false;

    // Calcola inizio settimana del selectedDate
    const weekStart = new Date(selectedDate);
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const d = new Date(date);
    d.setHours(12, 0, 0, 0);

    return d >= weekStart && d <= weekEnd;
  };

  const prevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
    onMonthChange(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewDate(newDate);
    onMonthChange(newDate);
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--glass-border)',
      }}
    >
      {/* Header mese */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1 rounded-lg transition-colors hover:bg-opacity-20"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronLeft size={18} />
        </button>
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded-lg transition-colors hover:bg-opacity-20"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Giorni della settimana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium py-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Griglia giorni */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => day && onDateSelect(day)}
            disabled={!day}
            className={`
              aspect-square flex items-center justify-center text-xs rounded-lg
              transition-all disabled:cursor-default
            `}
            style={{
              background: isSelected(day)
                ? 'var(--color-primary)'
                : isInSelectedWeek(day)
                  ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)'
                  : isToday(day)
                    ? 'color-mix(in srgb, var(--color-secondary) 30%, transparent)'
                    : 'transparent',
              color: isSelected(day)
                ? 'white'
                : day
                  ? 'var(--color-text-primary)'
                  : 'transparent',
              fontWeight: isToday(day) || isSelected(day) ? 600 : 400,
            }}
          >
            {day?.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
};
