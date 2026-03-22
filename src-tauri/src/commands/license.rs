use crate::error::AppResult;
use crate::licensing::LicenseManager;
use crate::models::{GeneratedKey, License, LicenseInfo};
use crate::AppState;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// Attiva una licenza tramite chiave alfanumerica
#[tauri::command]
pub async fn activate_license(
    key: String,
    customer_name: Option<String>,
    db: State<'_, Arc<Mutex<AppState>>>,
) -> AppResult<License> {
    let pool = {
        let app_state = db.lock().await;
        app_state.db.pool.clone()
    };

    let license_manager = LicenseManager::new(pool);
    license_manager
        .activate_license(&key, customer_name.as_deref())
        .await
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

/// Genera una nuova chiave di licenza (admin)
#[tauri::command]
pub fn generate_license_key(
    license_type: String,
    durata_mesi: Option<i32>,
) -> AppResult<GeneratedKey> {
    let key = LicenseManager::generate_key(&license_type, durata_mesi)?;

    // Parsa per ottenere la data di scadenza
    let (_, scadenza) = LicenseManager::parse_and_validate_key(&key)?;
    let expires_at = scadenza.map(|d| format!("{}T23:59:59Z", d));

    Ok(GeneratedKey {
        key,
        license_type,
        expires_at,
    })
}
