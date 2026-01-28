-- ============================================
-- MODULO INVENTARIO
-- ============================================

-- Sessioni di inventario
CREATE TABLE IF NOT EXISTS inventari (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    codice TEXT UNIQUE NOT NULL,
    descrizione TEXT,
    data_inizio TEXT NOT NULL DEFAULT (datetime('now')),
    data_chiusura TEXT,
    stato TEXT DEFAULT 'in_corso' CHECK (stato IN ('in_corso', 'confermato', 'annullato')),
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Trigger per generare codice inventario (INV-YYYYMMDD-001)
CREATE TRIGGER IF NOT EXISTS trg_inventari_codice
AFTER INSERT ON inventari
WHEN NEW.codice IS NULL OR NEW.codice = ''
BEGIN
    UPDATE inventari
    SET codice = 'INV-' || strftime('%Y%m%d', 'now') || '-' || printf('%03d',
        (SELECT COALESCE(MAX(CAST(substr(codice, -3) AS INTEGER)), 0) + 1
         FROM inventari
         WHERE codice LIKE 'INV-' || strftime('%Y%m%d', 'now') || '-%'))
    WHERE id = NEW.id;
END;

-- Righe/Cartellini inventario
CREATE TABLE IF NOT EXISTS righe_inventario (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    inventario_id TEXT NOT NULL REFERENCES inventari(id) ON DELETE CASCADE,
    prodotto_id TEXT NOT NULL REFERENCES prodotti(id),

    -- Quantità
    giacenza_teorica REAL NOT NULL,      -- Giacenza al momento dell'inserimento
    quantita_contata REAL NOT NULL,      -- Quantità fisica contata
    differenza REAL GENERATED ALWAYS AS (quantita_contata - giacenza_teorica) STORED,

    -- Info aggiuntive
    lotto TEXT,
    data_scadenza TEXT,
    note TEXT,

    -- Timestamp
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Un prodotto può apparire una sola volta per inventario
    UNIQUE(inventario_id, prodotto_id)
);

CREATE INDEX IF NOT EXISTS idx_righe_inventario_inventario ON righe_inventario(inventario_id);
CREATE INDEX IF NOT EXISTS idx_righe_inventario_prodotto ON righe_inventario(prodotto_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER IF NOT EXISTS trg_inventari_updated_at
AFTER UPDATE ON inventari
BEGIN
    UPDATE inventari SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_righe_inventario_updated_at
AFTER UPDATE ON righe_inventario
BEGIN
    UPDATE righe_inventario SET updated_at = datetime('now') WHERE id = NEW.id;
END;
