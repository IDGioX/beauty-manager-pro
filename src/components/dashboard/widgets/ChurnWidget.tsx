import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, User, Calendar } from 'lucide-react';

interface ClienteRischio {
  id: string;
  nome: string;
  ultimoAppuntamento: string;
  giorniTrascorsi: number;
  livelloRischio: 'alto' | 'medio';
}

// Mock data - will be replaced with real data later
const mockClientiRischio: ClienteRischio[] = [
  {
    id: '1',
    nome: 'Giulia Ferrari',
    ultimoAppuntamento: '15 Gen 2025',
    giorniTrascorsi: 45,
    livelloRischio: 'alto',
  },
  {
    id: '2',
    nome: 'Chiara Romano',
    ultimoAppuntamento: '22 Gen 2025',
    giorniTrascorsi: 38,
    livelloRischio: 'alto',
  },
  {
    id: '3',
    nome: 'Elena Costa',
    ultimoAppuntamento: '28 Gen 2025',
    giorniTrascorsi: 32,
    livelloRischio: 'medio',
  },
  {
    id: '4',
    nome: 'Francesca Ricci',
    ultimoAppuntamento: '2 Feb 2025',
    giorniTrascorsi: 27,
    livelloRischio: 'medio',
  },
];

export const ChurnWidget: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-gray-400" />
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Clienti a Rischio
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium">
          {mockClientiRischio.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {mockClientiRischio.map((cliente, index) => (
          <motion.div
            key={cliente.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              cliente.livelloRischio === 'alto'
                ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                : 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <User size={16} className={
                  cliente.livelloRischio === 'alto'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-orange-600 dark:text-orange-400'
                } />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {cliente.nome}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  cliente.livelloRischio === 'alto'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                }`}
              >
                {cliente.livelloRischio === 'alto' ? 'Rischio Alto' : 'Rischio Medio'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar size={14} />
              <span>Ultimo appuntamento: {cliente.ultimoAppuntamento}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {cliente.giorniTrascorsi} giorni fa
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button className="w-full py-2 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors">
          Invia Promemoria
        </button>
      </div>
    </motion.div>
  );
};
