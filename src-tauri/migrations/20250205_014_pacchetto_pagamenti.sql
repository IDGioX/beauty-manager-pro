-- Storico pagamenti pacchetto (per anticipo e dilazionato)
CREATE TABLE IF NOT EXISTS pacchetto_pagamenti (
    id TEXT PRIMARY KEY NOT NULL,
    pacchetto_cliente_id TEXT NOT NULL REFERENCES pacchetti_cliente(id) ON DELETE CASCADE,
    importo REAL NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'pagamento' CHECK(tipo IN ('anticipo', 'pagamento', 'saldo')),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pacchetto_pagamenti_pacchetto ON pacchetto_pagamenti(pacchetto_cliente_id);
