# Spacing, layout, shape and depth

Sources of truth: `../tokens/spacing.json`, `radii.json`, `shadows.json`. All values measured unless marked.

## Spacing method

The site does not follow a strict 4pt or 8pt grid. It uses **optical spacing in 2px steps**, with odd-looking values (5, 7, 9, 11, 13, 22, 26) where needed to centre text or balance a pill. Treat the list below as the allowed set.

### Scale

`2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 40, 48, 56, 64, 72, 96` px

### Most-used flex gaps on the home page

| Gap | Count | Typical use |
|---|---|---|
| 6px | 57 | Icon + text in small rows, tag groups, status dot + label |
| 8px | 53 | Sidebar item content, chip content, toolbar items, lists of chips |
| 10px | 23 | Button groups in nav, avatar + name, FAQ list |
| 1px | 19 | Two-line text pairs (title over meta) |
| 9px | 15 | Button icon + label, logo mark + wordmark |
| 16px | 14 | Bar zones, card grids, well contents |
| 4px | 9 | Sidebar list, value + unit |
| 12px | 8 | Hero button pair, bubble + author |
| 18px | 7 | Eyebrow -> title -> intro |
| 48px | 5 | Section header -> body |
| 22-26px | 8 | Inside cards (well -> text) |

### Vertical rhythm

| Level | Value |
|---|---|
| Section to section | 96px bottom + 40px top = 136px between bodies (phone: 72 + 24) |
| Section header to body | 48px (phone 36px) |
| Eyebrow / title / intro | 18px |
| Card: visual to text | 26px (22px in use-case cards) |
| Card: title to description | 8-10px |
| List of chips / FAQ items | 8-10px |
| Two-line label | 1-2px |

## Containers and grids

| Element | Desktop | Tablet (810-1199) | Phone (<=809) |
|---|---|---|---|
| Page margin (nav, footer) | 22px | 22px | 10px (nav), 20px (footer) |
| Nav bar max width | 1440px | fluid | fluid |
| Container max width | 1180px | fluid | fluid |
| Container side padding | 72px | 40px | 20px |
| Content width | 1036px | viewport - 80 | viewport - 40 |
| Hero copy / intro max | 860px / 540px | same | fluid |
| FAQ column | 760px | 760px | fluid |
| Document | 260px nav + 796px card | - | - |

| Grid | Columns and gap |
|---|---|
| Use-case cards | 3 x 332px, gap 20 |
| Bento | 6 columns, gap 16; spans 4+2 / 2+2+2 |
| Feature panel | 360px text card + 660px media, gap 16 |
| Pricing | 4 x 247px, gap 16 |
| Footer | 340px brand card + fluid links card, gap 14; link columns 3, gap 20 |

**Alignment:** marketing headers are centred; everything inside cards and the app mock is left-aligned. Numbers in the table sit in a narrow right-hand column.

## Component metrics

| Component | Height | Padding | Gap | Radius |
|---|---|---|---|---|
| Button xl (hero) | 50 | 4 22 6 | 9 | 999 |
| Button lg (form/card) | 46 | 4 22 6 | 9 | 999 |
| Button md (nav) | 40 | 4 22 6 | 9 | 999 |
| Button sm (toolbar) | 36 | 4 14 6 | 6 | 999 |
| Ghost button | 46 | 4 14 6 | 9 | 999 |
| Nav link | 40 | 7 14 9 | 5 | 999 |
| Eyebrow pill | 30 | 4 14 6 12 | 7 | 999 |
| Tag | 24 | 3 10 5 | - | 999 |
| Badge | 24 | 4 10 6 | 5 | 999 |
| Check chip | 30 | 4 12 4 5 | 8 | 999 |
| Check pill (large) | 38 | 4 16 6 8 | 8 | 999 |
| Segment (app) | 29 in a 35 track | 5 13 7 | 2 | 999 |
| Segment (page) | 40 in a 48 track | 6 16 8 | 2 | 999 |
| Tab (large) | 44 in a 54 track | 4 16 6 | 10 | 999 |
| Search field | 36 | 0 12 | 7 | 8 |
| Sidebar item | 36 | 0 10 | 8 | 8 |
| Side-nav item (document) | 40 | 11 12 | 10 | 999 |
| Table cell | - | 11 10 | 6 | - |
| Dropdown row | 59 | 10 | 12 | 10 |
| Accordion header | 70 | 20 20 20 24 | 16 | 18 (item) |
| Card | - | 28 | 26 | 22 |
| Well | - | 22 | 16 | 14 |
| Frame card | - | 8 or 10 | - | 26 outer / 18 or 16 inner |

Note the **asymmetric vertical padding** (top 4, bottom 6; top 3, bottom 5; top 7, bottom 9): the label sits 1px above geometric centre, which reads as centred for this typeface.

## Radius system

| Token | Value | Use | Avoid |
|---|---|---|---|
| `xs` | 4px | Checkbox, thin meters | Anything larger than 20px |
| `sm` | 5px | 26px cells | |
| `md` | 8px | Sidebar items, inputs | Buttons |
| `lg` | 10px | Menu rows, small inner cards, compare chips | Page-level cards |
| `xl` | 12px | Small glass note, 40px square avatars | |
| `2xl` | 14px | Wells | Outer cards |
| `icon` | 15px | 56px icon tile | |
| `3xl` | 16px | Popovers, inner app window | |
| `4xl` | 18px | Inner card in a frame, accordion items | |
| `5xl` | 20px | Side-nav card, toast, bubbles | |
| `card` | 22px | Standard cards | Small controls |
| `cardLg` | 24px | Large page cards | |
| `frame` | 26px | Outer frame | Unframed cards |
| `pill` | 999px | All buttons, tags, chips, segments, dots | Inputs, cards |

**Concentric rule:** inner radius = outer radius - padding. 26 - 8 = 18; 26 - 10 = 16; 22 card with 22 padding -> well 14 (visually concentric at that distance). **Bubble rule:** one corner tightened to 6px to point at the speaker.

## Borders

There are none. Verified by scanning every element: no non-zero border widths. Equivalents:

| Need | Technique |
|---|---|
| Card edge | `0 0 0 1px rgba(0,0,0,.04)` as part of the shadow stack |
| Row divider | `::after` with `border-bottom: 1px solid #ECECEC` (the only literal line) |
| Selected outline | `0 0 0 1.5px #0A0A0A` |
| Avatar separation | `0 0 0 2px #FFF` ring |
| Input edge | none; recessed fill + inner shadow |

## Depth model

Three elevations of light surface, one recess, plus the dark material.

| Level | Token | Look | Use |
|---|---|---|---|
| -1 Recess | `inset.well`, `inset.track` | `#F2F2F2`/`#ECECEC` fill, inner top shadow, 1px white lip below | Inputs, segmented tracks, progress tracks |
| 0 Flat | none or `hairline` | White or `#F6F6F6` | Page, sidebar, inner frame |
| 1 Key | `raised.light.sm` / `raised.dark.sm` | Gradient + inner highlight + 3-5px drops | Tags, small buttons, selected items |
| 2 Control | `button.secondary` / `button.primary`, `raised.light.md` | Drops out to 14-22px | Buttons, floating nav pill |
| 3 Card | `card`, `card.frame` | Ring + drops out to 30-48px, all 4% | Cards, accordion, bubbles |
| 4 Overlay | `popover`, `toast`, `floating`, `window` | Six layers, last one 4-12% | Menus, toasts, floating pills, hero window |

Shadow construction rules:

1. Start light surfaces with `inset 0 1px 1px #FFF` (top highlight).
2. Add `0 0 0 1px rgba(0,0,0,.04)` if the surface sits on the same colour.
3. Add drops at roughly doubling offsets; blur about 1.3x the offset; keep each at 4%.
4. Dark surfaces: `inset 0 1px 1px rgba(255,255,255,.28)`, `inset 0 -2px 3px rgba(0,0,0,.5)`, drops at 12%.
5. Never use a single large dark shadow, coloured shadow, or spread > 1px.

## Glass, gradients, overlays

- **Glass** (`rgba(255,255,255,.62)` + `backdrop-filter: blur(16px)` or `18px`) appears only on notes placed over photos. Do not use it for navigation, cards or dialogs.
- **Masks** fade decorative content: radial mask on hero line art; linear mask on the logo rail edges (outer 15%), on the featured card's dot pattern (gone by 55%), and on the mock table's bottom.
- **Dark surface gradient** is radial from the top so the top edge looks lit.
- No blurred colour blobs, no mesh gradients, no noise textures.
