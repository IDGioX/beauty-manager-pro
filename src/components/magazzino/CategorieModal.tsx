import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Toast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import { magazzinoService } from '../../services/magazzino';
import {
  CategoriaProdotto,
  CreateCategoriaProdottoInput,
  TIPO_CATEGORIA_OPTIONS,
} from '../../types/magazzino';

interface CategorieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function CategorieModal({ isOpen, onClose, onSave }: CategorieModalProps) {
  const [categorie, setCategorie] = useState<CategoriaProdotto[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCategoriaProdottoInput>({
    nome: '',
    tipo: 'consumo',
  });

  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();

  const loadCategorie = async () => {
    try {
      setLoading(true);
      const data = await magazzinoService.getCategorie();
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
      setFormData({ nome: '', tipo: 'consumo' });
    }
  }, [isOpen]);

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({ nome: '', tipo: 'consumo' });
  };

  const handleStartEdit = (categoria: CategoriaProdotto) => {
    setEditingId(categoria.id);
    setIsAdding(false);
    setFormData({
      nome: categoria.nome,
      tipo: (categoria.tipo as 'consumo' | 'rivendita' | 'entrambi') || 'consumo',
    });
  };

  const handleCancel2 = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ nome: '', tipo: 'consumo' });
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      setToast({ message: 'Il nome è obbligatorio', type: 'error' });
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        await magazzinoService.updateCategoria(editingId, formData);
        setToast({ message: 'Categoria aggiornata', type: 'success' });
      } else {
        await magazzinoService.createCategoria(formData);
        setToast({ message: 'Categoria creata', type: 'success' });
      }

      await loadCategorie();
      onSave();
      handleCancel2();
    } catch (error: any) {
      setToast({
        message: error.message || 'Errore durante il salvataggio',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoria: CategoriaProdotto) => {
    const confirmed = await showConfirm({
      title: 'Elimina Categoria',
      message: `Sei sicuro di voler eliminare la categoria "${categoria.nome}"?`,
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await magazzinoService.deleteCategoria(categoria.id);
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

  const getTipoLabel = (tipo: string | null) => {
    const opt = TIPO_CATEGORIA_OPTIONS.find((o) => o.value === tipo);
    return opt?.label || tipo || '-';
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
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nome Categoria *"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Es: Creme Viso"
                />

                <Select
                  label="Tipo"
                  value={formData.tipo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo: e.target.value as 'consumo' | 'rivendita' | 'entrambi',
                    })
                  }
                >
                  {TIPO_CATEGORIA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={handleCancel2}>
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
                      <p className="font-medium text-gray-900 dark:text-white">
                        {categoria.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        {categoria.codice} • {getTipoLabel(categoria.tipo)}
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
