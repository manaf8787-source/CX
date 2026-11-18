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
