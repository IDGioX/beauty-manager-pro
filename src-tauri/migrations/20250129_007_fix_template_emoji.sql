-- Fix template WhatsApp con emoji corrotti
-- Aggiorna i template esistenti con testo pulito

UPDATE template_messaggi
SET corpo = 'Ciao {nome}!

Ti ricordiamo il tuo appuntamento:
- Data: {data_appuntamento}
- Ora: {ora_appuntamento}
- Trattamento: {trattamento}

Ti aspettiamo!
{nome_centro}'
WHERE codice = 'REM_APP_WA';

UPDATE template_messaggi
SET corpo = 'Tanti auguri {nome}!

Il team di {nome_centro} ti augura uno splendido compleanno!

Vieni a trovarci, abbiamo una sorpresa per te!

A presto!'
WHERE codice = 'AUGURI_WA';

UPDATE template_messaggi
SET corpo = 'Perfetto {nome}!

Il tuo appuntamento e'' confermato:
- Data: {data_appuntamento}
- Ora: {ora_appuntamento}
- Trattamento: {trattamento}

Ti aspettiamo!
{nome_centro}'
WHERE codice = 'CONF_APP_WA';

UPDATE template_messaggi
SET corpo = 'Ciao {nome}!

E'' da un po'' che non ci vediamo... ci manchi!

Ti aspettiamo per coccolarti con i nostri trattamenti.

Prenota ora e torna a splendere!

{nome_centro}'
WHERE codice = 'RECALL_WA';

UPDATE template_messaggi
SET corpo = 'Ciao {nome}!

Abbiamo una promozione speciale per te!

Non perdere questa occasione unica!

Contattaci per maggiori informazioni o prenota subito!

{nome_centro}'
WHERE codice = 'PROMO_WA';
