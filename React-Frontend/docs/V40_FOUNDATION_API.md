# V40 foundation: the contract for workstreams A, B and C

Date: 18 Nov 2026 (updated the same day for the owner's confirmed decisions). Written by the foundation engineer (F0.1 and F0.2 delivered together). Read this instead of the code. The analysis is `docs/V40_DELTA.md` (section letters and F-numbers below refer to it); where it says `[Proposed]` and the owner has since decided, **`docs/DECISIONS-2026-11-18.md` wins** (section 1a lists each decision and where it is built). Everything is sample data. `[Proposed]` = suggested by the build, not confirmed by the owner; what is still `[Proposed]` is listed in section 1b.

**Integration update (18 Nov, after A, B and C).** Every stub in section 6 is replaced by its owner (the `FOUNDATION STUB` markers are gone and `routes/pages.test.ts` now asserts none is left). Section 6a lists the hooks and helpers the integration pass added or changed; sections 7 and 11 are otherwise as built. Counts now: 610 unit tests in 55 files, 334 e2e passed (section 12 keeps the hand-over figures).

**State at hand-over.** `npm run typecheck`, `npm run lint` (only the 3 known react-refresh warnings), `npm run test` (see section 12 for counts), `npm run build` are green. The e2e suite was run once at the end; section 12 lists what failed and why. Nothing is committed (the hourly task does it).

**Rules for A, B, C.** Import from these modules; do not edit foundation files except where section 13 allows. Keep every v40 value in data files. Every string goes through `t(en, ar)` or `Bi`; the completeness test scans `src/data/*.ts`, `src/lib/*.ts`, `src/utils/*.ts`, `src/services/mockData.ts`, `src/services/mockDataV40.ts` and every `t()` call. Logical CSS utilities only (`ms-`, `pe-`, `text-start`).

---

## 1. Decisions I made beyond the brief

| # | Decision | Why / effect |
|---|---|---|
| 1 | `environment: string` stays on Person, Interaction, Signal, ShopperCase, DetractorCallItem and holds the **short English label** (`'Dubai'`, `'Abu Dhabi'`, `'PSI Assets'`). A required `envId: EnvId` (`'dub' \| 'auh' \| 'ast'`) is the canonical key. | Existing pages keep compiling and showing a sensible label. For Arabic use `envNameFromShort(rec.environment)` or `envName(rec.envId)` from `data/environments.ts`. A test keeps the two in step. |
| 2 | `Pattern.id` is now the **stable key** (`same_issue:<category>`, `same_agent:<agent>`, `environment_concentration:<category>:<env>`), `Pattern.key` equals it, and `Pattern.traceId` is `PT-nnn` (hash of the key, collisions probed away). It is no longer `pat-n`. | Patterns are computed from the rules at read time (B17). A threshold edit must not detach fixes and investigations from their pattern. A fix whose pattern disappears simply has no pattern (handle `undefined`). |
| 3 | Public-mention **signals** have ids `PUB-351`, `PUB-352`, ... (prototype scheme `PUB-3nn`). The 16 rows of the Public mentions register (`PUBLIC_MENTIONS`, `PUB-301` to `PUB-316`) are a separate register. | No clash between `?sg=PUB-351` (a signal) and a mention row. `kind === 'public_mention'` now means `isPublic`, no `personId`, `eventIds = []`, `publicReplyDueAt` = occurrence + 48 h; nothing else is public. |
| 4 | `Person.sourceOfLead` is a new `LeadSource` (`'app' \| 'website' \| 'whatsapp' \| 'club' \| 'crm'`), not `ChannelId`. | F29's source filter includes "CRM", which is not a channel. |
| 5 | RP (report line of the trace) exists only for fixes with status `effective` or `failed` (V40_DELTA F10); a `partial` fix has a check (VR) but no report, and its next-step box reads "Closed with a reason; nothing further". | Literal reading of the delta. [Proposed] |
| 6 | Weekly sample: judged by `cxmgr`, `cxteam`, `auditmkt` (`canJudgeSample`). Customer names follow the one rule `canViewCustomerNames` (everyone who works with people except `auditmkt`); sample texts **never contain a name**: items about a person carry `personId` and the page resolves the name with `personLabel(person, role)`. Composition follows the prototype (every fix, 18 signals, 12 loop rows, 10 people, padded with Agent 3 counts to 50). | Composition and who judges are my choices; the rest is decided (see 1a). |
| 7 | Skipped surveys: six reasons that sum to the total (cap 2,210, not identified 640, opted out 290, DNCR 3, no consent 6, duplicate 9 = 3,158). v38's 3,140 became 3,158. DNCR = people flagged in the sample (a test keeps `DNCR_PEOPLE_IN_SAMPLE` equal to the mock). | F25. [Proposed] |
| 8 | The working week is a rule item with `days: number[]` (JS weekdays, `[1,2,3,4,5]`) and `value = days.length`. `callFrom`, `callTo` are integers (hour of day, 9 and 18). Since the 18 Nov decisions **none of these items is `[Proposed]`**; the two calling-hours items carry a `note` ("Legal to confirm the hours"), shown as a small note, not a badge. | Decided 1 and 5. |
| 9 | Returning an investigation, when the pattern has no fix, proposes a fix of kind `training_gap`, owner `'L&D manager'`, by Agent 5 "from the investigation", with a title **derived from the pattern** (not the prototype's canned brochure sentence). | The canned text is sample-specific. |
| 10 | The environment switch narrows **everything that carries an environment** (decided 18 Nov): people, signals, patterns, shopper cases, **fixes, the close-the-loop list, investigations, hand-offs, public mentions** and the Home counts. A fix or an investigation takes the environments of its pattern's signals (its own `envId` when it has no pattern; none known = shown everywhere). Not narrowed, because the sample rows carry no environment: survey rows and the indicators built on them, the agents, the non-CRM feeds. A DNCR person is never on the call list whatever the switch says. | Decided 7. |
| 11 | `AsOfBar`, `TraceHost`, the nine stub pages are **working minimal versions** (they read the real hooks), marked `// FOUNDATION STUB: owner = workstream X`. | Seams proven end to end; owners restyle or replace. |
| 12 | Sign-in (F28) is done: six main role cards, the other six in a collapsed `<details>` "Other roles used in the demo". A still owns the polish (full description text, copy). | Brief listed "6 main roles on sign-in" under foundation. |
| 13 | `/overview` renders `pages/OverviewPage.tsx` (a heading wrapper) around the existing `settings/Overview.tsx`, which gained a `hideHeader` prop. | The Overview page has no `h1` of its own. |
| 14 | `components/ui/table.tsx`: the scroll container becomes a tab stop only while it actually overflows. | Fixes axe `scrollable-region-focusable` for any table in the narrower Settings layout (it hit `/settings/surveys`). New tables in Settings need nothing extra. |
| 16 | Keep what is mounted in `Shell` light. `TraceHost` first ran five queries on every page and that stalled the sign-out transition (`startTransition(navigate + signOut)`: the click never returned in Playwright). It now reads only the URL and mounts the data hooks in an inner `SignalDialog` only while `?sg=` is present. `AsOfBar` runs one cached query and is fine. | Gotcha for A and B. A unit test (`TraceHost.test.tsx`) asserts "no `?sg=`, no query"; `e2e/auth.spec.ts` "signs out" catches a regression. |
| 15 | The mock registers are edited **in place**, so a `useMemo` over a query's `data` does not recompute after a mutation. In derived hooks use `dataUpdatedAt` as a dependency (the V40 hooks do). | Gotcha, see section 7. |

### 1a. The owner's decisions of 18 Nov and where they are built

| # | Decision | Built in |
|---|---|---|
| 1 | Working week Monday to Friday | `rule_working_days` default `[1,2,3,4,5]`, no badge; `utils/workingDays.ts` |
| 2 | Escalation matrix: one table per product, a row per fix kind (eight kinds plus the two case types); the per-complaint-category template is superseded; Real Estate has one table. **Layout is decided: no header badge.** Only a cell still at its default is `[Proposed]` (owners fill the cells by 28 Nov) | `data/escalationDefaults.ts` (the category template and its note are **removed**); `MATRIX_COPY.defaultCellsNote`; `MatrixRow.isDefault` drives the per-cell badge |
| 3 | A fix's due date = the matrix "Resolve (h)" in **working hours from approval**; an empty cell falls back to Agent 5's 14 days. The 5-working-day approval window runs from the proposal; the 60-day check from "done" | `utils/fixClock.ts` (`fixDue`, `approvalDeadline`, `approvalDaysLeft`, `verificationDue`), `addWorkingHours` in `utils/workingDays.ts`, rules `rule_work_start`/`rule_work_end` (9, 18) and `rule_fix_fallback_days` (14). **Wired into the mutations:** `useDecideCorrectiveAction` with `approved` (and `useSetFixStatus` to `approved`) writes `dueDate` and `dueSource` ('matrix' or 'fallback'); `useSetFixStatus` to `verification` (marked done) writes `verificationDueAt` = now + 60 days. `useFixDue(fix)` previews the date before approval. Seeded fixes keep their sample due dates |
| 4 | Public replies are Marketing's (channel owner), 48 hours from the approved wording; CX watches the clock and raises a signal when it is missed; the Internal Audit and Marketing Lead audits monthly. **No badge on the owner column** | `PUBLIC_REPLY_OWNER`; `PUBLIC_MENTIONS_COPY.ownerNote(hours)` and `.missedSignal`; `publicReplyBreaches()` and `usePublicReplyBreaches()`; `BriefInputs.publicMentions.overdue` |
| 5 | Calling 09:00 to 18:00 UAE time, 3 attempts for the CX team list, next attempt the following working day, WhatsApp after the last; **2 no-answers** for an AI campaign before hand-off. Both are configuration. Decided, but Legal still confirms the hours: a small note, **not** a `[Proposed]` badge | `rule_call_from`, `rule_call_to` (with `note`), `rule_call_tries`, `rule_ai_no_answers` (`RulesBag.aiNoAnswers`, `CallRules.aiNoAnswers`); `CALL_COPY.hoursNote`, `CALL_COPY.aiHandOff(n)` |
| 6 | Weekly sample: 50 outputs by Thursday, no customer names to Internal Audit, and a **"wrong" lowers the agent's pass rate** and becomes a supervisor test. No page-level badge | `utils/passRate.ts`; `useJudgeSample` writes the verdict, creates or removes the supervisor test (`MOCK_SUPERVISOR_TESTS`, `useSupervisorTests()`) and lowers or restores `AGENT_JDS[].approvalPct` in place, so **the agents page shows it with no change** (it reads `AGENT_JDS`); `useAgentPassRates()`; `AgentJobDescription.baseApprovalPct`, `wrongThisWeek`, `supervisorTests`. The formula is `[Proposed]` (see 1b) |
| 7 | The environment switch narrows everything, fixes and the call list included; exports show mobiles only to roles that may see names | decision 10 above; `utils/envScope.ts`; `canViewCustomerNames`, `canViewMobiles`, `personLabel`, `peopleCsvRows(persons, role, lang, lastContact)` (the mobile column is left out of the file for a role without the right), `data/customersList.ts` |

CRM mapping: aligned to `Documents/CRM-Field-Mapping.docx` (the AUH review of 17 Nov): `Bayut` (not `www.bayut.com`), the Media values it lists and no others (`Instagram` and `HubSpot Website` removed), the stage names it uses, and its communication and renewal-notice categories. `Website` and `www.psinv.net` stay two separate values. All rows remain `[Proposed]` until the CRM owner confirms them.

### 1b. What is still `[Proposed]`

Cells of the escalation matrix still at their default; the CRM mapping rows; survey question wording for PSI Club, Tour Estate and PSI Events; the KPI colour thresholds (no badge needed); the customer types (Buyer, Tenant, Owner, Investor, Member); the brief's line set per role; the weekly sample's composition and who judges; **the pass-rate formula** ("a wrong lowers the agent's pass rate": I take the wrong share of the agent's sampled outputs off its rate, relative, `round(base x (1 - wrong / sampled))`; the owner has not said by how much); the `RP` report line only for `effective`/`failed` fixes; sample consent flags. Removed from the `[Proposed]` list by the 18 Nov decisions: working week, matrix layout, calling hours and tries, the public reply owner, the weekly sample page, the environment switch scope.

---

---

## 2. Types (`src/types`, re-exported by `@/types`)

New file `types/v40.ts`; additions to `common.ts`, `domain.ts`, `reference.ts`, `roles.ts`.

| Type | Where | Shape (essentials) |
|---|---|---|
| `EnvId`, `EnvScope`, `Environment` | common | `EnvId = 'dub'\|'auh'\|'ast'`; `EnvScope = EnvId \| 'all'`; `Environment { id, name: Bi, short: string }` |
| `PersonSegment`, `LeadSource`, `ConsentFlags` | common | six segments; five sources; `{ dncr, whatsapp, sms, email: boolean }` |
| `Person` += | domain | `segment`, `sourceOfLead`, `consent`, `envId` |
| `Interaction`, `ShopperCase`, `DetractorCallItem` += | domain | `envId` |
| `Signal` += | domain | `envId`, `eventIds: string[]` |
| `Pattern` += | domain | `key`, `traceId` (and `id` is now the key) |
| `AuditEntry` | domain | `{ at: ISO, what: Bi, byRole: RoleId \| 'system' }` |
| `CorrectiveAction` += | domain | `proposedAt: ISO`, `product: ProductId`, `auditLog: AuditEntry[]` (oldest first), `source?: { investigationId }`, `proposedBy?: Bi`, `dueSource?: 'matrix' \| 'fallback'` (set when approval wrote the due date), `envId?` (a fix with no pattern) |
| `Investigation` += | domain | `result?: Bi`, `doneCount?: number`, `proposedFixId?: string`, `envId?` (`status` unchanged: `requested\|in_progress\|returned`) |
| `CallStatus`, `DetractorCallItem` += | domain | `'to_do'\|'no_answer'\|'needs_human'\|'done'`; `attempts`, `status`, `nextAttemptOn?`, `dueOn?` (both `YYYY-MM-DD`) |
| `RuleConfigItem` += | reference | `days?: number[]`, `proposed?: boolean`, `note?: Bi` (a small caveat, e.g. "Legal to confirm the hours") |
| `RoleDef` += `envId?`; `MainRoleId` | roles | environment management has `envId: 'dub'` |
| `StepId`, `StepDef`, `NextStep` | v40 | `StepId = 'ev'\|'sg'\|'pt'\|'ca'\|'vr'\|'rp'`; `NextStep { step, text: Bi, due?: Bi }` |
| `TraceKind`, `TraceChain` (+ `TraceEventRef`, `TraceSignalRef`, `TracePatternRef`, `TraceFixRef`, `TraceCheckRef`, `TraceReportRef`) | v40 | `TraceChain { from, events[], signals[], pattern?, fix?, check?, report?, publicMention }`, each ref carries `traceId` |
| `DataFeed`, `FeedStatus`, `FeedScope` | v40 | `DataFeed { id, env?, name, receivedAt, status: 'ok'\|'late'\|'down', rows, note }`; `FeedScope { asOf, lateCount, feeds }` |
| `MappingKind`, `MappingOption`, `MappingRow`, `CrmMapping` | v40 | `kind: 'src'\|'stg'\|'act'`; `CrmMapping { rows, options }` |
| `MatrixKind`, `MatrixField`, `MatrixCells`, `MatrixRow`, `FixMatrixLine` | v40 | ten kinds; `MatrixRow { kind, label, cells, isDefault: Record<field, boolean> }`; hours are working hours (9 = one working day) |
| `SurveyQuestionSet` | v40 | `{ product, id, name, when, questions: Bi[], proposed? }` |
| `InboxItem`, `InboxKind`, `DayChipState` | v40 | `InboxItem { id, kind, text, daysLeft: number\|null, unit: 'wd'\|'d', who: Bi\|null, priority: 0\|1\|2, target: string, critical? }` |
| `WeeklySampleItem` | v40 | `{ id, agent, kind, text, ref, personId?, verdict: boolean\|null, judgedAt? }` |
| `IndicatorSet`, `BriefInputs` | v40 | see section 7 |
| `FixDue`, `SupervisorTest`, `AgentPassRate` | v40 | `FixDue { dueAt, source: 'matrix' \| 'fallback', hours? }`; `SupervisorTest { id, fromSampleId, agent, text, createdAt }`; `AgentPassRate { agent, base, current, sampled, wrong, tests }` |
| `AgentJobDescription` += | `data/v38Reference.ts` | `baseApprovalPct`, `wrongThisWeek`, `supervisorTests` (`approvalPct` is the current figure) |

---

## 3. Data files (all `Bi`, checked by the completeness test)

| File | Exports |
|---|---|
| `data/environments.ts` | `ENVIRONMENTS`, `ENV_IDS`, `ALL_ENVIRONMENTS`, `environmentById`, `envName(scope)`, `envIdFromShort`, `envNameFromShort`, `inEnvScope(scope, envId)` |
| `data/steps.ts` | `STEPS`, `stepById`, `NEXT_LABEL`, `HOME_COPY` (h1, lede, tag), `fixNext(status, {approveDays, verifyDays})`, `actionsNext('signals'\|'investigations'\|'other')`, `CLOSE_LOOP_NEXT`, `OVERVIEW_NEXT`, `MONTHLY_PACK_BUTTON`, `journeyNext({drifting, problems})`, `TRACE_NEXT`, `TRACE_COPY` |
| `data/feeds.ts` | `FEEDS_COPY`, `FEED_STATUS` (label + tone), `lateFeedsLabel(n)`, `buildFeeds(now)`, `feedsInScope`, `summariseFeeds` |
| `data/crmMapping.ts` | `CRM_MAPPING_COPY`, `CRM_MAPPING_OPTIONS`, `CRM_MAPPING_ROWS`, `buildCrmMapping`, `mappingCounts` (counts from the data, not the prototype's sentence) |
| `data/escalationDefaults.ts` | `MATRIX_COPY` (incl. `defaultCellsNote`, `hoursHint`), `MATRIX_LINE_LABELS`, `MATRIX_KIND_LABEL`, `MATRIX_KINDS`, `MATRIX_FIELDS`, `MATRIX_KEY_BY_FIX_KIND`, `MATRIX_DEFAULTS`, `buildMatrix`. The per-complaint-category template (`ESCALATION_TEMPLATE_BY_CATEGORY`) was **removed** (superseded 18 Nov) |
| `data/surveyQuestions.ts` | `SURVEY_QUESTIONS_COPY`, `SURVEY_QUESTION_SETS` (9 sets), `questionSetsFor(product)` |
| `data/indicators.ts` | `INDICATOR_THRESHOLDS` (NPS 30/0, CSAT 80/65, CES 75/60, [Proposed]), `INDICATOR_SENTENCE`, `INDICATOR_COPY` |
| `data/whatIf.ts` | `WHAT_IF_CANDIDATES` (3, 4, 5, 6, 8 / 2, 3, 4, 5 / 14, 30, 45, 60), `RULES_POINTER_COPY` (pointer card and What if copy) |
| `data/customersList.ts` | `CUSTOMERS_LIST_COPY` (S13: page title, tabs, "Everyone on record", filters, columns, count, export and its toast), `SEGMENT_LABEL` (six types), `SOURCE_LABEL` (five sources) |
| `data/publicMentions.ts` | `PUBLIC_MENTIONS_COPY` (incl. `ownerNote(hours)`, `missedSignal`), `replyState`, `replyLabel`, `publicReplyBreaches(mentions, now, hours)` |
| `data/weeklySample.ts` | `WEEKLY_SAMPLE_COPY` |
| `data/roles.ts` | `MAIN_ROLE_IDS`, `FOLDED_ROLE_IDS`, `mainRoleDefs()`, `foldedRoleDefs()`, `SIGN_IN_COPY` |
| `data/nav.ts` | `PRIMARY_NAV`, `CUSTOMERS_TABS`, `SETTINGS_NAV`, `LEGACY_REDIRECTS`, `legacyRedirect(pathname)` |
| `data/v38Reference.ts` (edited) | `PublicMention` += `owner`, `repliedAt?`, `channelMovedTo?`; `PUBLIC_REPLY_OWNER`; `DNCR_PEOPLE_IN_SAMPLE`; `SURVEY_DELIVERY_LAST_MONTH.skippedBy` (6 reasons); Agent 9 text (`AGENT_JDS` id 9). **Not done (A):** `agentRegistry.ts` id 9 `trigger` and `runsOn`, `glossary.ts` CES text. |
| `lib/agents.ts` | `agentChipLabel(n)`, `supervisorChipLabel(checks)`, `SUPERVISOR_CHECKS`, `WHO_DOES_WHAT` |
| `utils/inbox.ts` | `INBOX_COPY`, `WORK_TODAY_COPY` (copy for the inbox page and the Home card) |
| `utils/callSchedule.ts` | `CALL_COPY` (hint, row suffix, toasts, button) |
| `utils/audit.ts` | `AUDIT_COPY` |

Mock store (`services/mockData.ts`, re-exports `mockDataV40.ts`): `MOCK_FEEDS`, `MOCK_MAPPING`, `MOCK_MATRIX` (per product, mutable), `MOCK_QUESTION_SETS`, `MOCK_WEEKLY_SAMPLE` (50), `MOCK_WEEKLY_SAMPLE_SIZE`; builders `seedAuditLog`, `seedCallAttempts`, `buildWeeklySample`.

---

## 4. Utilities

| Module | Use |
|---|---|
| `utils/workingDays.ts` | `WorkCalendar { days, holidays? }`, `MON_FRI`, `DEFAULT_CALENDAR`, `startOfDay`, `toDayKey`, `isWorkingDay`, `nextWorkingDay`, `addWorkingDays(from, n, cal)`, `workingDaysBetween(from, to, cal)` (from exclusive, to inclusive, negative if to is earlier), `workingDaysLeft(due, today, cal)`, `calendarDaysLeft`, `nextWeekday(from, 4)` (Thursday). Dates are local days; `'YYYY-MM-DD'` is a local day. |
| `utils/ruleValues.ts` | `RULE_IDS`, `RulesBag`, `DEFAULT_RULES_BAG`, `rulesFromConfig(items)`, `rulesSignature(bag)`, `calendarFromRules(bag)`, `hourLabel(9)` = `'09:00'` |
| `utils/patterns.ts` | `PatternRules`, `PATTERN_RULES` (defaults), `detectPatterns(signals, { windowDays?, now?, rules? })` (rule overrides), `detectPatternsCached(scopeKey, signals, rules, now)` (memoised by scope, rules, signal count, day), `whatIf(signals, rules, candidates, now)` -> `{ total, rows: [{ rule, current, cells: [{ value, patterns, isCurrent }] }] }` |
| `utils/trace.ts` | `evId`, `sgId`, `caId` (`ca-1` -> `CA-201`), `vrId`, `invId`, `ptId(key)`, `patternTraceIds(keys)`, `RP_ID`, `personRef`, `displayId(kind, id)`, `isDisplayId`, `kindOfTraceId`, `buildTraceIndex`, `traceIndexFor`, `chainFrom(kind, id, index)`, `resolveTraceRef`, `traceRoute(kind, id, {personId})`, `fixHasCheck`, `fixHasReport` |
| `utils/inbox.ts` | `buildInbox(input)`, `visibleFixes(fixes, patterns, role, roleEnvironment)`, `dayChipState`, `dayChipLabel`, `workTodayStats`, `OVERDUE_AFTER_DAYS` |
| `utils/indicators.ts` | `npsOf`, `csatOf`, `answersOf`, `fmtSigned`, `deltaFromTrend`, `indicatorsFor`, `liveIndicators`, `indicatorTone` (Overview now imports these) |
| `utils/callSchedule.ts` | `CallRules`, `callRulesFrom(bag)`, `isInsideCallingHours`, `recordNoAnswer(item, now, rules)`, `attemptLine`, `isOpenCall` |
| `utils/audit.ts` | `auditEntry`, `newestFirst`, `statusAudit`, `decisionAudit`, `proposedStamp({ product, byRole?, note?, at? })`, `productOfPattern` |
| `utils/fixClock.ts` | The three clocks of a fix (decided 18 Nov): `fixDue(approvedAt, resolveH, rules)` -> `{ dueAt, source: 'matrix' \| 'fallback', hours? }` (matrix "Resolve (h)" in working hours, or Agent 5's 14 days for an empty cell), `approvalDeadline(proposedAt, rules)`, `approvalDaysLeft(proposedAt, today, rules)` (5 working days from the proposal), `verificationDue(doneAt, rules)` (60 days from done). `addWorkingHours(from, hours, cal)` in `utils/workingDays.ts` counts 09:00 to 18:00 Monday to Friday (9 = one day). |
| `services/fixClockStore.ts` | `resolveHoursFor(fix)`, `applyApprovalClock(fix)`, `applyDoneClock(fix)`: what the mutations call; use them if you add a mutation that approves or completes a fix |
| `utils/passRate.ts` | `passRate(base, sampled, wrong)`, `agentPassRates(sample, base)`, `supervisorTestFor`, `syncSampleEffects(sample, tests, jds)` (the weekly sample's effect; formula `[Proposed]`) |
| `utils/envScope.ts` | `envsOfPattern`, `envsOfFix` (a fix or investigation takes its pattern's signals' environments; `null` = everywhere), `inScopeAny(scope, envs)` |
| `utils/peopleExport.ts` | `personLabel(person, role)` (name or `P-005`), `peopleCsvRows(persons, role, lang, lastContact)` for `downloadCsv` (no mobile column without the right) |

**Id schemes** (internal ids never change; display ids are computed): event `i-0012` -> `EV-12`; signal `sig-0007` -> `SG-7`, public mention `PUB-351` unchanged; pattern `PT-nnn` (`Pattern.traceId`); fix `ca-1` -> `CA-201`; check `VR-201` (same number as its fix); investigation `inv-3` -> `INV-3`; report `RP-2026-11` ("November pack" / "حزمة نوفمبر"). `isDisplayId` is case-sensitive: `ca-1` is an internal id, `CA-201` a display id.

---

## 5. Configuration keys (`MOCK_RULES_CONFIG`, read with `useRules()`)

| Key (`RULE_IDS`) | Item id | Default | Note |
|---|---|---|---|
| `sameAgent`, `sameIssue`, `envConcentration`, `window`, `minSample` | `rule_pattern_*` | 3, 5, 50, 30, 10 | existing; now drive `usePatterns()` |
| `approveDays`, `verifyDays` | `rule_approval_days`, `rule_verification_days` | 5, 60 | the inbox footer and the next-step box read them |
| `publicReply` | `rule_public_reply` | 48 | hours |
| `workingDays` | `rule_working_days` | `[1,2,3,4,5]` | **Decided** (Monday to Friday), still a setting; `value` = count, `days` = weekdays; update with `useUpdateRuleConfig().mutate({ id, days })` or `{ id, value: n }` (first n weekdays from Monday) |
| `workStart`, `workEnd` | `rule_work_start`, `rule_work_end` | 9, 18 | the working day behind "working hours" (matrix 9 = one working day) |
| `fixFallbackDays` | `rule_fix_fallback_days` | 14 | a fix's due date when the matrix "Resolve (h)" cell is empty (Agent 5) |
| `callFrom`, `callTo` | `rule_call_from`, `rule_call_to` | 9, 18 | **Decided**; hour of day, UAE time. The items carry `note` "Legal to confirm the hours": show it small, not as a badge |
| `callTries` | `rule_call_tries` | 3 | **Decided**; attempts on the CX team's list before "needs a human" |
| `aiNoAnswers` | `rule_ai_no_answers` | 2 | **Decided**; no-answers before an AI campaign hands over to a person (the campaign dialog's "twice" reads this) |

The Rules page (B) lists these under "other" automatically (each item may carry a `note`); badge only items with `proposed` (none now) and give the working week a weekday picker.

---

## 6. Navigation, routes, permissions

**Main menu** (`PRIMARY_NAV`, in this order): Home `/home`; 1 · Customers `/customers`; My inbox `/inbox`; 2–4 · Signals and fixes `/actions`; 5 · Close the loop `/close-the-loop`; 6 · CX indicators `/overview`; then the folded entry Settings and reference `/settings` (live products group sits between, unchanged). Runaway, Personas and Surveys left the menu. `CUSTOMERS_TABS` = `/customers` (Find a person), `/runaway` (Who is leaving), `/personas` (Personas and campaigns): three URLs, C builds the shared strip. `SETTINGS_NAV` is the flat v40 list (AI team page first, `/intelligent-cx-team` renamed "How the portal works (the AI team)").

**Redirects** (`LEGACY_REDIRECTS`, applied in `AccessGuard` **before** the role check, search and hash kept; routes also exist in `App.tsx`): `/surveys` -> `/settings/surveys`, `/settings/overview` -> `/overview`. `/runaway`, `/personas` and every other old URL still work.

**Who opens what** (`auth/access.ts` `ROLE_PATHS`, F35; CX manager and CX team open everything). Test: `auth/permissions.test.ts`.

| Page | Roles |
|---|---|
| `/inbox` | cxmgr, cxteam, envmgmt, teamlead, aslead, marketing, auditmkt, exec |
| `/overview` | cxmgr, cxteam, exec, auditmkt |
| `/settings/feeds`, `crm-mapping`, `escalation-matrix`, `survey-questions`, `weekly-sample` | cxmgr, cxteam, auditmkt, exec |
| `/settings/public-mentions` | the same, and marketing |
| `/settings/surveys` | cxmgr, cxteam, exec, auditmkt, aslead, envmgmt |
| `/customers` | gains auditmkt (flag: its role is "aggregates only") |

Role homes (`RoleDef.home`): marketing `/home` (was `/personas`), auditmkt `/overview` (was `/settings/overview`).

**Edit rights and name rules** (`auth/permissions.ts`): `canEditCrmMapping`, `canEditEscalationMatrix` (cxmgr, auditmkt); `canJudgeSample` (cxmgr, cxteam, auditmkt); **`canViewCustomerNames`** (cxmgr, cxteam, envmgmt, teamlead, aslead, marketing, exec: everyone who works with people except auditmkt; "no customer names to Internal Audit"), `canViewMobiles` and `canViewNamesInSample` follow it (exports show mobiles only to roles that may see names); `canMarkMentionReplied` (cxmgr, cxteam, marketing); `canRecordCallAttempt` (cxmgr, cxteam). Feeds: nobody edits. **C: the Customers list, Who is leaving and every other place a customer name appears must show `personLabel(person, role)` so the Internal Audit and Marketing Lead sees `P-005`, not a name** (it can open `/customers` and `/runaway`).

**Stub pages** (each overwritten by its owner; each is a working page over the real hooks):

| Route | File | Owner (status) |
|---|---|---|
| `/inbox` | `pages/inbox/Inbox.tsx` | A (replaced) |
| `/overview` | `pages/OverviewPage.tsx` (wraps `settings/Overview.tsx`) | C (replaced) |
| `/settings/feeds` | `pages/settings/Feeds.tsx` | C (replaced) |
| `/settings/crm-mapping` | `pages/settings/CrmMapping.tsx` | C (replaced) |
| `/settings/survey-questions` | `pages/settings/SurveyQuestions.tsx` | C (replaced) |
| `/settings/weekly-sample` | `pages/settings/WeeklySample.tsx` | C (replaced) |
| `/settings/public-mentions` | `pages/settings/PublicMentions.tsx` | C (replaced) |
| `/settings/escalation-matrix` | `pages/settings/EscalationMatrix.tsx` | B (replaced) |
| `/settings/surveys` | existing `pages/Surveys.tsx` (rendered inside `SettingsLayout`; C switched it to `SubPageHeader`: one `h1`) | C (replaced) |
| mount `<AsOfBar/>` | `components/layout/AsOfBar.tsx` | A (replaced) |
| mount `<TraceHost/>` | `components/trace/TraceHost.tsx` | B (replaced; the dialog is `SignalDetailDialog`) |

**All replaced (integration pass).** `grep -r "FOUNDATION STUB" src` finds nothing; `routes/pages.test.ts` asserts that no marker is left and that every lazy loader resolves.

**Mount points in `Shell.tsx`:** `<AsOfBar/>` under the top bar (every signed-in page), `<TraceHost/>` inside the provider (opens the signal dialog from `?sg=`). `EnvScopeProvider` wraps the router in `App.tsx` and in `renderWithProviders`.

---

## 6a. Integration pass: added or changed (18 Nov, after A, B and C)

| What | Where | Contract |
|---|---|---|
| `daysPhrase(n, unit, case?)`, `dayChipLabel` | `utils/inbox.ts` | singular, dual, plural in English and Arabic ("1 day left", "متبقٍ يومان"); `DayChip` and the inbox read it |
| `attemptsAllowed(item, rules)`; `recordNoAnswer(item, now, rules)` takes the row's `channel` and returns `handedOver` | `utils/callSchedule.ts` | an AI campaign row hands over after `aiNoAnswers` (2, no WhatsApp from the campaign), a CX list row after `callTries` (3, WhatsApp); `attemptLine` reads the same limit; `CALL_COPY.noAnswerHandOff`, `handedOverNote` |
| `useRecordNoAnswer()` | `queriesV40.ts` | uses the above; the toast says "the campaign hands this call to a person" for a campaign row |
| `MappingRow.confirmed?: boolean`; `useConfirmMapping()` `{ kind, crmValue }` | `types/v40.ts`, `queriesV40.ts` | unconfirmed by default; `useSaveMapping` with a changed value clears it |
| `MatrixRow.confirmed?: { [field]: { at, byRole } }`; `useConfirmMatrixCell()` `{ product, kind, field, byRole? }` | `types/v40.ts`, `queriesV40.ts` | the cell stops being a default (badge gone), the stamp says who and when; rejects a cell that is not a default; `useSaveMatrixCell` clears the stamp of that field |
| `useDetractorCallItems()` | `queries.ts` | returns copies (as `usePublicMentions` does); `dataUpdatedAt` is still the change signal for derived data |
| `useFixDue(fix)` | `queriesV40.ts` | returns `{ dueAt, source: 'matrix' \| 'fallback' \| 'recorded', preview }`: the stored date when `dueSource` is set or the fix is past `proposed` (a sample fix: `recorded`), a preview only before; takes an optional `status` |
| `createActionFromPattern({ pattern, kind, owner })` (`useCreateActionFromPattern`) | `queries.ts` | `dueDate` is optional and no caller passes it: the mutation stamps it from the matrix with `dueFromMatrix` (`services/fixClockStore.ts`) |
| `ownerTitle(owner: string): Bi` | `data/ownerTitles.ts` | the Arabic title of a fix owner (roles, matrix defaults, default receivers, assistant plan owners, "Direct manager (X environment manager)"); an unknown title passes through; `CorrectiveAction.owner` stays a string |
| `<LandingBrief roles={[...]} />` | `components/home/LandingBrief.tsx` | the Daily brief on the landing page of a role that does not land on Home; mounted on `settings/Ld` (`ld`), `settings/HrTeamPerf` (`hrmgr`), `OverviewPage` (`auditmkt`), `ActionsLayout` fixes tab (`hrspec`) |
| Timeline anchors | `components/customers/Timeline.tsx` | each row `id="EV-12"`, `data-ev`, `data-trace-id`; `?ev=` focuses the row and fills an `aria-live` region (`data-testid="timeline-live"`, no `role="status"`: the e2e page-ready check counts that role as loading) |
| Fix cards fold | `pages/actions/components/FixCard.tsx`, `Corrective.tsx` | props `open`, `onOpenChange`; the page keeps the first card and the `?fix=` one open; "Expand all" and "Collapse all" |
| Dialog and sheet close label | `components/ui/dialog.tsx`, `sheet.tsx` | `t('Close', 'إغلاق')`; they now need the i18n provider (always present in the app and in `renderWithProviders`) |
| Removed | `data/v38Reference.ts` | `ESCALATION_ROWS`, `ESCALATION_COLUMNS` (unused); `Customers.tsx` `useScrollToEvent` (the timeline does it) |
| Test settings | `vitest.config.ts`, `src/test/setup.ts` | `testTimeout` and `hookTimeout` 20 s; testing-library `asyncUtilTimeout` 5 s |

## 7. Hooks

Import from `@/services/queriesV40` unless stated. All reads go through the mock seam with 150 to 180 ms latency. Types of `data` are `T | undefined` while loading.

### Environment scope
- `useEnvScope(): { env: EnvScope; setEnv(env); allowed: EnvId[]; fixed: EnvId | null }`. `env` is the effective scope (the role's own environment when `fixed`, which is environment management, `'dub'`). Persisted in `localStorage` `psicx.env`. Outside a provider the scope is `'all'`.
- Env-aware (edited, in `services/queries.ts` and `referenceQueries.ts`; the scope is part of the key; **the switch narrows everything that carries an environment, decided 18 Nov**): `usePersons()` `['persons', env]`, `useSignals()` `['signals', env]`, `useShopperCases()` `['shopper-cases', env]`, `usePatterns()` `['patterns', env]`, **`useCorrectiveActions()` `['corrective-actions', env]`, `useDetractorCallItems()` `['detractor-call-items', env]`, `useInvestigations()`, `useHandoffs()`, `usePublicMentions()`, `useHomeSummary()`** (all `[name, env]`). Whole-register variants that ignore the switch: `usePersonsAll()`, `useSignalsAll()`, `usePatternsAll()`, `useCorrectiveActionsAll()`. Not narrowed, because the sample rows carry no environment: survey rows and the indicators (`useVocRows`, `useIndicators`), agents, weekly sample, non-CRM feeds. While the scope changes `data` is `undefined` for ~180 ms (no placeholder): show the skeleton.
- `usePatterns()` computes from the rules at read time (memoised): editing a threshold with `useUpdateRuleConfig()` invalidates `['rules-config']` and `['patterns']` and the cards recompute. Ids stay stable.

### Rules, indicators, brief, inbox
| Hook | Args | Returns |
|---|---|---|
| `useRules()` | - | `RulesBag` (`patterns`, `approveDays`, `verifyDays`, `publicReplyHours`, `workingDays`, `workStart`, `workEnd`, `fixFallbackDays`, `callFrom`, `callTo`, `callTries`, `aiNoAnswers`); defaults while loading |
| `useIndicators()` | - | `{ data: IndicatorSet[], isLoading }`, one set per **live** product: `{ productId, nps, csat, ces, answers, deltaVsLastMonth }`. The tile and the brief must both read this (one source). NPS and CSAT come from the survey rows, `ces` from the sample table (null = `–`), delta = last minus previous point of the monthly series |
| `useBriefInputs()` | - | `{ data: BriefInputs, isLoading }`: `signals { inWindow, patternsOverLine, patternsWaitingForFix }`, `fixes { proposed, inProgress, late, effective, failed }`, `shopper { open, late }`, `loop { open, critical, recoveredByPhonePct, recoveredByAiPct }` (null = too early), `people { drifting, total }`, `publicMentions { last30, negativePct, avgReplyHours, target }`, `ldFixes`, `conductNotes`, `sample { toRead, read }`. A builds the sentences (`utils/brief.ts`); link a line only when `canAccessPath` |
| `useInbox()` | - | `{ data: InboxItem[], isLoading, stats: { total, urgent } }` for the signed-in role, sorted (priority desc, fewest days, undated last). `stats` feeds "Your work today". Items: approve, do, verify, call (CX only, DNCR never), inv (CX only), sample (auditmkt only). Targets: `/actions/corrective?fix=CA-201`, `/close-the-loop?item=dcl-3`, `/actions/investigations?inv=INV-1`, `/settings/weekly-sample`. Pages must read those search params |

### Trace
- `useTraceIndex(): { index, version, isLoading }` (all registers, not narrowed by the switch).
- `useTrace(kind, id): { data: TraceChain | null | undefined, isLoading }`. `id` = internal or display id. `null` = unknown record.
- `useSignalDetail(id): { signal (undefined loading, null unknown), chain, traceId, isLoading }`.
- `useTraceNav(): { openSignalId, open(kind, id), close(), canOpen(kind, id), routeFor(kind, id) }`. `open('signal', id)` sets `?sg=SG-12` on the current page (TraceHost shows the dialog); event -> `/customers/:personId?ev=EV-12`; pattern -> `/actions/signals?pt=<key>#patterns`; fix and check -> `/actions/corrective?fix=CA-201`; report -> `/settings/monthly-pack`. The destination pages must read `ev`, `pt`, `fix` (B and C). `canOpen` is false for a page the role cannot open.

### Fixes, audit, investigations (edited in `services/queries.ts`, `referenceQueries.ts`)
- `useDecideCorrectiveAction()` mutate `{ id, decision, reason?, byRole? }`: writes an audit entry; `byRole` defaults to the signed-in role.
- `useSetFixStatus()` (new) mutate `{ id, status, byRole? }`: status change plus audit line; a verdict status also sets `verificationResult`.
- `useCreateActionFromPattern()`, `useCreateProposedActions()`, `useProposeFromInsight()` now stamp `proposedAt`, `product` and a first audit line. `useSendToInvestigation()` writes "Sent to investigation INV-n".
- `useReturnInvestigation()` mutate `{ id, resultSummary }` -> the `Investigation`: sets `status 'returned'`, `result`, `resultSummary`, `doneCount = requestedCount`; if its pattern has no fix, creates a `proposed` fix by Agent 5 (kind `training_gap`, owner `L&D manager`, `source`, `proposedBy`, `proposedAt` now, one audit line by `system`) and sets `proposedFixId`. **Page toast rule: if `inv.proposedFixId` is set show "Result recorded as evidence; a fix was proposed for approval.", else show "evidence" only.** Invalidates investigations, fixes, home summary.
- `useInvestigationEvidence()` -> `{ data: Record<patternId, { investigationId, traceId: 'INV-1', result: Bi }> }`: the green "Evidence from investigation · INV-1: ..." line on a pattern card.
- `useFixMatrixLine(fix)` -> `FixMatrixLine | undefined` (`{ product, kind, row }`): the "From the matrix (product): receiver ... [Matrix]" line.
- **`useFixDue(fix)`** -> `{ dueAt, source: 'matrix' | 'fallback' | 'recorded', preview: boolean } | undefined`: the due date of a fix. Once approved (or for any fix past `proposed`) it is the stored `dueDate` (`preview: false`; `recorded` when a sample fix holds a date and no `dueSource`); before approval it previews what approval now would give (matrix "Resolve (h)" for its product and kind in working hours, or the 14-day fallback). Approval (`useDecideCorrectiveAction` with `approved`, or `useSetFixStatus` to `approved`) writes `dueDate` and `dueSource`; marking done (`useSetFixStatus` to `verification`) starts the 60-day check. The "Next step" box for a fix can show `useFixDue(fix)`.

### Registers
| Hook | Args | Returns / mutation |
|---|---|---|
| `useFeeds()` | - | `DataFeed[]` (8 feeds) |
| `useFeedScope()` | - | `FeedScope` for the current switch: `{ asOf, lateCount, feeds }` |
| `useCrmMapping()` | - | `CrmMapping { rows, options }` |
| `useSaveMapping()` | `{ kind, crmValue, portalValue }` | rejects an unknown row or portal value |
| `useMatrix(product = 're')` | product | `MatrixRow[]` (10 rows, `isDefault` per cell) |
| `useSaveMatrixCell()` | `{ product, kind, field, value: string \| number \| null, lang? }` | text typed in `lang`: the other language keeps its default; clocks take a number or null; the cell stops being a default |
| `useQuestionSets(product?)` | product | `SurveyQuestionSet[]` (empty list for Wallet: show the empty state) |
| `useWeeklySample()` | - | `{ items, size: 50, read, wrong, accuracyPct, due }` (`due` = next Thursday) |
| `useJudgeSample()` | `{ id, right }` | writes the verdict, **creates or removes the supervisor test** and **lowers or restores the agent's pass rate** (`AGENT_JDS[].approvalPct`, read by the agents page directly; `useAgentJobDescriptions()` returns it too). Re-judging an output gives the points and the test back |
| `useAgentPassRates()` | - | `AgentPassRate[]`: `{ agent, base, current, sampled, wrong, tests }` per agent in the sample |
| `useSupervisorTests()` | - | `SupervisorTest[]`: the tests the supervisor gained from "wrong" verdicts |
| `usePublicMentions()` (`referenceQueries`) | - | copies of the mentions in the current scope (16 for All), with `owner` (Marketing, channel owner) |
| `usePublicReplyBreaches()` | - | `{ data: PublicMention[] }`: mentions with no reply past the reply clock (`rule_public_reply`, 48 h): CX raises a signal for each; also `BriefInputs.publicMentions.overdue` |
| `useMarkReplied()` | `{ id }` | sets `replied`, `replyHours = max(1, days since x 24)`, `repliedAt` |
| `useRecordNoAnswer()` | `{ id }` | resolves `{ item, result: NoAnswerResult, toast: Bi }`; rejects a DNCR person and a done row. Attempt n+1, next attempt = following working day; at the row's limit (`callTries` for the CX list, `aiNoAnswers` for an AI campaign row) the status is `needs_human` (still open) |
| `useConfirmMapping()` | `{ kind, crmValue }` | integration pass: sets `confirmed` on the row (section 6a) |
| `useConfirmMatrixCell()` | `{ product, kind, field }` | integration pass: confirms a default cell (section 6a) |
| `useRecordInterview()` (edited) | as before | now also sets `attempts >= 1`, `status 'done'` |
| `useUpdateRuleConfig()` (edited) | `{ id, value?, days? }` | refreshes rules and patterns |

---

## 8. Shared primitives (`src/components/common`)

All are final, bilingual, RTL-safe, role-aware where they link, and covered by `components/common/v40.test.tsx`.

| Component | Props | Notes / example |
|---|---|---|
| `StepStrip` | `current?: StepId`, `size?: 'full' \| 'small'`, `className?` | Six links (plain text when the role cannot open the page), `aria-current="step"`, earlier steps get a check. None highlighted on Home. `<StepStrip />`, `<StepStrip current="ca" size="small" />` |
| `NextBox` | `next: NextStep`, `who?: ReactNode`, `action?: ReactNode`, `className?` | Small strip + "Next step:" + text + "· who" + "· due" + action. Build `next` with `fixNext(fix.status, { approveDays, verifyDays })`, `actionsNext(tab)`, `journeyNext({ drifting, problems })`, `CLOSE_LOOP_NEXT`, `OVERVIEW_NEXT` (add the `MONTHLY_PACK_BUTTON` as `action`). `<NextBox next={fixNext(fix.status, rules)} who={fix.owner} />` |
| `TraceId` | `kind`, `id`, `children?`, `plain?`, `onOpen?`, `className?` | Grey mono tag; a button when `useTraceNav().canOpen`. `id` may be internal or display; **for a pattern pass `pattern.traceId`**. `<TraceId kind="signal" id={s.id} />`, `<TraceId kind="event" id={e.id}>· call</TraceId>`. Needs Router and the query provider |
| `AgentChip` | `agent: number \| 'supervisor'`, `checks?`, `className?` | "Agent 9 · Reporting" / "الوكيل 9 · التقارير"; `agent="supervisor"` -> "CX Supervisor: 6 checks passed". `WHO_DOES_WHAT` (`lib/agents`) is the button label |
| `DayChip` | `daysLeft: number \| null`, `unit: 'wd' \| 'd'`, `className?` | overdue (more than 30 late), "{n} working days late", today, "{n} days left" (warn at one or less); null renders nothing |
| `ProposedBadge` | `children?`, `title?`, `className?` | `[Proposed]` / `[مقترح]`; use per delta section E |

Two non-primitive mounts: `components/layout/AsOfBar.tsx` (A), `components/trace/TraceHost.tsx` (B).

---

## 9. What the V40 sample data looks like

- 30 people, 120 interactions, same seed as before; three environments (45 / 30 / 25 % of people); signals skew: Dubai slow replies, PSI Assets repeat contacts.
- Consent: DNCR for people 4, 13, 22 (`p-005`, `p-014`, `p-023`); WhatsApp off for 3, 10, 17, 24; email off for every fifth from 2; SMS always on. DNCR people are not on the close-the-loop list (12 rows, built from the other people).
- Close the loop: rows 3, 6, 9, 12 are open: one `to_do` (0 attempts), two `no_answer` (1 and 2 attempts, next attempt a working day), one `needs_human` (3, the CX list's limit). The rest are `done`.
- Signals: each lists 1 event (every third lists 2: the nearest other event of the same person, same environment and product). A public mention (`PUB-351`...) has no person and no events.
- Fixes: 4 to 6, each with `proposedAt` (proposed ones 2 to 8 days ago so some are close to the 5-working-day window), `product`, and an audit trail of 1 to 5 lines.
- Feeds: 8 (Abu Dhabi, Dubai, PSI Assets CRM; WhatsApp, AI caller and IVR, app and website, surveys, public channels). PSI Assets is the one **late** feed ("1 feed late or missing").
- Weekly sample: 50 outputs, none read, no customer name in any text. Judging one wrong drops that agent's pass rate on the agents page and adds a supervisor test.
- Matrix: ten rows per product for all six products, every cell a default. Approval of a seeded or new fix writes its due date from the row's "Resolve (h)" (service and behaviour 45 working hours, training gap 90, ...).

---

## 10. Tests that exist (for your own work)

Unit (`npm run test`): `utils/workingDays`, `trace`, `inbox`, `indicators`, `callSchedule`, `ruleValues`, `patterns` (rule overrides, stable ids, cache, What if), `utils/fixClock` (working hours, due date, the three clocks), `utils/passRate`, `utils/envScope`, `utils/peopleExport`, `components/trace/TraceHost`, `services/mockDataV40` (environments, consent, attempts, audit seeds, feeds, mapping, matrix, questions, sample, skipped reasons), `services/queriesV40` (hook seams with `renderHookWithProviders`), `data/steps`, `components/common/v40`, `routes/pages`, `auth/permissions` (every new route per role), `pages/Login`. Helpers in `src/test/render.tsx`: `renderHookWithProviders(hook, { role, lang, route })`; `renderWithProviders` now also returns the `client`.

E2E helpers (`e2e/helpers.ts`): `ROUTES` (now includes the new routes, so the axe scan, route and RTL checks cover them), `MAIN_ROLES`, `FOLDED_ROLES`, `ROLE_HOME`, `LEGACY_ROUTES`, `signInAs(page, role, lang)`. Note: `signInAs` seeds once per page; use a new page (or `browser.newPage()`) per role. New spec: `e2e/v40-foundation.spec.ts` (merged menu in EN and AR, per-role menus, landing pages, legacy redirects, role gating, the bar and the environment switch, the signal dialog, inbox, sign-in folding).

**Foundation-owned spec files that you may edit, limited to the assertions that cover your page:** `passI.spec.ts` (B: the Signals test asserts the "Hand-off rules by signal type" heading and a hand-off cell, which move to the fixes tab; C: the Close the loop test), `features.spec.ts` (A: the Home-dependent tests), `keyboard.spec.ts` (A: Home; C: the Close the loop dialog), `a11y.spec.ts` (B and C: overlays). Add your new e2e as `e2e/v40-orientation.spec.ts` (A), `v40-trace.spec.ts` (B), `v40-people.spec.ts` (C).

**Operational note.** Playwright's `webServer` reuses a server already on port 4321 without rebuilding. If a run was interrupted, stop the stale `vite preview` first or you test an old build.

---

## 11. Minimal edits I made to files owned by A, B or C (to keep them compiling or correct)

| File | Owner | Edit |
|---|---|---|
| `pages/Login.tsx`, `Login.test.tsx`, `e2e/auth.spec.ts` | A | six main roles + folded details (F28), tests updated |
| `pages/settings/Overview.tsx` | C | imports `utils/indicators`, `hideHeader` prop |
| `pages/settings/OverviewInsights.tsx`, `SurveysReference.tsx`, `pages/ProductPage.tsx` | C / none | the "Surveys and triggers" link points to `/settings/surveys` |
| `components/ai/assistantIntents.ts` | none | environment words: Dubai, Abu Dhabi, PSI Assets (Amman and Sharjah removed) |
| `components/customers/Timeline.test.tsx` | B | fixture gets `envId` |
| `components/ui/table.tsx` | shared | focusable when overflowing (decision 14) |
| `pages/actions/*`, `pages/CloseTheLoop.tsx`, `pages/Home.tsx`, `pages/Runaway.tsx`, `pages/Customers.tsx` | B, C, A | **no edits**; they read the env-aware hooks, so the switch already narrows them. They must adopt `personLabel` (C), `useFixDue` / `fixNext` (B), `CALL_COPY.hoursNote` and `aiNoAnswers` (C) |

---

## 12. Results and what A, B, C should expect to change

**Counts.** Unit: 355 tests in 29 files (was 141 in 13). E2E (`npm run test:e2e`, one run at the end, fresh build): **188 passed, 0 failed** (was 135: the 7 new routes add 28 axe checks, plus 1 signal-dialog scan and the 24 tests of `v40-foundation.spec.ts`). Lint: the 3 known react-refresh warnings only.

**Nothing currently fails only because a page awaits A, B or C.** These specs and tests pass today but assert behaviour that a workstream will change, so the owner must update them in the same pull request:

| Spec / test | Why it will change | Owner |
|---|---|---|
| `e2e/passI.spec.ts` "Signals shows the closest patterns first..." | asserts the "Hand-off rules by signal type" heading and a hand-off cell on the Signals page; hand-offs move to the fixes tab (F19) | B |
| `e2e/passI.spec.ts` "Close the loop shows the 60-day recovered rule" | Close the loop gets the hint, attempts and the "No answer" action | C |
| `e2e/passI.spec.ts` "a '?' beside a heading explains the term" (`/runaway`) | the page gains the Customers tab strip | C |
| `e2e/keyboard.spec.ts` "table headers sort..." (`/customers`) | the people list is rebuilt (filters, new columns): the first sortable header may change | C |
| `e2e/keyboard.spec.ts` "a form dialog traps focus..." (`/close-the-loop`, button `Call`) | button names and the dialog change | C |
| `e2e/keyboard.spec.ts`, `e2e/features.spec.ts` Home tests ("skip link", "sidebar links", the assistant tests) | Home is rebuilt (F01); they only need a heading and the header assistant button, so they should survive | A |
| `e2e/a11y.spec.ts` axe scan of every route | all rebuilt pages must still pass; the scan already covers every new route in four language and theme combinations | A, B, C |
| `src/pages/Login.test.tsx`, `e2e/auth.spec.ts` | sign-in polish (copy, full role text) | A |
| `src/components/customers/Timeline.test.tsx` | the timeline gains `EV-n` tags and signal buttons | B |
| `docs/FIDELITY_REVIEW.md` rows ("Five live numbers, each a button", Marketing and environment limits on Home) and `docs/IMPLEMENTATION_REPORT.md` (environments Amman and Sharjah, 141 and 135 test counts, 12-role sign-in) | stale after v40; update at the documentation pass | all |

**Open items I did not do (not in foundation):** the Home page, `components/home/*`, `utils/brief.ts` (A); `agentRegistry.ts` id 9 `trigger` and `runsOn`, `glossary.ts` CES text (A); Trace card, signal dialog body, audit card, matrix editing, What if card, hand-offs move, evidence line, next-step boxes on fixes (B); Customers tabs and list, consent chips, attempts UI, feeds, mapping, questions, public mentions, weekly sample, `Surveys` heading (C); the `?fix=`, `?ev=`, `?pt=`, `?item=`, `?inv=` search params that the trace and inbox links produce (B and C read them); an `h1`-less `Surveys` page inside Settings gives two `h1`s until C changes its header. The v40 labels "30-day check" are not ported anywhere (the app keeps "60-day check"); the intelligent CX team intro still says "ten agents".


---

## 13a. Final hook list (after the integration pass)

Everything in `@/services/queriesV40` (V40 hooks) and the edited hooks of `queries.ts` and `referenceQueries.ts`, with the integration additions marked **new**.

| Area | Hooks |
|---|---|
| Environment | `useEnvScope`, `usePersonsAll`, `useSignalsAll`, `usePatternsAll`, `useCorrectiveActionsAll`; env-aware `usePersons`, `useSignals`, `useShopperCases`, `usePatterns`, `useCorrectiveActions`, `useDetractorCallItems` (copies, **changed**), `useInvestigations`, `useHandoffs`, `usePublicMentions`, `useHomeSummary` |
| Rules, indicators, brief, inbox | `useRules`, `useUpdateRuleConfig`, `useIndicators`, `useBriefInputs`, `useInbox` |
| Trace | `useTraceIndex`, `useTrace`, `useSignalDetail`, `useTraceNav` |
| Fixes, audit, investigations | `useDecideCorrectiveAction`, `useSetFixStatus`, `useCreateActionFromPattern` (due date from the matrix, **changed**), `useCreateProposedActions`, `useProposeFromInsight`, `useSendToInvestigation`, `useReturnInvestigation`, `useInvestigationEvidence`, `useFixMatrixLine`, `useFixDue` (**changed**) |
| Registers | `useFeeds`, `useFeedScope`, `useCrmMapping`, `useSaveMapping`, `useConfirmMapping` (**new**), `useMatrix`, `useSaveMatrixCell`, `useConfirmMatrixCell` (**new**), `useQuestionSets`, `useWeeklySample`, `useJudgeSample`, `useAgentPassRates`, `useSupervisorTests`, `usePublicReplyBreaches`, `useMarkReplied`, `useRecordNoAnswer` (per channel, **changed**), `useRecordInterview` |
| Helpers added | `ownerTitle` (`data/ownerTitles.ts`, **new**), `daysPhrase` (`utils/inbox.ts`, **new**), `attemptsAllowed` (`utils/callSchedule.ts`, **new**), `dueFromMatrix` (`services/fixClockStore.ts`, **new**), `LandingBrief` (**new**) |
