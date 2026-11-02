# PSI CX Portal: Knowledge Base (modules, roles, authority matrix)

Prototype on sample data. Updated 1 Nov 2026. The illustrated version with 51 screenshots is the published page; screenshot names are listed as [Screenshot: name].

## Contents

- 1. What this is and what is in scope
- 2. Structure: who is involved
- 3. Authority matrix
- 4. Entry and navigation
- 5. Overview, product dashboards and Voice of Customer
- 6. Product: Real Estate
- 7. Product: After-Sales (the desk and the team)
- 8. Products not launched yet
- 9. Complaints management
- 10. AI Insights: suggested corrective actions
- 11. Survey engine: builder, campaigns and delivery
- 12. Mystery shopper (internal and external)
- 13. Call center and IVR (CX view)
- 14. Settings, monthly pack, suggestions log, glossary and audit trail
- 15. Standards library
- 16. Data and integrations needed
- 17. Rules decided so far

## 1. What this is and what is in scope

The CX Portal is the single place where PSI manages the customer experience: surveys, mystery shopping, complaints, insights and the After-Sales desk. This page describes every part of it, who does what, and who may do what.

### The demo and this document

The portal today is a working prototype on sample data. It sends nothing: no emails, no WhatsApp, no calls. Every name, number and chart in the screenshots is a sample. This Knowledge Base describes how each part should work in the live system and reflects what the prototype already shows. Where something is a placeholder, it says so.

### Scope decisions

- The portal is CX only. Call QA topics (agent compliance scoring, evaluator accuracy, AI persona) are handled outside it.
- Only launched products are shown: PSI Real Estate team (the PSI mobile app) and After-Sales. PSI Club, Tour Estate and Events are built into the portal but hidden until launch. The CX manager switches them on when a product launches.
- Digital channels are rated only when a lead opens. For speed to lead, the system rings the agent pool first, and only when an agent picks up does it ring the customer. A customer never waits unanswered.
- Complaints cover everything that hurts customer experience, however it was found (customer, survey, mystery shopper, call monitoring, staff report).
- The BrightCall dashboard is view only. Nothing is changed there.

### How this document is organised

Section 2 gives the overall structure of the CX team. Section 3 is the authority matrix for every role. After that, every function and every product has its own section, and each one starts with its own Structure: the job titles that work in it, what each does, and what each can see. Then come what it is for, what it looks like, what each user does, and where its data comes from. The last sections list the data and integrations needed from IT and the rules decided so far.

## 2. Structure: who is involved

Two CX levels, the people who own each case outcome, and people who are only told. Titles are used, not names. Environments and agent pools are read from the CRM.

### The CX team has two levels

| Level | Role | What they do |
|---|---|---|
| Level 2 | CX manager | Everything the CX team does, plus approves AI suggested actions and rejected or modified corrective actions, and manages the structure, the HR pool, SLAs and product launch status. |
| Level 1 | CX team | Works the cases: triages, assigns by hand, writes proposed corrective actions, verifies and closes. Cannot approve rejected actions or change the structure. |

### Everyone else, by title

| Role | Portal access | Notes |
|---|---|---|
| Environment management (for example Sales manager, Dubai) | Cases of their environment, AI Insights for their scope, Voice of Customer, Real Estate dashboard | Works cases assigned to them or their pool. Reviews corrective actions for the pools under them. Sees agent names inside their own scope. |
| Team lead (pool of an environment) | Cases and insights of the agents in the pool | Sees names of the agents in the pool. |
| After-Sales lead and After-Sales agent | The After-Sales desk: call queue and call screen. The lead also sees the team queue and After-Sales cases | Agents work their own call list. Leads reassign calls and own After-Sales cases. |
| HR specialist 1 and 2 | Only the cases assigned to them | Work attitude and conduct cases and write the corrective actions. Pool is dynamic. |
| HR manager | Team performance page only | Informed only. Sees specialists' counts and is alerted on delay. No case access, ever. |
| C-level and department heads | No tasks. They receive a notice | Informed only. Never assigned a case. Corrective actions never come from them; they come from direct management. |
| Product CX (PS Tours) | Their own product's cases | PS Tours has its own CX team that follows up with operations. Not launched. |
| Executive | Dashboards and results, read only | No actions. |
| Mystery shoppers (internal and external) | Their own tasks only, through a separate sign-in | See the Mystery shopper section. |

### Four roles on every case

- **Case owner:** always CX. Follows the case from opening to close.
- **Assigned to:** the person who deals with it. Chosen from the concerned people, never top management.
- **Corrective action owner:** confirms, modifies or rejects each proposed action. Differs by product (see the routing table).
- **Informed only:** receives a notice. Has no task and no access to the case.

### Routing by product

| Product | How a case is assigned | Assigned to | Corrective action from | Informed only |
|---|---|---|---|---|
| Real Estate | Automatic by type and environment. CX can change it | Sales manager of the environment, then team lead, then the agent pool (from the CRM) | Direct management of the pool | Head of Sales |
| After-Sales | Automatic by type (handover, snagging, payment, maintenance and so on) | After-Sales lead, developer liaison, finance contact, maintenance lead, leasing manager | After-Sales lead | Head of After-Sales |
| PSI Club (not launched) | Manual: CX assigns every case by hand | Sales agents pool of the environment, or its team lead | Direct management of the pool | C-level. Finance is not involved |
| Tour Estate (not launched) | Handed to the product CX team | Operations, guide or driver supervisor | Tour operations management | Head of Club and Tours |
| Events (not launched) | Automatic by type | Events lead | Head of Events | Head of Events |
| Attitude and conduct (any product) | CX assigns by hand to the HR pool | HR specialist | HR specialist writes it; the agent's direct manager reviews it | HR manager: team report and a late alert only |

### Environments and pools come from the CRM

Environments (for example Dubai, Abu Dhabi, PSI Assets), agent pools and team leads are fixed in the CRM. The portal reads them and never edits them. A new environment appears after the next sync. Every survey or contact record carries the responsible agent from the CRM, and that agent is snapshotted at the moment the survey is sent, so later CRM changes do not rewrite history.

### HR pool

The HR pool is dynamic. After the meeting with HR management, they supply the members with email and mobile. Each member signs in with the email or mobile plus a one-time code and sees only the cases assigned to them. The agent's direct manager must review HR's corrective actions before the case can close.

### Who is informed

Heads and C-level receive notices (late, high priority, escalated) and have no task. The matrix and this tab show exactly who receives what for each product.

### Structure of the CX Portal itself

Who runs the portal, who works in it, and who only reads or is told. Names are never used; titles only.

[Screenshot: fn-portal] Structure of the CX Portal: admin, operators, scope users, read-only and informed-only.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| CX manager (level 2) | Portal owner and administrator | Edits complaint types, SLAs, routing, HR pool and launch status; approves AI suggested actions and rejected or modified corrective actions; does everything level 1 does | Full |
| CX team (level 1) | Operator | Runs surveys, mystery shopper, triage and cases, imports forms; cannot approve or change structure | Full operations, structure read only |
| Environment management (Sales manager of an environment) | Scope user | Works cases of the environment, reviews corrective actions for pools under them, reads insights and Voice of Customer | Own environment |
| Sales team lead (pool) | Scope user | Sees cases and results of the agents in the pool, including names | Own pool |
| After-Sales lead and agents | Scope user | Work the After-Sales desk and After-Sales cases | Own queue or product |
| HR specialist 1 and 2 | Scope user | Work only the conduct cases assigned to them | Assigned cases only |
| Executive | Reader | Reads dashboards and results | Read only |
| HR manager | Informed only | Reads team performance, receives late alerts, no case access | Team page only |
| Heads and C-level | Informed only | Receive notices only, never assigned a case | Notice only |
| IT and CRM owner | Data provider | Provides the CRM feed (environments, pools, agents, customers), company sign-in and mail | Back end, no portal screens |
| Call center vendor (BrightCall) | Data source | View-only dashboard; call and IVR data | Source only |

## 3. Authority matrix

Who can do what, for every role. This is the master reference for permissions in the live system.

Symbols: ● full, ◐ own scope only (own environment, pool, assigned cases or tasks), ○ view only, ✉ informed only (a notice, no access or task), ✔ approves, – no access.

| What | CX manager | CX team | Environment mgmt | Team lead | After-Sales lead | After-Sales agent | HR specialist | HR manager | C-level and heads | Product CX (PS Tours) | Executive | Mystery shopper |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Dashboards and insights** | | | | | | | | | | | | |
| Overview and product dashboards | ● | ● | ◐ | ◐ | ◐ | – | – | – | ✉ | ◐ | ○ | – |
| Voice of Customer | ● | ● | ○ | ○ | ○ | – | – | – | – | ◐ | ○ | – |
| AI Insights: triggers and suggested actions | ● | ● | ◐ | ◐ | ○ | – | – | – | – | ◐ | ○ | – |
| See agent names in the drill-down | ● | ● | ◐ | ◐ | ◐ | – | ◐ | – | – | – | – | – |
| Monthly CX pack | ● | ● | – | – | – | – | – | – | – | – | ○ | – |
| Glossary | ○ | ○ | ○ | ○ | ○ | – | – | – | – | ○ | ○ | – |
| Approve AI suggested corrective actions | ✔ | – | – | – | – | – | – | – | – | – | – | – |
| **Complaints handling** | | | | | | | | | | | | |
| See cases | ● | ● | ◐ | ◐ | ◐ | – | ◐ | – | ✉ | ◐ | ○ | – |
| Triage and assign by hand | ● | ● | – | – | – | – | – | – | – | – | – | – |
| Write proposed corrective actions | ● | ● | – | – | – | – | – | – | – | – | – | – |
| Respond, record root cause | – | – | ◐ | ◐ | ◐ | – | ◐ | – | – | ◐ | – | – |
| Confirm, modify or reject proposed actions | – | – | ◐ | ◐ | ◐ | – | ◐ | – | – | ◐ | – | – |
| Review HR corrective actions (direct manager) | ○ | – | ◐ | ◐ | – | – | – | – | – | – | – | – |
| Approve rejected or modified actions | ✔ | – | – | – | – | – | – | – | – | – | – | – |
| Verify and close, reopen | ● | ● | – | – | – | – | – | – | – | – | – | – |
| Told about late and high-priority cases | ● | ● | ● | ● | ● | – | ● | ✉ | ✉ | ● | – | – |
| HR team performance | ○ | – | – | – | – | – | – | ◐ | – | – | – | – |
| **Configuration** | | | | | | | | | | | | |
| SLAs, complaint types, routing | ● | ○ | – | – | – | – | – | – | – | – | – | – |
| Settings: product launch, HR pool, notices | ● | ○ | – | – | – | – | – | – | – | – | – | – |
| **Surveys and mystery shopper** | | | | | | | | | | | | |
| Survey builder and campaigns | ● | ● | – | – | – | – | – | – | – | – | ○ | – |
| WhatsApp templates: check and submit to Meta | ● | ● | – | – | – | – | – | – | – | – | – | – |
| Mystery shopper programme and review | ● | ● | – | – | – | – | – | – | – | – | ○ | – |
| Import a filled shopper form | ● | ● | – | – | – | – | – | – | – | – | – | – |
| Fill own shopping tasks | – | – | – | – | – | – | – | – | – | – | – | ◐ |
| After-Sales call queue and call screen | ○ | ○ | – | – | ◐ | ◐ | – | – | – | – | – | – |
| Call center dashboard | ● | ● | ○ | – | ○ | – | – | – | – | – | ○ | – |
| Suggestions log | ● | ● | – | – | – | – | – | – | – | – | ○ | – |
| Standards library | ● | ● | ○ | ○ | ○ | – | – | – | – | ○ | ○ | – |

### Rules that sit above the table

- Cases are assigned to the people concerned, never to top management.
- Heads and C-level are informed only. Corrective actions come from direct management.
- The HR manager sees team numbers and late alerts, never cases.
- PSI Club: Finance is not involved; C-level is informed only; CX assigns by hand, case by case, to the sales agents pool.
- Agent names are visible to the CX team, the environment management and team lead for their scope, and the HR specialist on their own cases. Everyone else sees counts only.
- Only CX closes a case. The owner cannot close it.
- Only the CX manager approves AI suggested actions and rejected or modified corrective actions.
- The BrightCall dashboard is view only for everyone.

## 4. Entry and navigation

The landing page has one entry per role. There are no passwords in the prototype. In the live system, sign-in uses the company directory (SSO), and shoppers and HR members use email or mobile plus a one-time code.

[Screenshot: landing] Landing page: one entry per role, plus the shopper entry.

| Entry | Lands on | Sees |
|---|---|---|
| CX manager (level 2) | Overview | Everything, plus approvals and structure |
| CX team (level 1) | Overview | All working areas; no approvals, no structure changes |
| Environment management | Cases | Own environment: cases, insights, Voice of Customer, Real Estate |
| Team lead | Cases | Cases and insights of the pool |
| After-Sales lead / agent | After-Sales desk | Call queue, call screen, cases |
| HR specialist | Cases | Only cases assigned to them |
| HR manager | HR team | Team performance only |
| Executive | Overview | Overview, Voice of Customer, Insights, read only |
| Mystery shopper | My tasks | Own tasks only |

The interface is bilingual (English and Arabic) with full right-to-left layout. Menus are grouped (Overview and insights, Products, Complaints, Surveys and shoppers, Admin, My team) and each role sees only its own groups. Products that are not launched do not appear in menus, cards or filters.

## 5. Overview, product dashboards and Voice of Customer

Where leaders and the CX team read how customers feel, across products, and drill down.

### What it is for

The overview shows headline experience scores (NPS and customer satisfaction), open and late complaints, survey response, and what needs attention. Product pages (Real Estate, After-Sales) show the same view for one product. Voice of Customer collects what customers say in comments, IVR comments and survey free text, with themes and sentiment.

[Screenshot: overview] Overview dashboard.

[Screenshot: voc] Voice of Customer.

[Screenshot: exec-overview] Executive view of the overview (read only).

### What each user does

**What each user does**

- **CX manager and CX team:** Read everything, open any metric to see the cases or comments behind it.
- **Environment management and team lead:** See the same pages limited to their environment or pool.
- **Executive:** Read only. No buttons that change anything.
- **Heads and C-level:** Do not use the portal. They receive notices.

### Where the data comes from

- Surveys answered through the survey engine (see Survey engine).
- Complaints and their SLA state (see Complaints management).
- Mystery shopper results (see Mystery shopper).
- Call center overview and IVR (see Call center and IVR).
- CRM for customer, service, environment, pool and agent (see Data and integrations).

> Figures in the demo are samples. In the live system every number is computed from CRM, surveys and closed cases.

## 6. Product: Real Estate

The PSI Real Estate team and the PSI mobile app. Live. Sales environments, team leads and agent pools come from the CRM.

### Structure: Real Estate

[Screenshot: fn-re] Structure of Real Estate.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| Head of Sales | Informed only | Receives notices | Notice only |
| Sales manager per environment (Dubai, Abu Dhabi, PSI Assets: placeholders) | Environment owner and assignee | Works cases, reviews actions, owns corrective actions for the pool | Own environment |
| Sales team lead per pool | Pool lead | Works cases for the pool; sees agent names | Own pool |
| Sales agents pool (from the CRM) | Subject of surveys and cases | Assigned cases when picked; their results are visible by name only to roles allowed | Cases assigned |
| CX team | Case owner | Triage, assign, verify, close | Full |
| HR specialists | Conduct route | Work attitude cases assigned by CX | Assigned cases |

[Screenshot: prod-re] Real Estate product page.

**What each user does**

- **CX team:** Triage, assign, verify and close Real Estate cases.
- **Sales manager of the environment, team lead:** Work the cases and own the corrective actions for the pool.
- **Executive:** Read only.

## 7. Product: After-Sales (the desk and the team)

The working area for the After-Sales team: the daily call list, the call screen with the right survey, and reporting an issue.

### Structure: After-Sales

[Screenshot: fn-af] Structure of After-Sales.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| Head of After-Sales | Informed only | Receives notices | Notice only |
| After-Sales lead | Product owner for CX cases | Owns cases and corrective actions; reassigns calls; sees the team queue | Own product |
| After-Sales agents | Call team | Work the call queue (3 tries per customer), fill surveys, report an issue | Own queue |
| Developer liaison, finance contact, maintenance lead, leasing manager, account manager | Case owners by type | Work the cases routed to them | Assigned cases |
| CX team | Case owner | Triage, assign by type, verify, close | Full |

[Screenshot: prod-af] After-Sales product page.

[Screenshot: af-desk] After-Sales desk.

The survey version follows the unit status and timing: ready units, off-plan units and rental units each have their own version. An agent works the queue, makes up to 3 tries per customer, records the outcome, and fills the survey on the call screen. Anyone can report an issue, which becomes a case.

**What each user does**

- **After-Sales agent:** Own call queue; call screen; report an issue.
- **After-Sales lead:** Team queue, reassign calls, own After-Sales cases.
- **CX team:** Read the desk and results; cannot work agents' queues.

## 8. Products not launched yet

PSI Club, Tour Estate and Events are built into the portal but hidden until the CX manager switches them on when a product launches. Their structures are ready.

PSI Club, Tour Estate and Events are built but hidden until the CX manager switches them on when a product launches. Their structures are ready:

### PSI Club

[Screenshot: fn-club] Structure of PSI Club. CX assigns by hand; Finance is not involved.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| C-level | Informed only | Receives notices; never assigned | Notice only |
| Direct management of the pool | Corrective action owner | Confirms or changes the proposed actions | Own scope |
| Team lead and sales agents pool of the environment | Assignees | Work the case; CX picks by hand, case by case | Assigned cases |
| CX team | Case owner | Manual assignment, verify, close | Full |
| Finance | Not involved | No role in escalation | None |

### Tour Estate (PS Tours)

[Screenshot: fn-tour] Structure of Tour Estate. It has its own CX team.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| Head of Club and Tours | Informed only | Receives notices | Notice only |
| PS Tours CX team | Case owner | Follows up with operations | Own product |
| Tour operations management | Corrective action owner | Confirms the actions | Own product |
| Operations, guide or driver supervisor | Assignee | Works the case | Assigned cases |

### Events

[Screenshot: fn-events] Structure of Events.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| Head of Events | Informed only | Receives notices | Notice only |
| Events lead | Assignee and corrective action owner | Works the case by type | Own product |
| CX team | Case owner | Triage, verify, close | Full |

## 9. Complaints management

Everything that hurts the customer experience becomes a case with a clock, an owner and a recorded fix. CX owns the case; the concerned team fixes it; CX verifies and closes.

### Structure: who works in Complaints management

Case owner is always CX. The fixer is the concerned team for the product. Corrective actions come from direct management, never from top management.

[Screenshot: fn-complaints] Structure of Complaints management: owner, assignees per product, corrective action owners, informed only.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| CX team (level 1) | Case owner | Triage, choose the assignee, write proposed corrective actions, verify, close or reopen | Full |
| CX manager | Approver | Approves modified or rejected actions; edits types, SLAs and routing | Full |
| Sales manager of the environment | Assignee (Real Estate) | Takes the case or passes it to the team lead or agent; confirms, modifies or rejects proposed actions | Own environment |
| Sales team lead | Assignee (Real Estate, Club) | Works the case for the pool; reviews HR actions for agents under them | Own pool |
| Sales agents pool | Assignee (Club, manual) | Receive PSI Club cases when CX picks them by hand | Assigned cases |
| After-Sales lead | Assignee and corrective action owner (After-Sales) | Handover, snagging, conduct and detractor cases; owns the corrective action | Own product |
| Developer liaison, finance contact, maintenance lead, leasing manager, account manager | Assignee by complaint type (After-Sales) | Work the cases routed to them by type (finishing quality, payment, maintenance, leasing, construction updates) | Assigned cases |
| HR specialist 1 or 2 | Assignee (attitude and conduct) | Work the case and write the corrective actions | Assigned cases |
| Direct manager of the agent | Reviewer of HR actions | Reviews HR's corrective actions before the case can close | Own scope |
| Head of Sales, Head of After-Sales, C-level (Club) | Informed only | Receive notices on late, high priority and escalated cases | Notice only |
| HR manager | Informed only | Team report and a late alert only | Team page only |

### Sources: where cases come from

| Source | How it arises |
|---|---|
| Survey rule | A survey answer matches a rule (for example, snagging rated 2 or lower, or a detractor on a key question). |
| AI call center monitoring | A breach is flagged: call outside allowed hours, no AI disclosure, wrong fact, no handover when asked, late callback. |
| Mystery shopper | A critical fail or failed item. |
| Reported by staff | Anyone, including an After-Sales agent, uses Report an issue. |
| Customer ticket (linked) | Raised in a product's own app or support tool. It stays there and is linked read only, so it is never handled twice. |
| AI Insights | CX sends a suggested action from the Insights page as a case (see AI Insights). |

Each case also records the channel it came from (call center, WhatsApp or web, branch or gallery, app, event), the related product, the environment, and a link to the call in the CRM for call center cases.

[Screenshot: cmp-list] Complaints list: defaults to Needs attention, worst clock first.

### The workflow in six steps

| Step | Who | What happens |
|---|---|---|
| 1 Opened | System | Case created; the respond clock starts. |
| 2 CX triage | CX team | Confirms it is a CX matter, the type, the environment and the related product; chooses the assignee from the concerned people; writes proposed corrective actions 1, 2, 3, 4. |
| 3 Owner responds | Assignee | First response stops the respond clock. |
| 4 Owner fixes and records | Assignee and corrective action owner | Root cause category and explanation, corrective action, preventive action with owner, date and expected effect. Each proposed action is confirmed, modified or rejected. Submitting stops the resolve clock. |
| 5 CX verifies | CX team | Three checks: root cause is clear, the action was really done, the customer was told and is satisfied. Or sends it back with a reason. |
| 6 Closed | CX team | CX can reopen if the customer is not satisfied. |

[Screenshot: cmp-triage-re] Triage of a Real Estate case: assignee list is filtered to the concerned people; proposed corrective actions are written here.

### Proposed corrective actions

When CX assigns, it writes "Proposed corrective actions by CX" as a numbered list. The owner must decide on each line: confirm, modify (with a note) or reject (with a reason). The case cannot be submitted while any line is undecided. If any line is modified or rejected, the CX manager must approve before the case can close.

### Manual assignment for PSI Club

PSI Club cases are not routed automatically. CX picks the assignee by hand from the sales agents pool of the environment. C-level is informed only and Finance is not involved.

[Screenshot: cmp-triage-club] Triage of a PSI Club case: manual choice, no default owner.

[Screenshot: cmp-assigned-club] The same case after assignment.

### Attitude and conduct: the HR route

CX can assign an attitude or conduct case directly to the HR pool. The HR specialist works it and writes the corrective actions. Before closing, the direct manager of the agent concerned must review HR's corrective actions. The HR manager is told only if the HR step is late.

[Screenshot: em-hr-review] Environment manager reviewing HR's corrective actions.

[Screenshot: hrs-cases] HR specialist sees only the cases assigned to them.

[Screenshot: hrm-team] HR manager: team performance, informed only, no case access.

### Verify and close

Closing rules are editable. By default: root cause category, explanation and corrective action are required; a preventive action is required for high priority cases or when the same type happens 3 times in 30 days; otherwise "not needed" needs a written reason. Closing is blocked while a proposed action is undecided or a required manager review is pending.

[Screenshot: cmp-verify] Verify stage: CX checks and closes, or sends back.

[Screenshot: cmp-closed-file] A closed case file with its full record.

### Complaint types, SLAs and routing

27 complaint types are drafted across products, each with priority, owner, backup, manager, head and two clocks. Targets are in working hours. Clocks count Monday to Friday, 09:00 to 18:00; they pause while waiting on the customer; a clock is at risk when under 25 percent remains. Types can be routed by environment (each environment has its own people) or the same for all. Call timing is one merged type: customer called outside allowed hours or callback later than promised (high priority, respond 4h, resolve 27h).

[Screenshot: cmp-types] Complaint types and SLAs (editable by the CX manager).

[Screenshot: cmp-route] Routing and escalation ladder.

| Ladder step | When | Notified |
|---|---|---|
| Start | Case created | Owner |
| Reminder | 50% of resolve time used | Owner |
| Warning | 80% used | Owner and backup |
| Breach | 100% used | Owner, backup and manager |
| Still open | One working day after breach | Adds the department head (informed only) |

### Emails

Two mailboxes: CX Team (routine: call lists, weekly summary, survey invitations, shopper tasks) and CX Complaints (assignment, reminders, warnings, breach, escalation, resolved). Each message type has an on or off switch, an editable template and a preview. Mail outside working hours waits until 09:00, except breach and head-level escalation, which send immediately.

[Screenshot: cmp-mail] Mailboxes and templates.

### Measuring whether fixes work

Each preventive action records type, date and expected effect. The Action effectiveness tab compares complaints of that type per 100 customers before and after the fix, with reopened cases and satisfaction after the fix. A drop of a quarter or more is working; a rise or a drop under 10 percent is not working; under two months of data is too early. This is a signal, not proof.

[Screenshot: cmp-eff] Action effectiveness (sample data).

### What each user does

**What each user does**

- **CX team (level 1):** Triage, assign by hand, write proposed actions, verify, close, reopen, record what the customer said.
- **CX manager (level 2):** All of the above, plus approve rejected or modified actions, and edit types, SLAs and routing.
- **Environment management / team lead:** Work the cases of their environment, confirm or change proposed actions, review HR's actions for agents under them.
- **After-Sales lead:** Own After-Sales cases and corrective actions.
- **HR specialist:** Work assigned conduct cases; write corrective actions.
- **HR manager:** Read team numbers; receive late alerts.
- **Heads and C-level:** Receive notices only.

[Screenshot: em-cases] Environment manager's case list (own environment only).

## 10. AI Insights: suggested corrective actions

Insights reads past incidents and surveys and suggests what to do, with the evidence. Nothing becomes a case until the CX manager approves.

### Structure: who works with AI Insights

[Screenshot: fn-insights] Structure of AI Insights.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| CX manager | Approver | Approves suggested corrective actions and sends them to a case | Full, approves |
| CX team | Reader | Reads triggers, hotspots and evidence; cannot approve | Full read |
| Environment management and team lead | Scope reader | Read insights for their environment or pool, with agent names | Own scope |
| Executive | Reader | Read only | View only |

### What it does

- Groups cases by category (for example attitude, communication, handover, snagging) and shows how often each happens.
- Finds environment hotspots and time bands (for example bad attitude in one environment in the evening).
- Shows similar past cases and the share where a given action worked, as a percentage.
- Raises triggers, for example when a category's detractor share crosses a threshold (such as 90 percent) in an environment, service or time band.
- Filters: score type (customer satisfaction, or MPS, the mystery shopper score), product or channel (including the mobile app), service (investment, rental, buying), environment, pool.
- Suggests guideline actions such as a one-to-one with the agent, referral to HR, or a review by direct management.

[Screenshot: ins-main] AI Insights: triggers, categories, hotspots, similar cases.

### Drill-down to agent names

Any metric opens to service, then environment, then pool, then the agent names, using the responsible agent recorded from the CRM. Names are shown only to roles allowed to see them.

[Screenshot: ins-drill] Drill-down from a metric to agents.

### Approval flow

The CX manager approves a suggested action and sends it to a case. It then follows the normal complaint workflow, including HR routing where relevant.

[Screenshot: em-insights] Environment manager view: insights limited to their scope.

### What each user does

**What each user does**

- **CX manager:** Reviews suggestions, approves, sends to a case.
- **CX team:** Reads insights and evidence; cannot approve.
- **Environment management / team lead:** Read insights for their scope.
- **Executive:** Read only.

> Insight figures in the demo are planted samples. In the live system they are computed from CRM, surveys and closed cases.

## 11. Survey engine: builder, campaigns and delivery

Builds the customer surveys and sends them, and checks WhatsApp rules before anything is launched.

### Structure: who works in the Survey builder

[Screenshot: fn-survey] Structure of the Survey builder.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| CX manager | Owner | Approves launches; full control of surveys, rules and templates | Full |
| CX team | Builder | Builds surveys and rules, runs campaigns, checks WhatsApp templates, submits them to Meta | Full |
| After-Sales agent and lead | Survey users | Fill the survey on the call screen; the lead reassigns calls | Own queue / team |
| Executive | Reader | Views campaigns and results | View only |
| Customers | Respondents | Answer by link or inside WhatsApp | External |
| CRM (system) | Source | Audience and the responsible agent, snapshotted at send time | Feed |
| Meta and the messaging provider (external) | Approver of templates | Approve WhatsApp templates in English and Arabic; the SMS provider registers the sender name | External |

### What it serves

- Customer experience surveys for Real Estate and After-Sales (including the After-Sales versions by unit status).
- Mystery shopper distribution uses the same delivery engine.
- Complaint rules: an answer can open a case automatically.

[Screenshot: eng-campaigns] Campaigns: audiences, channel, status.

[Screenshot: eng-builder] Survey builder: questions, rules, languages.

### Delivery channel and the WhatsApp readiness check

Each survey chooses a delivery mode: WhatsApp message with a link to the portal, WhatsApp conversation with the questions inside the chat, SMS with a link, or email with a link. The Meta rules and the template check appear only for the two WhatsApp options.

[Screenshot: wa-link] WhatsApp with a link: template check for English and Arabic.

[Screenshot: wa-chat] WhatsApp chat mode: reply buttons and lists per question.

[Screenshot: wa-sms] SMS: Meta rules do not apply.

| Check | Source |
|---|---|
| Variables numbered in order {{1}}, {{2}}; not at the start or end; not adjacent | Meta rule |
| Body up to 1,024 characters; no shortened links | Meta rule |
| Opt-in confirmed for the audience; marketing wording needs an opt-out | Meta rule |
| Category: Utility only when tied to a specific order, visit, case or task; otherwise Marketing | Meta rule (Meta decides and can recategorise) |
| Chat mode: reply buttons 3 options of 20 characters; lists 10 rows of 24 characters; 24-hour window after the customer replies | Meta rule |
| Too many questions in a chat; 0 to 10 scale has 11 choices; photo evidence is better in the portal | Our tip |

Arabic and English templates are approved separately. Launching by WhatsApp is blocked until both languages are approved (simulated in the demo). SMS and email are not blocked.

[Screenshot: eng-launch] Launch: blocked until the WhatsApp template is approved.

### What each user does

**What each user does**

- **CX manager / CX team:** Build surveys, define rules, run campaigns, submit templates to Meta.
- **Executive:** View only.
- **Customers:** Answer by link or chat.

### Where the data comes from

The audience and the responsible agent come from the CRM at send time. WhatsApp delivery needs the WhatsApp Business platform and approved templates; SMS needs a provider and registered sender name.

## 12. Mystery shopper (internal and external)

Plans, distributes, collects and reviews mystery shopping visits and calls.

### Structure: who works in the Mystery shopper programme

[Screenshot: fn-shopper] Structure of the Mystery shopper programme.

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| CX manager | Programme owner | Full control; sets checklists and standards links | Full |
| CX team | Programme operator | Creates tasks, distributes by channel, answers shopper questions, reviews submissions, imports filled forms | Full |
| Internal mystery shopper (PSI staff) | Shopper | Fills own tasks in the portal or WhatsApp, asks CX questions | Own tasks only |
| External mystery shopper (agency or individual) | Shopper | Same as internal; separate sign-in with email or mobile plus a code | Own tasks only |
| Executive | Reader | Views results | View only |

### Two people types, one process

Shoppers may be internal (PSI staff) or external (an agency or individuals). Both use the same entry: a separate sign-in with the email or mobile the task was sent to plus a one-time code. A shopper sees only their own tasks.

### Headquarters side (CX team)

[Screenshot: ms-results] Results and scores.

[Screenshot: ms-checklists] Checklists linked to the standards library.

[Screenshot: ms-shoppers] Shopper list (internal and external).

[Screenshot: ms-dist] Distribution: who, where, deadline, channel. WhatsApp readiness appears here when WhatsApp is chosen.

[Screenshot: ms-review] Review queue: CX checks each submission.

[Screenshot: ms-import] Import a filled form (Excel or CSV) when a shopper did not use the portal.

[Screenshot: ms-inbox] Shopper questions inbox: CX replies and the answer shows on the shopper screen.

### Shopper side

[Screenshot: sh-login] Shopper sign-in.

[Screenshot: sh-home] My tasks: survey type, target area, scenario, deadline, status.

[Screenshot: sh-task] A task: brief, form, consent and privacy rules, questions to CX.

Shoppers can fill in the portal or in WhatsApp. Submissions go to the same CX review queue. A critical fail opens a complaint case.

### What each user does

**What each user does**

- **CX team:** Create tasks, distribute, answer questions, review, import forms.
- **CX manager:** All of the above.
- **Mystery shopper:** Fill own tasks, ask CX questions.
- **Executive:** View results.

## 13. Call center and IVR (CX view)

What the CX team sees about the AI call center and the IVR. This page is for experience only, not for QA.

### Structure: who works with the call center view

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| CX manager and CX team | Owners of the CX view | Read the overview and IVR, turn IVR complaints into cases, review the suggestions log | Full |
| Environment management, After-Sales lead | Readers | View the call center dashboard for their scope | View only |
| Executive | Reader | Views the dashboard | View only |
| Call center vendor (BrightCall) | Data source | Provides calls and IVR journeys; the portal never changes anything there | Source only |

[Screenshot: cc-overview] Call center overview: calls answered, first call to a new lead, callbacks kept, handed to a person when asked, customer rating, why customers call.

[Screenshot: cc-ivr] IVR: suggestions, comments and complaints route differently.

- Complaints from the IVR create a case with a clock and an owner.
- Comments go to Voice of Customer.
- Suggestions go to a suggestions log reviewed monthly by CX.
- Speed to lead: for a new digital lead, the system rings the agent pool first; only when an agent picks up does it ring the customer. If no one picks up, a survey is not sent.
- Digital channels are rated only when a lead opens.

> The BrightCall dashboard is a view-only source. The portal never changes anything there.

## 14. Settings, monthly pack, suggestions log, glossary and audit trail

Supporting pages that make the portal usable day to day: where the CX manager changes settings, the management report, the log for ideas that are not complaints, the glossary, and who did what on a case.

### Structure: who works with these pages

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| CX manager (level 2) | Owner | Changes settings, reads and downloads the monthly pack, reviews the suggestions log | Full |
| CX team (level 1) | Operator | Reads settings (no changes), reads the pack, marks suggestions | Settings read only |
| Executive | Reader | Reads the monthly pack and the glossary | View only |
| Environment management and team lead | Reader | Read the glossary | View only |
| HR manager, heads and C-level | Informed only | Receive notices and the weekly digest by email. No portal pages for these roles | Notice only |

### Settings

One admin page with three tabs. Product launch switches PSI Club, Tour Estate and Events on or off; hidden products disappear from menus, cards and filters. HR pool lists the members (title, email, mobile) and the CX manager can add a member. Notices and digests choose which informed-only people receive which notice, and whether it is immediate or a digest. Environments, pools and agents are not edited here; they come from the CRM.

[Screenshot: x-settings] Settings: product launch.

[Screenshot: x-settings-hr] Settings: HR pool. The HR manager is informed only.

### Monthly CX pack

One page for the management meeting: cases, open, late and awaiting CX check; late cases by environment and by live product; the most common complaint types; what AI Insights found; and whether past preventive actions worked. Download as CSV. The executive can read it.

[Screenshot: x-report] Monthly CX pack (sample data).

### Suggestions log

Ideas from the IVR, surveys and staff that are not complaints. CX reviews them once a month and marks each as new, under review, adopted or not now. Nothing here has an SLA clock.

[Screenshot: x-suggest] Suggestions log.

### Glossary

Plain definitions of NPS, CSAT, MPS, detractor share, the clocks, working hours, case owner, assigned to, corrective action owner, informed only, proposed and preventive actions, environment and pool, speed to lead, and WhatsApp template categories.

[Screenshot: x-glossary] Glossary.

### Notices for informed-only people

Two email templates and a digest exist for people who have no task. Notice to heads and C-level: for information only, sent when a case is late or high priority. Late alert to the HR manager: the HR step is late, with no case access. A weekly digest goes to heads and C-level. All are switched on or off in Emails and reminders.

[Screenshot: x-notice] Notice template for informed-only people.

### Audit trail

Every line in a case timeline now records who did it (the role) as well as what and when: triage, fix submitted, manager decision on proposed actions, direct manager review of HR actions, close, reopen, send back.

### Demo walkthrough

The walkthrough now has two stories. Story 1 follows a complaint from the AI finding, through a PSI Club triage, the environment manager deciding on proposed actions, the HR route and the direct manager review, the informed-only HR manager, and the monthly pack. Story 2 covers After-Sales, surveys and the mystery shopper.

[Screenshot: x-guide] Demo walkthrough.

**What each user does**

- **CX manager:** Runs the walkthrough, changes settings, downloads the pack.
- **CX team:** Marks suggestions, reads the pack.
- **Executive:** Reads the pack.

### Where the data comes from

- Pack numbers are computed from cases, surveys, AI Insights and recorded fixes.
- Launch status and HR pool are set by the CX manager in the portal.
- Suggestions arrive from IVR feedback, survey comments and staff.

## 15. Standards library

Every checklist item and rule points to a numbered standard so there is one source of truth.

### Structure: who works with the Standards library

| Job title | Role in this function | What they do | Access |
|---|---|---|---|
| CX manager and CX team | Maintainers | Load documents, link checklist items and rules, set statuses | Full |
| Environment management, team lead, After-Sales lead | Readers | Read the standards behind a rule or checklist item | View only |
| Executive | Reader | Reads | View only |

[Screenshot: standards] Standards library.

Thirteen standards are listed with a status: awaiting document, confirm with Legal, or drafted by CX. When the HR, SLA, script and legal documents arrive they are loaded here and the linked items update.

**What each user does**

- **CX team and manager:** Maintain the library.
- **Environment management, team lead, After-Sales lead:** Read.

## 16. Data and integrations needed

What the live system must receive from other systems.

| Integration | Direction | What moves | Needed from |
|---|---|---|---|
| CRM | In | Customers, service (investment, rental, buying), unit status, deal and handover dates, environment, pool, team lead, responsible agent, other agents who took part | IT or CRM vendor: API or scheduled export |
| Phone system and AI call center | In (view only for BrightCall) | Calls, outcomes, recording links, IVR journeys | Call center vendor |
| WhatsApp Business platform | Out and in | Template messages, survey replies | Messaging provider, Meta-approved templates |
| SMS | Out | Survey links | SMS provider, registered sender name |
| Email | Out and in | Complaints and CX mail, replies added to the case timeline | IT: company mail or API |
| Product support tools | Both | Linked tickets, status back to the portal | Each product team |
| Directory (SSO) | In | Users and roles | IT |

### Fields the portal needs from the CRM on every record

- Environment, pool, team lead.
- Responsible agent (primary) and other agents who took part.
- Service: investment, rental, buying.
- Unit status, deal date, handover date, mobile, language.
- The agent is snapshotted when a survey or contact is sent.

### Core records

- Case: id, source, type, product, environment, priority, case owner, assigned to, corrective action owner, informed list, respond and resolve targets, proposed actions with decisions, root cause, preventive action, manager review state.
- Survey response: survey, version, answers, scores, agent snapshot, channel, completed time.
- Mystery shopper task: shopper, target, scenario, deadline, answers, review state.
- HR pool member: title, email, mobile.

> Recordings and full transcripts stay in the call system and are linked, not copied, until Legal confirms storage and consent rules. Customer numbers are masked in lists.

## 17. Rules decided so far

The working rules agreed with the CX manager, in one place.

- Portal scope is CX only; QA topics stay outside.
- Only live products are shown: Real Estate team (mobile app) and After-Sales. Club, Tour Estate and Events stay hidden until launch.
- Cases go to the concerned people, never to top management. Heads and C-level are informed only.
- PSI Club: manual assignment by CX to the sales agents pool; no Finance; C-level informed only; corrective action from direct management.
- CX writes proposed corrective actions at assignment; the owner confirms, modifies or rejects each.
- HR: CX assigns attitude and conduct cases to the HR pool directly; the agent's direct manager reviews HR's corrective actions; the HR manager is informed only (team report and late alert).
- Environments and pools are fixed in the CRM; the portal reads, never edits.
- The agent is recorded from the CRM when a survey is sent; drill-down runs metric, service, environment, pool, agent names.
- Digital channels are rated only when a lead opens; speed to lead rings the agent pool first, then the customer.
- Call timing complaints are one merged type.
- WhatsApp readiness applies to customer surveys and mystery shopper tasks, only when the channel is WhatsApp.
- The BrightCall dashboard is view only.

### Assumptions in this version

- AI suggested actions are approved by the CX manager before they become cases.
- Agent names are visible only to CX, environment management and team lead in their scope, and the HR specialist on their own cases.
- MPS stands for Mystery Shopper Score.
- HR internal notes are visible to the reviewing direct manager.
- Environment names and HR pool members are placeholders until supplied.
