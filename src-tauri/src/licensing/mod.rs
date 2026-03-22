use crate::error::{AppError, AppResult};
use crate::models::{License, LicenseInfo};
use chrono::{Datelike, NaiveDate, Utc};
use hmac::{Hmac, Mac};
use rand::Rng;
use sha2::Sha256;
use sqlx::SqlitePool;

type HmacSha256 = Hmac<Sha256>;

/// Segreto per HMAC — cambiare prima della distribuzione
const HMAC_SECRET: &[u8] = b"bm_pro_2026_s3cret_k3y_h7x9q2w4";

/// Caratteri usati per la parte random della chiave (no 0/O/1/I per evitare confusione)
const CHARSET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

pub struct LicenseManager {
    db: SqlitePool,
}

impl LicenseManager {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Calcola checksum HMAC-SHA256 del payload, ritorna 4 chars hex uppercase
    fn compute_checksum(payload: &str) -> String {
        let mut mac =
            HmacSha256::new_from_slice(HMAC_SECRET).expect("HMAC can take key of any size");
        mac.update(payload.as_bytes());
        let result = mac.finalize();
        let hex_full = hex::encode_upper(result.into_bytes());
        hex_full[..4].to_string()
    }

    /// Genera una chiave di licenza nel formato BM-TTMM-YYYY-RRRR-CCCC
    pub fn generate_key(license_type: &str, durata_mesi: Option<i32>) -> AppResult<String> {
        let (tt, mm, yyyy) = match license_type {
            "trial" => {
                let mesi = durata_mesi.unwrap_or(1);
                let scadenza =
                    Utc::now().naive_utc().date() + chrono::Months::new(mesi as u32);
                (
                    "TR",
                    format!("{:02}", scadenza.month()),
                    format!("{:04}", scadenza.year()),
                )
            }
            "monthly" => {
                let mesi = durata_mesi.unwrap_or(1);
                let scadenza =
                    Utc::now().naive_utc().date() + chrono::Months::new(mesi as u32);
                (
                    "MO",
                    format!("{:02}", scadenza.month()),
                    format!("{:04}", scadenza.year()),
                )
            }
            "annual" => {
                let mesi = durata_mesi.unwrap_or(12);
                let scadenza =
                    Utc::now().naive_utc().date() + chrono::Months::new(mesi as u32);
                (
                    "AN",
                    format!("{:02}", scadenza.month()),
                    format!("{:04}", scadenza.year()),
                )
            }
            "lifetime" => ("LT", "00".to_string(), "0000".to_string()),
            _ => {
                return Err(AppError::InvalidInput(format!(
                    "Tipo licenza non valido: {}",
                    license_type
                )))
            }
        };

        // Genera 4 chars random
        let mut rng = rand::thread_rng();
        let random_part: String = (0..4)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect();

        // Payload per checksum: tutto tranne il checksum stesso
        let payload = format!("BM-{}{}-{}-{}", tt, mm, yyyy, random_part);
        let checksum = Self::compute_checksum(&payload);

        Ok(format!("{}-{}", payload, checksum))
    }

    /// Parsa e valida una chiave di licenza.
    /// Ritorna (license_type_db, Option<scadenza>)
    pub fn parse_and_validate_key(key: &str) -> AppResult<(String, Option<NaiveDate>)> {
        let key = key.trim().to_uppercase();

        // Formato atteso: BM-TTMM-YYYY-RRRR-CCCC (5 segmenti separati da -)
        let parts: Vec<&str> = key.split('-').collect();
        if parts.len() != 5 {
            return Err(AppError::InvalidInput(
                "Formato chiave non valido. Usa: BM-XXXX-XXXX-XXXX-XXXX".to_string(),
            ));
        }

        if parts[0] != "BM" {
            return Err(AppError::InvalidInput(
                "Chiave non valida: deve iniziare con BM".to_string(),
            ));
        }

        // Verifica lunghezze
        if parts[1].len() != 4 || parts[2].len() != 4 || parts[3].len() != 4 || parts[4].len() != 4
        {
            return Err(AppError::InvalidInput(
                "Formato chiave non valido: ogni segmento deve avere 4 caratteri".to_string(),
            ));
        }

        // Verifica checksum
        let payload = format!("{}-{}-{}-{}", parts[0], parts[1], parts[2], parts[3]);
        let expected_checksum = Self::compute_checksum(&payload);
        if parts[4] != expected_checksum {
            return Err(AppError::InvalidInput(
                "Chiave di licenza non valida".to_string(),
            ));
        }

        // Parsa tipo
        let tt = &parts[1][..2];
        let license_type = match tt {
            "TR" => "trial",
            "MO" => "monthly",
            "AN" => "annual",
            "LT" => "lifetime",
            _ => {
                return Err(AppError::InvalidInput(
                    "Tipo licenza non riconosciuto nella chiave".to_string(),
                ))
            }
        };

        // Parsa scadenza
        let mm_str = &parts[1][2..4];
        let yyyy_str = parts[2];

        let scadenza = if license_type == "lifetime" {
            None
        } else {
            let mese: u32 = mm_str.parse().map_err(|_| {
                AppError::InvalidInput("Mese non valido nella chiave".to_string())
            })?;
            let anno: i32 = yyyy_str.parse().map_err(|_| {
                AppError::InvalidInput("Anno non valido nella chiave".to_string())
            })?;

            if !(1..=12).contains(&mese) {
                return Err(AppError::InvalidInput(
                    "Mese non valido nella chiave".to_string(),
                ));
            }

            // Scadenza = ultimo giorno del mese indicato
            let next_month = if mese == 12 {
                NaiveDate::from_ymd_opt(anno + 1, 1, 1)
            } else {
                NaiveDate::from_ymd_opt(anno, mese + 1, 1)
            };

            let ultimo_giorno = next_month
                .ok_or_else(|| AppError::InvalidInput("Data scadenza non valida".to_string()))?
                .pred_opt()
                .ok_or_else(|| AppError::InvalidInput("Data scadenza non valida".to_string()))?;

            Some(ultimo_giorno)
        };

        Ok((license_type.to_string(), scadenza))
    }

    /// Attiva una licenza con la chiave fornita
    pub async fn activate_license(
        &self,
        key: &str,
        customer_name: Option<&str>,
    ) -> AppResult<License> {
        // 1. Valida chiave
        let (license_type, scadenza) = Self::parse_and_validate_key(key)?;

        // 2. Controlla scadenza
        if let Some(scad) = scadenza {
            let oggi = Utc::now().naive_utc().date();
            if scad < oggi {
                return Err(AppError::InvalidInput(
                    "La chiave di licenza è scaduta".to_string(),
                ));
            }
        }

        // 3. Rimuovi licenze esistenti
        sqlx::query("DELETE FROM license")
            .execute(&self.db)
            .await?;

        // 4. Inserisci nuova licenza
        let key_normalized = key.trim().to_uppercase();
        let expires_at = scadenza.map(|d| format!("{}T23:59:59Z", d));
        let issued_at = Utc::now().to_rfc3339();

        let license = sqlx::query_as::<_, License>(
            r#"
            INSERT INTO license (
                license_key, customer_name, license_type,
                status, issued_at, expires_at
            ) VALUES (?1, ?2, ?3, 'active', ?4, ?5)
            RETURNING id, license_key, customer_name, license_type, status,
                      issued_at, activated_at, expires_at, created_at, updated_at
            "#,
        )
        .bind(&key_normalized)
        .bind(customer_name)
        .bind(&license_type)
        .bind(&issued_at)
        .bind(&expires_at)
        .fetch_one(&self.db)
        .await?;

        // 5. Log
        self.log_validation(Some(&license.id), true, None).await?;

        Ok(license)
    }

    /// Valida la licenza corrente nel DB
    pub async fn validate_license(&self) -> AppResult<bool> {
        let license_opt = sqlx::query_as::<_, License>(
            "SELECT id, license_key, customer_name, license_type, status, issued_at, activated_at, expires_at, created_at, updated_at FROM license LIMIT 1",
        )
        .fetch_optional(&self.db)
        .await?;

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
            if let Ok(expiry) = chrono::DateTime::parse_from_rfc3339(expires_at) {
                if expiry.with_timezone(&Utc) < Utc::now() {
                    sqlx::query("UPDATE license SET status = 'expired' WHERE id = ?")
                        .bind(&license.id)
                        .execute(&self.db)
                        .await
                        .ok();

                    self.log_validation(Some(&license.id), false, Some("License expired"))
                        .await?;
                    return Ok(false);
                }
            }
        }

        self.log_validation(Some(&license.id), true, None).await?;
        Ok(true)
    }

    /// Ottieni informazioni sulla licenza corrente
    pub async fn get_license_info(&self) -> AppResult<LicenseInfo> {
        let license_opt = sqlx::query_as::<_, License>(
            "SELECT id, license_key, customer_name, license_type, status, issued_at, activated_at, expires_at, created_at, updated_at FROM license LIMIT 1",
        )
        .fetch_optional(&self.db)
        .await?;

        match license_opt {
            Some(license) => {
                let days_remaining = if let Some(expires_at) = &license.expires_at {
                    if let Ok(expiry) = chrono::DateTime::parse_from_rfc3339(expires_at) {
                        Some((expiry.with_timezone(&Utc) - Utc::now()).num_days())
                    } else {
                        None
                    }
                } else {
                    None // Lifetime
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

    /// Rimuovi la licenza
    pub async fn remove_license(&self) -> AppResult<()> {
        sqlx::query("DELETE FROM license")
            .execute(&self.db)
            .await?;
        Ok(())
    }

    /// Log validazione
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
        .await?;

        Ok(())
    }
}
