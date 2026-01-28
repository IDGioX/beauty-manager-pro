# Beauty Manager Pro

Gestionale completo per centri estetici, spa e saloni di bellezza.

## Tecnologie

- **Frontend:** React 18 + TypeScript + TailwindCSS + Zustand
- **Backend:** Tauri 2 + Rust
- **Database:** SQLite (embedded)
- **Build:** Vite

## Prerequisiti

- Node.js 20+
- Rust 1.75+
- npm o pnpm

## Installazione

```bash
# Installa dipendenze
npm install

# Sviluppo
npm run tauri dev

# Build produzione
npm run tauri build
```

## Build e Installer

Il comando `npm run tauri build` genera automaticamente:

- **macOS:** `.dmg` e `.app` bundle in `src-tauri/target/release/bundle/dmg/`
- **Windows:** `.msi` e `.exe` installer in `src-tauri/target/release/bundle/msi/`
- **Linux:** `.deb`, `.AppImage` in `src-tauri/target/release/bundle/`

## Struttura Progetto

```
beauty-manager-pro/
├── src/                        # Frontend React
│   ├── components/            # Componenti UI
│   ├── pages/                 # Pagine/Views
│   ├── hooks/                 # Custom hooks
│   ├── stores/                # Zustand stores
│   └── types/                 # TypeScript types
│
├── src-tauri/                 # Backend Rust
│   ├── src/
│   │   ├── commands/         # Tauri commands (API)
│   │   ├── models/           # Database models
│   │   ├── services/         # Business logic
│   │   └── db/               # Database layer
│   └── migrations/           # SQL migrations
```

## Database

Il database SQLite viene creato automaticamente al primo avvio in:
- **Dev:** `./beauty_manager.db`
- **Prod:** Directory dati dell'applicazione

Le migrations vengono eseguite automaticamente all'avvio.

## Funzionalità Principali

- ✅ Dashboard con metriche real-time
- 🚧 Gestione clienti con storico completo
- 🚧 Agenda appuntamenti multi-operatrice
- 🚧 Catalogo trattamenti e servizi
- 🚧 Magazzino prodotti con alert
- 🚧 Comunicazioni SMS/WhatsApp
- 🚧 Analytics e churn prediction (AI)

## Sviluppo

### Comandi utili

```bash
# Dev mode con hot reload
npm run tauri dev

# Build backend Rust
cd src-tauri && cargo build

# Check errori Rust
cd src-tauri && cargo check

# Formato codice
npm run format
cd src-tauri && cargo fmt
```

### Testing

```bash
# Test frontend
npm test

# Test backend
cd src-tauri && cargo test
```

## Deployment

Per distribuire l'applicazione al cliente:

1. Build produzione: `npm run tauri build`
2. Trovare l'installer in `src-tauri/target/release/bundle/`
3. Distribuire l'installer appropriato per il sistema operativo

### macOS
- File `.dmg` - Installer grafico drag & drop
- Richiede firma digitale per distribuzione esterna (opzionale)

### Windows
- File `.msi` - Installer standard Windows
- File `.exe` - Setup classico
- Può richiedere firma digitale per evitare warning

### Linux
- File `.deb` - Per distribuzioni Debian/Ubuntu
- File `.AppImage` - Portatile, funziona ovunque

## License

Proprietario - Beauty Manager Pro © 2025
