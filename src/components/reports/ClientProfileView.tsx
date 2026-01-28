import React from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Award,
} from 'lucide-react';
import { ClienteCompleteProfile } from '../../services/analytics';
import { SpendingTimelineChart } from './charts/SpendingTimelineChart';
import { AppointmentTimeline } from './AppointmentTimeline';
import { format, parseISO } from 'date-fns';

interface ClientProfileViewProps {
  profile: ClienteCompleteProfile;
}

export const ClientProfileView: React.FC<ClientProfileViewProps> = ({ profile }) => {
  const { cliente, statistiche, appuntamenti, trattamenti_frequenti, spesa_per_mese } = profile;

  return (
    <div className="space-y-6">
      {/* Client Header Card */}
      <div className="bg-gray-900 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <User size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">
              {cliente.nome} {cliente.cognome}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
              {cliente.cellulare && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  <span>{cliente.cellulare}</span>
                </div>
              )}
              {cliente.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  <span>{cliente.email}</span>
                </div>
              )}
              {cliente.indirizzo && (
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span>{cliente.indirizzo}</span>
                </div>
              )}
              {cliente.data_nascita && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span>Nato il {format(parseISO(cliente.data_nascita), 'dd/MM/yyyy')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Visite
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistiche.totale_appuntamenti}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Totale
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            €{statistiche.spesa_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Media
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            €{statistiche.spesa_media.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Ultima
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistiche.giorni_da_ultimo_appuntamento !== null
              ? `${statistiche.giorni_da_ultimo_appuntamento} gg`
              : 'Mai'}
          </p>
        </div>
      </div>

      {/* Favorite Treatments */}
      {trattamenti_frequenti.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Award size={20} className="text-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Trattamenti Preferiti
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trattamenti_frequenti.map((trattamento, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {trattamento.trattamento_nome}
                  </p>
                  <span className="px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-medium">
                    {trattamento.count}x
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Totale: €{trattamento.spesa_totale.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Timeline Chart */}
      <SpendingTimelineChart data={spesa_per_mese} />

      {/* Appointment Timeline */}
      <AppointmentTimeline appuntamenti={appuntamenti} />
    </div>
  );
};
