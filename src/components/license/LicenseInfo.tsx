import React, { useEffect, useState } from 'react';
import { Key, Calendar, CheckCircle, XCircle, AlertTriangle, Trash2, RefreshCw, Upload, FileText, X } from 'lucide-react';
import { licenseService } from '../../services/license';
import type { LicenseInfo as LicenseInfoType } from '../../types/license';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const LicenseInfo: React.FC = () => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateTab, setUpdateTab] = useState<'file' | 'paste'>('file');
  const [licenseJson, setLicenseJson] = useState('');

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

  const handleRemoveLicense = async () => {
    if (!confirm('Sei sicuro di voler rimuovere la licenza? Dovrai attivarla nuovamente.')) {
      return;
    }

    setRemoving(true);
    try {
      await licenseService.removeLicense();
      // Reload app
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Errore durante la rimozione della licenza');
      setRemoving(false);
    }
  };

  const handleFileUpdate = async () => {
    setUpdateError(null);
    setUpdating(true);

    try {
      await licenseService.importLicenseFile();
      window.location.reload();
    } catch (err: any) {
      setUpdateError(err.message || 'Errore durante l\'aggiornamento della licenza');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasteUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdating(true);

    try {
      await licenseService.importLicenseFromString(licenseJson);
      window.location.reload();
    } catch (err: any) {
      setUpdateError(err.message || 'Errore durante l\'aggiornamento della licenza');
    } finally {
      setUpdating(false);
    }
  };

  const closeUpdateForm = () => {
    setShowUpdateForm(false);
    setUpdateError(null);
    setLicenseJson('');
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
              Non è stata trovata alcuna licenza valida. L'applicazione potrebbe non funzionare
              correttamente.
            </p>
            <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
              Attiva Licenza
            </Button>
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
    } else {
      return <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />;
    }
  };

  const getStatusColor = () => {
    if (licenseInfo.status === 'active') return 'green';
    if (licenseInfo.status === 'expired') return 'red';
    return 'yellow';
  };

  const getLicenseTypeLabel = (type?: string) => {
    switch (type) {
      case 'trial':
        return 'Trial';
      case 'monthly':
        return 'Mensile';
      case 'annual':
        return 'Annuale';
      case 'lifetime':
        return 'Lifetime';
      case 'custom':
        return 'Custom';
      default:
        return type || 'Sconosciuto';
    }
  };

  const statusColor = getStatusColor();

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4 mb-6">
        <div
          className={`flex-shrink-0 w-12 h-12 bg-${statusColor}-100 dark:bg-${statusColor}-900/20 rounded-full flex items-center justify-center`}
        >
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
            {licenseInfo.status}
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
            <p className="font-medium text-green-600 dark:text-green-400">Lifetime</p>
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
                  ? `La tua licenza trial scadrà tra ${licenseInfo.days_remaining} giorni.`
                  : 'La tua licenza trial è scaduta.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Update License Form */}
      {showUpdateForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">Aggiorna Licenza</h4>
            <button
              onClick={closeUpdateForm}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setUpdateTab('file')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                updateTab === 'file'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Upload size={16} />
              Carica File
            </button>
            <button
              onClick={() => setUpdateTab('paste')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                updateTab === 'paste'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <FileText size={16} />
              Incolla Codice
            </button>
          </div>

          {/* Tab Content */}
          {updateTab === 'file' ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Seleziona il file .bmlic con la nuova licenza
              </p>
              <Button
                onClick={handleFileUpdate}
                variant="primary"
                size="sm"
                disabled={updating}
              >
                {updating ? 'Importazione...' : 'Seleziona File'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handlePasteUpdate} className="space-y-4">
              <textarea
                value={licenseJson}
                onChange={(e) => setLicenseJson(e.target.value)}
                placeholder={'{\n  "license_key": "...",\n  ...\n}'}
                rows={6}
                required
                disabled={updating}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={updating || !licenseJson.trim()}
                className="w-full"
              >
                {updating ? 'Attivazione...' : 'Attiva Nuova Licenza'}
              </Button>
            </form>
          )}

          {/* Error */}
          {updateError && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{updateError}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowUpdateForm(!showUpdateForm)}
          disabled={removing || updating}
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Aggiorna Licenza
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleRemoveLicense}
          disabled={removing || updating}
          className="flex items-center gap-2"
        >
          <Trash2 size={16} />
          {removing ? 'Rimozione...' : 'Rimuovi Licenza'}
        </Button>
      </div>
    </Card>
  );
};
