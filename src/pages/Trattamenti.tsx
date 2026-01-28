import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Clock, Sparkles, FolderOpen, Filter, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Toast } from '../components/ui/Toast';
import { CategorieTrattamentiModal } from '../components/trattamenti/CategorieTrattamentiModal';
import { trattamentiService } from '../services/trattamenti';
import {
  Trattamento,
  CategoriaTrattamento,
  CreateTrattamentoInput,
} from '../types/trattamento';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export const Trattamenti: React.FC = () => {
  const [trattamenti, setTrattamenti] = useState<Trattamento[]>([]);
  const [categorie, setCategorie] = useState<CategoriaTrattamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [toast, setToast] = useState<ToastState | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrattamento, setEditingTrattamento] = useState<Trattamento | null>(null);
  const [formData, setFormData] = useState<CreateTrattamentoInput>({
    categoria_id: '',
    nome: '',
    descrizione: '',
    durata_minuti: 30,
    prezzo_listino: 0,
    attivo: true,
    note_operative: '',
  });

  // Stati per gestione categorie
  const [isCategorieModalOpen, setIsCategorieModalOpen] = useState(false);
  const [showCategorieFilter, setShowCategorieFilter] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trattamentiData, categorieData] = await Promise.all([
        trattamentiService.getTrattamenti(undefined, true),
        trattamentiService.getCategorie(),
      ]);
      setTrattamenti(trattamentiData);
      setCategorie(categorieData);
    } catch (error) {
      console.error('Errore caricamento:', error);
      showToast('Errore nel caricamento dei dati', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (trattamento?: Trattamento) => {
    if (trattamento) {
      setEditingTrattamento(trattamento);
      setFormData({
        categoria_id: trattamento.categoria_id || '',
        nome: trattamento.nome,
        descrizione: trattamento.descrizione || '',
        durata_minuti: Number(trattamento.durata_minuti),
        prezzo_listino: trattamento.prezzo_listino || 0,
        attivo: trattamento.attivo,
        note_operative: trattamento.note_operative || '',
      });
    } else {
      setEditingTrattamento(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTrattamento(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      categoria_id: categorie[0]?.id ?? '',
      nome: '',
      descrizione: '',
      durata_minuti: 30,
      prezzo_listino: 0,
      attivo: true,
      note_operative: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.categoria_id) {
      showToast('Nome e categoria sono obbligatori', 'error');
      return;
    }

    try {
      if (editingTrattamento) {
        await trattamentiService.updateTrattamento(editingTrattamento.id, {
          categoria_id: formData.categoria_id,
          nome: formData.nome,
          descrizione: formData.descrizione || undefined,
          durata_minuti: formData.durata_minuti,
          prezzo_listino: formData.prezzo_listino,
          attivo: formData.attivo,
          note_operative: formData.note_operative || undefined,
        });
        showToast('Trattamento aggiornato con successo', 'success');
      } else {
        await trattamentiService.createTrattamento(formData);
        showToast('Trattamento creato con successo', 'success');
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error('Errore salvataggio:', error);
      showToast('Errore nel salvataggio', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const trattamento = trattamenti.find(t => t.id === id);
    if (!trattamento) return;

    if (!confirm(`Sei sicuro di voler eliminare il trattamento "${trattamento.nome}"?`)) {
      return;
    }

    try {
      await trattamentiService.deleteTrattamento(id);
      showToast('Trattamento eliminato', 'success');
      loadData();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      showToast('Errore nell\'eliminazione', 'error');
    }
  };

  const filteredTrattamenti = trattamenti.filter((t) => {
    const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.descrizione && t.descrizione.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategoria = !selectedCategoria || t.categoria_id === selectedCategoria;
    return matchesSearch && matchesCategoria;
  });

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="space-y-6">
        {/* Header con ricerca e filtri */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Barra di ricerca */}
          <div className="relative flex-1 w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              placeholder="Cerca trattamenti per nome o descrizione..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro Categorie */}
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

              {/* Dropdown Filtro Categorie */}
              {showCategorieFilter && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      Filtra per Categoria
                    </span>
                    <button
                      onClick={() => setShowCategorieFilter(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <X size={16} />
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

                    {/* Lista categorie */}
                    {categorie.map((cat) => {
                      const isSelected = selectedCategoria === cat.id;
                      const count = trattamenti.filter(t => t.categoria_id === cat.id).length;

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
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-sm ${isSelected ? 'text-primary-700 dark:text-primary-300 font-medium' : 'text-gray-900 dark:text-white'}`}>
                              {cat.nome}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {count}
                          </span>
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
                      <FolderOpen size={14} />
                      Gestisci Categorie
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Nuovo Trattamento */}
            <Button onClick={() => openModal()} variant="primary" size="sm">
              <Plus size={16} />
              Nuovo Trattamento
            </Button>
          </div>
        </div>

        {/* Lista trattamenti */}
        {loading && trattamenti.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Caricamento...</p>
          </div>
        ) : filteredTrattamenti.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <Sparkles className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nessun trattamento trovato</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || selectedCategoria
                ? 'Prova a modificare i filtri di ricerca'
                : 'Inizia creando il primo trattamento'}
            </p>
            {!searchTerm && !selectedCategoria && (
              <Button onClick={() => openModal()} variant="primary">
                <Plus size={18} />
                Crea Primo Trattamento
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Trattamento</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Categoria</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Durata</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Prezzo</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Stato</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrattamenti.map((trattamento, index) => (
                    <tr
                      key={trattamento.id}
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
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {trattamento.nome}
                          </p>
                          {trattamento.descrizione && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {trattamento.descrizione}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {trattamento.categoria_nome || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <Clock size={14} className="text-gray-400" />
                          <span className="text-sm">{trattamento.durata_minuti} min</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {trattamento.prezzo_listino ? (
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            € {trattamento.prezzo_listino.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            trattamento.attivo
                              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {trattamento.attivo ? 'Attivo' : 'Inattivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openModal(trattamento)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Modifica"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(trattamento.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Elimina"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Creazione/Modifica */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingTrattamento ? 'Modifica Trattamento' : 'Nuovo Trattamento'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Categoria *"
              value={formData.categoria_id}
              onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
              required
            >
              <option value="">Seleziona categoria</option>
              {categorie.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </Select>

            <Input
              label="Nome Trattamento *"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="es. Pulizia viso profonda"
              required
            />

            <Textarea
              label="Descrizione"
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              rows={3}
              placeholder="Descrizione del trattamento..."
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Durata (minuti) *"
                value={formData.durata_minuti}
                onChange={(e) => setFormData({ ...formData, durata_minuti: parseInt(e.target.value) || 0 })}
                min="1"
                required
              />

              <Input
                type="number"
                label="Prezzo (€)"
                value={formData.prezzo_listino}
                onChange={(e) => setFormData({ ...formData, prezzo_listino: parseFloat(e.target.value) || 0 })}
                step="0.01"
                min="0"
              />
            </div>

            <Textarea
              label="Note Operative"
              value={formData.note_operative}
              onChange={(e) => setFormData({ ...formData, note_operative: e.target.value })}
              rows={2}
              placeholder="Note per gli operatori..."
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.attivo}
                onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Trattamento attivo</span>
            </label>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={closeModal}>
                Annulla
              </Button>
              <Button type="submit">
                {editingTrattamento ? 'Salva Modifiche' : 'Crea Trattamento'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Gestione Categorie */}
        <CategorieTrattamentiModal
          isOpen={isCategorieModalOpen}
          onClose={() => setIsCategorieModalOpen(false)}
          onSave={loadData}
        />
      </div>
    </>
  );
};
