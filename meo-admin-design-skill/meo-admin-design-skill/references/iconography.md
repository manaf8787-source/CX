# Iconography and graphic language

## Icon system (measured)

30 distinct inline SVG icons were found on the home page. All share one construction:

| Property | Value |
|---|---|
| Grid / viewBox | `0 0 24 24` |
| Style | Outline only: `fill: transparent`, stroked paths |
| Stroke caps / joins | `round` / `round` |
| Stroke width | Set by a CSS variable per instance: **1.7** (most icons), **2** (eyebrow-pill icons and 24px logo-rail icons), **2.2** (26px icons inside coloured tiles) |
| Stroke colour | CSS variable per instance: `#6E6E6E` idle, `#0A0A0A` active, `#FFFFFF` on dark, `#767676` once |
| Corner style | Small rounded corners (1-2 units), circles and straight segments; no tapered or calligraphic strokes |
| Live area | About 18-20 units inside the 24 grid (2-3 unit padding) |

Stroke width is defined in viewBox units, so the rendered weight scales with size: a 1.7 stroke at 16px renders about 1.13px; at 12px about 0.85px; 2.2 at 26px about 2.4px. The intent is **hairline-light icons in UI chrome and bolder icons only inside coloured tiles.**

### Sizes and counts

| Rendered size | Stroke | Colour | Where |
|---|---|---|---|
| 11px | 1.7 | ink or white | Play / pause in 26px round row buttons |
| 12px | 1.7 | white (17 instances), ink | Check marks in 20-22px circles, plus/arrow in small buttons |
| 14px | 1.7-2 | `#6E6E6E`, ink | Search, sync, toolbar button icons, eyebrow-pill icons, chevron |
| 16px | 1.7 | `#6E6E6E`, white, ink | Sidebar items, button icons, phone sub-links |
| 20px | 1.7 | `#6E6E6E` | Dropdown rows |
| 24px | 2 | ink at 30% opacity | Logo rail |
| 26px | 2.2 | white | App-icon tiles |

### Library

The geometry (megaphone, store front, briefcase, sparkle, layers, speech bubble, tag, globe, users, fingerprint, grid, sliders, search, zap, plus, play, pause, check, chevron, arrows, download) matches the **Lucide** set's construction (24 grid, 2px default stroke, round caps). The SVGs are inlined by Framer without library metadata, so this is an inference, not a confirmed source. **Recommendation:** use `lucide-react` with `strokeWidth={1.7}` (or 2 / 2.2 per the table) and `absoluteStrokeWidth={false}`.

### Icon containers

| Container | Spec |
|---|---|
| None | Icons in chrome sit bare beside text with a 6-9px gap |
| Dark circle | 20-22px (check), 26px (row action), 30px (toggle): dark gradient + raised dark shadow, white 11-12px icon |
| Light circle | 26px row action idle: light gradient + raised light shadow, ink icon |
| App-icon tile | 56px, radius 15, solid brand colour, layered shadow, gloss overlay, 26px white icon |

There are **no** tinted-square icon containers (the common "pastel square with coloured icon" pattern). Do not introduce them.

### Alignment

- Icon and label are centre-aligned in a flex row; the label's asymmetric padding (bottom +2px) applies to the whole control, so icons sit 1px high along with the text.
- Leading icons in pills reduce the left padding by 2px (`4px 14px 6px 12px`) to balance the optical weight.
- In two-line dropdown rows the 20px icon aligns to the top line, not the block centre.

### Brand glyphs

Social links use 16px **filled** brand glyphs rendered through CSS masks (so they take the text colour at 60% opacity). Filled glyphs are used only for third-party logos.

### Motion on icons

- Chevron flips 180 degrees when its menu opens.
- Accordion plus -> minus (one bar rotates).
- Sync icon rotates continuously (4s, linear).
- Play <-> pause swap in the row action when a row is live (light circle -> dark circle).
- No icon-specific hover animations.

### Status indicators

- 6px round dot: ink + opacity pulse (1 -> .3, .9-1s, ease-in-out, mirrored) = live; `#767676` static = idle.
- Dark check circle = included / enabled.
- Dark vs light row-action circle = running vs stopped.

## Rules for new icons

1. Draw on a 24 grid, outline only, round caps and joins, no fills.
2. Use stroke 1.7 at 11-20px in chrome, 2 at 14px inside eyebrow pills and at 24px, 2.2 at 26px inside tiles.
3. Keep geometry simple: circles, rounded rectangles, straight lines; corner radius 1-2 units; at most 3-4 paths.
4. Colour by state only: `#6E6E6E` idle, `#0A0A0A` active or important, white on dark. Never brand colours for chrome icons.
5. Do not mix filled and outline icons. Filled is reserved for third-party brand marks.
6. Do not place icons in tinted squares. Either bare, in a raised circle, or (rarely) in a solid coloured tile.
7. One icon per control; no decorative icon pairs.

## Graphic language beyond icons (measured)

| Element | Treatment |
|---|---|
| **Product mock** | A complete app window built from live components (not a screenshot) in a double frame (26 / 16 radius). The bottom fades out with a mask |
| **Photography** | Calm natural landscapes (valley, forest, mountain, waterfall), `object-fit: cover`, clipped to radius 18-22. Always paired with a white fade or a glass note; slow 8s zoom to 1.08 |
| **People** | Small avatars only (24-40px), round with a white ring or square with radius 12 |
| **Line art** | One faint SVG of thin lines behind the hero, radially masked |
| **Dot pattern** | An SVG dot texture inside the dark featured card, masked to fade by 55% height |
| **Giant wordmark** | Footer wordmark at 420px filled with a 4%-black to transparent gradient, cropped by the page edge |
| **Data motifs** | Bars, dot grids, battery cells, chips inside `#F2F2F2` wells: the main "illustration" style |
| **Customer logos** | Outline icon + wordmark in ink at 30% opacity |
| **Device frames** | None. The app window has no traffic lights, title bar or device bezel |
| **Image masks** | Radial and linear gradient masks for soft edges; no shaped masks |

### Visual storytelling technique

Each claim is paired with a **miniature working UI** that proves it (a memory chart for "lighter", a dot grid for "fingerprint", a status row for "proxy"). For admin work this becomes: every summary card should contain a real micro-visual of its data in a well, not an icon and a number alone.

## What not to copy

The Meo logo mark, wordmark, the fictional customer names and icons, portrait photos and landscape photos are the reference's own assets. See `../assets/reference-assets.md`.
