import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Calendar, UserX, UserCheck, History } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { Toast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ClientHistoryModal } from '../components/clienti/ClientHistoryModal';
import { useConfirm } from '../hooks/useConfirm';
import { Cliente, CreateClienteInput } from '../types/cliente';
import { clientiService } from '../services/clienti';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export const Clienti: React.FC = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [formData, setFormData] = useState<CreateClienteInput>({
    nome: '',
    cognome: '',
    data_nascita: '',
    cellulare: '',
    email: '',
    indirizzo: '',
    note: '',
    consenso_marketing: false,
    consenso_whatsapp: false,
    consenso_email: false,
  });

  // Storico cliente
  const [historyClienteId, setHistoryClienteId] = useState<string | null>(null);
  const [historyClienteNome, setHistoryClienteNome] = useState<string>('');

  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadClienti();

    // Check if there's a selected client ID in sessionStorage
    const selectedClienteId = sessionStorage.getItem('selectedClienteId');
    if (selectedClienteId) {
      loadAndOpenCliente(selectedClienteId);
      sessionStorage.removeItem('selectedClienteId');
    }

    // Listen for navigation events from the search
    const handleNavigateToCliente = (event: Event) => {
      const customEvent = event as CustomEvent;
      loadAndOpenCliente(customEvent.detail.clienteId);
    };

    window.addEventListener('navigateToCliente', handleNavigateToCliente);

    return () => {
      window.removeEventListener('navigateToCliente', handleNavigateToCliente);
    };
  }, []);

  useEffect(() => {
    loadClienti(searchTerm || undefined);
  }, [showInactive]);

  const loadAndOpenCliente = async (id: string) => {
    try {
      const cliente = await clientiService.getCliente(id);
      openModal(cliente);
    } catch (error) {
      console.error('Errore caricamento cliente:', error);
      showToast('Cliente non trovato', 'error');
    }
  };

  const loadClienti = async (search?: string) => {
    setLoading(true);
    try {
      const data = await clientiService.getClienti(search, 50, 0, showInactive);
      setClienti(data);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadClienti(searchTerm || undefined);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCliente) {
        await clientiService.updateCliente(editingCliente.id, {
          nome: formData.nome,
          cognome: formData.cognome,
          data_nascita: formData.data_nascita || undefined,
          cellulare: formData.cellulare || undefined,
          email: formData.email || undefined,
          indirizzo: formData.indirizzo || undefined,
          note: formData.note || undefined,
          consenso_marketing: formData.consenso_marketing,
          consenso_whatsapp: formData.consenso_whatsapp,
          consenso_email: formData.consenso_email,
        });
        showToast('Cliente modificato con successo!', 'success');
      } else {
        await clientiService.createCliente(formData);
        showToast('Cliente creato con successo!', 'success');
      }

      setIsModalOpen(false);
      setEditingCliente(null);
      resetForm();
      loadClienti();
    } catch (error) {
      console.error('Errore salvataggio cliente:', error);
      showToast('Errore durante il salvataggio del cliente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Disattiva Cliente',
      message: 'Sei sicuro di voler disattivare questo cliente? Potrà essere riattivato in seguito.',
      confirmText: 'Disattiva',
      cancelText: 'Annulla',
      variant: 'warning',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await clientiService.deactivateCliente(id);
      showToast('Cliente disattivato con successo!', 'success');
      loadClienti();
    } catch (error) {
      console.error('Errore disattivazione cliente:', error);
      showToast('Errore durante la disattivazione del cliente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Riattiva Cliente',
      message: 'Sei sicuro di voler riattivare questo cliente?',
      confirmText: 'Riattiva',
      cancelText: 'Annulla',
      variant: 'info',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await clientiService.reactivateCliente(id);
      showToast('Cliente riattivato con successo!', 'success');
      loadClienti();
    } catch (error) {
      console.error('Errore riattivazione cliente:', error);
      showToast('Errore durante la riattivazione del cliente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Elimina Cliente',
      message: 'Sei sicuro di voler eliminare definitivamente questo cliente? Questa azione non può essere annullata.',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await clientiService.deleteCliente(id);
      showToast('Cliente eliminato con successo!', 'success');
      loadClienti();
    } catch (error) {
      console.error('Errore eliminazione cliente:', error);
      showToast('Errore durante l\'eliminazione del cliente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      // Conversione esplicita da 0/1 a boolean (SQLite non ha tipo boolean nativo)
      setFormData({
        nome: cliente.nome,
        cognome: cliente.cognome,
        data_nascita: cliente.data_nascita || '',
        cellulare: cliente.cellulare || '',
        email: cliente.email || '',
        indirizzo: cliente.indirizzo || '',
        note: cliente.note || '',
        consenso_marketing: Boolean(cliente.consenso_marketing),
        consenso_whatsapp: Boolean(cliente.consenso_whatsapp),
        consenso_email: Boolean(cliente.consenso_email),
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cognome: '',
      data_nascita: '',
      cellulare: '',
      email: '',
      indirizzo: '',
      note: '',
      consenso_marketing: false,
      consenso_whatsapp: false,
      consenso_email: false,
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
      <div className="space-y-6">
        {/* Header con ricerca e bottone nuovo */}
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
            Nuovo Cliente
          </Button>
        </div>
      </div>

      {/* Griglia clienti */}
      {loading && clienti.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Caricamento...
        </div>
      ) : clienti.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <Users size={48} className="mx-auto" />
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Nessun cliente trovato</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Inizia aggiungendo il primo cliente
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clienti.map((cliente) => (
            <Card key={cliente.id} className="p-6" hover>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100">
                      {cliente.nome} {cliente.cognome}
                    </h3>
                    {!cliente.attivo && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                        Disattivato
                      </span>
                    )}
                  </div>
                  {cliente.codice && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {cliente.codice}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setHistoryClienteId(cliente.id);
                      setHistoryClienteNome(`${cliente.nome} ${cliente.cognome}`);
                    }}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-primary)' }}
                    title="Storico cliente"
                  >
                    <History size={18} />
                  </button>
                  <button
                    onClick={() => openModal(cliente)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  {cliente.attivo ? (
                    <button
                      onClick={() => handleDeactivate(cliente.id)}
                      className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                      title="Disattiva cliente"
                    >
                      <UserX size={18} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleReactivate(cliente.id)}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Riattiva cliente"
                      >
                        <UserCheck size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Elimina cliente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {cliente.cellulare && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone size={16} />
                    <span className="text-sm">{cliente.cellulare}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail size={16} />
                    <span className="text-sm">{cliente.email}</span>
                  </div>
                )}
                {cliente.citta && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin size={16} />
                    <span className="text-sm">{cliente.citta}</span>
                  </div>
                )}
                {cliente.data_nascita && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar size={16} />
                    <span className="text-sm">
                      {new Date(cliente.data_nascita).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
              </div>

              {cliente.note && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {cliente.note}
                  </p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {cliente.consenso_whatsapp && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full">
                    WhatsApp
                  </span>
                )}
                {cliente.consenso_email && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                    Email
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Creazione/Modifica */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCliente ? 'Modifica Cliente' : 'Nuovo Cliente'}
        size="lg"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          {/* Dati Anagrafici */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Anagrafica</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Nome *"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
              <Input
                label="Cognome *"
                value={formData.cognome}
                onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                required
              />
              <Input
                label="Data di Nascita"
                type="date"
                value={formData.data_nascita || ''}
                onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
              />
            </div>
          </div>

          {/* Contatti */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contatti</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Cellulare"
                type="tel"
                value={formData.cellulare}
                onChange={(e) => setFormData({ ...formData, cellulare: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <Input
              label="Indirizzo"
              value={formData.indirizzo || ''}
              onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
              placeholder="Via, numero civico, città..."
            />
          </div>

          {/* Note */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Textarea
              label="Note"
              value={formData.note || ''}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={2}
              placeholder="Note aggiuntive..."
            />
          </div>

          {/* Consensi */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Consensi</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consenso_marketing}
                  onChange={(e) => setFormData({ ...formData, consenso_marketing: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Marketing</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consenso_whatsapp}
                  onChange={(e) => setFormData({ ...formData, consenso_whatsapp: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">WhatsApp</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consenso_email}
                  onChange={(e) => setFormData({ ...formData, consenso_email: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Annulla
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {editingCliente ? 'Salva' : 'Crea'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
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

      {/* Client History Modal */}
      <ClientHistoryModal
        isOpen={!!historyClienteId}
        onClose={() => {
          setHistoryClienteId(null);
          setHistoryClienteNome('');
        }}
        clienteId={historyClienteId || ''}
        clienteNome={historyClienteNome}
      />
      </div>
    </>
  );
};

// Placeholder icon
const Users: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
