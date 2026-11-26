# CX Portal Backend: Working Context

Read this first in every backend session. It holds what was decided, where things are, and what comes next.
Last updated: 26 November 2026. Owner: Manaf Obeidat (Delivery & CX Manager, PSI).

## 1. Where things are

| Item | Location |
|---|---|
| React frontend (approved) | `C:\Users\xele\Desktop\CX\React-Frontend` |
| Backend working folder | `C:\Users\xele\Desktop\CX\Backend` |
| Requirements sent to the CTO | `Backend\CX-Portal-Backend-Requirements.md` |
| Email to Ahmad Al-Khatib (CTO) | `Backend\Email-to-Ahmad-Al-Khatib.html` |
| Review link of the frontend (Alaa, Mr. Karam) | https://claude.ai/artifact/UJudX9bpSaBWGK42QVhbFe (republish after every frontend change) |
| Backend plan (doc) | https://claude.ai/artifact/CK8y3k229eCeytP96bALTj |
| Integration requests (doc) | https://claude.ai/artifact/X73AsDDVVznqGGQvo2SkeC |
| AI agents specification | https://claude.ai/artifact/Sdvd2cAXkHDAJ3GELy85gR |
| Rules and definitions | https://claude.ai/artifact/NxhqoSy8WkVqTW9PTMc42g |

## 2. Decisions

- **Stack:** .NET, same as the PSI CRM. Hosting inside the UAE. Database engine to match the CRM (likely SQL Server); confirm with the CTO.
- **Approach:** the backend replaces the frontend's sample data screen by screen, behind the same data shapes. `React-Frontend/src/types` is the API contract. No frontend rewrite.
- **Order:** build the core on sample data first; connect live systems last.
- **Read-only:** the portal never writes into the CRM, Odoo or the call center.
- **Data protection:** data stays in the UAE; conversation text for the CX team only; exports logged and gated by a per-person export permission; mobiles only for roles allowed to see names.
- **Environment scope** (Dubai, Abu Dhabi, PSI Assets, PSI-AI): enforced in the backend. An environment manager sees only their environment.
- **AI agents propose, people decide.** No agent approves its own output or contacts a customer on its own.
- **A signed lease in PSI Assets is a completed transaction**, counted in NPS like a sale (also renewals and move-ins).

## 3. Build phases

| Phase | Content | What becomes real in the portal |
|---|---|---|
| 0. Access and decisions | CTO answers on platform items; technical contact per system | Nothing yet |
| 1. Foundation | Database, sign-in (SSO + invited external users), users and roles, custom roles, audit log, export permission, settings (rules, escalation matrix, CRM mapping, survey questions, product routing) | Sign-in, users, audit log, settings |
| 2. Listen | Survey engine (triggers and caps), sending (WhatsApp, SMS, email, in-app), public survey page, answers | NPS, CSAT, CES tiles and the answers table |
| 3. Problems and fixes | Signals, patterns, fixes, investigations, 60-day check, working-day clocks, routing by matrix, notifications, daily brief | Problems and fixes, inbox, daily brief |
| 4. Connections | Meta, other social channels, CRM (Abu Dhabi first, then the other three), Odoo, AI call center, DNCR, marketing audit sources | Customers and timeline, data feeds, HR page, maintenance, call data |
| Pilot | CX team on real Abu Dhabi data | |
| 5. Expansion | Close the loop, public mentions, gifts, maintenance follow-up, agent reports, campaign audit, personas, runaway | Remaining screens |
| 6. AI agents live | Agents with AI models: shadow, then limited, then live | AI team page with real outputs |

## 4. Integrations (order of connection)

1. **Meta:** Facebook, Instagram, WhatsApp Business (provider, webhooks, templates).
2. **Other social channels:** LinkedIn, Google Business Profile, TikTok, YouTube, X, Snapchat; or one social listening tool if Marketing has one.
3. **CRM** x4 environments: contacts, leads, activities, deals and leases, units, agents and pools, maintenance (requests, follow-up staff, vendors, AMC visits, sign-off), complaints, WhatsApp log; events by webhook.
4. **Odoo (HR):** recruitment, HR requests, all employees (with department, division and a customer-facing tag), managers, leave, public holidays, performance appraisals (quantitative goals and qualitative assessment) and competencies (for employee personas later).
5. **AI call center, IVR, AI quality:** call and IVR logs, transcripts, quality scores, AI interview campaigns, click-to-call for the CX team, support agents' chats.
6. **UAE DNCR (TDRA):** every number checked before surveys, calls and outbound campaigns.
7. **Marketing audit:** campaign platform (Dhrumil), CRM campaign tags, ad accounts (Meta, Google, TikTok, LinkedIn, Snapchat), budgets, costs, agency invoices.
8. **Later:** PSI website and app; Tour Estate, PSI Club, PSI Wallet, PSI Events.

Full field lists are in `CX-Portal-Backend-Requirements.md`.

## 5. Frontend to replace

**Data fetchers** (`src/services/queries.ts`, `referenceQueries.ts`, `queriesV40.ts`): mock `fetch*` functions behind react-query hooks. Each becomes an API call returning the same shape:
Persons, Person, InteractionsForPerson, EffortSummary(ies), AllInteractions, Signals, Patterns, CorrectiveActions, CorrectiveRationale, Investigations, ShopperCases, DetractorCallItems, AiJourneyReading, AiCampaigns, AiInsights, Personas, CampaignRecommendations, SurveyTriggers, ProductSurveyMoments, LeadFunnel, AgentDirectory, AgentActivity, Handoffs, Standards, MsChecklists, MsScenarios, MsShoppers, MsAssignments, VocRows, VocDetail, SurveyResponses, VocComments, RulesConfig, AiAccessMatrix, LdRequests, HrPool, GlossaryTerms, Products, HomeSummary.

**Browser stores** (`localStorage`, key prefix `psicx.`) that must move to the database:
users, customRoles, audit, gifts, maintEvaluations, marketingAudit, surveySets, surveyCampaigns, callAssignments, away (team availability), agentSettings, noticeRecipients, productRouting, replyLibrary, shopperWorkflow, integrations.
Stay in the browser (per-viewer only): lang, theme, sidebar, tour, env, role, session, home.startHere, sample.folded.

**Roles** (`src/types/roles.ts`): cxmgr, cxteam, envmgmt (environment CEO), teamlead, aslead, ld, hrspec, hrmgr, marketing, auditmkt, exec, shopper, admin (super admin), useradmin (Admin), custom (built screen by screen). Page access rules: `src/auth/access.ts` and `src/auth/permissions.ts`.

## 6. Rules the engines run (from Rules and Definitions)

- **Signals:** 30-day window; 5 of the same type, or 3 on the same agent, or 50% concentration with a minimum of 10; one occurrence is enough for legal, privacy and safety.
- **Surveys:** NPS only after a completed milestone (deal, lease, handover, renewal), once per 90 days per person; CSAT and CES after a meaningful moment, once per 30 days; "What stopped you?" once after 14 days of silence; CES on digital steps for identified app users only; public channels never surveyed.
- **Fixes:** approve within 5 working days; due date from the escalation matrix resolve hours (14 days fallback); 60-day check: effective when signals drop by 50% or more and do not return for 90 days.
- **Working week:** Monday to Friday, skipping UAE public holidays.
- **Close the loop:** CX calls 09:00 to 18:00, 3 attempts; AI campaigns hand over after 2 no-answers; re-survey 7 to 14 days after resolution.
- **Public replies:** Marketing replies; CX watches the 48-hour clock.
- **Weekly sample:** 50 agent outputs by Thursday to Internal Audit, no customer names.
- **Daily brief:** 07:00, per role, tiles ("your day in N numbers").

## 7. AI agents (10 + supervisor)

1 Intake and matching · 2 Classification · 3 Signals and patterns · 4 Mystery shopper severity (later) · 5 Corrective action and routing · 6 Verification · 7 Journey, runaway and personas · 8 Close the loop with detractors · 9 Reporting · 10 Survey triggers and delivery · S CX Supervisor.
Agents 3, 6, 9 and 10 start as plain rules. Details: `src/data/agentRegistry.ts` and the AI agents specification.

## 8. Waiting on

- CTO (Ahmad Al-Khatib): platform items P1 to P14 and an AI provider; technical contact per system.
- CRM owner: access method per environment, sample of 200 Abu Dhabi contacts, missing fields.
- Odoo (Mahmoud), AI call center (Ahmad Kudair), Marketing (Meta, social, ads), DNCR holder, Legal (retention).

## 9. Next step

When the CTO answers the platform items: set up the .NET solution, the database and sign-in, then build phase 1 against `src/types`, and switch the frontend's users, audit log and settings to the API.
