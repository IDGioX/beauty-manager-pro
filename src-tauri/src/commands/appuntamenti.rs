// Commands per la gestione degli appuntamenti
use crate::error::{AppResult, AppError};
use crate::models::{Appuntamento, AppuntamentoWithDetails, CreateAppuntamentoInput, UpdateAppuntamentoInput};
use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::{DateTime, Utc};

// Helper per generare UUID
fn generate_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[tauri::command]
pub async fn get_appuntamenti_by_date_range(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    data_inizio: DateTime<Utc>,
    data_fine: DateTime<Utc>,
) -> AppResult<Vec<AppuntamentoWithDetails>> {
    let state = db.lock().await;

    let appuntamenti = sqlx::query_as::<_, AppuntamentoWithDetails>(
        r#"
        SELECT
            a.id,
            a.cliente_id,
            c.nome as cliente_nome,
            c.cognome as cliente_cognome,
            c.cellulare as cliente_cellulare,
            a.operatrice_id,
            o.nome as operatrice_nome,
            o.cognome as operatrice_cognome,
            o.colore_agenda as operatrice_colore,
            a.trattamento_id,
            t.nome as trattamento_nome,
            t.durata_minuti as trattamento_durata,
            a.data_ora_inizio,
            a.data_ora_fine,
            a.stato,
            a.note_prenotazione,
            a.note_trattamento,
            a.prezzo_applicato,
            a.created_at,
            a.updated_at
        FROM appuntamenti a
        INNER JOIN clienti c ON a.cliente_id = c.id
        INNER JOIN operatrici o ON a.operatrice_id = o.id
        INNER JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE a.data_ora_inizio >= ?1
          AND a.data_ora_inizio < ?2
          AND a.stato != 'annullato'
        ORDER BY a.data_ora_inizio ASC
        "#
    )
    .bind(data_inizio)
    .bind(data_fine)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(appuntamenti)
}

#[tauri::command]
pub async fn get_appuntamento_by_id(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<AppuntamentoWithDetails> {
    let state = db.lock().await;

    let appuntamento = sqlx::query_as::<_, AppuntamentoWithDetails>(
        r#"
        SELECT
            a.id,
            a.cliente_id,
            c.nome as cliente_nome,
            c.cognome as cliente_cognome,
            c.cellulare as cliente_cellulare,
            a.operatrice_id,
            o.nome as operatrice_nome,
            o.cognome as operatrice_cognome,
            o.colore_agenda as operatrice_colore,
            a.trattamento_id,
            t.nome as trattamento_nome,
            t.durata_minuti as trattamento_durata,
            a.data_ora_inizio,
            a.data_ora_fine,
            a.stato,
            a.note_prenotazione,
            a.note_trattamento,
            a.prezzo_applicato,
            a.created_at,
            a.updated_at
        FROM appuntamenti a
        INNER JOIN clienti c ON a.cliente_id = c.id
        INNER JOIN operatrici o ON a.operatrice_id = o.id
        INNER JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE a.id = ?1
        "#
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(appuntamento)
}

#[tauri::command]
pub async fn create_appuntamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateAppuntamentoInput,
) -> AppResult<Appuntamento> {
    let state = db.lock().await;

    if input.data_ora_fine <= input.data_ora_inizio {
        return Err(crate::error::AppError::InvalidInput(
            "La data di fine deve essere successiva alla data di inizio".to_string()
        ));
    }

    // Controlla sovrapposizioni
    let sovrapposizioni = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM appuntamenti
        WHERE operatrice_id = ?1
          AND stato NOT IN ('annullato', 'no_show')
          AND ((data_ora_inizio < ?3 AND data_ora_fine > ?2))
        "#
    )
    .bind(&input.operatrice_id)
    .bind(&input.data_ora_inizio)
    .bind(&input.data_ora_fine)
    .fetch_one(&state.db.pool)
    .await?;

    if sovrapposizioni > 0 {
        return Err(crate::error::AppError::Conflict(
            "L'operatrice ha già un appuntamento in questo orario".to_string()
        ));
    }

    let id = generate_uuid();
    let stato = input.stato.as_deref().unwrap_or("prenotato");

    sqlx::query(
        r#"
        INSERT INTO appuntamenti (
            id, cliente_id, operatrice_id, cabina_id, trattamento_id,
            data_ora_inizio, data_ora_fine, note_prenotazione, prezzo_applicato,
            stato, prenotato_da
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'operatrice')
        "#
    )
    .bind(&id)
    .bind(&input.cliente_id)
    .bind(&input.operatrice_id)
    .bind(&input.cabina_id)
    .bind(&input.trattamento_id)
    .bind(&input.data_ora_inizio)
    .bind(&input.data_ora_fine)
    .bind(&input.note_prenotazione)
    .bind(&input.prezzo_applicato)
    .bind(stato)
    .execute(&state.db.pool)
    .await?;

    let appuntamento = sqlx::query_as::<_, Appuntamento>(
        "SELECT * FROM appuntamenti WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(appuntamento)
}

#[tauri::command]
pub async fn update_appuntamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    input: UpdateAppuntamentoInput,
) -> AppResult<Appuntamento> {
    let state = db.lock().await;

    // Valida lo stato se fornito
    if let Some(ref stato) = input.stato {
        let stati_validi = ["programmato", "confermato", "in_corso", "completato", "annullato", "no_show"];
        if !stati_validi.contains(&stato.as_str()) {
            return Err(crate::error::AppError::InvalidInput(
                format!("Stato non valido: '{}'. Stati ammessi: programmato, confermato, in_corso, completato, annullato, no_show", stato)
            ));
        }
    }

    // Recupera l'appuntamento corrente per i campi non forniti nell'input
    let current = sqlx::query_as::<_, Appuntamento>(
        "SELECT * FROM appuntamenti WHERE id = ?1"
    )
    .bind(&id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| crate::error::AppError::NotFound(
        format!("Appuntamento non trovato: {}", id)
    ))?;

    let operatrice_id = input.operatrice_id.as_deref().unwrap_or(&current.operatrice_id);
    let data_ora_inizio = input.data_ora_inizio.unwrap_or(current.data_ora_inizio);
    let data_ora_fine = input.data_ora_fine.unwrap_or(current.data_ora_fine);

    // Valida che la data di fine sia successiva alla data di inizio
    if data_ora_fine <= data_ora_inizio {
        return Err(crate::error::AppError::InvalidInput(
            "La data di fine deve essere successiva alla data di inizio".to_string()
        ));
    }

    // Controlla sovrapposizioni (escludendo l'appuntamento corrente)
    let sovrapposizioni = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM appuntamenti
        WHERE operatrice_id = ?1
          AND id != ?2
          AND stato NOT IN ('annullato', 'no_show')
          AND ((data_ora_inizio < ?4 AND data_ora_fine > ?3))
        "#
    )
    .bind(operatrice_id)
    .bind(&id)
    .bind(&data_ora_inizio)
    .bind(&data_ora_fine)
    .fetch_one(&state.db.pool)
    .await?;

    if sovrapposizioni > 0 {
        return Err(crate::error::AppError::Conflict(
            "L'operatrice ha già un appuntamento in questo orario".to_string()
        ));
    }

    sqlx::query(
        r#"UPDATE appuntamenti SET
           cliente_id = COALESCE(?1, cliente_id),
           operatrice_id = COALESCE(?2, operatrice_id),
           trattamento_id = COALESCE(?3, trattamento_id),
           data_ora_inizio = COALESCE(?4, data_ora_inizio),
           data_ora_fine = COALESCE(?5, data_ora_fine),
           stato = COALESCE(?6, stato),
           note_prenotazione = ?7,
           note_trattamento = ?8,
           prezzo_applicato = ?9,
           updated_at = datetime('now')
           WHERE id = ?10"#
    )
    .bind(&input.cliente_id)
    .bind(&input.operatrice_id)
    .bind(&input.trattamento_id)
    .bind(&input.data_ora_inizio)
    .bind(&input.data_ora_fine)
    .bind(&input.stato)
    .bind(&input.note_prenotazione)
    .bind(&input.note_trattamento)
    .bind(&input.prezzo_applicato)
    .bind(&id)
    .execute(&state.db.pool)
    .await?;

    let appuntamento = sqlx::query_as::<_, Appuntamento>(
        "SELECT * FROM appuntamenti WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(appuntamento)
}

#[tauri::command]
pub async fn delete_appuntamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    let result = sqlx::query("DELETE FROM appuntamenti WHERE id = ?1")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(crate::error::AppError::NotFound(
            format!("Appuntamento non trovato: {}", id)
        ));
    }

    Ok(())
}

// Aggiorna automaticamente gli stati degli appuntamenti in base all'orario
#[tauri::command]
pub async fn aggiorna_stati_automatici(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<(i64, i64)> {
    let state = db.lock().await;
    let now = Utc::now();

    // Aggiorna "prenotato" → "in_corso" se l'ora di inizio è passata
    let iniziati = sqlx::query(
        r#"
        UPDATE appuntamenti
        SET stato = 'in_corso', updated_at = datetime('now')
        WHERE stato = 'prenotato'
          AND data_ora_inizio <= ?1
          AND data_ora_fine > ?1
        "#
    )
    .bind(&now)
    .execute(&state.db.pool)
    .await?;

    // Aggiorna "in_corso" → "completato" se l'ora di fine è passata
    let completati = sqlx::query(
        r#"
        UPDATE appuntamenti
        SET stato = 'completato', updated_at = datetime('now')
        WHERE stato = 'in_corso'
          AND data_ora_fine <= ?1
        "#
    )
    .bind(&now)
    .execute(&state.db.pool)
    .await?;

    Ok((iniziati.rows_affected() as i64, completati.rows_affected() as i64))
}

#[tauri::command]
pub async fn get_appuntamenti_giorno(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    data: DateTime<Utc>,
) -> AppResult<Vec<AppuntamentoWithDetails>> {
    let state = db.lock().await;

    // Calcola inizio e fine giornata
    let data_inizio = data.date_naive().and_hms_opt(0, 0, 0)
        .ok_or_else(|| AppError::InvalidInput("Data non valida: impossibile calcolare inizio giornata".to_string()))?;
    let data_fine = data.date_naive().and_hms_opt(23, 59, 59)
        .ok_or_else(|| AppError::InvalidInput("Data non valida: impossibile calcolare fine giornata".to_string()))?;

    let data_inizio_utc = DateTime::<Utc>::from_naive_utc_and_offset(data_inizio, Utc);
    let data_fine_utc = DateTime::<Utc>::from_naive_utc_and_offset(data_fine, Utc);

    let appuntamenti = sqlx::query_as::<_, AppuntamentoWithDetails>(
        r#"
        SELECT
            a.id,
            a.cliente_id,
            c.nome as cliente_nome,
            c.cognome as cliente_cognome,
            c.cellulare as cliente_cellulare,
            a.operatrice_id,
            o.nome as operatrice_nome,
            o.cognome as operatrice_cognome,
            o.colore_agenda as operatrice_colore,
            a.trattamento_id,
            t.nome as trattamento_nome,
            t.durata_minuti as trattamento_durata,
            a.data_ora_inizio,
            a.data_ora_fine,
            a.stato,
            a.note_prenotazione,
            a.note_trattamento,
            a.prezzo_applicato,
            a.created_at,
            a.updated_at
        FROM appuntamenti a
        INNER JOIN clienti c ON a.cliente_id = c.id
        INNER JOIN operatrici o ON a.operatrice_id = o.id
        INNER JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE a.data_ora_inizio >= ?1
          AND a.data_ora_inizio <= ?2
        ORDER BY a.data_ora_inizio ASC
        "#
    )
    .bind(data_inizio_utc)
    .bind(data_fine_utc)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(appuntamenti)
}
