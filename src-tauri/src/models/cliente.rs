use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, NaiveDate, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Cliente {
    pub id: String,
    pub codice: Option<String>,

    // Dati anagrafici
    pub nome: String,
    pub cognome: String,
    pub sesso: Option<String>,
    pub data_nascita: Option<NaiveDate>,
    pub codice_fiscale: Option<String>,

    // Contatti
    pub telefono: Option<String>,
    pub cellulare: Option<String>,
    pub email: Option<String>,

    // Indirizzo
    pub indirizzo: Option<String>,
    pub citta: Option<String>,
    pub cap: Option<String>,
    pub provincia: Option<String>,

    // Preferenze comunicazione
    pub consenso_marketing: bool,
    pub consenso_sms: bool,
    pub consenso_whatsapp: bool,
    pub consenso_email: bool,
    pub canale_preferito: Option<String>,

    // Info estetiche
    pub tipo_pelle: Option<String>,
    pub allergie: Option<String>,
    pub patologie: Option<String>,
    pub note_estetiche: Option<String>,

    // Metadata
    pub fonte_acquisizione: Option<String>,
    pub operatrice_riferimento_id: Option<String>,

    // Privacy
    pub data_consenso_privacy: Option<DateTime<Utc>>,
    pub data_ultimo_aggiornamento_privacy: Option<DateTime<Utc>>,

    // Stato
    pub attivo: bool,
    pub note: Option<String>,

    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateClienteInput {
    pub nome: String,
    pub cognome: String,
    pub sesso: Option<String>,
    pub data_nascita: Option<NaiveDate>,
    pub cellulare: Option<String>,
    pub email: Option<String>,
    pub note: Option<String>,
    pub consenso_marketing: bool,
    pub consenso_sms: bool,
    pub consenso_whatsapp: bool,
    pub consenso_email: bool,
    pub canale_preferito: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateClienteInput {
    pub nome: Option<String>,
    pub cognome: Option<String>,
    pub data_nascita: Option<NaiveDate>,
    pub cellulare: Option<String>,
    pub email: Option<String>,
    pub indirizzo: Option<String>,
    pub citta: Option<String>,
    pub note: Option<String>,
}
