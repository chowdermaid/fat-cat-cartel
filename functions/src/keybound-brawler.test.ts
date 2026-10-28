import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { test, type TestContext } from "node:test";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { saveKeyboundBrawlerScores } from "./index";

const token = "synthetic-keybound-session-token";
const sessionPath = `adminSessions/${createHash("sha256").update(token).digest("hex")}`;
const change = { lodestoneId: "222", bestScore: 42 };
const hasCode = (code: string) => (error: unknown) => error instanceof HttpsError && error.code === code;
const run = (data: unknown) => saveKeyboundBrawlerScores.run({ data } as Parameters<typeof saveKeyboundBrawlerScores.run>[0]);

function fixture(t: TestContext) {
  const values: Record<string, string> = {
    DISCORD_GUILD_ID: "synthetic-guild", DISCORD_BOT_TOKEN: "synthetic-bot",
    DISCORD_ADMIN_ROLE_IDS: "boss,underpaw", DISCORD_MEMBER_ROLE_IDS: "member",
    FUNCTIONS_EMULATOR: "false", FUNCTIONS_DEV_ALLOW_ROLE_OVERRIDE: "false",
  };
  for (const [key, value] of Object.entries(values)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const now = Date.now();
  const data = new Map<string, unknown>([
    [sessionPath, { discordUserId: "discord-admin", lodestoneId: "111", isAdmin: true, roleIds: ["boss"], expiresAt: now + 100_000, lastSeenAt: now }],
    ["discordLinks/discord-admin", { lodestoneId: "111" }],
    ["members/111", { name: "Roster Admin", fcRank: "Boss" }],
    ["members/222", { name: "Roster Friend", fcRank: "Friend" }],
    ["members/333", { name: "Roster Member" }],
    ["keyboundBrawler", { scores: { "111": 99, "222": 2, "333": 3 }, updatedAt: 1 }],
  ]);
  const reads: string[] = [];
  const writes: Array<{ path: string; values: Record<string, unknown> }> = [];
  const state = { roles: ["boss"], failWrite: false };
  const ref = (path: string) => ({
    get: async () => { reads.push(path); return { val: () => data.get(path) ?? null, exists: () => data.has(path) }; },
    remove: async () => { data.delete(path); },
    update: async (updates: Record<string, unknown>) => {
      if (state.failWrite) throw new Error("Synthetic database failure");
      writes.push({ path, values: updates });
      if (path === "keyboundBrawler") {
        const current = data.get(path) as { scores: Record<string, number>; updatedAt: number };
        const scores = { ...current.scores };
        for (const [key, value] of Object.entries(updates)) {
          if (key.startsWith("scores/")) {
            if (value === null) delete scores[key.slice(7)];
            else scores[key.slice(7)] = value as number;
          }
        }
        data.set(path, { scores, updatedAt: updates.updatedAt });
      }
    },
  });
  t.mock.getter(admin, "database", () => (() => ({ ref })) as unknown as typeof admin.database);
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    assert.match(String(input), /^https:\/\/discord.com\/api\//);
    return new Response(JSON.stringify({ roles: state.roles }), { status: 200 });
  });
  return { data, reads, writes, state };
}

for (const role of ["boss", "underpaw"]) {
  test(`${role} saves changed scores in one atomic update without touching other members`, async (t) => {
    const f = fixture(t);
    f.state.roles = [role];
    const changes = [change, { lodestoneId: "333", bestScore: null }];
    const result = await run({ adminSessionToken: token, changes });
    assert.deepEqual(result.changes, changes);
    assert.equal(result.ok, true);
    assert.deepEqual(f.writes, [{ path: "keyboundBrawler", values: { "scores/222": 42, "scores/333": null, updatedAt: result.updatedAt } }]);
    assert.deepEqual((f.data.get("keyboundBrawler") as { scores: unknown }).scores, { "111": 99, "222": 42 });
    assert(!f.reads.includes("keyboundBrawler"));
    assert.equal(f.reads.filter((path) => path === "members/222").length, 1);
  });
}

test("zero, safe integer maximum, and clearing scores are supported", async (t) => {
  const f = fixture(t);
  for (const bestScore of [0, Number.MAX_SAFE_INTEGER, null]) {
    await run({ adminSessionToken: token, changes: [{ ...change, bestScore }] });
  }
  assert.equal(f.writes.length, 3);
});

test("missing, tampered, and expired sessions fail before score/member reads", async (t) => {
  const f = fixture(t);
  for (const adminSessionToken of [undefined, "tampered"]) {
    await assert.rejects(run({ adminSessionToken, changes: [change] }), hasCode("unauthenticated"));
  }
  f.data.set(sessionPath, { discordUserId: "discord-admin", expiresAt: 1 });
  await assert.rejects(run({ adminSessionToken: token, changes: [change] }), hasCode("unauthenticated"));
  assert(!f.reads.some((path) => path.startsWith("members/")));
  assert.equal(f.writes.length, 0);
});

for (const roles of [["member"], [], ["administrator"]]) {
  test(`live roles ${JSON.stringify(roles)} cannot use cached admin authority`, async (t) => {
    const f = fixture(t);
    f.state.roles = roles;
    await assert.rejects(run({ adminSessionToken: token, changes: [change], isAdmin: true }), hasCode("permission-denied"));
    assert(!f.reads.includes("members/222"));
    assert.equal(f.writes.length, 0);
  });
}

test("invalid batches reject before any feature read or write", async (t) => {
  const f = fixture(t);
  const invalid = [
    undefined, null, {}, [], [null], [change, change],
    ...["../222", "", "22.2", 222].map((lodestoneId) => [{ ...change, lodestoneId }]),
    ...[-1, 1.5, "42", "1e3", undefined, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1].map((bestScore) => [{ ...change, bestScore }]),
  ];
  for (const changes of invalid) await assert.rejects(run({ adminSessionToken: token, changes }), hasCode("invalid-argument"));
  assert(!f.reads.includes("members/222"));
  assert.equal(f.writes.length, 0);
});

test("missing members reject entire batch, and database failures propagate", async (t) => {
  const f = fixture(t);
  await assert.rejects(run({ adminSessionToken: token, changes: [change, { lodestoneId: "999", bestScore: 3 }] }), hasCode("failed-precondition"));
  assert.equal(f.writes.length, 0);
  f.state.failWrite = true;
  await assert.rejects(run({ adminSessionToken: token, changes: [change] }), /Synthetic database failure/);
  assert.deepEqual((f.data.get("keyboundBrawler") as { scores: unknown }).scores, { "111": 99, "222": 2, "333": 3 });
});

test("successive disjoint edits survive and same-member saves use last write", async (t) => {
  const f = fixture(t);
  await run({ adminSessionToken: token, changes: [change] });
  await run({ adminSessionToken: token, changes: [{ lodestoneId: "333", bestScore: 77 }] });
  await run({ adminSessionToken: token, changes: [{ ...change, bestScore: 50 }] });
  assert.deepEqual((f.data.get("keyboundBrawler") as { scores: unknown }).scores, { "111": 99, "222": 50, "333": 77 });
});
