import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const enabled = Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
const require = createRequire(new URL("../functions/package.json", import.meta.url));
let admin, callable;
const originalFetch = globalThis.fetch;
let roles = ["test-boss"];

if (enabled) {
  process.env.FIREBASE_DATABASE_URL = "https://demo-fat-cat-cartel-default-rtdb.firebaseio.com";
  process.env.DISCORD_GUILD_ID = "test-guild";
  process.env.DISCORD_ADMIN_ROLE_IDS = "test-boss,test-underpaw";
  process.env.DISCORD_MEMBER_ROLE_IDS = "test-member";
  process.env.DISCORD_BOT_TOKEN = "test-token";
  admin = require("firebase-admin");
  callable = require("./lib/index.js").mutateCartelGilRushEvent;
  globalThis.fetch = async (url, ...args) => {
    if (String(url).startsWith("https://discord.com/api/")) return new Response(JSON.stringify({ roles }), { status: 200 });
    return originalFetch(url, ...args);
  };
}
after(async () => { globalThis.fetch = originalFetch; if (enabled) await Promise.all(admin.apps.map(app => app.delete())); });

const token = "gil-rush-emulator-test-session-token-000000000000000000";
const hash = createHash("sha256").update(token).digest("hex");
const path = "events/cartelGilRush/current";
async function session(expired = false) {
  await admin.database().ref(`adminSessions/${hash}`).set({ discordUserId: "test-user", expiresAt: expired ? 1 : Date.now() + 60_000, lastSeenAt: Date.now() });
  await admin.database().ref("discordLinks/test-user").set({ lodestoneId: "test-player" });
  await admin.database().ref("members/test-player").set({ name: "Host", fcRank: "Boss" });
}
const call = (action, expectedRevision, adminSessionToken = token) => callable.run({ data: { adminSessionToken, action, expectedRevision } });

test("real callable authorizes sessions and transactions reject concurrent/stale hosts", { skip: !enabled, timeout: 30_000 }, async () => {
  await admin.database().ref(path).remove();
  await assert.rejects(call({ type: "reset" }, 0, ""), error => error.code === "unauthenticated");
  await session(true);
  await assert.rejects(call({ type: "reset" }, 0), error => error.code === "unauthenticated");
  await session();
  roles = ["test-member"];
  await assert.rejects(call({ type: "reset" }, 0), error => error.code === "permission-denied");
  assert.equal((await admin.database().ref(path).get()).exists(), false);
  roles = ["test-underpaw"];
  const added = await call({ type: "add", player: { id: "player", name: "Long Guest Name", avatarUrl: null } }, 0);
  assert.equal(added.event.revision, 1);
  const races = await Promise.allSettled([call({ type: "start" }, 1), call({ type: "start" }, 1)]);
  assert.equal(races.filter(result => result.status === "fulfilled").length, 1, JSON.stringify(races));
  assert.equal(races.filter(result => result.status === "rejected").length, 1);
  assert.equal((await admin.database().ref(path).get()).val().revision, 2);
  const gil = await call({ type: "set-gil", id: "player", gilWon: 200_000 }, 2);
  assert.equal(gil.event.players[0].gilWon, 200_000);
  await assert.rejects(call({ type: "set-gil", id: "player", gilWon: 1 }, 2), error => error.code === "aborted");
  const reset = await call({ type: "reset" }, 3);
  assert.equal(reset.event.revision, 4);
  await assert.rejects(call({ type: "import", event: added.event }, 3), error => error.code === "aborted");
  assert.equal((await admin.database().ref(path).get()).val().revision, 4);
  await assert.rejects(call({ type: "set-gil", id: "player", gilWon: 10 }, 4));
});

test("every live field requires a current Boss/Underpaw role, ignoring client and cached privilege claims", { skip: !enabled, timeout: 30_000 }, async () => {
  roles = ["test-boss"];
  await session();
  await admin.database().ref(path).remove();
  let result = await call({ type: "add", player: { id: "player", name: "Live Player", avatarUrl: null } }, 0);
  result = await call({ type: "start" }, result.event.revision);
  for (const role of ["test-boss", "test-underpaw"]) {
    roles = [role];
    for (const action of [
      { type: "set-round", round: 5 },
      { type: "set-mood", mood: "red" },
      { type: "set-gil", id: "player", gilWon: 200_000 },
    ]) result = await call(action, result.event.revision);
  }
  const before = (await admin.database().ref(path).get()).val();
  const actions = [
    { type: "set-round", round: 99 },
    { type: "set-mood", mood: null },
    { type: "set-gil", id: "player", gilWon: 999_999 },
    { type: "reset" },
  ];
  for (const action of actions) {
    await assert.rejects(call(action, before.revision, ""), error => error.code === "unauthenticated");
  }
  await session(true);
  for (const action of actions) {
    await assert.rejects(call(action, before.revision), error => error.code === "unauthenticated");
  }
  await session();
  // Existing admin session remains cached after the host loses the live Discord role.
  await admin.database().ref(`adminSessions/${hash}`).update({ isAdmin: true, roleIds: ["test-boss"], fcRank: "Boss" });
  for (const liveRoles of [["test-member"], [], ["test-discord-administrator"]]) {
    roles = liveRoles;
    for (const action of actions) {
      await assert.rejects(callable.run({ data: {
        adminSessionToken: token, action, expectedRevision: before.revision,
        isAdmin: true, fcRank: "Boss", roleIds: ["test-boss"],
      } }), error => error.code === "permission-denied");
    }
  }
  assert.deepEqual((await admin.database().ref(path).get()).val(), before);
});
