// Modello per trattamento
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CategoriaTrattamento {
    pub id: String,
    pub codice: String,
    pub nome: String,
    pub descrizione: Option<String>,
    pub colore: Option<String>,
    pub icona: Option<String>,
    pub ordine: i64,
    pub attiva: bool,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Trattamento {
    pub id: String,
    pub codice: String,
    pub categoria_id: Option<String>,
    pub nome: String,
    pub descrizione: Option<String>,
    pub descrizione_breve: Option<String>,
    pub durata_minuti: i64,
    pub tempo_preparazione_minuti: i64,
    pub tempo_pausa_dopo_minuti: i64,
    pub prezzo_listino: Option<f64>,
    pub richiede_cabina: bool,
    pub cabine_compatibili: Option<String>, // JSON array
    pub attrezzature_richieste: Option<String>, // JSON array
    pub prodotti_standard: Option<String>, // JSON
    pub controindicazioni: Option<String>,
    pub note_operative: Option<String>,
    pub attivo: bool,
    pub visibile_booking_online: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TrattamentoWithCategoria {
    pub id: String,
    pub codice: String,
    pub categoria_id: Option<String>,
    pub nome: String,
    pub descrizione: Option<String>,
    pub descrizione_breve: Option<String>,
    pub durata_minuti: i64,
    pub tempo_preparazione_minuti: i64,
    pub tempo_pausa_dopo_minuti: i64,
    pub prezzo_listino: Option<f64>,
    pub richiede_cabina: bool,
    pub cabine_compatibili: Option<String>,
    pub attrezzature_richieste: Option<String>,
    pub prodotti_standard: Option<String>,
    pub controindicazioni: Option<String>,
    pub note_operative: Option<String>,
    pub attivo: bool,
    pub visibile_booking_online: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub categoria_nome: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTrattamentoInput {
    pub categoria_id: String,
    pub nome: String,
    pub descrizione: Option<String>,
    pub durata_minuti: i64,
    pub prezzo_listino: Option<f64>,
    pub attivo: Option<bool>,
    pub note_operative: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTrattamentoInput {
    pub categoria_id: Option<String>,
    pub nome: Option<String>,
    pub descrizione: Option<String>,
    pub durata_minuti: Option<i64>,
    pub prezzo_listino: Option<f64>,
    pub attivo: Option<bool>,
    pub note_operative: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategoriaTrattamentoInput {
    pub nome: String,
    pub descrizione: Option<String>,
    pub colore: Option<String>,
    pub icona: Option<String>,
    pub ordine: Option<i64>,
    pub attiva: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCategoriaTrattamentoInput {
    pub nome: Option<String>,
    pub descrizione: Option<String>,
    pub colore: Option<String>,
    pub icona: Option<String>,
    pub ordine: Option<i64>,
    pub attiva: Option<bool>,
}
