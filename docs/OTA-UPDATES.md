# Sistema Aggiornamenti OTA - Beauty Manager Pro

## Panoramica

Il sistema di aggiornamenti OTA (Over-The-Air) permette di distribuire automaticamente nuove versioni dell'applicazione ai clienti. Quando viene rilasciata una nuova versione, gli utenti riceveranno una notifica all'interno dell'app e potranno aggiornare con un click.

---

## Configurazione Attuale

### Repository GitHub
- **URL:** https://github.com/IDGioX/beauty-manager-pro
- **Visibilità:** Privato
- **Branch principale:** main

### Chiavi di Firma
Le chiavi di firma Tauri sono necessarie per garantire che gli aggiornamenti siano autentici e non manomessi.

- **Chiave privata:** `~/.tauri/beauty-manager-pro.key`
- **Chiave pubblica:** `~/.tauri/beauty-manager-pro.key.pub`

> **IMPORTANTE:** Non perdere mai la chiave privata! Senza di essa non potrai firmare nuovi aggiornamenti.

### GitHub Secrets Configurati
I seguenti secrets sono stati configurati nel repository GitHub:

| Secret | Descrizione |
|--------|-------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Chiave privata per firmare gli aggiornamenti |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password della chiave (vuota nel nostro caso) |

### Endpoint Aggiornamenti
L'app cerca aggiornamenti a questo indirizzo:
```
https://github.com/IDGioX/beauty-manager-pro/releases/latest/download/latest.json
```

---

## Come Rilasciare una Nuova Versione

### Passo 1: Aggiorna il Numero di Versione

Modifica il file `src-tauri/tauri.conf.json`:

```json
{
  "version": "0.2.0"  // Cambia da "0.1.0" a "0.2.0" (o la versione desiderata)
}
```

### Passo 2: Commit delle Modifiche

```bash
cd "/Users/giovanni/Apps/Beauty Manager/beauty-manager-pro"
git add src-tauri/tauri.conf.json
git commit -m "Bump version to 0.2.0"
```

### Passo 3: Crea un Tag

Il tag deve iniziare con `v` seguito dal numero di versione:

```bash
git tag v0.2.0
```

### Passo 4: Push del Tag

```bash
git push origin main
git push origin v0.2.0
```

### Passo 5: Attendi la Build Automatica

GitHub Actions avvierà automaticamente la build. Puoi monitorare il progresso su:
https://github.com/IDGioX/beauty-manager-pro/actions

La build creerà:
- `Beauty.Manager.Pro_0.2.0_aarch64.dmg` - macOS Apple Silicon (M1/M2/M3)
- `Beauty.Manager.Pro_0.2.0_x64.dmg` - macOS Intel
- `Beauty.Manager.Pro_0.2.0_x64-setup.exe` - Windows
- `latest.json` - File manifest per l'updater

### Passo 6: Pubblica la Release

1. Vai su https://github.com/IDGioX/beauty-manager-pro/releases
2. Troverai una release in stato **Draft**
3. Clicca su "Edit" (modifica)
4. Aggiungi note di rilascio se desideri
5. Clicca su **"Publish release"**

> **Nota:** La release deve essere pubblicata affinché gli utenti possano ricevere l'aggiornamento!

---

## Come Funziona per gli Utenti

### Controllo Aggiornamenti
Gli utenti possono controllare gli aggiornamenti da:
**Impostazioni → Aggiornamenti → Controlla Aggiornamenti**

### Flusso di Aggiornamento
1. L'app controlla se esiste una versione più recente
2. Se disponibile, mostra le note di rilascio
3. L'utente clicca "Scarica Aggiornamento"
4. Al termine del download, clicca "Installa e Riavvia"
5. L'app si riavvia con la nuova versione

---

## Struttura dei File

### Workflow GitHub Actions
File: `.github/workflows/release.yml`

Questo workflow:
- Si attiva quando viene pushato un tag `v*`
- Compila l'app per macOS (ARM e Intel) e Windows
- Firma gli installer con la chiave privata
- Crea una release draft su GitHub

### Configurazione Updater
File: `src-tauri/tauri.conf.json`

```json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "endpoints": [
        "https://github.com/IDGioX/beauty-manager-pro/releases/latest/download/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

### Permessi Tauri
File: `src-tauri/capabilities/default.json`

Permessi necessari:
- `updater:default`
- `updater:allow-check`
- `updater:allow-download-and-install`
- `process:allow-restart`
- `process:allow-exit`

### Service Frontend
File: `src/services/updater.ts`

Funzioni disponibili:
- `getCurrentVersion()` - Ottiene la versione corrente
- `checkForUpdates()` - Controlla se ci sono aggiornamenti
- `downloadAndInstall()` - Scarica e installa l'aggiornamento
- `restartApp()` - Riavvia l'applicazione

---

## Comandi Rapidi

### Rilascio Completo (copia e incolla)
```bash
cd "/Users/giovanni/Apps/Beauty Manager/beauty-manager-pro"

# Sostituisci X.Y.Z con la nuova versione
VERSION="0.2.0"

# Commit e tag
git add -A
git commit -m "Release v$VERSION"
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"
```

### Verifica Secrets GitHub
```bash
gh secret list --repo IDGioX/beauty-manager-pro
```

### Visualizza Release
```bash
gh release list --repo IDGioX/beauty-manager-pro
```

### Pubblica Release da CLI
```bash
gh release edit v0.2.0 --draft=false --repo IDGioX/beauty-manager-pro
```

---

## Troubleshooting

### La build fallisce
1. Controlla i log su GitHub Actions
2. Verifica che i secrets siano configurati correttamente
3. Assicurati che il tag segua il formato `vX.Y.Z`

### Gli utenti non vedono l'aggiornamento
1. Verifica che la release sia **pubblicata** (non draft)
2. Controlla che il file `latest.json` sia presente nella release
3. Verifica che la versione nel tag corrisponda a quella in `tauri.conf.json`

### Errore di firma
1. Verifica che `TAURI_SIGNING_PRIVATE_KEY` sia configurato nei secrets
2. La chiave deve essere il contenuto completo del file `.key`

### Backup della Chiave Privata
Fai sempre un backup sicuro della chiave privata:
```bash
cp ~/.tauri/beauty-manager-pro.key /percorso/sicuro/backup/
```

---

## Versionamento Semantico

Usa il versionamento semantico (SemVer):
- **MAJOR.MINOR.PATCH** (es: 1.2.3)
- **MAJOR:** Cambiamenti incompatibili con versioni precedenti
- **MINOR:** Nuove funzionalità retrocompatibili
- **PATCH:** Bug fix retrocompatibili

Esempi:
- `0.1.0` → `0.1.1` (bug fix)
- `0.1.1` → `0.2.0` (nuova funzionalità)
- `0.9.0` → `1.0.0` (prima release stabile)

---

## Contatti e Risorse

- **Repository:** https://github.com/IDGioX/beauty-manager-pro
- **Actions:** https://github.com/IDGioX/beauty-manager-pro/actions
- **Releases:** https://github.com/IDGioX/beauty-manager-pro/releases
- **Documentazione Tauri Updater:** https://v2.tauri.app/plugin/updater/
