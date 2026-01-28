use crate::error::{AppError, AppResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
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
