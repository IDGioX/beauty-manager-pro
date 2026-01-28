// Comandi per magazzino
use crate::error::{AppError, AppResult};
use crate::models::{
    CategoriaProdotto, CreateCategoriaProdottoInput, UpdateCategoriaProdottoInput,
    Prodotto, ProdottoWithCategoria, CreateProdottoInput, UpdateProdottoInput,
    MovimentoMagazzino, MovimentoWithDetails,
    CreateCaricoInput, CreateScaricoInput, CreateInventarioInput, CreateResoInput,
    FiltriMovimenti, AlertProdotto, AlertCount, ReportConsumiResult, ValoreMagazzino
};
use std::sync::Arc;
use tokio::sync::Mutex;

// ============================================================================
// CATEGORIE PRODOTTI
// ============================================================================

#[tauri::command]
pub async fn get_categorie_prodotti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<Vec<CategoriaProdotto>> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, CategoriaProdotto>(
        "SELECT * FROM categorie_prodotti ORDER BY nome"
    )
    .fetch_all(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn create_categoria_prodotto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateCategoriaProdottoInput,
) -> AppResult<CategoriaProdotto> {
    let state = db.lock().await;

    // Genera codice categoria
    let codice_result = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(MAX(CAST(substr(codice, 5) AS INTEGER)), 0) + 1
         FROM categorie_prodotti WHERE codice LIKE 'CPRD%'"
    )
    .fetch_one(&state.db.pool)
    .await?;

    let codice = format!("CPRD{:03}", codice_result);

    sqlx::query(
        r#"
        INSERT INTO categorie_prodotti (codice, nome, tipo)
        VALUES (?1, ?2, ?3)
        "#,
    )
    .bind(&codice)
    .bind(&input.nome)
    .bind(&input.tipo)
    .execute(&state.db.pool)
    .await?;

    let categoria = sqlx::query_as::<_, CategoriaProdotto>(
        "SELECT * FROM categorie_prodotti WHERE codice = ?"
    )
    .bind(&codice)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(categoria)
}

#[tauri::command]
pub async fn update_categoria_prodotto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    input: UpdateCategoriaProdottoInput,
) -> AppResult<CategoriaProdotto> {
    let state = db.lock().await;

    let mut updates = Vec::new();

    if input.nome.is_some() {
        updates.push("nome = ?");
    }
    if input.tipo.is_some() {
        updates.push("tipo = ?");
    }

    if updates.is_empty() {
        return Err(AppError::InvalidInput("Nessun aggiornamento fornito".to_string()));
    }

    let query_str = format!(
        "UPDATE categorie_prodotti SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);

    if let Some(nome) = &input.nome {
        query = query.bind(nome);
    }
    if let Some(tipo) = &input.tipo {
        query = query.bind(tipo);
    }

    query = query.bind(&id);
    query.execute(&state.db.pool).await?;

    let categoria = sqlx::query_as::<_, CategoriaProdotto>(
        "SELECT * FROM categorie_prodotti WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(categoria)
}

#[tauri::command]
pub async fn delete_categoria_prodotto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Verifica se ci sono prodotti associati
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM prodotti WHERE categoria_id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    if count > 0 {
        return Err(AppError::InvalidInput(
            format!("Impossibile eliminare la categoria: {} prodotti associati", count)
        ));
    }

    sqlx::query("DELETE FROM categorie_prodotti WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    Ok(())
}

// ============================================================================
// PRODOTTI
// ============================================================================

#[tauri::command]
pub async fn get_prodotti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    search: Option<String>,
    categoria_id: Option<String>,
    attivo_only: Option<bool>,
    solo_sotto_scorta: Option<bool>,
    solo_in_scadenza: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> AppResult<Vec<ProdottoWithCategoria>> {
    println!("DEBUG get_prodotti: starting...");
    let state = db.lock().await;
    println!("DEBUG get_prodotti: got lock");

    let mut query = String::from(
        "SELECT p.id, p.codice, p.barcode, p.categoria_id, p.nome, p.descrizione,
                p.marca, p.linea, p.unita_misura, p.capacita, p.giacenza,
                p.scorta_minima, p.scorta_riordino, p.prezzo_acquisto, p.prezzo_vendita,
                p.uso, p.attivo, p.data_scadenza, p.note, p.created_at, p.updated_at,
                c.nome as categoria_nome, c.tipo as categoria_tipo
         FROM prodotti p
         LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
         WHERE 1=1"
    );

    if let Some(ref s) = search {
        let search_lower = s.to_lowercase();
        query.push_str(&format!(
            " AND (LOWER(p.nome) LIKE '%{}%' OR LOWER(p.codice) LIKE '%{}%' OR LOWER(p.barcode) LIKE '%{}%' OR LOWER(p.marca) LIKE '%{}%')",
            search_lower, search_lower, search_lower, search_lower
        ));
    }

    if let Some(cat_id) = &categoria_id {
        query.push_str(&format!(" AND p.categoria_id = '{}'", cat_id));
    }

    if attivo_only.unwrap_or(true) {
        query.push_str(" AND p.attivo = 1");
    }

    if solo_sotto_scorta.unwrap_or(false) {
        query.push_str(" AND p.giacenza <= p.scorta_minima");
    }

    if solo_in_scadenza.unwrap_or(false) {
        query.push_str(" AND p.data_scadenza IS NOT NULL AND date(p.data_scadenza) <= date('now', '+30 days')");
    }

    query.push_str(" ORDER BY p.nome");

    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
    }

    if let Some(off) = offset {
        query.push_str(&format!(" OFFSET {}", off));
    }

    println!("DEBUG get_prodotti: executing query: {}", query);
    let result = sqlx::query_as::<_, ProdottoWithCategoria>(&query)
        .fetch_all(&state.db.pool)
        .await;

    match &result {
        Ok(items) => println!("DEBUG get_prodotti: success, found {} items", items.len()),
        Err(e) => println!("DEBUG get_prodotti: ERROR: {:?}", e),
    }

    Ok(result?)
}

#[tauri::command]
pub async fn get_prodotto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<ProdottoWithCategoria> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, ProdottoWithCategoria>(
        "SELECT p.id, p.codice, p.barcode, p.categoria_id, p.nome, p.descrizione,
                p.marca, p.linea, p.unita_misura, p.capacita, p.giacenza,
                p.scorta_minima, p.scorta_riordino, p.prezzo_acquisto, p.prezzo_vendita,
                p.uso, p.attivo, p.data_scadenza, p.note, p.created_at, p.updated_at,
                c.nome as categoria_nome, c.tipo as categoria_tipo
         FROM prodotti p
         LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
         WHERE p.id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_prodotto_by_barcode(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    barcode: String,
) -> AppResult<ProdottoWithCategoria> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, ProdottoWithCategoria>(
        "SELECT p.id, p.codice, p.barcode, p.categoria_id, p.nome, p.descrizione,
                p.marca, p.linea, p.unita_misura, p.capacita, p.giacenza,
                p.scorta_minima, p.scorta_riordino, p.prezzo_acquisto, p.prezzo_vendita,
                p.uso, p.attivo, p.data_scadenza, p.note, p.created_at, p.updated_at,
                c.nome as categoria_nome, c.tipo as categoria_tipo
         FROM prodotti p
         LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
         WHERE p.barcode = ? AND p.attivo = 1"
    )
    .bind(&barcode)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn create_prodotto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateProdottoInput,
) -> AppResult<Prodotto> {
    let state = db.lock().await;

    // Genera codice prodotto
    let codice_result = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(MAX(CAST(substr(codice, 4) AS INTEGER)), 0) + 1
         FROM prodotti WHERE codice LIKE 'PRD%'"
    )
    .fetch_one(&state.db.pool)
    .await?;

    let codice = format!("PRD{:06}", codice_result);
    let unita_misura = input.unita_misura.unwrap_or_else(|| "pz".to_string());
    let giacenza = input.giacenza.unwrap_or(0.0);
    let scorta_minima = input.scorta_minima.unwrap_or(0.0);
    let scorta_riordino = input.scorta_riordino.unwrap_or(0.0);
    let uso = input.uso.unwrap_or_else(|| "interno".to_string());

    // Converte stringhe vuote in None per i campi opzionali
    let categoria_id = input.categoria_id.as_ref().filter(|s| !s.is_empty());
    let barcode = input.barcode.as_ref().filter(|s| !s.is_empty());
    let descrizione = input.descrizione.as_ref().filter(|s| !s.is_empty());
    let marca = input.marca.as_ref().filter(|s| !s.is_empty());
    let linea = input.linea.as_ref().filter(|s| !s.is_empty());
    let data_scadenza = input.data_scadenza.as_ref().filter(|s| !s.is_empty());
    let note = input.note.as_ref().filter(|s| !s.is_empty());

    sqlx::query(
        r#"
        INSERT INTO prodotti (
            codice, barcode, categoria_id, nome, descrizione, marca, linea,
            unita_misura, capacita, giacenza, scorta_minima, scorta_riordino,
            prezzo_acquisto, prezzo_vendita, uso, attivo, data_scadenza, note
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 1, ?16, ?17)
        "#,
    )
    .bind(&codice)
    .bind(barcode)
    .bind(categoria_id)
    .bind(&input.nome)
    .bind(descrizione)
    .bind(marca)
    .bind(linea)
    .bind(&unita_misura)
    .bind(input.capacita)
    .bind(giacenza)
    .bind(scorta_minima)
    .bind(scorta_riordino)
    .bind(input.prezzo_acquisto)
    .bind(input.prezzo_vendita)
    .bind(&uso)
    .bind(data_scadenza)
    .bind(note)
    .execute(&state.db.pool)
    .await?;

    let prodotto = sqlx::query_as::<_, Prodotto>("SELECT * FROM prodotti WHERE codice = ?")
        .bind(&codice)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(prodotto)
}

#[tauri::command]
pub async fn update_prodotto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    input: UpdateProdottoInput,
) -> AppResult<Prodotto> {
    let state = db.lock().await;

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn std::any::Any + Send>> = Vec::new();

    if input.nome.is_some() { updates.push("nome = ?"); }
    if input.categoria_id.is_some() { updates.push("categoria_id = ?"); }
    if input.barcode.is_some() { updates.push("barcode = ?"); }
    if input.descrizione.is_some() { updates.push("descrizione = ?"); }
    if input.marca.is_some() { updates.push("marca = ?"); }
    if input.linea.is_some() { updates.push("linea = ?"); }
    if input.unita_misura.is_some() { updates.push("unita_misura = ?"); }
    if input.capacita.is_some() { updates.push("capacita = ?"); }
    if input.scorta_minima.is_some() { updates.push("scorta_minima = ?"); }
    if input.scorta_riordino.is_some() { updates.push("scorta_riordino = ?"); }
    if input.prezzo_acquisto.is_some() { updates.push("prezzo_acquisto = ?"); }
    if input.prezzo_vendita.is_some() { updates.push("prezzo_vendita = ?"); }
    if input.uso.is_some() { updates.push("uso = ?"); }
    if input.data_scadenza.is_some() { updates.push("data_scadenza = ?"); }
    if input.note.is_some() { updates.push("note = ?"); }
    if input.attivo.is_some() { updates.push("attivo = ?"); }

    if updates.is_empty() {
        return Err(AppError::InvalidInput("Nessun aggiornamento fornito".to_string()));
    }

    let query_str = format!(
        "UPDATE prodotti SET {}, updated_at = datetime('now') WHERE id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);

    if let Some(nome) = &input.nome { query = query.bind(nome); }
    if let Some(categoria_id) = &input.categoria_id { query = query.bind(categoria_id); }
    if let Some(barcode) = &input.barcode { query = query.bind(barcode); }
    if let Some(descrizione) = &input.descrizione { query = query.bind(descrizione); }
    if let Some(marca) = &input.marca { query = query.bind(marca); }
    if let Some(linea) = &input.linea { query = query.bind(linea); }
    if let Some(unita_misura) = &input.unita_misura { query = query.bind(unita_misura); }
    if let Some(capacita) = input.capacita { query = query.bind(capacita); }
    if let Some(scorta_minima) = input.scorta_minima { query = query.bind(scorta_minima); }
    if let Some(scorta_riordino) = input.scorta_riordino { query = query.bind(scorta_riordino); }
    if let Some(prezzo_acquisto) = input.prezzo_acquisto { query = query.bind(prezzo_acquisto); }
    if let Some(prezzo_vendita) = input.prezzo_vendita { query = query.bind(prezzo_vendita); }
    if let Some(uso) = &input.uso { query = query.bind(uso); }
    if let Some(data_scadenza) = &input.data_scadenza { query = query.bind(data_scadenza); }
    if let Some(note) = &input.note { query = query.bind(note); }
    if let Some(attivo) = input.attivo {
        let attivo_int: i64 = if attivo { 1 } else { 0 };
        query = query.bind(attivo_int);
    }

    query = query.bind(&id);
    query.execute(&state.db.pool).await?;

    let prodotto = sqlx::query_as::<_, Prodotto>("SELECT * FROM prodotti WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(prodotto)
}

#[tauri::command]
pub async fn deactivate_prodotto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    sqlx::query("UPDATE prodotti SET attivo = 0, updated_at = datetime('now') WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn reactivate_prodotto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    sqlx::query("UPDATE prodotti SET attivo = 1, updated_at = datetime('now') WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn delete_prodotto(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Verifica se ci sono movimenti associati
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM movimenti_magazzino WHERE prodotto_id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    if count > 0 {
        return Err(AppError::InvalidInput(
            format!("Impossibile eliminare il prodotto: {} movimenti associati. Disattivalo invece.", count)
        ));
    }

    sqlx::query("DELETE FROM prodotti WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    Ok(())
}

// ============================================================================
// MOVIMENTI MAGAZZINO
// ============================================================================

#[tauri::command]
pub async fn get_movimenti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    filtri: FiltriMovimenti,
    limit: Option<i32>,
    offset: Option<i32>,
) -> AppResult<Vec<MovimentoWithDetails>> {
    let state = db.lock().await;

    let mut query = String::from(
        "SELECT
            m.id,
            m.prodotto_id,
            m.tipo,
            m.quantita,
            m.giacenza_risultante,
            m.appuntamento_id,
            m.operatrice_id,
            m.cliente_id,
            m.fornitore,
            m.documento_riferimento,
            m.prezzo_unitario,
            m.lotto,
            m.data_scadenza,
            m.note,
            m.created_at,
            p.nome as prodotto_nome,
            p.codice as prodotto_codice,
            o.nome || ' ' || o.cognome as operatrice_nome,
            cl.nome || ' ' || cl.cognome as cliente_nome
         FROM movimenti_magazzino m
         LEFT JOIN prodotti p ON m.prodotto_id = p.id
         LEFT JOIN operatrici o ON m.operatrice_id = o.id
         LEFT JOIN clienti cl ON m.cliente_id = cl.id
         WHERE 1=1"
    );

    if let Some(ref prodotto_id) = filtri.prodotto_id {
        query.push_str(&format!(" AND m.prodotto_id = '{}'", prodotto_id));
    }

    if let Some(ref tipo) = filtri.tipo {
        query.push_str(&format!(" AND m.tipo = '{}'", tipo));
    }

    if let Some(ref data_da) = filtri.data_da {
        query.push_str(&format!(" AND date(m.created_at) >= '{}'", data_da));
    }

    if let Some(ref data_a) = filtri.data_a {
        query.push_str(&format!(" AND date(m.created_at) <= '{}'", data_a));
    }

    if let Some(ref operatrice_id) = filtri.operatrice_id {
        query.push_str(&format!(" AND m.operatrice_id = '{}'", operatrice_id));
    }

    if let Some(ref cliente_id) = filtri.cliente_id {
        query.push_str(&format!(" AND m.cliente_id = '{}'", cliente_id));
    }

    if let Some(ref fornitore) = filtri.fornitore {
        query.push_str(&format!(" AND LOWER(m.fornitore) LIKE '%{}%'", fornitore.to_lowercase()));
    }

    query.push_str(" ORDER BY m.created_at DESC");

    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
    }

    if let Some(off) = offset {
        query.push_str(&format!(" OFFSET {}", off));
    }

    let result = sqlx::query_as::<_, MovimentoWithDetails>(&query)
        .fetch_all(&state.db.pool)
        .await?;

    Ok(result)
}

#[tauri::command]
pub async fn registra_carico(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateCaricoInput,
) -> AppResult<MovimentoMagazzino> {
    let state = db.lock().await;

    // Ottieni giacenza attuale
    let giacenza_attuale: f64 = sqlx::query_scalar(
        "SELECT giacenza FROM prodotti WHERE id = ?"
    )
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    let nuova_giacenza = giacenza_attuale + input.quantita;

    // Inserisci movimento
    sqlx::query(
        r#"
        INSERT INTO movimenti_magazzino (
            prodotto_id, tipo, quantita, giacenza_risultante,
            fornitore, documento_riferimento, prezzo_unitario, lotto, data_scadenza, note
        )
        VALUES (?1, 'carico', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        "#,
    )
    .bind(&input.prodotto_id)
    .bind(input.quantita)
    .bind(nuova_giacenza)
    .bind(&input.fornitore)
    .bind(&input.documento_riferimento)
    .bind(input.prezzo_unitario)
    .bind(&input.lotto)
    .bind(&input.data_scadenza)
    .bind(&input.note)
    .execute(&state.db.pool)
    .await?;

    // Aggiorna giacenza prodotto
    sqlx::query("UPDATE prodotti SET giacenza = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(nuova_giacenza)
        .bind(&input.prodotto_id)
        .execute(&state.db.pool)
        .await?;

    // Aggiorna data scadenza prodotto se fornita
    if let Some(ref data_scadenza) = input.data_scadenza {
        sqlx::query("UPDATE prodotti SET data_scadenza = ? WHERE id = ? AND (data_scadenza IS NULL OR data_scadenza > ?)")
            .bind(data_scadenza)
            .bind(&input.prodotto_id)
            .bind(data_scadenza)
            .execute(&state.db.pool)
            .await?;
    }

    // Recupera movimento
    let movimento = sqlx::query_as::<_, MovimentoMagazzino>(
        "SELECT * FROM movimenti_magazzino WHERE prodotto_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(movimento)
}

#[tauri::command]
pub async fn registra_scarico(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateScaricoInput,
) -> AppResult<MovimentoMagazzino> {
    let state = db.lock().await;

    // Verifica tipo valido
    if !["scarico_uso", "scarico_vendita", "scarto"].contains(&input.tipo.as_str()) {
        return Err(AppError::InvalidInput(
            "Tipo scarico non valido. Usa: scarico_uso, scarico_vendita, scarto".to_string()
        ));
    }

    // Ottieni giacenza attuale
    let giacenza_attuale: f64 = sqlx::query_scalar(
        "SELECT giacenza FROM prodotti WHERE id = ?"
    )
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    if input.quantita > giacenza_attuale {
        return Err(AppError::InvalidInput(
            format!("Quantita insufficiente. Giacenza attuale: {}", giacenza_attuale)
        ));
    }

    let nuova_giacenza = giacenza_attuale - input.quantita;

    // Inserisci movimento
    sqlx::query(
        r#"
        INSERT INTO movimenti_magazzino (
            prodotto_id, tipo, quantita, giacenza_risultante,
            operatrice_id, cliente_id, appuntamento_id, note
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#,
    )
    .bind(&input.prodotto_id)
    .bind(&input.tipo)
    .bind(input.quantita)
    .bind(nuova_giacenza)
    .bind(&input.operatrice_id)
    .bind(&input.cliente_id)
    .bind(&input.appuntamento_id)
    .bind(&input.note)
    .execute(&state.db.pool)
    .await?;

    // Aggiorna giacenza prodotto
    sqlx::query("UPDATE prodotti SET giacenza = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(nuova_giacenza)
        .bind(&input.prodotto_id)
        .execute(&state.db.pool)
        .await?;

    let movimento = sqlx::query_as::<_, MovimentoMagazzino>(
        "SELECT * FROM movimenti_magazzino WHERE prodotto_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(movimento)
}

#[tauri::command]
pub async fn registra_reso(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateResoInput,
) -> AppResult<MovimentoMagazzino> {
    let state = db.lock().await;

    // Ottieni giacenza attuale
    let giacenza_attuale: f64 = sqlx::query_scalar(
        "SELECT giacenza FROM prodotti WHERE id = ?"
    )
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    // Il reso aumenta la giacenza (rimette il prodotto in magazzino)
    let nuova_giacenza = giacenza_attuale + input.quantita;

    // Inserisci movimento di reso
    sqlx::query(
        r#"
        INSERT INTO movimenti_magazzino (
            prodotto_id, tipo, quantita, giacenza_risultante,
            operatrice_id, cliente_id, appuntamento_id, note
        )
        VALUES (?1, 'reso', ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
    )
    .bind(&input.prodotto_id)
    .bind(input.quantita)
    .bind(nuova_giacenza)
    .bind(&input.operatrice_id)
    .bind(&input.cliente_id)
    .bind(&input.appuntamento_id)
    .bind(&input.note)
    .execute(&state.db.pool)
    .await?;

    // Aggiorna giacenza prodotto
    sqlx::query("UPDATE prodotti SET giacenza = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(nuova_giacenza)
        .bind(&input.prodotto_id)
        .execute(&state.db.pool)
        .await?;

    let movimento = sqlx::query_as::<_, MovimentoMagazzino>(
        "SELECT * FROM movimenti_magazzino WHERE prodotto_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(movimento)
}

#[tauri::command]
pub async fn registra_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateInventarioInput,
) -> AppResult<MovimentoMagazzino> {
    let state = db.lock().await;

    // Ottieni giacenza attuale
    let giacenza_attuale: f64 = sqlx::query_scalar(
        "SELECT giacenza FROM prodotti WHERE id = ?"
    )
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    let differenza = input.nuova_giacenza - giacenza_attuale;

    // Inserisci movimento di inventario
    sqlx::query(
        r#"
        INSERT INTO movimenti_magazzino (
            prodotto_id, tipo, quantita, giacenza_risultante, note
        )
        VALUES (?1, 'inventario', ?2, ?3, ?4)
        "#,
    )
    .bind(&input.prodotto_id)
    .bind(differenza)
    .bind(input.nuova_giacenza)
    .bind(&input.note)
    .execute(&state.db.pool)
    .await?;

    // Aggiorna giacenza prodotto
    sqlx::query("UPDATE prodotti SET giacenza = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(input.nuova_giacenza)
        .bind(&input.prodotto_id)
        .execute(&state.db.pool)
        .await?;

    let movimento = sqlx::query_as::<_, MovimentoMagazzino>(
        "SELECT * FROM movimenti_magazzino WHERE prodotto_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(movimento)
}

// ============================================================================
// ALERT
// ============================================================================

#[tauri::command]
pub async fn get_alert_prodotti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<Vec<AlertProdotto>> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, AlertProdotto>(
        r#"
        SELECT
            id, codice, nome,
            CASE
                WHEN data_scadenza IS NOT NULL AND date(data_scadenza) < date('now') THEN 'scaduto'
                WHEN data_scadenza IS NOT NULL AND date(data_scadenza) <= date('now', '+30 days') THEN 'scadenza_vicina'
                WHEN giacenza <= scorta_minima THEN 'scorta_minima'
            END as tipo_alert,
            giacenza, scorta_minima, data_scadenza,
            CASE
                WHEN data_scadenza IS NOT NULL
                THEN CAST(julianday(data_scadenza) - julianday('now') AS INTEGER)
                ELSE NULL
            END as giorni_alla_scadenza
        FROM prodotti
        WHERE attivo = 1 AND (
            giacenza <= scorta_minima OR
            (data_scadenza IS NOT NULL AND date(data_scadenza) <= date('now', '+30 days'))
        )
        ORDER BY
            CASE
                WHEN data_scadenza IS NOT NULL AND date(data_scadenza) < date('now') THEN 1
                WHEN data_scadenza IS NOT NULL AND date(data_scadenza) <= date('now', '+30 days') THEN 2
                ELSE 3
            END,
            giacenza ASC
        "#
    )
    .fetch_all(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_alert_count(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<AlertCount> {
    let state = db.lock().await;

    let sotto_scorta: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM prodotti WHERE attivo = 1 AND giacenza <= scorta_minima"
    )
    .fetch_one(&state.db.pool)
    .await?;

    let in_scadenza: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM prodotti WHERE attivo = 1 AND data_scadenza IS NOT NULL AND date(data_scadenza) <= date('now', '+30 days') AND date(data_scadenza) >= date('now')"
    )
    .fetch_one(&state.db.pool)
    .await?;

    let scaduti: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM prodotti WHERE attivo = 1 AND data_scadenza IS NOT NULL AND date(data_scadenza) < date('now')"
    )
    .fetch_one(&state.db.pool)
    .await?;

    Ok(AlertCount {
        sotto_scorta,
        in_scadenza,
        scaduti,
    })
}

#[tauri::command]
pub async fn get_prodotti_sotto_scorta(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<Vec<ProdottoWithCategoria>> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, ProdottoWithCategoria>(
        "SELECT p.id, p.codice, p.barcode, p.categoria_id, p.nome, p.descrizione,
                p.marca, p.linea, p.unita_misura, p.capacita, p.giacenza,
                p.scorta_minima, p.scorta_riordino, p.prezzo_acquisto, p.prezzo_vendita,
                p.uso, p.attivo, p.data_scadenza, p.note, p.created_at, p.updated_at,
                c.nome as categoria_nome, c.tipo as categoria_tipo
         FROM prodotti p
         LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
         WHERE p.attivo = 1 AND p.giacenza <= p.scorta_minima
         ORDER BY p.giacenza ASC"
    )
    .fetch_all(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_prodotti_in_scadenza(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    giorni: Option<i32>,
) -> AppResult<Vec<ProdottoWithCategoria>> {
    let state = db.lock().await;
    let giorni_val = giorni.unwrap_or(30);

    let query = format!(
        "SELECT p.id, p.codice, p.barcode, p.categoria_id, p.nome, p.descrizione,
                p.marca, p.linea, p.unita_misura, p.capacita, p.giacenza,
                p.scorta_minima, p.scorta_riordino, p.prezzo_acquisto, p.prezzo_vendita,
                p.uso, p.attivo, p.data_scadenza, p.note, p.created_at, p.updated_at,
                c.nome as categoria_nome, c.tipo as categoria_tipo
         FROM prodotti p
         LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
         WHERE p.attivo = 1
           AND p.data_scadenza IS NOT NULL
           AND date(p.data_scadenza) <= date('now', '+{} days')
         ORDER BY p.data_scadenza ASC",
        giorni_val
    );

    let result = sqlx::query_as::<_, ProdottoWithCategoria>(&query)
        .fetch_all(&state.db.pool)
        .await?;

    Ok(result)
}

// ============================================================================
// REPORT
// ============================================================================

#[tauri::command]
pub async fn get_report_consumi(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    data_da: String,
    data_a: String,
    categoria_id: Option<String>,
    operatrice_id: Option<String>,
    tipo: Option<String>,
) -> AppResult<Vec<ReportConsumiResult>> {
    let state = db.lock().await;

    let mut query = String::from(
        r#"
        SELECT
            m.prodotto_id,
            p.nome as prodotto_nome,
            p.codice as prodotto_codice,
            c.nome as categoria_nome,
            SUM(m.quantita) as quantita_totale,
            SUM(m.quantita * COALESCE(m.prezzo_unitario, p.prezzo_acquisto, 0)) as valore_totale,
            COUNT(*) as numero_movimenti
        FROM movimenti_magazzino m
        JOIN prodotti p ON m.prodotto_id = p.id
        LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
        WHERE m.tipo IN ('scarico_uso', 'scarico_vendita', 'scarto')
          AND date(m.created_at) >= ?
          AND date(m.created_at) <= ?
        "#
    );

    if let Some(ref cat_id) = categoria_id {
        query.push_str(&format!(" AND p.categoria_id = '{}'", cat_id));
    }

    if let Some(ref op_id) = operatrice_id {
        query.push_str(&format!(" AND m.operatrice_id = '{}'", op_id));
    }

    if let Some(ref t) = tipo {
        if t == "consumo" {
            query.push_str(" AND m.tipo = 'scarico_uso'");
        } else if t == "vendita" {
            query.push_str(" AND m.tipo = 'scarico_vendita'");
        }
    }

    query.push_str(" GROUP BY m.prodotto_id ORDER BY quantita_totale DESC");

    let result = sqlx::query_as::<_, ReportConsumiResult>(&query)
        .bind(&data_da)
        .bind(&data_a)
        .fetch_all(&state.db.pool)
        .await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_valore_magazzino(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<ValoreMagazzino> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, ValoreMagazzino>(
        r#"
        SELECT
            SUM(giacenza * COALESCE(prezzo_acquisto, 0)) as valore_acquisto,
            SUM(giacenza * COALESCE(prezzo_vendita, 0)) as valore_vendita,
            COUNT(*) as totale_prodotti,
            SUM(giacenza) as totale_pezzi
        FROM prodotti
        WHERE attivo = 1
        "#
    )
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

// ============================================================================
// INVENTARIO
// ============================================================================

use crate::models::{
    Inventario, RigaInventarioWithProdotto,
    CreateSessioneInventarioInput, CreateRigaInventarioInput, UpdateRigaInventarioInput,
    InventarioRiepilogo
};

#[tauri::command]
pub async fn crea_sessione_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateSessioneInventarioInput,
) -> AppResult<Inventario> {
    let state = db.lock().await;
    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        r#"INSERT INTO inventari (id, codice, descrizione, note)
           VALUES (?, '', ?, ?)"#
    )
    .bind(&id)
    .bind(&input.descrizione)
    .bind(&input.note)
    .execute(&state.db.pool)
    .await?;

    let result = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_inventari(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    stato: Option<String>,
) -> AppResult<Vec<InventarioRiepilogo>> {
    let state = db.lock().await;

    let mut query = String::from(
        r#"SELECT
            i.id, i.codice, i.descrizione, i.data_inizio, i.stato,
            COUNT(r.id) as totale_righe,
            COALESCE(SUM(CASE WHEN r.differenza > 0 THEN r.differenza ELSE 0 END), 0) as totale_differenze_positive,
            COALESCE(SUM(CASE WHEN r.differenza < 0 THEN ABS(r.differenza) ELSE 0 END), 0) as totale_differenze_negative
        FROM inventari i
        LEFT JOIN righe_inventario r ON i.id = r.inventario_id
        WHERE 1=1"#
    );

    if let Some(ref s) = stato {
        query.push_str(&format!(" AND i.stato = '{}'", s));
    }

    query.push_str(" GROUP BY i.id ORDER BY i.data_inizio DESC");

    let result = sqlx::query_as::<_, InventarioRiepilogo>(&query)
        .fetch_all(&state.db.pool)
        .await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<Inventario> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_righe_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    inventario_id: String,
) -> AppResult<Vec<RigaInventarioWithProdotto>> {
    let state = db.lock().await;

    let result = sqlx::query_as::<_, RigaInventarioWithProdotto>(
        r#"SELECT
            r.id, r.inventario_id, r.prodotto_id,
            r.giacenza_teorica, r.quantita_contata, r.differenza,
            r.lotto, r.data_scadenza, r.note,
            r.created_at, r.updated_at,
            p.codice as prodotto_codice,
            p.nome as prodotto_nome,
            p.barcode as prodotto_barcode,
            p.marca as prodotto_marca,
            p.unita_misura as prodotto_unita_misura
        FROM righe_inventario r
        JOIN prodotti p ON r.prodotto_id = p.id
        WHERE r.inventario_id = ?
        ORDER BY r.created_at DESC"#
    )
    .bind(&inventario_id)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn aggiungi_riga_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateRigaInventarioInput,
) -> AppResult<RigaInventarioWithProdotto> {
    let state = db.lock().await;

    // Verifica che l'inventario sia in corso
    let inventario = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&input.inventario_id)
    .fetch_one(&state.db.pool)
    .await?;

    if inventario.stato != "in_corso" {
        return Err(AppError::InvalidInput(
            "Non è possibile modificare un inventario già confermato o annullato".to_string()
        ));
    }

    // Ottieni la giacenza attuale del prodotto
    let prodotto = sqlx::query_as::<_, ProdottoWithCategoria>(
        r#"SELECT p.id, p.codice, p.barcode, p.categoria_id, p.nome, p.descrizione,
                  p.marca, p.linea, p.unita_misura, p.capacita, p.giacenza,
                  p.scorta_minima, p.scorta_riordino, p.prezzo_acquisto, p.prezzo_vendita,
                  p.uso, p.attivo, p.data_scadenza, p.note, p.created_at, p.updated_at,
                  c.nome as categoria_nome, c.tipo as categoria_tipo
           FROM prodotti p
           LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
           WHERE p.id = ?"#
    )
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    let id = uuid::Uuid::new_v4().to_string();

    // Insert or replace (se il prodotto è già presente, aggiorna)
    sqlx::query(
        r#"INSERT INTO righe_inventario
           (id, inventario_id, prodotto_id, giacenza_teorica, quantita_contata, lotto, data_scadenza, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(inventario_id, prodotto_id)
           DO UPDATE SET
             quantita_contata = excluded.quantita_contata,
             lotto = excluded.lotto,
             data_scadenza = excluded.data_scadenza,
             note = excluded.note,
             updated_at = datetime('now')"#
    )
    .bind(&id)
    .bind(&input.inventario_id)
    .bind(&input.prodotto_id)
    .bind(prodotto.giacenza)
    .bind(input.quantita_contata)
    .bind(&input.lotto)
    .bind(&input.data_scadenza)
    .bind(&input.note)
    .execute(&state.db.pool)
    .await?;

    // Ritorna la riga inserita/aggiornata
    let result = sqlx::query_as::<_, RigaInventarioWithProdotto>(
        r#"SELECT
            r.id, r.inventario_id, r.prodotto_id,
            r.giacenza_teorica, r.quantita_contata, r.differenza,
            r.lotto, r.data_scadenza, r.note,
            r.created_at, r.updated_at,
            p.codice as prodotto_codice,
            p.nome as prodotto_nome,
            p.barcode as prodotto_barcode,
            p.marca as prodotto_marca,
            p.unita_misura as prodotto_unita_misura
        FROM righe_inventario r
        JOIN prodotti p ON r.prodotto_id = p.id
        WHERE r.inventario_id = ? AND r.prodotto_id = ?"#
    )
    .bind(&input.inventario_id)
    .bind(&input.prodotto_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn aggiorna_riga_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    input: UpdateRigaInventarioInput,
) -> AppResult<RigaInventarioWithProdotto> {
    let state = db.lock().await;

    // Verifica che l'inventario sia in corso
    let riga = sqlx::query_as::<_, RigaInventarioWithProdotto>(
        r#"SELECT
            r.id, r.inventario_id, r.prodotto_id,
            r.giacenza_teorica, r.quantita_contata, r.differenza,
            r.lotto, r.data_scadenza, r.note,
            r.created_at, r.updated_at,
            p.codice as prodotto_codice,
            p.nome as prodotto_nome,
            p.barcode as prodotto_barcode,
            p.marca as prodotto_marca,
            p.unita_misura as prodotto_unita_misura
        FROM righe_inventario r
        JOIN prodotti p ON r.prodotto_id = p.id
        WHERE r.id = ?"#
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    let inventario = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&riga.inventario_id)
    .fetch_one(&state.db.pool)
    .await?;

    if inventario.stato != "in_corso" {
        return Err(AppError::InvalidInput(
            "Non è possibile modificare un inventario già confermato o annullato".to_string()
        ));
    }

    // Costruisci query dinamica
    let mut updates = Vec::new();
    if input.quantita_contata.is_some() {
        updates.push(format!("quantita_contata = {}", input.quantita_contata.unwrap()));
    }
    if let Some(ref lotto) = input.lotto {
        updates.push(format!("lotto = '{}'", lotto));
    }
    if let Some(ref data_scad) = input.data_scadenza {
        updates.push(format!("data_scadenza = '{}'", data_scad));
    }
    if let Some(ref note) = input.note {
        updates.push(format!("note = '{}'", note));
    }

    if !updates.is_empty() {
        let query = format!(
            "UPDATE righe_inventario SET {} WHERE id = ?",
            updates.join(", ")
        );
        sqlx::query(&query)
            .bind(&id)
            .execute(&state.db.pool)
            .await?;
    }

    // Ritorna la riga aggiornata
    let result = sqlx::query_as::<_, RigaInventarioWithProdotto>(
        r#"SELECT
            r.id, r.inventario_id, r.prodotto_id,
            r.giacenza_teorica, r.quantita_contata, r.differenza,
            r.lotto, r.data_scadenza, r.note,
            r.created_at, r.updated_at,
            p.codice as prodotto_codice,
            p.nome as prodotto_nome,
            p.barcode as prodotto_barcode,
            p.marca as prodotto_marca,
            p.unita_misura as prodotto_unita_misura
        FROM righe_inventario r
        JOIN prodotti p ON r.prodotto_id = p.id
        WHERE r.id = ?"#
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn elimina_riga_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Verifica che l'inventario sia in corso
    let riga = sqlx::query_as::<_, RigaInventarioWithProdotto>(
        r#"SELECT
            r.id, r.inventario_id, r.prodotto_id,
            r.giacenza_teorica, r.quantita_contata, r.differenza,
            r.lotto, r.data_scadenza, r.note,
            r.created_at, r.updated_at,
            p.codice as prodotto_codice,
            p.nome as prodotto_nome,
            p.barcode as prodotto_barcode,
            p.marca as prodotto_marca,
            p.unita_misura as prodotto_unita_misura
        FROM righe_inventario r
        JOIN prodotti p ON r.prodotto_id = p.id
        WHERE r.id = ?"#
    )
    .bind(&id)
    .fetch_one(&state.db.pool)
    .await?;

    let inventario = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&riga.inventario_id)
    .fetch_one(&state.db.pool)
    .await?;

    if inventario.stato != "in_corso" {
        return Err(AppError::InvalidInput(
            "Non è possibile modificare un inventario già confermato o annullato".to_string()
        ));
    }

    sqlx::query("DELETE FROM righe_inventario WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn cerca_prodotto_per_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    search: String,
) -> AppResult<Option<ProdottoWithCategoria>> {
    let state = db.lock().await;

    // Cerca prima per barcode esatto, poi per codice esatto, poi per nome
    let result = sqlx::query_as::<_, ProdottoWithCategoria>(
        r#"SELECT p.id, p.codice, p.barcode, p.categoria_id, p.nome, p.descrizione,
                  p.marca, p.linea, p.unita_misura, p.capacita, p.giacenza,
                  p.scorta_minima, p.scorta_riordino, p.prezzo_acquisto, p.prezzo_vendita,
                  p.uso, p.attivo, p.data_scadenza, p.note, p.created_at, p.updated_at,
                  c.nome as categoria_nome, c.tipo as categoria_tipo
           FROM prodotti p
           LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
           WHERE p.attivo = 1
             AND (p.barcode = ? OR p.codice = ? OR LOWER(p.nome) LIKE ?)
           LIMIT 1"#
    )
    .bind(&search)
    .bind(&search)
    .bind(format!("%{}%", search.to_lowercase()))
    .fetch_optional(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn conferma_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    inventario_id: String,
) -> AppResult<Inventario> {
    let state = db.lock().await;

    // Verifica che l'inventario sia in corso
    let inventario = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&inventario_id)
    .fetch_one(&state.db.pool)
    .await?;

    if inventario.stato != "in_corso" {
        return Err(AppError::InvalidInput(
            "L'inventario è già stato confermato o annullato".to_string()
        ));
    }

    // Ottieni tutte le righe dell'inventario
    let righe = sqlx::query_as::<_, RigaInventarioWithProdotto>(
        r#"SELECT
            r.id, r.inventario_id, r.prodotto_id,
            r.giacenza_teorica, r.quantita_contata, r.differenza,
            r.lotto, r.data_scadenza, r.note,
            r.created_at, r.updated_at,
            p.codice as prodotto_codice,
            p.nome as prodotto_nome,
            p.barcode as prodotto_barcode,
            p.marca as prodotto_marca,
            p.unita_misura as prodotto_unita_misura
        FROM righe_inventario r
        JOIN prodotti p ON r.prodotto_id = p.id
        WHERE r.inventario_id = ?"#
    )
    .bind(&inventario_id)
    .fetch_all(&state.db.pool)
    .await?;

    // Per ogni riga, crea un movimento di rettifica e aggiorna la giacenza
    for riga in &righe {
        if riga.differenza != 0.0 {
            let movimento_id = uuid::Uuid::new_v4().to_string();

            // Registra il movimento di inventario
            sqlx::query(
                r#"INSERT INTO movimenti_magazzino
                   (id, prodotto_id, tipo, quantita, giacenza_risultante, note)
                   VALUES (?, ?, 'inventario', ?, ?, ?)"#
            )
            .bind(&movimento_id)
            .bind(&riga.prodotto_id)
            .bind(riga.differenza)
            .bind(riga.quantita_contata)
            .bind(format!("Rettifica inventario {} - Giac. teorica: {}, Contata: {}",
                         inventario.codice, riga.giacenza_teorica, riga.quantita_contata))
            .execute(&state.db.pool)
            .await?;

            // Il trigger aggiorna automaticamente la giacenza del prodotto
        }
    }

    // Aggiorna lo stato dell'inventario
    sqlx::query(
        "UPDATE inventari SET stato = 'confermato', data_chiusura = datetime('now') WHERE id = ?"
    )
    .bind(&inventario_id)
    .execute(&state.db.pool)
    .await?;

    // Ritorna l'inventario aggiornato
    let result = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&inventario_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn annulla_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    inventario_id: String,
) -> AppResult<Inventario> {
    let state = db.lock().await;

    let inventario = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&inventario_id)
    .fetch_one(&state.db.pool)
    .await?;

    if inventario.stato == "annullato" {
        return Err(AppError::InvalidInput(
            "L'inventario è già stato annullato".to_string()
        ));
    }

    // Se l'inventario era confermato, dobbiamo ripristinare le giacenze
    if inventario.stato == "confermato" {
        let righe = sqlx::query_as::<_, RigaInventarioWithProdotto>(
            r#"SELECT
                r.id, r.inventario_id, r.prodotto_id,
                r.giacenza_teorica, r.quantita_contata, r.differenza,
                r.lotto, r.data_scadenza, r.note,
                r.created_at, r.updated_at,
                p.codice as prodotto_codice,
                p.nome as prodotto_nome,
                p.barcode as prodotto_barcode,
                p.marca as prodotto_marca,
                p.unita_misura as prodotto_unita_misura
            FROM righe_inventario r
            JOIN prodotti p ON r.prodotto_id = p.id
            WHERE r.inventario_id = ?"#
        )
        .bind(&inventario_id)
        .fetch_all(&state.db.pool)
        .await?;

        // Per ogni riga, ripristina la giacenza teorica
        for riga in &righe {
            if riga.differenza != 0.0 {
                let movimento_id = uuid::Uuid::new_v4().to_string();

                sqlx::query(
                    r#"INSERT INTO movimenti_magazzino
                       (id, prodotto_id, tipo, quantita, giacenza_risultante, note)
                       VALUES (?, ?, 'inventario', ?, ?, ?)"#
                )
                .bind(&movimento_id)
                .bind(&riga.prodotto_id)
                .bind(-riga.differenza)
                .bind(riga.giacenza_teorica)
                .bind(format!("STORNO inventario {} - Ripristino giacenza da {} a {}",
                             inventario.codice, riga.quantita_contata, riga.giacenza_teorica))
                .execute(&state.db.pool)
                .await?;
            }
        }
    }

    sqlx::query(
        "UPDATE inventari SET stato = 'annullato', data_chiusura = datetime('now') WHERE id = ?"
    )
    .bind(&inventario_id)
    .execute(&state.db.pool)
    .await?;

    let result = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&inventario_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(result)
}

#[tauri::command]
pub async fn elimina_inventario(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    inventario_id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    let inventario = sqlx::query_as::<_, Inventario>(
        "SELECT * FROM inventari WHERE id = ?"
    )
    .bind(&inventario_id)
    .fetch_one(&state.db.pool)
    .await?;

    if inventario.stato == "confermato" {
        return Err(AppError::InvalidInput(
            "Non è possibile eliminare un inventario confermato. Usa 'Annulla' per ripristinare le giacenze.".to_string()
        ));
    }

    sqlx::query("DELETE FROM inventari WHERE id = ?")
        .bind(&inventario_id)
        .execute(&state.db.pool)
        .await?;

    Ok(())
}

// ============================================================================
// MOVIMENTI PER APPUNTAMENTO
// ============================================================================

#[tauri::command]
pub async fn get_movimenti_appuntamento(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    appuntamento_id: String,
) -> AppResult<Vec<MovimentoWithDetails>> {
    println!("DEBUG get_movimenti_appuntamento: called with appuntamento_id={}", appuntamento_id);
    let state = db.lock().await;

    // Query che calcola la quantità NETTA per prodotto:
    // - Scarichi (scarico_uso, scarico_vendita) sono positivi
    // - Resi sono negativi (da sottrarre)
    // Restituisce solo prodotti con quantità netta > 0
    let result = sqlx::query_as::<_, MovimentoWithDetails>(
        "SELECT
            MIN(m.id) as id,
            m.prodotto_id,
            'scarico_uso' as tipo,
            SUM(CASE
                WHEN m.tipo IN ('scarico_uso', 'scarico_vendita') THEN m.quantita
                WHEN m.tipo = 'reso' THEN -m.quantita
                ELSE 0
            END) as quantita,
            0.0 as giacenza_risultante,
            m.appuntamento_id,
            MAX(m.operatrice_id) as operatrice_id,
            MAX(m.cliente_id) as cliente_id,
            NULL as fornitore,
            NULL as documento_riferimento,
            NULL as prezzo_unitario,
            NULL as lotto,
            NULL as data_scadenza,
            NULL as note,
            MAX(m.created_at) as created_at,
            p.nome as prodotto_nome,
            p.codice as prodotto_codice,
            MAX(o.nome || ' ' || o.cognome) as operatrice_nome,
            MAX(cl.nome || ' ' || cl.cognome) as cliente_nome
         FROM movimenti_magazzino m
         LEFT JOIN prodotti p ON m.prodotto_id = p.id
         LEFT JOIN operatrici o ON m.operatrice_id = o.id
         LEFT JOIN clienti cl ON m.cliente_id = cl.id
         WHERE m.appuntamento_id = ?
           AND m.tipo IN ('scarico_uso', 'scarico_vendita', 'reso')
         GROUP BY m.prodotto_id, m.appuntamento_id, p.nome, p.codice
         HAVING SUM(CASE
                WHEN m.tipo IN ('scarico_uso', 'scarico_vendita') THEN m.quantita
                WHEN m.tipo = 'reso' THEN -m.quantita
                ELSE 0
            END) > 0
         ORDER BY MAX(m.created_at) DESC"
    )
    .bind(&appuntamento_id)
    .fetch_all(&state.db.pool)
    .await?;

    println!("DEBUG get_movimenti_appuntamento: found {} prodotti netti", result.len());
    for m in &result {
        println!("  - prodotto: {:?}, quantita netta: {}", m.prodotto_nome, m.quantita);
    }

    Ok(result)
}
