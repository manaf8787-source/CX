# UI/UX Specification

Source: the live prototype's own CSS custom properties (`Documents/PSI CX Portal.html`), the existing port in `frontend/src/styles/theme.css`, the Modules KB's screenshot captions (60 screenshots, not individually viewed but all captioned — captions cited by section below), and two representative slides viewed from each business-language deck (`CX-Portal-AI-Agents-deck.pdf`, `Survey-Journeys-deck.pdf`).

## 1. This is not a blank-slate design problem

A complete, working design system already exists and ships inside the prototype as real CSS custom properties — Phase 2 should **port these tokens exactly**, not reinterpret them. The scaffold's `frontend/src/styles/theme.css` already did this once, faithfully, with one drift to fix (below).

### 1.1 Color tokens (light mode, from the prototype, verbatim)

```css
--bg:#EAF0F5; --surface:#FFFFFF; --surface2:#F3F7FA; --line:#DAE2EA; --ink:#0F1F2E; --muted:#566879;
--brand:#12385B; --brand-ink:#FFFFFF; --gold:#C8963E; --logo-p:#12385B; --logo-a:#C8963E;
--p-re:#0E8F8A; --p-af:#3563D8; --p-cl:#DE8514; --p-to:#8A4BD2; --p-ev:#DB406F;
--good:#17995C; --warn:#D08A00; --crit:#D3342C; --neutral:#AEB9C4;
--side:#0C2540; --side2:#12385B; --side-ink:#E8F0F7; --side-muted:#8CA5BB;
```

Dark mode (both via `prefers-color-scheme: dark` and an explicit `[data-theme="dark"]` override — **both paths must exist**, i.e. dark mode is both system-driven and user-toggleable):

```css
--bg:#0A121A; --surface:#111C27; --surface2:#172433; --line:#243649; --ink:#E7EEF4; --muted:#8DA0B2;
--brand:#7FB0E0; --brand-ink:#08203A; --gold:#E0B15C;
--p-re:#3FC4BD; --p-af:#7399F6; --p-cl:#F2AB4C; --p-to:#B488EF; --p-ev:#F2809F;
--good:#45CB8C; --warn:#F0B53D; --crit:#F4786F; --neutral:#4B5B6B;
```

**Drift to fix:** `frontend/src/styles/theme.css` currently uses `--brand:#0B7A8A` (a teal) and a slightly different `--side`/`--side2` pair (`#0B1F31`/`#143450`), instead of the prototype's actual navy `--brand:#12385B` + gold `--gold:#C8963E` accent pair. The navy/gold pair is also what Programme KB §28 calls out explicitly as the chosen placeholder brand colors ("logo option A... placeholder colours navy #12385B and gold #C8963E until PSI's brand hex codes... arrive"). **Phase 2 should use the prototype's exact tokens, including the `--gold` accent variable that the scaffold's theme.css dropped entirely.** Placeholder status stands either way — real PSI brand colors/fonts/logo are an open item (Programme KB §43.8) — but until they arrive, match the prototype, not a close approximation of it.

### 1.2 Typography

- Body font: `'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, system-ui, sans-serif` — chosen specifically because it covers Arabic and Latin scripts in one family, which matters given the hard bilingual requirement.
- Monospace (for all numeric/metric values — NPS scores, SLA hours, counts): `'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace`.
- Base size 13px, line-height 1.45 — a dense, data-heavy working UI, not a marketing site. Headings are modest (h1 19px, h2 14px, h3 12.5px) — this is a tool for daily use by a small team, not a showcase.

### 1.3 Layout shell

- Two-column shell: a sticky, scroll-independent sidebar (`224px`) + fluid main content, capped at `1400px` max-width, centered.
- Sidebar background is a navy gradient (`--side` → `--side2`), not flat — this is a deliberate branding choice, not decoration to drop.
- Below 820px: sidebar collapses to a horizontal scrollable strip above the content (not a hamburger/drawer pattern) — note this for the responsive strategy; nav groups lose their header labels at this width and scroll horizontally.
- Grid utility classes exist for 2/3/4/5-column card grids, collapsing to 1-2 columns under 1100px.
- Cards: white surface, 1px `--line` border, 10px radius, 12px padding. A colored 3px top accent (`::before`) is used on KPI tiles and on the "step" cards seen in both decks — this top-border-accent pattern is the single most recognizable visual motif across the prototype *and* the business decks (see §3 below) and should be treated as a core, reusable `Card`/`Tile` primitive, not a one-off style.

### 1.4 Status and product color conventions

- Three-state status color system used everywhere (`--good`/`--warn`/`--crit`), plus `--neutral` for "not applicable/no data". Applied consistently to: SLA clock states, action effectiveness verdicts, chip/badge components, meter bars.
- Each of the five launched-or-hidden products gets its own fixed hue (`--p-re` teal, `--p-af` blue, `--p-cl` amber, `--p-to` purple, `--p-ev` pink) used consistently for: nav dots, product tags/pills, chart series, heatmap cells. **PSI Wallet needs a sixth product color token** (`--p-wl`) — not present in the prototype's root tokens (confirm with the CX manager; the scaffold already anticipates this with a `push(['wl', ..., '--p-wl'])` call in its nav patch logic, but the token itself was never defined).
- `color-mix(in srgb, ...)` is used extensively for tinted chip/badge backgrounds derived from the base status/product color — this is a real CSS feature requirement (not a build-time Sass trick), confirm the target browser list tolerates it (it's broadly supported in 2024+ evergreen browsers; given this is an internal tool for PSI staff on managed devices, this should be a safe bet, but flag it as a decision rather than assume).

### 1.5 Components confirmed by the prototype's CSS (reusable primitive list for Phase 2's component library)

Tile (KPI stat card with colored top accent), Chip/Pill (status + product tags, including a tri-state `aria-pressed` toggle-pill pattern used for filters), Tabs (with a `.sub` dense variant for nested tab bars), Table (dense, numeric columns right/end-aligned and monospaced via a `.n` class, sortable-looking header style), Modal (standard + `.wide` variant), Meter/Track (a single horizontal progress-style bar used for both "score out of max" and "percent of capacity" contexts), Stack (segmented horizontal bar, e.g. promoter/passive/detractor composition), Heatmap cell grid, Step cards (used for pipeline/funnel visualizations — 5-step capacity/pipeline strip), Empty state (dashed border placeholder — used for "no data yet" states, which is itself a named requirement for the not-yet-existing branch QR channel and other unbuilt feeds).

## 2. Bilingual / RTL — implementation pattern already proven twice

Both the prototype and the `frontend/` scaffold implement the same pattern, which Phase 2 should keep:
1. Every user-facing string in the data layer is a `{ en: string, ar: string }` pair (`Bi` type in the scaffold), never a translation-key lookup against a separate locale file. This keeps bilingual content co-located with the data it describes (important since so much of this portal's content — complaint type names, standard text, persona descriptions — **is** data, authored once, not generic UI chrome).
2. A single `lang`/`dir` context flips `document.documentElement.lang` / `dir` and persists the choice (localStorage in the scaffold).
3. CSS uses **logical properties** (`border-inline-start`, `margin-inline-end`, `text-align: start/end`) rather than left/right, so the same stylesheet works unmodified in both directions — confirmed in `theme.css`'s `.item.crit`, `.legend i`, `td.n` rules. **Keep this discipline**; any new component must use logical properties, not `left`/`right`.
4. A small number of components have an explicit `[dir=rtl]` override where a pure logical-property swap isn't enough (the active-nav-item inset box-shadow accent bar flips side via an explicit `[dir=rtl]` selector rather than a logical property, because `box-shadow` has no logical-direction equivalent).

## 3. Visual language confirmed from the business decks

Two slides viewed (one per deck) both use: a light neutral page background, an orange/gold "eyebrow" label line (`IN ONE SENTENCE`, `THE RULE`) above a large bold headline, then a 3-5 column row of cards each with a distinct colored top border (navy, blue-gray, green on one deck; navy, green, orange, gold, gray on the other) and a plain-text body — no icons, no illustration, business language throughout. This is consistent with the portal's own card/tile language (§1.3/§1.5) and confirms the top-accent-bordered card is the house style end-to-end, from the working product to the stakeholder decks. Use this as the template for any "explainer" or definition surface Phase 2 needs to build (e.g. the "How the AI found this" panel, the "How to read these percentages" panel) — short eyebrow label, bold one-line claim, then 3-5 short colored cards, is the established pattern for explaining a mechanism to a non-technical reader inside this product.

## 4. Specific UI requirements named in the Modules KB (not visible from CSS alone)

- A "?" affordance beside every metric/heading opens its definition in place (a popover, per the KB's screenshot caption "the '?' beside a metric opens its definition in place") — this is a **per-metric micro-interaction**, not just a glossary page link.
- A sitewide "What the terms mean" button/modal with search (Modules KB §14, screenshot `terms-modal`).
- The landing/entry page is one card per user type/role (screenshot `landing`) — confirmed also by the scaffold's `Landing.tsx` pattern (role-switch cards, no password).
- The AI assistant surfaces as: a persistent button on every page for CX/Marketing/executives/environment managers, PLUS the Home search box routes free-text there; result rows show "reach via" (which channel/contact point to use) next to each matched person (Modules KB §13, screenshot `assistant`).
- A microphone control for voice input is conditionally rendered — shown only when the browser's SpeechRecognition API is available (Chrome/Edge), hidden otherwise, typing always remains available (Modules KB §13). This is a real feature-detection requirement, not graceful-degradation boilerplate to skip.
- Every page carries a permanent, non-dismissible "prototype with sample data, nothing is sent" banner/badge (confirmed both in the prototype's `.topbar .sample` chip and named explicitly in Modules KB §1).

## 5. Open items affecting design

- PSI's real brand colors, fonts and logo files have not arrived — current navy/gold + custom logo (Programme KB §28, "logo option A, an open door under a roofline") are explicitly placeholders. Build the design-token layer so a real brand swap is a token-file edit, not a component rewrite.
- No confirmation yet on exact target browser/device list for PSI staff — assumed evergreen desktop browsers given `color-mix()` and CSS logical properties usage throughout the existing prototype and scaffold; flag rather than silently assume if Phase 2 needs to support anything older.
