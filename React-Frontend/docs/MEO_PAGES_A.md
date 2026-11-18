# Pages A: step 5 of the Meo-inspired design (18 Nov 2026)

> **Consolidation pass (18 Nov 2026):** the shared requests and most known gaps below were closed in shared code; where each landed is in `MEO_DESIGN_SYSTEM.md` section 12 ("Shared requests ... where each landed"), the phone composition in section 14. Still open: the wide registers (matrices, Standards register, Feeds) scroll inside their card (section 15).

Scope: Home, Login, My inbox, Overview wrapper, Customers (list and person), Who is leaving, Personas and campaigns, Product page, Intelligent CX team, Close the loop. Composition only: every string, aria attribute, role, test id, route, hook and permission check is unchanged. Rules and tokens: `MEO_DESIGN_SYSTEM.md`; this file records what each page did with them. Marks: **derived** = a choice not in the skill.

## Files

| Page | Files |
|---|---|
| Home | `pages/Home.tsx`, `components/home/{StepLine,DailyBrief,LandingBrief,StartHere,IndicatorCard,WorkToday}.tsx` |
| Login | `pages/Login.tsx` |
| My inbox, Overview | `pages/inbox/Inbox.tsx`, `pages/OverviewPage.tsx` (the body, `pages/settings/Overview`, is not in this slice) |
| Customers | `pages/Customers.tsx`, `components/customers/{CustomersTabs,CustomerList,ProfileCard,AiReadingCard,Timeline,ConsentRow,SourceBadge,LeadSourceBadge}.tsx` |
| Who is leaving, Personas, Product | `pages/{Runaway,Personas,ProductPage}.tsx` |
| Intelligent CX team, Close the loop | `pages/{IntelligentCxTeam,CloseTheLoop}.tsx`, `components/closeTheLoop/{CampaignDialog,InterviewDialog}.tsx` |
| `components/ai/AssistantResult.tsx` | Already done in step 4 (white cards in the assistant's well, `row-divider` rows): not touched |

## Conventions used on every page

| Rule | How |
|---|---|
| Density | `data-density` on the page root: comfortable on Home, Login, Overview, Product, Intelligent CX team, a person's profile; dense on Customers list, Who is leaving, Personas tables, Inbox, Close the loop. Where one block needs the other size it sets the attribute on an inner box (never on `CardContent`, which would change the card's own side padding) |
| One dark feature surface | Home: the Daily brief. Person: the AI reading. Intelligent CX team: the path card. Login: none (selected role and the sign-in pill are the dark material). Customers list, Close the loop, Inbox, Runaway, Personas, Product: none |
| Selected = dark | Login role rows, the Customers tab pill, the StepStrip current step, the pager's current page |
| Inline notification | A `well` with a 6px status dot and text (Home environment hint, Login sample note, list scope notes, the calling-rules box). Replaces every coloured banner |
| Colour | Dots (status, product), light/tinted tags, nothing else. KPI `accent` is passed only where it means something (a person's "Problems found" when above 0; a product's own NPS tile) |
| Tags | `StatusBadge`, `Chip`, `pill pill-light` through `SourceBadge`/`LeadSourceBadge`; no hand-made pills |
| Lists inside cards | `row-divider` rows, or wells; no `divide-y`, no cards inside cards |
| Ids | `tabular`, never `font-mono` (one exception, below) |

## Home (comfortable)

- Header card: title, lede, the "Prototype, sample data" state as the inline notification (dot + text, the same look as `SampleBanner`), and the six-step line as six wells (`StepLine`, count under each step, hover = `well-hover`). Nothing is dark here.
- **Daily brief = the one dark card** (`Card variant="dark"`): chips are white-7% tints, rows are a soft pill on hover with a 7% divider, the arrow nudges 3px on the spring and mirrors in Arabic. `DailyBrief` takes **`surface="dark" | "light"`** (additive, default dark); `LandingBrief` passes `light`, so L&D, HR and the Internal Audit and Marketing Lead keep one dark surface per page.
- "New here? Three things to know": a quiet well with the trigger row (round light chevron on the spring) and three numbered light dots. Same storage key, same default.
- Indicators: one card per live product, product hue = the 6px dot before the name, then **three wells** (NPS, CSAT, CES) at dense size (32px value) inside the comfortable card. The tone of an indicator is a status dot beside its label; the number is ink. `data-product`, `data-indicator`, `data-tone` kept.
- Your work today: card -> the next-step well -> `row-divider` rows. "Open my inbox" is the light pill: the one primary pill on Home is the search "Go".
- Search: card with the 48px well field and a dark pill; example requests are light pills whose label sits in a `span` (no hover roll, so a long request wraps instead of being clipped).
- Derived: the Daily brief `surface` prop; the dense wells inside the product cards.

## Login (comfortable; outside the shell)

- White page; the brand side is the soft grey of the sidebar (the tone change is the edge): own two-letter mark in the dark material, the headline (second sentence in grey instead of gold), the three points as light round icon tiles, the skill's dot-grid motif (static, replaces the drifting line pattern) and the prototype line.
- The sign-in card is the **frame card** (outer radius 26, inner 18 with hairline), dark primary pill, the sample note as the inline notification well.
- Role picker: **rows**, each a quiet well; the chosen one is the dark material (white in the dark theme) with a round check on the spring. The radio stays a real `input` inside the label; the label draws the global focus ring through `:has` (`--tw-ring-shadow: var(--ring-focus)`). "Other roles used in the demo" is a ghost disclosure row with a round chevron. The description of the chosen role stays in the live region as a well.
- The sign-in label sits in a `span` so a long role title wraps (390px, Arabic) instead of being clipped by the one-line hover roll.
- Entrance animation unchanged (`motion`, reduced-motion safe through `MotionConfig`); the e2e-visible text and the `data-group`, `details`, `title` attributes are kept.

## Customers

- Tabs: `CustomersTabs` has the `RouteTabs` look (white pill track, one dark pill sliding on the spring, `aria-current="page"`) with prefix matching, so "Find a person" stays current on `/customers/p-005`.
- List (dense, `data-fluid-page`): the skill's table; person cell is ink 500; source, product and lead source are light tags; only problems and drifting are tinted; the scope note is the inline notification.
- Person (comfortable): next-step well, **Profile** card -> well -> `dl` with the stitched ids as light tabular tags, **Consent** as a flat well (the two attention states keep their tint), four KPI tiles with neutral icons (a red dot on "Problems found" only when above 0), **AI reading = the one dark card** (three tint wells, "what to do next" in ink 500 with a dot, evidence as tint chips), **Timeline** (an event = a well, the channel icon in a 30px circle: dark material for an event the rules flagged, light otherwise, a 6px error or info dot at its corner; no connecting line; the `?ev=` target gets the 1.5px ink selected ring and takes the focus ring; a chat text is a white quote card), the two folded cards (30px icon circle, count pill, round chevron, content in a well).
- Derived: dark icon circle and corner dots on the timeline (the description still says "Red marks a problem the rules found", and the red dot and red tags do).

## Who is leaving, Personas, Product, Inbox, Overview (from F2, reviewed)

- **Who is leaving** (dense): six KPI buttons without decorative hues, neutral icon circles; "what we keep doing wrong" is a well of button rows modelled on `RankedBars` (the top row dark, the rest grey, the count printed, still navigates); per-type cards without top bars, people as `row-divider` rows (the reference stays in `span.text-sm.font-medium`), "Full journey" is a ghost pill.
- **Personas** (dense root, comfortable persona cards): intro boxes are wells, the ranked table keeps its focusable rows, each persona is a card with a recommendation well (the "what not to do" row has a 6px error dot), the audit note is a well, one dark "Decide" pill, saved briefs are wells.
- **Product page** (comfortable): only the product's own NPS tile carries its dot; CSAT and CES use `unit="%"`; "By channel" is the skill's bar comparison (promoters dark, passives and detractors grey, numbers printed); the website/app split and the survey-rule list are wells; the line "never combined" is an inline notification.
- **Inbox** (dense): `label-style` eyebrow, ink 500 primary cell, 30px light icon circle, grey footer notes; `data-kind` and `data-priority` kept.
- **Overview** (comfortable): wrapper only (density, gap, outline pill for the monthly pack). The body is `pages/settings/Overview` and `OverviewInsights`.

## Intelligent CX team, Close the loop (from F1, reviewed)

- **Intelligent CX team** (comfortable): the path card is the one dark card (steps are 7% tint chips, Approve is the lit chip, Case and Receivers carry a dot); the envelope groups, the ten agents and the supervisor are wells (each agent well is the `Collapsible` root; "Job description" is a light pill; "Must not" has an error dot); approval rates are a bar list with printed values; the routing matrix is the skill's table; recent activity is the dense `DataTable`. Derived: rollout stages (shadow, phase 2) are neutral light tags instead of tinted warnings.
- **Close the loop** (dense): capacity and recovered are wells with ink numbers; the calling-rules box and the "From your inbox" region are inline-notification wells (`data-testid`, `role="region"` kept); campaigns are wells; row actions are `xs` pills. Dialogs: wells replace the bordered boxes, the member list is a well of `row-divider` rows, ids are `tabular`.

## Shared requests

| # | Request | Workaround used |
|---|---|---|
| 1 | `RouteTabs`: an `end?: boolean` prop (or prefix matching) | `CustomersTabs` repeats the markup with prefix matching |
| 2 | `RankedBars`: labels truncate at 9rem; agent names are longer. A wrapping label or `labelWidth` | A local bar list on Intelligent CX team |
| 3 | `DataTable`: a pinned action column (`meta.sticky: 'end'`); Close the loop has 11 columns and the Call button scrolls out of view at 1440 | "From your inbox" region repeats the actions |
| 4 | `StatusBadge`: a dot and an icon together (public channels want "dot + icon + label") | `SourceBadge` draws a `pill pill-light` itself |
| 5 | `Button`: `roll={false}` (long, wrapping labels are clipped by the one-line roll) | The label is wrapped in a `span` (the roll only applies to plain text children) |
| 6 | A label that wraps a hidden radio cannot show the global focus ring | `has-[:focus-visible]:[--tw-ring-shadow:var(--ring-focus)]` on the label (Login); a shared `ring-within` utility would remove it |
| 7 | `row-divider` is invisible on a well (`#ececec` on `#f2f2f2`); a well variant (about `#dedede`) | Wells separate rows by spacing (Profile) or hold wells |
| 8 | `KpiTile variant="dark"` and a stat-in-well helper (three pages build the same "label, ink number, caption" well) | Local wells |
| 9 | `.surface-dark` remaps `--ink` and friends, but `StatusBadge`/`AgentChip` keep their light or status colours: tint chips need `bg-none bg-(--on-dark-tint) shadow-none [&_svg]:text-foreground` | Applied through `className` in the Daily brief |

## Known gaps

- The Overview body (`settings/Overview`, `OverviewInsights`) still has the old coloured tiles and charts (not in this slice).
- Close the loop (11 columns), Inbox and Personas tables scroll sideways inside their container on a phone, as before.
- PSI Wallet's "Too early" NPS wraps onto two lines at 44px on its product page.
- Home indicator tones are a dot only (the number and the sentence carry the meaning, as the old coloured number did); a text state could be added with the copy owner.
- The dark theme's feature cards are the light material (derived in step 1); small grey text inside them is `rgba(10,10,10,.62)` on a white-to-grey gradient: axe passes, but it is the thinnest contrast on these pages.

## Verification (18 Nov 2026)

| Check | Result |
|---|---|
| `npx tsc -b --noEmit`, `npm run lint` | Clean (3 older fast-refresh warnings in files outside this slice) |
| `vitest run src/pages src/components/home src/components/customers src/components/closeTheLoop` | 21 files, 199 tests pass |
| Playwright on port 4411, 3 workers: `v40-orientation`, `auth`, `v40-people`, `a11y` (33 routes x EN/AR x light/dark, login x4, overlays), `routes` | 242 pass on the first run. 10 failed, all load-related (the machine was running three e2e suites): 8 passed on rerun. The 2 `routes` "all 33 routes" tests need about 66 s without tracing and pass with `--trace off`; with the default trace on a busy machine they run past their own 120 s `setTimeout` (every route renders, no console errors, no sideways scroll, correct `dir`) |
| Screenshots (EN/AR, light/dark, 1440/1024/390) | Home, Login, Customers list, a person; the other pages by F1 and F2 at the same matrix. Fixed after looking: Daily brief header grid on a phone, Login sign-in label clipped at 390 in Arabic, Login card taller than 900px, "Other roles" summary wrapping inside a pill |
| Grep audit (`border`, `font-bold/semibold/mono`, `rounded-md/lg/sm`, status/primary tints, `shadow-sm/md/lg`, `uppercase`, `tracking-`, own focus rings, hover lifts, `text-gold`, `divide-`) | Clean except four deliberate lines: `font-mono` on the envelope field names (real code), `first-letter:uppercase` on a raw flag fallback in Who is leaving, `rounded-lg` on the campaign member row's hover pill, and the arrow nudge `group-hover:translate-x-[3px]` (the spring, not a lift) |
