// Commands per la gestione delle operatrici
use crate::error::AppResult;
use crate::models::{Operatrice, CreateOperatriceInput, UpdateOperatriceInput};
use std::sync::Arc;
use tokio::sync::Mutex;

// Helper per generare UUID
fn generate_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

// Helper per generare un colore random per l'agenda
fn generate_random_color() -> String {
    let colors = vec![
        "#EC4899", // Pink
        "#8B5CF6", // Purple
        "#3B82F6", // Blue
        "#10B981", // Green
        "#F59E0B", // Amber
        "#EF4444", // Red
        "#06B6D4", // Cyan
        "#F97316", // Orange
    ];
    let idx = rand::random::<usize>() % colors.len();
    colors[idx].to_string()
}

#[tauri::command]
pub async fn get_operatrici(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    include_inactive: Option<bool>,
) -> AppResult<Vec<Operatrice>> {
    let state = db.lock().await;

    let query = if include_inactive.unwrap_or(false) {
        "SELECT * FROM operatrici ORDER BY cognome, nome"
    } else {
        "SELECT * FROM operatrici WHERE attiva = 1 ORDER BY cognome, nome"
    };

    let operatrici = sqlx::query_as::<_, Operatrice>(query)
        .fetch_all(&state.db.pool)
        .await?;

    Ok(operatrici)
}

#[tauri::command]
pub async fn get_operatrice(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<Operatrice> {
    let state = db.lock().await;

    let operatrice = sqlx::query_as::<_, Operatrice>(
        "SELECT * FROM operatrici WHERE id = ?1"
    )
    .bind(&id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| crate::error::AppError::NotFound(
        format!("Operatrice non trovata: {}", id)
    ))?;

    Ok(operatrice)
}

#[tauri::command]
pub async fn create_operatrice(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateOperatriceInput,
) -> AppResult<Operatrice> {
    let state = db.lock().await;

    // Validazione
    if input.nome.trim().is_empty() || input.cognome.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "Nome e cognome sono obbligatori".to_string()
        ));
    }

    if input.codice.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "Il codice operatrice è obbligatorio".to_string()
        ));
    }

    // Verifica che il codice non esista già
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM operatrici WHERE codice = ?1"
    )
    .bind(&input.codice)
    .fetch_one(&state.db.pool)
    .await?;

    if existing > 0 {
        return Err(crate::error::AppError::InvalidInput(
            "Codice operatrice già esistente".to_string()
        ));
    }

    let id = generate_uuid();
    let colore = input.colore_agenda.unwrap_or_else(|| generate_random_color());

    sqlx::query(
        r#"
        INSERT INTO operatrici (
            id, codice, nome, cognome, telefono, email,
            colore_agenda, specializzazioni, attiva
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1)
        "#
    )
    .bind(&id)
    .bind(&input.codice)
    .bind(&input.nome)
    .bind(&input.cognome)
    .bind(&input.telefono)
    .bind(&input.email)
    .bind(&colore)
    .bind(&input.specializzazioni)
    .execute(&state.db.pool)
    .await?;

    let operatrice = sqlx::query_as::<_, Operatrice>(
        "SELECT * FROM operatrici WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(operatrice)
}

#[tauri::command]
pub async fn update_operatrice(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    input: UpdateOperatriceInput,
) -> AppResult<Operatrice> {
    let state = db.lock().await;

    // Verifica che l'operatrice esista
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM operatrici WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    if exists == 0 {
        return Err(crate::error::AppError::NotFound(
            format!("Operatrice non trovata: {}", id)
        ));
    }

    // Se viene aggiornato il codice, verifica che non esista già
    if let Some(ref codice) = input.codice {
        let existing = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM operatrici WHERE codice = ?1 AND id != ?2"
        )
        .bind(codice)
        .bind(&id)
        .fetch_one(&state.db.pool)
        .await?;

        if existing > 0 {
            return Err(crate::error::AppError::InvalidInput(
                "Codice operatrice già esistente".to_string()
            ));
        }
    }

    sqlx::query(
        r#"
        UPDATE operatrici SET
            codice = COALESCE(?1, codice),
            nome = COALESCE(?2, nome),
            cognome = COALESCE(?3, cognome),
            telefono = COALESCE(?4, telefono),
            email = COALESCE(?5, email),
            colore_agenda = COALESCE(?6, colore_agenda),
            specializzazioni = COALESCE(?7, specializzazioni),
            attiva = COALESCE(?8, attiva),
            note = COALESCE(?9, note),
            updated_at = datetime('now')
        WHERE id = ?10
        "#
    )
    .bind(&input.codice)
    .bind(&input.nome)
    .bind(&input.cognome)
    .bind(&input.telefono)
    .bind(&input.email)
    .bind(&input.colore_agenda)
    .bind(&input.specializzazioni)
    .bind(&input.attiva)
    .bind(&input.note)
    .bind(&id)
    .execute(&state.db.pool)
    .await?;

    let operatrice = sqlx::query_as::<_, Operatrice>(
        "SELECT * FROM operatrici WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(operatrice)
}

#[tauri::command]
pub async fn deactivate_operatrice(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Soft delete: imposta attiva = 0
    let result = sqlx::query(
        "UPDATE operatrici SET attiva = 0, updated_at = datetime('now') WHERE id = ?1"
    )
    .bind(&id)
    .execute(&state.db.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(crate::error::AppError::NotFound(
            format!("Operatrice non trovata: {}", id)
        ));
    }

    Ok(())
}

#[tauri::command]
pub async fn reactivate_operatrice(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Riattiva: imposta attiva = 1
    let result = sqlx::query(
        "UPDATE operatrici SET attiva = 1, updated_at = datetime('now') WHERE id = ?1"
    )
    .bind(&id)
    .execute(&state.db.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(crate::error::AppError::NotFound(
            format!("Operatrice non trovata: {}", id)
        ));
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_operatrice(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Verifica che non ci siano appuntamenti associati
    let appuntamenti_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM appuntamenti WHERE operatrice_id = ?1"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    if appuntamenti_count > 0 {
        return Err(crate::error::AppError::Conflict(
            "Impossibile eliminare l'operatrice: ha appuntamenti associati. Usa la disattivazione invece.".to_string()
        ));
    }

    let result = sqlx::query("DELETE FROM operatrici WHERE id = ?1")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(crate::error::AppError::NotFound(
            format!("Operatrice non trovata: {}", id)
        ));
    }

    Ok(())
}
