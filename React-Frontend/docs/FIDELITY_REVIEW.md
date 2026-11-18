# Fidelity review against the v38 sources (17 Nov 2026)

Sources, in priority order: `Documents/PSI-CX-Portal-Knowledge-Base-Modules.md` (KB), `Documents/PSI-CX-Programme-Knowledge-Base.md` §28–43 (PKB), the Rules / AI Agents / Journey texts, the two decks, and the v38 prototype export `Documents/PSI CX Portal.html` (proto). Status is **before → after** this pass. Done = built as specified; Partial = built, part missing; Missing = not built; Differs = built, but not as the source says.

Totals before: 52 Done · 22 Partial · 21 Missing · 9 Differs (104 requirements).
Totals after: 93 Done · 9 Partial · 0 Missing · 0 Differs; 2 moved to Open items.
After pass I (18 Nov 2026): the five rows still Partial after pass F ("?" on headings, hand-off rules, AI Insights → proposed action, recovered, Settings) are Done, so every row in the tables below now reads Done. The pass F totals line above also counted items that are not rows here; those that depend on a decision are tracked under Open items, with visible [Proposed] / awaiting-decision placeholders in the UI.

## Sitewide

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Each role sees only its own pages (1 to 5), CX manager full view | KB §2 | Missing → Done | `auth/access.ts`: role page sets from the §2 table; sidebar, Settings sub-nav and an `AccessGuard` redirect to the role's home |
| Assistant button for CX, Marketing, executives, environment managers only | KB §13 | Differs → Done | Hidden for other roles |
| "?" beside metrics and headings; "What the terms mean" button on every page with search | KB §14 | Missing → Partial → Done | Button on every page (PageHeader); "?" on page titles and section headings across the app (pass I: 22 headings and the shopper-case score and clock), wired to the glossary |
| Glossary terms with what / how calculated / example (NPS, CSAT, CES + §14 table) | KB §14 | Partial → Done | 12 terms added, NPS/CSAT/CES rewritten |
| Not-launched products out of menu and filters | KB §16 | Done | Products group in the sidebar shows live products only |
| Bilingual EN/AR with RTL for every new string | CLAUDE.md | Done | All new strings have Arabic |

## Home (KB §3)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| One search box: name, mobile, ID or unit opens the person | §3 | Partial → Done | Also Emirates ID and CRM id |
| A question in your own words goes to the assistant | §3 | Missing → Done | 3+ words or "?" opens the assistant with the question asked |
| Example requests | §3 | Missing → Done | Three chips, assistant roles only |
| Five live numbers, each a button | §3 | Done | Links only where the role may go |
| Marketing / env manager limits | §3 | Partial → Done | Links and "Needs attention" gated by role |

## Customers (KB §4)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| CRM profile, VIP tag, four effort tiles, AI reading in four parts | §4 | Done | |
| Timeline: source badge, who started it, reason, outcome, promise with its due time, text where allowed, problem highlights | §4 | Partial → Done | Outcome and promise due time added |
| Interview and re-survey events on the same timeline | §4, §7 | Missing → Done | Recorded from Close the loop |
| Journey rules (nine) | §4 | Done | |

## Runaway customers (KB §5)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Six types, counters, "what we keep doing wrong", detail with journey button, learning order, env scoping | §5 | Done | Classification is a best-effort rule on mock fields (see Open items) |
| Thresholds are settings | §5 | Done | Rules → Other thresholds |

## Actions (KB §6)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Register: proposed, open, late, effective | §6 | Missing → Done | Four tiles |
| Flow incl. reject with reason or send to investigation first | §6, §11 | Partial → Done | "Investigate first" decision requests five interviews |
| Classification block: kind, path, receiver, what comes back | §6 | Partial → Done | Sample owners now follow the kind (Legal for legal, L&D for training gap…) |
| "How the AI found this" on every action and every pattern card | §6 | Partial → Done | Added to pattern cards with the action it already has |
| L&D sees only training-gap actions; env manager only its environment | §15, §2 | Missing → Done | |
| Signals: counted, thresholds, public badge, 48h clock, hand-offs | §6 | Done | |
| Hand-off rules by signal type | §6 | Partial → Done | Pass I: the four rules transcribed from the v38 prototype (`HO_RULE`) under the hand-offs list |
| AI Insights: recovery figure in full, bar, small-sample warning, percentages panel, "Send to a case" same category only, two-registers note | §6 | Done | |
| AI Insights suggestions become proposed corrective actions | §6 | Partial → Done | Pass I: suggested actions and recovery figures transcribed from the prototype (`SIM`), each with bar and small-sample warning; CX makes one a *proposed* action (receiver a title, never top management); shows "From AI Insights" on Corrective actions |
| Shopper cases: three severities, clocks, numbered actions, HR pool, direct manager review | §6 | Done | |
| Investigations: weak signals, five interviews or a shopper check form (environment, scenario, what to look for) | §6 | Partial → Done | Form added with validation |

## Close the loop (KB §7)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| List, critical first, capacity = people × hours × 4 × days | §7 | Done | |
| Brief by Agent 8 from the timeline, four questions | §7 | Partial → Done | Brief added |
| Reason codes (the ten in §7) | §7 | Differs → Done | Replaced with the KB list, in order |
| Reason code suggested from the timeline; outcome; notes; re-survey date | §7 | Partial → Done | |
| Reason shown on the list | §7 | Missing → Done | |
| Recovered = 4/5, promoter/passive, transaction, renewal, new lead or clean contact | §7 | Partial → Done | Pass I: the full Decision 3 rule (60-day window, "too early", silent / detractor / cancel / runaway); sample items carry instrument, incident date and follow-up events; recovery rate and delta on Close the loop |
| AI campaigns: segment, script EN/AR, hand-off rules, critical never in a campaign | §7 | Partial → Done | Hand-off rules shown in the form |
| Campaign results as reason codes; people handed to a human | §7 | Missing → Done | |

## Personas and campaigns (KB §8)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Six personas: who, main pain, channels as in the §8 table | §8 | Differs → Done | Seed replaced with KB/proto text (Wallet added to investor and portfolio owner, PKB §35) |
| Recommendation: who, channel and when, campaign type, what not to do, segment size; ranked next campaign | §8 | Partial → Done | Proto recommendations transcribed |
| CX manager approves; Internal Audit and Marketing Lead audits; aggregated only | §8 | Done | |
| Campaign briefs saved for Marketing (from the assistant) | §13 | Missing → Done | Shown on this page |

## Surveys and triggers (KB §9)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Lead funnel 9,000 → 150, source split, why they stopped | §9 | Done | |
| Funnel stages marked [Proposed] until Marketing confirms | PKB §39/§43 | Missing → Done | |
| "When we ask" table incl. enquiry (reach index, no survey) | §9 | Partial → Done | Enquiry row added |
| Instruments with sent / answered / skipped; Agent 10 log | §9 | Missing → Done | Proto sample figures |
| Per product, no group number | §9 | Done | |

## Intelligent CX team (KB §11)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Path every event walks, supervisor between every step, Agent 10 beside Agent 1 | §11 | Missing → Done | |
| Roster: stage (shadow, limited, live, phase 2), pass rate | §11 | Missing → Done | Proto figures |
| Job description in nine fields | §11 | Partial → Done | Inputs, rules, model step, output, supervisor checks, shows on added |
| Supervisor: six checks, verdicts, weekly sample of 50 | §11 | Partial → Done | |
| How it is switched on (shadow, limited, live) | §11 | Missing → Done | |

## Rules as configuration (KB §12)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Five decisions, every number a setting | §12 | Differs → Done | Regrouped by decision; legal-once, drop 50%, hold 90, calls/hour 4, silence 14 added |
| Escalation matrix: template, principles, cells pending | §12 | Missing → Done | Rows: 8 kinds + 2 case types; cells "Pending" |

## Assistant (KB §13)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| People lists with the reason and "reach via" | §13 | Missing → Done | |
| "Why did X go quiet?", "similar to X" | §13 | Missing → Done | |
| Corrective action plan, created as proposed actions | §13 | Missing → Done | CX team / manager only |
| Campaign brief, saved for Marketing | §13 | Missing → Done | |
| Header says which engine is running | §13 | Missing → Done | "Built-in parser (no connection)" |
| Voice: request runs when you stop | §13 | Partial → Done | |

## Settings and reference (KB §15)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Overview: customers-and-runaways strip, signals-and-actions strip, indicators per product, funnel, reputation index, NPS by month and by channel, heatmap, why detractors | §15, §10 | Partial → Done | |
| Public reputation index: volume, share negative, Google rating, reply rate and time, per channel | §10 | Missing → Done | Proto sample mentions |
| Standards register: 26 standards M-01–M-26, observe only / draft / approved and scored | §15, PKB §28 | Differs → Done | Transcribed from proto; L&D documents moved to their own list (codes LD-xx) |
| L&D edits the 15 people-facing standards; CX manager approves for scoring | §15 | Missing → Done | |
| L&D page: training-gap actions, requests, complaint types, materials and sessions with coverage, low findings as statistics | §15 | Partial → Done | |
| Teams and structure: titles, authority matrix, routing, what the CRM provides | §15, PKB §28 | Differs → Done | Was "historical only"; rebuilt with roles (§2), routing, CRM fields, HR pool, who is informed |
| Monthly pack, Mystery shopper, VoC, HR team, AI Insights access | §15 | Done | |
| Settings: launch list, HR pool, notices heads receive | §15 | Partial → Done | Pass I: `/settings/admin` holds the launch list, the HR pool and "Notices and digests" (informed titles per product, digest frequency, immediate alert), transcribed from the prototype; CX manager edits, CX team reads |

## Products (KB §16)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Product page per product with own indicators, website vs app split, "When this product asks" | §16 | Missing → Done | `/products/:id`; Wallet shows its four complaint types |

## Open items (not resolved here)

1. Escalation matrix cells (product owners with the Internal Audit and Marketing Lead, by 28 Nov) — shown as Pending.
2. Funnel stages per service — [Proposed] until Marketing confirms (PKB §43.2).
3. Standards ownership: KB §15 says L&D owns the 15 people-facing standards; the proto register lists owners as Sales support lead etc. Both shown ("Owner" + "Edited by L&D").
4. Standards documents: the L&D list states 28 documents; transcription gives 33 rows (kept, flagged).
5. Surveys page roles: KB §1 says CX, product teams and Marketing use it; the §2 table does not list it for Marketing. Followed §2.
6. Teams-lead pool, After-Sales "process, speed and communication", HR specialist "attitude" scoping inside Actions: no pool/product field on actions in the sample data; not scoped beyond page access.
7. Which agent writes AI Insights: the ten agents in the spec do not name one; existing label kept.
8. Real brand colours, logo, environment names, HR pool members, SLA targets (PKB §43.8).

9. Recovered precedence: when a recovery event and a not-recovered event both fall inside the 60 days, the Rules document does not say which wins. Pass I uses "the latest decisive event wins". [Proposed]
10. AI Insights → shopper-case "same category" uses a mapping from shopper checklist categories to the six AI Insights categories. [Proposed]
11. Who is informed for PSI Wallet: the prototype's notices list has no Wallet row; shown as awaiting decision. [Proposed]
12. Runaway inside the recovered rule is supported by the rule but not fed in the sample (runaway types carry no date). [Proposed]

## Deferred

None of the three items deferred after pass F remain: "?" on headings, AI Insights → proposed action and the full recovered rule were completed in pass I (18 Nov 2026).
