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
    let stats = sqlx::query_as::<_, (i64, i64, i64, i64, f64)>(
        r#"
        SELECT
            COUNT(*) as totale,
            SUM(CASE WHEN stato IN ('completato', 'in_corso') THEN 1 ELSE 0 END) as completati,
            SUM(CASE WHEN stato = 'annullato' THEN 1 ELSE 0 END) as annullati,
            SUM(CASE WHEN stato = 'no_show' THEN 1 ELSE 0 END) as no_show,
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

    let (totale, completati, annullati, no_show, ricavo_totale) = stats;

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
        appuntamenti_no_show: no_show,
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
// FILTERED REPORT COMMAND
// ============================================

#[tauri::command]
pub async fn get_report_filtrato(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    filtro: ReportFiltrato,
) -> AppResult<ReportFiltratoResult> {
    let state = db.lock().await;

    // Build dynamic WHERE clauses
    let mut where_clauses = vec![
        "a.data_ora_inizio >= ?1".to_string(),
        "a.data_ora_inizio < ?2".to_string(),
    ];

    let has_clienti = filtro.cliente_ids.as_ref().map_or(false, |v| !v.is_empty());
    let has_trattamenti = filtro.trattamento_ids.as_ref().map_or(false, |v| !v.is_empty());
    let empty_ids: Vec<String> = Vec::new();
    let cliente_ids_ref = filtro.cliente_ids.as_ref().unwrap_or(&empty_ids);
    let trattamento_ids_ref = filtro.trattamento_ids.as_ref().unwrap_or(&empty_ids);

    if has_clienti {
        let placeholders: Vec<String> = cliente_ids_ref
            .iter().enumerate()
            .map(|(i, _)| format!("?{}", i + 3))
            .collect();
        where_clauses.push(format!("a.cliente_id IN ({})", placeholders.join(",")));
    }

    if has_trattamenti {
        let offset = if has_clienti { 3 + cliente_ids_ref.len() } else { 3 };
        let placeholders: Vec<String> = trattamento_ids_ref
            .iter().enumerate()
            .map(|(i, _)| format!("?{}", offset + i))
            .collect();
        where_clauses.push(format!("a.trattamento_id IN ({})", placeholders.join(",")));
    }

    let where_sql = where_clauses.join(" AND ");

    // --- KPI ---
    let kpi_sql = format!(
        r#"SELECT
            COUNT(*) as totale,
            SUM(CASE WHEN a.stato IN ('completato', 'in_corso') THEN 1 ELSE 0 END) as completati,
            SUM(CASE WHEN a.stato = 'annullato' THEN 1 ELSE 0 END) as annullati,
            SUM(CASE WHEN a.stato = 'no_show' THEN 1 ELSE 0 END) as no_show,
            COALESCE(SUM(CASE WHEN a.stato IN ('completato', 'in_corso') THEN a.prezzo_applicato ELSE 0 END), 0.0) as ricavo
        FROM appuntamenti a
        WHERE {}"#,
        where_sql
    );

    let mut query_kpi = sqlx::query_as::<_, (i64, i64, i64, i64, f64)>(&kpi_sql)
        .bind(&filtro.data_inizio)
        .bind(&filtro.data_fine);
    if has_clienti {
        for id in cliente_ids_ref {
            query_kpi = query_kpi.bind(id);
        }
    }
    if has_trattamenti {
        for id in trattamento_ids_ref {
            query_kpi = query_kpi.bind(id);
        }
    }
    let (totale, completati, annullati, no_show, ricavo_totale) = query_kpi
        .fetch_one(&state.db.pool)
        .await?;

    // Unique clients
    let clienti_sql = format!(
        r#"SELECT
            COUNT(DISTINCT a.cliente_id) as clienti_unici,
            COUNT(DISTINCT CASE
                WHEN c.created_at >= ?1 AND c.created_at < ?2
                THEN c.id ELSE NULL
            END) as nuovi_clienti
        FROM appuntamenti a
        INNER JOIN clienti c ON a.cliente_id = c.id
        WHERE {}"#,
        where_sql
    );
    let mut query_clienti = sqlx::query_as::<_, (i64, i64)>(&clienti_sql)
        .bind(&filtro.data_inizio)
        .bind(&filtro.data_fine);
    if has_clienti {
        for id in cliente_ids_ref {
            query_clienti = query_clienti.bind(id);
        }
    }
    if has_trattamenti {
        for id in trattamento_ids_ref {
            query_clienti = query_clienti.bind(id);
        }
    }
    let (clienti_unici, nuovi_clienti) = query_clienti.fetch_one(&state.db.pool).await?;

    // Average duration
    let durata_sql = format!(
        r#"SELECT COALESCE(AVG(t.durata_minuti), 0.0)
        FROM appuntamenti a
        INNER JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE {} AND a.stato IN ('completato', 'in_corso')"#,
        where_sql
    );
    let mut query_durata = sqlx::query_as::<_, (f64,)>(&durata_sql)
        .bind(&filtro.data_inizio)
        .bind(&filtro.data_fine);
    if has_clienti {
        for id in cliente_ids_ref {
            query_durata = query_durata.bind(id);
        }
    }
    if has_trattamenti {
        for id in trattamento_ids_ref {
            query_durata = query_durata.bind(id);
        }
    }
    let durata_media_minuti = query_durata.fetch_one(&state.db.pool).await?.0;

    let tasso_completamento = if totale > 0 { (completati as f64 / totale as f64) * 100.0 } else { 0.0 };
    let ricavo_medio = if completati > 0 { ricavo_totale / completati as f64 } else { 0.0 };
    let media_app_per_cliente = if clienti_unici > 0 { totale as f64 / clienti_unici as f64 } else { 0.0 };

    let kpi = PeriodAnalytics {
        totale_appuntamenti: totale,
        appuntamenti_completati: completati,
        appuntamenti_annullati: annullati,
        appuntamenti_no_show: no_show,
        tasso_completamento,
        ricavo_totale,
        ricavo_medio,
        clienti_unici,
        nuovi_clienti,
        media_appuntamenti_per_cliente: media_app_per_cliente,
        durata_media_minuti,
    };

    // --- TOP TRATTAMENTI ---
    let tratt_sql = format!(
        r#"SELECT
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
        WHERE {} AND a.stato IN ('completato', 'in_corso')
        GROUP BY t.id, t.nome, ct.nome
        ORDER BY ricavo_totale DESC
        LIMIT 10"#,
        where_sql
    );
    let mut query_tratt = sqlx::query_as::<_, TrattamentoStats>(&tratt_sql)
        .bind(&filtro.data_inizio)
        .bind(&filtro.data_fine);
    if has_clienti {
        for id in cliente_ids_ref {
            query_tratt = query_tratt.bind(id);
        }
    }
    if has_trattamenti {
        for id in trattamento_ids_ref {
            query_tratt = query_tratt.bind(id);
        }
    }
    let top_trattamenti = query_tratt.fetch_all(&state.db.pool).await?;

    // --- TOP CLIENTI ---
    let cli_sql = format!(
        r#"SELECT
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
        WHERE {} AND a.stato IN ('completato', 'in_corso') AND c.attivo = 1
        GROUP BY c.id, c.nome, c.cognome, c.email, c.cellulare
        ORDER BY ricavo_totale DESC
        LIMIT 10"#,
        where_sql
    );
    let mut query_cli = sqlx::query_as::<_, ClienteTopRicavo>(&cli_sql)
        .bind(&filtro.data_inizio)
        .bind(&filtro.data_fine);
    if has_clienti {
        for id in cliente_ids_ref {
            query_cli = query_cli.bind(id);
        }
    }
    if has_trattamenti {
        for id in trattamento_ids_ref {
            query_cli = query_cli.bind(id);
        }
    }
    let top_clienti = query_cli.fetch_all(&state.db.pool).await?;

    // --- PRODUTTIVITA OPERATRICI ---
    let op_sql = format!(
        r#"SELECT
            o.id as operatrice_id,
            o.nome as operatrice_nome,
            o.cognome as operatrice_cognome,
            COUNT(a.id) as totale_appuntamenti,
            SUM(CASE WHEN a.stato IN ('completato', 'in_corso') THEN 1 ELSE 0 END) as appuntamenti_completati,
            COALESCE(SUM(CASE WHEN a.stato IN ('completato', 'in_corso') THEN a.prezzo_applicato ELSE 0 END), 0.0) as ricavo_totale,
            COALESCE(AVG(CASE WHEN a.stato IN ('completato', 'in_corso') THEN a.prezzo_applicato ELSE NULL END), 0.0) as ricavo_medio,
            COALESCE(SUM(CASE WHEN a.stato IN ('completato', 'in_corso') THEN t.durata_minuti ELSE 0 END), 0.0) / 60.0 as ore_lavorate
        FROM appuntamenti a
        INNER JOIN operatrici o ON a.operatrice_id = o.id
        LEFT JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE {}
        GROUP BY o.id, o.nome, o.cognome
        ORDER BY ricavo_totale DESC"#,
        where_sql
    );
    let mut query_op = sqlx::query_as::<_, OperatriceProduttivita>(&op_sql)
        .bind(&filtro.data_inizio)
        .bind(&filtro.data_fine);
    if has_clienti {
        for id in cliente_ids_ref {
            query_op = query_op.bind(id);
        }
    }
    if has_trattamenti {
        for id in trattamento_ids_ref {
            query_op = query_op.bind(id);
        }
    }
    let produttivita_operatrici = query_op.fetch_all(&state.db.pool).await?;

    // --- RICAVI PER CATEGORIA ---
    let cat_sql = format!(
        r#"SELECT
            COALESCE(ct.nome, 'Senza categoria') as categoria_nome,
            COUNT(a.id) as totale_appuntamenti,
            COALESCE(SUM(a.prezzo_applicato), 0.0) as ricavo_totale,
            0.0 as percentuale
        FROM appuntamenti a
        LEFT JOIN trattamenti t ON a.trattamento_id = t.id
        LEFT JOIN categorie_trattamenti ct ON t.categoria_id = ct.id
        WHERE {} AND a.stato IN ('completato', 'in_corso')
        GROUP BY ct.nome
        ORDER BY ricavo_totale DESC"#,
        where_sql
    );
    let mut query_cat = sqlx::query_as::<_, RicavoCategoria>(&cat_sql)
        .bind(&filtro.data_inizio)
        .bind(&filtro.data_fine);
    if has_clienti {
        for id in cliente_ids_ref {
            query_cat = query_cat.bind(id);
        }
    }
    if has_trattamenti {
        for id in trattamento_ids_ref {
            query_cat = query_cat.bind(id);
        }
    }
    let mut ricavi_per_categoria = query_cat.fetch_all(&state.db.pool).await?;
    // Calculate percentages
    let totale_cat: f64 = ricavi_per_categoria.iter().map(|c| c.ricavo_totale).sum();
    if totale_cat > 0.0 {
        for cat in &mut ricavi_per_categoria {
            cat.percentuale = (cat.ricavo_totale / totale_cat) * 100.0;
        }
    }

    // --- DETTAGLIO APPUNTAMENTI ---
    let det_sql = format!(
        r#"SELECT
            a.data_ora_inizio as data,
            COALESCE(c.nome, '') as cliente_nome,
            COALESCE(c.cognome, '') as cliente_cognome,
            COALESCE(t.nome, '') as trattamento_nome,
            COALESCE(ct.nome, '') as categoria_trattamento,
            COALESCE(o.nome, '') as operatrice_nome,
            COALESCE(o.cognome, '') as operatrice_cognome,
            COALESCE(t.durata_minuti, 0) as durata_minuti,
            a.stato,
            COALESCE(a.prezzo_applicato, 0.0) as prezzo,
            COALESCE(a.note_prenotazione, '') as note
        FROM appuntamenti a
        LEFT JOIN clienti c ON a.cliente_id = c.id
        LEFT JOIN trattamenti t ON a.trattamento_id = t.id
        LEFT JOIN categorie_trattamenti ct ON t.categoria_id = ct.id
        LEFT JOIN operatrici o ON a.operatrice_id = o.id
        WHERE {}
        ORDER BY a.data_ora_inizio DESC
        LIMIT 1000"#,
        where_sql
    );
    let mut query_det = sqlx::query_as::<_, ReportAppuntamentoRow>(&det_sql)
        .bind(&filtro.data_inizio)
        .bind(&filtro.data_fine);
    if has_clienti {
        for id in cliente_ids_ref {
            query_det = query_det.bind(id);
        }
    }
    if has_trattamenti {
        for id in trattamento_ids_ref {
            query_det = query_det.bind(id);
        }
    }
    let dettaglio_appuntamenti = query_det.fetch_all(&state.db.pool).await?;

    Ok(ReportFiltratoResult {
        kpi,
        top_trattamenti,
        top_clienti,
        produttivita_operatrici,
        ricavi_per_categoria,
        dettaglio_appuntamenti,
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
            MAX(CASE WHEN a.stato IN ('completato', 'in_corso') THEN a.data_ora_inizio ELSE NULL END) as ultimo_appuntamento,
            SUM(CASE WHEN a.stato IN ('completato', 'in_corso') THEN 1 ELSE 0 END) as totale_appuntamenti
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
            MIN(CASE WHEN stato IN ('completato', 'in_corso') THEN data_ora_inizio ELSE NULL END) as primo,
            MAX(CASE WHEN stato IN ('completato', 'in_corso') THEN data_ora_inizio ELSE NULL END) as ultimo
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