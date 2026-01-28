import React, { useState, useEffect } from 'react';
import { Calendar, Users, Euro, Sparkles } from 'lucide-react';
import { analyticsService } from '../../services/analytics';
import { startOfDay, endOfDay } from 'date-fns';

export const DailyReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [clientiOggi, setClientiOggi] = useState(0);
  const [spesaOggi, setSpesaOggi] = useState(0);
  const [appuntamentiOggi, setAppuntamentiOggi] = useState(0);

  useEffect(() => {
    loadDailyData();
  }, []);

  const loadDailyData = async () => {
    setLoading(true);
    try {
      const oggi = new Date();
      const dateRange = {
        data_inizio: startOfDay(oggi).toISOString(),
        data_fine: endOfDay(oggi).toISOString(),
      };

      const periodAnalytics = await analyticsService.getPeriodAnalytics(dateRange);

      setAppuntamentiOggi(periodAnalytics.totale_appuntamenti);
      setClientiOggi(periodAnalytics.clienti_unici);
      setSpesaOggi(periodAnalytics.ricavo_totale);
    } catch (error) {
      console.error('Errore caricamento dati giornalieri:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-gray-700 rounded w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
              <div className="h-10 bg-gray-700 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold capitalize">{today}</h2>
            <p className="text-sm text-gray-400">Riepilogo giornata</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Incasso */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gray-400">
            <Euro size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Incasso</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            €{spesaOggi.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Appuntamenti */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Appuntamenti</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">{appuntamentiOggi}</p>
        </div>

        {/* Clienti */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gray-400">
            <Users size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Clienti</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">{clientiOggi}</p>
        </div>
      </div>

      {appuntamentiOggi === 0 && (
        <div className="mt-6 pt-4 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-500">
            Nessun appuntamento registrato per oggi
          </p>
        </div>
      )}
    </div>
  );
};
