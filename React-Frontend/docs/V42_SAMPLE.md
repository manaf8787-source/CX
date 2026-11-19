# V42 Weekly sample: split by reader (F32) and as a card flow (F34)

Status: built 19 Nov 2026 on `V42_DELTA.md` F32 and F34. Prototype reference: `PSI CX Portal.html` blocks `v42.1` (`wsReader`, the extra `rt`/`ac`/`tg` rows, the per-role note) and `v42.2` (`wsQuestion`, `wsEvidence`, the card flow). Knowledge Base: Modules KB "The weekly sample" and "Split by reader", Programme KB sections 46 and 47. All names and figures are sample data. `[Proposed]` marks what the build chose where the spec is silent.

## 1. What the page is now

| View | Who | What |
|---|---|---|
| Card flow (default) | CX manager, CX team, Internal Audit and Marketing Lead | The "new employee" intro, the reader's note, a counter, ONE card at a time: left "What the AI was given", right "What it decided" + one "How" line, one question, three answers. An "All done" card at the end. |
| List ("See all as a list") | the same three, with "Back to one at a time" | The table you know (tiles, pass-rate card, "How to judge", filter, six columns, Right / Wrong, Change), over the reader's own rows. |
| List only | Executive | Nothing to answer, so no flow and no switch: the list, the view-only note, the CX note [Proposed]. |

Page title: card flow "Check the AI's work this week" / "One piece at a time. Half a minute each." (prototype); list "Weekly sample". The menu entry and the layout heading stay "Weekly sample".

## 2. The reader split (F32)

Prototype `wsReader`, keyed by the kind of row. The reader of a row is `WeeklySampleItem.reader`, set from `READER_OF_CHECK` (`utils/sampleCards.ts`); the role maps to a reader in `sampleReaderOf` (`auth/permissions.ts`): `auditmkt` reads `audit`, every other role `cx`.

| Row (`check`) | Agent counted | Reader | Rows | What the reader judges | Question (verbatim) |
|---|---|---|---|---|---|
| Proposed fix (`fix`) | 5 | CX | 4 | the fix for the pattern, and its receiver | Is this a sensible fix for this pattern, and is it going to the right person? |
| Interview brief (`brief`) | 8 | CX | 12 | the summary against the timeline | Does this summary match what happened to the customer? |
| Journey reading (`journey`) | 7 | CX | 10 | the reading of the customer | Is this reading of the customer fair? |
| Classification (`classification`) | 2 | Audit | 18 | category and severity against the quoted evidence | Is this really a complaint of this type? |
| Signal count (`count`) | 3 | Audit | 6 | the pattern's signals counted | Should this count as a signal? |
| Routing (`routing`) | 5 | Audit | 4 (one per fix) | the title the fix went to against the matrix | Did the fix go to the title the matrix says? |
| Access (`access`) | 5 | Audit | 3 (first three fixes) | what the receiver got: no names, no conversation text | Is there anything here that should not have left the CX team? |
| Targeting (`targeting`) | 7 | Audit | 4 (first four personas) | persona and size against the campaign's who and channel | Are these the right people for this campaign? |

- CX reads 26 rows, Internal Audit 35, 61 in all. The Executive reads the CX rows (the prototype shows every role but Internal Audit the content rows).
- The Agent 3 count rows go to Internal Audit as `wsReader` says. In this build all six are pattern counts (the first six patterns), not single signals as in the prototype; they sit under the classification family (the counting is checked against the evidence).
- "Fifty": the original composition is unchanged (50 rows, `ws-1` to `ws-50`, same order, `WEEKLY_SAMPLE_SIZE` = 50 is still its cap). The 11 audit rows are appended (`ws-51` to `ws-61`), as the prototype appends them to `SAMPLE`. **The tiles and the counter show the reader's own rows (26 or 35), never fifty.** `MOCK_WEEKLY_SAMPLE_SIZE` stays 50 and means "the original composition", not the total.
- A routing or access row counts toward Agent 5, a targeting row toward Agent 7 (the prototype's `agentChip`). A "wrong" on it lowers THAT agent's pass rate and becomes a supervisor test, whoever reads it. The agent's pass rate is one figure for both readers; the tiles are per reader.

### Every consumer follows the reader

| Consumer | How |
|---|---|
| Page tiles, counter, filter counts | `useWeeklySample()` returns the signed-in role's rows only; `size`, `read`, `wrong`, `accuracyPct` count them. Query key `['weekly-sample', reader]`; `useJudgeSample` invalidates the prefix, so both readers refresh. |
| Daily brief line (`useBriefInputs` → `sample.toRead`, `read`) | the same hook: Internal Audit reads "35 agent outputs to read by eye"; a CX role's `BriefInputs.sample` is 26 (no brief line for CX roles today, see section 9). `utils/brief.ts` is not edited. |
| Inbox item `sample:week` (`useInbox`) | the same hook: "Weekly sample: 35 outputs to read, 0 read" for Internal Audit. `utils/inbox.ts` is not edited. |
| Agents' pass rates, supervisor tests (`utils/passRate.ts`) | over every row, per agent; rows carry `agent` (5 for routing and access, 7 for targeting). Not per reader. |

## 3. Data model

`WeeklySampleItem` (`types/v40.ts`) keeps `id, agent, kind, text, saw, ref, open?, personId?, verdict, judgedAt?` and gains:

| Field | Meaning |
|---|---|
| `check: SampleCheck` | `fix | classification | count | brief | journey | routing | access | targeting`: picks the reader, the question and the card |
| `reader: SampleReader` | `cx | audit`, from `READER_OF_CHECK` |
| `card: SampleEvidence` | `{ given: Line[], decided: Line[], how: Bi }`: what the card shows |
| `supervisor?: Bi` | the list's Supervisor cell for the rows whose check is not the usual six (routing, access, targeting: prototype `chk`) |

`SampleEvidenceLine`: `label?`, `value?`, `strong?`, `meta?` (grey caption: "Email · 2026-11-07"), `quote?: Bi` (the per-category sample sentence), `conversation?: string` (verbatim conversation text, one language, never translated), `personId?`, `attention?` (a warning dot). A line never holds a customer or agent name: a person is a `personId`, resolved for the viewer.

Build: `services/weeklySampleBuild.ts` (`buildWeeklySample`, moved out of `mockDataV40.ts`, which re-exports it, so every import path is unchanged; deterministic, no random draws). Input gains `matrix` (`MOCK_MATRIX`) and `personas` (`MOCK_PERSONAS`). The matrix is read once at build time: the sample is a snapshot of what the AI was given that week, so editing the matrix on the Escalation matrix page does not rewrite last week's routing rows [Proposed].

Card builders: `utils/sampleCards.ts` (`signalCard`, `countCard`, `fixCard`, `routingCard`, `accessCard`, `targetingCard`, `briefCard`, `journeyCard`, `kindCheckFor`, `matrixFor`, `routingSaw`, ...), on top of the existing `utils/sampleEvidence.ts` (now exports `join`, `bi`, `count`, `day`, `patternRule`, `signalsInWindow`, `signalSource`). Copy: `data/weeklySample.ts` (`SAMPLE_READER_NOTE`, `SAMPLE_QUESTION`, `SAMPLE_FLOW_COPY`, `SAMPLE_EVIDENCE_COPY`, `SAMPLE_AUDIT_KIND`).

## 4. The cards

| Kind | Left: what the AI was given | Right: what it decided |
|---|---|---|
| Fix | The pattern (rule, size), up to three of its signals newest first (source and date, the per-category sentence quoted), "+N more signals" | The fix; kind and the title it goes to; How: "recovery in about N of 10" from the pattern's own figure |
| Classification | The quoted message with source and date | Type, severity (from the rules); How (prototype) |
| Count | The pattern and up to three signals | Type, "N signals in 30 days", "Counted as a signal (not worked one by one)" |
| Brief | The customer (name for CX, reference otherwise) and the first score; the last three events, date and channel, the problem flagged, and the conversation text for the CX manager and the CX team | Brief for the caller: the reason suggested, "critical" |
| Journey | The customer and the events; the three latest problems found | The reading |
| Routing | The pattern and signals as for a fix | **Routed to** and **The matrix says** (both strong), the product, kind and the two clocks (halved for a VIP-related fix, with "VIP · clocks halved"), the kind check where it applies |
| Access | The pattern and signals | What the receiver got; Names in it; conversation text; the trace ids sent |
| Targeting | The persona, its size, its definition | Campaign, who the campaign targets, channel |

Behaviour (`pages/settings/SampleCardFlow.tsx`):
- Answers are real buttons: "Yes, I would do the same" (right), "No, that is wrong" (wrong), "Not sure, skip for now"; CX roles on a fix card also "Open the fix", on a signal card "Open the signal" (the prototype opens a fix or a signal only; a pattern, call or customer card has no Open on the card; the list keeps the Open button on every row).
- A verdict advances at once (a local copy, the query catches up). Skip puts the card at the end of the queue; the skipped cards come back after the others ("These are the ones you skipped."). Skipping the only card left keeps it.
- Counter "n / N checked this week · k marked wrong · due Thursday"; "All done for this week." with "k wrong answers became tests for the supervisor." or "Nothing wrong found."
- Focus: after an answer or a skip the focus moves to the new card's `h3` (or the All-done heading); after "See all as a list" / "Back to one at a time" the same control in the new view takes it. A polite live region (`aria-live`, `data-testid="sample-live"`) says "n of N checked." / "Skipped for now. n of N checked." / "All done for this week." Not `role="status"`: `expectPageReady` reads that as a loading indicator.
- Reduced motion: the card's entrance (`cx-pop-in`, 200 ms) collapses with every animation under the global rule. 320 to 390 px: the two sides stack, the answers are full width. RTL: the given side is on the right.
- A "wrong" in the cards shows no toast (the counter and the All-done card say it); the list keeps its toasts.
- Notes above the cards (`FoldNote`): the intro and the per-reader note are wells whose title is the button that folds them; open on first visit, the choice remembered in `localStorage` key `psicx.sample.folded` (try/catch; without storage they open each visit) [Proposed]. Reason: two notes fill a phone's first screen.

`data-tour="sample"` (the Internal Audit tour step): the **current card** (`Card`, `data-testid="sample-card"`) in the card flow, the **All-done card** after the last answer, and the **sample `Table`** in the list. One of the three is always on screen.

## 5. Role matrix

| Role | Opens as | Rows | Judges | Open | Names | Conversation text |
|---|---|---|---|---|---|---|
| CX manager, CX team | cards | 26 content rows | yes | yes (list: every row with a record; cards: fix, signal) | yes | yes (cards, brief rows) |
| Internal Audit and Marketing Lead | cards | 35 audit rows | yes | no | never (references only; no audit row is about a person) | never (no audit row holds any) |
| Executive | list | 26 content rows | no | no | list shows names (`canViewNamesInSample`) | never (the list has none) |

## 6. Tests

Unit (`npm run test`, 82 files, 1163 tests, all green at the end) and e2e (see the report). Before to after, by file:

| File | Before | After | Why |
|---|---|---|---|
| `pages/settings/v40People.test.tsx` | 33 | 45 | The Weekly sample tests asserted the table, "0 / 50" and `✓ Right` x 50 on the default view. Replaced by: card flow (intro, note, counter, one card, answer, keyboard focus and live region, wrong lowers the rate and adds a test, skip and return, last card, All done, list and back, change in the list, brief card with name and text for CX); Internal Audit (35 rows, classification first, routing card with the kind check, a wrong counts for Agent 5 not Agent 2, access and targeting, no names or text on any card or in the list, own supervisor lines); the Executive as a list; the list's evidence tests now on the reader's rows; Arabic; fold notes; Open for CX only and conversation text dropped for a viewer who may not read it. A `resetSample` helper waits for in-flight mutations (the register is module-level). |
| `services/mockDataV40.test.ts` | 40 | 51 | "Fifty" became 61 = the original 50 (ids unchanged) plus 11; per-agent counts by `check`; reader split 26 / 35; routing, access, targeting rows; the CA-201 routing error and that no other fix is flagged; VIP clocks; no name, agent name or conversation text in any audit row; conversation text only in `conversation` on CX rows; determinism. `rows(7)` for journey became `check === 'journey'` (Agent 7 now also has targeting rows). |
| `utils/passRate.test.ts` | 5 | 7 | Fixture gains `check`, `reader`, `card`; routing and access count for Agent 5, targeting for Agent 7 (a wrong lowers THAT agent and adds a test); the real sample's per-agent sizes (Agent 5: 11, Agent 7: 14). |
| `utils/sampleEvidence.test.ts` | 10 | 11 | `signalSource`. |
| `services/queriesV40.test.tsx` | 40 | 43 | `size` 26 for the CX manager (not 50); the brief's `sample` 26; the pass-rate test runs as `auditmkt` (Agent 2's rows are audit rows); new: rows per role, brief and inbox counts follow the reader, a routing "wrong" lowers Agent 5 for everyone and leaves the CX tiles alone. |
| `utils/sampleCards.test.ts` (new) | 0 | 24 | Every card builder, the kind check, VIP halving, the Arabic isolates, reader and agent maps. |
| `e2e/v40-people.spec.ts` | 42 | 43 | The Weekly sample describe now opens the list ("See all as a list"): 26 and 35 rows, names, Executive, evidence per row, audit rows, Open (a fix, a call, a customer; "Open a signal" is not reachable for a CX role: signals are audit rows), filter. The 375 px and axe cases keep their paths and now cover the card flow. |
| `e2e/v40-orientation.spec.ts` | | | One assertion: Internal Audit's inbox item reads "35 outputs to read" (was 50). |
| `e2e/v42-sample.spec.ts` (new) | 0 | 23 | CX content rows and the card flow; answer and counter; skip; keyboard focus and live region; All done; brief card; Open the fix; list and back; list verdict seen in the cards; Internal Audit's 35 rows, routing, access, targeting, counting; no names or text on 35 cards and the list; brief and inbox counts; Arabic RTL; 375 px (EN and AR, card and list, no page overflow); axe in EN light and AR dark on card and list views (CX team and Internal Audit); fold notes after a reload. |

## 7. Strings for Arabic review

Verbatim from the prototype (Arabic included): the two notes, the intro, the counter, the three answers, "Open the fix / signal", the questions, the card evidence and the "how" lines (`SAMPLE_EVIDENCE_COPY`, except the list below). Written for this build, needing native review:

| Key | English | Arabic |
|---|---|---|
| `WEEKLY_SAMPLE_COPY.intro` (list view) | "The outputs that passed the supervisor this week, in your part of the sample. For each one: ..." | المخرجات التي مرّت على السوبرفايزر هذا الأسبوع، في جزئك من العينة. لكل واحد: ... |
| `howFix(n)` | In similar closed cases this kind of fix was followed by recovery in about {n} of 10. It is a suggestion; the manager decides. | في حالات مغلقة مشابهة تبع هذا النوع من الحلول تعافٍ في نحو {n} من 10. إنه اقتراح؛ والمدير يقرر. |
| `howFixNoFigure` | No recovery figure for this kind of fix yet. It is a suggestion; the manager decides. | لا رقم تعافٍ بعد لهذا النوع من الحلول. إنه اقتراح؛ والمدير يقرر. |
| `kindCheck` | Check the kind too | تحقق من النوع أيضاً |
| `kindCheckLegal(issue)` | Legal and privacy is for legal, privacy or safety signals; none of this pattern's signals is one (it is about {issue}). | القانوني والخصوصية لإشارات قانونية أو خصوصية أو سلامة؛ ولا إشارة من هذا النمط منها (النمط عن {issue}). |
| `kindCheckShort` | kind check: no legal, privacy or safety signal in this pattern | فحص النوع: لا إشارة قانونية أو خصوصية أو سلامة في هذا النمط |
| `traceSent` | Trace as sent | الأثر كما أُرسل |
| `accessContains` | no conversation text, no customer name | لا نص محادثة، لا اسم زبون |
| `accessContainsAgentId` | agent id only inside the direct-manager line, no conversation text, no customer name | رقم الموظف فقط داخل خط المدير المباشر، لا نص محادثة، لا اسم زبون |
| `noProblemFlagged` | No problem flagged | لا مشكلة مرصودة |
| `severityLabel` | Severity | الشدة |
| `campaign` | Campaign | الحملة |
| `skippedNote` | These are the ones you skipped. | هذه هي التي تخطيتها. |
| `announceChecked/Skipped/Done/List/Cards` | "n of N checked." / "Skipped for now. n of N checked." / "All done for this week." / "Showing everything as a list." / "Back to one at a time." | n من N مفحوصة. / تُخطّيت الآن. n من N مفحوصة. / انتهى كل شيء لهذا الأسبوع. / عرض الكل كقائمة. / العودة إلى واحد واحد. |
| sr-only card position | (n of N) | (n من N) |

Reused (already reviewed elsewhere): `MATRIX_COPY.vipTag` ("VIP · clocks halved"), the journey rule labels, the channel labels, the action kind labels, `MATRIX_LINE_LABELS`-style "respond / resolve". The Arabic fix title in the sample data is the generic "معالجة النمط المرصود لهذا الفريق" (existing mock data). In Arabic a clock ("½ h", "4.5 h") is isolated left to right with U+2066 and U+2069 so the bidi algorithm does not scramble it inside the sentence.

## 8. [Proposed] decisions and deviations from the prototype

| # | Decision | Why |
|---|---|---|
| 1 | The Executive reads the content rows as a list, with no card flow and no switch | Nothing to answer; the prototype shows it the CX rows and the CX note |
| 2 | The six Agent 3 rows (pattern counts) go to Internal Audit; the card shows the pattern and up to three signals; the question is the prototype's "Should this count as a signal?" | `wsReader`; the React rows are patterns, the prototype's are signals |
| 3 | The routing row's "What it produced" is `{fix title} → {owner}` (the prototype: "Routed to: {owner}"); the card keeps "Routed to" | The list line shows "repeat contact → Legal"; the supervisor test text ("Catch this: ...") names the fix |
| 4 | **Kind check** on a routing row: a Legal and privacy fix is for legal, privacy or safety signals; with none in its pattern the row shows a warning line | In this data CA-201's receiver (Legal) EQUALS the matrix receiver for its kind and product; the error is the kind. Only CA-201 is flagged; the rule is the existing one (a legal or privacy signal is the only one that opens a case) |
| 5 | The routing row shows the VIP-halved clocks and "VIP · clocks halved" for a fix whose pattern holds a VIP (CA-201 and CA-203 share the person) | "matrix receiver and clocks": the clocks that apply to that fix |
| 6 | The Fix card's "How" quotes the pattern's own recovery figure ("about 8 of 10"), the prototype hard-codes "about 7 of 10" | A fixed 7 would contradict the 78% on the same card |
| 7 | The card quotes no agent name (the prototype adds it for roles that may see names) | Names stay out of the sample; the CX roles open the fix for it |
| 8 | Skipped cards go to the end of the queue and return | The prototype's skip clamps to the last card |
| 9 | `FoldNote`: the two notes fold and the choice is remembered | Phone first screen |
| 10 | Targeting rows carry `MC-101` to `MC-104` as their ref, the prototype's campaign ids | A later cross-reference with the Campaign audit page |
| 11 | The list's intro no longer says "Fifty outputs" | The reader sees 26 or 35 |
| 12 | The matrix is a snapshot at build time | The sample records what the AI was given |
| 13 | The audit rows are appended after the original fifty, not mixed in | Stable ids; the prototype appends too |
| 14 | No brief line and no inbox item are added for the CX roles | See section 9 |

## 9. Known gaps

- `data/tours.ts` (not mine) still says for Internal Audit: "Fifty outputs, right or wrong. A wrong becomes a test for the supervisor." It is now 35 and a "yes / no" on cards. The step still lights the card (or the table).
- The KB says "the daily brief reminds each reader how many are left". Only Internal Audit has the brief line and the inbox item today (`BRIEF_LINES`, `buildInbox`). The CX roles' count is already computed (26), so a CX line is one entry in `brief.ts` and one in `inbox.ts`; not added, because an extra CX inbox row changes the order the CX tour clicks into. Decide, then add.
- "Open the signal" exists on the card but no default reader sees a signal card with it: signals are audit rows and Open is for CX roles. It is tested at component level only.
- The "N outputs to read, M read" wording of the inbox item (existing) counts the total as "to read".
- A double-click on an answer answers two cards (the next card appears under the pointer at once). No guard was added: it would also swallow fast keyboard and test input.
- Not verified: a real screen reader (NVDA, VoiceOver) reading the live region and the focus move; Safari and Firefox.
