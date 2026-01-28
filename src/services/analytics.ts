// Service for analytics and reporting

import { invoke } from '@tauri-apps/api/core';

// ============================================
// INPUT TYPES
// ============================================

export interface DateRangeFilter {
  data_inizio: string; // ISO 8601 datetime
  data_fine: string;   // ISO 8601 datetime
}

// ============================================
// GENERAL REPORTS OUTPUT TYPES
// ============================================

export interface TrattamentoStats {
  trattamento_id: string;
  trattamento_nome: string;
  categoria_nome: string | null;
  totale_appuntamenti: number;
  ricavo_totale: number;
  ricavo_medio: number;
  durata_media_minuti: number;
}

export interface ClienteTopFrequenza {
  cliente_id: string;
  nome: string;
  cognome: string;
  email: string | null;
  cellulare: string | null;
  totale_appuntamenti: number;
  ricavo_totale: number;
  ultimo_appuntamento: string | null;
}

export interface ClienteTopRicavo {
  cliente_id: string;
  nome: string;
  cognome: string;
  email: string | null;
  cellulare: string | null;
  ricavo_totale: number;
  totale_appuntamenti: number;
  ricavo_medio: number;
}

export interface PeriodAnalytics {
  totale_appuntamenti: number;
  appuntamenti_completati: number;
  appuntamenti_annullati: number;
  tasso_completamento: number;
  ricavo_totale: number;
  ricavo_medio: number;
  clienti_unici: number;
  nuovi_clienti: number;
  media_appuntamenti_per_cliente: number;
  durata_media_minuti: number;
}

// ============================================
// CLIENT HISTORY OUTPUT TYPES
// ============================================

export interface ClienteSearchResult {
  id: string;
  nome: string;
  cognome: string;
  email: string | null;
  cellulare: string | null;
  ultimo_appuntamento: string | null;
  totale_appuntamenti: number;
}

export interface ClienteStatistiche {
  totale_appuntamenti: number;
  appuntamenti_completati: number;
  appuntamenti_annullati: number;
  appuntamenti_no_show: number;
  spesa_totale: number;
  spesa_media: number;
  primo_appuntamento: string | null;
  ultimo_appuntamento: string | null;
  giorni_da_ultimo_appuntamento: number | null;
}

export interface TrattamentoFrequenza {
  trattamento_nome: string;
  categoria_nome: string | null;
  count: number;
  spesa_totale: number;
}

export interface SpesaMensile {
  anno: number;
  mese: number;
  spesa: number;
  appuntamenti: number;
}

export interface ClienteCompleteProfile {
  cliente: any; // Use Cliente type from existing types
  statistiche: ClienteStatistiche;
  appuntamenti: any[]; // Use AppuntamentoWithDetails type
  trattamenti_frequenti: TrattamentoFrequenza[];
  spesa_per_mese: SpesaMensile[];
}

// ============================================
// SERVICE
// ============================================

export const analyticsService = {
  // ============================================
  // GENERAL REPORTS
  // ============================================

  /**
   * Get most used treatments with statistics
   */
  async getTrattamentiPiuUsati(
    filter: DateRangeFilter,
    limit?: number
  ): Promise<TrattamentoStats[]> {
    return await invoke('get_trattamenti_piu_usati', { filter, limit });
  },

  /**
   * Get top clients by visit frequency
   */
  async getClientiTopFrequenza(
    filter: DateRangeFilter,
    limit?: number
  ): Promise<ClienteTopFrequenza[]> {
    return await invoke('get_clienti_top_frequenza', { filter, limit });
  },

  /**
   * Get top clients by revenue
   */
  async getClientiTopRicavo(
    filter: DateRangeFilter,
    limit?: number
  ): Promise<ClienteTopRicavo[]> {
    return await invoke('get_clienti_top_ricavo', { filter, limit });
  },

  /**
   * Get period analytics summary (KPIs)
   */
  async getPeriodAnalytics(filter: DateRangeFilter): Promise<PeriodAnalytics> {
    return await invoke('get_period_analytics', { filter });
  },

  // ============================================
  // CLIENT HISTORY
  // ============================================

  /**
   * Search clients for analytics (min 2 characters)
   */
  async searchClientiAnalytics(
    search: string,
    limit?: number
  ): Promise<ClienteSearchResult[]> {
    return await invoke('search_clienti_analytics', { search, limit });
  },

  /**
   * Get complete client profile with all history and statistics
   */
  async getClienteCompleteProfile(
    clienteId: string,
    limitAppuntamenti?: number
  ): Promise<ClienteCompleteProfile> {
    return await invoke('get_cliente_complete_profile', {
      clienteId,
      limitAppuntamenti,
    });
  },
};
