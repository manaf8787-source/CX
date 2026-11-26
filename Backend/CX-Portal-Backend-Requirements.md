# CX Portal: What the backend needs

**From:** Manaf Obeidat, Delivery & CX Manager
**To:** Ahmad Al-Khatib, CTO, and the backend team
**Date:** 26 November 2026

## 1. Purpose

The CX Portal frontend is built in React and approved. The next step is the backend, in .NET, to the same standards as the PSI CRM.

The backend replaces the sample data in the frontend with real data from PSI systems. It reads data from these systems; it never writes into the CRM or Odoo.

This document lists everything needed to start and finish the backend without a second round of requests. Each item has an owner to confirm.

## 2. Platform and environment

| # | Item | What we need | Notes |
|---|---|---|---|
| P1 | Hosting | A place to run the backend: a .NET Web API and background jobs (scheduled tasks and queues). Dev, test and production. | Inside the UAE (UAE data protection law). PSI servers or a cloud tenant, whichever PSI uses for the CRM. |
| P2 | Database | A database server, preferably the same engine the CRM uses (for example SQL Server), one database per environment (dev, test, prod). | The portal keeps its own data: users, surveys and answers, signals, fixes, audit log. |
| P3 | .NET standards | The .NET version and the architecture conventions the PSI backend team follows (project template, logging, error handling, API style). | So the portal matches the rest of PSI's code. |
| P4 | Source control | A repository (Azure DevOps, GitHub or GitLab) and who reviews and merges. | |
| P5 | Build and deploy | A pipeline (CI/CD) that builds and deploys to dev, test and prod. | |
| P6 | Domain and SSL | Web addresses with certificates for the portal, its API, and the public survey page customers open from a WhatsApp, SMS or email link (for example `cx.psinv.net`, `cx-api.psinv.net`, `survey.psinv.net`). | The survey page is the only part open to the public. |
| P7 | Company sign-in (SSO) | Register the portal with PSI's company directory (for example Microsoft Entra ID / Azure AD) so staff sign in with their PSI account. Read access to the directory for name, job title, department, manager and email. | Roles stay inside the portal. External users (mystery shoppers, outside vendors) get portal accounts by email invitation. |
| P8 | Email sending | A sender mailbox (for example `cx-portal@psinv.net`) and the way to send from it (SMTP or Microsoft Graph). | Invitations, alerts, the daily brief. |
| P9 | Secrets | The secure way PSI shares passwords and API keys with developers (for example Azure Key Vault). | Nothing is sent by email or chat. |
| P10 | Monitoring | Where logs and alerts go (the tool PSI already uses). | |
| P11 | File storage | Storage for uploaded files: mystery shopper photos and evidence, fix evidence, gift documents, generated exports. | Private, inside the UAE. |
| P12 | SMS | An SMS provider and a registered sender name for surveys and alerts to customers without WhatsApp. | Sender name registered with TDRA. |
| P13 | Backup and recovery | Backup schedule and restore test for the portal database and files. | |
| P14 | Legal and data protection | Legal's approval of the personal data the portal keeps, how long it keeps it (retention), and the consent rules for surveys and calls. | Retention is still open (raised 7 Nov). |

## 3. Systems to connect

Order of work: Meta first, then the other social channels, then CRM, then Odoo, then the AI call center.

For every system we need the same five things:

1. **How to read the data:** an API with its documentation, or a webhook, or a read-only database account, or a scheduled export.
2. **A test environment** the developers can use before production.
3. **An anonymised sample** of real data (names and mobiles masked).
4. **Access** for the developers, shared through P9.
5. **A technical contact** for questions during development.

### 3.1 Meta: Facebook, Instagram, WhatsApp Business

**Why:** public comments and reviews feed the portal's signals; customer messages join the customer's timeline; satisfaction surveys are sent on WhatsApp.

| Need | Detail |
|---|---|
| Accounts list | Facebook pages and Instagram accounts per environment and product; WhatsApp Business numbers in use. |
| Meta Business Manager | The admin grants the portal's Meta app access to the pages, Instagram accounts and WhatsApp account (done inside Meta, no password shared). Permissions to read comments, page messages, Instagram messages and ratings, and to reply. |
| WhatsApp provider | Whether WhatsApp runs through a provider (Twilio, 360dialog, Infobip, other), its name, and API credentials for the portal. |
| Webhooks | Incoming WhatsApp messages and message status (sent, delivered, read) sent to the portal's API. |
| Templates | Who creates and approves WhatsApp templates; the portal needs survey templates in Arabic and English. |
| Limits and cost | Messaging limits and cost per conversation. |
| Lead forms | Whether Facebook or Instagram lead forms already push leads into the CRM. |

### 3.2 Other social channels: LinkedIn, Google, TikTok, YouTube, X, Snapchat

**Why:** every public comment, review and message about PSI is a signal, wherever it is posted. Public channels are not tied to a customer, so no surveys are sent there; they feed the signals and the public reputation index.

| Need | Detail |
|---|---|
| Accounts list | Every PSI account per channel, environment and product: LinkedIn company pages, Google Business Profiles (each office), TikTok, YouTube, X, Snapchat, and any other channel PSI runs. |
| Social listening tool | Does PSI (Marketing) already use a tool that collects all channels in one place (for example Sprout Social, Hootsuite, Meltwater, Brandwatch, Sprinklr)? If yes, one connection to that tool can replace the separate connections below. Name the tool and its API contact. |
| LinkedIn | A page admin grants the portal's LinkedIn app access to the company pages (comments, mentions). LinkedIn approves this access, which can take a few weeks. |
| Google Business Profile | The profile owner adds the portal as a manager, to read reviews and ratings and to reply, for every PSI office listed on Google. |
| TikTok, YouTube, X, Snapchat | For each channel in use: the account admin grants API access to comments, mentions and messages. Note: X's API is paid; Snapchat's API is limited. |
| Property portals | Do Bayut, Property Finder or others show reviews of PSI or its agents? If yes, is there an export or API? |
| Reply ownership | Marketing replies on public channels (agreed 18 Nov); the portal tracks the 48-hour reply clock. Confirm who replies on each channel. |

### 3.3 CRM: Dubai, Abu Dhabi, PSI Assets, PSI-AI

**Why:** the CRM is the main record: customers, leads, activities and their follow-up, deals and leases, agents. Surveys are triggered by CRM events.

| Need | Detail |
|---|---|
| Access method | API with documentation (preferred), or a read-only database account, or a daily export. Confirm whether it is the same for all four environments. |
| Read: contacts | Contact ID, name, mobile(s) and old numbers, email, Emirates ID if held, nationality, gender, date of birth or age band, language, residence, workplace, income source, customer type (buyer, tenant, owner, investor), VIP or PSI Club member flag, consent and DNCR flags per channel, environment. These also build the personas. |
| Read: leads | Lead ID, contact, product, service (buy, rent, invest, list), stage and stage history (time in each stage), source (Media, Media detail, method), campaign tag, assigned agent and every agent who held it, first response time, close reason, frozen flag, created and last activity dates. |
| Read: activities | Activity ID, lead or contact, type and category, date and time, agent, direction, result, notes. |
| Read: deals and leases | Deal or lease ID, contact, type (sale, lease, renewal), unit, signed date, lease start and end dates, renewal or non-renewal and its reason, handover or move-in date, payment milestones and status, value, status. |
| Read: units and projects | Unit ID, project, community, status. |
| Read: agents and pools | Agent ID, name, team, pool, environment, product, manager; the lead and activity SLAs each agent is measured on (for the Sales agents report). |
| Read: maintenance requests | From the CRM's Property Management > Maintenance Management module. Per request: ID, environment, unit, customer, problem and category, priority, created date, every stage with its date (received, assigned, visited, completed, closed), the follow-up staff member (checker or validator), the assigned vendor or sub-contractor, the customer's comment, PSI's follow-up comment, the customer's sign-off or acceptance, closure reason. |
| Read: maintenance team and vendors | Follow-up staff (name, title, environment); vendors and sub-contractors (company name, trade, environments they serve, contract or AMC details). |
| Read: AMC visits | Planned and done preventive visits per unit or building: vendor, planned date, done date, result. |
| Read: maintenance ratings | Any rating or acceptance form the customer or the follow-up staff fills after a job, with its fields. If none exists today, confirm. |
| Read: complaints | Complaint ID, contact, category, product, environment, channel, dates, owner, closure outcome. |
| Read: WhatsApp communication log | Per lead: message date and time, direction, agent, and text if stored. |
| Events (webhooks) | Notify the portal when: a lead changes stage; a deal or lease is signed; a handover or move-in is done; a lease is renewed; a maintenance request or complaint is closed. If webhooks are not possible: how often the portal may check for changes. |
| Missing fields | Found in the read-only review on 17 Nov: call duration and outcome; "viewing completed"; frozen-deal flag; customer-side close reasons; direction and text on the WhatsApp log; handover date on the deal; closure outcome on complaints; survey results (only one activity type exists). Confirm where these are or whether they can be added. |
| Sample | About 200 contacts from Abu Dhabi with their leads, activities and deals, names and mobiles masked. |
| Test environment | A test or QA environment with data for developers. |

The full field-by-field mapping is in the separate document "CRM Field Mapping for the CX Portal".

### 3.4 Odoo (HR)

**Why:** the HR performance page shows recruitment progress, HR requests and their timing. Later, employee appraisals and competencies help build employee personas and explain detractor reasons.

| Need | Detail |
|---|---|
| API user | A read-only Odoo user for the portal (Odoo's own API), limited to the models below. |
| Recruitment | `hr.applicant`: applicant, job, stage, stage dates, created and closed dates, refuse reason. |
| HR requests | `hr.letter.request`, `hr.leave`, `hr.resignation`, `hr.attendance.adjustment`: type, requester, submitted, approved or closed dates, status. |
| Employees | `hr.employee`: **every employee of the company** (Chairman's request), not only sales agents: name, job title, department, **division**, manager, work email, environment, hire date, active or left. Used to route fixes to the right direct manager and to build the HR and CX team pools. |
| Customer-facing tag | Whether each employee deals with customers directly (sales and leasing agents, call center, after-sales, maintenance follow-up) or not (back office, management). If Odoo has no such field, send the department and division list so PSI marks which ones face customers; the portal keeps the tag in its settings and highlights customer-facing staff. Everyone is kept; only the customer-facing ones feed personas and agent reports. |
| KPIs per job position | Each job position has its own KPIs and evaluation (HR, 26 Nov). Odoo already has a configurable KPI setup built with the former Performance team: KPIs with a **weight**, linked to **objectives**, per job position. We need that model with: job position, KPI, type (quantitative target or soft skill), weight, objective, target value, period, and each employee's actual score per period. |
| Quantitative KPIs | Measurable targets, for example monthly targets of the recruitment team (hires, phone calls), or Purchasing (discounts, negotiation, delivery on time). Actual values per employee and month, and where each one is recorded (Odoo, Excel, or not recorded). |
| Soft skills (qualitative) | Communication, attitude, engagement with people, rated by the direct manager in periodic evaluations (quarterly, every 6 months, annual). Per employee: period, reviewer, rating per skill, overall rating, manager's comment. Used later for employee personas and to link detractor reasons (lack of knowledge, communication skills) to training needs. |
| KPI data source list | For each department and job position: the list of its KPIs and where the data of each one lives. Some are in Odoo, some in Excel, some are not recorded anywhere. The portal reads Odoo first; Excel sources are uploaded on a schedule; unrecorded KPIs are listed as gaps. |
| Department scorecards (history) | A department scorecard and individual targets existed before the company shutdown; the Performance team has since left. Confirm whether that history is still in Odoo or in files, and send it if it is. |
| HR Operations | Onboarding (steps, dates, quality of onboarding), employee documents and the completeness of each employee profile, and the exit process (steps and dates), so the HR page can track them like recruitment. |
| SLAs (defined in the portal) | Odoo has **no SLAs**: no time to hire, no time to fill, no time per stage; teams follow internal rules that are not in the system. The portal will hold the SLA definitions itself (agreed with each team: time to hire, time to fill, time per recruitment stage, onboarding and exit times, HR request times) and measure, from the Odoo dates, who meets them and who breaches them. Needed from Odoo: the date of every stage change, not only the current stage. |
| Access to evaluations | KPI scores and manager evaluations are read by the CX manager and HR only, never shown to the employee's peers; confirm with HR and Legal what may be used. |
| Leave and holidays | Leave of CX team members (team availability) and the UAE public holiday calendar, so the working-day clocks skip them. |
| Gaps | No history of status changes on requests; visa and onboarding steps not found. Confirm where they are or whether they can be tracked. Confirm, per department, which KPIs and evaluations are in Odoo and which are in Excel or nowhere. |
| Hosting and version | Odoo version; hosted by PSI or by a partner (and the partner contact). |
| Test copy | A test copy of Odoo for developers. |

Details are in the document "CX Portal: Data needed from Odoo (HR)" already shared with Mahmoud.

### 3.5 AI call center, IVR and AI quality evaluation

**Why:** calls join the customer's timeline; IVR callbacks to HR are measured; quality scores feed the signals; the portal starts AI interview calls with unhappy customers.

| Need | Detail |
|---|---|
| Call logs | Per call: ID, date and time, customer mobile, direction, duration, outcome (answered, no answer, hand-off, lead opened), agent if one took over, environment. API or daily export. |
| IVR | Option chosen (HR, complaints, suggestions), message left, callback time. |
| Transcripts | Transcript or AI summary per call, Arabic and English, if available. |
| Quality scores | Score per evaluated call, criteria, notes, evaluated date. |
| Interview campaigns | An API to send the AI caller a list of customers and a short script, receive answers back, and flag calls that need a human. |
| CX team calls | The CX team calls unhappy customers. Can they call from the portal through the call center system (click-to-call), with the call logged and recorded? If not, how are their calls logged today? |
| Support agents' chats | For the Excellence team report: WhatsApp and in-app chat conversations handled by support agents, with first reply and resolve times. Confirm which system holds them. |
| Survey after a call | A "call ended" event per call (webhook preferred): call ID, end time, direction, AI or human, call script or IVR line, result code (to map to: appointment, follow-up, successful, not interested, dropped after the AI greeting, no answer, busy, voicemail, wrong number), talk seconds, phone. QA score and critical-failure flag linked by call ID for the calls in the QA sample. Full rule: `Call-Survey-Rule-Backend-Spec.md`. |
| Sample | A few days of anonymised call logs and quality scores. |

### 3.6 UAE Do Not Call Registry (DNCR)

**Why:** before any outbound contact the portal starts (survey calls, AI interview campaigns, CX team calls, WhatsApp or SMS surveys), every number must be checked against the UAE Do Not Call Registry, so PSI never contacts a registered number without consent.

| Need | Detail |
|---|---|
| PSI's DNCR access | Does PSI already have access to the TDRA Do Not Call Registry (for telemarketing)? Who holds it (Compliance, Marketing or the call center)? |
| Check method | API, file download, or a check inside another system (CRM or the AI caller). How often is the list refreshed? |
| CRM flag | The CRM has a DNCR flag per contact. Is it synced with the registry, and how often? |
| Rules | Which contacts are allowed despite DNCR (for example existing customers with an active contract and consent), as Legal and Compliance define them. |
| Access | Credentials for the portal, shared through P9. |

### 3.7 Marketing audit

**Why:** the Internal Audit and Marketing Lead (Mr. Karam) audits every campaign after it runs: right people, right way, right projects, right developers, right channels, and the financial part. Results are kept as history.

| Need | Detail |
|---|---|
| Campaign platform | Campaign name, type, target, segment, channel, recipients, responsible person, start and end dates, criteria the campaign was run on (with Dhrumil). |
| CRM campaign tags | Every lead from a campaign tagged with that campaign in the CRM (Chairman's rule), with the lead's outcome: contacted, no answer, not contacted, converted. |
| Ad accounts | Read access to PSI's ad accounts (Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads, Snapchat Ads, and any other in use): spend, dates, audience targeting, placements, leads and results per campaign. |
| Financial part | Campaign budgets and actual costs, including agency fees and invoices, from Marketing and Finance. Which system holds them? |
| Agencies | Agencies running campaigns on PSI's behalf, and how their reports can be read. |
| Audit history | Audit results are stored in the portal and kept so any campaign can be re-checked a year later. |

## 4. AI agents

The portal runs 10 single-task AI agents and one AI supervisor. Each agent does one job; the supervisor checks every output before it moves on; people approve, decide and call. The full specification (job, trigger, schedule, escalation, what each must never do) is in the document "CX Portal AI Agents: Specification".

| # | Agent | Job | Phase |
|---|---|---|---|
| 1 | Intake and matching | Turns every incoming record from any channel into one event on one person's timeline | Phase 4 |
| 2 | Classification | Gives each event a category, reason, product, environment and responsible agent | Phase 4 |
| 3 | Signals and patterns | Counts repeated events and raises a signal when a rule is crossed | Phase 3 |
| 4 | Mystery shopper severity | Rates mystery shopper findings critical, medium or low | Later (not phase one) |
| 5 | Corrective action and routing | Proposes a fix for each signal and routes it to the owner in the escalation matrix | Phase 3 |
| 6 | Verification | Runs the fix clocks and the 60-day check | Phase 3 |
| 7 | Journey, runaway and personas | Reads a person's whole history, flags runaways, assigns personas | Phase 5 |
| 8 | Close the loop with detractors | Prepares the call list and the AI interview campaigns | Phase 5 |
| 9 | Reporting | Writes the daily brief and the monthly pack | Phase 3 |
| 10 | Survey triggers and delivery | Watches for survey moments and sends surveys within the caps | Phase 2 |
| S | CX Supervisor | Checks every agent output; escalates; feeds the weekly sample | With the first agent |

Agents 3, 6, 9 and 10 start as plain rules (no AI model needed); the AI model is added where judgement is needed (matching, classification, proposing fixes, reading journeys, summaries).

**What we need for the agents**

| Need | Detail |
|---|---|
| AI provider and models | The AI provider PSI approves (for example the one the AI call center already uses), with models that handle Arabic and English. |
| Data residency | The AI service must process PSI customer data in a region PSI and Legal approve (UAE preferred). |
| Access and keys | API keys for dev, test and prod, shared through P9. |
| Budget and limits | A monthly usage budget and rate limits per environment. |
| Existing AI setup | Whether Ahmad Kudair's AI team already has an agent framework, prompt library or monitoring we should reuse in .NET (for example Semantic Kernel). |
| Review | Every agent output is stored with its inputs for audit; a weekly sample of 50 outputs is read by Internal Audit (agreed 18 Nov). |
| Rollout | Each agent goes shadow (runs, nobody sees), then limited (CX team sees and checks), then live. |

## 5. Other systems (needed later, asked now)

| System | Need |
|---|---|
| PSI website and PSI Real Estate app | Enquiries with source, in-app chat, abandoned digital steps (booking, upload, payment) for signed-in users, app store ratings, and a way for the portal to show an in-app survey pop-up. Contact: the app and web product owner. |
| Tour Estate, PSI Club, PSI Wallet, PSI Events | When each product launches: completed tours and guide ratings (Tour Estate), referrals and member events (PSI Club), wallet events (PSI Wallet), booth QR ratings (PSI Events). Contact: each product owner. |

## 6. Rules the backend follows

- **Read-only:** the portal never changes data in the CRM, Odoo or the call center.
- **Personal data:** conversation text is visible to the CX team only; exports are logged; mobiles are shown only to roles allowed to see names.
- **Data stays in the UAE.**
- **Every user action is recorded in the portal's audit log.**
- **Environment scope:** each environment manager sees only their environment, enforced in the backend.
- **AI agents propose, people decide:** no agent approves its own output, contacts a customer on its own, or changes CRM data.

## 7. Build order

| Phase | Content | What becomes real in the portal |
|---|---|---|
| 1. Foundation | Database, sign-in, users and roles, audit log, export permission, settings | Sign-in, users, audit log, settings |
| 2. Listen | Survey engine, sending on WhatsApp, receiving answers | NPS, CSAT and CES and the answers table |
| 3. Problems and fixes | Signals, patterns, fixes and checks, with clocks and notifications | Problems and fixes, inbox, daily brief |
| 4. Connections | Meta, other social channels, then CRM (Abu Dhabi first, then the other three), Odoo, AI call center | Customers and timeline, data feeds, HR page, call data |
| Pilot | CX team on real Abu Dhabi data | |
| 5. Expansion | Close the loop, public mentions, gifts, maintenance, agent reports | Remaining screens |
| 6. AI agents live | Agents with AI models go shadow, then limited, then live | The AI team page shows real outputs |

Phases 1 to 3 run on sample data, so they start as soon as section 2 is ready. Section 3 answers are needed before phase 4.

## 8. Related documents (attached)

- CRM Field Mapping for the CX Portal
- CX Portal: Data needed from Odoo (HR)
- CX Portal AI Agents: Specification
- CX Portal: Rules and Definitions (thresholds, clocks, escalation matrix)
- The React frontend repository (`React-Frontend`), whose `src/types` folder is the data contract the API must return

## 9. Contacts to confirm

| Area | Contact |
|---|---|
| Backend lead | |
| Legal (data protection) | |
| Web and app product owner | |
| DevOps / infrastructure | |
| Meta and WhatsApp | |
| Other social channels (Marketing) | |
| DNCR (Compliance or Marketing) | |
| Marketing audit: ad accounts and campaign costs | |
| CRM | |
| Odoo | |
| AI call center and quality | |
| AI agents (AI provider, models) | |
