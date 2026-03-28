// Beauty Manager Pro - Backend Rust
mod error;
mod db;
mod models;
mod commands;
mod services;
mod backup;
mod config;
mod scheduler;
mod licensing;

use db::Database;
use error::AppResult;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

// Stato globale dell'applicazione
pub struct AppState {
    pub db: Database,
}

// Comando di test
#[tauri::command]
async fn greet(name: String) -> AppResult<String> {
    Ok(format!("Hello, {}! You've been greeted from Rust!", name))
}

// Comando per verificare la connessione al database
#[tauri::command]
async fn check_database(state: tauri::State<'_, Arc<Mutex<AppState>>>) -> AppResult<String> {
    let _state = state.lock().await;
    Ok("Database connesso con successo!".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // Inizializza il database in modo sincrono
            let app_state = tauri::async_runtime::block_on(async move {
                // Ottieni il percorso della directory dei dati dell'app
                let app_data_dir = handle
                    .path()
                    .app_data_dir()
                    .expect("Impossibile ottenere la directory dei dati dell'app");

                // Crea la directory se non esiste
                if !app_data_dir.exists() {
                    std::fs::create_dir_all(&app_data_dir)
                        .expect("Impossibile creare la directory dei dati");
                }

                // Percorso del database
                let db_file = app_data_dir.join("beauty_manager.db");
                let db_path = format!("sqlite://{}", db_file.display());

                println!("Database path: {}", db_path);

                // Inizializza il database
                let db = Database::new(&db_path)
                    .await
                    .expect("Impossibile connettersi al database");

                println!("Database initialized successfully!");

                Arc::new(Mutex::new(AppState { db }))
            });

            app.manage(app_state);
            Ok(())
        })
            .invoke_handler(tauri::generate_handler![
                greet,
                check_database,
                commands::auth::login,
                commands::auth::logout,
                commands::auth::verify_session,
                commands::auth::create_user,
                commands::auth::get_all_users,
                commands::auth::update_user_settings,
                commands::auth::cleanup_expired_sessions,
                commands::auth::check_users_exist,
                commands::auth::register_first_user,
                commands::auth::change_password,
                commands::auth::update_user,
                commands::auth::toggle_user_active,
                commands::auth::delete_user,
                commands::clienti::get_clienti,
                commands::clienti::get_cliente,
                commands::clienti::create_cliente,
                commands::clienti::update_cliente,
                commands::clienti::deactivate_cliente,
                commands::clienti::reactivate_cliente,
                commands::clienti::delete_cliente,
                commands::operatrici::get_operatrici,
                commands::operatrici::get_operatrice,
                commands::operatrici::create_operatrice,
                commands::operatrici::update_operatrice,
                commands::operatrici::deactivate_operatrice,
                commands::operatrici::reactivate_operatrice,
                commands::operatrici::delete_operatrice,
                commands::appuntamenti::get_appuntamenti_by_date_range,
                commands::appuntamenti::get_appuntamento_by_id,
                commands::appuntamenti::create_appuntamento,
                commands::appuntamenti::update_appuntamento,
                commands::appuntamenti::delete_appuntamento,
                commands::appuntamenti::aggiorna_stati_automatici,
                commands::appuntamenti::get_appuntamenti_giorno,
                commands::trattamenti::get_categorie_trattamenti,
                commands::trattamenti::get_trattamenti,
                commands::trattamenti::get_trattamento,
                commands::trattamenti::create_trattamento,
                commands::trattamenti::update_trattamento,
                commands::trattamenti::delete_trattamento,
                commands::trattamenti::create_categoria_trattamento,
                commands::trattamenti::update_categoria_trattamento,
                commands::trattamenti::delete_categoria_trattamento,
                commands::dashboard::get_dashboard_stats,
                commands::dashboard::get_prossimi_appuntamenti,
                commands::dashboard::get_clienti_rischio_churn,
                commands::dashboard::get_dashboard_completo,
                commands::dashboard::get_dashboard_chart_data,
                commands::export::export_agenda_excel,
                commands::export::export_agenda_pdf,
                commands::analytics::get_trattamenti_piu_usati,
                commands::analytics::get_clienti_top_frequenza,
                commands::analytics::get_clienti_top_ricavo,
                commands::analytics::get_period_analytics,
                commands::analytics::search_clienti_analytics,
                commands::analytics::get_cliente_complete_profile,
                commands::analytics::get_report_filtrato,
                commands::backup::create_backup,
                commands::backup::restore_backup,
                commands::backup::list_backups,
                commands::backup::delete_backup,
                commands::backup::export_backup_to_folder,
                commands::backup::import_backup_from_file,
                commands::backup::open_backup_folder,
                commands::azienda::get_azienda,
                commands::azienda::update_azienda,
                commands::license::activate_license,
                commands::license::validate_license,
                commands::license::get_license_info,
                commands::license::remove_license,
                commands::license::generate_license_key,
                // Magazzino
                commands::magazzino::get_categorie_prodotti,
                commands::magazzino::create_categoria_prodotto,
                commands::magazzino::update_categoria_prodotto,
                commands::magazzino::delete_categoria_prodotto,
                commands::magazzino::get_prodotti,
                commands::magazzino::get_prodotto,
                commands::magazzino::get_prodotto_by_barcode,
                commands::magazzino::create_prodotto,
                commands::magazzino::update_prodotto,
                commands::magazzino::deactivate_prodotto,
                commands::magazzino::reactivate_prodotto,
                commands::magazzino::delete_prodotto,
                commands::magazzino::get_movimenti,
                commands::magazzino::registra_carico,
                commands::magazzino::registra_scarico,
                commands::magazzino::registra_reso,
                commands::magazzino::registra_inventario,
                commands::magazzino::get_alert_prodotti,
                commands::magazzino::get_alert_count,
                commands::magazzino::get_prodotti_sotto_scorta,
                commands::magazzino::get_prodotti_in_scadenza,
                commands::magazzino::get_report_consumi,
                commands::magazzino::get_valore_magazzino,
                // Inventario
                commands::magazzino::crea_sessione_inventario,
                commands::magazzino::get_inventari,
                commands::magazzino::get_inventario,
                commands::magazzino::get_righe_inventario,
                commands::magazzino::aggiungi_riga_inventario,
                commands::magazzino::aggiorna_riga_inventario,
                commands::magazzino::elimina_riga_inventario,
                commands::magazzino::cerca_prodotto_per_inventario,
                commands::magazzino::conferma_inventario,
                commands::magazzino::annulla_inventario,
                commands::magazzino::elimina_inventario,
                // Movimenti per appuntamento
                commands::magazzino::get_movimenti_appuntamento,
                // Messaggistica
                commands::messaggistica::generate_sms_link,
                commands::messaggistica::generate_whatsapp_link,
                commands::messaggistica::generate_email_link,
                commands::messaggistica::open_message_link,
                commands::messaggistica::send_email,
                commands::messaggistica::test_smtp_connection,
                commands::messaggistica::get_smtp_config,
                commands::messaggistica::save_smtp_config,
                commands::messaggistica::get_scheduler_config,
                commands::messaggistica::save_scheduler_config,
                commands::messaggistica::get_templates,
                commands::messaggistica::get_template_by_id,
                commands::messaggistica::create_template,
                commands::messaggistica::update_template,
                commands::messaggistica::delete_template,
                commands::messaggistica::process_template,
                commands::messaggistica::send_reminder,
                commands::messaggistica::get_comunicazioni,
                commands::messaggistica::update_comunicazione_stato,
                commands::messaggistica::get_comunicazioni_stats,
                commands::messaggistica::get_campagne,
                commands::messaggistica::get_campagna_by_id,
                commands::messaggistica::create_campagna,
                commands::messaggistica::update_campagna_stato,
                commands::messaggistica::delete_campagna,
                commands::messaggistica::get_target_clienti,
                commands::messaggistica::prepare_campagna_destinatari,
                commands::messaggistica::get_campagna_destinatari,
                commands::messaggistica::get_birthdays_today,
                commands::messaggistica::get_upcoming_birthdays,
                commands::messaggistica::get_appuntamenti_pending_reminder,
                // Insights
                commands::insights::get_insights_data,
                // Pacchetti
                commands::pacchetti::get_pacchetti,
                commands::pacchetti::get_pacchetto_by_id,
                commands::pacchetti::create_pacchetto,
                commands::pacchetti::update_pacchetto,
                commands::pacchetti::delete_pacchetto,
                commands::pacchetti::get_pacchetti_cliente,
                commands::pacchetti::assegna_pacchetto_cliente,
                commands::pacchetti::registra_seduta,
                commands::pacchetti::registra_pagamento,
                commands::pacchetti::get_dashboard_pacchetti,
                commands::pacchetti::get_sedute_pacchetto,
                commands::pacchetti::annulla_pacchetto_cliente,
                commands::pacchetti::update_pacchetto_cliente,
                commands::pacchetti::get_seduta_by_appuntamento,
                commands::pacchetti::collega_seduta_appuntamento,
                commands::pacchetti::scollega_seduta_appuntamento,
                commands::pacchetti::completa_seduta_by_id,
                commands::pacchetti::registra_pagamento_seduta,
                commands::pacchetti::elimina_pacchetto_cliente,
                commands::pacchetti::aggiungi_pagamento_pacchetto,
                commands::pacchetti::get_pagamenti_pacchetto,
                commands::pacchetti::aggiorna_data_prevista_seduta,
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
}
