-- Aggiunge importo_pagato per seduta, per tracciare pagamenti per singola seduta
ALTER TABLE pacchetto_sedute ADD COLUMN importo_pagato REAL NOT NULL DEFAULT 0.0;
