# PSI CX Portal: Mystery shopper workflow, backend spec

Version 1 · 24 Nov 2026 · Owner: Manaf Obeidat (Delivery & CX Manager)

The front end is built and runs on sample data. This document is what the backend has to provide so the same screens run on real data. The front end calls are in `src/services/queries.ts` (`fetchShopperCases`, `reviewShopperCase`, `decideShopperCaseAction`, `markShopperActionDone`, `advanceShopperCase`). The types are in `src/types/domain.ts` (`ShopperCase`, `ShopperProposedAction`, `ShopperVisit`), and the configuration shape is in `src/data/shopperWorkflow.ts`.

## 1. The flow (agreed 24 Nov)

1. **A visit arrives.** It comes from the shopper's form or the vendor, with its evidence, and opens a case. Status: `open`.
2. **The CX manager checks the evidence.** There are two outcomes:
   - **Approve.** The case goes to its owner. Status becomes `owner_decision`, and the first-response clock stops.
   - **Return for more evidence.** A note is required, and the case stays with the CX manager.
   - This step can be switched off in the configuration. When it is off, a new case goes straight to the owner.
3. **The owner decides each proposed action.** The owner is the environment manager of that environment by default, and this is configurable per environment. There are three decisions:
   - **Approve.** A comment is required, configurable as optional. The date that fits the action type is also required (see 4.3).
   - **Approve with changes.** A comment saying what changes is always required, and the date is required.
   - **Reject.** A comment saying why is always required. No date.
   - Conduct cases go to HR through the owner: the owner approves an "HR referral" action with the referral date. Nothing goes from the shopper to HR directly (decided 24 Nov).
4. **The owner marks each approved action done.** A note saying what was done is required.
5. **The CX manager closes the case.** This is allowed only when every action is rejected or done. Status becomes `closed`, and the resolve clock stops.

The status values are `open | owner_decision | closed`. `triaged` and `hr_review` exist in the type for older data; new cases do not use them.

## 2. Who can do what

The backend must check every rule below on the server. The front end hides buttons but must not be the only guard.

| Action | Who |
|---|---|
| See all cases | CX manager, CX team |
| See a case | Its owner (environment manager of that environment, or the configured role), once the CX check is done or switched off |
| Approve the evidence, or return it | CX manager |
| Decide a proposed action | The case owner, while the status is `owner_decision` |
| Mark an action done | The case owner |
| Close a case | CX manager, when every action is rejected or done |
| Edit the workflow configuration | CX manager |
| Informed only (read, no buttons) | Heads and C-level roles (`isInformedOnly`) |

Names of staff never appear on a case. Use a title and a reference instead, for example "Leasing consultant · AG-214" (NFR-2).

## 3. Data model

### 3.1 `shopper_case`

| Field | Type | Notes |
|---|---|---|
| id | string | e.g. `sc-401` |
| severity | `critical \| medium \| low` | A visit under the floor (`rule_shopper_floor`, 60%) is at least medium |
| category | string | `greeting`, `needs_discovery`, `pricing_disclosure`, `handover_process`, `follow_up_commitment` |
| product | ProductId | |
| env_id | `dub \| auh \| ast \| ai` | Drives the owner |
| environment | string | Short name, e.g. `PSI Assets` |
| visit_score_pct | number | |
| status | `open \| owner_decision \| closed` | |
| opened_at | datetime | The visit date |
| responded_at | datetime? | Set when the CX manager approves |
| closed_at | datetime? | |
| cx_review | object? | `{ by, at, note?, returned? }` |
| visit | object | See 3.2 |

The clocks are not stored. Derive `respond_due_at` and `resolve_due_at` as `opened_at` plus the configured days for the severity, so a change in the configuration applies to open cases.

### 3.2 `visit` (one per case)

| Field | Type |
|---|---|
| date | datetime |
| where | Bi (en/ar): branch or line |
| channel | Bi: walk-in, phone, WhatsApp, app, website chat |
| staff | Bi: title and reference, no name |
| scenario | Bi |
| shopper_note | Bi: what the shopper wrote |
| items[] | `{ label: Bi, pass: boolean, note?: Bi }`: the checklist |
| evidence[] | `{ kind: recording \| photo \| form \| chat, label: Bi, file_url }`: stored files, opened by role |

### 3.3 `shopper_action` (many per case)

| Field | Type | Notes |
|---|---|---|
| case_id, n | | |
| kind | `training \| coaching \| process \| hr \| facility` | Picks the date the owner must give |
| text | Bi | |
| why | Bi | |
| decision | `pending \| confirmed \| modified \| rejected` | |
| decision_note | string? | Required per section 1 |
| planned_for | date? | Required when it goes ahead and the kind requires a date |
| decided_by, decided_at | | |
| done_at, done_note | | `done_note` is required |

### 3.4 Audit

Every transition and decision is written to the audit log with who, when, the old value and the new value. Nothing is deleted.

## 4. Configuration (CX manager, Settings → Rules as configuration → Mystery shopper workflow)

There is one versioned document. Each save increments `version` and logs the change (`{ at, by, what }`).

```json
{
  "version": 1,
  "cxReviewRequired": true,
  "ownerByEnv": { "dub": "envmgmt", "auh": "envmgmt", "ast": "envmgmt", "ai": "envmgmt" },
  "commentOnApprove": true,
  "clocks": {
    "critical": { "respondDays": 1, "resolveDays": 5 },
    "medium":   { "respondDays": 3, "resolveDays": 10 },
    "low":      { "respondDays": 5, "resolveDays": 20 }
  },
  "remindBeforeDays": 1,
  "escalateAfterDays": 3,
  "actionKinds": [
    { "key": "training", "label": {"en":"Training","ar":"تدريب"}, "dateLabel": {"en":"Training date","ar":"موعد التدريب"}, "dateRequired": true, "active": true },
    { "key": "coaching", "label": {"en":"Coaching","ar":"توجيه"}, "dateLabel": {"en":"Session date","ar":"موعد الجلسة"}, "dateRequired": true, "active": true },
    { "key": "process",  "label": {"en":"Way of working","ar":"طريقة العمل"}, "dateLabel": {"en":"In place by","ar":"مطبّق بحلول"}, "dateRequired": true, "active": true },
    { "key": "hr",       "label": {"en":"HR referral","ar":"إحالة للموارد البشرية"}, "dateLabel": {"en":"Referred to HR on","ar":"تاريخ الإحالة"}, "dateRequired": true, "active": true },
    { "key": "facility", "label": {"en":"System or facility fix","ar":"إصلاح نظام أو مرفق"}, "dateLabel": {"en":"Fixed by","ar":"يُصلح بحلول"}, "dateRequired": true, "active": true }
  ]
}
```

- `ownerByEnv` values are `envmgmt`, `teamlead` or `aslead`. For `envmgmt`, the owner is the environment manager of that environment only.
- The severity floor stays a numeric rule (`rule_shopper_floor`, 60%) in Decision 2.
- The old numeric rules `rule_shopper_respond` and `rule_shopper_resolve` are replaced by `clocks.critical`.
- The starting values (the clock days, the reminder and the escalation) are placeholders the CX manager confirms.

## 5. API

| Method | Path | Body | Who |
|---|---|---|---|
| GET | `/api/mystery-shopper/cases?env=` | | Scoped by role (section 2) |
| GET | `/api/mystery-shopper/cases/{id}` | | Same |
| POST | `/api/mystery-shopper/visits` | visit and checklist, evidence files, proposed actions | Shopper form or vendor (service account) |
| POST | `/api/mystery-shopper/cases/{id}/review` | `{ approve: boolean, note? }` (note required when `approve=false`) | CX manager |
| POST | `/api/mystery-shopper/cases/{id}/actions/{n}/decision` | `{ decision, note, plannedFor? }` | Case owner |
| POST | `/api/mystery-shopper/cases/{id}/actions/{n}/done` | `{ note }` | Case owner |
| POST | `/api/mystery-shopper/cases/{id}/close` | | CX manager, all actions rejected or done |
| GET | `/api/config/mystery-shopper-workflow` | | All signed-in roles (read) |
| PUT | `/api/config/mystery-shopper-workflow` | the document in section 4 | CX manager |

**Validation on the server.** These return 422 with a reason:

- Decide while the status is not `owner_decision` (or `open` when the CX check is off).
- A missing comment or date per the configuration.
- Close with an action still pending or not done.

## 6. Inbox rows and notifications (generated by the backend)

| Who | When | Row text (en) | Opens |
|---|---|---|---|
| CX manager | Case `open`, CX check on, not returned | "Mystery shopper: check the evidence · {category} · {environment} ({score}%)" | `/settings/mystery-shopper?tab=cases&case={id}` |
| Owner | Case with the owner and an action pending | "Mystery shopper: decide {n} proposed actions · {category} ({score}%)" | `/actions/shopper-cases?case={id}` |
| Owner | Approved action not done | "Mystery shopper: mark done when it happens ({n})". Flagged within `remindBeforeDays` of the planned date | same |
| CX manager | Approved action not done `escalateAfterDays` after its planned date | "Mystery shopper: {n} approved actions not marked done …" | CX link |
| CX manager | Every action rejected or done | "Mystery shopper: every action is done, close the case" | CX link |

- **Priority:** critical cases are urgent (2); the rest are normal (1).
- **Days left:** the first-response clock for the CX check, and the resolve clock for the owner.
- **Notifications:** email or push for the same rows is optional; to be decided with IT.

## 7. Open points to confirm

1. The clock values per severity, and whether the clocks count working days or calendar days. The prototype uses calendar days.
2. Where visits come from: the shopper's own form, or the vendor's export or API.
3. Who can play the evidence recordings (CX manager, the owner, HR on referral).
4. Whether the owner gets an email as well as the inbox row.
