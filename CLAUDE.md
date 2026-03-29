# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Run the app in dev mode (Vite + Tauri)
npm run tauri dev

# Build production release
npm run tauri build

# TypeScript type-check only (no emit)
npx tsc --noEmit

# Rust check only (no build)
cd src-tauri && cargo check

# Trigger GitHub Actions build (Windows + macOS)
gh workflow run Release --ref main
```

## Architecture

**Tauri 2 desktop app**: React 19 frontend + Rust backend + SQLite (via sqlx 0.8).

### Frontend → Backend Flow

```
React Component → Service (src/services/*.ts)
  → invoke('command_name', { params })    # @tauri-apps/api/core
  → #[tauri::command] fn (src-tauri/src/commands/*.rs)
  → sqlx query → SQLite
  → Result<T, AppError> serialized as JSON
```

### Navigation

No React Router. `App.tsx` manages `currentPage` state with a `PageType` union type. Pages are lazy-loaded via `React.lazy()`. Cross-component navigation uses custom `navigateToPage` events.

### State Management

Zustand stores in `src/stores/`: authStore, agendaStore, dashboardStore, themeStore, toastStore. Each is independent — no shared state between stores.

### App Startup Guard Chain

```
App.tsx → LicenseGuard → ThemeProvider → AuthGuard → MainLayout → Page
```

AuthGuard checks `check_users_exist()`: if no users → FirstUserRegistration; if users but no session → Login; if authenticated → app.

## Key Conventions

### Rust Commands Pattern

```rust
#[tauri::command]
pub async fn command_name(
    db: tauri::State<'_, Arc<Mutex<crate::AppState>>>,
    param: Type,
) -> AppResult<ReturnType> {
    let state = db.lock().await;
    sqlx::query_as::<_, Model>("SELECT ... WHERE col = ?1")
        .bind(&param)
        .fetch_all(&state.db.pool)
        .await?
}
```

- All commands return `AppResult<T>` (defined in `src-tauri/src/error.rs`)
- Commands registered in `src-tauri/src/lib.rs` via `tauri::generate_handler![]`
- SQLite placeholder syntax: `?1`, `?2`, etc.
- For long-running operations (backup restore), clone the pool and release the mutex immediately to avoid deadlocks:
  ```rust
  let pool = { db.lock().await.db.pool.clone() };
  ```

### Date Handling (Critical)

SQLite cannot parse ISO dates with milliseconds or timezone offsets. Frontend `.toISOString()` produces `2026-03-01T00:00:00.000Z` which breaks `datetime()`.

**Always** use `normalize_date()` (defined in `src-tauri/src/commands/analytics.rs`) when binding date strings from the frontend to SQLite queries. This converts any ISO format to `YYYY-MM-DD HH:MM:SS`.

Input filter structs (`DateRangeFilter`, `ReportFiltrato`) use `String` (not `DateTime<Utc>`) for this reason. Output model fields that come FROM SQLite can safely use `DateTime<Utc>`.

### SQL NULL Safety

Always wrap aggregate functions with `COALESCE`:
```sql
COALESCE(SUM(CASE WHEN stato = 'completato' THEN 1 ELSE 0 END), 0)
```
Without COALESCE, `SUM()` returns NULL when no rows match, which panics on `i64` deserialization.

### Revenue Queries Must Include Packages

All revenue/fatturato queries must sum BOTH appointment revenue AND package payments:
- Appointments: `SUM(prezzo_applicato)` from `appuntamenti` WHERE `stato IN ('completato', 'in_corso')` AND `(omaggio IS NULL OR omaggio = 0)`
- Package payments: `SUM(pp.importo)` from `pacchetto_pagamenti pp JOIN pacchetti_cliente pc` WHERE `pc.stato != 'annullato'`

### Frontend Service Pattern

```typescript
export const fooService = {
  async getItems(search?: string): Promise<Item[]> {
    return await invoke('get_items', { search });
  },
};
```

**Tauri invoke parameter names**: Frontend uses camelCase but Rust expects snake_case. Tauri auto-converts `backupPath` → `backup_path`. For non-standard names, explicitly map: `{ restore_mode: restoreMode }`.

### Theming

CSS custom properties system with 12 color palettes (`src/config/colorPalettes.ts`). Use `var(--color-primary)`, `var(--card-bg)`, `var(--glass-border)`, etc. Use `color-mix(in srgb, var(--color-primary) 10%, transparent)` for dynamic opacity.

### Language

All UI strings, database fields, table names, and error messages are in **Italian**. Table names are plural Italian (clienti, operatrici, appuntamenti, trattamenti, prodotti).

### UI Patterns

- **No `window.confirm()`**: Doesn't work in Tauri on Windows. Use inline confirmation (Sì/No buttons) or `ConfirmDialog` component.
- **No `window.location.reload()`**: Use `relaunch()` from `@tauri-apps/plugin-process` with fallback to `window.location.reload()`.
- **Modals**: Use portal-based custom modals (fixed z-index, backdrop blur). `src/components/ui/Modal.tsx` for standard modals.

## Database

- **Driver**: sqlx 0.8 with SQLite
- **Migrations**: `src-tauri/migrations/` — auto-run on startup
- **DB path**: Resolved via `tauri::path::app_data_dir()`:
  - macOS: `~/Library/Application Support/com.beautymanager.pro/beauty_manager.db`
  - Windows: `%APPDATA%\com.beautymanager.pro\beauty_manager.db`
- **Connection pool**: max 5 connections, foreign keys enabled

### Table Categories

**Data tables**: clienti, operatrici, cabine, appuntamenti, trattamenti, categorie_trattamenti, prodotti, categorie_prodotti, movimenti_magazzino, pacchetti_trattamenti, pacchetti_cliente, pacchetto_sedute, pacchetto_pagamenti, template_messaggi, comunicazioni, campagne_marketing, campagna_destinatari, schede_trattamento, inventari, righe_inventario, audit_log

**Auth/Config tables**: users, user_settings, user_sessions, config_centro, config_smtp, config_scheduler

**System tables** (never modify): _sqlx_migrations, license, license_validation_log

### Backup System

- Format: `.bmbackup` ZIP (beauty_manager.db + metadata.json)
- **Smart restore** (default): restores only data tables, preserves auth/config/license
- **Full restore**: restores everything including credentials (used for first setup or disaster recovery)
- Implementation: `ATTACH DATABASE` + table-by-table `DELETE + INSERT` with column intersection for cross-version compatibility
- `ensure_backup_compatibility()` in `src-tauri/src/db/connection.rs` patches old backups before migration (adds missing columns)

## CSP Configuration (Critical)

In `src-tauri/tauri.conf.json`, `connect-src` must include `https://api.github.com` for the updater and changelog to work. Without it, `fetch()` to GitHub API is silently blocked.

## Sidebar Menu Structure

Organized in logical sections (defined in `src/components/layout/Sidebar.tsx`):
- **Operatività**: Dashboard, Agenda
- **Anagrafica**: Clienti, Operatori
- **Servizi**: Trattamenti, Pacchetti
- **Gestione**: Magazzino, Comunicazioni
- **Analisi**: Report, Insights

Page IDs must match entries in `App.tsx` (`PageType` union, `pageTitles`, `renderPage()`, lazy import).

## Key Subsystems

### Pacchetti (Treatment Packages)
Three payment types (`tipo_pagamento`): `anticipo` (upfront), `dilazionato` (installments), `per_seduta` (per session). Sessions link to appointments via `pacchetto_sedute.appuntamento_id`. Session completion happens automatically when linked appointment is marked `completato`.

### Comunicazioni (Campaigns)
Backend fully implemented. WhatsApp sends via `wa.me` links (user sends manually). Email sends via SMTP (`lettre` crate). Campaign flow: create → select recipients (filtered by consent) → send. Client consent fields: `consenso_marketing`, `consenso_whatsapp`, `consenso_email`.

### Global Search (Header Cmd+K)
Searches: pages, quick actions, clienti (API), trattamenti, operatrici, pacchetti (cached locally on mount). Results grouped by type with keyboard navigation.
