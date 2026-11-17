# PSI CX Portal — project notes for Claude

This repository is **documentation, not application code**. It holds the knowledge base, plans and standards list for the PSI CX Portal programme. The interactive prototype is a Claude Artifact hosted at claude.ai; the `.html` file here is a static export of it (version 37), not a live app to build or run. The `frontend/` folder is a separate React scaffold and is not the prototype.

## Who this is for

Owner: **Manaf Obeidat**, Delivery and CX Manager, PSI Real Estate. Audience: PSI management, the CX team, L&D (George), Marketing, the AI and IT teams who will build the real platform.

## What PSI CX Portal is (as of 11 Nov 2026, v37)

An **omnichannel** customer experience platform: one record per person (lead or customer), every contact from every channel on one timeline, read by rules and AI. Five pages: Home (one search), Customers (the journey), Runaway customers (six types), Actions (corrective actions, with signals, AI insights and shopper cases as tabs), Personas and campaigns. Plus an AI assistant (voice or text, Arabic or English). The earlier modules (mystery shopper, standards register, voice of customer, L&D, teams, settings) sit under "Settings and reference". Six products: PSI Real Estate and After-Sales live; PSI Club, Tour Estate, PSI Events and PSI Wallet hidden until launch.

The rule: signals are counted, not worked; patterns over a threshold get one corrective action with an owner and a 30-day check; only a critical mystery shopper item opens a case directly.

## File map

| File | What it is |
|---|---|
| `Documents/PSI-CX-Programme-Knowledge-Base.md` | **Start here.** Chronological project log: decisions, requirements, open questions. Sections 28 to 38 cover the omnichannel rebuild. |
| `Documents/PSI-CX-Portal-Knowledge-Base-Modules.md` | **Reference.** v37 page by page: what each page is for, what each role sees, the rules, the data. Same content as the Word document without pictures. |
| `Documents/PSI-CX-Portal-Knowledge-Base.docx` / `KB.pdf` | The illustrated knowledge base (36 screenshots), for people who will not open an `.md` file. |
| `Documents/CX-Portal-Phase-One-Omnichannel-Integration-Plan.docx` | What the AI and IT teams need to build: per channel, the unified record, identity, integrations, the ten-week plan. |
| `Documents/Standards-Documentation-List-for-LD.docx` | The 28 standards documents L&D is asked to write, with contents, writers, readers and the PSI Assets variants. |
| `Documents/PSI-CX-Portal-Pilot-Plan.docx` | Earlier eight-week pilot plan (2 Nov); superseded in scope by the phase one plan but kept for the management review history. |
| `Documents/PSI CX Portal.html` | Static export of the prototype, v37, bilingual EN/AR with RTL. |
| `PSI CX Portal.html` (root) | Same v37 export as the one in `Documents/`, kept at the root for quick opening. |
| `intro-video/`, `*.mp4` | The recorded walkthrough; the four-slide introduction deck and the video page live online (see section 37). |

Live links (private, shared individually) are in `PSI-CX-Programme-Knowledge-Base.md` section 37.

## Conventions used throughout the docs

- **`[Proposed]`** marks anything Claude suggested that Manaf has not confirmed; never present it as decided.
- All figures and names in the prototype are **sample data** (30 people, about 120 interactions); never treat a number or name as real.
- Titles, not names, for roles; cases go to the concerned people, never to top management; heads and C-level are informed only.
- Conversation text is readable by the CX team and CX manager only; agent names only by CX and the agent's own management.
- The department for training and standards is **L&D** (Learning and Development), formerly written OD.
- Bilingual English and Arabic with full RTL is a hard requirement for anything portal-facing.
- "CX only, not QA" remains the scope boundary.

## Open questions

See `PSI-CX-Programme-Knowledge-Base.md` section 38.

## Working with these docs

- Don't invent or confirm decisions on Manaf's behalf; flag open items rather than resolving them silently.
- The Programme KB is a chronological log (append dated sections); the Modules KB is a structural reference (edit in place by section).
