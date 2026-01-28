export interface Cliente {
  id: string;
  codice: string | null;
  nome: string;
  cognome: string;
  sesso: 'M' | 'F' | 'A' | null;
  data_nascita: string | null;
  codice_fiscale: string | null;
  telefono: string | null;
  cellulare: string | null;
  email: string | null;
  indirizzo: string | null;
  citta: string | null;
  cap: string | null;
  provincia: string | null;
  consenso_marketing: boolean;
  consenso_whatsapp: boolean;
  consenso_email: boolean;
  canale_preferito: 'whatsapp' | 'email' | 'telefono' | null;
  tipo_pelle: string | null;
  allergie: string | null;
  patologie: string | null;
  note_estetiche: string | null;
  fonte_acquisizione: string | null;
  operatrice_riferimento_id: string | null;
  data_consenso_privacy: string | null;
  data_ultimo_aggiornamento_privacy: string | null;
  attivo: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClienteInput {
  nome: string;
  cognome: string;
  sesso?: 'M' | 'F' | 'A';
  data_nascita?: string;
  cellulare?: string;
  email?: string;
  indirizzo?: string;
  note?: string;
  consenso_marketing: boolean;
  consenso_whatsapp: boolean;
  consenso_email: boolean;
  canale_preferito?: 'whatsapp' | 'email' | 'telefono';
}

export interface UpdateClienteInput {
  nome?: string;
  cognome?: string;
  data_nascita?: string;
  cellulare?: string;
  email?: string;
  indirizzo?: string;
  citta?: string;
  note?: string;
  consenso_marketing?: boolean;
  consenso_whatsapp?: boolean;
  consenso_email?: boolean;
}
