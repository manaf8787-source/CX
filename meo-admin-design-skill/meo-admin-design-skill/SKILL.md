---
name: meo-admin-design
description: Design and build premium SaaS admin dashboards in the visual language reverse-engineered from the Meo marketing site (meo.framer.ai) - monochrome ink-on-white, pill controls, layered soft shadows instead of borders, Plus Jakarta Sans with tight tracking, springy state changes. Use when designing or implementing admin shells, data tables, KPI cards, forms, dialogs or any product UI that should carry this look.
---

# Meo Admin Design Skill

A design system extracted from https://meo.framer.ai/ (home, `/style-guide`, `/terms`) on 2026-11-18 and adapted for enterprise admin interfaces. Everything needed to apply it is in this file; the `references/`, `tokens/` and `examples/` folders hold the detail and the evidence.

**Provenance labels used throughout:** *measured* = read from the live site's CSS, computed styles or compiled motion config. *estimated* = judged from observation. *derived* = added for admin use; it does not exist on the reference.

**Not an official Meo product.** Never reuse the Meo name, logo mark, wordmark, photos or copy. Reuse the design language only.

## When to use this skill

- Building or restyling an admin dashboard, back-office tool, settings area, or internal console.
- The request mentions "Meo style", "like meo.framer.ai", or asks for a premium monochrome, soft-shadow, pill-based product UI.
- Do **not** use it for marketing pages (that would just clone the reference) or for brands that need a strong colour identity.

## The look in one paragraph

White page. Near-black ink (#0A0A0A) for text and for every selected or primary control. Greys carry hierarchy; colour appears only as four small app-icon accents. Nothing has a CSS border: edges come from a 1px 4%-black shadow ring plus stacked 4%-black drop shadows, and every raised control has a 1px inner top highlight so it reads as a physical key. Controls are fully rounded pills; cards use large radii (18-26px) and nest concentrically. Type is Plus Jakarta Sans, medium weight for anything that matters, with negative tracking that tightens as size grows. State changes use one short spring; entrances use one long ease-out.

## Non-negotiable rules

1. **No borders.** Use `--shadow-hairline` (`0 0 0 1px rgba(0,0,0,.04)`) or a full card shadow stack. The only line is the 1px `#ECECEC` row divider.
2. **Two materials only.** Light raised = gradient `#FFF -> #F6F6F6`. Dark raised = gradient `#3A3A3A -> #0A0A0A`. Flat fills are reserved for page (`#FFF`), sidebar (`#F6F6F6`) and wells (`#F2F2F2`).
3. **Selected = dark.** Active nav item, selected segment, checked box, current tab, primary action: all use the dark material with white text. Never use a coloured highlight for selection.
4. **Pills for controls, big radii for containers.** Buttons, tags, chips, segmented controls: `999px`. Cards: 22px (18px inside a 26px frame). Inputs and sidebar items: 8px.
5. **Weights 400 / 500 only** (600 is reserved for a logo-scale wordmark). Never bold. Never all-caps except the 12px `Label` style.
6. **Negative tracking on everything 13px and up**; positive tracking only on the 11-12px label and badge styles.
7. **Colour is categorical, not decorative.** Green/blue/violet/amber appear in icon tiles and (derived) status badges. Never on buttons, links, charts' main series, or backgrounds.
8. **One spring for state, one curve for entrances.** `spring(duration .4, bounce .2)` and `cubic-bezier(.22, 1, .36, 1)`.
9. **Asymmetric vertical padding** on pill controls: bottom padding is 2px larger than top (`4px 22px 6px`) to optically centre Plus Jakarta Sans.

## Tokens (copy this block)

Full sets with provenance live in `tokens/*.json`; a ready stylesheet is `tokens/tokens.css`.

```css
:root {
  /* colour - measured */
  --surface: #FFFFFF;  --surface-soft: #F6F6F6;  --surface-well: #F2F2F2;
  --ink: #0A0A0A;  --ink-graphite: #161616;  --ink-charcoal: #3A3A3A;
  --ink-secondary: #6E6E6E;  --ink-tertiary: #767676;  --line: #ECECEC;
  --brand-green: #1F9D55;  --brand-blue: #1F6FE0;  --brand-violet: #7C3AED;  --brand-amber: #F08A1C;
  --fx-highlight: rgba(255,255,255,.28);  --fx-glass: rgba(255,255,255,.62);  --fx-tint: rgba(255,255,255,.07);
  --fx-inner-shade: rgba(0,0,0,.5);  --fx-shadow-dark: rgba(0,0,0,.12);  --fx-soft-shade: rgba(0,0,0,.04);

  --grad-light: linear-gradient(180deg, #FFF 0%, #F6F6F6 100%);
  --grad-dark: linear-gradient(180deg, #3A3A3A 0%, #0A0A0A 100%);
  --grad-dark-button: linear-gradient(180deg, #3A3A3A 0%, #161616 55%, #0A0A0A 100%);
  --grad-dark-surface: radial-gradient(120% 80% at 50% 0%, #3A3A3A 0%, #161616 55%, #0A0A0A 100%);

  /* type */
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;

  /* radius - measured */
  --r-xs: 4px; --r-md: 8px; --r-lg: 10px; --r-xl: 12px; --r-well: 14px; --r-pop: 16px;
  --r-inner: 18px; --r-panel: 20px; --r-card: 22px; --r-card-lg: 24px; --r-frame: 26px; --r-pill: 999px;

  /* shadow - measured */
  --shadow-hairline: 0 0 0 1px rgba(0,0,0,.04);
  --shadow-raised-light: inset 0 1px 1px #FFF, inset 0 -1px 1px rgba(0,0,0,.04), inset 0 0 1px 1px rgba(0,0,0,.04), 0 1px 1px rgba(0,0,0,.04), 0 3px 4px rgba(0,0,0,.04);
  --shadow-raised-dark: inset 0 1px 1px rgba(255,255,255,.28), inset 0 -2px 3px rgba(0,0,0,.5), 0 1px 1px rgba(0,0,0,.12), 0 3px 5px rgba(0,0,0,.12);
  --shadow-button-primary: inset 0 1px 1px rgba(255,255,255,.28), inset 0 6px 8px -5px rgba(255,255,255,.28), inset 0 -2px 3px rgba(0,0,0,.5), 0 2px 3px rgba(0,0,0,.12), 0 6px 10px rgba(0,0,0,.12), 0 14px 22px rgba(0,0,0,.12);
  --shadow-button-secondary: inset 0 1px 1px #FFF, inset 0 -2px 3px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.04), 0 2px 3px rgba(0,0,0,.04), 0 6px 10px rgba(0,0,0,.04), 0 14px 22px rgba(0,0,0,.04);
  --shadow-card: inset 0 1px 1px #FFF, 0 0 0 1px rgba(0,0,0,.04), 0 3px 4px rgba(0,0,0,.04), 0 7px 9px rgba(0,0,0,.04), 0 12px 16px rgba(0,0,0,.04), 0 30px 48px rgba(0,0,0,.04);
  --shadow-card-frame: inset 0 1px 1px #FFF, 0 0 0 1px rgba(0,0,0,.04), 0 4px 6px rgba(0,0,0,.04), 0 14px 26px rgba(0,0,0,.04);
  --shadow-popover: 0 0 0 1px rgba(0,0,0,.04), 0 3px 4px rgba(0,0,0,.04), 0 7px 9px rgba(0,0,0,.04), 0 12px 16px rgba(0,0,0,.04), 0 18px 24px rgba(0,0,0,.04), 0 30px 48px rgba(0,0,0,.04);
  --shadow-toast: inset 0 1px 1px #FFF, 0 0 0 1px rgba(0,0,0,.04), 0 3px 4px rgba(0,0,0,.04), 0 12px 16px rgba(0,0,0,.04), 0 30px 48px rgba(0,0,0,.08);
  --shadow-inset-well: inset 0 1px 2px rgba(0,0,0,.04), inset 0 2px 5px -2px rgba(0,0,0,.04), 0 1px 0 #FFF;
  --shadow-inset-track: inset 0 1px 2px rgba(0,0,0,.12), inset 0 2px 5px -2px rgba(0,0,0,.04), 0 1px 0 #FFF;
  --ring-selected: 0 0 0 1.5px #0A0A0A;
  --ring-focus: 0 0 0 2px #FFF, 0 0 0 4px #0A0A0A;            /* derived */

  /* motion - measured */
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-in-out: cubic-bezier(.45, 0, .55, 1);
  --spring-css: 400ms cubic-bezier(.34, 1.3, .64, 1);           /* CSS stand-in for spring(.4, bounce .2), estimated */

  /* layout - measured */
  --sidebar-w: 220px; --topbar-h: 60px; --control-h: 36px; --row-h: 60px;
}
```

### Type scale (measured; desktop / tablet / phone)

| Style | Size | Weight | Tracking | Line | Colour | Admin use |
|---|---|---|---|---|---|---|
| Display | 72 / 56 / 40 | 500 | -0.045em | 1.08 | ink | Not used in admin |
| Heading 2 | 52 / 42 / 32 | 500 | -0.035em | 1.08 | ink | Empty-state or onboarding hero only |
| Price / KPI | 44 | 500 | -0.05em | 1.0 | ink | KPI value (comfortable) |
| Heading 3 | 24 / 22 / 20 | 500 | -0.03em | 1.2 | ink | Page title |
| Card Title | 22 | 500 | -0.035em | 1.1 | ink | Card title (comfortable) |
| Heading 4 | 17 | 500 | -0.02em | 1.3 | ink | Card title (dense), dialog title, section title |
| Body M | 15 | 400 | -0.01em | 1.5 | secondary | Descriptions |
| Button | 15 | 500 | -0.01em | 1.2 | inherit | Large buttons |
| UI strong | 14 | 500 | -0.01em | 1.3 | ink | Table primary cell, field value, menu title |
| UI | 14 | 400 | -0.01em | 1.2-1.5 | secondary | Nav links, inputs |
| Body S | 13 | 400 | -0.005em | 1.45 | secondary/tertiary | Table cells, meta, table header (tertiary) |
| Small Strong | 13 | 500 | -0.01em | 1.3 | ink | Sidebar items, chips, tags, toolbar buttons |
| Label | 12 | 500 | +0.04em, UPPERCASE | 1.2 | charcoal | Eyebrow, group label |
| Badge | 11 | 500 | +0.02em | 1.2 | ink | Badges |
| Caption | 11 (12 phone) | 400 | 0 | 1.35 | secondary | Footnotes |

Apply `-webkit-font-smoothing: antialiased`, `text-wrap: balance` on headings, and `font-variant-numeric: tabular-nums` on numeric table columns and KPI values (derived).

### Spacing

Optical 2px steps, not an 8pt grid. Allowed values: `2 4 6 8 10 12 14 16 18 20 22 24 26 28 32 40 48 56 64 72 96`.
Control gaps 6-10. Card padding 28 (20 dense). Well padding 22. Card-to-card gap 16. Section gap 48. Table cell padding `11px 10px`.

## Component recipes

Detailed anatomy for every component is in `references/component-library.md`; working code is in `examples/`.

| Component | Recipe |
|---|---|
| **Primary button** | h 40 (36 toolbar, 46 form, 50 hero), `padding: 4px 22px 6px`, gap 9, pill, `--grad-dark-button`, `--shadow-button-primary`, white 15/500 label, 16px icon stroke 1.7. Hover: label rolls up and an identical label rolls in from below (18px mask). |
| **Secondary button** | Same box, `--grad-light`, `--shadow-button-secondary`, ink label. |
| **Ghost button** | Same box, `padding: 4px 14px 6px`, no fill, no shadow, ink label + trailing arrow. |
| **Icon button** | 26-40px circle. Light material by default; dark when "on". |
| **Eyebrow pill** | h 30, `4px 14px 6px 12px`, gap 7, light material + md shadow, 14px icon, Label text. |
| **Tag** | h 24, `3px 10px 5px`, pill, light material (default) or dark material (emphasis), Small Strong. |
| **Badge** | h 24, `4px 10px 6px`, 11/500 +0.02em. Light (`#FFF -> #ECECEC`) or dark. |
| **Check chip** | h 30, `4px 12px 4px 5px`, gap 8, fill `#F2F2F2`, leading 20px dark circle with 12px white check. |
| **Status** | 6px dot + 13px text. Live = ink dot pulsing opacity 1 -> .3 over .9s. Idle = `#767676` static. |
| **Segmented control** | Track: pill, `#F2F2F2`, pad 3, `--shadow-inset-well`. Segment: `5px 13px 7px`, 13/500. Selected: dark material, slides with the spring. |
| **Search / input** | h 36, radius 8, `#F2F2F2`, `--shadow-inset-well`, `0 12px`, 14px icon in `#6E6E6E`, placeholder `#767676`. |
| **Checkbox** | 16px, radius 4, light material; checked = dark material + white check. |
| **Sidebar item** | h 36, radius 8, `0 10px`, gap 8, 16px icon, 13/500, count right in 13/400 tertiary. Active: dark material, white text and icon. |
| **Card** | radius 22, white, `--shadow-card`, pad 28, inner gap 26. Put visuals in a **well** (radius 14, `#F2F2F2`, pad 22) above the title + description. |
| **Framed card** | Outer radius 26, pad 8-10, `--shadow-card-frame`; inner radius 18/16, `--shadow-hairline`, clips content. |
| **Dark feature card** | `--grad-dark-surface`, shadow `surface.dark`, white text, chips use `--fx-tint`. One per view at most. |
| **Table** | No outer border, no header fill. Header 41px, 13/400 `#767676`, sentence case. Rows 60px with two-line first cell (14/500 + 13/400). Divider: 1px `#ECECEC` via `::after`. |
| **Dropdown** | radius 16, pad 6, white, `--shadow-popover`. Rows: pad 10, gap 12, radius 10, 20px icon, 14/500 title + 13/400 `#767676` description. Row hover: `#F2F2F2`. |
| **Accordion** | Item: card, radius 18. Header pad `20px 20px 20px 24px`, 17/500 question, 30px dark circular toggle (plus rotates to minus). Body pad `0 72px 22px 24px`, 15/400 secondary. |
| **Progress bar** | Track 12px (4px mini), pill, `#ECECEC`, `--shadow-inset-track`. Fill: dark material. Comparison fills: `#ECECEC -> #767676` at 62% opacity. |
| **Glass note** | radius 12, `rgba(255,255,255,.62)`, `backdrop-filter: blur(16px)`, glass shadow. Only over photography. |
| **App-icon tile** | 56px, radius 15, solid brand colour, 26px white icon stroke 2.2, gloss overlay on the top half. |

## Iconography

Outline icons on a 24px grid, `fill: none`, round caps and joins, geometric with ~2px corner radii (geometry consistent with Lucide; not confirmed as the source). Stroke width is set per size: **1.7 at 11-20px, 2 at 14px eyebrow / 24px, 2.2 at 26px inside tiles**. Colours: `#6E6E6E` idle, `#0A0A0A` active on light, `#FFF` on dark. Sizes: 11-12 inside small circles, 14 in pills/inputs, 16 in buttons and sidebar, 20 in menus, 26 in tiles. Details: `references/iconography.md`.

## Motion

| Token | Value | Use |
|---|---|---|
| `spring.ui` | spring, duration .4, bounce .2 | All state changes: hover roll, tab slide, toggle, accordion, nudges |
| `ease.out` | `cubic-bezier(.22,1,.36,1)` | Entrances: opacity 0 -> 1, y 24 -> 0, 1.0s, stagger ~.09-.15s, once, at 50% visibility |
| `ease.inOut` | `cubic-bezier(.45,0,.55,1)` | Ambient loops (pulse .9s, float 3.5-4.25s, zoom 8s) |
| toast in | opacity + transform, .6s `ease.out` | Toasts and banners |

**Admin adjustments (derived):** shorten reveals to 400-600ms with `y: 12`; run them on first paint only, never on data refresh; keep only the live-dot pulse and a sync spinner as loops; honour `prefers-reduced-motion` by disabling loops and using 150ms opacity fades. Details and code: `references/animations-and-interactions.md`.

## Admin dashboard blueprint

The reference already contains an app mock (sidebar, top bar, toolbar, table) and a document page with a sticky side nav. Those are the measured basis; everything else below is adapted. Full guidance: `references/admin-dashboard-adaptation.md`; layout code: `examples/admin-layout-example.md`.

```
+-----------+--------------------------------------------------------+
| Sidebar   | Top bar 60px: workspace switcher ... sync, search, user |
| 220px     +--------------------------------------------------------+
| #F6F6F6   | Page header: H3 title + 13px meta ........ actions      |
| items 36  | Toolbar: [segmented] ...... [search] [secondary] [prim] |
| active =  | Content: KPI cards (16px gap) / table / forms           |
| dark pill |                                                        |
| usage card|                                                        |
+-----------+--------------------------------------------------------+
```

- **Shell:** white content, `#F6F6F6` sidebar, no divider between them other than the tone change. Optionally wrap the whole app in a framed card (outer 26 / inner 16) on wide screens.
- **Sidebar:** 220px, pad `14px 10px`, item gap 4. Collapsed: 56px, icons only, tooltips. Bottom: usage card (light material, radius 10, 4px meter).
- **Top bar:** 60px, pad `0 18px`. Left: 30px round avatar + name 14/500 + meta 13/400. Right: status with 14px icon, actions.
- **KPI card:** card, pad 20-28. Label (Small Strong, secondary), value (Price 44 comfortable / 32 dense), unit in Heading 3 colour-tertiary, delta as a tag, optional well with a mono chart.
- **Charts:** hero series dark gradient; other series grey at 62%; tracks inset; gridlines `#ECECEC`; labels 11-13px tertiary. Use brand hues only for up to four categories.
- **Table:** as recipe. Add (derived) row hover `#F6F6F6`, selected row `--ring-selected` inset or soft fill, sticky header on white, compact row 44px, numeric right-aligned tabular. Bulk-action bar = floating dark pill bar at the bottom.
- **Forms:** label 13/500 ink, input recipe at 40px for forms, help 13/400 tertiary, error (derived) text `#B42A23`. Group fields in cards; sections separated by 48px.
- **Dialogs:** radius 22-24, `--shadow-toast`, scrim `rgba(0,0,0,.32)`. Drawers float 10px from the edge with radius 24.
- **Feedback:** toast = radius 20 card bottom-left; tooltip = dark pill 12/500; skeleton = `#F2F2F2` blocks with matching radii; empty state = well with the dot-grid motif, Heading 4 + Body M + one primary button.
- **Status colours (derived):** success `#157A40` on `#EAF6EF`, info `#1A5FC2` on `#EAF1FC`, warning `#A85A06` on `#FDF1E3`, error `#B42A23` on `#FCEDEC`. Use as tags or dots, never as large fills.

## Accessibility

- Text contrast (computed): `#0A0A0A` 19.8:1, `#3A3A3A` 11.4:1, `#6E6E6E` 5.1:1, `#767676` 4.54:1 on white. **`#767676` drops to 4.06-4.2:1 on `#F2F2F2`/`#F6F6F6`: use `#6E6E6E` for small text on wells and the sidebar.**
- Brand solids fail as text on white (green 3.49, amber 2.51): use the derived `text` shades.
- The reference defines no focus style. Always add `--ring-focus` on `:focus-visible`.
- Nav links at 60% opacity ink compute to roughly `#6C6C6C` (about 5.2:1): acceptable; do not go lower.
- Minimum hit area 36px in app chrome, 40px+ for touch. 24px tags are not interactive targets unless padded.
- Never signal state by the dot pulse alone: pair it with text ("Running 2h 14m").
- Selection is tone-based (dark fill), so also set `aria-current`, `aria-selected`, `aria-pressed`.

## Do and Don't

| Do | Don't |
|---|---|
| Edge cards with the shadow ring and stack | Add `border: 1px solid #e5e7eb` |
| Mark selection with the dark material | Use blue/indigo active states or left accent bars |
| Use pills for every button, tag and segment | Use 6-8px rounded-rectangle buttons |
| Put charts and visuals in a `#F2F2F2` well inside the card | Float charts directly on the card with coloured series |
| Keep weights at 400/500 with negative tracking | Use 600/700 headings or default tracking |
| Use sentence-case 13px grey table headers | Use uppercase bold headers with a grey header band |
| Use one dark feature surface per view | Alternate dark and light cards |
| Let one spring handle hover, toggle, tabs | Mix 150ms ease, 300ms ease-in-out and linear fades |
| Reserve brand hues for icon tiles and status tags | Colour buttons, links or KPI numbers |
| Nest radii concentrically (26 -> 18, 22 -> 14) | Use the same radius at every depth |

Good: a "New record" action as a 36px dark pill with a 14px plus icon, sitting beside a light pill "Export" and an inset search field. Bad: a blue rectangular button next to an outlined grey button and a bordered white input.

## Instructions for AI agents

1. **Load tokens first.** Import `tokens/tokens.css` (or map `tokens/design-tokens.json` into the project's token system). Never hard-code a value that has a token.
2. **Respect the host stack.** Use the project's existing framework, component library and styling approach; restyle its primitives with these tokens rather than adding dependencies. Add Framer Motion (`motion`) only if the project already uses it or needs the spring; otherwise use `--spring-css`.
3. **Build in this order:** tokens -> base typography -> materials (light/dark/well) -> Button, Pill, Tag, Input, Segmented -> Sidebar and Top bar -> Card and Table -> overlays -> page composition.
4. **Check each screen against the rules:** no borders; selection is dark; two materials; weights 400/500; a visible focus ring; brand hues only as accents.
5. **Choose density explicitly.** Comfortable (card pad 28, row 60, KPI 44px) for overview pages; dense (card pad 20, row 44, KPI 32px) for data-heavy pages. Dense values are derived.
6. **Mark anything you invent.** If a needed component is not covered, compose it from the two materials, the radius ladder and the shadow tokens, and note it as derived.
7. **Do not copy the reference's brand.** No Meo logo, name, photos, testimonials or copy.

## Quality checklist

- [ ] No `border` declarations except the table row divider
- [ ] Every raised control has the inner top highlight
- [ ] Active/selected states use the dark gradient, with ARIA state set
- [ ] All buttons, tags, chips and segments are pills; cards are 18-26px
- [ ] Only Plus Jakarta Sans 400/500; tracking matches the scale
- [ ] Table header is 13px grey sentence case, rows divided by 1px `#ECECEC`
- [ ] Colour appears only in icon tiles and status tags
- [ ] `:focus-visible` ring present on every interactive element
- [ ] Small grey text on wells/sidebar uses `#6E6E6E`, not `#767676`
- [ ] State changes use the spring; reveals use ease-out; reduced motion handled
- [ ] Layout holds at >=1200, 810-1199 and <=809px
- [ ] No Meo branding or content

## File map

| Need | File |
|---|---|
| What the site is and how it was inspected | `references/website-overview.md` |
| Section-by-section measurements | `references/page-by-page-analysis.md` |
| Identity and design philosophy | `references/visual-identity.md` |
| Colour, type, spacing detail | `references/color-system.md`, `typography.md`, `spacing-and-layout.md` |
| Component anatomy and states | `references/component-library.md` |
| Icons and imagery | `references/iconography.md` |
| Motion | `references/animations-and-interactions.md` |
| Breakpoint behaviour | `references/responsive-design.md` |
| Admin translation | `references/admin-dashboard-adaptation.md` |
| Tokens | `tokens/*.json`, `tokens/tokens.css` |
| Code | `examples/css-examples.md`, `react-examples.md`, `component-examples.md`, `admin-layout-example.md` |
| Evidence and confidence | `AUDIT-REPORT.md`, `assets/reference-assets.md`, `assets/screenshots/` |
