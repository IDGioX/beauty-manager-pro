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
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--input-bg, var(--card-bg))', border: '1px solid var(--glass-border)' }}>
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
              <p className="text-center py-4" style={{ color: 'var(--color-text-muted)' }}>Caricamento...</p>
            ) : categorie.length === 0 ? (
              <p className="text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                Nessuna categoria presente
              </p>
            ) : (
              categorie.map((categoria) => (
                <div
                  key={categoria.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    border: editingId === categoria.id ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
                    background: editingId === categoria.id ? 'var(--input-bg, var(--card-bg))' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--glass-border)' }}>
                      <Tag size={16} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {categoria.nome}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {categoria.codice} • {getTipoLabel(categoria.tipo)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(categoria)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'var(--glass-border)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                      title="Modifica"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(categoria)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'rgb(239, 68, 68)'; e.currentTarget.style.background = 'color-mix(in srgb, rgb(239, 68, 68) 10%, transparent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
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
          <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
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
