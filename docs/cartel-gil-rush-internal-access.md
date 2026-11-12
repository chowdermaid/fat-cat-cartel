# Gil Rush public viewing

The former mock-run allowlist is removed. Both /cartel-gil-rush/game and /cartel-gil-rush/rulebook, plus base/legacy redirects and the sidebar link, are public without a login. The existing pre-event screen appears until the host starts the race. Bingo remains local to each browser. Signing in does not grant host controls unless the session is confirmed as a Boss/Underpaw admin.

Only /events/cartelGilRush/current and its descendants are public-readable. Ancestor /events and /events/cartelGilRush reads remain denied; Easter keeps its separate public grant. All browser writes remain denied, including claimed-admin identities. /cartelGilRushPrivate/current remains server-only. Both regional mutation callables continue to validate a current linked Boss/Underpaw session before any action, including private assignments, payouts and reset. Unrevealed chest prizes and Minority Draw choices remain private; Split or Steal decisions stay in the host tab until reveal.

New clients keep one direct Realtime Database value subscription through src/lib/db.ts, shared across Game/Rulebook. It normalises snapshots, reports read failures and detaches on unmount. Viewing does not send or require a session token and makes no read Function or Discord authorization calls. The old readCartelGilRushEvent callable remains as a public read-only compatibility endpoint for older clients, with revision validation and a maximum 20-second wait; it returns only the normalised current event and requires no Discord secret. It cannot return private assignments or mutate anything.

Cost: one public realtime connection per mounted viewer, with the small initial event snapshot and subsequent updates. This replaces roughly three authenticated read Function invocations per idle visible minute and their Discord/member lookups and billable runtime. New viewing uses zero read Function calls. Host write/private-assignment call counts are unchanged; no new stored branches, scheduled work or per-player calls. Public availability can increase total viewing traffic, so total downloads depend on attendance.

## Release

No deployment or production-data edit was performed. Deploy the rules, compatibility endpoint and frontend. Include both mutation exports for the accumulated cash-only reward and five-question Trivia changes. No .env or secret changes are needed.

From C:/Projects/fat-cat-cartel, build with npm --prefix functions run build and npm run build, then run:

```powershell
firebase deploy --project fat-cat-cartel --only "database,functions:readCartelGilRushEvent,functions:mutateCartelGilRushEvent,functions:mutateCartelGilRushEventAsia,hosting"
```

Refresh existing browsers after release. Hosting alone will leave new anonymous database reads denied by the old rules.

## Verification

On 12 November 2026, 28 database-rule tests and eight real-callable emulator tests passed against the existing local emulator using only the demo-fat-cat-cartel namespace. They verify anonymous current-event reads, denied ancestors and writes, hidden private assignments, unchanged host authorization across both regions, compatibility reads, and atomic cash payouts. Model, public-reader, page, queue and regional-client checks are tracked in the implementation runbook. Browser visual verification was not performed for this access-only change.

Final local checks: frontend and Functions builds, scoped ESLint, 62 public-reader/page/Bingo/minigame/queue/regional-client tests, 30 model/authorization tests and 36 emulator/rules tests passed (128 total). The obsolete Rulebook-copy assertion was removed from the updated anonymous Bingo page test; reward-threshold tests still verify highest-tier payouts. No deployment was performed.
