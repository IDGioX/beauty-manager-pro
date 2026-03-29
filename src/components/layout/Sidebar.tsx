import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  Package,
  PackageCheck,
  MessageSquare,
  BarChart3,
  Lightbulb,
  Settings,
  Sparkles,
  ChevronRight,
  LogOut,
  ChevronUp,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

type MenuItem = { id: string; label: string; icon: React.ElementType };
type MenuSection = { section: string; items: MenuItem[] };

const menuSections: MenuSection[] = [
  {
    section: 'Operatività',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'agenda', label: 'Agenda', icon: Calendar },
    ],
  },
  {
    section: 'Anagrafica',
    items: [
      { id: 'clienti', label: 'Clienti', icon: Users },
      { id: 'operatrici', label: 'Operatori', icon: Users },
    ],
  },
  {
    section: 'Servizi',
    items: [
      { id: 'trattamenti', label: 'Trattamenti', icon: Scissors },
      { id: 'pacchetti', label: 'Pacchetti', icon: PackageCheck },
    ],
  },
  {
    section: 'Gestione',
    items: [
      { id: 'magazzino', label: 'Magazzino', icon: Package },
      { id: 'comunicazioni', label: 'Comunicazioni', icon: MessageSquare },
    ],
  },
  {
    section: 'Analisi',
    items: [
      { id: 'report', label: 'Report', icon: BarChart3 },
      { id: 'insights', label: 'Insights', icon: Lightbulb },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { config } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('bmp_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('bmp_sidebar_collapsed', String(next)); } catch {}
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  return (
    <div
      className={`${collapsed ? 'w-[68px]' : 'w-72'} flex flex-col h-screen relative overflow-hidden transition-all duration-200`}
      style={{
        background: `linear-gradient(180deg, var(--sidebar-bg) 0%, var(--sidebar-gradient-end) 100%)`,
      }}
    >
      {/* Decorative gradient orb */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)` }}
      />

      {/* Logo Section */}
      <div className={`${collapsed ? 'p-3 flex justify-center' : 'p-6'} relative z-10`}>
        {config.customLogo ? (
          <img src={config.customLogo} alt="Logo" className="h-12 w-auto" />
        ) : (
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-4'}`}>
            <div
              className={`${collapsed ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'} flex items-center justify-center shadow-lg shrink-0`}
              style={{
                background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)`,
                boxShadow: `0 8px 24px color-mix(in srgb, var(--color-primary) 40%, transparent)`,
              }}
            >
              <Sparkles size={collapsed ? 18 : 24} className="text-white" />
            </div>
            {!collapsed && <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Beauty Manager
              </h1>
              <p className="text-xs font-medium" style={{ color: 'var(--sidebar-text)' }}>
                Professional Suite
              </p>
            </div>}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Menu Section */}
      <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-4'} py-4 overflow-y-auto scrollbar-hidden`}>
        {menuSections.map((section, sIdx) => (
          <div key={section.section} className={sIdx > 0 ? 'mt-3' : ''}>
            {!collapsed && (
              <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {section.section}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-xl transition-all duration-200 text-left group relative`}
                    title={collapsed ? item.label : undefined}
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)`
                        : 'transparent',
                      boxShadow: isActive ? `0 4px 16px color-mix(in srgb, var(--color-primary) 30%, transparent)` : 'none',
                    }}
                  >
                    {!isActive && (
                      <div
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: 'var(--sidebar-hover)' }}
                      />
                    )}

                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 relative z-10"
                      style={{
                        background: isActive
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: isActive ? 'white' : 'var(--sidebar-text)' }}
                      />
                    </div>

                    {!collapsed && (
                      <span
                        className="flex-1 font-medium text-sm transition-colors duration-200 relative z-10"
                        style={{ color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)' }}
                      >
                        {item.label}
                      </span>
                    )}

                    {isActive && !collapsed && (
                      <ChevronRight size={16} className="text-white/80 relative z-10" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Toggle collapse button */}
      <div className={`${collapsed ? 'px-2' : 'px-4'} pb-2 relative z-10`}>
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center py-2 rounded-xl transition-all hover:bg-white/5"
          title={collapsed ? 'Espandi menu' : 'Comprimi menu'}
        >
          {collapsed ? <PanelLeftOpen size={16} style={{ color: 'var(--sidebar-text)' }} /> : <PanelLeftClose size={16} style={{ color: 'var(--sidebar-text)' }} />}
        </button>
      </div>

      {/* Bottom Section - User Menu */}
      <div className={`${collapsed ? 'p-2' : 'p-4'} relative z-10`}>
        {!collapsed && <div className="mx-2 mb-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />}

        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => collapsed ? onNavigate('settings') : setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 text-left group relative`}
              style={{ background: showUserMenu ? 'var(--sidebar-hover)' : 'transparent' }}
              title={collapsed ? (user.nome || 'Account') : undefined}
            >
              {!showUserMenu && (
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'var(--sidebar-hover)' }}
                />
              )}

              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center relative z-10 text-white text-sm font-semibold"
                style={{
                  background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)`,
                }}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.nome} className="w-full h-full rounded-lg object-cover" />
                ) : (
                  user.nome?.charAt(0).toUpperCase() || <User size={16} />
                )}
              </div>

              {!collapsed && <div className="flex-1 min-w-0 relative z-10">
                <span
                  className="block font-medium text-sm truncate"
                  style={{ color: 'var(--sidebar-text-active)' }}
                >
                  {user.nome} {user.cognome}
                </span>
                <span
                  className="block text-xs capitalize truncate"
                  style={{ color: 'var(--sidebar-text)' }}
                >
                  {user.role}
                </span>
              </div>}

              {!collapsed && <ChevronUp
                size={16}
                className="relative z-10 transition-transform duration-200"
                style={{
                  color: 'var(--sidebar-text)',
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 8px 32px var(--glass-shadow)',
                }}
              >
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <Settings size={16} />
                  Impostazioni
                </button>
                <div style={{ borderTop: '1px solid var(--glass-border)' }} />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
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
  );
};
