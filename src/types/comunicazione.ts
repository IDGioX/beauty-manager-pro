// Types per il sistema di comunicazione

// ============================================================================
// TEMPLATE MESSAGGI
// ============================================================================

export interface TemplateMesaggio {
  id: string;
  codice: string;
  nome: string;
  tipo: 'reminder' | 'birthday' | 'marketing' | 'custom';
  canale: 'whatsapp' | 'email';
  oggetto: string | null;
  corpo: string;
  attivo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  codice: string;
  nome: string;
  tipo: string;
  canale: string;
  oggetto?: string;
  corpo: string;
}

export interface UpdateTemplateInput {
  nome?: string;
  oggetto?: string;
  corpo?: string;
  attivo?: boolean;
}

// ============================================================================
// COMUNICAZIONE (Log messaggi)
// ============================================================================

export interface Comunicazione {
  id: string;
  cliente_id: string;
  appuntamento_id: string | null;
  template_id: string | null;
  tipo: string;
  canale: string;
  stato: 'in_coda' | 'inviato' | 'consegnato' | 'letto' | 'errore';
  destinatario: string;
  oggetto: string | null;
  messaggio: string;
  inviato_at: string | null;
  errore_messaggio: string | null;
  created_at: string;
}

export interface ComunicazioneWithCliente extends Comunicazione {
  cliente_nome: string;
  cliente_cognome: string;
}

// ============================================================================
// CONFIG SMTP
// ============================================================================

export interface ConfigSmtp {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string | null;
  encryption: 'tls' | 'ssl';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveSmtpConfigInput {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name?: string;
  encryption: string;
  enabled: boolean;
}

// ============================================================================
// CONFIG SCHEDULER
// ============================================================================

export interface ConfigScheduler {
  id: string;
  reminder_enabled: boolean;
  reminder_hours_before: number;
  reminder_second_hours_before: number | null;
  reminder_default_channel: string;
  birthday_enabled: boolean;
  birthday_check_time: string;
  birthday_default_channel: string;
  birthday_template_id: string | null;
  last_reminder_check: string | null;
  last_birthday_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveSchedulerConfigInput {
  reminder_enabled: boolean;
  reminder_hours_before: number;
  reminder_second_hours_before?: number;
  reminder_default_channel: string;
  birthday_enabled: boolean;
  birthday_check_time: string;
  birthday_default_channel: string;
  birthday_template_id?: string;
}

// ============================================================================
// CAMPAGNE MARKETING
// ============================================================================

export interface CampagnaMarketing {
  id: string;
  nome: string;
  descrizione: string | null;
  target_filters: string | null;
  template_id: string | null;
  canale: string;
  messaggio_personalizzato: string | null;
  oggetto_email: string | null;
  tipo_invio: 'immediato' | 'programmato';
  data_invio_programmato: string | null;
  stato: 'bozza' | 'in_corso' | 'completata' | 'annullata';
  totale_destinatari: number;
  inviati: number;
  consegnati: number;
  aperti: number;
  errori: number;
  creato_da: string | null;
  avviata_at: string | null;
  completata_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCampagnaInput {
  nome: string;
  descrizione?: string;
  canale: string;
  template_id?: string;
  messaggio_personalizzato?: string;
  oggetto_email?: string;
  target_filters?: string;
  tipo_invio?: string;
  data_invio_programmato?: string;
}

export interface CampagnaDestinatario {
  id: string;
  campagna_id: string;
  cliente_id: string;
  comunicazione_id: string | null;
  stato: string;
  errore_messaggio: string | null;
  inviato_at: string | null;
  created_at: string;
}

// ============================================================================
// MESSAGE LINK
// ============================================================================

export interface MessageLink {
  link: string;
  canale: string;
  destinatario: string;
  messaggio: string;
}

// ============================================================================
// STATISTICHE
// ============================================================================

export interface ComunicazioniStats {
  totale: number;
  inviati: number;
  consegnati: number;
  errori: number;
  oggi: number;
  questa_settimana: number;
  per_tipo: TipoCount[];
  per_canale: CanaleCount[];
}

export interface TipoCount {
  tipo: string;
  count: number;
}

export interface CanaleCount {
  canale: string;
  count: number;
}

// ============================================================================
// FILTRI
// ============================================================================

export interface FiltriComunicazioni {
  cliente_id?: string;
  tipo?: string;
  canale?: string;
  stato?: string;
  data_da?: string;
  data_a?: string;
}

export interface TargetFilters {
  con_consenso_marketing?: boolean;
  con_appuntamenti_recenti?: boolean;
  giorni_ultima_visita_min?: number;
  giorni_ultima_visita_max?: number;
  trattamenti_ids?: string[];
  categorie_trattamenti_ids?: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

export const CANALI = [
  { value: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { value: 'email', label: 'Email', icon: 'Mail' },
] as const;

export const TIPI_TEMPLATE = [
  { value: 'reminder', label: 'Promemoria Appuntamento' },
  { value: 'birthday', label: 'Auguri Compleanno' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'custom', label: 'Personalizzato' },
] as const;

export const STATI_COMUNICAZIONE = [
  { value: 'pending', label: 'In attesa', color: 'yellow' },
  { value: 'inviato', label: 'Inviato', color: 'blue' },
  { value: 'consegnato', label: 'Consegnato', color: 'green' },
  { value: 'errore', label: 'Errore', color: 'red' },
] as const;

export const STATI_CAMPAGNA = [
  { value: 'bozza', label: 'Bozza', color: 'gray' },
  { value: 'in_corso', label: 'In corso', color: 'blue' },
  { value: 'completata', label: 'Completata', color: 'green' },
  { value: 'annullata', label: 'Annullata', color: 'red' },
] as const;

// Placeholder disponibili nei template
export const TEMPLATE_PLACEHOLDERS = [
  { placeholder: '{nome}', descrizione: 'Nome del cliente' },
  { placeholder: '{cognome}', descrizione: 'Cognome del cliente' },
  { placeholder: '{data_appuntamento}', descrizione: 'Data appuntamento (dd/mm/yyyy)' },
  { placeholder: '{ora_appuntamento}', descrizione: 'Ora appuntamento (HH:MM)' },
  { placeholder: '{trattamento}', descrizione: 'Nome del trattamento' },
  { placeholder: '{nome_centro}', descrizione: 'Nome del centro estetico' },
] as const;
