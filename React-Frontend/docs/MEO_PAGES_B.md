# Meo-inspired design: pages workstream B (18 Nov 2026)

Step 5 of `MEO_DESIGN_PLAN.md` for the Actions area, the Trace and signal components, and six settings pages. Source rules: `MEO_DESIGN_SYSTEM.md` (sections 2, 4, 12 to 14) and the skill. No strings, aria attributes, roles, test ids, routes, hooks or permission checks changed; only layout, classes and markup structure. Marks: **derived** = a choice made here that the skill does not state.

## Files

| Area | Files |
|---|---|
| Actions | `pages/actions/{ActionsLayout,Signals,Corrective,AiInsights,ShopperCases,Investigations}.tsx`, `pages/actions/components/*` |
| Trace and signals | `components/trace/{TraceCard,SignalDetailDialog}.tsx`, `components/signals/{RulesPointer,WhatIfCard}.tsx` |
| Settings pages | `pages/settings/{Rules,EscalationMatrix,Overview,OverviewInsights,MonthlyPack,Voc}.tsx` |
| New (mine) | `actions/components/InlineNote.tsx`, `actions/components/StepPills.tsx`, `settings/StatWell.tsx`, `settings/NpsBar.tsx`, `settings/StackedBars.tsx` |

New pieces: **InlineNote** (a well with a 6px dot, optional title, optional action, `role` and `data-testid` pass-through: replaces every tinted aside), **StepPills** (the skill's stepper: number chip + label, current dark, done = 20px dark check circle, outcome pill dark when effective and tinted only for partial or failed), **StatWell** (a KPI without its card, for a group of numbers on one card), **NpsBar / NpsLegend** (promoters, passives, detractors as ink, light grey and amber, never green and red), **StackedBars** (`RankedBars` with the label above the bar for sentence-long labels).

## Per page

### Actions layout (`ActionsLayout`)
`data-density="dense"` on the root (a page that is a set of operations lists). The step box and the page tabs are the shared `NextBox` and `RouteTabs`, which already follow the system. Gap 20.

### Signals
| Before | Now |
|---|---|
| Blue tinted "Two separate registers" aside | `InlineNote` (well, info dot, ink title, grey text) |
| Three KPI cards with decorative accents (dot per card) | Three dense `KpiTile`s, no `accent`, neutral icon tiles |
| Recharts area with border tooltip, coloured grid | `ChartWell` + `chartAxis/chartGrid/chartArea/ChartTooltip`: ink 2px line, 6% ink area, dark pill tooltip, horizontal gridlines only; ltr wrapper kept for Arabic |
| Four pattern cards (border, red/amber progress, nested bordered "How the AI found this", green evidence box) in a grid inside a card | One card, pattern **rows** divided by `row-divider`: left column (PT tag + heading, threshold meter, suggestion, recovery figure), right column (the fix it has, "How the AI found this" as one well, Create action pill). Meter fill is always ink; nearness to the line is a 6px status dot beside the printed figures. Evidence = `InlineNote` with a success dot. A linked pattern (`?pt=`) = 1.5px ink ring |
| Signals table | Dense `DataTable`: date and signal are the ink cells, ids are grey tags |
| Public mentions (`divide-y`) | `row-divider` rows, tinted status tag only for the breached clock |
| Rules pointer (primary tint), What if (bold current cell) | `InlineNote`-style well; What if: pills, the current setting is the dark pill (selected = dark), others `pill-chip` weight 400 |

Density: **dense**. One dark feature surface: none (the dark pill of the tabs and step box is the view's dark material).

### Corrective actions (fixes)
- KPI row: dense `KpiTile`s, the "Late" tile shows the status dot only when the count is above zero (the one `accent` that means something).
- **One comfortable card per fix** (the `li` is the card, so the next-step box is its first child, a well on top). Header: id and status tags, title at 22px, then a well with owner, product, due (the due hint and the approval-window chip stay). The fold ("Details") is an outline pill.
- Details are dense: `LifecycleStepper` = `StepPills`; `MatrixLine` = a well, each field a white pill (label grey, value ink; text order unchanged); the classification is a well; "How the AI found this" is one well; the audit trail is a plain table on the white card (a divider line only shows on white); the Trace card is a well.
- Employee management note = `InlineNote` (warning dot). Decision, effectiveness and investigation lines are flat rows with status tags.
- Selected fix (`?fix=`): 1.5px ink ring on the card; the title keeps programmatic focus but no ring on a heading.
- Hand-offs block: a dense card whose header is the toggle, plain tables inside.
- Decision dialog: the three or four options are wells, the chosen one is the dark material; the radio stays a visually hidden native input, so the label carries the focus ring.

Density: **dense** page, **comfortable** fix header (set on the `li`), dense details.

### AI Insights
Both explainers are `InlineNote`s. Each insight is a dense card: header, recovery sentence, a well with the case counts as **`RankedBars`** (the recovered series is the dark hero row, low score grey, counts printed), the AI's suggestions as divided rows (progress meter, small-sample dot note, light pill action), the "Send to a case" pill. The red and green two-column Recharts bar chart is gone (derived: with two categories the skill's bar comparison prints the values and has no 62%-grey contrast problem).

### Shopper cases
One dense card per case (a case is a record with its own table). Severity tag, title (heading 4), product tag, owner tag; a well with the two clock tags; the case flow is `StepPills`; the proposed-action table sits on the card without a wrapper line or header fill; "Decide" is a 28px light pill, "Advance" a light pill.

### Investigations
Explainer = `InlineNote`. The thin-evidence list is a divided list on its card. All investigations are **rows on one card** (icon circle, id tag, title, status tag and the Record button on the right, result in a well, evidence and fix links) instead of a two-column card grid. A linked investigation (`?inv=`) = 1.5px ink ring.

### Trace card and signal dialog
Trace card = card -> well -> text: the card is one well; the six columns have no boxes. Each column head is the small step pill ("2 Signal"), the current column dark; ids are white hairline tags (the grey tag would vanish on a well); `aria-current="true"` stays on the current `li`. Signal dialog: the dialog is the card, one row of light tags (only a legal, privacy or safety kind is tinted), the sentence in grey, the Trace well.

### Rules
Each of the six decisions is a `SettingsSection` (heading and note above, one card of divided rows). Derived: **stacked**, not the two-column split, because the Settings menu already takes a third of the width and the right card became 440px. Rows: label (ink 500) + `[Proposed]`, FR source (tabular caption), 36px field + grey unit + Save pill; a read-only role sees ink text and the view-only well. The working week is a full-width row of day pills (label above, pills below) with native checkboxes (`accent-primary`; the unit test reads `.checked`). Decision 4 lists the six principles with ink dots and the Open pill. Density: comfortable.

### Escalation matrix
Dense card with the skill's table (the `table` role stays, 50 `[Proposed]` badges still in it), product filter = `PressFilter` (sliding dark pill, `aria-pressed`, `role="group"` named Product), confirmed note = status dot + caption, "Confirm default" = 28px ghost pill, the three notes as grey captions under the card.

### Overview (CX indicators)
Comfortable, 48px between sections. The eight numbers are **two cards of four `StatWell`s** (card -> well -> text) instead of eight cards; no number coloured, no decorative accent or icon. Per-product indicators: a table on its card (NPS and CSAT ink, numbers tabular), the "no group NPS" tag sits under the title. Product launch: divided rows, switch kept. Lead funnel: `RankedBars` (first stage dark, counts printed). Reputation index: four stat wells and the platform table. NPS by month: `ChartWell` with the first product as the ink hero line, the others grey, blue, amber (`chartColor`), a printed tooltip; **more than four live products switch to small multiples** (one ink line per product with its latest NPS printed). NPS by channel: `PressFilter` for the product (inside the card, above the well, not in the header slot: six product pills squeezed the title), `NpsBar` rows, legend. Heatmap: each cell is a small well with a status dot and the printed value (no tinted cells). Detractor reasons: `StackedBars`.

### Monthly pack
Comfortable. Header actions: Download CSV light, Release dark (unchanged order). Four `KpiTile`s (no accents; the "Late" dot only when above zero), the signal categories as `RankedBars` (first row dark, counts printed; the capitalised label kept), the verification table on its card, "Released" with a success dot.

### Voice of Customer
Comfortable. The per-product summaries are **wells on the page** (product tag and NPS in the head, a row per channel with `NpsBar` and the response count), not a card each; one legend under them. Comments: one card, `PressFilter` for the product (in the card body for the same reason), divided rows with product tag, channel, theme and sentiment tags.

## Derived choices (marked)

| Choice | Why |
|---|---|
| NPS segments ink / light grey / amber | Skill: charts ink + grey, blue and amber up to four categories; green and red are status colours |
| Heatmap cell = well + status dot | "No coloured backgrounds on groups"; the number carries the value |
| Pattern nearness = dot, meter always ink | Colour is categorical, never a fill state; the figures are printed |
| `ring-[1.5px] ring-primary` or `shadow-(--ring-selected)` for a linked record | Selected = ink ring (skill `ring.selected`); the card shadow is kept (ring slot) |
| One card per fix with the step box as its first child | Cuts the repeated card grid; keeps the test that the box is the first child of the `li` |
| Audit trail not in a well | `#ececec` dividers are invisible on `#f2f2f2` |
| Hidden-products row no longer 70% opacity | Opacity on grey text drops below 4.5:1 |

## Shared requests (not done here, local workarounds in place)

1. **`KpiTile variant="well"`**: `StatWell` is the local copy (card-less stat, same counting, bdi and term rules).
2. **`RankedBars` label width or `layout="stacked"`**: its 9rem label column truncates sentence labels; `StackedBars` is the local copy.
3. **One `InlineNote` in `components/common`**: `settings/SubPageHeader.tsx` (workstream C) and `actions/components/InlineNote.tsx` both exist. Mine adds `role`, `data-testid`, an `h2` title and an action; theirs a `tone` and an inline action.
4. **`StepPills` in `components/common`**: number chip + label stepper, used by the fix lifecycle and the case flow; `StepStrip` and the Trace column heads are the same recipe.
5. **`TraceId` on a well**: the grey tag has the well colour, so `TraceCard` overrides it with a white hairline class; a `surface="well"` prop would remove the override.
6. **A named `ring-selected` utility**: pages write `shadow-(--ring-selected)` or `ring-[1.5px] ring-primary`.
7. **`SettingsSection` `actions` slot**: Decision 4's Open pill sits inside the card instead of beside the heading.
8. **`NpsBar`** is a candidate for Customers and Close the loop, which show the same three-way split.

## Known gaps

- The What if card's hint still says "the bold one is the current setting" (copy not changed); the current setting is the dark pill and is also named for screen readers.
- Matrix inputs truncate long titles (about 150px per column) and each cell is three lines (input, tag, Confirm default).
- NPS by channel prints NPS and n but not the three counts (as before); the Voc bars carry them in `aria-label`. Light-grey passives are about 1.9:1 on white: decoration, the NPS is printed.
- The heatmap has no legend for its dot colours (no new strings).
- Each fix repeats the step box (v40 F07 requires it above every fix), which keeps the Corrective page long.
- `RouteTabs` at 390px scrolls sideways (the last tabs are off screen until swiped); the scroll position is not shown by an edge fade (shared component).
- The small-multiples path of NPS by month needs five or more live products; it was checked in the browser by switching the four hidden products live on the Overview (no unit test covers it). A product with no trend data shows an empty well.

## Audit (grep over my files, 18 Nov 2026)

| Pattern | Result |
|---|---|
| `border` | none in code (comments reworded) |
| `font-bold`, `font-semibold`, `font-mono`, `font-light` | none (ids and numbers use `tabular`) |
| `bg-(red\|green\|blue\|amber\|primary\|destructive\|success\|warning\|info\|gold\|muted)/` tints | none |
| `shadow-(xs\|sm\|md\|lg\|xl)`, `hover:shadow`, `hover:-translate` | none |
| `text-(gold\|primary\|info\|success\|warning\|destructive)`, `uppercase`, `tracking-` | none |
| `focus-visible:ring`, `focus:ring` | none (the global ring applies; the fix title only switches the ring off on a non-interactive heading, as `main` does) |
| `rounded-md` / `rounded-lg` | three, none on a control: the two collapsible trigger rows (8px, concentric inside a 14px well or the card) and one skeleton block |
| raw hex | none in classes |

Checks: `npx tsc -b --noEmit` clean for these files; `npm run lint` no warning in them; `npx vitest run src/pages/actions src/components/trace src/components/signals src/pages/settings` 137 of 137; Playwright (`v40-trace`, `passI`, `a11y`, `routes`, `features`) on port 4412: 180 of 180, including the axe scans of every route in both languages and both themes and the dialog scans.
