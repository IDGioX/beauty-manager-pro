import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Euro,
  TrendingUp,
  Clock,
  Award,
  Scissors,
  Loader2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { analyticsService, ClienteCompleteProfile } from '../../services/analytics';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface ClientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNome: string;
}

export const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
  isOpen,
  onClose,
  clienteId,
  clienteNome,
}) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ClienteCompleteProfile | null>(null);

  useEffect(() => {
    if (isOpen && clienteId) {
      loadProfile();
    }
  }, [isOpen, clienteId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getClienteCompleteProfile(clienteId, 20);
      setProfile(data);
    } catch (error) {
      console.error('Errore caricamento profilo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Storico - ${clienteNome}`}
      size="xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : !profile ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          Impossibile caricare lo storico
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Visite
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {profile.statistiche.totale_appuntamenti}
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Euro size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Totale
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                €{profile.statistiche.spesa_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Media
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                €{profile.statistiche.spesa_media.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Ultima visita
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {profile.statistiche.giorni_da_ultimo_appuntamento !== null
                  ? profile.statistiche.giorni_da_ultimo_appuntamento === 0
                    ? 'Oggi'
                    : `${profile.statistiche.giorni_da_ultimo_appuntamento} gg fa`
                  : 'Mai'}
              </p>
            </div>
          </div>

          {/* Trattamenti Preferiti */}
          {profile.trattamenti_frequenti.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award size={16} style={{ color: 'var(--color-primary)' }} />
                <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Trattamenti Preferiti
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {profile.trattamenti_frequenti.slice(0, 4).map((trattamento, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Scissors size={14} style={{ color: 'var(--color-text-muted)' }} />
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {trattamento.trattamento_nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {trattamento.count}x
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        €{trattamento.spesa_totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ultimi Appuntamenti */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} style={{ color: 'var(--color-secondary)' }} />
              <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Ultimi Appuntamenti
              </h3>
            </div>

            {profile.appuntamenti.length === 0 ? (
              <div
                className="text-center py-8 rounded-lg"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Nessun appuntamento registrato
              </div>
            ) : (
              <div
                className="rounded-lg overflow-hidden"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="max-h-64 overflow-y-auto">
                  {profile.appuntamenti.map((app: any, index: number) => (
                    <div
                      key={app.id || index}
                      className="flex items-center justify-between p-3"
                      style={{
                        borderBottom: index < profile.appuntamenti.length - 1
                          ? '1px solid var(--glass-border)'
                          : 'none',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs"
                          style={{
                            background: 'var(--glass-border)',
                          }}
                        >
                          <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {format(parseISO(app.data_ora_inizio), 'd')}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            {format(parseISO(app.data_ora_inizio), 'MMM', { locale: it })}
                          </span>
                        </div>
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {app.trattamento_nome}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {format(parseISO(app.data_ora_inizio), 'HH:mm')} - {app.operatrice_nome}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          €{(app.prezzo_applicato || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: app.stato === 'completato'
                              ? 'color-mix(in srgb, rgb(16, 185, 129) 15%, transparent)'
                              : app.stato === 'annullato'
                              ? 'color-mix(in srgb, rgb(239, 68, 68) 15%, transparent)'
                              : 'var(--glass-border)',
                            color: app.stato === 'completato'
                              ? 'rgb(16, 185, 129)'
                              : app.stato === 'annullato'
                              ? 'rgb(239, 68, 68)'
                              : 'var(--color-text-muted)',
                          }}
                        >
                          {app.stato === 'completato' ? 'Completato' :
                           app.stato === 'annullato' ? 'Annullato' :
                           app.stato === 'prenotato' ? 'Prenotato' :
                           app.stato}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
