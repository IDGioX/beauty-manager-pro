import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  ClipboardList,
  Check,
  X,
  Trash2,
  Edit2,
  Eye,
  ChevronLeft,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Toast } from '../ui/Toast';
import { magazzinoService } from '../../services/magazzino';
import {
  Inventario,
  RigaInventarioWithProdotto,
  ProdottoPerInventario,
  CreateRigaInventarioInput,
  InventarioRiepilogo,
  StatoInventario,
  STATO_INVENTARIO_LABELS,
  STATO_INVENTARIO_COLORS,
} from '../../types/magazzino';

interface InventarioTabProps {
  onRefresh: () => void;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

type ViewMode = 'list' | 'detail';

export function InventarioTab({ onRefresh }: InventarioTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [inventari, setInventari] = useState<Inventario[]>([]);
  const [filtroStato, setFiltroStato] = useState<StatoInventario | ''>('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Detail view state
  const [selectedInventario, setSelectedInventario] = useState<Inventario | null>(null);
  const [righe, setRighe] = useState<RigaInventarioWithProdotto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProdottoPerInventario[]>([]);

  // Form state for new line
  const [selectedProdotto, setSelectedProdotto] = useState<ProdottoPerInventario | null>(null);
  const [quantitaContata, setQuantitaContata] = useState<number>(0);
  const [lotto, setLotto] = useState('');
  const [dataScadenza, setDataScadenza] = useState('');
  const [noteRiga, setNoteRiga] = useState('');

  // Edit line state
  const [editingRiga, setEditingRiga] = useState<RigaInventarioWithProdotto | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDescrizione, setNewDescrizione] = useState('');
  const [newNote, setNewNote] = useState('');

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [riepilogo, setRiepilogo] = useState<InventarioRiepilogo | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load inventari list
  const loadInventari = async () => {
    try {
      setLoading(true);
      const data = await magazzinoService.getInventari(filtroStato || undefined);
      setInventari(data);
    } catch (error: any) {
      setToast({ message: error.message || 'Errore caricamento inventari', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Load righe for selected inventario
  const loadRighe = async (inventarioId: string) => {
    try {
      const data = await magazzinoService.getRigheInventario(inventarioId);
      setRighe(data);
    } catch (error: any) {
      setToast({ message: error.message || 'Errore caricamento righe', type: 'error' });
    }
  };

  useEffect(() => {
    loadInventari();
  }, [filtroStato]);

  useEffect(() => {
    if (selectedInventario) {
      loadRighe(selectedInventario.id);
    }
  }, [selectedInventario]);

  // Search products for inventory
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length >= 2 && selectedInventario) {
      try {
        const results = await magazzinoService.cercaProdottoPerInventario(
          selectedInventario.id,
          term
        );
        setSearchResults(results);
      } catch (error) {
        console.error('Errore ricerca:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Handle barcode scan (Enter key)
  const handleBarcodeSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm && selectedInventario) {
      e.preventDefault();
      const results = await magazzinoService.cercaProdottoPerInventario(
        selectedInventario.id,
        searchTerm
      );
      if (results.length === 1) {
        handleSelectProdotto(results[0]);
      } else if (results.length === 0) {
        setToast({ message: 'Prodotto non trovato', type: 'error' });
      }
    }
  };

  const handleSelectProdotto = (prodotto: ProdottoPerInventario) => {
    setSelectedProdotto(prodotto);
    setQuantitaContata(prodotto.giacenza); // Default to current stock
    setSearchTerm('');
    setSearchResults([]);
  };

  // Create new inventory session
  const handleCreateInventario = async () => {
    try {
      setLoading(true);
      const inventario = await magazzinoService.creaSessioneInventario({
        descrizione: newDescrizione || undefined,
        note: newNote || undefined,
      });
      setToast({ message: 'Inventario creato con successo', type: 'success' });
      setShowCreateModal(false);
      setNewDescrizione('');
      setNewNote('');
      await loadInventari();
      // Open the new inventory
      setSelectedInventario(inventario);
      setViewMode('detail');
    } catch (error: any) {
      setToast({ message: error.message || 'Errore creazione inventario', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Add line to inventory
  const handleAddRiga = async () => {
    if (!selectedProdotto || !selectedInventario) return;

    try {
      setLoading(true);
      const input: CreateRigaInventarioInput = {
        inventario_id: selectedInventario.id,
        prodotto_id: selectedProdotto.id,
        quantita_contata: quantitaContata,
        lotto: lotto || undefined,
        data_scadenza: dataScadenza || undefined,
        note: noteRiga || undefined,
      };

      await magazzinoService.aggiungiRigaInventario(input);
      setToast({ message: 'Riga aggiunta', type: 'success' });

      // Reset form
      setSelectedProdotto(null);
      setQuantitaContata(0);
      setLotto('');
      setDataScadenza('');
      setNoteRiga('');

      // Reload righe
      await loadRighe(selectedInventario.id);

      // Focus back to search
      searchInputRef.current?.focus();
    } catch (error: any) {
      setToast({ message: error.message || 'Errore aggiunta riga', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Update line
  const handleUpdateRiga = async () => {
    if (!editingRiga) return;

    try {
      setLoading(true);
      await magazzinoService.aggiornaRigaInventario(editingRiga.id, {
        quantita_contata: editingRiga.quantita_contata,
        lotto: editingRiga.lotto || undefined,
        data_scadenza: editingRiga.data_scadenza || undefined,
        note: editingRiga.note || undefined,
      });
      setToast({ message: 'Riga aggiornata', type: 'success' });
      setEditingRiga(null);
      if (selectedInventario) {
        await loadRighe(selectedInventario.id);
      }
    } catch (error: any) {
      setToast({ message: error.message || 'Errore aggiornamento riga', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Delete line
  const handleDeleteRiga = async (id: string) => {
    if (!confirm('Eliminare questa riga?')) return;

    try {
      await magazzinoService.eliminaRigaInventario(id);
      setToast({ message: 'Riga eliminata', type: 'success' });
      if (selectedInventario) {
        await loadRighe(selectedInventario.id);
      }
    } catch (error: any) {
      setToast({ message: error.message || 'Errore eliminazione riga', type: 'error' });
    }
  };

  // Confirm inventory
  const handleConfermaInventario = async () => {
    if (!selectedInventario) return;

    try {
      setLoading(true);
      const result = await magazzinoService.confermaInventario(selectedInventario.id);
      setRiepilogo(result);
      setShowConfirmModal(true);
      // Reload
      const updated = await magazzinoService.getInventario(selectedInventario.id);
      setSelectedInventario(updated);
      await loadInventari();
      onRefresh();
    } catch (error: any) {
      setToast({ message: error.message || 'Errore conferma inventario', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Cancel inventory
  const handleAnnullaInventario = async () => {
    if (!selectedInventario) return;
    if (!confirm('Annullare questo inventario? Le giacenze verranno ripristinate.')) return;

    try {
      setLoading(true);
      await magazzinoService.annullaInventario(selectedInventario.id);
      setToast({ message: 'Inventario annullato', type: 'success' });
      const updated = await magazzinoService.getInventario(selectedInventario.id);
      setSelectedInventario(updated);
      await loadInventari();
      onRefresh();
    } catch (error: any) {
      setToast({ message: error.message || 'Errore annullamento inventario', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Delete inventory
  const handleDeleteInventario = async (id: string) => {
    if (!confirm('Eliminare definitivamente questo inventario?')) return;

    try {
      await magazzinoService.eliminaInventario(id);
      setToast({ message: 'Inventario eliminato', type: 'success' });
      if (selectedInventario?.id === id) {
        setSelectedInventario(null);
        setViewMode('list');
      }
      await loadInventari();
    } catch (error: any) {
      setToast({ message: error.message || 'Errore eliminazione inventario', type: 'error' });
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

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  // Calculate summary
  const calcRiepilogo = () => {
    const totale = righe.length;
    const positive = righe.filter((r) => r.differenza > 0).length;
    const negative = righe.filter((r) => r.differenza < 0).length;
    return { totale, positive, negative };
  };

  const summary = calcRiepilogo();

  // VIEW: List of inventari
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-4">
            <select
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value as StatoInventario | '')}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">Tutti gli stati</option>
              <option value="in_corso">In Corso</option>
              <option value="confermato">Confermati</option>
              <option value="annullato">Annullati</option>
            </select>
          </div>

          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            <Plus size={18} />
            Nuovo Inventario
          </Button>
        </div>

        {/* List */}
        {loading && inventari.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Caricamento...</div>
        ) : inventari.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nessun inventario trovato
            </h3>
            <p className="text-gray-500 mb-4">
              Crea un nuovo inventario per iniziare a contare i prodotti
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={18} />
              Crea Inventario
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {inventari.map((inv) => (
              <Card key={inv.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        inv.stato === 'in_corso'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : inv.stato === 'confermato'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      <ClipboardList
                        size={24}
                        className={
                          inv.stato === 'in_corso'
                            ? 'text-yellow-600'
                            : inv.stato === 'confermato'
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{inv.codice}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            STATO_INVENTARIO_COLORS[inv.stato as StatoInventario]
                          }`}
                        >
                          {STATO_INVENTARIO_LABELS[inv.stato as StatoInventario]}
                        </span>
                      </div>
                      {inv.descrizione && (
                        <p className="text-sm text-gray-500">{inv.descrizione}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Inizio: {formatDate(inv.data_inizio)}
                        {inv.data_chiusura && ` • Chiuso: ${formatDate(inv.data_chiusura)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedInventario(inv);
                        setViewMode('detail');
                      }}
                    >
                      <Eye size={16} />
                      {inv.stato === 'in_corso' ? 'Apri' : 'Dettagli'}
                    </Button>
                    {inv.stato === 'in_corso' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInventario(inv.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Nuovo Inventario"
        >
          <div className="space-y-4">
            <Input
              label="Descrizione"
              value={newDescrizione}
              onChange={(e) => setNewDescrizione(e.target.value)}
              placeholder="Es: Inventario di fine anno"
            />
            <Textarea
              label="Note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              placeholder="Note aggiuntive..."
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateInventario} loading={loading}>
                <Plus size={18} />
                Crea Inventario
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // VIEW: Inventory detail
  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewMode('list');
              setSelectedInventario(null);
              setRighe([]);
            }}
          >
            <ChevronLeft size={18} />
            Indietro
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedInventario?.codice}
              </h2>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  STATO_INVENTARIO_COLORS[selectedInventario?.stato as StatoInventario]
                }`}
              >
                {STATO_INVENTARIO_LABELS[selectedInventario?.stato as StatoInventario]}
              </span>
            </div>
            {selectedInventario?.descrizione && (
              <p className="text-sm text-gray-500">{selectedInventario.descrizione}</p>
            )}
          </div>
        </div>

        {selectedInventario?.stato === 'in_corso' && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleAnnullaInventario} className="text-gray-600">
              <XCircle size={18} />
              Annulla
            </Button>
            <Button
              variant="success"
              onClick={handleConfermaInventario}
              disabled={righe.length === 0}
            >
              <CheckCircle size={18} />
              Conferma Inventario
            </Button>
          </div>
        )}

        {selectedInventario?.stato === 'confermato' && (
          <Button variant="ghost" onClick={handleAnnullaInventario} className="text-red-600">
            <XCircle size={18} />
            Ripristina Giacenze
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totale}</p>
          <p className="text-sm text-gray-500">Righe totali</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{summary.positive}</p>
          <p className="text-sm text-gray-500">Differenze +</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{summary.negative}</p>
          <p className="text-sm text-gray-500">Differenze -</p>
        </Card>
      </div>

      {/* Add line form - only for in_corso */}
      {selectedInventario?.stato === 'in_corso' && (
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Aggiungi Riga</h3>

          {selectedProdotto ? (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedProdotto.nome}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedProdotto.codice}
                      {selectedProdotto.marca && ` • ${selectedProdotto.marca}`}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Giacenza teorica: {selectedProdotto.giacenza} {selectedProdotto.unita_misura}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProdotto(null)}>
                    <X size={16} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="Quantità Contata *"
                  type="number"
                  step="0.01"
                  value={quantitaContata}
                  onChange={(e) => setQuantitaContata(parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Lotto"
                  value={lotto}
                  onChange={(e) => setLotto(e.target.value)}
                  placeholder="N. lotto"
                />
                <Input
                  label="Scadenza"
                  type="date"
                  value={dataScadenza}
                  onChange={(e) => setDataScadenza(e.target.value)}
                />
                <Input
                  label="Note"
                  value={noteRiga}
                  onChange={(e) => setNoteRiga(e.target.value)}
                  placeholder="Note..."
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-sm">
                  <span className="text-gray-500">Differenza: </span>
                  <span
                    className={`font-medium ${
                      quantitaContata - selectedProdotto.giacenza > 0
                        ? 'text-green-600'
                        : quantitaContata - selectedProdotto.giacenza < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {quantitaContata - selectedProdotto.giacenza > 0 ? '+' : ''}
                    {(quantitaContata - selectedProdotto.giacenza).toFixed(2)}
                  </span>
                </div>
                <Button onClick={handleAddRiga} loading={loading}>
                  <Check size={18} />
                  Aggiungi
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                ref={searchInputRef}
                placeholder="Cerca prodotto per nome, codice o scansiona barcode..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleBarcodeSearch}
                className="pl-10"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  {searchResults.map((prodotto) => (
                    <button
                      key={prodotto.id}
                      type="button"
                      onClick={() => handleSelectProdotto(prodotto)}
                      disabled={prodotto.gia_inserito}
                      className={`w-full text-left p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                        prodotto.gia_inserito
                          ? 'bg-gray-50 dark:bg-gray-900 cursor-not-allowed opacity-50'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {prodotto.nome}
                          </p>
                          <p className="text-sm text-gray-500">
                            {prodotto.codice}
                            {prodotto.barcode && ` • ${prodotto.barcode}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Giac: {prodotto.giacenza}
                          </p>
                          {prodotto.gia_inserito && (
                            <p className="text-xs text-amber-600">Già inserito</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Lines table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prodotto
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Giac. Teorica
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Qta Contata
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Differenza
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lotto
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Scadenza
                </th>
                {selectedInventario?.stato === 'in_corso' && (
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Azioni
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {righe.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedInventario?.stato === 'in_corso' ? 7 : 6}
                    className="py-8 text-center text-gray-500"
                  >
                    Nessuna riga inserita
                  </td>
                </tr>
              ) : (
                righe.map((riga, index) => (
                  <tr
                    key={riga.id}
                    className={`
                      border-b border-gray-200 dark:border-gray-700
                      hover:bg-primary-50 dark:hover:bg-primary-900/30
                      transition-colors
                      ${index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800/70'
                      }
                    `}
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {riga.prodotto_nome}
                      </p>
                      <p className="text-sm text-gray-500">{riga.prodotto_codice}</p>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {riga.giacenza_teorica.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                      {editingRiga?.id === riga.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editingRiga.quantita_contata}
                          onChange={(e) =>
                            setEditingRiga({
                              ...editingRiga,
                              quantita_contata: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-24 text-right"
                        />
                      ) : (
                        riga.quantita_contata.toFixed(2)
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-medium ${
                          riga.differenza > 0
                            ? 'text-green-600'
                            : riga.differenza < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {riga.differenza > 0 ? '+' : ''}
                        {riga.differenza.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {riga.lotto || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {formatDateShort(riga.data_scadenza)}
                    </td>
                    {selectedInventario?.stato === 'in_corso' && (
                      <td className="py-3 px-4 text-right">
                        {editingRiga?.id === riga.id ? (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={handleUpdateRiga}>
                              <Check size={16} className="text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingRiga(null)}>
                              <X size={16} className="text-gray-500" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingRiga(riga)}>
                              <Edit2 size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRiga(riga.id)}
                              className="text-red-600"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirm Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Inventario Confermato"
      >
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <CheckCircle className="mx-auto mb-2 text-green-600" size={48} />
            <p className="text-green-800 dark:text-green-200 font-medium">
              L'inventario è stato confermato con successo!
            </p>
          </div>

          {riepilogo && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {riepilogo.totale_righe}
                </p>
                <p className="text-sm text-gray-500">Righe processate</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {riepilogo.prodotti_contati}
                </p>
                <p className="text-sm text-gray-500">Prodotti contati</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-lg font-bold text-green-600">+{riepilogo.differenze_positive}</p>
                <p className="text-sm text-gray-500">Diff. positive</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <p className="text-lg font-bold text-red-600">{riepilogo.differenze_negative}</p>
                <p className="text-sm text-gray-500">Diff. negative</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowConfirmModal(false)}>Chiudi</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
