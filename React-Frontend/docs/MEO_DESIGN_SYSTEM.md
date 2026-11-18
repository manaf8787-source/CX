# Design system: Meo-inspired (binding for every page)

Status: step 1 and 2 of `MEO_DESIGN_PLAN.md` (18 Nov 2026), tokens and primitives. Source: `meo-admin-design-skill/` (SKILL.md, `references/`, `tokens/`). A design language only: no Meo name, logo, photos or copy.
Marks: **measured** = from the skill's reference site, **derived** = added by us (dark theme, density, status text shades, field ring, destructive dialog, collapsed rail). It supersedes `DESIGN_SYSTEM.md` sections 2 (tokens), 3 (type, radius) and the colour parts of 5 and 6; the rest of that file (RTL, motion code, sign-in, adding components) still holds.

## 1. Files

| File | What |
|---|---|
| `src/styles/theme.css` | Every token (light `:root`, derived `.dark`), the Tailwind `@theme`, `@utility` classes, base type and focus rules, component classes, motion, reduced motion |
| `src/styles/fonts.css`, `public/fonts/` | Plus Jakarta Sans 400/500 (latin, latin-ext) and IBM Plex Sans Arabic 400/500, self-hosted |
| `src/components/ui/*` | Primitives, restyled in place (same exports and props). New: `checkbox`, `radio-group`, `segmented`, `motion.ts`, `use-sliding-indicator.ts` |
| `src/components/ui/ui.test.tsx` | Unit tests of the new behaviour: label roll, loading, density, selection controls, RTL arrow keys |

Font: `@fontsource/plus-jakarta-sans` **5.3.0** (published 19 Jul 2026), pinned in `devDependencies`; the four woff2 files are copied unchanged into `public/fonts/` (see the header of `fonts.css` to update). Removed: IBM Plex Sans (Latin, 4 weights), IBM Plex Sans Arabic 600 and 700, IBM Plex Mono: about 150 KB less than before. `font-synthesis: none`, so a stray `font-bold` cannot fake a weight.

## 2. Rules (the skill's, as applied here)

| # | Rule |
|---|---|
| 1 | **No borders.** Edges are shadow rings and stacks (`shadow-hairline`, `shadow-card` ...). The only line is the row divider (`row-divider`, 1px `#ececec`, `::after`). Nothing in `ui/*` declares a CSS `border`; grep `border` before you merge |
| 2 | **Two materials.** `material-light` (default raised: key, tag, secondary button, thumb) and `material-dark` (emphasis: selected, primary). Flat fills only for page (`bg-background`), sidebar (`bg-sidebar`) and wells (`bg-well`) |
| 3 | **Selected = dark.** Active nav item, selected segment or tab, checked box, primary action: `material-dark` with `text-primary-foreground`, plus `aria-current` / `aria-selected` / `aria-pressed`. Never a coloured highlight or a left bar |
| 4 | **Pills for controls, big radii for containers.** Buttons, tags, chips, segments `rounded-full`; cards `rounded-card` (22) or 18 dense; wells `rounded-well` (14); inputs and sidebar items 8; popovers 16; frame 26 outside, 18 inside |
| 5 | **Weights 400 and 500 only**, enforced: `font-semibold`, `font-bold` and the rest resolve to 500, `light` to 400. Never all-caps except `label-style` |
| 6 | **One dark feature card per view at most** (`<Card variant="dark">`), never alternating dark and light cards |
| 7 | **Colour is categorical.** Hues appear only in icon tiles (`icon-tile`), status tags and dots (`Badge` status variants, `dot-*`), the six product dots (`bg-product-*`) and up to four chart categories. Never on buttons, links, KPI numbers, borders or backgrounds |
| 8 | **Prose is `text-muted-foreground`** (#6E6E6E). Ink (`text-foreground`) is for names, values and headings. `text-ink-tertiary` (#767676) only on pure white (4.54:1); on a well, the sidebar, a tint or a hovered row it is 4.06:1, so use `text-muted-foreground` |
| 9 | **One spring for state, one curve for entrances** (`ease-spring` 400 ms, `ease-out`). Reveals 400 ms, y 12, first paint of a page only, never on refresh, sort or filter |
| 10 | **Density is chosen per page**: comfortable (card 28, row 60, KPI 44) for Home, Overview, settings, forms; dense (card 20, row 44, KPI 32) for tables and operations pages |

## 3. Tokens

CSS variables live in `theme.css`; the Tailwind names are in the right column. Never write a raw hex in a component.

| Group | Tokens (light, measured unless marked) | Tailwind |
|---|---|---|
| Surfaces | `--surface` #fff page, `--surface-soft` #f6f6f6 sidebar, `--surface-well` #f2f2f2 wells, inputs, tracks | `bg-background` `bg-card` `bg-sidebar` `bg-well` `bg-soft` |
| Ink | `--ink` #0a0a0a, `--ink-charcoal` #3a3a3a (label), `--ink-secondary` #6e6e6e, `--ink-tertiary` #767676, `--line` #ececec | `text-foreground` `text-muted-foreground` `text-ink-tertiary` `bg-line` |
| shadcn names | `--primary` = ink, `--primary-foreground` = text on the dark material, `--secondary` `--muted` `--accent` = well, `--border` = line, `--ring` = ink, `--input` = field ring colour | unchanged |
| Brand | `--brand-accent*` is ink today: **the one place to put the real PSI colour** [Proposed]. `--brand-gold*` are the old names, aliased | `bg-brand-accent` `bg-gold` (alias) |
| Status (derived) | solid for dots and chart marks, text shade for words, tint for the tag: success #1f9d55 / #14713c / #eaf6ef, info #1f6fe0 / #195dbe / #eaf1fc, warning #f08a1c / #9b5306 / #fdf1e3, error #d93a32 / #b42a23 / #fcedec, accent #7c3aed / #6a2fd0 / #f1ebfd | `text-success-text` `bg-success-bg` `text-danger-text` `bg-danger-bg` ... |
| Product hues | `--p-re` `--p-af` `--p-cl` `--p-to` `--p-ev` `--p-wl` [Proposed]: dots and icon tiles only | `bg-product-re` ... |
| Charts | `--chart-1` ink (hero series), `-2` #767676, `-3` brand blue, `-4` amber, `-5` #b8b8b8. Beyond four categories: small multiples or a ranked list | `chart-1` .. `chart-5` |
| Gradients | `--grad-light`, `--grad-dark`, `--grad-dark-button`, `--grad-dark-surface`, `--grad-badge-light`, `--grad-muted-fill` (use at 62% opacity), `--grad-shine` | `bg-grad-light` `bg-grad-dark` ... |
| Radius | 4 xs, 5 sm, 8 md, 10 lg, 12 xl, 14 well, 15 icon, 16 pop, 18 inner, 20 panel, 22 card, 24 card-lg, 26 frame, 999 pill | `rounded-xs` ... `rounded-well` `rounded-pop` `rounded-card` `rounded-frame` `rounded-pill` |
| Shadow | `hairline`, `raised-light`(`-md`), `raised-dark`(`-md`), `button-primary`, `button-secondary`, `card`, `card-frame`, `card-sm`, `window`, `popover`, `floating`, `toast`, `inset-well`, `inset-track`, `dot-off`, `glass`, `surface-dark`, `app-icon`, `badge-light`, `badge-dark`; `field` and `field-invalid` (derived, section 7). Legacy `shadow-xs/sm/md/lg/xl` map to hairline / card-sm / popover-like stacks | `shadow-card` etc. |
| Rings | `--ring-selected` (1.5px ink), `--ring-focus` (2px gap + 2px ink, derived), `--ring-field`, `--ring-invalid` | `ring-focus` is automatic (section 7) |
| Type (desktop) | 11 badge / caption, 12 meta and label, 13 body S and cells, 14 UI and inputs (page default), 15 body M and large buttons, 17 heading 4, 22 card title, 24 page title, 32 dense KPI, 44 KPI; tracking -0.005em at 13 down to -0.05em at 44, +0.02em at 11 | `text-2xs` `text-xs` `text-sm` `text-base` `text-lg` `text-xl` `text-2xl` `text-3xl` `text-4xl` `text-5xl`; classes `t-page-title` `t-card-title` `t-h4` `t-kpi` `t-unit` `t-body-m` `t-ui` `t-ui-strong` `t-body-s` `t-small-strong` `t-badge` `t-caption` `t-muted` |
| Motion | `--spring-css` 400 ms `cubic-bezier(.34,1.3,.64,1)` (stand-in for spring(.4, bounce .2), estimated), `--ease-out` `(.22,1,.36,1)`, `--ease-in-out` `(.45,0,.55,1)`; `SPRING_UI` for `motion` in `ui/motion.ts` | `ease-spring` `ease-out` `ease-in-out` `duration-400` |
| Layout | `--sidebar-w` 220, `--sidebar-w-icon` 56, `--topbar-h` 60, `--control-h` 36, `--page-x` 72 / 40 / 20 | breakpoints `tablet:` (810) and `desktop:` (1200) beside the stock ones |
| Density | `--card-pad` `--card-radius` `--card-gap` `--card-title-size` `--well-pad` `--well-radius` `--row-h` `--kpi-size` `--grid-gap`, switched by `data-density="dense\|comfortable"` on any ancestor (derived) | `p-(--card-pad)` `h-(--row-h)` |

## 4. Classes pages must use

| Class | Use |
|---|---|
| `material-light`, `material-dark` | The two materials. Take variants: `data-[state=active]:material-dark`. Do not combine with a `shadow-*` class |
| `surface-card`, `surface-frame` + `surface-frame-inner`, `surface-dark` | Card (shadow-card, radius and padding from the density tokens), 26/18 frame, the one dark feature card. Prefer `<Card>`; inside `surface-dark` the normal text classes still work (tokens are remapped) |
| `well` | Where data lives: chart, stat, dot grid. Radius 14 (12 dense), padding 22 (16 dense), no shadow. `<CardWell>` adds the card side margins. `well-field` is a recessed field (search, track) |
| `hairline` | A 1px 4% shadow ring on something that sits on its own colour |
| `row-divider` | The only line: put it on a row or list item; the last child has none. `row-divider-none` removes it |
| `pill` + `pill-light` `pill-dark` `pill-chip` `pill-success` `pill-info` `pill-warning` `pill-error` `pill-accent` | Tags, chips: 24px, optical padding. `<Badge>` is the 11px version |
| `dot`, `dot-live`, `dot-success` `dot-info` `dot-warning` `dot-error` | 6px status dot. `dot-live` pulses 1 to .3 (off under reduced motion): always write the state in words next to it |
| `icon-tile` | The 56px app-icon tile, the one place brand hues are solid (`bg-product-re`, `bg-(--brand-blue)`) |
| `label-style` | 12px, 500, +0.04em, uppercase in Latin only (no case, no tracking in Arabic). Group headings, eyebrows |
| `tabular` | `tabular-nums`: numbers in tables, KPIs, ids. Use it instead of `font-mono` for ids (there is no mono webfont; `font-mono` is the system stack, for real code) |
| `dot-grid` | Faint dot motif for the well of an empty state |
| `scrim` | The overlay colour (`rgba(0,0,0,.32)`, .6 dark) |
| `bg-grad-*`, `shadow-*`, `rounded-*`, `ease-spring` | Gradient, shadow and radius tokens as utilities |

## 5. Primitives (`components/ui`)

| Component | What changed (old props still work) |
|---|---|
| Button | Pill. `default` = dark gradient with the exact primary stack, `padding: 4px 22px 6px`, 15/500; `outline` and `secondary` = light pill; `ghost` = tint on hover; `link`; `destructive` and `gold` render the dark pill (a destructive action keeps the dark button and says its verb). Sizes `sm` 36, `default` 40, `lg` 46, `xs` 28 and four `icon-*` circles (36, 40, 30, 26). `loading` prop: 14px spinner, `aria-busy`, disabled. **Label roll**: only plain-text children (one text run, icons around it), not `link`, `xs` or icon sizes; the copy comes from CSS (`attr(data-label) / ""`), so the DOM and the accessible name hold the label once; off under reduced motion |
| Badge | 24px, 11/500. `default` dark, `secondary` light, `outline`, `ghost`, `link`; new status tints `success` `warning` `info` `accent`, `destructive` is the error tint. `dot="live\|idle\|success\|warning\|error\|info"` |
| Card | `variant="default\|dark\|frame"`, `density="comfortable\|dense"`; `CardWell` new; `CardTitle` is `t-card-title` (22 or 17) |
| Input, Textarea, Select | Well + inset shadow, radius 8, 40px (`h-9` in toolbars), hover `#efefef`, focus white + focus ring, invalid = 1.5px `#d93a32` ring (`aria-invalid`) + `FieldError` with a 12px alert icon. Placeholder is `#6e6e6e` (the skill's #767676 is 4.06:1 on the well) |
| Checkbox, RadioGroup | New. 16px, light material; checked = dark material + check / dot. Native inputs may use `accent-primary` |
| Switch | 36x20, track `#ececec` + inset track, thumb on the spring, on = dark material; `size="sm"` 28x16 |
| Tabs | Segmented pill track (well + inset shadow); ONE `material-dark` pill slides to the selected trigger on the spring, measured in physical coordinates so it is right in RTL; before the first measurement the selected trigger paints the material itself. `variant="page"` (or old `line`) = white track, 40px segments |
| Segmented | New, for filters and views of the same data: `role="radiogroup"`, counts, arrows mirrored in RTL |
| Table | `density="dense\|comfortable"` (default dense: header 41, rows 44 or 60). No outer border, no header fill, header 13px grey sentence case, divider `row-divider`, hover and `data-state="selected"` become soft pills, `aria-sort` turns the header ink. Cells default to `text-muted-foreground`: mark the primary cell `text-foreground font-medium` and numbers `tabular text-end` |
| Dialog | Radius 24, padding 28, `shadow-toast`, scrim, opacity + scale .98 to 1 over 400 ms; `DialogAlertIcon` for destructive confirmations; title is heading 4 |
| Sheet | Floating drawer: 10px from the edges, radius 24, slides 600 ms |
| DropdownMenu, Select, Popover, Command | Radius 16, padding 6, `shadow-popover`, rows 36px radius 10, hover `#f2f2f2`, chevrons mirror in RTL; Command is a 560px palette (no close button) |
| Tooltip | Dark pill 12/500, no arrow, 400 ms delay |
| Sonner | Radius-20 card, `shadow-toast`, bottom-left (bottom-right in Arabic), status colour on the icon only, action = dark pill |
| Progress | 12px track `#ececec` + inset track, dark fill; the fill is a flat colour + gloss, so `[&>[data-slot=progress-indicator]]:bg-destructive` still recolours it. Callers must pass `aria-label` |
| Skeleton | `#f2f2f2` block, opacity pulse .6 to 1 over 1.2 s (`.cx-shimmer` is now this pulse), no shimmer |
| Sidebar primitive | 220px, rail 56px, item 36px radius 8, grey idle, hover tint, **active = `material-dark` with `text-sidebar-accent-foreground`**, group label = `label-style`, nested items 32px with a 6px ink dot, no divider lines. `--sidebar-accent-foreground` is the text on the selected pill (white), `--sidebar-accent` the light hover tint |
| Breadcrumb, Avatar, Separator, Field, Label, ScrollArea, Collapsible | Skill sizes; no borders anywhere |

## 6. Arabic and RTL

| Rule | How |
|---|---|
| Font | Plus Jakarta Sans has no Arabic glyphs. One stack for both languages: `'Plus Jakarta Sans', 'IBM Plex Sans Arabic', system`. Latin letters and digits come from Plus Jakarta Sans, Arabic letters from IBM Plex Sans Arabic (its `unicode-range` is Arabic only). 400 and 500 in both |
| Tracking | Negative tracking breaks Arabic letter joining. Every tracking value is `calc(Xem * var(--track))`, `--track` is 1 and becomes 0 under `html:lang(ar)` and `html[dir=rtl]`; a base rule also forces `letter-spacing: 0 !important` on everything in Arabic or RTL, even for a stray `tracking-wide` |
| Label style | Same size and weight, no uppercase, no tracking in Arabic |
| Mirroring | Logical utilities (`ps-`, `end-`, `rounded-s-`); chevrons carry `rtl:rotate-180`; the sliding indicator uses physical `left` + `offsetLeft`; the switch thumb and progress fill flip; toast and drawer swap sides; arrow keys in `Segmented` swap. Shadows are symmetric, so nothing else needs mirroring |

## 7. Accessibility

| Item | Value |
|---|---|
| **Field ring exception (derived)** | The skill draws no input edge. WCAG 1.4.11 needs 3:1 for the boundary of a form field, so **form fields only** (`Input`, `Textarea`, `Select` trigger; `invalid`) get `shadow-field`: the skill's inset well plus `0 0 0 1px rgba(10,10,10,.45)` (3.16:1 on white, 3.10:1 on `#f2f2f2`; dark theme `rgba(245,245,245,.45)`, 4.2:1). A shadow, not a CSS border. Cards and tables follow the skill exactly |
| Focus | One rule in `theme.css`: every `:focus-visible` element gets `--ring-focus` (2px gap + 2px ink, 19.8:1) **appended to its existing shadows** through Tailwind's ring slot, plus a transparent outline for forced-colors. Menus, popovers, dialogs and drawers show no ring on the container, their items keep theirs. Do not add `focus-visible:ring-*` classes |
| Contrast (computed) | Light: ink on white 19.8; #6e6e6e on white 5.10, on #f2f2f2 4.55, on #f6f6f6 4.72; #767676 on white 4.54 only. Status text on its tint 5.19 to 6.16 and on white 5.78 to 7.17; the legacy `bg-<status>/12` tints over a well stay at or above 4.5 because the text shades are the skill's darkened up to 8%. Dark: ink on page 18.2; secondary on well 7.2; tertiary on well 5.3; status text on tint 8.0 to 9.4 |
| Targets | Controls 36px and up; icon buttons 36/30/26 (the 26px one is for dense table actions only); checkbox and radio are 16px inside a clickable label |
| Reduced motion | Loops off (live dot, drift, orbit, pulse, spinner stops), transforms off, transitions keep only opacity and colour at 150 ms, overlays fade in 150 ms instead of scaling or sliding, the label roll is removed |
| State | Selection is a tone, so `aria-selected`, `aria-checked`, `aria-current`, `aria-pressed` are always set (Radix and the sidebar do it) |

## 8. Dark theme (derived)

The same two materials inverted, switched by the existing `.dark` class and the light/dark switch. `material-light` is the default raised surface (`#1a1a1a` to `#111`), `material-dark` is the emphasis material and is **light** here (`#fff` to `#d4d4d4`) with ink text, so "selected = dark" becomes "selected = the inverted material". `--on-dark` is the text on it (ink in dark).

| Token | Dark | | Token | Dark |
|---|---|---|---|---|
| page | #0a0a0a | | ink / secondary / tertiary | #f5f5f5 / #a8a8a8 / #8f8f8f |
| card | #121212 | | line | #262626 |
| popover | #161616 | | row hover / selected | #1a1a1a / #212121 |
| sidebar | #101010 | | shadow edge | rgba(255,255,255,.08) |
| well | #1c1c1c | | scrim | rgba(0,0,0,.6) |

Status tints are dark mixes (`#0f2a1d` success, `#0f1d33` info, `#2b1d0c` warning, `#2e1412` error, `#1f1736` accent) with light text shades. All shadow stacks are built from `--sh-*` colour variables, so every `shadow-*` utility re-colours.

## 9. Where this follows the plan and where it could not follow the skill

| Item | Decision |
|---|---|
| Plus Jakarta Sans for Arabic | Impossible (no glyphs): Arabic uses IBM Plex Sans Arabic; Latin and digits stay Jakarta |
| Hover label roll with an `aria-hidden` duplicate | Done with a CSS-generated copy instead (`content: attr(data-label) / ""`): same visual, but the DOM has one label, so `getByText`, tests and accessible names do not change. Browsers without alt-text support get no roll |
| Input and placeholder colours | Skill: placeholder #767676. Used #6e6e6e (4.55:1 on the well) |
| Table header, help text, breadcrumb, sidebar count | Skill: #767676 (tertiary). Used #6e6e6e where the text can sit on a well or a tint; #767676 stays a token for pure white |
| Tooltip | "Dark pill": radius 14, so one line is a pill and a long one is a rounded box |
| Toast position | Bottom-left as in the skill. Over the 220px sidebar the toast covers the role switch for 4 seconds; the shell step may add an offset |
| Brand | Navy and gold are gone; ink replaces them; `--brand-accent*` is the swap point |
| `font-mono` | No mono webfont. Existing `font-mono` uses fall back to the system mono stack until the page steps move ids to `tabular` |
| Tab focus ring after a mouse click | Radix Tabs triggers match `:focus-visible` after a click in Chromium; the ring is the system ring, so it shows. Native buttons, switches, checkboxes and `Segmented` do not |

## 10. Hand-off to steps 3 to 5

Shell: use `Sidebar*` primitives as they are (active pill, rail, group label), `useSlidingIndicator` for the sliding pill, `Segmented` for filters; pass `aria-label` to every `Progress`. Common components: `StatusBadge` should become `Badge` variants or `pill-*`; `RouteTabs` should use the `TabsList` look (and `useSlidingIndicator`); `TraceId`, emails and codes: `tabular` instead of `font-mono`. Pages: drop `border` classes and repeated cards (use `CardWell`, `row-divider`), set `density`, keep strings and logic untouched.
