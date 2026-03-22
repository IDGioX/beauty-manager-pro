use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: String, // 'admin' | 'operatrice' | 'reception'
    pub nome: String,
    pub cognome: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub attivo: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct UserSettings {
    pub user_id: String,
    pub theme_mode: String, // 'light' | 'dark' | 'auto'
    pub primary_color: String,
    pub palette_id: Option<String>, // ID della palette colori
    pub font_size: String, // 'xs' | 'sm' | 'base' | 'lg' | 'xl'
    pub dashboard_layout: Option<String>, // JSON string
    pub custom_logo_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserSession {
    pub id: String,
    pub user_id: String,
    pub session_token: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

// Input types
#[derive(Debug, Deserialize)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: User,
    pub settings: UserSettings,
    pub session_token: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserInput {
    pub username: String,
    pub password: String,
    pub role: String,
    pub nome: String,
    pub cognome: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserInput {
    pub nome: Option<String>,
    pub cognome: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserSettingsInput {
    pub theme_mode: Option<String>,
    pub primary_color: Option<String>,
    pub palette_id: Option<String>,
    pub font_size: Option<String>,
    pub dashboard_layout: Option<String>,
    pub custom_logo_url: Option<String>,
}
