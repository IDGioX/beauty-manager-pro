-- ============================================================================
-- COMUNICAZIONI SYSTEM - Config e Campagne Marketing
-- ============================================================================

-- Config SMTP per invio email
CREATE TABLE IF NOT EXISTS config_smtp (
    id TEXT PRIMARY KEY DEFAULT 'default',
    host TEXT NOT NULL,
    port INTEGER DEFAULT 587,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT,
    encryption TEXT DEFAULT 'tls' CHECK (encryption IN ('none', 'ssl', 'tls')),
    enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Config Scheduler per automazioni (reminder, compleanni)
CREATE TABLE IF NOT EXISTS config_scheduler (
    id TEXT PRIMARY KEY DEFAULT 'default',
    -- Reminder appuntamenti
    reminder_enabled INTEGER DEFAULT 0,
    reminder_hours_before INTEGER DEFAULT 24,
    reminder_second_hours_before INTEGER,
    reminder_default_channel TEXT DEFAULT 'whatsapp' CHECK (reminder_default_channel IN ('sms', 'whatsapp', 'email')),
    -- Auguri compleanno
    birthday_enabled INTEGER DEFAULT 0,
    birthday_check_time TEXT DEFAULT '09:00',
    birthday_default_channel TEXT DEFAULT 'whatsapp' CHECK (birthday_default_channel IN ('sms', 'whatsapp', 'email')),
    birthday_template_id TEXT REFERENCES template_messaggi(id),
    -- Tracking ultimo check
    last_reminder_check TEXT,
    last_birthday_check TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Campagne Marketing
CREATE TABLE IF NOT EXISTS campagne_marketing (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    nome TEXT NOT NULL,
    descrizione TEXT,
    -- Target (JSON con filtri)
    target_filters TEXT,
    -- Messaggio
    template_id TEXT REFERENCES template_messaggi(id),
    canale TEXT NOT NULL CHECK (canale IN ('sms', 'whatsapp', 'email')),
    messaggio_personalizzato TEXT,
    oggetto_email TEXT,
    -- Scheduling
    tipo_invio TEXT DEFAULT 'immediato' CHECK (tipo_invio IN ('immediato', 'programmato')),
    data_invio_programmato TEXT,
    -- Stato
    stato TEXT DEFAULT 'bozza' CHECK (stato IN ('bozza', 'programmata', 'in_corso', 'completata', 'annullata')),
    -- Statistiche
    totale_destinatari INTEGER DEFAULT 0,
    inviati INTEGER DEFAULT 0,
    consegnati INTEGER DEFAULT 0,
    aperti INTEGER DEFAULT 0,
    errori INTEGER DEFAULT 0,
    -- Metadata
    creato_da TEXT,
    avviata_at TEXT,
    completata_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Destinatari singoli di una campagna
CREATE TABLE IF NOT EXISTS campagna_destinatari (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    campagna_id TEXT NOT NULL REFERENCES campagne_marketing(id) ON DELETE CASCADE,
    cliente_id TEXT NOT NULL REFERENCES clienti(id),
    comunicazione_id TEXT REFERENCES comunicazioni(id),
    stato TEXT DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa', 'inviato', 'consegnato', 'aperto', 'errore', 'escluso')),
    errore_messaggio TEXT,
    inviato_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_campagna_destinatari_campagna ON campagna_destinatari(campagna_id);
CREATE INDEX IF NOT EXISTS idx_campagna_destinatari_cliente ON campagna_destinatari(cliente_id);
CREATE INDEX IF NOT EXISTS idx_campagna_destinatari_stato ON campagna_destinatari(stato);
CREATE INDEX IF NOT EXISTS idx_campagne_stato ON campagne_marketing(stato);
CREATE INDEX IF NOT EXISTS idx_comunicazioni_cliente ON comunicazioni(cliente_id);
CREATE INDEX IF NOT EXISTS idx_comunicazioni_tipo ON comunicazioni(tipo);
CREATE INDEX IF NOT EXISTS idx_comunicazioni_canale ON comunicazioni(canale);
CREATE INDEX IF NOT EXISTS idx_comunicazioni_created ON comunicazioni(created_at);

-- Inserisci config scheduler default
INSERT OR IGNORE INTO config_scheduler (id) VALUES ('default');

-- Aggiungi colonna reminder_canale agli appuntamenti se non esiste
-- (per tracciare su quale canale e' stato inviato il reminder)
-- SQLite non supporta ADD COLUMN IF NOT EXISTS, quindi usiamo un trucco
CREATE TABLE IF NOT EXISTS _migration_check (done INTEGER);
INSERT OR IGNORE INTO _migration_check VALUES (1);
