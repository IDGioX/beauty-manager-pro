import { useState, useEffect, useRef } from 'react';
import { Search, Package, TrendingUp, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { magazzinoService } from '../../services/magazzino';
import { Prodotto, CreateCaricoInput, MovimentoMagazzino } from '../../types/magazzino';

interface CaricoTabProps {
  onRefresh: () => void;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function CaricoTab({ onRefresh }: CaricoTabProps) {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProdotto, setSelectedProdotto] = useState<Prodotto | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [ultimiCarichi, setUltimiCarichi] = useState<MovimentoMagazzino[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Omit<CreateCaricoInput, 'prodotto_id'>>({
    quantita: 1,
    fornitore: '',
    documento_riferimento: '',
    prezzo_unitario: undefined,
    lotto: '',
    data_scadenza: '',
    note: '',
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadProdotti = async () => {
    try {
      const data = await magazzinoService.getProdotti({ search: searchTerm });
      setProdotti(data);
    } catch (error) {
      console.error('Errore caricamento prodotti:', error);
    }
  };

  const loadUltimiCarichi = async () => {
    try {
      const movimenti = await magazzinoService.getMovimenti(
        { tipo: 'carico' },
        10
      );
      setUltimiCarichi(movimenti);
    } catch (error) {
      console.error('Errore caricamento movimenti:', error);
    }
  };

  useEffect(() => {
    loadProdotti();
  }, [searchTerm]);

  useEffect(() => {
    loadUltimiCarichi();
  }, []);

  // Chiudi dropdown quando si clicca fuori
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

    try {
      setLoading(true);

      await magazzinoService.registraCarico({
        prodotto_id: selectedProdotto.id,
        quantita: formData.quantita,
        fornitore: formData.fornitore || undefined,
        documento_riferimento: formData.documento_riferimento || undefined,
        prezzo_unitario: formData.prezzo_unitario,
        lotto: formData.lotto || undefined,
        data_scadenza: formData.data_scadenza || undefined,
        note: formData.note || undefined,
      });

      setToast({
        message: `Caricati ${formData.quantita} ${selectedProdotto.unita_misura} di ${selectedProdotto.nome}`,
        type: 'success',
      });

      // Reset form
      setSelectedProdotto(null);
      setFormData({
        quantita: 1,
        fornitore: '',
        documento_riferimento: '',
        prezzo_unitario: undefined,
        lotto: '',
        data_scadenza: '',
        note: '',
      });

      await loadUltimiCarichi();
      onRefresh();
    } catch (error: any) {
      setToast({
        message: error.message || 'Errore durante il carico',
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Form Carico */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-emerald-600" size={24} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Registra Carico Merce
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ricerca Prodotto */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Prodotto *
            </label>

            {selectedProdotto ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-emerald-900 dark:text-emerald-100">
                      {selectedProdotto.nome}
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      {selectedProdotto.codice}
                      {selectedProdotto.marca && ` • ${selectedProdotto.marca}`}
                    </p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Giacenza attuale: {selectedProdotto.giacenza}{' '}
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                    size={18}
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Cerca per nome, codice o scansiona barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleBarcodeSearch}
                    onFocus={() => setShowDropdown(true)}
                    className="pl-10"
                  />

                  {/* Dropdown overlay - posizionato sopra il contenuto */}
                  {showDropdown && prodotti.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-y-auto rounded-xl shadow-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                      {prodotti.slice(0, 20).map((prodotto) => (
                        <button
                          key={prodotto.id}
                          type="button"
                          onClick={() => handleSelectProdotto(prodotto)}
                          className="w-full text-left p-3 transition-colors last:border-b-0"
                          style={{ borderBottom: '1px solid var(--glass-border)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                        >
                          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {prodotto.nome}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
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

          {/* Quantità e Prezzo */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantità *"
              type="number"
              min="1"
              step="1"
              value={formData.quantita}
              onChange={(e) =>
                setFormData({ ...formData, quantita: parseInt(e.target.value) || 1 })
              }
              required
            />

            <Input
              label="Prezzo Unitario"
              type="number"
              step="0.01"
              value={formData.prezzo_unitario ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  prezzo_unitario: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              placeholder="0.00"
            />
          </div>

          {/* Fornitore e Documento */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fornitore"
              value={formData.fornitore}
              onChange={(e) =>
                setFormData({ ...formData, fornitore: e.target.value })
              }
              placeholder="Nome fornitore"
            />

            <Input
              label="Documento"
              value={formData.documento_riferimento}
              onChange={(e) =>
                setFormData({ ...formData, documento_riferimento: e.target.value })
              }
              placeholder="N. bolla/fattura"
            />
          </div>

          {/* Lotto e Scadenza */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lotto"
              value={formData.lotto}
              onChange={(e) => setFormData({ ...formData, lotto: e.target.value })}
              placeholder="Numero lotto"
            />

            <Input
              label="Data Scadenza"
              type="date"
              value={formData.data_scadenza}
              onChange={(e) =>
                setFormData({ ...formData, data_scadenza: e.target.value })
              }
            />
          </div>

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
              variant="success"
              className="w-full"
              loading={loading}
              disabled={!selectedProdotto}
            >
              <Check size={18} />
              Registra Carico
            </Button>
          </div>
        </form>
      </Card>

      {/* Ultimi Carichi */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="text-gray-400" size={20} />
          <h3 className="font-medium text-gray-900 dark:text-white">
            Ultimi Carichi
          </h3>
        </div>

        {ultimiCarichi.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nessun carico registrato
          </p>
        ) : (
          <div className="space-y-3">
            {ultimiCarichi.map((movimento) => (
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
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    +{movimento.quantita}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatDate(movimento.created_at)}</span>
                  {movimento.fornitore && <span>• {movimento.fornitore}</span>}
                  {movimento.documento_riferimento && (
                    <span>• Doc: {movimento.documento_riferimento}</span>
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
