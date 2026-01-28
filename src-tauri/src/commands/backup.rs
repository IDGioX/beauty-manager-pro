use crate::backup::{self, BackupInfo, BackupMetadata};
use crate::error::AppResult;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Ottiene il percorso del database
pub(crate) fn get_db_path(app: &AppHandle) -> AppResult<PathBuf> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AppError::Internal(format!("Unable to resolve app data dir: {}", e)))?;
    Ok(app_dir.join("beauty_manager.db"))
}

/// Ottiene il percorso della directory backup
pub(crate) fn get_backup_dir(app: &AppHandle) -> AppResult<PathBuf> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AppError::Internal(format!("Unable to resolve app data dir: {}", e)))?;
    Ok(app_dir.join("backups"))
}

#[tauri::command]
pub async fn create_backup(
    app: AppHandle,
    description: Option<String>,
) -> AppResult<String> {
    let db_path = get_db_path(&app)?;
    let backup_dir = get_backup_dir(&app)?;

    let backup_path = backup::create_backup(&db_path, &backup_dir, description)?;

    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn restore_backup(app: AppHandle, backup_path: String) -> AppResult<BackupMetadata> {
    let db_path = get_db_path(&app)?;
    let backup_file_path = PathBuf::from(backup_path);

    let metadata = backup::restore_backup(&backup_file_path, &db_path)?;

    Ok(metadata)
}

#[tauri::command]
pub async fn list_backups(app: AppHandle) -> AppResult<Vec<BackupInfo>> {
    let backup_dir = get_backup_dir(&app)?;
    backup::list_backups(&backup_dir)
}

#[tauri::command]
pub async fn delete_backup(backup_path: String) -> AppResult<()> {
    let path = PathBuf::from(backup_path);
    backup::delete_backup(&path)
}

#[tauri::command]
pub async fn export_backup_to_folder(
    app: AppHandle,
    destination_path: String,
    description: Option<String>,
) -> AppResult<String> {
    let db_path = get_db_path(&app)?;
    let dest_dir = PathBuf::from(destination_path);

    let backup_path = backup::create_backup(&db_path, &dest_dir, description)?;

    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_backup_from_file(app: AppHandle, source_path: String) -> AppResult<BackupMetadata> {
    let db_path = get_db_path(&app)?;
    let source_file = PathBuf::from(source_path);

    let metadata = backup::restore_backup(&source_file, &db_path)?;

    Ok(metadata)
}

#[tauri::command]
pub async fn open_backup_folder(app: AppHandle) -> AppResult<()> {
    let backup_dir = get_backup_dir(&app)?;

    // Crea la directory se non esiste
    if !backup_dir.exists() {
        std::fs::create_dir_all(&backup_dir)?;
    }

    // Apri la cartella con il file manager del sistema operativo
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&backup_dir)
            .spawn()
            .map_err(|e| crate::error::AppError::Internal(format!("Impossibile aprire la cartella: {}", e)))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&backup_dir)
            .spawn()
            .map_err(|e| crate::error::AppError::Internal(format!("Impossibile aprire la cartella: {}", e)))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&backup_dir)
            .spawn()
            .map_err(|e| crate::error::AppError::Internal(format!("Impossibile aprire la cartella: {}", e)))?;
    }

    Ok(())
}
