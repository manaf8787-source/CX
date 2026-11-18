# Component library

Inventory of every reusable component found on the reference, with measured anatomy, then the components the reference lacks (with derived specifications). Token names refer to `../tokens/`. Code: `../examples/`.

Status key: **M** measured on the site, **D** derived for admin.

## Inventory

| Group | On the reference (M) | Not on the reference (D, specified below) |
|---|---|---|
| Navigation | Top nav, link pill, dropdown, phone menu, side nav with sliding indicator, footer links | Breadcrumbs, collapsed sidebar, command palette |
| Buttons | Primary, Secondary, Ghost, toolbar buttons, round icon button, floating pill | Disabled, loading, destructive |
| Cards | Bento card, framed photo card, text card, pricing (light + featured), quote bubble, dark brand card, document card | KPI card |
| Badges and labels | Eyebrow pill, tag (light/dark), badge (light/dark), check chip, check pill, number chip, status dot | Status tags with colour, notification count |
| Forms | Search field (static), checkbox (static) | Text input states, select, radio, switch, validation |
| Data | Table, bar comparison, dot grid, cell meter, mini meter, stat with unit, compare chips | Pagination, sortable header, charts |
| Overlays | Dropdown menu, cookie banner (toast-like), glass note | Modal, drawer, tooltip, popover, context menu |
| Other | Accordion, large tabs, billing toggle (segmented), logo ticker, floating quotes | Empty state, skeleton, error state |

---

## Buttons (M)

One component, three variants; labels roll on hover.

| | Primary | Secondary | Ghost |
|---|---|---|---|
| Fill | `gradient.darkButton` | `gradient.light` | none |
| Shadow | `button.primary` | `button.secondary` | none |
| Label | white 15/500 | ink 15/500 | ink 15/500 |
| Padding | 4 22 6 | 4 22 6 | 4 14 6 |
| Icon | 16px, stroke 1.7, leading or trailing | same | trailing arrow |

- **Sizes:** 36 (toolbar; padding 4 14 6, gap 6, 13/500 label, 14px icon), 40 (nav), 46 (cards and forms), 50 (hero). Radius 999. Gap 9.
- **Anatomy:** `[icon?] [label mask [label][label copy]] [icon?]`. The mask is 18px high with `overflow: clip`; the two labels are stacked in a column.
- **Hover:** mask alignment flips from top to bottom, so the label slides up and its copy slides in from below, on `spring.ui`. No colour, shadow or scale change.
- **Pressed / disabled / loading:** not present. **D:** pressed = `transform: translateY(1px)` and drop the two largest shadow layers; disabled = 40% opacity, no shadow, `cursor: not-allowed`; loading = replace the leading icon with a 14px spinner (4s linear rotation exists on the site's sync icon; use 0.8s for a spinner) and keep the label.
- **Full width** in cards and on phones.
- **Accessibility:** the duplicate label must be `aria-hidden`. Add `:focus-visible { box-shadow: <existing>, var(--ring-focus) }`.

### Round icon button (M)
26px (table row action), 30px (accordion toggle), 40px (phone menu). Light material idle; dark material when active/on. Phone menu button: no fill closed, `rgba(0,0,0,.04)` fill when open. Icon 11-16px.

### Floating pill (M)
46px, padding 6 16 6 6, gap 8, light gradient, `floating` shadow, 34px avatar with white ring, rolling 14/500 label.

## Navigation

### Top nav (M)
Three zones in a 56px bar: brand (26px mark + 21/500 wordmark, gap 9), link pill, actions. See `page-by-page-analysis.md` section 1.

- **Link:** 40px, padding 7 14 9, 14/400, ink at 60% opacity -> 100% on hover and when its menu is open. No fill on hover or active.
- **Active page state:** not present (single-page site). **D:** active link at 100% opacity, weight 500.

### Dropdown menu (M)
- Panel: 300px, radius 16, padding 6, white, `popover` shadow, 8px below trigger, opens on hover; chevron flips.
- Row: padding 10, gap 12, radius 10; 20px icon `#6E6E6E` stroke 1.7; title 14/500 ink; description 13/400 `#767676`, 2px below.
- Row hover: soft grey fill (about `#F2F2F2`, estimated from the screenshot).
- **D:** for compact menus (no description) use 36px rows, padding 0 10, 16px icon; separators = 1px `#ECECEC` with 6px margin; destructive item text `#B42A23`; keyboard: arrow keys, Home/End, Esc, typeahead; `role="menu"`.

### Phone menu (M)
Full-screen white sheet. Menu button morphs to a close icon in a 40px circle. Drawer padding 8 14 24. Top-level items 17/500 ink separated by hairlines; the "Use cases" group is expanded inline with 16px icon + 14/400 `#6E6E6E` sub-links (row padding 10 4 12, gap 10).

### Side nav with sliding indicator (M, from `/terms`)
Card: 260px, sticky `top: 24px`, radius 20, padding 8, white, card shadow. Label row 12/500 uppercase `#767676`, padding 10 12 8. Items 40px, padding 11 12, gap 10, pill: number 11/400 `#767676` + title 14/400 ink. One dark pill indicator (dark gradient, `raised.dark.sm`) slides behind the active item; its text turns white.

### App sidebar (M, from the hero mock)
220px, `#F6F6F6`, padding 14 10, gap 4. Item 36px, radius 8, padding 0 10, gap 8: 16px icon (stroke 1.7), 13px label (weight estimated as 500), count 13/400 right. Idle text and icon are `#6E6E6E`-toned; active = dark gradient + `raised.dark.sm`, white content. Bottom usage card: radius 10, padding 10, light gradient, `raised.light.sm`; 14/500 title, 13/400 meta, 4px meter.

## Badges, tags, chips (M)

| Component | Size | Padding | Fill / shadow | Text |
|---|---|---|---|---|
| Eyebrow pill | 30 | 4 14 6 12, gap 7 | light gradient / `raised.light.md` | 14px icon (stroke 2) + Label 12/500 uppercase `#3A3A3A` |
| Tag, light | 24 | 3 10 5 | light gradient / `raised.light.sm` | 13/500 `#3A3A3A` |
| Tag, dark | 24 | 3 10 5 | dark gradient / `raised.dark.sm` | 13/500 white |
| Badge, light | 24 | 4 10 6, gap 5 | `#FFF -> #ECECEC` / `badge.light` | 11/500 +0.02em ink |
| Badge, dark | 24 | 4 10 6 | dark gradient / `badge.dark` | 11/500 +0.02em white |
| Check chip | 30 | 4 12 4 5, gap 8 | `#F2F2F2`, no shadow | 20px dark check circle + 13/500 ink |
| Check chip on dark | 30 | same | white 7% / `chip.onDark` | white circle with ink check + white text |
| Check pill | 38 | 4 16 6 8, gap 8 | light gradient / `raised.light.sm` | 22px dark check circle + 14/500 |
| Number chip | 26x20 | - | `#F2F2F2` (white 28% when active) | 11px |
| Status dot | 6px | - | ink (live, pulsing) or `#767676` (idle) | followed by 13px text, gap 6 |
| Avatar stack | 24px | overlap | `0 0 0 2px #FFF` ring | - |

**D: status tag** = light tag with a 6px coloured dot (status solid colour) before the text; or tinted tag (status bg + status text, no gradient, no shadow) for high-attention states. **D: notification count** = 16px dark circle, 10/500 white, on the icon's top-right; cap at "9+".

## Cards (M)

| Card | Radius | Padding | Shadow | Notes |
|---|---|---|---|---|
| Standard (bento) | 22 | 28 | `card` | Well on top, text below, gap 26 |
| Text card | 22 | 30 | `card` | Icon tile top, text bottom (space-between) |
| Framed (use case) | 26 / 18 inner | 8 | `card.frame` + inner `hairline` | Photo with fade + glass note; body padding 0 26 28 |
| Window | 26 / 16 inner | 10 | `window` + inner `hairline` | Contains a full app layout |
| Pricing, light | 22 | 24 | `card` | See pricing section |
| Featured, dark | 22 | 30 24 | `surface.dark` | Radial dark gradient, dot pattern, badge |
| Quote bubble | 20 20 20 6 | 16 18 | `card` | Author row below, gap 12 |
| Accordion item | 18 | see below | `card` | |
| Document | 24 | 52 | card-level | Long-form |
| Dark brand card | 24 | 28 | `surface.dark` variant | Footer |
| Toast (cookie) | 20 | about 20 (estimated) | `toast` | Text + two 38px buttons |

**Well (M):** radius 14, `#F2F2F2`, padding 22, gap 16, no shadow. Holds charts, stats, dot grids. This is the signature "data lives here" container.

**Interactive card (M):** only one hover exists: in the use-case card the glass note slides to `top: 22px`. Cards do not lift, scale or change shadow. **D:** for clickable admin cards, change the shadow from `card` to `card` + `ring.selected` on focus, and nudge the title 3px on hover (the site's link nudge).

**D: KPI card** - see `admin-dashboard-adaptation.md`.

## Forms

### Search field (M, static)
240x36, radius 8, `#F2F2F2`, `inset.well`, padding 0 12, gap 7, 14px search icon (`#6E6E6E`, stroke 1.7), placeholder 13/400 `#767676`.

### Checkbox (M, static)
16px, radius 4, light gradient, `raised.light.sm`. **D:** checked = dark gradient, `raised.dark.sm`, 10px white check (stroke 2); indeterminate = 8x2 white bar.

### Derived form controls (D)
All built from the two measured primitives (recessed field, raised key):

| Control | Spec |
|---|---|
| Text input | 40px in forms (36 in toolbars), radius 8, `#F2F2F2`, `inset.well`, padding 0 12, 14/400 ink, placeholder `#767676`. Hover: fill `#EFEFEF`. Focus: fill white + `ring.selected` (1.5px ink). Invalid: `0 0 0 1.5px #D93A32` + 13px `#B42A23` message. Disabled: 50% opacity |
| Textarea | Same, padding 10 12, min-height 96 |
| Select | Input look + 14px chevron; menu = dropdown panel with 36px rows; selected row has a 14px check on the right |
| Radio | 16px circle, light material; selected = dark material with 6px white dot |
| Switch | Track 36x20 pill, `#ECECEC`, `inset.track`; thumb 16px white circle with `raised.light.sm`. On: track = dark gradient, thumb slides with `spring.ui` |
| Segmented control | Measured, see below; use for 2-4 exclusive options instead of radios |
| Field label | 13/500 ink, 6px above the field |
| Help text | 13/400 `#767676` (on white), 6px below |
| Field group | Fields 16px apart; groups 28px apart; each form section in a card with Heading 4 + Body S header |

## Segmented control / tabs (M)

| Variant | Track | Segment | Selected |
|---|---|---|---|
| App filter | pill, `#F2F2F2`, padding 3, gap 2, `inset.well` | 29px, padding 5 13 7, 13/500; idle text `#6E6E6E` | dark gradient, `raised.dark.sm`, white |
| Page toggle (billing) | pill, white, padding 4, gap 2, `card.sm` | 40px, padding 6 16 8, 14/500 | dark, white text |
| Large tabs | pill, white, padding 5, gap 4, `card` | 44px, equal widths, padding 4 16 6, gap 10, number chip + 13/500 label at 60% opacity | sliding dark indicator; label white; chip white 28% |

The selected pill is a single element that **slides** between positions on `spring.ui`. Counts can sit inside the label ("Running 9"). ARIA: `role="tablist"` / `tab` for views, `role="radiogroup"` for filters.

## Accordion (M)

- List gap 10; max width 760.
- Item: radius 18, white, `card`, `overflow: clip`.
- Header: 70px, padding 20 20 20 24, gap 16; question 17/500 ink; toggle 30px circle, dark gradient, `raised.dark.md`, two 12x2 white bars (radius 1).
- Open: answer height animates on `spring.ui`; vertical bar rotates to form a minus. Body padding 0 72 22 24, 15/400 `#6E6E6E`.
- Hover: question text nudges 3px right.
- A11y: header is a `<button aria-expanded>` controlling a region.

## Table (M)

- No container border, no header background, no zebra.
- Header: 41px, cells padding 11 10, 13/400 `#767676`, sentence case; first column holds a 16px checkbox.
- Row: 60px (two-line), cells padding 11 10, gap 6, vertically centred; divider `::after` 1px `#ECECEC`.
- Cell types: checkbox; round 26px action; two-line identity (14/500 ink + 13/400 status); tag group (gap 6); dot + text; truncated note; numeric.
- Column widths are fixed for utility columns (34, 46, 72) and proportional for content.
- Responsive: columns drop by priority (note and count on tablet; tags and more on phone).
- **D:** hover, selection, sorting, pagination, bulk actions: see `admin-dashboard-adaptation.md`.

## Data visuals (M)

| Visual | Spec |
|---|---|
| Bar comparison | Rows gap 16: label 13px (hero row ink/500, others `#6E6E6E`), track 12px pill `#ECECEC` + `inset.track`, value right 13/500. Hero fill dark gradient + `raised.dark.sm`; others `gradient.mutedFill` at 62% |
| Mini meter | 4px, radius 4, `#ECECEC` track, `#161616` fill |
| Dot grid | 10px dots, gap 7, 14 columns; off `#ECECEC` + `dot.off`; on dark gradient |
| Cell meter | 26px cells, radius 5, gap 4; lit dark, unlit `#ECECEC` + `dot.off`; trailing lit cells fade |
| Stat | 56/500 number + 24/500 unit, baseline-aligned, gap 4 |
| Compare chips | 72x40, radius 10, gap 10; light chips + one dark chip |
| Counters | No count-up animation exists on the site |

## Overlays

- **Dropdown (M):** above.
- **Glass note (M):** radius 12 (small) / 18 (large), white 62%, blur 16 / 18px, `glass` / `glass.lg`, padding 10 12 / 12. Inner rows of the large panel: white, radius 10, padding 10 12, 13px text, value right with a 6px dot.
- **Toast-like banner (M):** 360px card, radius 20, `toast` shadow, fixed bottom-left 16px from edges, enters opacity + transform .6s `ease.out`.
- **Modal, drawer, tooltip, popover, context menu (D):** see `admin-dashboard-adaptation.md`.

## Other

- **Logo ticker (M):** continuous marquee, items padding 0 34, 30% opacity, edge mask 15%. Not for admin.
- **App-icon tile (M):** 56px, radius 15, brand solid, `appIcon` shadow, 26px white icon stroke 2.2, gloss 44x25 at top (radius `12 12 20 20`, white 28% -> 0).
- **Avatar (M):** round 24-34px with 2px white ring; square 40px radius 12 with 3px white ring and soft drop.
- **Empty, loading, error states (D):** see `admin-dashboard-adaptation.md`.
