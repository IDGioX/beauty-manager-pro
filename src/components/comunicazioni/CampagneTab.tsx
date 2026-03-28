import { useState, useEffect, useMemo } from 'react';
import { Plus, MessageCircle, Mail, Users, Megaphone, Loader2 } from 'lucide-react';
import { CampagnaWizard } from './CampagnaWizard';
import { CampagnaSendModal } from './CampagnaSendModal';
import { CampagnaDetailModal } from './CampagnaDetailModal';
import * as comunicazioniService from '../../services/comunicazioni';
import type { CampagnaMarketing, TemplateMesaggio } from '../../types/comunicazione';

interface CampagneTabProps {
  templates: TemplateMesaggio[];
  showToast: (message: string, type: 'success' | 'error') => void;
}

const STATO_FILTERS = [
  { value: '', label: 'Tutte' },
  { value: 'bozza', label: 'Bozza' },
  { value: 'in_corso', label: 'In corso' },
  { value: 'completata', label: 'Completate' },
  { value: 'annullata', label: 'Annullate' },
];

const STATO_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  bozza: { bg: 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)', text: 'var(--color-text-muted)', label: 'Bozza' },
  in_corso: { bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', text: 'var(--color-warning)', label: 'In corso' },
  completata: { bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)', text: 'var(--color-success)', label: 'Completata' },
  annullata: { bg: 'color-mix(in srgb, var(--color-danger) 15%, transparent)', text: 'var(--color-danger)', label: 'Annullata' },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

export function CampagneTab({ templates, showToast }: CampagneTabProps) {
  const [campagne, setCampagne] = useState<CampagnaMarketing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStato, setFilterStato] = useState('');

  // Modals
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sendingCampagna, setSendingCampagna] = useState<CampagnaMarketing | null>(null);
  const [detailCampagna, setDetailCampagna] = useState<CampagnaMarketing | null>(null);

  const loadCampagne = async () => {
    try {
      const data = await comunicazioniService.getCampagne();
      setCampagne(data);
    } catch (e) {
      console.error('Errore caricamento campagne:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampagne(); }, []);

  const filtered = useMemo(() => {
    if (!filterStato) return campagne;
    return campagne.filter(c => c.stato === filterStato);
  }, [campagne, filterStato]);

  const handleCreated = (campagna: CampagnaMarketing) => {
    setWizardOpen(false);
    loadCampagne();
    setSendingCampagna(campagna);
  };

  const handleDelete = async (id: string) => {
    try {
      await comunicazioniService.deleteCampagna(id);
      showToast('Campagna eliminata', 'success');
      setDetailCampagna(null);
      loadCampagne();
    } catch (e) {
      console.error('Errore eliminazione:', e);
      showToast('Errore durante l\'eliminazione', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Campagne Marketing</h3>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Invia promozioni e comunicazioni ai tuoi clienti</p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white transition-colors"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={14} /> Nuova Campagna
        </button>
      </div>

      {/* Filtri stato */}
      <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)' }}>
        {STATO_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilterStato(f.value)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-center"
            style={{
              background: filterStato === f.value ? 'var(--card-bg)' : 'transparent',
              color: filterStato === f.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista campagne */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'color-mix(in srgb, var(--color-primary) 4%, transparent)', border: '1px solid var(--glass-border)' }}
        >
          <Megaphone size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {filterStato ? 'Nessuna campagna con questo stato' : 'Nessuna campagna creata'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Crea la tua prima campagna per inviare promozioni ai tuoi clienti
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(campagna => {
            const stato = STATO_STYLE[campagna.stato] || STATO_STYLE.bozza;

            return (
              <div
                key={campagna.id}
                className="rounded-xl overflow-hidden transition-all cursor-pointer hover:shadow-md"
                style={{ border: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}
                onClick={() => setDetailCampagna(campagna)}
              >
                {/* Colored top bar */}
                <div className="h-1" style={{ background: stato.text }} />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {campagna.nome}
                        </h4>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0"
                          style={{ background: stato.bg, color: stato.text }}
                        >
                          {stato.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {/* Canale badge */}
                        <span className="flex items-center gap-1">
                          {campagna.canale === 'whatsapp' ? (
                            <MessageCircle size={11} style={{ color: '#25D366' }} />
                          ) : (
                            <Mail size={11} style={{ color: 'var(--color-primary)' }} />
                          )}
                          {campagna.canale === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </span>

                        {/* Destinatari */}
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {campagna.totale_destinatari} dest.
                        </span>

                        {/* Data */}
                        <span>{formatDate(campagna.created_at)}</span>
                      </div>

                      {campagna.descrizione && (
                        <p className="text-[11px] mt-1.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {campagna.descrizione}
                        </p>
                      )}
                    </div>

                    {/* Azione rapida per bozza */}
                    {campagna.stato === 'bozza' && (
                      <button
                        onClick={e => { e.stopPropagation(); setSendingCampagna(campagna); }}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        Avvia
                      </button>
                    )}
                  </div>

                  {/* Stats bar per campagne completate */}
                  {(campagna.stato === 'completata' || campagna.stato === 'in_corso') && campagna.totale_destinatari > 0 && (
                    <div className="mt-3 flex gap-3">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-success)' }}>
                        {campagna.inviati} inviati
                      </span>
                      {campagna.errori > 0 && (
                        <span className="text-[10px] font-medium" style={{ color: 'var(--color-danger)' }}>
                          {campagna.errori} errori
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CampagnaWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={handleCreated}
        templates={templates}
      />

      {sendingCampagna && (
        <CampagnaSendModal
          isOpen={!!sendingCampagna}
          onClose={() => setSendingCampagna(null)}
          campagna={sendingCampagna}
          onCompleted={() => { setSendingCampagna(null); loadCampagne(); showToast('Campagna completata!', 'success'); }}
        />
      )}

      {detailCampagna && (
        <CampagnaDetailModal
          isOpen={!!detailCampagna}
          onClose={() => setDetailCampagna(null)}
          campagna={detailCampagna}
          onDelete={() => handleDelete(detailCampagna.id)}
        />
      )}
    </div>
  );
}
