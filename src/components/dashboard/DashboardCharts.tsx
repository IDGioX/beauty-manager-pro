import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { dashboardService, type DashboardChartData, type DashboardCompleto } from '../../services/dashboard';
import { InfoTooltip } from '../ui/InfoTooltip';

interface DashboardChartsProps {
  dashboardData: DashboardCompleto | null;
}

// Colori per il donut degli appuntamenti
const STATUS_COLORS: Record<string, string> = {
  completati: '#22c55e',
  confermati: '#3b82f6',
  in_attesa: '#f59e0b',
  in_corso: '#8b5cf6',
  no_show: '#ef4444',
  in_ritardo: '#f97316',
};

const STATUS_LABELS: Record<string, string> = {
  completati: 'Completati',
  confermati: 'Confermati',
  in_attesa: 'In attesa',
  in_corso: 'In corso',
  no_show: 'No-show',
  in_ritardo: 'In ritardo',
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ dashboardData }) => {
  const [chartData, setChartData] = useState<DashboardChartData | null>(null);

  useEffect(() => {
    dashboardService.getChartData().then(setChartData).catch(console.error);
  }, []);

  // Prepara dati donut dagli appuntamenti di oggi
  const donutData = React.useMemo(() => {
    if (!dashboardData?.appuntamenti_oggi) return [];
    const stats = dashboardData.appuntamenti_oggi;
    return [
      { name: 'completati', value: stats.completati },
      { name: 'confermati', value: stats.confermati },
      { name: 'in_attesa', value: stats.in_attesa },
      { name: 'in_corso', value: stats.in_corso },
      { name: 'no_show', value: stats.no_show },
      { name: 'in_ritardo', value: stats.in_ritardo },
    ].filter(d => d.value > 0);
  }, [dashboardData]);

  // Leggi colore primario dal CSS
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#ec4899';

  const cardStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '1rem',
    padding: '1.25rem',
  };

  const titleStyle: React.CSSProperties = {
    color: 'var(--color-text-primary)',
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
      {/* 1. Fatturato Ultimi 7 Giorni */}
      <div style={cardStyle} className="card-hover-lift">
        <div style={titleStyle}>
          <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
          Fatturato 7 Giorni
          <InfoTooltip text="Andamento del fatturato giornaliero degli ultimi 7 giorni. Include solo appuntamenti completati e in corso." />
        </div>
        <div style={{ height: 180 }}>
          {chartData?.fatturato_giornaliero ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.fatturato_giornaliero} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradFatturato" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="giorno"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}€`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-primary)',
                  }}
                  formatter={(value) => [`€ ${Number(value ?? 0).toFixed(2)}`, 'Fatturato']}
                  labelFormatter={(label) => `${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="importo"
                  stroke={primaryColor}
                  strokeWidth={2}
                  fill="url(#gradFatturato)"
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="animate-pulse w-full h-24 rounded-lg" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          )}
        </div>
      </div>

      {/* 2. Appuntamenti per Stato - Donut */}
      <div style={cardStyle} className="card-hover-lift">
        <div style={titleStyle}>
          <PieIcon size={16} style={{ color: 'var(--color-primary)' }} />
          Appuntamenti Oggi
          <InfoTooltip text="Distribuzione degli appuntamenti di oggi per stato. Il numero al centro e' il totale. Ogni colore rappresenta uno stato diverso." />
        </div>
        <div style={{ height: 180, position: 'relative' }}>
          {donutData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={800}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-primary)',
                    }}
                    formatter={(value, name) => [value ?? 0, STATUS_LABELS[name as string] || name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Numero totale al centro */}
              <div
                style={{
                  position: 'absolute',
                  top: '38%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {dashboardData?.appuntamenti_oggi.totale || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>totale</div>
              </div>
              {/* Legenda */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1" style={{ marginTop: '-0.5rem' }}>
                {donutData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: STATUS_COLORS[entry.name] }}
                    />
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>
                      {STATUS_LABELS[entry.name]} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
              <PieIcon size={32} className="mb-2 opacity-30" />
              <span style={{ fontSize: '0.75rem' }}>Nessun appuntamento oggi</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Appuntamenti Settimanali - Bar Chart */}
      <div style={cardStyle} className="card-hover-lift">
        <div style={titleStyle}>
          <BarChart3 size={16} style={{ color: 'var(--color-primary)' }} />
          Appuntamenti 7 Giorni
          <InfoTooltip text="Appuntamenti degli ultimi 7 giorni divisi in completati (verde) e no-show (rosso). Le barre sono impilate per mostrare il totale." />
        </div>
        <div style={{ height: 180 }}>
          {chartData?.appuntamenti_giornalieri ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.appuntamenti_giornalieri} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="giorno"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-primary)',
                  }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      completati: 'Completati',
                      no_show: 'No-show',
                      totale: 'Totale',
                    };
                    return [value ?? 0, labels[name as string] || name];
                  }}
                />
                <Bar
                  dataKey="completati"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  stackId="stack"
                />
                <Bar
                  dataKey="no_show"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  stackId="stack"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="animate-pulse w-full h-24 rounded-lg" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
