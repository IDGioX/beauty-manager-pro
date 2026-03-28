import { invoke } from '@tauri-apps/api/core';

// ============================================
// TYPES
// ============================================

export interface TrattamentoIncluso {
  id: string;
  trattamento_id: string;
  trattamento_nome: string;
  ordine: number;
  note: string | null;
}

export interface PacchettoConTrattamenti {
  id: string;
  nome: string;
  descrizione: string | null;
  prezzo_totale: number;
  num_sedute: number;
  tipo_pagamento: 'anticipo' | 'dilazionato' | 'per_seduta';
  attivo: number;
  created_at: string | null;
  updated_at: string | null;
  trattamenti_inclusi: TrattamentoIncluso[];
}

export interface PacchettoCliente {
  id: string;
  pacchetto_id: string;
  cliente_id: string;
  data_inizio: string | null;
  data_fine: string | null;
  sedute_totali: number;
  sedute_completate: number;
  importo_totale: number;
  importo_pagato: number;
  stato: 'attivo' | 'completato' | 'sospeso' | 'annullato';
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  pacchetto_nome: string;
  tipo_pagamento: 'anticipo' | 'dilazionato' | 'per_seduta';
  percentuale_completamento: number;
  importo_rimanente: number;
}

export interface PacchettoSeduta {
  id: string;
  pacchetto_cliente_id: string;
  appuntamento_id: string | null;
  numero_seduta: number;
  stato: 'pianificata' | 'completata' | 'saltata';
  note: string | null;
  created_at: string | null;
  appuntamento_data: string | null;
  appuntamento_stato: string | null;
  importo_pagato: number;
  data_prevista: string | null;
}

export interface SedutaConPacchetto {
  seduta_id: string;
  pacchetto_cliente_id: string;
  pacchetto_nome: string;
  numero_seduta: number;
  sedute_totali: number;
  sedute_completate: number;
  importo_totale: number;
  importo_pagato: number;
  stato_seduta: string;
  stato_pacchetto: string;
}

export interface PacchettoPagamento {
  id: string;
  pacchetto_cliente_id: string;
  importo: number;
  tipo: 'anticipo' | 'pagamento' | 'saldo';
  note: string | null;
  created_at: string;
}

export interface DashboardPacchetti {
  pacchetti_attivi: number;
  tasso_completamento: number;
  ricavo_pacchetti: number;
  ricavo_incassato: number;
}

export interface TrattamentoInclusoInput {
  trattamento_id: string;
  ordine?: number;
  note?: string;
}

export interface CreatePacchettoInput {
  nome: string;
  descrizione?: string;
  prezzo_totale: number;
  num_sedute: number;
  tipo_pagamento?: string;
  attivo?: boolean;
  trattamenti: TrattamentoInclusoInput[];
}

export interface UpdatePacchettoInput {
  nome?: string;
  descrizione?: string;
  prezzo_totale?: number;
  num_sedute?: number;
  tipo_pagamento?: string;
  attivo?: boolean;
  trattamenti?: TrattamentoInclusoInput[];
}

export interface AssegnaPacchettoInput {
  pacchetto_id: string;
  cliente_id: string;
  data_inizio?: string;
  data_fine?: string;
  importo_totale?: number;
  tipo_pagamento?: string;
  note?: string;
}

// ============================================
// SERVICE
// ============================================

export const pacchettiService = {
  async getPacchetti(attivoOnly?: boolean): Promise<PacchettoConTrattamenti[]> {
    return invoke('get_pacchetti', { attivoOnly: attivoOnly ?? true });
  },

  async getPacchettoById(id: string): Promise<PacchettoConTrattamenti> {
    return invoke('get_pacchetto_by_id', { id });
  },

  async createPacchetto(input: CreatePacchettoInput): Promise<PacchettoConTrattamenti> {
    return invoke('create_pacchetto', { input });
  },

  async updatePacchetto(id: string, input: UpdatePacchettoInput): Promise<PacchettoConTrattamenti> {
    return invoke('update_pacchetto', { id, input });
  },

  async deletePacchetto(id: string): Promise<void> {
    return invoke('delete_pacchetto', { id });
  },

  async getPacchettiCliente(clienteId: string, stato?: string): Promise<PacchettoCliente[]> {
    return invoke('get_pacchetti_cliente', { clienteId, stato: stato ?? null });
  },

  async assegnaPacchetto(input: AssegnaPacchettoInput): Promise<PacchettoCliente> {
    return invoke('assegna_pacchetto_cliente', { input });
  },

  async completaSedutaById(sedutaId: string, appuntamentoId?: string): Promise<void> {
    return invoke('completa_seduta_by_id', { sedutaId, appuntamentoId: appuntamentoId ?? null });
  },

  async registraPagamento(pacchettoClienteId: string, importo: number): Promise<void> {
    return invoke('registra_pagamento', { pacchettoClienteId, importo });
  },

  async updatePacchettoCliente(pacchettoClienteId: string, importoTotale?: number, note?: string, stato?: string): Promise<void> {
    return invoke('update_pacchetto_cliente', { input: { pacchetto_cliente_id: pacchettoClienteId, importo_totale: importoTotale ?? null, note: note ?? null, stato: stato ?? null } });
  },

  async eliminaPacchettoCliente(pacchettoClienteId: string): Promise<void> {
    return invoke('elimina_pacchetto_cliente', { pacchettoClienteId });
  },

  async annullaPacchettoCliente(pacchettoClienteId: string): Promise<void> {
    return invoke('annulla_pacchetto_cliente', { pacchettoClienteId });
  },

  async getSedutePacchetto(pacchettoClienteId: string): Promise<PacchettoSeduta[]> {
    return invoke('get_sedute_pacchetto', { pacchettoClienteId });
  },

  async getSedutaByAppuntamento(appuntamentoId: string): Promise<SedutaConPacchetto | null> {
    return invoke('get_seduta_by_appuntamento', { appuntamentoId });
  },

  async collegaSedutaAppuntamento(pacchettoClienteId: string, numeroSeduta: number, appuntamentoId: string): Promise<void> {
    return invoke('collega_seduta_appuntamento', { pacchettoClienteId, numeroSeduta, appuntamentoId });
  },

  async scollegaSedutaAppuntamento(appuntamentoId: string): Promise<void> {
    return invoke('scollega_seduta_appuntamento', { appuntamentoId });
  },

  async registraPagamentoSeduta(sedutaId: string, importo: number): Promise<void> {
    return invoke('registra_pagamento_seduta', { sedutaId, importo });
  },

  async aggiungiPagamentoPacchetto(pacchettoClienteId: string, importo: number, tipo?: string, note?: string): Promise<void> {
    return invoke('aggiungi_pagamento_pacchetto', { pacchettoClienteId, importo, tipo: tipo ?? null, note: note ?? null });
  },

  async getPagamentiPacchetto(pacchettoClienteId: string): Promise<PacchettoPagamento[]> {
    return invoke('get_pagamenti_pacchetto', { pacchettoClienteId });
  },

  async aggiornaDataPrevistaSeduta(sedutaId: string, dataPrevista: string | null): Promise<void> {
    return invoke('aggiorna_data_prevista_seduta', { sedutaId, dataPrevista });
  },

  async getDashboardPacchetti(): Promise<DashboardPacchetti> {
    return invoke('get_dashboard_pacchetti');
  },
};
