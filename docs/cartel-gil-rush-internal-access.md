# Gil Rush internal mock-run access

Both `/cartel-gil-rush/game` and `/cartel-gil-rush/rulebook`, including the base/legacy redirects, are internal. Boss and Underpaw retain host controls. The only additional viewer is the signed-in tracked member whose current Discord link points to Lodestone ID `51550870`. They must have an allowed live Discord member role. They receive no host controls, private assignments, mutation access or other admin privileges. Guests, other members, unlinked identities and checking sessions cannot mount either view, Bingo or the event reader. The sidebar uses the same gate.

The hardcoded ID and shared view predicate are in `functions/src/cartel-gil-rush-model.ts`; the frontend uses them only to decide which UI to mount. `readCartelGilRushEvent` in Singapore independently calls `requireMemberSession` on every request, rechecking the hashed session, expiry, live Discord roles, actual link and tracked member. It ignores supplied Lodestone IDs, ranks, admin flags and cached privilege claims. The existing US and Singapore mutation callables still require live Boss/Underpaw authority for every action. The extra viewer never receives a host token in the event controller.

RTDB rules deny direct browser reads of `/events`, `/events/cartelGilRush` and its descendants for all browser identities. The previous parent-level public grant had to be removed because a child rule cannot revoke it. Easter's existing public grant now sits at `/events/easter2026`; its reads and all existing browser-write restrictions remain. The chest-prize/assignment branch remains server-only. No database paths or stored data are migrated.

The authenticated read endpoint waits on one server value listener for a newer revision, or returns a null heartbeat after 20 seconds and detaches. The client keeps at most one read pending, waits one second before the next request, pauses new requests when hidden and ignores replies after unmount. Existing game snapshots remain monotonic in the controller; mutation responses can update a host immediately. A read failure blocks the workspace and mutations. Transient failures retry after five seconds with a fresh snapshot; permission/expiry failures stop until refresh/login. Session or role changes unmount disallowed views; a server-side revocation is checked on the next read request, at most one bounded long-poll later when idle. An already received snapshot cannot be withdrawn from a browser.

Cost impact: the public client listener is replaced with roughly three read Function calls/minute per idle visible viewer. Each revalidates Discord/member access, downloads the small current snapshot server-side and can hold a billable Function request for 20 seconds. Rapid changes can cause more calls, bounded by the one-second client delay. A hidden/unmounted client can leave its current server request open until that timeout, but starts no more. This adds read Function invocation/runtime costs; write counts, mutation retries and private assignment calls are unchanged. No Firebase Auth bridge, secrets, new storage branches or schedules are added.

## Release

These local changes do not protect an existing deployment until the callable, rules and frontend are released. Deploy the read callable and rules first: existing clients will be denied direct reads until they refresh onto the new frontend. Use the existing Firebase project/config and Discord bot secret; no `.env` changes or new credentials are needed.

```powershell
Set-Location C:\Projects\fat-cat-cartel
npm --prefix functions run build
if ($LASTEXITCODE -ne 0) { throw "Functions build failed" }
firebase deploy --project fat-cat-cartel --only "functions:readCartelGilRushEvent,database"
if ($LASTEXITCODE -ne 0) { throw "Read endpoint/rules deployment failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
firebase deploy --project fat-cat-cartel --only hosting
```

Refresh both host and preview browsers. The preview player must log in with the Discord account already linked to `51550870`. No deployment or production data change was performed by the implementation agent.

## Verification

On 7 November 2026, frontend and Functions builds, scoped ESLint, 85 non-emulator feature/regional-client checks, 26 model/authorization checks and 34 emulator callable/rules checks passed. Coverage includes both direct views, denied/checking sessions mounting no reader, the exact linked preview ID, live role loss, spoofed/cached identity rejection, read-only enforcement on both regional mutation endpoints, long-poll revision/timeout behavior, hidden-tab and unmount cleanup, denied ancestor/leaf database reads, and preserved public Easter reads. Graphify was refreshed. Browser visual verification was not performed.
