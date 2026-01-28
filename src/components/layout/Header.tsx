import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, Mail, Settings, LogOut, ChevronDown } from 'lucide-react';
import { clientiService } from '../../services/clienti';
import { Cliente } from '../../types/cliente';
import { useAuthStore } from '../../stores/authStore';

interface HeaderProps {
  title: string;
  onNavigate: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const searchClienti = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        const results = await clientiService.getClienti(searchTerm, 10, 0);
        setSearchResults(results);
        setShowResults(true);
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

  const handleResultClick = (cliente: Cliente) => {
    sessionStorage.setItem('selectedClienteId', cliente.id);
    onNavigate('clienti');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigateToCliente', { detail: { clienteId: cliente.id } }));
    }, 100);
    setShowResults(false);
    setSearchTerm('');
  };

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
                type="text"
                placeholder="Cerca clienti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.trim().length >= 2 && setShowResults(true)}
                className="bg-transparent border-none outline-none w-56 text-sm"
                style={{ color: 'var(--color-text-primary)' }}
              />
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
              <div
                className="absolute top-full mt-2 w-96 rounded-2xl max-h-96 overflow-y-auto z-50"
                style={{
                  background: 'var(--card-hover)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 8px 32px var(--glass-shadow)',
                }}
              >
                {loading ? (
                  <div className="p-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Ricerca in corso...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Nessun risultato trovato
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => handleResultClick(cliente)}
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
                        style={{ borderBottom: '1px solid var(--glass-border)' }}
                      >
                        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {cliente.nome} {cliente.cognome}
                        </div>
                        <div className="mt-1 space-y-1">
                          {cliente.cellulare && (
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              <Phone size={14} />
                              <span>{cliente.cellulare}</span>
                            </div>
                          )}
                          {cliente.email && (
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              <Mail size={14} />
                              <span>{cliente.email}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                  }}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.nome} className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    user.nome?.charAt(0).toUpperCase() || <User size={16} />
                  )}
                </div>
                <ChevronDown size={16} style={{ color: 'var(--color-text-secondary)' }} />
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl z-50 py-2"
                  style={{
                    background: 'var(--card-hover)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 8px 32px var(--glass-shadow)',
                  }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {user.nome} {user.cognome}
                    </p>
                    <p className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
                      {user.role}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)]"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <Settings size={16} />
                    Impostazioni
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)]"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <LogOut size={16} />
                    Esci
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
