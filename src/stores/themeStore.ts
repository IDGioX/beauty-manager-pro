import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '../types/user';
import { COLOR_PALETTES, ColorPalette, getDefaultPalette, getPaletteById } from '../config/colorPalettes';

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  paletteId: string;
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  customLogo?: string;
  // Legacy - mantenuto per compatibilità
  primaryColor?: string;
}

interface ThemeState {
  config: ThemeConfig;
  appliedMode: 'light' | 'dark';
  currentPalette: ColorPalette;

  // Actions
  setTheme: (config: Partial<ThemeConfig>) => void;
  setPalette: (paletteId: string) => void;
  applyTheme: () => void;
  initTheme: () => void;
  initFromUserSettings: (settings: UserSettings) => void;
  resetToDefault: () => void;
  getAvailablePalettes: () => ColorPalette[];
}

const DEFAULT_CONFIG: ThemeConfig = {
  mode: 'light',
  paletteId: 'coral-beauty',
  fontSize: 'base',
};

// Font size mapping
const FONT_SIZE_MAP = {
  xs: '14px',
  sm: '15px',
  base: '16px',
  lg: '17px',
  xl: '18px',
};

// Determina se il sistema preferisce dark mode
function getSystemThemePreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Applica le variabili CSS della palette
function applyPaletteToCSS(palette: ColorPalette, isDark: boolean) {
  const root = document.documentElement;

  // Colori principali
  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--color-primary-light', palette.primaryLight);
  root.style.setProperty('--color-primary-dark', palette.primaryDark);

  // Colori secondari
  root.style.setProperty('--color-secondary', palette.secondary);
  root.style.setProperty('--color-secondary-light', palette.secondaryLight);
  root.style.setProperty('--color-secondary-dark', palette.secondaryDark);

  // Colore accento
  root.style.setProperty('--color-accent', palette.accent);
  root.style.setProperty('--color-accent-light', palette.accentLight);
  root.style.setProperty('--color-accent-dark', palette.accentDark);

  // Sfondi
  if (isDark) {
    // Dark mode: inverti i colori di sfondo
    root.style.setProperty('--bg-base', '#1A1816');
    root.style.setProperty('--bg-secondary', '#242220');
    root.style.setProperty('--bg-tertiary', '#2E2C28');
    root.style.setProperty('--color-text-primary', '#F5F0E8');
    root.style.setProperty('--color-text-secondary', '#C4BEB4');
    root.style.setProperty('--color-text-muted', '#8A847A');
    root.style.setProperty('--glass-bg', 'rgba(30, 28, 26, 0.8)');
    root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
    root.style.setProperty('--glass-shadow', 'rgba(0, 0, 0, 0.3)');
    root.style.setProperty('--card-bg', 'rgba(40, 38, 34, 0.85)');
    root.style.setProperty('--card-hover', 'rgba(50, 48, 44, 0.95)');
  } else {
    root.style.setProperty('--bg-base', palette.bgBase);
    root.style.setProperty('--bg-secondary', palette.bgSecondary);
    root.style.setProperty('--bg-tertiary', palette.bgTertiary);
    root.style.setProperty('--color-text-primary', palette.textPrimary);
    root.style.setProperty('--color-text-secondary', palette.textSecondary);
    root.style.setProperty('--color-text-muted', palette.textMuted);
    root.style.setProperty('--glass-bg', palette.glassBg);
    root.style.setProperty('--glass-border', palette.glassBorder);
    root.style.setProperty('--glass-shadow', palette.glassShadow);
    root.style.setProperty('--card-bg', palette.cardBg);
    root.style.setProperty('--card-hover', palette.cardHover);
  }

  // Sidebar (sempre scura)
  root.style.setProperty('--sidebar-bg', palette.sidebarBg);
  root.style.setProperty('--sidebar-gradient-end', palette.sidebarGradientEnd);
  root.style.setProperty('--sidebar-text', palette.sidebarText);
  root.style.setProperty('--sidebar-text-active', palette.sidebarTextActive);
  root.style.setProperty('--sidebar-hover', palette.sidebarHover);

  // Status colors
  root.style.setProperty('--color-success', palette.success);
  root.style.setProperty('--color-warning', palette.warning);
  root.style.setProperty('--color-danger', palette.danger);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      appliedMode: 'light',
      currentPalette: getDefaultPalette(),

      setTheme: (newConfig: Partial<ThemeConfig>) => {
        console.log('setTheme called with:', newConfig);
        const { config } = get();
        const updatedConfig = { ...config, ...newConfig };
        console.log('updatedConfig:', updatedConfig);

        // Se cambia la palette, aggiorna anche currentPalette
        const newPalette = newConfig.paletteId
          ? getPaletteById(newConfig.paletteId)
          : get().currentPalette;
        console.log('newPalette:', newPalette?.id, newPalette?.name);

        set({ config: updatedConfig, currentPalette: newPalette });
        console.log('State updated, calling applyTheme');
        get().applyTheme();
      },

      setPalette: (paletteId: string) => {
        const palette = getPaletteById(paletteId);
        const { config } = get();
        set({
          config: { ...config, paletteId },
          currentPalette: palette
        });
        get().applyTheme();
      },

      applyTheme: () => {
        console.log('applyTheme called');
        const { config, currentPalette } = get();
        console.log('applyTheme - config.paletteId:', config.paletteId);
        console.log('applyTheme - currentPalette:', currentPalette?.id, currentPalette?.name);
        console.log('applyTheme - currentPalette.primary:', currentPalette?.primary);
        const root = document.documentElement;

        // Determina il mode effettivo
        let effectiveMode: 'light' | 'dark' = 'light';
        if (config.mode === 'auto') {
          effectiveMode = getSystemThemePreference();
        } else {
          effectiveMode = config.mode;
        }

        // Applica dark mode class
        if (effectiveMode === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }

        // Applica la palette CSS
        console.log('Calling applyPaletteToCSS with palette:', currentPalette?.id);
        applyPaletteToCSS(currentPalette, effectiveMode === 'dark');
        console.log('CSS variables applied. --color-primary is now:', getComputedStyle(root).getPropertyValue('--color-primary'));

        // Applica font size
        root.style.setProperty('--font-size-base', FONT_SIZE_MAP[config.fontSize]);

        set({ appliedMode: effectiveMode });
      },

      initTheme: () => {
        const { config } = get();

        // Carica la palette corretta
        const palette = getPaletteById(config.paletteId);
        set({ currentPalette: palette });

        // Listener per cambio preferenza sistema
        if (config.mode === 'auto') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handler = () => get().applyTheme();
          mediaQuery.addEventListener('change', handler);
        }

        get().applyTheme();
      },

      initFromUserSettings: (settings: UserSettings) => {
        // Mantieni compatibilità con vecchio sistema
        const paletteId = settings.palette_id || 'coral-beauty';
        const palette = getPaletteById(paletteId);

        set({
          config: {
            mode: settings.theme_mode,
            paletteId: paletteId,
            fontSize: settings.font_size,
            customLogo: settings.custom_logo_url || undefined,
          },
          currentPalette: palette,
        });
        get().applyTheme();
      },

      resetToDefault: () => {
        const defaultPalette = getDefaultPalette();
        set({
          config: DEFAULT_CONFIG,
          currentPalette: defaultPalette
        });
        get().applyTheme();
      },

      getAvailablePalettes: () => COLOR_PALETTES,
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        config: state.config,
      }),
      onRehydrateStorage: () => (state) => {
        // Applica il tema immediatamente dopo il ripristino dallo storage
        if (state) {
          const palette = getPaletteById(state.config.paletteId);
          state.currentPalette = palette;
          // Applica subito le variabili CSS
          const effectiveMode = state.config.mode === 'auto'
            ? getSystemThemePreference()
            : state.config.mode;
          applyPaletteToCSS(palette, effectiveMode === 'dark');
          // Applica font size
          document.documentElement.style.setProperty(
            '--font-size-base',
            FONT_SIZE_MAP[state.config.fontSize]
          );
          // Applica dark mode class
          if (effectiveMode === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
    }
  )
);
