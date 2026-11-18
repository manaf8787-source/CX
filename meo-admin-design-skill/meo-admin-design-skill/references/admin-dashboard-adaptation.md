# Admin dashboard adaptation

How to carry the reference's design language into an information-dense SaaS admin interface. The reference provides a direct seed: its hero contains a miniature admin screen (sidebar, top bar, toolbar, table) and its `/terms` page has a sticky side nav with a sliding indicator. Values taken from those are **measured**; everything else is **derived** from the same materials and marked (D).

## Translation principles

| Marketing site | Admin dashboard |
|---|---|
| 96px section rhythm, centred headers | 24-32px page rhythm, left-aligned headers |
| Cards as showcases | Cards as containers of real data; keep the card -> well -> text structure |
| Display type up to 72px | Page title 24px; largest number 44px |
| Ambient motion | State motion only |
| One CTA per section | One primary action per page header / dialog |
| Hover-first menus | Click and keyboard first |
| Decorative fades and masks | None on data |

Keep unchanged: palette, two materials, shadow stacks, radius ladder, type family/weights/tracking, pill controls, dark = selected, wells.

## Density modes (D)

| | Comfortable | Dense |
|---|---|---|
| Use for | Overview, settings | Tables, operations views |
| Card padding | 28 | 20 |
| Card radius | 22 | 18 |
| Well padding / radius | 22 / 14 | 16 / 12 |
| Table row | 60 (two-line) | 44 (single-line) |
| Control height | 36-40 | 32-36 |
| KPI value | 44px | 32px (-0.04em) |
| Grid gap | 16 | 12 |

## 1. Layout

### Application shell
- Grid: `220px 1fr`; right side is `60px auto 1fr` (top bar, optional page header, scrolling content).
- Page is white; sidebar is `#F6F6F6`. No divider line: the tone change is the edge. (measured)
- **Framed variant (D)** for viewports wider than about 1440px: page background `#F6F6F6`, the app inside a frame card (radius 26, padding 10, `window` shadow) with the inner surface radius 16 and `hairline`. Mirrors the hero mock.
- Content padding: 24px (dense) to 32px; max content width 1320px for reading-heavy pages, fluid for tables.

### Sidebar (measured base)
- Width 220, padding 14 10, item gap 4.
- Brand row: 20px mark + 17/500 name, padding 4 8 14.
- Item: 36px, radius 8, padding 0 10, gap 8, 16px icon stroke 1.7, label, optional count right-aligned (13/400).
- Active: dark gradient + `raised.dark.sm`, white label/icon/count. Set `aria-current="page"`.
- Hover (D): fill `rgba(0,0,0,.04)`, text ink.
- Group label (D): Label style (12/500 uppercase), `#6E6E6E`, padding 14 10 6.
- Nested items (D): indent 26px, 32px high, no icon; active child uses ink text + 500 weight and a 6px ink dot, not a second dark pill.
- Bottom: usage/plan card (radius 10, padding 10, light gradient, `raised.light.sm`, 4px meter). (measured)
- Sliding indicator: animate the dark pill between items with `spring.ui` (measured on the document side nav).

### Collapsible sidebar (D)
- Collapsed width 56: items become 36px squares (radius 8), icon centred; labels become tooltips; counts become a 6px dot.
- Toggle: 26px light round icon button at the top or as a rail edge handle. Width animates on `spring.ui`; persist the state.

### Top navigation (measured base)
- Height 60, padding 0 18, gap 10; white; bottom edge = 1px `#ECECEC` only when content scrolls beneath (D).
- Left: workspace selector. Right: status ("Synced just now", 14px icon + 13/400), search trigger, notifications, user menu.

### Workspace selector
- Trigger (measured look): 30px round avatar + name 14/500 + meta 13/400 `#767676`; add a 14px chevron (D).
- Menu: dropdown panel (radius 16, padding 6); rows 10 padding, radius 10, avatar + two-line text; current workspace shows a 14px check; footer row "Create workspace" with a plus icon.

### Breadcrumbs (D)
13/400 `#767676` links separated by a 12px chevron (`#767676`); current page 13/500 ink. Hover: ink + no underline. Sits above the page title with a 6px gap, or inside the top bar on dense pages.

### Page header
- Title: Heading 3 (24/500, -0.03em). Optional description Body S (13/400, `#6E6E6E`). (styles measured)
- Right side: secondary pill(s) then one primary pill, 36px, gap 8. (measured sizes)
- Below (optional): segmented view switcher, 16px gap.

### User profile menu (D)
Trigger: 30px round avatar with 2px white ring. Menu: header row (name 14/500, email 13/400), separator, 36px rows with 16px icons, separator, "Sign out".

### Notifications (D)
Trigger: 36px light round icon button with a 16px bell; unread = 6px ink dot (or a 16px dark count). Panel: popover 360px, radius 16; items = 16px icon or avatar + two-line text + time (12/400 `#767676`); unread rows have a 6px ink dot on the left; header has a segmented "All / Unread".

### Quick actions / command palette (D)
Top-bar field styled as the search field (36px, radius 8, well) with a right-aligned key hint as a light tag ("Ctrl K"). Palette: centred card 560px, radius 22, `toast` shadow, input row 52px without a well (17/400), grouped rows 40px radius 10 with hover `#F2F2F2`; active row shows a light tag "Enter".

## 2. Dashboard

### KPI card (D, composed from measured parts)
```
[label 13/500 #6E6E6E]                    [tag: +4.2%]
[value 44/500 -0.05em] [unit 24/500 #767676]
[well r14 #F2F2F2: mono sparkline / bar / cells, 64-96px]
[caption 11-13px #767676]
```
- Card radius 22, padding 28 (20 dense), `card` shadow, gap 16-26.
- Delta: light tag with a 12px arrow icon; add a status dot only if direction matters (green up / red down); text stays ink.
- KPI row: 4-up at desktop, 2-up tablet, 1-up phone; gap 16.
- One KPI may be the dark feature card (radial dark gradient, white text, white-7% chips) to anchor the row. At most one.

### Statistics
Stat pattern (measured): large number + smaller unit on the baseline, 4px gap. Use `tabular-nums`. Never colour the number.

### Charts (D, following the measured bar visuals)
| Element | Spec |
|---|---|
| Container | Inside a well (radius 14, `#F2F2F2`, padding 22) inside a card |
| Primary series | Dark gradient (`#3A3A3A -> #0A0A0A`); lines 2px ink, round joins |
| Secondary series | `#767676` at 62% or `gradient.mutedFill`; lines 1.5px `#767676`, optional 4 4 dash |
| Bars | Fully rounded ends (pill), 12px thick in lists; in column charts radius 6 top |
| Tracks | `#ECECEC` with `inset.track` |
| Gridlines | 1px `#ECECEC`, horizontal only; no axis lines |
| Axis labels | 11-12px `#6E6E6E` (on wells) |
| Area fill | `rgba(10,10,10,.06)` flat; no colour gradients |
| Categories | Up to four: ink, `#767676`, then brand blue and amber. Beyond four, use small multiples |
| Tooltip | Dark pill/card: dark gradient, radius 10, padding 8 10, 12/500 white, values tabular |
| Legend | 6px dots + 13/400 text, gap 6, items gap 14 |
| Points | 6px ink dot with a 2px white ring on hover |

### Activity feed (D)
Rows gap 14: 24px round avatar (or 26px light circle with 11px icon), text 13/400 `#6E6E6E` with actor and object in 13/500 ink, time 12/400 `#767676` right. Group by day with a Label-style heading. Connect items with nothing (no timeline line).

### Recent records
Use the table at dense size inside a card with padding 8 and inner radius 14, or a list of two-line rows (14/500 + 13/400) with a right-aligned tag and 1px `#ECECEC` dividers.

### Quick actions
Row of light pill buttons (36px) with 14px icons; or 2x2 tiles: card radius 18, padding 16, 56px brand app-icon tile + 14/500 title + 13/400 description. This is the one place the coloured tiles belong.

### Data summaries
Bar-comparison list (measured): label, 12px track, value. Hero row dark, the rest muted.

## 3. Data management

### Data table (measured base)
- Header 41px, 13/400 `#767676`, sentence case, no fill. Cell padding 11 10. Row 60 (two-line) or 44 (D). Divider 1px `#ECECEC`.
- Identity cell: 14/500 ink + 13/400 status line.
- Selection column 34px with 16px checkbox; action column 46px.
- (D) Row hover: `#F6F6F6` with radius 10 applied to the row background (inset 4px from the table edges) so it reads as a soft pill; row actions fade in on hover and are always visible on touch.
- (D) Selected row: `#F2F2F2` fill; checkbox dark.
- (D) Sticky header: white with a 1px `#ECECEC` bottom line once scrolled.
- (D) Numeric columns right-aligned, `tabular-nums`, 13/500 ink.
- Wrap the table in a card (radius 22, padding 0 16) or let it sit directly on the page; never add an outer border.

### Sorting (D)
Header button: text + 12px chevron-up/down, visible on hover or when sorted. Sorted column header turns ink 13/500. `aria-sort` on the `th`.

### Filters and search
- **Quick filter:** segmented control with counts ("All 24 / Running 9 / Paused 15"). (measured)
- **Search:** inset field, 240px, 36px. (measured)
- **Applied filters (D):** row of light tags with a 12px close icon ("Status: Running x"), then a ghost "Clear all".
- **Advanced filtering (D):** popover (radius 16, padding 12) with rows of `[field select] [operator select] [value input] [remove icon]`, each control 36px; footer: ghost "Add filter", primary "Apply".

### Column visibility (D)
Light icon button (sliders icon) -> dropdown with 36px rows: checkbox + label, drag handle on hover.

### Export actions
Secondary pill "Export" with a download icon; menu lists formats as compact rows.

### Pagination (D)
Left: "1-25 of 240" 13/400 `#6E6E6E`. Right: page-size select (36px well) and a segmented-style pager: light 32px round buttons for prev/next (12px chevrons), page numbers as 32px circles, current = dark circle. For large sets prefer "Load more" as a secondary pill.

### Row actions (D)
One 26-28px light round icon button (ellipsis) -> compact dropdown. Frequent single actions can be a 26px round button like the measured play/pause control (light = off, dark = on).

### Bulk actions (D)
When rows are selected, a floating bar appears bottom-centre: dark gradient pill, radius 999, height 48, padding 6 6 6 18, `button.primary` shadow; "3 selected" 13/500 white; actions as white-7% chips with white text; close as a 30px round button. Enters with the toast transition.

### Status indicators
1. Dot + text (measured): ink pulsing = active/live; `#767676` = idle.
2. Tags (measured): light = neutral category; dark = emphasised.
3. Coloured dot + ink text (D): success / warning / error / info solids.
4. Tinted tag (D): only for states needing action (failed, overdue).

## 4. Forms

- **Layout:** single column, max 640px; or two-column settings layout: left 260px (Heading 4 + Body S description), right card with fields. Sections 48px apart.
- **Fields:** see `component-library.md` (derived form controls). Label 13/500 above; help 13/400 below; 16px between fields.
- **Input groups:** join controls inside one well (radius 8) separated by 1px `#ECECEC` dividers; prefixes/suffixes in 13/400 `#6E6E6E`.
- **Sections:** each in a card (radius 22, padding 28), or flat with a 1px `#ECECEC` divider and 28px spacing on dense pages.
- **Multi-step:** stepper = the large tabs pattern (number chip + label; dark sliding indicator for the current step); completed steps show a 20px dark check circle instead of the number. Not clickable ahead of progress.
- **Validation:** on blur and on submit. Invalid field: 1.5px `#D93A32` ring + 13px `#B42A23` message with a 12px alert icon; summary toast for server errors. Success needs no colour: show a "Saved" status (dot + text) near the actions.
- **Save and cancel:** right-aligned at the form's end: ghost or secondary "Cancel", primary "Save". For long forms use a sticky bottom bar: white, 1px `#ECECEC` top line, padding 12 24. Unsaved state: "Unsaved changes" with an ink dot on the left of the bar.

## 5. Interaction

| Pattern | Spec |
|---|---|
| **Dialog (D)** | Centred card, width 440-560, radius 22, padding 28, `toast` shadow, scrim `rgba(0,0,0,.32)`. Title Heading 4, body Body M, footer right-aligned buttons (46px), gap 8. Enter: opacity + scale .98 -> 1, 400ms `ease.out` |
| **Confirmation (D)** | Same card, 400px. Destructive: primary button stays dark with an explicit verb ("Delete 3 profiles"); a 30px circle with a 14px alert icon in `#D93A32` sits above the title. Require typing the name only for irreversible bulk actions |
| **Drawer (D)** | Floats 10px from the top, right and bottom edges; width 420-560; radius 24; white; `toast` shadow; header 60px with title + round close; footer bar as in forms. Slides in 600ms `ease.out` |
| **Dropdown (M)** | Radius 16, padding 6, `popover` shadow; rows radius 10 |
| **Context menu (D)** | Same as compact dropdown; opens at the pointer; 36px rows |
| **Tabs (M)** | Segmented pill with sliding dark indicator. Page-level tabs: white track + `card.sm`; in-card tabs: `#F2F2F2` track + `inset.well` |
| **Popover (D)** | Radius 16, padding 12-16, `popover` shadow; no arrow |
| **Tooltip (D)** | Dark gradient, radius 8, padding 5 9 6, 12/500 white, `raised.dark.sm`; 400ms delay; no arrow |
| **Toast (M base)** | Card radius 20, `toast` shadow, bottom-left 16px inset, 360px; 16px icon or status dot + 14/500 title + 13/400 text + optional light pill action; .6s `ease.out`; stack with 8px gap |
| **Inline notification (D)** | Well (radius 14, `#F2F2F2`, padding 14 16) with a 6px status dot, text, and a ghost action. No coloured banners |
| **Loading (D)** | Buttons: 14px spinner replaces the icon. Regions: skeletons. Global: 2px ink progress line under the top bar |

## 6. Advanced admin experience

### Empty states (D)
Inside the content card: a well (radius 14, 160-200px high) showing a faint motif built from the reference's data visuals (dot grid with a few lit dots, or unlit cell row), then Heading 4, Body M (max 420px), one primary button and an optional ghost link. Centre-aligned. No illustrations of people or objects.

### Error states (D)
Same layout; the motif is a 30px light circle with a 14px alert icon. Title states what failed, body states what to do, primary "Try again", ghost "Contact support". Field- and row-level errors use the tinted error tag.

### Skeleton loading (D)
Blocks in `#F2F2F2` with the radius of what they replace (pills for tags, radius 6 for text lines at 60-80% width, circles for avatars). Opacity pulse .6 <-> 1, 1.2s, `ease.inOut`. Keep table header, card frames and wells real; skeletonise only data.

### Permission-based UI (D)
- Hidden when the user should not know it exists; otherwise shown **disabled** (40% opacity) with a tooltip explaining the required role.
- Read-only fields: remove the well (plain text on white) rather than greying the input.
- Role tags: light tag (Viewer, Editor), dark tag (Owner).
- Locked sections: a 12px lock icon beside the section title, `#767676`.

### Responsive navigation
See `responsive-design.md` (admin shell table): 220px sidebar -> 56px rail or overlay -> full-screen sheet.

### Dense information layouts
- Prefer wells and spacing over additional cards: one card can hold several wells in a grid (gap 12).
- Use two-line cells to halve column count.
- Use segmented controls with counts instead of separate filter + summary.
- Keep 13px as the working size; 11px only for badges and chart notes.
- Maintain at least 16px between unrelated groups even in dense mode.

### Keyboard accessibility (D)
- Visible focus on everything: `box-shadow: 0 0 0 2px #FFF, 0 0 0 4px #0A0A0A` (append to existing shadows).
- Skip link to main content; sidebar is a `nav` landmark; top bar is `header`.
- Roving tabindex in segmented controls, tabs, menus and the pager; arrow keys move, Enter/Space activates.
- Tables: row checkboxes reachable by Tab; Shift+click / Shift+Space for ranges; row menu via the actions button, not right-click only.
- Dialogs and drawers trap focus and restore it on close; Esc closes; scrim click closes non-destructive dialogs.
- Command palette on Ctrl/Cmd+K; shortcuts shown as light tags.
- Do not open menus on hover in the admin.

## Keeping the identity while staying usable

1. If a screen looks generic, check for borders, coloured actives or rectangular buttons first.
2. If a screen looks too soft or low-contrast, add ink: make names and values `#0A0A0A` 500, and ensure one dark element per cluster.
3. If a screen feels heavy, remove cards (use wells or dividers) before shrinking text.
4. Never trade the focus ring, contrast minimums or hit sizes for visual purity.
