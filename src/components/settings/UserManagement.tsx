import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  UserX,
  UserCheck,
  KeyRound,
  Shield,
  User as UserIcon,
  Monitor,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { usersService } from '../../services/users';
import { toast } from '../../stores/toastStore';
import { useConfirm } from '../../hooks/useConfirm';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { User, CreateUserInput, UpdateUserInput } from '../../types/user';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin: {
    label: 'Admin',
    color: 'var(--color-primary)',
    icon: <Shield size={14} />,
  },
  operatrice: {
    label: 'Operatrice',
    color: '#EC4899',
    icon: <UserIcon size={14} />,
  },
  reception: {
    label: 'Reception',
    color: '#3B82F6',
    icon: <Monitor size={14} />,
  },
};

export const UserManagement: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Password modal
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Form
  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    password: '',
    role: 'operatrice',
    nome: '',
    cognome: '',
    email: '',
  });
  const [showFormPassword, setShowFormPassword] = useState(false);

  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const all = await usersService.getAll();
      setUsers(all);
    } catch (err: any) {
      toast.error('Errore', err.message || 'Impossibile caricare gli utenti');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = showInactive
    ? users
    : users.filter((u) => u.attivo);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'operatrice',
      nome: '',
      cognome: '',
      email: '',
    });
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      nome: user.nome,
      cognome: user.cognome,
      email: user.email || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingUser) {
        // Update
        const updateInput: UpdateUserInput = {
          nome: formData.nome,
          cognome: formData.cognome,
          email: formData.email || undefined,
          role: formData.role,
        };
        await usersService.update(editingUser.id, updateInput, currentUser?.role || '');
        toast.success('Utente aggiornato');
      } else {
        // Create
        if (!formData.username.trim() || !formData.password) {
          toast.error('Errore', 'Username e password sono obbligatori');
          setSaving(false);
          return;
        }
        await usersService.create(formData, currentUser?.role || '');
        toast.success('Utente creato');
      }
      setIsModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      toast.error('Errore', err.message || 'Operazione fallita');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    const action = user.attivo ? 'disattivare' : 'riattivare';
    const confirmed = await showConfirm({
      title: `${user.attivo ? 'Disattiva' : 'Riattiva'} Utente`,
      message: `Sei sicuro di voler ${action} l'utente "${user.nome} ${user.cognome}"?${
        user.attivo ? ' Non potrà più accedere al sistema.' : ''
      }`,
      confirmText: user.attivo ? 'Disattiva' : 'Riattiva',
      variant: user.attivo ? 'warning' : 'info',
    });

    if (!confirmed) return;

    try {
      await usersService.toggleActive(user.id, !user.attivo, currentUser?.id || '');
      toast.success(`Utente ${user.attivo ? 'disattivato' : 'riattivato'}`);
      await loadUsers();
    } catch (err: any) {
      toast.error('Errore', err.message || 'Operazione fallita');
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = await showConfirm({
      title: 'Elimina Utente',
      message: `Sei sicuro di voler eliminare definitivamente l'utente "${user.nome} ${user.cognome}"? Questa azione non è reversibile.`,
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await usersService.delete(user.id, currentUser?.role || '');
      toast.success('Utente eliminato');
      await loadUsers();
    } catch (err: any) {
      toast.error('Errore', err.message || 'Eliminazione fallita');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || newPassword.length < 4) return;

    setSavingPassword(true);
    try {
      await usersService.changePassword(passwordModalUser.id, null, newPassword);
      toast.success('Password aggiornata');
      setPasswordModalUser(null);
      setNewPassword('');
      setShowPassword(false);
    } catch (err: any) {
      toast.error('Errore', err.message || 'Cambio password fallito');
    } finally {
      setSavingPassword(false);
    }
  };

  // Roles available based on caller
  const availableRoles = isAdmin
    ? ['admin', 'operatrice', 'reception']
    : ['operatrice', 'reception'];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl animate-pulse"
            style={{ background: 'var(--glass-border)' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {filteredUsers.length} utent{filteredUsers.length === 1 ? 'e' : 'i'}
            {!showInactive && users.some((u) => !u.attivo) && (
              <span className="ml-1">
                ({users.filter((u) => !u.attivo).length} inattiv{users.filter((u) => !u.attivo).length === 1 ? 'o' : 'i'})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {users.some((u) => !u.attivo) && (
            <Button
              variant={showInactive ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Nascondi Inattivi' : 'Mostra Inattivi'}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={16} />
            Nuovo Utente
          </Button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.operatrice;
          const isSelf = user.id === currentUser?.id;

          return (
            <div
              key={user.id}
              className="rounded-xl overflow-hidden transition-colors duration-200"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
                opacity: user.attivo ? 1 : 0.6,
              }}
            >
              {/* Color bar */}
              <div className="h-1.5" style={{ background: roleConfig.color }} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold text-base truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {user.nome} {user.cognome}
                    </h3>
                    <p
                      className="text-sm truncate"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      @{user.username}
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white flex-shrink-0"
                    style={{ background: roleConfig.color }}
                  >
                    {roleConfig.icon}
                    {roleConfig.label}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1 mb-4">
                  {user.email && (
                    <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {user.email}
                    </p>
                  )}
                  {!user.attivo && (
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)',
                        color: 'var(--color-danger)',
                      }}
                    >
                      Disattivato
                    </span>
                  )}
                  {isSelf && (
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      Tu
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(user)}
                    title="Modifica"
                    className="flex items-center gap-1"
                  >
                    <Edit3 size={14} />
                    <span className="text-xs">Modifica</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPasswordModalUser(user);
                      setNewPassword('');
                      setShowPassword(false);
                    }}
                    title="Cambia Password"
                    className="flex items-center gap-1"
                  >
                    <KeyRound size={14} />
                    <span className="text-xs">Password</span>
                  </Button>
                  {!isSelf && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        title={user.attivo ? 'Disattiva' : 'Riattiva'}
                        className="flex items-center gap-1"
                      >
                        {user.attivo ? <UserX size={14} /> : <UserCheck size={14} />}
                        <span className="text-xs">{user.attivo ? 'Disattiva' : 'Riattiva'}</span>
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          title="Elimina"
                          className="flex items-center gap-1 !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div
          className="text-center py-12 rounded-xl"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
        >
          <UserIcon size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Nessun utente trovato</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome *"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
              disabled={saving}
            />
            <Input
              label="Cognome *"
              value={formData.cognome}
              onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
              required
              disabled={saving}
            />
          </div>

          <Input
            label="Username *"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            disabled={saving || !!editingUser}
            helperText={editingUser ? 'Lo username non può essere modificato' : undefined}
          />

          {!editingUser && (
            <div className="relative">
              <Input
                label="Password *"
                type={showFormPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={saving}
                helperText="Minimo 4 caratteri"
              />
              <button
                type="button"
                onClick={() => setShowFormPassword(!showFormPassword)}
                className="absolute right-3 top-[38px] p-1 rounded"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {showFormPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={saving}
          />

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Ruolo *
            </label>
            <div className="flex gap-2">
              {availableRoles.map((role) => {
                const config = ROLE_CONFIG[role];
                const isSelected = formData.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: role as CreateUserInput['role'] })}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-colors font-medium text-sm"
                    style={{
                      borderColor: isSelected ? config.color : 'var(--glass-border)',
                      background: isSelected
                        ? `color-mix(in srgb, ${config.color} 10%, transparent)`
                        : 'transparent',
                      color: isSelected ? config.color : 'var(--color-text-secondary)',
                    }}
                  >
                    {config.icon}
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="flex gap-3 justify-end pt-4"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Annulla
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Salvataggio...' : editingUser ? 'Salva Modifiche' : 'Crea Utente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={!!passwordModalUser}
        onClose={() => {
          setPasswordModalUser(null);
          setNewPassword('');
          setShowPassword(false);
        }}
        title={`Cambia Password — ${passwordModalUser?.nome} ${passwordModalUser?.cognome}`}
        size="sm"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="relative">
            <Input
              label="Nuova Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={savingPassword}
              helperText="Minimo 4 caratteri"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] p-1 rounded"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div
            className="flex gap-3 justify-end pt-4"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <Button
              variant="secondary"
              onClick={() => {
                setPasswordModalUser(null);
                setNewPassword('');
              }}
              disabled={savingPassword}
            >
              Annulla
            </Button>
            <Button type="submit" variant="primary" disabled={savingPassword || newPassword.length < 4}>
              {savingPassword ? 'Salvataggio...' : 'Cambia Password'}
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
    </div>
  );
};
