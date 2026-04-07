-- Multi-trattamenti per appuntamento (junction table)
CREATE TABLE IF NOT EXISTS appuntamento_trattamenti (
    id TEXT PRIMARY KEY NOT NULL,
    appuntamento_id TEXT NOT NULL REFERENCES appuntamenti(id) ON DELETE CASCADE,
    trattamento_id TEXT NOT NULL REFERENCES trattamenti(id) ON DELETE RESTRICT,
    ordine INTEGER NOT NULL DEFAULT 0,
    UNIQUE(appuntamento_id, trattamento_id)
);
CREATE INDEX IF NOT EXISTS idx_app_tratt_app ON appuntamento_trattamenti(appuntamento_id);
CREATE INDEX IF NOT EXISTS idx_app_tratt_trat ON appuntamento_trattamenti(trattamento_id);

-- Migra dati esistenti: copia il trattamento_id attuale nella junction table
INSERT OR IGNORE INTO appuntamento_trattamenti (id, appuntamento_id, trattamento_id, ordine)
SELECT lower(hex(randomblob(16))), id, trattamento_id, 0
FROM appuntamenti WHERE trattamento_id IS NOT NULL AND trattamento_id != '';
