import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, Calendar, Phone, Mail } from 'lucide-react';
import { analyticsService, ClienteSearchResult } from '../../services/analytics';
import { debounce } from '../../utils/debounce';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface ClientSearchListProps {
  onSelectClient: (clienteId: string) => void;
  selectedClientId: string | null;
}

export const ClientSearchList: React.FC<ClientSearchListProps> = ({
  onSelectClient,
  selectedClientId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ClienteSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (term: string) => {
        if (term.trim().length < 2) {
          setResults([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const data = await analyticsService.searchClientiAnalytics(term, 50);
          setResults(data);
        } catch (error) {
          console.error('Errore ricerca clienti:', error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
            size={20}
          />
          <input
            type="text"
            placeholder="Cerca cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Ricerca in corso...
          </div>
        )}

        {!loading && searchTerm.trim().length < 2 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Digita almeno 2 caratteri per cercare
          </div>
        )}

        {!loading && searchTerm.trim().length >= 2 && results.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nessun cliente trovato
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-1">
            {results.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => onSelectClient(cliente.id)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedClientId === cliente.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                    : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                      {cliente.nome} {cliente.cognome}
                    </p>

                    {/* Info Row 1: Contact */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {cliente.cellulare && (
                        <div className="flex items-center gap-1">
                          <Phone size={12} />
                          <span>{cliente.cellulare}</span>
                        </div>
                      )}
                      {cliente.email && (
                        <>
                          {cliente.cellulare && <span>•</span>}
                          <div className="flex items-center gap-1 truncate">
                            <Mail size={12} />
                            <span className="truncate">{cliente.email}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Info Row 2: Stats */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{cliente.totale_appuntamenti} visite</span>
                      </div>
                      {cliente.ultimo_appuntamento && (
                        <>
                          <span>•</span>
                          <span>
                            Ultimo: {formatDistanceToNow(new Date(cliente.ultimo_appuntamento), {
                              addSuffix: true,
                              locale: it
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
