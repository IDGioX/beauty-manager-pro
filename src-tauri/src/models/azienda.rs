use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Azienda {
    pub id: String,
    pub nome_centro: String,
    pub indirizzo: Option<String>,
    pub citta: Option<String>,
    pub cap: Option<String>,
    pub provincia: Option<String>,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub piva: Option<String>,
    #[serde(skip_serializing)]
    pub logo: Option<Vec<u8>>,
    pub orario_apertura: String,
    pub orario_chiusura: String,
    pub slot_durata_minuti: i64,
    pub giorni_lavorativi: String, // JSON array
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAziendaInput {
    pub nome_centro: String,
    pub indirizzo: Option<String>,
    pub citta: Option<String>,
    pub cap: Option<String>,
    pub provincia: Option<String>,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub piva: Option<String>,
    pub orario_apertura: String,
    pub orario_chiusura: String,
    pub slot_durata_minuti: i64,
    pub giorni_lavorativi: String,
}
