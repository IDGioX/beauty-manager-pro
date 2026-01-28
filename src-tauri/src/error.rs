use serde::{Serialize, Deserialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Migration error: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),

    #[error("Excel error: {0}")]
    Xlsx(#[from] rust_xlsxwriter::XlsxError),

    #[error("PDF error: {0}")]
    Pdf(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

// Struct per serializzare errori verso il frontend
#[derive(Serialize, Deserialize, Debug)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

/// Traduce l'errore SQLx in un messaggio comprensibile per l'utente
fn translate_database_error(err: &sqlx::Error) -> String {
    let error_string = err.to_string();

    // UNIQUE constraint violated
    if error_string.contains("UNIQUE constraint failed") {
        if error_string.contains("clienti.email") {
            return "Esiste già un cliente con questa email".to_string();
        }
        if error_string.contains("clienti.cellulare") {
            return "Esiste già un cliente con questo numero di cellulare".to_string();
        }
        if error_string.contains("clienti.codice") {
            return "Esiste già un cliente con questo codice".to_string();
        }
        if error_string.contains("operatrici.email") {
            return "Esiste già un'operatrice con questa email".to_string();
        }
        if error_string.contains("operatrici.codice") {
            return "Esiste già un'operatrice con questo codice".to_string();
        }
        if error_string.contains("prodotti.codice") {
            return "Esiste già un prodotto con questo codice".to_string();
        }
        if error_string.contains("prodotti.barcode") {
            return "Esiste già un prodotto con questo codice a barre".to_string();
        }
        if error_string.contains("trattamenti.codice") {
            return "Esiste già un trattamento con questo codice".to_string();
        }
        if error_string.contains("categorie_prodotti") {
            return "Esiste già una categoria con questo nome".to_string();
        }
        if error_string.contains("categorie_trattamenti") {
            return "Esiste già una categoria trattamenti con questo nome".to_string();
        }
        return "Esiste già un record con questi dati. Verifica i campi univoci.".to_string();
    }

    // FOREIGN KEY constraint violated
    if error_string.contains("FOREIGN KEY constraint failed") {
        return "Impossibile completare l'operazione: esistono dati collegati a questo elemento".to_string();
    }

    // NOT NULL constraint violated
    if error_string.contains("NOT NULL constraint failed") {
        if error_string.contains(".nome") {
            return "Il campo Nome è obbligatorio".to_string();
        }
        if error_string.contains(".cognome") {
            return "Il campo Cognome è obbligatorio".to_string();
        }
        if error_string.contains(".email") {
            return "Il campo Email è obbligatorio".to_string();
        }
        return "Alcuni campi obbligatori non sono stati compilati".to_string();
    }

    // CHECK constraint violated
    if error_string.contains("CHECK constraint failed") {
        if error_string.contains("giacenza") {
            return "La giacenza non può essere negativa".to_string();
        }
        if error_string.contains("quantita") {
            return "La quantità deve essere maggiore di zero".to_string();
        }
        if error_string.contains("prezzo") {
            return "Il prezzo non può essere negativo".to_string();
        }
        return "I dati inseriti non rispettano i vincoli richiesti".to_string();
    }

    // Connection errors
    if error_string.contains("database is locked") {
        return "Il database è temporaneamente occupato. Riprova tra qualche secondo.".to_string();
    }

    if error_string.contains("no such table") {
        return "Errore di sistema: tabella non trovata. Contatta l'assistenza.".to_string();
    }

    if error_string.contains("no such column") {
        return "Errore di sistema: colonna non trovata. Contatta l'assistenza.".to_string();
    }

    // Row not found
    if error_string.contains("RowNotFound") {
        return "Elemento non trovato. Potrebbe essere stato eliminato.".to_string();
    }

    // Generic database error - show sanitized message
    format!("Errore durante l'operazione sul database. Riprova o contatta l'assistenza.")
}

/// Traduce un errore generico in un messaggio user-friendly
fn get_user_friendly_message(error: &AppError) -> String {
    match error {
        AppError::Database(err) => translate_database_error(err),
        AppError::Migration(_) => "Errore durante l'aggiornamento del database. Riavvia l'applicazione.".to_string(),
        AppError::Io(err) => {
            let err_str = err.to_string();
            if err_str.contains("permission denied") {
                "Permesso negato. Verifica i permessi del file.".to_string()
            } else if err_str.contains("No such file") {
                "File non trovato.".to_string()
            } else if err_str.contains("disk full") || err_str.contains("no space") {
                "Spazio su disco insufficiente.".to_string()
            } else {
                "Errore durante la lettura/scrittura del file.".to_string()
            }
        }
        AppError::Serialization(_) => "Errore nel formato dei dati. Verifica i campi inseriti.".to_string(),
        AppError::Zip(_) => "Errore durante la compressione/decompressione del file.".to_string(),
        AppError::Xlsx(_) => "Errore durante la generazione del file Excel.".to_string(),
        AppError::Pdf(msg) => format!("Errore PDF: {}", msg),
        AppError::NotFound(msg) => msg.clone(),
        AppError::InvalidInput(msg) => msg.clone(),
        AppError::Conflict(msg) => msg.clone(),
        AppError::Unauthorized(msg) => msg.clone(),
        AppError::Internal(msg) => msg.clone(),
    }
}

// Implementa Serialize per AppError così può essere restituito dai comandi Tauri
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // Genera il messaggio user-friendly PRIMA di qualsiasi clone
        let user_message = get_user_friendly_message(self);

        let response = ErrorResponse {
            error: match self {
                AppError::Database(_) => "DatabaseError",
                AppError::Migration(_) => "MigrationError",
                AppError::Io(_) => "IoError",
                AppError::Serialization(_) => "SerializationError",
                AppError::Zip(_) => "ZipError",
                AppError::Xlsx(_) => "XlsxError",
                AppError::Pdf(_) => "PdfError",
                AppError::NotFound(_) => "NotFound",
                AppError::InvalidInput(_) => "InvalidInput",
                AppError::Conflict(_) => "Conflict",
                AppError::Unauthorized(_) => "Unauthorized",
                AppError::Internal(_) => "InternalError",
            }.to_string(),
            message: user_message,
        };

        response.serialize(serializer)
    }
}

impl Clone for AppError {
    fn clone(&self) -> Self {
        match self {
            AppError::Database(err) => AppError::Internal(translate_database_error(err)),
            AppError::Migration(_) => AppError::Internal("Errore durante l'aggiornamento del database".to_string()),
            AppError::Io(_) => AppError::Internal("Errore durante la lettura/scrittura del file".to_string()),
            AppError::Serialization(_) => AppError::Internal("Errore nel formato dei dati".to_string()),
            AppError::Zip(_) => AppError::Internal("Errore durante la compressione del file".to_string()),
            AppError::Xlsx(_) => AppError::Internal("Errore durante la generazione Excel".to_string()),
            AppError::Pdf(msg) => AppError::Pdf(msg.clone()),
            AppError::NotFound(msg) => AppError::NotFound(msg.clone()),
            AppError::InvalidInput(msg) => AppError::InvalidInput(msg.clone()),
            AppError::Conflict(msg) => AppError::Conflict(msg.clone()),
            AppError::Unauthorized(msg) => AppError::Unauthorized(msg.clone()),
            AppError::Internal(msg) => AppError::Internal(msg.clone()),
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;
