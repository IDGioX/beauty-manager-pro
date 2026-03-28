// Tauri commands for business insights and intelligence

use crate::error::AppResult;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::sync::Arc;
use tokio::sync::Mutex;

// ============================================
// OUTPUT STRUCTS
// ============================================

#[derive(Debug, Serialize, FromRow)]
pub struct ClienteSegmentato {
    pub cliente_id: String,
    pub nome: String,
    pub cognome: String,
    pub cellulare: Option<String>,
    pub totale_appuntamenti: i64,
    pub spesa_totale: f64,
    pub ultimo_appuntamento: Option<String>,
    pub giorni_assenza: Option<i64>,
    pub primo_appuntamento: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SegmentazioneClienti {
    pub vip: Vec<ClienteSegmentato>,
    pub abituali: Vec<ClienteSegmentato>,
    pub a_rischio: Vec<ClienteSegmentato>,
    pub persi: Vec<ClienteSegmentato>,
    pub nuovi: Vec<ClienteSegmentato>,
    pub totale_clienti_attivi: i64,
    pub tasso_ritorno: f64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct OccupazioneSlot {
    pub giorno_settimana: i64,  // 0=Sunday..6=Saturday (SQLite strftime %w)
    pub fascia_oraria: String,
    pub totale_appuntamenti: i64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct MargineTrattamento {
    pub trattamento_id: String,
    pub trattamento_nome: String,
    pub categoria_nome: Option<String>,
    pub ricavo_totale: f64,
    pub costo_prodotti: f64,
    pub margine: f64,
    pub totale_appuntamenti: i64,
    pub margine_percentuale: f64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ConfrontoPeriodo {
    pub mese: String,
    pub ricavo: f64,
    pub appuntamenti: i64,
    pub clienti_unici: i64,
    pub ticket_medio: f64,
}

#[derive(Debug, Serialize)]
pub struct InsightMessage {
    pub tipo: String,       // "clienti", "revenue", "operativita", "magazzino"
    pub priorita: String,   // "alta", "media", "bassa"
    pub titolo: String,
    pub messaggio: String,
    pub valore: Option<String>,
    pub azione: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InsightsData {
    pub messaggi: Vec<InsightMessage>,
    pub segmentazione: SegmentazioneClienti,
    pub occupazione: Vec<OccupazioneSlot>,
    pub margini_trattamenti: Vec<MargineTrattamento>,
    pub confronto_mesi: Vec<ConfrontoPeriodo>,
    pub previsione_fatturato: f64,
    pub giorni_esaurimento_scorte: Vec<ScortaPrevisione>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ScortaPrevisione {
    pub prodotto_id: String,
    pub prodotto_nome: String,
    pub giacenza: f64,
    pub consumo_medio_giorno: f64,
    pub giorni_rimanenti: Option<f64>,
}

// ============================================
// MAIN COMMAND
// ============================================

#[tauri::command]
pub async fn get_insights_data(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
) -> AppResult<InsightsData> {
    let state = db.lock().await;
    let pool = &state.db.pool;

    // 1. Client segmentation
    let segmentazione = build_segmentazione(pool).await?;

    // 2. Occupation heatmap (last 90 days)
    let occupazione = sqlx::query_as::<_, OccupazioneSlot>(
        r#"
        SELECT
            CAST(strftime('%w', data_ora_inizio) AS INTEGER) as giorno_settimana,
            CASE
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 10 THEN '09-10'
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 11 THEN '10-11'
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 12 THEN '11-12'
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 13 THEN '12-13'
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 14 THEN '13-14'
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 15 THEN '14-15'
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 16 THEN '15-16'
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 17 THEN '16-17'
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 18 THEN '17-18'
                WHEN CAST(strftime('%H', data_ora_inizio) AS INTEGER) < 19 THEN '18-19'
                ELSE '19-20'
            END as fascia_oraria,
            COUNT(*) as totale_appuntamenti
        FROM appuntamenti
        WHERE data_ora_inizio >= datetime('now', '-90 days')
          AND stato NOT IN ('annullato')
        GROUP BY giorno_settimana, fascia_oraria
        ORDER BY giorno_settimana, fascia_oraria
        "#
    )
    .fetch_all(pool)
    .await?;

    // 3. Treatment margins (last 12 months)
    let margini_trattamenti = sqlx::query_as::<_, MargineTrattamento>(
        r#"
        SELECT
            t.id as trattamento_id,
            t.nome as trattamento_nome,
            ct.nome as categoria_nome,
            COALESCE(SUM(a.prezzo_applicato), 0.0) as ricavo_totale,
            COALESCE(costi.costo_totale, 0.0) as costo_prodotti,
            COALESCE(SUM(a.prezzo_applicato), 0.0) - COALESCE(costi.costo_totale, 0.0) as margine,
            COUNT(a.id) as totale_appuntamenti,
            CASE
                WHEN COALESCE(SUM(a.prezzo_applicato), 0.0) > 0
                THEN ((COALESCE(SUM(a.prezzo_applicato), 0.0) - COALESCE(costi.costo_totale, 0.0)) / COALESCE(SUM(a.prezzo_applicato), 0.0)) * 100.0
                ELSE 0.0
            END as margine_percentuale
        FROM appuntamenti a
        INNER JOIN trattamenti t ON a.trattamento_id = t.id
        LEFT JOIN categorie_trattamenti ct ON t.categoria_id = ct.id
        LEFT JOIN (
            SELECT
                m.appuntamento_id,
                SUM(m.quantita * COALESCE(p.prezzo_acquisto, 0.0)) as costo_totale
            FROM movimenti_magazzino m
            INNER JOIN prodotti p ON m.prodotto_id = p.id
            WHERE m.tipo IN ('scarico_uso')
              AND m.created_at >= datetime('now', '-12 months')
            GROUP BY m.appuntamento_id
        ) costi ON costi.appuntamento_id = a.id
        WHERE a.data_ora_inizio >= datetime('now', '-12 months')
          AND a.stato IN ('completato', 'in_corso')
          AND (a.omaggio IS NULL OR a.omaggio = 0)
        GROUP BY t.id, t.nome, ct.nome
        HAVING COUNT(a.id) >= 3
        ORDER BY margine DESC
        "#
    )
    .fetch_all(pool)
    .await?;

    // 4. Monthly comparison (last 12 months)
    let confronto_mesi = sqlx::query_as::<_, ConfrontoPeriodo>(
        r#"
        SELECT
            strftime('%Y-%m', data_ora_inizio) as mese,
            COALESCE(SUM(prezzo_applicato), 0.0) as ricavo,
            COUNT(*) as appuntamenti,
            COUNT(DISTINCT cliente_id) as clienti_unici,
            CASE WHEN COUNT(*) > 0
                THEN COALESCE(SUM(prezzo_applicato), 0.0) / COUNT(*)
                ELSE 0.0
            END as ticket_medio
        FROM appuntamenti
        WHERE data_ora_inizio >= datetime('now', '-12 months')
          AND stato IN ('completato', 'in_corso')
          AND (omaggio IS NULL OR omaggio = 0)
        GROUP BY mese
        ORDER BY mese ASC
        "#
    )
    .fetch_all(pool)
    .await?;

    // 4b. Aggiungi pagamenti pacchetti al confronto mensile
    let pagamenti_mese: Vec<(String, f64)> = sqlx::query_as(
        r#"
        SELECT strftime('%Y-%m', created_at) as mese, COALESCE(SUM(importo), 0.0) as ricavo
        FROM pacchetto_pagamenti
        WHERE created_at >= datetime('now', '-12 months')
        GROUP BY mese
        "#
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    // Merge pagamenti pacchetti nel confronto mensile
    let mut confronto_mesi: Vec<ConfrontoPeriodo> = confronto_mesi;
    for (mese_pkg, ricavo_pkg) in &pagamenti_mese {
        if let Some(m) = confronto_mesi.iter_mut().find(|c| &c.mese == mese_pkg) {
            m.ricavo += ricavo_pkg;
            if m.appuntamenti > 0 {
                m.ticket_medio = m.ricavo / m.appuntamenti as f64;
            }
        }
    }

    // 5. Revenue forecast (simple: avg of last 3 months projected)
    let previsione_app: f64 = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(AVG(ricavo_mese), 0.0)
        FROM (
            SELECT SUM(prezzo_applicato) as ricavo_mese
            FROM appuntamenti
            WHERE data_ora_inizio >= datetime('now', '-3 months')
              AND stato IN ('completato', 'in_corso')
              AND (omaggio IS NULL OR omaggio = 0)
            GROUP BY strftime('%Y-%m', data_ora_inizio)
        )
        "#
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    let previsione_pkg: f64 = sqlx::query_scalar::<_, f64>(
        "SELECT COALESCE(AVG(ricavo_mese), 0.0) FROM (SELECT SUM(importo) as ricavo_mese FROM pacchetto_pagamenti WHERE created_at >= datetime('now', '-3 months') GROUP BY strftime('%Y-%m', created_at))"
    ).fetch_one(pool).await.unwrap_or(0.0);
    let previsione_fatturato = previsione_app + previsione_pkg;

    // 6. Stock depletion forecast
    let giorni_esaurimento_scorte = sqlx::query_as::<_, ScortaPrevisione>(
        r#"
        SELECT
            p.id as prodotto_id,
            p.nome as prodotto_nome,
            COALESCE(p.giacenza, 0.0) as giacenza,
            COALESCE(consumo.media_giorno, 0.0) as consumo_medio_giorno,
            CASE
                WHEN COALESCE(consumo.media_giorno, 0.0) > 0
                THEN COALESCE(p.giacenza, 0.0) / consumo.media_giorno
                ELSE NULL
            END as giorni_rimanenti
        FROM prodotti p
        LEFT JOIN (
            SELECT
                prodotto_id,
                SUM(quantita) / 90.0 as media_giorno
            FROM movimenti_magazzino
            WHERE tipo IN ('scarico_uso', 'scarico_vendita')
              AND created_at >= datetime('now', '-90 days')
            GROUP BY prodotto_id
        ) consumo ON consumo.prodotto_id = p.id
        WHERE p.attivo = 1
          AND COALESCE(consumo.media_giorno, 0.0) > 0
          AND COALESCE(p.giacenza, 0.0) / consumo.media_giorno <= 30
        ORDER BY giorni_rimanenti ASC
        LIMIT 20
        "#
    )
    .fetch_all(pool)
    .await?;

    // 7. Build insight messages
    let messaggi = build_insight_messages(pool, &segmentazione, &occupazione, &margini_trattamenti, &giorni_esaurimento_scorte, &confronto_mesi).await?;

    Ok(InsightsData {
        messaggi,
        segmentazione,
        occupazione,
        margini_trattamenti,
        confronto_mesi,
        previsione_fatturato,
        giorni_esaurimento_scorte,
    })
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async fn build_segmentazione(pool: &sqlx::SqlitePool) -> AppResult<SegmentazioneClienti> {
    // All clients with appointment history
    let tutti_clienti = sqlx::query_as::<_, ClienteSegmentato>(
        r#"
        SELECT
            c.id as cliente_id,
            c.nome,
            c.cognome,
            c.cellulare,
            COUNT(a.id) as totale_appuntamenti,
            COALESCE(SUM(a.prezzo_applicato), 0.0) + COALESCE(pkg.spesa_pacchetti, 0.0) as spesa_totale,
            MAX(a.data_ora_inizio) as ultimo_appuntamento,
            CAST(julianday('now') - julianday(MAX(a.data_ora_inizio)) AS INTEGER) as giorni_assenza,
            MIN(a.data_ora_inizio) as primo_appuntamento
        FROM clienti c
        INNER JOIN appuntamenti a ON c.id = a.cliente_id
        LEFT JOIN (
            SELECT pc.cliente_id, SUM(pp.importo) as spesa_pacchetti
            FROM pacchetto_pagamenti pp
            JOIN pacchetti_cliente pc ON pc.id = pp.pacchetto_cliente_id
            GROUP BY pc.cliente_id
        ) pkg ON pkg.cliente_id = c.id
        WHERE c.attivo = 1
          AND a.stato IN ('completato', 'in_corso')
        GROUP BY c.id, c.nome, c.cognome, c.cellulare
        ORDER BY spesa_totale DESC
        "#
    )
    .fetch_all(pool)
    .await?;

    // Calculate thresholds
    let total_clients = tutti_clienti.len() as i64;
    let avg_spend: f64 = if total_clients > 0 {
        tutti_clienti.iter().map(|c| c.spesa_totale).sum::<f64>() / total_clients as f64
    } else {
        0.0
    };

    let vip_threshold = avg_spend * 2.0;

    let mut vip = Vec::new();
    let mut abituali = Vec::new();
    let mut a_rischio = Vec::new();
    let mut persi = Vec::new();
    let mut nuovi = Vec::new();

    for cliente in tutti_clienti.iter() {
        let giorni = cliente.giorni_assenza.unwrap_or(999);

        if cliente.totale_appuntamenti == 1 && giorni <= 60 {
            nuovi.push(ClienteSegmentato {
                cliente_id: cliente.cliente_id.clone(),
                nome: cliente.nome.clone(),
                cognome: cliente.cognome.clone(),
                cellulare: cliente.cellulare.clone(),
                totale_appuntamenti: cliente.totale_appuntamenti,
                spesa_totale: cliente.spesa_totale,
                ultimo_appuntamento: cliente.ultimo_appuntamento.clone(),
                giorni_assenza: cliente.giorni_assenza,
                primo_appuntamento: cliente.primo_appuntamento.clone(),
            });
        } else if giorni > 120 {
            persi.push(ClienteSegmentato {
                cliente_id: cliente.cliente_id.clone(),
                nome: cliente.nome.clone(),
                cognome: cliente.cognome.clone(),
                cellulare: cliente.cellulare.clone(),
                totale_appuntamenti: cliente.totale_appuntamenti,
                spesa_totale: cliente.spesa_totale,
                ultimo_appuntamento: cliente.ultimo_appuntamento.clone(),
                giorni_assenza: cliente.giorni_assenza,
                primo_appuntamento: cliente.primo_appuntamento.clone(),
            });
        } else if giorni > 60 {
            a_rischio.push(ClienteSegmentato {
                cliente_id: cliente.cliente_id.clone(),
                nome: cliente.nome.clone(),
                cognome: cliente.cognome.clone(),
                cellulare: cliente.cellulare.clone(),
                totale_appuntamenti: cliente.totale_appuntamenti,
                spesa_totale: cliente.spesa_totale,
                ultimo_appuntamento: cliente.ultimo_appuntamento.clone(),
                giorni_assenza: cliente.giorni_assenza,
                primo_appuntamento: cliente.primo_appuntamento.clone(),
            });
        } else if cliente.spesa_totale >= vip_threshold && cliente.totale_appuntamenti >= 5 {
            vip.push(ClienteSegmentato {
                cliente_id: cliente.cliente_id.clone(),
                nome: cliente.nome.clone(),
                cognome: cliente.cognome.clone(),
                cellulare: cliente.cellulare.clone(),
                totale_appuntamenti: cliente.totale_appuntamenti,
                spesa_totale: cliente.spesa_totale,
                ultimo_appuntamento: cliente.ultimo_appuntamento.clone(),
                giorni_assenza: cliente.giorni_assenza,
                primo_appuntamento: cliente.primo_appuntamento.clone(),
            });
        } else {
            abituali.push(ClienteSegmentato {
                cliente_id: cliente.cliente_id.clone(),
                nome: cliente.nome.clone(),
                cognome: cliente.cognome.clone(),
                cellulare: cliente.cellulare.clone(),
                totale_appuntamenti: cliente.totale_appuntamenti,
                spesa_totale: cliente.spesa_totale,
                ultimo_appuntamento: cliente.ultimo_appuntamento.clone(),
                giorni_assenza: cliente.giorni_assenza,
                primo_appuntamento: cliente.primo_appuntamento.clone(),
            });
        }
    }

    // Return rate: clients with > 1 appointment / total
    let clienti_ritornati = tutti_clienti.iter().filter(|c| c.totale_appuntamenti > 1).count() as f64;
    let tasso_ritorno = if total_clients > 0 {
        (clienti_ritornati / total_clients as f64) * 100.0
    } else {
        0.0
    };

    Ok(SegmentazioneClienti {
        vip,
        abituali,
        a_rischio,
        persi,
        nuovi,
        totale_clienti_attivi: total_clients,
        tasso_ritorno,
    })
}

async fn build_insight_messages(
    pool: &sqlx::SqlitePool,
    segmentazione: &SegmentazioneClienti,
    occupazione: &[OccupazioneSlot],
    margini: &[MargineTrattamento],
    scorte: &[ScortaPrevisione],
    confronto: &[ConfrontoPeriodo],
) -> AppResult<Vec<InsightMessage>> {
    let mut messaggi = Vec::new();

    // --- CLIENTI A RISCHIO ---
    let n_rischio = segmentazione.a_rischio.len();
    if n_rischio > 0 {
        messaggi.push(InsightMessage {
            tipo: "clienti".to_string(),
            priorita: "alta".to_string(),
            titolo: format!("{} client{} a rischio", n_rischio, if n_rischio == 1 { "e" } else { "i" }),
            messaggio: format!(
                "Non tornano da oltre 60 giorni. Contattali prima che li perdi.",
            ),
            valore: Some(format!("{}", n_rischio)),
            azione: Some("segmentazione".to_string()),
        });
    }

    // --- CLIENTI PERSI ---
    let n_persi = segmentazione.persi.len();
    if n_persi > 0 {
        messaggi.push(InsightMessage {
            tipo: "clienti".to_string(),
            priorita: "media".to_string(),
            titolo: format!("{} client{} pers{}", n_persi, if n_persi == 1 { "e" } else { "i" }, if n_persi == 1 { "o" } else { "i" }),
            messaggio: "Assenti da oltre 120 giorni. Valuta una campagna di riattivazione.".to_string(),
            valore: Some(format!("{}", n_persi)),
            azione: Some("segmentazione".to_string()),
        });
    }

    // --- TASSO DI RITORNO ---
    messaggi.push(InsightMessage {
        tipo: "clienti".to_string(),
        priorita: if segmentazione.tasso_ritorno < 50.0 { "alta".to_string() } else { "bassa".to_string() },
        titolo: format!("Tasso di ritorno: {:.0}%", segmentazione.tasso_ritorno),
        messaggio: if segmentazione.tasso_ritorno >= 70.0 {
            "Ottimo! La maggior parte dei clienti torna.".to_string()
        } else if segmentazione.tasso_ritorno >= 50.0 {
            "Buono, ma c'è margine di miglioramento nella fidelizzazione.".to_string()
        } else {
            "Attenzione: molti clienti non tornano dopo la prima visita.".to_string()
        },
        valore: Some(format!("{:.1}%", segmentazione.tasso_ritorno)),
        azione: None,
    });

    // --- SLOT VUOTI (find weakest day/time) ---
    if !occupazione.is_empty() {
        let giorni_nomi = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
        // Find the weakest working day (Mon-Sat)
        let mut appuntamenti_per_giorno: std::collections::HashMap<i64, i64> = std::collections::HashMap::new();
        for slot in occupazione.iter() {
            *appuntamenti_per_giorno.entry(slot.giorno_settimana).or_insert(0) += slot.totale_appuntamenti;
        }
        // Only consider working days (1-6, Mon-Sat)
        if let Some((&giorno_debole, &count_debole)) = appuntamenti_per_giorno.iter()
            .filter(|(&g, _)| g >= 1 && g <= 6)
            .min_by_key(|(_, &c)| c)
        {
            if let Some((&giorno_forte, &count_forte)) = appuntamenti_per_giorno.iter()
                .filter(|(&g, _)| g >= 1 && g <= 6)
                .max_by_key(|(_, &c)| c)
            {
                if count_forte > 0 {
                    let percentuale = ((count_forte - count_debole) as f64 / count_forte as f64 * 100.0) as i64;
                    if percentuale > 30 {
                        messaggi.push(InsightMessage {
                            tipo: "operativita".to_string(),
                            priorita: "media".to_string(),
                            titolo: format!("Il {} è il giorno più debole", giorni_nomi[giorno_debole as usize]),
                            messaggio: format!(
                                "Ha il {}% in meno di appuntamenti rispetto al {}. Valuta una promozione dedicata.",
                                percentuale, giorni_nomi[giorno_forte as usize]
                            ),
                            valore: Some(format!("-{}%", percentuale)),
                            azione: Some("occupazione".to_string()),
                        });
                    }
                }
            }
        }
    }

    // --- TRATTAMENTO PIÙ REDDITIZIO ---
    if let Some(top) = margini.first() {
        if top.margine > 0.0 {
            messaggi.push(InsightMessage {
                tipo: "revenue".to_string(),
                priorita: "bassa".to_string(),
                titolo: format!("\"{}\" è il più redditizio", top.trattamento_nome),
                messaggio: format!(
                    "Margine del {:.0}% con {} appuntamenti. Genera {:.0}€ di profitto.",
                    top.margine_percentuale, top.totale_appuntamenti, top.margine
                ),
                valore: Some(format!("{:.0}%", top.margine_percentuale)),
                azione: Some("margini".to_string()),
            });
        }
    }

    // --- SCORTE IN ESAURIMENTO ---
    let scorte_critiche: Vec<&ScortaPrevisione> = scorte.iter()
        .filter(|s| s.giorni_rimanenti.map_or(false, |g| g <= 14.0))
        .collect();

    if !scorte_critiche.is_empty() {
        let nomi: Vec<&str> = scorte_critiche.iter().take(3).map(|s| s.prodotto_nome.as_str()).collect();
        messaggi.push(InsightMessage {
            tipo: "magazzino".to_string(),
            priorita: "alta".to_string(),
            titolo: format!("{} prodott{} in esaurimento", scorte_critiche.len(), if scorte_critiche.len() == 1 { "o" } else { "i" }),
            messaggio: format!(
                "{} finiranno entro 2 settimane al ritmo attuale.",
                nomi.join(", ")
            ),
            valore: Some(format!("{}", scorte_critiche.len())),
            azione: Some("scorte".to_string()),
        });
    }

    // --- TREND FATTURATO ---
    if confronto.len() >= 2 {
        let ultimo = &confronto[confronto.len() - 1];
        let penultimo = &confronto[confronto.len() - 2];
        if penultimo.ricavo > 0.0 {
            let variazione = ((ultimo.ricavo - penultimo.ricavo) / penultimo.ricavo) * 100.0;
            if variazione.abs() > 5.0 {
                messaggi.push(InsightMessage {
                    tipo: "revenue".to_string(),
                    priorita: if variazione < -10.0 { "alta".to_string() } else { "bassa".to_string() },
                    titolo: if variazione > 0.0 {
                        format!("Fatturato in crescita: +{:.0}%", variazione)
                    } else {
                        format!("Fatturato in calo: {:.0}%", variazione)
                    },
                    messaggio: format!(
                        "Questo mese {:.0}€ vs {:.0}€ del mese precedente.",
                        ultimo.ricavo, penultimo.ricavo
                    ),
                    valore: Some(format!("{:+.0}%", variazione)),
                    azione: Some("confronto".to_string()),
                });
            }
        }
    }

    // --- NUOVI CLIENTI ---
    let n_nuovi = segmentazione.nuovi.len();
    if n_nuovi > 0 {
        // Check how many of recent new clients have returned
        let nuovi_tornati: usize = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(DISTINCT cliente_id)
            FROM appuntamenti
            WHERE cliente_id IN (
                SELECT cliente_id FROM appuntamenti
                WHERE data_ora_inizio >= datetime('now', '-60 days')
                  AND stato IN ('completato', 'in_corso')
                GROUP BY cliente_id
                HAVING COUNT(*) = 1
            )
            AND data_ora_inizio >= datetime('now', '-60 days')
            AND stato IN ('completato', 'in_corso')
            "#
        )
        .fetch_one(pool)
        .await
        .unwrap_or(0) as usize;

        // This is informational, not critical
        messaggi.push(InsightMessage {
            tipo: "clienti".to_string(),
            priorita: "bassa".to_string(),
            titolo: format!("{} nuov{} client{} recenti", n_nuovi, if n_nuovi == 1 { "o" } else { "i" }, if n_nuovi == 1 { "e" } else { "i" }),
            messaggio: "Clienti con una sola visita negli ultimi 60 giorni. Fidelizzali con un follow-up.".to_string(),
            valore: Some(format!("{}", n_nuovi)),
            azione: Some("segmentazione".to_string()),
        });
    }

    // Sort by priority: alta first, then media, then bassa
    messaggi.sort_by(|a, b| {
        let priority = |p: &str| match p {
            "alta" => 0,
            "media" => 1,
            _ => 2,
        };
        priority(&a.priorita).cmp(&priority(&b.priorita))
    });

    Ok(messaggi)
}
