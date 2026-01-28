use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct License {
    pub id: String,
    pub license_key: String,
    pub customer_name: Option<String>,
    pub customer_email: Option<String>,
    pub license_type: String,
    pub status: String,
    pub issued_at: String,
    pub activated_at: String,
    pub expires_at: Option<String>,
    pub hardware_id: Option<String>,
    pub features: Option<String>, // JSON string
    pub notes: Option<String>,
    pub signature: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Formato del file licenza (.bmlic)
/// Questo è il contenuto del file che l'utente riceve
#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseFile {
    pub license_key: String,
    pub customer_name: Option<String>,
    pub customer_email: Option<String>,
    pub license_type: String, // 'trial', 'monthly', 'annual', 'lifetime', 'custom'
    pub issued_at: String,     // ISO 8601
    pub expires_at: Option<String>, // NULL per lifetime
    pub hardware_id: Option<String>, // Se specificato, bind a questo device
    pub features: Vec<String>, // ["full_access"] o features specifiche
    pub notes: Option<String>,
    pub signature: String, // Firma digitale del contenuto
}

impl LicenseFile {
    /// Genera il payload da firmare (deterministic JSON)
    pub fn get_signing_payload(&self) -> String {
        serde_json::json!({
            "license_key": self.license_key,
            "customer_email": self.customer_email,
            "license_type": self.license_type,
            "issued_at": self.issued_at,
            "expires_at": self.expires_at,
            "hardware_id": self.hardware_id,
            "features": self.features,
        })
        .to_string()
    }

    /// Verifica se la licenza è scaduta
    pub fn is_expired(&self) -> bool {
        if let Some(expires_at) = &self.expires_at {
            if let Ok(expiry) = DateTime::parse_from_rfc3339(expires_at) {
                return expiry.with_timezone(&Utc) < Utc::now();
            }
        }
        false
    }

    /// Verifica se la licenza è vincolata a un hardware specifico
    pub fn is_hardware_bound(&self) -> bool {
        self.hardware_id.is_some()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub has_license: bool,
    pub license_type: Option<String>,
    pub customer_name: Option<String>,
    pub status: Option<String>,
    pub expires_at: Option<String>,
    pub days_remaining: Option<i64>,
    pub is_trial: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationLog {
    pub id: String,
    pub license_id: Option<String>,
    pub success: bool,
    pub error_message: Option<String>,
    pub validated_at: String,
    pub app_version: Option<String>,
}
