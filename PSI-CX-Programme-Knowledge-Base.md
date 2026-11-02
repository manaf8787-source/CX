# PSI CX Programme: Project Knowledge Base

Owner: Manaf Obeidat, Delivery and CX Manager, PSI Real Estate (Amman)
Audience: the chairman's review, the CX team, and the developers who will build the real platform
Status: prototype with sample data, last updated 2 November 2026 (sections 24 to 27 added; the full module-by-module Knowledge Base with structure, authority matrix and screenshots is `claude/PSI-CX-Portal-Knowledge-Base-Modules.md`)

Everything in this document is either something Manaf decided or said, or something Claude proposed and built into the prototype. Anything proposed but not yet confirmed is marked **[Proposed]** or listed in the open questions at the end.

---

## 1. What the project is

PSI wants a Customer Experience (CX) programme for its UAE business. Its first goal was to measure how well the sales team, and the other teams that handle a new lead, perform in a simulated lead (the **mystery shopper** programme). It has grown into one platform, the **CX Portal**, that covers:

- **Mystery shopper**: digital, AI call center, branch visits, app users, and events.
- **Voice of Customer (VoC)**: surveys and feedback from every channel, with NPS and CSAT.
- **Five product spaces**: PSI Real Estate, After-Sales, PSI Club, Tour Estate, PSI Events.
- **Survey engine**: campaigns, batches, branching questions, and a choice of delivery channel.
- **AI call center evaluation**: an AI agent makes calls, a second AI evaluates them.
- **Incidents and SLAs**: complaints with owners, working-hours clocks and escalation.
- **Standards library**: the documents the checklists and rules are measured against.

The current deliverable is a clickable prototype for the chairman's approval. It uses sample data and sends nothing.

### Decisions made so far

| Topic | Decision |
|---|---|
| Business | PSI Real Estate, UAE |
| Languages | Bilingual English and Arabic, with right-to-left layout |
| First build | A clickable prototype with sample data, not a working system |
| Demo audience | The chairman (referred to as "Omar") |
| Access | No passwords in the prototype; a landing page with one entry per team |
| Working hours for SLAs | Monday to Friday, 09:00 to 18:00 |
| Email | Two mailboxes: CX Team and CX Complaints |
| Survey reference platform | The user pointed to Ipsos as the reference for the "Opus"-style survey platform |

---

## 2. Links and files

| Item | Where |
|---|---|
| CX Portal prototype (private, shared with specific people) | https://claude.ai/artifact/Y27QrDZiBLL5jJMb5bw2VB |
| UAE visit checklist (Claude doc) | https://claude.ai/artifact/W5626QwaEBbuCaLAsUPNXK |
| This file | `PSI-CX-Programme-Knowledge-Base.md` |

The portal link is private. It must be shared from the page's Share menu before the chairman or anyone else can open it.

---

## 3. Background and requirements, in the order they arrived

1. **Mystery shopper scope.** Measure the capability of the sales team and other teams when they handle a simulated new lead. Channels in scope: digital (WhatsApp, web form, social). Deliverables requested: reporting template, shopper briefing guide, scoring checklists, scenario library.
2. **HR input.** Manaf will get procedures from the HR team and the checklists will depend on them.
3. **AI agent evaluation.** PSI has an AI agent that handles leads. The platform must evaluate both the customer experience and the AI agent. It must also check things like calling customers at the wrong times, follow-up SLAs and escalation.
4. **Feedback from QR codes and surveys** across channels, including branch visits (a QR rating channel was to be created if none existed).
5. **Tour Estate app.** The portal also collects notes and surveys from the Tour Estate app. There are two kinds of survey.
6. **PSI Club.** Agents are evaluated by the lead and by the VIP member who nominated that lead.
7. **Opus-style platform structure.** A hierarchy of: portal, mystery shopper, survey engine, campaigns, batches, responsive surveys where the next question depends on the current answer, AI call center module, and delivery by AI call center, WhatsApp or SMS.
8. **Two new products.** PSI Events and After-Sales (a team that calls customers after the transaction and evaluates the agent and the developer).
9. **Demo quality.** The first demo was "missing colours, not tight or organised". It was rebuilt with a product colour system and richer sample data.
10. **Mystery shopper build.** Build checklists, distribute them to many email addresses or mobile numbers (internal or external shoppers), collect evidence (photos from branches, audio, screenshots for digital channels), and let a reviewer check accuracy. It had to be "very mature".
11. **After-Sales refinement.** Customers may not have a finished unit, so a finishing question is unfair. Three versions were agreed: ready, under development (off-plan), rental.
12. **Incidents.** Complaints must be reachable from a detail screen, with owners, SLAs, escalation, recipients, emails and reminders, drafted by Claude for the demo.
13. **Call center.** The AI call center and its AI evaluator needed their own place in the portal.

---

## 4. The portal at a glance

### 4.1 Entries (landing page, no password)

| Entry | Sees |
|---|---|
| CX team | Everything: all products, mystery shopper, survey engine, AI call center, incidents and settings, demo walkthrough, build specification |
| PSI Real Estate team | Real Estate page, AI call center, Voice of Customer, incidents for that product |
| After-Sales agent | Only the call queue and call screen |
| After-Sales team lead | Team queue, reminder settings, After-Sales results, AI call center, incidents, Voice of Customer |
| PSI Club team | Club page, Voice of Customer, incidents |
| Tour Estate team | Tour Estate page, Voice of Customer, incidents |
| PSI Events team | Events page, Voice of Customer, incidents |

In the real platform each entry would be a sign-in giving the same view. The entries in the prototype are only a switch.

### 4.2 Navigation (CX team entry)

- **Measure:** Overview, Mystery Shopper, Voice of Customer, AI Call Center, Survey Engine, Incidents and SLAs.
- **Products:** PSI Real Estate, After-Sales, After-Sales Desk, PSI Club, Tour Estate, PSI Events.
- **Reference:** Standards Library.
- **Demo and build:** Demo walkthrough (six steps telling the After-Sales story), Build specification (for the developer).

### 4.3 Design notes

- Single self-contained page, bilingual, English and Arabic with right-to-left layout.
- A colour per product: Real Estate teal, After-Sales blue, Club amber, Tour Estate purple, Events pink. Dark navy side menu.
- NPS is shown as promoters minus detractors, with CSAT as a percentage.
- All figures are sample data. A banner on every page says so.

---

## 5. Products

| Product | What it is | What is measured |
|---|---|---|
| PSI Real Estate | Sales of units, through digital, AI call center, branch gallery and app channels | Lead handling, agent scorecards, shop score, NPS and CSAT by channel |
| After-Sales | A team that calls customers after the transaction | Agent and developer evaluation; three survey versions (section 8) |
| PSI Club | VIP members nominate leads | Lead experience survey and member (VIP) survey about the agent |
| Tour Estate | Tours with guides, drivers and cars | Trip review, stop or activity review, incidents handled by its own support team |
| PSI Events | Events and launches | Post-event review, registration, content, follow-up |

The product pages show NPS, CSAT, a product-by-channel heat map, agent scorecards where relevant, and the surveys for that product.

---

## 6. Mystery shopper

**Tabs:** Results, Checklists, Shoppers, Distribution, Review.

- **Checklists.** CX builds checklists with sections and items. Item types are pass or fail, a 1 to 5 scale, or free text. Each item has a weight, can be marked critical, and can require or allow evidence (photo, audio, screenshot). A checklist can be previewed as the shopper sees it, then published. Six sample checklists exist; events and after-sales are drafts.
- **Shoppers.** A roster of internal and external shoppers. A bulk-add box accepts pasted emails and mobile numbers, one per line ("Name, email" also works). Mobile numbers starting 05 become +971 numbers. Invalid and duplicate lines are reported, never added silently. A CSV upload is supported.
- **Distribution.** Send a published checklist and a scenario to selected shoppers by email, WhatsApp or SMS, with a private link per shopper, due date, expiry, reminder and a message template. Nothing is really sent in the prototype.
- **Evidence.** Shoppers attach photos, audio or screenshots per item. The system checks that required evidence is present, that timestamps fall inside the visit window, that no photo is a duplicate, and that a link is used only once.
- **Review.** A reviewer accepts, queries or voids each item, sees a weighted score with critical-fail logic, and approves, returns or rejects the submission. Approved scores flow into the results.

---

## 7. Survey engine

- **Campaigns** contain **batches**. Each batch has an audience, a size, a survey, and a delivery channel (AI call center, team call, WhatsApp, SMS), and a status (draft, scheduled, running).
- Example for Real Estate: Batch A (customers who purchased) gets an NPS survey; Batch B (customers who did not continue) gets an exit survey that asks the reason.
- **Branching.** The first matching rule wins, then the question's "next", then the next question in order. A preview shows the path taken.
- **Question types:** NPS 0 to 10, rating 1 to 5, single choice, yes or no, open text. Questions can be tagged to the entity they are about (agent, developer, guide, driver, venue and so on).
- **Builder** edits questions, answers, rules and order, and previews the survey as a customer would see it.

### Surveys in the prototype

| Survey | Product |
|---|---|
| NPS for customers who purchased | Real Estate |
| Exit survey for customers who did not continue | Real Estate |
| After-Sales: ready unit, off-plan, rental | After-Sales |
| PSI Club: lead experience; member (VIP) experience | Club |
| Tour Estate: overall trip review; stop or activity review | Tour Estate |
| PSI Events: post-event review | Events |

---

## 8. After-Sales

### 8.1 Three versions, one family

Customers may not have received a finished unit, so the survey version follows the **unit status from the CRM**, not a question to the customer. If the status is missing, the survey starts with one routing question.

| Version | Use for | Typical questions |
|---|---|---|
| Ready (handed over) | Units delivered | Handover on time, build quality and finishing, snagging handling |
| Under development (off-plan) | Units still being built | Construction updates, payment plan clarity, who to contact, confidence in on-time delivery |
| Rental | Rented units | Leasing process, move-in condition, maintenance handling, renewal intent |

Every version keeps the same core (agent professionalism and clarity, NPS and its reason, repeat investment or referral), so results are comparable. The questions are **placeholders** until the After-Sales team's real call script is confirmed.

### 8.2 How the After-Sales team works (the Desk)

1. **CRM sync.** The CRM sends new handovers, paid milestones and lease starts. Rules decide the wait before a customer is queued: [Proposed] 7 days after handover, 1 day after a paid milestone, 30 days after a lease starts. Customers are shared between agents and receive the right survey version. A paste or upload list is a fallback for batches that do not come from the CRM.
2. **Email reminder.** Each agent gets their call list every morning from the CX Team mailbox, plus an overdue alert to the lead and a weekly summary to the manager.
3. **Call queue.** Each agent sees only their own list, with retries and call-backs. The lead sees the whole team.
4. **Call screen.** Customer details are already filled in. The agent records whether the customer was reached. If not (no answer, busy, call back later, wrong number, declined), the system schedules the retry: up to three tries, next try tomorrow. If reached, the agent works through the survey with branching, adds notes and saves.
5. **Incident rules.** When a survey is saved, rules run. A match creates an incident with an owner and clock (section 11).
6. **Results.** Scores feed the After-Sales dashboard: agent scorecard, developer scorecard, calls by journey stage.

Calling hours (09:00 to 20:00 assumed), retry limits and consent rules are placeholders to confirm with Legal.

---

## 9. AI call center

PSI has an **AI agent that makes calls** and a **second AI, the evaluator**, that scores every call.

- **Flow:** calling AI, then evaluator AI scores every call on 8 criteria, then a person reviews about 1 in 10 calls, then results and incidents appear in the portal.
- **Tabs:** Overview, Evaluated calls, Scoring rubric, Evaluator accuracy.
- **Rubric [Proposed], v1.0:** 8 criteria with weights. Four are critical (a critical score below 40 caps the call at 59):

| Criterion | Weight | Critical |
|---|---|---|
| Greets and discloses it is an AI assistant | 10% | Yes |
| Calls at an allowed time, or at the time the customer asked | 15% | Yes |
| Understands what the customer needs | 15% | No |
| Gives accurate prices, dates and project facts | 20% | Yes |
| Matches the customer's language and keeps a polite tone | 10% | No |
| Handles questions and objections | 10% | No |
| Hands over to a human when asked or out of depth | 10% | Yes |
| Confirms a next step and keeps the commitment | 10% | No |

- **Call detail:** score per criterion, a transcript excerpt with the evaluator's notes, and review buttons (agree, score is wrong, raise an incident). Recordings and full transcripts stay in the call system and are only linked.
- **Evaluator accuracy:** agreement with human reviewers, by criterion (about 91% in the sample), with a warning if it falls below 85%.
- **Timing and follow-up** metrics: time to call a new lead, callbacks kept on time, calls outside allowed hours, handover to a human when asked.

---

## 10. Voice of Customer and the overview

- **Overview:** NPS, CSAT, number of responses, shop score, open incidents, monthly NPS trend by product, NPS by channel, a product-by-channel heat map, detractor reasons, a product comparison table, alerts and the shopper pipeline.
- **Voice of Customer:** the same measures across channels (digital, AI call center, branch visits, app users, events) with the surveys per product.
- **Branch channel:** a QR code rating channel was proposed because none exists. Until it is live, the channel shows "no data yet".

---

## 11. Incidents and SLAs

### 11.1 Where incidents come from

| Source | How it arises |
|---|---|
| Survey rule | A survey answer matches a rule (for example, snagging rated 2 or lower) |
| AI call evaluation | The evaluator flags a breach (wrong time, no AI disclosure, wrong fact, no handover, late callback) |
| Mystery shopper | A critical fail or a failed item |
| Reported by staff | Anyone, including an After-Sales agent, uses "Report an issue" |
| Customer ticket (linked) | A ticket raised in a product app, linked read-only so it is never handled twice |

Tickets customers raise in a product's own app or support tool stay in that tool and are worked by the product's support team. The portal tracks the SLA and links to them. **CX-detected** incidents are the ones the portal creates itself.

### 11.2 The detail panel

Clicking any incident opens a panel beside the list with the respond clock and resolve clock, the escalation ladder with recipients and times, owner and backup, origin, a timeline including emails sent, and actions: record first response, pause while waiting on the customer, start work, escalate now, comment, resolve with a note, reopen. The list defaults to "Needs attention", worst clock first, with filters for breached, open, waiting, resolved, product and priority.

### 11.3 Working hours and clocks

- Clocks count **Monday to Friday, 09:00 to 18:00** only (9 working hours make one working day). Holidays and the working days are editable.
- Each incident has two clocks: **respond** (time to first reply) and **resolve** (time to fix). The clock pauses while waiting on the customer.
- A clock is "at risk" when under 25% of its time is left.

### 11.4 Complaint types and SLAs [Proposed defaults for the demo]

27 complaint types are drafted across all products. Targets are in working hours. Examples for After-Sales:

| Complaint type | Priority | Owner | Respond | Resolve |
|---|---|---|---|---|
| Handover date missed | High | After-Sales lead | 4h | 3 days |
| Snagging not handled | High | After-Sales lead | 4h | 7 days |
| Finishing quality | Medium | Developer liaison | 9h | 14 days |
| Payment or statement dispute | High | Finance contact | 4h | 3 days |
| Construction updates unclear (off-plan) | Medium | Account manager | 9h | 7 days |
| Maintenance not handled (rental) | High | Maintenance lead | 4h | 2 days |
| Agent conduct | High | After-Sales lead | 9h | 5 days |
| Detractor follow-up | Medium | After-Sales lead | 18h | 7 days |

Other types cover Real Estate (unapproved discount, wrong language, gallery not staffed), Club (no update on a nominated lead, do-not-call), Tour Estate (vehicle, guide or stop), Events (check-in queue, late follow-up), the AI call center (called at wrong hours, no AI disclosure, wrong fact, no handover, late callback), and Other. Editing any target updates every clock immediately.

### 11.5 Routing and escalation ladder

Each type has an owner, backup, manager and department head. All names in the prototype are samples. The same ladder applies to every type:

| Step | When | Notified |
|---|---|---|
| Start | Incident created | Owner |
| Reminder | 50% of resolve time used | Owner |
| Warning | 80% used | Owner and backup |
| Breach | 100% used | Owner, backup and manager |
| Still open | 9 working hours (one day) after breach | Adds the department head |

Manual escalation is always available. The percentages are editable.

### 11.6 Emails and reminders (two mailboxes)

| Mailbox | Address (placeholder) | Purpose |
|---|---|---|
| CX Team | cx@psi.example | Routine: daily call lists, weekly CX summary, survey invitations, mystery shopper tasks and reminders |
| CX Complaints | cx-complaints@psi.example | Problems and deadlines: assignment, 50% reminder, 80% warning, breach, head-level escalation, response missed, resolved with customer confirmation |

Each message type has an on or off switch and an editable template with placeholders ({id}, {title}, {product}, {priority}, {ref}, {owner}, {backup}, {manager}, {head}, {respond_due}, {resolve_due}, {link}, {resolution}) and a live preview. Sending rules: hold mail outside working hours until 09:00, still send breach and head-level escalations immediately, and add replies to a complaint email to the incident timeline.

---

## 12. Standards library

Every checklist item and rule points to a numbered standard. When the HR, SLA, script and legal documents arrive, they are loaded here and the linked items update. Thirteen standards are listed, with statuses: awaiting document, confirm with Legal, or drafted by CX. The UAE visit checklist links here.

---

## 13. From prototype to real platform (what developers need)

### 13.1 What the prototype is

A front end with sample data. It has no server and no database. Nothing is sent, and the CRM connection, emails and calls are simulated. Making it real needs a small back end with a database, an ingestion endpoint that validates and stores records, and sign-in with roles.

### 13.2 Roles and permissions

| Capability | CX admin | After-Sales lead | After-Sales agent | Product teams |
|---|---|---|---|---|
| Build surveys, rules, campaigns | Full | None | None | None |
| CRM sync and reminder settings | Full | View | None | None |
| Complaint types, SLAs, routing, mailboxes | Full | None | None | None |
| Team queue and reassigning calls | Full | Full | None | None |
| Own call queue and survey filling | None | Limited | Full | None |
| Results, scorecards, incidents | Full | After-Sales | Own calls | Own product |
| Report an issue | Yes | Yes | Yes | Yes |
| Mystery shopper and standards | Full | None | None | None |

### 13.3 Integrations

| Integration | Direction | What moves | Needed from |
|---|---|---|---|
| CRM | In | Customers, unit status, handover date, milestones, lease dates, original sales agent | IT or the CRM vendor: API or scheduled export |
| Email service | Out | Call lists, alerts, summaries, complaint emails; replies in | IT: company mail account or a mail API |
| Phone system and AI call center | Both | Click-to-call, outcomes, recording links, QA scores | Call center vendor |
| WhatsApp and SMS | Out and in | Survey links and replies | Messaging provider and approved templates |
| Support tools per product | Both | Incident hand-off, status and resolution back to the portal | Each product's support team (Jira service desk was suggested) |
| Sign-in (SSO) | In | Users and roles | IT: company directory |

**Three ways to connect call center data**, from fastest to most mature: a scheduled file import (CSV or Excel), an API or webhook push (preferred long-term), or a direct database or warehouse read.

### 13.4 Core records

- **Customer or unit:** customer_id, name, mobile, language, project, unit, unit_status (ready, off-plan, rental), handover_date, milestone, lease_start, sales_agent.
- **Queue item:** queue_id, customer_id, survey_id, assigned_agent, due_date, tries (max 3), status, next_try.
- **Survey response:** response_id, survey_id, version, answers, nps, csat, notes, agent, call_outcome, recording_url, completed_at.
- **Incident:** incident_id, source, rule_id or type, product, priority, owner_team, respond and resolve targets, opened_at, first_response_at, status, paused time, linked_ticket_id, resolved_at, resolution note.
- **Complaint type:** type_id, product, priority, respond hours, resolve hours, owner, backup, manager, head.
- **Rule:** rule_id, survey_id, question_id, condition, complaint type.
- **Reminder or email:** type, mailbox, schedule, recipients, template, last_sent_at.
- **AI call evaluation:** call_id, product, outcome, score per criterion, flags, human review status.

### 13.5 Data and privacy notes

Recordings and full transcripts should stay in the call system and be linked, not copied, until Legal confirms storage and consent rules. Customer numbers are masked in the call list.

---

## 14. Open questions and decisions needed

1. Who owns and escalates After-Sales issues, and what are the real SLA targets per priority? (Prototype values are drafts.)
2. Which CRM and phone system are used, and do they expose an API or webhooks?
3. Calling hours, consent, recording and retry limits (Legal). 09:00 to 20:00 and three tries are placeholders.
4. What After-Sales actually measures in its real call script, which replaces the placeholder questions.
5. Whether customer tickets from product apps should appear read-only in the portal.
6. Where recordings and customer data may be stored (data residency).
7. The real complaint list, owner names and escalation recipients.
8. Is the "AI call center" the agent that calls customers and leads (assumed), or a separate system that receives calls?
9. The real mailboxes and how mail is sent (portal or company mail).
10. The PSI Club, Tour Estate and Events survey content, and what each product team should see.
11. Whether holidays and the Friday half day need special handling in the working-hours rule.

---

## 15. Deliverables from the kickoff still to do

- Shopper briefing guide.
- Reporting template.
- Scenario library as documents (an in-portal scenario library exists).
- Standards documents from HR, SLA, scripts and Legal (waiting on those teams).
- Voice of Customer section review (the next section to explore).

---

## 16. How we are working

The agreed approach is to explore the portal section by section so each section complements the others. After-Sales surveys and the Incidents and SLAs module are done in prototype form. Voice of Customer is next. Claude drafts content (owners, SLA values, templates) for the demo, and Manaf replaces it with real data after the chairman's approval.

## 17. Call center IVR and AI call evaluation (added 28 Oct 2026)

**IVR feedback channels.** The real call center IVR has three feedback channels: suggestions, comments and complaints. In the portal (AI Call Center > IVR) they route differently: complaints create an incident with an SLA clock and owner, comments go to Voice of Customer, suggestions go to a suggestions log reviewed monthly by CX.

**What was seen on the live BrightCall AI dashboard (view only, nothing changed).** It is an AI outbound dialer (campaign projects per development) plus an inbound Customer Service IVR. IVR menu seen: language (1 English, 2 Arabic), then 1 Real Estate (looking for a property: buy or rent, Abu Dhabi or Dubai; own a property), 2 HR (career opportunity, others), 3 Feedback. About 26% of IVR journeys were incomplete (mostly connection lost). Follow-up Done was 64.8%. The place where suggestion, comment and complaint are split was NOT found; the portal assumes it sits under Feedback. To confirm with the call center. The per-call analysis for the sampled call showed no score, model "rule-based", no transcript, and the 7-day QA flags panel was empty.

**Current evaluation scope (as told by Manaf).** Only successful calls are evaluated: calls answered by the customer, not calls going out to a lead, and only calls longer than 3 minutes. Accuracy is about 60% today, target 80%. What the 60% measures (agreement with a human reviewer or a pass rate) is not yet confirmed. The portal's Scope and accuracy tab shows the coverage gap and a five-step plan; its percentages are sample values.

**Open items.** Real QA criteria from the vendor. Real call split by duration and answered status. Where the three IVR channels are separated. Replace the sample rubric in the portal with the real one.

## 18. Scope rule: CX only, not QA (decided 28 Oct 2026)

The portal is CX only. Call QA (agent compliance scoring, evaluator accuracy 60% to 80%, persona and knowledge of the AI agent, cost per call, BrightCall and WhatsApp controls, system status) is a separate topic and is not in this portal. Order of work agreed: first decide which data to reflect from the call center dashboard, then the mechanism, then the 80% accuracy target, then the persona.

**Complaints handling module.** Rule: anything that hurts the customer experience belongs here, however it was found (customer complaint, survey, mystery shopper, call monitoring). Examples that ARE in scope: a call to a customer at night or outside allowed hours, wrong information given, a discount promised without approval, customer not told they spoke to an AI, a callback later than promised, a customer who asked for a person and did not get one. Out of scope: scoring staff on a rubric (QA) and system faults. Correction on 28 Oct: an earlier version wrongly removed some of these as QA; Manaf corrected it and they were restored.

**Call Center page (CX).** Tabs: Overview (calls answered, first call to a new lead, callbacks kept, handed to a person when asked, customer rating, why customers call, tone, by product) and IVR (three channels: suggestions, comments, complaints, routed to the suggestions log, Voice of Customer and incidents). The earlier QA tabs were removed from the portal. Figures are samples.

## 19. Complaint workflow and measuring impact (built 28 Oct 2026)

**Roles.** CX team is the case owner: triages, follows up, verifies and closes. The department owner (sales, HR, IT, After-Sales and others, from the routing table) is the action owner: responds, finds the root cause, fixes it, proposes the preventive action. The owner cannot close a case; only CX closes it.

**Six steps.** 1 Opened. 2 CX triage (confirm it is CX, confirm type, pick action owner and case owner; the respond clock is already running, so triage counts inside it). 3 Owner responds (stops the respond clock). 4 Owner fixes and records: root cause category (people, process, system, information, third party, customer expectation), root cause explanation, corrective action, preventive action with owner, due date and expected effect. Submitting stops the resolve clock. 5 CX verifies three checks: root cause clear, action really done, customer told and satisfied; or sends it back with a reason. 6 Closed. CX can reopen if the customer is not satisfied.

**Closing rules (editable in Complaint types and SLAs).** Root cause category, explanation and corrective action are required to submit. A preventive action is required for high priority cases, or when the same type happens 3 times within 30 days (defaults). Otherwise "not needed" needs a written reason.

**Measuring impact (Action effectiveness tab, sample data).** Each preventive action records type, date and expected effect. Reading: complaints of that type per 100 customers, before versus after, plus reopened cases and customer satisfaction after the fix. Rules used: under two months of data is too early; a drop of a quarter or more is working; a rise or a drop under 10% is not working; in between is unclear. A before and after comparison is a signal, not proof. Real analysis needs two to three months of closed cases.

## 20. WhatsApp surveys and Meta templates (28 Oct 2026)

Business-started WhatsApp messages need a Meta-approved template. Per Meta, a feedback survey can be Utility only when it relates to a specific order, transaction or interaction; a generic survey request is not approved as Utility, and anything promotional is Marketing. Meta can recategorize a template. Surveys built in the portal must therefore be written as a template (fixed text, numbered variables, up to a limited set of buttons) plus a conversation flow that runs after the customer replies. The official business badge is optional and separate from Meta Business Verification; messages can be sent without it.

## 21. Routing by environment, related product and source (built 28 Oct 2026)

**Environments.** Teams under the PSI umbrella with their own staff, for example Dubai, Abu Dhabi and PSI Assets (rental). Environment names in the demo are placeholders to be confirmed. Each complaint type has an option "By environment": when on, each environment has its own owner, backup, manager and head; when off ("Same for all"), one set of people applies everywhere. Demo defaults: on for After-Sales, Real Estate and the call-center types; off for PSI Club, Tour Estate and PSI Events. This is editable per type in Routing and escalation.

**Related product and source.** The call center is unified and not tied to one product or environment, so every case carries: related product (editable at triage), environment (required at triage when the type is routed by environment), channel it came from (call center, WhatsApp or web, branch or gallery, app, event), detection source (survey rule, call center monitoring, mystery shopper, staff report, linked ticket) and the reference, with an "Open the call in the CRM" link for call-center cases (not connected in the demo). Triage changes the product, type and environment and the default action owner updates to match.

## 22. Mystery shopper entry and form import (built 28 Oct 2026)

**Shopper entry.** A seventh entry on the landing page: "Mystery shoppers". Sign in with the email or mobile the task was sent to plus a one-time code (demo: any code). The shopper sees only their own tasks: survey type, checklist, target area (branch or gallery, call center, WhatsApp line, app, event), target customer (the scenario), product, sent date and channel, deadline with days left or overdue, status, draft progress, and any note returned by CX. A task page shows the brief (scenario, what is checked, how to do it, consent and privacy rules), the form, and a questions box to CX with the replies. Two ways to fill: in the portal, or in WhatsApp; with the WhatsApp integration the answers appear in the same form for the shopper to check before sending. Submissions go to the same CX review queue.

**CX side (Mystery Shopper page).** New tab "Shopper questions": CX replies and the answer shows on the shopper screen. New tab "Import a filled form": choose the task, download a CSV template, or upload what the shopper filled (Excel .xlsx or CSV); answers are matched to the checklist by item ID or text, invalid values and unknown questions are flagged, blank items are counted, and the import lands in the review queue. In the live system, PDF, Word or a photo of a form can be read by AI and checked by CX before import.

## 23. WhatsApp readiness check and call-timing type (built 28 Oct 2026)

**Delivery channel card.** Shown in the Survey builder (per survey) and in Mystery Shopper distribution when WhatsApp is ticked. Options: WhatsApp message with a link to the portal, WhatsApp conversation with the questions inside the chat, SMS with a link, email with a link. Meta rules and the template check appear only for the two WhatsApp options. For SMS and email the page says Meta rules do not apply; SMS sender name registration depends on the SMS provider and UAE rules, to be confirmed with them.

**Template check (WhatsApp options only).** English and Arabic bodies edited side by side with a message preview. Each check is tagged "Meta rule" or "Our tip". Meta rules checked: variables numbered in order {{1}}, {{2}}; message cannot start or end with a variable; no two variables adjacent; body up to 1,024 characters; no shortened links; too many variables for the text length; opt-in confirmed for the audience; marketing wording needs an opt-out. Expected category: Utility only when tied to a specific order, visit, case or task; a general survey or promotional wording gives Marketing. Meta decides the final category and approval and can recategorise, so the final template is checked in WhatsApp Manager. Arabic and English are approved separately.

**Chat mode.** The template opens the conversation; after the customer replies, questions can be asked for 24 hours. Per question: reply buttons hold 3 options (20 characters each), lists hold 10 rows (24 characters each). A 0 to 10 NPS scale has 11 choices and gets a warning. Required evidence (photos) is better collected in the portal. More than 8 questions in a chat is flagged as our tip.

**Status and launch gate.** Per language: draft, sent to Meta, approved (approval is simulated in the demo). Launching a batch by WhatsApp is blocked until both languages are approved. SMS and email are not blocked.

**Complaint types.** "Customer called outside allowed hours" and "Callback later than promised" are merged into one type: "Call timing: outside allowed hours or later than promised". High priority, respond 4 working hours, resolve 27. Open question: whether a late callback deserves a lower priority than an out-of-hours call.

## 24. Structure and authority (decided 29 Oct to 1 Nov 2026)

The full structure per function, the authority matrix for 12 roles and the screenshots are in `PSI-CX-Portal-Knowledge-Base-Modules.md` (also as a Word document). Summary of the decisions:

- **Two CX levels.** CX manager (level 2) approves AI suggested actions and rejected or modified corrective actions and manages SLAs, routing, HR pool and launch status. CX team (level 1) works the cases: triage, assign by hand, write proposed corrective actions, verify, close.
- **Titles, not names.** Cases are assigned to the concerned people, never to top management. Heads and C-level are informed only (a notice, no task). Corrective actions come from direct management.
- **PSI Club.** Finance is not involved. C-level is informed only. CX assigns manually, case by case, to the sales agents pool of the environment.
- **CRM-fed pools.** Environments, agent pools and team leads are fixed in the CRM; the portal reads them and never edits them. The responsible agent is recorded from the CRM and snapshotted when a survey is sent. Drill-down runs metric, service, environment, pool, agent names.
- **Proposed corrective actions.** CX writes numbered proposed actions at assignment. The owner confirms, modifies or rejects each one. A case cannot close while an action is undecided; modified or rejected actions need CX manager approval.
- **HR route.** CX can assign attitude and conduct cases directly to a dynamic HR pool (members and contacts come after the meeting with HR management). The agent's direct manager reviews HR's corrective actions. The HR manager is informed only: team numbers and a late alert, no case access.
- **AI Insights.** Suggested corrective actions from past incidents: category, similar cases and success rate, environment and time-band hotspots, CRM agent drill-down, filters (CSAT, MPS, product or channel, service), triggers such as a very high detractor share. The CX manager approves before a suggestion becomes a case.

## 25. Scope update: live products only (1 Nov 2026)

Only live products are shown in the portal: the PSI Real Estate team (PSI mobile app) and After-Sales. PSI Club, Tour Estate and Events are built but hidden until launch. Digital channels are rated only when a lead opens. For speed to lead, the system rings the agent pool first and rings the customer only when an agent picks up.

## 26. Where structure lives (2 Nov 2026)

Structure is documented only in the Knowledge Base document. The portal no longer has a "Structure and access" page; the role entries and permissions still work as described in the authority matrix. Current files: portal prototype v17 (https://claude.ai/artifact/Y27QrDZiBLL5jJMb5bw2VB), illustrated web Knowledge Base (https://claude.ai/artifact/HC1HiYCMF7kCXtxh8BToWy), and the Word document delivered in chat.

## 27. Round 3 additions (2 Nov 2026)

Built in the prototype (v19) and described in `PSI-CX-Portal-Knowledge-Base-Modules.md`: a Settings page (product launch, HR pool, notices and digests; changed by the CX manager only), a Monthly CX pack with CSV download, a Suggestions log for ideas that are not complaints, a Glossary, a role on every timeline line (audit trail), two email templates and a weekly digest for informed-only people, an honest "no data yet" state for AI Insights, and a rewritten Demo walkthrough (two stories) and Build specification (full authority matrix and the new records). A pilot plan for management is in `PSI-CX-Portal-Pilot-Plan.docx`: eight weeks, one environment (proposed Dubai) and the two live products.
