# PSI CX Portal — Project Analysis

Phase 1 deliverable (documentation analysis only — no implementation code). Source documents are listed at the bottom. Conventions carried over from this repo's `CLAUDE.md`: `[Proposed]` marks anything suggested but not confirmed by Manaf Obeidat (the owner); all figures and names anywhere in the source documents or the existing prototype are **sample data** (PSI gave no real production numbers) and must never be treated as real; titles are used instead of names throughout (cases go to the concerned people, never to top management; heads/C-level are informed only).

## 1. What this is

PSI (a UAE real-estate group) is building a Customer Experience (CX) programme and platform, the **CX Portal**. It started as a mystery-shopper measurement exercise and grew into an **omnichannel** platform: one record per person (lead or customer), every contact from every channel on one timeline, read by rules and AI, that turns customer signals into corrective actions with an owner and a follow-up check.

- **Owner:** Manaf Obeidat, Delivery and CX Manager, PSI Real Estate (Amman).
- **Audience:** the chairman's review ("Omar"), the CX team, PSI management, L&D, Marketing, the AI and IT teams who will build the real platform.
- **Current artifact:** a clickable prototype (a single self-contained bilingual HTML/JS file, `Documents/PSI CX Portal.html`), now at **v38** (17 Nov 2026) — not a live system. It sends nothing, has no backend, and runs entirely on generated sample data. Note: this repo's `CLAUDE.md` says "v37, dated 11 Nov 2026" — that is now one revision stale; the Programme KB and Modules KB are dated 17 Nov 2026 and describe v38. Treat the two KB `.md` files as current and `CLAUDE.md`'s version number as the thing to update, not the other way round.
- **This React rebuild (`React-Frontend/`)** is a *separate, from-scratch* frontend per the user's master prompt, built using the existing `frontend/` scaffold as a reference/base rather than starting from zero (see `APPLICATION_MODULES.md` for exactly what is reusable).

## 2. The six products

| Product | Status | What it is |
|---|---|---|
| PSI Real Estate | **Live** | Sales of units — digital, AI call center, branch/gallery, app channels |
| After-Sales | **Live** | Team that calls customers after the transaction; evaluates agent and developer |
| PSI Club | Built, hidden until launch | VIP members nominate leads |
| Tour Estate | Built, hidden until launch | Tours, guides, drivers, cars; has its own CX team |
| PSI Events | Built, hidden until launch | Events and launches |
| PSI Wallet | Built, hidden (pilot) | Investor's portfolio across countries, documents, cash flow |

Only live products (Real Estate, After-Sales) appear in the portal's menu, entry page and filters until the CX manager switches the others on. Each product keeps its own line of numbers — there is **no group-wide NPS, by design** (Tour Estate, PSI Club, PSI Wallet are separate businesses with different customers). PSI Website and the PSI Real Estate app are **sources**, not products — named on every record, never merged, so a web visitor and an app user are always distinguishable.

## 3. The one rule the whole portal runs on

> Everything that hurts a customer arrives as a **signal** (a complaint, a low score, a missed deadline, a bad rating, from any channel). A signal is **counted, not worked** one by one — the system that already owns that customer (CRM, PSI Club, support) handles them. When signals form a **pattern** (same agent 3×, same issue 5×, or ≥50% concentration in one environment, within a rolling 30-day window, on a sample of at least 10), the portal proposes **one corrective action** with an owner, a due date, and a 60-day effectiveness check. A fix is only ever *suggested*; the responsible manager approves, changes, rejects, or asks for an investigation first — nothing starts without that yes. The only things that open a case directly are **a critical mystery-shopper finding** and **any legal/privacy/safety signal, even once**.

Why this rule exists: before it, the same complaint could arrive twice — once through a product's own escalation matrix (e.g. the existing PSI Club matrix) and once as a portal case. Now each product keeps its own one-to-one correction; the portal exists to fix the *cause*, not to re-litigate individual cases.

Supporting rules, decided 12–16 Nov 2026 and shipped as editable configuration ("Rules as configuration" in Settings), full text in `CX-Portal-Rules-and-Definitions.docx`:
1. **Signals** — thresholds above; legal/privacy/safety need one occurrence.
2. **Mystery shopper severity** — critical / medium / low (see `USER_ROLES_AND_PERMISSIONS.md` and `APPLICATION_MODULES.md` for the full scale).
3. **Recovered, worked, close the loop** — approve within 5 working days, verify at 60 days, effective when signals drop ≥50% and stay down 90 days; every detractor gets a human call and a re-survey.
4. **Escalation matrix per product** — one template, cells filled by each product owner with the Internal Audit and Marketing Lead, due 28 Nov 2026 — **[open, not yet filled]**.
5. **Feedback coverage** — NPS only after a completed milestone (+yearly relationship NPS); CSAT+CES after a meaningful interaction; "What stopped you?" once after 14 days' silence; public channels (Facebook/Instagram/LinkedIn/Google) are **never surveyed**.

## 4. Scope boundary: "CX only, not QA" (decided 28 Oct 2026)

The portal is customer-experience only. Call **QA** — agent compliance scoring, evaluator accuracy targets, AI-agent persona/knowledge, cost per call, vendor dashboard controls, system status — is explicitly a **separate topic**, not in this portal. This boundary removed an earlier (corrected) mistake where QA-adjacent items were wrongly stripped out as if they were QA; anything that hurts the customer experience — however it is found — is in scope.

## 5. Hard non-functional requirements

- **Bilingual English/Arabic with full right-to-left (RTL) layout** on every page — not optional, not a stretch goal. The existing prototype and the `frontend/` scaffold both implement this via a bilingual-string type (`{ en, ar }`) carried through the whole data layer, a lang/dir context, and `document.documentElement.dir` flipping. Phase 2 must keep this pattern.
- **Visibility rules are load-bearing, not cosmetic:** conversation text (WhatsApp, app chat, CRM notes) is readable by the CX team and CX manager only, ever. Agent names show only to CX and to the agent's own management. Cases are assigned to the concerned people, never to top management; heads and C-level are informed only (a notice, never a task). Marketing and executives see personas/patterns without names or conversation text. The Internal Audit and Marketing Lead sees aggregates and audit views only — no cases, no conversation text, no agent names.
- **All data is sample data** until a feed is marked trusted by the Internal Audit and Marketing Lead — every page must be able to say so (the prototype carries a permanent "sample data, nothing is sent" banner).
- **Light and dark theme**, driven by CSS custom properties, already tokenized in both the prototype and `frontend/styles/theme.css` (see `UI_UX_SPECIFICATION.md`).
- Every metric/heading needs a "?" definition affordance and there is a sitewide "What the terms mean" glossary — this is a real, specified feature, not a nice-to-have.

## 6. Where the programme is going (context for sequencing Phase 2's own backlog)

Three foundations are explicitly agreed to come *before* the platform is built out further: the **omnichannel data integration** (10-week plan, 16 Nov 2026 → go-live week of 25 Jan 2027, CRM connector is the critical path), the **L&D standards** (28 written standards, 5 instruments read them), and the **rules layer** (§3 above). A five-phase programme plan is agreed: Decide (11–28 Nov 2026) → Base (1 Dec–29 Jan) → Build and pilot (1 Feb–26 Mar) → Scale (29 Mar–7 May) → Run. A "CX Portal" Jira project (key CXP) is planned but does not exist yet.

This matters for the React rebuild: the portal's **data model and rules are still partly provisional** ([Proposed] SLA numbers, placeholder escalation-matrix cells, placeholder environment names, a placeholder brand palette). Phase 2 should build against **configuration-driven** rules and mock data that can swap for the live feed described in the Phase One Integration Plan, not hardcode today's sample numbers as if they were final.

## 7. Source documents read for this analysis

- `Documents/PSI-CX-Programme-Knowledge-Base.md` (542 lines, chronological decision log, sections 1–43)
- `Documents/PSI-CX-Portal-Knowledge-Base-Modules.md` (v38 structural reference, 19 sections)
- `Documents/CX-Portal-Rules-and-Definitions.docx`
- `Documents/CX-Portal-AI-Agents-Specification.docx`
- `Documents/Customer-Journey-Template.docx`
- `Documents/CX-Portal-Phase-One-Omnichannel-Integration-Plan.docx`
- `Documents/Standards-Documentation-List-for-LD.docx`
- `Documents/PSI-CX-Portal-Pilot-Plan.docx` (superseded in scope, kept for history only)
- `Documents/CX-Portal-AI-Agents-deck.pdf` and `Documents/Survey-Journeys-deck.pdf` (image-only decks — no extractable text in this environment; two representative slides were viewed as images and confirmed to restate, in business language, content already covered in full by the Specification and Journey Template documents above; they additionally confirm the visual design language — see `UI_UX_SPECIFICATION.md`)
- `Documents/PSI CX Portal.html` (the v38 prototype itself — inspected via targeted search, not a full read; see `UI_UX_SPECIFICATION.md`)
- `C:\Users\xele\Desktop\CX\frontend\src\` (the existing pre-omnichannel React scaffold, read in full for `App.tsx`, `types.ts`, `data/`, `lib/`, `auth/`, `i18n/`, `theme/`, `settings/`, `styles/theme.css`, and skimmed page-by-page)
- `Documents/KB.pdf` was not read in detail — confirmed by `CLAUDE.md` and the Modules KB itself to be the same content as the Modules KB, illustrated with screenshots.
