use crate::error::{AppError, AppResult};
use crate::models::{License, LicenseFile, LicenseInfo};
use chrono::{DateTime, Utc};
use ed25519_dalek::{VerifyingKey, Signature, Verifier};
use serde_json;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;

/// Public key per validazione firme (generata con la private key del sistema di generazione licenze)
/// NOTA: Questa chiave pubblica deve corrispondere alla private key usata per generare le licenze
const PUBLIC_KEY_HEX: &str = "2e3ccf609af27a6c0c2027961a32fff077cab622338a767861a483684a10483d";

pub struct LicenseManager {
    db: SqlitePool,
}

impl LicenseManager {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Genera hardware fingerprint univoco per il dispositivo corrente
    pub fn get_hardware_id() -> AppResult<String> {
        let mut hasher = Sha256::new();

        // CPU info
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            if let Ok(output) = Command::new("sysctl")
                .arg("-n")
                .arg("machdep.cpu.brand_string")
                .output()
            {
                hasher.update(&output.stdout);
            }
        }

        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            if let Ok(output) = Command::new("wmic")
                .args(&["cpu", "get", "processorid"])
                .output()
            {
                hasher.update(&output.stdout);
            }
        }

        #[cfg(target_os = "linux")]
        {
            if let Ok(contents) = std::fs::read_to_string("/proc/cpuinfo") {
                hasher.update(contents.as_bytes());
            }
        }

        // Hostname
        if let Ok(hostname) = hostname::get() {
            hasher.update(hostname.as_encoded_bytes());
        }

        Ok(format!("{:x}", hasher.finalize()))
    }

    /// Verifica la firma digitale del file licenza
    fn verify_signature(&self, license_file: &LicenseFile) -> AppResult<bool> {
        // Decodifica la chiave pubblica
        let public_key_bytes = hex::decode(PUBLIC_KEY_HEX).map_err(|e| {
            AppError::InvalidInput(format!("Invalid public key: {}", e))
        })?;

        // Converti in array [u8; 32] per VerifyingKey
        let key_array: &[u8; 32] = public_key_bytes.as_slice().try_into().map_err(|_| {
            AppError::InvalidInput("Invalid public key length".to_string())
        })?;

        let public_key = VerifyingKey::from_bytes(key_array).map_err(|e| {
            AppError::InvalidInput(format!("Invalid public key format: {}", e))
        })?;

        // Decodifica la firma
        let signature_bytes = hex::decode(&license_file.signature).map_err(|e| {
            AppError::InvalidInput(format!("Invalid signature format: {}", e))
        })?;

        // Converti in array [u8; 64] per Signature
        let sig_array: &[u8; 64] = signature_bytes.as_slice().try_into().map_err(|_| {
            AppError::InvalidInput("Invalid signature length".to_string())
        })?;

        let signature = Signature::from_bytes(sig_array);

        // Genera il payload da verificare
        let payload = license_file.get_signing_payload();

        // Verifica la firma
        public_key
            .verify(payload.as_bytes(), &signature)
            .map_err(|_| AppError::InvalidInput("Signature verification failed".to_string()))?;

        Ok(true)
    }

    /// Importa un file licenza
    pub async fn import_license(&self, license_file: LicenseFile) -> AppResult<License> {
        // 1. Verifica firma digitale
        if !self.verify_signature(&license_file)? {
            return Err(AppError::InvalidInput(
                "Invalid license signature".to_string(),
            ));
        }

        // 2. Verifica scadenza
        if license_file.is_expired() {
            return Err(AppError::InvalidInput(
                "License has expired".to_string(),
            ));
        }

        // 3. Verifica hardware binding (se specificato)
        if let Some(bound_hardware_id) = &license_file.hardware_id {
            let current_hardware_id = Self::get_hardware_id()?;
            if bound_hardware_id != &current_hardware_id {
                return Err(AppError::InvalidInput(
                    "License is bound to a different device".to_string(),
                ));
            }
        }

        // 4. Rimuovi eventuali licenze esistenti
        sqlx::query("DELETE FROM license")
            .execute(&self.db)
            .await
            ?;

        // 5. Inserisci nuova licenza
        let features_json = serde_json::to_string(&license_file.features)
            .unwrap_or_else(|_| "[]".to_string());

        let license = sqlx::query_as::<_, License>(
            r#"
            INSERT INTO license (
                license_key, customer_name, customer_email, license_type,
                status, issued_at, expires_at, hardware_id, features, notes, signature
            ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&license_file.license_key)
        .bind(&license_file.customer_name)
        .bind(&license_file.customer_email)
        .bind(&license_file.license_type)
        .bind(&license_file.issued_at)
        .bind(&license_file.expires_at)
        .bind(&license_file.hardware_id)
        .bind(features_json)
        .bind(&license_file.notes)
        .bind(&license_file.signature)
        .fetch_one(&self.db)
        .await
        ?;

        // 6. Log validazione
        self.log_validation(Some(&license.id), true, None).await?;

        Ok(license)
    }

    /// Valida la licenza corrente
    pub async fn validate_license(&self) -> AppResult<bool> {
        // Ottieni licenza dal database
        let license_opt = sqlx::query_as::<_, License>("SELECT * FROM license LIMIT 1")
            .fetch_optional(&self.db)
            .await
            ?;

        let license = match license_opt {
            Some(l) => l,
            None => {
                self.log_validation(None, false, Some("No license found"))
                    .await?;
                return Ok(false);
            }
        };

        // Verifica stato
        if license.status != "active" {
            self.log_validation(
                Some(&license.id),
                false,
                Some(&format!("License status: {}", license.status)),
            )
            .await?;
            return Ok(false);
        }

        // Verifica scadenza
        if let Some(expires_at) = &license.expires_at {
            if let Ok(expiry) = DateTime::parse_from_rfc3339(expires_at) {
                if expiry.with_timezone(&Utc) < Utc::now() {
                    // Aggiorna stato a expired
                    sqlx::query("UPDATE license SET status = 'expired' WHERE id = ?")
                        .bind(&license.id)
                        .execute(&self.db)
                        .await
                        .ok();

                    self.log_validation(
                        Some(&license.id),
                        false,
                        Some("License expired"),
                    )
                    .await?;
                    return Ok(false);
                }
            }
        }

        // Verifica hardware binding (se presente)
        if let Some(bound_hardware_id) = &license.hardware_id {
            let current_hardware_id = Self::get_hardware_id()?;
            if bound_hardware_id != &current_hardware_id {
                self.log_validation(
                    Some(&license.id),
                    false,
                    Some("Hardware mismatch"),
                )
                .await?;
                return Ok(false);
            }
        }

        // Licenza valida
        self.log_validation(Some(&license.id), true, None).await?;
        Ok(true)
    }

    /// Ottieni informazioni sulla licenza corrente
    pub async fn get_license_info(&self) -> AppResult<LicenseInfo> {
        let license_opt = sqlx::query_as::<_, License>("SELECT * FROM license LIMIT 1")
            .fetch_optional(&self.db)
            .await
            ?;

        match license_opt {
            Some(license) => {
                let days_remaining = if let Some(expires_at) = &license.expires_at {
                    if let Ok(expiry) = DateTime::parse_from_rfc3339(expires_at) {
                        Some((expiry.with_timezone(&Utc) - Utc::now()).num_days())
                    } else {
                        None
                    }
                } else {
                    None // Lifetime license
                };

                Ok(LicenseInfo {
                    has_license: true,
                    license_type: Some(license.license_type.clone()),
                    customer_name: license.customer_name,
                    status: Some(license.status),
                    expires_at: license.expires_at,
                    days_remaining,
                    is_trial: license.license_type == "trial",
                })
            }
            None => Ok(LicenseInfo {
                has_license: false,
                license_type: None,
                customer_name: None,
                status: None,
                expires_at: None,
                days_remaining: None,
                is_trial: false,
            }),
        }
    }

    /// Revoca la licenza corrente
    pub async fn revoke_license(&self) -> AppResult<()> {
        sqlx::query("UPDATE license SET status = 'revoked' WHERE status = 'active'")
            .execute(&self.db)
            .await
            ?;

        Ok(())
    }

    /// Rimuovi completamente la licenza
    pub async fn remove_license(&self) -> AppResult<()> {
        sqlx::query("DELETE FROM license")
            .execute(&self.db)
            .await
            ?;

        Ok(())
    }

    /// Log una validazione (per audit)
    async fn log_validation(
        &self,
        license_id: Option<&str>,
        success: bool,
        error_message: Option<&str>,
    ) -> AppResult<()> {
        let app_version = env!("CARGO_PKG_VERSION");

        sqlx::query(
            r#"
            INSERT INTO license_validation_log (license_id, success, error_message, app_version)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(license_id)
        .bind(if success { 1 } else { 0 })
        .bind(error_message)
        .bind(app_version)
        .execute(&self.db)
        .await
        ?;

        Ok(())
    }
}
