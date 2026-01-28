import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, UserX, UserCheck, Palette, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { Toast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import type { Operatrice } from '../types/agenda';
import { operatriciService, CreateOperatriceInput, UpdateOperatriceInput } from '../services/operatrici';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

const defaultColors = [
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export const Operatrici: React.FC = () => {
  const [operatrici, setOperatrici] = useState<Operatrice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOperatrice, setEditingOperatrice] = useState<Operatrice | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();

  const [formData, setFormData] = useState<CreateOperatriceInput & { note?: string }>({
    codice: '',
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    colore_agenda: defaultColors[0],
    specializzazioni: '',
    note: '',
  });

  // Genera codice automatico per nuovo operatore
  const generateCodice = async (): Promise<string> => {
    try {
      const allOperatrici = await operatriciService.getOperatrici(true); // Include anche disattivate
      const nextNumber = allOperatrici.length + 1;
      return `OP${String(nextNumber).padStart(3, '0')}`;
    } catch {
      // Fallback con timestamp se errore
      return `OP${Date.now().toString().slice(-6)}`;
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadOperatrici();
  }, [showInactive]);

  const loadOperatrici = async (search?: string) => {
    setLoading(true);
    try {
      // Sempre carica tutti gli operatori per avere accesso a tutti i dati
      const data = await operatriciService.getOperatrici(true);

      // Filtra in base al toggle showInactive:
      // - Se showInactive è true: mostra SOLO i disattivati
      // - Se showInactive è false: mostra SOLO gli attivi
      let filteredData = showInactive
        ? data.filter(op => !op.attiva)
        : data.filter(op => op.attiva);

      // Filtra ulteriormente in base alla ricerca se presente
      if (search) {
        const searchLower = search.toLowerCase();
        filteredData = filteredData.filter(op =>
          op.nome.toLowerCase().includes(searchLower) ||
          op.cognome.toLowerCase().includes(searchLower) ||
          op.codice.toLowerCase().includes(searchLower) ||
          (op.telefono && op.telefono.includes(searchLower)) ||
          (op.email && op.email.toLowerCase().includes(searchLower))
        );
      }

      setOperatrici(filteredData);
    } catch (error) {
      console.error('Errore caricamento operatrici:', error);
      showToast('Errore nel caricamento degli operatori', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOperatrici(searchTerm || undefined);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingOperatrice) {
        const updateInput: UpdateOperatriceInput = {
          codice: editingOperatrice.codice, // Mantieni il codice originale
          nome: formData.nome,
          cognome: formData.cognome,
          telefono: formData.telefono || undefined,
          email: formData.email || undefined,
          colore_agenda: formData.colore_agenda,
          specializzazioni: formData.specializzazioni || undefined,
          note: formData.note || undefined,
        };
        await operatriciService.updateOperatrice(editingOperatrice.id, updateInput);
        showToast('Operatore modificato con successo!', 'success');
      } else {
        // Genera codice automatico
        const autoCodice = await generateCodice();
        const createInput: CreateOperatriceInput = {
          codice: autoCodice,
          nome: formData.nome,
          cognome: formData.cognome,
          telefono: formData.telefono || undefined,
          email: formData.email || undefined,
          colore_agenda: formData.colore_agenda,
          specializzazioni: formData.specializzazioni || undefined,
        };
        await operatriciService.createOperatrice(createInput);
        showToast('Operatore creato con successo!', 'success');
      }

      setIsModalOpen(false);
      setEditingOperatrice(null);
      resetForm();
      loadOperatrici();
    } catch (error: any) {
      console.error('Errore salvataggio operatrice:', error);
      showToast(error.message || 'Errore durante il salvataggio', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Disattiva Operatore',
      message: 'Sei sicuro di voler disattivare questo operatore? Potrà essere riattivato in seguito.',
      confirmText: 'Disattiva',
      cancelText: 'Annulla',
      variant: 'warning',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await operatriciService.deactivateOperatrice(id);
      showToast('Operatore disattivato con successo!', 'success');
      loadOperatrici();
    } catch (error) {
      console.error('Errore disattivazione operatrice:', error);
      showToast('Errore durante la disattivazione', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Riattiva Operatore',
      message: 'Sei sicuro di voler riattivare questo operatore?',
      confirmText: 'Riattiva',
      cancelText: 'Annulla',
      variant: 'info',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await operatriciService.reactivateOperatrice(id);
      showToast('Operatore riattivato con successo!', 'success');
      loadOperatrici();
    } catch (error) {
      console.error('Errore riattivazione operatrice:', error);
      showToast('Errore durante la riattivazione', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Elimina Operatore',
      message: 'Sei sicuro di voler eliminare definitivamente questo operatore? Questa azione è irreversibile e tutti i dati associati andranno persi.',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await operatriciService.deleteOperatrice(id);
      showToast('Operatore eliminato con successo!', 'success');
      loadOperatrici();
    } catch (error: any) {
      console.error('Errore eliminazione operatrice:', error);
      showToast(error.message || 'Errore durante l\'eliminazione', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (operatrice?: Operatrice) => {
    if (operatrice) {
      setEditingOperatrice(operatrice);
      setFormData({
        codice: operatrice.codice,
        nome: operatrice.nome,
        cognome: operatrice.cognome,
        telefono: operatrice.telefono || '',
        email: operatrice.email || '',
        colore_agenda: operatrice.colore_agenda,
        specializzazioni: operatrice.specializzazioni || '',
        note: operatrice.note || '',
      });
    } else {
      setEditingOperatrice(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      codice: '',
      nome: '',
      cognome: '',
      telefono: '',
      email: '',
      colore_agenda: defaultColors[0],
      specializzazioni: '',
      note: '',
    });
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={handleCancel}
      />
      <div className="space-y-6">
        {/* Header con ricerca e bottoni */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <Input
                type="text"
                placeholder="Cerca per nome, cognome, telefono o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          <div className="flex gap-3">
            <Button
              variant={showInactive ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Nascondi disattivati' : 'Mostra disattivati'}
            </Button>
            <Button onClick={() => openModal()} variant="primary" size="lg">
              <Plus size={20} className="mr-2" />
              Nuovo Operatore
            </Button>
          </div>
        </div>

      {/* Grid operatrici */}
      {loading && operatrici.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Caricamento...
        </div>
      ) : operatrici.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">Nessun operatore trovato</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 mb-4">
            Inizia aggiungendo il primo operatore
          </p>
          <Button onClick={() => openModal()}>Aggiungi operatore</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {operatrici.map((operatrice) => (
            <Card
              key={operatrice.id}
              className={`p-6 relative ${!operatrice.attiva ? 'opacity-60' : ''}`}
              hover
            >
              {/* Indicatore colore */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                style={{ backgroundColor: operatrice.colore_agenda }}
              />

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-heading font-semibold text-gray-900 dark:text-white">
                    {operatrice.cognome} {operatrice.nome}
                  </h3>
                  {operatrice.codice && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {operatrice.codice}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(operatrice)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Modifica"
                  >
                    <Edit2 size={18} />
                  </button>
                  {operatrice.attiva ? (
                    <button
                      onClick={() => handleDeactivate(operatrice.id)}
                      className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                      title="Disattiva"
                    >
                      <UserX size={18} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleReactivate(operatrice.id)}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Riattiva"
                      >
                        <UserCheck size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(operatrice.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Elimina definitivamente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!operatrice.attiva && (
                <div className="mb-3">
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded">
                    Disattivata
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {operatrice.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone size={16} className="text-gray-400 dark:text-gray-500" />
                    <span>{operatrice.telefono}</span>
                  </div>
                )}
                {operatrice.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail size={16} className="text-gray-400 dark:text-gray-500" />
                    <span className="truncate">{operatrice.email}</span>
                  </div>
                )}
                {operatrice.specializzazioni && (
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Palette size={16} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{operatrice.specializzazioni}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOperatrice ? 'Modifica Operatore' : 'Nuovo Operatore'}
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          {/* Anagrafica */}
          <div className="space-y-3">
            {editingOperatrice && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Codice:</span>
                <span className="font-medium text-gray-900 dark:text-white">{editingOperatrice.codice}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nome *"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                disabled={loading}
              />
              <Input
                label="Cognome *"
                value={formData.cognome}
                onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Colore Agenda */}
          <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Colore Agenda</span>
            <div className="flex gap-2 flex-wrap">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, colore_agenda: color })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    formData.colore_agenda === color
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Contatti */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contatti</span>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                disabled={loading}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Specializzazioni */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Input
              label="Specializzazioni"
              value={formData.specializzazioni}
              onChange={(e) => setFormData({ ...formData, specializzazioni: e.target.value })}
              placeholder="es: Massaggi, Trattamenti viso..."
              disabled={loading}
            />

            {editingOperatrice && (
              <Textarea
                label="Note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={2}
                disabled={loading}
              />
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Salvataggio...' : editingOperatrice ? 'Salva' : 'Crea'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
    </>
  );
};
