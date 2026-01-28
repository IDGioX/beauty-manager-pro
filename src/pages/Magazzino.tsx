import { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, History, AlertTriangle, X, ClipboardList } from 'lucide-react';
import { magazzinoService } from '../services/magazzino';
import { AlertCount, AlertProdotto } from '../types/magazzino';
import { ProdottiTab } from '../components/magazzino/ProdottiTab';
import { CaricoTab } from '../components/magazzino/CaricoTab';
import { ScaricoTab } from '../components/magazzino/ScaricoTab';
import { MovimentiTab } from '../components/magazzino/MovimentiTab';
import { InventarioTab } from '../components/magazzino/InventarioTab';

type TabType = 'prodotti' | 'carico' | 'scarico' | 'movimenti' | 'inventario';

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'prodotti', label: 'Prodotti', icon: <Package size={18} /> },
  { id: 'carico', label: 'Carico', icon: <TrendingUp size={18} /> },
  { id: 'scarico', label: 'Scarichi', icon: <TrendingDown size={18} /> },
  { id: 'movimenti', label: 'Movimenti', icon: <History size={18} /> },
  { id: 'inventario', label: 'Inventario', icon: <ClipboardList size={18} /> },
];

interface MagazzinoProps {
  onNavigateToAgenda?: (appuntamentoId: string) => void;
}

export function Magazzino({ onNavigateToAgenda }: MagazzinoProps) {
  const [activeTab, setActiveTab] = useState<TabType>('prodotti');
  const [alertCount, setAlertCount] = useState<AlertCount | null>(null);
  const [alerts, setAlerts] = useState<AlertProdotto[]>([]);
  const [showAlertBanner, setShowAlertBanner] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAlerts = async () => {
    try {
      const [count, alertList] = await Promise.all([
        magazzinoService.getAlertCount(),
        magazzinoService.getAlertProdotti(),
      ]);
      setAlertCount(count);
      setAlerts(alertList);
    } catch (error) {
      console.error('Errore caricamento alert:', error);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const totalAlerts = alertCount
    ? alertCount.sotto_scorta + alertCount.in_scadenza + alertCount.scaduti
    : 0;

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {showAlertBanner && totalAlerts > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5" size={20} />
              <div>
                <h3 className="font-medium text-amber-900 dark:text-amber-100">
                  Attenzione: {totalAlerts} prodott{totalAlerts === 1 ? 'o' : 'i'} richied
                  {totalAlerts === 1 ? 'e' : 'ono'} attenzione
                </h3>
                <div className="mt-1 text-sm text-amber-700 dark:text-amber-300 space-x-4">
                  {alertCount && alertCount.sotto_scorta > 0 && (
                    <span>{alertCount.sotto_scorta} sotto scorta minima</span>
                  )}
                  {alertCount && alertCount.in_scadenza > 0 && (
                    <span>{alertCount.in_scadenza} in scadenza</span>
                  )}
                  {alertCount && alertCount.scaduti > 0 && (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {alertCount.scaduti} scadut{alertCount.scaduti === 1 ? 'o' : 'i'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAlertBanner(false)}
              className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }
              `}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'prodotti' && totalAlerts > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">
                  {totalAlerts}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'prodotti' && (
          <ProdottiTab onRefresh={handleRefresh} alerts={alerts} />
        )}
        {activeTab === 'carico' && <CaricoTab onRefresh={handleRefresh} />}
        {activeTab === 'scarico' && <ScaricoTab onRefresh={handleRefresh} />}
        {activeTab === 'movimenti' && (
          <MovimentiTab
            onOpenCarico={() => setActiveTab('carico')}
            onOpenScarico={() => setActiveTab('scarico')}
            onOpenAppuntamento={(appId) => {
              if (onNavigateToAgenda) {
                onNavigateToAgenda(appId);
              }
            }}
          />
        )}
        {activeTab === 'inventario' && <InventarioTab onRefresh={handleRefresh} />}
      </div>
    </div>
  );
}
