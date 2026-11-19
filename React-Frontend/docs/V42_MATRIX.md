# V42 matrix: the escalation matrix cells of 19 Nov 2026 (F30)

Date: 19 Nov 2026. Spec: `docs/V42_DELTA.md` F30, `docs/ESCALATION-MATRIX-2026-11-19.md` (Decision 4 closed), prototype v42 block `v42 · (1) escalation matrix cells set per product` (read only). All data is sample data. Nothing is committed (the hourly task does it). `[Proposed]` marks what the spec did not say and I chose (section 8).

## 1. What changed

| Area | Now |
|---|---|
| Seed | `buildMatrix()` gives six products x twelve rows, the cells of the document, cell for cell. Ten rows differ by product; `infosec` and `vip` are the same for every product. Each product is its own copy. |
| Rows | The ten old rows plus `infosec` ("Data exposure or system access incident") and `vip` ("Any kind, VIP customer involved"). `vip` is a **rule row** (factor 0.5), not a row of cells. |
| Decided, not proposed | No `[Proposed]` badge on the matrix page, none on the "From the matrix" line of a fix, no default-cells note. They say "Set 19 Nov · titles adjustable until 28 Nov". The "Confirm default" mechanism (`isDefault`, `confirmed`, `useConfirmMatrixCell`, the button, the stamp) is **removed**, with its tests: nothing needs it. |
| Page | New header text; the card "Three rules behind the cells" and the clock legend ABOVE the product tabs; twelve rows; an "Edited" marker on a cell changed after the set; columns now fit at 1440. |
| Fixes | The matrix line reads the new cells. A **VIP-related** fix reads the VIP version of its row, shows "VIP · clocks halved", and is due at approval + half the row's Resolve (h). A row with no resolve clock (employee) falls back to Agent 5's 14 days and the fix says so. |
| Sample | One more person tagged VIP so a sample fix is VIP-related (section 3). |

## 2. The data model

Files: `src/types/v40.ts` (matrix block), `src/data/escalationDefaults.ts`, `src/utils/matrixFormat.ts`, `src/utils/vipClock.ts`.

| Type | Shape |
|---|---|
| `MatrixKind` | The twelve: `employee service training process product environment legal marketing shopper_critical legal_case infosec vip`. `MatrixCellKind` = all but `vip`. |
| `MatrixCells` | `receiver`, `informed`, `backup`: `Bi \| null` (one string per language; a cell with two or three titles is `"A · B · C"`, as before). `respondH`, `resolveH`: `number \| null` working hours. `asDays?: { respondH?, resolveH? }`: the document writes this clock in days; display only. |
| `MatrixCellRow` | `{ kind, label, cells, edited: Record<MatrixField, boolean> }`. `edited` replaces `isDefault` with the opposite meaning: false for every seeded cell. |
| `MatrixRuleRow` | `{ kind: 'vip', label, rule: VipRule }`. No `cells`, so nothing can be mistaken for 0.5 hours. |
| `VipRule` | `{ factor: 0.5, receiver: "Same receiver, clocks halved", informed: "Head of the environment at once", informedTitle: "Head of the environment", backup: "CX manager" }`. |
| `MatrixRow` | `MatrixCellRow \| MatrixRuleRow`. `FixMatrixLine` = `{ product, kind, row, rule }`. |

Units. Stored as numeric hours, so the editing model stays numeric. "1 day" and "5 days" (Real Estate and After-Sales, shopper case and legal case: the four cells per product) are stored as **9** and **45** with `asDays`; `formatClock(hours, { asDays, lang })` writes "1 day", "5 days" (Arabic "يوم واحد", "5 أيام"); the same hours without the flag read "9" and "45". An edit of a clock clears its `asDays` (the cell is hours again; the editor sees the days beside the field until then). `null` is "–" and stays `null` everywhere downstream. The VIP row shows `formatFactor(0.5)` = "½" in both clock cells.

`ownerTitle()` (`src/data/ownerTitles.ts`) builds its lookup from the roles first, then `matrixTitles()`; every title of the matrix has an Arabic form from one dictionary, `MATRIX_TITLES_AR`, so the same English title reads the same in all six products. A title missing from the dictionary makes `title()` throw at load (the seed test catches it): nothing is translated by guessing, and a title typed in a form still passes through unchanged.

## 3. The VIP rule and where it lives

One pure util, `src/utils/vipClock.ts` (no store reads, so a real API can reuse it):

| Function | Does |
|---|---|
| `patternHasVip(pattern, signals, persons)` | True when one signal of the pattern belongs to a person with `vip`. A signal with no person never counts; no pattern is never VIP. |
| `applyVipRule(cells, rule)` / `effectiveCells(cells, rule, vip)` | Same receiver; the head of the environment added first to "informed" (not repeated if the cell already names that exact title; "–" becomes just the head); the CX manager as backup; both clocks x factor; a day cell is hours again. |
| `dueHours(resolveH, rule, vip)` | The hours the due date counts: Resolve (h), halved for a VIP, `null` stays `null`. |

Callers: `services/fixClockStore.ts` (`isVipFix`, `resolveHoursFor`, `dueFromMatrix`, `applyApprovalClock`: approval of a VIP-related fix stamps half the Resolve (h)); `services/queriesV40.ts` (`useIsVipFix`, `useFixDue`, `useFixMatrixLine`); `MatrixLine.tsx` (the VIP version of the row and one sentence under it); `FixCard.tsx` (the tag "VIP · clocks halved" in the header, so it shows with the card folded, and the due hint "matrix Resolve 22.5 h, halved for the VIP"). The create-a-fix dialog in Signals passes the pattern, so its "if approved today" date is halved the same way.

Sample data. The seeded draws give one VIP person (p-005) and none on any pattern, so no fix was VIP-related. `tagVipOnFirstFix` in `services/mockData.ts` (no random draw; the seeded sequence is untouched) tags the lowest-id person on the first fix's pattern: **p-004**, a lead (PSI Assets), who becomes lead source Club (segment stays lead; the existing `vip` invariant holds). Result: **CA-201** (Wallet, legal and privacy, partial) and **CA-203** (Wallet, employee, in progress) are VIP-related (their patterns share the repeat-contact signals); CA-202 and CA-204 are not. CA-202 is the proposed fix every older test approves, so it stays a plain one.

## 4. Fixes and clocks

| Case | Result |
|---|---|
| Due date at approval | Approval time + the row's Resolve (h) in working hours (Decision 3), x0.5 when VIP-related. |
| Employee row | Resolve is "–": `null`. The due date falls back to Agent 5's 14 days; the fix says "no resolve clock in the matrix for this kind (a management note is measured by the 60-day check): Agent 5's 14-day fallback" (preview and after approval). |
| Stored date | A fix past the proposal keeps its stored date (unchanged rule). |
| Inbox, call list | Read `fix.dueDate` and the rules; they do not read the matrix clocks, so nothing changed there. A fix owner on the sample is not derived from the matrix. |

## 5. The page

`src/pages/settings/EscalationMatrix.tsx` (and `pages/actions/components/MatrixLine.tsx`). Header, view-only note, rules card (`SectionCard`: three numbered rules, the legend as a well inside it, as in the prototype), product tabs (unchanged), the table, then the notes: "Set 19 Nov · titles adjustable until 28 Nov", the VIP-row sentence, the principles. The VIP row: label with a "Rule" tag, three rule texts, "½" and "½", no inputs. Editors get an input in every other cell (55); readers get text. Columns narrowed so six columns fit at 1440 (hours 72px, titles min 160px): before, the last column was cut at 1440. At 375px the table scrolls inside its card (tab stop while it overflows), the page does not scroll sideways, English and Arabic.

## 6. Tests

| File | Change | Why |
|---|---|---|
| `data/escalationDefaults.test.ts` (new, 86 cases) | Table-driven: a compact copy of the document (72 lines) against the seed, cell for cell; EN titles exact; clocks, day cells, "–"; the VIP rule rows; Arabic for every title; same title same Arabic; copy of the page; nothing of `isDefault` left | The seed is the document |
| `utils/matrixFormat.test.ts` (new) | "1 day", "5 days", "–", "½", fractions, units, Arabic days | The formatter |
| `utils/vipClock.test.ts` (new) | Which pattern is VIP, halving, informed list, backup, a day cell, the due date | The rule |
| `pages/settings/EscalationMatrix.test.tsx` | Rewritten: twelve rows, header, rules card above the tabs, legend, no `[Proposed]`, 55 inputs, VIP row, day cells, read-only roles, Arabic, editing, the "Edited" marker across a tab switch, a day cell edited into hours; the "Confirm default" describe is gone | New contract |
| `services/queriesV40.test.tsx` | Matrix edit (`edited`, Arabic kept), day cell cleared, the VIP row is not editable; clocks: Real Estate service is 27 h (was 45), the empty-cell reset value 27, the employee fallback, VIP half at approval, `useIsVipFix`, the halved preview, a stored date; `createActionFromPattern` (VIP pattern, product-specific training gap hours) | Old numbers came from the v40 defaults |
| `services/mockDataV40.test.ts` | Matrix block: twelve rows, per-product cells, spot checks; the sample has two VIP-related fixes | Seed changed |
| `data/ownerTitles.test.ts` | Matrix titles from `buildMatrix()`; every new title in Arabic; unknown titles pass through | `MATRIX_DEFAULTS` is gone |
| `pages/actions/Corrective.test.tsx` | The matrix line says "Set 19 Nov..." and no `[Proposed]`; CA-201 and CA-203 VIP, in Arabic too | New contract |
| `e2e/v42-matrix.spec.ts` (new, 20 runs) | Header and rules, the VIP row, day cells, six tabs x twelve rows with a cell per product, the employee row, edit across the tab switch, Audit may edit, Executive reads, Marketing is sent home, VIP fix, Arabic RTL, 375px (EN and AR), axe (matrix EN light and AR dark, read-only and edited, VIP fix) | Spec |
| `e2e/v40-trace.spec.ts`, `e2e/v40-integration.spec.ts` | Ten rows to twelve, `[Proposed]` counts to 0 and to "Edited", "Process owner (matrix)" to "Sales operations lead"; the two "Confirm default" tests became one "decided" test | Old assertions |

Unchanged on purpose: CA-202 stays at "matrix Resolve 45 h" (Real Estate marketing is 9 / 45 in the document too).

## 7. Arabic for native review

All written for this build. The first block is new; the second reuses forms that already existed (roles, v40 matrix) and is listed so the reviewer sees the whole set.

| English | Arabic |
|---|---|
| Head of the sales team (environment) | رئيس فريق المبيعات (البيئة) |
| Sales manager (environment) | مدير المبيعات (البيئة) |
| Sales operations lead | قائد عمليات المبيعات |
| Web and app product owner | مالك منتج الموقع والتطبيق |
| Branch or gallery manager | مدير الفرع أو المعرض |
| Information Security lead | مسؤول أمن المعلومات |
| Information Security lead (IT) | مسؤول أمن المعلومات (تقنية المعلومات) |
| After-Sales team lead (direct manager) | قائد فريق ما بعد البيع (المدير المباشر) |
| Head of After-Sales | رئيس ما بعد البيع |
| After-Sales champion | ممثل ما بعد البيع |
| After-Sales operations lead | قائد عمليات ما بعد البيع |
| Property or community manager (PSI Assets) | مدير العقار أو المجتمع (PSI للأصول) |
| Club relations manager | مدير علاقات النادي |
| Head of PSI Club | رئيس نادي بي إس آي |
| Club champion | ممثل النادي |
| Club operations lead | قائد عمليات النادي |
| Club app product owner | مالك منتج تطبيق النادي |
| Tour operations supervisor (direct manager) | مشرف عمليات الجولات (المدير المباشر) |
| Tour Estate CX lead | قائد تجربة العملاء في تور إستيت |
| Tour Estate CX lead (triage) | قائد تجربة العملاء في تور إستيت (الفرز) |
| Tour operations manager | مدير عمليات الجولات |
| Tour Estate champion | ممثل تور إستيت |
| Head of Tour Estate | رئيس تور إستيت |
| Tour app product owner | مالك منتج تطبيق الجولات |
| Fleet and guides supervisor | مشرف الأسطول والمرشدين |
| Events manager (direct manager) | مدير الفعاليات (المدير المباشر) |
| Events manager | مدير الفعاليات |
| Head of Events | رئيس الفعاليات |
| Events champion | ممثل الفعاليات |
| Events operations lead | قائد عمليات الفعاليات |
| Registration platform owner | مالك منصة التسجيل |
| Venue or booth lead | قائد الموقع أو الجناح |
| Account manager lead (direct manager) | قائد مديري الحسابات (المدير المباشر) |
| Account manager lead | قائد مديري الحسابات |
| Head of Investor Relations | رئيس علاقات المستثمرين |
| Wallet champion | ممثل المحفظة |
| Wallet operations lead | قائد عمليات المحفظة |
| Wallet product owner | مالك منتج المحفظة |
| Same receiver, clocks halved | المستلم نفسه، المهل مُنصَّفة |
| Head of the environment at once | رئيس البيئة فوراً |
| Rule | قاعدة |
| Edited | مُعدَّل |
| VIP · clocks halved | VIP · المهل مُنصَّفة |
| Set 19 Nov · titles adjustable until 28 Nov | حُدّدت في 19 نوفمبر · المسمّيات قابلة للتعديل حتى 28 نوفمبر |
| VIP rule applied: ... | طُبّقت قاعدة VIP: تُنصَّف المهلتان، ويُبلَّغ رئيس البيئة فوراً، ويكون مدير تجربة العملاء البديل. |
| The last row is a rule, not a receiver: ... | السطر الأخير قاعدة وليس مستلماً: تُنصَّف المهل لعميل VIP، لذا هو ثابت. |
| no resolve clock in the matrix for this kind: ... | لا مهلة حل في المصفوفة لهذا النوع (الملاحظة الإدارية يقيسها فحص الـ60 يوماً): البديل 14 يوماً من الوكيل 5 |
| ", halved for the VIP" (fix due hint) | ، منصَّفة لعميل VIP |
| 1 day / 2 days / 5 days | يوم واحد / يومان / 5 أيام |

Reused unchanged: Direct manager of the agent (المدير المباشر للموظف), Head of the environment (رئيس البيئة), CX manager (مدير تجربة العملاء), L&D head (رئيس التعلم والتطوير), Environment champion (ممثل البيئة), IT lead (قائد تقنية المعلومات), Legal (القانونية), Internal Audit and Marketing Lead (مسؤول التدقيق الداخلي والتسويق), Marketing manager (مدير التسويق), CX team (triage) (فريق CX (الفرز)), HR pool (conduct) (مجموعة الموارد البشرية (السلوك)), After-Sales team lead (قائد فريق ما بعد البيع), App product owner (مالك منتج التطبيق). The header, the three rules and the legend are the prototype's own Arabic, verbatim; the row labels of the two new rows too. The prototype has no Arabic for any matrix cell: every cell above is new.

## 8. [Proposed] choices and deviations from the prototype

| # | Choice | Why |
|---|---|---|
| 1 | **Header text** is the prototype's ("...before 28 November, the clocks stay."), not the delta's one-line variant with a semicolon | The prototype is the truth |
| 2 | The sentence "Values marked with defaults are proposals until the owners confirm them" is **removed** from the principles line (the prototype still prints it) | The cells are decided; the brief says remove every note about it |
| 3 | The wording "Set 19 Nov · titles adjustable until 28 Nov" is **not in the prototype**; it comes from F30. Used as the note under the table, on the Rules page (Decision 4 card) and as a quiet tag on the matrix line of each fix. Static text: it still says "until 28 Nov" after that date | The delta asks for it |
| 4 | **"an edited cell keeps its own marker"** read as: the per-cell flag stays (`edited`, replacing `isDefault`) and shows as a small "Edited" mark with a blue dot | Brief unclear on the marker |
| 5 | The VIP row is **read-only for everyone**: it is a rule and "the clocks stay" | Prototype lets it be typed over |
| 6 | VIP "informed": the head is **added first** and not repeated if the cell already names that exact title; no semantic de-duplication (After-Sales and Club cells that already say "Head of After-Sales" or "Head of PSI Club" now read "Head of the environment · Head of After-Sales") | The brief says add "Head of the environment"; the products' own head titles differ from it |
| 7 | VIP backup **replaces** the row's backup with the CX manager (not appended) | "becomes backup" |
| 8 | The legend sits **inside** the rules card (as in the prototype) | Prototype |
| 9 | A day cell that is edited becomes hours; the VIP version of a day cell is hours too | Half of "1 day" is not "0.5 day" |
| 10 | The hour unit "h" stays Latin in the Arabic fix line ("4.5 h"), as the v40 line did | No Arabic unit was specified |
| 11 | `AiInsights.tsx` and `Rules.tsx` said the matrix was "still awaiting the product owners"; both now say it was set on 19 Nov (small edits outside my files, the only two) | Stale statement about a decided matrix |
| 12 | The fix hint for a fixed-clock row now says "no resolve clock in the matrix for this kind..." instead of "the matrix cell is empty" | The employee row is empty by design |
| 13 | p-004 is the person tagged VIP | Lowest id on the first fix's pattern; deterministic |

## 9. Known gaps

- Matrix edits live in the session and are not audited (as before); an "Edited" mark does not say who or when.
- "Edited" and the VIP row's rule text are not offered for confirmation by the product owners: there is nothing to confirm, only to adjust until 28 Nov.
- `useIsVipFix` is false until the patterns, signals and people have loaded, so the tag appears a moment after the card.
- A fix with no pattern (an AI Insights proposal) is never VIP-related; so is one whose only VIP signals are unidentified (no `personId`).
- The VIP row is identical in all six products (stored once per product, as a copy) and not editable, so the factor cannot differ by product.
- The assistant, the home brief and the weekly sample read no matrix clocks; none was changed.
- `docs/FIDELITY_REVIEW.md`, `docs/IMPLEMENTATION_REPORT.md` and the V4x delta files are not updated (the lead does).
