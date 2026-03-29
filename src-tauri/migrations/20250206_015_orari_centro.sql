-- Orari settimanali del centro (mattina/pomeriggio per ogni giorno)
CREATE TABLE IF NOT EXISTS orari_centro (
    id TEXT PRIMARY KEY NOT NULL,
    giorno INTEGER NOT NULL CHECK(giorno BETWEEN 0 AND 6),
    attivo INTEGER NOT NULL DEFAULT 1,
    mattina_inizio TEXT,
    mattina_fine TEXT,
    pomeriggio_inizio TEXT,
    pomeriggio_fine TEXT,
    UNIQUE(giorno)
);

-- Inserisci default: Lun-Sab 09:00-13:00 / 14:00-19:00, Dom chiuso
INSERT OR IGNORE INTO orari_centro (id, giorno, attivo, mattina_inizio, mattina_fine, pomeriggio_inizio, pomeriggio_fine) VALUES
    (lower(hex(randomblob(16))), 0, 1, '09:00', '13:00', '14:00', '19:00'),
    (lower(hex(randomblob(16))), 1, 1, '09:00', '13:00', '14:00', '19:00'),
    (lower(hex(randomblob(16))), 2, 1, '09:00', '13:00', '14:00', '19:00'),
    (lower(hex(randomblob(16))), 3, 1, '09:00', '13:00', '14:00', '19:00'),
    (lower(hex(randomblob(16))), 4, 1, '09:00', '13:00', '14:00', '19:00'),
    (lower(hex(randomblob(16))), 5, 1, '09:00', '13:00', '14:00', '19:00'),
    (lower(hex(randomblob(16))), 6, 0, NULL, NULL, NULL, NULL);
