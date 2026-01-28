use crate::error::AppResult;
use crate::models::AppuntamentoWithDetails;
use chrono::{DateTime, Utc, Local};
use serde::Serialize;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub appuntamenti_oggi: i64,
    pub clienti_attivi: i64,
}

#[derive(Debug, Serialize)]
pub struct ClienteRischio {
    pub id: String,
    pub nome: String,
    pub cognome: String,
    pub giorni_ultimo_appuntamento: i64,
}

#[tauri::command]
pub async fn get_dashboard_stats(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<DashboardStats> {
    let state = db.lock().await;

    // Conta appuntamenti di oggi
    let oggi = Local::now().format("%Y-%m-%d").to_string();
    let appuntamenti_oggi = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM appuntamenti
        WHERE DATE(data_ora_inizio) = ?1
        "#,
    )
    .bind(&oggi)
    .fetch_one(&state.db.pool)
    .await?;

    // Conta clienti attivi
    let clienti_attivi = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM clienti WHERE attivo = 1"
    )
    .fetch_one(&state.db.pool)
    .await?;

    Ok(DashboardStats {
        appuntamenti_oggi,
        clienti_attivi,
    })
}

#[tauri::command]
pub async fn get_prossimi_appuntamenti(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    limit: Option<i32>,
) -> AppResult<Vec<AppuntamentoWithDetails>> {
    let state = db.lock().await;
    let limit = limit.unwrap_or(5);

    let appuntamenti = sqlx::query_as::<_, AppuntamentoWithDetails>(
        r#"
        SELECT
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
        WHERE DATE(a.data_ora_inizio) >= DATE('now', 'localtime')
        ORDER BY a.data_ora_inizio ASC
        LIMIT ?1
        "#,
    )
    .bind(limit)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(appuntamenti)
}

#[tauri::command]
pub async fn get_clienti_rischio_churn(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    giorni_soglia: Option<i64>,
    limit: Option<i32>,
) -> AppResult<Vec<ClienteRischio>> {
    let state = db.lock().await;
    let giorni_soglia = giorni_soglia.unwrap_or(60);
    let limit = limit.unwrap_or(10);

    let clienti = sqlx::query_as::<_, (String, String, String, Option<String>)>(
        r#"
        SELECT
            c.id,
            c.nome,
            c.cognome,
            MAX(a.data_ora_inizio) as ultimo_appuntamento
        FROM clienti c
        LEFT JOIN appuntamenti a ON c.id = a.cliente_id
        WHERE c.attivo = 1
        GROUP BY c.id, c.nome, c.cognome
        HAVING ultimo_appuntamento IS NOT NULL
            AND julianday('now') - julianday(ultimo_appuntamento) >= ?1
        ORDER BY julianday('now') - julianday(ultimo_appuntamento) DESC
        LIMIT ?2
        "#,
    )
    .bind(giorni_soglia)
    .bind(limit)
    .fetch_all(&state.db.pool)
    .await?;

    let result: Vec<ClienteRischio> = clienti
        .into_iter()
        .map(|(id, nome, cognome, ultimo_appuntamento)| {
            let giorni = if let Some(ultimo) = ultimo_appuntamento {
                if let Ok(dt) = DateTime::parse_from_rfc3339(&ultimo) {
                    let now = Utc::now();
                    let dt_utc = dt.with_timezone(&Utc);
                    (now - dt_utc).num_days()
                } else {
                    0
                }
            } else {
                0
            };

            ClienteRischio {
                id,
                nome,
                cognome,
                giorni_ultimo_appuntamento: giorni,
            }
        })
        .collect();

    Ok(result)
}
