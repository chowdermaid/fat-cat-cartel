import { strict as assert } from "node:assert";
import { afterEach, beforeEach, mock, test } from "node:test";
import * as admin from "firebase-admin";
import { runRefreshFCCollection, runRefreshFCCollectionMember } from "./refresh-fc-collection";
import { refreshMemberSource } from "./member-source-refresh";

const id = "11111009";
const keys = ["mounts", "minions", "titles", "achievements"];
const previous = {
  avatar: "old-avatar",
  owned: Object.fromEntries(keys.map((key) => [key, [77]])),
  previousOwned: Object.fromEntries(keys.map((key) => [key, { count: 1, asOf: 50 }])),
  lastFetched: 100,
};
let stored: Record<string, unknown>;
let writes: { path: string; value: Record<string, unknown> }[];
let requests: string[];
let delays: number[];
let respond: (url: string) => Response | Promise<Response>;

function read(path: string): unknown {
  return path.split("/").filter(Boolean).reduce<unknown>((value, key) =>
    (value as Record<string, unknown> | undefined)?.[key], stored);
}

function write(path: string, value: unknown) {
  const parts = path.split("/").filter(Boolean);
  let parent = stored;
  for (const part of parts.slice(0, -1)) parent = (parent[part] ??= {}) as Record<string, unknown>;
  parent[parts.at(-1)!] = structuredClone(value);
}

function normalResponse(url: string) {
  if (url.endsWith("/refresh")) return new Response(null, { status: 202 });
  if (/characters\/\d+$/.test(url)) return Response.json({ avatar: "new-avatar" });
  if (url.endsWith("/owned")) return Response.json([{ id: 1 }]);
  return Response.json({ results: [{ id: 1, name: "Item", category: { name: "Raids" } }] });
}

beforeEach(() => {
  stored = {
    members: { [id]: { name: "Chow Chow" } },
    fcCollection: { memberData: { [id]: structuredClone(previous) } },
    memberSyncStatus: { [id]: { collection: { status: "success", lastSuccessAt: 100 } } },
  };
  writes = []; requests = []; delays = [];
  respond = normalResponse;
  mock.method(admin, "database", () => () => ({
    ref: (path: string) => ({
      get: async () => ({ val: () => structuredClone(read(path)), exists: () => read(path) != null }),
      set: async (value: Record<string, unknown>) => { writes.push({ path, value }); write(path, value); },
      update: async (value: Record<string, unknown>) => {
        writes.push({ path, value });
        for (const [key, child] of Object.entries(value)) write(`${path}/${key}`, child);
      },
    }),
  }), { getter: true });
  mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    requests.push(url);
    return respond(url);
  });
  const originalTimeout = globalThis.setTimeout;
  mock.method(globalThis, "setTimeout", ((callback: () => void, delay: number) => {
    delays.push(delay);
    return originalTimeout(callback, 0);
  }) as typeof setTimeout);
  mock.method(console, "error", () => {});
  mock.method(console, "warn", () => {});
});

afterEach(() => mock.restoreAll());

for (const [name, failure] of [
  ["HTTP 404", () => new Response(null, { status: 404 })],
  ["exhausted HTTP 503", () => new Response(null, { status: 503 })],
  ["network exception", () => { throw new Error("Network unavailable"); }],
  ["unexpected JSON object", () => Response.json({ error: "unavailable" })],
  ["invalid item IDs", () => Response.json([{ id: "1" }])],
  ["invalid JSON", () => new Response("invalid json")],
] as const) {
  test(`${name} preserves the complete snapshot and marks only that member failed`, async () => {
    write("members/22222009", { name: "Other member" });
    respond = (url) => url.endsWith(`${id}/achievements/owned`) ? failure() : normalResponse(url);
    assert.deepEqual(await runRefreshFCCollection(), { total: 2, refreshed: 1, failed: 1 });
    const saved = read(`fcCollection/memberData/${id}`) as typeof previous & { lastError: string };
    assert.deepEqual(saved.owned, previous.owned);
    assert.deepEqual(saved.previousOwned, previous.previousOwned);
    assert.equal(saved.avatar, previous.avatar);
    assert.equal(saved.lastFetched, 100);
    assert.ok(saved.lastError);
    assert.equal(read(`memberSyncStatus/${id}/collection/status`), "error");
    assert.equal(read(`memberSyncStatus/${id}/collection/lastSuccessAt`), 100);
    assert.equal(read("memberSyncStatus/22222009/collection/status"), "success");
    assert.equal(writes.length, 1, "one atomic root update");
  });
}

test("a failed new member gets failure status without a fabricated empty snapshot", async () => {
  write("fcCollection/memberData", {});
  respond = (url) => url.endsWith("/owned") ? new Response(null, { status: 403 }) : normalResponse(url);
  await runRefreshFCCollection();
  assert.equal(read(`fcCollection/memberData/${id}`), undefined);
  assert.equal(read(`memberSyncStatus/${id}/collection/status`), "error");
});

test("valid empty ownership replaces old values and clears the failure marker", async () => {
  write(`fcCollection/memberData/${id}/lastError`, "Prior failure");
  respond = (url) => url.endsWith("/owned") ? Response.json({ results: [] }) : normalResponse(url);
  await runRefreshFCCollectionMember(id);
  assert.deepEqual(read(`fcCollection/memberData/${id}/owned`), Object.fromEntries(keys.map((key) => [key, []])));
  assert.equal(read(`fcCollection/memberData/${id}/lastError`), undefined);
  assert.ok(Number(read(`fcCollection/memberData/${id}/lastFetched`)) > 100);
});

test("single-member failures propagate through the admin source wrapper", async () => {
  respond = (url) => url.endsWith("/titles/owned") ? new Response(null, { status: 403 }) : normalResponse(url);
  await assert.rejects(refreshMemberSource(id, "collection", {
    fflogsClientId: "unused", fflogsClientSecret: "unused", tomestoneBearerToken: "unused",
  }), /HTTP 403/);
  assert.deepEqual(read(`fcCollection/memberData/${id}/owned`), previous.owned);
  assert.equal(read(`memberSyncStatus/${id}/collection/status`), "error");
  assert.equal(read(`memberSyncStatus/${id}/collection/lastSuccessAt`), 100);
});

test("429 retry respects Retry-After, succeeds on the second attempt, and stays bounded", async () => {
  let calls = 0;
  respond = (url) => url.endsWith("/mounts/owned") && calls++ === 0
    ? new Response(null, { status: 429, headers: { "Retry-After": "2" } }) : normalResponse(url);
  await runRefreshFCCollectionMember(id);
  assert.equal(calls, 2);
  assert.deepEqual(delays, [2000]);
  assert.deepEqual(read(`fcCollection/memberData/${id}/owned/mounts`), [1]);
});

test("long Retry-After is reported as failure without retrying early", async () => {
  respond = (url) => url.endsWith("/mounts/owned")
    ? new Response(null, { status: 429, headers: { "Retry-After": "10" } }) : normalResponse(url);
  await assert.rejects(runRefreshFCCollectionMember(id), /HTTP 429/);
  assert.equal(requests.filter((url) => url.endsWith("/mounts/owned")).length, 1);
  assert.deepEqual(delays, []);
});

test("malformed catalogs abort without changing the saved database", async () => {
  respond = (url) => url.endsWith("/mounts") ? Response.json({ error: "unavailable" }) : normalResponse(url);
  await assert.rejects(runRefreshFCCollection(), /Unexpected collection response/);
  assert.equal(writes.length, 0);
});

test("empty catalogs cannot erase the catalog or make everyone rank as zero", async () => {
  respond = (url) => url.endsWith("/mounts") ? Response.json({ results: [] }) : normalResponse(url);
  await assert.rejects(runRefreshFCCollection(), /Empty mounts catalog/);
  assert.equal(writes.length, 0);
});

test("at most three members fetch concurrently and everyone is eventually attempted", async () => {
  for (let n = 2; n <= 8; n++) write(`members/${n}1111009`, { name: `Member ${n}` });
  let active = 0, peak = 0;
  respond = async (url) => {
    if (!url.includes("/characters/")) return normalResponse(url);
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setImmediate(resolve));
    active--;
    return normalResponse(url);
  };
  assert.deepEqual(await runRefreshFCCollection(), { total: 8, refreshed: 8, failed: 0 });
  assert.equal(peak, 15);
  assert.equal(requests.filter((url) => url.includes("/characters/")).length, 40);
});
