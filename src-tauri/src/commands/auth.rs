// Comandi per autenticazione e gestione utenti
use crate::error::AppResult;
use crate::models::{
    User, UserSettings, LoginInput, AuthResponse,
    CreateUserInput, UpdateUserInput, UpdateUserSettingsInput
};
use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::{Utc, Duration};

// Helper per generare session token random
fn generate_session_token() -> String {
    use rand::Rng;
    let bytes: [u8; 32] = rand::thread_rng().gen();
    hex::encode(bytes)
}

// Helper per generare UUID
fn generate_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[tauri::command]
pub async fn login(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    credentials: LoginInput,
) -> AppResult<AuthResponse> {
    let state = db.lock().await;

    // Validazione input
    if credentials.username.trim().is_empty() || credentials.password.is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "Username e password sono obbligatori".to_string(),
        ));
    }

    // Trova utente per username
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE username = ?1 AND attivo = 1"
    )
    .bind(&credentials.username)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| crate::error::AppError::Unauthorized(
        "Credenziali non valide".to_string()
    ))?;

    // Verifica password con bcrypt
    let password_valid = bcrypt::verify(&credentials.password, &user.password_hash)
        .map_err(|_| {
            crate::error::AppError::Internal(
                "Errore durante la verifica della password".to_string()
            )
        })?;

    if !password_valid {
        return Err(crate::error::AppError::Unauthorized(
            "Credenziali non valide".to_string()
        ));
    }

    // Carica user settings
    let settings = sqlx::query_as::<_, UserSettings>(
        "SELECT * FROM user_settings WHERE user_id = ?1"
    )
    .bind(&user.id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| crate::error::AppError::Internal(
        "Settings utente non trovati".to_string()
    ))?;

    // Genera session token
    let session_token = generate_session_token();
    let session_id = generate_uuid();
    let expires_at = Utc::now() + Duration::days(30);

    // Salva sessione nel database
    sqlx::query(
        r#"
        INSERT INTO user_sessions (id, user_id, session_token, expires_at)
        VALUES (?1, ?2, ?3, ?4)
        "#
    )
    .bind(&session_id)
    .bind(&user.id)
    .bind(&session_token)
    .bind(expires_at)
    .execute(&state.db.pool)
    .await?;

    Ok(AuthResponse {
        user,
        settings,
        session_token,
    })
}

#[tauri::command]
pub async fn logout(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    session_token: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Elimina sessione
    sqlx::query("DELETE FROM user_sessions WHERE session_token = ?1")
        .bind(&session_token)
        .execute(&state.db.pool)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn verify_session(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    session_token: String,
) -> AppResult<AuthResponse> {
    let state = db.lock().await;

    // Trova sessione valida
    let session = sqlx::query_as::<_, crate::models::UserSession>(
        "SELECT * FROM user_sessions WHERE session_token = ?1 AND expires_at > datetime('now')"
    )
    .bind(&session_token)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| crate::error::AppError::Unauthorized(
        "Sessione scaduta o non valida".to_string()
    ))?;

    // Carica utente
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?1 AND attivo = 1"
    )
    .bind(&session.user_id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| crate::error::AppError::NotFound(
        "Utente non trovato".to_string()
    ))?;

    // Carica settings
    let settings = sqlx::query_as::<_, UserSettings>(
        "SELECT * FROM user_settings WHERE user_id = ?1"
    )
    .bind(&user.id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| crate::error::AppError::Internal(
        "Settings utente non trovati".to_string()
    ))?;

    Ok(AuthResponse {
        user,
        settings,
        session_token,
    })
}

#[tauri::command]
pub async fn create_user(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateUserInput,
    caller_role: String,
) -> AppResult<User> {
    let state = db.lock().await;

    // Validazione
    if input.username.trim().is_empty() || input.password.is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "Username e password sono obbligatori".to_string(),
        ));
    }

    if !["admin", "operatrice", "reception"].contains(&input.role.as_str()) {
        return Err(crate::error::AppError::InvalidInput(
            "Ruolo non valido".to_string(),
        ));
    }

    // Controllo permessi: solo admin può creare utenti admin
    if input.role == "admin" && caller_role != "admin" {
        return Err(crate::error::AppError::Unauthorized(
            "Solo un amministratore può creare altri amministratori".to_string(),
        ));
    }

    // Verifica che username non esista già
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE username = ?1"
    )
    .bind(&input.username)
    .fetch_one(&state.db.pool)
    .await?;

    if existing > 0 {
        return Err(crate::error::AppError::InvalidInput(
            "Username già esistente".to_string(),
        ));
    }

    // Hash password
    let password_hash = bcrypt::hash(&input.password, bcrypt::DEFAULT_COST)
        .map_err(|_| crate::error::AppError::Internal(
            "Errore durante l'hashing della password".to_string()
        ))?;

    let user_id = generate_uuid();

    // Inserisci utente
    sqlx::query(
        r#"
        INSERT INTO users (id, username, password_hash, role, nome, cognome, email, avatar_url, attivo)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1)
        "#
    )
    .bind(&user_id)
    .bind(&input.username)
    .bind(&password_hash)
    .bind(&input.role)
    .bind(&input.nome)
    .bind(&input.cognome)
    .bind(&input.email)
    .bind(&input.avatar_url)
    .execute(&state.db.pool)
    .await?;

    // Crea settings di default
    sqlx::query(
        r#"
        INSERT INTO user_settings (user_id, theme_mode, primary_color, font_size)
        VALUES (?1, 'light', '#EC4899', 'base')
        "#
    )
    .bind(&user_id)
    .execute(&state.db.pool)
    .await?;

    // Ricarica utente creato
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?1"
    )
    .bind(&user_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(user)
}

#[tauri::command]
pub async fn get_all_users(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<Vec<User>> {
    let state = db.lock().await;

    let users = sqlx::query_as::<_, User>(
        "SELECT * FROM users ORDER BY cognome, nome"
    )
    .fetch_all(&state.db.pool)
    .await?;

    Ok(users)
}

#[tauri::command]
pub async fn update_user_settings(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    user_id: String,
    input: UpdateUserSettingsInput,
) -> AppResult<UserSettings> {
    let state = db.lock().await;

    // Costruisci query dinamica
    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(theme_mode) = &input.theme_mode {
        if !["light", "dark", "auto"].contains(&theme_mode.as_str()) {
            return Err(crate::error::AppError::InvalidInput(
                "Theme mode non valido".to_string(),
            ));
        }
        updates.push("theme_mode = ?");
        values.push(theme_mode.clone());
    }

    if let Some(primary_color) = &input.primary_color {
        updates.push("primary_color = ?");
        values.push(primary_color.clone());
    }

    if let Some(palette_id) = &input.palette_id {
        updates.push("palette_id = ?");
        values.push(palette_id.clone());
    }

    if let Some(font_size) = &input.font_size {
        if !["xs", "sm", "base", "lg", "xl"].contains(&font_size.as_str()) {
            return Err(crate::error::AppError::InvalidInput(
                "Font size non valido".to_string(),
            ));
        }
        updates.push("font_size = ?");
        values.push(font_size.clone());
    }

    if let Some(dashboard_layout) = &input.dashboard_layout {
        updates.push("dashboard_layout = ?");
        values.push(dashboard_layout.clone());
    }

    if let Some(custom_logo_url) = &input.custom_logo_url {
        updates.push("custom_logo_url = ?");
        values.push(custom_logo_url.clone());
    }

    if updates.is_empty() {
        // Nessun campo da aggiornare, ritorna settings correnti
        let settings = sqlx::query_as::<_, UserSettings>(
            "SELECT * FROM user_settings WHERE user_id = ?1"
        )
        .bind(&user_id)
        .fetch_one(&state.db.pool)
        .await?;

        return Ok(settings);
    }

    // Esegui update
    let query_str = format!(
        "UPDATE user_settings SET {} WHERE user_id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);
    for value in &values {
        query = query.bind(value);
    }
    query = query.bind(&user_id);

    query.execute(&state.db.pool).await?;

    // Ricarica settings aggiornati
    let settings = sqlx::query_as::<_, UserSettings>(
        "SELECT * FROM user_settings WHERE user_id = ?1"
    )
    .bind(&user_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(settings)
}

// Cleanup automatico sessioni scadute (da chiamare periodicamente)
#[tauri::command]
pub async fn cleanup_expired_sessions(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<()> {
    let state = db.lock().await;

    sqlx::query("DELETE FROM user_sessions WHERE expires_at < datetime('now')")
        .execute(&state.db.pool)
        .await?;

    Ok(())
}

// Verifica se esistono utenti nel sistema
#[tauri::command]
pub async fn check_users_exist(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<bool> {
    let state = db.lock().await;

    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db.pool)
        .await?;

    Ok(count.0 > 0)
}

// Cambia la password di un utente
#[tauri::command]
pub async fn change_password(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    user_id: String,
    old_password: Option<String>,
    new_password: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Verifica vecchia password se fornita (obbligatoria per cambio self-service)
    if let Some(ref old_pwd) = old_password {
        let current_hash: Option<String> = sqlx::query_scalar(
            "SELECT password_hash FROM users WHERE id = ?"
        )
        .bind(&user_id)
        .fetch_optional(&state.db.pool)
        .await?;

        let current_hash = current_hash.ok_or_else(|| {
            crate::error::AppError::NotFound("Utente non trovato".to_string())
        })?;

        let old_valid = bcrypt::verify(old_pwd, &current_hash)
            .map_err(|e| crate::error::AppError::Internal(format!("Errore verifica password: {}", e)))?;

        if !old_valid {
            return Err(crate::error::AppError::InvalidInput(
                "La password attuale non è corretta".to_string()
            ));
        }
    }

    if new_password.len() < 4 {
        return Err(crate::error::AppError::InvalidInput(
            "La nuova password deve essere di almeno 4 caratteri".to_string()
        ));
    }

    // Hash della nuova password
    let password_hash = bcrypt::hash(&new_password, bcrypt::DEFAULT_COST)
        .map_err(|e| crate::error::AppError::Internal(format!("Errore hash password: {}", e)))?;

    // Aggiorna password nel database
    sqlx::query(
        "UPDATE users SET password_hash = ?1, updated_at = datetime('now') WHERE id = ?2"
    )
    .bind(&password_hash)
    .bind(&user_id)
    .execute(&state.db.pool)
    .await?;

    Ok(())
}

// Registra il primo utente del sistema (solo se non esistono utenti)
#[tauri::command]
pub async fn register_first_user(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateUserInput,
) -> AppResult<AuthResponse> {
    let state = db.lock().await;

    // Verifica che non esistano già utenti
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db.pool)
        .await?;

    if count.0 > 0 {
        return Err(crate::error::AppError::Conflict(
            "Esistono già utenti nel sistema".to_string()
        ));
    }

    // Validazione input
    if input.username.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "Username è obbligatorio".to_string()
        ));
    }
    if input.password.is_empty() || input.password.len() < 4 {
        return Err(crate::error::AppError::InvalidInput(
            "La password deve essere di almeno 4 caratteri".to_string()
        ));
    }

    // Hash della password
    let password_hash = bcrypt::hash(&input.password, bcrypt::DEFAULT_COST)
        .map_err(|e| crate::error::AppError::Internal(format!("Errore hash password: {}", e)))?;

    let user_id = generate_uuid();
    let now = Utc::now().to_rfc3339();

    // Crea utente (sempre con ruolo admin per il primo utente)
    sqlx::query(
        "INSERT INTO users (id, username, password_hash, role, nome, cognome, attivo, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'admin', ?4, ?5, 1, ?6, ?6)"
    )
    .bind(&user_id)
    .bind(&input.username)
    .bind(&password_hash)
    .bind(&input.nome)
    .bind(&input.cognome)
    .bind(&now)
    .execute(&state.db.pool)
    .await?;

    // Crea impostazioni default per l'utente
    sqlx::query(
        "INSERT INTO user_settings (user_id, theme_mode, primary_color, font_size)
         VALUES (?1, 'light', '#EC4899', 'base')"
    )
    .bind(&user_id)
    .execute(&state.db.pool)
    .await?;

    // Genera session token
    let session_token = generate_session_token();
    let session_id = generate_uuid();
    let expires_at = (Utc::now() + Duration::days(30)).to_rfc3339();

    sqlx::query(
        "INSERT INTO user_sessions (id, user_id, session_token, expires_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(&session_id)
    .bind(&user_id)
    .bind(&session_token)
    .bind(&expires_at)
    .bind(&now)
    .execute(&state.db.pool)
    .await?;

    // Carica l'utente creato
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?1"
    )
    .bind(&user_id)
    .fetch_one(&state.db.pool)
    .await?;

    // Carica le impostazioni
    let settings = sqlx::query_as::<_, UserSettings>(
        "SELECT * FROM user_settings WHERE user_id = ?1"
    )
    .bind(&user_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(AuthResponse {
        user,
        settings,
        session_token,
    })
}

// Aggiorna dati di un utente (nome, cognome, email, ruolo)
#[tauri::command]
pub async fn update_user(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    user_id: String,
    input: UpdateUserInput,
    caller_role: String,
) -> AppResult<User> {
    let state = db.lock().await;

    // Controllo permessi: solo admin può assegnare ruolo admin
    if let Some(ref new_role) = input.role {
        if !["admin", "operatrice", "reception"].contains(&new_role.as_str()) {
            return Err(crate::error::AppError::InvalidInput(
                "Ruolo non valido".to_string(),
            ));
        }
        if new_role == "admin" && caller_role != "admin" {
            return Err(crate::error::AppError::Unauthorized(
                "Solo un amministratore può assegnare il ruolo admin".to_string(),
            ));
        }
    }

    // Costruisci update dinamico
    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(nome) = &input.nome {
        updates.push("nome = ?");
        values.push(nome.clone());
    }
    if let Some(cognome) = &input.cognome {
        updates.push("cognome = ?");
        values.push(cognome.clone());
    }
    if let Some(email) = &input.email {
        updates.push("email = ?");
        values.push(email.clone());
    }
    if let Some(role) = &input.role {
        updates.push("role = ?");
        values.push(role.clone());
    }

    if updates.is_empty() {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?1")
            .bind(&user_id)
            .fetch_one(&state.db.pool)
            .await?;
        return Ok(user);
    }

    updates.push("updated_at = datetime('now')");

    let query_str = format!(
        "UPDATE users SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);
    for value in &values {
        query = query.bind(value);
    }
    query = query.bind(&user_id);
    query.execute(&state.db.pool).await?;

    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?1")
        .bind(&user_id)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(user)
}

// Attiva/disattiva un utente
#[tauri::command]
pub async fn toggle_user_active(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    user_id: String,
    attivo: bool,
    caller_id: String,
) -> AppResult<()> {
    let state = db.lock().await;

    // Impedisci auto-disattivazione
    if !attivo && caller_id == user_id {
        return Err(crate::error::AppError::InvalidInput(
            "Non puoi disattivare il tuo stesso account".to_string(),
        ));
    }

    // Se si sta disattivando un admin, verificare che non sia l'ultimo admin attivo
    if !attivo {
        let target_role: Option<String> = sqlx::query_scalar(
            "SELECT role FROM users WHERE id = ?1"
        )
        .bind(&user_id)
        .fetch_optional(&state.db.pool)
        .await?;

        if let Some(role) = target_role {
            if role == "admin" {
                let other_active_admins: i64 = sqlx::query_scalar(
                    "SELECT COUNT(*) FROM users WHERE role = 'admin' AND attivo = 1 AND id != ?1"
                )
                .bind(&user_id)
                .fetch_one(&state.db.pool)
                .await?;

                if other_active_admins == 0 {
                    return Err(crate::error::AppError::InvalidInput(
                        "Impossibile disattivare l'ultimo amministratore attivo".to_string(),
                    ));
                }
            }
        }
    }

    sqlx::query("UPDATE users SET attivo = ?1, updated_at = datetime('now') WHERE id = ?2")
        .bind(attivo)
        .bind(&user_id)
        .execute(&state.db.pool)
        .await?;

    // Se disattivato, elimina tutte le sessioni dell'utente
    if !attivo {
        sqlx::query("DELETE FROM user_sessions WHERE user_id = ?1")
            .bind(&user_id)
            .execute(&state.db.pool)
            .await?;
    }

    Ok(())
}

// Elimina definitivamente un utente
#[tauri::command]
pub async fn delete_user(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    caller_role: String,
    user_id: String,
) -> AppResult<()> {
    // Solo gli admin possono eliminare utenti
    if caller_role != "admin" {
        return Err(crate::error::AppError::InvalidInput(
            "Solo gli amministratori possono eliminare utenti".to_string()
        ));
    }

    let state = db.lock().await;

    // Verifica che non sia l'ultimo admin
    let admin_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE ruolo = 'admin' AND id != ?1"
    )
    .bind(&user_id)
    .fetch_one(&state.db.pool)
    .await?;

    let user_role: Option<String> = sqlx::query_scalar(
        "SELECT ruolo FROM users WHERE id = ?"
    )
    .bind(&user_id)
    .fetch_optional(&state.db.pool)
    .await?;

    if let Some(role) = user_role {
        if role == "admin" && admin_count == 0 {
            return Err(crate::error::AppError::InvalidInput(
                "Impossibile eliminare l'ultimo amministratore".to_string()
            ));
        }
    }

    // Usa transazione per eliminazione atomica
    let mut tx = state.db.pool.begin().await?;

    // Elimina sessioni
    sqlx::query("DELETE FROM user_sessions WHERE user_id = ?1")
        .bind(&user_id)
        .execute(&mut *tx)
        .await?;

    // Elimina settings
    sqlx::query("DELETE FROM user_settings WHERE user_id = ?1")
        .bind(&user_id)
        .execute(&mut *tx)
        .await?;

    // Elimina utente
    let result = sqlx::query("DELETE FROM users WHERE id = ?1")
        .bind(&user_id)
        .execute(&mut *tx)
        .await?;

    if result.rows_affected() == 0 {
        return Err(crate::error::AppError::NotFound("Utente non trovato".to_string()));
    }

    tx.commit().await?;

    Ok(())
}
