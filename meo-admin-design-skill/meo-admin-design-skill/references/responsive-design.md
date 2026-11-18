# Responsive design

Measured by rendering the home page at 1912px (desktop), 1000px (tablet) and 390px (phone) and reading the stylesheet's media queries. "Laptop" widths (1200-1440px) use the desktop layout unchanged: the container is capped at 1180px, so only outer margins shrink.

## Breakpoints (measured)

| Name | Range | Media query on the site |
|---|---|---|
| Phone | 0-809px | `(max-width: 809.98px)` |
| Tablet | 810-1199px | `(min-width: 810px) and (max-width: 1199.98px)` |
| Desktop | 1200px and up | `(min-width: 1200px)` |

These are Framer's layout breakpoints; the design switches whole component variants at each one rather than fluidly scaling.

## Typography scaling (measured)

| Style | Desktop | Tablet | Phone |
|---|---|---|---|
| Display | 72 | 56 | 40 |
| Heading 2 | 52 | 42 | 32 |
| Heading 3 | 24 | 22 | 20 |
| Body L | 18 | 17 | 16 |
| Caption, Badge | 11 | 11 | 12 |
| Footer wordmark | 420 | 243 | 120 |
| All other styles | unchanged | unchanged | unchanged |

Only the four largest styles shrink; UI text (13-17px) is constant, and the two smallest styles grow by 1px on phones for legibility.

## Layout changes by section

| Area | Desktop | Tablet (1000px) | Phone (390px) |
|---|---|---|---|
| **Nav** | Logo / link pill / button; padding 22 22 0 | Link pill replaced by a 40px menu button beside the Download button | Same as tablet; padding 12 10 0; nav height 68 |
| **Menu** | Hover dropdown | Menu button opens sheet | Full-screen white sheet, 17/500 items with hairlines, sub-links with 16px icons |
| **Hero** | padding 142 72 40, gap 64; heading on two lines | padding 134 40 40; heading on one line at 56px | padding 108 20 40, gap 44; buttons stack full-width (50px each, gap 12) |
| **App window** | 1120x620, frame pad 10, radii 26/16; sidebar 220 + main | 905x620; **sidebar removed**, search removed, table loses Note and Cookies | 335x452, frame pad 6, radii 18/12; toolbar reduced to the filter; table shows the essentials |
| **Logo rail** | padding 56 0 72 | same | padding 40 0 56, gap 22 |
| **Section padding** | 40 0 96 (first 72 0 96) | same | 24 0 72 (first 56 0 72) |
| **Container** | max 1180, pad 0 72, header gap 48 | pad 0 40 | pad 0 20, header gap 36 |
| **Use-case cards** | 3 columns, gap 20 | 1 column, max 520px, centred | 1 column, full width |
| **Bento** | 6 cols: 4+2, 2+2+2 | 6 cols: full row, then 3+3, 3+3 | 1 column; card padding 28 -> 20 |
| **Feature tabs** | Flex row of 4 labelled tabs; panel = text card 360 + photo 660 side by side | 4-column grid; panel stacks (text card above photo; text card becomes a row-like 201px block) | Tabs shrink to numbers only (78px each); panel stacks; text card padding 24 |
| **Reviews** | Free-floating bubbles around a centred heading | 2-column grid (gap 24), heading on top, bubbles full column width | 1 column, bubbles alternate left/right author |
| **Pricing** | 4 columns | 2 columns | 1 column |
| **FAQ** | 760px column | 760px column | Full width; header 76px |
| **Footer** | Brand card 340 + links card side by side, padding 24 22 0 | Cards stack; brand card becomes a 240px-high banner | Stack; links card padding 24; SEO blurbs to 1 column; link columns stay 3 |

## Patterns to reuse

1. **Switch variants, do not squeeze.** At each breakpoint the component changes structure (sidebar disappears, tabs lose labels, floating layout becomes a grid).
2. **Priority columns.** Tables drop the least important columns first and never scroll horizontally in the reference.
3. **Constant chrome sizes.** Buttons, pills, tags, rows keep their heights at every width; only padding around them changes.
4. **Side padding ladder:** 72 -> 40 -> 20.
5. **Section rhythm ladder:** 96/40 -> 96/40 -> 72/24.
6. **Radii ease down on phones** only for the largest frames (26/16 -> 18/12); cards stay 22.
7. **Stacks go full-width**, including buttons.
8. **Centred single column at tablet** (max 520px) rather than an awkward 2-up of tall cards.

## Phone-specific interactions

- Menu sheet replaces hover menus; the sub-menu is always expanded (no nested taps).
- No hover-dependent content: everything revealed on hover on desktop (dropdown) has an always-visible phone equivalent.
- Floating chat pill and cookie banner remain fixed and overlap content at the bottom.

## Applying this to an admin shell (derived)

| Width | Shell |
|---|---|
| 1200px and up | Sidebar 220px fixed + content. Optional framed shell above 1440px |
| 810-1199px | Sidebar collapses to a 56px icon rail (or hides, as the reference mock does) and opens as an overlay drawer; toolbars wrap search to its own row; tables drop secondary columns; KPI grid 2-up |
| 809px and below | No sidebar; top bar with menu button -> full-screen sheet (measured pattern). KPI cards 1-up; tables become two-line list rows (identity + key status, action on the right); filters move into a sheet; primary action becomes a full-width button or a floating 50px pill |

Use container queries for cards so they adapt to the content area's width (which changes when the sidebar collapses) rather than the viewport's.

```css
:root { --page-x: 72px; }
@media (max-width: 1199.98px) { :root { --page-x: 40px; } }
@media (max-width: 809.98px)  { :root { --page-x: 20px; } }
```
