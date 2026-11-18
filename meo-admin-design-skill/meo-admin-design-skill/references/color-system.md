# Colour system

Source of truth: `../tokens/colors.json`. Names come from the site's own style guide. Hex values were read from the live stylesheet's CSS variables and confirmed against computed styles. Contrast ratios were computed (WCAG 2.x).

## Core palette (measured)

| Token | Style-guide name | HEX | RGB | HSL | Contrast on white | Use |
|---|---|---|---|---|---|---|
| `surface.background` | Surface / Background | `#FFFFFF` | 255, 255, 255 | 0, 0%, 100% | 1.00 | Page, cards |
| `surface.soft` | Surface / Soft | `#F6F6F6` | 246, 246, 246 | 0, 0%, 96% | 1.08 | Sidebar fill; bottom stop of the light gradient |
| `surface.well` | Surface / Well | `#F2F2F2` | 242, 242, 242 | 0, 0%, 95% | 1.12 | Wells, inputs, segmented tracks, chips |
| `ink.primary` | Ink / Primary | `#0A0A0A` | 10, 10, 10 | 0, 0%, 4% | 19.80 | Headings, strong text, dark gradient end |
| `ink.graphite` | Ink / Graphite | `#161616` | 22, 22, 22 | 0, 0%, 9% | 18.10 | Dark gradient mid stop, meter fill |
| `ink.charcoal` | Ink / Charcoal | `#3A3A3A` | 58, 58, 58 | 0, 0%, 23% | 11.37 | Dark gradient start, eyebrow text, lead text |
| `ink.secondary` | Ink / Secondary | `#6E6E6E` | 110, 110, 110 | 0, 0%, 43% | 5.10 | Body copy, descriptions, idle icons |
| `ink.tertiary` | Ink / Tertiary | `#767676` | 118, 118, 118 | 0, 0%, 46% | 4.54 | Meta, table header, counts, idle dot |
| `line.default` | Line / Default | `#ECECEC` | 236, 236, 236 | 0, 0%, 93% | 1.18 | Row dividers, tracks, unlit cells |
| `brand.green` | Brand / App Green | `#1F9D55` | 31, 157, 85 | 146, 67%, 37% | 3.49 | Icon tile |
| `brand.blue` | Brand / App Blue | `#1F6FE0` | 31, 111, 224 | 215, 76%, 50% | 4.76 | Icon tile |
| `brand.violet` | Brand / App Violet | `#7C3AED` | 124, 58, 237 | 262, 83%, 58% | 5.70 | Icon tile |
| `brand.amber` | Brand / App Amber | `#F08A1C` | 240, 138, 28 | 31, 88%, 53% | 2.51 | Icon tile |

## Effects (measured)

| Token | Style-guide name | Value | Use |
|---|---|---|---|
| `effect.highlight` | Highlight | `rgba(255,255,255,.28)` | Inner top highlight on dark surfaces; gloss on icon tiles; active number chip |
| `effect.glass` | Glass | `rgba(255,255,255,.62)` | Glass note fill (with 16-18px backdrop blur); also muted text on dark |
| `effect.tint` | Tint | `rgba(255,255,255,.07)` | Chip fill on dark surfaces |
| `effect.innerShade` | Inner Shade | `rgba(0,0,0,.5)` | Inner bottom shade on dark raised surfaces |
| `effect.shadowDark` | Shadow Dark | `rgba(0,0,0,.12)` | Drop layers under dark surfaces |
| `effect.softShade` | Soft Shade | `rgba(0,0,0,.04)` | Every light-surface shadow layer and the hairline ring |

## Gradients (measured)

| Token | Value | Use |
|---|---|---|
| `gradient.light` | `linear-gradient(180deg, #FFF, #F6F6F6)` | Light raised controls (47 instances on the home page) |
| `gradient.dark` | `linear-gradient(180deg, #3A3A3A, #0A0A0A)` | Dark raised controls (68 instances) |
| `gradient.darkButton` | `linear-gradient(180deg, #3A3A3A 0%, #161616 55%, #0A0A0A 100%)` | Primary button |
| `gradient.darkSurface` | `radial-gradient(120% 80% at 50% 0%, #3A3A3A, #161616 55%, #0A0A0A)` | Featured card, footer brand card |
| `gradient.badgeLight` | `linear-gradient(180deg, #FFF, #ECECEC)` | Light badge on dark |
| `gradient.mutedFill` | `linear-gradient(180deg, #ECECEC, #767676)` at 62% opacity | Non-hero chart bars |
| `gradient.photoFade` | `linear-gradient(180deg, transparent 45%, #FFF)` | Photo-to-card blend |
| `gradient.shine` | `linear-gradient(180deg, rgba(255,255,255,.28), transparent)` | Icon tile gloss |

## Usage frequency (home page, computed)

Text colours: ink 173 nodes, `#767676` 41, `#6E6E6E` 39, white 34, `#3A3A3A` 17. Fills: `#ECECEC` 124 (mostly dots and tracks), white 57, `#F2F2F2` 23, ink 10. The page is roughly 95% neutral.

## What the reference does not have

| Requested role | Finding |
|---|---|
| Success / warning / error / info colours | **None.** State is shown with an ink dot (pulsing = live) or a grey dot (idle) plus text |
| Hover colour | None for buttons. Hover is motion (label roll) or opacity (60% -> 100%). Dropdown rows get a soft grey fill |
| Focus colour | None defined |
| Overlay / scrim | A `rgba(0,0,0,.5)` variable exists; no modal was observed |
| Dark mode | None |
| Border colour | No borders exist; the "border" is `rgba(0,0,0,.04)` as a 1px shadow ring |

## Semantic tokens for admin (derived unless noted)

| Role | Value | Note |
|---|---|---|
| `bg.page` / `bg.card` | `#FFFFFF` | measured |
| `bg.sidebar` | `#F6F6F6` | measured (app mock) |
| `bg.well`, `bg.input` | `#F2F2F2` | measured |
| `bg.row-hover` | `#F6F6F6` | derived |
| `bg.row-selected` | `#F2F2F2` | derived |
| `text.primary / secondary / muted` | `#0A0A0A / #6E6E6E / #767676` | measured |
| `text.on-dark`, `text.on-dark-muted` | `#FFFFFF`, `rgba(255,255,255,.62)` | measured |
| `border.hairline` | `rgba(0,0,0,.04)` ring | measured |
| `border.divider` | `#ECECEC` | measured |
| `focus.ring` | `0 0 0 2px #FFF, 0 0 0 4px #0A0A0A` | derived |
| `scrim` | `rgba(0,0,0,.32)` | derived |

### Status (derived text and background shades)

| Status | Solid | Text | Tint bg | Text on white | Text on tint |
|---|---|---|---|---|---|
| Success | `#1F9D55` (measured) | `#157A40` | `#EAF6EF` | 5.40 | 4.87 |
| Info | `#1F6FE0` (measured) | `#1A5FC2` | `#EAF1FC` | 6.07 | 5.34 |
| Warning | `#F08A1C` (measured) | `#A85A06` | `#FDF1E3` | 5.08 | 4.57 |
| Error | `#D93A32` | `#B42A23` | `#FCEDEC` | 6.37 | 5.60 |
| Accent | `#7C3AED` (measured) | `#6A2FD0` | `#F1EBFD` | 7.17 | 6.16 |

Rules: prefer the neutral dot + text pattern first. Use a coloured dot (solid) with ink text when colour helps scanning. Use tinted tags sparingly; never colour whole rows, cards or buttons. Destructive buttons use the dark material with explicit wording; reserve red for the confirmation dialog's emphasis text or icon.

## Contrast notes

- `#767676` passes AA on white (4.54) but **fails on `#F2F2F2` (4.06) and `#F6F6F6` (4.20)**: on wells and the sidebar use `#6E6E6E` (4.55 / 4.72) for text under 18px.
- White on the dark gradient is 11.4-19.8:1.
- Solid green and amber fail as text on white; use the text shades above.
- Logo-rail items at 30% opacity are decorative and should not be copied for meaningful content.

## When not to use

- Do not use brand hues for charts' primary series, links, focus, or selection.
- Do not introduce additional greys; the five inks and three surfaces are sufficient.
- Do not tint surfaces (no blue-grey, no warm grey): all neutrals have 0% saturation.
