import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Search, Undo2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { magazzinoService } from '../../services/magazzino';
import { Prodotto } from '../../types/magazzino';

interface ProdottoUsato {
  prodotto_id: string;
  prodotto_nome: string;
  prodotto_codice: string;
  quantita: number;
  unita_misura: string;
  giacenza_disponibile: number;
  gia_registrato?: boolean; // True se già scaricato dal magazzino
  quantita_originale?: number; // Quantità originale (per calcolare rettifiche)
  da_rimuovere?: boolean; // True se deve essere rimosso (reso)
}

interface ProdottiUsatiSectionProps {
  appuntamentoId?: string;
  operatriceId?: string;
  onProdottiChange: (prodotti: ProdottoUsato[]) => void;
  disabled?: boolean;
}

export function ProdottiUsatiSection({
  appuntamentoId,
  operatriceId: _operatriceId,
  onProdottiChange,
  disabled = false,
}: ProdottiUsatiSectionProps) {
  const [prodottiDisponibili, setProdottiDisponibili] = useState<Prodotto[]>([]);
  const [prodottiUsati, setProdottiUsati] = useState<ProdottoUsato[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loadedAppuntamentoId, setLoadedAppuntamentoId] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  // Carica prodotti già registrati per questo appuntamento
  useEffect(() => {
    const loadProdottiAppuntamento = async () => {
      console.log('DEBUG ProdottiUsatiSection: appuntamentoId=', appuntamentoId, 'loadedAppuntamentoId=', loadedAppuntamentoId);
      if (appuntamentoId && appuntamentoId !== loadedAppuntamentoId) {
        try {
          console.log('DEBUG: Calling getMovimentiAppuntamento with ID:', appuntamentoId);
          const movimenti = await magazzinoService.getMovimentiAppuntamento(appuntamentoId);
          console.log('DEBUG: getMovimentiAppuntamento returned:', movimenti);
          if (movimenti.length > 0) {
            // Converti movimenti in ProdottoUsato (sono già stati scaricati, quindi li mostriamo come già registrati)
            const prodottiCaricati: ProdottoUsato[] = movimenti.map((m) => ({
              prodotto_id: m.prodotto_id,
              prodotto_nome: m.prodotto_nome || 'Prodotto',
              prodotto_codice: m.prodotto_codice || '',
              quantita: m.quantita,
              unita_misura: 'pz',
              giacenza_disponibile: m.quantita + 100, // Permetti di aumentare la quantità
              gia_registrato: true, // Marca come già scaricato
              quantita_originale: m.quantita, // Salva quantità originale per rettifiche
            }));
            console.log('DEBUG: Setting prodottiUsati to:', prodottiCaricati);
            setProdottiUsati(prodottiCaricati);
          } else {
            console.log('DEBUG: No movimenti found for this appointment');
          }
          setLoadedAppuntamentoId(appuntamentoId);
        } catch (error) {
          console.error('Errore caricamento prodotti appuntamento:', error);
        }
      } else {
        console.log('DEBUG: Skipping load - condition not met');
      }
    };

    loadProdottiAppuntamento();
  }, [appuntamentoId, loadedAppuntamentoId]);

  const loadProdotti = async () => {
    try {
      const data = await magazzinoService.getProdotti({
        search: searchTerm || undefined,
        attivoOnly: true,
      });
      // Filtra solo prodotti per uso interno o entrambi
      const filteredData = data.filter(
        (p) => p.uso === 'interno' || p.uso === 'entrambi' || !p.uso
      );
      setProdottiDisponibili(filteredData);
    } catch (error) {
      console.error('Errore caricamento prodotti:', error);
    }
  };

  useEffect(() => {
    if (showSearch) {
      loadProdotti();
    }
  }, [searchTerm, showSearch]);

  useEffect(() => {
    onProdottiChange(prodottiUsati);
  }, [prodottiUsati, onProdottiChange]);

  const handleAddProdotto = (prodotto: Prodotto) => {
    // Verifica se il prodotto è già stato aggiunto
    const esistente = prodottiUsati.find((p) => p.prodotto_id === prodotto.id);
    if (esistente) {
      // Mostra avviso ma non bloccare - incrementa la quantità
      setAvviso(`"${prodotto.nome}" già presente - quantità incrementata`);
      setTimeout(() => setAvviso(null), 3000);
      // Incrementa la quantità del prodotto esistente
      setProdottiUsati(
        prodottiUsati.map((p) =>
          p.prodotto_id === prodotto.id
            ? { ...p, quantita: Math.min(p.quantita + 1, p.giacenza_disponibile) }
            : p
        )
      );
      return;
    }

    const nuovoProdotto: ProdottoUsato = {
      prodotto_id: prodotto.id,
      prodotto_nome: prodotto.nome,
      prodotto_codice: prodotto.codice,
      quantita: 1,
      unita_misura: prodotto.unita_misura,
      giacenza_disponibile: prodotto.giacenza,
    };

    setProdottiUsati([...prodottiUsati, nuovoProdotto]);
    // NON chiudere la ricerca - l'utente può aggiungere altri prodotti
    setSearchTerm(''); // Pulisci solo il campo di ricerca
  };

  const handleRemoveProdotto = (prodottoId: string) => {
    const prodotto = prodottiUsati.find((p) => p.prodotto_id === prodottoId);
    if (prodotto?.gia_registrato) {
      // Per prodotti già scaricati, marca come "da rimuovere" invece di eliminarli
      // Questo permette di creare un movimento di reso al salvataggio
      setProdottiUsati(
        prodottiUsati.map((p) =>
          p.prodotto_id === prodottoId ? { ...p, da_rimuovere: true } : p
        )
      );
    } else {
      // Per nuovi prodotti, rimuovi direttamente dalla lista
      setProdottiUsati(prodottiUsati.filter((p) => p.prodotto_id !== prodottoId));
    }
  };

  const handleRestoreProdotto = (prodottoId: string) => {
    setProdottiUsati(
      prodottiUsati.map((p) =>
        p.prodotto_id === prodottoId ? { ...p, da_rimuovere: false } : p
      )
    );
  };

  const handleQuantitaChange = (prodottoId: string, quantita: number) => {
    setProdottiUsati(
      prodottiUsati.map((p) => {
        if (p.prodotto_id !== prodottoId) return p;
        // Per prodotti già registrati, permetti quantità >= 0 (0 = rimozione completa)
        // Per nuovi prodotti, minimo 1
        const minQta = p.gia_registrato ? 0 : 1;
        const newQta = Math.max(minQta, Math.min(quantita, p.giacenza_disponibile));
        return { ...p, quantita: newQta };
      })
    );
  };

  const handleBarcodeSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const barcode = (e.target as HTMLInputElement).value.trim();
      if (barcode) {
        const prodotto = await magazzinoService.getProdottoByBarcode(barcode);
        if (prodotto && (prodotto.uso === 'interno' || prodotto.uso === 'entrambi' || !prodotto.uso)) {
          handleAddProdotto(prodotto);
        }
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Prodotti Usati
          </span>
        </div>
        {!disabled && !showSearch && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(true)}
          >
            <Plus size={14} />
            Aggiungi
          </Button>
        )}
      </div>

      {/* Ricerca prodotti */}
      {showSearch && !disabled && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--glass-border)', border: '1px solid var(--glass-border)' }}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
              size={16}
              style={{ color: 'var(--color-text-muted)' }}
            />
            <Input
              placeholder="Cerca prodotto o scansiona barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleBarcodeSearch}
              className="pl-9 text-sm"
              autoFocus
            />

            {/* Dropdown overlay - posizionato sopra il contenuto */}
            {prodottiDisponibili.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl shadow-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                {prodottiDisponibili.slice(0, 15).map((prodotto) => {
                  const isAlreadyAdded = prodottiUsati.some(
                    (p) => p.prodotto_id === prodotto.id
                  );
                  const isEsaurito = prodotto.giacenza <= 0;
                  return (
                    <button
                      key={prodotto.id}
                      type="button"
                      onClick={() => handleAddProdotto(prodotto)}
                      disabled={isEsaurito}
                      className={`w-full text-left p-2 text-sm transition-colors last:border-b-0 ${
                        isEsaurito ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        borderBottom: '1px solid var(--glass-border)',
                        background: isEsaurito
                          ? 'var(--glass-border)'
                          : isAlreadyAdded
                          ? 'color-mix(in srgb, var(--color-success) 8%, transparent)'
                          : undefined,
                      }}
                      onMouseEnter={e => { if (!isEsaurito) e.currentTarget.style.background = isAlreadyAdded ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' : 'var(--glass-border)'; }}
                      onMouseLeave={e => { if (!isEsaurito) e.currentTarget.style.background = isAlreadyAdded ? 'color-mix(in srgb, var(--color-success) 8%, transparent)' : ''; }}
                    >
                      <p className="font-medium" style={{ color: isAlreadyAdded ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                        {prodotto.nome}
                        {isAlreadyAdded && <span className="ml-1 text-xs">(clicca per +1)</span>}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {prodotto.codice} • Disp: {prodotto.giacenza} {prodotto.unita_misura}
                        {isEsaurito && ' • Esaurito'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Avviso prodotto già presente */}
          {avviso && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-xs">
              <AlertCircle size={14} />
              {avviso}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSearch(false);
                setSearchTerm('');
                setAvviso(null);
              }}
            >
              Chiudi
            </Button>
          </div>
        </div>
      )}

      {/* Lista prodotti selezionati */}
      {prodottiUsati.length > 0 ? (
        <div className="space-y-2">
          {prodottiUsati.map((prodotto) => {
            const isModificato = prodotto.gia_registrato &&
              prodotto.quantita_originale !== undefined &&
              prodotto.quantita !== prodotto.quantita_originale;

            return (
              <div
                key={prodotto.prodotto_id}
                className={`flex items-center gap-3 p-2 rounded-lg border ${
                  prodotto.da_rimuovere
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-60'
                    : prodotto.gia_registrato
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${
                    prodotto.da_rimuovere
                      ? 'text-red-900 dark:text-red-100 line-through'
                      : prodotto.gia_registrato
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-blue-900 dark:text-blue-100'
                  }`}>
                    {prodotto.prodotto_nome}
                    {prodotto.da_rimuovere ? (
                      <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">
                        (da rimuovere - verrà reso)
                      </span>
                    ) : prodotto.gia_registrato ? (
                      <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                        {isModificato ? '(modificato)' : '(già scaricato)'}
                      </span>
                    ) : null}
                  </p>
                  <p className={`text-xs ${
                    prodotto.da_rimuovere
                      ? 'text-red-700 dark:text-red-300'
                      : prodotto.gia_registrato
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {prodotto.prodotto_codice}
                    {!prodotto.gia_registrato && ` • Disp: ${prodotto.giacenza_disponibile} ${prodotto.unita_misura}`}
                    {isModificato && ` • Era: ${prodotto.quantita_originale}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={prodotto.giacenza_disponibile}
                    value={prodotto.quantita}
                    onChange={(e) =>
                      handleQuantitaChange(
                        prodotto.prodotto_id,
                        parseInt(e.target.value) || 0
                      )
                    }
                    disabled={disabled || prodotto.da_rimuovere}
                    className="w-16 text-center text-sm py-1"
                  />
                  <span className={`text-xs ${
                    prodotto.da_rimuovere
                      ? 'text-red-700 dark:text-red-300'
                      : prodotto.gia_registrato
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {prodotto.unita_misura}
                  </span>

                  {!disabled && (
                    prodotto.da_rimuovere ? (
                      <button
                        type="button"
                        onClick={() => handleRestoreProdotto(prodotto.prodotto_id)}
                        className="p-1 text-red-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                        title="Ripristina prodotto"
                      >
                        <Undo2 size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveProdotto(prodotto.prodotto_id)}
                        className={`p-1 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ${
                          prodotto.gia_registrato ? 'text-green-600' : 'text-blue-600'
                        }`}
                        title={prodotto.gia_registrato ? 'Rimuovi e crea reso' : 'Rimuovi'}
                      >
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Nessun prodotto registrato per questo trattamento
        </p>
      )}
    </div>
  );
}

export type { ProdottoUsato };
