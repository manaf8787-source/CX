# User Roles and Permissions

Sources: Modules KB §2 ("Who uses it and what each one sees") and §11 (agent roles), Programme KB §24 and §37-§38, `CX-Portal-Rules-and-Definitions.docx` ("Roles named in these rules"), cross-checked against the existing scaffold's `frontend/src/auth/RoleContext.tsx` and `frontend/src/data/roles.ts`.

## Current (v38) role list — the target for Phase 2

| Role | Pages (of the 7) | Sees | Can do |
|---|---|---|---|
| **CX manager** (level 2) | All 7 + Settings and reference | Everything: all categories, environments, agent names, conversation text | Approve corrective actions, set thresholds, set who-sees-what, approve standards for scoring, approve personas, release the monthly report |
| **CX team** (level 1) | All 7 + Settings and reference | Everything, agent names, conversation text | Create corrective actions, send AI suggestions to cases, triage shopper cases, run the assistant, create AI interview campaigns |
| **Environment management** (e.g. Sales manager, Dubai) | Home, Customers, Runaway, Actions, PSI Real Estate | Only its own environment, with agent names; no conversation text | Own and run its corrective actions, decide on proposed actions for shopper cases in its environment |
| **Sales team lead** (pool) | Home, Customers, Actions | Its pool's agents and cases | Follow actions for its pool |
| **After-Sales team lead** | Home, Customers, Actions, Voice of Customer, After-Sales | Process/speed/communication signals | Own After-Sales actions |
| **L&D manager** (Learning and Development) | Actions, Standards register, Training | Communication/product-knowledge/attitude signals; own L&D requests only | Deliver training and materials; write the standards it owns (CX manager approves for scoring) |
| **HR specialist** | Actions, HR team | Attitude signals; cases assigned to the HR pool | Write corrective actions on conduct (agent's direct manager reviews them) |
| **HR manager** | HR team performance | Team numbers and late alerts only | Nothing on cases — **informed only** |
| **Marketing manager** | Home, Customers, Runaway, Personas | Personas, campaign recommendations, runaway types; no conversation text, no agent names | Receive campaign briefs |
| **Internal Audit and Marketing Lead** (UAE) — Mr. Karam | Overview, Intelligent CX team, Personas, Runaway, Standards, Monthly pack, Settings | Aggregates and audit views: data-feed trust, standards compliance, mystery-shopper waves, personas/campaign criteria, the weekly supervisor sample; **no cases, no conversation text, no agent names** | Mark feeds/standards trusted, audit personas and campaign criteria, fill the escalation matrix with product owners, read the weekly sample of agent outputs |
| **Executive** (read only) | Home, Customers, Runaway, Actions, Personas, Overview, Monthly pack | Everything, read only, no agent names | Nothing — **informed only** |
| **Mystery shopper** | Own tasks only (separate landing-page entry, email/mobile + one-time code sign-in) | Briefs, deadlines, forms, CX replies to questions | Fill forms, ask CX questions |

Standing rules that cut across every role (do not implement as per-role exceptions — implement as a single access-control layer, since every role list repeats the same three constraints):
1. Cases go to the people concerned, never to top management; heads and C-level are informed only.
2. Agent names show only to CX (team + manager) and to the agent's own direct management.
3. Conversation text (WhatsApp, app chat, CRM notes) is readable by the CX team and CX manager only — no exceptions, enforced "by five instruments" at the data layer, not just hidden in the UI (per the AI Agents Specification: "No API path returns conversation text to a role outside the CX team and CX manager; verified by an automated access test per role").

The CX manager also owns an editable **AI Insights access matrix**: which role sees which categories, which environment, whether names show, and which actions are available — changes apply at once. This matrix should be modelled as data (a role × capability grid), not hardcoded per page, exactly as `frontend/src/data/roles.ts`'s `AUTHORITY_MATRIX` already does for the older role set.

## Roles that exist in the v38 docs but NOT in the current `frontend/` scaffold (net-new for Phase 2)

- **Marketing manager** — no equivalent `RoleId` in `frontend/src/types.ts`.
- **Internal Audit and Marketing Lead** — no equivalent; this is a materially different access profile (audit-only, no cases, no conversation text, no names) that needs its own `RoleId` and its own capability set.
- **Mystery shopper** role *does* exist in the scaffold (`shopper`, home `/shopper/tasks`) — reusable as-is.
- The scaffold's **`tourscx`** ("Product CX — PS Tours") role roughly maps to the "product's own CX team" concept mentioned for Tour Estate in the Rules and Definitions doc ("a product with its own CX team (PS Tours) receives the case as a team and routes internally") — keep it, but it is not one of the explicit v38 role rows; treat as a product-specific variant rather than a top-level v38 role.
- The scaffold's **`clevel`** ("C-level and heads") role maps directly to "Executive... informed only" / "heads and C-level informed only" — reusable, just rename/merge with the new `exec` semantics if they diverge.
- The scaffold has **no distinct L&D role** — it has an `hrspec`/`hrmgr` pair but nothing named L&D/OD. Section §15 of the Modules KB describes a dedicated L&D manager dashboard (training-gap actions, L&D requests, owned standards) that is genuinely new UI, not a relabel of HR.

## The ten AI agents and the supervisor — not user roles, but shape the permission model

These are backend/AI-side actors (see `APPLICATION_MODULES.md` and the AI Agents Specification for full detail), but two access rules from their spec directly constrain the frontend's data layer and must be respected by any API/mock layer Phase 2 builds:
- Conversation text is readable only by Agents 1, 2 and 8 on the backend side, and only by CX team/CX manager on the frontend side — never copied into any output shown to another role, ever.
- Agent identity is carried as CRM ids internally and resolved to display names **only** for roles allowed to see them (CX + the agent's own management) — meaning the frontend data layer needs a name-resolution step gated by role, not a flat "agent name" field on every record.

## Open items affecting this document

- The escalation-matrix cells per product (who exactly receives each action kind, by title) are due from the product owners with the Internal Audit and Marketing Lead by 28 Nov 2026 — not yet filled (Programme KB §43.1).
- Real HR pool members and environment names are placeholders (Programme KB §43.8).
- No product owner / product manager role exists in the portal — explicitly removed at Manaf's request (Programme KB §29); do not reintroduce one in Phase 2.
