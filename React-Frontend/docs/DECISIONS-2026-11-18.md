# Decisions confirmed 18 November 2026 (answers to V40_DELTA.md section E)


1. **Working week: Monday to Friday.** Working-day counts skip Saturday and Sunday (the prototype had Friday and Saturday; fixed in v40 on 18 Nov).
2. **Escalation matrix: one table per product, rows per fix kind** (the eight kinds plus the two case types). The earlier per-complaint-category template in the Rules doc is superseded; categories are what Agent 2 gives a signal, kinds are what Agent 5 gives a fix, and the matrix routes fixes. Real Estate has one table, not one per environment.
3. **A fix's due date comes from the matrix "Resolve (h)"**, in working hours from approval; Agent 5's 14 days is the fallback for an empty cell. The 5-working-day approval window runs from the proposal; the 60-day check from "done".
4. **Public replies are Marketing's** (channel owner), within 48 hours from the approved wording; the CX team watches the clock and raises a signal when missed; the Internal Audit and Marketing Lead audits monthly.
5. **Calling: 09:00 to 18:00 UAE time, 3 attempts** for the CX team list, next attempt the following working day, WhatsApp after the last; **2 no-answers** for an AI campaign before hand-off. Both configuration; Legal confirmation of hours still pending.
6. **Weekly sample: 50 outputs by Thursday, no customer names to Internal Audit; a "wrong" lowers the agent's pass rate** and becomes a supervisor test.
7. **The environment switch narrows everything**, fixes and the call list included; **exports show mobiles only to roles that may see names.**

Written into "CX Portal: Rules and Definitions" as the section "Decisions added on 18 November 2026". The React build lives in `React-Frontend/` with its own docs (`docs/V40_DELTA.md`, `docs/V40_FOUNDATION_API.md`); it badges anything still `[Proposed]` in the UI.
