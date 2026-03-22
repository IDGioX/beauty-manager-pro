import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, LogIn, AlertCircle, KeyRound, ArrowLeft, Save } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

type LoginView = 'login' | 'keyword' | 'newPassword';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password reset state
  const [view, setView] = useState<LoginView>('login');
  const [keywordInput, setKeywordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const login = useAuthStore((state) => state.login);

  // Load saved credentials on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('bmp_saved_username');
    const savedPassword = localStorage.getItem('bmp_saved_password');
    if (savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);

      // Save or clear credentials based on rememberMe
      if (rememberMe) {
        localStorage.setItem('bmp_saved_username', username);
        localStorage.setItem('bmp_saved_password', password);
      } else {
        localStorage.removeItem('bmp_saved_username');
        localStorage.removeItem('bmp_saved_password');
      }
    } catch (err: any) {
      setError(err.message || 'Credenziali non valide');
      setIsLoading(false);
    }
  };

  const handleVerifyKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const storedKeyword = localStorage.getItem('bmp_recovery_keyword');
    if (!storedKeyword) {
      setError('Nessuna keyword di recupero configurata');
      return;
    }

    if (keywordInput.trim().toLowerCase() === storedKeyword.toLowerCase()) {
      setView('newPassword');
      setError('');
    } else {
      setError('Keyword non corretta');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('La password deve essere di almeno 4 caratteri');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Le password non corrispondono');
      return;
    }

    setIsLoading(true);
    try {
      // Get all users to find the admin
      const users = await invoke<any[]>('get_all_users');
      if (users.length > 0) {
        const adminUser = users.find(u => u.role === 'admin') || users[0];
        await invoke('change_password', { userId: adminUser.id, oldPassword: password, newPassword });
        localStorage.setItem('bmp_user_password', newPassword);

        // Update saved password if remember me was enabled
        if (localStorage.getItem('bmp_saved_password')) {
          localStorage.setItem('bmp_saved_password', newPassword);
        }

        setSuccess('Password reimpostata con successo! Ora puoi accedere.');
        setView('login');
        setPassword(newPassword);
        setNewPassword('');
        setConfirmNewPassword('');
        setKeywordInput('');
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante il reset della password');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToLogin = () => {
    setView('login');
    setError('');
    setSuccess('');
    setKeywordInput('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Subtle background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at top, var(--bg-secondary), var(--bg-base))'
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Login card */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Card */}
        <div
          className="rounded-2xl shadow-xl overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--glass-border)'
          }}
        >
          {/* Header */}
          <div
            className="relative p-8 text-center"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-xl mb-5"
            >
              {view === 'login' ? (
                <Sparkles size={32} className="text-white" />
              ) : (
                <KeyRound size={32} className="text-white" />
              )}
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">Beauty Manager Pro</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {view === 'login' && 'Accedi al tuo centro estetico'}
              {view === 'keyword' && 'Inserisci la keyword di recupero'}
              {view === 'newPassword' && 'Imposta la nuova password'}
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-500">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success message */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm text-green-500">{success}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LOGIN VIEW */}
            {view === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Input
                    label="Username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Inserisci il tuo username"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div>
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Inserisci la tua password"
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Remember me & Password dimenticata */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer"
                      style={{
                        accentColor: 'var(--color-primary)'
                      }}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Ricordami</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setView('keyword'); setError(''); setSuccess(''); }}
                    className="text-sm hover:underline transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Password dimenticata?
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Accesso in corso...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <LogIn size={20} />
                      <span>Accedi</span>
                    </div>
                  )}
                </Button>
              </form>
            )}

            {/* KEYWORD VERIFICATION VIEW */}
            {view === 'keyword' && (
              <form onSubmit={handleVerifyKeyword} className="space-y-6">
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Inserisci la keyword di recupero che hai scelto durante la creazione dell'account.
                </p>

                <div>
                  <Input
                    label="Keyword di Recupero"
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="La tua keyword segreta"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={resetToLogin}
                    className="flex-1"
                  >
                    <ArrowLeft size={18} className="mr-1" />
                    Indietro
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Verifica
                  </Button>
                </div>
              </form>
            )}

            {/* NEW PASSWORD VIEW */}
            {view === 'newPassword' && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Keyword verificata! Ora puoi impostare una nuova password.
                </p>

                <div>
                  <Input
                    label="Nuova Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 4 caratteri"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div>
                  <Input
                    label="Conferma Nuova Password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Ripeti la nuova password"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={resetToLogin}
                    className="flex-1"
                  >
                    <ArrowLeft size={18} className="mr-1" />
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Salvataggio...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Save size={18} />
                        <span>Salva</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs mt-8 tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Beauty Manager Pro v1.0.0
        </motion.p>
      </motion.div>
    </div>
  );
};
