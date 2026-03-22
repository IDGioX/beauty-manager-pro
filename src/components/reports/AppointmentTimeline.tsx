import React from 'react';
import { Calendar, Clock, DollarSign, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { AppuntamentoWithDetails } from '../../types/agenda';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface AppointmentTimelineProps {
  appuntamenti: AppuntamentoWithDetails[];
}

const getStatusConfig = (stato: string) => {
  switch (stato) {
    case 'completato':
      return {
        icon: CheckCircle,
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        label: 'Completato',
      };
    case 'annullato':
      return {
        icon: XCircle,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        label: 'Annullato',
      };
    case 'in_corso':
      return {
        icon: AlertCircle,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        label: 'In Corso',
      };
    default:
      return {
        icon: Calendar,
        color: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-900',
        border: 'border-gray-200 dark:border-gray-700',
        label: 'Programmato',
      };
  }
};

export const AppointmentTimeline: React.FC<AppointmentTimelineProps> = ({ appuntamenti }) => {
  if (appuntamenti.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Storico Appuntamenti
        </h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nessun appuntamento trovato
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Storico Appuntamenti ({appuntamenti.length})
      </h3>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {appuntamenti.map((app, index) => {
          const statusConfig = getStatusConfig(app.stato);
          const StatusIcon = statusConfig.icon;
          const dataOra = parseISO(app.data_ora_inizio);

          return (
            <div
              key={app.id}
              className={`relative pl-8 pb-4 ${index < appuntamenti.length - 1 ? 'border-l-2 border-gray-200 dark:border-gray-700 ml-3' : ''}`}
            >
              {/* Timeline Dot */}
              <div className={`absolute left-0 top-0 w-6 h-6 rounded-full ${statusConfig.bg} ${statusConfig.border} border-2 flex items-center justify-center -ml-3`}>
                <StatusIcon size={12} className={statusConfig.color} />
              </div>

              {/* Appointment Card */}
              <div className={`${statusConfig.bg} ${statusConfig.border} border rounded-lg p-4 ml-2`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {app.trattamento_nome || 'Trattamento non specificato'}
                    </p>
                    {app.categoria_nome && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {app.categoria_nome}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bg}`}>
                    {statusConfig.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
                    <span>
                      {format(dataOra, 'EEEE d MMMM yyyy', { locale: it })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Clock size={16} className="text-gray-500 dark:text-gray-400" />
                    <span>
                      {format(dataOra, 'HH:mm')} - {format(parseISO(app.data_ora_fine), 'HH:mm')}
                    </span>
                  </div>

                  {app.operatrice_nome && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <span className="text-gray-500 dark:text-gray-400">👤</span>
                      <span>{app.operatrice_nome} {app.operatrice_cognome || ''}</span>
                    </div>
                  )}

                  {app.prezzo_finale && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <DollarSign size={16} className="text-gray-500 dark:text-gray-400" />
                      <span className="font-medium">€{app.prezzo_finale.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {app.note && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      "{app.note}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
