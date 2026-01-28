import { invoke } from '@tauri-apps/api/core';

export interface Azienda {
  id: string;
  nome_centro: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  piva?: string;
  orario_apertura: string;
  orario_chiusura: string;
  slot_durata_minuti: number;
  giorni_lavorativi: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface UpdateAziendaInput {
  nome_centro: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  piva?: string;
  orario_apertura: string;
  orario_chiusura: string;
  slot_durata_minuti: number;
  giorni_lavorativi: string;
}

export const aziendaService = {
  async getAzienda(): Promise<Azienda> {
    return await invoke('get_azienda');
  },

  async updateAzienda(data: UpdateAziendaInput): Promise<Azienda> {
    return await invoke('update_azienda', { data });
  },
};
