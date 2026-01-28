use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackupFrequency {
    Daily,
    Weekly,
    Monthly,
}

impl BackupFrequency {
    pub fn to_hours(&self) -> u64 {
        match self {
            BackupFrequency::Daily => 24,
            BackupFrequency::Weekly => 24 * 7,
            BackupFrequency::Monthly => 24 * 30,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupConfig {
    pub enabled: bool,
    pub frequency: BackupFrequency,
    pub max_backups: usize,
    pub last_backup: Option<chrono::DateTime<chrono::Utc>>,
}

impl Default for BackupConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            frequency: BackupFrequency::Weekly,
            max_backups: 10,
            last_backup: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub backup: BackupConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            backup: BackupConfig::default(),
        }
    }
}

/// Ottiene il percorso del file di configurazione
fn get_config_path(app: &AppHandle) -> AppResult<PathBuf> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Internal(format!("Unable to resolve app data dir: {}", e)))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)?;
    }

    Ok(app_dir.join("config.json"))
}

/// Carica la configurazione dal file
pub fn load_config(app: &AppHandle) -> AppResult<AppConfig> {
    let config_path = get_config_path(app)?;

    if !config_path.exists() {
        // Se il file non esiste, crea una configurazione di default
        let config = AppConfig::default();
        save_config(app, &config)?;
        return Ok(config);
    }

    let content = fs::read_to_string(&config_path)?;
    let config: AppConfig = serde_json::from_str(&content)?;

    Ok(config)
}

/// Salva la configurazione nel file
pub fn save_config(app: &AppHandle, config: &AppConfig) -> AppResult<()> {
    let config_path = get_config_path(app)?;
    let content = serde_json::to_string_pretty(config)?;
    fs::write(&config_path, content)?;
    Ok(())
}
