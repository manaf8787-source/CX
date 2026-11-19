# V42 F35: PSI Wallet survey moments (19 Nov 2026)

Status: built, tested. Spec: `V42_DELTA.md` F35; prototype v42.3 and v42.4, the block that starts at `/* v42.3 · PSI Wallet: one question per touchpoint` (`PROD_SV` wallet entry, four `QSETS.push` sets, `SURVEYS.s9`, the "Signals, no survey" card); Programme KB section 48; Modules KB sections 9 and 16. Design: `MEO_DESIGN_SYSTEM.md` (nothing new in the system: `SectionCard`, `Table`, the existing wells).
Marks: **[Proposed]** = a choice the spec did not make, or a rule the Programme KB itself lists as Claude's addition that the owner has not confirmed.

## What changed

| Where | Before | Now |
|---|---|---|
| Survey questions, PSI Wallet tab | No set: the empty state "No question set for this product yet." | Four sets, one per touchpoint: `setup`, `call`, `addp`, `nps` |
| PSI Wallet product page, "When this product asks" | The pilot text (onboarded with documents; NPS 30 days after onboarding; CSAT after a suggestion; CES after an upload; "invited and not onboarded after 30 days") | The five texts of the Wallet review, verbatim (`done`, `nps`, `csat`, `ces`, `why`); the source line is unchanged, as in the prototype |
| PSI Wallet product page | No such block | A "Signals, no survey" card: seven moments of the approved design and the signal each becomes |
| Surveys and triggers, "Per product, no group number", the Wallet line | "Pilot: CES after a failed or completed upload, plus a draft investor survey." with the tag "No NPS for this product" | "One question per touchpoint: ..." and no tag (the Wallet has an NPS, on the Dashboard). PSI Events is the one product left without an NPS |

Nothing else moved: the other five products, every calculation, the CES tile and its definition, the menus and the access rules are as they were.

## The four sets (`src/data/surveyQuestions.ts`)

| id | Name | Scale | Fires | Lines shown |
|---|---|---|---|---|
| `setup` | CES after the wallet is created | 1 to 7 | Screen 12 to 13, once | the rating, the optional comment, "If 4 or less: What went wrong?" |
| `call` | CSAT after the call with the advisor | 1 to 5 | When the advisor marks the call done in the CRM (not the app's Request a call button), within 2 hours | the rating, the optional comment, "If 3 or less: What went wrong?, and the advisor team is notified" |
| `addp` | CES after a property is added | 1 to 7 | Screen 51, once per add; tagged single or bulk, carries the number of properties | the rating, the optional comment, "If 4 or less: What went wrong?" |
| `nps` | NPS on the Dashboard, 30 days after | 0 to 10 | Screen 13, about 30 days after the wallet was created and only if it holds at least one property, then yearly; shares the 90-day cap with the Real Estate NPS | the question and the reason |

`SURVEY_QUESTION_SETS` holds 13 sets (9 + 4). Every product now has at least one set, so the empty state no longer shows with the sample; the page still handles a product without a set (tested by emptying the Wallet's sets in the sample).

**[Proposed] badge.** PSI Club, Tour Estate and PSI Events keep the set-level `[Proposed]` (wording not confirmed by the product owners). The Wallet sets carry none: the KB says the owner reviewed the first release and set the questions on 19 Nov, and the prototype marks the block "decided after the Wallet review". The Wallet is still not launched; that alone is not a reason for the badge.

## Decided and proposed (Programme KB section 48)

| Item | Status | In the build |
|---|---|---|
| One question per touchpoint; CES at wallet creation (1 to 7), CSAT after the advisor call (1 to 5), CES after a property is added (1 to 7, single or bulk); NPS on the Dashboard about 30 days after, then yearly; one rating and one optional comment; CES 4 or less and CSAT 3 or less open "What went wrong?"; a low call score notifies the advisor team; high scores a thank-you only | Decided by the owner, 19 Nov | Shown, no badge |
| The CSAT fires from the advisor's "call done" mark in the CRM, within 2 hours | **[Proposed]** in the KB (Claude's refinement, v42.4) | In the `call` set's "when" line, verbatim, no badge |
| The NPS only when the wallet holds at least one property; it shares the 90-day cap with the Real Estate NPS | **[Proposed]** in the KB (v42.4) | In the `nps` set's "when" line, verbatim, no badge |
| The add-property answer carries the number of properties | **[Proposed]** in the KB (v42.3, v42.4) | In the `addp` set's "when" line, verbatim, no badge |
| The low call score routed through the matrix as a service signal to the Account manager lead | **[Proposed]** in the KB (v42.3) | Text only ("the advisor team is notified"). The matrix row it would use exists: PSI Wallet, Service and behaviour, Account manager lead, respond 2 h, resolve 18 h |
| The "Signals, no survey" card (abandoned onboarding after 7 days, call request not actioned, property pending or document unverified after 5 working days, failed upload, viewing with no slot, deal and listing hand-offs) | **[Proposed]** in the KB (v42.3, v42.4) | Shown as the prototype shows it, no badge |

The prototype shows all of these without a `[Proposed]` mark, and the build follows the prototype. See "Open items for Manaf", item 1.

## Files

| File | What |
|---|---|
| `src/data/surveyQuestions.ts` | The four Wallet sets appended to `SURVEY_QUESTION_SETS`; comments |
| `src/data/v38Reference.ts` | The `wl` row of `PRODUCT_SURVEY_RULES` rewritten (five texts); **new** `WALLET_SIGNALS_NO_SURVEY` (heading, hint, two column headings, seven rows) |
| `src/pages/ProductPage.tsx` | The "Signals, no survey" card, rendered only when the product is the Wallet, after "When this product asks" |
| `src/services/mockData.ts` | The Wallet line of `buildProductSurveyMoments` (the per-product card of Surveys and triggers): new sentence, `hasNps: true` |
| `src/pages/settings/SurveyQuestions.tsx` | Comment only: the page renders the new sets with no code change |
| Tests, new | `src/data/walletSurveyMoments.test.ts` (16), `src/pages/ProductPage.test.tsx` (13), `e2e/v42-wallet.spec.ts` (27) |
| Tests, changed | `src/pages/settings/v40People.test.tsx` (the Wallet empty-state test replaced by four: the four sets, the call set in both languages, the sets in Arabic, the empty state on an emptied sample), `src/services/mockDataV40.test.ts` (9 sets to 13, the Wallet's four ids), `src/services/queriesV40.test.tsx` (`useQuestionSets('wl')` returns four; the empty answer on an emptied sample) |

Not touched: the survey builder. The prototype rewrites `SURVEYS.s9` (the Wallet survey of the legacy survey engine). React has no editable survey for the Wallet: `SurveysReference.tsx` shows three trimmed, read-only sample surveys (two Real Estate, one After-Sales) from `data/surveyVocabulary.ts`, kept only for the question-type vocabulary (`data/legacyReference.ts` is the old authority matrix and holds no survey). Nothing to update there.

## Where it shows, and to whom

| Place | Who | Note |
|---|---|---|
| `/products/wl`, "When this product asks" and "Signals, no survey" | CX manager and CX team only | The page's rule is unchanged: while the Wallet is not launched the two CX roles open it by URL ("Not launched — shown to CX for planning"); every other role is sent to its home. No other role has `/products/wl` in its pages, launched or not |
| Sidebar, Products group | Nobody while the Wallet is hidden | Unchanged: the menu lists live products only |
| Survey questions, PSI Wallet tab | Every role that opens Survey questions (CX manager, CX team, Internal Audit and Marketing Lead, Executive) | Unchanged: the page lists all six products, launched or not, as the prototype does |
| Surveys and triggers, per-product card | Every role that opens that page | Unchanged: the card lists all six products with "Hidden until launch" |

The "Signals, no survey" card is on the Wallet page and nowhere else (tested on the five other product pages). Its rows name titles only (Wallet operations lead, Wallet product owner, Information Security), never a person.

## The Wallet product page

Top to bottom, unchanged down to the complaint types: header, four tiles, "By channel", "Complaint types and owners", then "When this product asks" (four wells: NPS, CSAT, CES, "What stopped you?", and the source line), then the new card.

| Part | Behaviour |
|---|---|
| "Signals, no survey" | `SectionCard` with the hint as its description and a two-column `Table` ("Moment (screen)", "Signal"), seven rows, the moment in ink and the signal in grey. Nothing to press |
| Phone, 320 to 390px | The two columns wrap; the table fits its card, so there is no sideways scroll, neither of the page nor inside the card (tested at 320, 375 and 390, English and Arabic). "When this product asks" stacks its four wells |
| Arabic | Right to left; the moment column sits on the right; screen numbers stay Latin digits as in the prototype |
| Dark theme, keyboard | No new control and no new colour. axe: no serious or critical violation (English light, Arabic dark, Arabic dark on a phone) |

## Deviations from the prototype

| # | Prototype | Here | Why |
|---|---|---|---|
| 1 | The "Signals, no survey" card is spliced inside the "When this product asks" card, before its closing tag | Its own card, directly after | A card inside a card is against the design system (card, well, text); the order and the content are the same [Proposed] |
| 2 | "By product: the same rule, different moments" table on the surveys page reads `PROD_SV` | React's "Per product, no group number" card reads a one-sentence summary per product (an older React design). The Wallet's sentence and its "No NPS" tag were stale, so both were replaced | Otherwise the page would contradict the Wallet page. The sentence is not the prototype's: see the strings below [Proposed] |
| 3 | Straight quotes and apostrophes | Kept exactly | Verbatim; earlier React transcriptions use typographic apostrophes, so the file mixes the two |
| 4 | Sample responses for the Wallet (`VOC` rows, a trend) | None in React, as before: the tiles read "Too early" and "No responses yet" | Not part of F35 |

## [Proposed] decisions of this build

| # | Decision |
|---|---|
| 1 | No set-level `[Proposed]` on the four Wallet sets (decided 19 Nov) |
| 2 | The KB's proposed refinements and the signals card are shown without a badge, as in the prototype (table above) |
| 3 | The signals card is a sibling card, not nested (deviation 1) |
| 4 | The Wallet line on Surveys and triggers was rewritten and `hasNps` set to true (deviation 2) |
| 5 | The fourth well keeps the heading "What stopped you?" although the prototype now puts the follow-up rule in it (open item 3) |
| 6 | A plain table at every width instead of stacked rows on a phone: two wrapping columns fit at 320px and keep the column headings visible |
| 7 | The empty state stays in the page although no product is empty any more |
| 8 | `/products/wl` was not added to the shared route list of `e2e/helpers.ts`; `e2e/v42-wallet.spec.ts` covers its smoke, RTL, phone and axe checks |

## Strings that are not the prototype's (Arabic for native review)

| Where | English | Arabic |
|---|---|---|
| Surveys and triggers, per-product card, the Wallet line | One question per touchpoint: CES after the wallet is created, CSAT after the call with the advisor, CES after a property is added. NPS only on the Dashboard about 30 days after, then yearly. | سؤال واحد لكل نقطة تماس: CES بعد إنشاء المحفظة، CSAT بعد المكالمة مع المستشار، CES بعد إضافة عقار. NPS فقط على لوحة المعلومات بعد نحو 30 يوماً من إنشاء المحفظة ثم سنوياً. |

The English is the Modules KB's sentence (section 16), shortened. The Arabic is put together from the prototype's own phrases (the survey's name, the three set names, the NPS line); only the word "فقط" and the joins are new. Every other string of this change is the prototype's: a script compared the 42 English and Arabic pairs of the prototype block (84 strings, all but the eight `SURVEYS.s9` pairs) with `surveyQuestions.ts` and `v38Reference.ts`, character for character: none missing.

## Tests

| Layer | What | Count |
|---|---|---|
| Unit, data | The four sets (ids, order, names, both languages on every string, the "when" texts verbatim, the follow-up thresholds, no `[Proposed]`), the `wl` rule row (five texts verbatim, agreement with the sets), the per-product line, the signals card (heading, hint, column headings, seven rows in order, both languages, titles only) | 16 new |
| Unit, pages | The Wallet page: "When this product asks" verbatim, the card with seven rows, its place, live and not launched, a role outside CX sent home, absent on the five other product pages, Arabic. Survey questions: the four sets, the call set and its preview in both languages, Arabic, the empty state | 13 new + 4 (one replaced) |
| Unit, changed | `mockDataV40.test.ts` (2), `queriesV40.test.tsx` (1) | 3 |
| E2E | `e2e/v42-wallet.spec.ts`: hidden in every menu; switched live in Settings, opened from Home, both blocks; CX team planning view; four other roles sent home; the card on no other product page; the Surveys and triggers line; the four sets with the preview in both languages; keyboard; Arabic RTL; 320, 375, 390px in English and Arabic; axe English light and Arabic dark | 27 |

Full unit run: 85 files, 1205 tests, green. Typecheck clean. Lint: the three known `only-export-components` warnings, nothing new.

## Open items for Manaf

1. **Confirm or mark the proposed refinements.** The CRM "call done" trigger within 2 hours, the "at least one property" condition and the shared 90-day cap, the number of properties on the answer, the matrix route of a low call score, and the whole "Signals, no survey" card are Claude's additions in the KB, not yet confirmed. The portal shows them as the prototype does, unmarked. Say if they are decided, or if they should carry `[Proposed]` until they are (one line per place).
2. **CES scale.** The Wallet's two effort questions are on 1 to 7. Everywhere else CES is 1 to 5 and the indicator is "the share who answered 4 or 5". The Wallet's CES tile (sample figure 74%) and its "?" still use that definition, and so does the Wallet's card on Home once the product is live. Needed: which answers count as "easy" on 1 to 7, so the Wallet's CES can be computed and compared. No calculation was changed.
3. **The fourth box.** On the Wallet page the box headed "What stopped you?" now holds the follow-up rule ("One rating and one optional comment per touchpoint ..."), because the prototype reuses that field. The real "What stopped you?" of the Wallet (wallet started, not opened after 7 days) is the first row of the signals card. A different heading for this box on the Wallet page would need new wording in both languages.
4. **"Nothing is asked of the investor."** The card's hint says so, yet its first row is one "What stopped you?" question, once. Either the hint or the row needs a word.
5. **"3 questions".** The set list counts the conditional follow-up as a question ("3 questions" on the three rating sets), as the prototype does, while the rule is one rating and one optional comment.
6. **30 days or 7 days.** The pilot text asked "invited and not onboarded after 30 days: one question". It is replaced by the 7-day abandoned-onboarding row. Confirm the 30-day rule is gone.

## Known gaps

- **One existing e2e test still expects the old empty state:** `e2e/v40-people.spec.ts`, "sets of the products not launched are [Proposed]; PSI Wallet has an empty state" (its last line). The file was out of bounds for this change. Replace the last line with: the Wallet tab shows four list items in "Question sets" and no `[Proposed]`.
- **The sidebar after a launch switch (as before this change, any product).** Switching a product live under Settings does not add it to the sidebar at once, and switching it back off leaves it listed, until the sidebar next re-renders (measured: still absent after two page changes; listed again after collapsing and expanding the sidebar; a Wallet switched off stayed in the menu). Cause: `useSidebarGroups` reads only `data` from `useProducts()`, and the launch list is edited in place, so its identity never changes. The usual remedy in this code base is to read `dataUpdatedAt` too (as `useIndicators` does). Home's indicator cards and the product page itself follow the switch (checked in the browser); the Overview was not checked. The e2e spec therefore opens the live Wallet page from Home's indicator card.
- No survey answers exist in the sample for the Wallet, so the follow-up by score, the advisor-team notification and the single or bulk tag are rules in text, not behaviour.
- The screen numbers refer to the Wallet's approved design (85 screens), which the portal does not hold or link.
- The seven signals are a reference table: they are not signal types in the registers, and no sample signal comes from them.

## Older docs that now read differently

Left as the record of their date: `V40_FOUNDATION_API.md` ("9 sets"; "empty list for Wallet"), `V40_WS_C.md` ("empty state for PSI Wallet"), `IMPLEMENTATION_REPORT.md` ("no NPS for Events/Wallet"), `FIDELITY_REVIEW.md` F23.
