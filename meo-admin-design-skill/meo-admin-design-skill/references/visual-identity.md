# Visual identity and design philosophy

## Identity in five traits

1. **Monochrome ink on white.** One near-black (`#0A0A0A`), five greys, white. Colour is a rare accent.
2. **Tactile, top-lit surfaces.** Every raised element has a 1px inner highlight on its top edge and soft stacked shadows below, as if lit from directly above. Light keys and dark keys are the same object in two materials.
3. **Pills and soft boxes.** Controls are capsules; containers are generously rounded rectangles that nest concentrically.
4. **Quiet, confident type.** One family, medium weight, tight tracking, short lines. No bold, no italics, almost no capitals.
5. **Product as illustration.** Instead of abstract artwork, the page shows miniature UI: a working app window, bar charts, dot grids, meters, chips. Photography appears only as calm landscapes behind frosted glass.

## Why it feels premium

- **Restraint in palette** makes the few accents (four app-icon colours, one dark card per section) carry weight.
- **Shadow craft.** No shadow layer is darker than 4% black on light surfaces; depth comes from stacking 4-6 layers at increasing offsets (1, 3-4, 7-9, 12-16, 30-48px). The result is depth without visible "shadow".
- **No borders.** A 1px ring at 4% black is nearly invisible but keeps white cards legible on white. Hard 1px grey borders would flatten everything.
- **Optical corrections** show care: pill padding is 2px heavier at the bottom (`4px 22px 6px`), icon stroke weight changes with icon size, radii shrink by exactly the padding when nested.
- **Consistent metaphors.** "Selected" always looks the same (a dark key). "Recessed" always looks the same (a `#F2F2F2` well with an inner shadow). The eye learns the system in seconds.
- **Motion with one personality.** A single spring and a single ease-out curve; nothing snaps, nothing drags.

## How hierarchy is built

| Lever | How it is used |
|---|---|
| Tone | Ink for titles and values, `#6E6E6E` for prose, `#767676` for meta. Three steps, never more in one block |
| Size | Big jumps between levels (72 -> 52 -> 24 -> 17 -> 15 -> 13), so levels never blur |
| Weight | 500 = "this is a name/label/value"; 400 = "this is a sentence" |
| Tracking | Tighter as size grows (-0.01em at 14px to -0.05em at 44-56px) |
| Material | Dark = primary/selected; light raised = available; well = container for data |
| Space | Sections 96px apart; header to content 48px; inside cards 26px; text pairs 8px |

## Whitespace vs density

Marketing sections are airy (96px rhythm), but the miniature UI inside them is dense: 13px text, 36px controls, 60px rows, 6-10px gaps. The site therefore already demonstrates the system at product density, which is why it translates to an admin tool. The rule: **be generous between groups, tight within groups.**

## Contrast strategy

- Maximum contrast is reserved for a few elements: headings, primary button, selected states, one dark card.
- Everything else lives between white and `#F2F2F2`: differences of 3-5% lightness, separated by shadow rather than fill.
- Dark surfaces get lighter chips (white 7%) and a white badge, mirroring the light surface logic.

## Why components feel lightweight

- No outlines, no header bands, no zebra stripes, no dividers between cards.
- Tables have a text-only header and hairline dividers.
- Icons are thin outline strokes in grey.
- Controls are low (36-40px) with small text (13-15px).

## Minimal without feeling empty

Emptiness is avoided by filling cards with small, precise data visuals (bars, dots, cells, chips) placed in wells, and by subtle ambient motion (a pulsing dot, twinkling grid, drifting bubbles). There is always something specific to look at, never decorative blobs or gradients.

## Design principles

1. **Material over outline.** Define elements by surface and light, not by lines.
2. **One accent at a time.** Per view: one primary button, one dark surface, a few colour tiles.
3. **Selection is weight, not colour.** Dark fill means "this one".
4. **Group tight, separate wide.**
5. **Show the data as the decoration.**
6. **Every value is optical.** Adjust by eye in 2px steps; nest radii; balance padding.
7. **Motion confirms, never performs** (in product UI: state changes yes, ambient loops no).

## Do

- Use white as the default canvas and reserve `#F6F6F6` / `#F2F2F2` for sidebars and wells.
- Stack shadows from the tokens; keep every light-surface layer at 4% black.
- Keep text lines short: intros max ~540px, documents ~690px.
- Use medium weight for names, labels, values; regular for sentences.
- Put one dark element in a cluster to anchor it (a selected tab, a primary button, a check circle).

## Don't

- Add colour to make things "pop". Use the dark material or more space.
- Draw borders, header bands, or table grids.
- Use heavy or coloured shadows, glows, or blurred colour blobs.
- Mix corner radii arbitrarily or square off controls.
- Use bold weights, wide tracking on body text, or uppercase headings.
- Add glass effects anywhere other than over photographs.

### Good vs bad

- **Good KPI card:** white card, radius 22, soft stack shadow; grey well containing a mono bar chart; 22px medium title; 15px grey description.
- **Bad KPI card:** white card with a 1px grey border and 8px radius; coloured icon in a tinted square; green "+12%" text; line chart in brand blue with gradient fill.
- **Good toolbar:** inset grey segmented filter with a dark selected segment, inset search field, light pill and dark pill buttons, all 36px.
- **Bad toolbar:** underlined tabs, outlined input, rectangular blue button, icon buttons with grey borders.

## Brand boundary

The Meo name, the leaf-like logo mark, the wordmark, the fictional customer logos, the people photos and the landscape photos belong to the reference. Derivative work must use its own brand, imagery and copy.
