import React, { useEffect, useState } from 'react';
import {
  Key,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  CalendarDays,
  Crown,
  Infinity,
} from 'lucide-react';
import { licenseService } from '../../services/license';
import type { LicenseInfo as LicenseInfoType } from '../../types/license';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type LicensePlan = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  durataMesi?: number;
};

const plans: LicensePlan[] = [
  { id: 'trial', label: 'Prova', description: '1 mese', icon: <Clock size={20} />, durataMesi: 1 },
  { id: 'monthly', label: 'Mensile', description: '1 mese', icon: <CalendarDays size={20} />, durataMesi: 1 },
  { id: 'annual', label: 'Annuale', description: '12 mesi', icon: <Crown size={20} />, durataMesi: 12 },
  { id: 'lifetime', label: 'A vita', description: 'Nessuna scadenza', icon: <Infinity size={20} /> },
];

export const LicenseInfo: React.FC = () => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfoType | null>(null);
  const [loading, setLoading] = useState(true);

  // Rinnovo
  const [showRenew, setShowRenew] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);

  useEffect(() => {
    loadLicenseInfo();
  }, []);

  const loadLicenseInfo = async () => {
    try {
      const info = await licenseService.getLicenseInfo();
      setLicenseInfo(info);
    } catch (error) {
      console.error('Failed to load license info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    setRenewError(null);
    setRenewing(true);

    try {
      const plan = plans.find(p => p.id === selectedPlan)!;
      const generated = await licenseService.generateLicenseKey(plan.id, plan.durataMesi);
      await licenseService.activateLicense(generated.key);
      await loadLicenseInfo();
      setShowRenew(false);
    } catch (err: any) {
      setRenewError(err.message || 'Errore durante il rinnovo');
    } finally {
      setRenewing(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }

  if (!licenseInfo?.has_license) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <XCircle className="text-red-600 dark:text-red-400" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Nessuna Licenza Attiva
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Attiva una licenza per continuare ad utilizzare l'applicazione.
            </p>
            <Button variant="primary" size="sm" onClick={() => setShowRenew(true)}>
              Attiva Licenza
            </Button>

            {showRenew && (
              <RenewPanel
                selectedPlan={selectedPlan}
                onSelectPlan={setSelectedPlan}
                onConfirm={handleRenew}
                onCancel={() => { setShowRenew(false); setRenewError(null); }}
                loading={renewing}
                error={renewError}
              />
            )}
          </div>
        </div>
      </Card>
    );
  }

  const getStatusIcon = () => {
    if (licenseInfo.status === 'active') {
      return <CheckCircle className="text-green-600 dark:text-green-400" size={24} />;
    } else if (licenseInfo.status === 'expired') {
      return <XCircle className="text-red-600 dark:text-red-400" size={24} />;
    }
    return <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />;
  };

  const getStatusBg = () => {
    if (licenseInfo.status === 'active') return 'bg-green-100 dark:bg-green-900/20';
    if (licenseInfo.status === 'expired') return 'bg-red-100 dark:bg-red-900/20';
    return 'bg-yellow-100 dark:bg-yellow-900/20';
  };

  const getLicenseTypeLabel = (type?: string) => {
    switch (type) {
      case 'trial': return 'Prova';
      case 'monthly': return 'Mensile';
      case 'annual': return 'Annuale';
      case 'lifetime': return 'A vita';
      default: return type || 'Sconosciuto';
    }
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className={`flex-shrink-0 w-12 h-12 ${getStatusBg()} rounded-full flex items-center justify-center`}>
          {getStatusIcon()}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Licenza {getLicenseTypeLabel(licenseInfo.license_type)}
          </h3>
          {licenseInfo.customer_name && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Intestata a: {licenseInfo.customer_name}
            </p>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Key size={16} />
            <span>Stato</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white capitalize">
            {licenseInfo.status === 'active' ? 'Attiva' : licenseInfo.status === 'expired' ? 'Scaduta' : licenseInfo.status}
          </p>
        </div>

        {licenseInfo.expires_at ? (
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Calendar size={16} />
              <span>Scadenza</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date(licenseInfo.expires_at).toLocaleDateString('it-IT')}
              {licenseInfo.days_remaining !== undefined && licenseInfo.days_remaining >= 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  ({licenseInfo.days_remaining} giorni)
                </span>
              )}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Calendar size={16} />
              <span>Durata</span>
            </div>
            <p className="font-medium text-green-600 dark:text-green-400">A vita</p>
          </div>
        )}
      </div>

      {/* Trial Warning */}
      {licenseInfo.is_trial && licenseInfo.days_remaining !== undefined && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                Periodo di Prova
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                {licenseInfo.days_remaining > 0
                  ? `La tua licenza scadrà tra ${licenseInfo.days_remaining} giorni.`
                  : 'La tua licenza è scaduta.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Renew Panel */}
      {showRenew && (
        <RenewPanel
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          onConfirm={handleRenew}
          onCancel={() => { setShowRenew(false); setRenewError(null); }}
          loading={renewing}
          error={renewError}
        />
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowRenew(!showRenew)}
          disabled={renewing}
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} />
          {licenseInfo.status === 'expired' || licenseInfo.is_trial ? 'Rinnova Licenza' : 'Modifica Licenza'}
        </Button>
      </div>
    </Card>
  );
};

/* Pannello scelta durata per rinnovo/attivazione */
const RenewPanel: React.FC<{
  selectedPlan: string;
  onSelectPlan: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}> = ({ selectedPlan, onSelectPlan, onConfirm, onCancel, loading, error }) => (
  <div className="my-4 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Scegli la durata</h4>
      <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        Annulla
      </button>
    </div>

    <div className="grid grid-cols-2 gap-2 mb-3">
      {plans.map((plan) => (
        <button
          key={plan.id}
          type="button"
          onClick={() => onSelectPlan(plan.id)}
          disabled={loading}
          className={`
            p-3 rounded-lg border-2 transition-all text-left text-sm
            ${selectedPlan === plan.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }
            ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center gap-2">
            <span className={selectedPlan === plan.id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}>
              {plan.icon}
            </span>
            <div>
              <p className={`font-medium ${selectedPlan === plan.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                {plan.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
            </div>
          </div>
        </button>
      ))}
    </div>

    <Button
      type="button"
      variant="primary"
      size="sm"
      className="w-full"
      onClick={onConfirm}
      disabled={loading}
    >
      {loading ? 'Attivazione...' : 'Conferma'}
    </Button>

    {error && (
      <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <AlertTriangle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      </div>
    )}
  </div>
);
