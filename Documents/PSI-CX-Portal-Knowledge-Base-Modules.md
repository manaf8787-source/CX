# PSI CX Portal: Knowledge Base (v37, omnichannel)

Prototype on sample data. Version 37, updated 11 Nov 2026. The illustrated version (36 screenshots) is the Word and PDF document; screenshot names are listed as [Screenshot: name].

## Contents

- 1. What the portal is now
- 2. Who uses it and what each one sees
- 3. Home: one search
- 4. Customers: the journey of one person
- 5. Runaway customers
- 6. Actions: corrective actions, signals, AI insights, shopper cases
- 7. Personas and campaigns
- 8. The AI assistant
- 9. What the terms mean
- 10. Settings and reference
- 11. Products
- 12. Data and integration: phase one
- 13. Standards: what L&D is writing
- 14. Open items and version history

## 1. What the portal is now

One place where every customer signal becomes a corrective action, and the owner who fixes it. Version 37, prototype on sample data; nothing is sent.

The portal was rebuilt around the customer on 7 to 11 November 2026. It is now an **omnichannel** platform: one record per person (lead or customer), every contact from every channel on one timeline, read by rules and by AI to say what happened, who is leaving and why, and what to fix. The earlier modules (mystery shopper, standards, voice of customer, L&D, structure) still exist and sit under Settings and reference.

### The one rule that runs the portal

Everything that hurts a customer arrives as a **signal**: a complaint, a low score, a missed deadline, a bad rating, from any channel. A signal is counted, not worked one by one; the system that owns it (CRM, PSI Club, support) handles the customer. When signals form a **pattern** (same agent three times, same issue five times, or more than half from one branch, within 30 days), the portal proposes one **corrective action** with an owner, a due date and a 30-day check. The only thing that opens a case directly is a critical item seen by the **mystery shopper** (a false promise, an unofficial channel).

> Why: before this rule, the same complaint arrived twice, once through the product's own escalation (for example the PSI Club matrix) and once as a portal case. Now each product keeps its own correction, and the portal fixes the cause.

### The five pages

| Page | Question it answers | Who uses it |
|---|---|---|
| Home | Who or what do you want to know? One search box for a name, a mobile, an ID or a question in your own words | Everyone with portal access |
| Customers | What happened to this person, over the years, on every channel, and what should we do next? | CX, environment managers, Marketing (no conversation text) |
| Runaway customers | Who left, went quiet, froze or did not renew, by type, and what did we do wrong? | CX, environment managers, Marketing, executives |
| Actions | What are we fixing, why, and did it work? Corrective actions, with signals, AI insights and shopper cases as tabs | CX, environment managers, team leads, L&D, HR |
| Personas and campaigns | Who are our customers and leads, and who should Marketing target next, on which channel? | CX, Marketing, executives |

[Screenshot: landing] The entry page: one card per user type. Each opens the portal as that role.

What was removed from the menu in this version because the new direction does not use it: the After-Sales call desk, the call center desk and IVR simulation, the survey engine, the suggestions log, the demo walkthrough and the build specification. The code is kept; they are out of the menu.

## 2. Who uses it and what each one sees

Each role sees one to five pages, inside its authority and its specialty. Only the CX manager has the full view.

| Role | Pages | Sees | Can |
|---|---|---|---|
| CX manager (level 2) | All five, plus Settings and reference | Everything, all categories, all environments, agent names, conversation text | Approve corrective actions, set thresholds, set who sees what, approve standards for scoring |
| CX team (level 1) | All five, plus Settings and reference | Everything, agent names, conversation text | Create corrective actions, send AI suggestions to cases, triage shopper cases, run the assistant |
| Environment management (e.g. Sales manager, Dubai) | Home, Customers, Runaway, Actions, PSI Real Estate | Only its own environment, with agent names; no conversation text | Own and run its corrective actions, decide on proposed actions on shopper cases |
| Sales team lead (pool) | Home, Customers, Actions | Its pool's agents and cases | Follow actions for its pool |
| After-Sales team lead | Home, Customers, Actions, Voice of Customer, After-Sales | Process, speed and communication signals | Own After-Sales actions |
| L&D manager (Learning and Development) | Actions, Standards register, Training | Communication, product knowledge and attitude signals; its own L&D requests | Deliver training and materials, write the standards it owns (the CX manager approves them for scoring) |
| HR specialist | Actions, HR team | Attitude signals; cases assigned to the HR pool | Write corrective actions on conduct; the agent's direct manager reviews them |
| HR manager | HR team performance | Team numbers and late alerts only | Nothing on cases (informed only) |
| Marketing manager | Home, Customers, Runaway, Personas | Personas, campaign recommendations, runaway types; no conversation text, no agent names | Receive campaign briefs |
| Executive (read only) | Home, Customers, Runaway, Actions, Personas, Overview, Monthly pack | Everything, read only, no agent names | Nothing (informed) |
| Mystery shopper | Own tasks only | Briefs, deadlines, forms | Fill the forms, ask questions |

> Standing rules: cases are assigned to the people concerned, never to top management; heads and C-level are informed only. Agent names show only to CX and to the agent's own management. Conversation text (WhatsApp, app chat, CRM notes) is readable by the CX team and the CX manager only.

[Screenshot: insacc] AI Insights access: the CX manager's matrix of which role sees which categories, environment, names and actions. Changes apply at once.

## 3. Home: one search

The home page is one box. A name, a mobile number, an ID or a unit opens the person; a question in your own words goes to the assistant.

[Screenshot: home] Home for the CX manager: the search box, example requests, and four live numbers (runaway, open actions, personas, journeys), each a button.

**What each user does**

- **CX team and manager:** Type a key to open a journey, or a question to get a list, a plan or a campaign from the assistant
- **Marketing:** Same box; results come without conversation text or agent names
- **Environment manager:** Same box; results limited to its own environment

[Screenshot: home-ar] The same page in Arabic. Every page of the portal is bilingual with full right-to-left layout.

## 4. Customers: the journey of one person

One record per person, lead or customer, with every contact from every channel in date order, and an AI reading of what happened and what to do next.

The search stitches the record by mobile number, email, Emirates ID and CRM contact id. The page shows the CRM profile (type, environment, units and deals, where they live, where they work, income source, preferred channel, language, persona), four effort tiles (interactions, contacts in 90 days, problems found, days since last contact), the AI reading, and the timeline.

[Screenshot: journey-top] Rashid, an investor since 2016 with three units: profile from the CRM, persona, and the effort tiles.

### The AI reading

Four parts, every sentence pointing at a dated event on the timeline: who the person is and how many years and channels the record covers; what went wrong, in date order; a verdict (healthy, high effort, or one of the six runaway types); and what to do next. The AI did not listen to calls, because agent calls are not recorded; it read the CRM activity log, the chats and the scores.

[Screenshot: journey-ai] The AI reading for Rashid: passed between teams twice in 2021, a passive score in 2022, no contact for 14 months. Verdict: dormant owner. Next: an account manager call about rental management, which he asked for and never got.

### The timeline

Channels on the timeline: CRM notes, inbound and outbound calls, AI calls, IVR, WhatsApp Business, WhatsApp area groups, app chat, branch visits, email, surveys, app ratings, mystery shopper, website and ads, events, PSI Club and PSI Wallet. Each event shows the date, the channel, who started it (customer or PSI), the reason, the outcome, any promise with its due time, and the message text where the viewer may see it. Problem events are highlighted: promise not kept, forced channel switch, repeat within 48 hours, slow reply, wrong language, hand-off, detractor.

[Screenshot: journey-timeline] The timeline, newest first, filtered by channel. Highlighted rows are the problems the rules found.

[Screenshot: journey-problems] Below the timeline: Problems found and Channels used, folded by default.

[Screenshot: journey-priya] Priya, a lead lost to a competitor: an unapproved discount, a manager callback never made, a 53-hour WhatsApp reply, then closed lost.

### The journey rules

| Rule | What it means |
|---|---|
| Repeat contact | The same person comes back about the same matter: within 48 hours the first answer failed; within 7 days the fix was incomplete; within 30 days the problem came back |
| Forced channel switch | The customer moved to another channel after getting no reply on the first |
| Promise not kept | A callback, document or date was promised and nothing went out before its due time |
| Slow reply | A WhatsApp or app chat reply took more than 24 hours |
| Wrong language | A reply in English to an Arabic message, or the reverse |
| Hand-off | Passed between teams twice or more with no named owner |
| IVR complaint not logged | Pressed Complaints in the IVR and no CRM activity followed |
| Unapproved discount | A discount promised in chat without approval, then withdrawn |
| Silence | No contact either way for 30 days (lead) or 12 months (owner or investor) |

[Screenshot: journey-ar] The journey in Arabic.

## 5. Runaway customers

Everyone who left, went quiet, froze or did not renew, by type, with what the record says we did wrong. The point is not to chase each one; it is to learn and fix the cause for the next ones.

| Type | Definition |
|---|---|
| Went to a competitor | Was a lead or a customer, then closed a deal with another broker or developer |
| Silent lead | Enquired and was contacted, then stopped answering on every channel for 30 days or more |
| Frozen deal or payment | Booking, payment plan or handover stalled; still with PSI but nothing moves |
| Did not renew | Tenant whose lease ended without renewal |
| Dormant owner | Owner or investor with no contact, deal or referral for 12 months or more |
| Complained, then left | Scored as a detractor or complained, then no further business |

[Screenshot: runaway] The six types as counters, then "What we keep doing wrong": the faults found across all runaway records, each a corrective-action candidate.

[Screenshot: runaway-detail] One person opened from the list: what we did wrong and what to do, with a button to the full journey.

The thresholds (30 days, 12 months) are settings. The order of learning agreed with the CX manager: leads that went quiet first, then tenants who did not renew, then owners who stopped dealing with PSI.

[Screenshot: env-runaway] The same page for the Dubai environment manager: only Dubai people.

## 6. Actions: corrective actions, signals, AI insights, shopper cases

One page for what we are fixing, why, and whether it worked. Corrective actions are the main tab; signals and patterns, AI insights and shopper cases are the other three.

### Corrective actions

One action per pattern, with one owner, a due date and a 30-day check. Flow: Proposed (by the AI, by CX, or by the assistant) → Approved and assigned (CX manager only) → In progress (owner) → 30-day check → Effective, or Not effective and back to the root cause. Corrective fixes a cause that already hurt customers; preventive stops a cause before it does.

[Screenshot: actions] The register: proposed, open, late, effective, and the list with owner, due date and status.

Every action carries a panel "How the AI found this": the sources and dates, the rule that fired with its threshold, where, who (names only for roles allowed to see them), why this team, why this action (recovered in X of N similar closed cases), and what the AI did not do. The same panel appears on every pattern card, so an L&D manager or an environment manager can judge a suggestion without asking CX.

[Screenshot: action-detail] CA-203 as the L&D manager sees it: the payment plans sheet and AI script, with "How the AI found this" open.

### Signals and patterns

Every complaint, low score, breach and rating from every channel lands here as a signal, counted not worked. The Patterns tab shows the groups that passed a threshold, with the signals behind them, the team involved, the AI suggestion and its recovery figure, and a button to create the action. The Rules tab holds the thresholds, editable by the CX manager: same agent 3 times, same issue 5 times, more than 50% from one environment, within 30 days.

[Screenshot: signals-patterns] Patterns over a threshold, each with its signals, the team involved, the AI suggestion and the action it already has.

[Screenshot: signals-rules] Rules and thresholds, with the five definitions that make the model work.

### Hand-offs

A correction for one customer that another system owns: a do-not-call flag in the CRM, a recovery call, a PSI Club member recovery item (to agree with Abu Omar). The portal records where it went and checks it was done; no clock runs here.

[Screenshot: signals-handoffs] Hand-offs with their status and the hand-off rules by signal type.

### AI Insights

The AI reads the scored records (surveys, shopper scores, app ratings, call reviews) and finds where the low scores concentrate: one pattern per category and environment, with a service and a time band. Each suggested corrective action shows its recovery figure in full: "tried in 14 similar closed cases, the customer recovered in 10, 10 of 14 is 71%", a bar, and a small-sample warning under 10 cases. A panel "How to read these percentages" defines similar, recovered, the two limits, and the difference from the headline concentration figure. Suggestions become proposed corrective actions; "Send to a case" exists only for shopper cases in the same category.

[Screenshot: insights] An AI Insights pattern with its suggested actions, each explained in full.

> Two registers, two numbers: AI Insights reads scores and ratings (322 scored records in the sample); Signals counts complaints and breaches (50 in the last 30 days). A low score becomes a signal only when it is also a complaint, a breach or a critical shopper item. The page says so.

### Shopper cases

Only the mystery shopper opens a case directly, for a critical item seen in one visit or call. These cases keep the full case flow: CX triage with numbered proposed actions, the owner decides on each line, HR pool for conduct, the agent's direct manager reviews HR's actions, respond and resolve clocks in working hours. Which items are critical, medium and low is still to be defined with the team.

[Screenshot: shopper-cases] Shopper cases: the case list with its clocks and the case detail with proposed actions.

## 7. Personas and campaigns

Who our customers and leads are, built from what they did, said and scored, not from assumptions. Each persona carries a recommendation to Marketing.

| Persona | Who | Main pain | Channels they use |
|---|---|---|---|
| Overseas investor | Lives abroad, business owner, buys off-plan for yield | Wrong payment plan details; silence between milestones | PSI Wallet, WhatsApp, email |
| First-time expat buyer | Salaried, works in the UAE, buying a home | Handover slipped with no call; repeat questions unanswered | App chat, calls, WhatsApp |
| Local family renter | Tenant in PSI Assets, uses the app for maintenance | Maintenance request lost; app request not visible | App chat, calls |
| Portfolio owner | Several units, delegates to an assistant | Passed between After-Sales and Assets; statement errors | PSI Wallet, email, account manager calls |
| Comparison shopper | Lead talking to several brokers, wants the best price | Slow WhatsApp reply; wrong language; discount promised then withdrawn | WhatsApp, website |
| Referral-driven member | PSI Club member who refers friends | No update on a nominated lead; commission late | Club app, WhatsApp |

[Screenshot: personas] The six personas with size and runaway count, and the selected persona's description, pain and the channels its people actually use.

[Screenshot: personas-marketing] Recommendation to Marketing for the selected persona: who to target, which channel and when, campaign type, what not to do, segment size. Below, the next campaign ranked.

How the personas are built: first by rules on CRM fields (residence, work sector, income source, units owned, lost reason) plus the channel the person actually contacts us on, counted from the timeline; later by clustering once three months of live timeline records exist. The CX manager names and approves personas; a persona nobody can act on is dropped. Personal fields are shown as persona attributes and segment sizes, never exported per person.

[Screenshot: marketing-home] The Marketing manager's portal: home, customers, runaway and personas, without conversation text or agent names.

## 8. The AI assistant

Ask in Arabic or English, by voice or text. The assistant filters people from the CRM and every channel, explains what happened, builds a corrective action plan, or a campaign brief.

The assistant is a button on every page for CX, Marketing, executives and environment managers, and the home search box sends questions to it. It understands people (leads, tenants, owners, investors, members), the six personas, the six runaway types, channels, where we failed (late, promise, channel switch, language, hand-off, detractor, repeat), environments, "similar to someone", "why did someone go quiet", and the two actions: plan and campaign.

- "People who contacted us on WhatsApp, we replied late, and they left" returns the people with the reason beside each and the channel to reach them on, from the agent they already know.
- "Cases similar to Priya" returns the same persona and runaway type.
- "Why did Rashid go quiet?" returns the journey reading.
- "Silent leads in Abu Dhabi, give me a corrective action plan" returns the people, then one action per repeated fault with its owner, and a button that creates them as proposed actions.
- "Create a campaign for tenants who did not renew" returns a brief: who, channel split, language, message, timing, what not to do, and a button that saves it for Marketing.

[Screenshot: assistant] The assistant with a result list, each person with "reach via", and a corrective action plan ready to be created as proposed actions.

Two engines. When the portal runs inside claude.ai and the viewer allows it, Claude turns the free-text request into the filter and confirms in the same language; the first call asks the viewer's permission. Otherwise a built-in Arabic and English keyword parser does the same with no connection. The header says which is running. Results come from the same registers the pages use, so no number in the assistant differs from the portal.

Voice uses the browser's speech recognition (Chrome and Edge) in the portal's language; press the microphone, speak, and the request runs when you stop. On browsers without it the microphone is hidden and typing remains.

## 9. What the terms mean

A "?" beside every metric and heading, a "What the terms mean" button on every page, and the glossary.

Each definition says what the term is, how it is calculated and gives an example. NPS: one question, "how likely are you to recommend PSI", 0 to 10; 9 and 10 promoters, 7 and 8 passives, 0 to 6 detractors; NPS is % promoters minus % detractors, from −100 to +100; 50% promoters and 18% detractors give +32. CSAT: one question about one moment, 1 to 5; the share who answered 4 or 5. NPS asks about the relationship; CSAT about one moment.

[Screenshot: terms-pop] The "?" beside a metric opens its definition in place.

[Screenshot: terms-modal] "What the terms mean": the full list with search, for the moment someone asks in a meeting.

| Term | Short meaning |
|---|---|
| Mystery shopper score (MPS) | Share of checklist items met in approved visits, 0 to 100; only approved standards are scored |
| App CSAT | Average in-app rating 1 to 5; a 1 or 2 counts as a detractor |
| Signal | Any complaint, low score, breach or rating from any channel, counted not worked |
| Pattern | Signals past a threshold; one pattern gets one corrective action |
| 30-day check | Thirty days after an action is done the same signals are counted again; dropped means effective |
| Hand-off | A one-customer fix that another system owns; recorded and checked, no clock |
| Runaway | A person who left, went quiet, froze or did not renew; six types |
| Persona | A group of customers who behave alike, built from the CRM and the timeline |
| Omnichannel | One record per person with every channel on it; many channels that know each other |

## 10. Settings and reference

The earlier modules, now folded under one menu entry. Opened for planning and configuration, not every day.

### Overview and Monthly CX pack

The Overview opens with the customers-and-runaways strip and the signals-and-actions strip (the same four numbers as the Signals page), then NPS, CSAT, responses, mystery shop score and open shopper cases, NPS by month and by channel, the product-by-channel heatmap and why detractors are unhappy. The Monthly CX pack is the one page for the management meeting, with the same numbers, the shopper cases by environment and product, what AI Insights found and whether past fixes worked. The pack downloads as CSV.

[Screenshot: overview] Overview for the CX manager with the Wallet switched on for planning.

[Screenshot: report] Monthly CX pack.

### Mystery shopper and the standards register

The programme runs two scenario types: a short walk-in with no lead, and a long full journey with a lead and 14 days of follow-up through digital channels and calls. Wave 1 is a baseline: shoppers record what they see and nothing is scored except two critical rules (no information or promise outside the approved sheets, no contact outside official channels); standards are set from the exercise. The standards register holds 26 standards (M-01 to M-26) with status observe only, draft or approved and scored; items under a non-approved standard are excluded from the score. Checklists are tied to scenarios and distribution requires a branch or gallery. L&D owns the fifteen people-facing standards and edits them; only the CX manager approves a standard for scoring.

[Screenshot: shopper] Mystery shopper: pipeline, checklists, scenarios and distribution.

[Screenshot: standards] Standards register: 26 standards, 20 observe only, 4 draft, 2 approved and scored, by area, with the owner on each.

### Voice of Customer

Survey results by product and channel, with the survey definitions per product (including a draft investor survey for the Wallet). Digital channels are rated only when a lead opens.

[Screenshot: voc] Voice of Customer.

### L&D: training, materials and standards

The L&D manager (Learning and Development, previously called OD) sees only the corrective actions and L&D requests that need training, a material or a standard, the complaint types in its area (script, dress code, communication skills, product knowledge, outdated materials), the training materials and sessions, and which complaint types each one covers. L&D requests can be raised from any case or action.

[Screenshot: ld-dashboard] The L&D dashboard.

### Teams and structure, Settings, AI Insights access

Teams and structure shows who is involved in each function and product (titles, not names), the authority matrix, routing and what the CRM provides (environments and pools are fixed in the CRM). Settings holds the launch list (which products are live), the HR pool and the notices heads receive. AI Insights access is the CX manager's matrix of who sees what (section 2).

[Screenshot: teams] Teams and structure.

[Screenshot: settings] Settings: the launch list, with PSI Wallet switched on for planning.

## 11. Products

Six products, two live. Not-launched products stay out of the menu, the entry page and the filters until the CX manager switches them on.

| Product | Status | What the portal covers |
|---|---|---|
| PSI Real Estate | Live | Sales journey from enquiry to booking: leads, viewings, bookings, the PSI mobile app |
| After-Sales | Live | Handover, snagging, finishing, payments, maintenance and renewals (PSI Assets rental) |
| PSI Club | Not launched | VIP and influencer lead nominations; its own escalation matrix handles late steps, the portal reads the breach log as signals |
| Tour Estate | Not launched | Tours, guides, drivers and cars; has its own CX team |
| PSI Events | Not launched | Launches, investor evenings and VIP events |
| PSI Wallet | Not launched (pilot) | The investor's portfolio in one place: properties across countries, documents, cash flow and AI suggestions |

[Screenshot: product-re] PSI Real Estate product page.

PSI Wallet was added on 9 November, built like PSI Club. Its page shows the pilot numbers (investors onboarded, properties added, documents uploaded with failed uploads, suggestions acted on, NPS), what investors ask the Wallet team, four complaint types with owners (upload and sync failures and suggestion complaints to the Wallet product team; wrong value or cash flow to the account manager; privacy worries to the Wallet team with Legal as backup), a draft investor survey, and what the Wallet sends to the portal. Wallet events sit on the investor's timeline as a channel, so a failed upload followed by a call to the agent shows as a forced channel switch. The overseas investor and portfolio owner personas list the Wallet as a channel.

[Screenshot: product-wallet] PSI Wallet product page.

## 12. Data and integration: phase one

How the five pages get live data. Summary of the Phase One Omnichannel Integration Plan (separate document, 9 November 2026).

**Per channel, not per product.** The same CRM, WhatsApp number and call engine serve every product, and one person moves across products, so each channel is connected once and every record carries product, environment and agent as attributes. Adding a product later is configuration.

**The CRM is the golden record.** It is custom, holds all customer history, transactions and agent activities per lead, and can integrate. The portal reads its contacts, leads, activities, deals, units and agents; it adds what the CRM does not hold: the channel conversations, the scores, the shopper observations and the journey analysis.

| Source | What we take | Owner to ask |
|---|---|---|
| CRM: contacts, leads, activities, deals, units, agents and pools | Profile, type, environment, every activity with direction, date, agent, reason and result, deals and payment status, pools | CRM owner (IT) |
| AI call engine and IVR | Outbound calls, leads opened, hand-offs; IVR path chosen and messages left | Call center lead, AI vendor |
| WhatsApp Business (official number) and area groups | Full conversations with timestamps and replier; groups only if on the official number | IT with the WhatsApp partner, Sales ops |
| App chats (PSI app, Club app, Wallet) | Threads per account with timestamps and request ids | App product teams |
| Surveys, app ratings, mystery shopper | Scores, verbatims, visit records, critical items | CX team |
| PSI Club | Referral status, nudges, breach log (SA-1, SA-2) | Club product team |

**Identity.** The mobile number is the working key and the CRM contact id the anchor; a match on two keys merges, on one key is reviewed; old numbers stay as aliases. The IT clean-up of contacts with missing mobiles or names is a prerequisite for the mobile only. **Access.** Conversation text to the CX team and CX manager only; retention to confirm with Legal under the UAE data protection law.

**Plan.** Ten weeks from 16 November 2026 to go-live the week of 25 January 2027: unified record and schema, CRM connector (critical path), identity resolution, WhatsApp feed, AI calls and IVR logs, app chat feed, journey rules and runaways, AI reading and assistant, five pages on live data, go-live gate. Everything on the five pages is generated sample data (30 people, about 120 interactions) until then; the analysis rules are the design and run unchanged on live data.

## 13. Standards: what L&D is writing

The platform runs on written standards read by five instruments: the shopper checklist, the signal rules, the survey questions, the journey analysis and the corrective-action owners. Summary of the Standards Documentation List for L&D (10 November 2026).

L&D leads the creation, with George as head of the unit, and a champion from each environment. Every standard is written once as the PSI group standard; an environment adds a variant only where its business differs, with PSI Assets (rental) carrying most variants because a tenant's journey replaces a buyer's. Each document follows one template: the rule in one sentence, the measure and threshold, the instruments that read it, an example done right and wrong, the environment variants, exceptions, the owner who fixes a breach, the training it points to, and the effective date.

| Group | Documents |
|---|---|
| Frontline and branch | Branch and gallery presentation; meeting room and privacy; appearance and dress code; reception and greeting; waiting |
| Communication and selling | Communication; needs discovery and qualification; accurate information; approved promises and discounts; presenting a unit and closing; scripts and objection handling |
| Digital channels and chat | Official channels policy; reply time per channel; chat conduct and language; digital lead handling; app and portal service |
| Call center | Inbound call; outbound and AI caller; IVR wording and routing; complaint intake; call quality criteria |
| After-Sales and rental | Handover; snagging; maintenance request; move-in and move-out; renewal; payment and statement; off-plan construction updates |
| Follow-up and conduct | Lead follow-up; promise and callback; customer ownership and hand-off; conduct; data and privacy in customer contact |

Priority 1, before the second shopper wave (end of November): accurate information, approved promises and discounts, official channels, communication, reception and greeting, dress code. Priority 2, before live chat signals: reply time per channel, chat conduct and language, promise and callback. Priority 3, before the runaway and journey pages: lead follow-up, customer ownership and hand-off, renewal, handover.

## 14. Open items and version history

What is still to decide, and how the prototype got here.

### Open items

- Which items are critical, medium and low for the mystery shopper, with more scenario examples, to be defined with the team.
- The definition of "recovered" used in the AI recovery figures (proposed: within 30 days of closing, not reopened or escalated, and a better rating or a positive reply), to be confirmed by the CX manager.
- The thresholds that turn signals into an action (3 per agent, 5 per issue, 50% concentration, 30 days) are proposals.
- PSI Club member recovery (a detractor VIP member): a Club admin queue item or a CX call, to agree with Abu Omar.
- Whether the CRM exposes a read API or only database access; the WhatsApp partner; where the AI caller and IVR logs live.
- PSI brand colours, fonts and logo files: the portal uses placeholder navy and gold and an original logo.
- Real HR pool members and environment names; real SLA targets; call recording as a policy decision.

### Version history

| Version | Date | What changed |
|---|---|---|
| v19 | 2 Nov 2026 | Prototype approved to go to development after changes; first knowledge base |
| v24 | 6 Nov | New design and logo, regrouped menu, Teams and structure, standards register, two scenario types, OD role and dashboard |
| v25 to v28 | 6 Nov | AI percentages explained in full; relevant cases only; AI Insights per role with the access matrix; more demo data |
| v29 to v31 | 6 Nov | Signals and corrective actions replace cases; hand-offs; shopper cases only; one set of numbers everywhere |
| v32 | 7 Nov | OD renamed to L&D |
| v33 to v35 | 7 to 9 Nov | Omnichannel rebuild: customer journey, runaway customers, personas and campaigns, AI assistant; simplified to one search and four pages |
| v36 to v37 | 9 Nov | What the terms mean; PSI Wallet product |
| This document | 11 Nov 2026 | Knowledge base rewritten for v37 |
