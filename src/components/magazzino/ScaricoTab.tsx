import { useState, useEffect, useRef } from 'react';
import { Search, TrendingDown, Check, User, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { magazzinoService } from '../../services/magazzino';
import { operatriciService } from '../../services/operatrici';
import { clientiService } from '../../services/clienti';
import { Prodotto, MovimentoMagazzino } from '../../types/magazzino';
import { Operatrice } from '../../types/agenda';
import { Cliente } from '../../types/cliente';

interface ScaricoTabProps {
  onRefresh: () => void;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

type TipoScarico = 'scarico_uso' | 'scarico_vendita' | 'scarto';

export function ScaricoTab({ onRefresh }: ScaricoTabProps) {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [operatrici, setOperatrici] = useState<Operatrice[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchCliente, setSearchCliente] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [selectedProdotto, setSelectedProdotto] = useState<Prodotto | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [ultimiScarichi, setUltimiScarichi] = useState<MovimentoMagazzino[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  const [tipoScarico, setTipoScarico] = useState<TipoScarico>('scarico_uso');
  const [formData, setFormData] = useState({
    quantita: 1,
    operatrice_id: '',
    cliente_id: '',
    note: '',
  });

  const loadProdotti = async () => {
    try {
      const data = await magazzinoService.getProdotti({ search: searchTerm });
      setProdotti(data);
    } catch (error) {
      console.error('Errore caricamento prodotti:', error);
    }
  };

  const loadOperatrici = async () => {
    try {
      const data = await operatriciService.getOperatrici();
      setOperatrici(data.filter((o) => o.attiva));
    } catch (error) {
      console.error('Errore caricamento operatrici:', error);
    }
  };

  const loadClienti = async () => {
    try {
      const data = await clientiService.getClienti(searchCliente, 10);
      setClienti(data);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
    }
  };

  const loadUltimiScarichi = async () => {
    try {
      const movimenti = await magazzinoService.getMovimenti({}, 10);
      setUltimiScarichi(
        movimenti.filter((m) =>
          ['scarico_uso', 'scarico_vendita', 'scarto'].includes(m.tipo)
        )
      );
    } catch (error) {
      console.error('Errore caricamento movimenti:', error);
    }
  };

  useEffect(() => {
    loadProdotti();
  }, [searchTerm]);

  useEffect(() => {
    loadClienti();
  }, [searchCliente]);

  useEffect(() => {
    loadOperatrici();
    loadUltimiScarichi();
  }, []);

  // Chiudi dropdown prodotti quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Chiudi dropdown clienti quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(event.target as Node)) {
        setShowClienteDropdown(false);
      }
    };

    if (showClienteDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClienteDropdown]);

  const handleBarcodeSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const barcode = (e.target as HTMLInputElement).value.trim();
      if (barcode) {
        const prodotto = await magazzinoService.getProdottoByBarcode(barcode);
        if (prodotto) {
          setSelectedProdotto(prodotto);
          setSearchTerm('');
          setShowDropdown(false);
          setToast({ message: `Prodotto trovato: ${prodotto.nome}`, type: 'success' });
        } else {
          setToast({ message: 'Prodotto non trovato con questo barcode', type: 'error' });
        }
      }
    }
  };

  const handleSelectProdotto = (prodotto: Prodotto) => {
    setSelectedProdotto(prodotto);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProdotto) {
      setToast({ message: 'Seleziona un prodotto', type: 'error' });
      return;
    }

    if (formData.quantita <= 0) {
      setToast({ message: 'La quantità deve essere maggiore di 0', type: 'error' });
      return;
    }

    if (formData.quantita > selectedProdotto.giacenza) {
      setToast({
        message: `Quantità insufficiente. Giacenza disponibile: ${selectedProdotto.giacenza}`,
        type: 'error',
      });
      return;
    }

    try {
      setLoading(true);

      await magazzinoService.registraScarico({
        prodotto_id: selectedProdotto.id,
        quantita: formData.quantita,
        tipo: tipoScarico,
        operatrice_id: formData.operatrice_id || undefined,
        cliente_id: formData.cliente_id || undefined,
        note: formData.note || undefined,
      });

      const tipoLabel =
        tipoScarico === 'scarico_uso'
          ? 'Uso interno'
          : tipoScarico === 'scarico_vendita'
          ? 'Vendita'
          : 'Scarto';

      setToast({
        message: `${tipoLabel}: ${formData.quantita} ${selectedProdotto.unita_misura} di ${selectedProdotto.nome}`,
        type: 'success',
      });

      // Reset form
      setSelectedProdotto(null);
      setFormData({
        quantita: 1,
        operatrice_id: '',
        cliente_id: '',
        note: '',
      });

      await loadUltimiScarichi();
      onRefresh();
    } catch (error: any) {
      setToast({
        message: error.message || 'Errore durante lo scarico',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
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

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'scarico_uso':
        return 'Uso Interno';
      case 'scarico_vendita':
        return 'Vendita';
      case 'scarto':
        return 'Scarto';
      default:
        return tipo;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Form Scarico */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingDown className="text-red-600" size={24} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Registra Scarico
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo Scarico */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo Scarico *
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tipoScarico === 'scarico_uso' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTipoScarico('scarico_uso')}
                className="flex-1"
              >
                Uso Interno
              </Button>
              <Button
                type="button"
                variant={tipoScarico === 'scarico_vendita' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTipoScarico('scarico_vendita')}
                className="flex-1"
              >
                Vendita
              </Button>
              <Button
                type="button"
                variant={tipoScarico === 'scarto' ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => setTipoScarico('scarto')}
                className="flex-1"
              >
                Scarto
              </Button>
            </div>
          </div>

          {/* Ricerca Prodotto */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Prodotto *
            </label>

            {selectedProdotto ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedProdotto.nome}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedProdotto.codice}
                      {selectedProdotto.marca && ` • ${selectedProdotto.marca}`}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Giacenza disponibile: {selectedProdotto.giacenza}{' '}
                      {selectedProdotto.unita_misura}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProdotto(null)}
                    type="button"
                  >
                    Cambia
                  </Button>
                </div>
              </div>
            ) : (
              <div ref={dropdownRef}>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
                    size={18}
                  />
                  <Input
                    placeholder="Cerca per nome, codice o scansiona barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleBarcodeSearch}
                    onFocus={() => setShowDropdown(true)}
                    className="pl-10"
                  />

                  {/* Dropdown overlay - posizionato sopra il contenuto */}
                  {showDropdown && prodotti.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                      {prodotti.slice(0, 20).map((prodotto) => (
                        <button
                          key={prodotto.id}
                          type="button"
                          onClick={() => handleSelectProdotto(prodotto)}
                          className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {prodotto.nome}
                          </p>
                          <p className="text-sm text-gray-500">
                            {prodotto.codice} • Giacenza: {prodotto.giacenza}{' '}
                            {prodotto.unita_misura}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quantità */}
          <Input
            label="Quantità *"
            type="number"
            min="1"
            max={selectedProdotto?.giacenza || 9999}
            step="1"
            value={formData.quantita}
            onChange={(e) =>
              setFormData({ ...formData, quantita: parseInt(e.target.value) || 1 })
            }
            required
          />

          {/* Operatore */}
          <Select
            label="Operatore"
            value={formData.operatrice_id}
            onChange={(e) =>
              setFormData({ ...formData, operatrice_id: e.target.value })
            }
            icon={<User size={16} />}
          >
            <option value="">Seleziona operatore (opzionale)</option>
            {operatrici.map((op) => (
              <option key={op.id} value={op.id}>
                {op.nome} {op.cognome}
              </option>
            ))}
          </Select>

          {/* Cliente (solo per vendita) */}
          {tipoScarico === 'scarico_vendita' && (
            <div ref={clienteDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cliente
              </label>
              <div className="relative">
                <Users
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
                  size={16}
                />
                <Input
                  placeholder="Cerca cliente..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  onFocus={() => setShowClienteDropdown(true)}
                  className="pl-10"
                />

                {/* Dropdown overlay - posizionato sopra il contenuto */}
                {showClienteDropdown && clienti.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    {clienti.slice(0, 10).map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, cliente_id: cliente.id });
                          setSearchCliente(`${cliente.nome} ${cliente.cognome}`);
                          setShowClienteDropdown(false);
                        }}
                        className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      >
                        {cliente.nome} {cliente.cognome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Note */}
          <Textarea
            label="Note"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={2}
            placeholder="Note aggiuntive..."
          />

          {/* Submit */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="danger"
              className="w-full"
              loading={loading}
              disabled={!selectedProdotto}
            >
              <Check size={18} />
              Registra Scarico
            </Button>
          </div>
        </form>
      </Card>

      {/* Ultimi Scarichi */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="text-gray-400" size={20} />
          <h3 className="font-medium text-gray-900 dark:text-white">
            Ultimi Scarichi
          </h3>
        </div>

        {ultimiScarichi.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nessuno scarico registrato
          </p>
        ) : (
          <div className="space-y-3">
            {ultimiScarichi.map((movimento) => (
              <div
                key={movimento.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {movimento.prodotto_nome}
                    </p>
                    <p className="text-sm text-gray-500">
                      {movimento.prodotto_codice}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      -{movimento.quantita}
                    </span>
                    <p className="text-xs text-gray-500">
                      {getTipoLabel(movimento.tipo)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatDate(movimento.created_at)}</span>
                  {movimento.operatrice_nome && (
                    <span>• {movimento.operatrice_nome}</span>
                  )}
                  {movimento.cliente_nome && (
                    <span>• Cliente: {movimento.cliente_nome}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
