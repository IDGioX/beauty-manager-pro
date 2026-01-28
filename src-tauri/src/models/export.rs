// Modelli per l'esportazione dell'agenda

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize)]
pub struct ExportAgendaInput {
    pub data_inizio: DateTime<Utc>,
    pub data_fine: DateTime<Utc>,
    pub operatrici_ids: Vec<String>,
    pub file_path: String,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    pub file_path: String,
    pub file_size: u64,
}
