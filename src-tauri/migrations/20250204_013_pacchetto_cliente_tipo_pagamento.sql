-- Tipo pagamento scelto al momento dell'assegnazione al cliente
ALTER TABLE pacchetti_cliente ADD COLUMN tipo_pagamento TEXT NOT NULL DEFAULT 'anticipo' CHECK(tipo_pagamento IN ('anticipo', 'dilazionato', 'per_seduta'));
