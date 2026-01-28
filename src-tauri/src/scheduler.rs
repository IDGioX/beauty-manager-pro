use crate::backup;
use crate::config::{load_config, save_config};
use crate::error::AppResult;
use chrono::{Timelike, Utc};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};

/// Struttura per gestire il task di backup schedulato
pub struct BackupScheduler {
    app: AppHandle,
    is_running: Arc<Mutex<bool>>,
}

impl BackupScheduler {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    /// Avvia lo scheduler in background
    pub fn start(&self) {
        let app = self.app.clone();
        let is_running = self.is_running.clone();

        tauri::async_runtime::spawn(async move {
            let mut running = is_running.lock().await;
            if *running {
                println!("Scheduler already running");
                return;
            }
            *running = true;
            drop(running);

            println!("Backup scheduler started");

            // Check ogni ora se è necessario eseguire un backup
            let mut check_interval = interval(Duration::from_secs(3600)); // 1 ora

            loop {
                check_interval.tick().await;

                if let Err(e) = Self::check_and_backup(&app).await {
                    eprintln!("Error during scheduled backup check: {}", e);
                }
            }
        });
    }

    /// Verifica se è necessario un backup e lo esegue
    async fn check_and_backup(app: &AppHandle) -> AppResult<()> {
        let mut config = load_config(app)?;

        if !config.backup.enabled {
            return Ok(());
        }

        let now = Utc::now();
        let should_backup = match config.backup.last_backup {
            None => true,
            Some(last_backup) => {
                let hours_since_last = (now - last_backup).num_hours() as u64;
                let frequency_hours = config.backup.frequency.to_hours();
                hours_since_last >= frequency_hours
            }
        };

        if !should_backup {
            return Ok(());
        }

        println!("Executing scheduled backup...");

        // Ottieni i percorsi
        let db_path = Self::get_db_path(app)?;
        let backup_dir = Self::get_backup_dir(app)?;

        // Crea il backup
        let description = Some(format!(
            "Backup automatico - {}",
            now.format("%d/%m/%Y %H:%M")
        ));

        match backup::create_backup(&db_path, &backup_dir, description) {
            Ok(_) => {
                println!("Scheduled backup completed successfully");

                // Aggiorna la data dell'ultimo backup
                config.backup.last_backup = Some(now);
                save_config(app, &config)?;

                // Elimina i backup vecchi se superano il limite
                Self::cleanup_old_backups(app, &backup_dir, config.backup.max_backups)?;
            }
            Err(e) => {
                eprintln!("Failed to create scheduled backup: {}", e);
                return Err(e);
            }
        }

        Ok(())
    }

    /// Elimina i backup più vecchi se superano il limite configurato
    fn cleanup_old_backups(
        app: &AppHandle,
        backup_dir: &PathBuf,
        max_backups: usize,
    ) -> AppResult<()> {
        let mut backups = backup::list_backups(backup_dir)?;

        if backups.len() <= max_backups {
            return Ok(());
        }

        // Ordina per data (più vecchio prima)
        backups.sort_by(|a, b| a.created_at.cmp(&b.created_at));

        // Calcola quanti backup eliminare
        let to_delete = backups.len() - max_backups;

        for backup in backups.iter().take(to_delete) {
            let path = PathBuf::from(&backup.file_path);
            if let Err(e) = backup::delete_backup(&path) {
                eprintln!("Failed to delete old backup {}: {}", backup.file_name, e);
            } else {
                println!("Deleted old backup: {}", backup.file_name);
            }
        }

        Ok(())
    }

    fn get_db_path(app: &AppHandle) -> AppResult<PathBuf> {
        let app_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| crate::error::AppError::Internal(format!("Unable to resolve app data dir: {}", e)))?;
        Ok(app_dir.join("beauty_manager.db"))
    }

    fn get_backup_dir(app: &AppHandle) -> AppResult<PathBuf> {
        let app_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| crate::error::AppError::Internal(format!("Unable to resolve app data dir: {}", e)))?;
        Ok(app_dir.join("backups"))
    }
}

// ============================================================================
// COMMUNICATION SCHEDULER
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct ReminderDueEvent {
    pub appuntamento_id: String,
    pub cliente_nome: String,
    pub cliente_cognome: String,
    pub data_ora: String,
    pub trattamento: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct BirthdayEvent {
    pub cliente_id: String,
    pub cliente_nome: String,
    pub cliente_cognome: String,
}

/// Scheduler per gestire reminder appuntamenti e auguri compleanno
pub struct CommunicationScheduler {
    app: AppHandle,
    state: Arc<Mutex<crate::AppState>>,
    is_running: Arc<Mutex<bool>>,
}

impl CommunicationScheduler {
    pub fn new(app: AppHandle, state: Arc<Mutex<crate::AppState>>) -> Self {
        Self {
            app,
            state,
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    /// Avvia lo scheduler in background
    pub fn start(&self) {
        let app = self.app.clone();
        let state = self.state.clone();
        let is_running = self.is_running.clone();

        tauri::async_runtime::spawn(async move {
            let mut running = is_running.lock().await;
            if *running {
                println!("Communication scheduler already running");
                return;
            }
            *running = true;
            drop(running);

            println!("Communication scheduler started");

            // Check ogni 15 minuti
            let mut check_interval = interval(Duration::from_secs(900)); // 15 minuti

            loop {
                check_interval.tick().await;

                // Check reminder
                if let Err(e) = Self::check_reminders(&app, &state).await {
                    eprintln!("Error checking reminders: {}", e);
                }

                // Check compleanni (solo se è mattina, es. 9:00-9:15)
                let now = chrono::Local::now();
                if now.hour() == 9 && now.minute() < 15 {
                    if let Err(e) = Self::check_birthdays(&app, &state).await {
                        eprintln!("Error checking birthdays: {}", e);
                    }
                }
            }
        });
    }

    /// Controlla se ci sono appuntamenti che necessitano reminder
    async fn check_reminders(
        _app: &AppHandle,
        state: &Arc<Mutex<crate::AppState>>,
    ) -> AppResult<()> {
        let state = state.lock().await;

        // Carica config scheduler
        let config: Option<(bool, i32)> = sqlx::query_as(
            "SELECT reminder_enabled, reminder_hours_before FROM config_scheduler WHERE id = 'default'"
        )
        .fetch_optional(&state.db.pool)
        .await?;

        let (enabled, hours_before) = config.unwrap_or((false, 24));
        if !enabled {
            return Ok(());
        }

        // Trova appuntamenti nelle prossime X ore senza reminder inviato
        let _pending: Vec<(String, String, String, String, String)> = sqlx::query_as(
            r#"SELECT
                a.id,
                c.nome,
                c.cognome,
                datetime(a.data_ora_inizio) as data_ora,
                t.nome as trattamento
            FROM appuntamenti a
            JOIN clienti c ON a.cliente_id = c.id
            JOIN trattamenti t ON a.trattamento_id = t.id
            WHERE a.stato = 'confermato'
            AND a.reminder_inviato = 0
            AND datetime(a.data_ora_inizio) > datetime('now')
            AND datetime(a.data_ora_inizio) <= datetime('now', '+' || ?1 || ' hours')
            LIMIT 10"#
        )
        .bind(hours_before)
        .fetch_all(&state.db.pool)
        .await?;

        // Per ora non emettiamo eventi automatici - l'utente può controllare
        // nella pagina Comunicazioni gli appuntamenti con reminder pending

        Ok(())
    }

    /// Controlla se ci sono clienti con compleanno oggi
    async fn check_birthdays(
        _app: &AppHandle,
        state: &Arc<Mutex<crate::AppState>>,
    ) -> AppResult<()> {
        let state = state.lock().await;

        // Carica config scheduler
        let config: Option<(bool,)> = sqlx::query_as(
            "SELECT birthday_enabled FROM config_scheduler WHERE id = 'default'"
        )
        .fetch_optional(&state.db.pool)
        .await?;

        let enabled = config.map(|c| c.0).unwrap_or(false);
        if !enabled {
            return Ok(());
        }

        // I compleanni vengono già mostrati nella dashboard Comunicazioni
        // Non emettiamo eventi automatici per ora

        Ok(())
    }
}
