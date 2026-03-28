-- Aggiunge campo omaggio agli appuntamenti
ALTER TABLE appuntamenti ADD COLUMN omaggio INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- PACCHETTI TRATTAMENTI
-- ============================================

-- Definizione pacchetto (template)
CREATE TABLE IF NOT EXISTS pacchetti_trattamenti (
    id TEXT PRIMARY KEY NOT NULL,
    nome TEXT NOT NULL,
    descrizione TEXT,
    prezzo_totale REAL NOT NULL DEFAULT 0.0,
    num_sedute INTEGER NOT NULL DEFAULT 1,
    tipo_pagamento TEXT NOT NULL DEFAULT 'anticipo' CHECK(tipo_pagamento IN ('anticipo', 'dilazionato', 'per_seduta')),
    attivo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trattamenti inclusi nel pacchetto (quali servizi comprende ogni seduta)
CREATE TABLE IF NOT EXISTS pacchetto_trattamenti_inclusi (
    id TEXT PRIMARY KEY NOT NULL,
    pacchetto_id TEXT NOT NULL REFERENCES pacchetti_trattamenti(id) ON DELETE CASCADE,
    trattamento_id TEXT NOT NULL REFERENCES trattamenti(id),
    ordine INTEGER NOT NULL DEFAULT 0,
    note TEXT
);

-- Pacchetto acquistato da un cliente
CREATE TABLE IF NOT EXISTS pacchetti_cliente (
    id TEXT PRIMARY KEY NOT NULL,
    pacchetto_id TEXT NOT NULL REFERENCES pacchetti_trattamenti(id),
    cliente_id TEXT NOT NULL REFERENCES clienti(id),
    data_inizio TEXT NOT NULL DEFAULT (datetime('now')),
    data_fine TEXT,
    sedute_totali INTEGER NOT NULL DEFAULT 1,
    sedute_completate INTEGER NOT NULL DEFAULT 0,
    importo_totale REAL NOT NULL DEFAULT 0.0,
    importo_pagato REAL NOT NULL DEFAULT 0.0,
    stato TEXT NOT NULL DEFAULT 'attivo' CHECK(stato IN ('attivo', 'completato', 'sospeso', 'annullato')),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Collegamento appuntamento <-> pacchetto cliente (per tracciare quale seduta)
CREATE TABLE IF NOT EXISTS pacchetto_sedute (
    id TEXT PRIMARY KEY NOT NULL,
    pacchetto_cliente_id TEXT NOT NULL REFERENCES pacchetti_cliente(id) ON DELETE CASCADE,
    appuntamento_id TEXT REFERENCES appuntamenti(id),
    numero_seduta INTEGER NOT NULL,
    stato TEXT NOT NULL DEFAULT 'pianificata' CHECK(stato IN ('pianificata', 'completata', 'saltata')),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pacchetti_cliente_cliente ON pacchetti_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pacchetti_cliente_stato ON pacchetti_cliente(stato);
CREATE INDEX IF NOT EXISTS idx_pacchetto_sedute_pacchetto ON pacchetto_sedute(pacchetto_cliente_id);
CREATE INDEX IF NOT EXISTS idx_pacchetto_sedute_appuntamento ON pacchetto_sedute(appuntamento_id);
CREATE INDEX IF NOT EXISTS idx_pacchetto_trattamenti_inclusi_pacchetto ON pacchetto_trattamenti_inclusi(pacchetto_id);
