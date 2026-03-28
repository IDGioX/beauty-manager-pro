// Modelli per l'esportazione dell'agenda

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ExportAgendaInput {
    pub data_inizio: String,
    pub data_fine: String,
    pub operatrici_ids: Vec<String>,
    pub file_path: String,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    pub file_path: String,
    pub file_size: u64,
}
