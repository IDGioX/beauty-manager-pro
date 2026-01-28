// Tauri commands per esportazione agenda

use crate::error::AppResult;
use crate::models::{ExportAgendaInput, ExportResult, AppuntamentoWithDetails};
use crate::services::export;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::path::Path;

#[tauri::command]
pub async fn export_agenda_excel(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: ExportAgendaInput,
) -> AppResult<ExportResult> {
    // Validazioni
    if input.data_fine <= input.data_inizio {
        return Err(crate::error::AppError::InvalidInput(
            "La data fine deve essere successiva alla data inizio".to_string()
        ));
    }

    if input.operatrici_ids.is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "Seleziona almeno un'operatrice".to_string()
        ));
    }

    // Query appuntamenti
    let state = db.lock().await;
    let appuntamenti = get_appuntamenti_filtered(
        &state,
        &input.data_inizio,
        &input.data_fine,
        &input.operatrici_ids
    ).await?;

    drop(state); // Rilascia lock prima di operazioni I/O pesanti

    // Genera Excel
    let file_path = Path::new(&input.file_path);
    export::generate_excel_agenda(
        appuntamenti,
        input.data_inizio,
        input.data_fine,
        file_path,
    )?;

    // Ottieni dimensione file
    let file_size = std::fs::metadata(file_path)
        .map_err(|e| crate::error::AppError::Internal(format!("Errore lettura file: {}", e)))?
        .len();

    Ok(ExportResult {
        file_path: input.file_path,
        file_size,
    })
}

#[tauri::command]
pub async fn export_agenda_pdf(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: ExportAgendaInput,
) -> AppResult<ExportResult> {
    // Validazioni
    if input.data_fine <= input.data_inizio {
        return Err(crate::error::AppError::InvalidInput(
            "La data fine deve essere successiva alla data inizio".to_string()
        ));
    }

    if input.operatrici_ids.is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "Seleziona almeno un'operatrice".to_string()
        ));
    }

    // Query appuntamenti
    let state = db.lock().await;
    let appuntamenti = get_appuntamenti_filtered(
        &state,
        &input.data_inizio,
        &input.data_fine,
        &input.operatrici_ids
    ).await?;

    drop(state); // Rilascia lock prima di operazioni I/O pesanti

    // Genera PDF
    let file_path = Path::new(&input.file_path);
    export::generate_pdf_agenda(
        appuntamenti,
        input.data_inizio,
        input.data_fine,
        file_path,
    )?;

    // Ottieni dimensione file
    let file_size = std::fs::metadata(file_path)
        .map_err(|e| crate::error::AppError::Internal(format!("Errore lettura file: {}", e)))?
        .len();

    Ok(ExportResult {
        file_path: input.file_path,
        file_size,
    })
}

// Helper per query con filtro operatrici
async fn get_appuntamenti_filtered(
    state: &crate::AppState,
    data_inizio: &chrono::DateTime<chrono::Utc>,
    data_fine: &chrono::DateTime<chrono::Utc>,
    operatrici_ids: &[String],
) -> AppResult<Vec<AppuntamentoWithDetails>> {
    // Costruisci query con filtro operatrici
    let filter_clause = if operatrici_ids.is_empty() {
        "".to_string()
    } else {
        let ids_placeholder = operatrici_ids
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(",");
        format!("AND a.operatrice_id IN ({})", ids_placeholder)
    };

    let query = format!(
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
        WHERE a.data_ora_inizio >= ?
          AND a.data_ora_inizio < ?
          AND a.stato NOT IN ('annullato', 'no_show')
          {}
        ORDER BY a.data_ora_inizio ASC
        "#,
        filter_clause
    );

    let mut query_builder = sqlx::query_as::<_, AppuntamentoWithDetails>(&query)
        .bind(data_inizio)
        .bind(data_fine);

    // Bind operatrici_ids se presente
    for id in operatrici_ids {
        query_builder = query_builder.bind(id);
    }

    let appuntamenti = query_builder
        .fetch_all(&state.db.pool)
        .await?;

    Ok(appuntamenti)
}
