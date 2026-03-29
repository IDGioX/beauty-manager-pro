use sqlx::{SqlitePool, sqlite::{SqliteConnectOptions, SqlitePoolOptions}};
use std::str::FromStr;
use std::path::PathBuf;
use crate::error::{AppError, AppResult};

pub struct Database {
    pub pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> AppResult<Self> {
        let options = SqliteConnectOptions::from_str(database_url)?
            .create_if_missing(true)
            .foreign_keys(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        // Verifica colonne necessarie prima delle migration (sicurezza per backup da versioni precedenti)
        Self::ensure_compat(&pool).await;

        // Esegui le migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await?;

        Ok(Database { pool })
    }

    pub fn get_database_path() -> PathBuf {
        // In produzione, usa la directory dati dell'app
        // Per ora, usiamo una directory locale
        let mut path = std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."));

        path.push("beauty_manager.db");
        path
    }

    async fn ensure_compat(pool: &SqlitePool) {
        ensure_backup_compatibility(pool).await;
    }
}

/// Garantisce compatibilità con backup da versioni precedenti.
/// Funzione pubblica per poterla usare anche su DB temporanei (restore).
pub async fn ensure_backup_compatibility(pool: &SqlitePool) {
    let tables: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetch_all(pool).await.unwrap_or_default();

    let table_names: Vec<&str> = tables.iter().map(|t| t.0.as_str()).collect();

    if table_names.contains(&"pacchetto_sedute") {
        let cols: Vec<(String,)> = sqlx::query_as(
            "SELECT name FROM pragma_table_info('pacchetto_sedute')"
        ).fetch_all(pool).await.unwrap_or_default();
        let col_names: Vec<&str> = cols.iter().map(|c| c.0.as_str()).collect();

        if !col_names.contains(&"importo_pagato") {
            let _ = sqlx::query("ALTER TABLE pacchetto_sedute ADD COLUMN importo_pagato REAL NOT NULL DEFAULT 0.0")
                .execute(pool).await;
        }
        if !col_names.contains(&"data_prevista") {
            let _ = sqlx::query("ALTER TABLE pacchetto_sedute ADD COLUMN data_prevista TEXT")
                .execute(pool).await;
        }
    }

    if table_names.contains(&"pacchetti_cliente") {
        let cols: Vec<(String,)> = sqlx::query_as(
            "SELECT name FROM pragma_table_info('pacchetti_cliente')"
        ).fetch_all(pool).await.unwrap_or_default();
        let col_names: Vec<&str> = cols.iter().map(|c| c.0.as_str()).collect();

        if !col_names.contains(&"tipo_pagamento") {
            let _ = sqlx::query("ALTER TABLE pacchetti_cliente ADD COLUMN tipo_pagamento TEXT NOT NULL DEFAULT 'anticipo'")
                .execute(pool).await;
        }
    }

    if !table_names.contains(&"pacchetto_pagamenti") {
        let _ = sqlx::query(
            "CREATE TABLE IF NOT EXISTS pacchetto_pagamenti (
                id TEXT PRIMARY KEY NOT NULL,
                pacchetto_cliente_id TEXT NOT NULL REFERENCES pacchetti_cliente(id) ON DELETE CASCADE,
                importo REAL NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'pagamento',
                note TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )"
        ).execute(pool).await;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_pacchetto_pagamenti_pacchetto ON pacchetto_pagamenti(pacchetto_cliente_id)")
            .execute(pool).await;
    }
}

// Implementa Clone per Database così può essere usato in AppState
impl Clone for Database {
    fn clone(&self) -> Self {
        Database {
            pool: self.pool.clone(),
        }
    }
}
