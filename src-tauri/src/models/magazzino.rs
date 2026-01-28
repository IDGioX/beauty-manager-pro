// Modelli per il modulo Magazzino
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

// === CATEGORIE PRODOTTI ===

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CategoriaProdotto {
    pub id: String,
    pub codice: String,
    pub nome: String,
    pub tipo: Option<String>, // 'consumo' | 'rivendita' | 'entrambi'
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategoriaProdottoInput {
    pub nome: String,
    pub tipo: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCategoriaProdottoInput {
    pub nome: Option<String>,
    pub tipo: Option<String>,
}

// === PRODOTTI ===

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ProdottoWithCategoria {
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
    pub data_scadenza: Option<String>,  // String per gestire valori vuoti nel DB
    pub note: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    // Join fields
    pub categoria_nome: Option<String>,
    pub categoria_tipo: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProdottoInput {
    pub nome: String,
    pub categoria_id: Option<String>,
    pub barcode: Option<String>,
    pub descrizione: Option<String>,
    pub marca: Option<String>,
    pub linea: Option<String>,
    pub unita_misura: Option<String>,
    pub capacita: Option<f64>,
    pub giacenza: Option<f64>,
    pub scorta_minima: Option<f64>,
    pub scorta_riordino: Option<f64>,
    pub prezzo_acquisto: Option<f64>,
    pub prezzo_vendita: Option<f64>,
    pub uso: Option<String>,
    pub data_scadenza: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProdottoInput {
    pub nome: Option<String>,
    pub categoria_id: Option<String>,
    pub barcode: Option<String>,
    pub descrizione: Option<String>,
    pub marca: Option<String>,
    pub linea: Option<String>,
    pub unita_misura: Option<String>,
    pub capacita: Option<f64>,
    pub scorta_minima: Option<f64>,
    pub scorta_riordino: Option<f64>,
    pub prezzo_acquisto: Option<f64>,
    pub prezzo_vendita: Option<f64>,
    pub uso: Option<String>,
    pub data_scadenza: Option<String>,
    pub note: Option<String>,
    pub attivo: Option<bool>,
}

// === MOVIMENTI MAGAZZINO ===

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct MovimentoMagazzino {
    pub id: String,
    pub prodotto_id: String,
    pub tipo: String, // 'carico' | 'scarico_uso' | 'scarico_vendita' | 'reso' | 'inventario' | 'scarto'
    pub quantita: f64,
    pub giacenza_risultante: f64,
    pub appuntamento_id: Option<String>,
    pub operatrice_id: Option<String>,
    pub cliente_id: Option<String>,
    pub fornitore: Option<String>,
    pub documento_riferimento: Option<String>,
    pub prezzo_unitario: Option<f64>,
    pub lotto: Option<String>,
    pub data_scadenza: Option<String>,
    pub note: Option<String>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct MovimentoWithDetails {
    pub id: String,
    pub prodotto_id: String,
    pub tipo: String,
    pub quantita: f64,
    pub giacenza_risultante: f64,
    pub appuntamento_id: Option<String>,
    pub operatrice_id: Option<String>,
    pub cliente_id: Option<String>,
    pub fornitore: Option<String>,
    pub documento_riferimento: Option<String>,
    pub prezzo_unitario: Option<f64>,
    pub lotto: Option<String>,
    pub data_scadenza: Option<String>,
    pub note: Option<String>,
    pub created_at: NaiveDateTime,
    // Join fields
    pub prodotto_nome: Option<String>,
    pub prodotto_codice: Option<String>,
    pub operatrice_nome: Option<String>,
    pub cliente_nome: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCaricoInput {
    pub prodotto_id: String,
    pub quantita: f64,
    pub fornitore: Option<String>,
    pub documento_riferimento: Option<String>,
    pub prezzo_unitario: Option<f64>,
    pub lotto: Option<String>,
    pub data_scadenza: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateScaricoInput {
    pub prodotto_id: String,
    pub quantita: f64,
    pub tipo: String, // 'scarico_uso' | 'scarico_vendita' | 'scarto'
    pub operatrice_id: Option<String>,
    pub cliente_id: Option<String>,
    pub appuntamento_id: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInventarioInput {
    pub prodotto_id: String,
    pub nuova_giacenza: f64,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateResoInput {
    pub prodotto_id: String,
    pub quantita: f64,
    pub operatrice_id: Option<String>,
    pub cliente_id: Option<String>,
    pub appuntamento_id: Option<String>,
    pub note: Option<String>,
}

// === FILTRI ===

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct FiltriMovimenti {
    pub prodotto_id: Option<String>,
    pub tipo: Option<String>,
    pub data_da: Option<String>,
    pub data_a: Option<String>,
    pub operatrice_id: Option<String>,
    pub cliente_id: Option<String>,
    pub fornitore: Option<String>,
}

// === ALERT E REPORT ===

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AlertProdotto {
    pub id: String,
    pub codice: String,
    pub nome: String,
    pub tipo_alert: String, // 'scorta_minima' | 'scadenza_vicina' | 'scaduto'
    pub giacenza: f64,
    pub scorta_minima: f64,
    pub data_scadenza: Option<String>,
    pub giorni_alla_scadenza: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AlertCount {
    pub sotto_scorta: i64,
    pub in_scadenza: i64,
    pub scaduti: i64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ReportConsumiResult {
    pub prodotto_id: String,
    pub prodotto_nome: String,
    pub prodotto_codice: String,
    pub categoria_nome: Option<String>,
    pub quantita_totale: f64,
    pub valore_totale: Option<f64>,
    pub numero_movimenti: i64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ValoreMagazzino {
    pub valore_acquisto: Option<f64>,
    pub valore_vendita: Option<f64>,
    pub totale_prodotti: i64,
    pub totale_pezzi: f64,
}

// === INVENTARIO ===

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Inventario {
    pub id: String,
    pub codice: String,
    pub descrizione: Option<String>,
    pub data_inizio: NaiveDateTime,
    pub data_chiusura: Option<NaiveDateTime>,
    pub stato: String,  // 'in_corso' | 'confermato' | 'annullato'
    pub note: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct RigaInventario {
    pub id: String,
    pub inventario_id: String,
    pub prodotto_id: String,
    pub giacenza_teorica: f64,
    pub quantita_contata: f64,
    pub differenza: f64,
    pub lotto: Option<String>,
    pub data_scadenza: Option<String>,
    pub note: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct RigaInventarioWithProdotto {
    pub id: String,
    pub inventario_id: String,
    pub prodotto_id: String,
    pub giacenza_teorica: f64,
    pub quantita_contata: f64,
    pub differenza: f64,
    pub lotto: Option<String>,
    pub data_scadenza: Option<String>,
    pub note: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    // Join fields
    pub prodotto_codice: Option<String>,
    pub prodotto_nome: Option<String>,
    pub prodotto_barcode: Option<String>,
    pub prodotto_marca: Option<String>,
    pub prodotto_unita_misura: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSessioneInventarioInput {
    pub descrizione: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRigaInventarioInput {
    pub inventario_id: String,
    pub prodotto_id: String,
    pub quantita_contata: f64,
    pub lotto: Option<String>,
    pub data_scadenza: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRigaInventarioInput {
    pub quantita_contata: Option<f64>,
    pub lotto: Option<String>,
    pub data_scadenza: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct InventarioRiepilogo {
    pub id: String,
    pub codice: String,
    pub descrizione: Option<String>,
    pub data_inizio: NaiveDateTime,
    pub stato: String,
    pub totale_righe: i64,
    pub totale_differenze_positive: f64,
    pub totale_differenze_negative: f64,
}
