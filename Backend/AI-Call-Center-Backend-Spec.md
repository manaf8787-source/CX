# AI call center (BrightCall): backend specification

**Owner:** Manaf Obeidat (Delivery & CX Manager). **Agreed:** 26 November 2026. **Status:** frontend built on sample data; backend to build.
**Frontend:** menu → "AI call center" (`/ai-calls`), CX manager and CX team only. Four tabs: Overview, Repeat contacts, Campaign links, Outcome mapping. Also: an "AI calling (BrightCall)" block on Marketing campaigns (results and audit) and under Close the loop's AI interview campaigns (`src/components/campaigns/AiCallingBlock.tsx`).
**Contract files:** `src/data/brightcall.ts` (outcome list, mapping, daily row shapes), `src/utils/aiCalls.ts` (the sums, tests in `aiCalls.test.ts`), `src/data/callSurveyRule.ts` (the portal call results), `src/data/campaignLinks.ts` (campaign types and links), `src/data/contactTouches.ts` and `src/utils/contactRepeats.ts` (the contact attempt index and the repeat counts, tests in `contactRepeats.test.ts`).
**Related:** `Call-Survey-Rule-Backend-Spec.md` (the survey after a call reads the mapping below).
**Source system:** BrightCall AI Dashboard (`aidashboards.psiwebs.com`), reviewed with the owner on 26 Nov. Read-only: the portal never changes anything in BrightCall.

## 1. The main decision: overall numbers only

The portal does **not** copy call records, recordings or transcripts. BrightCall already shows those, and loading them made the page slow.

The portal stores and shows **daily totals**. Three small tables replace hundreds of thousands of call rows:

- one row per day × environment × campaign × outcome
- one row per day × environment × campaign for the drop buckets and the sentiment split
- one row per campaign for its target list size and progress

**The only exception is per-call events:** BrightCall sends them only for the few calls the portal must act on:

- calls whose outcome maps to a result that sends the CSAT + CES survey (appointment, follow-up, successful)
- calls with a complaint outcome ("Angry Bird"), which become complaint signals

At today's volumes that is a few hundred a month, against about a million calls.

**Added on 26 Nov:** a narrow contact attempt index (one line per attempt, 7 fields, no recordings or text) for the Repeat contacts tab; see section 10. Only that tab reads it, so the Overview stays fast.

## 2. What we read from BrightCall

### 2.1 Daily outcome totals (`AiCallDailyRow`)

| Field | Type | Notes |
|---|---|---|
| `date` | YYYY-MM-DD (Gulf time) | |
| `envId` | `dub` \| `auh` \| `ast` \| `ai` | BrightCall's Environment filter: Dubai, AUH, Assets |
| `campaign` | string | BrightCall's Project Name |
| `outcome` | string | BrightCall's outcome label, exactly as sent (section 4) |
| `contacts` | integer | Distinct contacts with this outcome that day |
| `calls` | integer | Calls with this outcome that day |
| `cost` | decimal (AED) | As shown in "Outcome Performance" |

### 2.2 Daily extras (`AiCallDailyExtra`)

| Field | Notes |
|---|---|
| `date`, `envId`, `campaign` | As above |
| `drops.within_20s` | BrightCall bucket "Dropped within 20s": the hang-up at the AI greeting |
| `drops.after_1min` | "Dropped after 1 min" |
| `drops.positive_then_dropped` | "Interactive + Positive then Dropped" |
| `sentiment.positive`, `.neutral`, `.negative` | Answered calls by BrightCall's sentiment |

### 2.3 Campaign totals (`AiCampaignTotals`)

| Field | Notes |
|---|---|
| `campaign`, `envId` | |
| `targeted` | Contacts on the campaign list ("number of targeted customers") |
| `attempted` | Contacts tried at least once, whatever the result ("progress") |
| `startedOn` | First call date |

### 2.4 Per-call events (only the ones the portal acts on)

These events use the "call ended" shape in `Call-Survey-Rule-Backend-Spec.md` section 2. They are sent only when the outcome maps to a result in the survey rule's `sendOn`, or when the outcome is marked `complaint`. Each event includes:

- `callId`, `endedAt`, `direction`, `handledBy` (AI or human), `campaign`, `outcome`
- `talkSeconds`, `phone`, `sentiment`
- a link to the recording in BrightCall (a URL only; the portal does not store the file)

## 3. How to get it

Options, in order of preference (to confirm with Ahmad Kudair):

1. **BrightCall API:** aggregated endpoints by day, environment, campaign and outcome, plus a webhook for the per-call events in 2.4.
2. **The dashboard's own database or webhook:** the dashboard already lists "Dashboard Webhook Test" and "Dashboard Routing Check" campaigns, so a webhook exists. Read-only access to its aggregates.
3. **Scheduled export:** an hourly CSV of the day's totals (sections 2.1 to 2.3) to a shared location.

**Refresh:** every hour for today's totals; a nightly re-run of the previous 2 days, because BrightCall can re-classify an outcome after the call. The page shows the time of the last refresh.

**History:** load 90 days on the first run; keep daily totals for 2 years (to confirm with Legal).

## 4. Outcome mapping (BrightCall → portal)

Every BrightCall outcome maps to one portal call result and one group. The CX manager can change the result per outcome (Outcome mapping tab), and every change is audited.

A new outcome that BrightCall starts sending and nobody has mapped yet counts as "Other answered result". It is also listed in a warning on the Outcome mapping tab until it is mapped.

**Groups:**

| Group | Meaning | In the call count |
|---|---|---|
| `answered` | The customer picked up | Yes |
| `no_answer` | Not answered, voicemail, busy, invalid or wrong number | Yes |
| `dropped` | Picked up and hung up | Yes |
| `not_called` | Blocked before dialling (DNCR, not in the CRM) | No; shown apart |
| `excluded` | Test and unknown | No |

**Default mapping:**

| BrightCall outcome | Group | Portal call result | Survey | Also |
|---|---|---|---|---|
| Scheduled Meeting | answered | Appointment booked | CSAT + CES | Lead |
| Interested to attend | answered | Appointment booked | CSAT + CES | Lead |
| Interested, Follow Up Later | answered | Follow-up agreed | CSAT + CES | Lead |
| Interested, Later | answered | Follow-up agreed | CSAT + CES | Lead |
| Considering | answered | Follow-up agreed | CSAT + CES | Lead |
| Interested | answered | Successful call | CSAT + CES | Lead |
| Interested in other project | answered | Successful call | CSAT + CES | Lead |
| Interested Seller | answered | Successful call | CSAT + CES | Lead |
| Interested to rent | answered | Successful call | CSAT + CES | Lead |
| Qualified Transfer | answered | Successful call | CSAT + CES | Lead |
| Transferred | answered | Successful call | CSAT + CES | Lead |
| Unit Sold | answered | Successful call | CSAT + CES | Lead |
| Not Interested / Not interested now / Not Interested Now | answered | Not interested | – | |
| Angry Bird | answered | Not interested | – | Complaint signal |
| Call Back Later / Call back later | answered | Asked to call back later | – | |
| Not Qualified, Not Qualified Transfer, Low Budget, Price Concern, Hesitated, Broker, Gatekeeper, Language Barrier, No Dialogue, WhatsApp, Whats app, Receive Marketing | answered | Other answered result | – | |
| Dropped Calls | dropped | Dropped after the AI greeting | – | Uses the `within_20s` bucket for the greeting rate |
| Dropped Transfer | dropped | Other answered result | – | |
| No Answer | no_answer | No answer | – | |
| Voicemail | no_answer | Voicemail | – | |
| Busy | no_answer | Busy | – | |
| Wrong Number, Invalid Numbers | no_answer | Wrong number | – | |
| DNCR UAE Blocked, No DNCR Status on CRM, DNCR Check Unavailable, Not Existing Contact on CRM | not_called | Not a call (blocked) | – | |
| Test Call, Unknown, Pending | excluded | Left out | – | |

The survey column is not stored. It is derived from the survey rule's `sendOn`, so switching a result on or off there changes it here.

**Compliance:**

- The survey also requires an existing CRM contact and a clear DNCR check, so blocked outcomes can never send one.
- BrightCall already blocks DNCR numbers before dialling. The portal reads that result and does not check again for these calls.

**Leads:** counted in calls, the same as BrightCall's "Leads generated", so the two dashboards agree.

## 5. The numbers on the Overview tab

Filters:

- **Period:** 7, 30 or 90 days, or a custom from-to range (both dates included, Gulf time). The endpoint takes `from` and `to` (YYYY-MM-DD) and rejects `from` after `to`. The range can reach back as far as the daily totals are kept (2 years).
- **Environment:** the user's environment scope applies first.
- **Campaign.**

| Number | Formula |
|---|---|
| Targeted customers | Σ `targeted` of the campaigns in the filter |
| Progress | Σ `attempted` ÷ Σ `targeted` |
| Calls | Σ `calls` where group is answered, no_answer or dropped |
| Answer rate | answered calls ÷ calls |
| Dropped calls | dropped calls; rate = dropped ÷ calls; "at the AI greeting" = Σ `drops.within_20s` |
| Leads generated | Σ `calls` of outcomes marked lead; rate = leads ÷ answered calls |
| Cost (AED) | Σ `cost` of all outcomes; cost per lead = cost ÷ leads |
| Can get the CSAT + CES survey | Σ `contacts` of outcomes whose result is in the survey rule's `sendOn` |
| Angry customers | Σ `contacts` of outcomes marked complaint |
| Blocked before the call | Σ `calls` in group not_called (shown apart) |

The page also shows:

- **Call split:** answered, not answered and dropped, plus the blocked count.
- **Dropped calls:** the three drop buckets.
- **Sentiment:** positive, neutral and negative for answered calls.
- **By call result:** calls, contacts, share, and whether the result sends the survey.
- **Campaigns:** targeted, progress, calls, answer rate, drop rate at the greeting, leads and cost per lead.
  - Drop rate at the greeting = `within_20s` ÷ (answered + `within_20s`).
  - Flagged amber at 30% and red at 40%.

**Performance:** one endpoint returns the whole Overview for a filter. It sums the daily tables in the database (indexed on date, environment and campaign) and returns in under 1 second for 90 days. The response follows `AiCallSummary` in `src/utils/aiCalls.ts`.

## 6. Signals and other pages

- **Angry Bird:** each per-call event creates a complaint signal for the matched CRM contact (Problems and fixes, Signals). It carries the campaign, the call ID and the recording link. If the contact is not in the CRM, the signal is counted but not linked.
- **Survey after a call:** reads the mapping and the per-call events (see `Call-Survey-Rule-Backend-Spec.md`).
- **Marketing audit:** cost and cost per lead per campaign can be read from the same daily tables.
- **Customer timeline:** shows only the per-call events in 2.4, each with a link to the recording in BrightCall, not every call.

## 7. Access

- Page: CX manager and CX team.
- Editing the mapping: CX manager. Every change is written to the audit log.
- No customer names or phone numbers appear on this page. The per-call events that carry a phone number follow the existing masking rules.

## 8. Needed from the AI call center team (Ahmad Kudair)

- The full list of outcome codes, and whether they change. Today about 45 are visible on the dashboard.
- Which access method in section 3 they can offer, with a test environment or a sample day.
- Whether `targeted` and `attempted` per campaign are available from the API.
- Whether the AI quality evaluation (QA score and critical flags) is in BrightCall. It was not visible on the Overview screen, and the survey rule uses it when present.
- Confirmation that DNCR blocking happens before dialling for every campaign.

## 9. Campaign types and links (added 26 Nov)

Every BrightCall campaign has a type and, for customer campaigns, a link to the portal campaign it belongs to.

| Type | Meaning | In the customer numbers | Links to |
|---|---|---|---|
| `marketing` | AI calling for a Marketing campaign | Yes | The Marketing campaign code (`MKT-YYYY-NNN`), the same tag the CRM leads carry |
| `cx_interview` | Close the loop interview calls | Yes | The Close the loop AI campaign id |
| `hr` | Recruitment and other HR calling | No | – |
| `test` | Tests and internal checks | No | – |

- **Table:** `campaign_link(brightcall_campaign, kind, linked_to, changed_by, changed_at)`. The CX manager edits it (AI call center → Campaign links), and every change is audited.
- **Automatic link:** when the BrightCall campaign name or a campaign field contains a code matching `MKT-\d{4}-\d{3}`, the backend links it on first sight. Ask PSI to put the code on every new BrightCall campaign. The manual links are for older campaigns.
- **Unlinked customer campaigns:** listed with a warning on the Campaign links tab, because their calls and cost are missing from Marketing campaigns.
- **New BrightCall campaign:** it arrives as `marketing`, not linked, until the CX manager sets it.
- **Overview filter:** "Customer campaigns" (marketing + cx_interview) is the default. Each type can also be shown alone, or every type together.
- **On Marketing campaigns (results and audit),** for a campaign with linked BrightCall campaigns:
  - calls, answer rate, drops at the AI greeting, leads from AI calls, AI calling cost
  - customers called 2+ times
  - cost per lead including AI calls = (campaign budget + AI calling cost) ÷ (CRM leads + AI call leads)
- **Under Close the loop,** the same numbers for each linked interview campaign.

## 10. Contact attempt index and repeat contacts (added 26 Nov)

The owner wants to see who was contacted again and again, inside one campaign and across campaigns. There is **no contact limit**: the portal only shows it. This also feeds the personas later (how each person answers each channel).

**Data: one compact line per attempt.** No recordings, no transcripts, no message text.

| Field | Notes |
|---|---|
| `crm_contact_id` | Matched from the phone number; attempts to numbers not in the CRM are counted but not listed by person |
| `env_id` | |
| `at` | Date and time (UTC; shown in Gulf time) |
| `campaign` | BrightCall campaign, or the Marketing campaign code for a message |
| `channel` | `ai_call` (BrightCall), `whatsapp`, `sms`, `email` (marketing platform, for the same campaign) |
| `status` | BrightCall outcome code for a call; `delivered`, `read`, `replied` or `failed` for a message |
| `duration_sec` | Calls only |

**Sources:**

- AI calls: BrightCall call log (API or export), one line per call attempt. The recording link stays in BrightCall.
- Messages: the marketing platform's send log per campaign and recipient.
- Retention: 13 months, to confirm with Legal.

**Volume and speed:** about a million call attempts a year. The table is narrow (7 columns) and indexed on (env_id, at), (campaign, at) and (crm_contact_id). The Overview never reads it; only the Repeat contacts tab does.

**Endpoints:**

- `GET /ai-calls/repeats/summary?from&to&env&kinds&campaign` returns:
  - customers contacted and total attempts
  - customers contacted 2+ times in one campaign
  - customers reached by 2+ campaigns, and by 3+
  - the most attempts on one customer
  - for each campaign, the customers contacted 2+ times by it (shown in the Overview campaigns table)
- `GET /ai-calls/repeats?from&to&env&kinds&campaign&min=2&page&size=20` returns customers ordered by attempts. Each row has:
  - name, or CRM id for roles that cannot see names
  - environment and persona
  - total attempts, attempts per channel, and attempts per campaign
  - the most attempts in one campaign, and the last attempt
- `GET /ai-calls/repeats/{crm_contact_id}?from&to&kinds` returns every attempt of that customer, newest first. It is loaded only when the person is opened.

**Masking:** names and mobiles follow the existing rules. A role without names sees the CRM id.

## 11. Acceptance tests

The cases in `src/utils/aiCalls.test.ts` must hold for the backend sums too:

- answered + not answered + dropped = calls
- blocked and test outcomes are not in the calls
- the environment filter narrows the totals and the campaigns
- every BrightCall outcome is mapped exactly once
- a from-to range counts only the days inside it
- repeat contacts (`src/utils/contactRepeats.test.ts`): attempts per customer, per channel and per campaign; repeats inside one campaign and across campaigns; the date range and the campaign set are respected
