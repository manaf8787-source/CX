# PSI CX Portal: Knowledge Base (v38, omnichannel with the intelligent CX team)

Prototype on sample data. Version 38, updated 17 Nov 2026. The illustrated version (60 screenshots) is the Word and PDF document; screenshot names are listed as [Screenshot: name].

## Contents

- 1. What the portal is now
- 2. Who uses it and what each one sees
- 3. Home: one search
- 4. Customers: the journey of one person
- 5. Runaway customers
- 6. Actions: corrective actions, signals, AI insights, shopper cases, investigations
- 7. Close the loop
- 8. Personas and campaigns
- 9. Surveys and triggers: when we ask, and the lead funnel
- 10. Sources and public channels
- 11. The intelligent CX team: ten agents and a supervisor
- 12. The rules: five decisions as configuration
- 13. The AI assistant
- 14. What the terms mean
- 15. Settings and reference
- 16. Products
- 17. Data and integration: phase one
- 18. Standards: what L&D is writing
- 19. Open items and version history

## 1. What the portal is now

One place where every customer signal becomes a corrective action, and the owner who fixes it. Version 38, prototype on sample data; nothing is sent.

The portal was rebuilt around the customer on 7 to 11 November 2026 and completed on 12 to 17 November with the rules layer, the close-the-loop page, the surveys page and the intelligent CX team. It is an **omnichannel** platform: one record per person (lead or customer), every contact from every channel on one timeline, read by rules and by AI to say what happened, who is leaving and why, and what to fix. The earlier modules (mystery shopper, standards, voice of customer, L&D, structure) still exist and sit under Settings and reference.

### The one rule that runs the portal

Everything that hurts a customer arrives as a **signal**: a complaint, a low score, a missed deadline, a bad rating, from any channel. A signal is counted, not worked one by one; the system that owns it (CRM, PSI Club, support) handles the customer. When signals form a **pattern** (same agent three times, same issue five times, or more than half from one environment, within 30 days, on a sample of at least ten), the portal proposes one **corrective action** with an owner, a due date and a 60-day check. A fix is only ever **suggested**; the responsible manager approves, changes, rejects or asks for an investigation first, and nothing starts without that yes. The only things that open a case directly are a critical item seen by the **mystery shopper** (a false promise, an unofficial channel) and a legal, privacy or safety signal, even once. Every detractor gets a human call from the CX team and a re-survey; that is the **close the loop** page. Ten single-task AI agents and one supervisor do the daily work behind these pages; people approve, read the customers' words, see names and call customers.

> Why: before this rule, the same complaint arrived twice, once through the product's own escalation (for example the PSI Club matrix) and once as a portal case. Now each product keeps its own correction, and the portal fixes the cause.

### The seven pages

| Page | Question it answers | Who uses it |
|---|---|---|
| Home | Who or what do you want to know? One search box for a name, a mobile, an ID or a question in your own words | Everyone with portal access |
| Customers | What happened to this person, over the years, on every channel, and what should we do next? | CX, environment managers, Marketing (no conversation text) |
| Runaway customers | Who left, went quiet, froze or did not renew, by type, and what did we do wrong? | CX, environment managers, Marketing, executives |
| Actions | What are we fixing, why, and did it work? Corrective actions, with signals, AI insights, shopper cases and investigations as tabs | CX, environment managers, team leads, L&D, HR |
| Close the loop | Which unhappy customers do we call this month, what did they tell us, and did they recover? | CX team and CX manager |
| Personas and campaigns | Who are our customers and leads, and who should Marketing target next, on which channel? | CX, Marketing, executives |
| Surveys | Where in the journey do we ask, what, how often, and what came back, per product? | CX, product teams, Marketing |

[Screenshot: landing] The entry page: one card per user type. Each opens the portal as that role.

What stays out of the menu because the direction does not use it: the After-Sales call desk, the call center desk and IVR simulation, the survey engine, the suggestions log, the demo walkthrough and the build specification. The code is kept; they are out of the menu.

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
| Internal Audit and Marketing Lead (UAE) | Overview, Intelligent CX team, Personas, Runaway, Standards, Monthly pack, Settings | Aggregates and audit views: data feeds, standards, personas, campaign criteria, the weekly supervisor sample; no cases, no conversation text, no agent names | Mark feeds and standards as trusted, audit personas and campaign criteria, fill the escalation matrix with the product owners, read the weekly sample of agent outputs |
| Executive (read only) | Home, Customers, Runaway, Actions, Personas, Overview, Monthly pack | Everything, read only, no agent names | Nothing (informed) |
| Mystery shopper | Own tasks only | Briefs, deadlines, forms | Fill the forms, ask questions |

> Standing rules: cases are assigned to the people concerned, never to top management; heads and C-level are informed only. Agent names show only to CX and to the agent's own management. Conversation text (WhatsApp, app chat, CRM notes) is readable by the CX team and the CX manager only. Other teams (L&D, HR, IT, Legal, Marketing, product owners) are receivers: they get a fix or a signal, handle it their own way, and the portal takes back only a status.

[Screenshot: audit-home] The Internal Audit and Marketing Lead's portal: the overview and the audit views, without cases, conversation text or names.

[Screenshot: insacc] AI Insights access: the CX manager's matrix of which role sees which categories, environment, names and actions. Changes apply at once.

## 3. Home: one search

The home page is one box. A name, a mobile number, an ID or a unit opens the person; a question in your own words goes to the assistant.

[Screenshot: home] Home for the CX manager: the search box, example requests, and five live numbers (runaway, open actions, personas, journeys, to call), each a button.

**What each user does**

- **CX team and manager:** Type a key to open a journey, or a question to get a list, a plan or a campaign from the assistant; the "To call" tile opens Close the loop
- **Marketing:** Same box; results come without conversation text or agent names
- **Environment manager:** Same box; results limited to its own environment

[Screenshot: home-ar] The same page in Arabic. Every page of the portal is bilingual with full right-to-left layout.

## 4. Customers: the journey of one person

One record per person, lead or customer, with every contact from every channel in date order, each marked with its source, and an AI reading of what happened and what to do next.

The search stitches the record by mobile number, email, Emirates ID and CRM contact id. The page shows the CRM profile (type, environment, units and deals, where they live, where they work, income source, preferred channel, language, persona, VIP tag for PSI Club members), four effort tiles (interactions, contacts in 90 days, problems found, days since last contact), the AI reading, and the timeline.

[Screenshot: journey-top] Rashid, an investor since 2016 with three units: profile from the CRM, persona, and the effort tiles.

### The AI reading

Four parts, every sentence pointing at a dated event on the timeline: who the person is and how many years and channels the record covers; what went wrong, in date order; a verdict (healthy, high effort, or one of the six runaway types); and what to do next. The AI did not listen to calls, because agent calls are not recorded; it read the CRM activity log, the chats and the scores. This reading is Agent 7 (section 11).

[Screenshot: journey-ai] The AI reading for Rashid: passed between teams twice in 2021, a passive score in 2022, no contact for 14 months. Verdict: dormant owner. Next: an account manager call about rental management, which he asked for and never got.

### The timeline and the source badge

Every event carries a **source badge**: PSI Website, PSI Real Estate app, WhatsApp, call, IVR, branch, email, survey, mystery shopper, PSI Club, PSI Wallet, events, Tour Estate, and the public channels (Facebook, Instagram, LinkedIn, Google). The website and the app are two named sources on every record, never merged, so a web user and an app user can be told apart in every count; they are sources, not products. Each event shows the date, the source, who started it (customer or PSI), the reason, the outcome, any promise with its due time, and the message text where the viewer may see it. Problem events are highlighted: promise not kept, forced channel switch, repeat within 48 hours, slow reply, wrong language, hand-off, detractor. Interview and re-survey events from Close the loop sit on the same timeline.

[Screenshot: journey-timeline] The timeline, newest first, filtered by channel, each row with its source badge. Highlighted rows are the problems the rules found.

[Screenshot: journey-problems] Below the timeline: Problems found and Channels used, folded by default.

[Screenshot: journey-priya] Priya, a lead lost to a competitor: an unapproved discount, a manager callback never made, a 53-hour WhatsApp reply, then closed lost.

### The journey rules

| Rule | What it means |
|---|---|
| Repeat contact | The same person comes back about the same matter: within 48 hours the first answer failed; within 7 days the fix was incomplete; within 30 days the problem came back |
| Forced channel switch | The customer moved to another channel after getting no reply on the first |
| Promise not kept | A callback, document or date was promised and nothing went out before its due time |
| Slow reply | A WhatsApp or app chat reply took more than 24 hours; any click or expression of interest must be answered in minutes or hours, never days |
| Wrong language | A reply in English to an Arabic message, or the reverse |
| Hand-off | Passed between teams twice or more with no named owner |
| IVR complaint not logged | Pressed Complaints in the IVR and no CRM activity followed |
| Unapproved discount | A discount promised in chat without approval, then withdrawn |
| Silence | No contact either way for 14 days (lead: the "What stopped you?" question goes out once), 30 days (silent lead) or 12 months (owner or investor) |

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

The thresholds (14 days, 30 days, 12 months) are settings. The order of learning agreed with the CX manager: leads that went quiet first, then tenants who did not renew, then owners who stopped dealing with PSI. The lead funnel on the Overview and Surveys pages (section 9) shows where leads stop, so a runaway type can be read against the stage it happened at.

[Screenshot: env-runaway] The same page for the Dubai environment manager: only Dubai people.

## 6. Actions: corrective actions, signals, AI insights, shopper cases, investigations

One page for what we are fixing, why, and whether it worked. Corrective actions are the main tab; signals and patterns, AI insights, shopper cases and investigations are the other four.

### Corrective actions

One action per pattern, with one owner, a due date and a 60-day check. Flow: Proposed (by Agent 5, by CX, or by the assistant) → Approved and assigned within 5 working days (the responsible manager; the CX manager for anything cross-team) → In progress (owner) → 60-day verification → Effective (the same signals dropped by half or more and did not return for 90 days), Partial, or Failed, which reopens the signal. Corrective fixes a cause that already hurt customers; preventive stops a cause before it does. A proposed action can also be rejected with a reason, or sent to investigation first.

[Screenshot: actions] The register: proposed, open, late, effective, and the list with owner, due date and status.

Every action carries a panel "How the AI found this": the sources and dates, the rule that fired with its threshold, where, who (names only for roles allowed to see them), why this team, why this action (recovered in X of N similar closed cases), and what the AI did not do. The same panel appears on every pattern card, so an L&D manager or an environment manager can judge a suggestion without asking CX.

[Screenshot: action-detail] CA-203 as the L&D manager sees it: the payment plans sheet and AI script, with "How the AI found this" open.

### Classification: the kind of problem decides who gets it

Every action is classified into one of eight kinds, and the kind decides the path and the receiver. The receiver handles it their own way; the portal takes back only a status, and Agent 6 checks the result. Who exactly, by title, comes from each product's escalation matrix (section 12).

| Kind | What it looks like | Path and receiver |
|---|---|---|
| Employee | One staff member keeps appearing (attitude or speed, three times in 30 days) | A management note to that agent's direct manager only; never a case, never HR, never a name outside that line |
| Service and behaviour | A team's way of working (late callbacks across an office) | A fix for the team's manager to approve; the head is informed |
| Training gap | Staff do not know something (the same wrong answer in three offices) | L&D and the environment champion: a standard, a material or a session |
| Product and app | The app or the website (uploads failing, a form that loses the lead) | A request to the product owner and IT, with the evidence |
| Process | A step or a hand-off between teams (handover dates never confirmed) | Whoever owns that process |
| Environment | A place, not a person (no private room in one branch) | The branch or office manager |
| Legal and privacy | A customer's details shared on a group, a document sent to the wrong person: even once | Straight to Legal as a case, the CX manager informed |
| Marketing | A group of customers to win back (investors abroad who went quiet after one call) | The Internal Audit and Marketing Lead first, then Marketing |

[Screenshot: action-class] The classification block on an action: the kind, the path, who receives it and what comes back.

### Signals and patterns

Every complaint, low score, breach, rating and public mention from every source lands here as a signal, counted not worked. The Patterns tab shows the groups that passed a threshold, with the signals behind them, the team involved, the AI suggestion and its recovery figure, and a button to create the action. The Rules tab holds the thresholds, now editable as configuration under Settings: same agent 3 times, same issue 5 times, more than 50% from one environment, within 30 days, on at least 10 records. Public mentions from Facebook, Instagram, LinkedIn and Google are signals too, with a "public" badge; they are never surveyed and never tied to a person unless the person identifies themselves.

[Screenshot: signals-patterns] Patterns over a threshold, each with its signals, the team involved, the AI suggestion and the action it already has.

[Screenshot: signals-public] Public mentions in the signal list: the source badge, the public reply clock (48 hours) and no customer record behind them.

[Screenshot: signals-rules] Rules and thresholds, with the definitions that make the model work.

### Hand-offs

A correction for one customer that another system owns: a do-not-call flag in the CRM, a recovery call, a PSI Club member recovery item (to agree with Abu Omar). The portal records where it went and checks it was done; no clock runs here.

[Screenshot: signals-handoffs] Hand-offs with their status and the hand-off rules by signal type.

### AI Insights

The AI reads the scored records (surveys, shopper scores, app ratings, call reviews) and finds where the low scores concentrate: one pattern per category and environment, with a service and a time band. Each suggested corrective action shows its recovery figure in full: "tried in 14 similar closed cases, the customer recovered in 10, 10 of 14 is 71%", a bar, and a small-sample warning under 10 cases. A panel "How to read these percentages" defines similar, recovered, the two limits, and the difference from the headline concentration figure. Suggestions become proposed corrective actions; "Send to a case" exists only for shopper cases in the same category.

[Screenshot: insights] An AI Insights pattern with its suggested actions, each explained in full.

> Two registers, two numbers: AI Insights reads scores and ratings; Signals counts complaints, breaches and mentions. A low score becomes a signal only when it is also a complaint, a breach, a critical shopper item or a public mention. The page says so.

### Shopper cases

Only the mystery shopper and a legal or privacy signal open a case directly. A shopper finding is placed on a three-step scale (Decision 2): **critical** (a false promise, an unofficial channel, a privacy breach) opens a case the same day, with one working day to respond and five to resolve; **medium** (a standard missed, a visit scoring under 60%) becomes a signal; **low** goes to L&D as statistics. Cases keep the full flow: CX triage with numbered proposed actions, the owner decides on each line, HR pool for conduct, the agent's direct manager reviews HR's actions. Agent 4 does the placing; in phase two it also proposes where to shop next from the open signals.

[Screenshot: shopper-cases] Shopper cases: the case list with its clocks and the case detail with proposed actions.

### Investigations

When the evidence behind a pattern is thin, the portal does not guess a fix. The Investigate tab lists the weak signals (same issue, under the sample floor or with no clear cause) and offers two ways to learn more before an action: request five customer interviews (Close the loop picks the people) or request a mystery shopper check of that environment and scenario. The result comes back as evidence on the pattern, and only then is a fix proposed.

[Screenshot: investigate] Investigate: the weak signals and, for each, interviews or a shopper check.

[Screenshot: investigate-form] Requesting a mystery shopper check: environment, scenario and what to look for.

## 7. Close the loop

Every detractor gets a human call from the CX team, a reason code and a re-survey. The page lists who to call this month, holds the interview, and runs the AI calling campaigns the team chooses to create.

**Who** (Decision 3). Every customer scored as a detractor (NPS 0 to 6, CSAT 1 or 2, CES at the worst end) or who complained goes on the list, critical ones first. Agent 8 ranks them and checks the month's capacity: people × hours per day × 4 calls per hour × working days; in the sample, 420 calls against 16 detractors, so everyone is called. **How**: a person from the CX team calls, by default. The brief is prepared by the agent (what happened, in date order, from the timeline), and the interview is four questions: what happened, what did you expect, what would have made it right, may we come back to you. The caller picks a reason code (slow or no reply, promise not kept, wrong or missing information, attitude, paperwork or hand-off, app or website, price or payment plan, nothing suitable, had to switch channels, other) and an outcome (reached, resolved on the call, declined, asked for a call back). Declined means no retry.

[Screenshot: loop-list] Close the loop, the list: who to call this month, with the score, the reason, the status and the capacity line.

[Screenshot: loop-interview] One interview: the brief written by Agent 8 from the timeline, then the four questions.

[Screenshot: loop-interview-form] The interview form: reason code (suggested from the timeline, chosen by the caller), outcome, notes, and the re-survey date.

### Re-survey and recovered

Seven to fourteen days after the resolution, the same question goes out again. This re-survey is exempt from the survey caps and reports a **recovery delta** (the first score against the second). A customer counts as **recovered** when, within 60 days, one of these is true: a rating of 4 or 5, an NPS of promoter or passive, a transaction, a renewal or a new lead, or a new contact without a complaint. The interview and the re-survey appear on the person's timeline.

### AI interview campaigns

Humans call by default. The CX team may create an **AI interview campaign** for part of the list: a segment, a script in English and Arabic written by the team, and the hand-off rules: the customer hangs up or does not answer twice → needs a human; asks for a person or says anything critical → a human the same day; declines → no retry. Critical detractors are never in a campaign. The campaign results come back as the same reason codes, so human and AI interviews count together.

[Screenshot: loop-camps] AI interview campaigns: one running, one closed with its results, and the people handed to a human.

[Screenshot: loop-campform] Creating a campaign: segment, script in both languages, hand-off rules, capacity.

> Why humans first: the interview is where the CX team hears the customer's own words and codes the cause. The AI campaign is a capacity tool the team switches on, not the default.

[Screenshot: loop-ar] Close the loop in Arabic.

## 8. Personas and campaigns

Who our customers and leads are, built from what they did, said and scored, not from assumptions. Each persona carries a recommendation to Marketing.

| Persona | Who | Main pain | Channels they use |
|---|---|---|---|
| Overseas investor | Lives abroad, business owner, buys off-plan for yield | Wrong payment plan details; silence between milestones | PSI Wallet, WhatsApp, email |
| First-time expat buyer | Salaried, works in the UAE, buying a home | Handover slipped with no call; repeat questions unanswered | App chat, calls, WhatsApp |
| Local family renter | Tenant in PSI Assets, uses the app for maintenance | Maintenance request lost; app request not visible | App chat, calls |
| Portfolio owner | Several units, delegates to an assistant | Passed between After-Sales and Assets; statement errors | PSI Wallet, email, account manager calls |
| Comparison shopper | Lead talking to several brokers, wants the best price | Slow WhatsApp reply; wrong language; discount promised then withdrawn | WhatsApp, website |
| Referral-driven member | PSI Club member who refers friends (VIP tag) | No update on a nominated lead; commission late | Club app, WhatsApp |

[Screenshot: personas] The six personas with size and runaway count, and the selected persona's description, pain and the channels its people actually use.

[Screenshot: personas-marketing] Recommendation to Marketing for the selected persona: who to target, which channel and when, campaign type, what not to do, segment size. Below, the next campaign ranked.

How the personas are built: first by rules on CRM fields (residence, work sector, income source, units owned, lost reason) plus the source the person actually contacts us on, counted from the timeline; later by clustering once three months of live timeline records exist. The CX manager names and approves personas; the Internal Audit and Marketing Lead audits them and the campaign criteria; a persona nobody can act on is dropped. Personal fields are shown as persona attributes and segment sizes, never exported per person.

[Screenshot: marketing-home] The Marketing manager's portal: home, customers, runaway and personas, without conversation text or agent names.

## 9. Surveys and triggers: when we ask, and the lead funnel

Decision 5: ask only after something meaningful, never on a public channel, never more than the caps, and one line per product. Agent 10 watches for the moment and sends.

### The lead funnel: who completes, and why the rest do not

The funnel is the frame for every transactional survey. In the sample, 9,000 leads became 7,400 contacted (an agent call over two minutes), 2,100 viewings, 640 offers and 150 signed deals; 12 deals are frozen. Each stage shows its source split (PSI Website, PSI Real Estate app, PSI Club, WhatsApp, CRM) and the reasons people stopped, from the "What stopped you?" question and the interviews. NPS is asked only of the 150 who completed; the 8,850 who did not are asked other things, at the stage they stopped.

[Screenshot: overview-funnel] The lead funnel on the Overview: five stages, the source split, and why they stopped.

### When we ask, and when we never ask

| Moment | Question | Rule |
|---|---|---|
| Enquiry on the website or app | None | Measured by the reach index (reply time, channels needed), not by a survey |
| Agent call over 2 minutes, viewing, offer | CSAT + CES on one screen | Once per 30 days per person; inside the window the portal keeps the most important touchpoint: viewing over offer over call |
| Lead silent for 14 days | "What stopped you?" | Once, then never again for that enquiry |
| Abandoned digital step (upload, booking, payment) | CES | Identified users only; never on the public site |
| Deal completed, lease signed, handover done | NPS (transactional) | Only after a completed milestone; once per 90 days per person |
| Maintenance or complaint ticket closed | CES | After the closure message |
| Owner or investor, yearly | NPS (relationship) | Once a year, not inside the 90-day window of a transactional NPS |
| Detractor, 7 to 14 days after resolution | The same question again | Exempt from the caps; reports the recovery delta |
| Facebook, Instagram, LinkedIn, Google | Never | Public reply within 48 hours; the mention is a signal and feeds the public reputation index |

[Screenshot: surveys] Surveys and triggers: the stages, the instruments and what each one asks.

[Screenshot: surveys-instruments] The instruments: NPS, CSAT + CES, "What stopped you?", the re-survey and the call survey, each with its trigger, cap and sample numbers (sent, answered, skipped).

### Per product, no group number

Each product has its own NPS, CSAT and CES line and its own moments; there is no group NPS by design, because Tour Estate, PSI Club and PSI Events are separate businesses with different customers. PSI Real Estate asks after the call, the viewing, the offer and the signed deal. After-Sales asks after handover, a closed ticket and renewal. PSI Club leads ride the Real Estate journey with a VIP tag; members get a member NPS at the end of a nomination cycle. Tour Estate asks the end-of-tour survey only after a completed tour (driver, guide, ride, car, cleanliness, then NPS); the stop survey goes to the commercial team, not to the portal. PSI Events has no NPS: an external QR rating at the booth and an internal staff evaluation. PSI Wallet (pilot) asks CES after a failed or completed upload and an investor survey, draft.

[Screenshot: surveys-products] By product: the same rule, different moments. Each product on its own line.

[Screenshot: product-re-surveys] On the PSI Real Estate product page: "When this product asks", with the moments and the caps.

> Agent 10 (Survey triggers and delivery) watches every person's events, sends the right instrument at the right moment in the person's language on the channel they used, applies the caps and the priority inside the window, and logs sent, answered and skipped, with the reason for every skip. Nothing is sent in the prototype.

## 10. Sources and public channels

Where feedback comes from, which of it belongs to a person, and how the public channels are read without ever surveying them.

| Source | Identified? | What the portal does with it |
|---|---|---|
| PSI Website | Yes once a lead opens; otherwise anonymous | A named source on every record; enquiries, abandoned steps, chat |
| PSI Real Estate app | Yes (signed in) | A named source on every record; chat, ratings, abandoned steps, CES |
| WhatsApp Business and area groups | Yes (mobile number) | Full conversations, reply times, promises; conversation text for CX only |
| Calls, AI caller, IVR | Yes | Outcomes, hand-offs, IVR path; agent calls are not recorded |
| Branch, email, surveys, mystery shopper | Yes | Visits, scores, verbatims, critical items |
| PSI Club app, PSI Wallet, Tour Estate, Events | Yes | Each product's own events and surveys, on its own line |
| Facebook, Instagram, LinkedIn, Google | No, unless the person identifies themselves | Signals with a public badge; public reply within 48 hours; the public reputation index; never a survey, never merged into a person's record |

**Why the public channels are never surveyed.** A comment on Instagram cannot be tied to a customer, a stage or an agent with any confidence, so an NPS question there would measure nothing and annoy everyone. Instead the mention is counted as a signal (Agent 3), answered in public within 48 hours by the channel owner, and summarised in the **public reputation index**: volume, share negative, average rating where the channel has one (Google), reply rate and time, by channel and month. If the person then writes to us on WhatsApp or the app, the two meet on the timeline as a forced channel switch.

[Screenshot: overview-reputation] The public reputation index on the Overview: mentions, share negative, Google rating, reply time, per channel.

**Website against app.** The two are separate sources because the people differ: a website visitor is usually earlier in the journey and often not yet identified; an app user has signed in and can be asked CES after an abandoned step. The funnel, the signals and the product lines all show the two side by side, and no number mixes them.

## 11. The intelligent CX team: ten agents and a supervisor

Ten single-task AI agents do the daily work of the pages above; a supervisor checks every output before it moves on; people approve, read, see names and call. This is the CX portal's part of the company direction of one AI team per function.

[Screenshot: agents] The intelligent CX team page: the path every event walks, from intake to the report, with the supervisor between every two steps.

| Agent | Task | Runs | In | Out | Approval |
|---|---|---|---|---|---|
| 1 Intake and matching | Turn every interaction from every source into one event on one person; match by mobile, email, ID, CRM id | Continuous; feed reconciliation nightly | CRM, WhatsApp, calls, IVR, app and web, surveys, shopper, public feeds | One event with source, direction, time, person | None; a one-key match is queued for a person |
| 2 Classification | Give each event one category, one reason code, product, environment and agent id, with the quoted evidence | Continuous after Agent 1; low-confidence re-run nightly | The event and its text | Category, reason, impact, evidence quote | None; under 70% confidence goes to the CX team |
| 3 Signals and patterns | Decide when repeated events become a signal, find where it concentrates, set the impact; compute the public reputation index | After every classification; full recount nightly | Classified events, the thresholds | Signals, patterns, the index | None; thresholds are configuration |
| 4 Mystery shopper severity | Place each shopper finding on the critical, medium, low scale; open a case the same day for critical. Phase two: propose where to shop next | On each visit result (phase two) | Visit forms, the standards register | Severity, case or signal or L&D stat | CX triage on every case |
| 5 Corrective action and routing | For every open signal over the line, propose an action grounded in what worked before, classify it, route it by the matrix; request an investigation when the evidence is thin | On each new or re-opened signal | The pattern, closed actions, the matrix | A proposed action with owner, due date, classification, "how the AI found this" | Always: the responsible manager approves, changes, rejects or investigates within 5 working days |
| 6 Verification | Run the action clock, measure whether each done action worked at 60 days, mark each customer recovered or not | Daily 06:00 and on every status change | Actions, signals, events after the action | Effective, partial, failed; recovered flags; the recovery delta | None; a failed action reopens the signal for a person |
| 7 Journey, runaway and personas | Read one person's record and write the reading; find who is drifting; build and refresh the personas | On search; nightly for changed people; weekly persona refresh | The timeline, CRM profile, scores | The AI reading, runaway type, persona | The CX manager approves personas |
| 8 Close the loop | Decide who the CX team calls this month within capacity, prepare each brief, code each interview; run the AI campaigns the team creates | On each detractor; capacity run on the 1st; on each submitted interview | Detractors, capacity, interviews | The call list, briefs, suggested codes, campaign results | The CX team creates campaigns; critical never in a campaign |
| 9 Reporting | Produce the monthly management report and the role summaries from the same computed figures the pages show, one line per product, no names | First working day of the month; on demand | Every register | The Monthly CX pack, role summaries | The CX manager releases it |
| 10 Survey triggers and delivery | Watch every person's events, send the right instrument at the right moment, apply the caps and priorities, log sent, answered, skipped | On every event; daily 09:00 for time-based triggers | Events, the survey rules, the caps | Sent surveys, skips with reasons | None; the rules are configuration |

[Screenshot: agents-roster] The roster: each agent with its stage (shadow, limited, live, phase 2), its last run and its pass rate at the supervisor.

[Screenshot: agents-jd] One agent opened: the job description in nine fields (task, runs, in, out, rules, model, supervisor checks, escalation, where it shows).

### The supervisor

Between every two agents there is one supervisor with six checks, the same for every agent: schema (required fields present); recompute (every count, window, rate and lookup redone in code, not trusted from the agent); access (no conversation text, no names, audience limits); evidence (a different model ties every claim to an evidence item); bilingual (English and Arabic carry the same claims); risk gate (critical, legal, privacy or external effect always goes to a person). The outcomes are pass, send back once naming the failed check, or hand to a person. Checks 1, 2, 3 and 6 are code, not a model; only check 4 uses a model, and a different one from the worker.

[Screenshot: agents-supervisor] The supervisor card: the six checks, the pass rate per agent, and the weekly sample.

> Every week the CX team and the Internal Audit and Marketing Lead read 50 passed outputs by eye; every miss becomes a new test for the supervisor. The full specification for developers is the separate document "CX Portal AI Agents: Specification".

### How it is switched on

| Stage | What happens | Exit |
|---|---|---|
| Shadow | Agents run on real data but only suggest; the CX team does the work by hand and compares | Agreement 9 in 10 for two weeks |
| Limited | Fixes really go to managers, in one environment, for four weeks; nothing reaches a customer without a person's approval | No critical miss in the weekly sample |
| Live | All launched products; the weekly sample continues | Ongoing |

[Screenshot: agents-ar] The intelligent CX team in Arabic.

## 12. The rules: five decisions as configuration

The rules layer agreed on 12 to 16 November 2026. Every number below is a setting under Settings, "Rules as configuration", changed by the CX manager without a developer. The full text is the separate document "CX Portal: Rules and Definitions".

| Decision | Rule | Value |
|---|---|---|
| 1 Signals | A signal becomes a pattern when the same issue repeats, or the same agent, or one environment concentrates it, within the window, on a minimum sample; legal, privacy and safety need one occurrence | 30 days; 5 same issue; 3 same agent; 50% concentration; sample ≥ 10 |
| 2 Mystery shopper | Three severities; critical opens a case the same day; medium is a signal; low is an L&D statistic; a visit under the floor is medium | Respond 1 working day; resolve 5; floor 60% |
| 3 Recovered and worked | Approve within the approval window; verify at the verification window; effective when the signals drop by the threshold and do not return for the hold period; recovered as defined in section 7; re-survey after resolution; interviews human by default, AI campaigns by the team's choice; capacity = people × hours × 4 × working days | Approve 5 working days; verify 60; recovered within 60; hold 90; drop 50%; re-survey 7 to 14 days |
| 4 Escalation matrix | One template, one set of principles; the product owners fill the cells with the Internal Audit and Marketing Lead by 28 November; the matrix decides who, by title, receives each kind of action | Template and principles agreed; cells pending |
| 5 Feedback coverage | NPS only after a completed milestone plus a yearly relationship NPS; CSAT + CES after a meaningful interaction; "What stopped you?" once after silence; CES on abandoned identified steps and closed tickets; public channels never surveyed; each product its own line; website and app two named sources | NPS cap 90 days; CSAT/CES cap 30 days; priority viewing > offer > call; silence 14 days; public reply 48 hours |

[Screenshot: settings-config] Settings, "Rules as configuration": every threshold of the five decisions, editable in place.

### The escalation matrix: template and principles

One table per product: rows are the eight kinds of action (section 6) and the two case types (shopper critical, legal); columns are first receiver, informed, backup, and the response and resolution clocks in working hours. Principles: the receiver is the person who can fix it, never top management; heads and C-level are informed only; an employee kind goes to the direct manager and nowhere else; legal goes to Legal first; anything touching a customer's contact goes through the CX team; every cell names a title, not a person, and the CRM supplies who holds the title. The product owners fill the cells with the Internal Audit and Marketing Lead.

## 13. The AI assistant

Ask in Arabic or English, by voice or text. The assistant filters people from the CRM and every channel, explains what happened, builds a corrective action plan, or a campaign brief.

The assistant is a button on every page for CX, Marketing, executives and environment managers, and the home search box sends questions to it. It understands people (leads, tenants, owners, investors, members), the six personas, the six runaway types, sources, where we failed (late, promise, channel switch, language, hand-off, detractor, repeat), environments, "similar to someone", "why did someone go quiet", and the two actions: plan and campaign. It reads the same registers as the ten agents and never computes a number of its own.

- "People who contacted us on WhatsApp, we replied late, and they left" returns the people with the reason beside each and the source to reach them on, from the agent they already know.
- "Cases similar to Priya" returns the same persona and runaway type.
- "Why did Rashid go quiet?" returns the journey reading.
- "Silent leads in Abu Dhabi, give me a corrective action plan" returns the people, then one action per repeated fault with its owner, and a button that creates them as proposed actions.
- "Create a campaign for tenants who did not renew" returns a brief: who, channel split, language, message, timing, what not to do, and a button that saves it for Marketing.

[Screenshot: assistant] The assistant with a result list, each person with "reach via", and a corrective action plan ready to be created as proposed actions.

Two engines. When the portal runs inside claude.ai and the viewer allows it, Claude turns the free-text request into the filter and confirms in the same language; the first call asks the viewer's permission. Otherwise a built-in Arabic and English keyword parser does the same with no connection. The header says which is running.

Voice uses the browser's speech recognition (Chrome and Edge) in the portal's language; press the microphone, speak, and the request runs when you stop. On browsers without it the microphone is hidden and typing remains.

## 14. What the terms mean

A "?" beside every metric and heading, a "What the terms mean" button on every page, and the glossary.

Each definition says what the term is, how it is calculated and gives an example. NPS: one question, "how likely are you to recommend PSI", 0 to 10; 9 and 10 promoters, 7 and 8 passives, 0 to 6 detractors; NPS is % promoters minus % detractors, from −100 to +100. CSAT: one question about one moment, 1 to 5; the share who answered 4 or 5. CES: "how easy was it", 1 to 7 or 1 to 5; the share at the easy end. NPS asks about the relationship or a completed milestone; CSAT about one moment; CES about effort.

[Screenshot: terms-pop] The "?" beside a metric opens its definition in place.

[Screenshot: terms-modal] "What the terms mean": the full list with search, for the moment someone asks in a meeting.

| Term | Short meaning |
|---|---|
| Mystery shopper score (MPS) | Share of checklist items met in approved visits, 0 to 100; only approved standards are scored |
| App CSAT | Average in-app rating 1 to 5; a 1 or 2 counts as a detractor |
| Signal | Any complaint, low score, breach, rating or public mention from any source, counted not worked |
| Pattern | Signals past a threshold; one pattern gets one proposed corrective action |
| 60-day check | Sixty days after an action is done the same signals are counted again; dropped by half and not back in 90 days means effective |
| Recovered | Within 60 days: a 4 or 5, a promoter or passive, a transaction, renewal or new lead, or a new contact without a complaint |
| Recovery delta | The re-survey score against the first score, 7 to 14 days after resolution |
| Close the loop | The human call to every detractor, the reason code and the re-survey |
| Intelligent CX team | Ten single-task AI agents and one supervisor; people approve and call |
| Survey trigger | The event that makes Agent 10 send one instrument, under the caps |
| Public reputation index | Volume, share negative, rating, reply rate and time on Facebook, Instagram, LinkedIn and Google, by month |
| Reach index | How easy it was to reach us: reply time and the number of channels a person needed |
| Hand-off | A one-customer fix that another system owns; recorded and checked, no clock |
| Runaway | A person who left, went quiet, froze or did not renew; six types |
| Persona | A group of customers who behave alike, built from the CRM and the timeline |
| Omnichannel | One record per person with every source on it; many channels that know each other |

## 15. Settings and reference

The earlier modules, now folded under one menu entry. Opened for planning and configuration, not every day.

### Overview and Monthly CX pack

The Overview opens with the customers-and-runaways strip and the signals-and-actions strip, then the indicators per product (NPS, CSAT, CES, responses, open actions, each product on its own line, no group number by design), the lead funnel, the public reputation index, NPS by month and by channel, the product-by-channel heatmap and why detractors are unhappy. The Monthly CX pack is the one page for the management meeting, with the same numbers, the shopper cases by environment and product, what AI Insights found and whether past fixes worked; Agent 9 writes it on the first working day. The pack downloads as CSV.

[Screenshot: overview] Overview for the CX manager.

[Screenshot: overview-products] Indicators per product: each product on its own line, and "Group NPS: none, by design".

[Screenshot: report] Monthly CX pack.

### Mystery shopper and the standards register

The programme runs two scenario types: a short walk-in with no lead, and a long full journey with a lead and 14 days of follow-up through digital channels and calls. Wave 1 is a baseline: shoppers record what they see and nothing is scored except two critical rules (no information or promise outside the approved sheets, no contact outside official channels); standards are set from the exercise. The standards register holds 26 standards (M-01 to M-26) with status observe only, draft or approved and scored; items under a non-approved standard are excluded from the score. L&D owns the fifteen people-facing standards and edits them; only the CX manager approves a standard for scoring. The severity scale and the Agent 4 placing are phase two.

[Screenshot: shopper] Mystery shopper: pipeline, checklists, scenarios and distribution.

[Screenshot: standards] Standards register: 26 standards by area, with the owner and the status on each.

### Surveys and triggers, Voice of Customer

Surveys and triggers (section 9) sits here as the reference page for the instruments and the caps; the short "Surveys" entry in the main menu opens the same page. Voice of Customer keeps the results by product and channel, with the survey definitions per product; the public channels show as "never surveyed".

[Screenshot: voc] Voice of Customer.

### L&D: training, materials and standards

The L&D manager (Learning and Development) sees only the corrective actions classified as training gap and the L&D requests that need training, a material or a standard, the complaint types in its area (script, dress code, communication skills, product knowledge, outdated materials), the training materials and sessions, and which complaint types each one covers. Low shopper findings arrive here as statistics.

[Screenshot: ld-dashboard] The L&D dashboard.

### Intelligent CX team, Teams and structure, Settings, AI Insights access

The Intelligent CX team page (section 11) lives here. Teams and structure shows who is involved in each function and product (titles, not names), the authority matrix, routing and what the CRM provides. Settings holds the launch list (which products are live), the HR pool, the notices heads receive, and "Rules as configuration" (section 12). AI Insights access is the CX manager's matrix of who sees what (section 2).

[Screenshot: teams] Teams and structure.

[Screenshot: settings] Settings: the launch list and the rules as configuration.

## 16. Products

Six products, two live. Not-launched products stay out of the menu, the entry page and the filters until the CX manager switches them on. Each product has its own survey moments and its own line of numbers; nothing is combined.

| Product | Status | What the portal covers | When it asks |
|---|---|---|---|
| PSI Real Estate | Live | Sales journey from enquiry to signed deal: leads, viewings, offers, bookings; sources PSI Website and PSI Real Estate app | CSAT + CES after a call over 2 minutes, a viewing or an offer (30-day cap, viewing > offer > call); NPS after the signed deal; "What stopped you?" at 14 days silent |
| After-Sales | Live | Handover, snagging, finishing, payments, maintenance and renewals (PSI Assets rental) | NPS after handover and after renewal; CES after a closed maintenance or complaint ticket; relationship NPS yearly for owners |
| PSI Club | Not launched | VIP and influencer lead nominations; leads ride the Real Estate journey with a VIP tag; its own escalation matrix handles late steps, the portal reads the breach log as signals | Member NPS at the end of a nomination cycle; leads follow the Real Estate moments |
| Tour Estate | Not launched | Tours, guides, drivers and cars; has its own CX team | End-of-tour survey only after a completed tour (driver, guide, ride, car, cleanliness, NPS); the stop survey goes to the commercial team |
| PSI Events | Not launched | Launches, investor evenings and VIP events | No NPS; external QR rating at the booth; internal staff evaluation |
| PSI Wallet | Not launched (pilot) | The investor's portfolio in one place: properties across countries, documents, cash flow and AI suggestions | CES after an upload (failed or done); investor survey, draft |

[Screenshot: product-re] PSI Real Estate product page, with its own indicators and the sources split between website and app.

PSI Wallet was added on 9 November, built like PSI Club. Its page shows the pilot numbers, what investors ask the Wallet team, four complaint types with owners (upload and sync failures and suggestion complaints to the Wallet product team; wrong value or cash flow to the account manager; privacy worries to the Wallet team with Legal as backup), a draft investor survey, and what the Wallet sends to the portal. Wallet events sit on the investor's timeline as a source, so a failed upload followed by a call to the agent shows as a forced channel switch.

[Screenshot: product-wallet] PSI Wallet product page, switched on for planning.

## 17. Data and integration: phase one

How the pages get live data. Summary of the Phase One Omnichannel Integration Plan (separate document, 9 November 2026), extended with the public feeds and the agents.

**Per source, not per product.** The same CRM, WhatsApp number and call engine serve every product, and one person moves across products, so each source is connected once and every record carries product, environment, agent and source as attributes. Adding a product later is configuration.

**The CRM is the golden record.** It is custom, holds all customer history, transactions and agent activities per lead, and can integrate. The portal reads its contacts, leads, activities, deals, units and agents; it adds what the CRM does not hold: the conversations, the scores, the shopper observations, the public mentions, the interviews and the journey analysis.

| Source | What we take | Owner to ask |
|---|---|---|
| CRM: contacts, leads, activities, deals, units, agents and pools | Profile, type, environment, every activity with direction, date, agent, reason and result, deals and payment status, pools | CRM owner (IT) |
| AI call engine and IVR | Outbound calls, leads opened, hand-offs; IVR path chosen and messages left; the AI interview campaigns | Call center lead, AI vendor |
| WhatsApp Business (official number) and area groups | Full conversations with timestamps and replier; groups only if on the official number | IT with the WhatsApp partner, Sales ops |
| PSI Website and PSI Real Estate app | Enquiries, chat threads, abandoned steps, ratings, each marked with its source | Web and app product teams |
| Surveys, app ratings, mystery shopper | Scores, verbatims, visit records, critical items; sent, answered, skipped from Agent 10 | CX team |
| Facebook, Instagram, LinkedIn, Google | Public mentions and ratings, reply time; no personal matching | Marketing, with the Internal Audit and Marketing Lead |
| PSI Club, PSI Wallet, Tour Estate, Events | Referral status and breach log; Wallet events; completed tours; booth ratings | Each product team |

**Identity.** The mobile number is the working key and the CRM contact id the anchor; a match on two keys merges, on one key is reviewed; old numbers stay as aliases; public mentions are never matched unless the person identifies themselves. **Access.** Conversation text to the CX team and CX manager only; retention to confirm with Legal under the UAE data protection law.

**Plan.** The base (omnichannel integration, the L&D standards and the rules layer) comes before the platform: Decide 11 to 28 November; Base 1 December to 29 January; Build and pilot 1 February to 26 March; Scale 29 March to 7 May; then Run. The agents go through shadow, limited and live inside Build and pilot. Everything on the pages is generated sample data until then; the rules are the design and run unchanged on live data.

## 18. Standards: what L&D is writing

The platform runs on written standards read by five instruments: the shopper checklist, the signal rules, the survey questions, the journey analysis and the corrective-action owners. Summary of the Standards Documentation List for L&D (10 November 2026).

L&D leads the creation, with George as head of the unit, and a champion from each environment. Every standard is written once as the PSI group standard; an environment adds a variant only where its business differs, with PSI Assets (rental) carrying most variants because a tenant's journey replaces a buyer's. Each document follows one template: the rule in one sentence, the measure and threshold, the instruments that read it, an example done right and wrong, the environment variants, exceptions, the owner who fixes a breach, the training it points to, and the effective date.

| Group | Documents |
|---|---|
| Frontline and branch | Branch and gallery presentation; meeting room and privacy; appearance and dress code; reception and greeting; waiting |
| Communication and selling | Communication; needs discovery and qualification; accurate information; approved promises and discounts; presenting a unit and closing; scripts and objection handling |
| Digital channels and chat | Official channels policy; reply time per channel (minutes or hours for any click or interest, never days); chat conduct and language; digital lead handling; app and portal service; public reply within 48 hours |
| Call center | Inbound call; outbound and AI caller; IVR wording and routing; complaint intake; call quality criteria; the detractor interview script |
| After-Sales and rental | Handover; snagging; maintenance request; move-in and move-out; renewal; payment and statement; off-plan construction updates |
| Follow-up and conduct | Lead follow-up; promise and callback; customer ownership and hand-off; conduct; data and privacy in customer contact |

Priority 1, before the second shopper wave (end of November): accurate information, approved promises and discounts, official channels, communication, reception and greeting, dress code. Priority 2, before live chat signals: reply time per channel, chat conduct and language, promise and callback. Priority 3, before the runaway and journey pages: lead follow-up, customer ownership and hand-off, renewal, handover.

## 19. Open items and version history

What is still to decide, and how the prototype got here.

### Open items

- The escalation matrix cells per product, to be filled by the product owners with the Internal Audit and Marketing Lead by 28 November.
- The customer journey stages per service (buying, renting, investing, listing) to be confirmed with Marketing from the Customer Journey Template; the funnel stages are marked proposed until then.
- Mystery shopper scenario examples per severity, with the team.
- PSI Club member recovery (a detractor VIP member): a Club admin queue item or a CX call, to agree with Abu Omar.
- Whether the CRM exposes a read API or only database access; the WhatsApp partner; where the AI caller and IVR logs live; which public channels have an export.
- For the AI team: which models for the agents and for the supervisor, and their Arabic; whether the AI caller can run the four-question script with hand-off; how to read the CRM and the transcripts; cost per thousand messages.
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
| v36 to v37 | 9 to 11 Nov | What the terms mean; PSI Wallet product; knowledge base for v37 |
| v38 | 12 to 17 Nov | Source badges and public channels; per-product lines, no group NPS; lead funnel; Close the loop with interviews, re-survey and AI campaigns; the intelligent CX team (ten agents and a supervisor); action classification and routing; investigations; rules as configuration; Internal Audit and Marketing Lead role; Surveys and triggers; per-product survey moments; Agent 10 |
| This document | 17 Nov 2026 | Knowledge base rewritten for v38 |
