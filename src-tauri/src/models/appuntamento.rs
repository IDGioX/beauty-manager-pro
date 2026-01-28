// Modello per appuntamento
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Appuntamento {
    pub id: String,
    pub cliente_id: String,
    pub operatrice_id: String,
    pub cabina_id: Option<String>,
    pub trattamento_id: String,
    pub data_ora_inizio: DateTime<Utc>,
    pub data_ora_fine: DateTime<Utc>,
    pub durata_effettiva_minuti: Option<i32>,
    pub stato: String,
    pub reminder_inviato: bool,
    pub reminder_inviato_at: Option<DateTime<Utc>>,
    pub conferma_ricevuta: bool,
    pub conferma_ricevuta_at: Option<DateTime<Utc>>,
    pub note_prenotazione: Option<String>,
    pub note_trattamento: Option<String>,
    pub ricorrenza_parent_id: Option<String>,
    pub ricorrenza_pattern: Option<String>,
    pub prenotato_da: String,
    pub prezzo_applicato: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Input per creare un nuovo appuntamento
#[derive(Debug, Deserialize)]
pub struct CreateAppuntamentoInput {
    pub cliente_id: String,
    pub operatrice_id: String,
    pub cabina_id: Option<String>,
    pub trattamento_id: String,
    pub data_ora_inizio: DateTime<Utc>,
    pub data_ora_fine: DateTime<Utc>,
    pub stato: Option<String>,
    pub note_prenotazione: Option<String>,
    pub prezzo_applicato: Option<f64>,
}

// Input per aggiornare un appuntamento esistente
#[derive(Debug, Deserialize)]
pub struct UpdateAppuntamentoInput {
    pub cliente_id: Option<String>,
    pub operatrice_id: Option<String>,
    pub cabina_id: Option<String>,
    pub trattamento_id: Option<String>,
    pub data_ora_inizio: Option<DateTime<Utc>>,
    pub data_ora_fine: Option<DateTime<Utc>>,
    pub stato: Option<String>,
    pub durata_effettiva_minuti: Option<i32>,
    pub note_prenotazione: Option<String>,
    pub note_trattamento: Option<String>,
    pub prezzo_applicato: Option<f64>,
}

// Appuntamento con dettagli completi (per la vista calendario)
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct AppuntamentoWithDetails {
    pub id: String,
    pub cliente_id: String,
    pub cliente_nome: String,
    pub cliente_cognome: String,
    pub cliente_cellulare: Option<String>,
    pub operatrice_id: String,
    pub operatrice_nome: String,
    pub operatrice_cognome: String,
    pub operatrice_colore: String,
    pub trattamento_id: String,
    pub trattamento_nome: String,
    pub trattamento_durata: i32,
    pub data_ora_inizio: DateTime<Utc>,
    pub data_ora_fine: DateTime<Utc>,
    pub stato: String,
    pub note_prenotazione: Option<String>,
    pub note_trattamento: Option<String>,
    pub prezzo_applicato: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
