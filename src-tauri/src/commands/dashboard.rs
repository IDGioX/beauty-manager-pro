use crate::error::AppResult;
use crate::models::AppuntamentoWithDetails;
use chrono::{DateTime, Utc, Local, Datelike, Timelike, NaiveDate};
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

// ============================================
// DASHBOARD COMPLETO - Structs
// ============================================

#[derive(Debug, Serialize)]
pub struct AppuntamentiOggiStats {
    pub totale: i64,
    pub confermati: i64,
    pub in_attesa: i64,
    pub in_corso: i64,
    pub completati: i64,
    pub no_show: i64,
    pub in_ritardo: i64,
}

#[derive(Debug, Serialize)]
pub struct ProssimoAppuntamento {
    pub id: String,
    pub cliente_nome: String,
    pub cliente_cognome: String,
    pub trattamento_nome: String,
    pub operatrice_nome: String,
    pub data_ora_inizio: String,
    pub minuti_mancanti: i64,
}

#[derive(Debug, Serialize)]
pub struct CompleannoInfo {
    pub id: String,
    pub nome: String,
    pub cognome: String,
}

#[derive(Debug, Serialize)]
pub struct TrattamentoTopOggi {
    pub nome: String,
    pub count: i64,
    pub ricavo: f64,
}

#[derive(Debug, Serialize)]
pub struct DashboardCompleto {
    // RIGA 1 - OGGI
    pub appuntamenti_oggi: AppuntamentiOggiStats,
    pub prossimo_appuntamento: Option<ProssimoAppuntamento>,
    pub slot_liberi_oggi: i64,

    // AZIONI
    pub compleanni_oggi: Vec<CompleannoInfo>,
    pub clienti_churn_count: i64,
    pub no_show_recenti: i64,

    // SOLDI
    pub fatturato_oggi: f64,
    pub fatturato_ieri: f64,
    pub fatturato_stesso_giorno_settimana_scorsa: f64,
    pub scontrino_medio_oggi: f64,
    pub scontrino_medio_mese: f64,
    pub fatturato_mese: f64,
    pub fatturato_previsione: f64,
    pub trattamenti_top_oggi: Vec<TrattamentoTopOggi>,
    pub vendita_prodotti_oggi: f64,

    // CLIENTI
    pub nuovi_clienti_mese: i64,
    pub clienti_attivi_mese: i64,
    pub clienti_persi: i64,
    pub tasso_ritorno: f64,

    // ALERT
    pub alert_prodotti_sotto_scorta: i64,
    pub alert_prodotti_in_scadenza: i64,

    // SATURAZIONE
    pub saturazione_oggi_percentuale: f64,
    pub saturazione_settimana_percentuale: f64,

    // PROSSIMI APPUNTAMENTI (lista)
    pub prossimi_appuntamenti: Vec<AppuntamentoWithDetails>,
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
            a.omaggio,
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

// ============================================
// DASHBOARD COMPLETO
// ============================================

#[tauri::command]
pub async fn get_dashboard_completo(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<DashboardCompleto> {
    let state = db.lock().await;
    let now = Local::now();
    let oggi = now.format("%Y-%m-%d").to_string();
    let now_iso = now.format("%Y-%m-%d %H:%M:%S").to_string();

    // Primo giorno del mese corrente
    let primo_mese = now.with_day(1).unwrap_or(now).format("%Y-%m-%d").to_string();
    // Ieri
    let ieri = (now - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();
    // Stesso giorno settimana scorsa
    let settimana_scorsa = (now - chrono::Duration::days(7)).format("%Y-%m-%d").to_string();

    // --- APPUNTAMENTI OGGI (breakdown per stato) ---
    // Escludi annullati dal totale: non occupano slot
    let app_stats = sqlx::query_as::<_, (i64, i64, i64, i64, i64, i64, i64)>(
        r#"
        SELECT
            COALESCE(SUM(CASE WHEN stato != 'annullato' THEN 1 ELSE 0 END), 0) as totale,
            COALESCE(SUM(CASE WHEN stato = 'confermato' THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN stato = 'prenotato' THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN stato = 'in_corso' THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN stato = 'completato' THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN stato = 'no_show' THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN stato = 'annullato' THEN 1 ELSE 0 END), 0)
        FROM appuntamenti
        WHERE DATE(data_ora_inizio) = ?1
        "#,
    )
    .bind(&oggi)
    .fetch_one(&state.db.pool)
    .await?;

    // In ritardo: prenotati/confermati con ora già passata
    let in_ritardo = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM appuntamenti
        WHERE DATE(data_ora_inizio) = ?1
          AND stato IN ('prenotato', 'confermato')
          AND datetime(data_ora_inizio) < datetime(?2)
        "#,
    )
    .bind(&oggi)
    .bind(&now_iso)
    .fetch_one(&state.db.pool)
    .await?;

    let appuntamenti_oggi = AppuntamentiOggiStats {
        totale: app_stats.0,
        confermati: app_stats.1,
        in_attesa: app_stats.2,
        in_corso: app_stats.3,
        completati: app_stats.4,
        no_show: app_stats.5,
        in_ritardo,
    };

    // --- PROSSIMO APPUNTAMENTO ---
    let prossimo = sqlx::query_as::<_, (String, String, String, String, String, String)>(
        r#"
        SELECT
            a.id,
            c.nome,
            c.cognome,
            COALESCE(t.nome, ''),
            COALESCE(o.nome, ''),
            a.data_ora_inizio
        FROM appuntamenti a
        LEFT JOIN clienti c ON a.cliente_id = c.id
        LEFT JOIN trattamenti t ON a.trattamento_id = t.id
        LEFT JOIN operatrici o ON a.operatrice_id = o.id
        WHERE datetime(a.data_ora_inizio) > datetime(?1)
          AND a.stato IN ('prenotato', 'confermato')
        ORDER BY datetime(a.data_ora_inizio) ASC
        LIMIT 1
        "#,
    )
    .bind(&now_iso)
    .fetch_optional(&state.db.pool)
    .await?;

    let prossimo_appuntamento = prossimo.map(|(id, cn, cc, tn, on_, doi)| {
        // Prova tutti i formati possibili (con T, con spazio, con e senza frazioni)
        let minuti = [
            "%Y-%m-%dT%H:%M:%S%.f",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S%.f",
            "%Y-%m-%d %H:%M:%S",
        ]
        .iter()
        .find_map(|fmt| {
            chrono::NaiveDateTime::parse_from_str(&doi, fmt).ok()
        })
        .map(|dt| dt.signed_duration_since(now.naive_local()).num_minutes().max(0))
        .unwrap_or(0);

        ProssimoAppuntamento {
            id,
            cliente_nome: cn,
            cliente_cognome: cc,
            trattamento_nome: tn,
            operatrice_nome: on_,
            data_ora_inizio: doi,
            minuti_mancanti: minuti,
        }
    });

    // --- SLOT LIBERI OGGI ---
    // Calcola gli slot rimanenti da ADESSO fino a chiusura
    let config = sqlx::query_as::<_, (String, String, i64)>(
        r#"
        SELECT
            COALESCE(orario_apertura, '09:00'),
            COALESCE(orario_chiusura, '19:00'),
            COALESCE(slot_durata_minuti, 15)
        FROM config_centro LIMIT 1
        "#,
    )
    .fetch_optional(&state.db.pool)
    .await?
    .unwrap_or(("09:00".to_string(), "19:00".to_string(), 15));

    let operatrici_attive = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM operatrici WHERE attiva = 1"
    )
    .fetch_one(&state.db.pool)
    .await?;

    let parse_hhmm = |s: &str| -> i64 {
        let parts: Vec<&str> = s.split(':').collect();
        parts.get(0).and_then(|h| h.parse::<i64>().ok()).unwrap_or(9) * 60
            + parts.get(1).and_then(|m| m.parse::<i64>().ok()).unwrap_or(0)
    };
    let apertura_min = parse_hhmm(&config.0);
    let chiusura_min = parse_hhmm(&config.1);
    let now_min = now.hour() as i64 * 60 + now.minute() as i64;

    // Minuti occupati da appuntamenti FUTURI (da adesso in poi)
    let minuti_occupati_futuri = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(SUM(t.durata_minuti), 0.0)
        FROM appuntamenti a
        JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE DATE(a.data_ora_inizio) = ?1
          AND datetime(a.data_ora_inizio) >= datetime(?2)
          AND a.stato NOT IN ('annullato', 'no_show', 'completato')
        "#,
    )
    .bind(&oggi)
    .bind(&now_iso)
    .fetch_one(&state.db.pool)
    .await
    .unwrap_or(0.0) as i64;

    // Durata media trattamenti per convertire minuti liberi in slot
    let durata_media_globale = sqlx::query_scalar::<_, f64>(
        "SELECT COALESCE(AVG(durata_minuti), 45.0) FROM trattamenti WHERE attivo = 1"
    )
    .fetch_one(&state.db.pool)
    .await
    .unwrap_or(45.0);
    let durata_slot = if durata_media_globale > 0.0 { durata_media_globale as i64 } else { 45 };

    // Minuti rimanenti da adesso a chiusura (per ogni operatrice)
    let minuti_rimanenti = if now_min >= chiusura_min {
        0 // Giornata finita
    } else {
        let start = now_min.max(apertura_min);
        (chiusura_min - start) * operatrici_attive
    };

    let slot_liberi_oggi = if operatrici_attive == 0 || minuti_rimanenti == 0 {
        0
    } else {
        let minuti_liberi = (minuti_rimanenti - minuti_occupati_futuri).max(0);
        if durata_slot > 0 { minuti_liberi / durata_slot } else { 0 }
    };

    // Slot totali giornata (per saturazione)
    let minuti_giornata = chiusura_min - apertura_min;
    let slot_totali = if operatrici_attive > 0 && durata_slot > 0 {
        (minuti_giornata / durata_slot) * operatrici_attive
    } else {
        0
    };

    // Minuti occupati oggi (tutti, per saturazione)
    let minuti_occupati_oggi = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(SUM(t.durata_minuti), 0.0)
        FROM appuntamenti a
        JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE DATE(a.data_ora_inizio) = ?1
          AND a.stato NOT IN ('annullato', 'no_show')
        "#,
    )
    .bind(&oggi)
    .fetch_one(&state.db.pool)
    .await
    .unwrap_or(0.0) as i64;

    // --- COMPLEANNI OGGI ---
    let month = now.month() as i32;
    let day = now.day() as i32;
    let compleanni = sqlx::query_as::<_, (String, String, String)>(
        r#"
        SELECT id, nome, cognome FROM clienti
        WHERE attivo = 1
          AND data_nascita IS NOT NULL
          AND CAST(strftime('%m', data_nascita) AS INTEGER) = ?1
          AND CAST(strftime('%d', data_nascita) AS INTEGER) = ?2
        ORDER BY cognome, nome
        "#,
    )
    .bind(month)
    .bind(day)
    .fetch_all(&state.db.pool)
    .await?;

    let compleanni_oggi: Vec<CompleannoInfo> = compleanni
        .into_iter()
        .map(|(id, nome, cognome)| CompleannoInfo { id, nome, cognome })
        .collect();

    // --- CLIENTI CHURN (>90 giorni dall'ultima visita EFFETTIVA) ---
    // Conta solo appuntamenti completati/in_corso come "visita reale"
    // No_show e annullati non contano come ultima visita
    let clienti_churn_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM (
            SELECT c.id
            FROM clienti c
            INNER JOIN appuntamenti a ON c.id = a.cliente_id
            WHERE c.attivo = 1
              AND a.stato IN ('completato', 'in_corso')
            GROUP BY c.id
            HAVING julianday('now') - julianday(MAX(a.data_ora_inizio)) >= 90
        )
        "#,
    )
    .fetch_one(&state.db.pool)
    .await?;

    // --- NO-SHOW RECENTI (ultimi 30 giorni, senza nuovo appuntamento successivo) ---
    // Esclude clienti che hanno già rifissato un appuntamento dopo il no_show
    let no_show_recenti = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(DISTINCT ns.cliente_id) FROM appuntamenti ns
        WHERE ns.stato = 'no_show'
          AND DATE(ns.data_ora_inizio) >= DATE('now', '-30 days')
          AND NOT EXISTS (
            SELECT 1 FROM appuntamenti futuro
            WHERE futuro.cliente_id = ns.cliente_id
              AND futuro.data_ora_inizio > ns.data_ora_inizio
              AND futuro.stato IN ('prenotato', 'confermato', 'in_corso', 'completato')
          )
        "#,
    )
    .fetch_one(&state.db.pool)
    .await?;

    // --- FATTURATO OGGI ---
    let fatturato_oggi_row = sqlx::query_as::<_, (f64, f64)>(
        r#"
        SELECT
            COALESCE(SUM(prezzo_applicato), 0.0),
            COALESCE(AVG(prezzo_applicato), 0.0)
        FROM appuntamenti
        WHERE DATE(data_ora_inizio) = ?1
          AND stato IN ('completato', 'in_corso')
          AND prezzo_applicato IS NOT NULL
          AND (omaggio IS NULL OR omaggio = 0)
        "#,
    )
    .bind(&oggi)
    .fetch_one(&state.db.pool)
    .await?;

    // Pagamenti pacchetti del giorno (anticipo/dilazionato)
    let pacchetti_oggi: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(pp.importo), 0.0) FROM pacchetto_pagamenti pp JOIN pacchetti_cliente pc ON pc.id = pp.pacchetto_cliente_id WHERE pc.stato != 'annullato' AND DATE(pp.created_at) = ?"
    ).bind(&oggi).fetch_one(&state.db.pool).await.unwrap_or(0.0);

    let fatturato_oggi = fatturato_oggi_row.0 + pacchetti_oggi;
    let scontrino_medio_oggi = fatturato_oggi_row.1;

    // --- FATTURATO IERI ---
    let fatturato_ieri_app = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(SUM(prezzo_applicato), 0.0)
        FROM appuntamenti
        WHERE DATE(data_ora_inizio) = ?1
          AND stato IN ('completato', 'in_corso')
          AND prezzo_applicato IS NOT NULL
          AND (omaggio IS NULL OR omaggio = 0)
        "#,
    )
    .bind(&ieri)
    .fetch_one(&state.db.pool)
    .await?;
    let pacchetti_ieri: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(pp.importo), 0.0) FROM pacchetto_pagamenti pp JOIN pacchetti_cliente pc ON pc.id = pp.pacchetto_cliente_id WHERE pc.stato != 'annullato' AND DATE(pp.created_at) = ?"
    ).bind(&ieri).fetch_one(&state.db.pool).await.unwrap_or(0.0);
    let fatturato_ieri = fatturato_ieri_app + pacchetti_ieri;

    // --- FATTURATO STESSO GIORNO SETTIMANA SCORSA ---
    let fatturato_sett_app = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(SUM(prezzo_applicato), 0.0)
        FROM appuntamenti
        WHERE DATE(data_ora_inizio) = ?1
          AND stato IN ('completato', 'in_corso')
          AND prezzo_applicato IS NOT NULL
          AND (omaggio IS NULL OR omaggio = 0)
        "#,
    )
    .bind(&settimana_scorsa)
    .fetch_one(&state.db.pool)
    .await?;
    let pacchetti_sett: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(pp.importo), 0.0) FROM pacchetto_pagamenti pp JOIN pacchetti_cliente pc ON pc.id = pp.pacchetto_cliente_id WHERE pc.stato != 'annullato' AND DATE(pp.created_at) = ?"
    ).bind(&settimana_scorsa).fetch_one(&state.db.pool).await.unwrap_or(0.0);
    let fatturato_settimana_scorsa = fatturato_sett_app + pacchetti_sett;

    // --- FATTURATO e SCONTRINO MEDIO MESE ---
    let mese_row = sqlx::query_as::<_, (f64, f64)>(
        r#"
        SELECT
            COALESCE(SUM(prezzo_applicato), 0.0),
            COALESCE(AVG(prezzo_applicato), 0.0)
        FROM appuntamenti
        WHERE DATE(data_ora_inizio) >= ?1
          AND stato IN ('completato', 'in_corso')
          AND prezzo_applicato IS NOT NULL
          AND (omaggio IS NULL OR omaggio = 0)
        "#,
    )
    .bind(&primo_mese)
    .fetch_one(&state.db.pool)
    .await?;
    let pacchetti_mese: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(pp.importo), 0.0) FROM pacchetto_pagamenti pp JOIN pacchetti_cliente pc ON pc.id = pp.pacchetto_cliente_id WHERE pc.stato != 'annullato' AND DATE(pp.created_at) >= ?"
    ).bind(&primo_mese).fetch_one(&state.db.pool).await.unwrap_or(0.0);

    let fatturato_mese = mese_row.0 + pacchetti_mese;
    let scontrino_medio_mese = mese_row.1;

    // --- FATTURATO PREVISIONE ---
    let fatturato_prev_app = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(SUM(prezzo_applicato), 0.0)
        FROM appuntamenti
        WHERE DATE(data_ora_inizio) >= ?1
          AND stato IN ('prenotato', 'confermato', 'in_corso', 'completato')
          AND (omaggio IS NULL OR omaggio = 0)
        "#,
    )
    .bind(&primo_mese)
    .fetch_one(&state.db.pool)
    .await
    .unwrap_or(0.0);
    // Previsione include anche il rimanente da incassare dai pacchetti attivi
    let pacchetti_prev: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(importo_totale - importo_pagato), 0.0) FROM pacchetti_cliente WHERE stato = 'attivo'"
    ).fetch_one(&state.db.pool).await.unwrap_or(0.0);
    let fatturato_previsione = fatturato_prev_app + pacchetti_mese + pacchetti_prev;

    // --- TRATTAMENTI TOP OGGI ---
    let top_trattamenti = sqlx::query_as::<_, (String, i64, f64)>(
        r#"
        SELECT
            t.nome,
            COUNT(*) as cnt,
            COALESCE(SUM(a.prezzo_applicato), 0.0)
        FROM appuntamenti a
        INNER JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE DATE(a.data_ora_inizio) = ?1
          AND a.stato IN ('completato', 'in_corso', 'prenotato', 'confermato')
        GROUP BY t.nome
        ORDER BY cnt DESC
        LIMIT 3
        "#,
    )
    .bind(&oggi)
    .fetch_all(&state.db.pool)
    .await?;

    let trattamenti_top_oggi: Vec<TrattamentoTopOggi> = top_trattamenti
        .into_iter()
        .map(|(nome, count, ricavo)| TrattamentoTopOggi { nome, count, ricavo })
        .collect();

    // --- VENDITA PRODOTTI OGGI ---
    let vendita_prodotti_oggi = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(SUM(quantita * COALESCE(prezzo_unitario, 0.0)), 0.0)
        FROM movimenti_magazzino
        WHERE tipo = 'scarico_vendita'
          AND DATE(created_at) = ?1
        "#,
    )
    .bind(&oggi)
    .fetch_one(&state.db.pool)
    .await?;

    // --- NUOVI CLIENTI MESE ---
    let nuovi_clienti_mese = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM clienti
        WHERE DATE(created_at) >= ?1 AND attivo = 1
        "#,
    )
    .bind(&primo_mese)
    .fetch_one(&state.db.pool)
    .await?;

    // --- CLIENTI ATTIVI MESE ---
    let clienti_attivi_mese = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(DISTINCT cliente_id) FROM appuntamenti
        WHERE DATE(data_ora_inizio) >= ?1
          AND stato IN ('completato', 'in_corso', 'prenotato', 'confermato')
        "#,
    )
    .bind(&primo_mese)
    .fetch_one(&state.db.pool)
    .await?;

    // --- CLIENTI PERSI (>90gg) ---
    let clienti_persi = clienti_churn_count;

    // --- TASSO DI RITORNO ---
    // % clienti con >1 appuntamento completato nel mese / clienti con almeno 1
    let ritorno_stats = sqlx::query_as::<_, (i64, i64)>(
        r#"
        SELECT
            COUNT(*) as totale_clienti,
            SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END) as clienti_ritorno
        FROM (
            SELECT cliente_id, COUNT(*) as cnt
            FROM appuntamenti
            WHERE DATE(data_ora_inizio) >= ?1
              AND stato IN ('completato', 'in_corso')
            GROUP BY cliente_id
        )
        "#,
    )
    .bind(&primo_mese)
    .fetch_one(&state.db.pool)
    .await?;

    let tasso_ritorno = if ritorno_stats.0 > 0 {
        (ritorno_stats.1 as f64 / ritorno_stats.0 as f64) * 100.0
    } else {
        0.0
    };

    // --- ALERT PRODOTTI ---
    let alert_sotto_scorta = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM prodotti WHERE attivo = 1 AND scorta_minima > 0 AND giacenza <= scorta_minima"
    )
    .fetch_one(&state.db.pool)
    .await?;

    let alert_in_scadenza = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM prodotti WHERE attivo = 1 AND data_scadenza IS NOT NULL AND date(data_scadenza) <= date('now', '+30 days') AND date(data_scadenza) >= date('now')"
    )
    .fetch_one(&state.db.pool)
    .await?;

    // --- SATURAZIONE ---
    let saturazione_oggi_percentuale = {
        let minuti_totali = minuti_giornata * operatrici_attive.max(1);
        if minuti_totali > 0 { (minuti_occupati_oggi as f64 / minuti_totali as f64) * 100.0 } else { 0.0 }
    };

    // Saturazione settimana: minuti occupati vs minuti disponibili
    let minuti_occupati_settimana = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(SUM(t.durata_minuti), 0.0)
        FROM appuntamenti a
        JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE DATE(a.data_ora_inizio) >= ?1
          AND DATE(a.data_ora_inizio) < DATE(?1, '+7 days')
          AND a.stato NOT IN ('annullato', 'no_show')
        "#,
    )
    .bind(&oggi)
    .fetch_one(&state.db.pool)
    .await
    .unwrap_or(0.0) as i64;

    let giorni_lavorativi = sqlx::query_scalar::<_, String>(
        "SELECT COALESCE(giorni_lavorativi, '[1,2,3,4,5,6]') FROM config_centro LIMIT 1"
    )
    .fetch_optional(&state.db.pool)
    .await?
    .unwrap_or("[1,2,3,4,5,6]".to_string());

    let num_giorni_lav: i64 = giorni_lavorativi.matches(',').count() as i64 + 1;
    let saturazione_settimana_percentuale = {
        let minuti_sett = minuti_giornata * operatrici_attive.max(1) * num_giorni_lav.min(7);
        if minuti_sett > 0 { (minuti_occupati_settimana as f64 / minuti_sett as f64) * 100.0 } else { 0.0 }
    };

    // --- PROSSIMI APPUNTAMENTI (lista top 5) ---
    let prossimi_appuntamenti = sqlx::query_as::<_, AppuntamentoWithDetails>(
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
            a.omaggio,
            a.created_at,
            a.updated_at
        FROM appuntamenti a
        LEFT JOIN clienti c ON a.cliente_id = c.id
        LEFT JOIN operatrici o ON a.operatrice_id = o.id
        LEFT JOIN trattamenti t ON a.trattamento_id = t.id
        WHERE datetime(a.data_ora_inizio) > datetime(?1)
          AND a.stato IN ('prenotato', 'confermato')
        ORDER BY datetime(a.data_ora_inizio) ASC
        LIMIT 5
        "#,
    )
    .bind(&now_iso)
    .fetch_all(&state.db.pool)
    .await?;

    Ok(DashboardCompleto {
        appuntamenti_oggi,
        prossimo_appuntamento,
        slot_liberi_oggi,
        compleanni_oggi,
        clienti_churn_count,
        no_show_recenti,
        fatturato_oggi,
        fatturato_ieri,
        fatturato_stesso_giorno_settimana_scorsa: fatturato_settimana_scorsa,
        scontrino_medio_oggi,
        scontrino_medio_mese,
        fatturato_mese,
        fatturato_previsione,
        trattamenti_top_oggi,
        vendita_prodotti_oggi,
        nuovi_clienti_mese,
        clienti_attivi_mese,
        clienti_persi,
        tasso_ritorno,
        alert_prodotti_sotto_scorta: alert_sotto_scorta,
        alert_prodotti_in_scadenza: alert_in_scadenza,
        saturazione_oggi_percentuale,
        saturazione_settimana_percentuale,
        prossimi_appuntamenti,
    })
}

// ============================================
// DASHBOARD CHARTS - Dati per grafici
// ============================================

#[derive(Debug, Serialize)]
pub struct FatturatoGiorno {
    pub data: String,
    pub giorno: String,
    pub importo: f64,
}

#[derive(Debug, Serialize)]
pub struct AppuntamentiGiorno {
    pub data: String,
    pub giorno: String,
    pub totale: i64,
    pub completati: i64,
    pub no_show: i64,
}

#[derive(Debug, Serialize)]
pub struct DashboardChartData {
    pub fatturato_giornaliero: Vec<FatturatoGiorno>,
    pub appuntamenti_giornalieri: Vec<AppuntamentiGiorno>,
}

fn giorno_settimana(date_str: &str) -> String {
    if let Ok(date) = NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
        match date.weekday() {
            chrono::Weekday::Mon => "Lun",
            chrono::Weekday::Tue => "Mar",
            chrono::Weekday::Wed => "Mer",
            chrono::Weekday::Thu => "Gio",
            chrono::Weekday::Fri => "Ven",
            chrono::Weekday::Sat => "Sab",
            chrono::Weekday::Sun => "Dom",
        }.to_string()
    } else {
        String::new()
    }
}

#[tauri::command]
pub async fn get_dashboard_chart_data(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<DashboardChartData> {
    let state = db.lock().await;

    // Fatturato ultimi 7 giorni
    let fatturato_rows: Vec<(String, f64)> = sqlx::query_as(
        r#"
        SELECT DATE(data_ora_inizio) as data,
               COALESCE(SUM(prezzo_applicato), 0.0) as importo
        FROM appuntamenti
        WHERE DATE(data_ora_inizio) >= DATE('now', '-6 days')
          AND stato IN ('completato', 'in_corso')
        GROUP BY DATE(data_ora_inizio)
        ORDER BY data
        "#,
    )
    .fetch_all(&state.db.pool)
    .await?;

    // Riempi i giorni mancanti con 0
    let today = Local::now().date_naive();
    let mut fatturato_giornaliero = Vec::new();
    for i in (0..7).rev() {
        let date = today - chrono::Duration::days(i);
        let date_str = date.format("%Y-%m-%d").to_string();
        let importo = fatturato_rows
            .iter()
            .find(|(d, _)| d == &date_str)
            .map(|(_, v)| *v)
            .unwrap_or(0.0);
        fatturato_giornaliero.push(FatturatoGiorno {
            giorno: giorno_settimana(&date_str),
            data: date_str,
            importo,
        });
    }

    // Appuntamenti ultimi 7 giorni
    let app_rows: Vec<(String, i64, i64, i64)> = sqlx::query_as(
        r#"
        SELECT DATE(data_ora_inizio) as data,
               COUNT(*) as totale,
               SUM(CASE WHEN stato = 'completato' THEN 1 ELSE 0 END) as completati,
               SUM(CASE WHEN stato = 'no_show' THEN 1 ELSE 0 END) as no_show
        FROM appuntamenti
        WHERE DATE(data_ora_inizio) >= DATE('now', '-6 days')
          AND stato != 'annullato'
        GROUP BY DATE(data_ora_inizio)
        ORDER BY data
        "#,
    )
    .fetch_all(&state.db.pool)
    .await?;

    let mut appuntamenti_giornalieri = Vec::new();
    for i in (0..7).rev() {
        let date = today - chrono::Duration::days(i);
        let date_str = date.format("%Y-%m-%d").to_string();
        let row = app_rows.iter().find(|(d, _, _, _)| d == &date_str);
        appuntamenti_giornalieri.push(AppuntamentiGiorno {
            giorno: giorno_settimana(&date_str),
            data: date_str,
            totale: row.map(|r| r.1).unwrap_or(0),
            completati: row.map(|r| r.2).unwrap_or(0),
            no_show: row.map(|r| r.3).unwrap_or(0),
        });
    }

    Ok(DashboardChartData {
        fatturato_giornaliero,
        appuntamenti_giornalieri,
    })
}
