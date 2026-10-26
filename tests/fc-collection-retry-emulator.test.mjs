import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(new URL("../functions/package.json", import.meta.url));

test("persisted failures recover once through real RTDB retry claims", {
  skip: !process.env.FIREBASE_DATABASE_EMULATOR_HOST,
  timeout: 30_000,
}, async (t) => {
  const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/, "this test must use a local emulator");
  const admin = require("firebase-admin");
  const { runRefreshFCCollectionMember, runRetryFailedFCCollectionMembers, COLLECTION_RETRY_DELAY_MS } = require("./lib/refresh-fc-collection.js");
  const app = admin.initializeApp({
    projectId: "demo-fat-cat-cartel",
    databaseURL: `http://${host}/?ns=demo-fat-cat-cartel-default-rtdb`,
  });
  const db = app.database();
  const id = "98765001";
  const dataPath = `fcCollection/memberData/${id}`;
  const queuePath = `fcCollectionRetryQueue/${id}`;
  const statusPath = `memberSyncStatus/${id}/collection`;
  t.after(async () => {
    await db.ref("/").update({ [`members/${id}`]: null, [dataPath]: null, [queuePath]: null, [statusPath]: null });
    await app.delete();
  });
  await db.ref("/").update({
    [`members/${id}`]: { name: "Retry fixture" },
    [dataPath]: { avatar: "old", owned: { mounts: [77] }, lastFetched: 100 },
  });
  let failed = true;
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = String(input);
    assert.ok(url.startsWith(`https://ffxivcollect.com/api/characters/${id}`));
    requests.push(url);
    if (url.endsWith("/titles/owned") && failed) return new Response(null, { status: 403 });
    return Response.json(url.endsWith("/owned") ? [{ id: 1 }] : { avatar: "new" });
  });

  const startedAt = Date.now();
  await assert.rejects(runRefreshFCCollectionMember(id), /HTTP 403/);
  const queued = (await db.ref(queuePath).get()).val();
  assert.equal(queued.attempts, 0);
  assert.ok(queued.nextAttemptAt >= startedAt + COLLECTION_RETRY_DELAY_MS);
  assert.deepEqual((await db.ref(`${dataPath}/owned/mounts`).get()).val(), [77]);
  await runRetryFailedFCCollectionMembers();
  assert.equal(requests.length, 5, "not due yet");

  failed = false;
  await db.ref(`${queuePath}/nextAttemptAt`).set(Date.now() - 1);
  await Promise.all([runRetryFailedFCCollectionMembers(), runRetryFailedFCCollectionMembers()]);
  assert.equal(requests.length, 10, "concurrent workers issue exactly one five-request retry");
  assert.equal((await db.ref(queuePath).get()).exists(), false);
  assert.equal((await db.ref(statusPath).get()).val().status, "success");
  assert.equal((await db.ref(`${dataPath}/lastError`).get()).exists(), false);
  assert.deepEqual((await db.ref(`${dataPath}/owned/mounts`).get()).val(), [1]);
});
