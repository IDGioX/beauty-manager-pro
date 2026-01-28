import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SpesaMensile } from '../../../services/analytics';

interface SpendingTimelineChartProps {
  data: SpesaMensile[];
}

export const SpendingTimelineChart: React.FC<SpendingTimelineChartProps> = ({ data }) => {
  const chartData = data.map((item) => ({
    mese: `${item.mese.toString().padStart(2, '0')}/${item.anno}`,
    spesa: parseFloat(item.spesa.toFixed(2)),
    appuntamenti: item.appuntamenti,
  }));

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Andamento Spesa Mensile
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Andamento Spesa Mensile
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorSpesa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis
            dataKey="mese"
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
          />
          <YAxis
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            label={{ value: 'Spesa (€)', angle: -90, position: 'insideLeft', fill: '#6B7280' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB',
            }}
            formatter={(value: any, name?: string) => {
              if (name === 'spesa') {
                return [`€${value.toFixed(2)}`, 'Spesa'];
              }
              return [value, 'Appuntamenti'];
            }}
          />
          <Area
            type="monotone"
            dataKey="spesa"
            stroke="#EC4899"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSpesa)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
