import React, { useState } from 'react';
import { ClientSearchList } from './ClientSearchList';
import { ClientProfileView } from './ClientProfileView';
import { analyticsService, ClienteCompleteProfile } from '../../services/analytics';
import { Loader2 } from 'lucide-react';

export const ClientHistory: React.FC = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClienteCompleteProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectClient = async (clienteId: string) => {
    setSelectedClientId(clienteId);
    setLoading(true);

    try {
      const data = await analyticsService.getClienteCompleteProfile(clienteId, 100);
      setProfile(data);
    } catch (error) {
      console.error('Errore caricamento profilo cliente:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Search List - 1/3 width on large screens */}
      <div className="lg:col-span-1">
        <ClientSearchList
          onSelectClient={handleSelectClient}
          selectedClientId={selectedClientId}
        />
      </div>

      {/* Profile View - 2/3 width on large screens */}
      <div className="lg:col-span-2">
        {!selectedClientId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex items-center justify-center">
            <div className="text-center p-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Seleziona un Cliente
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Cerca e seleziona un cliente per visualizzare il suo storico completo
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex items-center justify-center">
            <div className="text-center p-12">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary-500 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">
                Caricamento profilo cliente...
              </p>
            </div>
          </div>
        )}

        {!loading && profile && <ClientProfileView profile={profile} />}
      </div>
    </div>
  );
};
