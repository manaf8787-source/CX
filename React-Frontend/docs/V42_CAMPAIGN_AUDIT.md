# V42.1 F33: Campaign audit and the Internal Audit role (19 Nov 2026)

Status: built, tested. Spec: `V42_DELTA.md` F33; `DECISIONS-2026-11-19.md` decisions 2 and 4; prototype v42.1 (`ROLES.ia.d`, the section `2. campaign audit`: `campList`, `CAUD_Q`, `vCampAudit`, `V31ACT`, the nav and role insertion, the inbox items `CAUD` and `CAUD2`, the brief line, the tour step); Modules KB "Campaign audit: before it runs, and after" and section 2; Programme KB section 47. Design: `MEO_DESIGN_SYSTEM.md` (nothing new in the system). All figures are sample data.
Marks: **[Proposed]** = a choice the spec did not make. None shows in the UI; they are listed here.

## What it is

Every campaign (Marketing's, one per persona, and the CX team's AI interview campaigns from Close the loop) is cleared or sent back by the Internal Audit and Marketing Lead before anything reaches a customer, and audited again after the run. Route `/settings/campaign-audit`, listed in the Settings sub-navigation right after Weekly sample.

| Part | What |
|---|---|
| List | A segmented control (pressed variant) with one button per campaign: `MC-101` to `MC-106` (the six personas, in persona order) then every AI interview campaign (`camp-ai-1` and any the CX team creates). A cleared campaign shows a check, a sent-back one an undo arrow; the accessible name carries the state in words. `?campaign=` picks one and is written back as you choose |
| Four KPI cards | Waiting for clearance (and how many are sent back), Running, Finished, Targeting signals [Proposed: the prototype has none] |
| One campaign | Name, `id · kind · owner · state`, a stage tag (Before, Running, After) |
| Five checks | Right people, Right projects and developers, Right channel language and timing, Right message, The money: each with its rule text (prototype `CAUD_Q`, verbatim), "What the campaign says" (built from the persona or the AI campaign: persona, segment definition, size, projects and developers, channel, message with the persona's "what not to do", budget, cost per contact, expected responses, expected cost per lead) and a pass or fail control |
| Verdict | "Cleared to run" or "Send back to Marketing with the failed checks", a Cleared or Sent back tag, and a note; a sent-back campaign lists its failed checks (`role=list` "Failed checks") |
| After the run | Reached the right people (%), Responded (%), Leads or recoveries, Cost per result; under 80% a warning note "Targeting signal raised to Marketing", at or above it "no signal". Shown for a running campaign (tagged "so far") and a finished one |
| Phone | Container query on the page: below 42rem of page width the five checks stack (rule, what the campaign says, verdict controls one under the other); tested at 320 and 375 EN and AR, no page-level sideways scroll |

## Who does what

| Role | Page | Marks and verdict | Starts a cleared campaign |
|---|---|---|---|
| Internal Audit and Marketing Lead | yes | **edits** | no (it audits, never runs) |
| CX manager | yes | **edits** | yes, both kinds |
| CX team | yes (every page) | reads | AI interview campaigns |
| Marketing manager | yes | reads | persona campaigns |
| Executive | yes | reads | no |
| Environment management, team lead, After-Sales lead, L&D, HR specialist, HR manager, shopper | no | the access guard sends the role to its own home |

`canEditCampaignAudit` and `canStartCampaign` are in `auth/permissions.ts`; the register enforces them as well (`not_allowed`). The CX team is not in the prototype's list for the page (`ia, cxm, mk, ex`), but React gives the CX team every page, and it creates the AI campaigns the gate holds back, so it reads [Proposed].

## The gate: what is gated and how

Neither flow had a start action before. An AI interview campaign is created by the CX manager and the CX team in Close the loop as a **draft** and stayed one (only the seeded `camp-ai-1` is "running"); the persona campaign recommendation on Personas ("Ranked next campaigns") is a read-only row, Marketing writes the campaign elsewhere. So the gate adds a Start control to each place, and the control is refused unless the campaign is cleared. Nothing was removed. [Proposed]

| Where | What changed |
|---|---|
| Close the loop, "AI interview campaigns" card, each campaign | Under the existing card: the clearance tag (Cleared by Internal Audit, Waiting for clearance, Sent back), a "Campaign audit" link to that campaign, and for the CX manager and CX team **Start campaign** (a draft) or **Mark as finished** (a running one). Not cleared: the button is `aria-disabled`, tied by `aria-describedby` to the reason written beside it ("Not cleared yet: it cannot start. The Internal Audit and Marketing Lead clears it first; nothing is sent to a customer until then." or, when sent back, the failed checks), and pressing it does nothing. Creating a campaign works as before; the toast now adds "It cannot start until the Internal Audit and Marketing Lead clears it." |
| Personas, "Ranked next campaigns" | A new column "Campaign audit" (one gate per ranked campaign, same component) with the same tag, reason, link and, for the Marketing manager and the CX manager, Start campaign or Mark as finished. A click or Enter on the controls does not jump the table to the persona. On a phone the gate is on the row's second line |
| The register (`campaignAuditStore.start`) | The lock that does not depend on the buttons: `start` throws `not_cleared` unless the verdict is "cleared", for every role, and a refused start changes nothing (tested for waiting, half-marked and sent back). The CX manager and CX team cannot start an AI campaign, nor Marketing a persona campaign, around it |

Starting an AI campaign sets its own status to running in Close the loop, finishing it to closed (`MOCK_AI_CAMPAIGNS`); a persona campaign's stage lives in the audit register only. `fetchAiCampaigns` now returns copies, so the card's status tag follows (found in the browser: the register is edited in place and the tag stayed "Draft").

Not gated (and why): the call-list rows of channel `ai_campaign` (the human call list is the default and a campaign only hands over after no-answers: no message goes out from a draft in this sample), the assistant's saved campaign briefs for Marketing (a brief is not a run), and surveys.

## Data model

| File | What |
|---|---|
| `src/data/campaignAudit.ts` | **New.** Types (`CampaignKind`, `CampaignStage` before / running / after, `CheckId`, `Verdict`, `Clearance` cleared / waiting / sent_back), `AUDIT_CHECKS` (five, EN+AR rule texts), `CAMPAIGN_AUDIT_COPY` (every string of the page, inbox and gates), `buildAuditCampaigns(personas, aiCampaigns)`, `campaignSays`, the money formulas (`expectedResponses`, `expectedCostPerLead`), `sampleResults`, `belowTargetingLine`, `TARGETING_LINE_PCT` = 80 |
| `src/services/mockCampaignAudit.ts` | **New.** `createCampaignAuditStore(getCampaigns, { onStage, now })`: `list`, `setCheck`, `setVerdict`, `start`, `finish`, `reset`; `CampaignAuditError` with codes `not_found`, `not_allowed`, `locked`, `checks_incomplete`, `no_failed_check`, `not_cleared`, `wrong_stage`. Pure of the mock arrays (they come in through `getCampaigns`) |
| `src/services/campaignAuditQueries.ts` | **New.** The one store of the app, `useCampaignAudit`, `useCampaignAuditSummary`, `useCampaignGate(sourceId)`, mutations `useSetCampaignCheck`, `useSetCampaignVerdict`, `useStartCampaign`, `useFinishCampaign` (the cached list is updated at once; the audit state survives navigation like the other registers) |
| `src/utils/campaignAudit.ts` | **New.** `summariseCampaignAudit` (waiting, sent back, running, finished, signals, reached % of running ones), `targetingSignals`, `campaignAuditInboxItems`, `startBlock`, `defaultCampaignId`, `failedCheckNames` |
| `src/pages/settings/CampaignAudit.tsx` | **New.** The page (default export, lazy route) |
| `src/components/campaigns/CampaignGate.tsx` | **New.** `CampaignGate` and `ClearanceBadge`, used by Close the loop and Personas |

Campaign list, as the prototype computes it: id `MC-101 + k`; size = persona segment size x 40 + 60; budget (k+2) x 3,500; cost per contact 3 + k mod 3; projects alternate between the prototype's two lines (kept in English in both languages); expected responses 12% of the size, expected cost per lead = budget / (30% of the expected responses, at least 1). Stages: the first two Marketing campaigns running, the next two waiting for clearance, the last two finished; an AI campaign follows its status (draft, running, closed) with budget AED 400 and AED 1 per contact. A campaign that already runs or finished is seeded as **cleared** (five checks passed, verdict ok, by the audit lead, a sample date), because nothing is sent before clearance and the sample respects it [Proposed].

Sample results (deterministic): MC-101 and MC-102 71%, 14%, 9 leads, the budget (the prototype's `res`); the prototype gives none to the other campaigns, so MC-105 86%, 21%, 14 leads and MC-106 78%, 18%, 11 leads (one above and one below the line), `camp-ai-1` 71%, 40%, 2 recoveries, and any campaign started later a figure derived from its id [Proposed]. In the sample four runs are under 80%: MC-101, MC-102, MC-106, `camp-ai-1`.

The targeting signal is **derived** (`reached` under 80%), not written to the signals register: that register holds customer-voice signals and its counts feed Home and the patterns [Proposed].

## Rules the register enforces

| Rule | |
|---|---|
| Who | Only the audit lead and the CX manager mark checks and decide (`not_allowed` for anyone else) |
| Clear | "Cleared to run" needs all five checks passed (`checks_incomplete`). [Proposed: the prototype lets it be pressed at any time] |
| Send back | Needs at least one failed check (`no_failed_check`), so "with the failed checks" always lists something. [Proposed] |
| A changed check | Withdraws the verdict: the campaign waits for clearance again [Proposed] |
| Closed | Once a campaign has started (running or finished) its checks and verdict are closed (`locked`) [Proposed] |
| Start | Only a campaign that has not started, only when cleared (`not_cleared`, `wrong_stage`) |
| Finish | Only a running campaign |
| Buttons | The two verdict buttons are `aria-disabled` while they cannot apply, with the reason under them; pressing does nothing |

## Inbox and brief (Internal Audit and Marketing Lead only)

| Item | Text | Rules |
|---|---|---|
| Inbox, kind `caud` | "Clear or send back: N campaigns waiting before they run" (prototype wording; 1 reads "1 campaign waiting before it runs"; Arabic agrees in number: حملة واحدة، حملتان تنتظران، 3 حملات، 12 حملة) | Priority 2 (urgent, "Most urgent" tag), 2 working days, with the Marketing manager, opens the Campaign audit. Counts campaigns before the run with no verdict: a sent-back one is with Marketing |
| Inbox, kind `caud2` | "Audit after the run: N finished campaigns" | Priority 0, 5 working days, with nobody, opens the Campaign audit. Counts campaigns in the After stage (there is no "audited" mark, as in the prototype) |
| Order | caud, then the weekly sample, then caud2 | A row with nothing to count is not listed |
| Daily brief (kind `campaigns`) | "2 campaigns wait for your clearance; 3 running, 71%, 71% and 71% reached the right people so far" | After the NPS lines (the prototype puts it second) [Proposed position]; counts agree; "No campaign waits for your clearance" / "none running" say an empty side in words; no line when nothing waits and nothing runs; the line opens the page |

The hooks read the audit only for this role (`enabled`), so no other role waits for it. Edits: `BriefInputs.campaigns?` and `InboxInput.campaignAudit?` are optional, `InboxKind` gains `caud` and `caud2`, the inbox page has their icons.

## The role, the tour, the menu

| What | Now |
|---|---|
| `ROLE_DEFS` description of the Internal Audit and Marketing Lead | The prototype's `ROLES.ia.d`, EN and AR, word for word: "Audits, never approves fixes: ..." |
| `ROLE_SCOPE` row (Teams and structure, "Modules KB section 2") | Pages add Data feeds, Weekly sample, Campaign audit; "can" is the v42 KB row (Arabic is mine, see below) |
| Tour | The audit lead's tour gains the prototype's fourth step, "Campaign audit", after the weekly sample (route `/settings/campaign-audit`, target `[data-tour="campaign-audit"]`, the checks card): 4 steps become 5. Pinned in `data/tours.test.ts`, `components/tour/TourProvider.test.tsx`, `e2e/v41-tour.spec.ts`. **Not done:** the prototype v42.1 also rewords the audit lead's *weekly sample* step (title "Your part of the weekly sample", "You do not approve fixes. You check that the AI followed the rules ..."): that belongs to the weekly-sample workstream (F32) and was left alone |
| Settings menu | "Campaign audit" right after "Weekly sample". The entry carries `skipLanding`: listed there it would have become Marketing's landing page (its first allowed page under `/settings`); with it, every role lands where it did (unit and e2e) |
| Access | `CAMPAIGN_AUDIT_PAGE` in the paths of Marketing, the audit lead, Executive (the CX roles have every page); loader `campaignAudit`, prefetch entry before the generic `/settings` one, lazy route |

## The permission decision (decision 2: the audit role never approves a fix)

What React let `auditmkt` do on fixes before this work, checked: **nothing that approves.** `canActOnCorrectiveAction('auditmkt', any kind)` is false (it is in `INFORMED_ONLY_ROLES`), the role has no `/actions` path (so no Corrective page, no decision dialog, no `data-tour="fix-decide"`), `visibleFixes` returns nothing for it (so no "approve", "do" or "verify" row in its inbox), `canRecordFixVerdict` and `canActOnShopperCase` are false. The prototype agrees: `isMgr()` (the approve buttons) is the CX manager only, and `ROLES.ia.views` has no incidents or actions view. So **no permission code changed**; the decision is now pinned by tests (`auth/permissions.test.ts`: no decide control for any kind, no Actions page; `utils/campaignAudit.test.ts`: proposed fixes exist and none reaches its inbox; e2e: no Approve control, the guard sends it home). It still reads fixes through the weekly sample's audit rows. Only the CX manager's inbox holds the approvals.

## Open items for Manaf

1. **The matrix tension (not resolved here).** The escalation matrix's "Marketing" kind lists the Internal Audit and Marketing Lead as first receiver in five of six products (Real Estate, After-Sales, Club, Tour Estate, Wallet; in Events the Marketing manager is first and the lead is informed). Decision 2 says the lead never approves a fix. Implemented as the prototype does: the lead has no Actions page, so a fix of that kind is **not in its inbox and it cannot decide, mark done or open it**; it reads the fix only through the audit rows of the weekly sample. Receiving and working a fix is not approving it, so the matrix may be right; but a "receiver" who cannot open the fix is a gap. Options: (a) keep, and name the Marketing manager as first receiver in those rows (as Events already does), (b) give the lead a read-and-do view of Marketing-kind fixes without the decide control, (c) leave it as is until the product owners adjust titles (28 Nov).
2. **Who starts a campaign.** Neither flow had a start action. I added Start and Mark as finished: the CX manager and CX team for AI interview campaigns, Marketing and the CX manager for persona campaigns, never the audit lead. Is Marketing's campaign started in the portal at all, or only recorded?
3. **"Send back to Marketing" for an AI interview campaign.** The prototype's button and toast say Marketing for every campaign; an AI campaign's owner is the CX team. Kept literal. Same for the targeting signal "to Marketing" under 80%.
4. **Clear needs all five checks.** Stricter than the prototype (which lets "Cleared to run" be pressed with a failed or unanswered check). Keep, or follow the prototype?
5. **Sample results** for the campaigns the prototype gives none (MC-105, MC-106, `camp-ai-1`) and the 71% of the running ones: all invented sample figures.
6. **After-run audit**: nothing marks "audited after the run", so the inbox count of finished campaigns only rises. The prototype has none either.
7. **CX team on the page**: reads (not in the prototype's list; React gives it every page).
8. **Tour wording**: the audit lead's weekly-sample tour step still carries the old text (see above), pending the F32 workstream.

## Strings that are not the prototype's (Arabic for native review)

| Where | English | Arabic (mine) |
|---|---|---|
| Page intro | the prototype's text | the prototype's, with "مسؤول" for the role (the name this app uses) where the prototype's string says "مدير" |
| View-only note | View only: the Internal Audit and Marketing Lead and the CX manager clear or send back campaigns. | للعرض فقط: يجيز الحملات أو يعيدها مسؤول التدقيق الداخلي والتسويق ومدير تجربة العملاء. |
| Segmented label, list label | Campaigns; The five checks | الحملات؛ الفحوصات الخمسة |
| KPI cards | Waiting for clearance / none sent back / n sent back, with Marketing; Running / cleared before they started; Finished / to audit after the run; Targeting signals / reached under 80%, sent to Marketing | تنتظر الإجازة / لا حملات مُعادة / n مُعادة، لدى التسويق؛ تعمل / أُجيزت قبل أن تبدأ؛ انتهت / للتدقيق بعد التشغيل؛ إشارات الاستهداف / وصلت لأقل من 80%، أُرسلت للتسويق |
| Check controls | Pass; Fail; Not checked yet | مطابق؛ غير مطابق؛ لم يُفحص بعد |
| Verdict hints | Mark all five checks ✓ to clear it. / Mark at least one check ✗ to send it back. | علّم الفحوصات الخمسة بـ ✓ لإجازتها. / علّم فحصاً واحداً على الأقل بـ ✗ لإعادتها. |
| Verdict notes | Waiting for clearance. Nothing is sent to a customer until it is cleared. / Cleared on {date}. It can start; nothing was sent before this. / Cleared on {date}, before anything was sent. The checks are closed: the campaign is running or finished. / Sent back with the failed checks; Failed: {names}. It cannot start until it is cleared. | تنتظر الإجازة. لا يُرسل شيء لزبون قبل إجازتها. / أُجيزت في {date}. يمكن أن تبدأ؛ ولم يُرسل شيء قبل ذلك. / أُجيزت في {date} قبل إرسال أي شيء. الفحوصات مغلقة: الحملة تعمل أو انتهت. / أُعيدت مع الفحوصات الفاشلة؛ الفاشلة: {names}. لا يمكن أن تبدأ قبل إجازتها. |
| Failed list (`aria-label`) | Failed checks | الفحوصات الفاشلة |
| Targeting signal | Targeting signal raised to Marketing; {n}% of the recipients match the persona on the record, below the 80% line.; {n}% match the persona on the record: at or above the 80% line, no signal. | إشارة استهداف رُفعت للتسويق؛ {n}% من المستلمين يطابقون الشخصية في السجل، أقل من حد 80%.؛ {n}% يطابقون الشخصية في السجل: عند حد 80% أو فوقه، دون إشارة. |
| Gates | Cleared by Internal Audit; Waiting for clearance; Sent back; Start campaign; Mark as finished; Campaign started.; Campaign marked as finished.; the reasons (waiting, sent back); Campaign audit; Run; Running; Finished; "It cannot start until the Internal Audit and Marketing Lead clears it." (toast on creation); Could not start the campaign. | أجازها التدقيق الداخلي؛ تنتظر الإجازة؛ أُعيدت؛ ابدأ الحملة؛ علّمها منتهية؛ بدأت الحملة.؛ عُلّمت الحملة منتهية.؛ الأسباب؛ تدقيق الحملات؛ التشغيل؛ تعمل؛ انتهت؛ "لا يمكن أن تبدأ قبل أن يجيزها مسؤول التدقيق الداخلي والتسويق."؛ تعذّر بدء الحملة. |
| Brief and inbox plurals | "No campaign waits for your clearance", "none running", the Arabic count agreement | لا حملة تنتظر إجازتك، لا حملة تعمل، تنتظر حملة واحدة / حملتان / n حملات / n حملة |
| Teams and structure row (Modules KB section 2, v42 row) | the KB's English | pages, sees and can composed from the prototype's Arabic fragments (يدقّق ولا يعتمد الحلول ... يجيز كل حملة أو يعيدها قبل تشغيلها ... ويدقّقها بعد تشغيلها) |
| Project and developer names | "Al Reeman II, Saadiyat Lagoons (Aldar, Bloom)", "Reem Hills Phase 2, Yas Bay (Aldar)" | kept in English in both languages, as the prototype does |

Everything else (the five titles and rules, the verdict buttons and chips, the toasts, the tiles, the hint, the state words, the stage tags, the inbox and brief templates, the role description, the tour step) is the prototype's, compared against the source (`data/campaignAudit.test.ts` pins the rule texts and the role description).

## Deviations from the prototype

| # | Prototype | Here | Why |
|---|---|---|---|
| 1 | Either verdict button works at any time | Clear needs five passes, send back needs a failure; a changed check withdraws the verdict; closed once started | The gate must mean something |
| 2 | The page is static; nothing starts or finishes | Start and Mark as finished in the two flows, the register moves the stage | The spec: "nothing is sent before clearance", wired to where campaigns run |
| 3 | `res` only for two campaigns | Results for every running and finished campaign | The spec: after the run the numbers show |
| 4 | Brief joins percentages with " and " each time ("71% and 71% and 71%") | A list: "71%, 71% and 71%"; counts agree; empty sides said in words | Grammar, as the rest of `utils/brief.ts` does |
| 5 | Inbox "N campaigns" | Agrees for 1 and 2 in both languages; a row with a zero count is not listed | Same |
| 6 | ✓ and ✗ glyphs, coloured chips | 36px pills (dark when selected), tags with an icon and the word | Design system: colour is categorical, targets 36px |
| 7 | Role title "مدير التدقيق..." in the intro | "مسؤول التدقيق..." | The name used everywhere else in this app |
| 8 | The tour's weekly-sample step reworded | Not changed here | F32 workstream |

## Tests

Unit (own files): `data/campaignAudit.test.ts` (list, five checks and every rule text in both languages, sample results, the 80% line, inbox copy, role description), `services/mockCampaignAudit.test.ts` (checks, verdicts, transitions, the gate, who may do what), `services/campaignAuditQueries.test.tsx` (the hooks, persistence across mounts, the gate through the hooks, an AI campaign's status, the inbox and brief reading the register), `utils/campaignAudit.test.ts` (counts, signals, inbox rows, brief line, the audit role has no fix to approve), `pages/settings/CampaignAudit.test.tsx` (editor, reader, the five checks, cleared and sent back, after the run, redirect for the others, Arabic), `components/campaigns/CampaignGate.test.tsx` (Close the loop and Personas gates). Extended: `auth/permissions.test.ts`, `routes/pages.test.ts`, `data/tours.test.ts`, `components/tour/TourProvider.test.tsx`, `pages/inbox/Inbox.test.tsx`, `services/queriesV40.test.tsx`.
E2E: `e2e/v42-campaign-audit.spec.ts` (36 tests: the list and the five checks, mark, clear, send back with the failed list, the inbox count, the brief line, the menu and landing, the Close the loop and Personas gates with a full journey, who edits, who reads, who cannot open it, Arabic RTL, 320 and 375px, axe EN light and AR dark and a reader, EN dark); `e2e/helpers.ts` ROUTES 34 to 35 (`routes.spec` and `a11y.spec` cover the page in EN and AR, light and dark); `e2e/v41-tour.spec.ts` (Tour 1 / 5 and the new step).

## Known gaps

- The register is in memory (like every mock register): a page reload starts from the sample again; there is no history of who marked what and when beyond the verdict's date and role.
- No "audited after the run" mark; no comment or reason field on a send-back (the failed checks are the reason, as in the prototype).
- The persona campaign gate shows on Personas only; Marketing's own tool is out of scope ("other teams are receivers, never rebuilt here").
- The audit lead's weekly-sample tour step wording (F32).
