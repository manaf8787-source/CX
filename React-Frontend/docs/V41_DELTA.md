# V41 delta for the React build (18 Nov 2026)

One item on top of V40_DELTA. Status `[Proposed]` until Manaf confirms.

## F28 · Guided tour on first entry per role

**What the user sees.** First sign-in under a role: the screen dims, the real element is highlighted with a gold frame, a card (title, two or three sentences, Next / Back / Skip, "n / total") sits below or above it. Some steps have "Do it and continue": the real action runs (open My inbox, open fix CA-204 from the "waiting for a yes" tab) and the next card appears on the page that opened. Ends with a toast. Replay from "How do I use this?" at the bottom of the menu. Bilingual, RTL in Arabic.

**Data.** `tours[role] = [{ view, tab?, registerFilter?, clearSelection?, target (CSS selector), highlightParent? (closest selector), title{en,ar}, text{en,ar}, click? }]`. Paths per role are in the Knowledge Base section 4 (CX manager/CX team 13 steps; environment managers and leads 10; Marketing 7; L&D 3; Internal audit 4; others 4).

**Behaviour.** Navigate to `view` (and tab/filter) before positioning; position from `getBoundingClientRect` after render; scroll target into view (centre); card goes above the target when there is no room below; reposition on resize; a target that is missing shows the card centred with no highlight (never blocks). Completion stored per user per role (`tour_done[role]`); role switch resets the running tour. Overlay must not intercept clicks except on the card.

**Prototype reference.** `v28.js` in the build; selectors used: `.steps6`, `.brief`, `.card.kpi`, `[data-act=nav][data-id=inbox]`, inbox first row, `.nextbox`, `[data-act=caOpen][data-id=CA-204]`, the decision button row, `.card.trace`, `[data-act=loopOpen]`, the customers search box, `[data-act=cjTop][data-id=personas]`.
