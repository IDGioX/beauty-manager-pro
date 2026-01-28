import {
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Package,
  Calendar,
  User,
  Truck,
  FileText,
  Hash,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  MovimentoMagazzino,
  TipoMovimento,
  TIPI_MOVIMENTO_LABELS,
} from '../../types/magazzino';

interface MovimentoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimento: MovimentoMagazzino | null;
  onNavigateToAppuntamento?: (appuntamentoId: string) => void;
  onNavigateToCarico?: () => void;
  onNavigateToScarico?: () => void;
  onRefresh?: () => void;
}

export function MovimentoDetailModal({
  isOpen,
  onClose,
  movimento,
  onNavigateToAppuntamento,
  onNavigateToCarico,
  onNavigateToScarico,
}: MovimentoDetailModalProps) {
  if (!movimento) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMovimentoIcon = (tipo: TipoMovimento) => {
    switch (tipo) {
      case 'carico':
      case 'reso':
        return <TrendingUp className="text-emerald-500" size={24} />;
      case 'scarico_uso':
      case 'scarico_vendita':
      case 'scarto':
        return <TrendingDown className="text-red-500" size={24} />;
      case 'inventario':
        return <RotateCcw className="text-blue-500" size={24} />;
      default:
        return <Package className="text-gray-500" size={24} />;
    }
  };

  const isPositive = ['carico', 'reso'].includes(movimento.tipo) ||
    (movimento.tipo === 'inventario' && movimento.quantita > 0);

  const getTipoColor = () => {
    if (['carico', 'reso'].includes(movimento.tipo)) {
      return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (['scarico_uso', 'scarico_vendita', 'scarto'].includes(movimento.tipo)) {
      return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
    }
    return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  };

  const handleOpenAppuntamento = () => {
    if (movimento.appuntamento_id && onNavigateToAppuntamento) {
      onClose();
      onNavigateToAppuntamento(movimento.appuntamento_id);
    }
  };

  const handleOpenCarico = () => {
    onClose();
    onNavigateToCarico?.();
  };

  const handleOpenScarico = () => {
    onClose();
    onNavigateToScarico?.();
  };

  // Determina quale azione mostrare in base al tipo di movimento
  const getNavigationAction = () => {
    // Se c'è un appuntamento collegato, mostra quello
    if (movimento.appuntamento_id) {
      return {
        label: 'Vai all\'Appuntamento in Agenda',
        icon: <Calendar size={16} />,
        onClick: handleOpenAppuntamento,
        available: !!onNavigateToAppuntamento,
      };
    }
    // Per carico/reso, vai al tab carico
    if (['carico', 'reso'].includes(movimento.tipo)) {
      return {
        label: 'Vai al Tab Carico',
        icon: <TrendingUp size={16} />,
        onClick: handleOpenCarico,
        available: !!onNavigateToCarico,
      };
    }
    // Per scarichi, vai al tab scarico
    if (['scarico_uso', 'scarico_vendita', 'scarto'].includes(movimento.tipo)) {
      return {
        label: 'Vai al Tab Scarico',
        icon: <TrendingDown size={16} />,
        onClick: handleOpenScarico,
        available: !!onNavigateToScarico,
      };
    }
    return null;
  };

  const navigationAction = getNavigationAction();

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Dettaglio Movimento"
      >
        <div className="space-y-6">
          {/* Header con tipo e quantità */}
          <div className={`p-4 rounded-xl border ${getTipoColor()}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getMovimentoIcon(movimento.tipo)}
                <div>
                  <p className="font-semibold text-lg">
                    {TIPI_MOVIMENTO_LABELS[movimento.tipo] || movimento.tipo}
                  </p>
                  <p className="text-sm opacity-75">
                    {formatDate(movimento.created_at)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{movimento.quantita}
                </p>
                <p className="text-sm opacity-75">
                  Giacenza: {movimento.giacenza_risultante}
                </p>
              </div>
            </div>
          </div>

          {/* Prodotto */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Prodotto
            </h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Package className="text-gray-400" size={20} />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {movimento.prodotto_nome}
                </p>
                <p className="text-sm text-gray-500">
                  Codice: {movimento.prodotto_codice}
                </p>
              </div>
            </div>
          </div>

          {/* Dettagli */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Dettagli
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {movimento.cliente_nome && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <User className="text-gray-400" size={16} />
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {movimento.cliente_nome}
                    </p>
                  </div>
                </div>
              )}

              {movimento.operatrice_nome && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <User className="text-gray-400" size={16} />
                  <div>
                    <p className="text-xs text-gray-500">Operatore</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {movimento.operatrice_nome}
                    </p>
                  </div>
                </div>
              )}

              {movimento.fornitore && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Truck className="text-gray-400" size={16} />
                  <div>
                    <p className="text-xs text-gray-500">Fornitore</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {movimento.fornitore}
                    </p>
                  </div>
                </div>
              )}

              {movimento.documento_riferimento && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <FileText className="text-gray-400" size={16} />
                  <div>
                    <p className="text-xs text-gray-500">Documento</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {movimento.documento_riferimento}
                    </p>
                  </div>
                </div>
              )}

              {movimento.lotto && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Hash className="text-gray-400" size={16} />
                  <div>
                    <p className="text-xs text-gray-500">Lotto</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {movimento.lotto}
                    </p>
                  </div>
                </div>
              )}

              {movimento.prezzo_unitario !== null && movimento.prezzo_unitario !== undefined && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-400 text-sm font-bold">€</span>
                  <div>
                    <p className="text-xs text-gray-500">Prezzo Unitario</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      € {movimento.prezzo_unitario.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          {movimento.note && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Note
              </h3>
              <p className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                {movimento.note}
              </p>
            </div>
          )}

          {/* Azione di navigazione */}
          {navigationAction && navigationAction.available && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {movimento.appuntamento_id ? 'Appuntamento Collegato' : 'Origine Movimento'}
              </h3>
              <Button
                variant="secondary"
                onClick={navigationAction.onClick}
                className="w-full justify-center gap-2"
              >
                {navigationAction.icon}
                {navigationAction.label}
                <ArrowRight size={14} />
              </Button>
            </div>
          )}

          {/* Azioni */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" onClick={onClose}>
              Chiudi
            </Button>
          </div>
        </div>
      </Modal>
  );
}
