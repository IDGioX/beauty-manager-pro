import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  Package,
  MessageSquare,
  BarChart3,
  Settings,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'clienti', label: 'Clienti', icon: Users },
  { id: 'operatrici', label: 'Operatori', icon: Users },
  { id: 'trattamenti', label: 'Trattamenti', icon: Scissors },
  { id: 'magazzino', label: 'Magazzino', icon: Package },
  { id: 'comunicazioni', label: 'Comunicazioni', icon: MessageSquare },
  { id: 'report', label: 'Report', icon: BarChart3 },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { config } = useThemeStore();

  return (
    <div
      className="w-72 flex flex-col h-screen relative overflow-hidden"
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
      <div className="p-6 relative z-10">
        {config.customLogo ? (
          <img src={config.customLogo} alt="Logo" className="h-12 w-auto" />
        ) : (
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)`,
                boxShadow: `0 8px 24px color-mix(in srgb, var(--color-primary) 40%, transparent)`,
              }}
            >
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Beauty Manager
              </h1>
              <p className="text-xs font-medium" style={{ color: 'var(--sidebar-text)' }}>
                Professional Suite
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Menu Section */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-hidden">
        <p className="px-4 mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Menu
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group relative"
              style={{
                background: isActive
                  ? `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)`
                  : 'transparent',
                boxShadow: isActive ? `0 4px 16px color-mix(in srgb, var(--color-primary) 30%, transparent)` : 'none',
              }}
            >
              {/* Hover background */}
              {!isActive && (
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'var(--sidebar-hover)' }}
                />
              )}

              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 relative z-10"
                style={{
                  background: isActive
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-white' : ''}
                  style={{ color: isActive ? 'white' : 'var(--sidebar-text)' }}
                />
              </div>

              <span
                className="flex-1 font-medium text-sm transition-colors duration-200 relative z-10"
                style={{ color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)' }}
              >
                {item.label}
              </span>

              {isActive && (
                <ChevronRight size={16} className="text-white/80 relative z-10" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 relative z-10">
        <div className="mx-2 mb-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <button
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group relative"
          style={{
            background: currentPage === 'settings'
              ? `linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%)`
              : 'transparent',
            boxShadow: currentPage === 'settings' ? `0 4px 16px color-mix(in srgb, var(--color-secondary) 30%, transparent)` : 'none',
          }}
        >
          {currentPage !== 'settings' && (
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: 'var(--sidebar-hover)' }}
            />
          )}

          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center relative z-10"
            style={{
              background: currentPage === 'settings'
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
            }}
          >
            <Settings
              size={18}
              style={{ color: currentPage === 'settings' ? 'white' : 'var(--sidebar-text)' }}
            />
          </div>

          <span
            className="flex-1 font-medium text-sm relative z-10"
            style={{ color: currentPage === 'settings' ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)' }}
          >
            Impostazioni
          </span>
        </button>
      </div>
    </div>
  );
};
