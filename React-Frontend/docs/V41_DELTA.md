# V41 delta for the React build (18 Nov 2026)

One item on top of V40_DELTA. Status `[Proposed]` until Manaf confirms.

## F28 · Guided tour on first entry per role

**What the user sees.** First sign-in under a role: the screen dims, the real element is highlighted with a gold frame, a card (title, two or three sentences, Next / Back / Skip, "n / total") sits below or above it. Some steps have "Do it and continue": the real action runs (open My inbox, open fix CA-204 from the "waiting for a yes" tab) and the next card appears on the page that opened. Ends with a toast. Replay from "How do I use this?" at the bottom of the menu. Bilingual, RTL in Arabic.

**Data.** `tours[role] = [{ view, tab?, registerFilter?, clearSelection?, target (CSS selector), highlightParent? (closest selector), title{en,ar}, text{en,ar}, click? }]`. Paths per role are in the Knowledge Base section 4 (CX manager/CX team 13 steps; environment managers and leads 11; Marketing 7; L&D 3; Internal audit 4; others 4).

**Behaviour.** Navigate to `view` (and tab/filter) before positioning; position from `getBoundingClientRect` after render; scroll target into view (centre); card goes above the target when there is no room below; reposition on resize; a target that is missing shows the card centred with no highlight (never blocks). Completion stored per user per role (`tour_done[role]`); role switch resets the running tour. Overlay must not intercept clicks except on the card.

**Prototype reference.** `v28.js` in the build; selectors used: `.steps6`, `.brief`, `.card.kpi`, `[data-act=nav][data-id=inbox]`, inbox first row, `.nextbox`, `[data-act=caOpen][data-id=CA-204]`, the decision button row, `.card.trace`, `[data-act=loopOpen]`, the customers search box, `[data-act=cjTop][data-id=personas]`.

## F29 · Weekly sample: show what the agent saw (19 Nov 2026)

**The gap.** The sample listed the agent's output and an id only, so a reader could not judge Right or Wrong without opening every record. This was a gap in the requirement (the prototype and the KB said "fifty outputs, right or wrong" and no more); the React build followed it faithfully.

**Now required per row.** Four things, and a one-line "How to judge" card above the table:
- *What it saw*: the input the agent worked from. Proposed fix → the pattern text, signal count, the "recovered in X of N similar closed fixes" figure. Classification → source, date, the quoted text of the signal. Interview brief → the first score, number of events on the timeline, problems found. Journey reading → events, problems, last contact date.
- *What it produced*: the output in one line (fix title and owner title; category and severity; person and suggested reason code; runaway type).
- *Supervisor*: the six checks and the result (6 of 6 passed).
- *Open*: a button to the record, for CX roles only. The Internal Audit and Marketing Lead sees ids and titles, never customer or agent names (Decision 6).

**Rule.** A sample row must be judgeable in about 30 seconds from the row itself; opening the record is for doubt, not for every row. Prototype reference: `v29.js` (`wsInput`).
