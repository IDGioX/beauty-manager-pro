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
        data_fine: (() => { const d = new Date(dataFine); d.setHours(23, 59, 59, 999); return d.toISOString(); })(),
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
          <div className="p-3 rounded-lg text-sm" style={{ background: 'color-mix(in srgb, rgb(239, 68, 68) 10%, transparent)', color: 'rgb(220, 38, 38)', border: '1px solid color-mix(in srgb, rgb(239, 68, 68) 20%, transparent)' }}>
            {error}
          </div>
        )}

        {/* Selezione Formato */}
        <div>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Formato</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setFormato('excel')}
              className={`p-4 border-2 rounded-lg transition-all ${
                formato === 'excel'
                  ? 'border-green-500'
                  : ''
              }`}
              style={formato === 'excel'
                ? { background: 'color-mix(in srgb, rgb(34, 197, 94) 10%, transparent)' }
                : { borderColor: 'var(--glass-border)', background: 'transparent' }
              }
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <FileSpreadsheet className="w-6 h-6" style={{ color: formato === 'excel' ? 'rgb(34, 197, 94)' : 'var(--color-text-muted)' }} />
                <div className="font-semibold" style={{ color: formato === 'excel' ? 'rgb(34, 197, 94)' : 'var(--color-text-primary)' }}>Excel</div>
              </div>
              <div className="text-sm" style={{ color: formato === 'excel' ? 'rgb(34, 197, 94)' : 'var(--color-text-muted)' }}>
                Lista completa con filtri
              </div>
            </button>

            <button
              onClick={() => setFormato('pdf')}
              className={`p-4 border-2 rounded-lg transition-all ${
                formato === 'pdf'
                  ? 'border-blue-500'
                  : ''
              }`}
              style={formato === 'pdf'
                ? { background: 'color-mix(in srgb, rgb(59, 130, 246) 10%, transparent)' }
                : { borderColor: 'var(--glass-border)', background: 'transparent' }
              }
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <FileText className="w-6 h-6" style={{ color: formato === 'pdf' ? 'rgb(59, 130, 246)' : 'var(--color-text-muted)' }} />
                <div className="font-semibold" style={{ color: formato === 'pdf' ? 'rgb(59, 130, 246)' : 'var(--color-text-primary)' }}>PDF</div>
              </div>
              <div className="text-sm" style={{ color: formato === 'pdf' ? 'rgb(59, 130, 246)' : 'var(--color-text-muted)' }}>
                Stampa organizzata per giorno
              </div>
            </button>
          </div>
        </div>

        {/* Selezione Periodo */}
        <div>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Periodo</h3>
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
          <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Operatori
          </h3>
          <div className="max-h-48 overflow-y-auto rounded-lg p-3 space-y-2" style={{ border: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
            <button
              onClick={() => setSelectedOps(selectedOps.length === operatrici.length ? [] : operatrici.map(o => o.id))}
              className="text-sm hover:underline" style={{ color: 'var(--color-primary)' }}
            >
              {selectedOps.length === operatrici.length ? 'Deseleziona tutte' : 'Seleziona tutte'}
            </button>
            {operatrici.map((op) => (
              <label key={op.id} className="flex items-center gap-3 p-2 rounded cursor-pointer" onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
                <span style={{ color: 'var(--color-text-primary)' }}>{op.cognome} {op.nome}</span>
              </label>
            ))}
          </div>
          <div className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {selectedOps.length} operator{selectedOps.length === 1 ? 'e' : 'i'} selezionat{selectedOps.length === 1 ? 'o' : 'i'}
          </div>
        </div>

        {/* Azioni */}
        <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
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
