import React, { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { dashboardService, DashboardStats, ClienteRischio } from '../services/dashboard';
import { AppuntamentoWithDetails } from '../types/agenda';
import { useAuthStore } from '../stores/authStore';

// Funzione per ottenere il saluto basato sull'orario
function getGreeting(): string {
  const ora = new Date().getHours();
  if (ora >= 5 && ora < 12) {
    return 'Buongiorno';
  } else if (ora >= 12 && ora < 18) {
    return 'Buon pomeriggio';
  } else {
    return 'Buona sera';
  }
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  colorType: 'primary' | 'secondary' | 'accent' | 'warning';
  loading?: boolean;
  trend?: { value: number; positive: boolean };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  colorType,
  loading,
  trend,
}) => {
  const colorVar = colorType === 'warning' ? '--color-warning' : `--color-${colorType}`;
  const colorDarkVar = colorType === 'warning' ? '--color-warning' : `--color-${colorType}-dark`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-default group"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 4px 24px var(--glass-shadow)',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: `var(${colorVar})` }}
      />

      {/* Decorative gradient blob */}
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, var(${colorVar}) 0%, transparent 70%)` }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p
            className="text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {title}
          </p>
          {loading ? (
            <div
              className="h-10 w-24 rounded-lg animate-pulse"
              style={{ background: 'color-mix(in srgb, var(--color-text-primary) 10%, transparent)' }}
            />
          ) : (
            <>
              <p
                className="text-4xl font-bold tracking-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {value}
              </p>
              {subtitle && (
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {subtitle}
                </p>
              )}
              {trend && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp
                    size={14}
                    style={{ color: trend.positive ? 'var(--color-success)' : 'var(--color-danger)' }}
                    className={trend.positive ? '' : 'rotate-180'}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: trend.positive ? 'var(--color-success)' : 'var(--color-danger)' }}
                  >
                    {trend.positive ? '+' : ''}{trend.value}%
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, var(${colorVar}) 0%, var(${colorDarkVar}) 100%)`,
            boxShadow: `0 4px 12px color-mix(in srgb, var(${colorVar}) 33%, transparent)`,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prossimiAppuntamenti, setProssimiAppuntamenti] = useState<AppuntamentoWithDetails[]>([]);
  const [clientiRischio, setClientiRischio] = useState<ClienteRischio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, appuntamentiData, clientiRischioData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getProssimiAppuntamenti(5),
        dashboardService.getClientiRischioChurn(60, 5),
      ]);
      setStats(statsData);
      setProssimiAppuntamenti(appuntamentiData);
      setClientiRischio(clientiRischioData);
    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const oggi = new Date();
  const opzioniData = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const;
  const dataFormattata = oggi.toLocaleDateString('it-IT', opzioniData);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-end justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {getGreeting()}, {user?.nome || 'Utente'}!
          </h1>
          <p className="mt-1 capitalize" style={{ color: 'var(--color-text-muted)' }}>
            {dataFormattata}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Appuntamenti Oggi"
          value={stats?.appuntamenti_oggi ?? 0}
          subtitle="prenotazioni"
          icon={<Calendar size={24} className="text-white" />}
          colorType="primary"
          loading={loading}
        />
        <StatCard
          title="Clienti Attivi"
          value={stats?.clienti_attivi ?? 0}
          subtitle="questo mese"
          icon={<Users size={24} className="text-white" />}
          colorType="accent"
          loading={loading}
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Prossimo Slot"
          value={prossimiAppuntamenti[0] ? new Date(prossimiAppuntamenti[0].data_ora_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          subtitle={prossimiAppuntamenti[0]?.cliente_nome || 'Nessun appuntamento'}
          icon={<Clock size={24} className="text-white" />}
          colorType="secondary"
          loading={loading}
        />
        <StatCard
          title="Da Ricontattare"
          value={clientiRischio.length}
          subtitle="clienti inattivi"
          icon={<AlertCircle size={24} className="text-white" />}
          colorType="warning"
          loading={loading}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prossimi Appuntamenti */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 4px 24px var(--glass-shadow)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Prossimi Appuntamenti
            </h3>
            <button
              className="text-sm font-medium flex items-center gap-1 transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              Vedi tutti
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl animate-pulse"
                  style={{ background: 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)' }}
                />
              ))
            ) : prossimiAppuntamenti.length === 0 ? (
              <div
                className="text-center py-12 rounded-xl"
                style={{ background: 'color-mix(in srgb, var(--color-text-primary) 3%, transparent)' }}
              >
                <Calendar size={40} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-3" />
                <p style={{ color: 'var(--color-text-muted)' }}>Nessun appuntamento in programma</p>
              </div>
            ) : (
              prossimiAppuntamenti.map((app, index) => {
                const dataOra = new Date(app.data_ora_inizio);
                const ora = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                const giorno = dataOra.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                const isFirst = index === 0;

                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer group"
                    style={{
                      background: isFirst
                        ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
                        : 'color-mix(in srgb, var(--color-text-primary) 2%, transparent)',
                      border: isFirst ? '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)' : '1px solid transparent',
                    }}
                  >
                    <div
                      className="min-w-[70px] text-center p-2 rounded-xl"
                      style={{
                        background: isFirst
                          ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                          : 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)',
                      }}
                    >
                      <div
                        className="text-xl font-bold"
                        style={{ color: isFirst ? 'white' : 'var(--color-text-primary)' }}
                      >
                        {ora}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: isFirst ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}
                      >
                        {giorno}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {app.cliente_nome} {app.cliente_cognome}
                      </div>
                      <div
                        className="text-sm truncate"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {app.trattamento_nome || 'Nessun trattamento'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className="text-xs"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {app.operatrice_nome}
                      </div>
                      <div
                        className="text-xs font-medium mt-0.5 px-2 py-0.5 rounded-full inline-block"
                        style={{
                          background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                          color: 'var(--color-accent-dark)',
                        }}
                      >
                        {app.trattamento_durata}min
                      </div>
                    </div>

                    <ChevronRight
                      size={18}
                      style={{ color: 'var(--color-text-muted)' }}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Clienti a Rischio */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 4px 24px var(--glass-shadow)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Clienti da Ricontattare
            </h3>
            <button
              className="text-sm font-medium flex items-center gap-1 transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              Vedi tutti
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl animate-pulse"
                  style={{ background: 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)' }}
                />
              ))
            ) : clientiRischio.length === 0 ? (
              <div
                className="text-center py-12 rounded-xl"
                style={{ background: 'color-mix(in srgb, var(--color-text-primary) 3%, transparent)' }}
              >
                <Users size={40} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-3" />
                <p style={{ color: 'var(--color-text-muted)' }}>Nessun cliente a rischio</p>
              </div>
            ) : (
              clientiRischio.map((cliente) => {
                const iniziali = `${cliente.nome.charAt(0)}${cliente.cognome.charAt(0)}`;
                const giorniText = cliente.giorni_ultimo_appuntamento === 1
                  ? '1 giorno fa'
                  : `${cliente.giorni_ultimo_appuntamento} giorni fa`;

                // Determina il colore in base ai giorni
                const isUrgent = cliente.giorni_ultimo_appuntamento > 90;
                const isWarning = cliente.giorni_ultimo_appuntamento > 60;

                const avatarColor = isUrgent
                  ? 'var(--color-danger)'
                  : isWarning
                  ? 'var(--color-warning)'
                  : 'var(--color-secondary)';

                const badgeColor = isUrgent
                  ? 'var(--color-danger)'
                  : isWarning
                  ? 'var(--color-warning)'
                  : 'var(--color-secondary)';

                return (
                  <div
                    key={cliente.id}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer group hover:bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)]"
                    style={{
                      background: 'color-mix(in srgb, var(--color-text-primary) 2%, transparent)',
                      border: '1px solid transparent',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${avatarColor} 0%, color-mix(in srgb, ${avatarColor} 70%, black) 100%)`,
                      }}
                    >
                      {iniziali}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {cliente.nome} {cliente.cognome}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Ultimo appuntamento: {giorniText}
                      </div>
                    </div>

                    <div
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${badgeColor} 15%, transparent)`,
                        color: `color-mix(in srgb, ${badgeColor} 70%, black)`,
                      }}
                    >
                      {cliente.giorni_ultimo_appuntamento}gg
                    </div>

                    <ChevronRight
                      size={18}
                      style={{ color: 'var(--color-text-muted)' }}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
