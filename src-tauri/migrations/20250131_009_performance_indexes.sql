-- ============================================================================
-- Migration 009: Performance indexes
-- Adds composite indexes for frequently used query patterns
-- ============================================================================

-- Appuntamenti: conflict checking (operatrice + date range + stato)
-- Used by: check_conflitti_appuntamento() — called on every new appointment
CREATE INDEX IF NOT EXISTS idx_appuntamenti_operatrice_data_stato
ON appuntamenti(operatrice_id, data_ora_inizio, stato);

-- Appuntamenti: day view with status filter
CREATE INDEX IF NOT EXISTS idx_appuntamenti_data_stato
ON appuntamenti(data_ora_inizio, stato);

-- Clienti: active filter (used on every list load)
CREATE INDEX IF NOT EXISTS idx_clienti_attivo
ON clienti(attivo) WHERE attivo = 1;

-- Prodotti: active filter (used on every product list load)
CREATE INDEX IF NOT EXISTS idx_prodotti_attivo
ON prodotti(attivo) WHERE attivo = 1;

-- Movimenti: composite for filtered queries (tipo + data)
CREATE INDEX IF NOT EXISTS idx_movimenti_tipo_data
ON movimenti_magazzino(tipo, created_at);

-- Movimenti: operatrice filter
CREATE INDEX IF NOT EXISTS idx_movimenti_operatrice
ON movimenti_magazzino(operatrice_id) WHERE operatrice_id IS NOT NULL;

-- Movimenti: cliente filter
CREATE INDEX IF NOT EXISTS idx_movimenti_cliente
ON movimenti_magazzino(cliente_id) WHERE cliente_id IS NOT NULL;
