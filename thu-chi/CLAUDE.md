# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal income/expense tracker (Vietnamese: "Sổ Thu Chi"). Angular 21 frontend at the root (standalone components, signals, zoneless — no NgModules; RxJS only as `firstValueFrom` around `HttpClient`), plus a Node.js/Express/PostgreSQL backend in `server/` with its own `package.json`.

## Commands

On this machine Node is installed at `C:\Program Files\nodejs` but may be missing from the tool shell's PATH — prefix Bash commands with `export PATH="/c/Program Files/nodejs:$PATH"`.

```bash
# frontend (repo root)
npm start                    # dev server at http://localhost:4200, proxies /api → :3000 (proxy.conf.json)
npm run build                # production build to dist/
npm test                     # run all unit tests (Vitest via @angular/build:unit-test)

# backend (server/) — needs server/.env with DATABASE_URL (see .env.example)
npm run dev                  # node --watch, runs .ts directly via Node type stripping (no build step)
npm run db:seed -- <email>   # replace that user's sample rows (is_sample = true) for the current month
npm run typecheck            # tsc --noEmit; the only type check, since Node just strips types
```

To run a single test file or filter by name, pass extra args through the CLI, e.g.:
```bash
npx ng test -- transaction.store.spec
```

`npm run lint:styles` (`scripts/check-style-tokens.mjs`) fails on hardcoded colors, on raw numbers for tokenized properties (spacing, radius, font-size, transition, shadow, z-index, outline-offset), and on `@media` with px; component-local custom properties (`--foo: 14px`), `0` and `1px` are allowed. Formatting is Prettier (`.prettierrc`: printWidth 80, 4-space indent (also in `.editorconfig`), single quotes, `endOfLine: auto` because the Windows checkout has CRLF). `npm run format` / `npm run format:check` from the repo root cover both `src/` and `server/src/`. Prettier doesn't wrap comments or strings, so wrap long ones by hand to stay within 80 columns.

## Architecture

Dependency rule: `features → shared → core`. `shared` and `core` never import from `features`.

- `core/` — app-wide logic, no UI.
  - `accounting/cvp.ts` — pure CVP (management accounting) math: `summarizeCosts` (variable per-unit vs fixed per-period items), `analyzeCvp` (contribution-margin statement, break-even units/revenue — `null` when price ≤ variable cost, margin of safety, DOL — `null` unless profitable, target profit with after-tax gross-up; tax only on positive profit), `applyChange` (% what-if; computes `v + v·pct/100` to avoid float noise), `sensitivity` (+10% per factor, ranked). `cvp.spec.ts` checks it against a hand-worked example — keep new formulas covered the same way.
  - `state/cvp.store.ts` — `CvpStore` (plans for the signed-in user; same reload-on-account-change effect as `TransactionStore`; methods resolve to `true`/`false`). `EXAMPLES` lists the built-in sample plans (`examplePlan` = chair workshop, `coffeeShopPlan` = monthly café whose break-even is fractional); both are asserted against hand-worked numbers in `cvp.spec.ts`, so update the spec if you change their figures. `minimumUnits()` (round a fractional volume up) also lives in `cvp.ts`.
  - `auth/` — `AuthStore` (`user` signal; `check()` calls `GET /api/auth/me` once and caches the promise; `login`/`register`/`logout`), `authGuard`/`guestGuard` (functional; they `inject()` before awaiting `check()`), and `authInterceptor` (a 401 from any non-auth API calls `signedOut()` and navigates to `/dang-nhap`). The session is an HttpOnly cookie, so the frontend never sees or stores a token.
  - `state/transaction.store.ts` — the single source of truth (`TransactionStore`, signal-based, `providedIn: 'root'`). Holds `_transactions` and `selectedMonth` as signals; everything else (`monthTransactions`, `totalIncome`, `totalExpense`, `balance`, `incomeByCategory`, `expenseByCategory`) is `computed()` from those. An effect on `AuthStore.user()` clears the data and reloads via `GET /api/transactions` whenever the account changes (nothing loads while signed out); `load()` drops a response if the user changed while it was in flight. Filtering by month is client-side. Mutations (`add`/`update`/`remove`/`clearSample`) await the server response before updating the signal (not optimistic); failures set the `error` signal, which the dashboard shows with a retry button. `isSample` is derived from rows flagged `isSample`. Year stats (`selectedYear`, `yearTransactions`, `monthlyTotals` — always 12 entries, `yearIncomeByCategory`…) are also derived from `selectedMonth`; there is no separate year signal, and `setYear()` keeps the month-of-year. Aggregation lives in module-level `sumBy`/`groupBy` helpers that take the list to aggregate.
  - `state/theme.store.ts` — `ThemeStore.mode` (`auto`/`light`/`dark`), persisted in `localStorage` under `thu-chi.theme`; an effect sets/removes `data-theme` on `<html>`, which `styles.scss` already keys dark tokens off. An inline script in `src/index.html` applies the saved value before Angular boots (avoids a flash) — keep its key in sync with `THEME_STORAGE_KEY`.
  - `constants/categories.ts` — the list of income/expense categories (`categoriesOf(type)`); add new categories here.
  - `utils/date.util.ts` — pure month/date helpers (`monthOf`, `toMonthKey`).
  - `models/` — `Transaction`, `TransactionDraft`, `CategoryTotal`, etc.
- `shared/` — reusable, business-agnostic.
  - `ui/charts/` — `BarChart` and `StackedBar` only consume the generic `ChartDatum` (`id, label, value, color, icon?, detail?`); `ColumnChart` (grouped vertical columns with a per-group hover/focus tooltip listing every series) consumes `ChartSeries[]` + `ChartGroup[]` whose `values` follow series order. All types live in `chart.model.ts`, which also has `niceTicks()`. None of them know about transactions.
  - `ui/info-tip` — `InfoTip` (`<app-info-tip [text] label>`): an "i" button whose tooltip opens on hover, focus or tap (click only opens — focus already fired on the same press — and it closes on blur/leave/Escape); it measures itself after render and shifts to stay inside the viewport. Put it next to a label inside a `.field__head` (global flex row in `styles.scss`), never inside the `<label>` (a click there would focus the input). Accounting help texts live in `features/accounting/field-help.ts`.
  - `ui/` — `Card`, `StatCard`, `ProgressBar`, `EmptyState`, `MonthPicker` (‹ › step buttons plus a click-to-open 12-month panel; closes on pick, Escape, or outside `pointerdown`), `YearPicker` (reuses `month-picker.scss` via `styleUrl`), `SegmentedControl` (supports both `[(value)]` two-way binding and `ControlValueAccessor`/`formControlName`).
  - `pipes/` — `vnd` (currency formatting), `dayLabel`.
  - Each of `shared/ui`, `shared/pipes`, and each feature exposes a barrel `index.ts` as its public API.
- `features/` — one directory per feature.
  - `spending/` — `SpendingLayout`, the parent route `''` (behind `authGuard`) for `dashboard/` and `year-report/`; owns the Tháng/Năm toolbar + period picker.
  - `accounting/` — route `'ke-toan'`. `AccountingPage` (smart) keeps a `draft` signal fed by `PlanForm`'s `draftChange` (emitted on every edit), so results recompute live before saving; "unsaved" = JSON of draft ≠ JSON of the saved plan (both built with the same key order). `PlanForm` keeps all cost items in one `FormArray` (order preserved) but renders them in two sections (Biến phí / Định phí, from the `sections` computed) by filtering on each control's `behavior`; the ⇄ button just flips `behavior`. Presentational: `CvpReport` (KPIs + contribution-margin statement + target), `WhatIf` (local % change state + sensitivity), and the shared `LineChart` for the break-even chart.
  - `auth/` — `LoginPage` (route `'dang-nhap'`, `guestGuard`): one form with a Đăng nhập/Đăng ký toggle; the ≥8-char and confirm-password rules are a group validator that only applies in register mode.
  - `dashboard/` (route `''`) and `year-report/` (route `'nam'`), both behind `authGuard`, are the *smart* pages; together with the `App` shell they are the only places that inject `TransactionStore`. Everything else is presentational: data in via `input()`, events out via `output()`/`model()`.
  - `summary/` — `SummaryOverview`, `CategoryChart`.
  - `transactions/` — `TransactionForm` (typed Reactive Forms with `NonNullableFormBuilder`), `TransactionList`, `TransactionItem`.
- `app.ts` / `app.routes.ts` / `app.config.ts` — page shell and bootstrap. The `App` host is a min-height-100dvh flex column so the footer (copyright + theme toggle) sits at the bottom even on short pages. The header holds the brand and, when signed in, the Chi tiêu | Kế toán module switch (Chi tiêu is highlighted whenever the `#accounting` routerLinkActive is not, since it spans `/` and `/nam`) plus the account email + Đăng xuất. The Tháng/Năm tabs and the period picker live in `SpendingLayout`'s `.toolbar` (scrolls with the page); it swaps `MonthPicker` ↔ `YearPicker` using the `#yearTab="routerLinkActive"` template ref (no router-event subscription). Tests that render `App` must `provideRouter(routes)` and `navigateByUrl` explicitly — TestBed doesn't do the initial navigation — and stub `AuthStore` (`{ user, check }`) so the guards resolve.

### Backend (`server/`)

- `db/schema.sql` is applied on every server start (`migrate()` in `src/db.ts`), so it must stay idempotent (`IF NOT EXISTS`). There is no migration tool.
- `src/auth.ts` — users/sessions. Passwords: `node:crypto` scrypt, stored as `scrypt$N$r$p$salt$hash`. Sessions: random token in the `thu_chi_sid` cookie (HttpOnly, SameSite=Lax, `Path=/api`, `Secure` when `NODE_ENV=production`), only its SHA-256 stored in `sessions`. `requireAuth` puts the user in `res.locals`; read it with `currentUser(res)`. Login failures are counted in memory per email (10 → 15-minute lock). Registration of the very first user claims all `transactions` rows with `user_id IS NULL` (pre-auth data).
- `src/cvp-plans.ts` — CRUD for `cvp_plans` (`name` column + everything else in a `data` jsonb validated by zod `planSchema`; keep it in sync with the frontend `CvpPlanInput`). Same per-user filtering rule as transactions.
- Every query in `src/transactions.ts` must filter by `user_id = currentUser(res).id` — including UPDATE/DELETE, so another user's id just 404s. `user_id` is nullable only because of pre-auth rows; always set it on insert.
- `src/transactions.ts` holds the router and the zod `draftSchema`; the frontend `Transaction` model, `draftSchema`, and the SQL `COLUMNS` list must be kept in sync by hand. `COLUMNS` returns `date` via `to_char` (a pg `Date` would shift by timezone) and `bigint` is parsed to `Number` globally in `db.ts`.
- `DELETE /sample` must stay registered before `/:id`.
- Deploy: `src/server.ts` also serves `../dist/thu-chi/browser` (static + SPA fallback to `index.html`) when it exists, behind a JSON 404 for unknown `/api/*`; `GET /api/health` is the unauthenticated health check. `render.yaml` at the git repo root (one level above this folder) is the Render blueprint; `DATABASE_URL` comes from an external Postgres (Neon). If you change the Angular `outputPath`, update `webRoot`.
- Imports use explicit `.ts` extensions and only erasable TS syntax (no enums/parameter properties) — required by Node type stripping.
- Store tests mock the API with `HttpTestingController`; the backend has no automated tests. When testing auth manually, use a separate database (e.g. run a second server with `DATABASE_URL=…/thu_chi_test PORT=3100`) — registering the first account on the real DB claims the user's existing data.

### Conventions to preserve

- Every component uses `ChangeDetectionStrategy.OnPush`.
- State inputs/outputs use signal APIs (`input()`, `output()`, `model()`) — never the `@Input`/`@Output` decorators.
- Templates use the modern control-flow syntax (`@if`, `@for`, `@empty`), and `host` metadata instead of `@HostBinding`/`@HostListener`.
- Design system, three layers:
  - `src/styles/_tokens.scss` — every raw value: colors (light in `:root`, dark in the `dark-tokens` mixin, applied by `prefers-color-scheme` or `data-theme`), spacing scale with half steps (`--space-0-5` … `--space-6`), radii (`--radius-2xs` … `--radius-pill`, `--radius-control` for buttons/inputs), sizes (`--control-height`, `--icon-box-*`, `--swatch-size`), type (`--text-*`, `--icon-size-*`), motion (`--duration-*`, `--opacity-dim`), shadows, z-index. `src/styles.scss` `@use`s it and holds global primitives (`.btn`, `.input`, `.field`, `.chip`).
  - `src/app/shared/styles/_mixins.scss` — recurring patterns built from tokens (`surface-card`, `control`, `segmented-track/item/item-active`, `tooltip`, `legend`, `focus-ring`) plus `$breakpoints` with `from(sm|md|lg)` / `below()` media mixins (CSS vars can't be used in media queries).
  - Components use only `var(--…)` and those mixins. Geometry unique to one component (chart plot height, bar thickness) is declared as a custom property on `:host` at the top of that file, not hardcoded inline.
- Chart series colors are `--series-1` through `--series-7` plus `--series-other` (chosen to stay distinguishable for colorblind users) — reuse `--series-other` for any category beyond the 7th rather than adding a new color. In charts, don't encode income vs expense with `--income`/`--expense` (green/red): that pair fails colorblind separation in dark mode. The year chart uses `--series-1`/`--series-2` instead; `--income`/`--expense` stay for text amounts and stat cards.
