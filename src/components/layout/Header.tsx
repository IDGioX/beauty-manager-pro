import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Phone, Mail, Settings,
  LayoutDashboard, Calendar, Users, Scissors, Package, MessageSquare,
  BarChart3, TrendingUp, TrendingDown, History, UserPlus,
  CalendarPlus, FileText, Database, Palette, Bell, Command
} from 'lucide-react';
import { clientiService } from '../../services/clienti';
import { trattamentiService } from '../../services/trattamenti';
import { operatriciService } from '../../services/operatrici';
import { pacchettiService } from '../../services/pacchetti';
import { Cliente } from '../../types/cliente';
import type { Trattamento } from '../../types/trattamento';
import type { Operatrice } from '../../types/agenda';
import type { PacchettoConTrattamenti } from '../../services/pacchetti';

interface HeaderProps {
  title: string;
  onNavigate: (page: string) => void;
}

interface SearchCommand {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: React.ReactNode;
  type: 'page' | 'action';
  page?: string;
  action?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cache dati per ricerca locale
  const [allTrattamenti, setAllTrattamenti] = useState<Trattamento[]>([]);
  const [allOperatrici, setAllOperatrici] = useState<Operatrice[]>([]);
  const [allPacchetti, setAllPacchetti] = useState<PacchettoConTrattamenti[]>([]);

  // Carica dati per ricerca locale (una volta)
  useEffect(() => {
    const load = async () => {
      try {
        const [t, o, p] = await Promise.all([
          trattamentiService.getTrattamenti(),
          operatriciService.getOperatrici(false),
          pacchettiService.getPacchetti(),
        ]);
        setAllTrattamenti(t);
        setAllOperatrici(o);
        setAllPacchetti(p);
      } catch (e) { console.error('Errore precaricamento dati ricerca:', e); }
    };
    load();
  }, []);

  // Definizione comandi di ricerca globale
  const searchCommands: SearchCommand[] = useMemo(() => [
    // Pagine di navigazione
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Vai alla dashboard principale',
      keywords: ['dashboard', 'home', 'principale', 'inizio', 'kpi', 'statistiche'],
      icon: <LayoutDashboard size={18} />,
      type: 'page',
      page: 'dashboard'
    },
    {
      id: 'nav-agenda',
      label: 'Agenda',
      description: 'Calendario appuntamenti',
      keywords: ['agenda', 'calendario', 'appuntamenti', 'prenotazioni', 'booking'],
      icon: <Calendar size={18} />,
      type: 'page',
      page: 'agenda'
    },
    {
      id: 'nav-clienti',
      label: 'Clienti',
      description: 'Gestione anagrafica clienti',
      keywords: ['clienti', 'anagrafica', 'rubrica', 'contatti', 'persone'],
      icon: <Users size={18} />,
      type: 'page',
      page: 'clienti'
    },
    {
      id: 'nav-operatrici',
      label: 'Operatrici',
      description: 'Gestione staff e operatrici',
      keywords: ['operatrici', 'operatori', 'staff', 'dipendenti', 'personale', 'team'],
      icon: <Users size={18} />,
      type: 'page',
      page: 'operatrici'
    },
    {
      id: 'nav-trattamenti',
      label: 'Trattamenti',
      description: 'Catalogo servizi e trattamenti',
      keywords: ['trattamenti', 'servizi', 'catalogo', 'listino', 'prezzi'],
      icon: <Scissors size={18} />,
      type: 'page',
      page: 'trattamenti'
    },
    {
      id: 'nav-magazzino',
      label: 'Magazzino',
      description: 'Gestione prodotti e scorte',
      keywords: ['magazzino', 'prodotti', 'stock', 'giacenze', 'scorte'],
      icon: <Package size={18} />,
      type: 'page',
      page: 'magazzino'
    },
    {
      id: 'nav-comunicazioni',
      label: 'Comunicazioni',
      description: 'WhatsApp, Email e auguri clienti',
      keywords: ['comunicazioni', 'whatsapp', 'email', 'messaggi', 'template', 'auguri', 'compleanni'],
      icon: <MessageSquare size={18} />,
      type: 'page',
      page: 'comunicazioni'
    },
    {
      id: 'nav-report',
      label: 'Report',
      description: 'Statistiche e analytics',
      keywords: ['report', 'statistiche', 'analytics', 'grafici', 'ricavi', 'fatturato', 'incassi'],
      icon: <BarChart3 size={18} />,
      type: 'page',
      page: 'report'
    },
    {
      id: 'nav-settings',
      label: 'Impostazioni',
      description: 'Configurazione sistema',
      keywords: ['impostazioni', 'settings', 'configurazione', 'preferenze', 'opzioni'],
      icon: <Settings size={18} />,
      type: 'page',
      page: 'settings'
    },
    // Azioni rapide - Magazzino
    {
      id: 'action-carico',
      label: 'Carico Prodotti',
      description: 'Registra arrivo merce in magazzino',
      keywords: ['carico', 'arrivo', 'merce', 'entrata', 'rifornimento', 'acquisto'],
      icon: <TrendingUp size={18} />,
      type: 'action',
      page: 'magazzino',
      action: () => {
        sessionStorage.setItem('magazzinoTab', 'carico');
        window.dispatchEvent(new CustomEvent('magazzinoTabChange', { detail: 'carico' }));
      }
    },
    {
      id: 'action-scarico',
      label: 'Scarico Prodotti',
      description: 'Registra uscita prodotti dal magazzino',
      keywords: ['scarico', 'uscita', 'consumo', 'vendita', 'uso'],
      icon: <TrendingDown size={18} />,
      type: 'action',
      page: 'magazzino',
      action: () => {
        sessionStorage.setItem('magazzinoTab', 'scarichi');
        window.dispatchEvent(new CustomEvent('magazzinoTabChange', { detail: 'scarichi' }));
      }
    },
    {
      id: 'action-movimenti',
      label: 'Movimenti Magazzino',
      description: 'Storico movimenti di magazzino',
      keywords: ['movimenti', 'storico', 'log', 'cronologia', 'magazzino'],
      icon: <History size={18} />,
      type: 'action',
      page: 'magazzino',
      action: () => {
        sessionStorage.setItem('magazzinoTab', 'movimenti');
        window.dispatchEvent(new CustomEvent('magazzinoTabChange', { detail: 'movimenti' }));
      }
    },
    // Azioni rapide - Clienti
    {
      id: 'action-nuovo-cliente',
      label: 'Nuovo Cliente',
      description: 'Aggiungi un nuovo cliente',
      keywords: ['nuovo', 'cliente', 'aggiungi', 'crea', 'inserisci', 'registra'],
      icon: <UserPlus size={18} />,
      type: 'action',
      page: 'clienti',
      action: () => {
        sessionStorage.setItem('clientiAction', 'nuovo');
        window.dispatchEvent(new CustomEvent('clientiAction', { detail: 'nuovo' }));
      }
    },
    {
      id: 'action-storico-clienti',
      label: 'Storico Clienti',
      description: 'Visualizza storico visite clienti',
      keywords: ['storico', 'cronologia', 'visite', 'storia', 'passato', 'clienti'],
      icon: <History size={18} />,
      type: 'page',
      page: 'clienti'
    },
    // Azioni rapide - Agenda
    {
      id: 'action-nuovo-appuntamento',
      label: 'Nuovo Appuntamento',
      description: 'Prenota un nuovo appuntamento',
      keywords: ['nuovo', 'appuntamento', 'prenota', 'prenotazione', 'booking', 'agenda'],
      icon: <CalendarPlus size={18} />,
      type: 'action',
      page: 'agenda',
      action: () => {
        sessionStorage.setItem('agendaAction', 'nuovo');
        window.dispatchEvent(new CustomEvent('agendaAction', { detail: 'nuovo' }));
      }
    },
    // Azioni rapide - Settings
    {
      id: 'action-backup',
      label: 'Backup Database',
      description: 'Crea backup del database',
      keywords: ['backup', 'salva', 'esporta', 'database', 'sicurezza', 'copia'],
      icon: <Database size={18} />,
      type: 'action',
      page: 'settings',
      action: () => {
        sessionStorage.setItem('settingsTab', 'backup');
        window.dispatchEvent(new CustomEvent('settingsTabChange', { detail: 'backup' }));
      }
    },
    {
      id: 'action-tema',
      label: 'Cambia Tema',
      description: 'Personalizza aspetto dell\'app',
      keywords: ['tema', 'colore', 'colori', 'aspetto', 'dark', 'light', 'scuro', 'chiaro', 'personalizza'],
      icon: <Palette size={18} />,
      type: 'action',
      page: 'settings',
      action: () => {
        sessionStorage.setItem('settingsTab', 'aspetto');
        window.dispatchEvent(new CustomEvent('settingsTabChange', { detail: 'aspetto' }));
      }
    },
    // Comunicazioni
    {
      id: 'action-template',
      label: 'Template Messaggi',
      description: 'Gestisci testi WhatsApp/Email',
      keywords: ['template', 'modelli', 'messaggi', 'whatsapp', 'email', 'testi'],
      icon: <FileText size={18} />,
      type: 'action',
      page: 'comunicazioni',
      action: () => {
        sessionStorage.setItem('comunicazioniTab', 'templates');
        window.dispatchEvent(new CustomEvent('comunicazioniTabChange', { detail: 'templates' }));
      }
    },
    {
      id: 'action-promemoria',
      label: 'Promemoria Appuntamenti',
      description: 'Configura reminder automatici',
      keywords: ['promemoria', 'reminder', 'notifiche', 'avvisi', 'automatici'],
      icon: <Bell size={18} />,
      type: 'action',
      page: 'comunicazioni',
      action: () => {
        sessionStorage.setItem('comunicazioniTab', 'automazioni');
        window.dispatchEvent(new CustomEvent('comunicazioniTabChange', { detail: 'automazioni' }));
      }
    },
  ], []);

  // Filtra comandi in base al termine di ricerca
  const filteredCommands = useMemo(() => {
    if (searchTerm.trim().length < 1) return [];

    const term = searchTerm.toLowerCase().trim();
    return searchCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(term) ||
      cmd.description.toLowerCase().includes(term) ||
      cmd.keywords.some(kw => kw.includes(term))
    );
  }, [searchTerm, searchCommands]);

  // Raggruppa per tipo
  const groupedCommands = useMemo(() => {
    const pages = filteredCommands.filter(c => c.type === 'page');
    const actions = filteredCommands.filter(c => c.type === 'action');
    return { pages, actions };
  }, [filteredCommands]);

  // Ricerca locale su trattamenti, operatrici, pacchetti
  const filteredTrattamenti = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase();
    return allTrattamenti.filter(t => t.nome.toLowerCase().includes(term) || (t.categoria_nome && t.categoria_nome.toLowerCase().includes(term))).slice(0, 5);
  }, [searchTerm, allTrattamenti]);

  const filteredOperatrici = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase();
    return allOperatrici.filter(o => `${o.nome} ${o.cognome}`.toLowerCase().includes(term) || (o.specializzazioni && o.specializzazioni.toLowerCase().includes(term))).slice(0, 5);
  }, [searchTerm, allOperatrici]);

  const filteredPacchetti = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase();
    return allPacchetti.filter(p => p.nome.toLowerCase().includes(term) || (p.descrizione && p.descrizione.toLowerCase().includes(term))).slice(0, 5);
  }, [searchTerm, allPacchetti]);

  // Conta totale risultati per navigazione tastiera
  const totalResults = useMemo(() => {
    return groupedCommands.pages.length + groupedCommands.actions.length + searchResults.length + filteredTrattamenti.length + filteredOperatrici.length + filteredPacchetti.length;
  }, [groupedCommands, searchResults, filteredTrattamenti, filteredOperatrici, filteredPacchetti]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut per aprire la ricerca (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowResults(true);
      }
      if (e.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigazione con tastiera nei risultati
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showResults) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        handleSelectByIndex(selectedIndex);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResults, selectedIndex, totalResults, groupedCommands, searchResults]);

  const handleSelectByIndex = (index: number) => {
    let offset = 0;
    const pagesCount = groupedCommands.pages.length;
    const actionsCount = groupedCommands.actions.length;

    if (index < pagesCount) {
      handleCommandClick(groupedCommands.pages[index]); return;
    }
    offset += pagesCount;
    if (index < offset + actionsCount) {
      handleCommandClick(groupedCommands.actions[index - offset]); return;
    }
    offset += actionsCount;
    if (index < offset + searchResults.length) {
      handleClienteClick(searchResults[index - offset]); return;
    }
    offset += searchResults.length;
    if (index < offset + filteredTrattamenti.length) {
      handleTrattamentoClick(filteredTrattamenti[index - offset]); return;
    }
    offset += filteredTrattamenti.length;
    if (index < offset + filteredOperatrici.length) {
      handleOperatriceClick(filteredOperatrici[index - offset]); return;
    }
    offset += filteredOperatrici.length;
    if (index < offset + filteredPacchetti.length) {
      handlePacchettoClick(filteredPacchetti[index - offset]); return;
    }
  };

  // Ricerca clienti (con debounce)
  useEffect(() => {
    const searchClienti = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const results = await clientiService.getClienti(searchTerm, 5, 0);
        setSearchResults(results);
      } catch (error) {
        console.error('Errore ricerca:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchClienti, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Mostra risultati quando si digita
  useEffect(() => {
    if (searchTerm.trim().length >= 1) {
      setShowResults(true);
      setSelectedIndex(-1);
    } else {
      setShowResults(false);
    }
  }, [searchTerm]);

  const handleCommandClick = (command: SearchCommand) => {
    if (command.page) {
      onNavigate(command.page);
    }
    if (command.action) {
      setTimeout(() => command.action!(), 100);
    }
    setShowResults(false);
    setSearchTerm('');
  };

  const handleClienteClick = (cliente: Cliente) => {
    sessionStorage.setItem('selectedClienteId', cliente.id);
    onNavigate('clienti');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigateToCliente', { detail: { clienteId: cliente.id } }));
    }, 100);
    setShowResults(false);
    setSearchTerm('');
  };

  const handleTrattamentoClick = (t: Trattamento) => {
    onNavigate('trattamenti');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigateToTrattamento', { detail: { trattamentoId: t.id } }));
    }, 100);
    setShowResults(false);
    setSearchTerm('');
  };

  const handleOperatriceClick = (o: Operatrice) => {
    onNavigate('operatrici');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigateToOperatrice', { detail: { operatriceId: o.id } }));
    }, 100);
    setShowResults(false);
    setSearchTerm('');
  };

  const handlePacchettoClick = (p: PacchettoConTrattamenti) => {
    onNavigate('pacchetti');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigateToPacchetto', { detail: { pacchettoId: p.id } }));
    }, 100);
    setShowResults(false);
    setSearchTerm('');
  };

  const allEntityResults = searchResults.length + filteredTrattamenti.length + filteredOperatrici.length + filteredPacchetti.length;
  const hasResults = filteredCommands.length > 0 || allEntityResults > 0 || loading;
  const showEmptyState = searchTerm.trim().length >= 2 && !loading && filteredCommands.length === 0 && allEntityResults === 0;

  return (
    <header
      className="px-6 py-4 relative z-20"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div className="flex-1">
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative" ref={searchRef}>
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 2px 8px var(--glass-shadow)',
              }}
            >
              <Search size={18} style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Cerca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.trim().length >= 1 && setShowResults(true)}
                className="bg-transparent border-none outline-none w-56 text-sm"
                style={{ color: 'var(--color-text-primary)' }}
              />
              <kbd
                className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{
                  background: 'var(--glass-border)',
                  color: 'var(--color-text-muted)',
                  fontSize: '10px'
                }}
              >
                <Command size={10} />K
              </kbd>
            </div>

            {/* Search Results Dropdown */}
            {showResults && (hasResults || showEmptyState) && (
              <div
                className="absolute top-full mt-2 w-[420px] rounded-2xl max-h-[480px] overflow-y-auto z-50"
                style={{
                  background: 'var(--card-hover)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 8px 32px var(--glass-shadow)',
                }}
              >
                {/* Hint */}
                {searchTerm.trim().length < 2 && filteredCommands.length > 0 && (
                  <div
                    className="px-4 py-2 text-xs"
                    style={{
                      color: 'var(--color-text-muted)',
                      borderBottom: '1px solid var(--glass-border)'
                    }}
                  >
                    Digita almeno 2 caratteri per cercare clienti
                  </div>
                )}

                {/* Pagine */}
                {groupedCommands.pages.length > 0 && (
                  <div>
                    <div
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Pagine
                    </div>
                    {groupedCommands.pages.map((cmd, idx) => (
                      <button
                        key={cmd.id}
                        onClick={() => handleCommandClick(cmd)}
                        className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                          selectedIndex === idx ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]' : ''
                        } hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]`}
                      >
                        <div
                          className="p-1.5 rounded-lg"
                          style={{ background: 'var(--color-primary)', color: 'white' }}
                        >
                          {cmd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {cmd.label}
                          </div>
                          <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {cmd.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Azioni */}
                {groupedCommands.actions.length > 0 && (
                  <div>
                    <div
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                      style={{
                        color: 'var(--color-text-muted)',
                        borderTop: groupedCommands.pages.length > 0 ? '1px solid var(--glass-border)' : 'none'
                      }}
                    >
                      Azioni
                    </div>
                    {groupedCommands.actions.map((cmd, idx) => (
                      <button
                        key={cmd.id}
                        onClick={() => handleCommandClick(cmd)}
                        className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                          selectedIndex === groupedCommands.pages.length + idx
                            ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]'
                            : ''
                        } hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]`}
                      >
                        <div
                          className="p-1.5 rounded-lg"
                          style={{ background: 'var(--color-success)', color: 'white' }}
                        >
                          {cmd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {cmd.label}
                          </div>
                          <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {cmd.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Clienti */}
                {(searchResults.length > 0 || (loading && searchTerm.trim().length >= 2)) && (
                  <div>
                    <div
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                      style={{
                        color: 'var(--color-text-muted)',
                        borderTop: filteredCommands.length > 0 ? '1px solid var(--glass-border)' : 'none'
                      }}
                    >
                      Clienti
                    </div>
                    {loading ? (
                      <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Ricerca in corso...
                      </div>
                    ) : (
                      searchResults.map((cliente, idx) => (
                        <button
                          key={cliente.id}
                          onClick={() => handleClienteClick(cliente)}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                            selectedIndex === groupedCommands.pages.length + groupedCommands.actions.length + idx
                              ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]'
                              : ''
                          } hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]`}
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                            style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                          >
                            {cliente.nome?.charAt(0).toUpperCase()}{cliente.cognome?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {cliente.nome} {cliente.cognome}
                            </div>
                            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {cliente.cellulare && (
                                <span className="flex items-center gap-1">
                                  <Phone size={12} />
                                  {cliente.cellulare}
                                </span>
                              )}
                              {cliente.email && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail size={12} />
                                  {cliente.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Trattamenti */}
                {filteredTrattamenti.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--glass-border)' }}>
                      Trattamenti
                    </div>
                    {filteredTrattamenti.map((t, idx) => {
                      const globalIdx = groupedCommands.pages.length + groupedCommands.actions.length + searchResults.length + idx;
                      return (
                        <button key={t.id} onClick={() => handleTrattamentoClick(t)}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${selectedIndex === globalIdx ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]' : ''} hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]`}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' }}>
                            <Scissors size={16} style={{ color: 'var(--color-accent)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{t.nome}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {t.categoria_nome || 'Senza categoria'} · {t.durata_minuti} min{t.prezzo_listino ? ` · €${t.prezzo_listino.toFixed(0)}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Operatrici */}
                {filteredOperatrici.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--glass-border)' }}>
                      Operatori
                    </div>
                    {filteredOperatrici.map((o, idx) => {
                      const globalIdx = groupedCommands.pages.length + groupedCommands.actions.length + searchResults.length + filteredTrattamenti.length + idx;
                      return (
                        <button key={o.id} onClick={() => handleOperatriceClick(o)}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${selectedIndex === globalIdx ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]' : ''} hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]`}>
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ background: o.colore_agenda || 'var(--color-primary)' }}>
                            {o.nome?.charAt(0)}{o.cognome?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{o.nome} {o.cognome}</div>
                            {o.specializzazioni && <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{o.specializzazioni}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Pacchetti */}
                {filteredPacchetti.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--glass-border)' }}>
                      Pacchetti
                    </div>
                    {filteredPacchetti.map((p, idx) => {
                      const globalIdx = groupedCommands.pages.length + groupedCommands.actions.length + searchResults.length + filteredTrattamenti.length + filteredOperatrici.length + idx;
                      return (
                        <button key={p.id} onClick={() => handlePacchettoClick(p)}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${selectedIndex === globalIdx ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]' : ''} hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]`}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
                            <Package size={16} style={{ color: 'var(--color-primary)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{p.nome}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {p.num_sedute} sedute · €{p.prezzo_totale.toFixed(0)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {showEmptyState && (
                  <div className="p-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessun risultato per "{searchTerm}"</p>
                  </div>
                )}

                {/* Keyboard hints */}
                <div
                  className="px-4 py-2 flex items-center gap-4 text-xs"
                  style={{
                    borderTop: '1px solid var(--glass-border)',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 rounded" style={{ background: 'var(--glass-border)' }}>↑↓</kbd>
                    naviga
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 rounded" style={{ background: 'var(--glass-border)' }}>⏎</kbd>
                    seleziona
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 rounded" style={{ background: 'var(--glass-border)' }}>esc</kbd>
                    chiudi
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
