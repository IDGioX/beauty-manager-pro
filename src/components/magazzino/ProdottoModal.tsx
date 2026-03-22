import { useState, useEffect } from 'react';
import { Package, Euro, Box, Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { magazzinoService } from '../../services/magazzino';
import {
  Prodotto,
  CategoriaProdotto,
  CreateProdottoInput,
  UpdateProdottoInput,
  UNITA_MISURA_OPTIONS,
  USO_OPTIONS,
} from '../../types/magazzino';

interface ProdottoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  prodotto: Prodotto | null;
  categorie: CategoriaProdotto[];
}

const initialFormData: CreateProdottoInput = {
  nome: '',
  categoria_id: '',
  barcode: '',
  descrizione: '',
  marca: '',
  linea: '',
  unita_misura: 'pz',
  capacita: undefined,
  giacenza: 0, // Sempre 0, la giacenza viene gestita tramite Carico
  scorta_minima: 0,
  scorta_riordino: 0,
  prezzo_vendita: undefined,
  uso: 'interno',
  data_scadenza: '',
  note: '',
};

export function ProdottoModal({
  isOpen,
  onClose,
  onSave,
  prodotto,
  categorie,
}: ProdottoModalProps) {
  const [formData, setFormData] = useState<CreateProdottoInput>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prodotto) {
      setFormData({
        nome: prodotto.nome,
        categoria_id: prodotto.categoria_id || '',
        barcode: prodotto.barcode || '',
        descrizione: prodotto.descrizione || '',
        marca: prodotto.marca || '',
        linea: prodotto.linea || '',
        unita_misura: prodotto.unita_misura,
        capacita: prodotto.capacita ?? undefined,
        giacenza: prodotto.giacenza,
        scorta_minima: prodotto.scorta_minima,
        scorta_riordino: prodotto.scorta_riordino,
        prezzo_vendita: prodotto.prezzo_vendita ?? undefined,
        uso: (prodotto.uso as 'interno' | 'vendita' | 'entrambi') || 'interno',
        data_scadenza: prodotto.data_scadenza || '',
        note: prodotto.note || '',
      });
    } else {
      setFormData(initialFormData);
    }
    setError(null);
  }, [prodotto, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nome.trim()) {
      setError('Il nome del prodotto è obbligatorio');
      return;
    }

    try {
      setLoading(true);

      if (prodotto) {
        const updateData: UpdateProdottoInput = {
          nome: formData.nome,
          categoria_id: formData.categoria_id || undefined,
          barcode: formData.barcode || undefined,
          descrizione: formData.descrizione || undefined,
          marca: formData.marca || undefined,
          linea: formData.linea || undefined,
          unita_misura: formData.unita_misura,
          capacita: formData.capacita,
          scorta_minima: formData.scorta_minima,
          scorta_riordino: formData.scorta_riordino,
          prezzo_vendita: formData.prezzo_vendita,
          uso: formData.uso,
          data_scadenza: formData.data_scadenza || undefined,
          note: formData.note || undefined,
        };
        await magazzinoService.updateProdotto(prodotto.id, updateData);
      } else {
        await magazzinoService.createProdotto(formData);
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={prodotto ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'color-mix(in srgb, rgb(239, 68, 68) 10%, transparent)', color: 'rgb(220, 38, 38)', border: '1px solid color-mix(in srgb, rgb(239, 68, 68) 20%, transparent)' }}>
            {error}
          </div>
        )}

        {/* Informazioni Base */}
        <div className="space-y-4">
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Package size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Informazioni Prodotto
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome Prodotto *"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              required
            />

            <Select
              label="Categoria"
              value={formData.categoria_id}
              onChange={(e) =>
                setFormData({ ...formData, categoria_id: e.target.value })
              }
            >
              <option value="">Seleziona categoria</option>
              {categorie.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </Select>

            <Input
              label="Marca"
              value={formData.marca}
              onChange={(e) =>
                setFormData({ ...formData, marca: e.target.value })
              }
              placeholder="Es: Diego dalla Palma"
            />

            <Input
              label="Linea"
              value={formData.linea}
              onChange={(e) =>
                setFormData({ ...formData, linea: e.target.value })
              }
              placeholder="Es: Hydra Gold"
            />

            <Input
              label="Codice a Barre"
              value={formData.barcode}
              onChange={(e) =>
                setFormData({ ...formData, barcode: e.target.value })
              }
              placeholder="Scansiona o inserisci manualmente"
            />

            <Select
              label="Uso"
              value={formData.uso}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  uso: e.target.value as 'interno' | 'vendita' | 'entrambi',
                })
              }
            >
              {USO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            label="Descrizione"
            value={formData.descrizione}
            onChange={(e) =>
              setFormData({ ...formData, descrizione: e.target.value })
            }
            rows={2}
          />
        </div>

        {/* Unità e Quantità */}
        <div className="pt-6 space-y-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Box size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Unità e Quantità
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Select
              label="Unità di Misura"
              value={formData.unita_misura}
              onChange={(e) =>
                setFormData({ ...formData, unita_misura: e.target.value })
              }
            >
              {UNITA_MISURA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <Input
              label="Capacità"
              type="number"
              step="0.01"
              value={formData.capacita ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  capacita: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="Es: 50"
            />

            <Input
              label="Scorta Minima"
              type="number"
              step="1"
              value={formData.scorta_minima ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  scorta_minima: parseInt(e.target.value) || 0,
                })
              }
            />

            <Input
              label="Scorta Riordino"
              type="number"
              step="1"
              value={formData.scorta_riordino ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  scorta_riordino: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>

        {/* Prezzo Vendita */}
        <div className="pt-6 space-y-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Euro size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Prezzo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prezzo Vendita"
              type="number"
              step="0.01"
              value={formData.prezzo_vendita ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  prezzo_vendita: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Scadenza e Note */}
        <div className="pt-6 space-y-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Calendar size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Scadenza e Note
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data Scadenza"
              type="date"
              value={formData.data_scadenza || ''}
              onChange={(e) =>
                setFormData({ ...formData, data_scadenza: e.target.value })
              }
            />
          </div>

          <Textarea
            label="Note"
            value={formData.note}
            onChange={(e) =>
              setFormData({ ...formData, note: e.target.value })
            }
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <Button variant="secondary" onClick={onClose} type="button">
            Annulla
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {prodotto ? 'Salva Modifiche' : 'Crea Prodotto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
