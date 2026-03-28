import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Toast } from '../components/ui/Toast';
import { backupService, BackupInfo } from '../services/backup';
import { aziendaService, Azienda, UpdateAziendaInput } from '../services/azienda';
import * as comunicazioniService from '../services/comunicazioni';
import { updaterService, UpdateInfo, UpdateProgress, UpdateStatus } from '../services/updater';
import type { ConfigSmtp, SaveSmtpConfigInput } from '../types/comunicazione';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Database, Download, Upload, Trash2, Calendar, HardDrive, FolderOpen, Info, Building2, Key, UserCircle, Eye, EyeOff, Save, Mail, CheckCircle, AlertCircle, Loader2, Palette, Check, Sun, Moon, Monitor, RefreshCw, Rocket, Users } from 'lucide-react';
import { LicenseInfo } from '../components/license/LicenseInfo';
import { UserManagement } from '../components/settings/UserManagement';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

type SettingsTab = 'account' | 'aspetto' | 'backup' | 'azienda' | 'license' | 'smtp' | 'updates' | 'users';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('azienda');
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [description, setDescription] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Account state
  const { user, updateSettings } = useAuthStore();

  // Theme state
  const { config: themeConfig, setTheme, getAvailablePalettes } = useThemeStore();
  const palettes = getAvailablePalettes();
  const [showPassword, setShowPassword] = useState(false);
  const [showKeyword, setShowKeyword] = useState(false);
  const [accountPassword, setAccountPassword] = useState(localStorage.getItem('bmp_user_password') || '');
  const [accountKeyword, setAccountKeyword] = useState(localStorage.getItem('bmp_recovery_keyword') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [editingPassword, setEditingPassword] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  // Azienda state
  const [_azienda, setAzienda] = useState<Azienda | null>(null);
  const [aziendaForm, setAziendaForm] = useState<UpdateAziendaInput>({
    nome_centro: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    piva: '',
    orario_apertura: '09:00',
    orario_chiusura: '19:00',
    slot_durata_minuti: 15,
    giorni_lavorativi: '[1,2,3,4,5,6]',
  });

  // SMTP state
  const [_smtpConfig, setSmtpConfig] = useState<ConfigSmtp | null>(null);
  const [smtpForm, setSmtpForm] = useState<SaveSmtpConfigInput>({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    encryption: 'tls',
    enabled: false,
  });
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Updates state
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Funzione per salvare la palette sia in localStorage che nel database
  const handlePaletteChange = (paletteId: string) => {
    console.log('Palette clicked:', paletteId);
    // Aggiorna immediatamente l'UI (localStorage)
    setTheme({ paletteId });

    // Salva nel database per persistenza tra sessioni (in background)
    updateSettings({ palette_id: paletteId }).catch((error) => {
      console.error('Errore salvataggio palette nel database:', error);
    });
  };

  // Funzione per salvare la modalità tema (light/dark/auto)
  const handleThemeModeChange = (mode: 'light' | 'dark' | 'auto') => {
    console.log('Theme mode clicked:', mode);
    setTheme({ mode });
    updateSettings({ theme_mode: mode }).catch((error) => {
      console.error('Errore salvataggio modalità tema:', error);
    });
  };

  useEffect(() => {
    loadBackups();
    loadAzienda();
    loadSmtpConfig();
    // Carica la versione corrente all'avvio
    updaterService.getCurrentVersion().then(version => {
      setUpdateInfo({ available: false, currentVersion: version });
    });
  }, []);

  const loadSmtpConfig = async () => {
    try {
      const config = await comunicazioniService.getSmtpConfig();
      if (config) {
        setSmtpConfig(config);
        setSmtpForm({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          from_email: config.from_email,
          from_name: config.from_name || '',
          encryption: config.encryption,
          enabled: config.enabled,
        });
      }
    } catch (error) {
      console.error('Errore caricamento config SMTP:', error);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await comunicazioniService.saveSmtpConfig(smtpForm);
      showToast('Configurazione SMTP salvata con successo!', 'success');
      loadSmtpConfig();
    } catch (error) {
      console.error('Errore salvataggio SMTP:', error);
      showToast('Errore durante il salvataggio della configurazione SMTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const result = await comunicazioniService.testSmtpConnection(
        smtpForm.host,
        smtpForm.port,
        smtpForm.username,
        smtpForm.password,
        smtpForm.encryption
      );
      setSmtpTestResult({ success: true, message: result });
    } catch (error: any) {
      setSmtpTestResult({ success: false, message: error?.message || 'Connessione fallita' });
    } finally {
      setTestingSmtp(false);
    }
  };

  const loadBackups = async () => {
    try {
      setLoading(true);
      const data = await backupService.listBackups();
      setBackups(data);
    } catch (error) {
      console.error('Errore caricamento backup:', error);
      showToast('Impossibile caricare la lista dei backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      await backupService.createBackup(description || undefined);
      setDescription('');
      showToast('Backup creato con successo!', 'success');
      loadBackups();
    } catch (error) {
      console.error('Errore creazione backup:', error);
      showToast('Errore durante la creazione del backup', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async (backupPath: string) => {
    if (!confirm('Sei sicuro di voler ripristinare questo backup? Tutti i dati correnti verranno sostituiti.')) {
      return;
    }

    try {
      setLoading(true);
      await backupService.restoreBackup(backupPath);
      showToast('Backup ripristinato con successo! Ricarica l\'applicazione per vedere i cambiamenti.', 'success');
      // Ricarica la pagina dopo 2 secondi
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Errore ripristino backup:', error);
      showToast('Errore durante il ripristino del backup', 'error');
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backupPath: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo backup?')) {
      return;
    }

    try {
      await backupService.deleteBackup(backupPath);
      showToast('Backup eliminato con successo!', 'success');
      loadBackups();
    } catch (error) {
      console.error('Errore eliminazione backup:', error);
      showToast('Errore durante l\'eliminazione del backup', 'error');
    }
  };

  const handleImportBackup = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        title: 'Seleziona file di backup',
        filters: [{ name: 'Database', extensions: ['db', 'sqlite', 'sqlite3', 'bak'] }],
        multiple: false,
      });
      if (!selected) return;
      const filePath = typeof selected === 'string' ? selected : (selected as any).path || String(selected);
      if (!filePath) return;

      setLoading(true);
      await backupService.importBackupFromFile(filePath);
      showToast('Backup importato e ripristinato! L\'app si ricaricherà.', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Errore importazione backup:', error);
      showToast('Errore durante l\'importazione del backup', 'error');
      setLoading(false);
    }
  };

  const handleOpenBackupFolder = async () => {
    try {
      await backupService.openBackupFolder();
      showToast('Cartella backup aperta', 'success');
    } catch (error) {
      console.error('Errore apertura cartella backup:', error);
      showToast('Errore durante l\'apertura della cartella backup', 'error');
    }
  };

  const loadAzienda = async () => {
    try {
      const data = await aziendaService.getAzienda();
      setAzienda(data);
      setAziendaForm({
        nome_centro: data.nome_centro,
        indirizzo: data.indirizzo || '',
        citta: data.citta || '',
        cap: data.cap || '',
        provincia: data.provincia || '',
        telefono: data.telefono || '',
        email: data.email || '',
        piva: data.piva || '',
        orario_apertura: data.orario_apertura,
        orario_chiusura: data.orario_chiusura,
        slot_durata_minuti: data.slot_durata_minuti,
        giorni_lavorativi: data.giorni_lavorativi,
      });
    } catch (error) {
      console.error('Errore caricamento dati azienda:', error);
      showToast('Errore durante il caricamento dei dati azienda', 'error');
    }
  };

  const handleUpdateAzienda = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await aziendaService.updateAzienda(aziendaForm);
      showToast('Dati azienda aggiornati con successo!', 'success');
      loadAzienda();
    } catch (error) {
      console.error('Errore aggiornamento dati azienda:', error);
      showToast('Errore durante l\'aggiornamento dei dati azienda', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) {
      showToast('La password deve essere di almeno 4 caratteri', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('Le password non corrispondono', 'error');
      return;
    }
    if (!user) return;

    try {
      await invoke('change_password', { userId: user.id, oldPassword: accountPassword, newPassword });
      localStorage.setItem('bmp_user_password', newPassword);
      setAccountPassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      setEditingPassword(false);
      showToast('Password aggiornata con successo!', 'success');
    } catch (error) {
      console.error('Errore cambio password:', error);
      showToast('Errore durante il cambio password', 'error');
    }
  };

  const handleChangeKeyword = () => {
    if (!newKeyword.trim()) {
      showToast('La keyword non può essere vuota', 'error');
      return;
    }
    localStorage.setItem('bmp_recovery_keyword', newKeyword.trim());
    setAccountKeyword(newKeyword.trim());
    setNewKeyword('');
    setEditingKeyword(false);
    showToast('Keyword aggiornata con successo!', 'success');
  };

  const tabs = [
    { id: 'account' as SettingsTab, label: 'Il Mio Account', icon: UserCircle },
    { id: 'aspetto' as SettingsTab, label: 'Aspetto', icon: Palette },
    { id: 'azienda' as SettingsTab, label: 'Dati Azienda', icon: Building2 },
    { id: 'smtp' as SettingsTab, label: 'Email SMTP', icon: Mail },
    { id: 'license' as SettingsTab, label: 'Licenza', icon: Key },
    { id: 'users' as SettingsTab, label: 'Gestione Utenti', icon: Users },
    { id: 'backup' as SettingsTab, label: 'Backup & Ripristino', icon: Database },
    { id: 'updates' as SettingsTab, label: 'Aggiornamenti', icon: RefreshCw },
  ];

  // Funzioni per gli aggiornamenti
  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateError(null);
    try {
      const info = await updaterService.checkForUpdates();
      setUpdateInfo(info);
      setUpdateStatus('idle');
      if (info.available) {
        showToast(`Nuovo aggiornamento disponibile: v${info.newVersion}`, 'success');
      } else {
        showToast('Nessun aggiornamento disponibile. Sei già all\'ultima versione!', 'success');
      }
    } catch (error: any) {
      setUpdateError(error?.message || 'Errore durante il controllo degli aggiornamenti');
      setUpdateStatus('error');
      showToast('Errore durante il controllo degli aggiornamenti', 'error');
    }
  };

  const downloadUpdate = async () => {
    setUpdateStatus('downloading');
    setUpdateProgress(null);
    setUpdateError(null);
    try {
      await updaterService.downloadAndInstall((progress) => {
        setUpdateProgress(progress);
      });
      setUpdateStatus('ready');
      showToast('Aggiornamento scaricato! Riavvia per completare l\'installazione.', 'success');
    } catch (error: any) {
      setUpdateError(error?.message || 'Errore durante il download');
      setUpdateStatus('error');
      showToast('Errore durante il download dell\'aggiornamento', 'error');
    }
  };

  const restartToUpdate = async () => {
    try {
      await updaterService.restartApp();
    } catch (error: any) {
      showToast('Errore durante il riavvio. Riavvia manualmente l\'applicazione.', 'error');
    }
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
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Impostazioni</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Gestisci backup, ripristini e configurazioni dell'applicazione</p>
        </div>

        {/* Tabs Navigation */}
        <div className="animate-fade-in-up" style={{ borderBottom: '1px solid var(--glass-border)', animationDelay: '100ms' }}>
          <nav className="-mb-px flex space-x-6 overflow-x-auto pb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap"
                  style={{
                    borderColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--color-secondary) 15%, transparent)',
                    }}
                  >
                    <UserCircle className="w-6 h-6" style={{ color: 'var(--color-secondary)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Il Mio Account</h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Gestisci le tue credenziali di accesso</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Username */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: 'var(--card-hover)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Username</label>
                    <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{user?.username || '-'}</p>
                  </div>

                  {/* Password */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: 'var(--card-hover)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-sm flex items-center gap-1"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showPassword ? 'Nascondi' : 'Mostra'}
                      </button>
                    </div>
                    {!editingPassword ? (
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                          {showPassword ? (accountPassword || '******') : '********'}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingPassword(true)}
                        >
                          Modifica
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 mt-2">
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nuova password (min. 4 caratteri)"
                        />
                        <Input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Conferma nuova password"
                        />
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" onClick={handleChangePassword}>
                            <Save size={14} className="mr-1" />
                            Salva
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { setEditingPassword(false); setNewPassword(''); setConfirmNewPassword(''); }}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Keyword */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: 'var(--card-hover)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Keyword di Recupero</label>
                      <button
                        type="button"
                        onClick={() => setShowKeyword(!showKeyword)}
                        className="text-sm flex items-center gap-1"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {showKeyword ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showKeyword ? 'Nascondi' : 'Mostra'}
                      </button>
                    </div>
                    {!editingKeyword ? (
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                          {showKeyword ? (accountKeyword || 'Non impostata') : '********'}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingKeyword(true)}
                        >
                          Modifica
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 mt-2">
                        <Input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          placeholder="Nuova keyword di recupero"
                        />
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" onClick={handleChangeKeyword}>
                            <Save size={14} className="mr-1" />
                            Salva
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { setEditingKeyword(false); setNewKeyword(''); }}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      La keyword ti serve per reimpostare la password dalla schermata di login
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'aspetto' && (
            <div className="space-y-6">
              {/* Palette Colori */}
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                    }}
                  >
                    <Palette className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Palette Colori
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Scegli la combinazione di colori che preferisci
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {palettes.map((palette) => {
                    const isSelected = themeConfig.paletteId === palette.id;
                    return (
                      <button
                        type="button"
                        key={palette.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePaletteChange(palette.id);
                        }}
                        className="relative p-4 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                        style={{
                          background: palette.cardBg,
                          border: `3px solid ${isSelected ? palette.primary : palette.glassBorder}`,
                          boxShadow: isSelected ? `0 0 0 3px ${palette.primary}40` : 'none',
                        }}
                      >
                        {/* Contenitore interno con pointer-events none per assicurare che il click arrivi al button */}
                        <div style={{ pointerEvents: 'none' }}>
                          {/* Selected indicator */}
                          {isSelected && (
                            <div
                              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                              style={{ background: palette.primary }}
                            >
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}

                          {/* Color preview */}
                          <div className="flex gap-1.5 mb-3">
                            <div
                              className="w-8 h-8 rounded-lg"
                              style={{ background: palette.primary }}
                              title="Colore primario"
                            />
                            <div
                              className="w-8 h-8 rounded-lg"
                              style={{ background: palette.secondary }}
                              title="Colore secondario"
                            />
                            <div
                              className="w-8 h-8 rounded-lg"
                              style={{ background: palette.accent }}
                              title="Colore accento"
                            />
                            <div
                              className="w-8 h-8 rounded-lg border"
                              style={{
                                background: palette.bgBase,
                                borderColor: palette.glassBorder,
                              }}
                              title="Sfondo"
                            />
                          </div>

                          {/* Name and description */}
                          <h3
                            className="font-semibold mb-1"
                            style={{ color: palette.textPrimary }}
                          >
                            {palette.name}
                          </h3>
                          <p
                            className="text-sm"
                            style={{ color: palette.textSecondary }}
                          >
                            {palette.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modalita Tema */}
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%)',
                    }}
                  >
                    <Sun className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Modalita Tema
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Scegli tra tema chiaro, scuro o automatico
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'light' as const, label: 'Chiaro', icon: Sun, desc: 'Tema luminoso' },
                    { id: 'dark' as const, label: 'Scuro', icon: Moon, desc: 'Tema scuro' },
                    { id: 'auto' as const, label: 'Automatico', icon: Monitor, desc: 'Segue il sistema' },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = themeConfig.mode === mode.id;
                    return (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleThemeModeChange(mode.id);
                        }}
                        className="flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-200 cursor-pointer"
                        style={{
                          background: isSelected
                            ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                            : 'var(--card-hover)',
                          border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                          color: isSelected ? 'white' : 'var(--color-text-primary)',
                          boxShadow: isSelected ? '0 0 0 3px var(--color-primary-light)' : 'none',
                        }}
                      >
                        <div style={{ pointerEvents: 'none' }} className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <div className="text-left">
                            <p className="font-medium">{mode.label}</p>
                            <p className={`text-xs ${isSelected ? 'opacity-80' : ''}`} style={{ color: isSelected ? 'inherit' : 'var(--color-text-muted)' }}>
                              {mode.desc}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Anteprima Colori Attuali */}
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Anteprima Colori Attuali
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div
                      className="h-16 rounded-xl mb-2"
                      style={{ background: 'var(--color-primary)' }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Primario</p>
                  </div>
                  <div>
                    <div
                      className="h-16 rounded-xl mb-2"
                      style={{ background: 'var(--color-secondary)' }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Secondario</p>
                  </div>
                  <div>
                    <div
                      className="h-16 rounded-xl mb-2"
                      style={{ background: 'var(--color-accent)' }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Accento</p>
                  </div>
                  <div>
                    <div
                      className="h-16 rounded-xl mb-2 border"
                      style={{
                        background: 'var(--bg-base)',
                        borderColor: 'var(--glass-border)',
                      }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Sfondo</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'azienda' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                    }}
                  >
                    <Building2 className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Informazioni Azienda</h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Gestisci i dati del tuo centro estetico</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateAzienda} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Input
                        label="Nome Centro *"
                        value={aziendaForm.nome_centro}
                        onChange={(e) => setAziendaForm({ ...aziendaForm, nome_centro: e.target.value })}
                        required
                      />
                    </div>

                    <Input
                      label="Indirizzo"
                      value={aziendaForm.indirizzo}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, indirizzo: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Citta"
                        value={aziendaForm.citta}
                        onChange={(e) => setAziendaForm({ ...aziendaForm, citta: e.target.value })}
                      />
                      <Input
                        label="CAP"
                        value={aziendaForm.cap}
                        onChange={(e) => setAziendaForm({ ...aziendaForm, cap: e.target.value })}
                      />
                    </div>

                    <Input
                      label="Provincia"
                      value={aziendaForm.provincia}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, provincia: e.target.value })}
                      maxLength={2}
                    />

                    <Input
                      label="Telefono"
                      type="tel"
                      value={aziendaForm.telefono}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, telefono: e.target.value })}
                    />

                    <Input
                      label="Email"
                      type="email"
                      value={aziendaForm.email}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, email: e.target.value })}
                    />

                    <Input
                      label="Partita IVA"
                      value={aziendaForm.piva}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, piva: e.target.value })}
                    />

                    <Input
                      label="Orario Apertura"
                      type="time"
                      value={aziendaForm.orario_apertura}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, orario_apertura: e.target.value })}
                    />

                    <Input
                      label="Orario Chiusura"
                      type="time"
                      value={aziendaForm.orario_chiusura}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, orario_chiusura: e.target.value })}
                    />

                  </div>

                  <div className="flex justify-end pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <Button type="submit" variant="primary" loading={loading}>
                      Salva Modifiche
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'license' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                    }}
                  >
                    <Key className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Gestione Licenza</h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Visualizza e gestisci la tua licenza</p>
                  </div>
                </div>

                <LicenseInfo />
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                    }}
                  >
                    <Users className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Gestione Utenti</h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Crea e gestisci gli utenti del sistema</p>
                  </div>
                </div>

                <UserManagement />
              </div>
            </div>
          )}

          {activeTab === 'smtp' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--color-secondary) 15%, transparent)',
                    }}
                  >
                    <Mail className="w-6 h-6" style={{ color: 'var(--color-secondary)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Configurazione Email SMTP</h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Configura il server SMTP per l'invio automatico di email</p>
                  </div>
                </div>

                <form onSubmit={handleSaveSmtp} className="space-y-6">
                  {/* Abilitazione */}
                  <div
                    className="flex items-center justify-between p-4 rounded-xl"
                    style={{
                      background: 'var(--card-hover)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div>
                      <label className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Abilita invio Email SMTP</label>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Attiva per inviare email automatiche via SMTP</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smtpForm.enabled}
                        onChange={(e) => setSmtpForm({ ...smtpForm, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div
                        className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={{
                          background: smtpForm.enabled ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        }}
                      ></div>
                    </label>
                  </div>

                  {/* Server Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Impostazioni Server</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Host SMTP *"
                        value={smtpForm.host}
                        onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                        placeholder="smtp.gmail.com"
                        required
                      />
                      <Input
                        label="Porta *"
                        type="number"
                        value={smtpForm.port.toString()}
                        onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                        placeholder="587"
                        required
                      />
                      <Input
                        label="Username *"
                        value={smtpForm.username}
                        onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                        placeholder="tuaemail@gmail.com"
                        required
                      />
                      <Input
                        label="Password *"
                        type="password"
                        value={smtpForm.password}
                        onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                        placeholder="App password"
                        required
                      />
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Crittografia</label>
                        <select
                          value={smtpForm.encryption}
                          onChange={(e) => setSmtpForm({ ...smtpForm, encryption: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2"
                          style={{
                            background: 'var(--card-hover)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          <option value="tls">TLS (porta 587)</option>
                          <option value="ssl">SSL (porta 465)</option>
                          <option value="none">Nessuna</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Sender Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Mittente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Email Mittente *"
                        type="email"
                        value={smtpForm.from_email}
                        onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                        placeholder="noreply@tuocentro.it"
                        required
                      />
                      <Input
                        label="Nome Mittente"
                        value={smtpForm.from_name}
                        onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
                        placeholder="Centro Estetico XYZ"
                      />
                    </div>
                  </div>

                  {/* Test Result */}
                  {smtpTestResult && (
                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: smtpTestResult.success
                          ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                          : 'color-mix(in srgb, var(--color-danger) 15%, transparent)',
                        border: `1px solid ${smtpTestResult.success ? 'var(--color-success)' : 'var(--color-danger)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {smtpTestResult.success ? (
                          <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
                        )}
                        <span style={{ color: smtpTestResult.success ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {smtpTestResult.message}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Info Box */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                      <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <p className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Configurazione Gmail</p>
                        <p>Per Gmail, usa la porta 587 con TLS. Devi creare una "App Password" nelle impostazioni di sicurezza del tuo account Google (richiede 2FA attivo).</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleTestSmtp}
                      disabled={testingSmtp || !smtpForm.host || !smtpForm.username || !smtpForm.password}
                    >
                      {testingSmtp ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Test in corso...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Testa Connessione
                        </>
                      )}
                    </Button>
                    <Button type="submit" variant="primary" loading={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      Salva Configurazione
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Sezione Backup & Ripristino */}
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                    }}
                  >
                    <Database className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Backup & Ripristino</h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Proteggi i tuoi dati con backup regolari</p>
                  </div>
                </div>

                {/* Crea nuovo backup */}
                <div
                  className="rounded-xl p-4 mb-6"
                  style={{
                    background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, color-mix(in srgb, var(--color-secondary) 10%, transparent) 100%)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Download className="w-5 h-5" />
                    Crea Nuovo Backup
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descrizione backup (opzionale)"
                      className="w-full px-4 py-2 rounded-xl focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--card-hover)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <Button
                      onClick={handleCreateBackup}
                      loading={creating}
                      variant="primary"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Crea Backup Adesso
                    </Button>
                  </div>
                </div>

                {/* Lista backup */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Backup Salvati</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleImportBackup}
                        loading={loading}
                      >
                        Importa da file
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleOpenBackupFolder}
                      >
                        <FolderOpen className="w-4 h-4 mr-1" />
                        Apri Cartella
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={loadBackups}
                        loading={loading}
                      >
                        Aggiorna
                      </Button>
                    </div>
                  </div>

                  {loading && backups.length === 0 ? (
                    <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                      Caricamento backup...
                    </div>
                  ) : backups.length === 0 ? (
                    <div
                      className="text-center py-8 rounded-xl border-2 border-dashed"
                      style={{
                        background: 'var(--card-hover)',
                        borderColor: 'var(--glass-border)',
                      }}
                    >
                      <Database className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                      <p className="font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Nessun backup disponibile</p>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Crea il tuo primo backup per proteggere i dati</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {backups.map((backup) => (
                        <div
                          key={backup.file_path}
                          className="rounded-xl p-4 transition-shadow hover:shadow-md"
                          style={{
                            background: 'var(--card-hover)',
                            border: '1px solid var(--glass-border)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <HardDrive className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                                <h4 className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                  {backup.file_name}
                                </h4>
                              </div>

                              {backup.metadata.description && (
                                <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>{backup.metadata.description}</p>
                              )}

                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(backup.created_at)}
                                </span>
                                <span>Dimensione: {formatFileSize(backup.size)}</span>
                                <span>v{backup.metadata.app_version}</span>
                              </div>
                            </div>

                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleRestoreBackup(backup.file_path)}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                                  color: 'var(--color-success)',
                                }}
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBackup(backup.file_path)}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)',
                                  color: 'var(--color-danger)',
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB AGGIORNAMENTI */}
          {activeTab === 'updates' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-6 card-hover-lift"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                    }}
                  >
                    <Rocket className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Aggiornamenti</h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Mantieni l'applicazione sempre aggiornata</p>
                  </div>
                </div>

                {/* Versione corrente */}
                <div
                  className="rounded-xl p-4 mb-6"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Versione installata</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        v{updateInfo?.currentVersion || '0.1.0'}
                      </p>
                    </div>
                    {updateInfo?.available && (
                      <div className="text-right">
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Nuova versione disponibile</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                          v{updateInfo.newVersion}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stato e azioni */}
                <div className="space-y-4">
                  {/* Errore */}
                  {updateError && (
                    <div
                      className="rounded-xl p-4 flex items-center gap-3"
                      style={{
                        background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
                      }}
                    >
                      <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
                      <p style={{ color: 'var(--color-danger)' }}>{updateError}</p>
                    </div>
                  )}

                  {/* Progress bar download */}
                  {updateStatus === 'downloading' && updateProgress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <span>Download in corso...</span>
                        <span>{updateProgress.percentage}%</span>
                      </div>
                      <div
                        className="h-3 rounded-full overflow-hidden"
                        style={{ background: 'var(--glass-border)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${updateProgress.percentage}%`,
                            background: 'var(--color-primary)',
                          }}
                        />
                      </div>
                      <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                        {(updateProgress.downloaded / 1024 / 1024).toFixed(1)} MB / {(updateProgress.total / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  )}

                  {/* Aggiornamento pronto */}
                  {updateStatus === 'ready' && (
                    <div
                      className="rounded-xl p-4 flex items-center gap-3"
                      style={{
                        background: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
                      }}
                    >
                      <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                      <p style={{ color: 'var(--color-success)' }}>
                        Aggiornamento scaricato! Riavvia l'applicazione per completare l'installazione.
                      </p>
                    </div>
                  )}

                  {/* Release notes */}
                  {updateInfo?.releaseNotes && updateInfo.available && (
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: 'var(--card-hover)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        Novità nella versione {updateInfo.newVersion}
                      </h3>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {updateInfo.releaseNotes}
                      </p>
                    </div>
                  )}

                  {/* Pulsanti azione */}
                  <div className="flex gap-3 pt-4">
                    {updateStatus === 'ready' ? (
                      <Button onClick={restartToUpdate} className="flex items-center gap-2">
                        <RefreshCw size={18} />
                        Riavvia e Aggiorna
                      </Button>
                    ) : updateInfo?.available && updateStatus !== 'downloading' ? (
                      <Button onClick={downloadUpdate} className="flex items-center gap-2">
                        <Download size={18} />
                        Scarica Aggiornamento
                      </Button>
                    ) : (
                      <Button
                        onClick={checkForUpdates}
                        disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                        className="flex items-center gap-2"
                      >
                        {updateStatus === 'checking' ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Controllo in corso...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={18} />
                            Controlla Aggiornamenti
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Info aggiuntive */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-secondary) 30%, transparent)',
                }}
              >
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-secondary)' }} />
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <p className="mb-2">
                      Gli aggiornamenti vengono scaricati in background e applicati al riavvio dell'applicazione.
                    </p>
                    <p>
                      Si consiglia di effettuare un backup prima di aggiornare per maggiore sicurezza.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
