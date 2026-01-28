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
}

// Implementa Clone per Database così può essere usato in AppState
impl Clone for Database {
    fn clone(&self) -> Self {
        Database {
            pool: self.pool.clone(),
        }
    }
}
