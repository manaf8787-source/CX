# V40 delta: what changes in the React build (v38 to v40)

Date: 18 Nov 2026. Prepared for the implementers of `React-Frontend/`. Status: **analysis only, no code changed.**
Sources: Programme KB section 44 (owner's summary); the real code diff `v38-to-v40.diff` plus `v38.html` / `v40.html` (all strings below are verbatim from v40); the AI Agents deck (PDF, slides 1 to 9) and Specification (docx); the current `React-Frontend/src` and `docs/`.
Conventions kept: `[Proposed]` = suggested by this analysis or marked as a default/proposal by the owner, never presented as decided. All figures are sample data. Titles, not names. EN and AR with RTL for everything new.
**v40 is still under the owner's review** (KB section 44: "the knowledge base documents ... will be regenerated once Manaf has reviewed v40"). Keep every v40 value in data files, not in components, so a review change is a data edit.

How to read: section A has a summary table, then one block per feature with the v40 behaviour (strings, shapes, defaults), the React status and the files. Verbatim EN/AR strings are in Appendix S (S1 to S17) so nobody has to open the 1 MB HTML. Sections B to E are contradictions, agent deck/spec check, workstream split, and proposal-vs-decided.

How the prototype stores things (so the shapes below make sense): `B(en, ar)` = bilingual string, same as the React `Bi`. `TODAY` in the v40 sample is `2026-10-27` (a Tuesday). Prototype ids: events `E-n`, signals `INC-nnnn` or `SIG-nnnn` or `PUB-3nn`, fixes `CA-2nn`, loop items `CL-4nn`, investigations `INV-n`, public mentions `PUB-3nn`, weekly sample `WS-n`.

---

## A. Feature inventory

Status key: **Done** / **Partial** (building blocks exist) / **Missing** / **Changed** (React does it the v38 way and v40 contradicts it). WS = proposed workstream (section D): F0 foundation, A, B, C.

| ID | Feature (v39 = Home/orientation, v40 = P0/P1/P2) | Status | WS |
|---|---|---|---|
| F01 | Home rebuilt (order: header+steps, brief, new-here, indicators, work today, search) | Changed | A |
| F02 | Six-step line (Listen, Signal, Pattern, Fix, Check, Report), clickable | Missing | F0 (component) + A |
| F03 | CX indicators per live product (NPS, CSAT, CES) with a plain sentence | Missing | A |
| F04 | "?" definitions incl. CES; "What the terms mean" | Partial | A |
| F05 | "New here? Three things to know" | Missing | A |
| F06 | "Your work today" (v40: summary of My inbox) | Missing | A |
| F07 | "Where you are / what happens next" box on pages and fixes | Missing | F0 (component) + B + C |
| F08 | Menu in step order, then merged menu (6 main items; rest under Settings and reference) | Changed | F0 |
| F09 | Daily brief written by Agent 9 at 07:00, one per role | Missing | A |
| F10 | Trace ids on one chain EV, SG, PT, CA, VR, RP | Missing | F0 |
| F11 | Trace card on every fix and signal; signal detail modal | Missing | B |
| F12 | Ids on timeline rows, signal rows, pattern cards; public mentions never link to a person | Missing (data contradicts) | B + F0 |
| F13 | Data feeds page: 3 CRM environments + shared sources, last received, status | Missing | C |
| F14 | "Data as of" bar on every page + environment switch narrowing registers | Missing | F0 (context, hooks) + A (bar UI) |
| F15 | CRM mapping page (Media, lead stage, activity category) as configuration | Missing | C |
| F16 | Signals Rules tab points to the single place thresholds are edited | Missing | B |
| F17 | Customers holds search + who is leaving + personas (tabs) | Changed | C |
| F18 | Surveys and triggers under Settings only | Changed | C |
| F19 | Hand-offs folded under the fixes tab | Changed | B |
| F20 | My inbox with day counters | Missing | A |
| F21 | Audit trail on every fix (when, what, by which role) | Missing | B |
| F22 | Escalation matrix page per product; the fix's classification reads it | Partial | B |
| F23 | Survey questions page per product (EN/AR) with customer-view preview | Missing | C |
| F24 | Consent and DNCR per person (from the CRM) | Missing | C |
| F25 | Skipped surveys state the reason | Partial | C |
| F26 | Investigation closes with a result, becomes evidence on the pattern, proposes a fix | Partial | B |
| F27 | Close the loop: calling hours, up to 3 attempts, next attempt following working day, WhatsApp after the last | Missing | C |
| F28 | One sign-in with six main roles (demo roles folded away) | Partial | A |
| F29 | Browsable customers list with filters and export | Partial | C |
| F30 | Public mentions list with reply status and owner | Partial | C |
| F31 | Weekly sample page (50 outputs, right/wrong, wrong becomes a test) | Missing | C |
| F32 | "What if" on the thresholds | Missing | B |
| F33 | Arabic completed on agent chips | Partial | F0 (component) + A |
| F34 | Tables scroll on mobile | Done | all |
| F35 | Role and page permission changes implied by the code (inbox, feeds, mapping, matrix, questions, sample, public) | Missing | F0 |
| F36 | Agent 9 text: daily 07:00 brief in roster/JD | Missing | A |

**Counts: 36 features. Done 1, Partial 8, Changed 5, Missing 22.**
Found in the diff but absent from the KB summary: F16 detail, F19 detail, F35 (permission deltas), F36, the brief also shown at the top of other roles' landing pages (F09), the pattern-card "Evidence from investigation" line (F26), `done`/`on` states of the step strip (F02), the "Work the mentions" button on the reputation card (F30), a one-line rule under the feeds table (F13), per-role brief line sets (F09), the matrix line on each fix (F22).

---

### F01 Home rebuilt (v39) [Changed]
- v40 order, top to bottom, container `max-width:1100px`, centred, 16 px gap: 1) header card: h1 + lede + "Prototype, sample data" tag + full step strip; 2) **Daily brief** card (F09); 3) **New here** (F05); 4) h2 "How customers feel, per product" with a "What the terms mean" button, then a 2-column grid of per-product cards (F03); 5) **Your work today** (F06); 6) **Find a person, or ask** (search card).
- The five live-number tiles, "Needs attention", "Signals by month", "Patterns against threshold" and "AI team activity" of the v38 React Home have **no counterpart in v40 Home**. [Proposed] Keep the assistant chips under the search; move the signals-by-month chart to the Signals tab; the AI activity list already lives on the agents page.
- Strings: S1.
- React now: `pages/Home.tsx` is the v38 layout (search first, 5 KPI tiles, 4 cards). Files: rewrite `pages/Home.tsx`; new `components/home/*`.

### F02 Six-step line [Missing]
- Steps (id, EN name, EN title, target in v40 prototype): `ev` "1 Listen" (Customers); `sg` "2 Signal" (Actions, Signals tab); `pt` "3 Pattern" (Actions, Signals tab); `ca` "4 Fix" (Actions, fixes tab); `vr` "5 Check" (Close the loop); `rp` "6 Report" (Overview). Strings S1.
- Behaviour: 6 buttons in a `repeat(6,1fr)` grid (3 columns at max-width 820 px). Each shows the name (bold) and, in the full version, the title. State `on` = current step (brand border and tint), `done` = every step before the current one (opacity .7), none highlighted on Home. `title` attribute = step title. Click goes to the page (and tab). A `small` variant (names only) sits inside the next-box (F07).
- React targets [Proposed]: `/customers`, `/actions/signals`, `/actions/signals` (patterns section), `/actions/corrective`, `/close-the-loop`, `/overview` (see F08).
- Files: new `components/common/StepStrip.tsx` and `data/steps.ts` (foundation); reuse `pages/actions/components/LifecycleStepper.tsx` styling only, it is a different thing (7 fix statuses).

### F03 CX indicators per live product [Missing]
- One card per **live** product only (PSI Real Estate, After-Sales; hidden products and Wallet do not appear). Card top border 4 px in the product colour; h2 product name; muted "{n} answers, 90 days"; three tiles NPS, CSAT, CES; buttons "Open {product}" (product page) and "All numbers" (Overview).
- Values: NPS = promoters minus detractors from the product's survey rows (shows `–` with no answers), signed; CSAT = average satisfied %; CES = sample table `re 71, af 66, cl/to/ev null, wl 74` (`null` shows `–`). Plain sentence under each (S1). Colours: NPS good >= 30, warn >= 0, else crit; CSAT good >= 80, warn >= 65; CES good >= 75, warn >= 60 [thresholds are not in the KB: **[Proposed]**].
- Rule: no group NPS; "the brief and the tiles use one NPS source" (KB 44): one function must feed both (see F09).
- React reuse: `pages/settings/Overview.tsx` has local `nps()`/`csat()` over `VocRow`; `CES_SAMPLE` in `data/v38Reference.ts` already equals the prototype; `components/common/KpiTile.tsx` supports `term` for the "?". Extract to `utils/indicators.ts` (foundation) and build `components/home/IndicatorCard.tsx`.

### F04 "?" definitions incl. CES [Partial]
- v40 puts a "?" beside every tile label that matches a glossary key (NPS, CSAT, CES) and a global "? What the terms mean" button on every page. React already has `TermHelp`, `TermsButton` in `PageHeader`, `KpiTile term=`.
- Only the content changed: CES = **1 to 5, share who answered 4 or 5**, asked after a procedural or digital step (booking, payment, maintenance request, abandoned upload); worked example 120 answers, 86 said 4 or 5 = CES 72%. The React glossary (and Modules KB) says "1 to 7 or 1 to 5, share at the easy end": **update to the v40 text** (S1). NPS example in v40: 50% promoters, 32% passives, 18% detractors = +32; CSAT: 100 answers, 78 gave 4 or 5 = 78% ("NPS asks about the relationship; CSAT about one moment"). Optional to align.
- Files: `data/glossary.ts` (3 entries); tile "?" via `KpiTile term`.

### F05 "New here? Three things to know" [Missing]
- `<details>` card, open by default, summary bold "New here? Three things to know"; three numbered columns (texts in S1). In the prototype the collapsed state is never saved. [Proposed] persist per browser in `localStorage` inside try/catch.
- Files: new `components/home/StartHere.tsx` using shadcn `Collapsible`.

### F06 Your work today [Missing]
- v40 final version (replaces the v39 four-tile version): card titled "Your work today"; hint "{n} items on you, {u} urgent. Each has a day count."; primary small button "Open my inbox"; then the **first four inbox rows** (day chip + text + "Open"). Urgent = inbox priority >= 1.
- Data = F20 inbox items. Files: new `components/home/WorkToday.tsx`; hook `useInbox` (foundation).

### F07 "Where you are, what happens next" box [Missing]
- Component: bordered card, top: small step strip (current step highlighted); below: bold "Next step:" + text, optional muted "· {who}" and "· {due}", optional small button. In v40 the callers never pass `who`, only `due`.
- Call sites, current step, text, due (strings in S2):
  - **Fix detail** (above the fix): step `ca` while proposed/approved/in progress, step `vr` when verify/effective/failed. Text and due by status: proposed = "The responsible manager approves, changes, rejects, or asks for an investigation" / "within 5 working days"; approved or in progress = "The owner does the fix and marks it done" / "by the due date"; verify = "Agent 6 counts the same signals again and marks it effective, partial or failed" / "at 60 days"; effective = "Nothing. It worked; it stays in the report as a fix that worked"; failed = "The signal reopens and a new fix is proposed"; otherwise "Closed with a reason; nothing further".
  - **Actions page**, above the tabs: Signals tab = step `sg`; Investigations tab = step `pt`; every other tab = step `ca` (3 texts).
  - **Close the loop** page: step `vr`.
  - **Customers, selected person**: step `sg` if the person is drifting away or has problems, else `ev`; 3 texts with counts.
  - **Overview**: step `rp`, with button "Monthly pack".
- [Proposed] render `who` (owner title from the record) since the KB says "with who and by when".
- Files: new `components/common/NextBox.tsx` (foundation); call sites in `pages/actions/ActionsLayout.tsx` + `Corrective.tsx` (B), `pages/CloseTheLoop.tsx`, `pages/Customers.tsx`, `pages/settings/Overview.tsx` (C).

### F08 Menu [Changed]
v39 first reordered the menu in step order; v40 merged it. **Final v40 menu** (labels EN / AR):

| Order | Item | Notes |
|---|---|---|
| 1 | Home / الرئيسية | |
| 2 | 1 · Customers / 1 · العملاء | holds three tabs: Find a person, Who is leaving, Personas and campaigns (F17) |
| 3 | My inbox / صندوقي | new (F20) |
| 4 | 2–4 · Signals and fixes / 2–4 · الإشارات والحلول | = Actions page |
| 5 | 5 · Close the loop / 5 · إغلاق الحلقة | CX roles only |
| 6 | 6 · CX indicators / 6 · مؤشرات تجربة العملاء | = Overview, **moved out of Settings** |
| group | **Settings and reference** | flat list in v40: "How the portal works (the AI team)" (= Intelligent CX team, renamed and moved here), Weekly sample, Public mentions, Monthly CX pack, Mystery shopper, Standards, Surveys and triggers, Voice of Customer, L&D, Teams, Data feeds, CRM mapping, Escalation matrix, Survey questions, Settings, AI Insights access, Glossary |
| group | Products | live products only (unchanged) |
| group | My team / My shopping | HR / shopper roles only (unchanged) |

- Removed from the main menu: Who is leaving, Personas and campaigns, Surveys (all three became tabs or settings).
- React now: `data/nav.ts` PRIMARY_NAV has 7 workspace items (Home, Customers, Runaway, Actions, Close the loop, Personas, Surveys and triggers) plus a Team group (Intelligent CX team) plus one folded Settings entry; Overview is `/settings/overview`.
- [Proposed] keep React's single folded "Settings and reference" entry with its `SettingsLayout` sub-nav (the KB does not require a flat group), and add the new items to `SETTINGS_NAV`. Keep existing URLs working (redirects). Files: `data/nav.ts`, `routes/pages.ts`, `App.tsx`, `components/layout/Sidebar.tsx` (foundation).

### F09 Daily brief by Agent 9 [Missing]
- Card "Daily brief" / "الموجز اليومي" with an Agent 9 chip on the right, hint "Written at 07:00 by Agent 9 from the same numbers the pages show, for your role only; the supervisor checked every figure. Each line opens its page." A list of lines, each a full-width button with a leading arrow (`→`, flipped `←` in RTL). Shown on Home, and **at the top of the landing page for roles that land elsewhere** (L&D page, HR manager page, Internal Audit and Marketing Lead overview, HR specialist actions page).
- Lines per role (all numbers computed live from the same sources as the pages; templates in S3):

| Line | Link | Shown to |
|---|---|---|
| NPS per live product, "up/down/unchanged N points on last month" | Overview | every role with a brief; role with a product sees its product only |
| Signals in the last {days} days; patterns waiting for a fix | Actions, Signals tab | CX manager, CX team, Executive, env roles, team leads, After-Sales lead, HR specialist, L&D; **not** Internal Audit |
| Fixes waiting for a yes / in progress / past date; effective, failed | Actions, fixes tab | same as above |
| Shopper cases open, N over the clock (only if any open) | Actions, shopper cases | same as above except L&D |
| Unhappy customers still to call, critical, recovery by phone and by AI campaign | Close the loop | CX roles only |
| People drifting away of all on record | Customers, Who is leaving | CX manager, CX team, Executive, Internal Audit, Marketing |
| Public mentions in 30 days, % negative, average reply hours, "(target 48)" if over | Overview | same as the line above |
| Training-gap fixes with L&D right now | Actions, fixes tab | L&D only |
| Conduct notes this month, each to the direct manager only | Actions, fixes tab | HR specialist only |
| Weekly sample: 50 outputs to read, 0 read so far this week | Agents page (prototype) | Internal Audit only |

- Traps in the prototype, do not copy: the brief gives NPS lines and the public-mentions line (link Overview) to roles that cannot open Overview (HR manager, HR specialist, L&D, team leads, Marketing, environment roles); the weekly sample line links to the agents page while the inbox links to the sample page; the people-drifting line links to the old standalone "runaway" view that no longer has a menu entry. [Proposed] link only when `canAccessPath`, otherwise plain text; the public-mentions line links to the Public mentions page for roles that can open it; the weekly sample line links to the sample page; the people line links to Customers, Who is leaving tab.
- One-source rule: "up N points on last month" in the prototype reads the trend series while the number reads the survey rows, so the two can disagree. [Proposed] one `useIndicators()` result {nps, csat, ces, answers, deltaVsLastMonth} feeds the tile and the brief.
- Agent 9 text (S17) changes: roster "runs" and "output" (F36).
- Files: new `components/home/DailyBrief.tsx`, `utils/brief.ts` (A); needs foundation hooks (indicators, signal stats, inbox, loop stats).

### F10 Trace ids on one chain [Missing]
- Display ids: event `EV-n` (from `E-n`), signal `SG-n` (from `INC-n` or `SIG-n`; `PUB-3nn` stays `PUB-3nn`), pattern `PT-nnn` (`PT-` + 100 + hash(pattern key) mod 900, so collisions are possible), fix `CA-2nn`, check `VR-nnn` (= `VR-` + fix number), report `RP-2026-11` (fixed, label "November pack" / "حزمة نوفمبر"; only for fixes with a verdict, effective or failed).
- Links: each signal lists the events that produced it (`ev: [EV ids]`), each event lists its signals (`sg: [SG ids]`); in the sample the link is generated (1 or 2 events, nearest of same environment and product, flagged first); **public mention signals have no events and no person**.
- Chain walk works from any record: event, signal, pattern, fix; the check and report are derived from the fix status.
- React now: ids are `i-0001`, `sig-0001`, `pat-1`, `ca-1`; `Signal` has no link to its `Interaction`; patterns have no stable key. Needed (foundation): `Signal.eventIds`, stable pattern key, `utils/trace.ts` with `displayId()`, `ptId()`, `chainFrom(kind, id)`; seeded mock data must stay deterministic.

### F11 Trace card and signal detail modal [Missing]
- **Trace card** (title "Trace" / "الأثر", hint "Every id in the chain, back to the original contact and forward to the report. Click any to open it."): six columns "1 Event, 2 Signal, 3 Pattern, 4 Fix, 5 Check, 6 Report" (2 columns on mobile); the column of the record you are on is highlighted. Cells are id buttons: events `EV-n · channel · MM-DD` (max 4, then "+n"), signals `SG-n · MM-DD` (max 4, then "+n"), pattern `PT-nnn · n signals`, fix `CA-nnn · status`, check `VR-nnn · check date · status`, report `RP-2026-11 · November pack`. Empty cells say "none linked", "not a signal", "under the line", "none yet", "not yet" (EN/AR in S4). Footer "What happens next:" with one of five sentences by how far the chain goes (S4).
- Clicking: event opens the person's timeline scrolled to and highlighting that event; signal opens the **signal detail modal**; pattern opens Signals with that pattern scrolled into view; fix opens the fix; check opens its fix; report opens the Monthly pack.
- **Signal detail modal** (max width 920 px, `dir` follows language, close on backdrop or X): title `SG-n · {signal title}`; chips: source, environment, product, severity (`high` = crit, else warn), date, agent name (**only roles allowed to see names**); sentence "Classified by Agent 2 as {category}. Counted by Agent 3; it is worked only through the pattern it belongs to, never alone."; then the Trace card for that signal.
- Placement: Trace card is appended to every fix detail and to the signal modal.
- Files: new `components/trace/TraceCard.tsx`, `SignalDetailDialog.tsx`, `TraceId.tsx`; mount point `<TraceHost/>` in `Shell.tsx` driven by a search param (e.g. `?sg=SG-12`) so any page can open it (foundation adds the mount and the hook `useTraceNav`; B fills the components).

### F12 Ids on rows, patterns, timeline; public never links to a person [Missing, data contradicts]
- Signals table, first column: date, then below it a button `SG-n` that opens the modal (the table has no other change). Pattern cards: the heading is prefixed with a grey `PT-nnn` tag. Customer timeline rows: before the timestamp a grey `EV-n` tag and one `SG-n` button per signal the event produced; the opened event is highlighted and scrolled into view.
- Public mentions: signal ids stay `PUB-3nn`, the Trace card shows "public mention, no person identified" in the Event column; no link to any person.
- React now: `mockData.buildSignals` sets `kind: 'public_mention'` for 20% but sets `personId` for 90% of all signals and `isPublic` independently (`rng() > 0.85`): a public mention can have a person and `isPublic=false`. **Fix in foundation**: `kind==='public_mention'` implies `isPublic=true`, no `personId`, `eventIds=[]`.
- Files: `pages/actions/Signals.tsx`, `components/customers/Timeline.tsx` (+ test), pattern card components (B).

### F13 Data feeds page [Missing]
- Page "Data feeds" / "تغذيات البيانات" under Settings and reference. Intro and rule line in S5. Table columns: Feed, Environment, Today, Last received, Records, What it carries. Environment column shows the environment name or muted "shared".
- Data (all sample, anchored to the sample "today" 06:xx; dates below are the prototype's 27 Oct):

| id | Name EN / AR | Env | Last received | Status | Records | Note |
|---|---|---|---|---|---|---|
| crm_auh | CRM · Abu Dhabi / CRM · أبوظبي | auh | today 06:10 | ok | 3,728,460 | Leads, activities, contacts, transactions, history |
| crm_dub | CRM · Dubai / CRM · دبي | dub | today 06:12 | ok | 1,890,213 | Separate database, same business |
| crm_ast | CRM · PSI Assets (rental) / CRM · PSI للأصول (التأجير) | ast | **yesterday 06:05** | **late** | 402,118 | Yesterday's file; today's not received by 07:00 |
| wa | WhatsApp Business / واتساب للأعمال | shared | today 06:40 | ok | 3,105 | Messages, direction, reply times |
| ai | AI caller and IVR / المتصل الذكي والرد الآلي | shared | today 06:30 | ok | 1,240 | Calls, durations, outcomes |
| app | PSI Real Estate app and PSI Website / تطبيق PSI العقارية وموقع PSI | shared | today 05:50 | ok | 8,220 | Enquiries, chats, abandoned steps, ratings |
| sv | Surveys / الاستبيانات | shared | today 05:30 | ok | 1,646 | Sent, answered, skipped, with the skip reason |
| pub | Facebook, Instagram, LinkedIn, Google / فيسبوك، إنستغرام، لينكد إن، Google | shared | today 04:00 | ok | 16 | Public mentions and ratings; no person matched |

- Status chips: `ok` = "Received" good, `late` = "Late" warn, `down` = "Not received" crit (defined, unused in the sample). Records formatted with thousands separators.
- Read-only. The "IA marks a feed trusted once a month" rule is text only; there is no button. [Proposed] do not add one.
- Files: new `pages/settings/Feeds.tsx` (C); data `data/feeds.ts` (foundation).

### F14 "Data as of" bar and environment switch [Missing]
- A thin bar under the top bar on **every signed-in page**: "Data as of **{latest received time of the feeds in scope}**"; a chip "{n} feed late or missing" (warn, opens Data feeds) or "All feeds received" (good, opens Data feeds); on the right, "Environment" + a select "All environments / Dubai / Abu Dhabi / PSI Assets (rental)" (only the environments the role may see). A role fixed to one environment sees a chip with its environment name instead of the select. Feeds in scope = all shared feeds + the CRM feeds of the selected environment (or all three).
- The switch narrows: the **people** register (customers list, search, runaway, personas basis) and **signals and shopper cases** (so patterns and the brief). It does **not** narrow fixes, Close the loop, survey rows or indicators in the prototype, although the KB says "every register". [Proposed] narrow fixes via their signals' environment and the close-the-loop list via the person's environment; keep indicators per product unfiltered (no environment sample size) and say so in a hint. Needs owner confirmation.
- React now: only role-level scoping (`RoleDef.environment`, e.g. environment management = Dubai) exists, in `Customers.tsx` and a few pages. Foundation: `EnvScopeContext` + env-aware query hooks (query keys include the env); A builds `components/layout/AsOfBar.tsx` (the mount point is added by foundation in `Shell.tsx`).

### F15 CRM mapping page [Missing]
- Page "CRM mapping" / "ربط قيم CRM"; three tabs "Sources (CRM Media)", "Stages (CRM lead stage)", "Activities (CRM activity category)". Table: CRM value, arrow, portal value (a select for CX manager and Internal Audit and Marketing Lead, text for everyone else), Rule (a hint). Editing shows toast "Mapping saved (prototype)." Footnote: "Shown: the values seen on 17 November in the Abu Dhabi environment ... unmapped values default to 'Ignore' and appear in the weekly sample for the Internal Audit and Marketing Lead" (full text S6). Rows and portal options in S6.
- Inconsistencies inside the prototype text: says "13 lead stages" but lists 14 CRM stage values; "9 sources" but the select has 9 plus "Ignore" (10); "11 events" = 10 plus "Ignore". [Proposed] show counts computed from the data.
- Files: new `pages/settings/CrmMapping.tsx` (C); `data/crmMapping.ts` (foundation).

### F16 Signals Rules tab pointer [Missing]
- At the top of the signals Rules tab: tinted card "One place for every threshold." + "These are the same numbers as Settings → Rules as configuration; change them there and every page recomputes." + button "Open" (Settings). React's Signals page has no Rules tab; the numbers live in `pages/settings/Rules.tsx` and `PatternThresholdMeter`.
- [Proposed] add the same tinted card to the Signals page (B) and make the claim true: `usePatterns` must recompute when a rule value changes (today `MOCK_PATTERNS` is computed once from the constant `PATTERN_RULES` and the Rules page edit does not change it). Foundation task: thresholds read from `useRulesConfig`.
- Files: `pages/actions/Signals.tsx` (B); `utils/patterns.ts`, `services/queries.ts` (foundation).

### F17 Customers holds search, who is leaving, personas [Changed]
- Page "Customers" / "العملاء", description "One record per person, every contact on it; who is drifting away; who our customers are." Tabs: "Find a person" (always), "Who is leaving" (if the role can open it), "Personas and campaigns" (if the role can). The tab bar stays visible when a person is open. Default tab = search.
- React now: `/customers`, `/runaway`, `/personas` are three pages and three menu items.
- [Proposed] keep the three URLs; add a shared tab strip (`CustomersTabs`) at the top of all three pages and remove Runaway and Personas from the sidebar. Files: `pages/Customers.tsx`, `pages/Runaway.tsx`, `pages/Personas.tsx` (tab strip only), `components/customers/CustomersTabs.tsx` (C).

### F18 Surveys and triggers under Settings only [Changed]
- Removed from the main menu; lives in the Settings and reference group (just before Voice of Customer). Roles that had it keep it: CX manager, CX team (all), Executive, Internal Audit and Marketing Lead, After-Sales lead, environment management and the Real Estate product team (prototype list `ex, ia, lead, re, em`). React `ROLE_PATHS` gives `/surveys` only to CX manager and CX team: [Proposed] add `/surveys` for `exec`, `auditmkt`, `aslead`, `envmgmt` (already true in v38; the KB open item "whether Marketing sees Surveys and triggers" stays open).
- React now: top-level `/surveys` plus a legacy `/settings/surveys-reference`. [Proposed] move the page to `/settings/surveys` with a redirect from `/surveys`; keep the legacy page but name it clearly "Surveys (legacy reference)".
- Files: `data/nav.ts`, `App.tsx`, `auth/access.ts` (foundation); `pages/Surveys.tsx` (C, content only).

### F19 Hand-offs folded under the fixes tab [Changed]
- The Signals page loses its "Hand-offs" tab; on the **fixes tab** of Actions, a collapsed `<details>` card at the bottom titled "One-customer corrections handed to other systems" with muted "(hand-offs: recorded and checked, no clock)", containing the hand-offs list (same table and rules as before).
- React now: `pages/actions/Signals.tsx` has a "Hand-offs" SectionCard (list plus "Hand-off rules by signal type" table). [Proposed] move that block into `Corrective.tsx` as a `Collapsible` (closed by default), same title and subtitle strings (AR in S11b).
- Files: `pages/actions/Signals.tsx`, `pages/actions/Corrective.tsx` (B).

### F20 My inbox with day counters [Missing]
- Page "My inbox" / "صندوقي", intro S7. Table columns "Due, What, With, (action)"; empty state "Nothing on you today." Footer hint "Approval window: {5} working days. Verification at {60} days. Changed under Settings → Rules as configuration."
- Item kinds, how days are computed, priority (higher first, then fewest days left, items without a date last):

| Kind | What | Days | Priority | With |
|---|---|---|---|---|
| approve | fix in status proposed: "Approve, change, reject or investigate: {title, 80 chars}" | approval window (5) minus working days since the proposal date (default proposal date 2026-10-24 if missing); unit working days | 2 if <= 1 day left, else 1 | owner title |
| do | fix approved or in progress: "Do the fix and mark it done: {title}" | days until due date (calendar) | 2 if late, 1 if <= 3 days, else 0 | owner title |
| verify | fix in verification: "60-day check runs on {date}" | days until the check date | 0 | "Agent 6" |
| call | Close the loop item not yet done (to do, no answer, needs human): "(Critical · )Call {person} · {reason}" | days until next attempt or due | 2 if critical, 1 if past due, else 0 | AI campaign id, caller, or "CX team" |
| inv | running investigation (CX only): "Investigation open: {id} · 4/6 interviews" or "shopper check" | none | 0 | "Agent 8" |
| sample | Internal Audit only: "Weekly sample: 50 outputs to read, 0 read" | days until the due date | 1 | none |

- Only items the role may see (fix visibility rules; Close the loop and investigations CX only; sample Internal Audit only). Day chip: more than 30 days late = "overdue" (crit); negative = "{n} working days late" or "{n} days late" (crit); 0 = "today"; <= 1 left = warn; else neutral "{n} working days left" or "{n} days left" (S7).
- **Working week conflict**: the prototype counts Friday and Saturday as weekend (JS day 5 and 6) and its "next attempt" skips Friday to Sunday. The KB (Programme KB lines 34 and 229) says clocks count **Monday to Friday, 09:00 to 18:00**, holidays and working days editable. [Proposed] follow the KB; make weekend days a rules setting (`workingDays`); flag to the owner.
- React now: no inbox, no working-day arithmetic (`utils/clock.ts` is calendar time). Files: new `pages/inbox/Inbox.tsx` (A); foundation: `utils/workingDays.ts`, `utils/inbox.ts`, `useInbox`, `CorrectiveAction.proposedAt`.

### F21 Audit trail on every fix [Missing]
- Card below the fix detail: title "Audit trail" / "سجل التدقيق", hint "Every change on this fix: when, what, by which role. Nothing is deleted." Table When / What / By; newest first; **By = the role title** of whoever acted (not a person), "System" when absent; When = date and HH:MM; empty state "No change yet."
- Every status change and decision writes an entry (`{ at, what, byRole }`).
- React now: `CorrectiveAction` has no log; decisions only set `decision` and `decisionReason`. Foundation: `CorrectiveAction.auditLog`, write on decide, status change and investigation proposal (`queries.ts`), seed a few entries. B builds the card `pages/actions/components/AuditTrail.tsx`.

### F22 Escalation matrix page per product [Partial]
- Page "Escalation matrix" / "مصفوفة التصعيد" under Settings and reference; product selector (segmented control of the six products, default Real Estate); ten rows; six columns "Kind, First receiver, Informed, Backup, Respond (h), Resolve (h)"; cells are text inputs for the **CX manager and Internal Audit and Marketing Lead**, plain text for others. Edits kept per product and per cell in session state only. Intro and principles text S9.
- Default cells (identical for every product; **proposals until the owners confirm**; the owner fills them by 28 Nov, KB 43.1). Receiver / Informed / Backup / Respond / Resolve:

| Kind | Receiver | Informed | Backup | Respond | Resolve |
|---|---|---|---|---|---|
| Employee | Direct manager of the agent | – | Head of the team | – | – |
| Service and behaviour | Team manager | Head of the environment | CX manager | 9 | 45 |
| Training gap | L&D head | Environment champion | CX manager | 9 | 90 |
| Process | Process owner (matrix) | Product owner | CX manager | 9 | 45 |
| Product and app | Product owner | IT lead | CX manager | 9 | 90 |
| Environment | Branch or office manager | Head of the environment | – | 9 | 45 |
| Legal and privacy | Legal | CX manager | – | 1 | 5 |
| Marketing | Internal Audit and Marketing Lead | Marketing manager | CX manager | 18 | 45 |
| Shopper case · critical | CX team (triage) | Direct manager | HR pool (conduct) | 1 day | 5 days |
| Legal or privacy case | Legal | CX manager | – | 1 day | 5 days |

  Hours are working hours (9 = one working day, 09:00 to 18:00). The two case rows use the text "1 day / 5 days" in the prototype: [Proposed] store numbers (9 and 45 hours) and label the unit. The cell titles are English only in the prototype: **Arabic translations needed** ([Proposed]).
- Each fix detail gets one line before the Classification card: "**From the matrix** ({product}): receiver {x} · informed {y} · backup {z} · respond {n} h · resolve {m} h" plus a "Matrix" button. Product = the fix's product, else its first signal's product, else Real Estate.
- Conflicts with the Rules and Definitions document (Decision 4): its template is per **complaint category** (5 rows, columns Owner / Backup / Informed / Routing) and says Real Estate has **one matrix per environment**; the v40 page is per **classification kind** (8 kinds + 2 cases; adds Respond and Resolve) and per product only. See B16; ask the owner.
- React now: `pages/settings/Rules.tsx` shows the empty template and the six principles (`ESCALATION_ROWS/COLUMNS/PRINCIPLES` in `data/v38Reference.ts`) with every cell "Pending" and a "Cells pending" badge; `lib/actionKinds.ts` has the 8 kinds. Key map, React kind to matrix key: `employee`, `service_behaviour` to `service`, `training_gap` to `training`, `process`, `product_app` to `product`, `environment`, `legal_privacy` to `legal`, `marketing`.
- Files: new `pages/settings/EscalationMatrix.tsx` (B); `data/escalationDefaults.ts`, `useMatrix` (foundation); matrix line in `pages/actions/Corrective.tsx` (B); replace or link the template block in `Rules.tsx` (B).

### F23 Survey questions page per product [Missing]
- Page "Survey questions" / "أسئلة الاستبيانات"; product selector (six products, default Real Estate); two columns: left a list of question sets (name, when it fires, "{n} questions"), right a phone-style preview "As the customer sees it · WhatsApp or app" with the greeting "Hello, this is PSI. One minute of your time:", the numbered questions, and a note "Sent by Agent 10 in the customer's language, on the channel they used, only if consent allows and the cap is not reached." (S10). A product with no set shows an empty list in the prototype: add an empty state.
- Nine sets: Real Estate (NPS after the signed deal; CSAT + CES after a call, a viewing or an offer; What stopped you?; Re-survey after a resolved complaint), After-Sales (NPS after handover and after renewal; CES after a closed ticket), PSI Club (member NPS), Tour Estate (end-of-tour survey, 6 questions), PSI Events (booth rating QR and staff evaluation). Full EN/AR in S10. The re-survey set sits under Real Estate only although the rule applies to every product: [Proposed] show it under each live product or add a note.
- React `data/surveyVocabulary.ts` is a legacy question-type vocabulary, not these sets.
- Files: new `pages/settings/SurveyQuestions.tsx` (C); `data/surveyQuestions.ts` (foundation).

### F24 Consent and DNCR per person [Missing]
- On the person page, a row before the four effort tiles: muted "Consent (from the CRM):" then chips: either a critical chip "DNCR · no calls, no surveys by call" or a good chip "Consent given"; then "WhatsApp ✓/✗", "Email ✓/✗", "SMS ✓/✗" (warn chip when ✗) (AR in S11).
- Sample generation (synthetic): of the 30 people, DNCR for index 4, 13, 22; WhatsApp ✗ for 3, 10, 17, 24; email ✗ for 2, 7, 12 and so on; SMS always ✓. [Proposed] field `consent: { dncr, whatsapp, sms, email }` on `Person`.
- Rule to honour in React: a DNCR person never appears as callable in the Close the loop list and is never surveyed by call. The KB lists calling hours and consent rules as an open question (43.9): badge the values [Proposed].
- Files: `components/customers/ProfileCard.tsx` or the effort section of `pages/Customers.tsx` (C); `Person.consent` (foundation).

### F25 Skipped surveys state the reason [Partial]
- v40 changes the Surveys page text for the Agent 10 log by inserting "(DNCR {n}, cap 31, no consent 6, duplicate 9)" after the first "skipped" on the page. It is a hard-coded text insert and contradicts the log line already on the page ("3,140 skipped (2,210 inside a cap, 640 not identified, 290 opted out)").
- React now: `SURVEY_DELIVERY_LAST_MONTH.skippedBy` has three reasons (inside a cap 2,210; not identified 640; opted out 290) and the Surveys page shows them.
- [Proposed] one model: skipped reasons = cap, not identified, opted out, **DNCR**, **no consent**, **duplicate**, with sums equal to the total skipped; the DNCR count computed from the people flagged DNCR. The agent spec's `survey_skip` reasons are `cap, not_identified, opted_out, open_case, no_milestone` (section C item 7).
- Files: `data/v38Reference.ts` (foundation), `pages/Surveys.tsx` (C).

### F26 Investigation closes with a result, evidence, proposed fix [Partial]
- On a running investigation row a primary small button "Record the result" / "سجّل النتيجة". It sets the status to done (done = requested count), stores a result text, then: if the investigated signal has **no fix yet**, creates a **proposed** fix `CA-{next}` (kind correction, owner L&D manager, `by: Agent 5, from the investigation`, source "Evidence: {INV id}", proposal date today) titled in the sample "Replace the branch brochure and re-brief the agents on the approved payment plans (proposed from INV-1)". Toast "Result recorded as evidence; a fix was proposed for approval." In the prototype the result text is canned (S11); React already asks for free text.
- The **pattern card** then shows a green-bordered line "Evidence from investigation · {INV id}: {result}" under its heading.
- React now: `pages/actions/Investigations.tsx` "Record evidence returned" stores `resultSummary` only (status `returned`); no evidence line on the pattern, no proposed fix. Foundation: `returnInvestigation` also creates the proposed fix (audit entry by Agent 5); B: evidence line in the pattern card, the button label and toast.
- Files: `pages/actions/Investigations.tsx`, pattern card in `pages/actions/Signals.tsx` (B); `services/queries.ts` (foundation).

### F27 Close the loop calling rules [Missing]
- A hint at the top of the call list: "Calls only between {09:00} and {18:00} UAE time, up to {3} attempts, the next one the following working day. After the last attempt a WhatsApp message goes out and the person is marked "needs a human" for the CX manager." (S11). Config keys `callFrom 09:00`, `callTo 18:00`, `callTries 3` (the prototype keeps them in its config object but does not list them on its Settings page: [Proposed] add them to Rules as configuration).
- On each list row with at least one attempt, under the due date: "attempt {n+1} of {3} · next {date}". The "No answer" action: attempts + 1; next attempt = tomorrow, skipping Friday and Saturday (weekend conflict, F20: use the working-days setting); at 3 attempts the status becomes "needs human" (still counts as open) and toast "No answer after 3 attempts: WhatsApp sent, flagged "needs a human"."; otherwise toast "No answer. Next attempt {date} within calling hours." (S11). Sample: items in "no answer" status start with 1 attempt.
- **KB conflict**: Programme KB lines 172 and 334 (the After-Sales calling placeholders, still open in 43.9) say calling hours "09:00 to 20:00 assumed" and "three tries are placeholders to confirm with Legal"; v40 uses 09:00 to 18:00. Badge the values [Proposed]. Also the AI campaign hand-off rule in React and the spec is "hangs up or does not answer **twice**" then needs a human; v40's call list says **three**. Both can be true (campaign versus human list) but ask the owner (C item 8).
- React now: `DetractorCallItem` has outcome only (reached, resolved on call, declined, callback requested); no attempts, no no-answer status. Foundation: `attempts`, `nextAttemptOn`, `status`, `useRecordNoAnswer`, `utils/callSchedule.ts`, rules keys for hours and tries (`MOCK_RULES_CONFIG`). C: list hint, row suffix, "No answer" button in `pages/CloseTheLoop.tsx` and `components/closeTheLoop/InterviewDialog.tsx`.

### F28 One sign-in with six main roles [Partial]
- Sign-in card "Sign in" / "تسجيل الدخول", note "In the real platform this is one company sign-in and the role comes from the directory. In the prototype, choose who you are." Six role cards in a 3-column grid: **CX manager, CX team, Environment manager, Marketing, L&D, Internal Audit and Marketing Lead** (role name plus the start of its description, cut at 110 characters in the prototype: show it in full, clamp lines). Below, a collapsed `<details>`: "Other roles used in the demo (team leads, HR, executives, product teams, mystery shoppers)" holding the remaining entries (S12).
- Map to React roles: main = `cxmgr, cxteam, envmgmt, marketing, ld, auditmkt`; folded = `teamlead, aslead, hrspec, hrmgr, exec, shopper`. The prototype's product-team roles and After-Sales agent have no React equivalent (not needed).
- React now: `pages/Login.tsx` already is one sign-in with a role picker but shows all 12 roles flat. Also update `Login.test.tsx`, `e2e/auth.spec.ts` if they click role cards by name.
- Files: `pages/Login.tsx`, `pages/Login.test.tsx` (A); `data/roles.ts` gets `MAIN_ROLE_IDS` (foundation).

### F29 Customers list with filters and export [Partial]
- Under the search (Find a person tab, no person open): card "Everyone on record" / "كل من في السجل", hint "Browse instead of search. Filter, then open a person or export the list for a call round or a campaign." Filters (selects): environment (all + 3), type (all + Lead, Buyer, Tenant, Owner, Investor, Member), source of the lead (all + PSI Real Estate app, PSI Website, WhatsApp, PSI Club, CRM; the prototype labels the Club source "PSI Club breach log", [Proposed] "PSI Club" here); count "{n} people"; button "Export list (CSV)" at the end. Columns: Person (button, opens the journey), Type, Environment, Source badge, Product, Last contact (date), Problems (count chip: crit if any critical else warn; "0" muted), Drifting (runaway type chip or "–").
- Export in the prototype is a toast only: "CSV prepared (prototype): name, mobile, type, environment, source, last contact. Names and mobiles only for roles allowed to see them." [Proposed] real download via the existing `utils/csv.ts` `downloadCsv`, same columns, scope-respecting; which roles see mobiles is not defined: owner question.
- React now: `pages/Customers.tsx` `CustomerList` is a sortable table (name, type, environment, preferred channel, units) with a text filter and row click; `Person.type` is only `lead | customer`; no source of lead, last contact, problems, drifting. Foundation: `Person.segment` (6 values), `Person.sourceOfLead`; C: columns, filters, export.
- Files: `pages/Customers.tsx`, new `components/customers/CustomerList.tsx` (C).

### F30 Public mentions list with reply status and owner [Partial]
- Page "Public mentions" / "الإشارات العامة" under Settings and reference (also a button "Work the mentions" on the public reputation card). Rule line: public reply within {48} hours from the approved wording, inviting the person to WhatsApp or the app; nobody here is surveyed or matched to a record (S14). Table newest first: Date, Channel (source badge), Mention, Tone (Negative crit, Positive good, Neutral), Reply (below), Identified ("Moved to WhatsApp" good chip or "–"), Owner ("Marketing · channel owner" for every row), action "Mark replied" (CX roles and Marketing only, only when not replied; sets replied, reply hours = days since x 24, minimum 1; toast "Marked replied; the index updates.").
- Reply chip: replied = "Replied in {n} h" (good); not replied and older than 48 h = "No reply, over 48 h" (crit); else "Awaiting reply" (warn). Prototype quirk: the Identified chip always says WhatsApp even when the channel was Instagram or LinkedIn: [Proposed] say "Moved to a private channel".
- Owner is hard-coded text; the KB does not name who owns public replies: **[Proposed]**, ask the owner.
- React now: `PUBLIC_MENTIONS` (16 rows, same text and reply hours as the prototype; fields `platform, date, environment, text, sentiment, replied, replyHours, becameIdentified`) and a "Public mentions" SectionCard in `Signals.tsx` showing the 48 h clock on signals. No page, no owner, no "Mark replied". Foundation: promote to a mutable `usePublicMentions` with `owner` and `markReplied`.
- Files: new `pages/settings/PublicMentions.tsx` (C); small edit in the reputation card, `pages/settings/OverviewInsights.tsx`, to add the button (C).

### F31 Weekly sample page [Missing]
- Page "Weekly sample" / "العينة الأسبوعية" under Settings and reference; four tiles: Read ({n} / 50), Wrong ({n}, "each becomes a test"), Accuracy this week (% or "–"), Due (`2026-10-30`, "every Thursday"). Table: #, Agent (chip), Kind, Output (first 110 characters plus the trace id of the record), Verdict (two buttons "✓ Right" / "✗ Wrong", then a chip "Right" or "Wrong → new test"). Intro S15.
- Composition of the 50 (prototype): every fix (Agent 5 "Proposed fix"), first 18 signals (Agent 2 "Classification": title → category), first 12 loop items (Agent 8 "Interview brief": person name · reason code), first 10 people (Agent 7 "Journey reading": person name · runaway type or "healthy"), padded with Agent 3 "Signal count" to 50. Agents 1, 4, 6, 9, 10 never appear. [Proposed] sample across all agents with approved outputs, proportional to volume.
- **Privacy**: the prototype prints **customer names** in the sample and gives the page to the Internal Audit and Marketing Lead, whose role is "no cases, no conversation text, no agent names". [Proposed] show the person trace id instead of the name for every role except CX manager and CX team.
- Consistency: due date 2026-10-30 is a **Friday**, the text says every Thursday. Use Thursday.
- "Wrong lowers that agent's pass rate" (page text) is not in the agent spec (spec: disagreements "recorded against the check that missed them and become test cases"). [Proposed] keep the spec wording; see C item 2.
- Roles: the prototype's view lists give it to CX manager, Internal Audit and Marketing Lead, Executive; CX team sees everything. [Proposed] only CX team and Internal Audit and Marketing Lead can judge; others read.
- Files: new `pages/settings/WeeklySample.tsx` (C); `useWeeklySample`, `useJudgeSample` (foundation).

### F32 "What if" on the thresholds [Missing]
- Card "What if" / "ماذا لو" appended to the signals Rules tab: "With today's thresholds there are {n} patterns. Each cell shows how many there would be with that one value changed; the bold one is the current setting. Change it under Settings." Table of three rows, each a list of candidate values with "{value} → {n} patterns": Same issue, times [3, 4, 5, 6, 8]; Same agent, times [2, 3, 4, 5]; Window (days) [14, 30, 45, 60]. The concentration threshold (50%) is not included. [Proposed] candidate values are samples: put them in data.
- Needs `detectPatterns(signals, { windowDays, sameIssueMin, sameAgentMin, ... })` to take overrides (today it reads the constant `PATTERN_RULES`) so each cell recomputes with one value changed and the current values restored.
- Files: `utils/patterns.ts` (foundation); new `components/signals/WhatIfCard.tsx` mounted in `pages/actions/Signals.tsx` (B).

### F33 Arabic on agent chips [Partial]
- Chip "Agent 9 · Reporting" / "الوكيل 9 · التقارير" (name in the active language). Used in: daily brief, "How the AI found this" (chips for Agent 3, Agent 5 when AI-made, plus "CX Supervisor: 6 checks passed" / "سوبرفايزر CX: اجتاز 6 فحوصات" and a "Who does what" button), weekly sample rows.
- React now: the roster in `IntelligentCxTeam.tsx` already prints `الوكيل n`; there is **no reusable chip** and `pages/actions/components/HowAiFoundThis.tsx` has no agent chips at all (a v38 gap). Foundation: `components/common/AgentChip.tsx`; A and B use it (A: brief; B: How the AI found this).

### F34 Tables scroll on mobile [Done]
- v40 CSS at <= 820 px: cards and table wrappers scroll sideways; 4- and 3-column grids become 2 columns, 2-column grids become 1; step strip 3 columns; trace grid 2 columns.
- React: `components/ui/table.tsx` already wraps tables in `overflow-x-auto`. Check each new page the same way at 375 px in both directions (e2e).

### F35 Role and page permission changes [Missing]
Derived from the code (the KB does not list them); confirm with the owner. v40 adds to each role's page list:

| Pages | Roles (React ids) |
|---|---|
| My inbox | every role that has Customers or Who is leaving: `cxmgr, cxteam, envmgmt, teamlead, aslead, marketing, auditmkt, exec` (not `ld, hrspec, hrmgr, shopper`) |
| Customers (via the runaway fold) | `auditmkt` gains Customers (it had Runaway and Personas): the people list shows names to it. Flag: Internal Audit and Marketing Lead is "aggregates and audit views only" |
| Data feeds, CRM mapping, Escalation matrix, Survey questions, Weekly sample, Public mentions | `cxmgr`, `cxteam` (all pages), `auditmkt`, `exec` |
| Public mentions | also `marketing` |
| Overview ("6 · CX indicators") | as before, now a main menu item: `cxmgr, cxteam, exec, auditmkt` (Marketing does not have it: its view list is Home, Customers, Who is leaving, Personas) |
| Edit rights | mapping and matrix: CX manager and Internal Audit and Marketing Lead; feeds: nobody; sample verdicts: see F31 |

- React: `auth/access.ts` `ROLE_PATHS`; tests in `auth/permissions.test.ts`. Also Marketing's React home is `/personas` while the prototype home for Marketing is Home; and `auditmkt` home becomes `/overview`. [Proposed] align `RoleDef.home`.

### F36 Agent 9 text [Missing]
- v40 changes the roster text for Agent 9: runs "Daily 07:00 for the brief; first working day of the month for the pack; on demand" ("يومياً 07:00 للموجز؛ أول يوم عمل في الشهر للحزمة؛ وعند الطلب"); output "The daily brief per role; the Monthly CX pack; the role summaries; every figure traceable to its register" ("الموجز اليومي لكل دور؛ حزمة CX الشهرية؛ ملخصات الأدوار؛ كل رقم له أثر إلى سجله"). Task, inputs, rules, model step, supervisor checks, escalation, stage (shadow) and approval 100% are unchanged.
- React: `data/agentRegistry.ts` id 9 (`trigger`, `runsOn`) and `data/v38Reference.ts` `AGENT_JDS` id 9 (`output`, `showsOn`). Files: A for `agentRegistry.ts`; `v38Reference.ts` is shared, so foundation edits it.

---

## B. Contradictions: where React does it the v38 way and v40 says otherwise

| # | React today | v40 | Resolution [Proposed] |
|---|---|---|---|
| B1 | Menu: 7 workspace items, Team group, folded Settings (`data/nav.ts`) | 6 main items in step order; Runaway, Personas, Surveys removed; AI team renamed and moved to Settings group | F08, F17, F18 |
| B2 | `/runaway` and `/personas` are top-level pages | tabs inside Customers | shared tab strip, keep URLs (F17) |
| B3 | `/surveys` is a primary page, plus legacy `/settings/surveys-reference` | Surveys and triggers under Settings only | move to `/settings/surveys`, redirect (F18) |
| B4 | Hand-offs are a card on the Signals page | folded under the fixes tab, collapsed | move block (F19) |
| B5 | Home = search, 5 live-number tiles, Needs attention, signals chart, patterns, AI activity | six steps, brief, new-here, per-product indicators, inbox card, search | rebuild (F01). Home tests and fidelity rows ("Five live numbers, each a button", Marketing/env limits) must be rewritten |
| B6 | Overview at `/settings/overview` | main menu item "6 · CX indicators" | new route `/overview` rendering the same page, redirect the old path (F08) |
| B7 | Intelligent CX team in its own "Team" group | inside Settings group, labelled "How the portal works (the AI team)"; page title unchanged | keep route `/intelligent-cx-team`, change menu label and place (F08) |
| B8 | Sign-in lists 12 roles flat | 6 main roles, others folded; Marketing home = Home; Internal Audit home = Overview | F28, F35 |
| B9 | Environments in mock data: Dubai, Abu Dhabi, **Amman, Sharjah** (`mockData.ts` weights 42/24/18/16). `data/v38Reference.ts` public mentions use "PSI Assets" | three CRM environments `dub, auh, ast` = Dubai, Abu Dhabi, PSI Assets (rental); feeds, switch, DNCR all depend on them | foundation replaces the four with three ids and Bi names (also KB: environment names are placeholders to confirm, 43.8). Impacts unit tests and e2e that assert "Amman" or "Sharjah" |
| B10 | Public-mention signals can carry a `personId` and `isPublic=false` | public mentions never link to a person | data fix (F12) |
| B11 | Ids `i-0001`, `sig-0001`, `pat-n`, `ca-n`; `Signal` has no events | display ids EV/SG/PT/CA/VR/RP and walkable links | F10 |
| B12 | Fix statuses use "60-day check" (matches the rules) | prototype status label is still "30-day check" and its definitions say "30-day check", while its next-box says "at 60 days" | **do not port the 30-day wording**; keep 60 (Rules and Definitions Decision 3). Tell the owner the prototype labels are stale |
| B13 | Calendar-time clocks (`utils/clock.ts`) | working-day counters, Friday and Saturday weekend in code | KB says Monday to Friday: follow the KB, configurable (F20) |
| B14 | Calling hours not modelled | prototype default 09:00 to 18:00, 3 attempts | KB says 09:00 to 20:00 assumed; badge [Proposed] (F27) |
| B15 | Glossary CES = "1 to 7 or 1 to 5" (also Modules KB) | CES 1 to 5, 4 or 5 | update glossary (F04); Modules KB will be regenerated by the owner |
| B16 | Rules page: empty matrix template per **kind** with Response and Resolution columns | page with defaults per product and kind; Rules doc template is per **complaint category** (Owner, Backup, Informed, Routing) and one matrix per environment for Real Estate | owner to decide which layout is the contract; build the v40 page, keep both in data |
| B17 | Editing a threshold in Settings → Rules does not change patterns (static `MOCK_PATTERNS`) | "change them there and every page recomputes"; What-if recomputes | patterns computed from the rules at read time (F16, F32) |
| B18 | `Person.type` is `lead | customer` | six types (Lead, Buyer, Tenant, Owner, Investor, Member), `srcLead`, consent flags | extend `Person` (F29, F24) |
| B19 | Close the loop has outcomes only | attempts, calling hours, "needs a human" status | F27 |
| B20 | Intelligent CX team intro (prototype v40): "Nine agents with one task each" (stale) | roster has ten agents | keep React's "ten"; do not port the sentence |
| B21 | Role gating is strict (links only to pages the role may open) | the daily brief links to pages some roles cannot open; weekly sample shows customer names to Internal Audit | filter links by access; hide names (F09, F31) |
| B22 | Reputation, Signals and Overview mount the "?" via `term` props | prototype injects "?" on any label matching a glossary key | keep the React way; add the three tile "?" (F04) |

Not contradictions but easy to get wrong: the environment switch in the prototype narrows people and signals/shopper cases only (F14); `ia`/`ex` can see the sample; the hash-based `PT-` id can collide (F10); in the prototype `PUB-3nn` signal ids are not turned into `SG-` ids (F10).

---

## C. Agent deck and specification check

Files unchanged since 17 Nov (git: `6a29f15`); v39 and v40 changed agent-related behaviour in the prototype in the following ways. Facts only; no document edited.

| # | v39/v40 behaviour | Deck (PDF, 9 slides) | Spec (docx) | Our React data | Verdict |
|---|---|---|---|---|---|
| C1 | **Agent 9 writes a daily brief per role at 07:00**; roster runs/out text changed | slide 2 "write the monthly report"; slide 6 card 9 "The monthly report ... one report per product on the first day of the month" | Agent 9 trigger "First working day of the month; on demand by the CX manager"; output `report {period, audience, figures, narrative}`; operating-rhythm row 9 "First working day of the month; on demand; Monthly, released by the CX manager"; no brief anywhere | `agentRegistry.ts` id 9 trigger and runsOn monthly only; `AGENT_JDS` id 9 output `report {...}`, showsOn "Monthly CX pack, per audience" | **Spec and deck need a line each**; React data needs the F36 text. Spec details to add: trigger "daily 07:00 per role"; output `brief {role, date, lines: [{text, figure refs, target page}]}`; rule "the brief and the page tiles read the same metric store, one NPS source"; supervisor check unchanged (every number recomputed); no send, shown on Home |
| C2 | **Weekly sample page**: 50 outputs, right/wrong, "wrong becomes a new test for the supervisor and lowers that agent's pass rate", due every Thursday | slides 7 and 9: "read 50 passed outputs by eye; every miss becomes a new test for the checker" | Supervisor calibration: weekly sample of 50 approved outputs by CX team and Internal Audit and Marketing Lead; disagreements recorded against the check that missed them and become test cases; approval rate per agent shown on the agents page | `agentRegistry.ts` supervisor `runsOn` says the same; no page | Consistent in intent. Differences: "lowers that agent's pass rate" is new (spec's rate is first-time approval; a human "wrong" would need a defined effect); the prototype's sample only draws from Agents 2, 3, 5, 7, 8; the day (Thursday) is not in the spec. Owner to confirm |
| C3 | **Arabic on agent chips** ("الوكيل 9 · التقارير") | not applicable (deck is English) | not applicable | roster prints `الوكيل n` already | No document change. React: reusable chip (F33) |
| C4 | **Trace ids** EV, SG, PT, CA, VR, RP, with links in both directions, trace card on every fix and signal | not mentioned | output envelope has `run_id`, `subject_type`, `subject_id`, `evidence[]` but no human-readable display id nor lineage fields; "how the AI found this" reads the audit log | none | Spec/Integration Plan gap [Proposed]: event id stable and exposed, signal lists its event ids, pattern id, fix to check to report ids. Not an agent behaviour change |
| C5 | **Data feeds and CRM mapping pages**: feed last received/status; "Agent 1 reconciles nightly; the Internal Audit and Marketing Lead marks a feed trusted once a month"; mapping unmapped values default to "Ignore" and appear in the weekly sample for Internal Audit | not mentioned | Agent 1: nightly reconciliation yes; Agent 3: feed spike to Internal Audit and Marketing Lead; "marks feeds trusted" is in the KB; **no mapping configuration and no unmapped queue** | none | Spec gap [Proposed]: add the mapping table as configuration (`crm.map.*`), unmapped = ignored and queued for review. Note the sample in the spec is of approved outputs, not unmapped values |
| C6 | **Escalation matrix page with Respond/Resolve hours per kind** | slide 8: "Names come from each product's escalation matrix" | routing table "Receiver (by matrix)"; Agent 5 rule "due within 14 days"; Rules doc: SLAs same in every environment | `lib/actionKinds.ts` | Unclear relation between matrix "Resolve (h)" (45 or 90 working hours = 5 or 10 working days) and Agent 5's "due within 14 days". Ask the owner which one sets the fix due date |
| C7 | **Consent and DNCR; skipped surveys state the reason** (DNCR, cap, no consent, duplicate) | slide 6 card 10: "never sends too many" | Agent 10 `survey_skip` reasons: `cap, not_identified, opted_out, open_case, no_milestone`; must not send outside working hours for calls | `SURVEY_DELIVERY_LAST_MONTH.skippedBy`: cap, not identified, opted out | Spec enum lacks `dncr`, `no_consent`, `duplicate`. Add (or map to `opted_out`) and add "never survey by call a person flagged DNCR" |
| C8 | **Close the loop: up to 3 attempts, next attempt the following working day, WhatsApp after the last, then "needs a human"; calling hours 09:00 to 18:00** | slide 6 card 8 | Agent 8 / AI campaign: "hangs up or does not answer **twice**" then "needs a human"; Agent 10: no calls outside working hours; Programme KB: calling hours 09:00 to 20:00 assumed, three tries placeholders | `CampaignDialog.tsx` (twice) | Two numbers (2 for AI campaign, 3 for the human call list) and two hours (18:00 versus 20:00). Owner to confirm both and Legal to set hours (43.9) |
| C9 | **Investigation close proposes a fix "by Agent 5, from the investigation"** | slide 5: "Thin evidence: it proposes an investigation, not a fix" | Agent 5: investigation request when evidence is thin | `Investigations.tsx` | Consistent. Spec could state that the returned result is re-read by Agent 5 and proposes the fix |
| C10 | Agent roster other fields (names, stage, approvals 97/94/96/-/88/99/91/93/100/98, six supervisor checks, verdicts, calibration) | consistent | consistent | `AGENT_JDS` equal to v40 | No change |
| C11 | Prototype text "Nine agents with one task each" on the agents page | "Ten" | "nine workers" in places, Agent 10 added 16 Nov | React says ten | Prototype text stale; no change to React |

**Conclusion:** the deck and the spec need small updates for C1 (Agent 9 daily brief), C2 (sample wording), C7 (skip reasons), C8 (attempts and hours), plus the open questions C4 to C6. Our `agentRegistry.ts` and `AGENT_JDS` need the Agent 9 text only (F36).

---

## D. Implementation split: foundation, then three parallel workstreams

Ground facts that shape the split: the app has **no i18n dictionary**. Strings are inline `t(en, ar)` in components or `Bi` objects in `src/data/*.ts`, `src/lib`, `src/utils`, `src/services/mockData.ts`, and `src/i18n/completeness.test.ts` scans exactly those modules. So "i18n keys" = `Bi` constants in new data files (auto-checked) plus inline `t()` in each owner's files. `services/mockStore.ts` loads **one** module (`./mockData`) as `mock`; `services/queries.ts` (678 lines) is the only data seam and is edited by almost every feature, so it is the main conflict risk.

### D1. Foundation (one engineer, blocks the others; sizing ~6 engineer-days)

Two milestones so the others can start early:
- **F0.1, end of day 1 to 2** (merge first): types, hook stubs with typed empty/seed returns, routes and nav, permissions, stub pages, shared primitives as stubs. After this the three workstreams can build UI against typed stubs.
- **F0.2, day 4 to 6**: real mock data, utils, hook implementations, tests green.

Files owned by foundation (nobody else edits them; others only import):

| Area | Files |
|---|---|
| Types | `src/types/domain.ts`, `reference.ts`, `roles.ts`, `common.ts`; new `src/types/v40.ts` re-exported by `types/index.ts` |
| Mock data | `src/services/mockData.ts`, new `src/services/mockDataV40.ts` (builders, imported and re-exported by `mockData.ts` so `mockStore.ts` stays unchanged), `src/data/v38Reference.ts`, `src/data/products.ts`, `src/i18n/completeness.test.ts` (add the new file to the glob) |
| Data seam | `src/services/queries.ts` and `src/services/referenceQueries.ts` (existing hooks and mutations edited; `usePublicMentions` already exists in the second one, read-only), new `src/services/queriesV40.ts` (all new hooks) |
| Navigation and access | `src/data/nav.ts`, `src/data/roles.ts`, `src/auth/access.ts`, `src/auth/permissions.ts` (+ tests), `src/routes/pages.ts`, `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Shell.tsx` (mount points only), `e2e/helpers.ts` (ROUTES, role helpers), `e2e/features.spec.ts`, `e2e/passI.spec.ts`, `e2e/keyboard.spec.ts`, `e2e/a11y.spec.ts` |
| New data files (all `Bi`) | `src/data/steps.ts` (STEPS, next-step texts), `feeds.ts`, `crmMapping.ts`, `escalationDefaults.ts`, `surveyQuestions.ts`, `environments.ts` |
| New utils | `utils/trace.ts`, `utils/workingDays.ts`, `utils/inbox.ts`, `utils/indicators.ts` (extracted from `Overview.tsx`), `utils/callSchedule.ts`, `utils/patterns.ts` (threshold overrides) |
| Shared primitives (stub in F0.1, final in F0.2) | `components/common/StepStrip.tsx`, `NextBox.tsx`, `TraceId.tsx`, `AgentChip.tsx`, `DayChip.tsx`, `ProposedBadge.tsx`; mount points: `<AsOfBar/>` and `<TraceHost/>` in `Shell.tsx` (their content files belong to A and B) |

Foundation must contain:

1. **Types** (proposed shapes, to be refined by the foundation engineer):
   - `EnvId = 'dub' | 'auh' | 'ast'`; `Environment { id, name: Bi }`; replace the four string environments everywhere in mock data.
   - `Person` += `segment: 'lead'|'buyer'|'tenant'|'owner'|'investor'|'member'`, `sourceOfLead: ChannelId`, `consent: { dncr, whatsapp, sms, email }`, `envId`. Keep `type` for existing code.
   - `Signal` += `eventIds: string[]`, `envId`; invariant `kind==='public_mention'` implies `isPublic`, no `personId`, `eventIds=[]`.
   - `Pattern` += `key: string` (stable, e.g. `kind|category|team|agentRef`).
   - `CorrectiveAction` += `auditLog: AuditEntry[]`, `proposedAt: string`, `product: ProductId`, `source?: { investigationId: string }`; `AuditEntry { at: string; what: Bi; byRole: RoleId | 'system' }`.
   - `Investigation` += `result?: Bi`, `doneCount?: number`, `status` keeps `requested | in_progress | returned`.
   - `DetractorCallItem` += `attempts: number`, `nextAttemptOn?: string`, `status: 'to_do'|'no_answer'|'needs_human'|'reached'|'done'|...`, `consent` read from the person.
   - `PublicMention` += `owner: Bi`, `replied: boolean` mutable, `channelMovedTo?`.
   - New: `DataFeed { id, env?: EnvId, name: Bi, receivedAt, status: 'ok'|'late'|'down', rows, note: Bi }`; `MappingRow { kind: 'src'|'stg'|'act', crmValue, portalValue }` plus option lists; `MatrixKind` (10 keys), `MatrixCells { receiver, informed, backup, respondH, resolveH }`, `Matrix = Record<ProductId, Record<MatrixKind, MatrixCells>>`, `isDefault` per cell; `SurveyQuestionSet { product, id, name: Bi, when: Bi, questions: Bi[] }`; `InboxItem { kind, id, text: Bi, daysLeft: number|null, unit: 'wd'|'d', who, priority: 0|1|2, target: string }`; `WeeklySampleItem { id, agent: 1..10, kind: Bi, text: Bi, ref, verdict: boolean|null }`; `TraceChain { events, signals, pattern?, fix?, check?, report? }`; `BriefLine { text: Bi, to: string }`; `IndicatorSet { productId, nps, csat, ces, answers, deltaVsLastMonth }`.
2. **Mock data** (deterministic, same seed): 3 environments; signal-to-event links; person segments, sources, consent (use the sample pattern in F24); proposal dates and a handful of audit entries on fixes; attempts on 3 or 4 close-the-loop items; public mentions as mutable list with owner; `MOCK_FEEDS` (table in F13); `MOCK_MAPPING` (S6); `MOCK_MATRIX` (defaults, F22); `MOCK_QUESTION_SETS` (S10); `MOCK_WEEKLY_SAMPLE` (50 items); rules keys for `callFrom`, `callTo`, `callTries`, `workingDays`, `publicReply`.
3. **Hooks** in `queriesV40.ts`: `useFeeds`, `useCrmMapping` + `useSaveMapping`, `useMatrix` + `useSaveMatrixCell`, `useQuestionSets`, `useInbox`, `useIndicators`, `useBriefInputs` (or `useSigStats`, `useLoopStats`), `useTrace(kind, id)`, `useSignalDetail(id)`, `useWeeklySample` + `useJudgeSample`, `usePublicMentions` + `useMarkReplied`, `useRecordNoAnswer`, `useEnvScope()` context + env-aware `usePersons/useSignals/useShopperCases` (query key includes the env). Existing hooks edited: `decideCorrectiveAction` writes audit entries; `returnInvestigation` creates the proposed fix and returns evidence; `usePatterns` computes from `useRulesConfig`.
4. **Nav, routes, permissions** (F08, F35): new `PRIMARY_NAV` (6 items), `SETTINGS_NAV` additions, `CUSTOMERS_TABS`; routes `/inbox`, `/overview`, `/settings/surveys`, `/settings/feeds`, `/settings/crm-mapping`, `/settings/escalation-matrix`, `/settings/survey-questions`, `/settings/weekly-sample`, `/settings/public-mentions`; redirects from `/surveys` and `/settings/overview`; `ROLE_PATHS` per F35; `MAIN_ROLE_IDS`; stub page files so `lazy()` loaders resolve (each stub is overwritten by its owner).
5. **Primitives** listed above, with the strings of S1 and S2.

Risk: foundation touches `mockData.ts`, so existing unit tests (141) and e2e (135) that assert environment names or ids will fail until updated. Budget ~1.5 days of that inside the 6.

### D2. Workstream A: Orientation, Home, roles, agents (~11 engineer-days, F0.1 needed)

Owns: `pages/Home.tsx`, new `components/home/**` (IndicatorCard, StartHere, WorkToday, DailyBrief), `utils/brief.ts`, `pages/inbox/Inbox.tsx`, `components/layout/AsOfBar.tsx`, `pages/Login.tsx` and `Login.test.tsx`, `e2e/auth.spec.ts`, `pages/IntelligentCxTeam.tsx`, `data/agentRegistry.ts`, `data/glossary.ts`, `components/common/RoleSwitch.tsx`, `components/layout/UserMenu.tsx`, new `e2e/v40-orientation.spec.ts`.
Features: F01, F02 (use), F03, F04, F05, F06, F09, F14 (bar UI), F20 (page), F28, F33 (use), F36.
Consumes from foundation: `StepStrip`, `NextBox` (not needed), `DayChip`, `AgentChip`, `useIndicators`, `useInbox`, `useBriefInputs`, `useEnvScope`.

### D3. Workstream B: Trace, fixes, signals, rules (~10 engineer-days)

Owns: everything under `pages/actions/**` (including `components/`), `components/customers/Timeline.tsx` and its test, new `components/trace/**` (TraceCard, SignalDetailDialog, TraceHost content), `pages/settings/Rules.tsx`, new `pages/settings/EscalationMatrix.tsx`, new `components/signals/WhatIfCard.tsx`, new `e2e/v40-trace.spec.ts`.
Features: F07 (Actions page, fix detail), F11, F12, F16, F19, F21, F22, F26, F32, F33 (How the AI found this).
Consumes: `useTrace`, `useSignalDetail`, `useMatrix`, `NextBox`, `TraceId`, `AgentChip`, patterns with overrides.

### D4. Workstream C: People, loop, surveys, data pages (~12 engineer-days)

Owns: `pages/Customers.tsx`, `components/customers/ProfileCard.tsx` and new `CustomerList.tsx`, `CustomersTabs.tsx`, `pages/Runaway.tsx`, `pages/Personas.tsx` (tab strip only), `pages/CloseTheLoop.tsx`, `components/closeTheLoop/**`, `pages/Surveys.tsx`, `pages/settings/Overview.tsx` (next-box, route moved), `pages/settings/SettingsLayout.tsx`, `SurveysReference.tsx`, new `pages/settings/Feeds.tsx`, `CrmMapping.tsx`, `SurveyQuestions.tsx`, `PublicMentions.tsx`, `WeeklySample.tsx`, `pages/settings/OverviewInsights.tsx` (reputation card) for the "Work the mentions" button, new `e2e/v40-people.spec.ts`.
Features: F07 (journey, loop, overview), F13, F15, F17, F18, F23, F24, F25, F27, F29, F30, F31, F34 (QA).
Consumes: `useFeeds`, `useCrmMapping`, `useQuestionSets`, `usePublicMentions`, `useWeeklySample`, `useRecordNoAnswer`, `ProposedBadge`, `NextBox`.

### D5. Sizing and plan

| Block | Engineer-days | Notes |
|---|---|---|
| Foundation | 6 | F0.1 by day 2, F0.2 by day 6 |
| A | 11 | Home 3.5, brief 2, inbox page 2, as-of bar 1, sign-in 1, chips/agents/glossary 1.5 |
| B | 10 | trace card+modal+ids 4, audit 1, matrix 2, investigation 1, what-if + pointer 1, next-box and hand-offs 1 |
| C | 12 | feeds+mapping 2, customers tabs+list+consent 3.5, loop 1.5, questions 1.5, public 1, sample 1.5, surveys/skip 0.5, QA 0.5 |
| Tests, a11y, docs | 3 | update `FIDELITY_REVIEW.md`, `IMPLEMENTATION_REPORT.md` |
| **Total** | **~42** | about 3 calendar weeks with 4 people |

Rules for parallel work: nobody edits a file owned by another block; need a change in a shared file, ask foundation (or add it in the foundation PR queue); new e2e specs are per workstream; everyone keeps data in `Bi` and passes `npm run check`; each new page registers in `e2e/helpers.ts ROUTES` through foundation so the axe scan covers it.

### D6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | v40 is under owner review; values may change | all values in data files; badge [Proposed] items (section E); no logic tied to a specific number |
| R2 | Foundation is the critical path and edits the biggest file | F0.1 early merge; builders in a new file; others never touch `mockData.ts` |
| R3 | Environment change (4 to 3) breaks existing tests and Home/Overview samples | one commit, fix tests in the same PR |
| R4 | Trace chain recomputes patterns per call (prototype is O(n^2)) | memoise `usePatterns`; build chain from indexes |
| R5 | Role/permission mistakes (brief links, sample names, customers for Internal Audit) | `canAccessPath` filter on links; names only for CX roles; permission tests for every new route |
| R6 | New Arabic strings and Arabic for matrix titles, `consent`, `mapping` rows | every string through `t()` or `Bi`; completeness test; native review of the matrix titles |
| R7 | Accessibility of new modal, tab strips, tables | shadcn `Dialog` for the signal modal (focus trap), `RouteTabs` for Customers tabs; add routes to the axe list |
| R8 | Prototype quirks copied by mistake | see "do not copy" list below |
| R9 | Working week and calling hours disagree with the KB | configuration keys, badge, ask the owner |

**Prototype quirks, do not copy:** hash-based `PT-` ids that collide; "Moved to WhatsApp" regardless of channel; "{n} feed late or missing" without plural; text-injected skip numbers (31, 6, 9 versus 2,210); role descriptions cut at 110 characters; brief links the role cannot open; "30-day check" labels; "Nine agents"; sample due date on a Friday with "every Thursday"; customer names in the weekly sample; matrix cells English-only; the inbox row text built from unescaped fragments; CRM count text (13 stages, 9 sources, 11 events) that differs from the tables.

---

## E. Proposed versus decided (for badges in the UI)

Decided by the owner (KB 44 and earlier sections): the six-step line and its names; indicators NPS, CSAT, CES per live product with a plain sentence; "?" definitions; Daily brief by Agent 9 at 07:00, one per role; trace chain EV to RP; Data feeds page (3 CRM environments + shared); "Data as of" bar and environment switch; CRM mapping page as configuration (Media to source, lead stage to funnel stage, activity category to event); one place for thresholds; merged menu (Customers holds search, who is leaving, personas; Surveys under settings; hand-offs under the fixes tab); My inbox with the 5-working-day window; audit trail (when, what, by which role); escalation matrix page per product; survey questions page in both languages with preview; consent and DNCR from the CRM; skipped surveys state the reason; investigation result becomes evidence and proposes a fix; calling hours, up to three attempts, next attempt the following working day, WhatsApp after the last; one sign-in with six main roles; customers list with filters and export; public mentions with reply status and owner; weekly sample of 50 right/wrong, wrong becomes a test; "What if" on thresholds; Arabic on agent chips; mobile scroll.

**Badge as [Proposed] in the UI (default, placeholder, or a prototype choice not confirmed):**

| What | Why | Where to badge |
|---|---|---|
| Every escalation-matrix cell still at its default (receiver, informed, backup, respond, resolve) | KB 44: "defaults marked as proposals"; page text "Values marked with defaults are proposals until the owners confirm them"; owners fill by 28 Nov (43.1). The prototype does not mark cells individually | cell-level badge on unedited cells + header badge "Defaults are proposals" (F22) |
| Calling hours 09:00 to 18:00 and 3 attempts | KB 172 and 334: hours and tries are placeholders to confirm with Legal (09:00 to 20:00 assumed); open question 43.9 | hint on Close the loop and in Rules (F27) |
| Consent and DNCR flags and the rule that DNCR means no call and no survey by call | consent rules open (43.9); flags are synthetic sample | chip tooltip (F24) |
| CRM mapping rows and the "unmapped = Ignore" default | filled once with the CRM owner; sample from 17 Nov Abu Dhabi values; open question 43.5 | per-row badge until confirmed (F15) |
| Survey question wording, especially PSI Club, Tour Estate, PSI Events (not launched) | no KB decision; product owners and Marketing to confirm | set-level badge (F23) |
| Public reply owner "Marketing · channel owner" | not named in the KB | column badge (F30) |
| Weekly sample day (Thursday), "wrong lowers the agent's pass rate", sample composition, who may judge | not in the spec | page badge (F31) |
| KPI colour thresholds (NPS 30 and 0, CSAT 80 and 65, CES 75 and 60) | not in the KB | no badge needed; keep in data (F03) |
| Brief line set per role | KB says only "one per role" | hint on the card (F09) |
| What-if candidate values | prototype samples | none; data (F32) |
| Customers list types (Buyer, Tenant, Owner, Investor, Member) and sources filter | not defined in the KB | filter hint (F29) |
| Working week | prototype Friday and Saturday versus KB Monday to Friday | rules setting (F20) |
| Trace id schemes (`PT-` hash, `RP-2026-11` fixed) | prototype artefacts | none; internal (F10) |
| Arabic translations written for matrix titles and mapping portal values | prototype English only | none; native review (R6) |
| Environment names Dubai, Abu Dhabi, PSI Assets (rental) | KB: environment names are placeholders to confirm (43.8) | none |

**Open questions to put to the owner (do not resolve silently):** working week (Monday to Friday versus Friday and Saturday off); calling hours 18:00 or 20:00; AI campaign 2 no-answers versus call list 3 attempts; matrix layout (per kind versus per complaint category; per product versus per environment for Real Estate); Internal Audit and Marketing Lead sees the Customers list and weekly sample with names; who sees mobiles in the export; whether the environment switch should also narrow fixes and the call list; who owns public replies; whether the matrix "Resolve (h)" or Agent 5's "due within 14 days" sets a fix due date; does "wrong lowers the pass rate" stand.

---

## Appendix S. Verbatim v40 strings (EN | AR) and data

Copied from `v40.html`. `{x}` marks a value filled in at run time. Placeholders in brackets such as `[, N% by AI campaign]` are optional parts. Where the prototype built a sentence with a singular only (for example "feed late or missing"), say so in code, do not copy the grammar.

### S1 Home, steps, indicators, definitions

| Key | EN | AR |
|---|---|---|
| step ev | 1 Listen · Every contact from every source lands on one person | 1 نسمع · كل تواصل من أي مصدر يصل إلى شخص واحد |
| step sg | 2 Signal · What hurt a customer is counted, not worked one by one | 2 إشارة · ما أذى الزبون يُعدّ ولا يُعالج واحداً واحداً |
| step pt | 3 Pattern · Repeats over the line become one pattern | 3 نمط · التكرار فوق الحد يصبح نمطاً واحداً |
| step ca | 4 Fix · One suggested fix; a person approves | 4 إصلاح · حل واحد مقترح؛ إنسان يعتمده |
| step vr | 5 Check · Did it work, and did the customer recover | 5 تحقق · هل نفع، وهل تعافى الزبون |
| step rp | 6 Report · One line per product, every number traceable | 6 تقرير · سطر لكل منتج، كل رقم له أثر |
| h1 | What customers tell us, and what we fix | ما يقوله الزبائن، وما نصلحه |
| lede | One line, six steps. Everything in the portal is one of them. | خط واحد، ست خطوات. كل شيء في البورتال واحد منها. |
| tag | Prototype, sample data | نموذج تجريبي، بيانات افتراضية |
| indicators h2 | How customers feel, per product | كيف يشعر الزبائن، لكل منتج |
| terms button | What the terms mean | ماذا تعني المصطلحات |
| card meta | {n} answers, 90 days | {n} إجابة، 90 يوماً |
| NPS sentence | would recommend us | يوصون بنا |
| CSAT sentence | happy with the last step | راضون عن آخر خطوة |
| CES sentence | found it easy | وجدوها سهلة |
| buttons | Open {product} / All numbers | افتح {product} / كل الأرقام |
| search h2 | Find a person, or ask | ابحث عن شخص، أو اسأل |
| search placeholder | A name, a mobile, an ID, or a question: who left from Dubai this month? | اسم، جوال، هوية، أو سؤال: مين طلع من دبي هالشهر؟ |
| search button | Go | ابحث |
| new here summary | New here? Three things to know | جديد هنا؟ ثلاثة أشياء تعرفها |
| new here 1 | The portal does one thing: it turns what customers tell us into fixes, and checks the fixes worked. The six steps at the top are that one thing. Click any step to go there. | البورتال يفعل شيئاً واحداً: يحوّل ما يقوله الزبائن إلى حلول ويتأكد أنها نفعت. الخطوات الست في الأعلى هي ذلك الشيء. اضغط أي خطوة لتذهب إليها. |
| new here 2 | Three numbers say how customers feel: NPS (would they recommend us), CSAT (were they happy with the last step), CES (was it easy). Each product has its own; nothing is averaged across products. The "?" beside each one explains it. | ثلاثة أرقام تقول كيف يشعر الزبائن: NPS (هل يوصون بنا)، CSAT (هل رضوا عن آخر خطوة)، CES (هل كانت سهلة). لكل منتج أرقامه؛ لا يُجمع شيء بين المنتجات. علامة "?" بجانب كل رقم تشرحه. |
| new here 3 | Every record shows where it is on the six steps and what happens next, with who and by when. You never have to guess. | كل سجل يُظهر أين هو على الخطوات الست وما الذي يحدث بعدها، مع من ومتى. لا تحتاج أن تخمّن. |
| work today title | Your work today | شغلك اليوم |
| work today hint | {n} items on you, {u} urgent. Each has a day count. | {n} بنداً عليك، {u} عاجلة. لكل بند عدّاد أيام. |
| work today button | Open my inbox | افتح صندوقي |
| CES name | CES (Customer Effort Score) | CES (درجة جهد الزبون) |
| CES definition | One question after a procedural or digital step: "How easy was it?" answered 1 to 5. CES = share of answers that were 4 or 5. | سؤال واحد بعد خطوة إجرائية أو رقمية: "كم كان الأمر سهلاً؟" من 1 إلى 5. CES = نسبة الإجابات 4 أو 5. |
| CES example | Example: 120 answers after a payment step, 86 said 4 or 5 → CES 72%. Asked after a booking, a payment, a maintenance request, or an abandoned upload. | مثال: 120 إجابة بعد خطوة دفع، 86 قالوا 4 أو 5 → CES يساوي 72%. يُسأل بعد حجز أو دفع أو طلب صيانة أو رفع متروك. |
| CES glossary line | CES (Customer Effort Score): one question, "how easy was it?", on a 1 to 5 scale. The share who answered 4 or 5. Asked after a procedural or digital step: a booking, a payment, a maintenance request. | CES (درجة جهد الزبون): سؤال واحد، "كم كان الأمر سهلاً؟" على مقياس 1 إلى 5. نسبة من أجابوا 4 أو 5. يُسأل بعد خطوة إجرائية أو رقمية: حجز، دفع، طلب صيانة. |
| NPS example (optional) | Example: 50% promoters, 32% passives, 18% detractors → NPS +32. Above 0 is more fans than critics; above +50 is excellent for real estate. | مثال: 50% مروّجون، 32% محايدون، 18% منتقدون → NPS يساوي +32. فوق الصفر معناه المعجبون أكثر من المنتقدين؛ وفوق +50 ممتاز في العقارات. |
| CSAT example (optional) | Example: 100 answers, 78 gave 4 or 5 → CSAT 78%. NPS asks about the relationship; CSAT asks about one moment (a call, a handover, a visit). | مثال: 100 إجابة، 78 منها 4 أو 5 → CSAT يساوي 78%. NPS يسأل عن العلاقة؛ CSAT يسأل عن لحظة واحدة (مكالمة، تسليم، زيارة). |

### S2 Next-box

| Key | EN | AR |
|---|---|---|
| label | Next step | الخطوة التالية |
| fix proposed | The responsible manager approves, changes, rejects, or asks for an investigation · within 5 working days | المدير المسؤول يعتمد أو يعدّل أو يرفض أو يطلب تحقيقاً · خلال 5 أيام عمل |
| fix approved / in progress | The owner does the fix and marks it done · by the due date | المسؤول ينفّذ الحل ويعلّمه منجزاً · قبل تاريخ الاستحقاق |
| fix verify | Agent 6 counts the same signals again and marks it effective, partial or failed · at 60 days | الوكيل 6 يعيد عدّ الإشارات نفسها ويحكم: فعّال، جزئي، فشل · عند 60 يوماً |
| fix effective | Nothing. It worked; it stays in the report as a fix that worked | لا شيء. نجح؛ يبقى في التقرير كحل نجح |
| fix failed | The signal reopens and a new fix is proposed | تُفتح الإشارة من جديد ويُقترح حل آخر |
| fix other | Closed with a reason; nothing further | أُغلق بسبب؛ لا شيء بعده |
| actions, Signals tab | Signals that cross the line become a pattern; a pattern gets one suggested fix | الإشارات التي تتجاوز الحد تصبح نمطاً؛ النمط يحصل على حل واحد مقترح |
| actions, Investigations tab | Interviews or a shopper check come back as evidence; only then is a fix proposed | المقابلات أو فحص المتسوق تعود كدليل؛ عندها فقط يُقترح حل |
| actions, other tabs | Open any fix to see who must say yes and by when | افتح أي حل لترى من يجب أن يوافق ومتى |
| Close the loop | A person calls each unhappy customer, codes the reason, and the same question is asked again 7 to 14 days after the fix | إنسان يتصل بكل زبون غير راضٍ، يسجّل السبب، ويُطرح السؤال نفسه مجدداً بعد 7 إلى 14 يوماً من الحل |
| journey, drifting | This person is drifting away; the reading below says what to do, and any fault found here is already counted as a signal | هذا الشخص يبتعد؛ القراءة أدناه تقول ماذا نفعل، وكل خطأ هنا محسوب أصلاً كإشارة |
| journey, problems | {n} problems found on this journey; each is a signal and is counted with the others | {n} مشاكل رُصدت في هذه الرحلة؛ كل واحدة إشارة وتُعدّ مع غيرها |
| journey, none | No problem found; nothing to do unless a new contact arrives | لا مشكلة مرصودة؛ لا شيء يُفعل حتى يصل تواصل جديد |
| overview | Agent 9 writes the Monthly CX pack from these same numbers on the first working day; the CX manager releases it (button: Monthly pack) | الوكيل 9 يكتب حزمة CX الشهرية من هذه الأرقام نفسها في أول يوم عمل؛ مدير CX يعتمدها (زر: الحزمة الشهرية) |

### S3 Daily brief

| Key | EN | AR |
|---|---|---|
| title | Daily brief | الموجز اليومي |
| hint | Written at 07:00 by Agent 9 from the same numbers the pages show, for your role only; the supervisor checked every figure. Each line opens its page. | يكتبه الوكيل 9 الساعة 07:00 من الأرقام نفسها التي تعرضها الصفحات، لدورك فقط؛ راجع السوبرفايزر كل رقم. كل سطر يفتح صفحته. |
| NPS | {product} NPS is {nps}[, up {n} points on last month / , down {n} points on last month / , unchanged on last month] | NPS {product} هو {nps}[، ارتفع {n} نقاط عن الشهر الماضي / ، انخفض {n} نقاط عن الشهر الماضي / ، دون تغيير عن الشهر الماضي] |
| signals | {rec} signals in the last {days} days; {pats} patterns crossed the line and are waiting for a fix | {rec} إشارة في آخر {days} يوماً؛ {pats} أنماط تجاوزت الحد وتنتظر حلاً |
| fixes | {prop} fixes are waiting for a yes, {open} are in progress, {late} are past their date; {eff} verified effective, {fail} failed | {prop} حلول بانتظار موافقة، {open} قيد التنفيذ، {late} تجاوزت موعدها؛ {eff} ثبت نجاحها، {fail} فشلت |
| shopper cases | {n} shopper cases open, {late} over the clock | {n} حالات متسوق مفتوحة، {late} تجاوزت المهلة |
| loop | {open} unhappy customers still to call, {crit} critical; recovery so far {h}% by phone[, {a}% by AI campaign] (h absent: too early) | {open} زبائن غير راضين لم نتصل بهم بعد، {crit} حرجة؛ التعافي حتى الآن {h}% بالهاتف[، {a}% بحملة الذكاء] (غائب: مبكر) |
| drifting | {run} of {all} people on record are drifting away; silent leads first | {run} من {all} شخصاً في السجل يبتعدون؛ العملاء الصامتون أولاً |
| public | {n} public mentions in 30 days, {neg}% negative, replied in {h} h on average[ (target 48)] | {n} إشارة عامة في 30 يوماً، {neg}% سلبية، متوسط الرد {h} ساعة[ (الهدف 48)] |
| L&D | {n} training-gap fixes are with L&D right now | {n} حلول فجوة تدريب لدى L&D الآن |
| HR specialist | {n} conduct notes this month, each to the direct manager only | {n} ملاحظات سلوك هذا الشهر، كل منها للمدير المباشر فقط |
| Internal Audit | Weekly sample: 50 agent outputs to read by eye; 0 read so far this week | العينة الأسبوعية: 50 مخرجاً للوكلاء للقراءة؛ قُرئ 0 حتى الآن هذا الأسبوع |

### S4 Trace and signal modal

| Key | EN | AR |
|---|---|---|
| card title | Trace | الأثر |
| hint | Every id in the chain, back to the original contact and forward to the report. Click any to open it. | كل رقم في السلسلة، رجوعاً إلى التواصل الأصلي وتقدماً إلى التقرير. اضغط أياً منها لفتحه. |
| columns | 1 Event · 2 Signal · 3 Pattern · 4 Fix · 5 Check · 6 Report | 1 حدث · 2 إشارة · 3 نمط · 4 إصلاح · 5 تحقق · 6 تقرير |
| empty, event | public mention, no person identified / none linked | إشارة عامة، لا شخص معرَّف / لا شيء مرتبط |
| empty, signal | not a signal | ليست إشارة |
| empty, pattern | under the line | تحت الحد |
| empty, fix | none yet | لا شيء بعد |
| empty, check and report | not yet | ليس بعد |
| pattern cell | PT-nnn · {n} signals | PT-nnn · {n} إشارات |
| report cell | RP-2026-11 · November pack | RP-2026-11 · حزمة نوفمبر |
| next label | What happens next | ما الذي يحدث بعد ذلك |
| next, report exists | (no line) | (بلا سطر) |
| next, check exists | Report: counted in the pack on the first working day | التقرير: يُحسب في الحزمة أول يوم عمل |
| next, fix exists | Check: Agent 6 recounts at 60 days after done | التحقق: الوكيل 6 يعيد العدّ بعد 60 يوماً من الإنجاز |
| next, pattern exists | Fix: Agent 5 proposes one, the manager approves | الإصلاح: الوكيل 5 يقترح واحداً، والمدير يعتمد |
| next, signals only | Pattern: forms when the same thing repeats over the line | النمط: يتكوّن عندما يتكرر الشيء نفسه فوق الحد |
| next, event only | Signal: only if this event hurt the customer | الإشارة: فقط إذا أذى هذا الحدث الزبون |
| modal sentence | Classified by Agent 2 as {category}. Counted by Agent 3; it is worked only through the pattern it belongs to, never alone. | صنّفه الوكيل 2 كـ {category}. عدّه الوكيل 3؛ يُعالج فقط عبر النمط الذي ينتمي إليه، لا وحده. |
| signal row | button `SG-n` under the date | زر `SG-n` تحت التاريخ |

### S5 Data feeds and the "Data as of" bar

| Key | EN | AR |
|---|---|---|
| page title | Data feeds | تغذيات البيانات |
| intro | Where every number comes from, and whether it arrived today. Three CRM environments, separate databases, each connected on its own; the rest of the sources are shared. | من أين يأتي كل رقم، وهل وصل اليوم. ثلاث بيئات CRM بقواعد بيانات منفصلة، كل واحدة مربوطة لحالها؛ بقية المصادر مشتركة. |
| columns | Feed · Environment · Today · Last received · Records · What it carries | التغذية · البيئة · اليوم · آخر وصول · السجلات · ماذا تحمل |
| shared | shared | مشتركة |
| statuses | Received (good) · Late (warn) · Not received (crit) | وصل · متأخر · لم يصل |
| rule | Rule: a number from a late feed is shown with yesterday's date, never silently. Agent 1 reconciles nightly; the Internal Audit and Marketing Lead marks a feed as trusted once a month. | القاعدة: الرقم من تغذية متأخرة يُعرض بتاريخ الأمس، لا بصمت. الوكيل 1 يطابق ليلياً؛ مدير التدقيق الداخلي والتسويق يعتمد التغذية كموثوقة مرة في الشهر. |
| bar | Data as of {date time} | البيانات حتى {date time} |
| bar chip late | {n} feed late or missing | {n} تغذية متأخرة أو مفقودة |
| bar chip ok | All feeds received | كل التغذيات وصلت |
| bar env label | Environment | البيئة |
| env all | All environments | كل البيئات |

Notes column texts are in the F13 table (EN) with these AR: Leads, activities, contacts, transactions, history = العملاء المحتملون، الأنشطة، جهات الاتصال، الصفقات، السجل; Separate database, same business = قاعدة بيانات منفصلة، نفس العمل; Yesterday's file; today's not received by 07:00 = ملف الأمس؛ ملف اليوم لم يصل حتى 07:00; Messages, direction, reply times = الرسائل، الاتجاه، أزمنة الرد; Calls, durations, outcomes = المكالمات، المدد، النتائج; Enquiries, chats, abandoned steps, ratings = الاستفسارات، المحادثات، الخطوات المتروكة، التقييمات; Sent, answered, skipped, with the skip reason = المرسلة، المجابة، المتخطاة، مع سبب التخطي; Public mentions and ratings; no person matched = الإشارات والتقييمات العامة؛ لا مطابقة لأشخاص.

### S6 CRM mapping

| Key | EN | AR |
|---|---|---|
| page title | CRM mapping | ربط قيم CRM |
| intro | The CRM has over 100 media values, 13 lead stages and 761 activity types. The portal has 9 sources, 6 stages and 11 events. This page is the translation, kept as configuration and filled once with the CRM owner; the same table applies to all three environments unless a row says otherwise. | في CRM أكثر من 100 قيمة وسيط و13 مرحلة و761 نوع نشاط. في البورتال 9 مصادر و6 مراحل و11 حدثاً. هذه الصفحة هي الترجمة، تُحفظ كإعدادات وتُعبّأ مرة واحدة مع مالك CRM؛ الجدول نفسه ينطبق على البيئات الثلاث ما لم يقل سطر غير ذلك. |
| tabs | Sources (CRM Media) · Stages (CRM lead stage) · Activities (CRM activity category) | المصادر (CRM Media) · المراحل (مرحلة الليد في CRM) · الأنشطة (فئة النشاط في CRM) |
| column headings | CRM · Media / Media detail → Portal source; CRM · Lead stage → Portal funnel stage; CRM · Activity category / type → Portal event; Rule | مصدر البورتال; مرحلة القمع في البورتال; حدث البورتال; القاعدة |
| rule hint, source | Stamped on every record from this media value | يُختم على كل سجل من قيمة الوسيط هذه |
| rule hint, stage | Moves the person to this funnel stage | ينقل الشخص إلى مرحلة القمع هذه |
| rule hint, activity | Becomes this event; the triggers read the event, never the CRM name | يصبح هذا الحدث؛ المحفزات تقرأ الحدث لا اسم CRM |
| footnote | Shown: the values seen on 17 November in the Abu Dhabi environment. The full lists are imported from the CRM lookups at go-live; unmapped values default to "Ignore" and appear in the weekly sample for the Internal Audit and Marketing Lead. | المعروض: القيم التي شوهدت في 17 نوفمبر في بيئة أبوظبي. القوائم الكاملة تُستورد من جداول CRM عند الإطلاق؛ القيم غير المربوطة تُعتبر "تجاهل" وتظهر في العينة الأسبوعية لمدير التدقيق الداخلي والتسويق. |
| toast | Mapping saved (prototype). | حُفظ الربط (نموذج). |

Rows (CRM value → default portal id), exactly as in the prototype:
- Sources: PSI Mobile App → app; Website → web; www.psinv.net → web; What's App → wa; Facebook → fb; Instagram → ig; Property Finder → portal; www.bayut.com → portal; Walk In → branch; Fay Al Reeman Al Ain Event → event; Mall of Emirates Stand → event; Auto Generated – Post Transaction → crm; HubSpot Website → web; Youngsters → event; Moscow MPIRES → event.
- Stages: New → enq; Not Contacted → enq; Contacted → con; Qualified lead → con; Pending Inquiry Matching → con; Active → con; Meeting → view; Viewing → view; Opportunity → offer; Negotiation → offer; Reservation With Developer → deal; Contract Signed → deal; Closed Won → deal; Closed lost → lost.
- Activities: Calls → call; WhatsApp, email, SMS → wa; Meetings and viewings → view; Offers and negotiation → offer; Closing → deal; After Sales · Handover Workflow → handover; Client Complaint Category → complaint; Lease Renewal → renewal; Maintenance → ticket; Survey Completed → survey; Automatic → ignore; Property management → ignore.

Portal options (id: EN / AR):
- Sources: app PSI Real Estate app; web PSI Website; wa WhatsApp; fb Facebook (public); ig Instagram (public); portal Property portals; branch Branch / walk-in; event Event; crm CRM (internal); ignore Ignore / تجاهل. (Names other than "Ignore" are English-only in the prototype: [Proposed] translate.)
- Stages: enq Enquiry / استفسار; con Contacted / تم التواصل; view Viewing / معاينة; offer Offer / عرض; deal Deal signed / صفقة موقّعة; lost Closed lost / أُغلق خاسراً; ignore Ignore / تجاهل.
- Events: call Call (trigger: over 2 min) / مكالمة (المحفز: فوق دقيقتين); wa Message / رسالة; view Viewing done / معاينة تمت; offer Offer made / عرض قُدّم; deal Deal signed / صفقة وُقّعت; handover Handover done / تسليم تم; complaint Complaint / شكوى; renewal Renewal / non-renewal / تجديد / عدم تجديد; ticket Ticket closed / تذكرة أُغلقت; survey Survey answered / استبيان أُجيب; ignore Ignore / تجاهل.

### S7 My inbox

| Key | EN | AR |
|---|---|---|
| title | My inbox | صندوقي |
| intro | Everything that is on you, ordered by urgency. Each row says how many days are left and opens the record; nothing here is a notification you can lose. | كل ما هو عليك، مرتباً بالأهمية. كل سطر يقول كم يوماً متبقياً ويفتح السجل؛ لا شيء هنا إشعار يضيع. |
| columns | Due · What · With · (blank) | المهلة · ماذا · مع · (فارغ) |
| empty | Nothing on you today. | لا شيء عليك اليوم. |
| footer | Approval window: {5} working days. Verification at {60} days. Changed under Settings → Rules as configuration. | نافذة الاعتماد: {5} أيام عمل. التحقق عند {60} يوماً. تُغيَّر في الإعدادات ← القواعد كإعدادات. |
| approve | Approve, change, reject or investigate: {title} | اعتمد أو عدّل أو ارفض أو حقّق: {title} |
| do | Do the fix and mark it done: {title} | نفّذ الحل وعلّمه منجزاً: {title} |
| verify | 60-day check runs on {date} | فحص الـ60 يوماً يجري في {date} |
| call | [Critical · ]Call {person} · {reason} | [حرج · ]اتصل بـ {person} · {reason} |
| AI campaign owner | AI campaign {id} | حملة AI {id} |
| default caller | CX team | فريق CX |
| investigation | Investigation open: {id} · {done}/{n} interviews (or: shopper check) | تحقيق مفتوح: {id} · {done}/{n} مقابلات (أو: فحص متسوق) |
| sample | Weekly sample: 50 outputs to read, 0 read | العينة الأسبوعية: 50 مخرجاً للقراءة، قُرئ 0 |
| overdue | overdue | متأخر |
| late | {n} working days late / {n} days late | {n} يوم عمل تأخير / {n} يوم تأخير |
| today | today | اليوم |
| left | {n} working days left / {n} days left | متبقٍ {n} يوم عمل / متبقٍ {n} يوم |

### S8 Audit trail
Title "Audit trail" / "سجل التدقيق"; hint "Every change on this fix: when, what, by which role. Nothing is deleted." / "كل تغيير على هذا الحل: متى، ماذا، وبأي دور. لا يُحذف شيء."; columns When / What / By = متى / ماذا / بواسطة; empty "No change yet." / "لا تغيير بعد."; fallback author "System" / "النظام".

### S9 Escalation matrix

| Key | EN | AR |
|---|---|---|
| title | Escalation matrix | مصفوفة التصعيد |
| intro | Who, by title, receives each kind of fix or case, who is informed, who is the backup, and the clocks in working hours. One table per product; the product owners fill the cells with the Internal Audit and Marketing Lead by 28 November. Titles only; the CRM supplies who holds the title. | من يستلم كل نوع من الحلول أو الحالات بالمسمّى، ومن يُبلَّغ، ومن البديل، والمهل بساعات العمل. جدول لكل منتج؛ يعبّئ مالكو المنتجات الخلايا مع مدير التدقيق الداخلي والتسويق قبل 28 نوفمبر. مسمّيات فقط؛ CRM يحدد من يشغلها. |
| columns | Kind · First receiver · Informed · Backup · Respond (h) · Resolve (h) | النوع · المستلم الأول · مُبلَّغ · البديل · الرد (ساعة) · الحل (ساعة) |
| principles | Principles: the receiver is the person who can fix it, never top management; heads and C-level are informed only; an employee kind goes to the direct manager and nowhere else; legal goes to Legal first; anything touching a customer's contact goes through the CX team. Values marked with defaults are proposals until the owners confirm them. | المبادئ: المستلم هو من يستطيع الإصلاح، لا الإدارة العليا؛ الرؤساء والإدارة التنفيذية يُبلَّغون فقط؛ نوع الموظف يذهب للمدير المباشر ولا غيره؛ القانوني يذهب للقانونية أولاً؛ كل ما يمس تواصل الزبون يمر بفريق CX. القيم الافتراضية مقترحات حتى يؤكدها المالكون. |
| kind labels | Employee · Service and behaviour · Training gap · Process · Product and app · Environment · Legal and privacy · Marketing · Shopper case · critical · Legal or privacy case | موظف · خدمة وسلوك · فجوة تدريب · عملية · منتج وتطبيق · بيئة · قانوني وخصوصية · تسويق · حالة متسوق · حرجة · حالة قانونية أو خصوصية |
| line on a fix | From the matrix ({product}): receiver {x} · informed {y} · backup {z} · respond {n} h · resolve {m} h [Matrix] | من المصفوفة ({product}): المستلم {x} · مُبلَّغ {y} · البديل {z} · الرد {n} h · الحل {m} h [المصفوفة] |

### S10 Survey questions
Page title "Survey questions" / "أسئلة الاستبيانات". Intro: "The exact questions per product and moment, in both languages, with a preview of what the customer receives. Each product has its own set; nothing is shared across companies." / "الأسئلة الدقيقة لكل منتج ولحظة، باللغتين، مع معاينة لما يصل الزبون. لكل منتج مجموعته؛ لا شيء مشترك بين الشركات." List line "{when} · {n} questions" / "{n} أسئلة". Preview caption "As the customer sees it · WhatsApp or app" / "كما يراه الزبون · واتساب أو التطبيق"; greeting "Hello, this is PSI. One minute of your time:" / "مرحباً، معك PSI. دقيقة من وقتك:"; footer "Sent by Agent 10 in the customer's language, on the channel they used, only if consent allows and the cap is not reached." / "يرسله الوكيل 10 بلغة الزبون، على القناة التي استخدمها، فقط إذا سمحت الموافقة ولم يُبلغ السقف."

| Product | Set | Name EN / AR | When EN / AR | Questions EN / AR |
|---|---|---|---|---|
| re | nps | NPS after the signed deal / NPS بعد توقيع الصفقة | Deal signed; once per 90 days / توقيع الصفقة؛ مرة كل 90 يوماً | How likely are you to recommend PSI to a friend or colleague? (0 to 10) / ما مدى احتمال أن توصي بـ PSI لصديق أو زميل؟ (0 إلى 10) · What is the main reason for your score? / ما السبب الرئيسي لتقييمك؟ |
| re | tx | CSAT + CES after a call, a viewing or an offer / CSAT + CES بعد مكالمة أو معاينة أو عرض | Once per 30 days; viewing over offer over call / مرة كل 30 يوماً؛ المعاينة قبل العرض قبل المكالمة | How satisfied were you with your [viewing / call / offer] today? (1 to 5) / ما مدى رضاك عن [المعاينة / المكالمة / العرض] اليوم؟ (1 إلى 5) · How easy was it to get what you needed? (1 to 5) / كم كان من السهل الحصول على ما تحتاجه؟ (1 إلى 5) |
| re | why | What stopped you? / ما الذي أوقفك؟ | 14 days silent; once per enquiry / 14 يوماً صمت؛ مرة لكل استفسار | We noticed you did not continue. What stopped you? (price or payment plan · nothing suitable · slow or no reply · bought or rented elsewhere · postponed · other) / لاحظنا أنك لم تكمل. ما الذي أوقفك؟ (السعر أو خطة الدفع · لا شيء مناسب · رد بطيء أو لا رد · اشتريت أو استأجرت من غيرنا · أجّلت · أخرى) |
| af | nps | NPS after handover and after renewal / NPS بعد التسليم وبعد التجديد | Handover done; renewal signed; once per 90 days / تم التسليم؛ وُقّع التجديد؛ مرة كل 90 يوماً | How likely are you to recommend PSI? (0 to 10) / ما مدى احتمال أن توصي بـ PSI؟ (0 إلى 10) · What is the main reason? / ما السبب الرئيسي؟ |
| af | ces | CES after a closed ticket / CES بعد إغلاق تذكرة | Maintenance or complaint ticket closed / أُغلقت تذكرة صيانة أو شكوى | How easy was it to get your request handled? (1 to 5) / كم كان من السهل معالجة طلبك؟ (1 إلى 5) · Is the issue fully resolved? (yes / no) / هل حُلّت المشكلة بالكامل؟ (نعم / لا) |
| cl | nps | Member NPS at the end of a nomination cycle / NPS للعضو في نهاية دورة الترشيح | Nomination cycle closed / أُغلقت دورة الترشيح | How likely are you to recommend PSI Club to another investor? (0 to 10) / ما مدى احتمال أن توصي بنادي PSI لمستثمر آخر؟ (0 إلى 10) · How was the follow-up on your nominated lead? (1 to 5) / كيف كانت متابعة العميل الذي رشّحته؟ (1 إلى 5) |
| to | tour | End-of-tour survey / استبيان نهاية الجولة | Completed tour only / جولة مكتملة فقط | The driver (1 to 5) / السائق (1 إلى 5) · The guide (1 to 5) / المرشد (1 إلى 5) · The ride (1 to 5) / الرحلة (1 إلى 5) · The car (1 to 5) / السيارة (1 إلى 5) · Cleanliness (1 to 5) / النظافة (1 إلى 5) · How likely are you to recommend Tour Estate? (0 to 10) / ما مدى احتمال أن توصي بـ Tour Estate؟ (0 إلى 10) |
| ev | qr | Booth rating (QR) and staff evaluation / تقييم الجناح (QR) وتقييم الموظفين | At the event; no NPS / في الفعالية؛ لا NPS | Rate your visit to our stand (1 to 5) / قيّم زيارتك لجناحنا (1 إلى 5) · Internal: staff evaluation form, filled by the event lead / داخلي: نموذج تقييم الموظفين يعبّئه مسؤول الفعالية |
| re | re2 | Re-survey after a resolved complaint / إعادة الاستبيان بعد حل شكوى | 7 to 14 days after resolution; exempt from caps / 7 إلى 14 يوماً بعد الحل؛ معفى من السقوف | The same question as the first survey, word for word / السؤال نفسه كما في الاستبيان الأول، حرفياً |

### S11 Consent, Close the loop, investigation, hand-offs (S11b)

| Key | EN | AR |
|---|---|---|
| consent label | Consent (from the CRM): | الموافقة (من CRM): |
| DNCR chip | DNCR · no calls, no surveys by call | DNCR · لا مكالمات ولا استبيانات بالهاتف |
| consent chip | Consent given | موافقة مسجلة |
| channel chips | WhatsApp ✓/✗ · Email ✓/✗ · SMS ✓/✗ | واتساب ✓/✗ · بريد ✓/✗ · SMS ✓/✗ |
| loop hint | Calls only between {09:00} and {18:00} UAE time, up to {3} attempts, the next one the following working day. After the last attempt a WhatsApp message goes out and the person is marked "needs a human" for the CX manager. | المكالمات فقط بين {09:00} و{18:00} بتوقيت الإمارات، حتى {3} محاولات، التالية في يوم العمل التالي. بعد آخر محاولة تُرسل رسالة واتساب ويُعلَّم الشخص "يحتاج إنساناً" لمدير CX. |
| row suffix | attempt {n} of {3} · next {date} | المحاولة {n} من {3} · التالية {date} |
| no answer, last | No answer after {n} attempts: WhatsApp sent, flagged "needs a human". | لم يرد بعد {n} محاولات: أُرسل واتساب وعُلّم "يحتاج إنساناً". |
| no answer, more | No answer. Next attempt {date} within calling hours. | لم يرد. المحاولة التالية {date} ضمن ساعات الاتصال. |
| record result button | Record the result | سجّل النتيجة |
| result text, interview (sample) | Interviews confirm the cause: the agent quoted a payment plan that is not on the approved sheet; the brochure in the branch is the old one. | تؤكد المقابلات السبب: ذكر الموظف خطة دفع ليست في الورقة المعتمدة؛ الكتيب في الفرع هو القديم. |
| result text, shopper (sample) | Shopper check done: the wrong plan was quoted again in 2 of 3 visits. | تم فحص المتسوق: ذُكرت الخطة الخاطئة مجدداً في 2 من 3 زيارات. |
| proposed fix title (sample) | Replace the branch brochure and re-brief the agents on the approved payment plans (proposed from {INV id}) | استبدال كتيب الفرع وإعادة إحاطة الموظفين بخطط الدفع المعتمدة (مقترح من {INV id}) |
| proposed fix by / source | Agent 5, from the investigation / Evidence: {INV id} | (لا ترجمة في النموذج) / دليل: {INV id} |
| investigation toast | Result recorded as evidence; a fix was proposed for approval. | سُجّلت النتيجة كدليل؛ واقتُرح حل للاعتماد. |
| pattern evidence line | Evidence from investigation · {INV id}: {result} | دليل من التحقيق · {INV id}: {result} |
| S11b hand-offs title | One-customer corrections handed to other systems | تصحيحات لزبون واحد سُلّمت لأنظمة أخرى |
| S11b hand-offs subtitle | (hand-offs: recorded and checked, no clock) | (تسليمات: تُسجَّل وتُتابع، بلا مؤقت) |
| skipped text (do not copy) | skipped (DNCR {n}, cap 31, no consent 6, duplicate 9) | (غير مترجم في النموذج) |

### S12 Sign-in

| Key | EN | AR |
|---|---|---|
| title | Sign in | تسجيل الدخول |
| note | In the real platform this is one company sign-in and the role comes from the directory. In the prototype, choose who you are. | في المنصة الحقيقية هذا تسجيل دخول واحد للشركة والدور يأتي من الدليل. في النموذج، اختر من أنت. |
| main roles | CX manager · CX team · Environment manager · Marketing · L&D · Internal Audit and Marketing Lead | مدير تجربة العملاء · فريق تجربة العملاء · مدير بيئة · التسويق · التعلم والتطوير · مدير التدقيق الداخلي والتسويق |
| folded summary | Other roles used in the demo (team leads, HR, executives, product teams, mystery shoppers) | أدوار أخرى تُستخدم في العرض (قادة الفرق، الموارد البشرية، التنفيذيون، فرق المنتجات، المتسوقون) |

### S13 Customers list

| Key | EN | AR |
|---|---|---|
| title | Everyone on record | كل من في السجل |
| hint | Browse instead of search. Filter, then open a person or export the list for a call round or a campaign. | تصفّح بدل البحث. صفِّ، ثم افتح شخصاً أو صدّر القائمة لجولة اتصال أو حملة. |
| top title / description | Customers / One record per person, every contact on it; who is drifting away; who our customers are. | العملاء / سجل واحد لكل شخص وكل تواصل عليه؛ من يبتعد؛ من هم زبائننا. |
| tabs | Find a person · Who is leaving · Personas and campaigns | ابحث عن شخص · من يبتعد · الشخصيات والحملات |
| filters | All environments · All types · All sources | كل البيئات · كل الأنواع · كل المصادر |
| types | Lead · Buyer · Tenant · Owner · Investor · Member | عميل محتمل · مشترٍ · مستأجر · مالك · مستثمر · عضو |
| count | {n} people | {n} شخصاً |
| export | Export list (CSV) | تصدير القائمة (CSV) |
| columns | Person · Type · Environment · Source · Product · Last contact · Problems · Drifting | الشخص · النوع · البيئة · المصدر · المنتج · آخر تواصل · مشاكل · يبتعد |
| export toast | CSV prepared (prototype): name, mobile, type, environment, source, last contact. Names and mobiles only for roles allowed to see them. | جُهّز CSV (نموذج): الاسم، الجوال، النوع، البيئة، المصدر، آخر تواصل. الأسماء والجوالات فقط للأدوار المسموح لها. |

### S14 Public mentions

| Key | EN | AR |
|---|---|---|
| title | Public mentions | الإشارات العامة |
| intro | Every public comment on Facebook, Instagram, LinkedIn and Google, with its reply status. Rule: a public reply within {48} hours from the approved wording, inviting the person to WhatsApp or the app. Nobody here is surveyed or matched to a record. | كل تعليق عام على فيسبوك وإنستغرام ولينكد إن وGoogle مع حالة الرد. القاعدة: رد عام خلال {48} ساعة بالصيغة المعتمدة يدعو الشخص إلى واتساب أو التطبيق. لا أحد هنا يُستبان أو يُطابق بسجل. |
| columns | Date · Channel · Mention · Tone · Reply · Identified · Owner | التاريخ · القناة · الإشارة · النبرة · الرد · تعرّف · المسؤول |
| tone | Negative · Positive · Neutral | سلبي · إيجابي · محايد |
| reply | Replied in {n} h · No reply, over 48 h · Awaiting reply | رُدّ خلال {n} ساعة · لا رد، تجاوز 48 ساعة · بانتظار الرد |
| identified | Moved to WhatsApp | انتقل إلى واتساب |
| owner | Marketing · channel owner | التسويق · مسؤول القناة |
| action | Mark replied | تعليم كمردود |
| toast | Marked replied; the index updates. | عُلّم كمردود؛ يتحدث المؤشر. |
| reputation button | Work the mentions | اعمل على الإشارات |

### S15 Weekly sample

| Key | EN | AR |
|---|---|---|
| title | Weekly sample | العينة الأسبوعية |
| intro | Fifty outputs that passed the supervisor this week, read by eye by the CX team and the Internal Audit and Marketing Lead. Every "wrong" becomes a new test for the supervisor and lowers that agent's pass rate. | خمسون مخرجاً مرّت على السوبرفايزر هذا الأسبوع، يقرؤها فريق CX ومدير التدقيق الداخلي والتسويق بالعين. كل "خطأ" يصبح اختباراً جديداً للسوبرفايزر ويخفض نسبة نجاح ذلك الوكيل. |
| tiles | Read · Wrong (each becomes a test) · Accuracy this week · Due (every Thursday) | قُرئ · خطأ (كل واحد يصبح اختباراً) · الدقة هذا الأسبوع · المهلة (كل خميس) |
| columns | # · Agent · Kind · Output · Verdict | # · الوكيل · النوع · المخرج · الحكم |
| buttons | ✓ Right · ✗ Wrong | ✓ صح · ✗ خطأ |
| chips | Right · Wrong → new test | صح · خطأ ← اختبار جديد |
| kinds | Proposed fix · Classification · Interview brief · Journey reading · Signal count | حل مقترح · تصنيف · ملخص مقابلة · قراءة رحلة · عدّ إشارة |

### S16 Rules pointer and What if

| Key | EN | AR |
|---|---|---|
| pointer title | One place for every threshold. | مكان واحد لكل عتبة. |
| pointer text | These are the same numbers as Settings → Rules as configuration; change them there and every page recomputes. [Open] | هذه الأرقام نفسها في الإعدادات ← القواعد كإعدادات؛ غيّرها هناك وتُعاد حسابات كل الصفحات. [افتح] |
| what if title | What if | ماذا لو |
| what if hint | With today's thresholds there are {n} patterns. Each cell shows how many there would be with that one value changed; the bold one is the current setting. Change it under Settings. | بعتبات اليوم يوجد {n} أنماط. كل خلية تُظهر كم سيكون العدد لو تغيرت هذه القيمة وحدها؛ الغامق هو الإعداد الحالي. غيّرها في الإعدادات. |
| rows | Same issue, times · Same agent, times · Window (days) | نفس المشكلة، مرات · نفس الموظف، مرات · النافذة (أيام) |
| cell | {value} → {n} patterns | {value} → {n} أنماط |
| table heading | Threshold | العتبة |

### S17 Agent chips and "How the AI found this" line
Chip "Agent {n} · {name}" / "الوكيل {n} · {name}". Found-panel line: chips for Agent 3 and (when AI-made) Agent 5, a good chip "CX Supervisor: 6 checks passed" / "سوبرفايزر CX: اجتاز 6 فحوصات", and a button "Who does what" / (opens the agents page). Agent 9 roster text: see F36.

### S18 Defaults and configuration values seen in v40

`approveDays 5`, `verifyDays 60`, `recoverDays 60`, `holdDays 90`, `effDrop 50`, `npsCap 90`, `csatCap 30`, `resurvey 7 to 14`, `silentDays 14`, `msFloor 60`, `msRespond 1`, `msResolve 5`, `publicReply 48`, new in v40: `callFrom 09:00`, `callTo 18:00`, `callTries 3`; thresholds `agent 3`, `issue 5`, `conc 50`, `days 30` (minimum sample 10 elsewhere). React already carries all of these except the three call keys and the working-days setting.
