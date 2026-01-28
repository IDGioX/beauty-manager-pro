use crate::db::Database;
use crate::error::AppResult;
use crate::models::azienda::{Azienda, UpdateAziendaInput};
use crate::AppState;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_azienda(state: State<'_, Arc<Mutex<AppState>>>) -> AppResult<Azienda> {
    let state = state.lock().await;

    let result = sqlx::query_as::<_, Azienda>(
        r#"
        SELECT id, nome_centro, indirizzo, citta, cap, provincia, telefono, email, piva,
               logo, orario_apertura, orario_chiusura, slot_durata_minuti, giorni_lavorativi,
               created_at, updated_at
        FROM config_centro
        LIMIT 1
        "#,
    )
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn update_azienda(
    state: State<'_, Arc<Mutex<AppState>>>,
    data: UpdateAziendaInput,
) -> AppResult<Azienda> {
    let state = state.lock().await;

    // First, get the current record to get its ID
    let current = sqlx::query_as::<_, Azienda>(
        "SELECT id, nome_centro, indirizzo, citta, cap, provincia, telefono, email, piva,
               logo, orario_apertura, orario_chiusura, slot_durata_minuti, giorni_lavorativi,
               created_at, updated_at
        FROM config_centro LIMIT 1"
    )
    .fetch_one(&state.db.pool)
    .await?;

    // Update the record
    sqlx::query(
        r#"
        UPDATE config_centro
        SET nome_centro = ?1,
            indirizzo = ?2,
            citta = ?3,
            cap = ?4,
            provincia = ?5,
            telefono = ?6,
            email = ?7,
            piva = ?8,
            orario_apertura = ?9,
            orario_chiusura = ?10,
            slot_durata_minuti = ?11,
            giorni_lavorativi = ?12,
            updated_at = datetime('now')
        WHERE id = ?13
        "#,
    )
    .bind(&data.nome_centro)
    .bind(&data.indirizzo)
    .bind(&data.citta)
    .bind(&data.cap)
    .bind(&data.provincia)
    .bind(&data.telefono)
    .bind(&data.email)
    .bind(&data.piva)
    .bind(&data.orario_apertura)
    .bind(&data.orario_chiusura)
    .bind(data.slot_durata_minuti)
    .bind(&data.giorni_lavorativi)
    .bind(&current.id)
    .execute(&state.db.pool)
    .await?;

    // Return the updated record
    let result = sqlx::query_as::<_, Azienda>(
        "SELECT id, nome_centro, indirizzo, citta, cap, provincia, telefono, email, piva,
               logo, orario_apertura, orario_chiusura, slot_durata_minuti, giorni_lavorativi,
               created_at, updated_at
        FROM config_centro WHERE id = ?1"
    )
    .bind(&current.id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}
