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

export interface OrarioCentro {
  id: string;
  giorno: number; // 0=Lun, 6=Dom
  attivo: boolean;
  mattina_inizio: string | null;
  mattina_fine: string | null;
  pomeriggio_inizio: string | null;
  pomeriggio_fine: string | null;
}

export interface UpdateOrarioCentroInput {
  giorno: number;
  attivo: boolean;
  mattina_inizio: string | null;
  mattina_fine: string | null;
  pomeriggio_inizio: string | null;
  pomeriggio_fine: string | null;
}

export const GIORNI_SETTIMANA = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export const aziendaService = {
  async getAzienda(): Promise<Azienda> {
    return await invoke('get_azienda');
  },

  async updateAzienda(data: UpdateAziendaInput): Promise<Azienda> {
    return await invoke('update_azienda', { data });
  },

  async getOrariCentro(): Promise<OrarioCentro[]> {
    return await invoke('get_orari_centro');
  },

  async updateOrariCentro(orari: UpdateOrarioCentroInput[]): Promise<OrarioCentro[]> {
    return await invoke('update_orari_centro', { orari });
  },
};
