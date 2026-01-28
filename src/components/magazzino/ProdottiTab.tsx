import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Clock,
  Package,
  Eye,
  EyeOff,
  Settings,
  Printer,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import { magazzinoService } from '../../services/magazzino';
import {
  Prodotto,
  CategoriaProdotto,
  AlertProdotto,
} from '../../types/magazzino';
import { ProdottoModal } from './ProdottoModal';
import { CategorieModal } from './CategorieModal';

interface ProdottiTabProps {
  onRefresh: () => void;
  alerts: AlertProdotto[];
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function ProdottiTab({ onRefresh, alerts: _alerts }: ProdottiTabProps) {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [categorie, setCategorie] = useState<CategoriaProdotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [showInattivi, setShowInattivi] = useState(false);
  const [filterSottoScorta, setFilterSottoScorta] = useState(false);
  const [filterInScadenza, setFilterInScadenza] = useState(false);
  const [showCategorieFilter, setShowCategorieFilter] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategorieModalOpen, setIsCategorieModalOpen] = useState(false);
  const [editingProdotto, setEditingProdotto] = useState<Prodotto | null>(null);

  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodottiData, categorieData] = await Promise.all([
        magazzinoService.getProdotti({
          search: searchTerm || undefined,
          categoriaId: selectedCategoria || undefined,
          attivoOnly: !showInattivi,
          soloSottoScorta: filterSottoScorta,
          soloInScadenza: filterInScadenza,
        }),
        magazzinoService.getCategorie(),
      ]);
      setProdotti(prodottiData);
      setCategorie(categorieData);
    } catch (error) {
      console.error('Errore caricamento prodotti:', error);
      setToast({ message: 'Errore nel caricamento dei prodotti', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm, selectedCategoria, showInattivi, filterSottoScorta, filterInScadenza]);

  const handleOpenModal = (prodotto?: Prodotto) => {
    setEditingProdotto(prodotto || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProdotto(null);
  };

  const handleSave = async () => {
    handleCloseModal();
    await loadData();
    onRefresh();
    setToast({
      message: editingProdotto ? 'Prodotto aggiornato' : 'Prodotto creato',
      type: 'success',
    });
  };

  const handleToggleAttivo = async (prodotto: Prodotto) => {
    try {
      if (prodotto.attivo) {
        await magazzinoService.deactivateProdotto(prodotto.id);
        setToast({ message: 'Prodotto disattivato', type: 'success' });
      } else {
        await magazzinoService.reactivateProdotto(prodotto.id);
        setToast({ message: 'Prodotto riattivato', type: 'success' });
      }
      await loadData();
      onRefresh();
    } catch (error) {
      setToast({ message: 'Errore durante l\'operazione', type: 'error' });
    }
  };

  const handleDelete = async (prodotto: Prodotto) => {
    const confirmed = await showConfirm({
      title: 'Elimina Prodotto',
      message: `Sei sicuro di voler eliminare "${prodotto.nome}"? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await magazzinoService.deleteProdotto(prodotto.id);
        setToast({ message: 'Prodotto eliminato', type: 'success' });
        await loadData();
        onRefresh();
      } catch (error: any) {
        setToast({
          message: error.message || 'Errore durante l\'eliminazione',
          type: 'error',
        });
      }
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  const handlePrintGiacenza = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const totalePezzi = prodotti.reduce((acc, p) => acc + p.giacenza, 0);
    const valoreVendita = prodotti.reduce((acc, p) => acc + (p.prezzo_vendita || 0) * p.giacenza, 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Giacenza Magazzino</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          .header { margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .date { color: #666; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; font-size: 11px; }
          td { font-size: 11px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .alert { color: #c00; font-weight: bold; }
          .summary { margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 4px; }
          .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
          @media print {
            body { margin: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Giacenza Magazzino</h1>
          <p class="date">Stampato il: ${today}</p>
          ${searchTerm ? `<p class="date">Filtro: "${searchTerm}"</p>` : ''}
          ${selectedCategoria ? `<p class="date">Categoria: ${categorie.find(c => c.id === selectedCategoria)?.nome || ''}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Codice</th>
              <th>Prodotto</th>
              <th>Categoria</th>
              <th class="text-center">Giacenza</th>
              <th class="text-center">Scorta Min</th>
              <th class="text-right">Prezzo Vend.</th>
              <th>Scadenza</th>
            </tr>
          </thead>
          <tbody>
            ${prodotti.map(p => {
              const isScorta = p.giacenza <= p.scorta_minima;
              const isScaduto = p.data_scadenza && new Date(p.data_scadenza) < new Date();
              return `
                <tr>
                  <td>${p.codice}</td>
                  <td>
                    ${p.nome}
                    ${p.marca ? `<br><small style="color:#666">${p.marca}${p.linea ? ` - ${p.linea}` : ''}</small>` : ''}
                  </td>
                  <td>${p.categoria_nome || '-'}</td>
                  <td class="text-center ${isScorta ? 'alert' : ''}">${p.giacenza} ${p.unita_misura}</td>
                  <td class="text-center">${p.scorta_minima} ${p.unita_misura}</td>
                  <td class="text-right">${p.prezzo_vendita ? '€ ' + p.prezzo_vendita.toFixed(2) : '-'}</td>
                  <td class="${isScaduto ? 'alert' : ''}">${p.data_scadenza ? new Date(p.data_scadenza).toLocaleDateString('it-IT') : '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row"><strong>Totale Prodotti:</strong> <span>${prodotti.length}</span></div>
          <div class="summary-row"><strong>Totale Pezzi:</strong> <span>${totalePezzi}</span></div>
          <div class="summary-row"><strong>Valore Vendita:</strong> <span>€ ${valoreVendita.toFixed(2)}</span></div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <Input
            placeholder="Cerca per nome, codice, barcode, marca, linea..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtro Categorie Dropdown */}
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCategorieFilter(!showCategorieFilter)}
            className="gap-2"
          >
            <Filter size={16} />
            Categorie
            {selectedCategoria && (
              <span className="px-1.5 py-0.5 text-xs bg-primary-500 text-white rounded">
                1
              </span>
            )}
          </Button>

          {showCategorieFilter && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
              {/* Header */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  Filtra per Categoria
                </span>
                <button
                  onClick={() => setShowCategorieFilter(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>

              <div className="p-2 max-h-64 overflow-y-auto">
                {/* Mostra tutte */}
                <button
                  onClick={() => {
                    setSelectedCategoria('');
                    setShowCategorieFilter(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    !selectedCategoria
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                      : 'text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  ✓ Tutte le categorie ({categorie.length})
                </button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

                {/* Lista categorie con checkbox e conteggio */}
                {categorie.map((cat) => {
                  const isSelected = selectedCategoria === cat.id;
                  const count = prodotti.filter(p => p.categoria_id === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategoria(isSelected ? '' : cat.id);
                        setShowCategorieFilter(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded transition-colors ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            isSelected
                              ? 'text-primary-700 dark:text-primary-300 font-medium'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {cat.nome}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Gestisci Categorie - in fondo al dropdown */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                <button
                  onClick={() => {
                    setShowCategorieFilter(false);
                    setIsCategorieModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
                >
                  <Settings size={14} />
                  Gestisci Categorie
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterSottoScorta ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilterSottoScorta(!filterSottoScorta)}
        >
          <AlertTriangle size={16} />
          Sotto scorta
        </Button>
        <Button
          variant={filterInScadenza ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilterInScadenza(!filterInScadenza)}
        >
          <Clock size={16} />
          In scadenza
        </Button>
        <Button
          variant={showInattivi ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowInattivi(!showInattivi)}
        >
          {showInattivi ? <Eye size={16} /> : <EyeOff size={16} />}
          {showInattivi ? 'Mostra tutti' : 'Solo attivi'}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={handlePrintGiacenza}>
          <Printer size={18} />
          Stampa Giacenza
        </Button>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Nuovo Prodotto
        </Button>
      </div>

      {/* Table */}
      {loading && prodotti.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">Caricamento...</p>
        </Card>
      ) : prodotti.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || selectedCategoria || filterSottoScorta || filterInScadenza
              ? 'Nessun prodotto trovato con i filtri selezionati'
              : 'Nessun prodotto presente. Crea il primo prodotto!'}
          </p>
        </Card>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Codice
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Prodotto
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Categoria
                  </th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Giacenza
                  </th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Scorta Min
                  </th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Prezzo Vend.
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Scadenza
                  </th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {prodotti.map((prodotto, index) => {
                  const isScorta = prodotto.giacenza <= prodotto.scorta_minima;
                  const isScadenza =
                    prodotto.data_scadenza &&
                    new Date(prodotto.data_scadenza) <=
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  const isScaduto =
                    prodotto.data_scadenza &&
                    new Date(prodotto.data_scadenza) < new Date();

                  return (
                    <tr
                      key={prodotto.id}
                      className={`
                        border-b border-gray-200 dark:border-gray-700
                        hover:bg-primary-50 dark:hover:bg-primary-900/30
                        transition-colors
                        ${index % 2 === 0
                          ? 'bg-white dark:bg-gray-900'
                          : 'bg-gray-100 dark:bg-gray-800/70'
                        }
                        ${!prodotto.attivo ? 'opacity-50' : ''}
                      `}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                          {prodotto.codice}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {(isScorta || isScadenza) && (
                            <AlertTriangle
                              size={16}
                              className={
                                isScaduto
                                  ? 'text-red-500'
                                  : 'text-amber-500'
                              }
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {prodotto.nome}
                            </p>
                            {(prodotto.marca || prodotto.linea) && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {[prodotto.marca, prodotto.linea]
                                  .filter(Boolean)
                                  .join(' - ')}
                              </p>
                            )}
                            {!prodotto.attivo && (
                              <span className="text-xs text-red-500 font-medium">
                                Disattivato
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {prodotto.categoria_nome || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-medium ${
                            isScorta
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {prodotto.giacenza} {prodotto.unita_misura}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600 dark:text-gray-400">
                        {prodotto.scorta_minima} {prodotto.unita_misura}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600 dark:text-gray-400">
                        {formatPrice(prodotto.prezzo_vendita)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-sm ${
                            isScaduto
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : isScadenza
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {formatDate(prodotto.data_scadenza)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenModal(prodotto)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title="Modifica"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleAttivo(prodotto)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title={prodotto.attivo ? 'Disattiva' : 'Riattiva'}
                          >
                            {prodotto.attivo ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(prodotto)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Elimina"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProdottoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        prodotto={editingProdotto}
        categorie={categorie}
      />

      <CategorieModal
        isOpen={isCategorieModalOpen}
        onClose={() => setIsCategorieModalOpen(false)}
        onSave={loadData}
      />

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
