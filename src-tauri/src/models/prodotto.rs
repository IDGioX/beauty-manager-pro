// Modello per prodotto
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, NaiveDate, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Prodotto {
    pub id: String,
    pub codice: String,
    pub barcode: Option<String>,
    pub categoria_id: Option<String>,
    pub nome: String,
    pub descrizione: Option<String>,
    pub marca: Option<String>,
    pub linea: Option<String>,
    pub unita_misura: String,
    pub capacita: Option<f64>,
    pub giacenza: f64,
    pub scorta_minima: f64,
    pub scorta_riordino: f64,
    pub prezzo_acquisto: Option<f64>,
    pub prezzo_vendita: Option<f64>,
    pub uso: Option<String>,
    pub attivo: bool,
    pub data_scadenza: Option<NaiveDate>,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
