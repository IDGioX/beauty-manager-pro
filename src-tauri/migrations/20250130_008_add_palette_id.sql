-- Migration: Add palette_id to user_settings
-- Description: Aggiunge supporto per la persistenza della palette colori

-- Aggiungi colonna palette_id alla tabella user_settings
ALTER TABLE user_settings ADD COLUMN palette_id TEXT DEFAULT 'coral-beauty';
