use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct License {
    pub id: String,
    pub license_key: String,
    pub customer_name: Option<String>,
    pub license_type: String,
    pub status: String,
    pub issued_at: String,
    pub activated_at: String,
    pub expires_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
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

/// Risultato della generazione chiave
#[derive(Debug, Serialize)]
pub struct GeneratedKey {
    pub key: String,
    pub license_type: String,
    pub expires_at: Option<String>,
}
