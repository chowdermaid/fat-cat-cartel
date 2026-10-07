import { strict as assert } from "node:assert";
import { test, type TestContext } from "node:test";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { triggerUcobProgressRefresh } from "./index";
import * as auth from "./admin-auth";
import { buildUcobProgressData, mapUcobActivities, mapUcobProgressionRows, runRefreshUcobProgress, type UcobProgressData } from "./ucob-progress";

const canonical = "the-unending-coil-of-bahamut-ultimate";
const graphRows = [
  { pull: 2, Pulls: 65, displayPercent: "15% P2", duration: "3:20", startTime: "2026-10-07T10:00:00+11:00", reportCode: "ExampleCode", mechanic: { name: "Nael", number: 2 }, isPublic: true },
  { pull: 1, Pulls: "91%", displayPercent: "60% P1", duration: "1:00", startTime: "2026-10-06T22:00:00Z" },
  { pull: 3, Pulls: 80, duration: null },
];
const activityRows = [{ activity: { id: "session-1", encounter: { canonicalName: canonical }, startTime: "2026-10-07 00:00:00", endTime: "2026-10-07 02:00:00", killsCount: 0, wipesCount: 3, bestPercent: "15% P2", reportMetadata: { url: "https://www.fflogs.com/reports/ExampleCode" } } }];

function fixture(t: TestContext, cached: UcobProgressData | null = null) {
  const state = { cached, graph: { data: { graph: graphRows } } as unknown, activity: { activity: { activities: { activities: { paginator: { data: activityRows } } } } } as unknown, fail: false };
  const reads: string[] = [];
  const writes: UcobProgressData[] = [];
  const requests: string[] = [];
  t.mock.getter(admin, "database", () => (() => ({ ref: (path: string) => {
    assert.equal(path, "raidStats/ucobProgress");
    return {
      get: async () => { reads.push(path); return { val: () => state.cached }; },
      set: async (value: UcobProgressData) => { writes.push(value); state.cached = value; },
    };
  } })) as typeof admin.database);
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    assert(url.startsWith("https://tomestone.gg/api/character/"), "Test must never call another service");
    requests.push(url);
    return new Response(JSON.stringify(url.includes("progression-graph") ? state.graph : state.activity), { status: state.fail ? 503 : 200 });
  });
  return { state, reads, writes, requests };
}

test("UCOB mapper separates overall progression from phase boss HP and orders running best", () => {
  const points = mapUcobProgressionRows(graphRows);
  assert.deepEqual(points.map((point) => [point.pull, point.bossHpRemaining, point.bestBossHpRemaining]), [[1, 91, 91], [2, 65, 65], [3, 80, 65]]);
  assert.equal(points[1].displayPercentText, "15% P2");
  assert.equal(points[1].phase, "P2");
  assert.equal(points[1].durationMs, 200_000);
  assert.equal(points[1].startedAt, Date.parse("2026-10-06T23:00:00Z"));
  assert.equal(points[1].reportUrl, "https://www.fflogs.com/reports/ExampleCode");
  assert.equal(points[2].durationMs, null);
});

test("zero and explicit clears survive mapping; unsafe links and invalid rows do not", () => {
  const points = mapUcobProgressionRows([{ Pulls: 0, reportUrl: "javascript:alert(1)" }, { kill: true }]);
  assert(points.every((point) => point.cleared && point.bossHpRemaining === 0));
  assert.equal(points[0].reportUrl, null);
  for (const rows of [[{ Pulls: "" }], [{ Pulls: 101 }], [{ displayPercent: "20% P2" }], [{ pull: 0, Pulls: 20 }], [{ pull: 1, Pulls: 30 }, { pull: 1, Pulls: 20 }]]) {
    assert.throws(() => mapUcobProgressionRows(rows));
  }
});

test("activities include only UCOB and deduplicate sessions", () => {
  const activities = mapUcobActivities([...activityRows, ...activityRows, { activity: { encounter: { canonicalName: "dancing-mad-ultimate" }, startTime: "2026-10-07 00:00:00" } }], canonical);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].startedAt, Date.parse("2026-10-07T00:00:00Z"));
});

test("static totals count each pull once and report partial time without substituting session duration", () => {
  const data = buildUcobProgressData("20439006", mapUcobProgressionRows(graphRows), mapUcobActivities(activityRows, canonical));
  assert.equal(data.static.name, "The Coils Cartel");
  assert.equal(data.summary.pullCount, 3);
  assert.equal(data.summary.timeSpentMs, 260_000);
  assert.equal(data.summary.timedPullCount, 2);
  assert.equal(data.summary.bestProgress, 65);
  assert.equal(data.summary.bestPull, 2);
  const empty = buildUcobProgressData("20439006", [], []);
  assert.equal(empty.summary.bestProgress, null);
  assert.equal(empty.summary.pullCount, 0);
});

test("refresh makes two bounded requests and one tracker read/write without reading members", async (t) => {
  const f = fixture(t);
  const status = await runRefreshUcobProgress("synthetic-token", "20439006");
  assert.equal(status.requestsThisRefresh, 2);
  assert.equal(f.requests.length, 2);
  const graph = new URL(f.requests.find((url) => url.includes("progression-graph"))!);
  assert.equal(graph.pathname, "/api/character/progression-graph/20439006");
  assert.equal(graph.searchParams.get("encounter"), canonical);
  assert.equal(graph.searchParams.get("expansion"), "stormblood");
  assert.deepEqual(f.reads, ["raidStats/ucobProgress"]);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].points.length, 3);
});

test("failed, malformed, and shrinking responses retain the previous cache", async (t) => {
  const cached = buildUcobProgressData("20439006", mapUcobProgressionRows(graphRows), []);
  const f = fixture(t, cached);
  f.state.fail = true;
  await assert.rejects(runRefreshUcobProgress("synthetic-token", "20439006"), (error: unknown) => error instanceof HttpsError && error.code === "unavailable");
  f.state.fail = false;
  f.state.graph = { unexpected: true };
  await assert.rejects(runRefreshUcobProgress("synthetic-token", "20439006"), /unexpected UCOB response/);
  f.state.graph = { data: { graph: [] } };
  await assert.rejects(runRefreshUcobProgress("synthetic-token", "20439006"), /Previous progress was retained/);
  assert.equal(f.state.cached, cached);
  assert.equal(f.writes.length, 0);
});

test("invalid configured source fails before any external request", async (t) => {
  const f = fixture(t);
  await assert.rejects(runRefreshUcobProgress("synthetic-token", "bad-id"), (error: unknown) => error instanceof HttpsError && error.code === "failed-precondition");
  assert.equal(f.requests.length, 0);
  assert.equal(f.writes.length, 0);
});

test("callable verifies linked member authorization before accessing Tomestone or tracker data", async (t) => {
  const f = fixture(t);
  let authorizationCalls = 0;
  t.mock.method(auth, "requireMemberSession", async () => {
    authorizationCalls++;
    throw new HttpsError("permission-denied", "A linked Discord character is required.");
  });
  await assert.rejects(triggerUcobProgressRefresh.run({ data: { adminSessionToken: "synthetic-session" } } as Parameters<typeof triggerUcobProgressRefresh.run>[0]), (error: unknown) => error instanceof HttpsError && error.code === "permission-denied");
  assert.equal(authorizationCalls, 1);
  assert.equal(f.requests.length, 0);
  assert.equal(f.reads.length, 0);
  assert.equal(f.writes.length, 0);
});

test("callable allows a verified linked non-admin and keeps the configured static source", async (t) => {
  const f = fixture(t);
  const previousSource = process.env.UCOB_SOURCE_LODESTONE_ID;
  process.env.UCOB_SOURCE_LODESTONE_ID = "20439006";
  t.after(() => {
    if (previousSource == null) delete process.env.UCOB_SOURCE_LODESTONE_ID;
    else process.env.UCOB_SOURCE_LODESTONE_ID = previousSource;
  });
  t.mock.method(auth, "requireMemberSession", async () => ({ isMember: true, isAdmin: false, lodestoneId: "12345678" }));
  t.mock.method(auth, "requireAdminSession", async () => { throw new Error("UCOB refresh must not require admin status"); });
  const result = await triggerUcobProgressRefresh.run({ data: { adminSessionToken: "synthetic-session", lodestoneId: "12345678" } } as Parameters<typeof triggerUcobProgressRefresh.run>[0]);
  assert.equal(result.ok, true);
  assert.equal(f.writes[0].static.sourceLodestoneId, "20439006");
  assert(f.requests.every((url) => url.includes("/20439006?")));
});
