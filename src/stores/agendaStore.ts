import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type {
  Operatrice,
  AppuntamentoWithDetails,
  CreateAppuntamentoInput,
  UpdateAppuntamentoInput,
} from '../types/agenda';

interface AgendaState {
  operatrici: Operatrice[];
  appuntamenti: AppuntamentoWithDetails[];
  selectedDate: Date;
  selectedOperatriciIds: string[]; // Filtro operatrici visualizzate
  viewMode: 'day' | 'week' | 'month'; // Vista giornaliera, settimanale o mensile
  isLoading: boolean;
  error: string | null;

  // Modal state
  isModalOpen: boolean;
  selectedAppuntamento: AppuntamentoWithDetails | null;
  modalMode: 'create' | 'edit' | null;
  modalInitialTime: { start: Date; operatriceId: string } | null;

  // Actions
  loadOperatrici: () => Promise<void>;
  loadAppuntamenti: (dataInizio: Date, dataFine: Date) => Promise<void>;
  aggiornaStatiAutomatici: () => Promise<void>;
  createAppuntamento: (input: CreateAppuntamentoInput) => Promise<void>;
  updateAppuntamento: (id: string, input: UpdateAppuntamentoInput) => Promise<void>;
  deleteAppuntamento: (id: string) => Promise<void>;
  setSelectedDate: (date: Date) => void;
  setSelectedOperatrici: (ids: string[]) => void;
  setViewMode: (mode: 'day' | 'week' | 'month') => void;

  // Modal actions
  openCreateModal: (start: Date, operatriceId: string) => void;
  openEditModal: (appuntamento: AppuntamentoWithDetails) => void;
  openEditModalById: (appuntamentoId: string) => Promise<void>;
  closeModal: () => void;

  clearError: () => void;
}

export const useAgendaStore = create<AgendaState>((set, get) => ({
  operatrici: [],
  appuntamenti: [],
  selectedDate: new Date(),
  selectedOperatriciIds: [], // Inizialmente vuoto = mostra tutte
  viewMode: 'day',
  isLoading: false,
  error: null,

  isModalOpen: false,
  selectedAppuntamento: null,
  modalMode: null,
  modalInitialTime: null,

  loadOperatrici: async () => {
    try {
      // Carica anche operatrici inattive per mostrare i loro appuntamenti esistenti
      const operatrici = await invoke<Operatrice[]>('get_operatrici', {
        includeInactive: true,
      });
      set({ operatrici });
    } catch (error: any) {
      const errorMessage = error?.message || 'Errore nel caricamento degli operatori';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  loadAppuntamenti: async (dataInizio: Date, dataFine: Date) => {
    set({ isLoading: true, error: null });
    try {
      const appuntamenti = await invoke<AppuntamentoWithDetails[]>('get_appuntamenti_by_date_range', {
        dataInizio: dataInizio.toISOString(),
        dataFine: dataFine.toISOString(),
      });
      set({ appuntamenti, isLoading: false });
    } catch (error: any) {
      const errorMessage = error?.message || 'Errore nel caricamento degli appuntamenti';
      set({ error: errorMessage, isLoading: false });
    }
  },

  aggiornaStatiAutomatici: async () => {
    try {
      const [iniziati, completati] = await invoke<[number, number]>('aggiorna_stati_automatici');
      if (iniziati > 0 || completati > 0) {
        console.log(`Stati aggiornati: ${iniziati} iniziati, ${completati} completati`);
        // Ricarica appuntamenti per mostrare i cambiamenti, rispettando la vista corrente
        const { selectedDate, viewMode, loadAppuntamenti } = get();

        if (viewMode === 'day') {
          const startOfDay = new Date(selectedDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);
          await loadAppuntamenti(startOfDay, endOfDay);
        } else {
          // Vista settimana/mese: carica l'intero mese
          const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          startOfMonth.setHours(0, 0, 0, 0);
          const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);
          await loadAppuntamenti(startOfMonth, endOfMonth);
        }
      }
    } catch (error: any) {
      console.error('Errore aggiornamento stati automatici:', error);
    }
  },

  createAppuntamento: async (input: CreateAppuntamentoInput) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('create_appuntamento', { input });

      // Ricarica gli appuntamenti dopo la creazione, rispettando la vista corrente
      const { selectedDate, viewMode, loadAppuntamenti } = get();

      if (viewMode === 'day') {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        await loadAppuntamenti(startOfDay, endOfDay);
      } else {
        // Vista settimana/mese: carica l'intero mese
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        await loadAppuntamenti(startOfMonth, endOfMonth);
      }

      set({ isLoading: false, isModalOpen: false, modalMode: null, modalInitialTime: null });
    } catch (error: any) {
      const errorMessage = error?.message || 'Errore nella creazione dell\'appuntamento';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  updateAppuntamento: async (id: string, input: UpdateAppuntamentoInput) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('update_appuntamento', { id, input });

      // Ricarica gli appuntamenti dopo l'aggiornamento, rispettando la vista corrente
      const { selectedDate, viewMode, loadAppuntamenti } = get();

      if (viewMode === 'day') {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        await loadAppuntamenti(startOfDay, endOfDay);
      } else {
        // Vista settimana/mese: carica l'intero mese
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        await loadAppuntamenti(startOfMonth, endOfMonth);
      }

      set({
        isLoading: false,
        isModalOpen: false,
        selectedAppuntamento: null,
        modalMode: null
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Errore nell\'aggiornamento dell\'appuntamento';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  deleteAppuntamento: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('delete_appuntamento', { id });

      // Ricarica gli appuntamenti dopo l'eliminazione, rispettando la vista corrente
      const { selectedDate, viewMode, loadAppuntamenti } = get();

      if (viewMode === 'day') {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        await loadAppuntamenti(startOfDay, endOfDay);
      } else {
        // Vista settimana/mese: carica l'intero mese
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        await loadAppuntamenti(startOfMonth, endOfMonth);
      }

      set({
        isLoading: false,
        isModalOpen: false,
        selectedAppuntamento: null,
        modalMode: null
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Errore nell\'eliminazione dell\'appuntamento';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
    // Il caricamento degli appuntamenti è gestito dall'useEffect in Agenda.tsx
    // che risponde ai cambiamenti di selectedDate e viewMode
  },

  setSelectedOperatrici: (ids: string[]) => {
    set({ selectedOperatriciIds: ids });
  },

  setViewMode: (mode: 'day' | 'week' | 'month') => {
    set({ viewMode: mode });
  },

  openCreateModal: (start: Date, operatriceId: string) => {
    set({
      isModalOpen: true,
      modalMode: 'create',
      modalInitialTime: { start, operatriceId },
      selectedAppuntamento: null,
    });
  },

  openEditModal: (appuntamento: AppuntamentoWithDetails) => {
    set({
      isModalOpen: true,
      modalMode: 'edit',
      selectedAppuntamento: appuntamento,
      modalInitialTime: null,
    });
  },

  openEditModalById: async (appuntamentoId: string) => {
    try {
      const appuntamento = await invoke<AppuntamentoWithDetails>('get_appuntamento_by_id', {
        id: appuntamentoId,
      });

      // Naviga al giorno dell'appuntamento
      const appDate = new Date(appuntamento.data_ora_inizio);
      set({
        selectedDate: appDate,
        viewMode: 'day',
        isModalOpen: true,
        modalMode: 'edit',
        selectedAppuntamento: appuntamento,
        modalInitialTime: null,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Errore nel caricamento dell\'appuntamento';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  closeModal: () => {
    set({
      isModalOpen: false,
      modalMode: null,
      selectedAppuntamento: null,
      modalInitialTime: null,
    });
  },

  clearError: () => set({ error: null }),
}));
