// Tauri commands for analytics and reporting

use crate::error::AppResult;
use crate::models::analytics::*;
use crate::models::{AppuntamentoWithDetails, Cliente};
use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::{Utc, DateTime, FixedOffset};

// ============================================
// GENERAL REPORTS COMMANDS
// ============================================

#[tauri::command]
pub async fn get_trattamenti_piu_usati(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    filter: DateRangeFilter,
    limit: Option<i32>,
) -> AppResult<Vec<TrattamentoStats>> {
    let state = db.lock().await;
    let limit = limit.unwrap_or(10);

    let stats = sqlx::query_as::<_, TrattamentoStats>(
        r#"
        SELECT
            t.id as trattamento_id,
            t.nome as trattamento_nome,
            ct.nome as categoria_nome,
            COUNT(a.id) as totale_appuntamenti,
            COALESCE(SUM(a.prezzo_applicato), 0.0) as ricavo_totale,
            COALESCE(AVG(a.prezzo_applicato), 0.0) as ricavo_medio,
            AVG(t.durata_minuti) as durata_media_minuti
        FROM appuntamenti a
        INNER JOIN trattamenti t ON a.trattamento_id = t.id
        LEFT JOIN categorie_trattamenti ct ON t.categoria_id = ct.id
        WHERE a.data_ora_inizio >= ?1
          AND a.data_ora_inizio < ?2
          AND a.stato IN ('completato', 'in_corso')
        GROUP BY t.id, t.nome, ct.nome
        ORDER BY totale_appuntamenti DESC
        LIMIT ?3
        "#
    )
    .bind(&filter.data_inizio)
    .bind(&filter.data_fine)
    .bind(limit)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(stats)
}

#[tauri::command]
pub async fn get_clienti_top_frequenza(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    filter: DateRangeFilter,
    limit: Option<i32>,
) -> AppResult<Vec<ClienteTopFrequenza>> {
    let state = db.lock().await;
    let limit = limit.unwrap_or(10);

    let clienti = sqlx::query_as::<_, ClienteTopFrequenza>(
        r#"
        SELECT
            c.id as cliente_id,
            c.nome,
            c.cognome,
            c.email,
            c.cellulare,
            COUNT(a.id) as totale_appuntamenti,
            COALESCE(SUM(a.prezzo_applicato), 0.0) as ricavo_totale,
            MAX(a.data_ora_inizio) as ultimo_appuntamento
        FROM clienti c
        INNER JOIN appuntamenti a ON c.id = a.cliente_id
        WHERE a.data_ora_inizio >= ?1
          AND a.data_ora_inizio < ?2
          AND a.stato IN ('completato', 'in_corso')
          AND c.attivo = 1
        GROUP BY c.id, c.nome, c.cognome, c.email, c.cellulare
        ORDER BY totale_appuntamenti DESC
        LIMIT ?3
        "#
    )
    .bind(&filter.data_inizio)
    .bind(&filter.data_fine)
    .bind(limit)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(clienti)
}

#[tauri::command]
pub async fn get_clienti_top_ricavo(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    filter: DateRangeFilter,
    limit: Option<i32>,
) -> AppResult<Vec<ClienteTopRicavo>> {
    let state = db.lock().await;
    let limit = limit.unwrap_or(10);

    let clienti = sqlx::query_as::<_, ClienteTopRicavo>(
        r#"
        SELECT
            c.id as cliente_id,
            c.nome,
            c.cognome,
            c.email,
            c.cellulare,
            COALESCE(SUM(a.prezzo_applicato), 0.0) as ricavo_totale,
            COUNT(a.id) as totale_appuntamenti,
            COALESCE(AVG(a.prezzo_applicato), 0.0) as ricavo_medio
        FROM clienti c
        INNER JOIN appuntamenti a ON c.id = a.cliente_id
        WHERE a.data_ora_inizio >= ?1
          AND a.data_ora_inizio < ?2
          AND a.stato IN ('completato', 'in_corso')
          AND c.attivo = 1
          AND a.prezzo_applicato IS NOT NULL
        GROUP BY c.id, c.nome, c.cognome, c.email, c.cellulare
        ORDER BY ricavo_totale DESC
        LIMIT ?3
        "#
    )
    .bind(&filter.data_inizio)
    .bind(&filter.data_fine)
    .bind(limit)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(clienti)
}

#[tauri::command]
pub async fn get_period_analytics(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    filter: DateRangeFilter,
) -> AppResult<PeriodAnalytics> {
    let state = db.lock().await;

    // Get aggregate stats
    let stats = sqlx::query_as::<_, (i64, i64, i64, f64)>(
        r#"
        SELECT
            COUNT(*) as totale,
            SUM(CASE WHEN stato IN ('completato', 'in_corso') THEN 1 ELSE 0 END) as completati,
            SUM(CASE WHEN stato = 'annullato' THEN 1 ELSE 0 END) as annullati,
            COALESCE(SUM(CASE WHEN stato IN ('completato', 'in_corso') THEN prezzo_applicato ELSE 0 END), 0.0) as ricavo
        FROM appuntamenti
        WHERE data_ora_inizio >= ?1
          AND data_ora_inizio < ?2
        "#
    )
    .bind(&filter.data_inizio)
    .bind(&filter.data_fine)
    .fetch_one(&state.db.pool)
    .await?;

    let (totale, completati, annullati, ricavo_totale) = stats;

    // Get unique and new clients
    let clienti_stats = sqlx::query_as::<_, (i64, i64)>(
        r#"
        SELECT
            COUNT(DISTINCT a.cliente_id) as clienti_unici,
            COUNT(DISTINCT CASE
                WHEN c.created_at >= ?1 AND c.created_at < ?2
                THEN c.id
                ELSE NULL
            END) as nuovi_clienti
        FROM appuntamenti a
        INNER JOIN clienti c ON a.cliente_id = c.id
        WHERE a.data_ora_inizio >= ?1
          AND a.data_ora_inizio < ?2
        "#
    )
    .bind(&filter.data_inizio)
    .bind(&filter.data_fine)
    .fetch_one(&state.db.pool)
    .await?;

    let (clienti_unici, nuovi_clienti) = clienti_stats;

    // Get average duration
    let durata_media = sqlx::query_as::<_, (f64,)>(
        r#"
        SELECT COALESCE(AVG(t.durata_minuti), 0.0)
        FROM appuntamenti a
        INNER JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE a.data_ora_inizio >= ?1
          AND a.data_ora_inizio < ?2
          AND a.stato IN ('completato', 'in_corso')
        "#
    )
    .bind(&filter.data_inizio)
    .bind(&filter.data_fine)
    .fetch_one(&state.db.pool)
    .await?;

    let durata_media_minuti = durata_media.0;

    let tasso_completamento = if totale > 0 {
        (completati as f64 / totale as f64) * 100.0
    } else {
        0.0
    };

    let ricavo_medio = if completati > 0 {
        ricavo_totale / completati as f64
    } else {
        0.0
    };

    let media_appuntamenti_per_cliente = if clienti_unici > 0 {
        totale as f64 / clienti_unici as f64
    } else {
        0.0
    };

    Ok(PeriodAnalytics {
        totale_appuntamenti: totale,
        appuntamenti_completati: completati,
        appuntamenti_annullati: annullati,
        tasso_completamento,
        ricavo_totale,
        ricavo_medio,
        clienti_unici,
        nuovi_clienti,
        media_appuntamenti_per_cliente,
        durata_media_minuti,
    })
}

// ============================================
// CLIENT HISTORY COMMANDS
// ============================================

#[tauri::command]
pub async fn search_clienti_analytics(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    search: String,
    limit: Option<i32>,
) -> AppResult<Vec<ClienteSearchResult>> {
    let state = db.lock().await;
    let limit = limit.unwrap_or(20);
    let search_pattern = format!("%{}%", search);

    let clienti = sqlx::query_as::<_, ClienteSearchResult>(
        r#"
        SELECT
            c.id,
            c.nome,
            c.cognome,
            c.email,
            c.cellulare,
            MAX(a.data_ora_inizio) as ultimo_appuntamento,
            COUNT(a.id) as totale_appuntamenti
        FROM clienti c
        LEFT JOIN appuntamenti a ON c.id = a.cliente_id
        WHERE c.attivo = 1
          AND (c.nome LIKE ?1 OR c.cognome LIKE ?1 OR c.cellulare LIKE ?1 OR c.email LIKE ?1)
        GROUP BY c.id, c.nome, c.cognome, c.email, c.cellulare
        ORDER BY c.cognome, c.nome
        LIMIT ?2
        "#
    )
    .bind(&search_pattern)
    .bind(limit)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(clienti)
}

#[tauri::command]
pub async fn get_cliente_complete_profile(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    cliente_id: String,
    limit_appuntamenti: Option<i32>,
) -> AppResult<ClienteCompleteProfile> {
    let state = db.lock().await;
    let limit = limit_appuntamenti.unwrap_or(50);

    // Get cliente base info
    let cliente = sqlx::query_as::<_, Cliente>(
        "SELECT * FROM clienti WHERE id = ?1"
    )
    .bind(&cliente_id)
    .fetch_one(&state.db.pool)
    .await?;

    // Get statistics
    let stats_raw = sqlx::query_as::<_, (i64, i64, i64, i64, f64, f64, Option<String>, Option<String>)>(
        r#"
        SELECT
            COUNT(*) as totale,
            SUM(CASE WHEN stato = 'completato' THEN 1 ELSE 0 END) as completati,
            SUM(CASE WHEN stato = 'annullato' THEN 1 ELSE 0 END) as annullati,
            SUM(CASE WHEN stato = 'no_show' THEN 1 ELSE 0 END) as no_show,
            COALESCE(SUM(CASE WHEN stato = 'completato' THEN prezzo_applicato ELSE 0 END), 0.0) as spesa_totale,
            COALESCE(AVG(CASE WHEN stato = 'completato' THEN prezzo_applicato ELSE NULL END), 0.0) as spesa_media,
            MIN(data_ora_inizio) as primo,
            MAX(data_ora_inizio) as ultimo
        FROM appuntamenti
        WHERE cliente_id = ?1
        "#
    )
    .bind(&cliente_id)
    .fetch_one(&state.db.pool)
    .await?;

    let (totale, completati, annullati, no_show, spesa_totale, spesa_media, primo, ultimo) = stats_raw;

    let giorni_da_ultimo = if let Some(ultimo_str) = &ultimo {
        if let Ok(dt) = DateTime::parse_from_rfc3339(ultimo_str) {
            let now = Utc::now();
            let dt_utc = dt.with_timezone(&Utc);
            Some((now.signed_duration_since(dt_utc)).num_days())
        } else {
            None
        }
    } else {
        None
    };

    let primo_app = primo.and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|dt: DateTime<FixedOffset>| dt.with_timezone(&Utc)));
    let ultimo_app = ultimo.and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|dt: DateTime<FixedOffset>| dt.with_timezone(&Utc)));

    let statistiche = ClienteStatistiche {
        totale_appuntamenti: totale,
        appuntamenti_completati: completati,
        appuntamenti_annullati: annullati,
        appuntamenti_no_show: no_show,
        spesa_totale,
        spesa_media,
        primo_appuntamento: primo_app,
        ultimo_appuntamento: ultimo_app,
        giorni_da_ultimo_appuntamento: giorni_da_ultimo,
    };

    // Get all appuntamenti with details
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
        WHERE a.cliente_id = ?1
        ORDER BY a.data_ora_inizio DESC
        LIMIT ?2
        "#
    )
    .bind(&cliente_id)
    .bind(limit)
    .fetch_all(&state.db.pool)
    .await?;

    // Get frequent treatments
    let trattamenti_frequenti = sqlx::query_as::<_, TrattamentoFrequenza>(
        r#"
        SELECT
            t.nome as trattamento_nome,
            ct.nome as categoria_nome,
            COUNT(*) as count,
            COALESCE(SUM(a.prezzo_applicato), 0.0) as spesa_totale
        FROM appuntamenti a
        INNER JOIN trattamenti t ON a.trattamento_id = t.id
        LEFT JOIN categorie_trattamenti ct ON t.categoria_id = ct.id
        WHERE a.cliente_id = ?1
          AND a.stato = 'completato'
        GROUP BY t.nome, ct.nome
        ORDER BY count DESC
        LIMIT 5
        "#
    )
    .bind(&cliente_id)
    .fetch_all(&state.db.pool)
    .await?;

    // Get monthly spending
    let spesa_per_mese = sqlx::query_as::<_, SpesaMensile>(
        r#"
        SELECT
            CAST(strftime('%Y', data_ora_inizio) AS INTEGER) as anno,
            CAST(strftime('%m', data_ora_inizio) AS INTEGER) as mese,
            COALESCE(SUM(prezzo_applicato), 0.0) as spesa,
            COUNT(*) as appuntamenti
        FROM appuntamenti
        WHERE cliente_id = ?1
          AND stato = 'completato'
        GROUP BY anno, mese
        ORDER BY anno DESC, mese DESC
        LIMIT 12
        "#
    )
    .bind(&cliente_id)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(ClienteCompleteProfile {
        cliente,
        statistiche,
        appuntamenti,
        trattamenti_frequenti,
        spesa_per_mese,
    })
}