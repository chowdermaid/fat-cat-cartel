import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { rankMembers, parseScoreDraft, applyScoreChanges } from "../src/features/keybound-brawler/utils/scores.ts";

const members = {
  "1": { name: "Alpha Cat", avatarUrl: "/real-alpha-avatar.png", fcRank: "Friend" },
  "2": { name: "Bravo Cat", avatarUrl: null },
  "3": { name: "Charlie Cat", avatarUrl: null },
  "4": { name: "Delta Cat", avatarUrl: null },
  "5": { name: "Echo Cat", avatarUrl: null },
};
const scores = { "1": 100, "2": 100, "3": 50, "4": 0, "999": 999999 };

test("competition ranks include Friends and zero, ignore orphan scores, and keep unscored members unranked", () => {
  const rows = rankMembers(members, scores);
  assert.deepEqual(rows.map((row) => row.rank), [1, 1, 3, 4, null]);
  assert.deepEqual(rows.map((row) => row.lodestoneId), ["1", "2", "3", "4", "5"]);
  assert.equal(rows[0].avatarUrl, members["1"].avatarUrl);
  assert.equal(rows[3].bestScore, 0);
  assert.equal(rows[4].bestScore, null);
});

test("tie order uses name then Lodestone ID", () => {
  const roster = { "2": { name: "Same Cat" }, "1": { name: "Same Cat" }, "3": { name: "After Cat" } };
  assert.deepEqual(rankMembers(roster, { "1": 10, "2": 10 }).map((row) => row.lodestoneId), ["1", "2", "3"]);
});

test("draft parsing distinguishes clearing and zero and rejects invalid values", () => {
  assert.deepEqual(parseScoreDraft(""), { value: null, error: null });
  assert.deepEqual(parseScoreDraft("000"), { value: 0, error: null });
  assert.equal(parseScoreDraft(String(Number.MAX_SAFE_INTEGER)).value, Number.MAX_SAFE_INTEGER);
  for (const value of ["-1", "1.2", "1e3", "+3", " 3 ", " ", "NaN", "Infinity", String(Number.MAX_SAFE_INTEGER + 1)]) assert(parseScoreDraft(value).error);
});

test("successful single-member changes rerank while preserving unrelated records and zero", () => {
  const saved = applyScoreChanges({ scores, updatedAt: 1 }, [{ lodestoneId: "5", bestScore: 200 }, { lodestoneId: "2", bestScore: null }], 2);
  assert.equal(rankMembers(members, saved.scores)[0].lodestoneId, "5");
  assert.equal(saved.scores["1"], 100);
  assert.equal(saved.scores["2"], undefined);
  assert.equal(saved.scores["4"], 0);
  assert.equal(saved.updatedAt, 2);
});

const servers = [];
let direct, persona, production;
const originalWindow = globalThis.window;
async function load({ stubs = true, personas = false } = {}) {
  const server = await createServer({
    configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
    resolve: { alias: { "@": path.resolve("src") } },
    define: {
      "import.meta.env.VITE_USE_STUBS": JSON.stringify(String(stubs)),
      "import.meta.env.VITE_DEV_AUTH_LAYER": JSON.stringify(String(personas)),
    },
    plugins: [{ name: "keybound-boundaries", enforce: "pre", load(id) {
      const file = id.replaceAll("\\", "/");
      if (file.endsWith("/src/lib/firebase.ts")) return "export const firebaseApp = null; export const db = null;";
      if (file.endsWith("/src/features/admin/api/adminFunctions.ts")) return "export const callAdminFunction = (...args) => globalThis.keyboundTransport(...args);";
      if (file.endsWith("/src/hooks/useMembers.ts")) return "export const useMembers = () => globalThis.keyboundMembers;";
      if (file.endsWith("/src/features/admin/hooks/useAdminAuth.ts")) return "export const useAdminAuth = () => globalThis.keyboundAuth;";
      if (file.endsWith("/src/features/keybound-brawler/hooks/useKeyboundScores.ts")) return "export const useKeyboundScores = () => globalThis.keyboundData;";
    } }, react()],
  });
  servers.push(server);
  return {
    api: await server.ssrLoadModule("/src/features/keybound-brawler/api/keyboundScores.ts"),
    page: await server.ssrLoadModule("/src/features/keybound-brawler/components/KeyboundBrawlerPage.tsx"),
    podium: await server.ssrLoadModule("/src/features/keybound-brawler/components/ScorePodium.tsx"),
    rankAssets: await server.ssrLoadModule("/src/features/keybound-brawler/constants.ts"),
    db: await server.ssrLoadModule("/src/lib/db.ts"),
    personas: await server.ssrLoadModule("/src/lib/dev/personas.ts"),
    constants: await server.ssrLoadModule("/src/features/admin/constants.ts"),
  };
}
before(async () => {
  const values = new Map();
  globalThis.window = Object.assign(new EventTarget(), { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) } });
  direct = await load();
  persona = await load({ personas: true });
  production = await load({ stubs: false });
});
after(async () => {
  await Promise.all(servers.map((server) => server.close()));
  if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  for (const key of ["keyboundTransport", "keyboundMembers", "keyboundAuth", "keyboundData"]) delete globalThis[key];
});

test("stub saves validate entire batch and update only requested records, including clearing and zero", async () => {
  const before = await direct.api.fetchKeyboundScores();
  const token = direct.constants.LOCAL_DEV_ADMIN_SESSION_TOKEN;
  const changes = [{ lodestoneId: "11111003", bestScore: null }, { lodestoneId: "11111002", bestScore: 0 }];
  await direct.api.saveKeyboundScores(token, changes);
  const after = await direct.api.fetchKeyboundScores();
  assert.equal(after.scores["11111003"], undefined);
  assert.equal(after.scores["11111002"], 0);
  assert.equal(after.scores["11111001"], before.scores["11111001"]);
  await assert.rejects(direct.api.saveKeyboundScores(token, [{ lodestoneId: "11111001", bestScore: 5 }, { lodestoneId: "999", bestScore: 3 }]));
  assert.deepEqual((await direct.api.fetchKeyboundScores()).scores, after.scores);
  for (const bestScore of [-1, 1.5, "42", Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(direct.api.saveKeyboundScores(token, [{ lodestoneId: "11111001", bestScore }]));
});

test("stub personas reject guests and ordinary members, allow Boss and Underpaw", async () => {
  const changes = [{ lodestoneId: "11111001", bestScore: 1 }];
  for (const id of ["guest", "member", "housecat"]) {
    persona.personas.setSelectedDevPersona(id);
    await assert.rejects(persona.api.saveKeyboundScores(persona.personas.DEV_SESSION_TOKEN, changes));
  }
  for (const id of ["boss", "underpaw"]) {
    persona.personas.setSelectedDevPersona(id);
    assert.equal((await persona.api.saveKeyboundScores(persona.personas.DEV_SESSION_TOKEN, changes)).ok, true);
  }
});

test("production transport sends one batch and session to protected callable", async () => {
  const calls = [];
  globalThis.keyboundTransport = (...args) => { calls.push(args); return { ok: true, changes: args[2].changes, updatedAt: 1 }; };
  const changes = [{ lodestoneId: "1", bestScore: 0 }];
  await production.api.saveKeyboundScores("session-token", changes);
  assert.deepEqual(calls, [["saveKeyboundBrawlerScores", "session-token", { changes }]]);
});

test("public page hides editing for guest, member, checking, and claimed FC-rank sessions", () => {
  globalThis.keyboundMembers = members;
  globalThis.keyboundData = { data: { scores, updatedAt: 1 }, loading: false, error: null, retry() {}, commit() {} };
  for (const auth of [
    { authed: false }, { authed: true, session: { isAdmin: false } },
    { authed: true, checking: true, session: { isAdmin: true } },
    { authed: true, session: { isAdmin: false, fcRank: "Boss" } },
  ]) {
    globalThis.keyboundAuth = auth;
    const html = renderToStaticMarkup(React.createElement(direct.page.KeyboundBrawlerPage));
    assert.match(html, /All rankings/);
    assert.match(html, /Alpha Cat/);
    assert.doesNotMatch(html, /Edit best score for|Edit scores|Save changes|Discard|Best score for/);
  }
  globalThis.keyboundAuth = { authed: true, checking: false, sessionToken: "token", session: { isAdmin: true } };
  const adminHtml = renderToStaticMarkup(React.createElement(direct.page.KeyboundBrawlerPage));
  assert.match(adminHtml, /Edit best score for Alpha Cat/);
  assert.doesNotMatch(adminHtml, /Gold Saucer|Big scores|Scores maintained|Search members|One best score|Edit scores|Save changes/);
  assert.doesNotMatch(adminHtml, /<thead|<caption|Member rankings by best Keybound Brawler score/);
});

test("podium keeps second/first/third entry order with actual tied ranks; missing places remain empty", () => {
  const html = renderToStaticMarkup(React.createElement(direct.podium.ScorePodium, { rows: rankMembers(members, scores) }));
  assert(html.indexOf("Bravo Cat") < html.indexOf("Alpha Cat"));
  assert(html.indexOf("Alpha Cat") < html.indexOf("Charlie Cat"));
  assert.equal((html.match(/Rank <\/span>1/g) ?? []).length, 2);
  const empty = renderToStaticMarkup(React.createElement(direct.podium.ScorePodium, { rows: rankMembers(members, {}) }));
  assert.equal((empty.match(/No score yet/g) ?? []).length, 3);
});

test("podium uses supplied laurel with a mirrored right side and supplied crowns for all three ranks", () => {
  const html = renderToStaticMarkup(React.createElement(direct.podium.ScorePodium, { rows: rankMembers(members, { "1": 100, "2": 90, "3": 80 }) }));
  assert.equal((html.match(/data:image\/svg\+xml;charset=utf-8/g) ?? []).length, 2);
  assert.match(html, /-scale-x-100/);
  const images = [...html.matchAll(/<img[^>]*src="([^"]*)"/g)].map((match) => match[1].replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&quot;", '"'));
  for (const [rank, color] of [[1, "gold"], [2, "silver"], [3, "bronze"]]) {
    const crown = direct.rankAssets.RANK_CROWNS[rank];
    assert(images.includes(crown));
    assert.match(decodeURIComponent(crown), new RegExp(`keybound-crown-${color}\\.svg|${color[0].toUpperCase() + color.slice(1)} podium crown`));
  }
  assert.doesNotMatch(html, /lucide-trophy/);
  assert.match(html, /text-slate-600/);
  assert.match(html, /text-orange-700/);
});

test("loading, read-error, empty-roster, and no-scores states render without enabling editing", () => {
  globalThis.keyboundAuth = { authed: true, session: { isAdmin: true } };
  for (const [data, roster, expected] of [
    [{ loading: true }, members, /Loading leaderboard/],
    [{ error: "Synthetic read failure" }, members, /Retry loading scores/],
    [{}, {}, /No roster members available/],
    [{}, members, /No scores recorded yet/],
  ]) {
    globalThis.keyboundMembers = roster;
    globalThis.keyboundData = { data: { scores: {}, updatedAt: null }, loading: false, error: null, retry() {}, commit() {}, ...data };
    assert.match(renderToStaticMarkup(React.createElement(direct.page.KeyboundBrawlerPage)), expected);
  }
});

test("score reads deduplicate in-flight requests, accept missing data, and reject malformed scores", async () => {
  const first = direct.api.fetchKeyboundScores();
  assert.equal(first, direct.api.fetchKeyboundScores());
  await first;
  await direct.db.set(direct.db.ref(direct.db.db, "keyboundBrawler"), null);
  assert.deepEqual(await direct.api.fetchKeyboundScores(), { scores: {}, updatedAt: null });
  for (const value of [42, [], { scores: { "1": -1 } }, { scores: { "1": "42" } }, { scores: { "../1": 42 } }, { scores: {}, updatedAt: -1 }]) {
    await direct.db.set(direct.db.ref(direct.db.db, "keyboundBrawler"), value);
    await assert.rejects(direct.api.fetchKeyboundScores(), /malformed/);
  }
});
