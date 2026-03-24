import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Mail, Send, ChevronDown, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import * as comunicazioniService from '../../services/comunicazioni';

interface ReminderButtonProps {
  appuntamentoId: string;
  clienteTelefono?: string | null;
  clienteEmail?: string | null;
  clienteConsensoWhatsapp?: boolean;
  clienteConsensoEmail?: boolean;
  reminderInviato?: boolean;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const ReminderButton: React.FC<ReminderButtonProps> = ({
  appuntamentoId,
  clienteTelefono,
  clienteEmail,
  clienteConsensoWhatsapp,
  clienteConsensoEmail,
  reminderInviato,
  disabled,
  onSuccess,
  onError,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(reminderInviato || false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUpward: false });

  // Calcola la posizione del dropdown quando si apre
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 180; // Altezza approssimativa del dropdown
      const dropdownWidth = 176; // w-44 = 11rem = 176px
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const padding = 8; // Margine minimo dal bordo viewport

      // Se non c'è abbastanza spazio sotto, apri verso l'alto
      const openUpward = spaceBelow < dropdownHeight + padding && spaceAbove > dropdownHeight + padding;

      // Calcola top assicurandosi che rimanga nella viewport
      let top: number;
      if (openUpward) {
        top = Math.max(padding, rect.top - dropdownHeight - 4);
      } else {
        top = Math.min(rect.bottom + 4, viewportHeight - dropdownHeight - padding);
      }

      // Calcola left assicurandosi che non esca dalla viewport
      const left = Math.max(padding, Math.min(rect.left, viewportWidth - dropdownWidth - padding));

      setDropdownPosition({ top, left, openUpward });
    }
  }, [isOpen]);

  // Determina quali canali sono disponibili
  const hasPhone = !!clienteTelefono;
  const hasEmail = !!clienteEmail;

  const channels = [
    {
      id: 'whatsapp' as const,
      label: 'WhatsApp',
      icon: MessageCircle,
      available: hasPhone && clienteConsensoWhatsapp,
      color: 'text-green-600',
      bgColor: 'hover:bg-green-50',
    },
    {
      id: 'email' as const,
      label: 'Email',
      icon: Mail,
      available: hasEmail && clienteConsensoEmail,
      color: 'text-purple-600',
      bgColor: 'hover:bg-purple-50',
    },
  ];

  const availableChannels = channels.filter((c) => c.available);

  const handleSendReminder = async (canale: 'whatsapp' | 'email') => {
    setLoading(true);
    try {
      const link = await comunicazioniService.sendReminder(appuntamentoId, canale);

      // Apri il link (app WhatsApp/email)
      await comunicazioniService.openMessageLink(link.link);

      setSent(true);
      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Errore invio reminder:', error);
      onError?.(error?.message || 'Errore durante l\'invio del reminder');
    } finally {
      setLoading(false);
    }
  };

  if (availableChannels.length === 0) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled
        title="Nessun canale disponibile (mancano consensi o contatti)"
        className="gap-1.5 text-gray-400"
      >
        <Send size={14} />
        Reminder
      </Button>
    );
  }

  if (sent) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled
        className="gap-1.5 text-green-600 border-green-300"
      >
        <Check size={14} />
        Reminder inviato
      </Button>
    );
  }

  return (
    <div ref={buttonRef}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className="gap-1.5"
      >
        {loading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
            Invio...
          </>
        ) : (
          <>
            <Send size={14} />
            Reminder
            <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </Button>

      {isOpen && !loading && createPortal(
        <>
          {/* Overlay per chiudere al click fuori */}
          <div className="fixed inset-0 z-[110]" onClick={() => setIsOpen(false)} />

          {/* Dropdown menu - renderizzato tramite Portal per evitare problemi con overflow del modal */}
          <div
            className="fixed w-44 rounded-xl shadow-xl py-1 z-[111]"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
              Invia tramite
            </div>
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => channel.available && handleSendReminder(channel.id)}
                disabled={!channel.available}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  channel.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
                style={{ color: channel.available ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                onMouseEnter={e => { if (channel.available) e.currentTarget.style.background = 'var(--glass-border)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <channel.icon size={16} className={channel.available ? channel.color : ''} style={!channel.available ? { color: 'var(--color-text-muted)' } : undefined} />
                <span>{channel.label}</span>
                {!channel.available && (
                  <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>Non disponibile</span>
                )}
              </button>
            ))}

            {/* Info */}
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--glass-border)' }}>
              Si aprirà l'app per confermare
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
