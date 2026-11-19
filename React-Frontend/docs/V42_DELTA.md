# V42 delta for the React build (19 Nov 2026)

## F30 · Escalation matrix: cells set, two new rows, three rules (Decision 4 closed)

- Seed the matrix from `ESCALATION-MATRIX-2026-11-19.md` (six products × twelve rows). Remove the `[Proposed]` badge from the matrix and from the "From the matrix" line on each fix; replace with "Set 19 Nov · titles adjustable until 28 Nov".
- Two new rows: `infosec` ("Data exposure or system access incident") and `vip` ("Any kind, VIP customer involved"). The `vip` row is a rule, not a receiver: when the fix's pattern includes a person tagged VIP in the CRM (Club member, investor, portfolio owner), respond and resolve clocks are halved, the head of the environment is added to "informed" at once, and the CX manager becomes backup. Show "VIP · clocks halved" on the fix.
- A "Three rules behind the cells" card above the product tabs (text in the Knowledge Base, section 14) and the clock legend (1 h = same hour … 90 h = two weeks).
- The fix's due date = approval time + the row's Resolve (h) in working hours (Decision 3), halved for VIP.
- Header text: "Cells set on 19 November by the CX manager; product owners may adjust a title with the Internal Audit and Marketing Lead before 28 November; the clocks stay."

## F31 · "Watch the AI team work" page

- Route under Settings and reference, after "How the portal works"; a button on Home under the six steps. Visible to CX manager, CX team, environment managers, Marketing, Internal Audit, executives.
- A replay of one message through nine steps (text and timings in the Knowledge Base, section 13, "Watch the AI team work"; data in the prototype `v30.js`, `watchSteps()`): each step has a clock, an agent chip (or Source / CX Supervisor), a title, a description, an output id, and a supervisor tick. Play advances one step every 750 ms; Next step walks; Reset. Steps not yet reached are dimmed.
- Under it: "This week, by the same team" counters computed from the data (events read, signals counted, patterns over the line, fixes proposed, waiting for a yes, sent back by the supervisor, handed to a person, briefs written), badged `sample`.
- A fixed card "What you will not see here" (impact only after Shadow; 9 in 10 agreement gates Limited; a critical miss in the weekly sample blocks Live).
- Names in the replay follow the viewer's role (ids for roles that may not see names).

## F32 · Weekly sample split by reader (19 Nov, after Manaf's question as Internal Audit)

- Nobody approves or rejects a fix from the sample; it is a quality audit of the AI. Add a card above the table that says so, per role (text in KB section 13, "The sample is split by reader").
- Internal Audit and Marketing Lead sees only audit rows: `routing` (fix kind, product, matrix receiver and clocks vs. the owner it was routed to), `classification` (source, date, quoted text vs. category and severity), `access` (what was sent to the receiver: no conversation text, no customer name), `targeting` (persona definition and size vs. the campaign's "who" and channel). CX manager and CX team see content rows: proposed fixes, interview briefs, journey readings. Tiles (read, wrong, accuracy, due) count the reader's own rows.
- Sample data: fix "repeat contact → Legal" is a routing error; keep it, it is what the routing row should catch.

## F33 · Campaign audit page

- Route under Settings and reference after Weekly sample; visible to Internal Audit and Marketing Lead (editor), CX manager (editor), Marketing manager and executives (read).
- List: every Marketing campaign built from a persona (one per persona in the sample) and every AI interview campaign from Close the loop. States: before (waiting for clearance), running, after.
- Five checks, each with the rule text and "what the campaign says" (right people: persona, segment definition, size, consent; right projects and developers; right channel, language, timing; right message incl. the persona's "what not to do"; the money: budget, cost per contact, expected responses, expected cost per lead). ✓/✗ per check; verdict Cleared to run / Send back to Marketing with the failed checks. Nothing is sent before clearance.
- After the run: reached the right people (% matching the persona on the record; <80% raises a targeting signal to Marketing), responded %, leads or recoveries, cost per result.
- Inbox item for Internal Audit: "Clear or send back: N campaigns waiting" (2 working days, urgent) and "Audit after the run: N finished"; a daily brief line with the campaigns waiting and the reached-right-people % of running ones.
- Role description for Internal Audit and Marketing Lead rewritten: "Audits, never approves fixes …" (KB section 2). Tour for the role gains the campaign audit step.

## F34 · Weekly sample as a card flow in plain words (19 Nov, after Manaf could not understand the table as CX)

Replaces the table as the default view (keep the table behind "See all as a list").
- Intro card: "The AI team is a new employee. Every week you check a few pieces of its work, one at a time, the way a supervisor listens to a few of a new agent's calls. … You are not approving anything and nothing changes for the customer; a 'no' just teaches the supervisor what to catch next time."
- One card at a time: left "What the AI was given" (quoted message with source and date; or the pattern text plus up to three quoted signals with date; or the customer's last three events; or the persona and its size), right "What it decided" plus one "How" line.
- One question per kind (exact texts in KB section 13) and three answers: Yes, I would do the same / No, that is wrong / Not sure, skip for now; CX roles also get "Open the fix" or "Open the signal".
- Counter "n / N checked this week · k marked wrong · due Thursday"; an "All done" card at the end.
- Reader split (F32) unchanged. Prototype reference `v32.js` (`wsEvidence`, `wsQuestion`).

## F35 · PSI Wallet survey moments (19 Nov, first-release review)

Survey questions → PSI Wallet now has four sets: `setup` (CES 1–7 after the wallet is created, screens 12→13), `call` (CSAT 1–5 after the advisor call, screen 48), `addp` (CES 1–7 after a property is added, screen 51, answer tagged single|bulk), `nps` (Dashboard, screen 13, ~30 days after creation, then yearly). One rating + one optional comment per touchpoint, never two questions. Follow-up by score: CES ≤ 4 or CSAT ≤ 3 opens a short "What went wrong?"; a low call score also raises a notification to the advisor team (route as a service signal to the Account manager lead per the matrix). High scores: thank-you only. The Wallet product page "When this product asks" reads from the same data. Prototype reference `v33.js`.
