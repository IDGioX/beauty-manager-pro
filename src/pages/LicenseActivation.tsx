import React, { useState } from 'react';
import { Key, Upload, FileText, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { licenseService } from '../services/license';

export const LicenseActivation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [licenseJson, setLicenseJson] = useState('');
  const [hardwareId, setHardwareId] = useState<string | null>(null);

  React.useEffect(() => {
    // Carica hardware ID all'avvio
    licenseService.getHardwareId().then(setHardwareId).catch(console.error);
  }, []);

  const handleFileImport = async () => {
    setError(null);
    setLoading(true);

    try {
      await licenseService.importLicenseFile();
      setSuccess(true);

      // Reload app dopo 2 secondi
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'importazione della licenza');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await licenseService.importLicenseFromString(licenseJson);
      setSuccess(true);

      // Reload app dopo 2 secondi
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'importazione della licenza');
    } finally {
      setLoading(false);
    }
  };

  const copyHardwareId = () => {
    if (hardwareId) {
      navigator.clipboard.writeText(hardwareId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
            <Key size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Beauty Manager Pro</h1>
          <p className="text-white/80">Attiva la tua licenza per continuare</p>
        </div>

        {/* Activation Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center">
              <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Licenza Attivata!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Reindirizzamento in corso...
              </p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('file')}
                  className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                    activeTab === 'file'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Upload size={18} />
                  Carica File
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                    activeTab === 'paste'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <FileText size={18} />
                  Incolla Codice
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'file' ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-full mb-4">
                      <Upload size={48} className="text-primary-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Carica File Licenza
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Seleziona il file .bmlic ricevuto via email
                    </p>
                    <Button
                      onClick={handleFileImport}
                      variant="primary"
                      size="lg"
                      disabled={loading}
                      className="w-full max-w-xs mx-auto"
                    >
                      {loading ? 'Importazione in corso...' : 'Seleziona File Licenza'}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasteImport} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Codice Licenza (JSON)
                    </label>
                    <textarea
                      value={licenseJson}
                      onChange={(e) => setLicenseJson(e.target.value)}
                      placeholder={'{\n  "license_key": "...",\n  ...\n}'}
                      rows={10}
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/50 focus:border-primary-500 transition-all resize-none"
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Incolla qui il contenuto del file licenza
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={loading || !licenseJson.trim()}
                  >
                    {loading ? 'Attivazione in corso...' : 'Attiva Licenza'}
                  </Button>
                </form>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-6 flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle
                    size={20}
                    className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Hardware ID */}
              {hardwareId && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    ID Dispositivo (per licenze vincolate):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                      {hardwareId}
                    </code>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={copyHardwareId}
                      title="Copia ID"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Fornisci questo ID se richiesto per ricevere una licenza vincolata a questo
                    dispositivo
                  </p>
                </div>
              )}

              {/* Help Link */}
              <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>Non hai una licenza?</p>
                <a
                  href="https://beautymanager.pro/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Contatta il supporto
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
