// Service for business insights and intelligence

import { invoke } from '@tauri-apps/api/core';

// ============================================
// TYPES
// ============================================

export interface ClienteSegmentato {
  cliente_id: string;
  nome: string;
  cognome: string;
  cellulare: string | null;
  totale_appuntamenti: number;
  spesa_totale: number;
  ultimo_appuntamento: string | null;
  giorni_assenza: number | null;
  primo_appuntamento: string | null;
}

export interface SegmentazioneClienti {
  vip: ClienteSegmentato[];
  abituali: ClienteSegmentato[];
  a_rischio: ClienteSegmentato[];
  persi: ClienteSegmentato[];
  nuovi: ClienteSegmentato[];
  totale_clienti_attivi: number;
  tasso_ritorno: number;
}

export interface OccupazioneSlot {
  giorno_settimana: number;
  fascia_oraria: string;
  totale_appuntamenti: number;
}

export interface MargineTrattamento {
  trattamento_id: string;
  trattamento_nome: string;
  categoria_nome: string | null;
  ricavo_totale: number;
  costo_prodotti: number;
  margine: number;
  totale_appuntamenti: number;
  margine_percentuale: number;
}

export interface ConfrontoPeriodo {
  mese: string;
  ricavo: number;
  appuntamenti: number;
  clienti_unici: number;
  ticket_medio: number;
}

export interface InsightMessage {
  tipo: 'clienti' | 'revenue' | 'operativita' | 'magazzino';
  priorita: 'alta' | 'media' | 'bassa';
  titolo: string;
  messaggio: string;
  valore: string | null;
  azione: string | null;
}

export interface ScortaPrevisione {
  prodotto_id: string;
  prodotto_nome: string;
  giacenza: number;
  consumo_medio_giorno: number;
  giorni_rimanenti: number | null;
}

export interface InsightsData {
  messaggi: InsightMessage[];
  segmentazione: SegmentazioneClienti;
  occupazione: OccupazioneSlot[];
  margini_trattamenti: MargineTrattamento[];
  confronto_mesi: ConfrontoPeriodo[];
  previsione_fatturato: number;
  giorni_esaurimento_scorte: ScortaPrevisione[];
}

// ============================================
// SERVICE
// ============================================

export const insightsService = {
  async getInsightsData(): Promise<InsightsData> {
    return invoke('get_insights_data');
  },
};
