-- Migration: License System (Offline)
-- Created: 2026-01-24

-- Tabella per memorizzare la licenza attiva
CREATE TABLE IF NOT EXISTS license (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- Dati licenza
    license_key TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    customer_email TEXT,

    -- Tipo e stato
    license_type TEXT NOT NULL CHECK(license_type IN ('trial', 'monthly', 'annual', 'lifetime', 'custom')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'revoked')),

    -- Date
    issued_at TEXT NOT NULL,
    activated_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT, -- NULL per lifetime

    -- Hardware binding (optional - can be NULL for transferable licenses)
    hardware_id TEXT,

    -- Metadata
    features TEXT, -- JSON array of enabled features
    notes TEXT,

    -- Signature validation
    signature TEXT NOT NULL, -- Digital signature of license data

    -- Audit
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_license_key ON license(license_key);
CREATE INDEX IF NOT EXISTS idx_license_status ON license(status);

-- Trigger per updated_at
CREATE TRIGGER IF NOT EXISTS license_updated_at
AFTER UPDATE ON license
FOR EACH ROW
BEGIN
    UPDATE license SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Log validazioni (per audit)
CREATE TABLE IF NOT EXISTS license_validation_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    license_id TEXT REFERENCES license(id) ON DELETE CASCADE,

    -- Esito
    success INTEGER NOT NULL DEFAULT 1, -- 0 = failed, 1 = success
    error_message TEXT,

    -- Context
    validated_at TEXT NOT NULL DEFAULT (datetime('now')),
    app_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_validation_log_license ON license_validation_log(license_id);
CREATE INDEX IF NOT EXISTS idx_validation_log_date ON license_validation_log(validated_at);
