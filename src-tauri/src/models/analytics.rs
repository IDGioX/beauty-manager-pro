// Models for analytics and reporting

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

// ============================================
// INPUT FILTERS
// ============================================

#[derive(Debug, Deserialize)]
pub struct DateRangeFilter {
    pub data_inizio: DateTime<Utc>,
    pub data_fine: DateTime<Utc>,
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
    pub ultimo_appuntamento: Option<DateTime<Utc>>,
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
    pub tasso_completamento: f64,
    pub ricavo_totale: f64,
    pub ricavo_medio: f64,
    pub clienti_unici: i64,
    pub nuovi_clienti: i64,
    pub media_appuntamenti_per_cliente: f64,
    pub durata_media_minuti: f64,
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
    pub ultimo_appuntamento: Option<DateTime<Utc>>,
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
    pub primo_appuntamento: Option<DateTime<Utc>>,
    pub ultimo_appuntamento: Option<DateTime<Utc>>,
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
