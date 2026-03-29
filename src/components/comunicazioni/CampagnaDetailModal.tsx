import { useState } from 'react';
import { X, MessageCircle, Mail, Users, Check, AlertCircle, Trash2, Calendar, Send } from 'lucide-react';
import type { CampagnaMarketing } from '../../types/comunicazione';

interface CampagnaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campagna: CampagnaMarketing;
  onDelete: () => void;
  onSend: () => void;
}

const STATO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  bozza: { bg: 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)', text: 'var(--color-text-muted)', label: 'Bozza' },
  in_corso: { bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', text: 'var(--color-warning)', label: 'In corso' },
  completata: { bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)', text: 'var(--color-success)', label: 'Completata' },
  annullata: { bg: 'color-mix(in srgb, var(--color-danger) 15%, transparent)', text: 'var(--color-danger)', label: 'Annullata' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function CampagnaDetailModal({ isOpen, onClose, campagna, onDelete, onSend }: CampagnaDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const stato = STATO_COLORS[campagna.stato] || STATO_COLORS.bozza;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />

      <div
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="flex items-center gap-3 min-w-0">
            {campagna.canale === 'whatsapp' ? (
              <MessageCircle size={18} style={{ color: '#25D366' }} />
            ) : (
              <Mail size={18} style={{ color: 'var(--color-primary)' }} />
            )}
            <h2 className="font-bold text-sm text-white truncate">{campagna.nome}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Stato badge */}
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: stato.bg, color: stato.text }}
            >
              {stato.label}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
              style={{ background: campagna.canale === 'whatsapp' ? '#25D366' : 'var(--color-primary)' }}
            >
              {campagna.canale === 'whatsapp' ? 'WhatsApp' : 'Email'}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
              <Users size={16} className="mx-auto mb-1" style={{ color: 'var(--color-primary)' }} />
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{campagna.totale_destinatari}</p>
              <p className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>Destinatari</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'color-mix(in srgb, var(--color-success) 8%, transparent)' }}>
              <Check size={16} className="mx-auto mb-1" style={{ color: 'var(--color-success)' }} />
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{campagna.inviati}</p>
              <p className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>Inviati</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)' }}>
              <AlertCircle size={16} className="mx-auto mb-1" style={{ color: 'var(--color-danger)' }} />
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{campagna.errori}</p>
              <p className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>Errori</p>
            </div>
          </div>

          {/* Descrizione */}
          {campagna.descrizione && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{campagna.descrizione}</p>
          )}

          {/* Messaggio preview */}
          {campagna.messaggio_personalizzato && (
            <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)', border: '1px solid var(--glass-border)' }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Messaggio</p>
              <p className="text-xs whitespace-pre-wrap line-clamp-4" style={{ color: 'var(--color-text-secondary)' }}>
                {campagna.messaggio_personalizzato}
              </p>
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <Calendar size={12} />
              <span>Creata: {formatDate(campagna.created_at)}</span>
            </div>
            {campagna.avviata_at && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Calendar size={12} />
                <span>Avviata: {formatDate(campagna.avviata_at)}</span>
              </div>
            )}
            {campagna.completata_at && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Calendar size={12} />
                <span>Completata: {formatDate(campagna.completata_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--glass-border)' }}>
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-xs font-medium">
              <span style={{ color: 'var(--color-text-secondary)' }}>Eliminare?</span>
              <button
                onClick={() => { onDelete(); onClose(); }}
                className="px-2 py-1 rounded text-white"
                style={{ background: 'var(--color-danger)' }}
              >
                Si
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded"
                style={{ background: 'var(--glass-border)', color: 'var(--color-text-secondary)' }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 size={13} /> Elimina
            </button>
          )}
          <div className="flex gap-2">
            {(campagna.stato === 'bozza' || campagna.stato === 'completata') && (
              <button
                onClick={() => { onSend(); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                <Send size={13} /> {campagna.stato === 'completata' ? 'Reinvia' : 'Invia ora'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)', background: 'var(--glass-border)' }}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
