import React, { useState } from 'react';
import { Shield, CheckCircle, AlertCircle, Clock, CalendarDays, Crown, Infinity } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { licenseService } from '../services/license';

type LicensePlan = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  durataMesi?: number;
};

const plans: LicensePlan[] = [
  {
    id: 'trial',
    label: 'Prova',
    description: '1 mese gratuito',
    icon: <Clock size={24} />,
    durataMesi: 1,
  },
  {
    id: 'monthly',
    label: 'Mensile',
    description: 'Rinnovo ogni mese',
    icon: <CalendarDays size={24} />,
    durataMesi: 1,
  },
  {
    id: 'annual',
    label: 'Annuale',
    description: '12 mesi',
    icon: <Crown size={24} />,
    durataMesi: 12,
  },
  {
    id: 'lifetime',
    label: 'A vita',
    description: 'Nessuna scadenza',
    icon: <Infinity size={24} />,
  },
];

export const LicenseActivation: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    setError(null);
    setLoading(true);

    try {
      const plan = plans.find(p => p.id === selectedPlan)!;

      // Genera la chiave internamente e attivala
      const generated = await licenseService.generateLicenseKey(plan.id, plan.durataMesi);
      await licenseService.activateLicense(generated.key);

      setSuccess(true);
      setTimeout(async () => {
        try { const { relaunch } = await import('@tauri-apps/plugin-process'); await relaunch(); } catch { window.location.reload(); }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'attivazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Attiva la Licenza</h1>
          <p className="text-white/80">Scegli la durata della tua licenza</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Licenza Attivata!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Caricamento in corso...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Plan options */}
              <div className="grid grid-cols-2 gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    disabled={loading}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all text-left
                      ${selectedPlan === plan.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }
                      ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {selectedPlan === plan.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                        <CheckCircle size={14} className="text-white" />
                      </div>
                    )}
                    <div className={`mb-2 ${selectedPlan === plan.id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {plan.icon}
                    </div>
                    <p className={`font-semibold ${selectedPlan === plan.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                      {plan.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {plan.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Confirm */}
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleActivate}
                disabled={loading}
              >
                {loading ? 'Attivazione in corso...' : 'Conferma e Attiva'}
              </Button>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
