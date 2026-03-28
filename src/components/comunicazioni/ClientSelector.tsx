import { useState, useEffect, useMemo } from 'react';
import { Search, Users, Check, Filter } from 'lucide-react';
import * as comunicazioniService from '../../services/comunicazioni';
import type { TargetFilters } from '../../types/comunicazione';
import type { Cliente } from '../../types/cliente';

interface ClientSelectorProps {
  canale: 'whatsapp' | 'email';
  selectedClientIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const AVATAR_COLORS = ['#E87C7C', '#7CB8E8', '#7CE8A5', '#E8C87C', '#C87CE8', '#7CE8E8', '#E87CB8', '#8CE87C'];

function getAvatarColor(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ClientSelector({ canale, selectedClientIds, onSelectionChange }: ClientSelectorProps) {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TargetFilters>({});

  // Carica clienti target
  const loadClients = async () => {
    setLoading(true);
    try {
      const result = await comunicazioniService.getTargetClienti(filters, canale);
      setClients(result);
    } catch (e) {
      console.error('Errore caricamento clienti target:', e);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [canale]);

  // Filtro locale per nome/cognome
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(c =>
      `${c.nome} ${c.cognome}`.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.cellulare?.includes(term)
    );
  }, [clients, searchTerm]);

  const allSelected = filteredClients.length > 0 && filteredClients.every(c => selectedClientIds.includes(c.id));

  const toggleAll = () => {
    if (allSelected) {
      const filteredIds = new Set(filteredClients.map(c => c.id));
      onSelectionChange(selectedClientIds.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedClientIds, ...filteredClients.map(c => c.id)]);
      onSelectionChange(Array.from(newIds));
    }
  };

  const toggleClient = (id: string) => {
    if (selectedClientIds.includes(id)) {
      onSelectionChange(selectedClientIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedClientIds, id]);
    }
  };

  const getContactInfo = (c: Cliente): string => {
    if (canale === 'whatsapp') return c.cellulare || c.telefono || '';
    return c.email || '';
  };

  return (
    <div className="space-y-3">
      {/* Header con conteggio */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: 'var(--color-primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {clients.length} clienti con consenso {canale === 'whatsapp' ? 'WhatsApp' : 'Email'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {selectedClientIds.length} selezionati
          </span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: showFilters ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
              color: showFilters ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Filtri avanzati */}
      {showFilters && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)', border: '1px solid var(--glass-border)' }}
        >
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={filters.con_appuntamenti_recenti || false}
              onChange={e => setFilters(prev => ({ ...prev, con_appuntamenti_recenti: e.target.checked || undefined }))}
              className="rounded"
            />
            Con appuntamenti recenti
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Giorni ultima visita (min)</label>
              <input
                type="number"
                min={0}
                value={filters.giorni_ultima_visita_min ?? ''}
                onChange={e => setFilters(prev => ({ ...prev, giorni_ultima_visita_min: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-2 py-1 rounded-lg text-xs"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }}
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Giorni ultima visita (max)</label>
              <input
                type="number"
                min={0}
                value={filters.giorni_ultima_visita_max ?? ''}
                onChange={e => setFilters(prev => ({ ...prev, giorni_ultima_visita_max: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-2 py-1 rounded-lg text-xs"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }}
                placeholder="∞"
              />
            </div>
          </div>
          <button
            onClick={loadClients}
            className="w-full px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            Applica filtri
          </button>
        </div>
      )}

      {/* Search + Seleziona tutti */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cerca per nome..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-xs"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }}
          />
        </div>
        <button
          onClick={toggleAll}
          className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
          style={{
            background: allSelected ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'var(--card-bg)',
            color: allSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: '1px solid var(--glass-border)',
          }}
        >
          {allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
        </button>
      </div>

      {/* Lista clienti */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--glass-border)', maxHeight: '360px', overflowY: 'auto', scrollbarWidth: 'thin' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'var(--color-primary)' }} />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {clients.length === 0
                ? `Nessun cliente con consenso ${canale === 'whatsapp' ? 'WhatsApp' : 'Email'}`
                : 'Nessun risultato per la ricerca'}
            </p>
            {clients.length === 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Verifica i consensi marketing nelle schede clienti
              </p>
            )}
          </div>
        ) : (
          filteredClients.map((client, i) => {
            const isSelected = selectedClientIds.includes(client.id);
            const contact = getContactInfo(client);
            const initials = `${client.nome[0] || ''}${client.cognome[0] || ''}`.toUpperCase();

            return (
              <div
                key={client.id}
                onClick={() => toggleClient(client.id)}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
                style={{
                  background: isSelected ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'transparent',
                  borderBottom: i < filteredClients.length - 1 ? '1px solid var(--glass-border)' : undefined,
                }}
              >
                {/* Checkbox */}
                <div
                  className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors"
                  style={{
                    background: isSelected ? 'var(--color-primary)' : 'transparent',
                    border: isSelected ? 'none' : '2px solid var(--glass-border)',
                  }}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </div>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: getAvatarColor(client.nome + client.cognome) }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {client.nome} {client.cognome}
                  </p>
                  {contact && (
                    <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {contact}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
