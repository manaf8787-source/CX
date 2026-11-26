# AI call center (BrightCall): backend specification

**Owner:** Manaf Obeidat (Delivery & CX Manager). **Agreed:** 26 November 2026. **Status:** frontend built on sample data; backend to build.
**Frontend:** menu → "AI call center" (`/ai-calls`), CX manager and CX team only. Two tabs: Overview, and Outcome mapping.
**Contract files:** `src/data/brightcall.ts` (outcome list, mapping, daily row shapes), `src/utils/aiCalls.ts` (the sums, with tests in `aiCalls.test.ts`), `src/data/callSurveyRule.ts` (the portal call results).
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

- **Period:** 7, 30 or 90 days.
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

## 9. Acceptance tests

The cases in `src/utils/aiCalls.test.ts` must hold for the backend sums too:

- answered + not answered + dropped = calls
- blocked and test outcomes are not in the calls
- the environment filter narrows the totals and the campaigns
- every BrightCall outcome is mapped exactly once
