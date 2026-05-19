# ontologizer-gui — Claude Guidelines

## Project Overview
Tauri + Angular desktop app for GO term enrichment analysis.
- **Frontend**: Angular (standalone components, signals, modern control flow)
- **Backend**: Rust via Tauri commands, invoked with `invoke()` from `@tauri-apps/api/core`

## Frontend Design — Colors
- **Never use hardcoded colors**
- Use the following colors:
  - Basic colors (text and background): `#003754` / `#FFFFFF`
  - Signal color (design elements, key visual, graphics, icons, illustrations): `#EA5451`
  - Additional text colors (highlights for headlines, higlights for body text): `#AF1821` / `#FFB0AC`
  - Infographics (representing info graphics) `#003754` / `#EA5451` / `#009AA9` / `#7876B6` / `9D7220`
- Use only CSS variables and define them in `src/styles.scss`:
- If a new color is needed, define it as a variable in `src/styles.scss` first. Ask for permission.

## Frontend Design — Typography
- Use Trebuchet as font
- Use only the four scale tokens defined in `src/styles.scss` as fontsizes:
  - `var(--font-small)` — secondary text, labels, subtitles
  - `var(--font-standard)` — body text, default
  - `var(--font-highlight)` — card titles, emphasized text
  - `var(--font-display)` — page titles, large metric numbers (2.2rem)

## Key Files
- `src/styles.scss` — global styles, all CSS variables, shared button/layout classes
- `src/app/app.routes.ts` — route definitions (files → analysis → results → about → contact)
- `src/app/app.html` — shell layout with `<router-outlet>` and sidebar nav
- `src/app/pages/files/` — file upload page; uses `app-file-upload` (GO/GAF) and `app-gene-card` (population/study)
- `src/app/pages/analysis/` — analysis settings page (method cards, dropdowns)
- `src/app/pages/results/` — results page; composes `dashboard`, `bar-chart`, `go-graph`, `result-table` sub-components
- `src/app/shared/` — shared components (tooltip, dropdown-menu, chart-header, scope-selector)
- `src/app/services/` — Angular services (files, analysis, results)

## Angular Conventions
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.
## TypeScript Best Practices
- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
## Angular Best Practices
- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.
## Accessibility Requirements
- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.
### Components
- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.
## State Management
- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead
## Templates
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
## Services
- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection