import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
// Initialise AnimeJS in Node before the storage-only window shim is installed.
import "animejs";

const servers = [];
async function modules({ stubs = true, persona = false, transport = false } = {}) {
  const server = await createServer({
    configFile: false, envFile: false, logLevel: "silent",
    server: { middlewareMode: true, ws: false },
    resolve: { alias: { "@": path.resolve("src") } },
    define: {
      "import.meta.env.VITE_USE_STUBS": JSON.stringify(String(stubs)),
      "import.meta.env.VITE_DEV_AUTH_LAYER": JSON.stringify(String(persona)),
    },
    plugins: [{ name: "offline-ucob-boundary", enforce: "pre", load(id) {
      const file = id.replaceAll("\\", "/");
      if (file.endsWith("/src/lib/firebase.ts")) return "export const firebaseApp = null; export const db = null;";
      if (transport && file.endsWith("/src/features/admin/api/adminFunctions.ts")) return "export const callAdminFunction = (...args) => globalThis.ucobTestTransport(...args);";
      if (file.endsWith("/src/features/ucob-prog/hooks/useUcobProgress.ts")) return "export const useUcobProgress = () => globalThis.ucobUiState;";
      if (file.endsWith("/src/features/admin/hooks/useAdminAuth.ts")) return "export const useAdminAuth = () => globalThis.ucobAuthState;";
    } }, react()],
  });
  servers.push(server);
  const load = (file) => server.ssrLoadModule(`/src/${file}`);
  return {
    api: await load("features/ucob-prog/api/ucobProgressFetchers.ts"),
    fixtures: await load("features/ucob-prog/api/ucobProgressFixtures.ts"),
    chart: await load("features/ucob-prog/utils/chartData.ts"),
    phaseProgress: await load("features/ucob-prog/utils/phaseProgress.ts"),
    phaseTrack: await load("features/ucob-prog/components/progress/UcobPhaseProgress.tsx"),
    page: await load("features/ucob-prog/components/UcobProgPage.tsx"),
    db: await load("lib/db.ts"),
    personas: await load("lib/dev/personas.ts"),
  };
}

let direct, persona, live;
before(async () => {
  const values = new Map();
  globalThis.window = Object.assign(new EventTarget(), { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key), clear: () => values.clear(),
  } });
  globalThis.fetch = () => { throw new Error("Production requests forbidden in UCOB client tests"); };
  direct = await modules();
  persona = await modules({ persona: true });
  live = await modules({ stubs: false, transport: true });
});
after(async () => { await Promise.all(servers.map((server) => server.close())); });

test("stub reads and refreshes use the dedicated tracker branch", async () => {
  const first = await direct.api.fetchUcobProgress();
  assert.equal(first.static.sourceLodestoneId, "20439006");
  assert(first.points.every((point) => point.bossHpRemaining >= 0 && point.bossHpRemaining <= 100));
  assert(first.points.every((point) => point.bestBossHpRemaining >= 0 && point.bestBossHpRemaining <= point.bossHpRemaining));
  assert(first.points.every((point) => /^P[1-5]$/.test(point.phase)));
  const members = (await direct.db.get(direct.db.ref(direct.db.db, "members"))).val();
  await direct.db.set(direct.db.ref(direct.db.db, "raidStats/ucobProgress"), null);
  assert.equal(await direct.api.fetchUcobProgress(), null);
  const result = await direct.api.triggerUcobProgressRefresh("synthetic-session");
  assert.equal(result.ok, true);
  assert.equal((await direct.api.fetchUcobProgress()).static.name, "The Coils Cartel");
  assert.deepEqual((await direct.db.get(direct.db.ref(direct.db.db, "members"))).val(), members);
});

test("persona refresh rejects guests and allows linked members, Boss, and Underpaw", async () => {
  persona.personas.setSelectedDevPersona("guest");
  await assert.rejects(persona.api.triggerUcobProgressRefresh("synthetic-session"));
  for (const id of ["member", "boss", "underpaw"]) {
    persona.personas.setSelectedDevPersona(id);
    await persona.db.set(persona.db.ref(persona.db.db, "raidStats/ucobProgress"), null);
    assert.equal((await persona.api.triggerUcobProgressRefresh("synthetic-session")).ok, true);
    assert.equal((await persona.api.fetchUcobProgress()).points.length, 72);
  }
});

test("production refresh forwards the session and timeout to the UCOB callable", async () => {
  const calls = [];
  globalThis.ucobTestTransport = (...args) => { calls.push(args); return { ok: true }; };
  await live.api.triggerUcobProgressRefresh("synthetic-session");
  assert.deepEqual(calls, [["triggerUcobProgressRefresh", "synthetic-session", {}, { timeout: 300_000 }]]);
});

function render({ data, loading = false, error = null, signedIn = true, linked = true, admin = false }) {
  globalThis.ucobUiState = { data, loading, error, reload: async () => {} };
  globalThis.ucobAuthState = { authed: signedIn, session: signedIn ? { isMember: linked, lodestoneId: linked ? "20439006" : null, isAdmin: admin } : null, sessionToken: signedIn ? "synthetic-session" : null };
  return renderToStaticMarkup(React.createElement(direct.page.UcobProgPage));
}

test("page identifies the static and exposes refresh before the first cache exists", () => {
  const empty = render({ data: null });
  assert.match(empty, /The Coils Cartel/);
  assert.match(empty, /The Unending Coil of Bahamut/);
  assert.match(empty, /data:image\/svg\+xml/);
  assert.match(empty, /Refresh progress/);
  assert.match(empty, /hasn&#x27;t been fetched/);
  const guest = render({ data: null, signedIn: false });
  assert.doesNotMatch(guest, />Refresh progress</);
  assert.match(guest, /linked Discord account/);
  for (const admin of [false, true]) {
    assert.doesNotMatch(render({ data: null, linked: false, admin }), />Refresh progress</);
  }
});

test("page retains cached chart and activity when a reload error occurs", () => {
  const data = direct.fixtures.createUcobProgressFixture();
  const markup = render({ data, error: "Synthetic read failure" });
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Synthetic read failure/);
  assert.match(markup, /Static progression chart/);
  assert.match(markup, /Each pull/);
  assert.match(markup, /Best so far/);
  assert.doesNotMatch(markup, /Recent Pulls/);
  assert.match(markup, /Recent sessions/);
  assert(markup.indexOf("Phase progress") < markup.indexOf("Static progression chart"));
  assert(markup.indexOf("Phase progress") < markup.indexOf("Recent sessions"));
  assert.doesNotMatch(markup, /All players/);
  assert.doesNotMatch(markup, /Sample data|Lower overall percentage|Phase shading follows/);
});

test("phase track retains furthest reach through earlier wipes and missing phase history", () => {
  const points = [
    { pull: 1, phase: "P1", bossHpRemaining: 95 },
    { pull: 2, phase: "P4", bossHpRemaining: 25, mechanicName: "Adds" },
    { pull: 3, phase: "P1", bossHpRemaining: 10 },
    { pull: 4, phase: " p4 ", bossHpRemaining: 22, mechanicName: "Teraflare" },
    { pull: 5, phase: "P4", bossHpRemaining: 22, mechanicName: "Later tied pull" },
    { pull: 6, phase: null, bossHpRemaining: 5 },
  ];
  const result = direct.phaseProgress.buildPhaseProgress(points);
  assert.equal(result.state, "progressing");
  assert.deepEqual(result.stages.map((stage) => stage.status), ["passed", "passed", "passed", "current", "unreached"]);
  assert.equal(result.bestPull.pull, 4);
  assert.equal(result.bestPull.mechanicName, "Teraflare");
  assert.equal(direct.phaseProgress.buildPhaseProgress([...points].reverse()).bestPull.pull, 4);
});

test("phase track never infers a phase or clearance from percentages or malformed labels", () => {
  const result = direct.phaseProgress.buildPhaseProgress([
    { phase: "P0", bossHpRemaining: 0 },
    { phase: "P6", bossHpRemaining: 5 },
    { phase: "P3 extra", bossHpRemaining: 10 },
    { phase: null, bossHpRemaining: 20 },
  ]);
  assert.equal(result.state, "unknown");
  assert.equal(result.bestPull, null);
  assert(result.stages.every((stage) => stage.status === "unknown"));
  const empty = direct.phaseProgress.buildPhaseProgress([]);
  assert.equal(empty.state, "unstarted");
  assert(empty.stages.every((stage) => stage.status === "unreached"));
});

test("explicit clearance completes all phases even without usable phase labels", () => {
  for (const result of [
    direct.phaseProgress.buildPhaseProgress([{ phase: null, cleared: true }]),
    direct.phaseProgress.buildPhaseProgress([], true),
  ]) {
    assert.equal(result.state, "cleared");
    assert.equal(result.bestPull, null);
    assert.equal(result.completionPercent, 100);
    assert(result.stages.every((stage) => stage.status === "passed"));
  }
});

test("continuous progress uses actual overall remaining values and retains improvements", () => {
  const points = [
    { pull: 1, phase: "P1", bossHpRemaining: 96.5 },
    { pull: 2, phase: "P3", bossHpRemaining: 43.25 },
    { pull: 3, phase: "P1", bossHpRemaining: 98 },
  ];
  assert.equal(direct.phaseProgress.buildPhaseProgress(points.slice(0, 1)).completionPercent, 3.5);
  assert.equal(direct.phaseProgress.buildPhaseProgress(points).completionPercent, 56.75);
  assert.equal(direct.phaseProgress.buildPhaseProgress([...points, { phase: "P3", bossHpRemaining: 42 }]).completionPercent, 58);
  assert.equal(direct.phaseProgress.buildPhaseProgress([]).completionPercent, 0);
  const invalid = direct.phaseProgress.buildPhaseProgress([
    { phase: null, bossHpRemaining: -5 },
    { phase: null, bossHpRemaining: 117 },
    { phase: null, bossHpRemaining: NaN },
  ]);
  assert.equal(invalid.completionPercent, null);
});

test("shadcn bar exposes dynamic progress while preserving independent phase milestones", () => {
  const data = direct.fixtures.createUcobProgressFixture();
  data.points = [{ pull: 7, phase: "P3", bossHpRemaining: 43.25, mechanicName: "Blackfire Trio" }];
  const markup = renderToStaticMarkup(React.createElement(direct.phaseTrack.UcobPhaseProgress, { data }));
  assert.match(markup, /role="progressbar"/);
  assert.match(markup, /aria-valuenow="56.75"/);
  assert.match(markup, /aria-valuetext="56.8% overall progression, furthest recorded phase P3"/);
  assert.match(markup, /left:56.75%/);
  assert.equal((markup.match(/data-phase="P[1-5]"/g) ?? []).length, 5);
  assert.doesNotMatch(markup, /bg-card|border-t-2|border-l-2/);
  data.points = [{ phase: null, bossHpRemaining: 42 }];
  const unknownPhase = renderToStaticMarkup(React.createElement(direct.phaseTrack.UcobPhaseProgress, { data }));
  assert.equal((unknownPhase.match(/data-state="unknown"/g) ?? []).length, 5);
  assert.doesNotMatch(unknownPhase, /In progress|Not started|Phase unavailable|>Cleared</);
  assert.match(unknownPhase, /aria-valuenow="58"/);
});

test("phase track exposes the active stage and percentage without removed heading or pull details", () => {
  const data = direct.fixtures.createUcobProgressFixture();
  const seededTrack = renderToStaticMarkup(React.createElement(direct.phaseTrack.UcobPhaseProgress, { data }));
  assert.match(seededTrack, /Golden Bahamut/);
  data.points = [
    { pull: 7, phase: "P3", bossHpRemaining: 45, mechanicName: "Blackfire Trio", displayPercentText: "55% P3" },
    { pull: 8, phase: "P1", bossHpRemaining: 95 },
  ];
  const markup = renderToStaticMarkup(React.createElement(direct.phaseTrack.UcobPhaseProgress, { data }));
  assert.match(markup, /aria-current="step" data-phase="P3" data-state="current"/);
  assert.match(markup, /-top-6[^>]*>55%<\/span>/);
  assert.doesNotMatch(markup, /Blackfire Trio|Pull #7|<h2|In progress/);
  assert.match(markup, /Furthest reached/);
  assert.equal((markup.match(/data-phase="P[1-5]"/g) ?? []).length, 5);
  data.summary.cleared = true;
  const cleared = renderToStaticMarkup(React.createElement(direct.phaseTrack.UcobPhaseProgress, { data }));
  assert.match(cleared, /-top-6[^>]*>100%<\/span>/);
  assert.doesNotMatch(cleared, />Cleared</);
  assert.equal((cleared.match(/data-state="passed"/g) ?? []).length, 5);
  assert.doesNotMatch(cleared, /aria-current="step"|Furthest reached|Pull #7/);
});

test("phase track handles unstarted, loading, unknown, and stale cached states", () => {
  const unstarted = render({ data: null });
  assert.doesNotMatch(unstarted, />Not started</);
  assert.equal((unstarted.match(/data-state="unreached"/g) ?? []).length, 5);
  const loading = render({ data: null, loading: true });
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Loading phase progress/);
  assert.doesNotMatch(loading, />Not started</);
  const data = direct.fixtures.createUcobProgressFixture();
  data.points = data.points.map((point) => ({ ...point, phase: null }));
  assert.equal((render({ data }).match(/data-state="unknown"/g) ?? []).length, 5);
  const cached = direct.fixtures.createUcobProgressFixture();
  const markup = render({ data: cached, loading: true, error: "Synthetic reload error" });
  assert.match(markup, /Phase progress/);
  assert.match(markup, /aria-current="step"/);
  assert.doesNotMatch(markup, /Loading phase progress/);
});

test("chart milestones follow improvements while wall/reach reflect the one static", () => {
  const points = [
    { pull: 1, bossHpRemaining: 95, bestBossHpRemaining: 95, phase: "P1", mechanicName: "Twister" },
    { pull: 2, bossHpRemaining: 60, bestBossHpRemaining: 60, phase: "P2", mechanicName: "Nael" },
    { pull: 3, bossHpRemaining: 90, bestBossHpRemaining: 60, phase: "P1", mechanicName: "Twister" },
    { pull: 4, bossHpRemaining: 20, bestBossHpRemaining: 20, phase: "P4", mechanicName: null },
  ];
  assert.deepEqual(direct.chart.buildMilestones(points).map((point) => point.pull), [1, 2, 4]);
  assert.deepEqual(direct.chart.progressInsights(points), { furthestPhase: "P4", wall: "Twister (2)" });
  const bands = direct.chart.buildPhaseBands(points);
  assert.deepEqual(bands.map((band) => band.phase), ["P1", "P2", "P4"]);
  assert.equal(bands[0].max, 100);
  assert.equal(bands.at(-1).min, 0);
});
