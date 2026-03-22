// Comandi per messaggistica
use crate::error::{AppError, AppResult};
use crate::models::{
    TemplateMesaggio, CreateTemplateInput, UpdateTemplateInput,
    ComunicazioneWithCliente,
    ConfigSmtp, SaveSmtpConfigInput,
    ConfigScheduler, SaveSchedulerConfigInput,
    CampagnaMarketing, CreateCampagnaInput, CampagnaDestinatario,
    MessageLink, ComunicazioniStats, TipoCount, CanaleCount,
    FiltriComunicazioni, TargetFilters,
    Cliente, Azienda, AppuntamentoWithDetails,
};
use chrono::{Utc, Local, Datelike};
use lettre::{
    Message, SmtpTransport, Transport,
    transport::smtp::authentication::Credentials,
};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

// ============================================================================
// GENERAZIONE LINK
// ============================================================================

#[tauri::command]
pub fn generate_sms_link(telefono: String, messaggio: String) -> AppResult<MessageLink> {
    let phone = normalize_phone(&telefono);
    // Convert literal \n to actual newlines before URL encoding
    let messaggio_fixed = messaggio.replace("\\n", "\n");
    let encoded_message = urlencoding::encode(&messaggio_fixed);

    let link = format!("sms:{}?body={}", phone, encoded_message);

    Ok(MessageLink {
        link,
        canale: "sms".to_string(),
        destinatario: telefono,
        messaggio: messaggio_fixed,
    })
}

#[tauri::command]
pub fn generate_whatsapp_link(telefono: String, messaggio: String) -> AppResult<MessageLink> {
    let phone = normalize_phone_whatsapp(&telefono);
    // Convert literal \n to actual newlines before URL encoding
    let messaggio_fixed = messaggio.replace("\\n", "\n");
    let encoded_message = urlencoding::encode(&messaggio_fixed);

    let link = format!("https://wa.me/{}?text={}", phone, encoded_message);

    Ok(MessageLink {
        link,
        canale: "whatsapp".to_string(),
        destinatario: telefono,
        messaggio: messaggio_fixed,
    })
}

#[tauri::command]
pub fn generate_email_link(email: String, oggetto: String, messaggio: String) -> AppResult<MessageLink> {
    // Convert literal \n to actual newlines before URL encoding
    let oggetto_fixed = oggetto.replace("\\n", "\n");
    let messaggio_fixed = messaggio.replace("\\n", "\n");
    let encoded_subject = urlencoding::encode(&oggetto_fixed);
    let encoded_body = urlencoding::encode(&messaggio_fixed);

    let link = format!("mailto:{}?subject={}&body={}", email, encoded_subject, encoded_body);

    Ok(MessageLink {
        link,
        canale: "email".to_string(),
        destinatario: email,
        messaggio: messaggio_fixed,
    })
}

#[tauri::command]
pub async fn open_message_link(link: String) -> AppResult<()> {
    open::that(&link).map_err(|e| AppError::Internal(format!("Errore apertura link: {}", e)))
}

fn normalize_phone(phone: &str) -> String {
    let digits: String = phone.chars().filter(|c| c.is_ascii_digit() || *c == '+').collect();

    let digits = if digits.starts_with("00") {
        format!("+{}", &digits[2..])
    } else {
        digits
    };

    if !digits.starts_with('+') {
        format!("+39{}", digits)
    } else {
        digits
    }
}

fn normalize_phone_whatsapp(phone: &str) -> String {
    let normalized = normalize_phone(phone);
    normalized.trim_start_matches('+').to_string()
}

// ============================================================================
// EMAIL SMTP
// ============================================================================

#[tauri::command]
pub async fn send_email(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    to: String,
    subject: String,
    body: String,
    cliente_id: Option<String>,
    appuntamento_id: Option<String>,
    tipo: Option<String>,
) -> AppResult<String> {
    let state = db.lock().await;

    let config: ConfigSmtp = sqlx::query_as("SELECT * FROM config_smtp WHERE id = 'default'")
        .fetch_optional(&state.db.pool)
        .await?
        .ok_or_else(|| AppError::InvalidInput("SMTP non configurato".to_string()))?;

    if !config.enabled {
        return Err(AppError::InvalidInput("SMTP disabilitato".to_string()));
    }

    let from_address = if let Some(ref name) = config.from_name {
        format!("{} <{}>", name, config.from_email)
    } else {
        config.from_email.clone()
    };

    let email = Message::builder()
        .from(from_address.parse().map_err(|e| AppError::InvalidInput(format!("Indirizzo mittente non valido: {}", e)))?)
        .to(to.parse().map_err(|e| AppError::InvalidInput(format!("Indirizzo destinatario non valido: {}", e)))?)
        .subject(&subject)
        .body(body.clone())
        .map_err(|e| AppError::Internal(format!("Errore costruzione email: {}", e)))?;

    let creds = Credentials::new(config.username.clone(), config.password.clone());

    let mailer = if config.encryption == "ssl" {
        SmtpTransport::relay(&config.host)
            .map_err(|e| AppError::Internal(format!("Errore connessione SMTP: {}", e)))?
            .port(config.port as u16)
            .credentials(creds)
            .build()
    } else {
        SmtpTransport::starttls_relay(&config.host)
            .map_err(|e| AppError::Internal(format!("Errore connessione SMTP: {}", e)))?
            .port(config.port as u16)
            .credentials(creds)
            .build()
    };

    mailer.send(&email).map_err(|e| AppError::Internal(format!("Errore invio email: {}", e)))?;

    let comunicazione_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    sqlx::query(
        r#"INSERT INTO comunicazioni
           (id, cliente_id, appuntamento_id, tipo, canale, stato, destinatario, oggetto, messaggio, inviato_at, created_at)
           VALUES (?, ?, ?, ?, 'email', 'inviato', ?, ?, ?, ?, ?)"#
    )
    .bind(&comunicazione_id)
    .bind(&cliente_id)
    .bind(&appuntamento_id)
    .bind(tipo.unwrap_or_else(|| "manuale".to_string()))
    .bind(&to)
    .bind(&subject)
    .bind(&body)
    .bind(now)
    .bind(now)
    .execute(&state.db.pool)
    .await?;

    Ok(comunicazione_id)
}

#[tauri::command]
pub async fn test_smtp_connection(
    host: String,
    port: i32,
    username: String,
    password: String,
    encryption: String,
) -> AppResult<String> {
    let creds = Credentials::new(username, password);

    let mailer = if encryption == "ssl" {
        SmtpTransport::relay(&host)
            .map_err(|e| AppError::Internal(format!("Errore connessione: {}", e)))?
            .port(port as u16)
            .credentials(creds)
            .build()
    } else {
        SmtpTransport::starttls_relay(&host)
            .map_err(|e| AppError::Internal(format!("Errore connessione: {}", e)))?
            .port(port as u16)
            .credentials(creds)
            .build()
    };

    mailer.test_connection()
        .map_err(|e| AppError::Internal(format!("Test connessione fallito: {}", e)))?;

    Ok("Connessione SMTP riuscita!".to_string())
}

// ============================================================================
// CONFIG SMTP
// ============================================================================

#[tauri::command]
pub async fn get_smtp_config(db: tauri::State<'_, Arc<Mutex<crate::AppState>>>) -> AppResult<Option<ConfigSmtp>> {
    let state = db.lock().await;
    let config = sqlx::query_as::<_, ConfigSmtp>("SELECT * FROM config_smtp WHERE id = 'default'")
        .fetch_optional(&state.db.pool)
        .await?;
    Ok(config)
}

#[tauri::command]
pub async fn save_smtp_config(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: SaveSmtpConfigInput
) -> AppResult<ConfigSmtp> {
    let state = db.lock().await;
    let now = Utc::now();

    sqlx::query(
        r#"INSERT INTO config_smtp (id, host, port, username, password, from_email, from_name, encryption, enabled, created_at, updated_at)
           VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
           host = excluded.host,
           port = excluded.port,
           username = excluded.username,
           password = excluded.password,
           from_email = excluded.from_email,
           from_name = excluded.from_name,
           encryption = excluded.encryption,
           enabled = excluded.enabled,
           updated_at = excluded.updated_at"#
    )
    .bind(&input.host)
    .bind(input.port)
    .bind(&input.username)
    .bind(&input.password)
    .bind(&input.from_email)
    .bind(&input.from_name)
    .bind(&input.encryption)
    .bind(input.enabled)
    .bind(now)
    .bind(now)
    .execute(&state.db.pool)
    .await?;

    let config = sqlx::query_as::<_, ConfigSmtp>("SELECT * FROM config_smtp WHERE id = 'default'")
        .fetch_one(&state.db.pool)
        .await?;

    Ok(config)
}

// ============================================================================
// CONFIG SCHEDULER
// ============================================================================

#[tauri::command]
pub async fn get_scheduler_config(db: tauri::State<'_, Arc<Mutex<crate::AppState>>>) -> AppResult<ConfigScheduler> {
    let state = db.lock().await;
    let config = sqlx::query_as::<_, ConfigScheduler>("SELECT * FROM config_scheduler WHERE id = 'default'")
        .fetch_one(&state.db.pool)
        .await?;
    Ok(config)
}

#[tauri::command]
pub async fn save_scheduler_config(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: SaveSchedulerConfigInput
) -> AppResult<ConfigScheduler> {
    let state = db.lock().await;
    let now = Utc::now();

    sqlx::query(
        r#"UPDATE config_scheduler SET
           reminder_enabled = ?,
           reminder_hours_before = ?,
           reminder_second_hours_before = ?,
           reminder_default_channel = ?,
           birthday_enabled = ?,
           birthday_check_time = ?,
           birthday_default_channel = ?,
           birthday_template_id = ?,
           updated_at = ?
           WHERE id = 'default'"#
    )
    .bind(input.reminder_enabled)
    .bind(input.reminder_hours_before)
    .bind(input.reminder_second_hours_before)
    .bind(&input.reminder_default_channel)
    .bind(input.birthday_enabled)
    .bind(&input.birthday_check_time)
    .bind(&input.birthday_default_channel)
    .bind(&input.birthday_template_id)
    .bind(now)
    .execute(&state.db.pool)
    .await?;

    let config = sqlx::query_as::<_, ConfigScheduler>("SELECT * FROM config_scheduler WHERE id = 'default'")
        .fetch_one(&state.db.pool)
        .await?;

    Ok(config)
}

// ============================================================================
// TEMPLATE MESSAGGI
// ============================================================================

#[tauri::command]
pub async fn get_templates(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    tipo: Option<String>,
    canale: Option<String>
) -> AppResult<Vec<TemplateMesaggio>> {
    let state = db.lock().await;

    let templates = match (&tipo, &canale) {
        (Some(t), Some(c)) => {
            sqlx::query_as::<_, TemplateMesaggio>(
                "SELECT * FROM template_messaggi WHERE tipo = ? AND canale = ? ORDER BY tipo, nome"
            )
            .bind(t)
            .bind(c)
            .fetch_all(&state.db.pool)
            .await?
        }
        (Some(t), None) => {
            sqlx::query_as::<_, TemplateMesaggio>(
                "SELECT * FROM template_messaggi WHERE tipo = ? ORDER BY tipo, nome"
            )
            .bind(t)
            .fetch_all(&state.db.pool)
            .await?
        }
        (None, Some(c)) => {
            sqlx::query_as::<_, TemplateMesaggio>(
                "SELECT * FROM template_messaggi WHERE canale = ? ORDER BY tipo, nome"
            )
            .bind(c)
            .fetch_all(&state.db.pool)
            .await?
        }
        (None, None) => {
            sqlx::query_as::<_, TemplateMesaggio>(
                "SELECT * FROM template_messaggi ORDER BY tipo, nome"
            )
            .fetch_all(&state.db.pool)
            .await?
        }
    };

    Ok(templates)
}

#[tauri::command]
pub async fn get_template_by_id(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String
) -> AppResult<TemplateMesaggio> {
    let state = db.lock().await;
    let template = sqlx::query_as::<_, TemplateMesaggio>("SELECT * FROM template_messaggi WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.db.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Template non trovato".to_string()))?;
    Ok(template)
}

#[tauri::command]
pub async fn create_template(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateTemplateInput
) -> AppResult<TemplateMesaggio> {
    let state = db.lock().await;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();

    sqlx::query(
        r#"INSERT INTO template_messaggi (id, codice, nome, tipo, canale, oggetto, corpo, attivo, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"#
    )
    .bind(&id)
    .bind(&input.codice)
    .bind(&input.nome)
    .bind(&input.tipo)
    .bind(&input.canale)
    .bind(&input.oggetto)
    .bind(&input.corpo)
    .bind(now)
    .bind(now)
    .execute(&state.db.pool)
    .await?;

    let template = sqlx::query_as::<_, TemplateMesaggio>("SELECT * FROM template_messaggi WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(template)
}

#[tauri::command]
pub async fn update_template(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    input: UpdateTemplateInput
) -> AppResult<TemplateMesaggio> {
    let state = db.lock().await;
    let now = Utc::now();

    let current = sqlx::query_as::<_, TemplateMesaggio>("SELECT * FROM template_messaggi WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.db.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Template non trovato".to_string()))?;

    sqlx::query(
        r#"UPDATE template_messaggi SET
           nome = ?, oggetto = ?, corpo = ?, attivo = ?, updated_at = ?
           WHERE id = ?"#
    )
    .bind(input.nome.unwrap_or(current.nome))
    .bind(input.oggetto.or(current.oggetto))
    .bind(input.corpo.unwrap_or(current.corpo))
    .bind(input.attivo.unwrap_or(current.attivo))
    .bind(now)
    .bind(&id)
    .execute(&state.db.pool)
    .await?;

    let template = sqlx::query_as::<_, TemplateMesaggio>("SELECT * FROM template_messaggi WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(template)
}

#[tauri::command]
pub async fn delete_template(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String
) -> AppResult<()> {
    let state = db.lock().await;
    sqlx::query("DELETE FROM template_messaggi WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;
    Ok(())
}

// ============================================================================
// ELABORAZIONE TEMPLATE
// ============================================================================

#[tauri::command]
pub async fn process_template(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    template_id: String,
    cliente_id: String,
    appuntamento_id: Option<String>,
) -> AppResult<(String, Option<String>)> {
    let state = db.lock().await;

    let template = sqlx::query_as::<_, TemplateMesaggio>("SELECT * FROM template_messaggi WHERE id = ?")
        .bind(&template_id)
        .fetch_optional(&state.db.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Template non trovato".to_string()))?;

    let cliente = sqlx::query_as::<_, Cliente>("SELECT * FROM clienti WHERE id = ?")
        .bind(&cliente_id)
        .fetch_optional(&state.db.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Cliente non trovato".to_string()))?;

    let azienda = sqlx::query_as::<_, Azienda>("SELECT * FROM config_centro LIMIT 1")
        .fetch_optional(&state.db.pool)
        .await?;

    let nome_centro = azienda.map(|a| a.nome_centro).unwrap_or_else(|| "il nostro centro".to_string());

    let mut corpo = template.corpo.clone();
    let mut oggetto = template.oggetto.clone();

    corpo = corpo.replace("{nome}", &cliente.nome);
    corpo = corpo.replace("{cognome}", &cliente.cognome);
    corpo = corpo.replace("{nome_centro}", &nome_centro);

    if let Some(ref mut obj) = oggetto {
        *obj = obj.replace("{nome}", &cliente.nome);
        *obj = obj.replace("{cognome}", &cliente.cognome);
        *obj = obj.replace("{nome_centro}", &nome_centro);
    }

    if let Some(app_id) = appuntamento_id {
        let appuntamento = sqlx::query_as::<_, AppuntamentoWithDetails>(
            r#"SELECT
               a.id, a.cliente_id, a.operatrice_id, a.trattamento_id,
               a.data_ora_inizio, a.data_ora_fine, a.stato,
               a.note_prenotazione, a.note_trattamento, a.prezzo_applicato,
               a.created_at, a.updated_at,
               c.nome as cliente_nome,
               c.cognome as cliente_cognome,
               c.cellulare as cliente_cellulare,
               o.nome as operatrice_nome,
               o.cognome as operatrice_cognome,
               o.colore_agenda as operatrice_colore,
               t.nome as trattamento_nome,
               t.durata_minuti as trattamento_durata
               FROM appuntamenti a
               LEFT JOIN clienti c ON a.cliente_id = c.id
               LEFT JOIN operatrici o ON a.operatrice_id = o.id
               LEFT JOIN trattamenti t ON a.trattamento_id = t.id
               WHERE a.id = ?"#
        )
        .bind(&app_id)
        .fetch_optional(&state.db.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Appuntamento non trovato".to_string()))?;

        let local_inizio = appuntamento.data_ora_inizio.with_timezone(&Local);
        let data_app = local_inizio.format("%d/%m/%Y").to_string();
        let ora_app = local_inizio.format("%H:%M").to_string();
        let trattamento_nome = appuntamento.trattamento_nome.clone();

        corpo = corpo.replace("{data_appuntamento}", &data_app);
        corpo = corpo.replace("{ora_appuntamento}", &ora_app);
        corpo = corpo.replace("{trattamento}", &trattamento_nome);

        if let Some(ref mut obj) = oggetto {
            *obj = obj.replace("{data_appuntamento}", &data_app);
            *obj = obj.replace("{ora_appuntamento}", &ora_app);
            *obj = obj.replace("{trattamento}", &trattamento_nome);
        }
    }

    Ok((corpo, oggetto))
}

// ============================================================================
// INVIO REMINDER
// ============================================================================

#[tauri::command]
pub async fn send_reminder(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    appuntamento_id: String,
    canale: String,
) -> AppResult<MessageLink> {
    let state = db.lock().await;

    let appuntamento = sqlx::query_as::<_, AppuntamentoWithDetails>(
        r#"SELECT
           a.id, a.cliente_id, a.operatrice_id, a.trattamento_id,
           a.data_ora_inizio, a.data_ora_fine, a.stato,
           a.note_prenotazione, a.note_trattamento, a.prezzo_applicato,
           a.created_at, a.updated_at,
           c.nome as cliente_nome,
           c.cognome as cliente_cognome,
           c.cellulare as cliente_cellulare,
           o.nome as operatrice_nome,
           o.cognome as operatrice_cognome,
           o.colore_agenda as operatrice_colore,
           t.nome as trattamento_nome,
           t.durata_minuti as trattamento_durata
           FROM appuntamenti a
           LEFT JOIN clienti c ON a.cliente_id = c.id
           LEFT JOIN operatrici o ON a.operatrice_id = o.id
           LEFT JOIN trattamenti t ON a.trattamento_id = t.id
           WHERE a.id = ?"#
    )
    .bind(&appuntamento_id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Appuntamento non trovato".to_string()))?;

    let template = sqlx::query_as::<_, TemplateMesaggio>(
        "SELECT * FROM template_messaggi WHERE tipo = 'reminder_appuntamento' AND canale = ? AND attivo = 1 LIMIT 1"
    )
    .bind(&canale)
    .fetch_optional(&state.db.pool)
    .await?;

    let local_inizio = appuntamento.data_ora_inizio.with_timezone(&Local);
    let data_app = local_inizio.format("%d/%m/%Y").to_string();
    let ora_app = local_inizio.format("%H:%M").to_string();
    let trattamento = appuntamento.trattamento_nome.clone();
    let cliente_nome = appuntamento.cliente_nome.clone();

    // Recupera il cliente per ottenere email e altri dettagli
    let cliente = sqlx::query_as::<_, Cliente>("SELECT * FROM clienti WHERE id = ?")
        .bind(&appuntamento.cliente_id)
        .fetch_one(&state.db.pool)
        .await?;

    let (messaggio, oggetto) = if let Some(tmpl) = template {
        let azienda = sqlx::query_as::<_, Azienda>("SELECT * FROM config_centro LIMIT 1")
            .fetch_optional(&state.db.pool)
            .await?;
        let nome_centro = azienda.map(|a| a.nome_centro).unwrap_or_else(|| "il nostro centro".to_string());

        let cliente = sqlx::query_as::<_, Cliente>("SELECT * FROM clienti WHERE id = ?")
            .bind(&appuntamento.cliente_id)
            .fetch_one(&state.db.pool)
            .await?;

        let mut corpo = tmpl.corpo.clone();
        let mut ogg = tmpl.oggetto.clone();

        corpo = corpo.replace("{nome}", &cliente.nome);
        corpo = corpo.replace("{cognome}", &cliente.cognome);
        corpo = corpo.replace("{nome_centro}", &nome_centro);
        corpo = corpo.replace("{data_appuntamento}", &data_app);
        corpo = corpo.replace("{ora_appuntamento}", &ora_app);
        corpo = corpo.replace("{trattamento}", &trattamento);

        if let Some(ref mut o) = ogg {
            *o = o.replace("{nome}", &cliente.nome);
            *o = o.replace("{cognome}", &cliente.cognome);
            *o = o.replace("{data_appuntamento}", &data_app);
        }

        (corpo, ogg)
    } else {
        // Fallback: recupera nome centro anche senza template
        let azienda = sqlx::query_as::<_, Azienda>("SELECT * FROM config_centro LIMIT 1")
            .fetch_optional(&state.db.pool)
            .await?;
        let nome_centro = azienda.map(|a| a.nome_centro).unwrap_or_else(|| "il nostro centro".to_string());

        let msg = format!(
            "Ciao {}! Ti ricordiamo l'appuntamento per {} il {} alle {}. Ti aspettiamo!\n{}",
            cliente_nome, trattamento, data_app, ora_app, nome_centro
        );
        (msg, Some("Promemoria appuntamento".to_string()))
    };

    let link = match canale.as_str() {
        "sms" => {
            let telefono = cliente.cellulare.clone().or(cliente.telefono.clone()).unwrap_or_default();
            if telefono.is_empty() {
                return Err(AppError::InvalidInput("Cliente senza numero di telefono".to_string()));
            }
            generate_sms_link(telefono, messaggio.clone())?
        }
        "whatsapp" => {
            let telefono = cliente.cellulare.clone().or(cliente.telefono.clone()).unwrap_or_default();
            if telefono.is_empty() {
                return Err(AppError::InvalidInput("Cliente senza numero di telefono".to_string()));
            }
            generate_whatsapp_link(telefono, messaggio.clone())?
        }
        "email" => {
            let email = cliente.email.clone().unwrap_or_default();
            if email.is_empty() {
                return Err(AppError::InvalidInput("Cliente senza indirizzo email".to_string()));
            }
            generate_email_link(email, oggetto.clone().unwrap_or_default(), messaggio.clone())?
        }
        _ => return Err(AppError::InvalidInput("Canale non supportato".to_string())),
    };

    let comunicazione_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    sqlx::query(
        r#"INSERT INTO comunicazioni
           (id, cliente_id, appuntamento_id, tipo, canale, stato, destinatario, oggetto, messaggio, inviato_at, created_at)
           VALUES (?, ?, ?, 'reminder_appuntamento', ?, 'inviato', ?, ?, ?, ?, ?)"#
    )
    .bind(&comunicazione_id)
    .bind(&appuntamento.cliente_id)
    .bind(&appuntamento_id)
    .bind(&canale)
    .bind(&link.destinatario)
    .bind(&oggetto)
    .bind(&messaggio)
    .bind(now)
    .bind(now)
    .execute(&state.db.pool)
    .await?;

    sqlx::query("UPDATE appuntamenti SET reminder_inviato = 1, reminder_inviato_at = ? WHERE id = ?")
        .bind(now)
        .bind(&appuntamento_id)
        .execute(&state.db.pool)
        .await?;

    Ok(link)
}

// ============================================================================
// LOG COMUNICAZIONI
// ============================================================================

#[tauri::command]
pub async fn get_comunicazioni(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    filtri: Option<FiltriComunicazioni>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> AppResult<Vec<ComunicazioneWithCliente>> {
    let state = db.lock().await;

    let mut query = r#"
        SELECT
            com.id,
            com.cliente_id,
            c.nome as cliente_nome,
            c.cognome as cliente_cognome,
            com.appuntamento_id,
            com.template_id,
            com.tipo,
            com.canale,
            com.stato,
            com.destinatario,
            com.oggetto,
            com.messaggio,
            com.inviato_at,
            com.errore_messaggio,
            com.created_at
        FROM comunicazioni com
        LEFT JOIN clienti c ON com.cliente_id = c.id
        WHERE 1=1
    "#.to_string();

    if let Some(ref f) = filtri {
        if f.cliente_id.is_some() { query.push_str(" AND com.cliente_id = ?"); }
        if f.tipo.is_some() { query.push_str(" AND com.tipo = ?"); }
        if f.canale.is_some() { query.push_str(" AND com.canale = ?"); }
        if f.stato.is_some() { query.push_str(" AND com.stato = ?"); }
        if f.data_da.is_some() { query.push_str(" AND date(com.created_at) >= ?"); }
        if f.data_a.is_some() { query.push_str(" AND date(com.created_at) <= ?"); }
    }

    query.push_str(" ORDER BY com.created_at DESC");

    if let Some(l) = limit { query.push_str(&format!(" LIMIT {}", l)); }
    if let Some(o) = offset { query.push_str(&format!(" OFFSET {}", o)); }

    let mut q = sqlx::query_as::<_, ComunicazioneWithCliente>(&query);

    if let Some(ref f) = filtri {
        if let Some(ref v) = f.cliente_id { q = q.bind(v); }
        if let Some(ref v) = f.tipo { q = q.bind(v); }
        if let Some(ref v) = f.canale { q = q.bind(v); }
        if let Some(ref v) = f.stato { q = q.bind(v); }
        if let Some(ref v) = f.data_da { q = q.bind(v); }
        if let Some(ref v) = f.data_a { q = q.bind(v); }
    }

    let results = q.fetch_all(&state.db.pool).await?;
    Ok(results)
}

#[tauri::command]
pub async fn update_comunicazione_stato(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    stato: String,
    errore_messaggio: Option<String>,
) -> AppResult<()> {
    let state = db.lock().await;
    let now = Utc::now();

    let inviato_at = if stato == "inviato" { Some(now) } else { None };
    let consegnato_at = if stato == "consegnato" { Some(now) } else { None };

    sqlx::query(
        r#"UPDATE comunicazioni SET
           stato = ?,
           inviato_at = COALESCE(?, inviato_at),
           consegnato_at = COALESCE(?, consegnato_at),
           errore_messaggio = ?
           WHERE id = ?"#
    )
    .bind(&stato)
    .bind(inviato_at)
    .bind(consegnato_at)
    .bind(&errore_messaggio)
    .bind(&id)
    .execute(&state.db.pool)
    .await?;

    Ok(())
}

#[tauri::command]
pub async fn get_comunicazioni_stats(db: tauri::State<'_, Arc<Mutex<crate::AppState>>>) -> AppResult<ComunicazioniStats> {
    let state = db.lock().await;

    let totale: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM comunicazioni")
        .fetch_one(&state.db.pool).await?;
    let inviati: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM comunicazioni WHERE stato = 'inviato'")
        .fetch_one(&state.db.pool).await?;
    let consegnati: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM comunicazioni WHERE stato = 'consegnato'")
        .fetch_one(&state.db.pool).await?;
    let errori: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM comunicazioni WHERE stato = 'errore'")
        .fetch_one(&state.db.pool).await?;
    let oggi: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM comunicazioni WHERE date(created_at) = date('now')")
        .fetch_one(&state.db.pool).await?;
    let questa_settimana: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM comunicazioni WHERE date(created_at) >= date('now', '-7 days')")
        .fetch_one(&state.db.pool).await?;

    let per_tipo: Vec<TipoCount> = sqlx::query_as("SELECT tipo, COUNT(*) as count FROM comunicazioni GROUP BY tipo")
        .fetch_all(&state.db.pool).await?;
    let per_canale: Vec<CanaleCount> = sqlx::query_as("SELECT canale, COUNT(*) as count FROM comunicazioni GROUP BY canale")
        .fetch_all(&state.db.pool).await?;

    Ok(ComunicazioniStats {
        totale: totale.0,
        inviati: inviati.0,
        consegnati: consegnati.0,
        errori: errori.0,
        oggi: oggi.0,
        questa_settimana: questa_settimana.0,
        per_tipo,
        per_canale,
    })
}

// ============================================================================
// CAMPAGNE MARKETING
// ============================================================================

#[tauri::command]
pub async fn get_campagne(db: tauri::State<'_, Arc<Mutex<crate::AppState>>>) -> AppResult<Vec<CampagnaMarketing>> {
    let state = db.lock().await;
    let campagne = sqlx::query_as::<_, CampagnaMarketing>(
        "SELECT * FROM campagne_marketing ORDER BY created_at DESC"
    )
    .fetch_all(&state.db.pool)
    .await?;
    Ok(campagne)
}

#[tauri::command]
pub async fn get_campagna_by_id(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String
) -> AppResult<CampagnaMarketing> {
    let state = db.lock().await;
    let campagna = sqlx::query_as::<_, CampagnaMarketing>("SELECT * FROM campagne_marketing WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.db.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Campagna non trovata".to_string()))?;
    Ok(campagna)
}

#[tauri::command]
pub async fn create_campagna(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    input: CreateCampagnaInput
) -> AppResult<CampagnaMarketing> {
    let state = db.lock().await;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();

    sqlx::query(
        r#"INSERT INTO campagne_marketing
           (id, nome, descrizione, canale, template_id, messaggio_personalizzato, oggetto_email, target_filters, tipo_invio, data_invio_programmato, stato, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bozza', ?, ?)"#
    )
    .bind(&id)
    .bind(&input.nome)
    .bind(&input.descrizione)
    .bind(&input.canale)
    .bind(&input.template_id)
    .bind(&input.messaggio_personalizzato)
    .bind(&input.oggetto_email)
    .bind(&input.target_filters)
    .bind(input.tipo_invio.unwrap_or_else(|| "immediato".to_string()))
    .bind(&input.data_invio_programmato)
    .bind(now)
    .bind(now)
    .execute(&state.db.pool)
    .await?;

    let campagna = sqlx::query_as::<_, CampagnaMarketing>("SELECT * FROM campagne_marketing WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(campagna)
}

#[tauri::command]
pub async fn update_campagna_stato(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String,
    stato: String
) -> AppResult<CampagnaMarketing> {
    let state = db.lock().await;
    let now = Utc::now();

    let avviata_at = if stato == "in_corso" { Some(now) } else { None };
    let completata_at = if stato == "completata" { Some(now) } else { None };

    sqlx::query(
        r#"UPDATE campagne_marketing SET
           stato = ?,
           avviata_at = COALESCE(?, avviata_at),
           completata_at = COALESCE(?, completata_at),
           updated_at = ?
           WHERE id = ?"#
    )
    .bind(&stato)
    .bind(avviata_at)
    .bind(completata_at)
    .bind(now)
    .bind(&id)
    .execute(&state.db.pool)
    .await?;

    let campagna = sqlx::query_as::<_, CampagnaMarketing>("SELECT * FROM campagne_marketing WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(campagna)
}

#[tauri::command]
pub async fn delete_campagna(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    id: String
) -> AppResult<()> {
    let state = db.lock().await;

    sqlx::query("DELETE FROM campagna_destinatari WHERE campagna_id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    sqlx::query("DELETE FROM campagne_marketing WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn get_target_clienti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    filters: TargetFilters,
    canale: String
) -> AppResult<Vec<Cliente>> {
    let state = db.lock().await;

    let mut query = "SELECT * FROM clienti WHERE attivo = 1".to_string();

    match canale.as_str() {
        "sms" => query.push_str(" AND consenso_sms = 1 AND cellulare IS NOT NULL AND cellulare != ''"),
        "whatsapp" => query.push_str(" AND consenso_whatsapp = 1 AND cellulare IS NOT NULL AND cellulare != ''"),
        "email" => query.push_str(" AND consenso_email = 1 AND email IS NOT NULL AND email != ''"),
        _ => {}
    }

    if filters.con_appuntamenti_recenti == Some(true) {
        query.push_str(" AND id IN (SELECT DISTINCT cliente_id FROM appuntamenti WHERE date(data_ora_inizio) >= date('now', '-90 days'))");
    }

    let mut bind_values: Vec<String> = Vec::new();

    if let Some(min_giorni) = filters.giorni_ultima_visita_min {
        query.push_str(
            " AND id IN (SELECT cliente_id FROM appuntamenti GROUP BY cliente_id HAVING date(MAX(data_ora_inizio)) <= date('now', ?))"
        );
        bind_values.push(format!("-{} days", min_giorni));
    }

    if let Some(max_giorni) = filters.giorni_ultima_visita_max {
        query.push_str(
            " AND id IN (SELECT cliente_id FROM appuntamenti GROUP BY cliente_id HAVING date(MAX(data_ora_inizio)) >= date('now', ?))"
        );
        bind_values.push(format!("-{} days", max_giorni));
    }

    query.push_str(" ORDER BY cognome, nome");

    let mut sql_query = sqlx::query_as::<_, Cliente>(&query);
    for val in &bind_values {
        sql_query = sql_query.bind(val);
    }

    let clienti = sql_query.fetch_all(&state.db.pool).await?;

    Ok(clienti)
}

#[tauri::command]
pub async fn prepare_campagna_destinatari(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    campagna_id: String,
    cliente_ids: Vec<String>,
) -> AppResult<i32> {
    let state = db.lock().await;
    let now = Utc::now();

    sqlx::query("DELETE FROM campagna_destinatari WHERE campagna_id = ?")
        .bind(&campagna_id)
        .execute(&state.db.pool)
        .await?;

    for cliente_id in &cliente_ids {
        let id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO campagna_destinatari (id, campagna_id, cliente_id, stato, created_at) VALUES (?, ?, ?, 'in_attesa', ?)"
        )
        .bind(&id)
        .bind(&campagna_id)
        .bind(cliente_id)
        .bind(now)
        .execute(&state.db.pool)
        .await?;
    }

    let count = cliente_ids.len() as i32;
    sqlx::query("UPDATE campagne_marketing SET totale_destinatari = ?, updated_at = ? WHERE id = ?")
        .bind(count)
        .bind(now)
        .bind(&campagna_id)
        .execute(&state.db.pool)
        .await?;

    Ok(count)
}

#[tauri::command]
pub async fn get_campagna_destinatari(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    campagna_id: String
) -> AppResult<Vec<CampagnaDestinatario>> {
    let state = db.lock().await;
    let destinatari = sqlx::query_as::<_, CampagnaDestinatario>(
        "SELECT * FROM campagna_destinatari WHERE campagna_id = ? ORDER BY created_at"
    )
    .bind(&campagna_id)
    .fetch_all(&state.db.pool)
    .await?;
    Ok(destinatari)
}

// ============================================================================
// COMPLEANNI
// ============================================================================

#[tauri::command]
pub async fn get_birthdays_today(db: tauri::State<'_, Arc<Mutex<crate::AppState>>>) -> AppResult<Vec<Cliente>> {
    let state = db.lock().await;
    let today = Utc::now().naive_utc().date();
    let month = today.month() as i32;
    let day = today.day() as i32;

    let clienti = sqlx::query_as::<_, Cliente>(
        r#"SELECT * FROM clienti
           WHERE attivo = 1
           AND data_nascita IS NOT NULL
           AND CAST(strftime('%m', data_nascita) AS INTEGER) = ?
           AND CAST(strftime('%d', data_nascita) AS INTEGER) = ?
           ORDER BY cognome, nome"#
    )
    .bind(month)
    .bind(day)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(clienti)
}

#[tauri::command]
pub async fn get_upcoming_birthdays(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    days: i32
) -> AppResult<Vec<Cliente>> {
    let state = db.lock().await;

    let today = Local::now().naive_local().date();
    let end_date = today + chrono::Duration::days(days as i64);
    let wraps_year = end_date.year() > today.year();

    let today_md = today.month() as i32 * 100 + today.day() as i32;
    let end_md = end_date.month() as i32 * 100 + end_date.day() as i32;

    let clienti = if wraps_year {
        // Year boundary wrap: e.g. Dec 28 (1228) -> Jan 27 (127)
        // Match birthdays >= today_md (rest of current year) OR <= end_md (start of next year)
        sqlx::query_as::<_, Cliente>(
            r#"SELECT * FROM clienti
               WHERE attivo = 1
               AND data_nascita IS NOT NULL
               AND (
                   (CAST(strftime('%m', data_nascita) AS INTEGER) * 100 + CAST(strftime('%d', data_nascita) AS INTEGER)) >= ?
                   OR
                   (CAST(strftime('%m', data_nascita) AS INTEGER) * 100 + CAST(strftime('%d', data_nascita) AS INTEGER)) <= ?
               )
               ORDER BY
               CASE
                   WHEN (CAST(strftime('%m', data_nascita) AS INTEGER) * 100 + CAST(strftime('%d', data_nascita) AS INTEGER)) >= ? THEN 0
                   ELSE 1
               END,
               CAST(strftime('%m', data_nascita) AS INTEGER),
               CAST(strftime('%d', data_nascita) AS INTEGER)"#
        )
        .bind(today_md)
        .bind(end_md)
        .bind(today_md)
        .fetch_all(&state.db.pool)
        .await?
    } else {
        // Normal case: no year boundary crossing
        sqlx::query_as::<_, Cliente>(
            r#"SELECT * FROM clienti
               WHERE attivo = 1
               AND data_nascita IS NOT NULL
               AND (
                   (CAST(strftime('%m', data_nascita) AS INTEGER) * 100 + CAST(strftime('%d', data_nascita) AS INTEGER))
                   BETWEEN ? AND ?
               )
               ORDER BY
               CAST(strftime('%m', data_nascita) AS INTEGER),
               CAST(strftime('%d', data_nascita) AS INTEGER)"#
        )
        .bind(today_md)
        .bind(end_md)
        .fetch_all(&state.db.pool)
        .await?
    };

    Ok(clienti)
}

// ============================================================================
// APPUNTAMENTI PENDING REMINDER
// ============================================================================

#[tauri::command]
pub async fn get_appuntamenti_pending_reminder(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    hours_before: i32,
) -> AppResult<Vec<AppuntamentoWithDetails>> {
    let state = db.lock().await;
    let hours_str = format!("+{} hours", hours_before);

    let appuntamenti = sqlx::query_as::<_, AppuntamentoWithDetails>(
        r#"SELECT
           a.id,
           a.cliente_id,
           c.nome as cliente_nome,
           c.cognome as cliente_cognome,
           c.cellulare as cliente_cellulare,
           a.operatrice_id,
           o.nome as operatrice_nome,
           o.cognome as operatrice_cognome,
           o.colore_agenda as operatrice_colore,
           a.trattamento_id,
           t.nome as trattamento_nome,
           t.durata_minuti as trattamento_durata,
           a.data_ora_inizio,
           a.data_ora_fine,
           a.stato,
           a.note_prenotazione,
           a.note_trattamento,
           a.prezzo_applicato,
           a.created_at,
           a.updated_at
           FROM appuntamenti a
           LEFT JOIN clienti c ON a.cliente_id = c.id
           LEFT JOIN operatrici o ON a.operatrice_id = o.id
           LEFT JOIN trattamenti t ON a.trattamento_id = t.id
           WHERE a.reminder_inviato = 0
           AND a.stato NOT IN ('annullato', 'completato')
           AND datetime(a.data_ora_inizio) <= datetime('now', ?)
           AND datetime(a.data_ora_inizio) > datetime('now')
           ORDER BY a.data_ora_inizio"#
    )
    .bind(&hours_str)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(appuntamenti)
}
