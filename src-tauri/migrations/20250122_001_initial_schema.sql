-- ============================================
-- BEAUTY MANAGER PRO - Database Schema
-- SQLite (adapted from PostgreSQL)
-- ============================================

-- Nota: SQLite non supporta tutti i tipi PostgreSQL
-- UUID -> TEXT
-- TIMESTAMP WITH TIME ZONE -> TEXT (ISO 8601)
-- ENUM -> TEXT con CHECK constraints
-- ARRAY -> TEXT (JSON serialized)

-- ============================================
-- TABELLE ANAGRAFICHE BASE
-- ============================================

-- Configurazione centro estetico
CREATE TABLE IF NOT EXISTS config_centro (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    nome_centro TEXT NOT NULL,
    indirizzo TEXT,
    citta TEXT,
    cap TEXT,
    provincia TEXT,
    telefono TEXT,
    email TEXT,
    piva TEXT,
    logo BLOB,
    orario_apertura TEXT DEFAULT '09:00',
    orario_chiusura TEXT DEFAULT '19:00',
    slot_durata_minuti INTEGER DEFAULT 15,
    giorni_lavorativi TEXT DEFAULT '[1,2,3,4,5,6]', -- JSON array
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Operatrici/Estetiste
CREATE TABLE IF NOT EXISTS operatrici (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    codice TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    colore_agenda TEXT DEFAULT '#3B82F6',
    specializzazioni TEXT, -- JSON array
    attiva INTEGER DEFAULT 1,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_operatrici_attiva ON operatrici(attiva) WHERE attiva = 1;

-- Cabine/Postazioni
CREATE TABLE IF NOT EXISTS cabine (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    codice TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    descrizione TEXT,
    attrezzature TEXT, -- JSON array
    attiva INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- GESTIONE CLIENTI
-- ============================================

-- Clienti
CREATE TABLE IF NOT EXISTS clienti (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    codice TEXT UNIQUE,

    -- Dati anagrafici
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    sesso TEXT CHECK (sesso IN ('M', 'F', 'A')),
    data_nascita TEXT,
    codice_fiscale TEXT,

    -- Contatti
    telefono TEXT,
    cellulare TEXT,
    email TEXT,

    -- Indirizzo
    indirizzo TEXT,
    citta TEXT,
    cap TEXT,
    provincia TEXT,

    -- Preferenze comunicazione
    consenso_marketing INTEGER DEFAULT 0,
    consenso_sms INTEGER DEFAULT 0,
    consenso_whatsapp INTEGER DEFAULT 0,
    consenso_email INTEGER DEFAULT 0,
    canale_preferito TEXT DEFAULT 'sms' CHECK (canale_preferito IN ('sms', 'whatsapp', 'email', 'telefono')),

    -- Info estetiche/mediche
    tipo_pelle TEXT,
    allergie TEXT,
    patologie TEXT,
    note_estetiche TEXT,
    foto_profilo BLOB,

    -- Metadati
    fonte_acquisizione TEXT,
    operatrice_riferimento_id TEXT REFERENCES operatrici(id),

    -- Privacy
    data_consenso_privacy TEXT,
    data_ultimo_aggiornamento_privacy TEXT,

    -- Stato
    attivo INTEGER DEFAULT 1,
    note TEXT,

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Constraint
    CHECK (cellulare IS NOT NULL OR email IS NOT NULL OR telefono IS NOT NULL)
);

-- Indici per ricerca veloce
CREATE INDEX IF NOT EXISTS idx_clienti_cognome_nome ON clienti(cognome, nome);
CREATE INDEX IF NOT EXISTS idx_clienti_cellulare ON clienti(cellulare);
CREATE INDEX IF NOT EXISTS idx_clienti_email ON clienti(email);

-- Trigger per generare codice cliente
CREATE TRIGGER IF NOT EXISTS trg_clienti_codice
AFTER INSERT ON clienti
WHEN NEW.codice IS NULL
BEGIN
    UPDATE clienti
    SET codice = 'CLI' || printf('%06d', (SELECT COALESCE(MAX(CAST(substr(codice, 4) AS INTEGER)), 999) + 1 FROM clienti WHERE codice LIKE 'CLI%'))
    WHERE id = NEW.id;
END;

-- Trigger per aggiornare updated_at
CREATE TRIGGER IF NOT EXISTS trg_clienti_updated_at
AFTER UPDATE ON clienti
BEGIN
    UPDATE clienti SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================
-- CATALOGO TRATTAMENTI
-- ============================================

-- Categorie trattamenti
CREATE TABLE IF NOT EXISTS categorie_trattamenti (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    codice TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    descrizione TEXT,
    colore TEXT DEFAULT '#10B981',
    icona TEXT,
    ordine INTEGER DEFAULT 0,
    attiva INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Trattamenti/Servizi
CREATE TABLE IF NOT EXISTS trattamenti (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    codice TEXT UNIQUE NOT NULL,
    categoria_id TEXT REFERENCES categorie_trattamenti(id),

    nome TEXT NOT NULL,
    descrizione TEXT,
    descrizione_breve TEXT,

    -- Tempistiche
    durata_minuti INTEGER NOT NULL DEFAULT 30,
    tempo_preparazione_minuti INTEGER DEFAULT 0,
    tempo_pausa_dopo_minuti INTEGER DEFAULT 0,

    -- Pricing
    prezzo_listino REAL,

    -- Requisiti
    richiede_cabina INTEGER DEFAULT 1,
    cabine_compatibili TEXT, -- JSON array di UUID
    attrezzature_richieste TEXT, -- JSON array

    -- Prodotti collegati
    prodotti_standard TEXT, -- JSON [{prodotto_id, quantita}]

    -- Controindicazioni
    controindicazioni TEXT,
    note_operative TEXT,

    -- Stato
    attivo INTEGER DEFAULT 1,
    visibile_booking_online INTEGER DEFAULT 0,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trattamenti_categoria ON trattamenti(categoria_id);
CREATE INDEX IF NOT EXISTS idx_trattamenti_attivo ON trattamenti(attivo) WHERE attivo = 1;

-- Protocolli trattamento
CREATE TABLE IF NOT EXISTS protocolli_trattamento (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    trattamento_id TEXT NOT NULL REFERENCES trattamenti(id) ON DELETE CASCADE,
    step_numero INTEGER NOT NULL,
    descrizione TEXT NOT NULL,
    durata_minuti INTEGER,
    prodotti_usati TEXT, -- JSON
    note TEXT,

    UNIQUE(trattamento_id, step_numero)
);

-- ============================================
-- AGENDA E APPUNTAMENTI
-- ============================================

-- Appuntamenti
CREATE TABLE IF NOT EXISTS appuntamenti (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- Riferimenti
    cliente_id TEXT NOT NULL REFERENCES clienti(id),
    operatrice_id TEXT NOT NULL REFERENCES operatrici(id),
    cabina_id TEXT REFERENCES cabine(id),
    trattamento_id TEXT NOT NULL REFERENCES trattamenti(id),

    -- Temporali
    data_ora_inizio TEXT NOT NULL,
    data_ora_fine TEXT NOT NULL,
    durata_effettiva_minuti INTEGER,

    -- Stato
    stato TEXT DEFAULT 'prenotato' CHECK (stato IN ('prenotato', 'confermato', 'in_corso', 'completato', 'annullato', 'no_show')),

    -- Recall/Reminder
    reminder_inviato INTEGER DEFAULT 0,
    reminder_inviato_at TEXT,
    conferma_ricevuta INTEGER DEFAULT 0,
    conferma_ricevuta_at TEXT,

    -- Note
    note_prenotazione TEXT,
    note_trattamento TEXT,

    -- Ricorrenza
    ricorrenza_parent_id TEXT REFERENCES appuntamenti(id),
    ricorrenza_pattern TEXT,

    -- Metadata
    prenotato_da TEXT DEFAULT 'operatrice',
    prezzo_applicato REAL,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Vincoli
    CHECK (data_ora_fine > data_ora_inizio)
);

-- Indici per query frequenti
CREATE INDEX IF NOT EXISTS idx_appuntamenti_data ON appuntamenti(data_ora_inizio);
CREATE INDEX IF NOT EXISTS idx_appuntamenti_cliente ON appuntamenti(cliente_id);
CREATE INDEX IF NOT EXISTS idx_appuntamenti_operatrice ON appuntamenti(operatrice_id);
CREATE INDEX IF NOT EXISTS idx_appuntamenti_stato ON appuntamenti(stato);
CREATE INDEX IF NOT EXISTS idx_appuntamenti_giorno ON appuntamenti(date(data_ora_inizio));

-- ============================================
-- SCHEDE TRATTAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS schede_trattamento (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    appuntamento_id TEXT REFERENCES appuntamenti(id),
    cliente_id TEXT NOT NULL REFERENCES clienti(id),
    trattamento_id TEXT NOT NULL REFERENCES trattamenti(id),
    operatrice_id TEXT NOT NULL REFERENCES operatrici(id),

    data_trattamento TEXT DEFAULT (datetime('now')),

    -- Dettagli trattamento
    zone_trattate TEXT, -- JSON array
    prodotti_utilizzati TEXT, -- JSON
    parametri_macchina TEXT, -- JSON

    -- Valutazioni
    risultato TEXT,
    reazione_cutanea TEXT,
    foto_prima BLOB,
    foto_dopo BLOB,

    -- Note
    note_trattamento TEXT,
    note_per_prossima_seduta TEXT,

    -- Raccomandazioni
    raccomandazioni_domiciliari TEXT,
    prodotti_consigliati_vendita TEXT, -- JSON array di UUID

    -- Prossimo appuntamento suggerito
    prossimo_trattamento_suggerito_id TEXT REFERENCES trattamenti(id),
    prossimo_trattamento_giorni INTEGER,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_schede_cliente ON schede_trattamento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_schede_data ON schede_trattamento(data_trattamento);

-- ============================================
-- MAGAZZINO
-- ============================================

-- Categorie prodotti
CREATE TABLE IF NOT EXISTS categorie_prodotti (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    codice TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('consumo', 'rivendita', 'entrambi')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Prodotti
CREATE TABLE IF NOT EXISTS prodotti (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    codice TEXT UNIQUE NOT NULL,
    barcode TEXT,
    categoria_id TEXT REFERENCES categorie_prodotti(id),

    nome TEXT NOT NULL,
    descrizione TEXT,
    marca TEXT,
    linea TEXT,

    -- Unità di misura
    unita_misura TEXT DEFAULT 'pz',
    capacita REAL,

    -- Stock
    giacenza REAL DEFAULT 0,
    scorta_minima REAL DEFAULT 0,
    scorta_riordino REAL DEFAULT 0,

    -- Prezzi
    prezzo_acquisto REAL,
    prezzo_vendita REAL,

    -- Uso
    uso TEXT CHECK (uso IN ('interno', 'vendita', 'entrambi')),

    -- Stato
    attivo INTEGER DEFAULT 1,
    data_scadenza TEXT,

    foto BLOB,
    note TEXT,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prodotti_categoria ON prodotti(categoria_id);
CREATE INDEX IF NOT EXISTS idx_prodotti_barcode ON prodotti(barcode);
CREATE INDEX IF NOT EXISTS idx_prodotti_giacenza ON prodotti(giacenza) WHERE giacenza <= scorta_minima;

-- Movimenti magazzino
CREATE TABLE IF NOT EXISTS movimenti_magazzino (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prodotto_id TEXT NOT NULL REFERENCES prodotti(id),

    tipo TEXT NOT NULL CHECK (tipo IN ('carico', 'scarico_uso', 'scarico_vendita', 'reso', 'inventario', 'scarto')),
    quantita REAL NOT NULL,
    giacenza_risultante REAL NOT NULL,

    -- Riferimenti opzionali
    appuntamento_id TEXT REFERENCES appuntamenti(id),
    operatrice_id TEXT REFERENCES operatrici(id),
    cliente_id TEXT REFERENCES clienti(id),

    -- Dettagli carico
    fornitore TEXT,
    documento_riferimento TEXT,
    prezzo_unitario REAL,
    lotto TEXT,
    data_scadenza TEXT,

    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_movimenti_prodotto ON movimenti_magazzino(prodotto_id);
CREATE INDEX IF NOT EXISTS idx_movimenti_data ON movimenti_magazzino(created_at);
CREATE INDEX IF NOT EXISTS idx_movimenti_tipo ON movimenti_magazzino(tipo);

-- Trigger per aggiornare giacenza prodotto
CREATE TRIGGER IF NOT EXISTS trg_update_giacenza
AFTER INSERT ON movimenti_magazzino
BEGIN
    UPDATE prodotti
    SET giacenza = NEW.giacenza_risultante,
        updated_at = datetime('now')
    WHERE id = NEW.prodotto_id;
END;

-- ============================================
-- COMUNICAZIONI
-- ============================================

-- Template messaggi
CREATE TABLE IF NOT EXISTS template_messaggi (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    codice TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('reminder_appuntamento', 'conferma_appuntamento', 'auguri_compleanno', 'promozione', 'recall_periodico', 'recall_churn', 'manuale')),
    canale TEXT NOT NULL CHECK (canale IN ('sms', 'whatsapp', 'email')),

    oggetto TEXT,
    corpo TEXT NOT NULL,

    attivo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Log comunicazioni
CREATE TABLE IF NOT EXISTS comunicazioni (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cliente_id TEXT NOT NULL REFERENCES clienti(id),
    appuntamento_id TEXT REFERENCES appuntamenti(id),
    template_id TEXT REFERENCES template_messaggi(id),

    tipo TEXT NOT NULL CHECK (tipo IN ('reminder_appuntamento', 'conferma_appuntamento', 'auguri_compleanno', 'promozione', 'recall_periodico', 'recall_churn', 'manuale')),
    canale TEXT NOT NULL CHECK (canale IN ('sms', 'whatsapp', 'email')),
    stato TEXT DEFAULT 'in_coda' CHECK (stato IN ('in_coda', 'inviato', 'consegnato', 'letto', 'errore')),

    destinatario TEXT NOT NULL,
    oggetto TEXT,
    messaggio TEXT NOT NULL,

    -- Tracking
    inviato_at TEXT,
    consegnato_at TEXT,
    letto_at TEXT,
    errore_messaggio TEXT,

    -- Provider response
    provider_id TEXT,
    provider_response TEXT, -- JSON

    costo REAL,

    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comunicazioni_cliente ON comunicazioni(cliente_id);
CREATE INDEX IF NOT EXISTS idx_comunicazioni_stato ON comunicazioni(stato);
CREATE INDEX IF NOT EXISTS idx_comunicazioni_tipo ON comunicazioni(tipo);
CREATE INDEX IF NOT EXISTS idx_comunicazioni_data ON comunicazioni(created_at);

-- ============================================
-- CLIENT INTELLIGENCE
-- ============================================

CREATE TABLE IF NOT EXISTS client_intelligence_scores (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cliente_id TEXT NOT NULL REFERENCES clienti(id),
    data_calcolo TEXT NOT NULL DEFAULT (date('now')),

    -- Metriche base
    totale_appuntamenti INTEGER DEFAULT 0,
    totale_completati INTEGER DEFAULT 0,
    totale_no_show INTEGER DEFAULT 0,
    tasso_no_show REAL DEFAULT 0,

    -- Frequenza
    giorni_da_ultimo_appuntamento INTEGER,
    frequenza_media_giorni REAL,
    deviazione_frequenza REAL,

    -- Valore cliente
    valore_totale_storico REAL DEFAULT 0,
    valore_medio_appuntamento REAL DEFAULT 0,

    -- Scores (0-100)
    churn_score INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 100,
    value_score INTEGER DEFAULT 50,

    -- Categoria automatica
    segmento TEXT CHECK (segmento IN ('vip', 'fedele', 'occasionale', 'a_rischio', 'dormiente', 'perso', 'nuovo')),

    -- Raccomandazioni
    azione_suggerita TEXT,
    messaggio_suggerito TEXT,
    trattamento_suggerito_id TEXT REFERENCES trattamenti(id),
    momento_contatto_suggerito TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    UNIQUE(cliente_id, data_calcolo)
);

CREATE INDEX IF NOT EXISTS idx_client_scores_cliente ON client_intelligence_scores(cliente_id);
CREATE INDEX IF NOT EXISTS idx_client_scores_data ON client_intelligence_scores(data_calcolo);
CREATE INDEX IF NOT EXISTS idx_client_scores_churn ON client_intelligence_scores(churn_score DESC);
CREATE INDEX IF NOT EXISTS idx_client_scores_segmento ON client_intelligence_scores(segmento);

-- ============================================
-- TABELLE DI SUPPORTO
-- ============================================

-- Festività/Chiusure
CREATE TABLE IF NOT EXISTS chiusure (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    data_inizio TEXT NOT NULL,
    data_fine TEXT NOT NULL,
    motivo TEXT,
    tipo TEXT CHECK (tipo IN ('festivita', 'ferie', 'straordinaria')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Orari operatrici
CREATE TABLE IF NOT EXISTS orari_operatrici (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    operatrice_id TEXT NOT NULL REFERENCES operatrici(id) ON DELETE CASCADE,
    giorno_settimana INTEGER CHECK (giorno_settimana BETWEEN 1 AND 7),
    ora_inizio TEXT,
    ora_fine TEXT,
    pausa_inizio TEXT,
    pausa_fine TEXT,

    UNIQUE(operatrice_id, giorno_settimana)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tabella TEXT NOT NULL,
    record_id TEXT NOT NULL,
    azione TEXT CHECK (azione IN ('INSERT', 'UPDATE', 'DELETE')),
    dati_precedenti TEXT, -- JSON
    dati_nuovi TEXT, -- JSON
    utente TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_tabella ON audit_log(tabella, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_data ON audit_log(created_at);

-- ============================================
-- DATI INIZIALI
-- ============================================

-- Template messaggi default
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, corpo) VALUES
('REM_APP_SMS', 'Reminder Appuntamento SMS', 'reminder_appuntamento', 'sms',
 'Ciao {nome}! Ti ricordiamo l''appuntamento di domani alle {ora_appuntamento} per {trattamento}. A presto! - {nome_centro}'),

('REM_APP_WA', 'Reminder Appuntamento WhatsApp', 'reminder_appuntamento', 'whatsapp',
 'Ciao {nome}! 👋\n\nTi ricordiamo il tuo appuntamento:\n📅 {data_appuntamento}\n⏰ {ora_appuntamento}\n💆 {trattamento}\n\nA domani!\n{nome_centro}'),

('CONF_APP_SMS', 'Conferma Appuntamento SMS', 'conferma_appuntamento', 'sms',
 'Appuntamento confermato! {data_appuntamento} ore {ora_appuntamento} - {trattamento}. Ti aspettiamo! - {nome_centro}'),

('AUGURI_SMS', 'Auguri Compleanno SMS', 'auguri_compleanno', 'sms',
 'Tanti auguri {nome}! 🎂 Il team di {nome_centro} ti augura uno splendido compleanno! Vieni a trovarci, abbiamo una sorpresa per te!'),

('RECALL_SMS', 'Recall Periodico SMS', 'recall_periodico', 'sms',
 'Ciao {nome}, è da un po'' che non ci vediamo! Ti aspettiamo per coccolarti con i nostri trattamenti. Prenota ora! - {nome_centro}'),

('RECALL_CHURN_SMS', 'Recall Anti-Churn SMS', 'recall_churn', 'sms',
 'Ciao {nome}! Ci manchi! ❤️ Abbiamo pensato a te: torna a trovarci e scopri le nostre novità. Ti aspettiamo! - {nome_centro}');

-- Categorie trattamenti default
INSERT OR IGNORE INTO categorie_trattamenti (codice, nome, colore, icona, ordine) VALUES
('VISO', 'Trattamenti Viso', '#F472B6', 'sparkles', 1),
('CORPO', 'Trattamenti Corpo', '#34D399', 'body', 2),
('EPIL', 'Epilazione', '#FBBF24', 'zap', 3),
('MASSAGGI', 'Massaggi', '#60A5FA', 'hand', 4),
('MANI_PIEDI', 'Mani e Piedi', '#F87171', 'hand', 5),
('MAKEUP', 'Make-up', '#A78BFA', 'palette', 6),
('SOLARIUM', 'Solarium', '#FB923C', 'sun', 7);

-- Categorie prodotti default
INSERT OR IGNORE INTO categorie_prodotti (codice, nome, tipo) VALUES
('CREME', 'Creme e Sieri', 'entrambi'),
('DETERGENTI', 'Detergenti', 'entrambi'),
('MASCHERE', 'Maschere', 'consumo'),
('CERA', 'Cera e Epilazione', 'consumo'),
('MAKEUP', 'Make-up', 'rivendita'),
('MONOUSO', 'Materiale Monouso', 'consumo'),
('ATTREZZATURE', 'Attrezzature', 'consumo');

-- Config centro default
INSERT OR IGNORE INTO config_centro (nome_centro, slot_durata_minuti) VALUES
('Il Mio Centro Estetico', 15);
