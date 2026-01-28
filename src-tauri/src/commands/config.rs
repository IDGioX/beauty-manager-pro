use crate::config::{load_config, save_config, AppConfig, BackupConfig};
use crate::error::AppResult;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_backup_config(app: AppHandle) -> AppResult<BackupConfig> {
    let config = load_config(&app)?;
    Ok(config.backup)
}

#[tauri::command]
pub async fn update_backup_config(
    app: AppHandle,
    backup_config: BackupConfig,
) -> AppResult<BackupConfig> {
    let mut config = load_config(&app)?;
    config.backup = backup_config;
    save_config(&app, &config)?;
    Ok(config.backup)
}

#[tauri::command]
pub async fn trigger_manual_backup(app: AppHandle) -> AppResult<()> {
    // Forza un backup immediato indipendentemente dalla configurazione
    use crate::commands::backup::{get_backup_dir, get_db_path};
    use chrono::Utc;

    let db_path = get_db_path(&app)?;
    let backup_dir = get_backup_dir(&app)?;

    let description = Some(format!("Backup manuale - {}", Utc::now().format("%d/%m/%Y %H:%M")));

    crate::backup::create_backup(&db_path, &backup_dir, description)?;

    // Aggiorna la data dell'ultimo backup nella configurazione
    let mut config = load_config(&app)?;
    config.backup.last_backup = Some(Utc::now());
    save_config(&app, &config)?;

    Ok(())
}
