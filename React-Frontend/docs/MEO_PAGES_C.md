# Meo-inspired design: pages C (settings and reference, Surveys) (18 Nov 2026)

Step 5 of `MEO_DESIGN_PLAN.md`, workstream C. Composition only: every string, aria attribute, role, test id, route, hook and permission check is unchanged. Rules used: `MEO_DESIGN_SYSTEM.md` sections 2, 4, 12, 13, 14 and the skill's `admin-dashboard-adaptation.md` sections 3 to 6.

Files: `src/pages/settings/{AccessMatrix, AdminSettings, AiInsightsAccess, CrmMapping, Feeds, Glossary, HrTeamPerf, Ld, MysteryShopper, PublicMentions, SettingsLayout, Standards, StandardsRegister, SubPageHeader, SurveyQuestions, SurveysReference, TeamsStructure, WeeklySample}.tsx` and `src/pages/Surveys.tsx`. No test file needed a change (116 unit tests in `settings` and `components/common` pass unchanged).

## 1. Helpers added to `SubPageHeader.tsx` (a file this workstream owns; other settings pages may import them)

| Export | What it is |
|---|---|
| `SubPageHeader` | Sub-page h2 at 22px / 500, 13px grey description, actions on the right (same props) |
| `ViewOnlyNotice` | Inline notification well (role="note", neutral eye icon, ink text), not a tinted banner |
| `InlineNote` | The skill's inline notification: well, 6px status dot (`tone`), optional ink title, grey text, optional action |
| `SettingsSection` | The skill's two-column settings pattern: left 260px Heading 4 + Body S description, right card; sections 48px apart. Switches on the page's width (container query: put `@container` on the page root), not the window's, because the settings menu takes a third of the page. `layout="stacked"` for a wide card, `table` for a card that holds a table, `term` for the "?" |
| `PressFilter` | Filter made of `aria-pressed` buttons in a `role="group"`, drawn as the skill's segmented control (well track, ONE dark pill that slides on the spring, counts). It is not `ui/Segmented` because the pages and the e2e/unit tests address these as buttons ("To read", "Over 48 h", "العربية") |
| `CountTile` | A count that filters (the register status tiles): a well, pressed = the dark material, `aria-pressed` |
| `IN_CARD` | Padding for a table that sits directly in a card: card padding minus the 10px cell padding, so cell text lines up with the card title and the hover pill reaches 10px (dense) or 18px (comfortable) from the card edge |

## 2. Per page

Density: **D** dense (card 20, row 44, KPI 32), **C** comfortable (card 28, row 60, KPI 44). `data-density` is on each page root; a `Table` takes `density="comfortable"` where the page is comfortable (the table container sets its own density, default dense).

| Page | D/C | What changed |
|---|---|---|
| `SettingsLayout` | C | The side nav is the skill's side-nav card (radius 20, padding 8, 36px items) with ONE dark pill that slides on the spring (`useSlidingIndicator`, physical coordinates, right in RTL); no gold left bar, no border. Max height with its own scroll so all 20 items are reachable at 900px. Under 1024px the select is unchanged (border/`bg-card` override removed) |
| `AdminSettings` | C | Three `SettingsSection`s 48px apart: Product launch (rows with `row-divider`, status tag + switch), HR pool (table), Notices and digests (stacked, full-width card because the matrix is wide). Read-only roles see plain text and the view-only note (unchanged rule: CX manager edits). Section icons dropped (decoration) |
| `AiInsightsAccess`, `AccessMatrix` | D | Cells are told apart by symbol and name, not hue: full and approves = dark material, own/view/informed = light material, none = grey dash. Group headings are `label-style`; rows are `row-divider` with hover pill; sticky first column keeps an opaque fill that follows the hover tone; legend is plain items, no pills with borders |
| `CrmMapping` | D | Tabs = segmented track with the count inside (`tabular`, inherits the pill's colour), one card per tab holding the table; read-only roles see the value as plain 500 text; Confirm is an `xs` outline pill |
| `Feeds` | D | Table in one card; the late row is marked by its tinted "Late" tag only (the row tint is gone); numbers `tabular` |
| `Glossary` | C | One card with the whole list (term 14/500 left, definition grey right, `row-divider`) instead of a grid of 40 bordered cards; inset search field |
| `HrTeamPerf` | C | KPI tiles lose their decorative `accent`; only "Late or at risk" shows a dot when it is above zero; table in a card |
| `Ld` | C | Four KPI tiles without accents; every list is `row-divider` rows (60px two-line where it has a second line); two tables in cards; "Not covered" is a danger tag instead of red text; ids are `tabular` |
| `MysteryShopper` console | D | Segmented tabs; "Review" count is a tinted warning chip (a state that needs action); tables in cards; "case opened" is a danger tag link; checklist items as dividers; the shoppers to send to are check chips (dark circle with a check when chosen); review items are rows in one card with the primary action last |
| `MysteryShopper` shopper view | C | Tasks are rows in one card (status tag, days left or an "overdue" tag, primary "Open task"); the open task is Brief (well + inline note) beside the checklist form; answers are pills, pressed = dark material (a Fail is not painted red); **sticky save bar** with the 1px top line, "Unsaved changes" with an ink dot (new string, EN and AR) once an answer exists, Cancel then Submit on the right |
| `PublicMentions` | D | KPI row (dot only on the overdue tile when above zero), `PressFilter` with counts, one card with the table, "Mark replied" as an `xs` outline pill, column minimums reduced so it fits 900px at 1440 |
| `Standards` (L&D document list), `StandardsRegister` | D | Status tiles are `CountTile`s (pressed = dark); `DataTable` untouched; ids `tabular` instead of `font-mono`; area, owner, source and writer wrap so the status select is not cut off at 1440; the second register has 48px above it |
| `SurveyQuestions` | C | Segmented product tabs; question sets are rows (chosen = dark material, grey text turns `--on-dark-muted`); preview language is a `PressFilter`; the phone preview is a well holding light-material bubbles with the 6px tail (mirrors in RTL); the two-language table has `dir` set on its headers so each header sits over its text |
| `SurveysReference` | C | Vocabulary is neutral light tags (was five blue-dot tags); each legacy instrument is a well inside one card; campaigns are a small table |
| `TeamsStructure` | D | Segmented tabs that scroll sideways under 900px; four tables in cards; routing is a grid of wells (the label/value pairs switch from stacked to two columns by the well's own width); the "earlier version" warning is an `InlineNote` |
| `WeeklySample` | D | KPI tiles without decorative accents; pass-rate table in a card with the supervisor tests in a well; `PressFilter`; **Right / Wrong is a light/dark segmented pair** on a well track (Right = light material, Wrong = dark); a judged row shows its verdict tag and an `xs` ghost "Change"; a lowered pass rate is a danger tag; read-only roles see "Not read yet" as text |
| `Surveys` | D | "Group NPS: none" and "Never surveyed" are inline notification wells (warning and error dot) instead of coloured banners; the funnel stages are wells, the chosen one dark (`role="radio"` kept); source split, why they stopped and skipped-by-reason are bar comparisons (dark first row, grey rest, printed counts); delivery figures are one stat well in the Instruments card (card -> well -> text, no card in a card); instrument and trigger tables in cards; per-product is a grid of wells |

## 3. Derived choices

| # | Choice | Why |
|---|---|---|
| 1 | Access levels are symbol + light/dark material, no hue | The legend and the `sr-only` text carry the meaning; the old pastel tints were colour-only decoration |
| 2 | Filters of `aria-pressed` buttons keep the button role and get the sliding pill (`PressFilter`) | Tests and users address them as buttons; `Segmented` is a radiogroup. A shared `Segmented` variant would replace the helper |
| 3 | Settings sections split on a container query (`@3xl`), not a viewport breakpoint | At 1440 the page column is about 900px (menu + sidebar), at 1024 about 650px |
| 4 | The notices matrix stays stacked (heading above a full-width card) | Four columns with selects and a sentence do not fit 600px; the skill says to use the split "where it fits" |
| 5 | "Unsaved changes" bar only on the shopper task form | It is the only form with Cancel and Submit; the other pages save on change (toast) or send (simulated) |
| 6 | Review actions order: Return (outline) then Approve (primary) | Primary action last |
| 7 | A tinted chip for the Review count and tinted tags for Late, Not covered, overdue, lowered pass rate | The skill allows tint only for states that need action |
| 8 | `BarList` in `Surveys.tsx` is a local copy of `RankedBars` with wrapping labels | The reasons are sentences ("Unit or paperwork available only on request"), `RankedBars` truncates its label column |

## 4. Shared requests

| For | Request |
|---|---|
| `components/common/charts.tsx` | `RankedBars`: an option to wrap the label instead of `truncate` (or a wider label column), then `Surveys.tsx` can drop its local `BarList` |
| `components/ui/segmented.tsx` | A variant (or prop) that renders `role="group"` + `aria-pressed` buttons for the pages whose tests address them as buttons; then `PressFilter` in `SubPageHeader.tsx` can go |
| `components/customers/SourceBadge.tsx` | Still draws `border border-info/20 bg-info/10 text-info-text` and `border-border bg-card` (seen in Public mentions). Should become the light tag with a dot |
| `components/home/LandingBrief.tsx` | Rendered at the top of L&D and HR team performance; it keeps its own card styling (not restyled here) |
| `SettingsLayout` and the other settings pages | `SettingsSection`, `InlineNote`, `ViewOnlyNotice`, `IN_CARD` could be promoted to `components/common` by whoever owns it; PAGES-B pages in the same folder can use them from `SubPageHeader.tsx` today |
| `Table` | `density` defaults to dense on the container and ignores `data-density` of the page, so a comfortable page has to pass `density="comfortable"` to every table. Inheriting the ancestor's `data-density` would remove that |

## 5. Known gaps

| Gap | Note |
|---|---|
| The AI Insights access matrix (12 role columns) and the earlier matrix still scroll sideways at every width | By design (sticky first column, `role="region"`); they cannot be narrowed without cutting role names |
| Wide tables (Public mentions, Feeds, Standards, Surveys instruments) scroll inside their card under about 1200px and on a phone | They do not overflow the page; at 1440 all fit |
| Radix tab triggers show the global focus ring after a mouse click | Known system behaviour (`MEO_DESIGN_SYSTEM.md` section 9) |
| On a phone the card padding stays 28 (comfortable) or 20 (dense) | Cards are shared; a table in a card then has little room |
| `LandingBrief` and `SourceBadge` still carry legacy styling | Not owned here, see shared requests |
| `data-fluid-page` | Not set on `SettingsLayout`: the reading cap of 1320px is not the limit here (the menu is), so it would change nothing at 1440 |
