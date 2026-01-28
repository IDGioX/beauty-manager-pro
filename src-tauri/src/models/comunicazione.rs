// Modelli per il sistema di comunicazione
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ============================================================================
// TEMPLATE MESSAGGI
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct TemplateMesaggio {
    pub id: String,
    pub codice: String,
    pub nome: String,
    pub tipo: String,
    pub canale: String,
    pub oggetto: Option<String>,
    pub corpo: String,
    pub attivo: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTemplateInput {
    pub codice: String,
    pub nome: String,
    pub tipo: String,
    pub canale: String,
    pub oggetto: Option<String>,
    pub corpo: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTemplateInput {
    pub nome: Option<String>,
    pub oggetto: Option<String>,
    pub corpo: Option<String>,
    pub attivo: Option<bool>,
}

// ============================================================================
// COMUNICAZIONE (Log messaggi inviati)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Comunicazione {
    pub id: String,
    pub cliente_id: String,
    pub appuntamento_id: Option<String>,
    pub campagna_id: Option<String>,
    pub template_id: Option<String>,
    pub tipo: String,
    pub canale: String,
    pub stato: String,
    pub destinatario: String,
    pub oggetto: Option<String>,
    pub messaggio: String,
    pub inviato_at: Option<DateTime<Utc>>,
    pub consegnato_at: Option<DateTime<Utc>>,
    pub letto_at: Option<DateTime<Utc>>,
    pub errore_messaggio: Option<String>,
    pub provider_id: Option<String>,
    pub provider_response: Option<String>,
    pub costo: Option<f64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ComunicazioneWithCliente {
    pub id: String,
    pub cliente_id: String,
    pub cliente_nome: String,
    pub cliente_cognome: String,
    pub appuntamento_id: Option<String>,
    pub template_id: Option<String>,
    pub tipo: String,
    pub canale: String,
    pub stato: String,
    pub destinatario: String,
    pub oggetto: Option<String>,
    pub messaggio: String,
    pub inviato_at: Option<DateTime<Utc>>,
    pub errore_messaggio: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ============================================================================
// CONFIG SMTP
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ConfigSmtp {
    pub id: String,
    pub host: String,
    pub port: i32,
    pub username: String,
    pub password: String,
    pub from_email: String,
    pub from_name: Option<String>,
    pub encryption: String,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveSmtpConfigInput {
    pub host: String,
    pub port: i32,
    pub username: String,
    pub password: String,
    pub from_email: String,
    pub from_name: Option<String>,
    pub encryption: String,
    pub enabled: bool,
}

// ============================================================================
// CONFIG SCHEDULER
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ConfigScheduler {
    pub id: String,
    pub reminder_enabled: bool,
    pub reminder_hours_before: i32,
    pub reminder_second_hours_before: Option<i32>,
    pub reminder_default_channel: String,
    pub birthday_enabled: bool,
    pub birthday_check_time: String,
    pub birthday_default_channel: String,
    pub birthday_template_id: Option<String>,
    pub last_reminder_check: Option<DateTime<Utc>>,
    pub last_birthday_check: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveSchedulerConfigInput {
    pub reminder_enabled: bool,
    pub reminder_hours_before: i32,
    pub reminder_second_hours_before: Option<i32>,
    pub reminder_default_channel: String,
    pub birthday_enabled: bool,
    pub birthday_check_time: String,
    pub birthday_default_channel: String,
    pub birthday_template_id: Option<String>,
}

// ============================================================================
// CAMPAGNE MARKETING
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CampagnaMarketing {
    pub id: String,
    pub nome: String,
    pub descrizione: Option<String>,
    pub target_filters: Option<String>,
    pub template_id: Option<String>,
    pub canale: String,
    pub messaggio_personalizzato: Option<String>,
    pub oggetto_email: Option<String>,
    pub tipo_invio: String,
    pub data_invio_programmato: Option<DateTime<Utc>>,
    pub stato: String,
    pub totale_destinatari: i32,
    pub inviati: i32,
    pub consegnati: i32,
    pub aperti: i32,
    pub errori: i32,
    pub creato_da: Option<String>,
    pub avviata_at: Option<DateTime<Utc>>,
    pub completata_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCampagnaInput {
    pub nome: String,
    pub descrizione: Option<String>,
    pub canale: String,
    pub template_id: Option<String>,
    pub messaggio_personalizzato: Option<String>,
    pub oggetto_email: Option<String>,
    pub target_filters: Option<String>,
    pub tipo_invio: Option<String>,
    pub data_invio_programmato: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CampagnaDestinatario {
    pub id: String,
    pub campagna_id: String,
    pub cliente_id: String,
    pub comunicazione_id: Option<String>,
    pub stato: String,
    pub errore_messaggio: Option<String>,
    pub inviato_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

// ============================================================================
// MESSAGE LINK (Output per generatori link)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageLink {
    pub link: String,
    pub canale: String,
    pub destinatario: String,
    pub messaggio: String,
}

// ============================================================================
// STATISTICHE
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComunicazioniStats {
    pub totale: i32,
    pub inviati: i32,
    pub consegnati: i32,
    pub errori: i32,
    pub oggi: i32,
    pub questa_settimana: i32,
    pub per_tipo: Vec<TipoCount>,
    pub per_canale: Vec<CanaleCount>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct TipoCount {
    pub tipo: String,
    pub count: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct CanaleCount {
    pub canale: String,
    pub count: i32,
}

// ============================================================================
// FILTRI
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FiltriComunicazioni {
    pub cliente_id: Option<String>,
    pub tipo: Option<String>,
    pub canale: Option<String>,
    pub stato: Option<String>,
    pub data_da: Option<String>,
    pub data_a: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TargetFilters {
    pub con_consenso_marketing: Option<bool>,
    pub con_appuntamenti_recenti: Option<bool>,
    pub giorni_ultima_visita_min: Option<i32>,
    pub giorni_ultima_visita_max: Option<i32>,
    pub trattamenti_ids: Option<Vec<String>>,
    pub categorie_trattamenti_ids: Option<Vec<String>>,
}
