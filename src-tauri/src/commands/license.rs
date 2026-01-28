use crate::error::AppResult;
use crate::licensing::LicenseManager;
use crate::models::{License, LicenseFile, LicenseInfo};
use crate::AppState;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;

/// Importa un file licenza dal file system
#[tauri::command]
pub async fn import_license(
    license_file_content: String,
    db: State<'_, Arc<Mutex<AppState>>>,
) -> AppResult<License> {
    // Parse JSON del file licenza
    let license_file: LicenseFile = serde_json::from_str(&license_file_content)
        .map_err(|e| crate::error::AppError::InvalidInput(format!("Invalid license file: {}", e)))?;

    // Ottieni il database pool
    let pool = {
        let app_state = db.lock().await;
        app_state.db.pool.clone()
    }; // MutexGuard dropped here

    let license_manager = LicenseManager::new(pool);

    // Importa la licenza
    license_manager.import_license(license_file).await
}

/// Valida la licenza corrente
#[tauri::command]
pub async fn validate_license(db: State<'_, Arc<Mutex<AppState>>>) -> AppResult<bool> {
    let pool = {
        let app_state = db.lock().await;
        app_state.db.pool.clone()
    };

    let license_manager = LicenseManager::new(pool);
    license_manager.validate_license().await
}

/// Ottieni informazioni sulla licenza corrente
#[tauri::command]
pub async fn get_license_info(db: State<'_, Arc<Mutex<AppState>>>) -> AppResult<LicenseInfo> {
    let pool = {
        let app_state = db.lock().await;
        app_state.db.pool.clone()
    };

    let license_manager = LicenseManager::new(pool);
    license_manager.get_license_info().await
}

/// Rimuovi la licenza corrente
#[tauri::command]
pub async fn remove_license(db: State<'_, Arc<Mutex<AppState>>>) -> AppResult<()> {
    let pool = {
        let app_state = db.lock().await;
        app_state.db.pool.clone()
    };

    let license_manager = LicenseManager::new(pool);
    license_manager.remove_license().await
}

/// Ottieni l'hardware ID del dispositivo corrente
#[tauri::command]
pub fn get_hardware_id() -> AppResult<String> {
    LicenseManager::get_hardware_id()
}
