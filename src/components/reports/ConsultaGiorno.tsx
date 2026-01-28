import React, { useState, useEffect } from 'react';
import { Calendar, Users, DollarSign, Filter, Clock, User, Scissors, CheckCircle, XCircle, AlertCircle, Circle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { AppuntamentoWithDetails } from '../../types/agenda';
import { format, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';

export const ConsultaGiorno: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [appuntamenti, setAppuntamenti] = useState<AppuntamentoWithDetails[]>([]);
  const [filtroStato, setFiltroStato] = useState<string>('tutti');
  const [dataInizio, setDataInizio] = useState(new Date());
  const [dataFine, setDataFine] = useState(new Date());

  useEffect(() => {
    loadAppuntamenti();
  }, [dataInizio, dataFine]);

  const loadAppuntamenti = async () => {
    setLoading(true);
    try {
      const data_inizio = startOfDay(dataInizio).toISOString();
      const data_fine = endOfDay(dataFine).toISOString();

      const result = await invoke<AppuntamentoWithDetails[]>('get_appuntamenti_by_date_range', {
        dataInizio: data_inizio,
        dataFine: data_fine,
      });

      setAppuntamenti(result);
    } catch (error) {
      console.error('Errore caricamento appuntamenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const appuntamentiFiltrati = appuntamenti.filter((app) => {
    if (filtroStato === 'tutti') return true;
    return app.stato === filtroStato;
  });

  const totaleIncasso = appuntamentiFiltrati.reduce(
    (sum, app) => sum + (app.prezzo_applicato || 0),
    0
  );

  const clientiUnici = new Set(appuntamentiFiltrati.map((app) => app.cliente_id)).size;

  const getStatoColor = (stato: string) => {
    switch (stato) {
      case 'completato':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_corso':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'prenotato':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'annullato':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'no_show':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatoIcon = (stato: string) => {
    switch (stato) {
      case 'completato':
        return <CheckCircle size={16} />;
      case 'in_corso':
        return <Clock size={16} />;
      case 'prenotato':
        return <Circle size={16} />;
      case 'annullato':
        return <XCircle size={16} />;
      case 'no_show':
        return <AlertCircle size={16} />;
      default:
        return <Circle size={16} />;
    }
  };

  const getStatoLabel = (stato: string) => {
    switch (stato) {
      case 'completato':
        return 'Completato';
      case 'in_corso':
        return 'In Corso';
      case 'prenotato':
        return 'Prenotato';
      case 'annullato':
        return 'Annullato';
      case 'no_show':
        return 'No Show';
      default:
        return stato;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con Data Selector */}
      <div className="bg-gray-900 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Consulta Periodo</h2>
              <p className="text-sm text-gray-400">
                Dal {format(dataInizio, "d MMMM", { locale: it })} al {format(dataFine, "d MMMM yyyy", { locale: it })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Inizio</label>
              <input
                type="date"
                value={format(dataInizio, 'yyyy-MM-dd')}
                onChange={(e) => setDataInizio(new Date(e.target.value + 'T12:00:00'))}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Fine</label>
              <input
                type="date"
                value={format(dataFine, 'yyyy-MM-dd')}
                onChange={(e) => setDataFine(new Date(e.target.value + 'T12:00:00'))}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Appuntamenti</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{appuntamentiFiltrati.length}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-400">
              <Users size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Clienti</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{clientiUnici}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-400">
              <DollarSign size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Incasso</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">€{totaleIncasso.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Filter size={20} className="text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtra per stato:
          </span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFiltroStato('tutti')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filtroStato === 'tutti'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFiltroStato('completato')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filtroStato === 'completato'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Completati
            </button>
            <button
              onClick={() => setFiltroStato('in_corso')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filtroStato === 'in_corso'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              In Corso
            </button>
            <button
              onClick={() => setFiltroStato('prenotato')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filtroStato === 'prenotato'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Prenotati
            </button>
            <button
              onClick={() => setFiltroStato('annullato')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filtroStato === 'annullato'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Annullati
            </button>
          </div>
        </div>
      </div>

      {/* Lista Appuntamenti */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Appuntamenti ({appuntamentiFiltrati.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento...</p>
          </div>
        ) : appuntamentiFiltrati.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nessun appuntamento trovato per questa data</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {appuntamentiFiltrati.map((app) => (
              <div
                key={app.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Orario */}
                  <div className="flex-shrink-0 w-20 text-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {format(new Date(app.data_ora_inizio), 'HH:mm')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(app.data_ora_fine), 'HH:mm')}
                    </p>
                  </div>

                  {/* Dettagli */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400 flex-shrink-0" />
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {app.cliente_nome} {app.cliente_cognome}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatoColor(app.stato)}`}>
                        {getStatoIcon(app.stato)}
                        {getStatoLabel(app.stato)}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Scissors size={14} className="flex-shrink-0" />
                        <span>{app.trattamento_nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={14} className="flex-shrink-0" />
                        <span>Operatore: {app.operatrice_nome} {app.operatrice_cognome}</span>
                      </div>
                      {app.cliente_cellulare && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">📱 {app.cliente_cellulare}</span>
                        </div>
                      )}
                    </div>

                    {app.note_prenotazione && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                        Note: {app.note_prenotazione}
                      </div>
                    )}
                  </div>

                  {/* Prezzo */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      €{(app.prezzo_applicato || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {app.trattamento_durata} min
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
