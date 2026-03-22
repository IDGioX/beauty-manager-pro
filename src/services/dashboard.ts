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

// ============================================
// DASHBOARD COMPLETO - Types
// ============================================

export interface AppuntamentiOggiStats {
  totale: number;
  confermati: number;
  in_attesa: number;
  in_corso: number;
  completati: number;
  no_show: number;
  in_ritardo: number;
}

export interface ProssimoAppuntamento {
  id: string;
  cliente_nome: string;
  cliente_cognome: string;
  trattamento_nome: string;
  operatrice_nome: string;
  data_ora_inizio: string;
  minuti_mancanti: number;
}

export interface CompleannoInfo {
  id: string;
  nome: string;
  cognome: string;
}

export interface TrattamentoTopOggi {
  nome: string;
  count: number;
  ricavo: number;
}

export interface DashboardCompleto {
  // RIGA 1 - OGGI
  appuntamenti_oggi: AppuntamentiOggiStats;
  prossimo_appuntamento: ProssimoAppuntamento | null;
  slot_liberi_oggi: number;

  // AZIONI
  compleanni_oggi: CompleannoInfo[];
  clienti_churn_count: number;
  no_show_recenti: number;

  // SOLDI
  fatturato_oggi: number;
  fatturato_ieri: number;
  fatturato_stesso_giorno_settimana_scorsa: number;
  scontrino_medio_oggi: number;
  scontrino_medio_mese: number;
  fatturato_mese: number;
  trattamenti_top_oggi: TrattamentoTopOggi[];
  vendita_prodotti_oggi: number;

  // CLIENTI
  nuovi_clienti_mese: number;
  clienti_attivi_mese: number;
  clienti_persi: number;
  tasso_ritorno: number;

  // ALERT
  alert_prodotti_sotto_scorta: number;
  alert_prodotti_in_scadenza: number;

  // SATURAZIONE
  saturazione_oggi_percentuale: number;
  saturazione_settimana_percentuale: number;

  // PROSSIMI APPUNTAMENTI
  prossimi_appuntamenti: AppuntamentoWithDetails[];
}

// ============================================
// DASHBOARD CHARTS - Types
// ============================================

export interface FatturatoGiorno {
  data: string;
  giorno: string;
  importo: number;
}

export interface AppuntamentiGiorno {
  data: string;
  giorno: string;
  totale: number;
  completati: number;
  no_show: number;
}

export interface DashboardChartData {
  fatturato_giornaliero: FatturatoGiorno[];
  appuntamenti_giornalieri: AppuntamentiGiorno[];
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

  async getDashboardCompleto(): Promise<DashboardCompleto> {
    return await invoke('get_dashboard_completo');
  },

  async getChartData(): Promise<DashboardChartData> {
    return await invoke('get_dashboard_chart_data');
  },
};
