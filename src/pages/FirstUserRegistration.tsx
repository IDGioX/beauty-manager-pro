import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { aziendaService } from '../services/azienda';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Sparkles, Building2, User, Lock, KeyRound } from 'lucide-react';

export const FirstUserRegistration: React.FC = () => {
  const { registerFirstUser, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    nomeAzienda: '',
    username: '',
    password: '',
    confirmPassword: '',
    keyword: '',
  });
  const [formError, setFormError] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const handleNext = () => {
    setFormError('');
    if (!formData.nomeAzienda.trim()) {
      setFormError('Il nome dell\'azienda è obbligatorio');
      return;
    }
    if (!formData.username.trim()) {
      setFormError('Lo username è obbligatorio');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (formData.password.length < 4) {
      setFormError('La password deve essere di almeno 4 caratteri');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError('Le password non corrispondono');
      return;
    }
    if (!formData.keyword.trim()) {
      setFormError('La keyword di recupero è obbligatoria');
      return;
    }

    try {
      await registerFirstUser({
        username: formData.username,
        password: formData.password,
        role: 'admin',
        nome: formData.username,
        cognome: 'Admin',
      });

      // Salva keyword e password in localStorage per recupero
      localStorage.setItem('bmp_recovery_keyword', formData.keyword.trim());
      localStorage.setItem('bmp_user_password', formData.password);

      // Aggiorna il nome dell'azienda
      try {
        await aziendaService.updateAzienda({
          nome_centro: formData.nomeAzienda.trim(),
          orario_apertura: '09:00',
          orario_chiusura: '19:00',
          slot_durata_minuti: 15,
          giorni_lavorativi: '[1,2,3,4,5,6]',
        });
      } catch {
        // Non bloccare la registrazione se l'aggiornamento azienda fallisce
        console.error('Errore aggiornamento nome azienda');
      }

      // Ricarica l'app per far partire il controllo licenza
      try { const { relaunch } = await import('@tauri-apps/plugin-process'); await relaunch(); } catch { window.location.reload(); }
    } catch (err: any) {
      setFormError(typeof err === 'string' ? err : err?.message || 'Errore durante la registrazione');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background decorative */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full blur-3xl"
          style={{ background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
        />
        <div
          className="absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full blur-3xl"
          style={{ background: 'color-mix(in srgb, var(--color-primary-dark) 15%, transparent)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div
          className="backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden"
          style={{
            background: 'var(--glass-bg)',
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
              <Sparkles size={40} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Beauty Manager Pro</h1>
            <p className="text-white/90 text-sm">Configura il tuo account</p>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${step === 1 ? 'bg-white scale-110' : 'bg-white/40'}`} />
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${step === 2 ? 'bg-white scale-110' : 'bg-white/40'}`} />
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Errore */}
              {(formError || error) && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-sm text-red-500">
                    {formError || error}
                  </p>
                </div>
              )}

              {step === 1 && (
                <>
                  {/* Nome Azienda */}
                  <div>
                    <label
                      className="flex items-center gap-2 text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Building2 size={16} style={{ color: 'var(--color-primary)' }} />
                      Nome Azienda
                    </label>
                    <Input
                      type="text"
                      value={formData.nomeAzienda}
                      onChange={(e) => setFormData({ ...formData, nomeAzienda: e.target.value })}
                      placeholder="Es. Beauty Center Milano"
                      disabled={isLoading}
                      required
                      autoFocus
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label
                      className="flex items-center gap-2 text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <User size={16} style={{ color: 'var(--color-primary)' }} />
                      Username
                    </label>
                    <Input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Il tuo username per accedere"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {/* Next button */}
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full mt-6"
                    onClick={handleNext}
                    disabled={isLoading}
                  >
                    Continua
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  {/* Password */}
                  <div>
                    <label
                      className="flex items-center gap-2 text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Lock size={16} style={{ color: 'var(--color-primary)' }} />
                      Password
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimo 4 caratteri"
                      disabled={isLoading}
                      required
                      autoFocus
                    />
                  </div>

                  {/* Conferma Password */}
                  <div>
                    <label
                      className="flex items-center gap-2 text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Lock size={16} style={{ color: 'var(--color-primary)' }} />
                      Conferma Password
                    </label>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Ripeti la password"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {/* Keyword */}
                  <div>
                    <label
                      className="flex items-center gap-2 text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <KeyRound size={16} style={{ color: 'var(--color-primary)' }} />
                      Keyword di Recupero
                    </label>
                    <Input
                      type="text"
                      value={formData.keyword}
                      onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                      placeholder="Una parola segreta per recuperare la password"
                      disabled={isLoading}
                      required
                    />
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Questa keyword ti servirà per reimpostare la password in caso di smarrimento
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 mt-6">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setStep(1)}
                      disabled={isLoading}
                    >
                      Indietro
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creazione...' : 'Crea Account'}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-center mt-6" style={{ color: 'var(--color-text-muted)' }}>
          Questo sarà l'account amministratore del gestionale
        </p>
      </div>
    </div>
  );
};
