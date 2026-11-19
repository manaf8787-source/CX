# V40.1 verdict: closing the 60-day check

Date: 19 Nov 2026. Closes one gap: in the prototype (v40.1 block "partial verdict, second step, investigate from a fix, 60-day wording") a fix in the 60-day check lets the CX manager and the CX team record the verdict, and a partial or failed verdict asks for decision 3. React derived the readout and had `useSetFixStatus`, but no screen called it. All data is sample data. Nothing is committed.

Rule (Modules KB, "Corrective actions"; Programme KB, "Recovered and worked"): effective = the same signals dropped by half or more and did not return for 90 days; partial = dropped by less than half; failed reopens the signal for a person. A corrective action is a suggestion: **a person decides**, the automatic readout is only the evidence.

## 1. What a person can do now

| Where | Who | What |
|---|---|---|
| Fix in `verification` ("60-day check") | CX manager, CX team (`canRecordFixVerdict`) | A well "Record the verdict" under the readout, three buttons: **Signals dropped: effective**, **Dropped under half: partial**, **No drop: back to root cause** |
| Fix in `partial` or `failed` | CX manager, CX team | A bar (title = the verdict sentence, then "Decision 3: ..."), three buttons: **Ask for a second step**, **Investigate first (5 interviews)**, **Accept as is** |
| Both | everyone else (owner, environment manager, team lead, HR, L&D, Marketing, Audit, executives, shopper) | Reads the status, the readout and the next step; sees no button |

### The three flows and what each writes

| Flow | Hook | Writes |
|---|---|---|
| Verdict (effective, partial, failed) | `useSetFixStatus` (queriesV40, unchanged) | `status`, `verificationResult`, audit line "Verdict: effective / partial / failed" by the signed-in role; toast "Verdict recorded: ..." |
| Ask for a second step | `useRequestSecondStep` | A NEW fix (`ca-<max+1>`, shown `CA-2nn`): status `proposed`, same `kind`, `owner`, `product`, `patternId`, `proposedAt` now (so the 5-working-day approval window starts now), `proposedBy` "CX manager, after a partial result", title "Second step on CA-2xx: <title>" in both languages, `parentFixId`, `parentOutcome`, a due date as approval today would give (matrix, as for any new fix), first audit line "Second step requested after CA-2xx". On the parent: audit line "Second step requested: CA-2yy". Toast "CA-2yy proposed on the same pattern; the owner has 5 working days." Then `navigate('/actions/corrective?fix=CA-2yy')`: the new fix is the selected one |
| Investigate first | `useInvestigateFromFix` | An `Investigation` (`inv-<max+1>`): kind interviews, `requestedCount` 5, `doneCount` 0, status `in_progress`, `patternId` of the fix, `environment` = the pattern's team, `note` "Requested from CA-2xx after a partial result." Audit line on the fix "Investigation requested: 5 interviews (INV-n)". Toast, then `navigate('/actions/investigations?inv=INV-n')` (the page highlights it). The fix keeps its verdict |
| Accept as is | `useAcceptFixAsIs` | `status` effective, `verificationResult` effective, ONE audit line "Accepted as is after a partial result" (or "failed"). Toast "Accepted as is; the fix is marked effective." |

The three decision hooks refuse a role outside CX, and a fix that is not partial or failed (the card shows no button there anyway).

Linked both ways: the new fix's header reads "Second step after CA-2xx (Partial: second step needed)" (the parent as a trace id button; the parenthesis is the verdict at the time, kept in `parentOutcome`); the original lists "Second step: CA-2yy" as trace ids.

## 2. Data shape

| Type | Added |
|---|---|
| `CorrectiveAction` | `parentFixId?: string`, `parentOutcome?: 'partial' \| 'failed'` (the verdict when the second step was requested; kept because the parent may be accepted as is afterwards) |
| `Investigation` | `note?: Bi` (shown on the Investigations row, `data-testid="inv-note"`) |

Seeded sample (unchanged): CA-201 partial, CA-202 proposed, CA-203 in progress, CA-204 in its 60-day check.

## 3. Files

Added: `src/utils/fixVerdict.ts` (copy, id numbering, `buildSecondStep`, `buildInvestigationFromFix`, audit lines), `src/services/fixVerdictQueries.ts` (the three mutations and `useSecondSteps`), `src/pages/actions/components/FixVerdict.tsx` (`FixVerdictSection`, `FixLineage`), their tests (`utils/fixVerdict.test.ts`, `services/fixVerdictQueries.test.tsx`, `pages/actions/components/FixVerdict.test.tsx`), `e2e/v401-verdict.spec.ts`.

Changed:

| File | Change |
|---|---|
| `src/types/domain.ts` | the fields above |
| `src/auth/permissions.ts` | `canRecordFixVerdict` (cxmgr, cxteam) |
| `src/lib/status.ts`, `LifecycleStepper.tsx` | `partial` = "Partial: second step needed", `verification` Arabic = "فحص 60 يوماً" (English was already "60-day check") |
| `src/data/steps.ts` | `fixNext('partial')` = the second-step sentence on step `ca`, "within 5 working days"; new `REJECTED_FIX_NEXT` (a rejected proposal used `fixNext('partial')` as its closing sentence) |
| `pages/actions/components/fixNextStep.ts` | uses `REJECTED_FIX_NEXT`; `isAiMadeFix` is false for a second step (a person's decision: no Agent 5 chip) |
| `src/data/glossary.ts` | "60-day check" now names the three verdicts and who records them |
| `pages/actions/components/FixCard.tsx` | three small edits: imports, `<FixLineage />` under "Proposed by", `<FixVerdictSection />` under the readout; the status tag is warning for `partial`. The `data-tour` attributes and the matrix and VIP edits are untouched |
| `pages/actions/Investigations.tsx` | shows `inv.note` |
| `pages/actions/Corrective.tsx` | a `?fix=` link that changes drops a status filter that would hide the fix (the new second step is `proposed`; the filter may be "Partial"); the Status select is wider and its row wraps, so the long label is not cut at 320px |
| `pages/settings/MonthlyPack.tsx` | the Arabic of "Awaiting 60-day check" says "فحص" like the status |
| Tests updated | `data/steps.test.ts`, `pages/actions/components/fixNextStep.test.ts` (partial no longer reads "Closed with a reason"), `data/glossary.test.ts` |

`docs/V40_WS_B.md` still lists "No verdict buttons" as a known gap: superseded by this document (that file is not edited here).

## 4. Design (docs/MEO_DESIGN_SYSTEM.md)

A well with the 6px status dot, not a coloured banner (rule 7: colour is categorical, never on a background): warning dot for partial, error dot for failed; the prototype's "tinted bar" becomes the design system's inline-note composition. The primary action is the one dark pill (Effective; Ask for a second step), the others are light pills. The long labels wrap inside the pill (`roll={false}`, `whitespace-normal`) and are centred, so a 320px phone shows three full-width pills. The off state of "Ask for a second step" is `aria-disabled` (still focusable, described by "A second step is already open on this fix."), not `disabled`. Weights 400 and 500, no borders, focus rings by the global rule. Arabic: logical layout only; checked at 1440 and 320px.

## 5. [Proposed] decisions and deviations from the prototype

| # | Item |
|---|---|
| P1 | Verdict button labels are the prototype's for all three ("Signals dropped: effective" and "No drop: back to root cause" from the older `caDetail`, "Dropped under half: partial" from the v40.1 block), not the short words "Effective" and "Failed". |
| P2 | The line above the three buttons ("Record the verdict" / "You decide; the automatic readout is only the evidence.") and the verdict toasts are new; the prototype has none. |
| P3 | After a **failed** result the strings say "failed": `proposedBy` "CX manager, after a failed result", investigation note "... after a failed result." The prototype hard-codes "partial" for the first and writes "after a partial: second step needed result" (a label spliced into a sentence) for the second. Same for Arabic. |
| P4 | `proposedBy` names the acting CX role: "CX team, after a partial result" when the CX team asks. |
| P5 | The prototype's "Investigation opened under Signals and fixes → Investigate" says "→ Investigations" (the React tab name). |
| P6 | A second step already open (not rejected) turns "Ask for a second step" off on the parent; the prototype would create a duplicate on every click. |
| P7 | A fix with no pattern (an AI Insights proposal) has no "Investigate first" button: the investigation hangs on a pattern (the prototype's "first signal"). |
| P8 | Accept as is is immediate, as in the prototype, with no confirmation dialog; the audit line records it. |
| P9 | `parentOutcome` is stored beside `parentFixId` so the parent's verdict is not re-read from a status that may have changed. |
| P10 | The new fix's first audit line is "Second step requested after CA-2xx" by the CX role (a person), not "Proposed by Agent 5" by the system. |
| P11 | The next-step box of a partial fix is on step `ca` (Fix), as in the prototype (`cur` is `vr` only for verify, effective, failed). |
| P12 | The status filter reset described in section 3 (a fix named by a link is always shown). |

## 6. Strings for Arabic review

| English | Arabic |
|---|---|
| Partial: second step needed | جزئي: خطوة ثانية مطلوبة (prototype) |
| 60-day check | فحص 60 يوماً (prototype; was "تحقق 60 يوماً") |
| Signals dropped: effective | انخفضت الإشارات: فعّال (prototype) |
| Dropped under half: partial | انخفضت أقل من النصف: جزئي (prototype) |
| No drop: back to root cause | لم تنخفض: العودة للسبب الجذري (prototype) |
| Partial: the signals dropped by less than half. / Failed: the signals did not drop, or came back. | جزئي: انخفضت الإشارات أقل من النصف. / فشل: لم تنخفض الإشارات أو عادت. (prototype) |
| Decision 3: ask the owner for a second step, or investigate first if the cause is unclear. | القرار 3: اطلب من المالك خطوة ثانية، أو حقّق أولاً إن كان السبب غير واضح. (prototype) |
| Ask for a second step / Investigate first (5 interviews) / Accept as is | اطلب خطوة ثانية / حقّق أولاً (5 مقابلات) / اقبله كما هو (prototype) |
| The owner proposes a second step; the CX manager approves it as a new fix on the same pattern / within 5 working days | المالك يقترح خطوة ثانية؛ مدير CX يعتمدها كحل جديد على النمط نفسه / خلال 5 أيام عمل (prototype) |
| CA-2yy proposed on the same pattern; the owner has 5 working days. | CA-2yy مقترح على النمط نفسه؛ أمام المالك 5 أيام عمل. (prototype) |
| Second step requested: CA-2yy | طُلبت خطوة ثانية: CA-2yy (prototype) |
| Investigation requested: 5 interviews (INV-n) | طُلب تحقيق: 5 مقابلات (INV-n) (prototype plus the id) |
| **New, to review:** Record the verdict | سجّل الحكم |
| You decide; the automatic readout is only the evidence. | القرار لك؛ القراءة التلقائية دليل فقط. |
| Verdict recorded: effective / partial. Decide the second step. / failed. The signal reopens for a person. | سُجّل الحكم: فعّال / جزئي. قرّر الخطوة الثانية. / فاشل. تُفتح الإشارة من جديد لشخص. |
| Second step after CA-2xx (Partial: second step needed) | خطوة ثانية بعد CA-2xx (جزئي: خطوة ثانية مطلوبة) |
| Second step: CA-2yy | الخطوة الثانية: CA-2yy |
| Second step requested after CA-2xx | طُلبت خطوة ثانية بعد CA-2xx |
| CX manager, after a partial result / CX team, ... / ... failed result | مدير تجربة العملاء، بعد نتيجة جزئية / فريق تجربة العملاء، ... / ... نتيجة فاشلة |
| Requested from CA-2xx after a partial result. | طُلب من CA-2xx بعد نتيجة جزئية. (prototype spliced the label: "بعد نتيجة جزئي: خطوة ثانية مطلوبة") |
| Investigation opened under Signals and fixes → Investigations. | فُتح تحقيق تحت الإشارات والحلول ← التحقيقات. |
| Accepted as is after a partial result / Accepted as is; the fix is marked effective. | قُبل كما هو بعد نتيجة جزئية / قُبل كما هو؛ عُلّم الحل فعّالاً. |
| A second step is already open on this fix. | توجد خطوة ثانية مفتوحة على هذا الحل. |
| Could not save. Try again. | تعذّر الحفظ. حاول مرة أخرى. |
| Glossary, "60-day check": "Dropped by less than half is partial and asks for a second step; no drop, or back, is failed and reopens the signal. A person records the verdict; the automatic readout is only the evidence." | انخفاضها بأقل من النصف يعني جزئياً ويطلب خطوة ثانية؛ وعدم انخفاضها أو عودتها يعني فاشلاً ويعيد فتح الإشارة. وشخص هو من يسجّل الحكم؛ والقراءة التلقائية دليل فقط. |

The prototype also says "Not effective" (`CA_ST.fail`) where React says "Failed" (unchanged: failed reopens the signal for a person).

## 7. Tests

Unit: `utils/fixVerdict.test.ts` (permission, copy, ids, the built fix and investigation, audit lines), `services/fixVerdictQueries.test.tsx` (the verdict, the three mutations, refusals), `pages/actions/components/FixVerdict.test.tsx` (card states by role, EN and AR, each button's effect), plus the updated `steps`, `fixNextStep`, `glossary` tests. E2E: `e2e/v401-verdict.spec.ts` (flows, roles, keyboard, Arabic RTL, 375 and 320px, axe EN light and AR dark on a fix in `partial`, on a second-step fix and on the Investigations page).

## 8. Known gaps

- The automatic readout (`utils/effectiveness.ts`) still calls 25% a pass and 10% not working; the rule is half and held 90 days, and the button says "under half". The readout is evidence only and the sample's "effective" fixes are built around it, so it was not changed; align it with the rule when the real signal counts exist.
- The 90-day "did not return" part of the rule is not checked anywhere: the person judges it.
- A partial fix awaiting decision 3 is not an inbox item, and the pattern card on the Signals page links to the first fix of a pattern only (the original), not to its second step. The Trace card of a pattern still names the first fix.
- The second step has no readout until its own check; the sample series is on the seeded fixes only.
- The owner "proposes" the second step in the sentence, but here the CX role creates it directly (as the prototype does); no owner-side screen.
