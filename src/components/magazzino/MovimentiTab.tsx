import { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, TrendingDown, RotateCcw, Package, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { MovimentoDetailModal } from './MovimentoDetailModal';
import { magazzinoService } from '../../services/magazzino';
import { operatriciService } from '../../services/operatrici';
import { clientiService } from '../../services/clienti';
import {
  MovimentoMagazzino,
  FiltriMovimenti,
  TipoMovimento,
  TIPI_MOVIMENTO_LABELS,
} from '../../types/magazzino';
import { Operatrice } from '../../types/agenda';
import { Cliente } from '../../types/cliente';

interface MovimentiTabProps {
  onOpenCarico?: () => void;
  onOpenScarico?: () => void;
  onOpenAppuntamento?: (appuntamentoId: string) => void;
}

export function MovimentiTab({ onOpenCarico, onOpenScarico, onOpenAppuntamento }: MovimentiTabProps) {
  const [movimenti, setMovimenti] = useState<MovimentoMagazzino[]>([]);
  const [operatrici, setOperatrici] = useState<Operatrice[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMovimento, setSelectedMovimento] = useState<MovimentoMagazzino | null>(null);

  const [filtri, setFiltri] = useState<FiltriMovimenti>({
    prodotto_id: undefined,
    tipo: undefined,
    data_da: undefined,
    data_a: undefined,
    operatrice_id: undefined,
    cliente_id: undefined,
    fornitore: undefined,
  });

  // Ricerca unificata su tutti i campi
  const [searchTerm, setSearchTerm] = useState('');

  const loadMovimenti = async () => {
    try {
      setLoading(true);
      const data = await magazzinoService.getMovimenti(filtri, 200);
      setMovimenti(data);
    } catch (error) {
      console.error('Errore caricamento movimenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOperatrici = async () => {
    try {
      const data = await operatriciService.getOperatrici();
      setOperatrici(data);
    } catch (error) {
      console.error('Errore caricamento operatrici:', error);
    }
  };

  const loadClienti = async () => {
    try {
      const data = await clientiService.getClienti();
      setClienti(data);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
    }
  };

  useEffect(() => {
    loadMovimenti();
  }, [filtri]);

  useEffect(() => {
    loadOperatrici();
    loadClienti();
  }, []);

  const handleResetFilters = () => {
    setFiltri({
      prodotto_id: undefined,
      tipo: undefined,
      data_da: undefined,
      data_a: undefined,
      operatrice_id: undefined,
      cliente_id: undefined,
      fornitore: undefined,
    });
    setSearchTerm('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const getMovimentoIcon = (tipo: TipoMovimento) => {
    switch (tipo) {
      case 'carico':
      case 'reso':
        return <TrendingUp className="text-emerald-500" size={16} />;
      case 'scarico_uso':
      case 'scarico_vendita':
      case 'scarto':
        return <TrendingDown className="text-red-500" size={16} />;
      case 'inventario':
        return <RotateCcw className="text-blue-500" size={16} />;
      default:
        return <Package className="text-gray-500" size={16} />;
    }
  };

  const getQuantitaDisplay = (movimento: MovimentoMagazzino) => {
    const isPositive = ['carico', 'reso'].includes(movimento.tipo) ||
      (movimento.tipo === 'inventario' && movimento.quantita > 0);

    return (
      <span
        className={`font-medium ${
          isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {isPositive ? '+' : ''}
        {movimento.quantita}
      </span>
    );
  };

  // Ricerca dinamica su tutti i campi
  const filteredMovimenti = movimenti.filter((m) => {
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase().trim();

    // Cerca in prodotto
    if (m.prodotto_nome?.toLowerCase().includes(search)) return true;
    if (m.prodotto_codice?.toLowerCase().includes(search)) return true;

    // Cerca in cliente
    if (m.cliente_nome?.toLowerCase().includes(search)) return true;

    // Cerca in operatrice
    if (m.operatrice_nome?.toLowerCase().includes(search)) return true;

    // Cerca in fornitore
    if (m.fornitore?.toLowerCase().includes(search)) return true;

    // Cerca in data (formato italiano dd/mm/yyyy)
    const dateFormatted = formatDateShort(m.created_at);
    if (dateFormatted.includes(search)) return true;

    // Cerca in tipo movimento
    const tipoLabel = TIPI_MOVIMENTO_LABELS[m.tipo]?.toLowerCase();
    if (tipoLabel?.includes(search)) return true;

    // Cerca in note
    if (m.note?.toLowerCase().includes(search)) return true;

    // Cerca in documento riferimento
    if (m.documento_riferimento?.toLowerCase().includes(search)) return true;

    // Cerca in lotto
    if (m.lotto?.toLowerCase().includes(search)) return true;

    return false;
  });

  // Handler per aprire il dettaglio del movimento
  const handleOpenDetail = (movimento: MovimentoMagazzino) => {
    setSelectedMovimento(movimento);
  };

  // Handler per navigare all'appuntamento
  const handleNavigateToAppuntamento = (appuntamentoId: string) => {
    setSelectedMovimento(null);
    onOpenAppuntamento?.(appuntamentoId);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <Input
            placeholder="Cerca per prodotto, cliente, data, fornitore, tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          Filtri Avanzati
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Tipo Movimento"
              value={filtri.tipo || ''}
              onChange={(e) =>
                setFiltri({
                  ...filtri,
                  tipo: (e.target.value as TipoMovimento) || undefined,
                })
              }
            >
              <option value="">Tutti i tipi</option>
              {Object.entries(TIPI_MOVIMENTO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Input
              label="Data Da"
              type="date"
              value={filtri.data_da || ''}
              onChange={(e) =>
                setFiltri({ ...filtri, data_da: e.target.value || undefined })
              }
            />

            <Input
              label="Data A"
              type="date"
              value={filtri.data_a || ''}
              onChange={(e) =>
                setFiltri({ ...filtri, data_a: e.target.value || undefined })
              }
            />

            <Select
              label="Operatore"
              value={filtri.operatrice_id || ''}
              onChange={(e) =>
                setFiltri({
                  ...filtri,
                  operatrice_id: e.target.value || undefined,
                })
              }
            >
              <option value="">Tutte</option>
              {operatrici.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.nome} {op.cognome}
                </option>
              ))}
            </Select>

            <Select
              label="Cliente"
              value={filtri.cliente_id || ''}
              onChange={(e) =>
                setFiltri({
                  ...filtri,
                  cliente_id: e.target.value || undefined,
                })
              }
            >
              <option value="">Tutti</option>
              {clienti.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.nome} {cl.cognome}
                </option>
              ))}
            </Select>

            <Input
              label="Fornitore"
              value={filtri.fornitore || ''}
              onChange={(e) =>
                setFiltri({ ...filtri, fornitore: e.target.value || undefined })
              }
              placeholder="Cerca fornitore..."
            />

            <div className="flex items-end lg:col-span-2">
              <Button variant="secondary" onClick={handleResetFilters} className="w-full">
                <RotateCcw size={16} />
                Reset Filtri
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">Caricamento...</p>
        </Card>
      ) : filteredMovimenti.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">
            Nessun movimento trovato
          </p>
        </Card>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Prodotto
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Qtà
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Giacenza
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Dettagli
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMovimenti.map((movimento, index) => (
                  <tr
                    key={movimento.id}
                    className={`
                      border-b border-gray-200 dark:border-gray-700
                      hover:bg-primary-50 dark:hover:bg-primary-900/30
                      transition-colors cursor-pointer
                      ${index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800/70'
                      }
                    `}
                    onClick={() => handleOpenDetail(movimento)}
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(movimento.created_at)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {movimento.prodotto_nome}
                        </p>
                        <p className="text-xs text-gray-500">
                          {movimento.prodotto_codice}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getMovimentoIcon(movimento.tipo)}
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {TIPI_MOVIMENTO_LABELS[movimento.tipo] || movimento.tipo}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {getQuantitaDisplay(movimento)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {movimento.giacenza_risultante}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-gray-500 space-y-0.5 max-w-[200px]">
                        {movimento.cliente_nome && (
                          <p className="font-medium text-gray-700 dark:text-gray-300">
                            Cliente: {movimento.cliente_nome}
                          </p>
                        )}
                        {movimento.fornitore && (
                          <p>Forn: {movimento.fornitore}</p>
                        )}
                        {movimento.documento_riferimento && (
                          <p>Doc: {movimento.documento_riferimento}</p>
                        )}
                        {movimento.operatrice_nome && (
                          <p>Op: {movimento.operatrice_nome}</p>
                        )}
                        {movimento.lotto && <p>Lotto: {movimento.lotto}</p>}
                        {movimento.note && (
                          <p className="text-gray-400 italic truncate" title={movimento.note}>
                            {movimento.note}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(movimento);
                        }}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="Dettaglio movimento"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          {searchTerm && `Filtrati: ${filteredMovimenti.length} di ${movimenti.length}`}
          {!searchTerm && `Totale: ${filteredMovimenti.length} movimenti`}
        </span>
        <span className="text-xs">
          Clicca su una riga per i dettagli
        </span>
      </div>

      {/* Modal Dettaglio Movimento */}
      <MovimentoDetailModal
        isOpen={!!selectedMovimento}
        onClose={() => setSelectedMovimento(null)}
        movimento={selectedMovimento}
        onNavigateToAppuntamento={handleNavigateToAppuntamento}
        onNavigateToCarico={onOpenCarico}
        onNavigateToScarico={onOpenScarico}
      />
    </div>
  );
}
