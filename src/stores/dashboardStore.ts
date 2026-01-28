import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'appuntamenti' | 'churn' | 'revenue';
  title: string;
  enabled: boolean;
}

export interface LayoutItem {
  i: string; // widget id
  x: number;
  y: number;
  w: number; // width in grid units
  h: number; // height in grid units
  minW?: number;
  minH?: number;
}

interface DashboardState {
  layout: LayoutItem[];
  widgets: DashboardWidget[];
  isEditMode: boolean;

  // Actions
  setLayout: (layout: LayoutItem[]) => void;
  toggleWidget: (widgetId: string) => void;
  setEditMode: (enabled: boolean) => void;
  saveLayout: () => Promise<void>;
  loadLayout: () => void;
  resetLayout: () => void;
}

// Layout di default
const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'kpi-appuntamenti', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'kpi-clienti', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'kpi-fatturato', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'kpi-prodotti', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'appuntamenti-oggi', x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'churn-risk', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
];

// Widgets disponibili
const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'kpi-appuntamenti', type: 'kpi', title: 'Appuntamenti Oggi', enabled: true },
  { id: 'kpi-clienti', type: 'kpi', title: 'Clienti Attivi', enabled: true },
  { id: 'kpi-fatturato', type: 'kpi', title: 'Fatturato Mese', enabled: true },
  { id: 'kpi-prodotti', type: 'kpi', title: 'Scorte Basse', enabled: true },
  { id: 'appuntamenti-oggi', type: 'appuntamenti', title: 'Prossimi Appuntamenti', enabled: true },
  { id: 'churn-risk', type: 'churn', title: 'Clienti a Rischio', enabled: true },
];

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      layout: DEFAULT_LAYOUT,
      widgets: DEFAULT_WIDGETS,
      isEditMode: false,

      setLayout: (newLayout: LayoutItem[]) => {
        set({ layout: newLayout });
      },

      toggleWidget: (widgetId: string) => {
        const { widgets } = get();
        const updatedWidgets = widgets.map((w) =>
          w.id === widgetId ? { ...w, enabled: !w.enabled } : w
        );
        set({ widgets: updatedWidgets });
      },

      setEditMode: (enabled: boolean) => {
        set({ isEditMode: enabled });
      },

      saveLayout: async () => {
        const { layout } = get();

        // Salva nel backend se l'utente è autenticato
        try {
          const { useAuthStore } = await import('./authStore');
          const authState = useAuthStore.getState();

          if (authState.isAuthenticated && authState.user) {
            const layoutJson = JSON.stringify(layout);
            await authState.updateSettings({
              dashboard_layout: layoutJson,
            });
          }
        } catch (error) {
          console.error('Errore salvataggio layout:', error);
          // Il layout è comunque salvato in localStorage tramite persist
        }
      },

      loadLayout: () => {
        // Il layout viene automaticamente caricato dal persist middleware
        // Questa funzione può essere usata per forzare un reload se necessario
        const authState = useAuthStore.getState();

        if (authState.settings?.dashboard_layout) {
          try {
            const parsedLayout = JSON.parse(authState.settings.dashboard_layout);
            set({ layout: parsedLayout });
          } catch (error) {
            console.error('Errore parsing layout salvato:', error);
            set({ layout: DEFAULT_LAYOUT });
          }
        }
      },

      resetLayout: () => {
        set({
          layout: DEFAULT_LAYOUT,
          widgets: DEFAULT_WIDGETS,
          isEditMode: false,
        });
      },
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        layout: state.layout,
        widgets: state.widgets,
      }),
    }
  )
);
