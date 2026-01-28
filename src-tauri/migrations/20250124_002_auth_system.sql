-- Migration: Auth System
-- Description: Aggiunge sistema multi-utente con autenticazione

-- Tabella users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'operatrice', 'reception')),
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    attivo BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indici per users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_attivo ON users(attivo);

-- Trigger per updated_at su users
CREATE TRIGGER IF NOT EXISTS users_updated_at
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Tabella user_settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    theme_mode TEXT NOT NULL DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark', 'auto')),
    primary_color TEXT NOT NULL DEFAULT '#EC4899',
    font_size TEXT NOT NULL DEFAULT 'base' CHECK (font_size IN ('xs', 'sm', 'base', 'lg', 'xl')),
    dashboard_layout TEXT, -- JSON string con layout widgets
    custom_logo_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trigger per updated_at su user_settings
CREATE TRIGGER IF NOT EXISTS user_settings_updated_at
AFTER UPDATE ON user_settings
BEGIN
    UPDATE user_settings SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;

-- Tabella user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indici per user_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

-- Nota: Il primo utente amministratore verrà creato al primo avvio tramite
-- il form di registrazione
