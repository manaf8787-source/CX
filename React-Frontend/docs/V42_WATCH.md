# V42 F31: "Watch the AI team work" (19 Nov 2026)

Status: built, tested. Spec: `V42_DELTA.md` F31; prototype v42 `watchSteps()`, `watchCounters()`, `vWatch()`, `V30ACT` (wNext, wReset, wPlay); Programme KB section 46; Modules KB "Watch the AI team work". Design: `MEO_DESIGN_SYSTEM.md` (nothing new in the system).
Marks: **[Proposed]** = a choice the spec did not make; none of them shows in the UI.

## What it is

A replay of one WhatsApp message ("still waiting for the callback you promised on Tuesday") through nine steps with the clock `09:14:02` to `09:14:08`: Source, Agents 1, 2, 3, 5, the CX Supervisor, Agents 8, 10, Source. Play runs it in 6 seconds (one step every 750 ms), Next step walks it, Reset starts over. Under it: "This week, by the same team" (eight counters, `sample` tag) and the fixed card "What you will not see here". A small button on Home, under the six steps, opens it.

Route `/settings/watch-ai-team`, listed in the Settings sub-navigation right after "How the portal works (the AI team)".

## Files

| File | What |
|---|---|
| `src/data/watchTeam.ts` | **New.** `buildWatchSteps(customer)` (the nine steps, every string verbatim EN + AR from the prototype), `WATCH_COPY` (title, intro, controls, week block, "will not see" card), `WATCH_COUNTER_LABELS`, `maskMobile`, `WATCH_PATH`, `WATCH_STEP_MS` |
| `src/utils/watchCounters.ts` | **New.** `watchCounters(input)` (the eight counters) and the three named sample constants |
| `src/hooks/useWatchReplay.ts` | **New.** Step reached, Play / Next / Reset; one interval, cleared on unmount, restart-safe |
| `src/pages/settings/WatchTeam.tsx` | **New.** The page (default export, lazy route) |
| `src/components/home/WatchTeamButton.tsx` | **New.** The Home button, rendered only for a role that may open the page |
| `src/pages/Home.tsx` | Two lines: import and `<WatchTeamButton />` after `<StepLine />` |
| `src/data/nav.ts` | `SETTINGS_NAV` entry (after the AI team page); `NavLeaf.skipLanding`; `SETTINGS_LANDING` |
| `src/components/layout/AccessGuard.tsx` | `/settings` redirects with `SETTINGS_LANDING` instead of `SETTINGS_NAV` (see Landing) |
| `src/auth/access.ts` | `WATCH_PAGE` in the paths of environment management, Marketing, the Internal Audit and Marketing Lead, Executive |
| `src/routes/pages.ts`, `src/App.tsx` | Loader `watchTeam`, prefetch entry (before the generic `/settings` one), lazy route |
| Tests | `data/watchTeam.test.ts`, `utils/watchCounters.test.ts`, `hooks/useWatchReplay.test.ts`, `pages/settings/WatchTeam.test.tsx`, `components/home/WatchTeamButton.test.tsx`; extended `auth/permissions.test.ts`, `routes/pages.test.ts`; `e2e/v42-watch.spec.ts`; `e2e/helpers.ts` ROUTES (33 to 34, so `routes.spec` and `a11y.spec` cover the page in EN and AR, light and dark) |

## Who sees it

| Role | Opens it | Why |
|---|---|---|
| CX manager, CX team | yes | all pages |
| Environment management | yes | the spec's list |
| Marketing | yes | the spec's list |
| Internal Audit and Marketing Lead | yes | the spec's list; can also open the agents page |
| Executive | yes | the spec's list |
| Team lead, After-Sales lead | no | see below |
| L&D, HR specialist, HR manager, mystery shopper | no | redirect to the role's home, as every gated page |

**Alignment with the agents page.** The prototype gives the page to every role that sees its agents page, plus `cxm, cx, ia, ex, em, mk`. In React only the CX manager, the CX team and the Internal Audit and Marketing Lead can open `/intelligent-cx-team`: all three are on the spec's list, so the spec's list is the union. The prototype's agents page also reaches the team lead and the After-Sales lead (`tl`, `lead`); here they cannot open it, so they do not get the replay [Proposed]. One line in `ROLE_PATHS` if the owner wants them. A unit test pins the rule: every role that can open the agents page can open the replay.

## Landing of `/settings` [Proposed]

`AccessGuard` sends `/settings` to the first page of `SETTINGS_NAV` the role may open (CX: Weekly sample, Marketing: Public mentions, environment management: Surveys and triggers). Listing the replay second would have made it the landing page of six roles. It is a demo page, not an entry point, so the entry carries `skipLanding: true` and the guard uses `SETTINGS_LANDING` (the menu without it): the landing of every role is unchanged (tested in unit and e2e).

## The page

Top to bottom: sub-page heading and intro; one card with the controls (Play dark pill, Next step and Reset light pills, "Step n / 9") and the nine steps; the "This week, by the same team" card (eight `KpiTile variant="well"` on one card, `sample` tag); the "What you will not see here" card. Dense density, `@container` on the page root.

| Part | Behaviour |
|---|---|
| Step row | Ordered list (`ol`, labelled), one `li` per step. Clock in `<bdi dir="ltr">`; chip; title; once reached, description and an output line `→ ...` and, where the prototype has `chk`, a light success tag with a check and "supervisor". Chip: `AgentChip` for agents, `AgentChip agent="supervisor"` for the supervisor, a neutral "Source" tag for the first and last step. Long agent names wrap inside the chip |
| Not yet reached | Title and clock in `text-muted-foreground` (5.1:1 on the card), chip greyscale. **No opacity** (the prototype's `.45` would fail axe); no description, no output (not in the DOM) |
| Current step | A well (`bg-well`), `aria-current="step"`; the earlier steps stay open |
| Layout | Container query: from 672px of page width three columns (clock 76px, chip up to 240px, text); below it the clock and chip share a line and the text sits under them (tested at 320, 375, 390, EN and AR, no sideways scroll) |
| Play | Starts at step 1, every 750 ms one step, stops on step 9; pressed again it restarts from step 1 with one timer; leaving the page clears the interval |
| Next step | One step; at step 9 it is `aria-disabled` (not `disabled`, so a keyboard user keeps focus) and does nothing. Pressing it during Play stops Play [Proposed] |
| Reset | Step 1, stops Play |
| Live region | `<p aria-live="polite" aria-atomic="true" class="sr-only">` with "Step 3 of 9: Agent 2 classifies it". Not `role="status"`: `e2e/helpers.ts expectPageReady` treats every `main [role=status]` as a loading indicator |
| Motion | A reached step fades its text in over 400 ms (CSS `cx-fade-in`, opacity only, none on step 1 at first paint). Under `prefers-reduced-motion` the class is not rendered (and the global rule zeroes animations): Play still advances |
| Loading | The step list shows `LoadingState` until the sample person has loaded; counters show their skeleton until the registers have loaded |

## Names, mobile, environment

| Item | Rule |
|---|---|
| Sample person | The first person of `usePersons()`, i.e. of the environment in scope. CX roles on "All environments": `p-001`. Environment management is fixed to Dubai: Dubai's first person. If nobody is in scope: "A customer" in Abu Dhabi, as the prototype's fallback [Proposed] |
| Name (step 2 output, step 9 "Call ...") | `personLabel`: the name for roles in `canViewCustomerNames`, else the reference (`P-001`). Internal Audit and Marketing Lead: reference only (tested, unit and e2e: the name is nowhere in `main`) |
| Mobile (step 1) | `+9715•••37`: first five characters and the last two, for roles in `canViewMobiles` (the spec's example; the prototype keeps six). The Internal Audit and Marketing Lead gets `+971•••••••` [Proposed]: the 18 Nov rule is "mobiles only to roles that may see names" |
| Environment | `envName(person.envId)`, in the reader's language, in steps 2, 4 and 9 |
| Fixed text | "From the matrix (PSI Real Estate): receiver Sales operations lead, informed Head of the environment, respond 4 h, resolve 45 h" is the prototype's sentence, not read from the matrix. It agrees with the 19 Nov matrix (Real Estate, Process). The ids `EV-9001`, `SG-9001`, `PT-9001`, `CA-9001`, `CL-9001` are illustrative: they do not open a Trace card |

## Counters

| Counter | Source | Note |
|---|---|---|
| Events read | `useAllInteractions()` filtered to the environment in scope, **+ 16** | `WATCH_EVENTS_BEYOND_SAMPLE`: the prototype's `EV.length + 16`, a sample figure |
| Signals counted | `useSignals()` length | follows the environment switch |
| Patterns over the line | `usePatterns()` length | |
| Fixes proposed | `useCorrectiveActions()` length | |
| Waiting for a yes | fixes with status `proposed` | |
| Sent back by the supervisor | constant **3** | `WATCH_SENT_BACK_BY_SUPERVISOR`, sample (prototype constant) |
| Handed to a person | constant **2** | `WATCH_HANDED_TO_PERSON`, sample (prototype constant) |
| Briefs written | `useDetractorCallItems()` length | Agent 8 writes one brief per call-list item (the prototype's `LOOP.length`) |

All eight sit under the `sample` tag. The counters follow the environment switch like Home does (the prototype's follow its own switch; [Proposed] for React: a role fixed to one environment never reads another environment's numbers). On "All environments" the sample reads 136, 37, 11, 4, 1, 3, 2, 12.

## Deviations from the prototype

| # | Prototype | Here | Why |
|---|---|---|---|
| 1 | Supervisor chip "CX Supervisor" in a gold tint | `AgentChip agent="supervisor"`: "CX Supervisor: 6 checks passed" | The spec; the shared chip |
| 2 | Steps ahead at opacity .45 | Muted ink, greyscale chip | axe: opacity lowers computed contrast |
| 3 | `✓ supervisor` in green text | A light success tag with a check icon | Colour is categorical (design rule 7) |
| 4 | Whole view re-rendered on each step | Reached step fades in; none under reduced motion | Spec |
| 5 | Next step does not stop Play | It does | Otherwise Play pulls the view back to its own step [Proposed] |
| 6 | `canNames()` (CX, CX manager, roles with an environment or HR) | `canViewCustomerNames` | Decided 18 Nov, the one rule everywhere |
| 7 | Mask `slice(0,6)`, same for everyone | `+9715•••xx`, and country code only for the Internal Audit and Marketing Lead | See above [Proposed] |
| 8 | Arrow `→` | The arrow before the output line is mirrored in RTL (`rtl:-scale-x-100`); arrows inside the strings are verbatim | RTL |
| 9 | Global person and counters | Environment in scope | See above [Proposed] |

## Strings that are not the prototype's (Arabic for native review)

| Where | English | Arabic (mine) |
|---|---|---|
| Controls group, `aria-label` | Replay controls | أدوات التشغيل |
| Step list, `aria-label` | The nine steps of one message | الخطوات التسع لرسالة واحدة |
| Live region | Step n of 9: {title} | الخطوة n من 9: {title} |
| Fallback customer (nobody in scope) | A customer | عميل |

Everything else (title, intro, Play, Next step, Reset, Step, Source, supervisor, the nine steps, the week heading, hint, `sample`, counter labels, the "will not see" card, nav label, Home button) is the prototype's, checked by a script that compares every string literal of the prototype block with `watchTeam.ts` (133 literals; the only ones not carried over are the fallback customer and the markup). "Watch the AI team work" on Home is a link (it navigates) styled as the small outline pill, with a play icon in place of the prototype's "▶" character.

## Known gaps

- The replay is one fixed sample message: it is not generated from the registers, and its ids do not open the Trace card.
- The prototype's `agents` roles beyond React's (team lead, After-Sales lead) are left out; see above.
- No `[Proposed]` badge on the page: the spec has none. The [Proposed] items above are in this doc only.
- Nothing here measures impact: by design the card says so.
