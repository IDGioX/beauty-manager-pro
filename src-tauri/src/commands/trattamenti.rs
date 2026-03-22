// Comandi per trattamenti
use crate::error::{AppResult, AppError};
use crate::models::{
    Trattamento, TrattamentoWithCategoria, CategoriaTrattamento,
    CreateTrattamentoInput, UpdateTrattamentoInput,
    CreateCategoriaTrattamentoInput, UpdateCategoriaTrattamentoInput
};
use std::sync::Arc;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_categorie_trattamenti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<Vec<CategoriaTrattamento>> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, CategoriaTrattamento>(
        "SELECT * FROM categorie_trattamenti ORDER BY ordine, nome"
    )
    .fetch_all(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_trattamenti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    categoria_id: Option<String>,
    attivo_only: Option<bool>,
) -> AppResult<Vec<TrattamentoWithCategoria>> {
    let state = db.lock().await;

    let mut query = String::from(
        "SELECT t.*, c.nome as categoria_nome
         FROM trattamenti t
         LEFT JOIN categorie_trattamenti c ON t.categoria_id = c.id
         WHERE 1=1"
    );

    let mut bind_cat_id: Option<String> = None;

    if let Some(cat_id) = &categoria_id {
        query.push_str(" AND t.categoria_id = ?");
        bind_cat_id = Some(cat_id.clone());
    }

    if attivo_only.unwrap_or(false) {
        query.push_str(" AND t.attivo = 1");
    }

    query.push_str(" ORDER BY c.ordine, t.nome");

    let mut sql_query = sqlx::query_as::<_, TrattamentoWithCategoria>(&query);
    if let Some(ref cat_id) = bind_cat_id {
        sql_query = sql_query.bind(cat_id);
    }

    let result = sql_query.fetch_all(&state.db.pool).await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_trattamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<TrattamentoWithCategoria> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, TrattamentoWithCategoria>(
        "SELECT t.*, c.nome as categoria_nome
         FROM trattamenti t
         LEFT JOIN categorie_trattamenti c ON t.categoria_id = c.id
         WHERE t.id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn create_trattamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateTrattamentoInput,
) -> AppResult<Trattamento> {
    let state = db.lock().await;

    // Genera il prossimo codice trattamento
    let codice_result = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(MAX(CAST(substr(codice, 4) AS INTEGER)), 999) + 1
         FROM trattamenti WHERE codice LIKE 'TRT%'"
    )
    .fetch_one(&state.db.pool)
    .await?;

    let codice = format!("TRT{:06}", codice_result);
    let attivo = input.attivo.unwrap_or(true);
    let attivo_int: i64 = if attivo { 1 } else { 0 };

    sqlx::query(
        r#"
        INSERT INTO trattamenti (
            codice, categoria_id, nome, descrizione, durata_minuti,
            prezzo_listino, attivo, note_operative
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#,
    )
    .bind(&codice)
    .bind(&input.categoria_id)
    .bind(&input.nome)
    .bind(&input.descrizione)
    .bind(input.durata_minuti)
    .bind(input.prezzo_listino)
    .bind(attivo_int)
    .bind(&input.note_operative)
    .execute(&state.db.pool)
    .await?;

    // Recupera il trattamento usando il codice (UNIQUE)
    let trattamento = sqlx::query_as::<_, Trattamento>("SELECT * FROM trattamenti WHERE codice = ?")
        .bind(&codice)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(trattamento)
}

#[tauri::command]
pub async fn update_trattamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    input: UpdateTrattamentoInput,
) -> AppResult<Trattamento> {
    let state = db.lock().await;

    let mut updates = Vec::new();

    if input.categoria_id.is_some() {
        updates.push("categoria_id = ?");
    }
    if input.nome.is_some() {
        updates.push("nome = ?");
    }
    if input.descrizione.is_some() {
        updates.push("descrizione = ?");
    }
    if input.durata_minuti.is_some() {
        updates.push("durata_minuti = ?");
    }
    if input.prezzo_listino.is_some() {
        updates.push("prezzo_listino = ?");
    }
    if input.attivo.is_some() {
        updates.push("attivo = ?");
    }
    if input.note_operative.is_some() {
        updates.push("note_operative = ?");
    }

    if updates.is_empty() {
        return Err(crate::error::AppError::InvalidInput("No updates provided".to_string()));
    }

    let query_str = format!(
        "UPDATE trattamenti SET {}, updated_at = datetime('now') WHERE id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);

    if let Some(categoria_id) = &input.categoria_id {
        query = query.bind(categoria_id);
    }
    if let Some(nome) = &input.nome {
        query = query.bind(nome);
    }
    if let Some(descrizione) = &input.descrizione {
        query = query.bind(descrizione);
    }
    if let Some(durata_minuti) = input.durata_minuti {
        query = query.bind(durata_minuti);
    }
    if let Some(prezzo_listino) = input.prezzo_listino {
        query = query.bind(prezzo_listino);
    }
    if let Some(attivo) = input.attivo {
        let attivo_int: i64 = if attivo { 1 } else { 0 };
        query = query.bind(attivo_int);
    }
    if let Some(note_operative) = &input.note_operative {
        query = query.bind(note_operative);
    }

    query = query.bind(&id);

    query.execute(&state.db.pool).await?;

    let trattamento = sqlx::query_as::<_, Trattamento>("SELECT * FROM trattamenti WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(trattamento)
}

#[tauri::command]
pub async fn delete_trattamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Verifica che non ci siano appuntamenti associati
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM appuntamenti WHERE trattamento_id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    if count > 0 {
        return Err(AppError::InvalidInput(
            format!("Impossibile eliminare il trattamento: ci sono {} appuntamenti associati. Disattivalo invece di eliminarlo.", count)
        ));
    }

    let result = sqlx::query("DELETE FROM trattamenti WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Trattamento non trovato".to_string()));
    }

    Ok(())
}

// Comandi per gestione categorie

#[tauri::command]
pub async fn create_categoria_trattamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateCategoriaTrattamentoInput,
) -> AppResult<CategoriaTrattamento> {
    let state = db.lock().await;

    // Genera il prossimo codice categoria
    let codice_result = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(MAX(CAST(substr(codice, 4) AS INTEGER)), 0) + 1
         FROM categorie_trattamenti WHERE codice LIKE 'CAT%'"
    )
    .fetch_one(&state.db.pool)
    .await?;

    let codice = format!("CAT{:03}", codice_result);
    let attiva = input.attiva.unwrap_or(true);
    let attiva_int: i64 = if attiva { 1 } else { 0 };

    // Se non è specificato un ordine, usa il massimo + 1
    let ordine = if let Some(ord) = input.ordine {
        ord
    } else {
        sqlx::query_scalar::<_, i64>(
            "SELECT COALESCE(MAX(ordine), 0) + 1 FROM categorie_trattamenti"
        )
        .fetch_one(&state.db.pool)
        .await?
    };

    // Lascia che il database generi l'ID automaticamente
    sqlx::query(
        r#"
        INSERT INTO categorie_trattamenti (
            codice, nome, descrizione, colore, icona, ordine, attiva
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
    )
    .bind(&codice)
    .bind(&input.nome)
    .bind(&input.descrizione)
    .bind(&input.colore)
    .bind(&input.icona)
    .bind(ordine)
    .bind(attiva_int)
    .execute(&state.db.pool)
    .await?;

    // Recupera la categoria usando il codice (UNIQUE)
    let categoria = sqlx::query_as::<_, CategoriaTrattamento>(
        "SELECT * FROM categorie_trattamenti WHERE codice = ?"
    )
    .bind(&codice)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(categoria)
}

#[tauri::command]
pub async fn update_categoria_trattamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    input: UpdateCategoriaTrattamentoInput,
) -> AppResult<CategoriaTrattamento> {
    let state = db.lock().await;

    let mut updates = Vec::new();

    if input.nome.is_some() {
        updates.push("nome = ?");
    }
    if input.descrizione.is_some() {
        updates.push("descrizione = ?");
    }
    if input.colore.is_some() {
        updates.push("colore = ?");
    }
    if input.icona.is_some() {
        updates.push("icona = ?");
    }
    if input.ordine.is_some() {
        updates.push("ordine = ?");
    }
    if input.attiva.is_some() {
        updates.push("attiva = ?");
    }

    if updates.is_empty() {
        return Err(crate::error::AppError::InvalidInput("No updates provided".to_string()));
    }

    let query_str = format!(
        "UPDATE categorie_trattamenti SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);

    if let Some(nome) = &input.nome {
        query = query.bind(nome);
    }
    if let Some(descrizione) = &input.descrizione {
        query = query.bind(descrizione);
    }
    if let Some(colore) = &input.colore {
        query = query.bind(colore);
    }
    if let Some(icona) = &input.icona {
        query = query.bind(icona);
    }
    if let Some(ordine) = input.ordine {
        query = query.bind(ordine);
    }
    if let Some(attiva) = input.attiva {
        let attiva_int: i64 = if attiva { 1 } else { 0 };
        query = query.bind(attiva_int);
    }

    query = query.bind(&id);

    query.execute(&state.db.pool).await?;

    let categoria = sqlx::query_as::<_, CategoriaTrattamento>(
        "SELECT * FROM categorie_trattamenti WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(categoria)
}

#[tauri::command]
pub async fn delete_categoria_trattamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Verifica se ci sono trattamenti associati
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM trattamenti WHERE categoria_id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    if count > 0 {
        return Err(crate::error::AppError::InvalidInput(
            format!("Impossibile eliminare la categoria: {} trattamenti associati", count)
        ));
    }

    sqlx::query("DELETE FROM categorie_trattamenti WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    Ok(())
}
