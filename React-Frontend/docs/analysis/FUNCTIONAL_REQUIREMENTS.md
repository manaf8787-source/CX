# Functional Requirements

Every requirement below cites its source so a reviewer can check it against the original document rather than trust this summary. `[Proposed]` = suggested in the source but not confirmed by Manaf. Sample figures (visit counts, percentages, names) are never requirements — only the *rule* they illustrate is.

## 1. Home

- FR-1.1 One search box accepts a name, mobile number, ID or unit and opens that person's Customers page. *(Modules KB §3)*
- FR-1.2 A free-text question in the same box is routed to the AI assistant instead, when it doesn't resolve to a person. *(Modules KB §3, §13)*
- FR-1.3 Five live tiles on Home: runaway count, open actions, personas, journeys (searches performed?), "to call" — each tile is a button that navigates to the relevant page/filter (e.g. "To call" opens Close the loop). *(Modules KB §3)*
- FR-1.4 Results respect role scope without extra UI: CX sees everything; Marketing sees results without conversation text or agent names; an environment manager's results are limited to their own environment. *(Modules KB §3)*
- FR-1.5 Full bilingual + RTL on this page, as on every page. *(Modules KB §3, "Every page of the portal is bilingual with full right-to-left layout")*

## 2. Customers (the journey)

- FR-2.1 Identity resolution stitches one record by mobile number, email, Emirates ID and CRM contact id. *(Modules KB §4; Integration Plan "Identity")*
- FR-2.2 Profile block: type, environment, units/deals, residence, workplace, income source, preferred channel, language, persona, VIP tag (PSI Club). *(Modules KB §4)*
- FR-2.3 Four effort tiles: interactions, contacts in 90 days, problems found, days since last contact. *(Modules KB §4)*
- FR-2.4 AI reading: exactly four parts (who/how long/channels; what went wrong in date order; a verdict — healthy, high effort, or one of the six runaway types; what to do next), every sentence citing a dated timeline event. The AI must not claim anything the evidence doesn't contain — enforced by the Supervisor's "evidence check" on the backend (AI Agents Spec, Agent 7). *(Modules KB §4)*
- FR-2.5 Timeline, newest first, filterable by channel; each row carries a source badge (one of: PSI Website, PSI Real Estate app, WhatsApp, call, IVR, branch, email, survey, mystery shopper, PSI Club, PSI Wallet, events, Tour Estate, Facebook, Instagram, LinkedIn, Google). *(Modules KB §4, §10)*
- FR-2.6 Problem events are visually highlighted on the timeline: promise not kept, forced channel switch, repeat contact (48h/7d/30d), slow reply, wrong language, hand-off, detractor. *(Modules KB §4)*
- FR-2.7 The nine journey rules (table, Modules KB §4) must each be implemented as a named, independently testable rule, not folded into one opaque "problems" blob — each rule has its own definition and its own threshold, several of which are configuration (e.g. silence: 14 days lead / 30 days silent lead / 12 months owner).
- FR-2.8 "Problems found" and "Channels used" sections sit below the timeline, folded by default. *(Modules KB §4)*
- FR-2.9 Agent calls are never recorded — the timeline must carry only fact/time/reason/result from the CRM activity log for a call event, never a transcript or recording link. *(Modules KB §4, §10; Integration Plan "two gaps to state plainly")*

## 3. Runaway customers

- FR-3.1 Exactly six runaway types, each with a settings-configurable threshold: went to a competitor; silent lead (30+ days no answer after contact); frozen deal or payment (stalled, nothing moves); did not renew (lease ended, no renewal); dormant owner (12+ months no contact/deal/referral); complained then left. *(Modules KB §5; Rules and Definitions; AI Agents Spec, Agent 7's `runaway.*` config keys)*
- FR-3.2 A "what we keep doing wrong" cross-type summary, generated from the faults found across all runaway records — each item must be a corrective-action candidate (clickable through to Actions). *(Modules KB §5)*
- FR-3.3 Per-person detail view: what we did wrong + what to do, with a link to the full Customers journey. *(Modules KB §5)*
- FR-3.4 Environment-scoped filtering for environment managers (only their own environment's runaway records). *(Modules KB §5)*
- FR-3.5 The agreed learning order is leads-that-went-quiet first, then non-renewing tenants, then dormant owners — this should drive default sort/emphasis, not just be a narrative note. *(Programme KB §32, §33)*

## 4. Actions (5 tabs)

### 4a. Corrective actions
- FR-4.1 Lifecycle: Proposed → Approved and assigned (within 5 working days; CX manager for cross-team) → In progress → 60-day verification → Effective / Partial / Failed (which reopens the signal). *(Modules KB §6; Rules and Definitions Decision 3)*
- FR-4.2 Every action carries a "How the AI found this" panel: sources + dates, the rule that fired with its threshold, where, who (role-gated names), why this team, why this action (recovery figure in full sentence form, e.g. "tried in 14 similar closed cases, recovered in 10, 10 of 14 is 71%"), and what the AI did not do. *(Modules KB §6, §29)*
- FR-4.3 Actions are classified into exactly 8 kinds (employee / service and behaviour / training gap / product and app / process / environment / legal and privacy / marketing), and the kind determines routing + receiver per the escalation matrix. An "employee" kind is always a management note to the direct manager only — never a case, never HR, never a name outside that line. *(Modules KB §6; AI Agents Spec, "Routing of corrective actions by classification")*
- FR-4.4 A proposed action can be approved, modified, rejected (with reason), or sent to investigation first; modified/rejected actions need CX manager approval before a case can close. *(Programme KB §24, §19)*

### 4b. Signals and patterns
- FR-4.5 Every complaint/low score/breach/rating/public mention from every source becomes a signal, counted not worked. *(Modules KB §6)*
- FR-4.6 Patterns tab shows groups past threshold with their signals, the team, the AI suggestion + recovery figure, and a "create action" button. *(Modules KB §6)*
- FR-4.7 Rules tab holds the editable thresholds (Settings → "Rules as configuration"). *(Modules KB §6, §12)*
- FR-4.8 Public mentions carry a "public" badge, are never tied to a person unless self-identified, and carry a 48-hour public-reply clock. *(Modules KB §6, §10)*
- FR-4.9 Hand-offs sub-view: one-customer fixes owned by another system (CRM do-not-call flag, recovery call, PSI Club member recovery) — status tracked, no SLA clock runs here. *(Modules KB §6)*

### 4c. AI Insights
- FR-4.10 Reads scored records (surveys, shopper scores, app ratings, call reviews); surfaces one pattern per category+environment with a service and time band. *(Modules KB §6)*
- FR-4.11 Every suggested action states its recovery figure in full sentence form with a bar chart and a small-sample warning (<10 cases). A "How to read these percentages" explainer panel is a first-class, always-available UI element, not a one-off tooltip. *(Modules KB §6, §29)*
- FR-4.12 "Send to a case" exists only for shopper cases in the same category — this is a hard constraint, not a general-purpose action. *(Modules KB §6)*
- FR-4.13 Two separate registers must stay visibly separate: AI Insights reads *scores/ratings*; Signals counts *complaints/breaches/mentions*. A low score becomes a signal only when it is also a complaint, breach, critical shopper item, or public mention — the UI must say so explicitly (this is a stated anti-confusion requirement, not incidental copy). *(Modules KB §6)*

### 4d. Shopper cases
- FR-4.14 Three-level severity (critical/medium/low); critical opens a case same-day (respond 1 working day, resolve 5); medium → signal; low → L&D statistic. A visit scoring under 60% is at least medium regardless of individual item results. *(Modules KB §6, §28; Rules and Definitions Decision 2)*
- FR-4.15 Case flow: CX triage with numbered proposed actions → owner decides on each line → HR pool path for conduct issues → agent's direct manager reviews HR's actions. *(Modules KB §6)*

### 4e. Investigations
- FR-4.16 When pattern evidence is thin (below the minimum sample, or no clear cause), the system does not guess a fix — it offers "request 5 customer interviews" or "request a mystery shopper check" (environment + scenario specified), and only proposes an action once that evidence comes back. *(Modules KB §6; Rules and Definitions Decision 1 "minimum sample"; AI Agents Spec, Agent 5 "Investigation actions")*

## 5. Close the loop

- FR-5.1 Every detractor (NPS 0-6, CSAT 1-2, CES worst end) or complainant is listed, critical cases first. *(Modules KB §7; Rules and Definitions Decision 3)*
- FR-5.2 Monthly capacity = people × hours/day × 4 calls/hour × working days; when detractors exceed capacity, sample down to capacity, critical first, spread across products/environments; critical is always called at 100%. *(Modules KB §7; Rules and Definitions Decision 3)*
- FR-5.3 Interview is exactly four questions (what happened / what did you expect / what would have made it right / may we come back to you), plus a reason code (10-value fixed list) and an outcome (reached / resolved on call / declined / asked for callback). Declined = no retry. *(Modules KB §7)*
- FR-5.4 Re-survey fires 7-14 days after resolution, exempt from the normal survey caps, and reports a recovery delta (first score vs. second). *(Modules KB §7)*
- FR-5.5 "Recovered" (within 60 days) = any of: rating 4/5, NPS promoter/passive, a transaction/renewal/new lead, or a new contact without a complaint. *(Modules KB §7; Rules and Definitions Decision 3 — same definition, verbatim)*
- FR-5.6 AI interview campaigns: CX-created, segment + bilingual script + hand-off rules (2× no-answer/hang-up → human; asks for a person or says anything critical → human same day; declines → no retry). **Critical detractors are never in a campaign** — this is a hard rule, must be enforced in code, not just policy. Human and AI interview results count together under the same reason codes. *(Modules KB §7; Rules and Definitions Decision 3)*

## 6. Personas and campaigns

- FR-6.1 Exactly six personas (Overseas investor, First-time expat buyer, Local family renter, Portfolio owner, Comparison shopper, Referral-driven member), each with: who, main pain, channels used, size, runaway count. *(Modules KB §8)*
- FR-6.2 Each persona carries a Marketing recommendation: who to target, which channel and when, campaign type, what *not* to do, segment size — plus a ranked "next campaign". *(Modules KB §8)*
- FR-6.3 Personas are built first by rules on CRM fields (residence, work sector, income source, units owned, lost reason) plus the actually-used contact channel; clustering is a phase-two addition requiring 3 months of live timeline data. *(Modules KB §8; Integration Plan "Personas from the CRM")*
- FR-6.4 The CX manager names/approves personas; the Internal Audit and Marketing Lead audits personas and campaign criteria; a persona nobody can act on is dropped. *(Modules KB §8)*
- FR-6.5 Personal fields used for personas are shown only as aggregated persona attributes/segment sizes — **never exported per-person** to Marketing. *(Modules KB §8; Integration Plan "Access, consent and retention")*

## 7. Surveys and triggers

- FR-7.1 The lead funnel (enquiry → contacted → viewing → offer → signed) frames every transactional survey; each stage shows its source split and "why they stopped" reasons. *(Modules KB §9)*
- FR-7.2 Exactly 5 instruments, each with its own trigger and cap: NPS after a completed milestone (90-day cap, + yearly relationship NPS); CSAT+CES after a meaningful interaction (30-day cap, priority inside the window: viewing > offer > call); "What stopped you?" once, 14 days after silence; CES on an abandoned identified digital step or a closed ticket; re-survey 7-14 days post-resolution (exempt from caps). *(Modules KB §9; Rules and Definitions Decision 5 — identical table)*
- FR-7.3 Public channels (Facebook/Instagram/LinkedIn/Google) are **never surveyed** — public reply within 48 hours instead, feeding the public reputation index. *(Modules KB §9, §10)*
- FR-7.4 Per-product survey moments differ and must never be combined into one number — PSI Real Estate / After-Sales / PSI Club / Tour Estate / PSI Events / PSI Wallet each has its own line and its own moments (table in Modules KB §9 and Programme KB §39). "Group NPS: none, by design" must appear as explicit UI copy, not just be true by omission.

## 8. Non-functional requirements

- NFR-1 **Bilingual EN/AR with full RTL** on every page, including the AI assistant (voice and text), without exception. *(CLAUDE.md; Modules KB throughout)*
- NFR-2 **Role-gated visibility**, enforced at the data-access layer, not just the component layer, for three things specifically: conversation text, agent names, case assignment to non-top-management titles. *(Modules KB §2; Rules and Definitions "Roles named in these rules"; AI Agents Spec acceptance criteria: "No API path returns conversation text to a role outside the CX team and CX manager; verified by an automated access test per role")*
- NFR-3 **Sample-data labeling**: every page must be able to show a persistent "prototype/sample data, nothing is sent" state until a feed is marked trusted. *(Modules KB §1, §17)*
- NFR-4 **Rules as configuration**: every numeric threshold named anywhere in this document (30-day windows, 5/3/50% signal thresholds, 60-day verification, 90-day hold, 14-day silence, calling-hour windows, SLA hours) must be editable under Settings by the CX manager, without a code deploy. *(Modules KB §12; AI Agents Spec acceptance criteria #1)*
- NFR-5 **Light/dark theme** via CSS custom properties (already tokenized — see `UI_UX_SPECIFICATION.md`). *(Existing prototype + `frontend/src/styles/theme.css`)*
- NFR-6 **Glossary affordance**: a "?" beside every metric/heading, and a sitewide "What the terms mean" search modal, sourced from one glossary data file. *(Modules KB §14)*
- NFR-7 **Evidence-traceability**: any AI-generated text anywhere in the UI (journey reading, action rationale, persona recommendation, monthly report narrative) must be structurally tied to cited evidence records — this is enforced server-side by the Supervisor's "evidence check," but the frontend's data contracts must carry an `evidence: []` array end-to-end so the "how the AI found this" panel always has something to render, never silently omit it. *(AI Agents Spec, "common contract" + per-agent "Supervisor checks")*
- NFR-8 **"CX only, not QA"** scope boundary — do not build call-QA scoring, agent compliance rubrics, or AI-agent-persona pages into this portal; they are explicitly out of scope. *(Programme KB §18)*

## 9. Explicitly out of scope for this rebuild (per the Phase One Integration Plan)

- Call recording and its storage/playback.
- A survey-builder UI (the old branching-question builder) — v38 replaced it with the triggers/caps model above; the builder's *question-type vocabulary* (NPS/rating/choice/yes-no/open) is still valid data, just not via a standalone builder page.
- The mystery shopper programme's live scoring logic beyond what's already described (it "stays in the portal on its own data" for phase one; Agent 4's full severity automation is explicitly phase two).
- Any write-back into the CRM.
