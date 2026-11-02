# PSI CX Portal — project notes for Claude

This repository is **documentation, not application code**. It holds the knowledge base, authority matrix and pilot plan for the PSI CX Portal programme. The actual interactive prototype is a Claude Artifact hosted at claude.ai (see links below) — the `.html` file here is a static export/snapshot of it, not a live app to build or run.

## Who this is for

Owner: **Manaf Obeidat**, Delivery and CX Manager, PSI Real Estate (Amman). Audience: the PSI chairman ("Omar"), the CX team, and the developers who will eventually build the real (non-prototype) platform.

## What PSI CX Portal is

A single platform for PSI Real Estate's UAE business covering: mystery shopper programme, Voice of Customer / NPS / CSAT, five product spaces (Real Estate, After-Sales, PSI Club, Tour Estate, PSI Events — only Real Estate and After-Sales are *launched*), a survey engine with WhatsApp/SMS/email delivery, AI call center evaluation, and a full complaints/incidents workflow with SLA clocks and an authority matrix.

Current status (as of 2 Nov 2026): prototype v19 on sample data, no backend, nothing is actually sent. An 8-week pilot plan exists for a single environment (proposed Dubai) and the two live products, pending management go-ahead.

## File map

| File | What it is |
|---|---|
| `Documents/PSI-CX-Programme-Knowledge-Base.md` | **Start here.** Chronological project log: decisions, requirements, open questions, status. Owner's running record. |
| `Documents/PSI-CX-Portal-Knowledge-Base-Modules.md` | **Reference.** Module-by-module spec: structure, the authority matrix (who can do what, 12 roles), every screen, data sources. This is the source of truth for permissions/roles. |
| `Documents/PSI-CX-Portal-Knowledge-Base.docx` | Same content as the Modules file, illustrated with 51 screenshots, for distribution to people who won't open an `.md` file. |
| `Documents/PSI-CX-Portal-Pilot-Plan.docx` | 8-week pilot plan for the management review: scope, timeline, success measures, risks. |
| `Documents/KB.pdf` | PDF export, same content as the illustrated `.docx`. |
| `Documents/PSI CX Portal.html` | Static export of the live prototype artifact (self-contained single-page app, bilingual EN/AR with RTL). |
| `Documents/Claude outputs/` | Duplicate copy of the programme knowledge base — kept in sync manually; treat the root copy as canonical. |

Live artifact links (private, shared individually, not fetchable from here): portal prototype, UAE visit checklist, illustrated web Knowledge Base — URLs are in `PSI-CX-Programme-Knowledge-Base.md` section 2 and section 26.

## Conventions used throughout the docs

- **`[Proposed]`** marks anything Claude suggested that Manaf hasn't confirmed yet — never present a `[Proposed]` item as decided.
- All figures/names in the prototype are **sample data** — never treat a number or name in the docs as real.
- Working hours for SLA clocks: Monday–Friday, 09:00–18:00. Clocks pause while waiting on the customer.
- "CX only, not QA" is a firm scope boundary (decided 28 Oct 2026) — call-quality/agent-compliance scoring is explicitly a separate, out-of-scope topic. Don't pull QA concepts back into CX features.
- Titles are used for roles, never names; cases never go to top management, only to "the concerned people."
- Bilingual English/Arabic with full RTL layout is a hard requirement for anything portal-facing.

## Open questions still unresolved

See `PSI-CX-Programme-Knowledge-Base.md` section 14 for the full list — notably: real CRM/phone system identity and API availability, real SLA targets (current ones are drafts), After-Sales real call script, calling-hours/consent/retry rules pending Legal, and real HR pool members/environment names (currently placeholders).

## Working with these docs

- Don't invent or "confirm" decisions on Manaf's behalf — if something is marked open/proposed, flag it rather than resolving it silently.
- When asked to draft new sections or update the knowledge base, match the existing terse, decision-log style (not marketing copy) and keep the "what Manaf decided vs what Claude proposed" distinction explicit.
- The two knowledge-base markdown files have different jobs: the Programme KB is a chronological log (append new dated sections), the Modules KB is a structural reference (edit in place by section).
