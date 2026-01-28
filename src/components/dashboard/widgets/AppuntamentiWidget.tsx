import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User } from 'lucide-react';

interface Appuntamento {
  id: string;
  cliente: string;
  trattamento: string;
  orario: string;
  durata: string;
}

// Mock data - will be replaced with real data later
const mockAppuntamenti: Appuntamento[] = [
  {
    id: '1',
    cliente: 'Maria Rossi',
    trattamento: 'Manicure + Pedicure',
    orario: '10:00',
    durata: '90 min',
  },
  {
    id: '2',
    cliente: 'Laura Bianchi',
    trattamento: 'Massaggio Rilassante',
    orario: '11:30',
    durata: '60 min',
  },
  {
    id: '3',
    cliente: 'Anna Verdi',
    trattamento: 'Trattamento Viso',
    orario: '14:00',
    durata: '45 min',
  },
  {
    id: '4',
    cliente: 'Sofia Neri',
    trattamento: 'Epilazione',
    orario: '15:30',
    durata: '30 min',
  },
];

export const AppuntamentiWidget: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Prossimi Appuntamenti
          </h3>
        </div>
        <span className="text-xs text-gray-400">Oggi</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {mockAppuntamenti.map((app, index) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <User size={16} className="text-primary-600 dark:text-primary-400" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {app.cliente}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <Clock size={14} />
                <span>{app.orario}</span>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {app.trattamento}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Durata: {app.durata}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
