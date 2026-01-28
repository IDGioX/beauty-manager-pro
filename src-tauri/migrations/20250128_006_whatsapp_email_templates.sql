-- ============================================================================
-- WHATSAPP & EMAIL TEMPLATES - Add default templates for WhatsApp and Email
-- ============================================================================

-- Reminder Appuntamento Email
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, oggetto, corpo) VALUES
('REM_APP_EMAIL', 'Reminder Appuntamento Email', 'reminder_appuntamento', 'email',
 'Promemoria appuntamento - {nome_centro}',
 'Gentile {nome} {cognome},

ti ricordiamo il tuo appuntamento:

📅 Data: {data_appuntamento}
⏰ Ora: {ora_appuntamento}
💆 Trattamento: {trattamento}

Ti aspettiamo!

Cordiali saluti,
{nome_centro}');

-- Auguri Compleanno WhatsApp
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, corpo) VALUES
('AUGURI_WA', 'Auguri Compleanno WhatsApp', 'auguri_compleanno', 'whatsapp',
 'Tanti auguri {nome}! 🎂🎉

Il team di {nome_centro} ti augura uno splendido compleanno!

Vieni a trovarci, abbiamo una sorpresa per te! 🎁

A presto! ❤️');

-- Auguri Compleanno Email
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, oggetto, corpo) VALUES
('AUGURI_EMAIL', 'Auguri Compleanno Email', 'auguri_compleanno', 'email',
 'Tanti auguri {nome}! 🎂 - {nome_centro}',
 'Caro/a {nome},

buon compleanno! 🎂🎉

Tutto il team di {nome_centro} ti augura una giornata speciale e piena di sorrisi!

Come regalo di compleanno, ti aspettiamo in centro per una sorpresa speciale!

A presto,
{nome_centro}');

-- Conferma Appuntamento WhatsApp
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, corpo) VALUES
('CONF_APP_WA', 'Conferma Appuntamento WhatsApp', 'conferma_appuntamento', 'whatsapp',
 'Perfetto {nome}! ✅

Il tuo appuntamento è confermato:

📅 {data_appuntamento}
⏰ {ora_appuntamento}
💆 {trattamento}

Ti aspettiamo!
{nome_centro}');

-- Conferma Appuntamento Email
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, oggetto, corpo) VALUES
('CONF_APP_EMAIL', 'Conferma Appuntamento Email', 'conferma_appuntamento', 'email',
 'Conferma appuntamento - {nome_centro}',
 'Gentile {nome} {cognome},

ti confermiamo il tuo appuntamento:

📅 Data: {data_appuntamento}
⏰ Ora: {ora_appuntamento}
💆 Trattamento: {trattamento}

Ti aspettiamo!

Cordiali saluti,
{nome_centro}');

-- Recall Periodico WhatsApp
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, corpo) VALUES
('RECALL_WA', 'Recall Periodico WhatsApp', 'recall_periodico', 'whatsapp',
 'Ciao {nome}! 👋

È da un po'' che non ci vediamo...ci manchi!

Ti aspettiamo per coccolarti con i nostri trattamenti ✨

Prenota ora e torna a splendere! 💆‍♀️

{nome_centro}');

-- Recall Periodico Email
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, oggetto, corpo) VALUES
('RECALL_EMAIL', 'Recall Periodico Email', 'recall_periodico', 'email',
 'Ci manchi! - {nome_centro}',
 'Caro/a {nome},

è da un po'' che non ci vediamo e ci manchi molto!

Ti aspettiamo per coccolarti con i nostri trattamenti e farti tornare a splendere.

Prenota il tuo prossimo appuntamento!

A presto,
{nome_centro}');

-- Promozione WhatsApp
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, corpo) VALUES
('PROMO_WA', 'Promozione WhatsApp', 'promozione', 'whatsapp',
 'Ciao {nome}! 🌟

Abbiamo una promozione speciale per te!

Non perdere questa occasione unica! 💝

Contattaci per maggiori informazioni o prenota subito!

{nome_centro}');

-- Promozione Email
INSERT OR IGNORE INTO template_messaggi (codice, nome, tipo, canale, oggetto, corpo) VALUES
('PROMO_EMAIL', 'Promozione Email', 'promozione', 'email',
 'Offerta speciale per te! - {nome_centro}',
 'Caro/a {nome},

abbiamo una promozione speciale pensata proprio per te!

Non perdere questa occasione unica!

Contattaci per maggiori informazioni o prenota subito il tuo appuntamento.

Ti aspettiamo!

{nome_centro}');
