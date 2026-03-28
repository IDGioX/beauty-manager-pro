// Models for analytics and reporting

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
// ============================================
// INPUT FILTERS
// ============================================

#[derive(Debug, Deserialize)]
pub struct DateRangeFilter {
    pub data_inizio: String,
    pub data_fine: String,
}

// ============================================
// GENERAL REPORTS OUTPUTS
// ============================================

#[derive(Debug, Serialize, FromRow)]
pub struct TrattamentoStats {
    pub trattamento_id: String,
    pub trattamento_nome: String,
    pub categoria_nome: Option<String>,
    pub totale_appuntamenti: i64,
    pub ricavo_totale: f64,
    pub ricavo_medio: f64,
    pub durata_media_minuti: f64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ClienteTopFrequenza {
    pub cliente_id: String,
    pub nome: String,
    pub cognome: String,
    pub email: Option<String>,
    pub cellulare: Option<String>,
    pub totale_appuntamenti: i64,
    pub ricavo_totale: f64,
    pub ultimo_appuntamento: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ClienteTopRicavo {
    pub cliente_id: String,
    pub nome: String,
    pub cognome: String,
    pub email: Option<String>,
    pub cellulare: Option<String>,
    pub ricavo_totale: f64,
    pub totale_appuntamenti: i64,
    pub ricavo_medio: f64,
}

#[derive(Debug, Serialize)]
pub struct PeriodAnalytics {
    pub totale_appuntamenti: i64,
    pub appuntamenti_completati: i64,
    pub appuntamenti_annullati: i64,
    pub appuntamenti_no_show: i64,
    pub tasso_completamento: f64,
    pub ricavo_totale: f64,
    pub ricavo_medio: f64,
    pub clienti_unici: i64,
    pub nuovi_clienti: i64,
    pub media_appuntamenti_per_cliente: f64,
    pub durata_media_minuti: f64,
}

// ============================================
// REPORT FILTRATO (filtri avanzati)
// ============================================

#[derive(Debug, Deserialize)]
pub struct ReportFiltrato {
    pub data_inizio: String,
    pub data_fine: String,
    pub cliente_ids: Option<Vec<String>>,
    pub trattamento_ids: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct ReportFiltratoResult {
    pub kpi: PeriodAnalytics,
    pub top_trattamenti: Vec<TrattamentoStats>,
    pub top_clienti: Vec<ClienteTopRicavo>,
    pub produttivita_operatrici: Vec<OperatriceProduttivita>,
    pub ricavi_per_categoria: Vec<RicavoCategoria>,
    pub dettaglio_appuntamenti: Vec<ReportAppuntamentoRow>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct OperatriceProduttivita {
    pub operatrice_id: String,
    pub operatrice_nome: String,
    pub operatrice_cognome: String,
    pub totale_appuntamenti: i64,
    pub appuntamenti_completati: i64,
    pub ricavo_totale: f64,
    pub ricavo_medio: f64,
    pub ore_lavorate: f64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct RicavoCategoria {
    pub categoria_nome: String,
    pub totale_appuntamenti: i64,
    pub ricavo_totale: f64,
    pub percentuale: f64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ReportAppuntamentoRow {
    pub data: String,
    pub cliente_nome: String,
    pub cliente_cognome: String,
    pub trattamento_nome: String,
    pub categoria_trattamento: String,
    pub operatrice_nome: String,
    pub operatrice_cognome: String,
    pub durata_minuti: f64,
    pub stato: String,
    pub prezzo: f64,
    pub note: String,
}

// ============================================
// CLIENT HISTORY OUTPUTS
// ============================================

#[derive(Debug, Serialize, FromRow)]
pub struct ClienteSearchResult {
    pub id: String,
    pub nome: String,
    pub cognome: String,
    pub email: Option<String>,
    pub cellulare: Option<String>,
    pub ultimo_appuntamento: Option<String>,
    pub totale_appuntamenti: i64,
}

#[derive(Debug, Serialize)]
pub struct ClienteCompleteProfile {
    pub cliente: crate::models::Cliente,
    pub statistiche: ClienteStatistiche,
    pub appuntamenti: Vec<crate::models::AppuntamentoWithDetails>,
    pub trattamenti_frequenti: Vec<TrattamentoFrequenza>,
    pub spesa_per_mese: Vec<SpesaMensile>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ClienteStatistiche {
    pub totale_appuntamenti: i64,
    pub appuntamenti_completati: i64,
    pub appuntamenti_annullati: i64,
    pub appuntamenti_no_show: i64,
    pub spesa_totale: f64,
    pub spesa_media: f64,
    pub primo_appuntamento: Option<String>,
    pub ultimo_appuntamento: Option<String>,
    pub giorni_da_ultimo_appuntamento: Option<i64>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct TrattamentoFrequenza {
    pub trattamento_nome: String,
    pub categoria_nome: Option<String>,
    pub count: i64,
    pub spesa_totale: f64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct SpesaMensile {
    pub anno: i64,
    pub mese: i64,
    pub spesa: f64,
    pub appuntamenti: i64,
}
