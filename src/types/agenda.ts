// Tipi per il sistema di gestione agenda

export interface Operatrice {
  id: string;
  codice: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  email: string | null;
  colore_agenda: string;
  specializzazioni: string | null;
  attiva: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appuntamento {
  id: string;
  cliente_id: string;
  operatrice_id: string;
  cabina_id: string | null;
  trattamento_id: string;
  data_ora_inizio: string;
  data_ora_fine: string;
  stato: 'prenotato' | 'in_corso' | 'completato' | 'annullato' | 'no_show';
  durata_effettiva_minuti: number | null;
  note_prenotazione: string | null;
  note_trattamento: string | null;
  prezzo_applicato: number | null;
  omaggio: boolean;
  prenotato_da: string;
  created_at: string;
  updated_at: string;
}

export interface AppuntamentoWithDetails {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_cognome: string;
  cliente_cellulare: string | null;
  cliente_telefono?: string | null;
  cliente_email?: string | null;
  cliente_consenso_whatsapp?: boolean;
  cliente_consenso_email?: boolean;
  cliente_canale_preferito?: string | null;
  operatrice_id: string;
  operatrice_nome: string;
  operatrice_cognome: string;
  operatrice_colore: string;
  trattamento_id: string;
  trattamento_nome: string;
  trattamento_durata: number;
  trattamento_colore?: string | null;
  categoria_nome?: string | null;
  data_ora_inizio: string;
  data_ora_fine: string;
  stato: 'prenotato' | 'in_corso' | 'completato' | 'annullato' | 'no_show';
  note_prenotazione: string | null;
  note_trattamento: string | null;
  note?: string | null;
  prezzo_applicato: number | null;
  omaggio: boolean;
  prezzo_finale?: number | null;
  reminder_inviato?: boolean;
  reminder_inviato_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAppuntamentoInput {
  cliente_id: string;
  operatrice_id: string;
  cabina_id?: string;
  trattamento_id: string;
  data_ora_inizio: string;
  data_ora_fine: string;
  stato?: 'prenotato' | 'in_corso' | 'completato' | 'annullato' | 'no_show';
  note_prenotazione?: string;
  prezzo_applicato?: number;
  omaggio?: boolean;
}

export interface UpdateAppuntamentoInput {
  cliente_id?: string;
  operatrice_id?: string;
  cabina_id?: string;
  trattamento_id?: string;
  data_ora_inizio?: string;
  data_ora_fine?: string;
  stato?: 'prenotato' | 'in_corso' | 'completato' | 'annullato' | 'no_show';
  durata_effettiva_minuti?: number;
  note_prenotazione?: string;
  note_trattamento?: string;
  prezzo_applicato?: number;
  omaggio?: boolean;
}
