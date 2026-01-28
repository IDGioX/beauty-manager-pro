import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Toast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import { trattamentiService } from '../../services/trattamenti';
import {
  CategoriaTrattamento,
  CreateCategoriaTrattamentoInput,
} from '../../types/trattamento';

interface CategorieTrattamentiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function CategorieTrattamentiModal({
  isOpen,
  onClose,
  onSave,
}: CategorieTrattamentiModalProps) {
  const [categorie, setCategorie] = useState<CategoriaTrattamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCategoriaTrattamentoInput>({
    nome: '',
    descrizione: '',
    attiva: true,
  });

  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();

  const loadCategorie = async () => {
    try {
      setLoading(true);
      const data = await trattamentiService.getCategorie();
      setCategorie(data);
    } catch (error) {
      console.error('Errore caricamento categorie:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategorie();
      setIsAdding(false);
      setEditingId(null);
      setFormData({ nome: '', descrizione: '', attiva: true });
    }
  }, [isOpen]);

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({ nome: '', descrizione: '', attiva: true });
  };

  const handleStartEdit = (categoria: CategoriaTrattamento) => {
    setEditingId(categoria.id);
    setIsAdding(false);
    setFormData({
      nome: categoria.nome,
      descrizione: categoria.descrizione || '',
      attiva: categoria.attiva,
    });
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ nome: '', descrizione: '', attiva: true });
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      setToast({ message: 'Il nome è obbligatorio', type: 'error' });
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        await trattamentiService.updateCategoria(editingId, {
          nome: formData.nome.trim(),
          descrizione: formData.descrizione?.trim() || undefined,
          attiva: formData.attiva,
        });
        setToast({ message: 'Categoria aggiornata', type: 'success' });
      } else {
        await trattamentiService.createCategoria({
          nome: formData.nome.trim(),
          descrizione: formData.descrizione?.trim() || undefined,
          attiva: formData.attiva,
        });
        setToast({ message: 'Categoria creata', type: 'success' });
      }

      await loadCategorie();
      onSave();
      handleCancelEdit();
    } catch (error: any) {
      setToast({
        message: error.message || 'Errore durante il salvataggio',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoria: CategoriaTrattamento) => {
    const confirmed = await showConfirm({
      title: 'Elimina Categoria',
      message: `Sei sicuro di voler eliminare la categoria "${categoria.nome}"?`,
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await trattamentiService.deleteCategoria(categoria.id);
        setToast({ message: 'Categoria eliminata', type: 'success' });
        await loadCategorie();
        onSave();
      } catch (error: any) {
        setToast({
          message: error.message || 'Errore durante l\'eliminazione',
          type: 'error',
        });
      }
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gestione Categorie" size="md">
        <div className="space-y-4">
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

          {/* Add/Edit Form */}
          {(isAdding || editingId) && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
              <Input
                label="Nome Categoria *"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Es: Viso, Corpo, Epilazione"
              />

              <Textarea
                label="Descrizione"
                value={formData.descrizione}
                onChange={(e) =>
                  setFormData({ ...formData, descrizione: e.target.value })
                }
                rows={2}
                placeholder="Descrizione della categoria..."
              />

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.attiva}
                  onChange={(e) =>
                    setFormData({ ...formData, attiva: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Categoria attiva
                </span>
              </label>

              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                  Annulla
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  loading={loading}
                >
                  {editingId ? 'Aggiorna' : 'Crea'}
                </Button>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!isAdding && !editingId && (
            <Button variant="secondary" onClick={handleStartAdd} className="w-full">
              <Plus size={18} />
              Nuova Categoria
            </Button>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            {loading && categorie.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Caricamento...</p>
            ) : categorie.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Nessuna categoria presente
              </p>
            ) : (
              categorie.map((categoria) => (
                <div
                  key={categoria.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    editingId === categoria.id
                      ? 'border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Tag size={16} className="text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {categoria.nome}
                        </p>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            categoria.attiva
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {categoria.attiva ? 'Attiva' : 'Inattiva'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {categoria.codice}
                        {categoria.descrizione && ` • ${categoria.descrizione}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(categoria)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(categoria)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Close Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={onClose} className="w-full">
              Chiudi
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
