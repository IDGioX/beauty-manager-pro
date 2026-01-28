import { invoke } from '@tauri-apps/api/core';
import { AppuntamentoWithDetails } from '../types/agenda';

export interface DashboardStats {
  appuntamenti_oggi: number;
  clienti_attivi: number;
}

export interface ClienteRischio {
  id: string;
  nome: string;
  cognome: string;
  giorni_ultimo_appuntamento: number;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    return await invoke('get_dashboard_stats');
  },

  async getProssimiAppuntamenti(limit?: number): Promise<AppuntamentoWithDetails[]> {
    return await invoke('get_prossimi_appuntamenti', { limit });
  },

  async getClientiRischioChurn(giorniSoglia?: number, limit?: number): Promise<ClienteRischio[]> {
    return await invoke('get_clienti_rischio_churn', { giorniSoglia, limit });
  },
};
