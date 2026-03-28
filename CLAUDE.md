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

**Tauri 2 desktop app**: React 19 frontend + Rust backend + SQLite (via sqlx).

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

### Frontend Service Pattern

```typescript
export const fooService = {
  async getItems(search?: string): Promise<Item[]> {
    return await invoke('get_items', { search });
  },
};
```

### Theming

CSS custom properties system with 10+ color palettes (`src/config/colorPalettes.ts`). Use `var(--color-primary)`, `var(--card-bg)`, `var(--glass-border)`, etc. Use `color-mix(in srgb, var(--color-primary) 10%, transparent)` for dynamic opacity.

### Language

All UI strings, database fields, table names, and error messages are in **Italian**. Table names are plural Italian (clienti, operatrici, appuntamenti, trattamenti, prodotti).

## Database

- **Driver**: sqlx 0.8 with SQLite
- **Migrations**: `src-tauri/migrations/` — auto-run on startup
- **DB path (dev)**: `~/Library/Application Support/com.beautymanager.pro/beauty_manager.db`
- **Key tables**: clienti, operatrici, appuntamenti, trattamenti, categorie_trattamenti, prodotti, categorie_prodotti, movimenti_magazzino, pacchetti_trattamenti, users, user_sessions

## Sidebar Menu Structure

Organized in logical sections (defined in `src/components/layout/Sidebar.tsx`):
- **Operatività**: Dashboard, Agenda
- **Anagrafica**: Clienti, Operatori
- **Servizi**: Trattamenti, Pacchetti
- **Gestione**: Magazzino, Comunicazioni
- **Analisi**: Report, Insights

Page IDs must match entries in `App.tsx` (`PageType` union, `pageTitles`, `renderPage()`, lazy import).
