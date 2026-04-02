# Ontologizer-Tauri — Claude Guidelines

## Project Overview
Tauri + Angular desktop app for GO term enrichment analysis.
- **Frontend**: Angular (standalone components, signals, modern control flow)
- **Backend**: Rust via Tauri commands, invoked with `invoke()` from `@tauri-apps/api/core`

## Angular Conventions
- Use Angular **signals** (`signal()`, `computed()`) for component state — no plain mutable properties
- Use modern Angular **control flow**: `@for`, `@if`, `@else` — never `*ngFor`, `*ngIf`
- Use **self-closing tags** for components with no content: `<app-foo />`
- Components are **standalone** — no NgModules
- Only import `CommonModule` if strictly necessary (prefer removing it when `*ngFor`/`*ngIf` are migrated)

## Frontend Design — Colors
- **Never use hardcoded colors**
- Use the following colors:
  - Basic colors (text and background): `#003754` / `#FFFFFF`
  - Signal color (design elements, key visual, graphics, icons, illustrations): `#EA5451`
  - Additional text colors (highlights for headlines, higlights for body text): `#AF1821` / `#FFB0AC`
  - Infographics (representing info graphics) `#003754` / `#EA5451` / `#009AA9` / `#7876B6` / `9D7220`
- Use only CSS variables and define them in `src/styles.css`:
- If a new color is needed, define it as a variable in `src/styles.css` first. Ask for permission. 

## Frontend Design — Typography
- Use Trebuchet as font
- Use only the three scale tokens defined in `src/styles.css` as fontsizes:
  - `var(--font-small)` — secondary text, labels, subtitles
  - `var(--font-standard)` — body text, default
  - `var(--font-highlight)` — card titles, emphasized text

## Key Files
- `src/styles.css` — global styles, all CSS variables, shared button/layout classes
- `src/app/app.routes.ts` — route definitions (files → analysis → results)
- `src/app/app.html` — shell layout with `<router-outlet>` and sidebar nav
- `src/app/pages/files/` — file upload page (step slider, upload cards)
- `src/app/pages/analysis/` — analysis settings page (method cards, dropdowns)
- `src/app/pages/results/` — results display page
- `src/app/shared/` — shared components (tooltip, dropdown-menu)
- `src/app/services/` — Angular services (files, analysis, results)