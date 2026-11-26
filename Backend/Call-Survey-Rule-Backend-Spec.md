# Survey after a call-center call: backend specification

**Owner:** Manaf Obeidat (Delivery & CX Manager). **Agreed:** 26 November 2026. **Status:** frontend built on sample data; backend to build.
**Frontend:** Settings → Surveys → "When we ask" → "Survey after a call-center call" (`src/pages/settings/CallSurveyRule.tsx`).
**Contract files (the API must return these shapes):** `src/data/callSurveyRule.ts` (the rule), `src/utils/callSurveys.ts` (the event and the decision, with tests in `callSurveys.test.ts`), `src/data/callSample.ts` (sample events and answers).

## 1. The decision in one line

One survey (CSAT and CES on one screen) after a **completed** call-center call (AI agent or a person) that ended with **appointment booked, follow-up agreed or successful call**. Never NPS after a call. Never after a call dropped at the AI greeting.

## 2. Input: the "call ended" event

The AI call center sends one event per call, by webhook (preferred) or in a frequent batch export. Fields:

| Field | Type | Notes |
|---|---|---|
| `callId` | string | Unique per call; stored with the survey answer |
| `endedAt` | ISO datetime (UTC) | |
| `direction` | `inbound` \| `outbound` | |
| `handledBy` | `ai` \| `human` | Who held the conversation |
| `script` | string | Outbound call script or campaign; inbound IVR line |
| `result` | call result code (section 3) | The call center's code is mapped to ours in Settings (like the CRM mapping) |
| `talkSeconds` | integer | Conversation time after the greeting |
| `phone` | E.164 | Used to match the CRM contact; never shown to roles that cannot see mobiles |
| `contactId` | string, optional | Set by the backend after matching the phone to a CRM contact (4 environments) |
| `envId` | `dub` \| `auh` \| `ast` \| `ai` | From the matched contact |
| `qa` | `{ score: 0-100, critical: boolean, evaluatedAt }`, optional | Only for calls in the AI QA sample; may arrive after the call event |

## 3. Call results

| Code | Label | Can send a survey |
|---|---|---|
| `appointment` | Appointment booked | Yes (default on) |
| `follow_up` | Follow-up agreed | Yes (default on) |
| `successful` | Successful call | Yes (default on) |
| `not_interested` | Not interested | Never |
| `dropped_after_greeting` | Dropped after the AI greeting | Never |
| `no_answer` | No answer | Never |
| `busy` | Busy | Never |
| `voicemail` | Voicemail | Never |
| `wrong_number` | Wrong number | Never |

Only the three completed results can be switched on. The API rejects any other code in `sendOn`.

## 4. The rule (editable by the CX manager only)

| Setting | Default | Validation |
|---|---|---|
| `enabled` | true | |
| `sendOn` | appointment, follow_up, successful | Subset of the completed results |
| `inbound`, `outbound` | true, true | |
| `ai`, `human` | true, true | |
| `minTalkSeconds` | 30 | ≥ 0 |
| `sendAfterMin`, `sendBeforeMin` | 60, 120 | 0 ≤ after < before |
| `fromHour`, `toHour` | 9, 21 (Gulf time, UTC+4) | 0 ≤ from < to ≤ 24 |
| `criticalStops` | true | |
| CSAT + CES cap | 30 days | Shared with "How often we ask" (`rule_survey_csat_cap`), not a separate setting |

Every change is written to the audit log (who, when, old and new values). Other roles that open Surveys read the rule only.

## 5. The checks, in this order

The first failing check is the skip reason stored on the call. Same order as `decideCallSurvey`:

1. `rule_off`: the rule is switched off.
2. `not_completed`: the result is not in `sendOn`.
3. `too_short`: `talkSeconds` < `minTalkSeconds`.
4. `direction`: inbound or outbound is switched off.
5. `agent`: AI or person is switched off.
6. `not_in_crm`: the phone matched no CRM contact (existing customers only).
7. `dncr`: the number is on the UAE Do Not Call Registry (checked at send time).
8. `cap`: the contact received a CSAT + CES survey less than the cap ago (any source, not only calls).
9. `critical`: `criticalStops` is on and the call has a QA critical failure.

If all pass, the survey is scheduled.

## 6. Scheduling and sending

- **Send time:** `endedAt + sendAfterMin`. If that falls outside `fromHour`–`toHour` Gulf time, move it to `fromHour` (the same day if before it, the next day if after `toHour`). Reference: `sendTime()`.
- **Latest time:** if the send time is in the window but the job runs late, send only until `endedAt + sendBeforeMin`; after that, send at the next window opening the same as above.
- **QA arriving later:** QA is a sample, so the engine does **not** wait for it. If a critical flag arrives before the survey is sent, cancel it with reason `critical`. If it arrives after the answer, attach it to the answer.
- **Channel:** WhatsApp template first; SMS when the number has no WhatsApp or the template fails. Consent and opt-out are honoured on both.
- **One per contact:** if two qualifying calls fall inside the cap, only the first one sends. Inside the 30-day window the existing priority still applies: viewing over offer over call.
- **No NPS** is ever sent from this trigger.

## 7. Actions on skip

- `critical`: create a Close the loop item for the contact, with the call ID, the QA score and the critical reasons, assigned by the existing routing. No survey.
- `dropped_after_greeting`: no survey and no message. Counted per call script (section 9).
- All other skips: stored on the call record for the "Why a call got no survey" breakdown.

## 8. Output: the answer

Answers go into the same survey answers store as other CSAT and CES answers (`SurveyResponse`), so the product's Survey answers tab and the indicators read them. Extra fields for a call answer:

| Field | Notes |
|---|---|
| `callId`, `callResult`, `direction`, `handledBy`, `script` | From the call event |
| `qaScore`, `qaCritical` | When the call is in the QA sample (may be filled later) |
| `surveyName` | "CSAT + CES · after a call" |
| `moment` | The call result label |
| `touchpoint` | "AI agent · <script>" or the person's role |
| `handledBy` (person) | The agent's name for human calls; unset for AI calls |

A CSAT of 1-2 or a CES of 1-3 is a detractor and appears in Detractor analysis and Close the loop like any other.

## 9. Reporting (the "Last 30 days with this rule" block)

The endpoint returns, for a date range and the user's environment scope:

- Calls ended, surveys sent, answered, CSAT % satisfied (4-5), CES average (1-7).
- Count per skip reason.
- Calls, sent, answered, CSAT, CES per call result, and per AI agent versus person.
- For answered calls in the QA sample: the same per QA band (85 and over, 70 to 84, under 70).
- For outbound AI calls: calls, dropped at the greeting, and the drop rate per call script (flag at 15% amber and 25% red).

The frontend preview runs the draft rule on sample data. The backend can offer a "preview" endpoint that replays the last 30 days of call events through a draft rule before it is saved.

## 10. Access

- Edit the rule: CX manager. Read: the roles that open Surveys today.
- Call-level data with phone numbers follows the existing name and mobile masking rules.
- The audit log records rule changes and exports.

## 11. Needed from the call center (add to the integration request)

- The call-ended event with the fields in section 2, and their list of result codes to map to ours.
- QA evaluations with score, critical flag and reasons, linked by `callId`.
- Which calls are AI and which are human, and the script or campaign name.
- A test feed or a sample export of one week of calls.

## 12. Acceptance tests

The cases in `src/utils/callSurveys.test.ts` must pass against the backend decision too:

- An appointment call of 90 seconds at 12:00 Gulf time sends at 13:00.
- A call dropped at the AI greeting or ending "not interested" never sends.
- Too short, no CRM match, on the DNCR list, surveyed 12 days ago and a critical QA failure each skip with their reason. Surveyed exactly 30 days ago sends.
- Turning off outbound, AI or the rule skips with `direction`, `agent` or `rule_off`.
- A call ending at 20:30 Gulf time sends at 09:00 the next day; one ending at 06:00 sends at 09:00 the same day.
