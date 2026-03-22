// Comandi per la gestione dei clienti
use crate::db::Database;
use crate::error::AppResult;
use crate::models::{Cliente, CreateClienteInput};
use std::sync::Arc;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_clienti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    search: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
    include_inactive: Option<bool>,
) -> AppResult<Vec<Cliente>> {
    let state = db.lock().await;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    let include_all = include_inactive.unwrap_or(false);

    let query = if let Some(search_term) = search {
        let search_pattern = format!("%{}%", search_term);
        if include_all {
            sqlx::query_as::<_, Cliente>(
                r#"
                SELECT * FROM clienti
                WHERE (nome LIKE ?1 OR cognome LIKE ?1 OR cellulare LIKE ?1 OR email LIKE ?1)
                ORDER BY cognome, nome
                LIMIT ?2 OFFSET ?3
                "#,
            )
            .bind(&search_pattern)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db.pool)
            .await?
        } else {
            sqlx::query_as::<_, Cliente>(
                r#"
                SELECT * FROM clienti
                WHERE (nome LIKE ?1 OR cognome LIKE ?1 OR cellulare LIKE ?1 OR email LIKE ?1)
                AND attivo = 1
                ORDER BY cognome, nome
                LIMIT ?2 OFFSET ?3
                "#,
            )
            .bind(&search_pattern)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db.pool)
            .await?
        }
    } else {
        if include_all {
            sqlx::query_as::<_, Cliente>(
                r#"
                SELECT * FROM clienti
                ORDER BY cognome, nome
                LIMIT ?1 OFFSET ?2
                "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db.pool)
            .await?
        } else {
            sqlx::query_as::<_, Cliente>(
                r#"
                SELECT * FROM clienti
                WHERE attivo = 1
                ORDER BY cognome, nome
                LIMIT ?1 OFFSET ?2
                "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db.pool)
            .await?
        }
    };

    Ok(query)
}

#[tauri::command]
pub async fn get_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<Cliente> {
    let state = db.lock().await;

    let cliente = sqlx::query_as::<_, Cliente>(
        "SELECT * FROM clienti WHERE id = ?1",
    )
    .bind(&id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| crate::error::AppError::NotFound("Cliente non trovato".to_string()))?;

    Ok(cliente)
}

#[tauri::command]
pub async fn create_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateClienteInput,
) -> AppResult<Cliente> {
    let state = db.lock().await;

    // Validazione base
    if input.nome.trim().is_empty() || input.cognome.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "Nome e cognome sono obbligatori".to_string(),
        ));
    }

    if input.cellulare.is_none() && input.email.is_none() {
        return Err(crate::error::AppError::InvalidInput(
            "Almeno un contatto (cellulare o email) è obbligatorio".to_string(),
        ));
    }

    // Inserisci nuovo cliente (il codice e l'ID vengono generati dal database)
    let result = sqlx::query(
        r#"
        INSERT INTO clienti (
            nome, cognome, sesso, data_nascita, cellulare, email, note,
            consenso_marketing, consenso_sms, consenso_whatsapp, consenso_email,
            canale_preferito, data_consenso_privacy
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, datetime('now'))
        "#,
    )
    .bind(&input.nome)
    .bind(&input.cognome)
    .bind(&input.sesso)
    .bind(&input.data_nascita)
    .bind(&input.cellulare)
    .bind(&input.email)
    .bind(&input.note)
    .bind(if input.consenso_marketing { 1 } else { 0 })
    .bind(if input.consenso_sms { 1 } else { 0 })
    .bind(if input.consenso_whatsapp { 1 } else { 0 })
    .bind(if input.consenso_email { 1 } else { 0 })
    .bind(&input.canale_preferito)
    .execute(&state.db.pool)
    .await?;

    // Recupera il cliente appena creato
    let cliente_id = result.last_insert_rowid().to_string();
    let cliente = sqlx::query_as::<_, Cliente>(
        "SELECT * FROM clienti WHERE rowid = ?1",
    )
    .bind(result.last_insert_rowid())
    .fetch_one(&state.db.pool)
    .await?;

    Ok(cliente)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    nome: Option<String>,
    cognome: Option<String>,
    data_nascita: Option<String>,
    cellulare: Option<String>,
    email: Option<String>,
    indirizzo: Option<String>,
    citta: Option<String>,
    note: Option<String>,
    consenso_marketing: Option<bool>,
    consenso_sms: Option<bool>,
    consenso_whatsapp: Option<bool>,
    consenso_email: Option<bool>,
    tipo_pelle: Option<String>,
    allergie: Option<String>,
    patologie: Option<String>,
    note_estetiche: Option<String>,
    fonte_acquisizione: Option<String>,
) -> AppResult<Cliente> {
    let state = db.lock().await;

    // Verifica che il cliente esista
    let exists = sqlx::query_scalar::<_, i32>("SELECT COUNT(*) FROM clienti WHERE id = ?1")
        .bind(&id)
        .fetch_one(&state.db.pool)
        .await?;

    if exists == 0 {
        return Err(crate::error::AppError::NotFound("Cliente non trovato".to_string()));
    }

    // Aggiorna solo i campi forniti
    if let Some(ref n) = nome {
        sqlx::query("UPDATE clienti SET nome = ?1 WHERE id = ?2")
            .bind(n)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref c) = cognome {
        sqlx::query("UPDATE clienti SET cognome = ?1 WHERE id = ?2")
            .bind(c)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref dn) = data_nascita {
        sqlx::query("UPDATE clienti SET data_nascita = ?1 WHERE id = ?2")
            .bind(dn)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref cel) = cellulare {
        sqlx::query("UPDATE clienti SET cellulare = ?1 WHERE id = ?2")
            .bind(cel)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref em) = email {
        sqlx::query("UPDATE clienti SET email = ?1 WHERE id = ?2")
            .bind(em)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref ind) = indirizzo {
        sqlx::query("UPDATE clienti SET indirizzo = ?1 WHERE id = ?2")
            .bind(ind)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref ct) = citta {
        sqlx::query("UPDATE clienti SET citta = ?1 WHERE id = ?2")
            .bind(ct)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref nt) = note {
        sqlx::query("UPDATE clienti SET note = ?1 WHERE id = ?2")
            .bind(nt)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(cm) = consenso_marketing {
        sqlx::query("UPDATE clienti SET consenso_marketing = ?1 WHERE id = ?2")
            .bind(if cm { 1 } else { 0 })
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(cs) = consenso_sms {
        sqlx::query("UPDATE clienti SET consenso_sms = ?1 WHERE id = ?2")
            .bind(if cs { 1 } else { 0 })
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(cw) = consenso_whatsapp {
        sqlx::query("UPDATE clienti SET consenso_whatsapp = ?1 WHERE id = ?2")
            .bind(if cw { 1 } else { 0 })
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ce) = consenso_email {
        sqlx::query("UPDATE clienti SET consenso_email = ?1 WHERE id = ?2")
            .bind(if ce { 1 } else { 0 })
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref tp) = tipo_pelle {
        sqlx::query("UPDATE clienti SET tipo_pelle = ?1 WHERE id = ?2")
            .bind(tp)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref al) = allergie {
        sqlx::query("UPDATE clienti SET allergie = ?1 WHERE id = ?2")
            .bind(al)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref pa) = patologie {
        sqlx::query("UPDATE clienti SET patologie = ?1 WHERE id = ?2")
            .bind(pa)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref ne) = note_estetiche {
        sqlx::query("UPDATE clienti SET note_estetiche = ?1 WHERE id = ?2")
            .bind(ne)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    if let Some(ref fa) = fonte_acquisizione {
        sqlx::query("UPDATE clienti SET fonte_acquisizione = ?1 WHERE id = ?2")
            .bind(fa)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    // Recupera il cliente aggiornato
    let cliente = sqlx::query_as::<_, Cliente>("SELECT * FROM clienti WHERE id = ?1")
        .bind(&id)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(cliente)
}

#[tauri::command]
pub async fn deactivate_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    let result = sqlx::query(
        "UPDATE clienti SET attivo = 0, updated_at = datetime('now') WHERE id = ?1"
    )
    .bind(&id)
    .execute(&state.db.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(crate::error::AppError::NotFound(
            format!("Cliente non trovato: {}", id)
        ));
    }

    Ok(())
}

#[tauri::command]
pub async fn reactivate_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    let result = sqlx::query(
        "UPDATE clienti SET attivo = 1, updated_at = datetime('now') WHERE id = ?1"
    )
    .bind(&id)
    .execute(&state.db.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(crate::error::AppError::NotFound(
            format!("Cliente non trovato: {}", id)
        ));
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Verifica che non ci siano appuntamenti associati
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM appuntamenti WHERE cliente_id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    if count > 0 {
        return Err(crate::error::AppError::InvalidInput(
            format!("Impossibile eliminare il cliente: ci sono {} appuntamenti associati. Disattivalo invece di eliminarlo.", count)
        ));
    }

    // Hard delete - rimuove definitivamente il cliente
    let result = sqlx::query("DELETE FROM clienti WHERE id = ?1")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(crate::error::AppError::NotFound("Cliente non trovato".to_string()));
    }

    Ok(())
}
