// Modello per operatrice
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Operatrice {
    pub id: String,
    pub codice: String,
    pub nome: String,
    pub cognome: String,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub colore_agenda: String,
    pub specializzazioni: Option<String>, // JSON array
    pub attiva: bool,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Input per creare una nuova operatrice
#[derive(Debug, Deserialize)]
pub struct CreateOperatriceInput {
    pub codice: String,
    pub nome: String,
    pub cognome: String,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub colore_agenda: Option<String>,
    pub specializzazioni: Option<String>,
}

// Input per aggiornare un'operatrice esistente
#[derive(Debug, Deserialize)]
pub struct UpdateOperatriceInput {
    pub codice: Option<String>,
    pub nome: Option<String>,
    pub cognome: Option<String>,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub colore_agenda: Option<String>,
    pub specializzazioni: Option<String>,
    pub attiva: Option<bool>,
    pub note: Option<String>,
}
