import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Sezioni visibili nella dashboard
export type DashboardSectionId =
  | 'oggi'
  | 'grafici'
  | 'azioni'
  | 'andamento'
  | 'trattamenti_top'
  | 'prossimi_appuntamenti';

export interface DashboardSection {
  id: DashboardSectionId;
  label: string;
  visible: boolean;
}

interface DashboardState {
  sections: DashboardSection[];
  isCustomizing: boolean;

  toggleSection: (id: DashboardSectionId) => void;
  reorderSections: (reordered: DashboardSection[]) => void;
  setCustomizing: (v: boolean) => void;
  isSectionVisible: (id: DashboardSectionId) => boolean;
  resetSections: () => void;
}

const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: 'oggi', label: 'Oggi', visible: true },
  { id: 'prossimi_appuntamenti', label: 'Prossimi Appuntamenti', visible: true },
  { id: 'azioni', label: 'Azioni', visible: true },
  { id: 'grafici', label: 'Andamento Settimanale', visible: false },
  { id: 'andamento', label: 'Andamento', visible: false },
  { id: 'trattamenti_top', label: 'Trattamenti Top', visible: false },
];

// Merge stored sections with defaults (handles new sections added after user saved)
function migrateSections(stored: DashboardSection[]): DashboardSection[] {
  const storedIds = new Set(stored.map(s => s.id));
  const merged = [...stored];
  for (const def of DEFAULT_SECTIONS) {
    if (!storedIds.has(def.id)) {
      merged.push(def);
    }
  }
  // Remove sections that no longer exist in defaults
  const validIds = new Set(DEFAULT_SECTIONS.map(s => s.id));
  return merged.filter(s => validIds.has(s.id));
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      sections: DEFAULT_SECTIONS,
      isCustomizing: false,

      toggleSection: (id: DashboardSectionId) => {
        const { sections } = get();
        set({
          sections: sections.map((s) =>
            s.id === id ? { ...s, visible: !s.visible } : s
          ),
        });
      },

      reorderSections: (reordered: DashboardSection[]) => {
        set({ sections: reordered });
      },

      setCustomizing: (v: boolean) => {
        set({ isCustomizing: v });
      },

      isSectionVisible: (id: DashboardSectionId) => {
        return get().sections.find((s) => s.id === id)?.visible ?? true;
      },

      resetSections: () => {
        set({ sections: DEFAULT_SECTIONS });
      },
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        sections: state.sections,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<DashboardState>;
        return {
          ...current,
          sections: p.sections ? migrateSections(p.sections) : current.sections,
        };
      },
    }
  )
);
