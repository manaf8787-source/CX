# Project memory — PSI CX Portal

A condensed map of `Documents/` for quick orientation before opening the full files. See `CLAUDE.md` at the repo root for the file map and working conventions.

## Timeline of what's been decided/built (newest first)

- **2 Nov 2026** — Scope narrowed to live products only: Real Estate + After-Sales shown; Club/Tour Estate/Events built but hidden until launch. Structure moved out of the portal UI into the Knowledge Base doc only. Round 3 additions: Settings page, monthly CX pack, suggestions log, glossary, audit trail, rewritten demo walkthrough. Pilot plan drafted (8 weeks, proposed Dubai environment).
- **29 Oct – 1 Nov 2026** — Two CX levels defined (manager approves, team executes). Full authority matrix for 12 roles. Titles-not-names rule. PSI Club: manual assignment, no Finance, C-level informed only. CRM is the fixed source for environments/pools/agents (portal reads, never edits).
- **28 Oct 2026** — Several same-day decisions: (1) IVR has 3 channels (suggestions/comments/complaints) routed differently; (2) scope boundary "CX only, not QA" — call-quality scoring is explicitly out of scope; (3) 6-step complaint workflow (open → triage → owner responds → owner fixes/root-cause → CX verifies → closed) with proposed-corrective-actions mechanic; (4) WhatsApp surveys must be Meta-approved Utility templates, not generic Marketing; (5) routing can be per-environment or uniform, configurable per complaint type; (6) mystery shopper got its own sign-in entry + form-import feature; (7) WhatsApp readiness checker + merged "call timing" complaint type.
- **Earlier** — Core build: mystery shopper (checklists/shoppers/distribution/review), survey engine (campaigns/batches/branching), After-Sales desk (3 survey versions by unit status: ready/off-plan/rental), AI call center evaluation (8-criterion rubric, 4 critical), incidents/SLA engine (two clocks: respond/resolve, escalation ladder, two mailboxes).

## Quick facts worth remembering

- Owner/stakeholder: Manaf Obeidat, Delivery and CX Manager, PSI Real Estate (Amman) — this is the user.
- Demo audience: the chairman, referred to as "Omar."
- No passwords in the prototype (one landing-page entry per role); real system will use SSO.
- Two mailboxes: CX Team (routine) and CX Complaints (problems/deadlines).
- AI call center = PSI's outbound/inbound agent via **BrightCall** vendor; portal only *views* that dashboard, never changes it.
- Evaluator accuracy today ~60%, target 80% — that number belongs to the separate QA topic, not CX.
- Pilot: 8 weeks, proposed environment Dubai, products Real Estate + After-Sales only, go/no-go decision at week 8.

## Things noticed while reading (worth raising with Manaf)

- `PSI-CX-Programme-Knowledge-Base.md` (section header, line 5) references a path `claude/PSI-CX-Portal-Knowledge-Base-Modules.md` — no `claude/` subfolder actually exists; the file is at `Documents/PSI-CX-Portal-Knowledge-Base-Modules.md`. Likely a stale path from when it was organized differently.
- `Documents/Claude outputs/PSI-CX-Programme-Knowledge-Base.md` is a byte-for-byte duplicate of the root copy as of 2 Nov 2026 — no divergence yet, but it's a manual-sync risk if one gets edited and not the other.
- `PSI-CX-Portal-Knowledge-Base-Modules.md` section 8 repeats the same sentence twice back-to-back ("PSI Club, Tour Estate and Events are built into the portal but hidden until launch...") — minor copy-editing cleanup, not a content issue.
- `KB.pdf` and `PSI-CX-Portal-Knowledge-Base.docx` appear to be the same document in two export formats (same title, same structure) — only read one when checking content; use the `.docx`/`.md` for text edits since the PDF is a dead-end for further editing.
