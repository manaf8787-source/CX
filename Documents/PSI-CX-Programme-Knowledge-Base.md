# PSI CX Programme: Project Knowledge Base

Owner: Manaf Obeidat, Delivery and CX Manager, PSI Real Estate (Amman)
Audience: the chairman's review, the CX team, and the developers who will build the real platform
Status: prototype v42.2 with sample data, last updated 19 November 2026 (sections 28 to 47: the omnichannel rebuild, the rules layer and the intelligent CX team; the module-by-module Knowledge Base with screenshots is `PSI-CX-Portal-Knowledge-Base-Modules.md` and the illustrated Word and PDF document)

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

## 28. New design, structure and standards register (6 Nov 2026, v24)

Logo option A (an open door under a roofline) chosen; placeholder colours navy #12385B and gold #C8963E until PSI's brand hex codes, fonts and logo files arrive. Menu regrouped (Overview, Customer voice, Mystery shopper, Cases and insights, Channels, Products, Organisation, Reference). A Teams and structure page inside the portal (titles, not names) with tabs by function, the authority matrix, routing and what the CRM provides. A **standards register** of 26 standards (M-01 to M-26) with statuses observe only, draft standard, approved and scored; items under a non-approved standard are recorded, not scored. **Wave 1 of the mystery shopper is a baseline**: shoppers observe, standards are set from the exercise; two rules scored from day one (no information or promise outside the approved sheets, no contact outside official channels). Two scenario types: a short walk-in with no lead, and a long full journey with a lead and 14 days of follow-up through digital channels and calls. Meeting room and privacy items added. Distribution ties a checklist to its scenario and requires a branch or gallery. OD (later renamed L&D) role and dashboard: OD complaint types, OD requests on cases, training materials and plan, OD-owned standards edited by OD and approved for scoring by the CX manager.

## 29. AI percentages explained, AI Insights per role (6 Nov 2026, v25 to v28)

The CX manager asked what "71%" on an AI suggestion meant. Every suggested action now reads in full: "tried in 14 similar closed cases, the customer recovered in 10, 10 of 14 is 71%", with a bar and a small-sample warning under 10 cases, and a panel "How to read these percentages" (what similar means, what recovered means, two limits, how the headline concentration figure differs). "Send to a case" lists only open cases in the same category. A mobile app complaint type was added. AI Insights opened to every role within its authority and specialty (OD: communication, knowledge, attitude; HR: attitude; environment management: its own environment; executives: read only), with an **AI Insights access** matrix the CX manager edits. No product owner or product manager user in the portal (removed at Manaf's request). More demo data: one pattern per category and environment, grouped by category, team or environment.

## 30. Signals and corrective actions replace cases (6 Nov 2026, v29 to v31)

**Decision.** The portal reflects only the common incidents (signals) from all channels and suggests corrective actions; it does not correct single cases. Individual cases stay in each product's own escalation matrix (the PSI Club matrix was read from the 2 November Knowledge Base: five of its six rows are handled entirely there; the sixth, sales assignment and first contact, was the case arriving twice) to avoid one case arriving through two channels. Only the mystery shopper creates a case immediately, and correction is avoided unless the case is critical. Built: a Signals page (every complaint, low score, breach and rating as a counted signal, from every channel including the Club breach log), patterns over thresholds (same agent 3 times, same issue 5 times, more than 50% from one environment, within 30 days; editable by the CX manager), a corrective actions register (Proposed → Approved and assigned by the CX manager → In progress → 30-day check → Effective or Not effective), hand-offs for one-customer corrections another system owns (do-not-call to the CRM, detractor recovery calls, PSI Club member recovery to agree with Abu Omar), shopper-only cases, and one set of numbers across Signals, Overview, Monthly pack and AI Insights. Every corrective action and pattern carries "How the AI found this" (sources, rule that fired, where, who, why this team, why this action, what the AI did not do). To discuss later: more mystery shopper examples and the definition of critical, medium and low impact.

## 31. OD renamed to L&D (7 Nov 2026, v32)

The department is Learning and Development (L&D), not Organization Development. Everything in the portal says L&D.

## 32. Omnichannel direction (7 Nov 2026)

**Decision.** The whole portal is revamped around omnichannel: reflect every channel the customer used, read the customer history and build the journey and the corrective actions from it; the same for leads, who are part of the journey; all products' chats included. Main scope stays customer experience: enhance the journey, attract new customers, and learn from runaway customers. Research on omnichannel practice and on what banks do (one golden record per person, a timeline of every interaction, phased rollout, problem management on patterns rather than tickets; the warning that integration is the whole job).

**Answers given by Manaf.** The CRM is custom and in-house, holds all customer history, transactions and agent activities per lead, and can integrate with anything. Call side: an in-house AI agent for outbound and lead generation (opens leads or hands to a person) plus an IVR routing to HR, suggestions and complaints. Chat: WhatsApp Business, area-based WhatsApp groups between agents and targeted customers, and the private chat inside the mobile apps. Identity key: probably the mobile number, which can change; to confirm with the CRM owner. Runaway customers to learn from, in order: leads that went quiet, tenants who did not renew, owners who stopped dealing with PSI. Scope: all five products, unlaunched ones hidden. Conversation text readable by the CX team and CX manager only. The IT team is correcting contact data (phone numbers without names and the reverse).

## 33. Customer journey, runaway customers, personas and campaigns (7 to 9 Nov 2026, v33 to v35)

Built: a **Customer journey** page (one key, mobile, name, email, ID or unit, returns the whole history across every channel over the years, with an AI reading in four parts citing dated events, a timeline with problem events highlighted, and the journey rules: repeat contact within 48 hours, 7 and 30 days, forced channel switch, promise not kept, slow reply, wrong language, hand-off, IVR complaint not logged, unapproved discount, silence); a **Runaway customers** page (six types: went to a competitor, silent lead, frozen deal or payment, did not renew, dormant owner, complained then left; "what we keep doing wrong" across them); **Personas and campaigns** (six personas built from CRM profile and behaviour, each with a recommendation to Marketing: who, which channel and when, campaign type, what not to do; a ranked next campaign); a **Marketing manager** role. Old modules removed from the menu at Manaf's request: After-Sales desk, call center desk and IVR simulation, survey engine, suggestions log, demo walkthrough, build specification.

**AI assistant** (v34): voice or text, Arabic or English, filters people from the CRM and every channel, explains a person, builds a corrective action plan (created as proposed actions) or a campaign brief (saved for Marketing); understanding by Claude inside claude.ai with the viewer's permission, otherwise a built-in parser; data from the same registers as the pages.

**Simplified** (v35) after Manaf found the portal too complex: one search on the home page, four pages (Customers, Runaway customers, Actions with signals, AI insights and shopper cases as tabs, Personas and campaigns), everything else under "Settings and reference"; each role sees one to five pages.

## 34. Phase one integration plan (9 Nov 2026)

Document: *CX Portal Phase One: Omnichannel Integration Plan* (Claude doc, also in the CX folder). Decision: integrate per channel, tag per product. The unified interaction record every source maps to. Identity: mobile number as the working key, CRM contact id as the anchor, two-key matches merge, one-key matches are reviewed, old numbers kept as aliases; the IT clean-up is a prerequisite for the mobile only. Integrations source by source (CRM contacts, activities, deals and agents; AI call engine; IVR; inbound calls; WhatsApp Business and area groups; app chats; surveys and ratings; mystery shopper; PSI Club). What the AI team builds: identity resolution, journey rules, runaway classification, patterns and actions, AI reading, the assistant. Personas from the CRM: rules on CRM fields first, clustering after three months of live records. Access and retention. Ten weeks from 16 November 2026 to go-live the week of 25 January 2027, with the CRM connector as the critical path. Needed from Manaf: the CRM field list and a 200-contact anonymised sample, the WhatsApp partner, the call platform, the app chats and their backends.

## 35. What the terms mean, PSI Wallet (9 Nov 2026, v36 to v37)

A "?" beside every metric and heading and a "What the terms mean" button on every page, with plain definitions, formulas and examples (NPS, CSAT, promoters, passives, detractors, responses, mystery shopper score, app CSAT, signal, pattern, corrective action, 30-day check, hand-off, runaway, persona, journey, repeat contact, channel switch, speed to lead, lead, SLA, environment, pool, omnichannel); the same definitions in the Glossary. **PSI Wallet** added as the sixth product, built like PSI Club: not launched (pilot), hidden until switched on; pilot numbers, what investors ask, four complaint types with owners, a draft investor survey, Wallet events on the investor's timeline as a channel, and the Wallet in the overseas investor and portfolio owner personas.

## 36. Standards documentation for L&D (10 Nov 2026)

Document: *Standards Documentation List for L&D* (Claude doc, also in the CX folder). The standards serve the whole platform, read by five instruments (shopper checklist, signal rules, survey questions, journey analysis, corrective-action owners), not only the shopper. L&D leads the creation with George as head of the unit and a champion from each environment; one group standard with environment variants only where the business differs, PSI Assets (rental) carrying most. Twenty-eight documents in six groups, each with what it must include, who writes it, which instruments read it and the Assets variant; a template every document follows; priority order (nine documents before the second shopper wave and the first live signals, by the end of November). Shared with George, Said Abu Laila and Ali Mhanna (AI call center) on Teams; Dhrumil Mehta, who is building a campaigns platform with overlap, was sent the portal, the phase one plan and the standards list, and asked for his platform's documentation for an overlap analysis.

## 37. Strategic planning: the base before the platform (11 to 12 Nov 2026)

Agreed: the platform is only as good as its inputs, so three foundations come first: the omnichannel integration (section 34), the L&D standards (section 36) and a **rules layer** (section 38). Five phases: Decide (11 to 28 Nov), Base (1 Dec to 29 Jan), Build and pilot (1 Feb to 26 Mar), Scale (29 Mar to 7 May), Run. A Jira project "CX Portal" (key CXP) will carry the backlog; it does not exist yet, Manaf creates it, and every backlog draft is shown for approval before anything is posted.

Mr. Karam, **Internal Audit and Marketing Lead** (UAE), is the key person on the ground: he validates the data feeds and the standards, audits the commercial team, the campaigns and the personas, and is Manaf's contact point. The portal gives him a role with aggregates and audit views: no cases, no conversation text, no agent names.

## 38. The rules layer: five decisions (12 to 16 Nov 2026)

Decided with Manaf, written up in "CX Portal: Rules and Definitions" and reflected in the prototype as configuration (Settings, "Rules as configuration").

1. **Signals.** A pattern needs 5 of the same issue, or 3 on the same agent, or 50% concentration in one environment, within 30 days, on a sample of at least 10. Legal, privacy and safety: one occurrence is enough.
2. **Mystery shopper.** Critical, medium, low. Critical opens a case the same day (respond 1 working day, resolve 5). Medium is a signal. Low is an L&D statistic. A visit under 60% is medium. The severity placing is phase two.
3. **Recovered and worked.** Approve within 5 working days; verify at 60 days; effective when the signals drop by 50% or more and do not return for 90 days; partial; failed reopens. Recovered within 60 days: a 4 or 5, a promoter or passive, a transaction, renewal or new lead, or a new contact without a complaint. Detractor interviews are human by default; the CX team may create AI interview campaigns (segment, script in both languages, hand-off rules: hang-up or no answer twice → human; asks for a person or anything critical → human the same day; declined → no retry; critical never in a campaign). Capacity = people × hours × 4 × working days. Re-survey 7 to 14 days after resolution, exempt from the caps, reporting the recovery delta.
4. **Escalation matrix.** One template and one set of principles; the product owners fill the cells with Mr. Karam by 28 November.
5. **Feedback coverage.** NPS only after a completed milestone, plus a relationship NPS yearly. CSAT + CES after a meaningful interaction only (call over 2 minutes, viewing, offer). "What stopped you?" once, 14 days after silence. CES on an abandoned digital step (identified users only) and after a closed maintenance or complaint ticket. Caps: NPS 90 days, CSAT/CES 30 days; inside the window the portal keeps the most important touchpoint (viewing > offer > call). Public channels (Facebook, Instagram, LinkedIn, Google) are never surveyed: unidentified pool, signals, public reply within 48 hours, a public reputation index. Each product its own line, no group NPS. PSI Website and PSI Real Estate app are two named sources on every record, not products. Any click or expression of interest is answered in minutes or hours.

Manaf's NPS/CSAT/CES best-practice document (uploaded 15 Nov) is consistent with these rules and is the reference for the instruments.

## 39. Per-product survey moments (15 to 16 Nov 2026)

PSI Real Estate: CSAT + CES after the call, the viewing and the offer; NPS after the signed deal. After-Sales: NPS after handover and renewal; CES after a closed ticket. PSI Club: leads ride the Real Estate journey with a VIP tag; member NPS at the end of a nomination cycle. Tour Estate: end-of-tour survey only after a completed tour (driver, guide, ride, car, cleanliness, NPS); the stop survey goes to the commercial team. PSI Events: no NPS; external QR rating at the booth and an internal staff evaluation. The lead funnel (sample: 9,000 leads → 7,400 contacted → 2,100 viewings → 640 offers → 150 signed) frames who is asked what; the journey stages per service are marked [Proposed] until Marketing confirms them from the Customer Journey Template.

## 40. The intelligent CX team: ten agents and a supervisor (13 to 17 Nov 2026)

The company is moving to one AI team per function, each agent single-task with a supervisor. The CX portal's part: ten agents (intake and matching; classification; signals and patterns; mystery shopper severity, phase two; corrective action and routing; verification; journey, runaway and personas; close the loop; reporting; survey triggers and delivery) and one supervisor with six checks (schema, recompute, access, evidence by a different model, bilingual, risk gate). Other teams are receivers: they get a fix or a signal and handle it their own way; the portal takes back a status. Rollout: shadow → limited (one environment) → live, with a weekly sample of 50 outputs read by the CX team and Mr. Karam. A fix is only ever suggested; the responsible manager approves, changes, rejects or asks for an investigation first.

Corrective actions are classified into eight kinds (employee, service and behaviour, training gap, product and app, process, environment, legal and privacy, marketing) and the kind decides the receiver; an employee kind is a management note to the direct manager only, never a case, never HR. When the evidence is thin, the portal requests five interviews or a mystery shopper check instead of guessing a fix.

Written up for developers in "CX Portal AI Agents: Specification" and for the AI team meeting in the deck "CX Portal AI Agents" (nine slides, business language, one example per agent).

## 41. Prototype v38 (13 to 17 Nov 2026)

Source badges on every event (PSI Website, PSI Real Estate app, WhatsApp, Facebook, Instagram, LinkedIn, Google, and the rest); public mentions as signals with a 48-hour reply clock; the public reputation index; indicators per product with "Group NPS: none, by design"; the lead funnel with source split and reasons; Close the loop (list, interview with brief and four questions, reason codes, re-survey, AI campaigns); the Intelligent CX team page (path, roster, job descriptions, supervisor); action classification and routing; Investigate tab; rules as configuration; the Internal Audit and Marketing Lead role; Surveys and triggers page; "When this product asks" on each product page; VIP tag on Club customers; Agent 10. Fix in v38: the Voice of Customer page tolerated the new sources.

## 44. Prototype v39 and v40: one line, six steps; everything traceable (18 Nov 2026)

Manaf's feedback on 17 Nov: the portal had grown page by page and he could not follow it himself; any user, whatever their background, must be able to use it; the CX indicators (NPS, CSAT, CES) must be on the home screen; every record must show where it is and what the logical next step is. Diagnosis done the same day (weak points, improvements, additions, P0 to P2), then built in full as v39 and v40.

**v39.** Home rebuilt: the six-step line (1 Listen, 2 Signal, 3 Pattern, 4 Fix, 5 Check, 6 Report), the CX indicators per live product with a plain sentence under each and the "?" definitions (CES added), "New here? Three things to know", "Your work today", the search below. Every page and every fix shows a "where you are, what happens next" box with who and by when. Menu in step order. Daily brief written by Agent 9 at 07:00, one per role, each line opening its page; the brief and the tiles use one NPS source.

**v40 (P0).** Trace ids on one chain: EV (event) → SG (signal) → PT (pattern) → CA (fix) → VR (check) → RP (report); a Trace card on every fix and signal, ids on timeline rows and signal rows, a signal detail modal; public mentions never link to a person. Data feeds page: three CRM environments as separate feeds plus the shared sources, each with last received and status; a "Data as of" bar on every page with the environment switch that narrows every register. CRM mapping page (Media → source, lead stage → funnel stage, activity category → event) as configuration. The signals Rules tab points to the single place thresholds are edited.

**v40 (P1).** Menu merged: Customers holds search, who is leaving and personas; Surveys under settings only; hand-offs folded under the fixes tab. My inbox: everything on the user with day counters against the approval window (5 working days) and due dates; the home card summarises it. Audit trail on every fix (when, what, by which role). Escalation matrix page per product (receiver, informed, backup, respond and resolve hours; defaults marked as proposals) and the classification on each fix reads it. Survey questions page per product in both languages with a customer-view preview. Consent and DNCR on each person from the CRM; skipped surveys state the reason. An investigation closes with a result that becomes evidence on the pattern and proposes a fix. Close the loop: calling hours, up to three attempts, next attempt the following working day, WhatsApp after the last.

**v40 (P2).** One sign-in with six main roles (the demo roles folded away). A browsable customers list with filters and export. Public mentions list with reply status and owner. Weekly sample page: 50 outputs, right or wrong, wrong becomes a test. "What if" on the thresholds showing how many patterns each value would produce. Arabic completed on agent chips; tables scroll on mobile.

Still sample data; nothing is sent. The knowledge base documents (Modules, Word, PDF) were regenerated for v40 and again for v41.

### Decisions confirmed on 18 November (after the React team's questions)

1. **Working week: Monday to Friday.** Working-day counts skip Saturday and Sunday (the prototype had Friday and Saturday; fixed in v40 on 18 Nov).
2. **Escalation matrix: one table per product, rows per fix kind** (the eight kinds plus the two case types). The earlier per-complaint-category template in the Rules doc is superseded; categories are what Agent 2 gives a signal, kinds are what Agent 5 gives a fix, and the matrix routes fixes. Real Estate has one table, not one per environment.
3. **A fix's due date comes from the matrix "Resolve (h)"**, in working hours from approval; Agent 5's 14 days is the fallback for an empty cell. The 5-working-day approval window runs from the proposal; the 60-day check from "done".
4. **Public replies are Marketing's** (channel owner), within 48 hours from the approved wording; the CX team watches the clock and raises a signal when missed; the Internal Audit and Marketing Lead audits monthly.
5. **Calling: 09:00 to 18:00 UAE time, 3 attempts** for the CX team list, next attempt the following working day, WhatsApp after the last; **2 no-answers** for an AI campaign before hand-off. Both configuration; Legal confirmation of hours still pending.
6. **Weekly sample: 50 outputs by Thursday, no customer names to Internal Audit; a "wrong" lowers the agent's pass rate** and becomes a supervisor test.
7. **The environment switch narrows everything**, fixes and the call list included; **exports show mobiles only to roles that may see names.**

Written into "CX Portal: Rules and Definitions" as the section "Decisions added on 18 November 2026". The React build lives in `React-Frontend/` with its own docs (`docs/V40_DELTA.md`, `docs/V40_FOUNDATION_API.md`); it badges anything still `[Proposed]` in the UI.

## 42. Files and links (17 Nov 2026)

| Item | Where |
|---|---|
| CX Portal prototype v38 (private, shared with specific people) | https://claude.ai/artifact/Y27QrDZiBLL5jJMb5bw2VB |
| CX Portal AI Agents deck (for the AI team) | https://claude.ai/artifact/7cXc9j5Uq3RABQftieu96E |
| Survey Journeys deck | https://claude.ai/artifact/1ZRpqtQUbk7dJT3AZQ62T7 |
| CX Portal: Rules and Definitions (document) | https://claude.ai/artifact/NxhqoSy8WkVqTW9PTMc42g |
| CX Portal AI Agents: Specification (document, for developers) | https://claude.ai/artifact/Sdvd2cAXkHDAJ3GELy85gR |
| Customer Journey Template (document, for the Marketing meeting) | https://claude.ai/artifact/WHs77JqLCyZyrFXYB4fr2z |
| Intro deck (4 slides, with links to the demo and the video) | https://claude.ai/artifact/QjDwbKr8TZgJPMduVYmUKj |
| Walkthrough video page | https://claude.ai/artifact/L7ovEmwgZ7j3seLhiHgGTJ |
| Phase One Omnichannel Integration Plan | https://claude.ai/artifact/PbaA7h5U3AGaZMygGkmUS6 |
| Standards Documentation List for L&D | https://claude.ai/artifact/HojC8au21GvcgbkVtDK3E3 |
| Local folder | C:\Users\xele\Desktop\CX (Documents: this file, the Modules KB, the Word and PDF knowledge base, the portal HTML v38, the Rules, Agents specification and Journey template as Word files, the two decks as PDF) |

## 43. Open questions (17 Nov 2026)

1. The escalation matrix cells per product (product owners with Mr. Karam, by 28 Nov).
2. The journey stages per service (buying, renting, investing, listing) from Marketing; the funnel stages stay [Proposed] until then.
3. Mystery shopper scenario examples per severity, with the team.
4. PSI Club member recovery for a detractor VIP member: Club admin queue item or CX call (with Abu Omar).
5. Whether the CRM exposes a read API or only database access; the WhatsApp partner; where the AI caller and IVR logs live; which public channels have an export; the CRM field list and a 200-contact anonymised sample.
6. For the AI team: which models for the agents and the supervisor and their Arabic; whether the AI caller can run the four-question script with hand-off; how to read the CRM and the transcripts; cost per thousand messages.
7. The Jira CXP project: Manaf creates it, then the backlog draft is reviewed before posting.
8. PSI brand colours, fonts and logo files; real HR pool members and environment names; real SLA targets; call recording as a policy decision; retention periods with Legal.
9. Earlier open questions in section 14 that are still open: After-Sales real call script, calling hours and consent rules, data residency, the real mailboxes.

## 45. Prototype v41: the guided tour inside the portal (18 Nov 2026)

Manaf asked for the training to live inside the portal rather than in a video or a document: a new user who enters as a role should be shown how to work, starting from the inbox and which button to press for a follow-up. Built as v41 the same day.

**What it is.** The first time a person signs in under a role, the portal dims the screen, highlights the real element and shows a small card: what it is, why it matters, what to do next, with Next, Back and Skip. Some steps act for the user ("Do it and continue" opens My inbox or a fix waiting for a yes) and the next card appears on the page that opened. One path per role: CX manager and CX team get 13 steps (six steps → daily brief → CX indicators → My inbox → one row one thing → where you are and what happens next → open a fix → your decision → the trace → close the loop → find anyone → all the numbers → end); environment managers and team leads stop after the fix and the search; Marketing gets personas and campaigns; L&D and Internal audit get their own briefs and pages; other roles get Home only. Runs once per role; replay from "How do I use this?" at the bottom of the menu. Bilingual, right-to-left in Arabic.

**For the React team (V40_DELTA F28, [Proposed]).** The tour is data: a list of steps per role, each with a page, an optional tab, a CSS target, a title and a text in both languages. Highlight box and card are positioned from the target element; a step marked "click" performs the real action; completion is stored per role per user. No new backend.

**v41.1 (19 Nov).** Manaf, viewing the React build as the Internal Audit and Marketing Lead, could not judge the weekly sample: fifty rows of output and an id, nothing to judge against. The cause was the requirement, not the build: the prototype and the KB said "fifty outputs, right or wrong" and no more, and the React team built exactly that. Fixed in the prototype and the KB: every row now shows what the agent saw, what it produced, what the supervisor checked, and an Open button for CX roles; a "How to judge" card above the table; ids and titles only for Internal Audit. Recorded for the React team as V41_DELTA F29. Rule going forward: any page that asks a person for a verdict must show the evidence on the same row.

## 46. Prototype v42: the escalation matrix cells, and "Watch the AI team work" (19 Nov 2026)

**The matrix cells (Decision 4, closed).** Manaf delegated the cells to Claude on 19 November with three considerations: information security, customer satisfaction and CX, and the fact that every product deals with VIPs, where a delay is a disaster. Set for all six products in the prototype and in the file "ESCALATION-MATRIX-2026-11-19.md" (CX folder, Documents and React-Frontend/docs). Three rules behind every cell: (1) every customer is treated as a VIP, respond clocks are 1 to 4 working hours for anything a customer can feel, a CRM VIP tag halves both clocks and informs the head of the environment at once; (2) information security sits beside Legal on anything that touches data, a data-exposure incident is its own row, Wallet and Club product rows inform Information Security by default, conversation text and names never leave the CX team; (3) the receiver is the one who can fix it, never top management, the CX team keeps the customer side while the fix is made, and a fix that does not recover the customer is a failed fix. Product owners may adjust a title with Mr. Karam before 28 November; the clocks stay. Two rows added to the matrix: "Data exposure or system access incident" and "Any kind, VIP customer involved".

**Watch the AI team work.** Manaf said he knows the agents' roles but cannot see their impact or how they work in the prototype. The honest answer recorded: on sample data the agents' work is already done, so only their outputs show; the impact (hours saved, signals a person would have missed) exists only after Shadow on real data, and any figure before that would be invented. What the prototype can show is the mechanism: a replay page where one WhatsApp message walks the six steps with the clock, agent by agent, through the supervisor, into three inboxes, in six seconds; with this week's counters from the sample and a card that says plainly what the page will not show. A button on Home opens it. React: V42_DELTA F30 (matrix cells and rules) and F31 (replay page).

## 47. The Internal Audit and Marketing Lead: what the role judges, and the campaign audit (19 Nov 2026)

Manaf, viewing the React build as the Internal Audit and Marketing Lead, asked why that person should approve or reject anything in the weekly sample and on what. Clarified and built as v42.1:

**The role never approves a fix.** Approval belongs to the responsible manager by title from the matrix, from their inbox. The weekly sample is a quality audit of the AI, not a decision on the work, and it is now split by reader. Internal Audit gets the rows audit can judge: routing (did the fix go to the title the matrix says, with its clocks), classification (does the category match the quoted evidence), access (did anything leave the CX team that should not have), targeting (does a campaign point at the people its persona defines). Right means the rule was followed; Wrong means it was not, whatever the reader thinks of the fix. The CX team gets the rows that need someone who knows the work: proposed fixes, interview briefs, journey readings. In the React sample data, "repeat contact → Legal" is exactly the kind of routing error the audit row exists to catch.

**Campaign audit (added at Manaf's request).** The Internal Audit and Marketing Lead is responsible for targeting the right people and for auditing every campaign: right people, right way, right projects, right developers, right communication method, and the financial part. Built as a page: every campaign (Marketing's, from a persona, and the CX team's AI interview campaigns) is cleared or sent back before anything reaches a customer, on five checks answered against what the campaign says (right people; right projects and developers; right channel, language and timing; right message; the money: budget, cost per contact, expected responses, expected cost per lead against the product's limit), and audited after the run (share of recipients matching the persona, below 80% becomes a targeting signal to Marketing; response rate; leads or recoveries; cost per result). The lead's inbox and daily brief carry the campaigns waiting. The role description, the tour and the KB say "audits, never approves fixes". React: V42_DELTA F32 and F33.

Correction from the developer, same day: the tour for environment managers and leads has 11 steps, not 10; V41_DELTA fixed.

**v42.2 (19 Nov).** Manaf, now as CX team, still could not understand the weekly sample: a table of 50 rows with odd data is not something a CX person can judge either. Rebuilt as one piece of work at a time in plain words: what the AI was given on the left (the quoted message, the pattern with its signals, the customer's last events), what it decided on the right, one question ("is this really a complaint of this type?", "is this a sensible fix and is it going to the right person?"), three answers (yes I would do the same / no that is wrong / not sure, skip). The intro says what it is in one breath: the AI team is a new employee and this is the weekly spot-check of its work; nobody approves anything here. React: V42_DELTA F34.
