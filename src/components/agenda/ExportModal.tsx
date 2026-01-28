import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { exportService } from '../../services/export';
import { save } from '@tauri-apps/plugin-dialog';
import type { Operatrice } from '../../types/agenda';

interface ExportModalProps {
  onClose: () => void;
  operatrici: Operatrice[];
  selectedOperatriciIds: string[];
  selectedDate: Date;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  onClose,
  operatrici,
  selectedOperatriciIds,
  selectedDate,
}) => {
  // Default: settimana corrente
  const getWeekStart = () => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunedì
    const result = new Date(d);
    result.setDate(diff);
    return result;
  };

  const getWeekEnd = () => {
    const start = getWeekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Domenica
    return end;
  };

  const [formato, setFormato] = useState<'excel' | 'pdf'>('excel');
  const [dataInizio, setDataInizio] = useState(formatDateInput(getWeekStart()));
  const [dataFine, setDataFine] = useState(formatDateInput(getWeekEnd()));
  const [selectedOps, setSelectedOps] = useState<string[]>(
    selectedOperatriciIds.length > 0 ? selectedOperatriciIds : operatrici.map(o => o.id)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);

    // Validazioni
    if (new Date(dataFine) < new Date(dataInizio)) {
      setError('La data fine deve essere successiva alla data inizio');
      return;
    }

    if (selectedOps.length === 0) {
      setError("Seleziona almeno un operatore");
      return;
    }

    try {
      setIsExporting(true);

      // Prepara file name e filtri basati sul formato
      const fileExt = formato === 'pdf' ? 'pdf' : 'xlsx';
      const fileName = `Agenda_${dataInizio.replace(/-/g, '')}_${dataFine.replace(/-/g, '')}.${fileExt}`;
      const filterName = formato === 'pdf' ? 'PDF' : 'Excel';

      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: filterName, extensions: [fileExt] }]
      });

      if (!filePath) {
        // Utente ha annullato
        setIsExporting(false);
        return;
      }

      // Chiama backend in base al formato
      const exportData = {
        data_inizio: new Date(dataInizio).toISOString(),
        data_fine: new Date(dataFine + 'T23:59:59').toISOString(),
        operatrici_ids: selectedOps,
        file_path: filePath,
      };

      if (formato === 'pdf') {
        await exportService.exportAgendaPdf(exportData);
      } else {
        await exportService.exportAgendaExcel(exportData);
      }

      // Successo
      alert(`File ${formato.toUpperCase()} generato con successo!`);
      onClose();
    } catch (error: any) {
      console.error('Errore export:', error);
      setError(error?.message || "Errore durante l'esportazione");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Esporta Agenda" size="lg">
      <div className="space-y-6">
        {/* Errore */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Selezione Formato */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Formato</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setFormato('excel')}
              className={`p-4 border-2 rounded-lg transition-all ${
                formato === 'excel'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <FileSpreadsheet className={`w-6 h-6 ${formato === 'excel' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`} />
                <div className={`font-semibold ${formato === 'excel' ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-gray-100'}`}>Excel</div>
              </div>
              <div className={`text-sm ${formato === 'excel' ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
                Lista completa con filtri
              </div>
            </button>

            <button
              onClick={() => setFormato('pdf')}
              className={`p-4 border-2 rounded-lg transition-all ${
                formato === 'pdf'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <FileText className={`w-6 h-6 ${formato === 'pdf' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
                <div className={`font-semibold ${formato === 'pdf' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>PDF</div>
              </div>
              <div className={`text-sm ${formato === 'pdf' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                Stampa organizzata per giorno
              </div>
            </button>
          </div>
        </div>

        {/* Selezione Periodo */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Periodo</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data Inizio"
              type="date"
              value={dataInizio}
              onChange={(e) => setDataInizio(e.target.value)}
            />
            <Input
              label="Data Fine"
              type="date"
              value={dataFine}
              onChange={(e) => setDataFine(e.target.value)}
            />
          </div>
        </div>

        {/* Selezione Operatori */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Operatori
          </h3>
          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-white dark:bg-gray-800">
            <button
              onClick={() => setSelectedOps(selectedOps.length === operatrici.length ? [] : operatrici.map(o => o.id))}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {selectedOps.length === operatrici.length ? 'Deseleziona tutte' : 'Seleziona tutte'}
            </button>
            {operatrici.map((op) => (
              <label key={op.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOps.includes(op.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOps([...selectedOps, op.id]);
                    } else {
                      setSelectedOps(selectedOps.filter(id => id !== op.id));
                    }
                  }}
                  className="w-4 h-4"
                />
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: op.colore_agenda }}
                />
                <span className="text-gray-900 dark:text-gray-100">{op.cognome} {op.nome}</span>
              </label>
            ))}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {selectedOps.length} operator{selectedOps.length === 1 ? 'e' : 'i'} selezionat{selectedOps.length === 1 ? 'o' : 'i'}
          </div>
        </div>

        {/* Azioni */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={isExporting}>
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            loading={isExporting}
            disabled={selectedOps.length === 0 || isExporting}
          >
            Esporta {formato === 'pdf' ? 'PDF' : 'Excel'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
