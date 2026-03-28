// Comandi per la gestione dei pacchetti trattamenti
use crate::error::{AppResult, AppError};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::sync::Arc;
use tokio::sync::Mutex;

// Helper per generare UUID
fn generate_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

// ============================================
// STRUCTS - Output (Serialize + FromRow)
// ============================================

#[derive(Debug, Serialize, FromRow)]
pub struct PacchettoTrattamento {
    pub id: String,
    pub nome: String,
    pub descrizione: Option<String>,
    pub prezzo_totale: f64,
    pub num_sedute: i64,
    pub tipo_pagamento: String,
    pub attivo: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct PacchettoTrattamentoIncluso {
    pub id: String,
    pub pacchetto_id: String,
    pub trattamento_id: String,
    pub ordine: i64,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct TrattamentoIncluso {
    pub id: String,
    pub trattamento_id: String,
    pub trattamento_nome: String,
    pub ordine: i64,
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PacchettoConTrattamenti {
    pub id: String,
    pub nome: String,
    pub descrizione: Option<String>,
    pub prezzo_totale: f64,
    pub num_sedute: i64,
    pub tipo_pagamento: String,
    pub attivo: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub trattamenti_inclusi: Vec<TrattamentoIncluso>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct PacchettoClienteRow {
    pub id: String,
    pub pacchetto_id: String,
    pub cliente_id: String,
    pub data_inizio: Option<String>,
    pub data_fine: Option<String>,
    pub sedute_totali: i64,
    pub sedute_completate: i64,
    pub importo_totale: f64,
    pub importo_pagato: f64,
    pub stato: String,
    pub note: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub pacchetto_nome: String,
    pub tipo_pagamento: String,
}

#[derive(Debug, Serialize)]
pub struct PacchettoCliente {
    pub id: String,
    pub pacchetto_id: String,
    pub cliente_id: String,
    pub data_inizio: Option<String>,
    pub data_fine: Option<String>,
    pub sedute_totali: i64,
    pub sedute_completate: i64,
    pub importo_totale: f64,
    pub importo_pagato: f64,
    pub stato: String,
    pub note: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub pacchetto_nome: String,
    pub tipo_pagamento: String,
    pub percentuale_completamento: f64,
    pub importo_rimanente: f64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct PacchettoSeduta {
    pub id: String,
    pub pacchetto_cliente_id: String,
    pub appuntamento_id: Option<String>,
    pub numero_seduta: i64,
    pub stato: String,
    pub note: Option<String>,
    pub created_at: Option<String>,
    pub appuntamento_data: Option<String>,
    pub appuntamento_stato: Option<String>,
    pub importo_pagato: f64,
    pub data_prevista: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct SedutaConPacchetto {
    pub seduta_id: String,
    pub pacchetto_cliente_id: String,
    pub pacchetto_nome: String,
    pub numero_seduta: i64,
    pub sedute_totali: i64,
    pub sedute_completate: i64,
    pub importo_totale: f64,
    pub importo_pagato: f64,
    pub stato_seduta: String,
    pub stato_pacchetto: String,
}

#[derive(Debug, Serialize)]
pub struct DashboardPacchetti {
    pub pacchetti_attivi: i64,
    pub tasso_completamento: f64,
    pub ricavo_pacchetti: f64,
    pub ricavo_incassato: f64,
}

// ============================================
// STRUCTS - Input (Deserialize)
// ============================================

#[derive(Debug, Deserialize)]
pub struct TrattamentoInclusoInput {
    pub trattamento_id: String,
    pub ordine: Option<i64>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePacchettoInput {
    pub nome: String,
    pub descrizione: Option<String>,
    pub prezzo_totale: f64,
    pub num_sedute: i64,
    pub tipo_pagamento: Option<String>,
    pub attivo: Option<bool>,
    pub trattamenti: Vec<TrattamentoInclusoInput>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePacchettoInput {
    pub nome: Option<String>,
    pub descrizione: Option<String>,
    pub prezzo_totale: Option<f64>,
    pub num_sedute: Option<i64>,
    pub tipo_pagamento: Option<String>,
    pub attivo: Option<bool>,
    pub trattamenti: Option<Vec<TrattamentoInclusoInput>>,
}

#[derive(Debug, Deserialize)]
pub struct AssegnaPacchettoInput {
    pub pacchetto_id: String,
    pub cliente_id: String,
    pub data_inizio: Option<String>,
    pub data_fine: Option<String>,
    pub importo_totale: Option<f64>,
    pub tipo_pagamento: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePacchettoClienteInput {
    pub pacchetto_cliente_id: String,
    pub importo_totale: Option<f64>,
    pub note: Option<String>,
    pub stato: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegistraSedutaInput {
    pub pacchetto_cliente_id: String,
    pub numero_seduta: i64,
    pub appuntamento_id: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegistraPagamentoInput {
    pub pacchetto_cliente_id: String,
    pub importo: f64,
}

// ============================================
// COMANDI - Pacchetti template
// ============================================

/// 1. Lista tutti i pacchetti template (con nomi dei trattamenti inclusi)
#[tauri::command]
pub async fn get_pacchetti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    attivo_only: Option<bool>,
) -> AppResult<Vec<PacchettoConTrattamenti>> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    let mut query = String::from(
        "SELECT * FROM pacchetti_trattamenti WHERE 1=1"
    );

    if attivo_only.unwrap_or(false) {
        query.push_str(" AND attivo = 1");
    }

    query.push_str(" ORDER BY nome");

    let pacchetti = sqlx::query_as::<_, PacchettoTrattamento>(&query)
        .fetch_all(pool)
        .await?;

    let mut result = Vec::new();

    for p in pacchetti {
        let trattamenti = sqlx::query_as::<_, TrattamentoIncluso>(
            r#"
            SELECT pti.id, pti.trattamento_id, t.nome AS trattamento_nome, pti.ordine, pti.note
            FROM pacchetto_trattamenti_inclusi pti
            JOIN trattamenti t ON t.id = pti.trattamento_id
            WHERE pti.pacchetto_id = ?
            ORDER BY pti.ordine
            "#,
        )
        .bind(&p.id)
        .fetch_all(pool)
        .await?;

        result.push(PacchettoConTrattamenti {
            id: p.id,
            nome: p.nome,
            descrizione: p.descrizione,
            prezzo_totale: p.prezzo_totale,
            num_sedute: p.num_sedute,
            tipo_pagamento: p.tipo_pagamento,
            attivo: p.attivo,
            created_at: p.created_at,
            updated_at: p.updated_at,
            trattamenti_inclusi: trattamenti,
        });
    }

    Ok(result)
}

/// 2. Dettaglio singolo pacchetto con tutti i dati
#[tauri::command]
pub async fn get_pacchetto_by_id(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<PacchettoConTrattamenti> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    let p = sqlx::query_as::<_, PacchettoTrattamento>(
        "SELECT * FROM pacchetti_trattamenti WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Pacchetto non trovato".to_string()))?;

    let trattamenti = sqlx::query_as::<_, TrattamentoIncluso>(
        r#"
        SELECT pti.id, pti.trattamento_id, t.nome AS trattamento_nome, pti.ordine, pti.note
        FROM pacchetto_trattamenti_inclusi pti
        JOIN trattamenti t ON t.id = pti.trattamento_id
        WHERE pti.pacchetto_id = ?
        ORDER BY pti.ordine
        "#,
    )
    .bind(&p.id)
    .fetch_all(pool)
    .await?;

    Ok(PacchettoConTrattamenti {
        id: p.id,
        nome: p.nome,
        descrizione: p.descrizione,
        prezzo_totale: p.prezzo_totale,
        num_sedute: p.num_sedute,
        tipo_pagamento: p.tipo_pagamento,
        attivo: p.attivo,
        created_at: p.created_at,
        updated_at: p.updated_at,
        trattamenti_inclusi: trattamenti,
    })
}

/// 3. Crea un nuovo pacchetto template con trattamenti inclusi
#[tauri::command]
pub async fn create_pacchetto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreatePacchettoInput,
) -> AppResult<PacchettoConTrattamenti> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    if input.nome.trim().is_empty() {
        return Err(AppError::InvalidInput("Il nome del pacchetto è obbligatorio".to_string()));
    }

    if input.trattamenti.is_empty() {
        return Err(AppError::InvalidInput("Il pacchetto deve contenere almeno un trattamento".to_string()));
    }

    let pacchetto_id = generate_uuid();
    let tipo_pagamento = input.tipo_pagamento.unwrap_or_else(|| "anticipo".to_string());
    let attivo: i64 = if input.attivo.unwrap_or(true) { 1 } else { 0 };

    // Validazione tipo_pagamento
    if !["anticipo", "dilazionato", "per_seduta"].contains(&tipo_pagamento.as_str()) {
        return Err(AppError::InvalidInput(
            "Tipo pagamento deve essere 'anticipo', 'dilazionato' o 'per_seduta'".to_string()
        ));
    }

    sqlx::query(
        r#"
        INSERT INTO pacchetti_trattamenti (id, nome, descrizione, prezzo_totale, num_sedute, tipo_pagamento, attivo, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&pacchetto_id)
    .bind(&input.nome)
    .bind(&input.descrizione)
    .bind(input.prezzo_totale)
    .bind(input.num_sedute)
    .bind(&tipo_pagamento)
    .bind(attivo)
    .execute(pool)
    .await?;

    // Inserisci i trattamenti inclusi
    for (idx, trattamento) in input.trattamenti.iter().enumerate() {
        let ti_id = generate_uuid();
        let ordine = trattamento.ordine.unwrap_or(idx as i64);

        sqlx::query(
            r#"
            INSERT INTO pacchetto_trattamenti_inclusi (id, pacchetto_id, trattamento_id, ordine, note)
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
        )
        .bind(&ti_id)
        .bind(&pacchetto_id)
        .bind(&trattamento.trattamento_id)
        .bind(ordine)
        .bind(&trattamento.note)
        .execute(pool)
        .await?;
    }

    // Recupera il pacchetto appena creato
    let p = sqlx::query_as::<_, PacchettoTrattamento>(
        "SELECT * FROM pacchetti_trattamenti WHERE id = ?"
    )
    .bind(&pacchetto_id)
    .fetch_one(pool)
    .await?;

    let trattamenti = sqlx::query_as::<_, TrattamentoIncluso>(
        r#"
        SELECT pti.id, pti.trattamento_id, t.nome AS trattamento_nome, pti.ordine, pti.note
        FROM pacchetto_trattamenti_inclusi pti
        JOIN trattamenti t ON t.id = pti.trattamento_id
        WHERE pti.pacchetto_id = ?
        ORDER BY pti.ordine
        "#,
    )
    .bind(&pacchetto_id)
    .fetch_all(pool)
    .await?;

    Ok(PacchettoConTrattamenti {
        id: p.id,
        nome: p.nome,
        descrizione: p.descrizione,
        prezzo_totale: p.prezzo_totale,
        num_sedute: p.num_sedute,
        tipo_pagamento: p.tipo_pagamento,
        attivo: p.attivo,
        created_at: p.created_at,
        updated_at: p.updated_at,
        trattamenti_inclusi: trattamenti,
    })
}

/// 4. Aggiorna un pacchetto template
#[tauri::command]
pub async fn update_pacchetto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    input: UpdatePacchettoInput,
) -> AppResult<PacchettoConTrattamenti> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // Verifica che il pacchetto esista
    let _existing = sqlx::query_as::<_, PacchettoTrattamento>(
        "SELECT * FROM pacchetti_trattamenti WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Pacchetto non trovato".to_string()))?;

    // Aggiornamento dinamico dei campi
    let mut updates = Vec::new();

    if input.nome.is_some() {
        updates.push("nome = ?");
    }
    if input.descrizione.is_some() {
        updates.push("descrizione = ?");
    }
    if input.prezzo_totale.is_some() {
        updates.push("prezzo_totale = ?");
    }
    if input.num_sedute.is_some() {
        updates.push("num_sedute = ?");
    }
    if input.tipo_pagamento.is_some() {
        updates.push("tipo_pagamento = ?");
    }
    if input.attivo.is_some() {
        updates.push("attivo = ?");
    }

    if !updates.is_empty() {
        let query_str = format!(
            "UPDATE pacchetti_trattamenti SET {}, updated_at = datetime('now') WHERE id = ?",
            updates.join(", ")
        );

        let mut query = sqlx::query(&query_str);

        if let Some(ref nome) = input.nome {
            query = query.bind(nome);
        }
        if let Some(ref descrizione) = input.descrizione {
            query = query.bind(descrizione);
        }
        if let Some(prezzo_totale) = input.prezzo_totale {
            query = query.bind(prezzo_totale);
        }
        if let Some(num_sedute) = input.num_sedute {
            query = query.bind(num_sedute);
        }
        if let Some(ref tipo_pagamento) = input.tipo_pagamento {
            // Validazione tipo_pagamento
            if !["anticipo", "dilazionato", "per_seduta"].contains(&tipo_pagamento.as_str()) {
                return Err(AppError::InvalidInput(
                    "Tipo pagamento deve essere 'anticipo', 'dilazionato' o 'per_seduta'".to_string()
                ));
            }
            query = query.bind(tipo_pagamento);
        }
        if let Some(attivo) = input.attivo {
            let attivo_int: i64 = if attivo { 1 } else { 0 };
            query = query.bind(attivo_int);
        }

        query = query.bind(&id);
        query.execute(pool).await?;
    }

    // Se sono stati forniti i trattamenti, sostituisci la lista
    if let Some(trattamenti) = input.trattamenti {
        // Rimuovi i trattamenti esistenti
        sqlx::query("DELETE FROM pacchetto_trattamenti_inclusi WHERE pacchetto_id = ?")
            .bind(&id)
            .execute(pool)
            .await?;

        // Inserisci i nuovi trattamenti
        for (idx, trattamento) in trattamenti.iter().enumerate() {
            let ti_id = generate_uuid();
            let ordine = trattamento.ordine.unwrap_or(idx as i64);

            sqlx::query(
                r#"
                INSERT INTO pacchetto_trattamenti_inclusi (id, pacchetto_id, trattamento_id, ordine, note)
                VALUES (?1, ?2, ?3, ?4, ?5)
                "#,
            )
            .bind(&ti_id)
            .bind(&id)
            .bind(&trattamento.trattamento_id)
            .bind(ordine)
            .bind(&trattamento.note)
            .execute(pool)
            .await?;
        }
    }

    // Recupera il pacchetto aggiornato
    let p = sqlx::query_as::<_, PacchettoTrattamento>(
        "SELECT * FROM pacchetti_trattamenti WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;

    let trattamenti_result = sqlx::query_as::<_, TrattamentoIncluso>(
        r#"
        SELECT pti.id, pti.trattamento_id, t.nome AS trattamento_nome, pti.ordine, pti.note
        FROM pacchetto_trattamenti_inclusi pti
        JOIN trattamenti t ON t.id = pti.trattamento_id
        WHERE pti.pacchetto_id = ?
        ORDER BY pti.ordine
        "#,
    )
    .bind(&id)
    .fetch_all(pool)
    .await?;

    Ok(PacchettoConTrattamenti {
        id: p.id,
        nome: p.nome,
        descrizione: p.descrizione,
        prezzo_totale: p.prezzo_totale,
        num_sedute: p.num_sedute,
        tipo_pagamento: p.tipo_pagamento,
        attivo: p.attivo,
        created_at: p.created_at,
        updated_at: p.updated_at,
        trattamenti_inclusi: trattamenti_result,
    })
}

/// 5. Elimina un pacchetto template (solo se non ci sono pacchetti cliente attivi)
#[tauri::command]
pub async fn delete_pacchetto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // Verifica che non ci siano pacchetti cliente attivi
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pacchetti_cliente WHERE pacchetto_id = ? AND stato = 'attivo'"
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;

    if count > 0 {
        return Err(AppError::InvalidInput(
            format!("Impossibile eliminare il pacchetto: ci sono {} pacchetti cliente attivi associati. Disattivalo invece di eliminarlo.", count)
        ));
    }

    // Rimuovi prima i trattamenti inclusi
    sqlx::query("DELETE FROM pacchetto_trattamenti_inclusi WHERE pacchetto_id = ?")
        .bind(&id)
        .execute(pool)
        .await?;

    // Rimuovi il pacchetto template
    let result = sqlx::query("DELETE FROM pacchetti_trattamenti WHERE id = ?")
        .bind(&id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Pacchetto non trovato".to_string()));
    }

    Ok(())
}

// ============================================
// COMANDI - Pacchetti cliente
// ============================================

/// 6. Lista pacchetti di un cliente (con nome pacchetto e progresso)
#[tauri::command]
pub async fn get_pacchetti_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    cliente_id: String,
    stato: Option<String>,
) -> AppResult<Vec<PacchettoCliente>> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    let mut query = String::from(
        r#"
        SELECT pc.*, pt.nome AS pacchetto_nome
        FROM pacchetti_cliente pc
        JOIN pacchetti_trattamenti pt ON pt.id = pc.pacchetto_id
        WHERE pc.cliente_id = ?
        "#
    );

    let mut bind_stato: Option<String> = None;

    if let Some(ref s) = stato {
        query.push_str(" AND pc.stato = ?");
        bind_stato = Some(s.clone());
    }

    query.push_str(" ORDER BY pc.created_at DESC");

    let mut sql_query = sqlx::query_as::<_, PacchettoClienteRow>(&query);
    sql_query = sql_query.bind(&cliente_id);
    if let Some(ref s) = bind_stato {
        sql_query = sql_query.bind(s);
    }

    let rows = sql_query.fetch_all(pool).await?;

    let result = rows.into_iter().map(|row| {
        let percentuale = if row.sedute_totali > 0 {
            (row.sedute_completate as f64 / row.sedute_totali as f64) * 100.0
        } else {
            0.0
        };
        let rimanente = row.importo_totale - row.importo_pagato;

        PacchettoCliente {
            id: row.id,
            pacchetto_id: row.pacchetto_id,
            cliente_id: row.cliente_id,
            data_inizio: row.data_inizio,
            data_fine: row.data_fine,
            sedute_totali: row.sedute_totali,
            sedute_completate: row.sedute_completate,
            importo_totale: row.importo_totale,
            importo_pagato: row.importo_pagato,
            stato: row.stato,
            note: row.note,
            created_at: row.created_at,
            updated_at: row.updated_at,
            pacchetto_nome: row.pacchetto_nome,
            tipo_pagamento: row.tipo_pagamento,
            percentuale_completamento: percentuale,
            importo_rimanente: if rimanente > 0.0 { rimanente } else { 0.0 },
        }
    }).collect();

    Ok(result)
}

/// 7. Assegna un pacchetto a un cliente (crea pacchetti_cliente + sedute vuote)
#[tauri::command]
pub async fn assegna_pacchetto_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: AssegnaPacchettoInput,
) -> AppResult<PacchettoCliente> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // Verifica che il pacchetto template esista e sia attivo
    let pacchetto = sqlx::query_as::<_, PacchettoTrattamento>(
        "SELECT * FROM pacchetti_trattamenti WHERE id = ? AND attivo = 1"
    )
    .bind(&input.pacchetto_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Pacchetto non trovato o non attivo".to_string()))?;

    // Verifica che il cliente esista
    let cliente_exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM clienti WHERE id = ?"
    )
    .bind(&input.cliente_id)
    .fetch_one(pool)
    .await?;

    if cliente_exists == 0 {
        return Err(AppError::NotFound("Cliente non trovato".to_string()));
    }

    let pc_id = generate_uuid();
    let importo_totale = input.importo_totale.unwrap_or(pacchetto.prezzo_totale);
    let sedute_totali = pacchetto.num_sedute;

    // Crea il pacchetto cliente
    sqlx::query(
        r#"
        INSERT INTO pacchetti_cliente (
            id, pacchetto_id, cliente_id, data_inizio, data_fine,
            sedute_totali, sedute_completate, importo_totale, importo_pagato,
            stato, tipo_pagamento, note, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, 0.0, 'attivo', ?8, ?9, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&pc_id)
    .bind(&input.pacchetto_id)
    .bind(&input.cliente_id)
    .bind(&input.data_inizio)
    .bind(&input.data_fine)
    .bind(sedute_totali)
    .bind(importo_totale)
    .bind(input.tipo_pagamento.as_deref().unwrap_or("anticipo"))
    .bind(&input.note)
    .execute(pool)
    .await?;

    // Crea le sedute vuote (pianificate)
    for i in 1..=sedute_totali {
        let seduta_id = generate_uuid();

        sqlx::query(
            r#"
            INSERT INTO pacchetto_sedute (id, pacchetto_cliente_id, numero_seduta, stato, created_at)
            VALUES (?1, ?2, ?3, 'pianificata', datetime('now'))
            "#,
        )
        .bind(&seduta_id)
        .bind(&pc_id)
        .bind(i)
        .execute(pool)
        .await?;
    }

    // Recupera il record creato con il nome del pacchetto
    let row = sqlx::query_as::<_, PacchettoClienteRow>(
        r#"
        SELECT pc.*, pt.nome AS pacchetto_nome
        FROM pacchetti_cliente pc
        JOIN pacchetti_trattamenti pt ON pt.id = pc.pacchetto_id
        WHERE pc.id = ?
        "#,
    )
    .bind(&pc_id)
    .fetch_one(pool)
    .await?;

    Ok(PacchettoCliente {
        id: row.id,
        pacchetto_id: row.pacchetto_id,
        cliente_id: row.cliente_id,
        data_inizio: row.data_inizio,
        data_fine: row.data_fine,
        sedute_totali: row.sedute_totali,
        sedute_completate: row.sedute_completate,
        importo_totale: row.importo_totale,
        importo_pagato: row.importo_pagato,
        stato: row.stato,
        note: row.note,
        created_at: row.created_at,
        updated_at: row.updated_at,
        pacchetto_nome: row.pacchetto_nome,
        tipo_pagamento: row.tipo_pagamento,
        percentuale_completamento: 0.0,
        importo_rimanente: row.importo_totale,
    })
}

/// 8. Registra una seduta come completata (collega ad appuntamento, incrementa sedute_completate)
#[tauri::command]
pub async fn registra_seduta(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: RegistraSedutaInput,
) -> AppResult<PacchettoSeduta> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // Verifica che il pacchetto cliente esista e sia attivo
    let pc: PacchettoTrattamento = sqlx::query_as::<_, PacchettoTrattamento>(
        "SELECT pt.* FROM pacchetti_cliente pc JOIN pacchetti_trattamenti pt ON pt.id = pc.pacchetto_id WHERE pc.id = ?"
    )
    .bind(&input.pacchetto_cliente_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Pacchetto cliente non trovato".to_string()))?;

    let pc_stato: String = sqlx::query_scalar(
        "SELECT stato FROM pacchetti_cliente WHERE id = ?"
    )
    .bind(&input.pacchetto_cliente_id)
    .fetch_one(pool)
    .await?;

    if pc_stato != "attivo" {
        return Err(AppError::InvalidInput(
            format!("Impossibile registrare la seduta: il pacchetto è nello stato '{}'", pc_stato)
        ));
    }

    // Trova la seduta corrispondente
    let seduta = sqlx::query_as::<_, PacchettoSeduta>(
        r#"
        SELECT * FROM pacchetto_sedute
        WHERE pacchetto_cliente_id = ? AND numero_seduta = ?
        "#,
    )
    .bind(&input.pacchetto_cliente_id)
    .bind(input.numero_seduta)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(
        format!("Seduta numero {} non trovata", input.numero_seduta)
    ))?;

    if seduta.stato == "completata" {
        return Err(AppError::InvalidInput("Questa seduta è già stata completata".to_string()));
    }

    // Aggiorna la seduta
    sqlx::query(
        r#"
        UPDATE pacchetto_sedute
        SET stato = 'completata', appuntamento_id = ?, note = ?
        WHERE id = ?
        "#,
    )
    .bind(&input.appuntamento_id)
    .bind(&input.note)
    .bind(&seduta.id)
    .execute(pool)
    .await?;

    // Incrementa sedute_completate nel pacchetto cliente
    sqlx::query(
        r#"
        UPDATE pacchetti_cliente
        SET sedute_completate = sedute_completate + 1, updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&input.pacchetto_cliente_id)
    .execute(pool)
    .await?;

    // Controlla se il pacchetto è completato
    let sedute_info = sqlx::query_as::<_, SeduteInfo>(
        "SELECT sedute_totali, sedute_completate FROM pacchetti_cliente WHERE id = ?"
    )
    .bind(&input.pacchetto_cliente_id)
    .fetch_one(pool)
    .await?;

    if sedute_info.sedute_completate >= sedute_info.sedute_totali {
        sqlx::query(
            "UPDATE pacchetti_cliente SET stato = 'completato', updated_at = datetime('now') WHERE id = ?"
        )
        .bind(&input.pacchetto_cliente_id)
        .execute(pool)
        .await?;
    }

    // Recupera la seduta aggiornata
    let updated_seduta = sqlx::query_as::<_, PacchettoSeduta>(
        "SELECT * FROM pacchetto_sedute WHERE id = ?"
    )
    .bind(&seduta.id)
    .fetch_one(pool)
    .await?;

    Ok(updated_seduta)
}

// Helper struct per il check completamento
#[derive(Debug, FromRow)]
struct SeduteInfo {
    pub sedute_totali: i64,
    pub sedute_completate: i64,
}

/// 9. Registra un pagamento su un pacchetto cliente (incrementa importo_pagato)
#[tauri::command]
pub async fn registra_pagamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: RegistraPagamentoInput,
) -> AppResult<PacchettoCliente> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    if input.importo <= 0.0 {
        return Err(AppError::InvalidInput("L'importo deve essere maggiore di zero".to_string()));
    }

    // Verifica che il pacchetto cliente esista
    let row = sqlx::query_as::<_, PacchettoClienteRow>(
        r#"
        SELECT pc.*, pt.nome AS pacchetto_nome
        FROM pacchetti_cliente pc
        JOIN pacchetti_trattamenti pt ON pt.id = pc.pacchetto_id
        WHERE pc.id = ?
        "#,
    )
    .bind(&input.pacchetto_cliente_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Pacchetto cliente non trovato".to_string()))?;

    let nuovo_importo_pagato = row.importo_pagato + input.importo;

    if nuovo_importo_pagato > row.importo_totale {
        return Err(AppError::InvalidInput(
            format!(
                "L'importo supera il totale dovuto. Rimanente: {:.2}",
                row.importo_totale - row.importo_pagato
            )
        ));
    }

    // Aggiorna importo_pagato
    sqlx::query(
        "UPDATE pacchetti_cliente SET importo_pagato = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(nuovo_importo_pagato)
    .bind(&input.pacchetto_cliente_id)
    .execute(pool)
    .await?;

    // Recupera il record aggiornato
    let updated_row = sqlx::query_as::<_, PacchettoClienteRow>(
        r#"
        SELECT pc.*, pt.nome AS pacchetto_nome
        FROM pacchetti_cliente pc
        JOIN pacchetti_trattamenti pt ON pt.id = pc.pacchetto_id
        WHERE pc.id = ?
        "#,
    )
    .bind(&input.pacchetto_cliente_id)
    .fetch_one(pool)
    .await?;

    let percentuale = if updated_row.sedute_totali > 0 {
        (updated_row.sedute_completate as f64 / updated_row.sedute_totali as f64) * 100.0
    } else {
        0.0
    };
    let rimanente = updated_row.importo_totale - updated_row.importo_pagato;

    Ok(PacchettoCliente {
        id: updated_row.id,
        pacchetto_id: updated_row.pacchetto_id,
        cliente_id: updated_row.cliente_id,
        data_inizio: updated_row.data_inizio,
        data_fine: updated_row.data_fine,
        sedute_totali: updated_row.sedute_totali,
        sedute_completate: updated_row.sedute_completate,
        importo_totale: updated_row.importo_totale,
        importo_pagato: updated_row.importo_pagato,
        stato: updated_row.stato,
        note: updated_row.note,
        created_at: updated_row.created_at,
        updated_at: updated_row.updated_at,
        pacchetto_nome: updated_row.pacchetto_nome,
        tipo_pagamento: updated_row.tipo_pagamento,
        percentuale_completamento: percentuale,
        importo_rimanente: if rimanente > 0.0 { rimanente } else { 0.0 },
    })
}

/// 10. Annulla un'assegnazione pacchetto cliente (cambia stato a 'annullato')
#[tauri::command]
pub async fn annulla_pacchetto_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    pacchetto_cliente_id: String,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // Verifica che esista e non sia già annullato
    let stato: String = sqlx::query_scalar(
        "SELECT stato FROM pacchetti_cliente WHERE id = ?"
    )
    .bind(&pacchetto_cliente_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Pacchetto cliente non trovato".to_string()))?;

    if stato == "annullato" {
        return Err(AppError::InvalidInput("Il pacchetto è già stato annullato".to_string()));
    }

    sqlx::query(
        "UPDATE pacchetti_cliente SET stato = 'annullato', updated_at = datetime('now') WHERE id = ?"
    )
    .bind(&pacchetto_cliente_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// 11. Aggiorna un pacchetto cliente (note, importo)
#[tauri::command]
pub async fn update_pacchetto_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: UpdatePacchettoClienteInput,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // Verifica che esista
    let _exists: String = sqlx::query_scalar(
        "SELECT id FROM pacchetti_cliente WHERE id = ?"
    )
    .bind(&input.pacchetto_cliente_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Pacchetto cliente non trovato".to_string()))?;

    let mut updates = vec!["updated_at = datetime('now')".to_string()];
    if let Some(importo) = input.importo_totale {
        updates.push(format!("importo_totale = {}", importo));
    }
    if let Some(ref note) = input.note {
        updates.push(format!("note = '{}'", note.replace('\'', "''")));
    }
    if let Some(ref stato) = input.stato {
        updates.push(format!("stato = '{}'", stato));
    }

    let sql = format!(
        "UPDATE pacchetti_cliente SET {} WHERE id = ?",
        updates.join(", ")
    );
    sqlx::query(&sql)
        .bind(&input.pacchetto_cliente_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// 12. Get sedute di un pacchetto cliente
#[tauri::command]
pub async fn get_sedute_pacchetto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    pacchetto_cliente_id: String,
) -> AppResult<Vec<PacchettoSeduta>> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    let sedute = sqlx::query_as::<_, PacchettoSeduta>(
        r#"
        SELECT ps.id, ps.pacchetto_cliente_id, ps.appuntamento_id, ps.numero_seduta,
               ps.stato, ps.note, ps.created_at,
               a.data_ora_inizio AS appuntamento_data,
               a.stato AS appuntamento_stato,
               ps.importo_pagato,
               ps.data_prevista
        FROM pacchetto_sedute ps
        LEFT JOIN appuntamenti a ON a.id = ps.appuntamento_id
        WHERE ps.pacchetto_cliente_id = ?
        ORDER BY ps.numero_seduta ASC
        "#
    )
    .bind(&pacchetto_cliente_id)
    .fetch_all(pool)
    .await?;

    Ok(sedute)
}

/// 13. Get seduta collegata a un appuntamento (per edit mode)
#[tauri::command]
pub async fn get_seduta_by_appuntamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    appuntamento_id: String,
) -> AppResult<Option<SedutaConPacchetto>> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    let result = sqlx::query_as::<_, SedutaConPacchetto>(
        r#"
        SELECT ps.id AS seduta_id, ps.pacchetto_cliente_id, pt.nome AS pacchetto_nome,
               ps.numero_seduta, pc.sedute_totali, pc.sedute_completate,
               pc.importo_totale, pc.importo_pagato, ps.stato AS stato_seduta, pc.stato AS stato_pacchetto
        FROM pacchetto_sedute ps
        JOIN pacchetti_cliente pc ON pc.id = ps.pacchetto_cliente_id
        JOIN pacchetti_trattamenti pt ON pt.id = pc.pacchetto_id
        WHERE ps.appuntamento_id = ?
        "#
    )
    .bind(&appuntamento_id)
    .fetch_optional(pool)
    .await?;

    Ok(result)
}

/// 14. Collega una seduta pianificata a un appuntamento (senza completarla)
#[tauri::command]
pub async fn collega_seduta_appuntamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    pacchetto_cliente_id: String,
    numero_seduta: i64,
    appuntamento_id: String,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    let rows_affected = sqlx::query(
        r#"
        UPDATE pacchetto_sedute SET appuntamento_id = ?
        WHERE pacchetto_cliente_id = ? AND numero_seduta = ? AND stato = 'pianificata' AND (appuntamento_id IS NULL OR appuntamento_id = '')
        "#
    )
    .bind(&appuntamento_id)
    .bind(&pacchetto_cliente_id)
    .bind(numero_seduta)
    .execute(pool)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::InvalidInput("Seduta non disponibile per il collegamento".to_string()));
    }

    Ok(())
}

/// 15. Scollega una seduta da un appuntamento (solo se ancora pianificata)
#[tauri::command]
pub async fn scollega_seduta_appuntamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    appuntamento_id: String,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    sqlx::query(
        "UPDATE pacchetto_sedute SET appuntamento_id = NULL WHERE appuntamento_id = ? AND stato = 'pianificata'"
    )
    .bind(&appuntamento_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// 16. Completa una seduta dato il suo ID direttamente
#[tauri::command]
pub async fn completa_seduta_by_id(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    seduta_id: String,
    appuntamento_id: Option<String>,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // Trova la seduta
    let seduta = sqlx::query_as::<_, PacchettoSeduta>(
        r#"
        SELECT ps.id, ps.pacchetto_cliente_id, ps.appuntamento_id, ps.numero_seduta,
               ps.stato, ps.note, ps.created_at, NULL AS appuntamento_data, NULL AS appuntamento_stato, ps.importo_pagato, ps.data_prevista
        FROM pacchetto_sedute ps WHERE ps.id = ?
        "#
    )
    .bind(&seduta_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Seduta non trovata".to_string()))?;

    if seduta.stato == "completata" {
        return Err(AppError::InvalidInput("La seduta è già stata completata".to_string()));
    }

    // Verifica che il pacchetto sia attivo
    let stato_pacchetto: String = sqlx::query_scalar(
        "SELECT stato FROM pacchetti_cliente WHERE id = ?"
    )
    .bind(&seduta.pacchetto_cliente_id)
    .fetch_one(pool)
    .await?;

    if stato_pacchetto != "attivo" {
        return Err(AppError::InvalidInput("Il pacchetto non è attivo".to_string()));
    }

    // Completa la seduta
    let app_id = appuntamento_id.or(seduta.appuntamento_id);
    sqlx::query(
        "UPDATE pacchetto_sedute SET stato = 'completata', appuntamento_id = ? WHERE id = ?"
    )
    .bind(&app_id)
    .bind(&seduta_id)
    .execute(pool)
    .await?;

    // Incrementa contatore
    sqlx::query(
        "UPDATE pacchetti_cliente SET sedute_completate = sedute_completate + 1, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(&seduta.pacchetto_cliente_id)
    .execute(pool)
    .await?;

    // Auto-completa pacchetto se tutte le sedute sono fatte
    let info: (i64, i64) = sqlx::query_as(
        "SELECT sedute_totali, sedute_completate FROM pacchetti_cliente WHERE id = ?"
    )
    .bind(&seduta.pacchetto_cliente_id)
    .fetch_one(pool)
    .await?;

    if info.1 >= info.0 {
        sqlx::query(
            "UPDATE pacchetti_cliente SET stato = 'completato', updated_at = datetime('now') WHERE id = ?"
        )
        .bind(&seduta.pacchetto_cliente_id)
        .execute(pool)
        .await?;
    }

    Ok(())
}

/// 17. Registra pagamento su una specifica seduta
#[tauri::command]
pub async fn registra_pagamento_seduta(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    seduta_id: String,
    importo: f64,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    if importo < 0.0 {
        return Err(AppError::InvalidInput("L'importo non può essere negativo".to_string()));
    }

    // Trova la seduta e il pacchetto_cliente_id
    let (pacchetto_cliente_id, old_importo): (String, f64) = sqlx::query_as(
        "SELECT pacchetto_cliente_id, importo_pagato FROM pacchetto_sedute WHERE id = ?"
    )
    .bind(&seduta_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Seduta non trovata".to_string()))?;

    // Aggiorna importo sulla seduta
    sqlx::query(
        "UPDATE pacchetto_sedute SET importo_pagato = ? WHERE id = ?"
    )
    .bind(importo)
    .bind(&seduta_id)
    .execute(pool)
    .await?;

    // Ricalcola il totale pagato sul pacchetto cliente (somma di tutte le sedute)
    let totale_pagato: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(importo_pagato), 0.0) FROM pacchetto_sedute WHERE pacchetto_cliente_id = ?"
    )
    .bind(&pacchetto_cliente_id)
    .fetch_one(pool)
    .await?;

    sqlx::query(
        "UPDATE pacchetti_cliente SET importo_pagato = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(totale_pagato)
    .bind(&pacchetto_cliente_id)
    .execute(pool)
    .await?;

    Ok(())
}

#[derive(Debug, Serialize, FromRow)]
pub struct PacchettoPagamento {
    pub id: String,
    pub pacchetto_cliente_id: String,
    pub importo: f64,
    pub tipo: String,
    pub note: Option<String>,
    pub created_at: String,
}

/// 18a. Aggiungi pagamento a un pacchetto (anticipo/dilazionato) con storico
#[tauri::command]
pub async fn aggiungi_pagamento_pacchetto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    pacchetto_cliente_id: String,
    importo: f64,
    tipo: Option<String>,
    note: Option<String>,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    if importo <= 0.0 {
        return Err(AppError::InvalidInput("L'importo deve essere maggiore di zero".to_string()));
    }

    let pag_id = generate_uuid();
    let tipo_val = tipo.unwrap_or_else(|| "pagamento".to_string());

    sqlx::query(
        "INSERT INTO pacchetto_pagamenti (id, pacchetto_cliente_id, importo, tipo, note, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
    )
    .bind(&pag_id)
    .bind(&pacchetto_cliente_id)
    .bind(importo)
    .bind(&tipo_val)
    .bind(&note)
    .execute(pool)
    .await?;

    // Ricalcola totale pagato
    let totale: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(importo), 0.0) FROM pacchetto_pagamenti WHERE pacchetto_cliente_id = ?"
    )
    .bind(&pacchetto_cliente_id)
    .fetch_one(pool)
    .await?;

    // Aggiungi anche i pagamenti per seduta
    let totale_sedute: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(importo_pagato), 0.0) FROM pacchetto_sedute WHERE pacchetto_cliente_id = ?"
    )
    .bind(&pacchetto_cliente_id)
    .fetch_one(pool)
    .await?;

    sqlx::query(
        "UPDATE pacchetti_cliente SET importo_pagato = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(totale + totale_sedute)
    .bind(&pacchetto_cliente_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// 18b. Lista pagamenti di un pacchetto
#[tauri::command]
pub async fn get_pagamenti_pacchetto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    pacchetto_cliente_id: String,
) -> AppResult<Vec<PacchettoPagamento>> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    let pagamenti = sqlx::query_as::<_, PacchettoPagamento>(
        "SELECT * FROM pacchetto_pagamenti WHERE pacchetto_cliente_id = ? ORDER BY created_at DESC"
    )
    .bind(&pacchetto_cliente_id)
    .fetch_all(pool)
    .await?;

    Ok(pagamenti)
}

/// 18c. Elimina fisicamente un'assegnazione pacchetto-cliente e le sue sedute
#[tauri::command]
pub async fn elimina_pacchetto_cliente(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    pacchetto_cliente_id: String,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // Scollega le sedute dagli appuntamenti prima
    sqlx::query(
        "UPDATE pacchetto_sedute SET appuntamento_id = NULL WHERE pacchetto_cliente_id = ?"
    )
    .bind(&pacchetto_cliente_id)
    .execute(pool)
    .await?;

    // Elimina sedute (CASCADE dovrebbe farlo, ma per sicurezza)
    sqlx::query("DELETE FROM pacchetto_sedute WHERE pacchetto_cliente_id = ?")
        .bind(&pacchetto_cliente_id)
        .execute(pool)
        .await?;

    // Elimina l'assegnazione
    sqlx::query("DELETE FROM pacchetti_cliente WHERE id = ?")
        .bind(&pacchetto_cliente_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// 19. Aggiorna la data prevista di una seduta
#[tauri::command]
pub async fn aggiorna_data_prevista_seduta(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    seduta_id: String,
    data_prevista: Option<String>,
) -> AppResult<()> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    sqlx::query(
        "UPDATE pacchetto_sedute SET data_prevista = ? WHERE id = ?"
    )
    .bind(&data_prevista)
    .bind(&seduta_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// 19. Dashboard statistiche pacchetti
#[tauri::command]
pub async fn get_dashboard_pacchetti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<DashboardPacchetti> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // Pacchetti cliente attivi
    let pacchetti_attivi: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pacchetti_cliente WHERE stato = 'attivo'"
    )
    .fetch_one(pool)
    .await?;

    // Tasso di completamento (media delle percentuali di completamento di tutti i pacchetti non annullati)
    let tasso_completamento: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(
            AVG(CASE WHEN sedute_totali > 0 THEN (CAST(sedute_completate AS REAL) / sedute_totali) * 100.0 ELSE 0.0 END),
            0.0
        )
        FROM pacchetti_cliente
        WHERE stato IN ('attivo', 'completato')
        "#
    )
    .fetch_one(pool)
    .await?;

    // Ricavo totale dai pacchetti (importo_totale di tutti i pacchetti non annullati)
    let ricavo_pacchetti: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(importo_totale), 0.0)
        FROM pacchetti_cliente
        WHERE stato IN ('attivo', 'completato')
        "#
    )
    .fetch_one(pool)
    .await?;

    // Ricavo effettivamente incassato
    let ricavo_incassato: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(importo_pagato), 0.0)
        FROM pacchetti_cliente
        WHERE stato IN ('attivo', 'completato')
        "#
    )
    .fetch_one(pool)
    .await?;

    Ok(DashboardPacchetti {
        pacchetti_attivi,
        tasso_completamento,
        ricavo_pacchetti,
        ricavo_incassato,
    })
}
