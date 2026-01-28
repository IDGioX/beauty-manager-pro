import React from 'react';
import { Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format } from 'date-fns';

export interface DateRange {
  data_inizio: string; // ISO 8601
  data_fine: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type Preset = 'this-month' | 'last-month' | 'last-3-months' | 'this-year';

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const [activePreset, setActivePreset] = React.useState<Preset>('this-month');

  const presets: { id: Preset; label: string; getRange: () => DateRange }[] = [
    {
      id: 'this-month',
      label: 'Questo Mese',
      getRange: () => {
        const now = new Date();
        return {
          data_inizio: startOfMonth(now).toISOString(),
          data_fine: endOfMonth(now).toISOString(),
        };
      },
    },
    {
      id: 'last-month',
      label: 'Ultimo Mese',
      getRange: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          data_inizio: startOfMonth(lastMonth).toISOString(),
          data_fine: endOfMonth(lastMonth).toISOString(),
        };
      },
    },
    {
      id: 'last-3-months',
      label: 'Ultimi 3 Mesi',
      getRange: () => {
        const now = new Date();
        const threeMonthsAgo = subMonths(now, 3);
        return {
          data_inizio: startOfMonth(threeMonthsAgo).toISOString(),
          data_fine: endOfMonth(now).toISOString(),
        };
      },
    },
    {
      id: 'this-year',
      label: 'Quest\'Anno',
      getRange: () => {
        const now = new Date();
        return {
          data_inizio: startOfYear(now).toISOString(),
          data_fine: endOfYear(now).toISOString(),
        };
      },
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    setActivePreset(preset.id);
    onChange(preset.getRange());
  };

  const formatDateRange = () => {
    const start = new Date(value.data_inizio);
    const end = new Date(value.data_fine);
    return `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={20} className="text-gray-600 dark:text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Periodo</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activePreset === preset.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400">
        {formatDateRange()}
      </div>
    </div>
  );
};
