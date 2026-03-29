use crate::error::{AppError, AppResult};
use crate::db::connection::ensure_backup_compatibility;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub version: String,
    pub created_at: DateTime<Utc>,
    pub app_version: String,
    pub database_size: u64,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupInfo {
    pub file_path: String,
    pub file_name: String,
    pub created_at: DateTime<Utc>,
    pub size: u64,
    pub metadata: BackupMetadata,
}

/// Crea un backup del database in formato ZIP
pub fn create_backup(
    db_path: &Path,
    backup_dir: &Path,
    description: Option<String>,
) -> AppResult<PathBuf> {
    // Verifica che il database esista
    if !db_path.exists() {
        return Err(AppError::NotFound(format!(
            "Database non trovato: {}",
            db_path.display()
        )));
    }

    // Crea la directory di backup se non esiste
    if !backup_dir.exists() {
        fs::create_dir_all(backup_dir)?;
    }

    // Genera nome file backup con timestamp
    let timestamp = Utc::now();
    let backup_filename = format!(
        "backup_{}.bmbackup",
        timestamp.format("%Y%m%d_%H%M%S")
    );
    let backup_path = backup_dir.join(&backup_filename);

    // Ottieni dimensione database
    let db_size = fs::metadata(db_path)?.len();

    // Crea metadata
    let metadata = BackupMetadata {
        version: "1.0".to_string(),
        created_at: timestamp,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        database_size: db_size,
        description,
    };

    // Crea file ZIP
    let zip_file = File::create(&backup_path)?;
    let mut zip = ZipWriter::new(zip_file);

    // Opzioni per compressione
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .compression_level(Some(9));

    // Aggiungi database al ZIP
    zip.start_file("beauty_manager.db", options)?;
    let mut db_file = File::open(db_path)?;
    let mut buffer = Vec::new();
    db_file.read_to_end(&mut buffer)?;
    zip.write_all(&buffer)?;

    // Aggiungi metadata al ZIP
    zip.start_file("metadata.json", options)?;
    let metadata_json = serde_json::to_string_pretty(&metadata)?;
    zip.write_all(metadata_json.as_bytes())?;

    // Finalizza ZIP
    zip.finish()?;

    Ok(backup_path)
}

/// Ripristina un backup dal file ZIP
pub fn restore_backup(backup_path: &Path, target_db_path: &Path) -> AppResult<BackupMetadata> {
    // Verifica che il file di backup esista
    if !backup_path.exists() {
        return Err(AppError::NotFound(format!(
            "File di backup non trovato: {}",
            backup_path.display()
        )));
    }

    // Apri ZIP
    let file = File::open(backup_path)?;
    let mut archive = ZipArchive::new(file)?;

    // Estrai e valida metadata
    let metadata = {
        let mut metadata_file = archive
            .by_name("metadata.json")
            .map_err(|_| AppError::InvalidInput("Backup corrotto: metadata.json mancante".to_string()))?;

        let mut metadata_content = String::new();
        metadata_file.read_to_string(&mut metadata_content)?;
        serde_json::from_str::<BackupMetadata>(&metadata_content)?
    };

    // Estrai database
    let mut db_file = archive
        .by_name("beauty_manager.db")
        .map_err(|_| AppError::InvalidInput("Backup corrotto: beauty_manager.db mancante".to_string()))?;

    // Crea backup del database corrente se esiste
    if target_db_path.exists() {
        let backup_current = target_db_path.with_extension("db.backup");
        fs::copy(target_db_path, backup_current)?;
    }

    // Scrivi database estratto
    let mut target_file = File::create(target_db_path)?;
    let mut buffer = Vec::new();
    db_file.read_to_end(&mut buffer)?;
    target_file.write_all(&buffer)?;

    Ok(metadata)
}

/// Lista tutti i backup disponibili in una directory
pub fn list_backups(backup_dir: &Path) -> AppResult<Vec<BackupInfo>> {
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();

    for entry in fs::read_dir(backup_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("bmbackup") {
            // Leggi metadata dal backup
            if let Ok(file) = File::open(&path) {
                if let Ok(mut archive) = ZipArchive::new(file) {
                    if let Ok(mut metadata_file) = archive.by_name("metadata.json") {
                        let mut content = String::new();
                        if metadata_file.read_to_string(&mut content).is_ok() {
                            if let Ok(metadata) = serde_json::from_str::<BackupMetadata>(&content) {
                                let file_size = fs::metadata(&path)?.len();

                                backups.push(BackupInfo {
                                    file_path: path.to_string_lossy().to_string(),
                                    file_name: path.file_name()
                                        .unwrap()
                                        .to_string_lossy()
                                        .to_string(),
                                    created_at: metadata.created_at,
                                    size: file_size,
                                    metadata,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // Ordina per data (più recente prima)
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(backups)
}

/// Elimina un backup
pub fn delete_backup(backup_path: &Path) -> AppResult<()> {
    if !backup_path.exists() {
        return Err(AppError::NotFound(format!(
            "Backup non trovato: {}",
            backup_path.display()
        )));
    }

    fs::remove_file(backup_path)?;
    Ok(())
}

// ════════════════════════════════════════════════════════
// RESTORE SELETTIVO
// ════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RestoreMode {
    Smart,
    Full,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreResult {
    pub metadata: BackupMetadata,
    pub tables_restored: Vec<String>,
    pub tables_skipped: Vec<String>,
    pub mode: String,
    pub requires_relaunch: bool,
}

/// Tabelle dati (sempre ripristinate)
const DATA_TABLES: &[&str] = &[
    // Ordine INSERT: padri prima, figli dopo
    "clienti", "operatrici", "cabine",
    "categorie_trattamenti", "trattamenti", "protocolli_trattamento",
    "categorie_prodotti", "prodotti",
    "appuntamenti", "schede_trattamento",
    "movimenti_magazzino", "inventari", "righe_inventario",
    "template_messaggi", "comunicazioni",
    "campagne_marketing", "campagna_destinatari",
    "pacchetti_trattamenti", "pacchetto_trattamenti_inclusi",
    "pacchetti_cliente", "pacchetto_sedute", "pacchetto_pagamenti",
    "client_intelligence_scores", "orari_operatrici", "chiusure", "audit_log", "orari_centro",
];

/// Tabelle auth/config (ripristinate solo in modalità Full)
const AUTH_CONFIG_TABLES: &[&str] = &[
    "users", "user_settings", "user_sessions",
    "config_centro", "config_smtp", "config_scheduler",
];

/// Colonne GENERATED da escludere (tabella, colonna)
const GENERATED_COLUMNS: &[(&str, &str)] = &[
    ("righe_inventario", "differenza"),
];

/// Tabelle da NON toccare mai
const SYSTEM_TABLES: &[&str] = &[
    "_sqlx_migrations", "_migration_check",
    "license", "license_validation_log",
];

/// Cleanup guard per temp DB
struct TempDbCleanup { path: PathBuf }
impl Drop for TempDbCleanup {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
        let _ = fs::remove_file(self.path.with_extension("db-shm"));
        let _ = fs::remove_file(self.path.with_extension("db-wal"));
    }
}

/// Ripristina un backup in modalità selettiva usando ATTACH DATABASE
pub async fn restore_backup_selective(
    backup_path: &Path,
    pool: &SqlitePool,
    mode: RestoreMode,
    app_data_dir: &Path,
) -> AppResult<RestoreResult> {
    if !backup_path.exists() {
        return Err(AppError::NotFound(format!("Backup non trovato: {}", backup_path.display())));
    }

    // Estrai il DB dal ZIP in un file temporaneo (cleanup automatico)
    let temp_db_path = app_data_dir.join("_restore_temp.db");
    let _cleanup = TempDbCleanup { path: temp_db_path.clone() };
    let metadata = extract_db_from_zip(backup_path, &temp_db_path)?;

    // Esegui ensure_backup_compatibility sul temp DB
    {
        let temp_opts = SqliteConnectOptions::from_str(
            &format!("sqlite://{}", temp_db_path.display())
        ).map_err(|e| AppError::Internal(format!("Errore connessione temp DB: {}", e)))?;

        let temp_pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(temp_opts)
            .await
            .map_err(|e| AppError::Internal(format!("Errore apertura temp DB: {}", e)))?;

        ensure_backup_compatibility(&temp_pool).await;
        temp_pool.close().await;
    }

    // Determina quali tabelle ripristinare
    let mut tables_to_restore: Vec<&str> = DATA_TABLES.to_vec();
    let is_full = matches!(mode, RestoreMode::Full);
    if is_full {
        tables_to_restore.extend_from_slice(AUTH_CONFIG_TABLES);
    }

    // Acquisisci una singola connessione (ATTACH è a livello connessione)
    let mut conn = pool.acquire().await
        .map_err(|e| AppError::Internal(format!("Errore acquisizione connessione: {}", e)))?;

    // Disabilita FK (deve essere fuori dalla transazione)
    sqlx::query("PRAGMA foreign_keys = OFF").execute(&mut *conn).await
        .map_err(|e| AppError::Internal(format!("Errore PRAGMA: {}", e)))?;

    // ATTACH backup DB
    let attach_sql = format!("ATTACH DATABASE '{}' AS backup_db", temp_db_path.display());
    sqlx::query(&attach_sql).execute(&mut *conn).await
        .map_err(|e| AppError::Internal(format!("Errore ATTACH: {}", e)))?;

    // Leggi tabelle backup e colonne main (per main usiamo PRAGMA, per backup_db usiamo sqlite_master)
    let backup_tables: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM backup_db.sqlite_master WHERE type='table'"
    ).fetch_all(&mut *conn).await.unwrap_or_default();
    let backup_table_names: Vec<String> = backup_tables.into_iter().map(|t| t.0).collect();

    // Pre-calcola le colonne del backup usando il temp pool (già chiuso — riapriamolo brevemente)
    // Nota: PRAGMA non funziona con schema prefix per attached DB.
    // Usiamo un approccio diverso: SELECT * LIMIT 0 e leggiamo i nomi colonne dai risultati.
    // Oppure, dato che abbiamo il temp DB, leggiamo da main + descriviamo le differenze.
    // Approccio più semplice e sicuro: per le colonne del main usiamo PRAGMA,
    // per il backup usiamo "SELECT * FROM backup_db.table LIMIT 0" e parsiamo la risposta.

    let mut restored: Vec<String> = Vec::new();
    let mut skipped: Vec<String> = Vec::new();

    // BEGIN TRANSACTION
    sqlx::query("BEGIN TRANSACTION").execute(&mut *conn).await
        .map_err(|e| AppError::Internal(format!("Errore BEGIN: {}", e)))?;

    // DELETE in ordine inverso (figli prima)
    let delete_order: Vec<&str> = tables_to_restore.iter().copied().rev().collect();
    for table in &delete_order {
        if !backup_table_names.contains(&table.to_string()) {
            continue;
        }
        let sql = format!("DELETE FROM main.\"{}\"", table);
        if let Err(e) = sqlx::query(&sql).execute(&mut *conn).await {
            println!("Warning: DELETE failed for {}: {}", table, e);
        }
    }

    // INSERT in ordine diretto (padri prima)
    for table in &tables_to_restore {
        if !backup_table_names.contains(&table.to_string()) {
            skipped.push(table.to_string());
            continue;
        }

        // Colonne main (PRAGMA funziona per main)
        let main_cols = get_main_columns(&mut conn, table).await;
        // Colonne backup (usiamo SELECT * LIMIT 0 sulla tabella attached)
        let backup_cols = get_attached_columns(&mut conn, table).await;

        if main_cols.is_empty() || backup_cols.is_empty() {
            skipped.push(table.to_string());
            continue;
        }

        // Intersezione colonne (escludi GENERATED)
        let common: Vec<String> = main_cols.iter()
            .filter(|c| backup_cols.contains(c))
            .filter(|c| !GENERATED_COLUMNS.iter().any(|(t, col)| *t == *table && *col == c.as_str()))
            .cloned()
            .collect();

        if common.is_empty() {
            skipped.push(table.to_string());
            continue;
        }

        let cols_str = common.iter().map(|c| format!("\"{}\"", c)).collect::<Vec<_>>().join(", ");
        let insert_sql = format!(
            "INSERT INTO main.\"{}\" ({}) SELECT {} FROM backup_db.\"{}\"",
            table, cols_str, cols_str, table
        );

        match sqlx::query(&insert_sql).execute(&mut *conn).await {
            Ok(_) => restored.push(table.to_string()),
            Err(e) => {
                println!("Errore restore tabella {}: {}", table, e);
                skipped.push(table.to_string());
            }
        }
    }

    // COMMIT
    if let Err(e) = sqlx::query("COMMIT").execute(&mut *conn).await {
        let _ = sqlx::query("ROLLBACK").execute(&mut *conn).await;
        let _ = sqlx::query("DETACH DATABASE backup_db").execute(&mut *conn).await;
        let _ = sqlx::query("PRAGMA foreign_keys = ON").execute(&mut *conn).await;
        return Err(AppError::Internal(format!("Errore COMMIT restore: {}", e)));
    }

    // Cleanup: DETACH + re-enable FK
    let _ = sqlx::query("DETACH DATABASE backup_db").execute(&mut *conn).await;
    let _ = sqlx::query("PRAGMA foreign_keys = ON").execute(&mut *conn).await;
    drop(conn);
    // _cleanup guard cancella automaticamente temp DB al drop

    let mode_str = if is_full { "full" } else { "smart" };
    Ok(RestoreResult {
        metadata,
        tables_restored: restored,
        tables_skipped: skipped,
        mode: mode_str.to_string(),
        requires_relaunch: is_full,
    })
}

/// Estrae il DB dal ZIP in un file temporaneo
fn extract_db_from_zip(backup_path: &Path, temp_path: &Path) -> AppResult<BackupMetadata> {
    let file = File::open(backup_path)?;
    let mut archive = ZipArchive::new(file)?;

    let metadata = {
        let mut mf = archive.by_name("metadata.json")
            .map_err(|_| AppError::InvalidInput("Backup corrotto: metadata.json mancante".to_string()))?;
        let mut content = String::new();
        mf.read_to_string(&mut content)?;
        serde_json::from_str::<BackupMetadata>(&content)?
    };

    let mut db_file = archive.by_name("beauty_manager.db")
        .map_err(|_| AppError::InvalidInput("Backup corrotto: beauty_manager.db mancante".to_string()))?;
    let mut target = File::create(temp_path)?;
    let mut buffer = Vec::new();
    db_file.read_to_end(&mut buffer)?;
    target.write_all(&buffer)?;

    Ok(metadata)
}

/// Colonne di una tabella nel main DB (usa PRAGMA table_info)
async fn get_main_columns(conn: &mut sqlx::pool::PoolConnection<sqlx::Sqlite>, table: &str) -> Vec<String> {
    let sql = format!("PRAGMA table_info(\"{}\")", table);
    let rows: Vec<(i64, String, String, i64, Option<String>, i64)> = sqlx::query_as(&sql)
        .fetch_all(&mut **conn)
        .await
        .unwrap_or_default();
    rows.into_iter().map(|r| r.1).collect()
}

/// Colonne di una tabella nel backup_db attached (usa SELECT * LIMIT 0 per leggere i nomi colonne)
async fn get_attached_columns(conn: &mut sqlx::pool::PoolConnection<sqlx::Sqlite>, table: &str) -> Vec<String> {
    // Verifica che la tabella esista nel backup_db
    let check = format!("SELECT name FROM backup_db.sqlite_master WHERE type='table' AND name=?1");
    let exists: Option<(String,)> = sqlx::query_as(&check)
        .bind(table)
        .fetch_optional(&mut **conn)
        .await
        .unwrap_or(None);
    if exists.is_none() {
        return Vec::new();
    }

    // Usa PRAGMA su backup_db — la sintassi PRAGMA schema.table_info(table) è supportata in SQLite >= 3.16
    let sql = format!("PRAGMA backup_db.table_info(\"{}\")", table);
    let rows: Vec<(i64, String, String, i64, Option<String>, i64)> = sqlx::query_as(&sql)
        .fetch_all(&mut **conn)
        .await
        .ok()
        .unwrap_or_default();

    if !rows.is_empty() {
        return rows.into_iter().map(|r| r.1).collect();
    }

    // Fallback: parsa CREATE TABLE da sqlite_master
    let create_sql = format!("SELECT sql FROM backup_db.sqlite_master WHERE type='table' AND name=?1");
    let create_row: Option<(String,)> = sqlx::query_as(&create_sql)
        .bind(table)
        .fetch_optional(&mut **conn)
        .await
        .unwrap_or(None);

    if let Some((sql,)) = create_row {
        parse_columns_from_create_table(&sql)
    } else {
        Vec::new()
    }
}

/// Parsa i nomi colonne da un CREATE TABLE statement
fn parse_columns_from_create_table(sql: &str) -> Vec<String> {
    let mut cols = Vec::new();
    let start = match sql.find('(') { Some(i) => i + 1, None => return cols };
    let end = match sql.rfind(')') { Some(i) => i, None => return cols };
    let body = &sql[start..end];

    let mut depth = 0;
    let mut current = String::new();
    let mut parts: Vec<String> = Vec::new();

    for ch in body.chars() {
        match ch {
            '(' => { depth += 1; current.push(ch); }
            ')' => { depth -= 1; current.push(ch); }
            ',' if depth == 0 => { parts.push(current.trim().to_string()); current.clear(); }
            _ => { current.push(ch); }
        }
    }
    if !current.trim().is_empty() {
        parts.push(current.trim().to_string());
    }

    for part in &parts {
        let trimmed = part.trim();
        // Skip constraints
        let upper = trimmed.to_uppercase();
        if upper.starts_with("PRIMARY KEY") || upper.starts_with("FOREIGN KEY")
            || upper.starts_with("UNIQUE") || upper.starts_with("CHECK")
            || upper.starts_with("CONSTRAINT") {
            continue;
        }
        // Prima parola è il nome colonna
        if let Some(name) = trimmed.split_whitespace().next() {
            let clean = name.trim_matches('"').trim_matches('`').trim_matches('[').trim_matches(']');
            if !clean.is_empty() {
                cols.push(clean.to_string());
            }
        }
    }
    cols
}
