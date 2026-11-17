# PSI CX Portal — project notes for Claude

This repository holds the knowledge base, plans and standards list for the PSI CX Portal programme, plus a React build of the portal. The interactive prototype is a Claude Artifact hosted at claude.ai; the `.html` file here is a static export of it (version 38), not a live app to build or run. **`React-Frontend/` is the React build of v38** (Vite + TypeScript + shadcn/ui + Tailwind, sample data only, no backend): run it with `npm install` then `npm run dev`, and check it with `npm run check` and `npm run test:e2e`. Its own docs are in `React-Frontend/docs/` (analysis, design system, fidelity review, implementation report). The `frontend/` folder is an older pre-omnichannel React scaffold, reference only.

## Who this is for

Owner: **Manaf Obeidat**, Delivery and CX Manager, PSI Real Estate. Audience: PSI management, the CX team, L&D (George), Marketing, the AI and IT teams who will build the real platform.

## What PSI CX Portal is (as of 17 Nov 2026, v38)

An **omnichannel** customer experience platform: one record per person (lead or customer), every contact from every channel on one timeline, read by rules and AI. Seven pages: Home (one search), Customers (the journey, every event with its source badge), Runaway customers (six types), Actions (corrective actions classified into eight kinds and routed by the escalation matrix, with signals, AI insights, shopper cases and investigations as tabs), Close the loop (the human call to every detractor, reason codes, re-survey, optional AI campaigns), Personas and campaigns, Surveys and triggers. Plus an AI assistant (voice or text, Arabic or English) and the Intelligent CX team page: ten single-task AI agents and one supervisor with six checks; people approve, read, see names and call. The earlier modules (mystery shopper, standards register, voice of customer, L&D, teams, settings) sit under "Settings and reference". Six products: PSI Real Estate and After-Sales live; PSI Club, Tour Estate, PSI Events and PSI Wallet hidden until launch.

The rules (five decisions, all configuration): signals are counted, not worked; a pattern (5 same issue, 3 same agent, 50% concentration, 30 days, sample ≥ 10) gets one *suggested* corrective action that the responsible manager approves within 5 working days, verified at 60 days, effective at a 50% drop held 90 days; only a critical mystery shopper item or a legal/privacy signal opens a case directly; NPS only after a completed milestone (cap 90 days), CSAT + CES after a meaningful interaction (cap 30 days, viewing > offer > call), public channels never surveyed, each product its own line with no group NPS, PSI Website and PSI Real Estate app two named sources.

## File map

| File | What it is |
|---|---|
| `Documents/PSI-CX-Programme-Knowledge-Base.md` | **Start here.** Chronological project log: decisions, requirements, open questions. Sections 28 to 43 cover the omnichannel rebuild, the rules layer and the intelligent CX team; section 44 the React build. |
| `Documents/PSI-CX-Portal-Knowledge-Base-Modules.md` | **Reference.** v38 page by page: what each page is for, what each role sees, the rules, the data. Same content as the Word document without pictures. |
| `Documents/PSI-CX-Portal-Knowledge-Base.docx` / `KB.pdf` | The illustrated knowledge base (60 screenshots), for people who will not open an `.md` file. |
| `Documents/CX-Portal-Phase-One-Omnichannel-Integration-Plan.docx` | What the AI and IT teams need to build: per channel, the unified record, identity, integrations, the ten-week plan. |
| `Documents/Standards-Documentation-List-for-LD.docx` | The 28 standards documents L&D is asked to write, with contents, writers, readers and the PSI Assets variants. |
| `Documents/CX-Portal-Rules-and-Definitions.docx` | The five decisions of the rules layer in full (thresholds, severities, recovered, escalation matrix template, feedback coverage). |
| `Documents/CX-Portal-AI-Agents-Specification.docx` | For developers: the ten agents in nine fields each, the supervisor, routing, rollout and acceptance. |
| `Documents/Customer-Journey-Template.docx` | For the Marketing meeting: journey templates per service with [Proposed] stages and ten questions. |
| `Documents/CX-Portal-AI-Agents-deck.pdf`, `Documents/Survey-Journeys-deck.pdf` | The AI-team deck (business language, one example per agent) and the survey journeys deck. |
| `Documents/PSI-CX-Portal-Pilot-Plan.docx` | Earlier eight-week pilot plan (2 Nov); superseded in scope by the phase one plan but kept for the management review history. |
| `Documents/PSI CX Portal.html` | Static export of the prototype, v38, bilingual EN/AR with RTL. |
| `PSI CX Portal.html` (root) | Same v38 export as the one in `Documents/`, kept at the root for quick opening. |
| `intro-video/`, `*.mp4` | The recorded walkthrough; the four-slide introduction deck and the video page live online (see section 37). |

Live links (private, shared individually) are in `PSI-CX-Programme-Knowledge-Base.md` section 42.

## Conventions used throughout the docs

- **`[Proposed]`** marks anything Claude suggested that Manaf has not confirmed; never present it as decided.
- All figures and names in the prototype are **sample data** (30 people, about 120 interactions); never treat a number or name as real.
- Titles, not names, for roles; cases go to the concerned people, never to top management; heads and C-level are informed only.
- Conversation text is readable by the CX team and CX manager only; agent names only by CX and the agent's own management.
- The department for training and standards is **L&D** (Learning and Development), formerly written OD.
- Bilingual English and Arabic with full RTL is a hard requirement for anything portal-facing.
- "CX only, not QA" remains the scope boundary.
- A corrective action is always a suggestion; a person approves. Other teams are receivers, never rebuilt here.
- Mr. Karam is the **Internal Audit and Marketing Lead** (UAE); never "Karam" alone in documents.

## Open questions

See `PSI-CX-Programme-Knowledge-Base.md` section 43.

## Working with these docs

- Don't invent or confirm decisions on Manaf's behalf; flag open items rather than resolving them silently.
- The Programme KB is a chronological log (append dated sections); the Modules KB is a structural reference (edit in place by section).

## Git: auto-push rule (set by Manaf, 17 Nov 2026)

- All work is committed and pushed to `origin/main` (github.com/manaf8787-source/CX) every hour by the Windows scheduled task **CX-AutoPush**, which runs `.claude/auto-push.ps1`. Log: `%LOCALAPPDATA%\cx-auto-push.log`.
- Claude may commit and push to `main` without asking. Never force-push; never commit secrets (`.env`, keys); files over 95 MB are left out automatically.
- To stop it: `Unregister-ScheduledTask -TaskName CX-AutoPush -Confirm:$false`.
- `React-Frontend/` is the current React build (shadcn/ui + Tailwind, decided 17 Nov 2026); `frontend/` is the older scaffold, reference only.
