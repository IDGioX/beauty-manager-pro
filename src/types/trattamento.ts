export interface CategoriaTrattamento {
  id: string;
  codice: string;
  nome: string;
  descrizione: string | null;
  colore: string | null;
  icona: string | null;
  ordine: number;
  attiva: boolean;
  created_at: string;
}

export interface Trattamento {
  id: string;
  codice: string;
  categoria_id: string | null;
  nome: string;
  descrizione: string | null;
  descrizione_breve: string | null;
  durata_minuti: number;
  tempo_preparazione_minuti: number;
  tempo_pausa_dopo_minuti: number;
  prezzo_listino: number | null;
  richiede_cabina: boolean;
  cabine_compatibili: string | null;
  attrezzature_richieste: string | null;
  prodotti_standard: string | null;
  controindicazioni: string | null;
  note_operative: string | null;
  attivo: boolean;
  visibile_booking_online: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  categoria_nome?: string;
}

export interface CreateTrattamentoInput {
  categoria_id: string;
  nome: string;
  descrizione?: string;
  durata_minuti: number;
  prezzo_listino?: number;
  attivo?: boolean;
  note_operative?: string;
}

export interface UpdateTrattamentoInput {
  categoria_id?: string;
  nome?: string;
  descrizione?: string;
  durata_minuti?: number;
  prezzo_listino?: number;
  attivo?: boolean;
  note_operative?: string;
}

export interface CreateCategoriaTrattamentoInput {
  nome: string;
  descrizione?: string;
  colore?: string;
  icona?: string;
  ordine?: number;
  attiva?: boolean;
}

export interface UpdateCategoriaTrattamentoInput {
  nome?: string;
  descrizione?: string;
  colore?: string;
  icona?: string;
  ordine?: number;
  attiva?: boolean;
}
