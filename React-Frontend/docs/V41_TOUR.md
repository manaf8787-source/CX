# V41 F28: the guided tour inside the portal (19 Nov 2026)

Status: built. Spec: `docs/V41_DELTA.md` item F28, Modules KB section 4, the prototype code (`PSI CX Portal.html`, lines 4186 to 4229: `tourSteps`, `tourGo`, `tourPaint`, `tourNext`, the replay button, the auto-start, the role-switch reset, the resize repaint, the CSS). The prototype is the truth; every title and text below is the prototype's own, word for word (a script compared all 46 EN and AR strings, none missing). `[Proposed]` = a choice of this build, not confirmed by the owner.

## 1. What a person sees

| Moment | Behaviour |
|---|---|
| First sign-in under a role | After 400 ms (the page has painted) the page dims, the real element gets a white frame, and a card sits below it (above it when there is no room): "Tour n / total", title, text, Skip, Back, Next. Focus goes to the primary button |
| A "Do it and continue" step | The primary button says so; the tour clicks the real element (the menu link to My inbox, the Personas tab, the fix's Details toggle), then moves on, and the next card appears on the page that opened |
| The last card | The primary button says Done; Done and Skip both store completion and show the toast "Tour finished. Replay it any time from the bottom of the menu." |
| Replay | "How do I use this?" above the role card at the bottom of the menu; in the phone and tablet menu sheet too; an icon-only button with a tooltip in the collapsed rail. Not shown to the mystery shopper |
| Role switch | The running tour is reset; if the new role has not done its tour, it starts from its first step |
| An element that is not there | The card is centred, nothing is lit (a full dim), and Next still works. It never blocks. The tour keeps looking, so a slow page is lit when its element arrives |
| Resize, scroll, late data | The frame and the card follow the element every frame (a `requestAnimationFrame` loop that only updates state when a box changed) |
| Escape | Skips, unless a dialog, menu or list is open (it closes that first; Radix marks its own Escape as handled) |
| Clicks | The overlay and the frame are `pointer-events: none`; only the card takes clicks. The page underneath stays usable (a lit button can be clicked through the dim) |

Bilingual and RTL: the card carries `dir`, the card's start edge lines up with the element's start edge (right in Arabic), the buttons keep their natural order (Skip at the start edge, then Back, then Next), `tracking 0` in Arabic comes from the design system, "n / total" is a `bdi dir="ltr"`.

## 2. Files

| File | What |
|---|---|
| `src/data/tours.ts` | `TourStep`, the step blocks, `tours` (per role, before the page check), `tourStepsFor(role)` (after it), `hasTour(role)`, `TOUR_COPY` (the visible words) |
| `src/components/tour/tourContext.ts` | `TourContext` and `useTour()`; outside a provider the tour is inert (a page rendered alone in a test) |
| `src/components/tour/TourProvider.tsx` | State (running, index, who is done), the first-entry start, the role-switch reset, `start / next / back / skip`. Moves are `startTransition` (see section 8) |
| `src/components/tour/TourHost.tsx` | The overlay: dim, frame, card, the polite status, navigation per step, the wait for the element, the measuring loop, focus return, Escape |
| `src/components/tour/placement.ts` | Pure geometry: `placeCard`, `cardWidth` (380px, never wider than the screen minus 24px) |
| `src/components/tour/tourStorage.ts` | `psicx.tour` in `localStorage`, every access in try/catch |
| `src/components/layout/Shell.tsx` | Mounts `<TourProvider>` around the shell and `<TourHost />` after `TraceHost` (re-indented block, no other change) |
| `src/components/layout/Sidebar.tsx` | The replay control (`ReplayTour`), `data-tour` on menu links, the phone sheet's "close, then start" |
| `src/pages/actions/Corrective.tsx` | Reads `?status=` (see section 6) |
| `docs/V41_TOUR.md` | This file |

Tests added: `src/data/tours.test.ts`, `src/components/tour/{TourProvider.test.tsx, placement.test.ts, tourStorage.test.ts}`, six tests in `layout/Shell.test.tsx` (replay in the menu, the rail, the phone sheet, Arabic, no replay for the shopper), three in `pages/actions/Corrective.test.tsx` (`?status=`), `e2e/v41-tour.spec.ts`.

## 3. Data shape

```ts
tours[role] = [{ route, search?, target?, highlightParent?, title: Bi, text: Bi, click? }]
```

| Field | Meaning |
|---|---|
| `route` | React Router path. `null` = stay where you are (the closing card) |
| `search` | The query with its `?` (`?status=proposed`). Compared exactly: a step that names none is on the bare path, so Back from "Open a fix" drops the filter |
| `target` | `[data-tour="name"]` (every target in the data is checked by a test against the markup) |
| `highlightParent` | `closest()` selector to light an ancestor instead (supported, unused today) |
| `click` | "Do it and continue" |

The tour navigates once, when a step begins, and only if the URL differs. It does not steer on every location change, so a person who goes elsewhere by hand is not pulled back (and the browser Back button is never fought). A step whose element is missing is then simply centred.

## 4. Role map and step counts

The React roles differ from the prototype's keys. [Proposed] mapping: `cxm` to `cxmgr`, `cx` to `cxteam`, `em` to `envmgmt`, `tl` to `teamlead`, `lead` to `aslead`, `mk` to `marketing`, `odm` to `ld`, `ia` to `auditmkt`; the prototype's product role `re` has no React role; `hrspec`, `hrmgr`, `exec` take "other roles" (Home and the end); `shopper` gets no tour, as in the prototype (`sh`).

A step is dropped when `canOpenPage(role, route)` forbids its page, so nobody is sent to a page they cannot open. If only the closing card is left it is shown alone.

| Role | Path in the prototype | Steps in the prototype | Steps here | Why they differ |
|---|---|---|---|---|
| CX manager (`cxmgr`), CX team (`cxteam`) | home 3, work 2, fix 4, loop 1, people 1, numbers 1, end | 13 | **13** | none |
| Environment management (`envmgmt`), Sales team lead (`teamlead`), After-Sales lead (`aslead`) | home 3, work 2, fix 4, people 1, end | **11** (code) | **11** | the KB and the delta say 10 (they leave the trace step out of "the fix and its decision"); the code gives 11, the code is followed |
| Marketing manager (`marketing`) | home 3, Personas, people, numbers, end | 7 | **6** | the numbers step opens the Overview, which Marketing cannot open here (`ROLE_PATHS`); the step is dropped. The KB table (Home, personas, find anyone, all the numbers) does not list the end card but the code has it |
| L&D (`ld`) | brief, fix CA-203, end | 3 | **3** | none (see section 7 for the fix) |
| Internal Audit and Marketing Lead (`auditmkt`) | brief, feeds, weekly sample, end | 4 | **4** | none |
| Executive (`exec`) | home 3, end | 4 | **4** | none |
| HR specialist (`hrspec`), HR manager (`hrmgr`) | home 3, end | 4 | **1** | no Home for these roles: the closing card alone |
| Mystery shopper (`shopper`) | none | 0 | **0** | no tour, no replay button |

## 5. Steps and where each one points

| # | Title | Page | Element (`data-tour`) | Where it is added |
|---|---|---|---|---|
| H1 | One line, six steps | `/home` | `steps` | `StepLine` `nav` |
| H2 | Your daily brief | `/home` | `brief` | `DailyBrief` card (also on `/settings/ld` and `/overview` as the landing brief) |
| H3 | How customers feel | `/home` | `indicator-card` | `IndicatorCard` card (the first one is lit) |
| W1 | Start your day here (do it) | `/home` | `nav-inbox` | the sidebar link (`nav` + path with `/` as `-`, so every menu link has one) |
| W2 | One row, one thing to do | `/inbox` | `inbox-row` | each inbox row (table and phone list; the first is lit) |
| F1 | Where you are, what happens next | `/actions/corrective` | `nextbox` | `NextBox` (the first on the page, the one above the tabs) |
| F2 | Open a fix (do it) | `/actions/corrective?status=proposed` | `fix-open` | the "Details" toggle of each fix card |
| F3 | Your decision | same | `fix-decide` | the "Decide" button of a fix card |
| F4 | The trace | same | `trace` | `TraceCardView` section |
| L1 | Close the loop | `/close-the-loop` | `loop-call` | the "Call" button of each open row |
| P1 | Find anyone | `/customers` | `customers-search` | the search box wrapper in `CustomerList` |
| N1 | All the numbers | `/overview` | `overview-card` | the first card of the Overview |
| M1 | Personas and campaigns (do it) | `/customers` | `tab-personas` | `RouteTabs` link (`tab` + path with `/` as `-`) |
| D1 | Fixes that need L&D | `/actions/corrective` | `fix-card` | each fix card (`li`) |
| A2 | Data feeds | `/settings/feeds` | `feeds` | the table in `Feeds` |
| A3 | The weekly sample | `/settings/weekly-sample` | `sample` | the table in `WeeklySample` (one attribute, added last) |
| E | That is the whole portal | none | none | the closing card, centred |

CX manager and CX team: H1 H2 H3 W1 W2 F1 F2 F3 F4 L1 P1 N1 E. Environment management, team lead, After-Sales lead: H1 H2 H3 W1 W2 F1 F2 F3 F4 P1 E. Marketing: H1 H2 H3 M1 P1 E. L&D: brief (H2 text variant "Only your categories..."), D1, E. Internal Audit and Marketing Lead: brief (A1 text variant), A2, A3, E. Executive: H1 H2 H3 E.

## 6. The `?status=` read in Corrective

`/actions/corrective?status=proposed` opens the register on the fixes still waiting for a yes (the prototype's "waiting for a yes" tab). The filter is read from the URL when the page opens and again when the `status` param changes or goes away (render-time adjustment, no effect); a status the person picks in the Select afterwards is theirs and is not undone by a re-render. An unknown value means no filter. Everything else on the page is unchanged. Three unit tests.

## 7. Prototype steps that needed a decision

| Item | Prototype | Here |
|---|---|---|
| "Open a fix": which fix | CA-204 in the "waiting for a yes" tab | The sample has four fixes: CA-201 partial, **CA-202 proposed** (the only one waiting for a yes), CA-203 in progress, CA-204 at its 60-day check. The step lights the Details toggle of the first fix in the filtered register, which is CA-202 today. Nothing names an id, so the step follows the data |
| "Open a fix": what "Open" does | The register's Open button opens the detail | The React register is a list of fold-out cards, and the first card is already open. "Do it and continue" clicks the Details toggle only when it is closed (`aria-expanded` is not `true`); with the filter on, the one proposed fix is already open, so the click is skipped and the tour moves on |
| "Your decision": the buttons | The row of approve and reject buttons | The React fix has one "Decide" button that opens the decision dialog (approve, modify, reject, send to investigation). The text is the prototype's ("The buttons are the decision...") as asked; the lit element is the Decide button |
| "Fixes that need L&D": CA-203 | CA-203 in the "all" tab | L&D only sees training-gap fixes, and in this sample that is CA-204. CA-203 is an employee fix L&D never sees, so the step lights the first fix L&D can see |
| "Close the loop": Interview | The Interview button | The React page's button is "Call" (it opens the interview dialog). The text keeps the prototype's word "Interview" |
| "Find anyone": the box | `#home-q` or the first input | The people search box on `/customers` (Find a person), as in the prototype's journey view |
| Personas "do it" | Clicks the Personas tab, the next step goes back to the search | Same; the next step is `/customers` again, and the tour navigates back by itself |
| Customers "numbers" step | `.main .card` | The first card of the Overview (Customers and runaways) |

## 8. Implementation notes worth keeping

| Topic | Note |
|---|---|
| Moving is a transition | `BrowserRouter` updates its location inside `startTransition`. A "Do it" step clicks a link and moves on in the same event; if the step index were an urgent update the next card would be drawn with the old location, see "already on the right page", skip its navigation, and then the click's navigation would land under it (found by the Marketing e2e: the Find anyone card was on `/personas`). The provider's `start`, `next`, `back` and `skip` are `startTransition`, so both land in one render |
| One layer per step | `TourLayer` is keyed by the step index: its state starts fresh, there is no stale frame on the old element, and the dim never blinks (a full dim while it waits, the framed dim once the element is found; both are the same colour except the hole) |
| Waiting | Per frame: find the first visible match (`checkVisibility()` when the browser has it), centre it once, measure it. After 2 s (`WAIT_FOR_TARGET_MS`, a `waitMs` prop in tests) without a match the status is `missing`. Once an element was seen, losing it goes straight to `missing` (the card never flickers away) |
| Scrolling | The target is centred once per step (`scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })`: instant, so nothing is animated and the box is final next frame). **Not** done when the element has a fixed ancestor or one that sticks to the top or bottom of the screen (the menu): scrolling the page would only move everything else. A cell pinned to a table's side (Close the loop's Call column) still scrolls. The prototype scrolled always |
| Tall elements | An element taller than 70% of the screen (the 50-row weekly sample table, an open fix card) is shown by its first part: its top goes just under the top bar (96px), and the frame covers only half the screen's height, so the dim and the card still read. [Proposed] (the prototype framed the whole element) |
| The dim | `--scrim`, drawn as a 9999px box shadow round a white 3px frame, so the element itself stays lit and the page keeps its stacking. The light theme's scrim (32%) is stacked twice (about 54%, the prototype's .55) so the lit element stands out on a white page; the dark theme's (60%) is used once. The frame radius follows the element's own radius plus 6px |
| The card | `material-light`, radius 22, `Button` pills (Skip ghost, Back outline, the primary dark), entrance `cx-rise` 400ms on `--ease-spring`. Under `prefers-reduced-motion` the host has `data-motion="reduced"` and none of the animation classes (and the global rule already zeroes any other animation and transition) |
| Accessibility | `role="dialog"` `aria-modal="false"` named by its title and described by its text; a visually hidden `role="status"` (outside `main`) says "Tour n of m" at each step; focus moves to the primary button when a card appears (`preventScroll`), is remembered when the tour starts and returned when it ends (to the replay button, or to `main` when the tour began by itself); Escape skips; no focus trap; `:focus-visible` rings are the system ring. Axe (WCAG 2.1 AA, serious and critical) is clean with the tour open, in English light, Arabic dark and on a phone |
| Phone menu | "How do I use this?" in the sheet sets a flag and closes the sheet; the tour starts from the sheet's `onCloseAutoFocus` (and prevents its focus return), so the sheet cannot take focus back from the card |
| Storage | One key, `psicx.tour`, `{ "done": { "cxmgr": true } }`. The sample sign-in has no user id, so "per user" is per browser profile; the role is the key. Skip and Done write it; Esc is Skip. The first-entry start happens once per role per switch |

## 9. How the other tests do not meet a tour

The tour starts by itself on first entry, which would sit on top of every other test. One mechanism, two places:

| Where | How |
|---|---|
| Vitest (`src/test/setup.ts`) | A `beforeEach` writes `psicx.tour` with every role done (`afterEach` already clears storage). A tour test opts in with `localStorage.removeItem(TOUR_STORAGE_KEY)` before it renders (`TourProvider.test.tsx` does, and passes `startDelayMs={0}`) |
| Playwright (`e2e/helpers.ts`) | `signInAs(page, role, lang)` also seeds `psicx.tour` with every role done. A spec that signs in through the sign-in screen calls `markToursDone(page)` first (`auth.spec.ts`: the redirect test and the five "signing in as" tests). `signInAs(page, role, lang, { tour: true })` leaves the tour not done: only `e2e/v41-tour.spec.ts` uses it |

## 10. Deviations from the prototype

| # | Prototype | Here | Reason |
|---|---|---|---|
| 1 | Gold frame | White 3px frame plus the dim | The Meo design is monochrome; gold was a placeholder brand colour (lead's instruction) |
| 2 | Selectors are CSS classes of its own markup | `data-tour` attributes on the real elements | Stable, searchable, tested (the inventory test fails if an attribute is renamed) |
| 3 | Repaint on resize only | Repaint every frame (scroll, resize, sidebar spring, late data) | Scroll and layout shifts moved the frame in the prototype |
| 4 | Scrolls to the target always | Not for fixed targets or ones in a top or bottom sticky container; a tall element is scrolled to its top and framed down to half the screen | The page would jump for a menu link; a 4,700px table has no middle worth showing |
| 5 | Moves to the next page 120 ms after the click | Same event, as a transition | See section 8 |
| 6 | 10 or 11 steps for managers and leads | 11 | The code is followed, the KB text says 10 (section 4) |
| 7 | Marketing 7 | 6 | Overview not openable by Marketing (section 4) |
| 8 | HR roles: Home and end | The end card alone | No Home for them |
| 9 | Skip and Done end with a toast | Same | `tourSkip` is `tourEnd` |
| 10 | The card is a fixed 380px box | 380px, or the screen minus 24px | 320px screens |
| 11 | Esc did nothing | Esc skips (not while a dialog, menu or list is open) | Lead's instruction |

## 11. [Proposed] and known gaps

| Item | Status |
|---|---|
| The role mapping of section 4, including the 11 vs 10 count and Marketing at 6 | [Proposed] |
| "Per user" as per browser profile | [Proposed] (no user id in the sample sign-in) |
| The screen-reader wording "Tour n of m" / "جولة n من m" | [Proposed] (the visible "Tour n / total" is the prototype's) |
| White frame and the stacked light-theme scrim | [Proposed] |
| Skip also shows the closing toast (the prototype does) | kept |
| On a phone the menu is closed, so "Start your day here" has nothing to light: the card is centred and "Do it and continue" still opens My inbox (the next step navigates). A highlight on the header's menu button would be a nicer fallback | known gap |
| "Open a fix" in the sample: the first fix card is already open, so the click is skipped | known gap (data-dependent, harmless) |
| The step texts say "the buttons are the decision", "Interview", "tabs": the React page has a Decide button, a Call button and a status filter | known gap (texts kept verbatim as asked) |
| A person who goes to another page by hand mid-tour sees the current card centred (its element is not there) until they press Next or Skip; the tour never pulls them back | by design |
| The `[data-tour="sample"]` attribute depends on the Weekly sample page (a sibling's file); if that table is renamed the unit test for the inventory and the Internal Audit e2e fail | note |

## 12. Counts

See the hand-over message of the build for the unit and e2e totals before and after (they change as other work lands). This feature adds 54 unit tests (data 10, placement 8, storage 3, provider and host 24, shell 6, corrective 3) and 18 e2e tests.
